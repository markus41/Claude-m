# Azure SQL Database Query Performance — Deep Reference

## Overview

Azure SQL Database provides built-in tools for query performance management: Query Store (query plan history and regression detection), Automatic Tuning (auto index creation/dropping, plan forcing), Intelligent Query Processing, and Azure SQL Insights. This reference covers DMV queries, index management, statistics, and execution plan analysis.

## Useful DMV Queries

### Identify top resource-consuming queries

```sql
-- Top 20 queries by total CPU time (last 24 hours via Query Store)
SELECT TOP 20
  qs.query_id,
  qt.query_sql_text,
  rs.count_executions,
  rs.avg_cpu_time / 1000.0 AS avg_cpu_ms,
  rs.total_cpu_time / 1000.0 / rs.count_executions AS avg_cpu_per_exec_ms,
  rs.avg_duration / 1000.0 AS avg_duration_ms,
  rs.avg_logical_io_reads AS avg_logical_reads,
  rs.avg_rowcount AS avg_rows,
  rs.last_execution_time
FROM sys.query_store_query q
JOIN sys.query_store_query_text qt ON q.query_text_id = qt.query_text_id
JOIN sys.query_store_plan p ON q.query_id = p.query_id
JOIN sys.query_store_runtime_stats rs ON p.plan_id = rs.plan_id
JOIN sys.query_store_runtime_stats_interval rsi ON rs.runtime_stats_interval_id = rsi.runtime_stats_interval_id
WHERE rsi.start_time >= DATEADD(HOUR, -24, GETUTCDATE())
ORDER BY rs.total_cpu_time DESC;

-- Queries with high variation in execution time (plan instability candidates)
SELECT
  q.query_id,
  qt.query_sql_text,
  COUNT(DISTINCT p.plan_id) AS plan_count,
  MAX(rs.avg_duration) / 1000.0 AS max_avg_duration_ms,
  MIN(rs.avg_duration) / 1000.0 AS min_avg_duration_ms,
  (MAX(rs.avg_duration) - MIN(rs.avg_duration)) / 1000.0 AS duration_variance_ms
FROM sys.query_store_query q
JOIN sys.query_store_query_text qt ON q.query_text_id = qt.query_text_id
JOIN sys.query_store_plan p ON q.query_id = p.query_id
JOIN sys.query_store_runtime_stats rs ON p.plan_id = rs.plan_id
GROUP BY q.query_id, qt.query_sql_text
HAVING COUNT(DISTINCT p.plan_id) > 1
ORDER BY duration_variance_ms DESC;
```

### Index analysis

```sql
-- Missing index recommendations (weighted by potential impact)
SELECT TOP 20
  ROUND(migs.avg_total_user_cost * migs.avg_user_impact * (migs.user_seeks + migs.user_scans), 0) AS improvement_measure,
  OBJECT_NAME(mid.object_id, DB_ID()) AS table_name,
  mid.equality_columns,
  mid.inequality_columns,
  mid.included_columns,
  migs.user_seeks,
  migs.user_scans,
  migs.avg_user_impact,
  migs.last_user_seek
FROM sys.dm_db_missing_index_group_stats migs
JOIN sys.dm_db_missing_index_groups mig ON migs.group_handle = mig.index_group_handle
JOIN sys.dm_db_missing_index_details mid ON mig.index_handle = mid.index_handle
WHERE mid.database_id = DB_ID()
ORDER BY improvement_measure DESC;

-- Index usage statistics (identify unused and over-used indexes)
SELECT
  OBJECT_NAME(i.object_id) AS table_name,
  i.name AS index_name,
  i.type_desc,
  ius.user_seeks,
  ius.user_scans,
  ius.user_lookups,
  ius.user_updates,
  ius.last_user_seek,
  ius.last_user_scan,
  ius.last_user_update,
  ps.reserved_page_count * 8.0 / 1024 AS size_mb
FROM sys.indexes i
LEFT JOIN sys.dm_db_index_usage_stats ius ON i.object_id = ius.object_id
  AND i.index_id = ius.index_id AND ius.database_id = DB_ID()
JOIN sys.dm_db_partition_stats ps ON i.object_id = ps.object_id
  AND i.index_id = ps.index_id
WHERE OBJECTPROPERTY(i.object_id, 'IsUserTable') = 1
  AND i.type > 0 -- exclude heap
ORDER BY (ius.user_seeks + ius.user_scans + ius.user_lookups) ASC, -- unused first
         ius.user_updates DESC; -- but costly to maintain

-- Index fragmentation (for maintenance scheduling)
SELECT
  OBJECT_NAME(ips.object_id) AS table_name,
  i.name AS index_name,
  ips.index_type_desc,
  ips.avg_fragmentation_in_percent,
  ips.page_count,
  CASE
    WHEN ips.avg_fragmentation_in_percent > 30 THEN 'REBUILD'
    WHEN ips.avg_fragmentation_in_percent > 5 THEN 'REORGANIZE'
    ELSE 'OK'
  END AS recommended_action
FROM sys.dm_db_index_physical_stats(DB_ID(), NULL, NULL, NULL, 'SAMPLED') ips
JOIN sys.indexes i ON ips.object_id = i.object_id AND ips.index_id = i.index_id
WHERE ips.page_count > 1000 -- only indexes with meaningful data
ORDER BY ips.avg_fragmentation_in_percent DESC;
```

### Wait statistics analysis

```sql
-- Current wait statistics (identify bottlenecks)
SELECT TOP 20
  wait_type,
  wait_time_ms / 1000.0 AS wait_time_sec,
  signal_wait_time_ms / 1000.0 AS signal_wait_sec,
  waiting_tasks_count,
  ROUND(100.0 * wait_time_ms / SUM(wait_time_ms) OVER(), 2) AS pct_of_total
FROM sys.dm_os_wait_stats
WHERE wait_type NOT IN (
  -- Filter out benign waits
  'SLEEP_TASK', 'BROKER_TO_FLUSH', 'BROKER_TASK_STOP', 'CLR_AUTO_EVENT',
  'DISPATCHER_QUEUE_SEMAPHORE', 'FT_IFTS_SCHEDULER_IDLE_WAIT',
  'HADR_FILESTREAM_IOMGR_IOCOMPLETION', 'HADR_WORK_QUEUE',
  'LAZYWRITER_SLEEP', 'LOGMGR_QUEUE', 'ONDEMAND_TASK_QUEUE',
  'REQUEST_FOR_DEADLOCK_SEARCH', 'RESOURCE_QUEUE', 'SERVER_IDLE_CHECK',
  'SLEEP_DBSTARTUP', 'SLEEP_DCOMSTARTUP', 'SLEEP_MASTERDBREADY',
  'SLEEP_MASTERMDREADY', 'SLEEP_MASTERUPGRADED', 'SLEEP_MSDBSTARTUP',
  'SLEEP_SYSTEMTASK', 'SLEEP_TEMPDBSTARTUP', 'SNI_HTTP_ACCEPT',
  'SP_SERVER_DIAGNOSTICS_SLEEP', 'SQLTRACE_BUFFER_FLUSH',
  'SQLTRACE_INCREMENTAL_FLUSH_SLEEP', 'WAITFOR', 'XE_DISPATCHER_WAIT',
  'XE_TIMER_EVENT'
)
ORDER BY wait_time_ms DESC;

-- Active requests and waits (real-time)
SELECT
  r.session_id,
  r.status,
  r.wait_type,
  r.wait_time / 1000.0 AS wait_time_sec,
  r.blocking_session_id,
  r.cpu_time / 1000.0 AS cpu_sec,
  r.reads,
  r.writes,
  r.logical_reads,
  SUBSTRING(st.text, (r.statement_start_offset / 2) + 1,
    (CASE r.statement_end_offset WHEN -1 THEN DATALENGTH(st.text) ELSE r.statement_end_offset END
    - r.statement_start_offset) / 2 + 1) AS current_statement
FROM sys.dm_exec_requests r
CROSS APPLY sys.dm_exec_sql_text(r.sql_handle) st
WHERE r.session_id > 50 -- exclude system sessions
ORDER BY r.cpu_time DESC;
```

### Table statistics health

```sql
-- Statistics staleness check
SELECT
  OBJECT_NAME(s.object_id) AS table_name,
  s.name AS stat_name,
  sp.last_updated,
  sp.rows,
  sp.rows_sampled,
  sp.modification_counter,
  CAST(100.0 * sp.rows_sampled / NULLIF(sp.rows, 0) AS DECIMAL(5,2)) AS sample_pct,
  CASE WHEN sp.modification_counter > 0.20 * sp.rows THEN 'STALE' ELSE 'OK' END AS staleness
FROM sys.stats s
CROSS APPLY sys.dm_db_stats_properties(s.object_id, s.stats_id) sp
WHERE OBJECTPROPERTY(s.object_id, 'IsUserTable') = 1
ORDER BY sp.modification_counter DESC;

-- Update stale statistics manually (run as needed)
-- UPDATE STATISTICS dbo.Orders WITH FULLSCAN;
-- UPDATE STATISTICS dbo.Orders (IX_Orders_CustomerId) WITH ROWCOUNT = 1000000;
```

## Query Store Configuration

```sql
-- Enable and configure Query Store (should be ON by default in Azure SQL)
ALTER DATABASE CURRENT SET QUERY_STORE = ON;

ALTER DATABASE CURRENT SET QUERY_STORE (
  OPERATION_MODE = READ_WRITE,
  CLEANUP_POLICY = (STALE_QUERY_THRESHOLD_DAYS = 30),
  DATA_FLUSH_INTERVAL_SECONDS = 900,
  INTERVAL_LENGTH_MINUTES = 60,
  MAX_STORAGE_SIZE_MB = 1024,
  QUERY_CAPTURE_MODE = AUTO, -- captures only significant queries
  SIZE_BASED_CLEANUP_MODE = AUTO,
  MAX_PLANS_PER_QUERY = 200,
  WAIT_STATS_CAPTURE_MODE = ON
);

-- Force a query plan (after identifying regression)
EXEC sp_query_store_force_plan @query_id = 42, @plan_id = 101;

-- Unforce a plan (allow optimizer to choose again)
EXEC sp_query_store_unforce_plan @query_id = 42, @plan_id = 101;

-- Check Automatic Tuning status
SELECT * FROM sys.database_automatic_tuning_options;

-- Enable auto-plan correction
ALTER DATABASE CURRENT SET AUTOMATIC_TUNING (FORCE_LAST_GOOD_PLAN = ON);
```

## Azure CLI — Performance Monitoring

```bash
# Get database DTU/vCore utilization
az monitor metrics list \
  --resource "/subscriptions/<sub>/resourceGroups/rg-databases/providers/Microsoft.Sql/servers/sql-prod/databases/db-app-prod" \
  --metric "dtu_consumption_percent" \
  --interval PT1M \
  --start-time "$(date -u -d '1 hour ago' +%Y-%m-%dT%H:%MZ)" \
  --end-time "$(date -u +%Y-%m-%dT%H:%MZ)" \
  --output table

# Get Intelligent Insights diagnostics
az sql db show-connection-string \
  --server sql-prod-eastus \
  --client ado.net \
  --name db-app-prod

# Enable Automatic Tuning
az sql db update \
  --server sql-prod-eastus \
  --resource-group rg-databases \
  --name db-app-prod \
  --auto-tune force-last-good-plan enabled
```

## Common Index Patterns

```sql
-- Covering index for frequent query pattern
-- Query: SELECT Id, Email, Status FROM Users WHERE TenantId = @t AND Status = 'active'
CREATE NONCLUSTERED INDEX IX_Users_TenantId_Status
ON dbo.Users (TenantId, Status)
INCLUDE (Id, Email)  -- cover the select list
WHERE Status = 'active';  -- filtered index reduces size

-- Columnstore index for analytics on OLTP table
CREATE NONCLUSTERED COLUMNSTORE INDEX NCCI_Orders_Analytics
ON dbo.Orders (OrderDate, CustomerId, Amount, Status, TenantId);

-- Rebuild index online (available in Business Critical tier)
ALTER INDEX IX_Orders_CustomerId ON dbo.Orders
REBUILD WITH (ONLINE = ON, SORT_IN_TEMPDB = ON, MAXDOP = 4);

-- Reorganize index (online, incremental, lower resource usage)
ALTER INDEX IX_Orders_CustomerId ON dbo.Orders REORGANIZE;
```

## Error Codes

| Code | Meaning | Remediation |
|---|---|---|
| 845 (MAXDOP timeout) | Parallel plan deadlock | Reduce MAXDOP; use `OPTION (MAXDOP 1)` as workaround |
| 8623 (Query too complex) | Optimizer gives up (too many joins/tables) | Break into smaller queries; use CTEs; add query hints |
| 8651 (Memory grant failed) | Insufficient memory grant | Add index to reduce row estimates; use `OPTION (MIN_GRANT_PERCENT 25)` |
| 4860 (Bulk insert file not found) | Import file path incorrect | Use Azure Blob Storage for bulk imports |
| 1205 (Deadlock victim) | Query selected as deadlock victim | Implement retry; review transaction access order |
| 701 (Out of memory) | Buffer pool exhausted | Scale up memory tier; optimize query memory grants |

## Throttling Limits

| Resource | Limit | Notes |
|---|---|---|
| Parallel worker threads | 10% of max (GP), 100% (BC) | Use MAXDOP settings to limit parallelism |
| TempDB space | 2 GB (GP 2 vCores) — 192 GB (GP 80 vCores) | Monitor `sys.dm_db_task_space_usage`; avoid large sorts |
| Query plan cache size | ~75% of buffer pool | Clear with `DBCC FREEPROCCACHE` only in development |
| Query Store storage | 100 MB default (configurable to 1 GB+) | Increase with `MAX_STORAGE_SIZE_MB` |
| Max table columns | 1,024 per table | Normalize wide tables; use columnstore for wide analytics tables |

## Production Gotchas

- **Parameter sniffing**: SQL Server caches a query plan based on the first parameter values seen. Subsequent calls with different parameters (e.g., very different row counts) reuse the suboptimal plan. Mitigate with `OPTION (OPTIMIZE FOR UNKNOWN)`, `OPTION (RECOMPILE)`, or Query Store plan forcing.
- **Statistics auto-update threshold**: By default, auto-update statistics triggers at 20% of rows changed. For very large tables (millions of rows), 20% means tens of millions of changes before statistics update. Enable `ASYNC_STATS_UPDATE` and consider manual UPDATE STATISTICS jobs for large tables.
- **Implicit conversions**: Queries that compare columns of different data types (e.g., INT vs BIGINT, VARCHAR vs NVARCHAR) cause implicit conversions that prevent index seeks. Always match parameter data types to column types exactly.
- **SELECT * in production**: Avoid `SELECT *` in production queries. It prevents covering index usage, increases network bytes, and breaks applications when schema changes add new columns.
- **Query Store fills up silently**: When Query Store runs out of space, it switches to `READ_ONLY` mode silently. Queries still execute but plans are no longer captured. Monitor `sys.database_query_store_options.actual_state_desc` and increase `MAX_STORAGE_SIZE_MB` proactively.
- **Columnstore and rowstore mix**: A nonclustered columnstore index coexists with regular row-store indexes on the same table. The optimizer automatically uses the columnstore for analytical queries (aggregations, range scans on large row sets) and the rowstore for point lookups. This is the recommended approach for HTAP (Hybrid Transactional/Analytical) workloads.
