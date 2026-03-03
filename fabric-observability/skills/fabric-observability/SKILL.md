---
name: Fabric Observability
description: >
  Advanced Fabric observability and reliability guidance using Monitor Hub triage, runbooks, alerting strategy, SLA tracking, and incident diagnostics.
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
triggers:
  - fabric monitor hub
  - pipeline failure triage
  - fabric notebook reliability
  - fabric sla tracking
  - fabric alerting
  - incident diagnostics fabric
  - fabric runbook
  - job failure pattern fabric
---

# Fabric Observability

## 1. Overview

Fabric Observability covers the practices, tools, and patterns needed to understand the health, performance, and reliability of Fabric workloads in production. Effective observability enables teams to detect failures before users do, triage issues quickly with structured runbooks, and continuously improve pipeline and notebook reliability through SLO measurement and error budget management.

**Observability pillars for Fabric**:
| Pillar | Fabric Tools | Purpose |
|--------|-------------|---------|
| Monitor Hub | Fabric portal > Monitor | Real-time view of pipeline, notebook, and job activity |
| Capacity Metrics App | AppSource Fabric app | CU consumption, throttling, carryforward debt |
| Workspace monitoring | Fabric admin portal | Item-level activity across workspaces |
| Audit logs | Microsoft 365 Unified Audit Log | User/admin operations, compliance |
| Azure Monitor | Azure Monitor + Log Analytics | Metrics and alerts for Azure-backed Fabric resources |
| Custom alerts | Data Activator, Azure Monitor | Business and infrastructure alerting |

---

## 2. Quick Start

### Check Monitor Hub for Active Issues

```
1. Open any Fabric workspace.
2. Click "Monitor" in the left navigation (or navigate to Monitor Hub from the workspace switcher).
3. Filter by:
   - Status: Failed
   - Time range: Last 24 hours
   - Item type: Data Pipeline, Notebook, Spark Job
4. Click any failed item to see the error details.
```

### Set Up a Basic Alert for Pipeline Failures

```
1. In Monitor Hub, identify a critical pipeline.
2. Open the pipeline > Edit > Properties.
3. In Monitoring settings, add email notification on failure.
4. OR: Use Data Activator with an eventstream that monitors pipeline status changes.
```

---

## 3. Monitor Hub

### Monitor Hub Capabilities

| Feature | Description |
|---------|-------------|
| Activity view | Chronological list of pipeline runs, notebook executions, Spark jobs |
| Status filtering | Filter by Running, Completed, Failed, Cancelled |
| Run details | Per-activity error messages, execution times, output |
| Re-run | Trigger a re-run of a failed pipeline from Monitor Hub |
| Historical view | Activity history for last 30 days |

### Monitor Hub Navigation

```
Fabric workspace
    └── Monitor (left nav or top toolbar)
            ├── All Activities (default view — all item types)
            ├── Data Pipeline (filter to pipelines only)
            ├── Notebook (filter to notebooks only)
            └── Spark Job (filter to Spark jobs only)

Each activity row shows:
  - Item name
  - Run start time
  - Duration
  - Status (Running / Completed / Failed / Cancelled)
  - Trigger type (Scheduled / Manual / API)
```

### Monitor Hub REST API

```bash
# Get activity history for a workspace
curl "https://api.fabric.microsoft.com/v1/workspaces/${WORKSPACE_ID}/activities" \
  -H "Authorization: Bearer ${TOKEN}"

# Get activities with status filter
curl "https://api.fabric.microsoft.com/v1/workspaces/${WORKSPACE_ID}/activities?status=Failed" \
  -H "Authorization: Bearer ${TOKEN}"

# Get pipeline run details
curl "https://api.fabric.microsoft.com/v1/workspaces/${WORKSPACE_ID}/dataPipelines/${PIPELINE_ID}/runs/${RUN_ID}" \
  -H "Authorization: Bearer ${TOKEN}"
```

### Triage Workflow for Monitor Hub Alerts

```
1. Filter Monitor Hub to: Status=Failed, Last 24h
2. Sort by Start Time (most recent first)
3. For each failure:
   a. Click to open run details
   b. Identify the failing activity (for pipelines) or cell (for notebooks)
   c. Read the error message
   d. Check: Is this a new failure or a recurring pattern?
4. Classify failure:
   - Data quality issue (bad input data) → Data owner remediation
   - Infrastructure issue (timeout, OOM) → Capacity/infra remediation
   - Code bug → Developer remediation
   - Transient error (network, dependency) → Retry or monitor
5. Apply the appropriate runbook (see Section 7)
```

---

## 4. SLA and SLO Definitions

### Define SLOs for Fabric Workloads

| SLO Type | Example | Measurement |
|----------|---------|-------------|
| Freshness | "Gold Lakehouse updated within 2 hours of raw data landing" | Time from source data arrival to Gold table update |
| Latency | "Reports load in < 5 seconds at P95" | Report render time from Capacity Metrics |
| Availability | "Critical pipelines run successfully at least 99% of the time" | Success rate over rolling 30 days |
| Throughput | "Streaming pipeline processes > 10,000 events/minute" | Events processed per minute (eventstream metrics) |

### SLO Measurement Query

```python
# Python — calculate pipeline reliability SLO from Monitor Hub data
import requests
from datetime import datetime, timedelta

def calculate_pipeline_slo(
    workspace_id: str,
    pipeline_id: str,
    token: str,
    days: int = 30
) -> dict:
    """Calculate success rate SLO for a pipeline over the specified period."""
    headers = {"Authorization": f"Bearer {token}"}
    base = "https://api.fabric.microsoft.com/v1"

    # Fetch run history
    runs_resp = requests.get(
        f"{base}/workspaces/{workspace_id}/dataPipelines/{pipeline_id}/runs"
        f"?startTime={(datetime.now() - timedelta(days=days)).isoformat()}",
        headers=headers
    )
    runs = runs_resp.json().get("value", [])

    total = len(runs)
    successful = sum(1 for r in runs if r.get("status") == "Succeeded")
    failed = sum(1 for r in runs if r.get("status") == "Failed")
    cancelled = sum(1 for r in runs if r.get("status") == "Cancelled")

    success_rate = (successful / total * 100) if total > 0 else 0

    # Error budget: if SLO target is 99%, budget = 1% of total runs
    slo_target = 99.0
    error_budget_pct = 100 - slo_target
    error_budget_runs = total * error_budget_pct / 100
    budget_remaining_pct = max(0, (error_budget_runs - failed) / error_budget_runs * 100) if error_budget_runs > 0 else 100

    return {
        "pipelineId": pipeline_id,
        "period_days": days,
        "total_runs": total,
        "successful": successful,
        "failed": failed,
        "cancelled": cancelled,
        "success_rate_pct": round(success_rate, 2),
        "slo_target_pct": slo_target,
        "slo_met": success_rate >= slo_target,
        "error_budget_remaining_pct": round(budget_remaining_pct, 1)
    }
```

### Freshness SLO Measurement

```kql
// KQL — measure Gold Lakehouse freshness against SLO
// Assumes an audit table that records when tables are refreshed
GoldTableRefreshAudit
| where TimeGenerated > ago(30d)
| summarize
    LatestRefresh = max(RefreshTime),
    RefreshCount = count()
    by TableName
| extend FreshnessMinutes = datetime_diff("minute", now(), LatestRefresh)
| extend MeetsSLO = FreshnessMinutes <= 120  // SLO: within 2 hours
| project TableName, LatestRefresh, FreshnessMinutes, MeetsSLO, RefreshCount
| order by FreshnessMinutes desc
```

---

## 5. Alerting Strategy

### Alert Design Principles

1. **Alert on symptoms, not causes**: "Pipeline failed" is more actionable than "CPU high."
2. **Minimize alert fatigue**: Do not alert on every transient error. Use retry logic + alert only on final failure.
3. **Include context**: Alert messages must include item name, workspace, error type, and a link to Monitor Hub.
4. **Route to the right person**: Use on-call schedules, not individual email addresses.
5. **Separate severity levels**:
   - P1 (Critical): Data not available, revenue impact, SLO breach
   - P2 (High): Pipeline failed, data stale but available
   - P3 (Medium): Non-critical job failing, performance degradation
   - P4 (Low): Informational, trend alerts

### Pipeline Failure Alert via Data Activator

```
Setup:
1. Create an eventstream that monitors pipeline run status changes.
   (Source: Custom app receiving pipeline completion webhooks)
2. Create a Reflex item with Object: DataPipeline (key: pipelineId)
3. Add property: status (maps to run status)
4. Trigger: status changes to "Failed"
5. Action: Email to on-call team + Teams post to #data-platform-alerts
```

### Azure Monitor Alert for Capacity

```bash
# Create metric alert for capacity CU utilization > 85%
az monitor metrics alert create \
  --name "FabricCapacityHighUtilization" \
  --resource-group "rg-fabric" \
  --scopes "/subscriptions/${SUB_ID}/resourceGroups/rg-fabric/providers/Microsoft.Fabric/capacities/prod-capacity" \
  --condition "avg CUConsumptionMetric > 85" \
  --window-size 15m \
  --evaluation-frequency 5m \
  --severity 2 \
  --action "/subscriptions/${SUB_ID}/resourceGroups/rg-ops/providers/microsoft.insights/actionGroups/PlatformOps"
```

### Email Notification Template for Pipeline Failures

```
Subject: [P2] Pipeline Failed — {pipeline_name} in {workspace_name}

Body:
  Pipeline: {pipeline_name}
  Workspace: {workspace_name}
  Run started: {start_time}
  Failed at: {failure_time}
  Error: {error_message}

  Failing activity: {activity_name}
  Error details: {error_details}

  Actions:
  1. View run in Monitor Hub: {monitor_hub_link}
  2. Apply runbook: {runbook_link}
  3. Re-run pipeline (if transient): {rerun_link}

  Assigned to: {on_call_name}
  SLO impact: {slo_impact_description}
```

---

## 6. Notebook Reliability

### Common Notebook Failure Modes

| Failure Mode | Symptom | Root Cause |
|-------------|---------|-----------|
| OutOfMemoryError | Notebook fails mid-execution | Dataset too large for available Spark memory |
| Spark session timeout | "Spark session timed out" | Session idle > timeout limit or long-running cell |
| Delta table conflict | "Concurrent transaction" error | Another notebook writing to same Delta table simultaneously |
| Schema evolution error | "Column not found" | Source schema changed; Delta table not updated |
| External dependency failure | HTTP/SQL connection error | External service down or credentials expired |
| Infinite loop / hung cell | Cell runs > 6 hours with no output | Logic error; runaway Spark job |

### Reliable Notebook Template

```python
# Production-ready notebook structure

# Cell 1: Configuration and imports
import logging
from notebookutils import mssparkutils
from datetime import datetime

notebook_name = mssparkutils.notebook.name
workspace_name = mssparkutils.runtime.context["workspaceName"]
start_time = datetime.now()

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
logger = logging.getLogger(notebook_name)

logger.info(f"Starting {notebook_name} at {start_time.isoformat()}")

# Cell 2: Read inputs with error handling
try:
    df = spark.read.format("delta").table("bronze.raw_sales")
    row_count = df.count()
    logger.info(f"Loaded {row_count:,} rows from bronze.raw_sales")

    if row_count == 0:
        raise ValueError("Input table is empty — possible upstream failure")

except Exception as e:
    logger.error(f"Failed to load input: {e}")
    # Notify via mssparkutils.notebook.exit with error status
    mssparkutils.notebook.exit(f"FAILED: {e}")

# Cell 3: Main transformation with progress logging
CHECKPOINT_INTERVAL = 100_000

logger.info("Starting transformation...")
result_df = df.transform(clean_and_enrich)
logger.info(f"Transformation complete. Result rows: {result_df.count():,}")

# Cell 4: Write output with idempotent merge
from delta.tables import DeltaTable

target_table = "silver.clean_sales"
if DeltaTable.isDeltaTable(spark, f"Tables/{target_table.replace('.', '/')}"):
    delta_table = DeltaTable.forPath(spark, target_table)
    delta_table.alias("target").merge(
        result_df.alias("source"),
        "target.order_id = source.order_id"
    ).whenMatchedUpdateAll().whenNotMatchedInsertAll().execute()
    logger.info(f"MERGE completed for {target_table}")
else:
    result_df.write.format("delta").mode("overwrite").saveAsTable(target_table)
    logger.info(f"Initial write to {target_table}")

# Cell 5: Summary and exit
end_time = datetime.now()
duration_min = (end_time - start_time).total_seconds() / 60
logger.info(f"Completed {notebook_name} in {duration_min:.1f} minutes")

mssparkutils.notebook.exit(f"SUCCESS: Processed {row_count:,} rows in {duration_min:.1f} min")
```

---

## 7. Runbooks

### Runbook: Pipeline Failure

```markdown
# Runbook: Data Pipeline Failure Response

## Trigger
Monitor Hub shows a pipeline in Failed status.

## Severity Assessment
- P1: Pipeline produces data required for live reports or business operations
- P2: Pipeline feeds a scheduled report or daily analytics
- P3: Pipeline is non-critical / ad-hoc

## Steps
1. Open Monitor Hub > find the failed run
2. Open the run details — identify the failing activity
3. Read the error message:
   - "Activity timeout" → See Timeout Runbook
   - "OutOfMemory" → See Memory Runbook
   - "Connection failed" → See Dependency Runbook
   - "Delta concurrent write" → See Concurrency Runbook
4. Attempt re-run (if error appears transient):
   - In Monitor Hub, click "Re-run" on the failed run
   - Monitor for 15 minutes
5. If re-run fails: escalate to data engineering on-call
6. Document in incident ticket: start time, error, remediation taken, outcome
```

### Runbook: Memory Error (OOM)

```markdown
# Runbook: Spark Out-of-Memory Error

## Symptoms
- "ExecutorLostFailure" or "OutOfMemoryError" in Spark logs
- Notebook cell hangs then fails
- Spark job fails after running for 10+ minutes

## Immediate Actions
1. Cancel the current run if it is still running
2. Check the input data volume (has it grown unexpectedly?)

## Remediation Options
A. Reduce data processed per run:
   - Add a date filter to process incremental data only
   - Process in smaller batches using a loop

B. Optimize Spark code:
   - Replace pandas operations with PySpark (avoids single-node memory)
   - Add `df.persist()` before multiple operations on the same dataframe
   - Use `hint.broadcast` for small lookup tables in joins

C. Upgrade capacity:
   - If memory is consistently insufficient, upgrade SKU
   - F64 → F128 doubles available Spark executor memory

D. Tune Spark configuration:
   spark.conf.set("spark.sql.shuffle.partitions", "200")
   spark.conf.set("spark.executor.memory", "8g")
```

### Runbook: Semantic Model Refresh Failure

```markdown
# Runbook: Semantic Model Refresh Failure

## Symptoms
- Power BI reports show stale data (data older than expected)
- Refresh history shows "Failed" status
- Users report that metrics have not updated

## Steps
1. Check refresh history: Power BI workspace > Dataset > Refresh history
2. Read the error:
   - "Credentials expired" → Renew credentials in dataset settings
   - "Data source not found" → Check Lakehouse/Warehouse connectivity
   - "Memory error" → Reduce parallelism in refresh; increase SKU
   - "Timeout" → Optimize source queries; use incremental refresh

3. For credential errors:
   - Dataset settings > Data source credentials > Edit credentials
   - For service principal: verify secret has not expired in Azure AD

4. Manual refresh trigger:
   curl -X POST ".../datasets/{id}/refreshes" \
     -d '{"notifyOption": "MailOnFailure"}'

5. Monitor the manual refresh for 30 minutes
6. If it succeeds: adjust scheduled refresh to avoid the failing window
7. If it fails again: escalate to semantic model owner with error details
```

---

## 8. Integration with Azure Monitor

### Diagnostic Settings for Fabric Lakehouses

```bash
# Enable diagnostic logs for a Fabric Lakehouse via Azure portal
# OR via REST API (Lakehouse is an Azure resource under Fabric namespace)

# Send Fabric activity logs to Log Analytics
az monitor diagnostic-settings create \
  --name "FabricLakehouseDiagnostics" \
  --resource "/subscriptions/${SUB_ID}/resourceGroups/rg-fabric/providers/Microsoft.Fabric/workspaces/${WORKSPACE_ID}" \
  --logs '[{"category": "FabricOperation", "enabled": true}]' \
  --workspace "${LOG_ANALYTICS_WORKSPACE_ID}"
```

### KQL Queries in Log Analytics (Fabric Activity Logs)

```kql
// Pipeline failures in Log Analytics (after diagnostic settings configured)
FabricOperations
| where TimeGenerated > ago(24h)
| where Category == "DataPipeline"
| where ResultType == "Failed"
| project TimeGenerated, WorkspaceName, PipelineName, ErrorCode, ErrorMessage
| order by TimeGenerated desc

// Notebook execution duration distribution
FabricOperations
| where TimeGenerated > ago(7d)
| where Category == "Notebook"
| where ResultType == "Succeeded"
| extend DurationMin = DurationMs / 60000.0
| summarize
    P50 = percentile(DurationMin, 50),
    P95 = percentile(DurationMin, 95),
    P99 = percentile(DurationMin, 99),
    MaxDuration = max(DurationMin)
    by NotebookName
| order by P95 desc
```

---

## 9. Common Workflows

### Workflow 1: New Pipeline Reliability Setup

```
1. Define SLOs: success rate target (e.g., 99%), freshness target (e.g., 2 hours)
2. Add logging to the pipeline: start, row counts, end time
3. Configure failure notifications (Data Activator or pipeline email settings)
4. Create a runbook for the top 3 expected failure modes
5. Test the alert path (deliberately fail the pipeline in dev)
6. Add the pipeline to the weekly SLO review report
```

### Workflow 2: Incident Response for Data Freshness Breach

```
1. Alert fires: "Gold Lakehouse freshness > 2 hours"
2. Check Monitor Hub for pipeline failures in the last 3 hours
3. If pipeline failed: apply the appropriate runbook
4. If pipeline succeeded but data is stale:
   a. Check Lakehouse table last-modified timestamp
   b. Check if the pipeline actually wrote data (review output row count in logs)
   c. Check if a Delta OPTIMIZE is blocking readers
5. Estimate restoration time → communicate to stakeholders
6. Trigger a manual pipeline re-run
7. Confirm freshness is restored
8. Write a brief incident post-mortem
```

---

## 10. Error Handling and Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| Monitor Hub shows no history | User lacks Contributor role on workspace | Assign Contributor+ role |
| Pipeline runs but never completes | Activity timeout; infinite loop | Set explicit timeout on ForEach/Until activities; add cancel trigger |
| Notebook session lost mid-run | Spark session timeout (default: 20 min idle) | Set session.timeout = 240 (4h) in Spark conf; add intermediate writes |
| Alert fires repeatedly for same failure | No cooldown; alert not resolving | Add cooldown (Data Activator) or auto-resolve logic |
| Log Analytics data not appearing | Diagnostic settings not configured or propagation lag | Allow 10–15 min for first logs; verify diagnostic settings are active |

---

## 11. Performance and Limits

| Resource | Limit | Notes |
|----------|-------|-------|
| Monitor Hub history | 30 days | Export to Log Analytics for longer retention |
| Pipeline run details retention | 30 days | |
| Max concurrent pipeline activities | 40 (default) | Configurable via pipeline settings |
| Spark session timeout | 20 minutes idle (default) | Set `livy.server.interactive.heartbeat.timeout = 3600` to extend |
| Data Activator trigger history | 30 days | |
| Log Analytics ingestion lag | 5–10 minutes | |

---

## Progressive Disclosure — Reference Files

| Topic | File |
|---|---|
| Fabric monitoring — Monitor Hub API, activity history, workspace monitoring | [`references/fabric-monitoring.md`](./references/fabric-monitoring.md) |
| Alerting — Data Activator patterns, Azure Monitor alerts, notification routing | [`references/alerting.md`](./references/alerting.md) |
| Capacity metrics — KQL diagnostics, throttling analysis, SLO measurement | [`references/capacity-metrics.md`](./references/capacity-metrics.md) |
