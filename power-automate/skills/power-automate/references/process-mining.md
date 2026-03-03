# Power Automate — Process Mining

## Overview
Power Automate Process Mining (formerly Minit) discovers, analyzes, and monitors business
processes by extracting event logs from source systems and building process models. It supports
process discovery, variant analysis, conformance checking, bottleneck identification, KPI
monitoring, and integration with Power BI for dashboards.

---

## REST API Endpoints

| Method | Endpoint | Permissions | Key Parameters | Notes |
|---|---|---|---|---|
| GET | `/processinsights/environments/{envId}/processes` | Process Mining Contributor | — | List mining processes |
| GET | `/processinsights/environments/{envId}/processes/{processId}` | Contributor | — | Get process details |
| POST | `/processinsights/environments/{envId}/processes` | Contributor | `displayName`, `description` | Create process |
| POST | `/processinsights/environments/{envId}/processes/{processId}/dataConnections` | Contributor | `dataSourceType`, `connectionConfig` | Add data source |
| POST | `/processinsights/environments/{envId}/processes/{processId}/analyzeData` | Contributor | — | Trigger analysis |
| GET | `/processinsights/environments/{envId}/processes/{processId}/analysisStatus` | Contributor | — | Poll analysis status |

**Base URL:** `https://api.powerplatform.com`

---

## Event Log Schema

Process Mining requires event logs in this minimum format:

| Column | Type | Required | Description |
|---|---|---|---|
| `CaseID` | String | ✅ | Unique identifier for each process instance |
| `Activity` | String | ✅ | Name of the activity/event (e.g., "Invoice Received") |
| `StartTimestamp` | DateTime | ✅ | When the activity started (UTC) |
| `EndTimestamp` | DateTime | ❌ Optional | When the activity ended (for duration analysis) |
| `Resource` | String | ❌ Optional | Who performed the activity (person, system, role) |
| `Cost` | Decimal | ❌ Optional | Cost of the activity |
| Custom attributes | Any | ❌ Optional | Any additional columns for filtering/analysis |

---

## Extracting Event Logs from M365 Sources

### SharePoint List → Event Log

```typescript
// Extract SharePoint list audit as event log
import { Client } from "@microsoft/microsoft-graph-client";

async function extractSharePointEventLog(
  graphClient: Client,
  siteId: string,
  listId: string
): Promise<EventLogRow[]> {
  const items = await graphClient
    .api(`/sites/${siteId}/lists/${listId}/items`)
    .expand("fields")
    .select("id,createdDateTime,lastModifiedDateTime,fields")
    .top(5000)
    .get();

  return items.value.map((item: any) => ({
    CaseID: item.id,
    Activity: item.fields.Status || "Created",
    StartTimestamp: item.createdDateTime,
    EndTimestamp: item.lastModifiedDateTime,
    Resource: item.fields.AssignedTo?.Email || "unknown",
  }));
}
```

### Power Automate Run History → Event Log

```powershell
# Extract flow run history as process mining event log
$envId = "your-environment-id"
$flowId = "your-flow-id"
$token = (Get-AzAccessToken -ResourceUrl "https://api.powerplatform.com").Token
$headers = @{ Authorization = "Bearer $token" }

$runs = @()
$url = "https://api.powerplatform.com/powerautomate/environments/$envId/flowRuns?workflowId=$flowId&api-version=2022-03-01-preview"

do {
  $page = Invoke-RestMethod $url -Headers $headers
  $runs += $page.value
  $url = $page.'@odata.nextLink'
} while ($url)

# Transform to event log format
$eventLog = $runs | ForEach-Object {
  @{
    CaseID    = $_.name
    Activity  = $_.status
    StartTime = $_.startTime
    EndTime   = $_.endTime
    Resource  = "PowerAutomate"
  }
}

$eventLog | ConvertTo-Csv -NoTypeInformation | Set-Content "flow_event_log.csv"
```

### Microsoft 365 Audit Log → Process Event Log

```typescript
// Extract compliance audit log for process mining
// Requires: Audit.Read.All permission
async function extractAuditEventLog(
  graphClient: Client,
  startDate: string,  // ISO 8601
  endDate: string,
  operations: string[] = ["FileUploaded", "FileModified", "FileDownloaded"]
): Promise<EventLogRow[]> {
  // Create audit query
  const query = await graphClient
    .api("/security/auditLog/queries")
    .post({
      displayName: "Process Mining Export",
      filterStartDateTime: startDate,
      filterEndDateTime: endDate,
      operationFilters: operations,
    });

  // Poll until complete
  let status = query;
  while (status.status !== "succeeded") {
    await new Promise(r => setTimeout(r, 5000));
    status = await graphClient.api(`/security/auditLog/queries/${query.id}`).get();
  }

  // Get records
  const records = await graphClient
    .api(`/security/auditLog/queries/${query.id}/records`)
    .top(1000)
    .get();

  return records.value.map((r: any) => ({
    CaseID: r.auditData?.ObjectId || r.id,
    Activity: r.operation,
    StartTimestamp: r.createdDateTime,
    Resource: r.userId,
    FilePath: r.auditData?.SourceFileName,
  }));
}
```

---

## Power Automate — Process Mining Connector in Flows

```json
{
  "type": "OpenApiConnection",
  "inputs": {
    "host": {
      "connection": { "name": "@parameters('$connections')['processinsights']['connectionId']" }
    },
    "method": "post",
    "path": "/v1.0/environments/@{parameters('environmentId')}/processes/@{parameters('processId')}/analyzeData"
  }
}
```

**Scheduled refresh pattern:**
```
Trigger: Recurrence (daily at 2:00 AM)
Action 1: Export event log from source (SharePoint/Dataverse/SQL)
Action 2: Upload CSV to Storage Account (blob)
Action 3: Call Process Mining analyzeData API
Action 4: Poll analysisStatus until "Succeeded"
Action 5: Send Teams notification with analysis complete + link
```

---

## Python — Process Mining Analytics with PM4Py

```python
import pm4py
import pandas as pd
from pm4py.objects.log.util import dataframe_utils
from pm4py.objects.conversion.log import converter as log_converter

# Load event log from CSV
df = pd.read_csv("event_log.csv")
df["StartTimestamp"] = pd.to_datetime(df["StartTimestamp"])

# Convert to PM4Py event log format
df = dataframe_utils.convert_timestamp_columns_in_df(df)
df = df.rename(columns={
    "CaseID": "case:concept:name",
    "Activity": "concept:name",
    "StartTimestamp": "time:timestamp",
    "Resource": "org:resource"
})

log = log_converter.apply(df)

# Discover process model (Inductive Miner)
process_tree = pm4py.discover_process_tree_inductive(log)
bpmn_graph = pm4py.convert_to_bpmn(process_tree)
pm4py.save_vis_bpmn(bpmn_graph, "process_model.png")

# Variant analysis
variants = pm4py.get_variants(log)
top_variants = sorted(variants.items(), key=lambda x: len(x[1]), reverse=True)[:10]
for i, (variant, cases) in enumerate(top_variants):
    print(f"Variant {i+1}: {len(cases)} cases ({len(cases)/len(log)*100:.1f}%)")
    print(f"  Path: {' → '.join(variant)}\n")

# Performance analysis (cycle times)
from pm4py.statistics.traces.generic.log import case_statistics
cycle_times = case_statistics.get_case_duration(log)
avg_cycle = sum(cycle_times.values()) / len(cycle_times)
print(f"Average cycle time: {avg_cycle/3600:.1f} hours")

# Conformance checking (token-based replay)
from pm4py.algo.conformance.tokenreplay import algorithm as token_replay
net, initial_marking, final_marking = pm4py.discover_petri_net_inductive(log)
replayed_traces = token_replay.apply(log, net, initial_marking, final_marking)
fitness = sum(t["trace_fitness"] for t in replayed_traces) / len(replayed_traces)
print(f"Conformance fitness: {fitness:.2%}")

# Bottleneck detection (waiting time between activities)
from pm4py.statistics.sojourn_time.log import get as sojourn_time
sojourn = sojourn_time.apply(log, parameters={"business_hours": False})
bottlenecks = sorted(sojourn.items(), key=lambda x: x[1], reverse=True)[:5]
print("\nTop bottlenecks (avg wait time):")
for activity, wait in bottlenecks:
    print(f"  {activity}: {wait/3600:.1f} hours")
```

---

## KPIs and Metrics

| KPI | Formula | Target |
|---|---|---|
| Throughput time | `EndTimestamp(last) - StartTimestamp(first)` per case | Domain-specific |
| Cycle time | Sum of all activity durations per case | Minimize |
| Waiting time | Time between activity end and next activity start | Minimize |
| Rework rate | Cases with repeated activities / total cases | < 5% |
| Conformance fitness | Fraction of log behavior matching model | > 0.90 |
| Happy path rate | Cases following the most common variant | Maximize |
| Automation rate | Activities performed by system vs human | Maximize |
| SLA compliance | Cases completed within target time / total cases | > 95% |

---

## Data Source Connectors

| Source | Connection Type | Notes |
|---|---|---|
| SharePoint Lists | Power Automate + CSV export | Extract via Graph API |
| Dataverse | Direct connector | Built-in in Process Mining |
| SQL Server | Dataverse virtual table or export | Via Azure Data Factory |
| SAP | Export via SAP connector in Power Automate | Requires SAP on-prem gateway |
| ServiceNow | HTTP connector export | REST API to CSV |
| Power Automate runs | Management API | See PowerShell example above |
| M365 Audit Log | Security & Compliance API | Requires E5 or Purview license |

---

## Error Codes

| Error | Cause | Remediation |
|---|---|---|
| `EventLogTooLarge` | Event log exceeds 1 GB | Filter date range or sample cases |
| `MissingRequiredColumns` | CaseID, Activity, or Timestamp missing | Validate CSV schema before upload |
| `DuplicateEventLogRows` | Same CaseID/Activity/Timestamp combo | Deduplicate with pandas/SQL before upload |
| `TimestampFormatInvalid` | Timestamp not in ISO 8601 format | Convert with `pd.to_datetime(..., utc=True)` |
| `AnalysisFailed` | Insufficient data or corrupt event log | Check log for null CaseIDs, negative durations |
| `InsufficientLicense` | Process Mining not licensed | Requires Power Automate Premium or Process |

---

## Limits

| Resource | Limit | Notes |
|---|---|---|
| Event log size | 1 GB | Per process |
| Cases per analysis | 10 million | |
| Events per analysis | 100 million | |
| Custom attributes | 200 columns | Per event log |
| Analysis refresh | On-demand or scheduled | No automatic streaming |
| Data retention | Environment data retention policy | Typically 30–90 days |
| Concurrent analyses | 3 per environment | Queue additional requests |

---

## Production Gotchas

- **Event log quality drives model quality** — missing timestamps, null CaseIDs, or activities
  with identical names for different steps all degrade process model accuracy significantly.
- **Conformance checking requires a reference model** — if you don't have a normative BPMN
  model, derive it from the happy path variant (top variant by case count) as a baseline.
- **Process Mining is a read-only analytics tool** — it cannot write back to source systems;
  use it to *identify* automation candidates, then build Power Automate flows to address them.
- **Large event logs (>10M events) require incremental loading** — use delta extraction with
  a watermark timestamp column to avoid re-loading historical data on each refresh.
- **Resource column cardinality** — if `Resource` has thousands of unique values (e.g., email
  addresses), replace with role/team groupings for meaningful handover-of-work analysis.
