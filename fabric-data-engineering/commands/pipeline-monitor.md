---
name: pipeline-monitor
description: "Monitor and diagnose Fabric data pipeline runs — check status, analyze failures, view activity timelines, and configure alerts"
argument-hint: "<pipeline-name> --workspace <workspace> [--runs <count>] [--failures-only] [--alert-webhook <url>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - AskUserQuestion
---

# Monitor Fabric Data Pipelines

Check pipeline run status, analyze failures, review activity timelines, and set up alerting for data pipeline runs.

## Instructions

### 1. Validate Inputs

- `<pipeline-name>` — Pipeline to monitor. Ask if not provided. Use `--all` for all pipelines.
- `--workspace` — Target workspace. Ask if not provided.
- `--runs` — Number of recent runs to analyze. Default: 10.
- `--failures-only` — Only show failed runs.
- `--alert-webhook` — Teams/Slack webhook URL for failure notifications.

### 2. Get Pipeline Run History

Query the Fabric REST API for pipeline runs:

```python
import requests
from datetime import datetime, timedelta

def get_pipeline_runs(workspace_id, pipeline_id, token, count=10):
    """Fetch recent pipeline runs."""
    url = f"https://api.fabric.microsoft.com/v1/workspaces/{workspace_id}/items/{pipeline_id}/jobs/instances"
    params = {"$top": count, "$orderby": "startTimeUtc desc"}

    response = requests.get(url, headers={"Authorization": f"Bearer {token}"}, params=params)
    return response.json().get("value", [])
```

### 3. Analyze Run Status

For each run, display:

```
## Pipeline: <pipeline-name>
## Workspace: <workspace-name>

### Recent Runs (last <count>)

| Run ID | Status | Start | Duration | Trigger |
|--------|--------|-------|----------|---------|
| abc123 | ✓ Succeeded | 2026-03-18 06:00 | 12m 34s | Scheduled |
| def456 | ✗ Failed | 2026-03-17 06:00 | 8m 12s | Scheduled |
| ghi789 | ✓ Succeeded | 2026-03-16 06:00 | 11m 45s | Scheduled |

### Success Rate: 66.7% (2/3 recent runs)
### Average Duration: 10m 50s
### Last Successful Run: 2026-03-18 06:00 UTC
```

### 4. Failure Analysis

For failed runs, drill into activity-level details:

```
### Failed Run: def456 (2026-03-17 06:00 UTC)

#### Activity Timeline
1. ✓ Copy_Source_To_Bronze (3m 12s) — 15,234 rows copied
2. ✓ Transform_Bronze_To_Silver (4m 01s) — Notebook completed
3. ✗ Aggregate_Gold (0m 59s) — FAILED
   Error: SparkException: Job aborted due to stage failure
   Root Cause: java.lang.OutOfMemoryError: Java heap space
4. ⏭ Notify_Success (skipped) — Dependency not met

#### Recommendations
- Increase Spark pool size for gold aggregation notebook
- Check if data volume increased significantly
- Review shuffle partitions configuration
- Consider breaking aggregation into smaller batches
```

### 5. Performance Trends

Analyze pipeline performance over time:

```python
def analyze_trends(runs):
    """Detect performance degradation or improvement."""
    durations = [r["durationInMs"] for r in runs if r["status"] == "Succeeded"]

    if len(durations) >= 5:
        recent_avg = sum(durations[:3]) / 3
        historical_avg = sum(durations[3:]) / len(durations[3:])

        if recent_avg > historical_avg * 1.5:
            return {
                "trend": "degrading",
                "recent_avg_minutes": round(recent_avg / 60000, 1),
                "historical_avg_minutes": round(historical_avg / 60000, 1),
                "pct_increase": round((recent_avg - historical_avg) / historical_avg * 100, 1)
            }

    return {"trend": "stable"}
```

Display trend analysis:
```
### Performance Trend: ⚠ DEGRADING
- Recent average: 18.5 minutes
- Historical average: 11.2 minutes
- Increase: 65.2%
- Possible causes: data volume growth, resource contention, source system latency
```

### 6. Alert Configuration

Generate a monitoring notebook or pipeline activity for alerts:

**Webhook alert on failure**:
```python
def send_failure_alert(pipeline_name, run_id, error, webhook_url):
    payload = {
        "type": "message",
        "attachments": [{
            "contentType": "application/vnd.microsoft.card.adaptive",
            "content": {
                "type": "AdaptiveCard",
                "version": "1.5",
                "body": [
                    {"type": "TextBlock", "text": f"Pipeline Failed: {pipeline_name}", "weight": "Bolder", "color": "Attention"},
                    {"type": "TextBlock", "text": f"Run: {run_id}", "isSubtle": True},
                    {"type": "TextBlock", "text": f"Error: {error[:200]}", "wrap": True},
                    {"type": "TextBlock", "text": f"Time: {datetime.utcnow().isoformat()}", "isSubtle": True}
                ],
                "actions": [
                    {"type": "Action.OpenUrl", "title": "View in Monitoring Hub", "url": f"https://app.fabric.microsoft.com/..."}
                ]
            }
        }]
    }
    requests.post(webhook_url, json=payload)
```

**SLA monitoring**:
```python
def check_sla(pipeline_name, expected_completion_utc, tolerance_minutes=30):
    """Check if pipeline completed within SLA."""
    latest_run = get_latest_successful_run(pipeline_name)

    if not latest_run:
        return {"status": "breach", "reason": "No successful run found"}

    completion_time = datetime.fromisoformat(latest_run["endTimeUtc"])
    sla_deadline = datetime.fromisoformat(expected_completion_utc) + timedelta(minutes=tolerance_minutes)

    if completion_time > sla_deadline:
        return {
            "status": "breach",
            "deadline": expected_completion_utc,
            "actual_completion": completion_time.isoformat(),
            "overdue_minutes": (completion_time - sla_deadline).total_seconds() / 60
        }
    return {"status": "met", "completion": completion_time.isoformat()}
```

### 7. Generate Monitoring Dashboard Notebook

Create a reusable monitoring notebook:
- Lists all pipelines in workspace with last run status
- Highlights failures and SLA breaches
- Shows 7-day success rate trend
- Identifies longest-running pipelines
- Can be scheduled daily for proactive monitoring

### 8. Display Summary

Show:
- Pipeline run status table
- Failed run root cause analysis
- Performance trend assessment
- Configured alerts
- Monitoring notebook location
- Recommendations for improvement
