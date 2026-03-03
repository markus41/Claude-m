---
name: Fabric Capacity Operations
description: >
  Advanced Fabric capacity operations guidance for CU utilization monitoring, throttling diagnosis, workload tuning, and autoscale planning.
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
triggers:
  - fabric capacity
  - cu utilization
  - fabric throttling
  - workload settings fabric
  - fabric autoscale
  - capacity metrics app
  - fabric concurrency
  - cost performance fabric
---

# Fabric Capacity Operations

## 1. Overview

Microsoft Fabric capacities are the compute resources that power all Fabric workloads. A capacity is defined by its SKU (F2 through F2048), which determines the number of Capacity Units (CUs) available. Every operation in Fabric — Spark notebook runs, KQL queries, Data Factory pipeline executions, report refreshes, and lakehoue reads — consumes CUs. Understanding how CU consumption works, how throttling is applied, and how to tune workloads to stay within capacity limits is essential for reliable, cost-effective Fabric operations.

**SKU Overview**:
| SKU | CUs | vCores (Spark) | Use Case |
|-----|-----|----------------|----------|
| F2 | 2 | 0.25 | Development, sandbox |
| F4 | 4 | 0.5 | Small teams, dev/test |
| F8 | 8 | 1 | Small production |
| F16 | 16 | 2 | Medium production |
| F32 | 32 | 4 | Standard production |
| F64 | 64 | 8 | Large production |
| F128 | 128 | 16 | Enterprise |
| F256 | 256 | 32 | Large enterprise |
| F512 | 512 | 64 | Very large enterprise |
| F1024 | 1024 | 128 | Hyperscale |
| F2048 | 2048 | 256 | Hyperscale maximum |

---

## 2. Quick Start

### Assess Capacity Health

```bash
# Get capacity details and status
curl "https://api.fabric.microsoft.com/v1/capacities/${CAPACITY_ID}" \
  -H "Authorization: Bearer ${TOKEN}"

# List all capacities in tenant (admin)
curl "https://api.powerbi.com/v1.0/myorg/admin/capacities" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}"
```

### Check for Throttling

```kql
// In Fabric Capacity Metrics app — check if capacity is being throttled
capacityMetrics
| where TimeGenerated > ago(24h)
| where MetricName == "ThrottlingPercentage"
| summarize MaxThrottling = max(MetricValue) by bin(TimeGenerated, 5m)
| where MaxThrottling > 0
| order by TimeGenerated desc
```

---

## 3. Core Concepts

### Capacity Units (CUs) and Smoothing

CU consumption is **smoothed** over a 24-hour rolling window. Smoothing means that short bursts of high CU consumption are averaged out, allowing workloads to temporarily exceed the SKU's CU limit if the overall rolling average is within budget.

**Smoothing tiers**:
| Smoothing Period | Overage Allowed | Consequence |
|-----------------|-----------------|-------------|
| 10-second window | Up to 10x the CU rate | Queued/delayed |
| 1-minute window | Up to 2x the CU rate | Interactive throttling begins |
| 24-hour window | No overage | Background throttling (delayed by up to 24h) |

**Interactive vs Background workloads**:
| Type | Examples | Throttling behavior |
|------|----------|---------------------|
| Interactive | Report loads, KQL queries, on-demand notebook runs | Throttled immediately when capacity is under pressure; user sees slow response |
| Background | Scheduled refreshes, pipeline runs, Spark jobs | Delayed (queued) when capacity is under pressure; may be delayed up to 24 hours |

### Carryforward Debt

When a workload consumes more CUs than the capacity has available, a "carryforward debt" accumulates. Fabric uses this debt to throttle future operations proportionally. High carryforward debt means subsequent workloads will be throttled even if no active workloads are running.

```
Capacity: F64 (64 CUs)
Heavy Spark job runs: consumes 500 CU-seconds in 10 seconds
Debt accumulated: 500 - 640 (10s × 64 CUs) = -140 CU-seconds carryforward debt
Recovery time: ~2 minutes at idle before full capacity is available again
```

---

## 4. Capacity REST API

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|---------------------|----------------|-------|
| GET | `/capacities` | Fabric Capacity Viewer | — | Lists capacities accessible to caller |
| GET | `/capacities/{cId}` | Capacity Admin | — | Returns SKU, state, display name |
| PATCH | `/capacities/{cId}` | Capacity Admin | `sku`, `displayName` | Change SKU (resize) |
| POST | `/capacities/{cId}/resume` | Capacity Admin | — | Resume a paused capacity |
| POST | `/capacities/{cId}/suspend` | Capacity Admin | — | Pause a capacity (stops billing) |
| GET | `/capacities/{cId}/workspaces` | Capacity Admin | — | Lists workspaces on this capacity |
| POST | `/workspaces/{wId}/assignToCapacity` | Workspace Admin + Capacity Contributor | `capacityId` | Assign workspace to capacity |
| DELETE | `/workspaces/{wId}/unassignFromCapacity` | Workspace Admin | — | Move workspace to Shared capacity |

```bash
# Get capacity details
curl "https://api.fabric.microsoft.com/v1/capacities/${CAPACITY_ID}" \
  -H "Authorization: Bearer ${TOKEN}"

# Pause a capacity (billing stops)
curl -X POST "https://api.fabric.microsoft.com/v1/capacities/${CAPACITY_ID}/suspend" \
  -H "Authorization: Bearer ${TOKEN}"

# Resume a capacity
curl -X POST "https://api.fabric.microsoft.com/v1/capacities/${CAPACITY_ID}/resume" \
  -H "Authorization: Bearer ${TOKEN}"

# Resize capacity (e.g., F32 → F64 for peak hours)
curl -X PATCH "https://api.fabric.microsoft.com/v1/capacities/${CAPACITY_ID}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"sku": {"name": "F64", "tier": "Fabric"}}'

# Assign workspace to capacity
curl -X POST "https://api.fabric.microsoft.com/v1/workspaces/${WORKSPACE_ID}/assignToCapacity" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"capacityId": "'${CAPACITY_ID}'"}'
```

**Capacity Admin API (requires Power BI admin token)**:
```bash
# List all capacities in tenant
curl "https://api.powerbi.com/v1.0/myorg/admin/capacities" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}"

# Get workloads on a capacity
curl "https://api.powerbi.com/v1.0/myorg/admin/capacities/${CAPACITY_ID}/workloads" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}"

# Update workload settings (e.g., increase memory for Spark)
curl -X PATCH "https://api.powerbi.com/v1.0/myorg/admin/capacities/${CAPACITY_ID}/workloads/dataflow" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"state": "Enabled", "maxMemoryPercentageSetByUser": 40}'
```

---

## 5. Capacity Metrics App

The Fabric Capacity Metrics app is the primary tool for monitoring CU consumption. Install it from AppSource: search "Microsoft Fabric Capacity Metrics" in the Microsoft AppSource.

### Key Metrics

| Metric | Description | Healthy Range |
|--------|-------------|---------------|
| CU Utilization % | Percentage of capacity CUs used (10-second granularity) | < 70% average; < 100% peak |
| Throttling % | Percentage of time capacity is throttling workloads | 0% is ideal; > 10% warrants investigation |
| Carryforward Debt | Accumulated CU debt from overages | Should return to 0 within minutes of burst |
| Smoothed CU % | 24-hour smoothed utilization | < 100% consistently |
| Interactive Operations Throttled | Count of throttled user-facing operations | 0 is ideal |
| Background Operations Delayed | Count of delayed scheduled operations | > 0 requires schedule review |

### KQL Queries for Metrics App

```kql
// Top 10 operations by CU consumption (last 24 hours)
capacityOperations
| where TimeGenerated > ago(24h)
| summarize TotalCU = sum(TotalCUSeconds) by OperationName, WorkspaceName, ItemKind
| top 10 by TotalCU desc
| project WorkspaceName, ItemKind, OperationName, TotalCU = round(TotalCU, 2)

// CU consumption by workspace
capacityOperations
| where TimeGenerated > ago(7d)
| summarize TotalCU = sum(TotalCUSeconds) by WorkspaceName
| order by TotalCU desc

// Throttling events over time
capacityMetrics
| where TimeGenerated > ago(24h)
| where MetricName == "ThrottlingPercentage"
| summarize MaxThrottling = max(MetricValue), AvgThrottling = avg(MetricValue)
    by bin(TimeGenerated, 15m)
| where MaxThrottling > 0
| render timechart

// Direct Lake fallback frequency (important for semantic model performance)
capacityOperations
| where TimeGenerated > ago(24h)
| where OperationName == "DirectLakeFallback"
| summarize FallbackCount = count() by WorkspaceName, ItemName
| order by FallbackCount desc
```

---

## 6. Throttling Diagnosis

### Throttling Symptoms

| Symptom | Likely Cause |
|---------|-------------|
| Reports load slowly or time out | Interactive throttling; capacity at CU limit |
| Scheduled refreshes run late | Background throttling; carryforward debt from earlier jobs |
| Notebooks queue for a long time | Spark starter pool exhausted or capacity throttled |
| "Capacity throttled" error in pipelines | Background workload delayed due to CU debt |

### Identify Peak Usage Windows

```kql
// Heatmap: CU usage by hour of day and day of week
capacityOperations
| where TimeGenerated > ago(30d)
| extend HourOfDay = hourofday(TimeGenerated), DayOfWeek = dayofweek(TimeGenerated)
| summarize AvgCU = avg(TotalCUSeconds) by HourOfDay, DayOfWeek
| order by DayOfWeek asc, HourOfDay asc

// Find schedule collisions — jobs starting at the same time
capacityOperations
| where TimeGenerated > ago(7d)
| where OperationName in ("DataPipelineRun", "SemanticModelRefresh", "SparkJobRun")
| summarize JobCount = count() by bin(TimeGenerated, 5m)
| where JobCount > 5  // More than 5 concurrent scheduled jobs
| order by TimeGenerated desc
```

### Throttling Investigation Checklist

```
1. Check Fabric Capacity Metrics app for throttling events (last 24h)
2. Identify which workspaces / operations caused the CU spike
3. Check for schedule collisions (multiple heavy jobs starting at the same time)
4. Check carryforward debt recovery time
5. Assess: is this a recurring pattern or a one-time event?
6. Options:
   a. Stagger schedules to distribute CU load
   b. Reduce parallelism in Spark jobs (fewer executors)
   c. Move non-critical workloads to off-peak hours
   d. Upgrade SKU (increase CUs)
   e. Split workloads across multiple capacities
```

---

## 7. Workload Tuning

### Spark Notebook Optimization

```python
# Reduce executor count for low-priority background jobs
spark.conf.set("spark.executor.instances", "2")  # Down from default 4-8
spark.conf.set("spark.executor.cores", "2")

# Use Delta table optimization features to reduce Spark CU consumption
# 1. V-Order on write (Fabric default — keep enabled for best read performance)
spark.conf.set("spark.microsoft.delta.optimizeWrite.enabled", "true")
spark.conf.set("spark.microsoft.delta.optimizeWrite.binSize", "1073741824")  # 1 GB

# 2. Auto-compact small files (reduces future read CU)
spark.conf.set("spark.databricks.delta.autoCompact.enabled", "true")
spark.conf.set("spark.databricks.delta.autoCompact.minNumFiles", "50")

# 3. Use ZORDER for frequently filtered columns (reduces scan CU)
spark.sql("OPTIMIZE sales_lakehouse.FactSales ZORDER BY (CustomerId, OrderDate)")
```

### Schedule Staggering

```python
# Python script to stagger pipeline refresh schedules
# Distribute 12 semantic model refreshes across 3-hour window
import datetime

BASE_HOUR = 5  # Start at 5 AM
INTERVAL_MINUTES = 15  # 15 minutes between each refresh

refresh_times = []
for i in range(12):
    offset = i * INTERVAL_MINUTES
    hour = BASE_HOUR + offset // 60
    minute = offset % 60
    refresh_times.append(f"{hour:02d}:{minute:02d}")

print("Recommended refresh schedule:")
for i, t in enumerate(refresh_times):
    print(f"  Model {i+1}: {t}")
```

### Pipeline Parallelism Control

```json
// In Data Pipeline — reduce concurrent activity runs
{
  "name": "ForEachTable",
  "type": "ForEach",
  "properties": {
    "isSequential": false,
    "batchCount": 3,  // Run only 3 tables in parallel (default is 20)
    "activities": [...]
  }
}
```

### Semantic Model Refresh Optimization

```bash
# Enhanced refresh with controlled parallelism
curl -X POST \
  "https://api.powerbi.com/v1.0/myorg/groups/${WORKSPACE_ID}/datasets/${DATASET_ID}/refreshes" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "full",
    "commitMode": "transactional",
    "maxParallelism": 3,    // Limit parallel table processing (default: up to 16)
    "retryCount": 1,
    "notifyOption": "MailOnFailure"
  }'
```

---

## 8. Autoscale Planning

### Autoscale for Fabric Capacities

Fabric does not natively support automatic SKU scaling (unlike Azure Analysis Services). However, you can implement scheduled scaling using the Fabric REST API and Azure automation:

```powershell
# Azure Function / Logic App — Scale up for business hours, scale down for nights
param($timer)

$TenantId = $env:FABRIC_TENANT_ID
$ClientId = $env:FABRIC_CLIENT_ID
$ClientSecret = $env:FABRIC_CLIENT_SECRET
$CapacityId = $env:CAPACITY_ID

# Get access token
$tokenBody = @{
    grant_type    = "client_credentials"
    client_id     = $ClientId
    client_secret = $ClientSecret
    scope         = "https://api.fabric.microsoft.com/.default"
}
$token = (Invoke-RestMethod -Uri "https://login.microsoftonline.com/$TenantId/oauth2/v2.0/token" -Method POST -Body $tokenBody).access_token
$headers = @{ "Authorization" = "Bearer $token"; "Content-Type" = "application/json" }

# Determine target SKU based on current hour (UTC)
$hour = (Get-Date).ToUniversalTime().Hour
$targetSku = if ($hour -ge 7 -and $hour -lt 20) { "F64" } else { "F16" }

# Scale capacity
$body = @{ sku = @{ name = $targetSku; tier = "Fabric" } } | ConvertTo-Json
Invoke-RestMethod -Uri "https://api.fabric.microsoft.com/v1/capacities/$CapacityId" `
  -Method PATCH -Headers $headers -Body $body

Write-Host "Scaled capacity to $targetSku at $((Get-Date).ToUniversalTime())"
```

### Cost Estimation by SKU

| SKU | Monthly Cost (USD, approx.) | CUs | Cost per CU-hour |
|-----|---------------------------|-----|-----------------|
| F2 | ~$263 | 2 | ~$0.18 |
| F4 | ~$526 | 4 | ~$0.18 |
| F8 | ~$1,052 | 8 | ~$0.18 |
| F16 | ~$2,104 | 16 | ~$0.18 |
| F32 | ~$4,209 | 32 | ~$0.18 |
| F64 | ~$8,418 | 64 | ~$0.18 |

*Costs are approximate and vary by Azure region. Check Azure pricing calculator for current rates.*

**Pause/Resume savings**:
- Pausing a capacity stops billing.
- Resume time: 2–5 minutes for smaller SKUs; up to 10 minutes for F512+.
- For non-business-hours savings: pause F64 for 12 hours/day = ~50% cost reduction.

---

## 9. Common Workflows

### Workflow 1: Capacity Upgrade for Peak Period

```bash
# 1. Check current utilization
curl "https://api.fabric.microsoft.com/v1/capacities/${CAPACITY_ID}" \
  -H "Authorization: Bearer ${TOKEN}"

# 2. Scale up before peak
curl -X PATCH "https://api.fabric.microsoft.com/v1/capacities/${CAPACITY_ID}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"sku": {"name": "F128", "tier": "Fabric"}}'

# 3. Monitor in Capacity Metrics app during peak
# 4. Scale back down after peak period
curl -X PATCH "https://api.fabric.microsoft.com/v1/capacities/${CAPACITY_ID}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"sku": {"name": "F64", "tier": "Fabric"}}'
```

### Workflow 2: Investigate and Resolve Throttling

```
1. Open Fabric Capacity Metrics app
2. Filter to last 24h — identify the throttling window
3. Drill into the throttling period:
   - Which workspaces were active?
   - Which operation types (Spark, Pipeline, Refresh)?
4. Check concurrent operations — were multiple heavy jobs running simultaneously?
5. Apply remediations:
   a. Stagger: spread schedules by 15-30 minutes
   b. Limit: reduce maxParallelism on Enhanced Refresh
   c. Defer: move low-priority jobs to overnight
   d. Upgrade: if consistently > 80% utilization, upgrade SKU
6. Monitor for 1 week to confirm improvement
```

---

## 10. Error Handling and Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| `Capacity not found` | Capacity ID invalid or caller lacks access | Verify capacity ID from admin portal |
| `Cannot resize: capacity in use` | Active workloads during resize attempt | Resize succeeds but takes effect after current workloads complete |
| `Workspace cannot be assigned` | Workspace already on a capacity or admin permission missing | Unassign from current capacity first |
| `Capacity paused: operations rejected` | Capacity is in Suspended state | Resume capacity before running workloads |
| `Direct Lake fallback triggered` | Table too large for in-memory cache; V-Order not applied | Apply V-Order to Delta table; upgrade SKU; partition large tables |
| `SparkJobRun queued for > 30 min` | Capacity CU debt or starter pool exhausted | Check Capacity Metrics for carryforward debt; reduce concurrent Spark jobs |

---

## 11. Performance and Limits

| Resource | Limit | Notes |
|----------|-------|-------|
| Maximum SKU | F2048 | 2048 CUs |
| Minimum SKU for production | F8 | F2/F4 recommended for dev/test only |
| Concurrent Spark sessions | Depends on SKU | F64: ~8 concurrent sessions; F128: ~16 |
| Capacity resize time | 2–5 minutes | Non-disruptive for running workloads |
| Pause/resume time | 2–10 minutes | Larger SKUs take longer to resume |
| Workspaces per capacity | Unlimited | |
| Capacities per Azure subscription | No hard limit (practical: < 100) | |
| Smoothing window | 24 hours | Carryforward debt settles within 24 hours |

---

## Progressive Disclosure — Reference Files

| Topic | File |
|---|---|
| Capacity management — SKU definitions, REST API, resize, pause/resume, workspace assignment | [`references/capacity-management.md`](./references/capacity-management.md) |
| Throttling and monitoring — Capacity Metrics app, KQL diagnostics, throttling types, carryforward | [`references/throttling-monitoring.md`](./references/throttling-monitoring.md) |
| SKU sizing — CU consumption by workload type, sizing methodology, cost optimization | [`references/sku-sizing.md`](./references/sku-sizing.md) |
