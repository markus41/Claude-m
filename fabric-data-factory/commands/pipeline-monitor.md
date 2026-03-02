---
name: pipeline-monitor
description: "Monitor pipeline and activity run status, duration, and errors in Fabric Data Factory"
argument-hint: "[--pipeline <name>] [--run-id <id>] [--last <count>] [--failed-only]"
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

# Monitor Pipeline Runs

Check pipeline run history, activity run details, errors, and performance in Fabric Data Factory.

## Instructions

### 1. Validate Inputs

- `--pipeline` — Pipeline name to filter results (optional, shows all pipelines if omitted).
- `--run-id` — Specific pipeline run ID for detailed activity-level view.
- `--last` — Number of recent runs to show (default: 10).
- `--failed-only` — Show only failed runs.

### 2. List Recent Pipeline Runs

Query pipeline run history via the Fabric REST API:

```bash
az rest --method GET \
  --url "https://api.fabric.microsoft.com/v1/workspaces/${FABRIC_WORKSPACE_ID}/items/<pipeline-id>/jobs/instances?limit=<count>" \
  --headers "Content-Type=application/json"
```

Display results in a table:

| Run ID | Pipeline | Status | Start Time | Duration | Trigger |
|--------|----------|--------|------------|----------|---------|
| abc123 | DailyETL | Succeeded | 2025-01-15 06:00 | 4m 32s | Schedule |
| def456 | DailyETL | Failed | 2025-01-14 06:00 | 1m 12s | Schedule |

### 3. Show Activity Run Details (when --run-id)

For a specific pipeline run, show each activity's status:

```bash
az rest --method GET \
  --url "https://api.fabric.microsoft.com/v1/workspaces/${FABRIC_WORKSPACE_ID}/items/<pipeline-id>/jobs/instances/<run-id>" \
  --headers "Content-Type=application/json"
```

Display activity details:

| Activity | Type | Status | Start | Duration | Rows Read | Rows Written | Error |
|----------|------|--------|-------|----------|-----------|--------------|-------|
| CopyCustomers | Copy | Succeeded | 06:00:05 | 2m 15s | 150,000 | 150,000 | — |
| TransformData | Dataflow | Failed | 06:02:20 | 1m 02s | — | — | Timeout |

### 4. Diagnose Failures

For failed runs, analyze the error details:

**Common failure patterns**:
| Error | Likely Cause | Suggested Fix |
|-------|-------------|---------------|
| `Connection timeout` | Source unreachable | Check firewall rules, gateway status |
| `Invalid column mapping` | Schema drift at source | Update column mapping or use auto-map |
| `Insufficient capacity` | Fabric capacity exhausted | Scale up capacity or reduce parallelism |
| `Authentication failed` | Expired credentials | Refresh connection credentials |
| `Data type mismatch` | Source/sink type conflict | Add explicit type casting in mapping |
| `Query timeout` | Long-running source query | Optimize query or increase timeout |

Provide specific remediation steps based on the actual error message.

### 5. Performance Analysis

For succeeded runs, analyze performance:

- **Throughput**: Rows per second, data volume per minute
- **Bottleneck identification**: Which activity took the longest?
- **Trend analysis**: Is run duration increasing over time? (compare last 10 runs)
- **Recommendations**:
  - If Copy activity is slow: increase DIU or parallel copies
  - If Dataflow is slow: check query folding, reduce transformations
  - If overall pipeline is slow: parallelize independent activities

### 6. Display Summary

Show the user:
- Run history table with status indicators
- Failure details with remediation steps (if any failures)
- Performance trends and recommendations
- Links to Fabric Monitoring Hub for detailed diagnostics
- Suggest setting up alerts: "Consider configuring email alerts for pipeline failures via Fabric workspace settings"
