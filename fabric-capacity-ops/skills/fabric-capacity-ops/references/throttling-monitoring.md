# Throttling and Monitoring — Capacity Metrics App, KQL Diagnostics, Throttling Types

This reference covers throttling behavior in Fabric capacities, monitoring via the Capacity Metrics app, KQL diagnostic queries, and remediation workflows.

---

## Throttling Model

Fabric uses a multi-tier throttling model based on CU consumption rates and a smoothing window.

### Smoothing Tiers

| Window | Allowed Overage | Consequence |
|--------|----------------|-------------|
| 10-second | 10× SKU rate | Operations queued briefly |
| 1-minute | 2× SKU rate | Interactive operations slowed (user-facing) |
| 24-hour | 0× (no overage allowed) | Background operations delayed up to 24 hours |

**Example — F32 (32 CUs)**:
- 10-second burst budget: 32 CU/s × 10s × 10 = 3,200 CU-seconds
- 1-minute budget: 32 CU/s × 60s × 2 = 3,840 CU-seconds
- 24-hour budget: 32 CU/s × 86,400s = 2,764,800 CU-seconds (daily)

### Interactive vs Background Throttling

**Interactive throttling** — affects user-facing operations:
- Report page loads
- KQL queries in Real-Time Dashboards
- On-demand notebook runs
- Semantic model queries from reports

Effect: Users experience slow response or "Capacity is busy" messages.

**Background throttling** — affects scheduled operations:
- Scheduled semantic model refreshes
- Data pipeline scheduled runs
- Scheduled Spark notebooks
- Dataflow refreshes

Effect: Operations are queued and delayed (not cancelled). Delay can be up to 24 hours in severe cases.

### Carryforward Debt

When CU consumption exceeds the smoothing budget, a "carryforward debt" accumulates:

```
At time T=0:   Capacity = F64 (64 CUs/s)
Spark job runs: Consumes 1,000 CU/s for 10 seconds = 10,000 CU-seconds used
Budget (10s):   64 × 10 = 640 CU-seconds
Debt:           10,000 - 640 = 9,360 CU-second debt

Recovery:
  At 64 CU/s budget rate with 0 consumption: 9,360 / 64 = ~146 seconds to recover
  During recovery: capacity throttles new operations proportionally
```

---

## Capacity Metrics App

The Microsoft Fabric Capacity Metrics app (from AppSource) is the primary monitoring tool.

### Key Pages

| Page | Purpose |
|------|---------|
| Overview | CU utilization gauge, throttling %, carryforward debt summary |
| By Item | CU breakdown per workspace/item |
| By Timepoint | CU usage timeline at 5-minute granularity |
| Throttling | Interactive and background throttling events |
| Operations | Drill into individual operation CU consumption |
| Background Jobs | Status and delay of scheduled background operations |

### Metrics Explained

| Metric | Description | Alert Threshold |
|--------|-------------|----------------|
| CU Utilization % | Percentage of SKU CUs used in current period | > 80% sustained |
| Background Throttling % | % of time background jobs are being delayed | > 5% |
| Interactive Throttling % | % of time interactive queries are being slowed | > 1% |
| Carryforward Debt (CU-sec) | Accumulated CU debt from overages | > 1× daily budget |
| Smoothed CU % | 24-hour rolling average utilization | > 90% |
| Direct Lake Fallback Count | Semantic model Direct Lake → DirectQuery fallbacks | > 0 per hour |

---

## KQL Diagnostic Queries

These queries run against the Log Analytics workspace integrated with Fabric or within the Capacity Metrics app's underlying dataset.

### Top CU Consumers

```kql
// Top 20 operations by CU consumption in last 7 days
capacityOperations
| where TimeGenerated > ago(7d)
| summarize
    TotalCU = sum(TotalCUSeconds),
    OperationCount = count(),
    AvgCU = avg(TotalCUSeconds)
    by WorkspaceName, ItemKind, ItemName, OperationName
| top 20 by TotalCU desc
| extend TotalCU = round(TotalCU, 1), AvgCU = round(AvgCU, 2)
| project WorkspaceName, ItemKind, ItemName, OperationName, TotalCU, OperationCount, AvgCU
```

### Throttling Timeline

```kql
// Interactive and background throttling over time
capacityMetrics
| where TimeGenerated > ago(7d)
| where MetricName in ("InteractiveThrottlingPercentage", "BackgroundThrottlingPercentage")
| summarize MaxValue = max(MetricValue), AvgValue = avg(MetricValue)
    by bin(TimeGenerated, 15m), MetricName
| render timechart
```

### Schedule Collision Detection

```kql
// Find time windows where many jobs started simultaneously
capacityOperations
| where TimeGenerated > ago(7d)
| where OperationName in ("DataPipelineRun", "SemanticModelRefresh", "SparkJobRun", "DataflowRefresh")
| summarize ConcurrentJobs = count() by bin(TimeGenerated, 5m)
| where ConcurrentJobs >= 5
| extend WindowStart = TimeGenerated, WindowEnd = TimeGenerated + 5m
| order by ConcurrentJobs desc
```

### Direct Lake Fallback Monitoring

```kql
// Direct Lake fallback events — indicates capacity under pressure
capacityOperations
| where TimeGenerated > ago(24h)
| where OperationName == "DirectLakeFallback"
| summarize FallbackCount = count() by WorkspaceName, ItemName, bin(TimeGenerated, 1h)
| where FallbackCount > 0
| order by FallbackCount desc
```

### CU Budget vs Consumption

```kql
// Daily CU consumption vs budget (F64 = 64 CU/s × 86400s = 5,529,600 CU-seconds/day)
let DailyCUBudget = 64 * 86400;  // Adjust for your SKU
capacityOperations
| where TimeGenerated > ago(30d)
| summarize DailyCU = sum(TotalCUSeconds) by bin(TimeGenerated, 1d)
| extend BudgetPct = round(100.0 * DailyCU / DailyCUBudget, 1)
| project Date = bin(TimeGenerated, 1d), DailyCU, BudgetPct
| render columnchart
```

### Identify Runaway Jobs

```kql
// Operations that consumed abnormally high CUs (3x the average)
let AvgCU = toscalar(
    capacityOperations
    | where TimeGenerated > ago(30d)
    | where OperationName != "DirectLakeFallback"
    | summarize avg(TotalCUSeconds)
);
capacityOperations
| where TimeGenerated > ago(7d)
| where TotalCUSeconds > AvgCU * 3
| project TimeGenerated, WorkspaceName, ItemName, OperationName, TotalCUSeconds
| order by TotalCUSeconds desc
```

---

## Capacity Metrics App — Alert Configuration

### Set Up Alerts via Azure Monitor

```bash
# Get the Log Analytics workspace ID for the Capacity Metrics data
# (Configure in Fabric admin portal > Monitoring > Log Analytics)

# Create an alert rule for sustained high CU utilization
az monitor scheduled-query create \
  --resource-group "rg-fabric-monitoring" \
  --name "FabricHighCUUtilization" \
  --scopes "/subscriptions/${SUB_ID}/resourceGroups/rg-fabric-monitoring/providers/Microsoft.OperationalInsights/workspaces/${LOG_WORKSPACE_ID}" \
  --condition-query "
    capacityMetrics
    | where MetricName == 'CUUtilizationPercentage'
    | summarize AvgUtil = avg(MetricValue) by bin(TimeGenerated, 5m)
    | where AvgUtil > 85
  " \
  --condition-threshold 0 \
  --condition-operator "GreaterThan" \
  --evaluation-frequency "5m" \
  --window-size "15m" \
  --severity 2 \
  --action-groups "/subscriptions/${SUB_ID}/resourceGroups/rg-ops/providers/microsoft.insights/actionGroups/OpsTeam"
```

### Monitoring Dashboard — Power BI

Key visuals for a Fabric capacity monitoring dashboard:

```
Row 1 — KPI cards:
  - Current CU Utilization %
  - Throttling Events (last 24h)
  - Carryforward Debt (CU-seconds)
  - Top Consuming Workspace

Row 2 — Time charts:
  - CU Utilization % (last 7 days, 15-minute bins)
  - Interactive vs Background Throttling % (last 7 days)

Row 3 — Tables:
  - Top 10 items by CU consumption (last 24h)
  - Background jobs delayed today

Row 4 — Heatmap:
  - CU utilization by hour and day-of-week (last 30 days)
```

---

## Error Codes and Remediation

| Error / Symptom | Meaning | Remediation |
|---|---|---|
| "Capacity is busy" in report | Interactive throttling active | Stagger report loads; investigate heavy background jobs running concurrently |
| Scheduled refresh running 2+ hours late | Background throttling; high carryforward debt | Move heavy Spark jobs to off-peak; add 30-min buffer before refresh schedule |
| "Spark session could not start" | Starter pool exhausted or capacity paused | Check capacity state; reduce concurrent Spark sessions; increase SKU |
| Direct Lake fallback spike | Capacity memory pressure; V-Order not applied | Apply V-Order on Delta table; reduce concurrent queries; upgrade SKU |
| Throttling even at 40% CU | Burst pattern exceeds 10-second window | Reduce job parallelism; spread concurrent operations in time |
| Background jobs never completing | Severe carryforward debt (> 24h budget) | Emergency: pause and resume capacity to reset debt; reduce load immediately |

---

## Limits

| Resource | Limit | Notes |
|----------|-------|-------|
| 10-second burst budget | 10× CU rate | Short bursts allowed without throttling |
| Carryforward debt recovery | Proportional to CU rate | At idle: clears at SKU CU rate (e.g., F64 = 64 CU/s recovery) |
| Background job delay maximum | 24 hours | Jobs delayed more than 24 hours are typically cancelled |
| Metrics app data retention | 30 days | Download to Log Analytics for longer retention |
| Log Analytics ingestion lag | 5–10 minutes | Metrics are not real-time |
| Alert minimum evaluation frequency | 5 minutes | |
