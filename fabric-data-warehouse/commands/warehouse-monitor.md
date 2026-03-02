---
name: warehouse-monitor
description: "Generate monitoring queries for warehouse performance, long-running queries, and capacity usage"
argument-hint: "[--slow-queries] [--load-history] [--capacity] [--errors]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
---

# Monitor Warehouse Performance

Generate diagnostic and monitoring queries for a Fabric Data Warehouse.

## Instructions

### 1. Parse the Request

- `--slow-queries` — Find long-running or expensive queries.
- `--load-history` — Review recent data load executions and outcomes.
- `--capacity` — Check capacity utilization and throttling indicators.
- `--errors` — Find failed queries and error patterns.
- If no flag is provided, generate a comprehensive monitoring dashboard with all categories.

### 2. Generate Monitoring Queries

**Slow queries** (`--slow-queries`):
```sql
-- Queries exceeding 60 seconds in the last 7 days
SELECT
    distributed_statement_id,
    start_time,
    end_time,
    DATEDIFF(SECOND, start_time, end_time) AS duration_seconds,
    login_name,
    command
FROM queryinsights.exec_requests_history
WHERE DATEDIFF(SECOND, start_time, end_time) > 60
  AND start_time >= DATEADD(DAY, -7, GETDATE())
ORDER BY duration_seconds DESC;

-- Top 10 most expensive queries by duration
SELECT TOP 10
    LEFT(command, 200) AS query_preview,
    COUNT(*) AS execution_count,
    AVG(DATEDIFF(SECOND, start_time, end_time)) AS avg_duration_sec,
    MAX(DATEDIFF(SECOND, start_time, end_time)) AS max_duration_sec,
    SUM(row_count) AS total_rows
FROM queryinsights.exec_requests_history
WHERE start_time >= DATEADD(DAY, -7, GETDATE())
GROUP BY LEFT(command, 200)
ORDER BY avg_duration_sec DESC;
```

**Load history** (`--load-history`):
```sql
-- Recent load procedure executions from LoadLog
SELECT
    ProcedureName,
    Status,
    RowsAffected,
    ErrorMessage,
    LoadTimestamp
FROM staging.LoadLog
ORDER BY LoadTimestamp DESC;

-- Watermark status for all tracked tables
SELECT
    TableName,
    LastLoadTimestamp,
    LastLoadRowCount,
    DATEDIFF(HOUR, LastLoadTimestamp, GETDATE()) AS hours_since_last_load,
    UpdatedDate
FROM staging.Watermark
ORDER BY LastLoadTimestamp DESC;
```

**Currently running queries** (`--capacity`):
```sql
-- Active queries
SELECT
    session_id,
    request_id,
    start_time,
    status,
    command,
    total_elapsed_time
FROM sys.dm_exec_requests
WHERE status = 'running'
ORDER BY total_elapsed_time DESC;

-- Query volume by hour (last 24 hours)
SELECT
    DATEPART(HOUR, start_time) AS query_hour,
    COUNT(*) AS query_count,
    AVG(DATEDIFF(SECOND, start_time, end_time)) AS avg_duration_sec
FROM queryinsights.exec_requests_history
WHERE start_time >= DATEADD(DAY, -1, GETDATE())
GROUP BY DATEPART(HOUR, start_time)
ORDER BY query_hour;
```

**Failed queries** (`--errors`):
```sql
-- Failed queries in the last 7 days
SELECT
    distributed_statement_id,
    start_time,
    status,
    login_name,
    command
FROM queryinsights.exec_requests_history
WHERE status = 'Failed'
  AND start_time >= DATEADD(DAY, -7, GETDATE())
ORDER BY start_time DESC;

-- Error patterns (group by error type)
SELECT
    LEFT(command, 100) AS query_pattern,
    COUNT(*) AS failure_count,
    MIN(start_time) AS first_failure,
    MAX(start_time) AS last_failure
FROM queryinsights.exec_requests_history
WHERE status = 'Failed'
  AND start_time >= DATEADD(DAY, -7, GETDATE())
GROUP BY LEFT(command, 100)
ORDER BY failure_count DESC;
```

### 3. Generate Comprehensive Dashboard

When no specific flag is provided, combine all categories into a single monitoring script with section headers:

```sql
-- ============================================
-- Fabric Data Warehouse Monitoring Dashboard
-- Generated: <timestamp>
-- ============================================

-- Section 1: Slow Queries
-- Section 2: Load History
-- Section 3: Active Queries
-- Section 4: Failed Queries
-- Section 5: Table Row Counts
```

Include a table row count query:
```sql
-- Row counts for all warehouse tables
SELECT
    SCHEMA_NAME(t.schema_id) AS SchemaName,
    t.name AS TableName,
    SUM(p.rows) AS RowCount
FROM sys.tables t
JOIN sys.partitions p ON t.object_id = p.object_id AND p.index_id IN (0, 1)
GROUP BY SCHEMA_NAME(t.schema_id), t.name
ORDER BY SchemaName, TableName;
```

### 4. Output

Write the monitoring script to `monitoring/<type>_monitor.sql` or display inline.

Show the user:
- How to run: paste into Azure Data Studio or SSMS connected to the warehouse
- Recommended scheduling: run slow-query analysis weekly, load-history daily
- Escalation guidance: if throttling is detected, consider upgrading the Fabric capacity SKU
