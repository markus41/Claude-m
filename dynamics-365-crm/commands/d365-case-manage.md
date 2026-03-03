---
name: d365-case-manage
description: Create, update, escalate, resolve, or route a Dynamics 365 Customer Service case — with SLA monitoring, queue management, and knowledge base article association
argument-hint: "<action> [--case-id <id>] [--title <title>] [--account-id <id>] [--priority <High|Normal|Low>] [--queue-id <id>]"
allowed-tools:
  - Bash
  - Read
  - Write
---

# Dynamics 365 Case Management

Manages the full lifecycle of a Dynamics 365 Customer Service case — create, update, escalate, assign to queue, resolve, and associate knowledge articles. Monitors SLA KPI status and provides compliance warnings.

## Arguments

- `<action>`: `create`, `update`, `escalate`, `resolve`, `route`, `list`, `sla-status`
- `--case-id <id>`: GUID of the case (required for update/escalate/resolve/route/sla-status)
- `--title <title>`: Case title (required for create)
- `--account-id <id>`: Account GUID (required for create)
- `--priority <High|Normal|Low>`: Case priority (default: `Normal`)
- `--queue-id <id>`: Target queue GUID (for route action)

## Integration Context Check

Require:
- `D365_ORG_URL`
- `D365_USER_ID`
- Minimum role: `Customer Service Representative`

## Action: list

List active cases for the current user or a queue:

```bash
TOKEN=$(az account get-access-token --resource "${D365_ORG_URL}" --query accessToken -o tsv)

curl -s "${D365_ORG_URL}/api/data/v9.2/incidents?\$select=incidentid,ticketnumber,title,prioritycode,statecode,statuscode,createdon,modifiedon&\$filter=statecode eq 0 and _ownerid_value eq ${D365_USER_ID}&\$orderby=createdon desc&\$top=20" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "Accept: application/json"
```

## Action: create

```bash
curl -s -X POST \
  "${D365_ORG_URL}/api/data/v9.2/incidents" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "OData-Version: 4.0" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{
    \"title\": \"{title}\",
    \"description\": \"{description}\",
    \"prioritycode\": {priorityCode},
    \"casetypecode\": 2,
    \"caseorigincode\": 3,
    \"customerid_account@odata.bind\": \"/accounts/{accountId}\",
    \"ownerid@odata.bind\": \"/systemusers/{D365_USER_ID}\"
  }"
```

Priority codes: 1=High, 2=Normal, 3=Low

After creation, report the generated `ticketnumber` (e.g., `CAS-01234`).

### Apply SLA to New Case

If the account has an active entitlement with a linked SLA, apply it:

```bash
# Find active entitlement for account
ENTITLEMENT=$(curl -s "${D365_ORG_URL}/api/data/v9.2/entitlements?\$filter=_customerid_value eq {accountId} and statecode eq 1&\$select=entitlementid,name&\$top=1" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "Accept: application/json" | python3 -c "import sys,json; v=json.load(sys.stdin)['value']; print(v[0]['entitlementid'] if v else '')")

if [ -n "$ENTITLEMENT" ]; then
  curl -s -X PATCH \
    "${D365_ORG_URL}/api/data/v9.2/incidents({caseId})" \
    -H "Authorization: Bearer $TOKEN" \
    -H "OData-MaxVersion: 4.0" \
    -H "OData-Version: 4.0" \
    -H "Content-Type: application/json" \
    -d "{\"entitlementid@odata.bind\": \"/entitlements/${ENTITLEMENT}\"}"
fi
```

## Action: update

Update case fields (title, priority, status, description):

```bash
curl -s -X PATCH \
  "${D365_ORG_URL}/api/data/v9.2/incidents({caseId})" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "OData-Version: 4.0" \
  -H "Content-Type: application/json" \
  -d "{
    \"title\": \"{newTitle}\",
    \"prioritycode\": {newPriority},
    \"description\": \"{newDescription}\"
  }"
```

## Action: escalate

Escalation changes priority to High, reassigns to escalation queue, and adds a timeline note:

**Step 1 — Raise priority:**
```bash
curl -s -X PATCH "${D365_ORG_URL}/api/data/v9.2/incidents({caseId})" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" -H "OData-Version: 4.0" -H "Content-Type: application/json" \
  -d '{"prioritycode": 1}'
```

**Step 2 — Route to escalation queue (see route action).**

**Step 3 — Add escalation note:**
```bash
curl -s -X POST "${D365_ORG_URL}/api/data/v9.2/annotations" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" -H "OData-Version: 4.0" -H "Content-Type: application/json" \
  -d "{
    \"subject\": \"Case Escalated\",
    \"notetext\": \"Case escalated to High priority on $(date -u +%Y-%m-%dT%H:%M:%SZ). Reason: {escalationReason}\",
    \"objectid_incident@odata.bind\": \"/incidents/{caseId}\"
  }"
```

## Action: route

Add case to a queue:

```bash
# Add to queue
curl -s -X POST \
  "${D365_ORG_URL}/api/data/v9.2/queueitems" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "OData-Version: 4.0" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{
    \"objectid_incident@odata.bind\": \"/incidents/{caseId}\",
    \"queueid@odata.bind\": \"/queues/{queueId}\"
  }"
```

Or trigger routing rule evaluation:
```bash
curl -s -X POST \
  "${D365_ORG_URL}/api/data/v9.2/ApplyRoutingRule" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "OData-Version: 4.0" \
  -H "Content-Type: application/json" \
  -d "{\"Target\": {\"incidentid\": \"{caseId}\", \"@odata.type\": \"Microsoft.Dynamics.CRM.incident\"}}"
```

## Action: resolve

```bash
curl -s -X POST \
  "${D365_ORG_URL}/api/data/v9.2/ResolveIncident" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "OData-Version: 4.0" \
  -H "Content-Type: application/json" \
  -d "{
    \"IncidentResolution\": {
      \"@odata.type\": \"Microsoft.Dynamics.CRM.incidentresolution\",
      \"incidentid@odata.bind\": \"/incidents/{caseId}\",
      \"subject\": \"{resolutionSubject}\",
      \"description\": \"{resolutionDetails}\",
      \"timespent\": {minutesSpent},
      \"billabletime\": {billableMinutes}
    },
    \"Status\": 5
  }"
```

## Action: sla-status

Retrieve SLA KPI compliance for a case:

```bash
curl -s "${D365_ORG_URL}/api/data/v9.2/slakpiinstances?\$filter=_regarding_value eq {caseId}&\$select=name,status,warningtime,failuretime,computedfailuretime,succeededon&\$expand=slakpiid(\$select=name)" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "Accept: application/json"
```

Status values: 1=In Progress, 2=Succeeded, 3=Noncompliant, 4=Paused, 5=Warning

Compute time remaining to breach:
```python
from datetime import datetime, timezone
failure_time = datetime.fromisoformat(failuretime.replace('Z','+00:00'))
now = datetime.now(timezone.utc)
remaining = failure_time - now
```

## Output Format

```markdown
# Case Management Report
**Action:** {action} | **Timestamp:** {timestamp}

## Case: {ticketnumber}
- **Title:** {title}
- **Priority:** {priority}
- **Status:** {status}
- **Customer:** {accountName}
- **Owner:** {ownerName}

## SLA Status
| KPI | Status | Warning At | Breach At | Time Remaining |
|---|---|---|---|---|
| First Response | In Progress | 2026-03-02T10:00Z | 2026-03-02T14:00Z | 3h 42m |
| Resolve By | In Progress | 2026-03-03T08:00Z | 2026-03-05T08:00Z | 2d 22h |

## Actions Taken
- {action summary}

## Next Steps
- {contextual next steps}
```
