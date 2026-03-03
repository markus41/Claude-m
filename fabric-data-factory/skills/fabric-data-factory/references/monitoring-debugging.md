# Monitoring and Debugging

## Overview

Fabric Data Factory monitoring covers pipeline run history, activity-level diagnostics, dataflow refresh status, Log Analytics integration, and end-to-end data lineage. This reference covers the activity run history API, pipeline run status, diagnostic KQL queries for Log Analytics, failed run remediation patterns, data preview in Dataflow, and lineage tracking.

---

## Activity Run History API

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|---------------------|----------------|-------|
| GET | `/v1/workspaces/{workspaceId}/items/{pipelineId}/jobs/instances` | Workspace Viewer | `maxResults`, `continuationToken` | Lists pipeline run instances |
| GET | `/v1/workspaces/{workspaceId}/items/{pipelineId}/jobs/instances/{jobInstanceId}` | Workspace Viewer | — | Gets details of a specific run |
| GET | `/v1/workspaces/{workspaceId}/items/{dataflowId}/jobs/instances` | Workspace Viewer | — | Lists dataflow refresh history |

**Base URL**: `https://api.fabric.microsoft.com`

### Get Recent Pipeline Runs

```bash
TOKEN=$(az account get-access-token --resource https://api.fabric.microsoft.com --query accessToken -o tsv)

# List last 10 pipeline runs
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.fabric.microsoft.com/v1/workspaces/<workspace-id>/items/<pipeline-id>/jobs/instances?maxResults=10" \
  | python -m json.tool
```

Response structure:
```json
{
  "value": [
    {
      "id":          "<job-instance-id>",
      "itemId":      "<pipeline-id>",
      "jobType":     "Pipeline",
      "invokeType":  "Manual",
      "status":      "Completed",
      "startTimeUtc": "2025-03-01T06:00:00Z",
      "endTimeUtc":   "2025-03-01T06:04:32Z"
    }
  ]
}
```

### Get Failed Runs and Error Details

```python
import requests

def get_failed_runs(token, workspace_id, pipeline_id, since_hours=24):
    url = (f"https://api.fabric.microsoft.com/v1/workspaces/{workspace_id}"
           f"/items/{pipeline_id}/jobs/instances?maxResults=100")
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.get(url, headers=headers)
    resp.raise_for_status()
    runs = resp.json().get("value", [])
    failed = [r for r in runs if r.get("status") == "Failed"]
    print(f"Failed runs in last 24h: {len(failed)}")
    for r in failed:
        print(f"  Run ID: {r['id']}")
        print(f"  Start:  {r['startTimeUtc']}")
        print(f"  End:    {r.get('endTimeUtc', 'N/A')}")
        print()
    return failed

failed = get_failed_runs(TOKEN, WORKSPACE_ID, PIPELINE_ID)
```

---

## Monitoring Hub

The Fabric Monitoring Hub provides a unified view of all pipeline and dataflow runs in a workspace.

### Access via Portal

1. Navigate to your Fabric workspace.
2. Click the **Monitor** icon (stopwatch) in the left nav.
3. Filter by:
   - Item type: `Data pipeline`, `Dataflow Gen2`
   - Status: `Failed`, `In progress`, `Completed`
   - Time range: last 1h, 24h, 7d, 30d
4. Click any run to view activity-level breakdown and error messages.

### Activity-Level Run Details

For each pipeline run in the Monitoring Hub:
- **Activities tab**: Shows each activity name, type, status, start/end time, duration.
- **Input**: The source configuration for the activity.
- **Output**: Rows read/written, throughput (MB/s), copy duration breakdown.
- **Error**: Full error message, error code, activity ID for support.

---

## Diagnostic Logs with Log Analytics

Send Fabric diagnostic logs to Azure Monitor Log Analytics for long-term retention and KQL queries.

### Enable Diagnostic Logging

1. Azure Portal > Fabric Capacity resource.
2. Diagnostic settings > + Add diagnostic setting.
3. Enable log categories: `FabricPipelineRun`, `FabricActivityRun`, `FabricDataflowRefresh`.
4. Destination: Log Analytics workspace.

### KQL Queries for Pipeline Monitoring

```kql
// All pipeline runs in the last 24 hours
FabricPipelineRun
| where TimeGenerated > ago(24h)
| project TimeGenerated, PipelineName, RunId, Status, DurationInMs, TriggerType
| order by TimeGenerated desc

// Failed runs by pipeline
FabricPipelineRun
| where Status == "Failed"
| where TimeGenerated > ago(7d)
| summarize FailureCount = count() by PipelineName
| order by FailureCount desc

// Average pipeline duration trend (daily)
FabricPipelineRun
| where Status == "Succeeded"
| where TimeGenerated > ago(30d)
| summarize
    AvgDurationMin = avg(DurationInMs) / 60000.0,
    RunCount       = count()
  by PipelineName, bin(TimeGenerated, 1d)
| order by PipelineName, TimeGenerated

// Activity failures with error details
FabricActivityRun
| where Status == "Failed"
| where TimeGenerated > ago(24h)
| project TimeGenerated, PipelineName, ActivityName, ActivityType, ErrorCode, ErrorMessage
| order by TimeGenerated desc

// Dataflow refresh failures
FabricDataflowRefresh
| where Status == "Failed"
| where TimeGenerated > ago(7d)
| project TimeGenerated, DataflowName, Duration = DurationInMs/60000.0, ErrorMessage
| order by TimeGenerated desc

// Pipeline throughput: rows/sec for Copy activities
FabricActivityRun
| where ActivityType == "Copy"
| where Status == "Succeeded"
| where TimeGenerated > ago(24h)
| extend
    RowsPerSec = todouble(Output_RowsRead) / (DurationInMs / 1000.0),
    ThroughputMBs = todouble(Output_DataRead) / (DurationInMs / 1000.0) / 1048576.0
| project TimeGenerated, PipelineName, ActivityName, Output_RowsRead, RowsPerSec, ThroughputMBs
| order by RowsPerSec desc

// Long-running pipelines (> 30 minutes)
FabricPipelineRun
| where DurationInMs > 1800000
| where Status in ("Succeeded", "Failed")
| where TimeGenerated > ago(7d)
| project TimeGenerated, PipelineName, DurationMin = DurationInMs/60000.0, Status
| order by DurationMin desc

// Alert: pipeline failure rate > 10% in last hour
FabricPipelineRun
| where TimeGenerated > ago(1h)
| summarize
    Total   = count(),
    Failed  = countif(Status == "Failed")
  by PipelineName
| extend FailureRate = 100.0 * Failed / Total
| where FailureRate > 10
| order by FailureRate desc
```

---

## Pipeline Run Status and Polling

### Automated Run Monitor (Python)

```python
import time, requests
from datetime import datetime, timedelta

def monitor_pipeline_runs(token, workspace_id, pipeline_id, check_interval=60, alert_on_failure=True):
    """Continuously monitor pipeline runs and alert on failures."""
    url = (f"https://api.fabric.microsoft.com/v1/workspaces/{workspace_id}"
           f"/items/{pipeline_id}/jobs/instances?maxResults=50")
    headers = {"Authorization": f"Bearer {token}"}
    seen_runs = set()

    while True:
        resp = requests.get(url, headers=headers)
        resp.raise_for_status()
        runs = resp.json().get("value", [])

        for run in runs:
            run_id = run["id"]
            if run_id not in seen_runs:
                seen_runs.add(run_id)
                status = run["status"]
                start  = run.get("startTimeUtc", "")
                print(f"[{datetime.utcnow().isoformat()}] New run: {run_id[:8]} | Status: {status} | Start: {start}")

                if alert_on_failure and status == "Failed":
                    print(f"  ALERT: Pipeline run {run_id} FAILED!")
                    # Send alert (Teams webhook, email, etc.)

        time.sleep(check_interval)
```

---

## Failed Run Remediation

### Common Failure Patterns and Fixes

#### Copy Activity Failure: Source Connection

```python
# Diagnostic check: verify ADLS connection
import requests

def test_adls_connection(account_name, container, path, token):
    url = f"https://{account_name}.dfs.core.windows.net/{container}/{path}?resource=filesystem"
    resp = requests.get(url, headers={"Authorization": f"Bearer {token}"})
    print(f"Status: {resp.status_code} — {resp.reason}")
    if resp.status_code == 403:
        print("Access denied — check SPN has 'Storage Blob Data Reader' role")
    elif resp.status_code == 404:
        print("Path not found — verify container and path")
    return resp.status_code == 200
```

#### Notebook Activity Failure: Retrieve Spark Logs

1. In Monitoring Hub, click the failed pipeline run.
2. Click the Notebook activity row.
3. Click **Spark application** link to open Spark job history.
4. Review executor logs for OOM, timeout, or code errors.

#### Dataflow Failure: Refresh Diagnostics

```bash
# Get dataflow refresh details including error
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.fabric.microsoft.com/v1/workspaces/<workspace-id>/items/<dataflow-id>/jobs/instances/<job-id>" \
  | python -m json.tool
```

Look for `errorMessage` in the response. Common causes:
- `Gateway unreachable` → restart the on-prem gateway service
- `Credentials expired` → update stored connection credentials
- `Query evaluation timeout` → simplify M query; push filtering to source

#### Pipeline Retry Logic

```json
{
  "name": "CopyWithRetry",
  "type": "Copy",
  "policy": {
    "timeout":                "00:30:00",
    "retry":                  3,
    "retryIntervalInSeconds": 120,
    "secureOutput":           false
  },
  "typeProperties": {
    "source": { "type": "AzureSqlSource" },
    "sink":   { "type": "LakehouseTableSink" },
    "enableSkipIncompatibleRow": true,
    "redirectIncompatibleRowSettings": {
      "linkedServiceName": { "referenceName": "ls_adls_error_store" },
      "path":              "error-rows/"
    }
  }
}
```

---

## Data Preview in Dataflow Gen2

Dataflow Gen2 provides interactive data preview during development without running a full refresh.

### How to Use Data Preview

1. Open a Dataflow Gen2 item.
2. Click any step in the query editor — the preview pane shows the first 1,000 rows after that step.
3. Click **Refresh preview** to re-evaluate after making changes.
4. Use the **Column profile** view (View > Column quality / Column distribution) to see:
   - Valid/Error/Empty percentage per column
   - Min/Max/Average for numeric columns
   - Most frequent values

### Preview Limitations

| Aspect | Limit | Notes |
|--------|-------|-------|
| Preview row count | 1,000 rows | Not representative for large datasets |
| Preview timeout | 120 seconds | Complex M queries may not complete in preview |
| Gateway sources | Supported | Preview uses gateway connection |
| Private endpoint sources | Supported | Requires gateway |

---

## End-to-End Lineage

### View Lineage in Fabric Portal

1. Navigate to any Fabric item (lakehouse, warehouse, report).
2. Click **View lineage** (graph icon) in the item header.
3. The lineage view shows upstream data sources and downstream consumers.
4. Hover over a link to see the connection (Copy activity, Dataflow, Spark notebook).

### Lineage REST API

```bash
# Get lineage for a workspace item (downstream)
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.fabric.microsoft.com/v1/workspaces/<workspace-id>/items/<item-id>/lineage" \
  | python -m json.tool
```

**Note**: Full lineage API is in preview. Use the portal for the most complete view.

### Purview Integration for Cross-Tenant Lineage

Microsoft Purview captures lineage from Fabric pipelines automatically when:
1. Purview account is connected to the Fabric tenant.
2. The capacity region matches the Purview region.
3. Lineage scanning is enabled in Purview settings.

Lineage appears in Purview as:
```
Source (SQL Server) → Fabric Pipeline (Copy) → Lakehouse Table → Dataflow Gen2 → Warehouse Table → Power BI Report
```

---

## Alerting Patterns

### Teams Webhook Alert on Pipeline Failure

```json
{
  "name": "AlertOnFailure",
  "type": "WebActivity",
  "dependsOn": [
    { "activity": "MainETLStep", "dependencyConditions": ["Failed"] }
  ],
  "typeProperties": {
    "url":    "https://outlook.office.com/webhook/<teams-webhook-url>",
    "method": "POST",
    "headers": { "Content-Type": "application/json" },
    "body":   "@concat('{\"title\": \"Pipeline Failed\", \"text\": \"Pipeline: ', pipeline().Pipeline, ' | Run: ', pipeline().RunId, ' | Error: ', activity(\\'MainETLStep\\').error.message, '\"}')"
  }
}
```

### Error Logging to Warehouse

```sql
-- Error log table
CREATE TABLE ctrl.PipelineErrors (
    LogID          INT            NOT NULL,
    PipelineName   NVARCHAR(200)  NOT NULL,
    RunID          NVARCHAR(50)   NOT NULL,
    ActivityName   NVARCHAR(200)  NOT NULL,
    ErrorCode      NVARCHAR(50)   NULL,
    ErrorMessage   NVARCHAR(MAX)  NULL,
    OccurredAt     DATETIME2(0)   NOT NULL DEFAULT GETDATE()
);
```

```json
{
  "name": "LogError",
  "type": "Script",
  "dependsOn": [{ "activity": "CopyStep", "dependencyConditions": ["Failed"] }],
  "typeProperties": {
    "scripts": [{
      "text": "@concat('INSERT INTO ctrl.PipelineErrors (PipelineName, RunID, ActivityName, ErrorMessage, OccurredAt) VALUES (''', pipeline().Pipeline, ''', ''', pipeline().RunId, ''', ''CopyStep'', ''', replace(activity('CopyStep').error.message, '''', ''''''), ''', GETDATE())')"
    }]
  }
}
```

---

## Error Codes Table

| Error | Meaning | Remediation |
|-------|---------|-------------|
| `ActivityFailed: Timeout` | Activity exceeded timeout | Increase activity timeout; optimize the operation |
| `ActivityFailed: Connection refused` | Target endpoint unreachable | Verify network connectivity; check firewall rules |
| `ActivityFailed: Gateway not available` | On-prem or VNet gateway offline | Restart gateway service; check gateway registration |
| `Dataflow: Mashup engine exception` | M query error | Open Dataflow in editor; check preview for step that fails |
| `Dataflow: Credentials missing` | No stored credentials for data source | Add credentials in Manage Connections |
| `Pipeline: Expression evaluation failed` | Expression syntax error | Test expression in Expression Builder; check for null activity outputs |
| `Log Analytics: No schema` | Diagnostic logs not enabled | Enable diagnostic settings on Fabric capacity |
| `Lineage API: 404 not found` | Item has no lineage data yet | Run the pipeline at least once; check preview availability |

---

## Throttling / Limits Table

| Resource | Limit | Notes |
|----------|-------|-------|
| Pipeline run history API response | 100 runs per page | Use `continuationToken` for pagination |
| Log Analytics ingestion lag | 2–5 minutes | Near-real-time; not instant |
| Log Analytics free tier retention | 90 days (paid), 30 days (free) | Configure workspace retention policy |
| Monitoring Hub display period | 30 days | For older history, query Log Analytics |
| Webhook activity response timeout | 60 seconds | Teams/Slack webhooks must respond within 60s |
| Alert rule evaluation frequency | 1 minute (min) | Log Analytics scheduled query alerts |
