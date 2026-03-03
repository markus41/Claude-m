# Capacity Metrics — KQL Diagnostics, Throttling Analysis, SLO Measurement

This reference covers the Fabric Capacity Metrics app queries, KQL-based diagnostics for throttling and performance, SLO measurement patterns, and capacity health reporting.

---

## Capacity Metrics App Overview

The Microsoft Fabric Capacity Metrics app connects to the underlying KQL database that stores capacity telemetry. Key tables:

| Table | Contents |
|-------|----------|
| `capacityOperations` | Individual operation CU consumption per item run |
| `capacityMetrics` | Aggregated metrics: CU%, throttling%, carryforward debt |
| `capacityThrottlingEvents` | Per-event throttling details |
| `backgroundJobs` | Background operation delays and queueing times |

---

## Core Diagnostic KQL Queries

### CU Utilization Overview

```kql
// Daily CU utilization summary — last 30 days
capacityMetrics
| where TimeGenerated > ago(30d)
| where MetricName == "CUUtilizationPercentage"
| summarize
    AvgUtil = avg(MetricValue),
    P95Util = percentile(MetricValue, 95),
    MaxUtil = max(MetricValue),
    TimeOver80 = countif(MetricValue > 80)
    by bin(TimeGenerated, 1d)
| extend PctTimeOver80 = round(100.0 * TimeOver80 / (24 * 60 / 5), 1)  // 5-min buckets
| project Date = bin(TimeGenerated, 1d), AvgUtil = round(AvgUtil, 1), P95Util, MaxUtil, PctTimeOver80
| order by Date desc
```

### Top CU Consumers by Workspace

```kql
// Top 15 workspaces by CU consumption — last 7 days
capacityOperations
| where TimeGenerated > ago(7d)
| summarize
    TotalCU = sum(TotalCUSeconds),
    OperationCount = count(),
    AvgCUPerOp = avg(TotalCUSeconds)
    by WorkspaceName
| top 15 by TotalCU desc
| extend TotalCU = round(TotalCU, 0), AvgCUPerOp = round(AvgCUPerOp, 1)
| project WorkspaceName, TotalCU, OperationCount, AvgCUPerOp
```

### Throttling Incident Timeline

```kql
// Throttling incidents — identify when and how long the capacity was throttled
capacityMetrics
| where TimeGenerated > ago(14d)
| where MetricName in ("InteractiveThrottlingPercentage", "BackgroundThrottlingPercentage")
| summarize MaxThrottling = max(MetricValue) by bin(TimeGenerated, 5m), MetricName
| where MaxThrottling > 0
| extend IsInteractive = MetricName == "InteractiveThrottlingPercentage"
| project TimeGenerated, MetricName, MaxThrottling, IsInteractive
| order by TimeGenerated asc
```

### Carryforward Debt Trend

```kql
// Track carryforward debt accumulation and recovery over time
capacityMetrics
| where TimeGenerated > ago(7d)
| where MetricName == "CarryforwardCUSeconds"
| summarize AvgDebt = avg(MetricValue), MaxDebt = max(MetricValue)
    by bin(TimeGenerated, 15m)
| render timechart
```

### Identify Operation Types Causing Throttling

```kql
// Operations running during throttling events (correlated by time)
let ThrottledPeriods = capacityMetrics
    | where TimeGenerated > ago(7d)
    | where MetricName == "InteractiveThrottlingPercentage" and MetricValue > 10
    | distinct bin(TimeGenerated, 5m);

capacityOperations
| where TimeGenerated > ago(7d)
| where bin(TimeGenerated, 5m) in (ThrottledPeriods)
| summarize CU = sum(TotalCUSeconds), Count = count()
    by WorkspaceName, ItemKind, OperationName
| order by CU desc
| take 20
```

### Schedule Collision Heatmap

```kql
// Jobs starting in the same 5-minute windows (potential schedule collisions)
capacityOperations
| where TimeGenerated > ago(30d)
| where OperationName in ("SemanticModelRefresh", "DataPipelineRun", "SparkJobRun", "DataflowRefresh")
| summarize JobCount = count(), TotalCU = sum(TotalCUSeconds)
    by bin(TimeGenerated, 5m)
| where JobCount >= 5
| project TimeWindow = bin(TimeGenerated, 5m), JobCount, TotalCU = round(TotalCU, 0)
| order by TotalCU desc
```

---

## SLO Measurement with KQL

### Pipeline Reliability SLO

```kql
// 30-day pipeline success rate SLO
let SLOTarget = 99.0;
capacityOperations
| where TimeGenerated > ago(30d)
| where OperationName == "DataPipelineRun"
| summarize
    Total = count(),
    Succeeded = countif(Status == "Succeeded"),
    Failed = countif(Status == "Failed")
    by WorkspaceName, ItemName
| extend SuccessRate = round(100.0 * Succeeded / Total, 2)
| extend SLOMet = SuccessRate >= SLOTarget
| extend ErrorBudgetUsed = round(100.0 - SuccessRate, 2)
| project WorkspaceName, PipelineName = ItemName, Total, Succeeded, Failed, SuccessRate, SLOMet, ErrorBudgetUsed
| order by SuccessRate asc
```

### Freshness SLO Tracker

```kql
// Table freshness SLO — assumes a 'TableFreshnessLog' table is populated by a monitoring notebook
TableFreshnessLog
| where TimeGenerated > ago(30d)
| summarize
    TotalChecks = count(),
    BreachCount = countif(FreshnessMinutes > SLOMinutes),
    AvgFreshness = avg(FreshnessMinutes),
    P95Freshness = percentile(FreshnessMinutes, 95),
    MaxFreshness = max(FreshnessMinutes)
    by TableName, SLOMinutes
| extend SLOCompliance = round(100.0 * (TotalChecks - BreachCount) / TotalChecks, 1)
| project TableName, SLOMinutes, TotalChecks, BreachCount, AvgFreshness = round(AvgFreshness, 0), P95Freshness, MaxFreshness, SLOCompliance
| order by SLOCompliance asc
```

### Interactive Latency SLO

```kql
// Report render latency at P95 — SLO: < 5 seconds
capacityOperations
| where TimeGenerated > ago(30d)
| where OperationName == "ReportQuery"
| summarize
    P50 = percentile(DurationMs / 1000.0, 50),
    P95 = percentile(DurationMs / 1000.0, 95),
    P99 = percentile(DurationMs / 1000.0, 99),
    Count = count()
    by WorkspaceName, ItemName
| extend P95_SLO_Met = P95 <= 5.0
| order by P95 desc
```

---

## Capacity Health Scorecard

```kql
// Capacity health scorecard — weekly summary
let WeekStart = startofweek(now());
let WeekEnd = now();
let TotalBuckets = toscalar(
    capacityMetrics
    | where TimeGenerated between (WeekStart .. WeekEnd)
    | where MetricName == "CUUtilizationPercentage"
    | count
);

capacityMetrics
| where TimeGenerated between (WeekStart .. WeekEnd)
| summarize
    AvgCU = round(avgif(MetricValue, MetricName == "CUUtilizationPercentage"), 1),
    P95CU = round(percentileif(MetricValue, 95, MetricName == "CUUtilizationPercentage"), 1),
    MaxCU = round(maxif(MetricValue, MetricName == "CUUtilizationPercentage"), 1),
    InteractiveThrottlePct = round(100.0 * countif(MetricName == "InteractiveThrottlingPercentage" and MetricValue > 0) / TotalBuckets, 2),
    BackgroundThrottlePct = round(100.0 * countif(MetricName == "BackgroundThrottlingPercentage" and MetricValue > 0) / TotalBuckets, 2),
    MaxCarryforward = round(maxif(MetricValue, MetricName == "CarryforwardCUSeconds"), 0)
| extend HealthGrade = case(
    InteractiveThrottlePct > 5, "RED",
    InteractiveThrottlePct > 1 or P95CU > 90, "YELLOW",
    "GREEN"
)
```

---

## Automated Weekly Report

```python
# Python script to generate and email a weekly capacity health report
import requests
from datetime import datetime, timedelta, timezone

def run_kql_query(query: str, workspace_id: str, token: str) -> list:
    """Execute a KQL query against Log Analytics."""
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    resp = requests.post(
        f"https://api.loganalytics.io/v1/workspaces/{workspace_id}/query",
        headers=headers,
        json={"query": query, "timespan": "P7D"}
    )
    resp.raise_for_status()
    results = resp.json()

    # Parse column names and rows
    columns = [c["name"] for c in results["tables"][0]["columns"]]
    rows = results["tables"][0]["rows"]
    return [dict(zip(columns, row)) for row in rows]

def generate_weekly_report(log_workspace_id: str, token: str) -> str:
    """Generate a weekly capacity health report as markdown."""

    # Query 1: Overall health
    health_query = """
    capacityMetrics
    | where TimeGenerated > ago(7d)
    | summarize
        AvgCU = round(avgif(MetricValue, MetricName == "CUUtilizationPercentage"), 1),
        ThrottlingEvents = countif(MetricName == "InteractiveThrottlingPercentage" and MetricValue > 0)
    """
    health = run_kql_query(health_query, log_workspace_id, token)

    # Query 2: Top consumers
    consumers_query = """
    capacityOperations
    | where TimeGenerated > ago(7d)
    | summarize TotalCU = sum(TotalCUSeconds) by WorkspaceName
    | top 5 by TotalCU desc
    """
    consumers = run_kql_query(consumers_query, log_workspace_id, token)

    # Query 3: Failed pipelines
    failures_query = """
    capacityOperations
    | where TimeGenerated > ago(7d)
    | where OperationName == "DataPipelineRun" and Status == "Failed"
    | summarize FailureCount = count() by ItemName
    | order by FailureCount desc
    | take 10
    """
    failures = run_kql_query(failures_query, log_workspace_id, token)

    week_end = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    report = f"""# Fabric Capacity Weekly Report — Week ending {week_end}

## Health Summary
- Average CU Utilization: {health[0]['AvgCU']}%
- Interactive Throttling Events: {health[0]['ThrottlingEvents']}

## Top 5 CU Consumers
"""
    for c in consumers:
        report += f"- {c['WorkspaceName']}: {c['TotalCU']:,.0f} CU-seconds\n"

    report += "\n## Failed Pipelines (last 7 days)\n"
    for f in failures:
        report += f"- {f['ItemName']}: {f['FailureCount']} failures\n"

    return report
```

---

## Error Codes and Remediation

| Error | Meaning | Fix |
|-------|---------|-----|
| `Table not found: capacityOperations` | Metrics app not connected to the right KQL database | Verify the Capacity Metrics app data source points to the correct capacity metrics database |
| `Query timeout in metrics app` | Long-running KQL query exceeded tile timeout | Add `| take 10000` limit; use materialized views for heavy aggregations |
| `No data in capacityMetrics` | Capacity metrics collection not enabled | Enable in Fabric admin portal > Monitoring > Capacity metrics |
| `Log Analytics table not found` | Diagnostic settings not configured for Fabric | Configure diagnostic settings to send Fabric logs to Log Analytics |

---

## Limits

| Resource | Limit | Notes |
|----------|-------|-------|
| Capacity Metrics data retention | 30 days | Download to Log Analytics for longer retention |
| capacityOperations granularity | Per-operation (not per-second) | CU consumption aggregated per operation run |
| capacityMetrics granularity | 5-minute buckets | Not real-time; ~5-minute lag |
| Log Analytics query timeout | 2 minutes | Split long queries into smaller time ranges |
| Capacity Metrics app refresh | Every 15 minutes | Not a real-time dashboard |
