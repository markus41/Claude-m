# SKU Sizing — CU Consumption by Workload, Sizing Methodology, and Cost Optimization

This reference covers CU consumption benchmarks by Fabric workload type, a sizing methodology for right-sizing capacities, and cost optimization strategies.

---

## CU Consumption Benchmarks

### Spark / Notebooks

| Scenario | Approximate CU Consumption |
|----------|--------------------------|
| Small Spark job (1 GB data, 1 executor) | 50–200 CU-seconds |
| Medium Spark job (10 GB data, 4 executors) | 500–2,000 CU-seconds |
| Large Spark job (100 GB data, 8 executors) | 5,000–20,000 CU-seconds |
| Notebook interactive cell (medium query) | 20–100 CU-seconds |
| Delta OPTIMIZE + VACUUM on 50 GB table | 2,000–5,000 CU-seconds |
| Streaming Spark job (1 event/sec) | ~10 CU-seconds per minute (continuous) |

### Data Pipelines

| Scenario | Approximate CU Consumption |
|----------|--------------------------|
| Copy activity (1 GB file) | 50–200 CU-seconds |
| Copy activity (100 GB file, parallel) | 1,000–5,000 CU-seconds |
| ForEach with 10 parallel activities | 3× single activity CU |
| Pipeline orchestration (scheduling overhead) | 5–20 CU-seconds per run |
| Dataflow Gen2 (1 GB transformation) | 200–500 CU-seconds |

### Semantic Model Refresh

| Scenario | Approximate CU Consumption |
|----------|--------------------------|
| Small Import model (1 GB, 5 tables) | 100–500 CU-seconds |
| Medium Import model (10 GB, 20 tables) | 1,000–5,000 CU-seconds |
| Large Import model (50 GB, 50 tables) | 10,000–50,000 CU-seconds |
| Incremental refresh (1 partition) | 200–2,000 CU-seconds |
| Direct Lake model framing | 5–50 CU-seconds |

### KQL / Real-Time Analytics

| Scenario | Approximate CU Consumption |
|----------|--------------------------|
| KQL query (<1M rows returned) | 10–100 CU-seconds |
| KQL query (large aggregation, >1B rows scanned) | 100–1,000 CU-seconds |
| Streaming ingestion (100 events/sec) | ~50 CU-seconds per minute |
| Materialized view rebuild (100M rows) | 500–5,000 CU-seconds |
| Real-Time Dashboard refresh (10 tiles, 30s) | 10–50 CU-seconds per refresh cycle |

### Report Rendering

| Scenario | Approximate CU Consumption |
|----------|--------------------------|
| Power BI report page load (Import model) | 5–50 CU-seconds |
| Power BI report page load (Direct Lake) | 10–100 CU-seconds |
| Power BI report page load (DirectQuery) | 50–500 CU-seconds (depends on query) |
| Power BI report (1,000 concurrent users) | 50,000–500,000 CU-seconds per load cycle |
| Paginated report (large export to PDF) | 200–2,000 CU-seconds |

*All benchmarks are approximations. Actual CU consumption varies significantly based on data volume, query complexity, parallelism settings, and hardware within the capacity.*

---

## Sizing Methodology

### Step 1: Inventory Workloads

Create a workload inventory:

```python
# Workload inventory template
workloads = [
    # Semantic model refreshes
    {"name": "SalesModel", "type": "SemanticModelRefresh", "size_gb": 15, "frequency_per_day": 4, "priority": "high"},
    {"name": "FinanceModel", "type": "SemanticModelRefresh", "size_gb": 5, "frequency_per_day": 1, "priority": "medium"},

    # Spark jobs
    {"name": "DailyETL", "type": "SparkJob", "data_gb": 50, "frequency_per_day": 1, "priority": "high"},
    {"name": "WeeklyReporting", "type": "SparkJob", "data_gb": 200, "frequency_per_day": 0.14, "priority": "low"},  # weekly

    # Report users
    {"name": "ReportUsers", "type": "ReportLoad", "concurrent_users": 200, "peak_hours": 4},
]
```

### Step 2: Estimate Daily CU Budget

```python
def estimate_daily_cu(workloads: list) -> float:
    """Rough estimate of daily CU consumption."""
    total_cu = 0

    for w in workloads:
        wtype = w["type"]
        freq = w.get("frequency_per_day", 1)

        if wtype == "SemanticModelRefresh":
            # ~200 CU-seconds per GB of model size
            cu_per_run = w["size_gb"] * 200
            total_cu += cu_per_run * freq

        elif wtype == "SparkJob":
            # ~100 CU-seconds per GB processed
            cu_per_run = w["data_gb"] * 100
            total_cu += cu_per_run * freq

        elif wtype == "ReportLoad":
            # ~20 CU-seconds per user per load, assuming 3 loads/user/hour × peak hours
            cu_per_hour = w["concurrent_users"] * 20 * 3
            total_cu += cu_per_hour * w["peak_hours"]

    return total_cu

# Calculate recommended SKU
daily_cu = estimate_daily_cu(workloads)
cu_per_second_needed = daily_cu / 86400

# Add 30% headroom
cu_with_headroom = cu_per_second_needed * 1.3

sku_thresholds = {2: "F2", 4: "F4", 8: "F8", 16: "F16", 32: "F32", 64: "F64",
                  128: "F128", 256: "F256", 512: "F512"}

recommended_sku = "F2048"
for cu, sku in sorted(sku_thresholds.items()):
    if cu_with_headroom <= cu:
        recommended_sku = sku
        break

print(f"Estimated daily CU: {daily_cu:,.0f}")
print(f"Average CU rate needed: {cu_per_second_needed:.1f} CU/s")
print(f"With 30% headroom: {cu_with_headroom:.1f} CU/s")
print(f"Recommended SKU: {recommended_sku}")
```

### Step 3: Account for Peak Bursting

The SKU's CU rate must accommodate peak bursts, not just the average. Peak scenarios to size for:

| Scenario | Peak Multiplier |
|----------|----------------|
| All daily refreshes running simultaneously | 5–10× average |
| Morning report rush (9 AM login surge) | 3–5× average |
| Month-end reporting (all models + reports) | 10–20× average |
| Ad-hoc Spark jobs during business hours | 2–3× average |

**Rule of thumb**: Size SKU to handle the average × 3 for normal days, and have a plan to temporarily scale up for month-end or quarterly peaks.

### Step 4: Validate with Capacity Metrics

After 2–4 weeks on the initial SKU, use the Capacity Metrics app to validate:

```kql
// Check if the capacity is consistently over 70% utilized
capacityMetrics
| where TimeGenerated > ago(14d)
| where MetricName == "CUUtilizationPercentage"
| summarize
    AvgUtil = avg(MetricValue),
    P95Util = percentile(MetricValue, 95),
    MaxUtil = max(MetricValue),
    TimeOver80 = countif(MetricValue > 80),
    TotalMeasurements = count()
    by bin(TimeGenerated, 1d)
| extend PctTimeOver80 = round(100.0 * TimeOver80 / TotalMeasurements, 1)
| order by TimeGenerated desc
```

**Upgrade signal**: If P95 utilization is consistently > 80% or if throttling events occur regularly, upgrade the SKU.
**Downgrade signal**: If average utilization is < 30% and no throttling occurs, consider downgrading.

---

## Cost Optimization Strategies

### Strategy 1: Pause Non-Production Capacities

```powershell
# Schedule: Pause dev/test capacity on weekends and nights
# Run this script via Azure Automation or Logic App

$PROD_CAPACITY_ID = "prod-capacity-id"
$DEV_CAPACITY_ID = "dev-capacity-id"

$hour = (Get-Date).ToUniversalTime().Hour
$dayOfWeek = (Get-Date).ToUniversalTime().DayOfWeek

$shouldPauseDev = ($hour -lt 7 -or $hour -ge 20) -or
                  ($dayOfWeek -in @("Saturday", "Sunday"))

$token = (az account get-access-token --resource https://api.fabric.microsoft.com --query accessToken -o tsv)
$headers = @{ "Authorization" = "Bearer $token" }

if ($shouldPauseDev) {
    Invoke-RestMethod -Uri "https://api.fabric.microsoft.com/v1/capacities/$DEV_CAPACITY_ID/suspend" `
      -Method POST -Headers $headers
    Write-Host "Dev capacity paused"
} else {
    Invoke-RestMethod -Uri "https://api.fabric.microsoft.com/v1/capacities/$DEV_CAPACITY_ID/resume" `
      -Method POST -Headers $headers
    Write-Host "Dev capacity resumed"
}
```

**Savings estimate** (F32 dev capacity):
- 8 hours active/day × 5 days/week = 40 hours/week active (out of 168)
- Savings: (168 - 40) / 168 = ~76% cost reduction for dev capacity

### Strategy 2: Schedule Off-Peak for Background Workloads

Move non-urgent workloads to off-peak hours (midnight–5 AM):

| Workload | Move to Off-Peak | Savings |
|----------|-----------------|---------|
| Large semantic model refreshes (> 10 GB) | Yes — run at 2 AM | Avoids throttling during business hours |
| Historical data re-processing | Yes — run on weekends | Free up capacity for interactive workloads |
| Delta OPTIMIZE + VACUUM | Yes — weekly at 3 AM | No impact on report users |
| Large Spark ETL for next day's reporting | Run at 11 PM–3 AM | Data ready before users arrive |
| On-demand ad-hoc analysis | Keep during business hours | User-facing, cannot defer |

### Strategy 3: Separate Capacities by Workload Type

For organizations with both high-frequency interactive workloads and heavy batch jobs:

```
Capacity A: F32 — Interactive (Reports + KQL queries)
  - All workspaces used by report consumers
  - Real-Time Analytics workspaces
  - Low-latency SLA required

Capacity B: F16 — Batch (ETL + Refreshes)
  - Data engineering workspaces
  - Semantic model refresh workspaces
  - Can tolerate throttling/delay

Capacity C: F4 — Development
  - Dev/test workspaces
  - Paused on nights and weekends
```

This separation ensures that a heavy Spark ETL job on Capacity B does not throttle report users on Capacity A.

### Strategy 4: Right-Size Based on Actual Usage

```python
# Monthly SKU review — check if current SKU is over- or under-provisioned
def sku_rightsizing_recommendation(avg_util_pct: float, p95_util_pct: float,
                                   throttling_pct: float) -> str:
    """Return a sizing recommendation based on 30-day metrics."""
    if throttling_pct > 5 or p95_util_pct > 90:
        return "UPGRADE: Significant throttling or near-capacity at P95"
    elif avg_util_pct < 25 and p95_util_pct < 50 and throttling_pct == 0:
        return "DOWNGRADE: Consistently underutilized — consider halving the SKU"
    elif avg_util_pct < 40 and throttling_pct == 0:
        return "MONITOR: Utilization is healthy but has headroom — no action needed"
    else:
        return "OK: Utilization is appropriate for current SKU"
```

---

## Multi-Capacity Architecture Patterns

### Pattern A: Single Capacity (Most Organizations)

```
All workspaces → Single F64 capacity
Pros: Simple management, shared burst capacity
Cons: Workloads compete for CUs; one heavy job can throttle all users
Best for: Organizations with < 50 active users and predictable workloads
```

### Pattern B: Prod/Non-Prod Split

```
Production workspaces → F64 capacity (always on)
Dev/Test workspaces → F16 capacity (paused nights/weekends)
Pros: Isolates production from dev experimentation
Cons: Two capacities to manage
Best for: Most medium-to-large organizations
```

### Pattern C: Workload-Based Split (Enterprise)

```
Interactive/BI capacity → F128 (always on)
Batch/ETL capacity → F64 (business hours only)
Dev/Test capacity → F16 (business hours, paused otherwise)
Pros: Full isolation; each workload type sized independently
Cons: More complex; cross-capacity workspace cannot share resources
Best for: Large organizations with >100 users and strict SLAs
```

---

## Limits

| Resource | Limit | Notes |
|----------|-------|-------|
| Minimum SKU for Fabric features | F8 | F2/F4 lack some features |
| Maximum SKU | F2048 | 2048 CUs |
| SKU steps | F2, F4, F8, F16, F32, F64, F128, F256, F512, F1024, F2048 | No fractional SKUs |
| Capacity billing granularity | 1 hour | Minimum billable unit after resume |
| Cost per CU-hour (approximate) | $0.18 USD | Varies by region; check Azure pricing |
