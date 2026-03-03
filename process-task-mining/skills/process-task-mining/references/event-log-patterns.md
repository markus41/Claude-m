# Event Log Extraction Patterns

Concrete API calls and CLI commands for pulling raw events from each Microsoft log source and normalizing them to the unified event log schema.

---

## Power Automate — Flow Run History

### Prerequisites

- Bearer token with `Flow.Read.All` scope (Power Platform API)
- Environment ID: `Default-{tenantId}` or custom environment GUID

### List all flow runs (date-filtered)

```bash
# Get token (Azure CLI)
TOKEN=$(az account get-access-token \
  --resource "https://api.powerplatform.com" \
  --query accessToken -o tsv)

ENV_ID="<environment-id>"
FLOW_ID="<flow-id>"

curl -s \
  "https://api.powerplatform.com/powerautomate/environments/${ENV_ID}/flowRuns\
?workflowId=${FLOW_ID}\
&api-version=2022-03-01-preview\
&\$filter=startTime ge 2026-02-01T00:00:00Z and startTime le 2026-03-01T00:00:00Z\
&\$top=1000" \
  -H "Authorization: Bearer ${TOKEN}" | jq .
```

### Extract action-level detail for a single run

```bash
RUN_ID="<run-id>"

curl -s \
  "https://api.powerplatform.com/powerautomate/environments/${ENV_ID}/flowRuns/${RUN_ID}/actions\
?api-version=2022-03-01-preview" \
  -H "Authorization: Bearer ${TOKEN}" | jq .
```

### Normalize to unified CSV (Python snippet)

```python
import json, csv, sys
from datetime import datetime

runs = json.load(sys.stdin)["value"]
rows = []
for r in runs:
    case_id = r.get("correlation", {}).get("clientTrackingId") or r["name"]
    rows.append({
        "caseId": case_id,
        "activityName": "Flow Started",
        "timestamp": r["startTime"],
        "resource": r.get("triggeredBy", {}).get("name", "system"),
        "lifecycle": "start",
        "duration_ms": "",
        "sourceSystem": "power-automate",
        "rawEventId": r["name"]
    })
    if r.get("endTime"):
        start = datetime.fromisoformat(r["startTime"].replace("Z","+00:00"))
        end = datetime.fromisoformat(r["endTime"].replace("Z","+00:00"))
        activity = "Flow Completed" if r["status"] == "Succeeded" else f"Flow {r['status']}"
        rows.append({
            "caseId": case_id,
            "activityName": activity,
            "timestamp": r["endTime"],
            "resource": r.get("triggeredBy", {}).get("name", "system"),
            "lifecycle": "complete",
            "duration_ms": int((end - start).total_seconds() * 1000),
            "sourceSystem": "power-automate",
            "rawEventId": r["name"]
        })

writer = csv.DictWriter(sys.stdout,
  fieldnames=["caseId","activityName","timestamp","resource","lifecycle","duration_ms","sourceSystem","rawEventId"])
writer.writeheader()
writer.writerows(rows)
```

---

## M365 Unified Audit Log — Graph Beta (Async)

### Step 1 — Create audit query job

```bash
TOKEN=$(az account get-access-token \
  --resource "https://graph.microsoft.com" \
  --query accessToken -o tsv)

curl -s -X POST \
  "https://graph.microsoft.com/beta/security/auditLog/queries" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "displayName": "process-mining-2026-02",
    "filterStartDateTime": "2026-02-01T00:00:00Z",
    "filterEndDateTime": "2026-03-01T00:00:00Z",
    "recordTypeFilters": ["SharePointFileOperation", "MicrosoftTeams"],
    "operationFilters": ["FileAccessed", "FileModified", "FileUploaded", "FileDeleted"]
  }' | jq .id
```

### Step 2 — Poll for completion

```bash
QUERY_ID="<query-id-from-step-1>"

while true; do
  STATUS=$(curl -s \
    "https://graph.microsoft.com/beta/security/auditLog/queries/${QUERY_ID}" \
    -H "Authorization: Bearer ${TOKEN}" | jq -r .status)
  echo "Status: $STATUS"
  [ "$STATUS" = "succeeded" ] && break
  [ "$STATUS" = "failed" ] && echo "Query failed" && exit 1
  sleep 15
done
```

### Step 3 — Retrieve results (paginated)

```bash
SKIP_TOKEN=""
while true; do
  URL="https://graph.microsoft.com/beta/security/auditLog/queries/${QUERY_ID}/records?\$top=1000"
  [ -n "$SKIP_TOKEN" ] && URL="${URL}&\$skiptoken=${SKIP_TOKEN}"

  RESPONSE=$(curl -s "$URL" -H "Authorization: Bearer ${TOKEN}")
  echo "$RESPONSE" | jq '.value[]' >> raw-audit-records.jsonl

  SKIP_TOKEN=$(echo "$RESPONSE" | jq -r '."@odata.nextLink" // empty' | grep -oP '(?<=skiptoken=)[^&]+')
  [ -z "$SKIP_TOKEN" ] && break
done
```

### Normalize M365 audit to unified CSV

```python
import json, csv, sys

with open("raw-audit-records.jsonl") as f:
    records = [json.loads(line) for line in f]

rows = []
for r in records:
    rows.append({
        "caseId": r.get("objectId", r["id"]),
        "activityName": r.get("operation", "Unknown"),
        "timestamp": r["createdDateTime"],
        "resource": r.get("userPrincipalName", "unknown"),
        "lifecycle": "complete",
        "duration_ms": "",
        "sourceSystem": "m365-audit",
        "rawEventId": r["id"]
    })

writer = csv.DictWriter(sys.stdout,
  fieldnames=["caseId","activityName","timestamp","resource","lifecycle","duration_ms","sourceSystem","rawEventId"])
writer.writeheader()
writer.writerows(rows)
```

---

## Azure Monitor — Log Analytics KQL

### List available workspaces

```bash
az monitor log-analytics workspace list \
  --subscription "<subscription-id>" \
  --query "[].{name:name, id:customerId, rg:resourceGroup}" \
  --output table
```

### Run KQL query — AzureActivity

```bash
WORKSPACE_ID="<log-analytics-workspace-id>"

az monitor log-analytics query \
  --workspace "${WORKSPACE_ID}" \
  --analytics-query "
    AzureActivity
    | where TimeGenerated between (datetime(2026-02-01) .. datetime(2026-03-01))
    | project
        TimeGenerated,
        CorrelationId,
        OperationNameValue,
        Caller,
        ResourceGroup,
        _ResourceId,
        ResultType
    | order by TimeGenerated asc
  " \
  --output json > azure-activity-raw.json
```

### Run KQL query — Entra Audit Logs

```bash
az monitor log-analytics query \
  --workspace "${WORKSPACE_ID}" \
  --analytics-query "
    AuditLogs
    | where TimeGenerated between (datetime(2026-02-01) .. datetime(2026-03-01))
    | project
        TimeGenerated,
        CorrelationId,
        OperationName,
        InitiatedBy,
        TargetResources,
        Result
    | order by TimeGenerated asc
  " \
  --output json > entra-audit-raw.json
```

### Normalize Azure Monitor to unified CSV

```python
import json, csv, sys

with open("azure-activity-raw.json") as f:
    records = json.load(f)

rows = []
for r in records:
    # Friendly activity name: trim Microsoft.Resources/deployments/write → deployments/write
    op = r.get("OperationNameValue", "")
    op_short = "/".join(op.split("/")[2:]) if op.count("/") >= 2 else op
    rows.append({
        "caseId": r.get("CorrelationId", r.get("_ResourceId", "unknown")),
        "activityName": op_short,
        "timestamp": r["TimeGenerated"],
        "resource": r.get("Caller", "unknown"),
        "lifecycle": "complete",
        "duration_ms": "",
        "sourceSystem": "azure-monitor",
        "rawEventId": r.get("_ResourceId", "")
    })

writer = csv.DictWriter(sys.stdout,
  fieldnames=["caseId","activityName","timestamp","resource","lifecycle","duration_ms","sourceSystem","rawEventId"])
writer.writeheader()
writer.writerows(rows)
```

---

## Dataverse Audit Log

### Enable audit (if not already enabled)

```bash
TOKEN=$(az account get-access-token \
  --resource "https://{org}.{region}.dynamics.com" \
  --query accessToken -o tsv)

# Check if audit is enabled on an entity
curl -s \
  "https://{org}.{region}.dynamics.com/api/data/v9.2/EntityDefinitions(LogicalName='opportunity')?select=IsAuditEnabled" \
  -H "Authorization: Bearer ${TOKEN}" | jq .IsAuditEnabled
```

### Fetch audit records for a specific entity

```bash
ORG_URL="https://{org}.{region}.dynamics.com"

curl -s \
  "${ORG_URL}/api/data/v9.2/audits\
?\$filter=createdon ge 2026-02-01T00:00:00Z and createdon le 2026-03-01T00:00:00Z and objecttypecode eq 'opportunity'\
&\$select=auditid,createdon,operation,objecttypecode,_userid_value,_regardingobjectid_value\
&\$orderby=createdon asc\
&\$top=5000" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Prefer: odata.maxpagesize=5000" | jq .
```

### Normalize Dataverse audit to unified CSV

```python
import json, csv, sys

OPERATION_MAP = {1: "Create", 2: "Update", 3: "Delete", 4: "Access", 64: "Assign", 65: "Share"}

with open("dataverse-audit-raw.json") as f:
    data = json.load(f)
    records = data.get("value", [])

rows = []
for r in records:
    op_code = r.get("operation", 0)
    rows.append({
        "caseId": r.get("_regardingobjectid_value", r["auditid"]),
        "activityName": OPERATION_MAP.get(op_code, f"Operation-{op_code}"),
        "timestamp": r["createdon"],
        "resource": r.get("_userid_value@OData.Community.Display.V1.FormattedValue", r.get("_userid_value", "unknown")),
        "lifecycle": "complete",
        "duration_ms": "",
        "sourceSystem": "dataverse",
        "rawEventId": r["auditid"]
    })

writer = csv.DictWriter(sys.stdout,
  fieldnames=["caseId","activityName","timestamp","resource","lifecycle","duration_ms","sourceSystem","rawEventId"])
writer.writeheader()
writer.writerows(rows)
```

---

## Combining Multiple Sources

After extracting from each source, merge the CSVs and sort by `caseId`, then `timestamp`:

```bash
# Merge CSV files (skip header for files after the first)
head -1 pa-events.csv > combined-event-log.csv
tail -n +2 pa-events.csv >> combined-event-log.csv
tail -n +2 m365-events.csv >> combined-event-log.csv
tail -n +2 azmon-events.csv >> combined-event-log.csv
tail -n +2 dv-events.csv >> combined-event-log.csv

# Sort by caseId then timestamp
python3 -c "
import csv, sys
with open('combined-event-log.csv') as f:
    rows = list(csv.DictReader(f))
rows.sort(key=lambda r: (r['caseId'], r['timestamp']))
with open('combined-event-log-sorted.csv', 'w', newline='') as f:
    w = csv.DictWriter(f, fieldnames=rows[0].keys())
    w.writeheader()
    w.writerows(rows)
print(f'Sorted {len(rows)} events')
"
```

**Key caseId dimension note:** Cross-source correlation requires a shared business key (e.g., a SharePoint item ID that appears in both PA trigger output and M365 audit `objectId`). Align `caseId` choice during `/mining-setup` before extracting.
