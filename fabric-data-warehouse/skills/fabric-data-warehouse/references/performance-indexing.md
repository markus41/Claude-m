# Performance and Indexing

## Overview

Fabric Data Warehouse performance is driven by columnar storage, automatic statistics, result set caching, and capacity-based compute scaling. Unlike traditional SQL Server or Synapse Dedicated Pool, there are no explicit indexes to create or maintain. This reference covers query performance troubleshooting, execution plans, statistics management, result caching, concurrency limits, workload management, and CU consumption for queries.

---

## Query Performance Troubleshooting

### Query Insights Views

Fabric Data Warehouse provides built-in `queryinsights` views for query history and performance analysis.

```sql
-- Recent queries with duration (last 30 days)
SELECT
    distributed_statement_id,
    start_time,
    end_time,
    DATEDIFF(SECOND, start_time, end_time)  AS duration_seconds,
    LEFT(command, 200)                        AS query_snippet,
    status,
    row_count,
    login_name,
    session_id
FROM queryinsights.exec_requests_history
WHERE start_time >= DATEADD(DAY, -7, GETDATE())
ORDER BY duration_seconds DESC;

-- Top 20 slowest queries in the last 24 hours
SELECT TOP 20
    distributed_statement_id,
    DATEDIFF(SECOND, start_time, end_time) AS duration_seconds,
    LEFT(command, 300)                      AS query_snippet,
    login_name
FROM queryinsights.exec_requests_history
WHERE start_time >= DATEADD(HOUR, -24, GETDATE())
  AND status = 'Succeeded'
ORDER BY duration_seconds DESC;

-- Most frequently executed queries (potential cache candidates)
SELECT
    LEFT(command, 200) AS query_snippet,
    COUNT(*)           AS execution_count,
    AVG(DATEDIFF(SECOND, start_time, end_time)) AS avg_duration_s,
    MAX(DATEDIFF(SECOND, start_time, end_time)) AS max_duration_s,
    MIN(DATEDIFF(SECOND, start_time, end_time)) AS min_duration_s
FROM queryinsights.exec_requests_history
WHERE start_time >= DATEADD(DAY, -7, GETDATE())
  AND status = 'Succeeded'
GROUP BY LEFT(command, 200)
ORDER BY execution_count DESC;

-- Long-running query view (built-in)
SELECT
    distributed_statement_id,
    start_time,
    DATEDIFF(SECOND, start_time, end_time) AS duration_seconds,
    LEFT(command, 300)                      AS query_snippet,
    login_name,
    session_id
FROM queryinsights.long_running_queries
ORDER BY duration_seconds DESC;

-- Failed queries with error details
SELECT
    distributed_statement_id,
    start_time,
    LEFT(command, 200) AS query_snippet,
    error_message,
    login_name
FROM queryinsights.exec_requests_history
WHERE status = 'Failed'
  AND start_time >= DATEADD(DAY, -1, GETDATE())
ORDER BY start_time DESC;
```

### DMVs for Active Sessions

```sql
-- Currently running queries
SELECT
    r.session_id,
    r.request_id,
    r.start_time,
    r.status,
    r.command,
    r.total_elapsed_time / 1000.0  AS elapsed_seconds,
    r.cpu_time / 1000.0            AS cpu_seconds,
    r.logical_reads,
    r.writes
FROM sys.dm_exec_requests r
WHERE r.status NOT IN ('background', 'sleeping')
ORDER BY r.total_elapsed_time DESC;

-- Active sessions
SELECT
    s.session_id,
    s.login_name,
    s.host_name,
    s.program_name,
    s.status,
    s.cpu_time / 1000.0         AS cpu_seconds,
    s.total_elapsed_time / 1000.0 AS elapsed_seconds,
    s.reads,
    s.writes,
    s.logical_reads
FROM sys.dm_exec_sessions s
WHERE s.is_user_process = 1
ORDER BY s.total_elapsed_time DESC;
```

---

## Execution Plans

```sql
-- Show estimated execution plan (does not execute)
SET SHOWPLAN_TEXT ON;
GO
SELECT c.CustomerName, SUM(f.TotalAmount) AS Revenue
FROM dim.Customer c
JOIN fact.Sales f ON c.CustomerKey = f.CustomerKey
WHERE f.OrderDate >= '2025-01-01'
GROUP BY c.CustomerName;
GO
SET SHOWPLAN_TEXT OFF;

-- XML execution plan (for detailed analysis)
SET SHOWPLAN_XML ON;
GO
SELECT * FROM fact.Sales WHERE OrderDate = '2025-03-01';
GO
SET SHOWPLAN_XML OFF;

-- Actual execution plan (runs the query)
SET STATISTICS XML ON;
GO
SELECT c.CustomerName, SUM(f.TotalAmount)
FROM dim.Customer c
JOIN fact.Sales f ON c.CustomerKey = f.CustomerKey
GROUP BY c.CustomerName;
GO
SET STATISTICS XML OFF;

-- IO and time statistics
SET STATISTICS IO ON;
SET STATISTICS TIME ON;
GO
SELECT * FROM fact.Sales WHERE OrderDate BETWEEN '2025-01-01' AND '2025-03-31';
GO
SET STATISTICS IO OFF;
SET STATISTICS TIME OFF;
```

### Label Queries for Plan Tracking

```sql
SELECT
    c.CustomerName,
    SUM(f.TotalAmount) AS Revenue
FROM dim.Customer c
JOIN fact.Sales f ON c.CustomerKey = f.CustomerKey
WHERE f.OrderDate >= '2025-01-01'
GROUP BY c.CustomerName
OPTION (LABEL = 'monthly-revenue-by-customer');

-- Find labeled query in history
SELECT *
FROM queryinsights.exec_requests_history
WHERE command LIKE '%monthly-revenue-by-customer%'
ORDER BY start_time DESC;
```

---

## Statistics Management

Fabric auto-creates and updates statistics on first query access. Manual statistics are useful for:
- Columns with extreme data skew
- After large batch loads where auto-stats haven't updated yet
- Complex multi-column predicates

```sql
-- Create statistics on key columns
CREATE STATISTICS stat_Sales_OrderDate      ON fact.Sales (OrderDate)        WITH FULLSCAN;
CREATE STATISTICS stat_Sales_CustomerKey    ON fact.Sales (CustomerKey)       WITH FULLSCAN;
CREATE STATISTICS stat_Sales_ProductKey     ON fact.Sales (ProductKey)        WITH FULLSCAN;
CREATE STATISTICS stat_Customer_CustomerID  ON dim.Customer (CustomerID)      WITH FULLSCAN;
CREATE STATISTICS stat_Customer_Segment     ON dim.Customer (Segment)         WITH FULLSCAN;
CREATE STATISTICS stat_Product_Category     ON dim.Product (ProductCategory)  WITH FULLSCAN;

-- Multi-column statistics for composite filters
CREATE STATISTICS stat_Sales_Date_Customer  ON fact.Sales (OrderDate, CustomerKey);

-- Update all statistics on a table after large loads
UPDATE STATISTICS fact.Sales  WITH FULLSCAN;
UPDATE STATISTICS dim.Customer WITH FULLSCAN;

-- Check statistics metadata
SELECT
    s.name         AS stat_name,
    c.name         AS column_name,
    sp.last_updated,
    sp.rows,
    sp.rows_sampled,
    sp.modification_counter
FROM sys.stats s
JOIN sys.stats_columns sc ON s.object_id = sc.object_id AND s.stats_id = sc.stats_id
JOIN sys.columns c        ON sc.object_id = c.object_id AND sc.column_id = c.column_id
CROSS APPLY sys.dm_db_stats_properties(s.object_id, s.stats_id) sp
WHERE OBJECT_SCHEMA_NAME(s.object_id) IN ('dim', 'fact')
  AND sp.last_updated IS NOT NULL
ORDER BY sp.last_updated DESC;

-- Find tables missing statistics on key columns
SELECT
    t.name      AS table_name,
    c.name      AS column_name,
    c.column_id
FROM sys.tables t
JOIN sys.schemas sch ON t.schema_id = sch.schema_id
JOIN sys.columns c ON t.object_id = c.object_id
WHERE sch.name IN ('dim', 'fact')
  AND c.name NOT IN (
    SELECT cols.name
    FROM sys.stats st
    JOIN sys.stats_columns sc ON st.object_id = sc.object_id AND st.stats_id = sc.stats_id
    JOIN sys.columns cols ON sc.object_id = cols.object_id AND sc.column_id = cols.column_id
    WHERE st.object_id = t.object_id
  )
ORDER BY t.name, c.column_id;
```

---

## Result Set Caching

Fabric automatically caches query results at the capacity level. Identical queries return cached results without re-executing.

### Cache Behavior

| Aspect | Behavior |
|--------|----------|
| Cache granularity | Per-query text (exact match, case-sensitive) |
| Cache TTL | ~24 hours or until underlying data changes |
| Cache invalidation | Any DML (INSERT/UPDATE/DELETE/TRUNCATE) on referenced tables |
| Cache scope | Capacity-level (shared across sessions) |
| Cache bypass | Use `OPTION (NOCACHE)` or add a non-deterministic element like `GETDATE()` |
| Monitoring | Not directly exposed; infer from `duration_seconds = 0` in query history |

```sql
-- Queries that return in near-zero seconds are likely cache hits
SELECT
    LEFT(command, 200) AS query_snippet,
    COUNT(*) AS execution_count,
    COUNT(CASE WHEN DATEDIFF(MILLISECOND, start_time, end_time) < 100 THEN 1 END) AS likely_cache_hits,
    AVG(DATEDIFF(MILLISECOND, start_time, end_time)) AS avg_ms
FROM queryinsights.exec_requests_history
WHERE start_time >= DATEADD(HOUR, -24, GETDATE())
GROUP BY LEFT(command, 200)
ORDER BY likely_cache_hits DESC;

-- Force cache bypass (add a changing element)
SELECT *, GETDATE() AS query_time FROM fact.Sales WHERE OrderDate = '2025-03-01';
-- Or use a comment with a timestamp to make each query unique
```

---

## Concurrency Limits

### Concurrency by Capacity SKU

| SKU | CUs | Max Concurrent Queries (approx.) | Recommended Active Users |
|-----|-----|----------------------------------|-------------------------|
| F2  | 2   | 4                                | 1–5                     |
| F4  | 4   | 4–6                              | 5–10                    |
| F8  | 8   | 8                                | 10–25                   |
| F16 | 16  | 12                               | 25–50                   |
| F32 | 32  | 16                               | 50–100                  |
| F64 | 64  | 24–32                            | 100–200                 |
| F128| 128 | 40–50                            | 200–400                 |

Queries that exceed the concurrency limit are **queued** — they wait for a slot to become available. Queued time is visible in `queryinsights.exec_requests_history` as the gap between session start and actual execution.

### Monitor Queued Queries

```sql
-- Identify queries that waited before executing
SELECT
    distributed_statement_id,
    submit_time,
    start_time,
    DATEDIFF(SECOND, submit_time, start_time) AS queue_wait_seconds,
    DATEDIFF(SECOND, start_time, end_time)    AS execution_seconds,
    LEFT(command, 200) AS query_snippet
FROM queryinsights.exec_requests_history
WHERE submit_time < start_time  -- was queued
  AND queue_wait_seconds > 5
ORDER BY queue_wait_seconds DESC;
```

---

## Workload Management

Fabric Data Warehouse does not have explicit workload groups (unlike Synapse). Workload is managed implicitly through:

1. **Capacity assignment**: Assign appropriate Fabric capacity to the workspace (upgrade SKU for high-concurrency).
2. **Query tagging**: Use `OPTION (LABEL)` to tag query classes for monitoring.
3. **Scheduling**: Separate heavy ETL loads from interactive queries using pipeline scheduling outside business hours.
4. **Result caching**: Design reports to reuse cached results (identical parameterless queries).
5. **Aggregation tables**: Pre-aggregate common report queries into warehouse tables.

```sql
-- Pattern: Pre-aggregate heavy queries into a cache table
CREATE PROCEDURE rpt.usp_RefreshSalesCacheTable
AS
BEGIN
    SET NOCOUNT ON;
    TRUNCATE TABLE rpt.SalesSummaryCache;
    INSERT INTO rpt.SalesSummaryCache
    SELECT
        d.CalendarYear,
        d.MonthName,
        p.ProductCategory,
        c.Segment,
        COUNT(*) AS OrderCount,
        SUM(f.TotalAmount) AS Revenue
    FROM fact.Sales f
    JOIN dim.DateDim d   ON f.OrderDate = d.DateKey
    JOIN dim.Product p   ON f.ProductKey = p.ProductKey
    JOIN dim.Customer c  ON f.CustomerKey = c.CustomerKey
    GROUP BY d.CalendarYear, d.MonthName, p.ProductCategory, c.Segment;
END;

-- Reports query the cache table (fast, low CU)
SELECT * FROM rpt.SalesSummaryCache WHERE CalendarYear = 2025;
```

---

## CU Consumption for Queries

### Understanding CU Consumption

Capacity Units (CUs) measure compute consumption. Each query consumes CUs proportional to:
- Data scanned (bytes read from storage)
- CPU used (join complexity, aggregation, sorting)
- Duration (elapsed time × active threads)

| Query Type | CU Consumption Level | Notes |
|-----------|---------------------|-------|
| SELECT with selective filter (partition pruning) | Low | Reads only matching files |
| Full table scan | Medium–High | Scales with table size |
| Complex join (fact × multiple dims) | Medium | Join shuffling consumes CPU |
| MERGE on large tables | High | Row comparison + Delta write |
| COPY INTO large file set | High | Bulk read + write |
| Cached query result | Near zero | Returns from cache without compute |
| CTAS / large INSERT SELECT | High | Read + transform + write |

### Monitor CU Consumption

Use the Microsoft Fabric Capacity Metrics app (Power BI) for CU tracking:
1. Install from AppSource: search "Microsoft Fabric Capacity Metrics".
2. Connect to your capacity.
3. Filter to "Warehouse" item type.
4. Identify top CU consumers by workspace, item, and time period.

```sql
-- Estimate relative query cost by total elapsed time
SELECT
    LEFT(command, 200)                       AS query_snippet,
    COUNT(*)                                 AS executions,
    SUM(DATEDIFF(SECOND, start_time, end_time)) AS total_duration_seconds,
    AVG(DATEDIFF(SECOND, start_time, end_time)) AS avg_duration_seconds,
    login_name
FROM queryinsights.exec_requests_history
WHERE start_time >= DATEADD(DAY, -7, GETDATE())
  AND status = 'Succeeded'
GROUP BY LEFT(command, 200), login_name
ORDER BY total_duration_seconds DESC;
```

---

## Query Optimization Quick Reference

| Anti-Pattern | Why Bad | Better Approach |
|-------------|---------|-----------------|
| `SELECT *` on fact table | Reads all columns (columnar = no cost, but network/memory overhead) | Select only needed columns |
| `WHERE YEAR(OrderDate) = 2025` | Function on column prevents file skipping | `WHERE OrderDate >= '2025-01-01' AND OrderDate < '2026-01-01'` |
| `COUNT(DISTINCT CustomerKey)` on 100M rows | Exact distinct count is expensive | `APPROX_COUNT_DISTINCT(CustomerKey)` for estimates |
| Correlated subquery in SELECT | Executes once per row | Rewrite as JOIN or CROSS APPLY |
| No filter on large fact table joins | Full scan of fact table | Always filter fact by date range before joining |
| CURSOR for row-by-row processing | No parallelism, extremely slow | Rewrite as set-based INSERT/UPDATE/MERGE |
| Nested CTEs with repeated large subqueries | Materialized each time | Use temp tables for reused large intermediate sets |

---

## Error Codes Table

| Error | Meaning | Remediation |
|-------|---------|-------------|
| `Query execution was canceled` | Query exceeded session timeout | Increase session timeout; optimize query; add indexes/statistics |
| `Resource limit exceeded: query memory` | Query exceeded per-session memory | Reduce data volume; add partition filters; upgrade capacity |
| `Query queue timeout` | Query waited too long in queue | Upgrade capacity SKU; reduce concurrent users; schedule ETL off-peak |
| `Statistics are out of date` | Stale statistics causing bad plan | Run `UPDATE STATISTICS <table> WITH FULLSCAN` |
| `Estimated execution plan shows Table Spool` | Intermediate result materialization | Simplify query; avoid correlated subqueries |
| `Timeout expired: The timeout period elapsed` | Connection timeout (not query timeout) | Check network; use longer connection timeout in client |
| HTTP 429 from Fabric monitoring API | Rate limit on admin/metrics API | Reduce polling frequency; cache metrics locally |

---

## Throttling / Limits Table

| Resource | Limit | Notes |
|----------|-------|-------|
| Max query execution time | Configurable; defaults vary by SKU | Set `SET QUERY_GOVERNOR_COST_LIMIT` or use timeouts in pipeline |
| Statistics auto-update threshold | ~20% row changes | Manual `UPDATE STATISTICS` after large loads |
| Query Insights history retention | 30 days | Export to Log Analytics or storage for longer retention |
| CU smoothing window | 24 hours rolling | Burst capacity absorbed; sustained excess causes throttling |
| Per-query parallelism (DOP) | Controlled by Fabric engine | No user-configurable `MAXDOP` hint |
| Max row count per result set | 1,000,000 per SSMS/client rendering | Use pagination (OFFSET/FETCH) for large result sets |
| Temp table rows | No hard limit; governed by CU/memory | Large temp tables consume more CUs |
