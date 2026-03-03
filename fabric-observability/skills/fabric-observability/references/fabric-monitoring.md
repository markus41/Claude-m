# Fabric Monitoring — Monitor Hub API, Activity History, Workspace Monitoring

This reference covers the Fabric monitoring REST API, Monitor Hub activity queries, workspace-level monitoring patterns, and operational dashboards for pipeline and notebook health tracking.

---

## Monitor Hub REST API

**Base URL**: `https://api.fabric.microsoft.com/v1`

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|---------------------|----------------|-------|
| GET | `/workspaces/{wId}/activities` | Workspace Viewer | `status`, `startTime`, `endTime` | Lists all activities in workspace |
| GET | `/workspaces/{wId}/dataPipelines/{pId}/runs` | Workspace Viewer | `startTime`, `endTime` | Pipeline run history |
| GET | `/workspaces/{wId}/dataPipelines/{pId}/runs/{runId}` | Workspace Viewer | — | Single run details with activity breakdown |
| POST | `/workspaces/{wId}/dataPipelines/{pId}/runs/{runId}/cancel` | Workspace Contributor | — | Cancel a running pipeline |

```bash
TOKEN=$(az account get-access-token --resource https://api.fabric.microsoft.com --query accessToken -o tsv)
WORKSPACE_ID="your-workspace-id"

# List all failed activities in workspace (last 24 hours)
curl "https://api.fabric.microsoft.com/v1/workspaces/${WORKSPACE_ID}/activities?status=Failed" \
  -H "Authorization: Bearer ${TOKEN}"

# Get pipeline run history
curl "https://api.fabric.microsoft.com/v1/workspaces/${WORKSPACE_ID}/dataPipelines/${PIPELINE_ID}/runs?startTime=$(date -d '7 days ago' --utc +%Y-%m-%dT%H:%M:%SZ)" \
  -H "Authorization: Bearer ${TOKEN}"

# Get specific run details (includes activity-level breakdown)
curl "https://api.fabric.microsoft.com/v1/workspaces/${WORKSPACE_ID}/dataPipelines/${PIPELINE_ID}/runs/${RUN_ID}" \
  -H "Authorization: Bearer ${TOKEN}"

# Cancel a running pipeline
curl -X POST \
  "https://api.fabric.microsoft.com/v1/workspaces/${WORKSPACE_ID}/dataPipelines/${PIPELINE_ID}/runs/${RUN_ID}/cancel" \
  -H "Authorization: Bearer ${TOKEN}"
```

**Activity status values**:
| Status | Description |
|--------|-------------|
| `Running` | Currently executing |
| `Succeeded` | Completed successfully |
| `Failed` | Completed with error |
| `Cancelled` | Manually cancelled |
| `Queued` | Waiting to execute (capacity throttled) |

---

## Multi-Workspace Activity Monitoring

```python
import requests
from datetime import datetime, timedelta, timezone
from typing import Optional

class FabricMonitor:
    """Monitor Fabric activity across multiple workspaces."""

    def __init__(self, token: str):
        self.headers = {"Authorization": f"Bearer {token}"}
        self.base = "https://api.fabric.microsoft.com/v1"

    def get_failed_activities(self, workspace_id: str, hours_back: int = 24) -> list:
        """Get all failed activities in a workspace for the last N hours."""
        start_time = (datetime.now(timezone.utc) - timedelta(hours=hours_back)).isoformat()
        resp = requests.get(
            f"{self.base}/workspaces/{workspace_id}/activities",
            headers=self.headers,
            params={"status": "Failed", "startTime": start_time}
        )
        return resp.json().get("value", [])

    def get_pipeline_success_rate(self, workspace_id: str, pipeline_id: str, days: int = 30) -> dict:
        """Calculate success rate for a pipeline."""
        start_time = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
        resp = requests.get(
            f"{self.base}/workspaces/{workspace_id}/dataPipelines/{pipeline_id}/runs",
            headers=self.headers,
            params={"startTime": start_time}
        )
        runs = resp.json().get("value", [])
        total = len(runs)
        succeeded = sum(1 for r in runs if r.get("status") == "Succeeded")
        return {
            "total": total,
            "succeeded": succeeded,
            "success_rate": round(succeeded / total * 100, 1) if total > 0 else 0
        }

    def generate_health_report(self, workspace_ids: list, hours_back: int = 24) -> dict:
        """Generate a health summary across multiple workspaces."""
        total_failures = []
        for ws_id in workspace_ids:
            failures = self.get_failed_activities(ws_id, hours_back)
            total_failures.extend([{**f, "workspaceId": ws_id} for f in failures])

        return {
            "reportTime": datetime.now(timezone.utc).isoformat(),
            "periodHours": hours_back,
            "totalFailures": len(total_failures),
            "failuresByType": self._group_by(total_failures, "itemType"),
            "failures": total_failures
        }

    def _group_by(self, items: list, key: str) -> dict:
        result = {}
        for item in items:
            k = item.get(key, "Unknown")
            result[k] = result.get(k, 0) + 1
        return result
```

---

## Pipeline Run Details Schema

```json
{
  "runId": "run-guid",
  "pipelineName": "DailySalesETL",
  "status": "Failed",
  "startTime": "2025-03-15T03:00:00Z",
  "endTime": "2025-03-15T03:45:12Z",
  "durationMs": 2712000,
  "triggeredBy": "ScheduleTrigger",
  "activities": [
    {
      "name": "CopySalesData",
      "type": "Copy",
      "status": "Succeeded",
      "startTime": "2025-03-15T03:00:05Z",
      "durationMs": 180000,
      "rowsRead": 1250000,
      "rowsCopied": 1250000
    },
    {
      "name": "TransformNotebook",
      "type": "ExecuteNotebook",
      "status": "Failed",
      "startTime": "2025-03-15T03:03:05Z",
      "durationMs": 2520000,
      "error": {
        "code": "SparkJobFailed",
        "message": "OutOfMemoryError: Java heap space",
        "details": "Executor 3 lost: ExecutorLostFailure (executor 3 exited caused by one of the running tasks) Reason: Container from a bad node"
      }
    }
  ]
}
```

---

## Workspace Monitoring Dashboard

### Power BI Dashboard Tiles

```kql
// These queries assume Log Analytics integration is configured

// Tile 1: Pipeline success rate (last 30 days)
FabricOperations
| where TimeGenerated > ago(30d)
| where Category == "DataPipeline"
| summarize
    Total = count(),
    Succeeded = countif(ResultType == "Succeeded"),
    Failed = countif(ResultType == "Failed")
| extend SuccessRate = round(100.0 * Succeeded / Total, 1)

// Tile 2: Failed pipelines in last 24h
FabricOperations
| where TimeGenerated > ago(24h)
| where Category == "DataPipeline" and ResultType == "Failed"
| project TimeGenerated, WorkspaceName, PipelineName, ErrorCode, ErrorMessage
| order by TimeGenerated desc

// Tile 3: Pipeline duration trend (P95 over time)
FabricOperations
| where TimeGenerated > ago(30d)
| where Category == "DataPipeline" and ResultType == "Succeeded"
| summarize P95Duration = percentile(DurationMs / 60000.0, 95)
    by bin(TimeGenerated, 1d), PipelineName
| where PipelineName in ("DailySalesETL", "FinanceDataLoad", "CustomerSync")
| render timechart

// Tile 4: Top 10 slowest notebooks (last 7 days)
FabricOperations
| where TimeGenerated > ago(7d)
| where Category == "Notebook" and ResultType == "Succeeded"
| summarize AvgDurationMin = avg(DurationMs / 60000.0), RunCount = count()
    by NotebookName, WorkspaceName
| top 10 by AvgDurationMin desc
```

---

## Workspace Activity Log (Fabric Admin API)

```bash
# List all activities across all workspaces (admin only)
ADMIN_TOKEN=$(az account get-access-token \
  --resource "https://analysis.windows.net/powerbi/api" \
  --query accessToken -o tsv)

# Get activities via Power BI Admin API
curl "https://api.powerbi.com/v1.0/myorg/admin/activityevents?startDateTime='2025-03-15T00:00:00Z'&endDateTime='2025-03-15T23:59:59Z'" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}"
```

---

## Error Codes and Remediation

| Code / Error | Meaning | Remediation |
|---|---|---|
| `SparkJobFailed: OutOfMemoryError` | Executor ran out of heap memory | Reduce data batch size; upgrade SKU; tune Spark memory config |
| `ActivityTimeout` | Activity exceeded timeout limit | Increase timeout in pipeline settings; optimize the slow operation |
| `ConnectionRefused` | External data source unreachable | Check source connectivity; verify credentials; test from Fabric notebook |
| `DeltaConcurrentWriteException` | Two jobs writing to same Delta table | Serialize writes via pipeline scheduling; use merge instead of overwrite |
| `CredentialsExpired` | OAuth token or SAS token expired | Refresh credentials in dataset/pipeline settings |
| `CapacityThrottled` | Operation delayed due to CU limits | Check Capacity Metrics app; reduce concurrent jobs; upgrade SKU |

---

## Limits

| Resource | Limit | Notes |
|----------|-------|-------|
| Monitor Hub history | 30 days | |
| Pipeline run history (API) | 1,000 runs per query | Use pagination with `continuationToken` |
| Activities per workspace query | 1,000 | Paginate for larger results |
| Log Analytics ingestion lag | 5–10 minutes | Not real-time |
| Concurrent pipeline activities | 40 (default) | Configurable per pipeline |
