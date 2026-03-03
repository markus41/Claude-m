# Cross-Database Queries

## Overview

Fabric Data Warehouse enables querying across multiple warehouses and lakehouse SQL endpoints within the same Fabric workspace using three-part naming (`database.schema.table`). For cross-workspace access, OneLake shortcuts bring remote data into the local namespace. This reference covers three-part naming syntax, lakehouse SQL endpoint access, warehouse-to-warehouse queries, performance considerations, and query folding.

---

## Three-Part Naming Reference

| Query Target | Three-Part Name Format | Write Support |
|-------------|----------------------|---------------|
| Warehouse table (same workspace) | `WarehouseName.schema.TableName` | Yes (local warehouse only) |
| Lakehouse SQL endpoint (same workspace) | `LakehouseName.dbo.TableName` | No (read-only) |
| Shortcut in lakehouse (from another workspace) | `LocalLakehouse.dbo.ShortcutName` | No (read-only) |

All three-part naming is **within the currently connected warehouse's context**. You cannot write to remote databases via three-part naming.

---

## Basic Cross-Database Queries

```sql
-- Read from a lakehouse SQL endpoint in the same workspace
SELECT * FROM SalesLakehouse.dbo.raw_orders LIMIT 100;

-- Join warehouse dimension with lakehouse fact data
SELECT
    c.CustomerName,
    c.Segment,
    l.order_date,
    l.product_id,
    l.total_amount
FROM SalesWarehouse.dim.Customer c
JOIN OrderLakehouse.dbo.raw_orders l ON c.CustomerID = l.customer_id
WHERE l.order_date >= '2025-01-01';

-- Aggregate cross-database data
SELECT
    p.ProductCategory,
    SUM(l.quantity * l.unit_price) AS TotalRevenue,
    COUNT(DISTINCT l.customer_id)  AS UniqueCustomers
FROM SalesWarehouse.dim.Product p
JOIN EventLakehouse.dbo.purchase_events l ON p.ProductID = l.product_id
WHERE l.event_date >= DATEADD(MONTH, -3, GETDATE())
GROUP BY p.ProductCategory
ORDER BY TotalRevenue DESC;
```

---

## Warehouse-to-Warehouse Queries

```sql
-- Join two warehouses in the same workspace
SELECT
    c.CustomerName,
    c.Segment,
    o.OrderDate,
    o.TotalAmount,
    i.InventoryOnHand
FROM SalesWarehouse.dim.Customer c
JOIN OrdersWarehouse.fact.Orders o ON c.CustomerKey = o.CustomerKey
JOIN InventoryWarehouse.fact.DailyInventory i
    ON o.ProductKey = i.ProductKey
    AND o.StoreKey  = i.StoreKey
    AND o.OrderDate = i.SnapshotDate
WHERE o.OrderDate >= '2025-01-01';

-- Aggregate from multiple warehouses
WITH SalesData AS (
    SELECT CustomerKey, SUM(TotalAmount) AS LifetimeSales
    FROM SalesWarehouse.fact.Sales
    GROUP BY CustomerKey
),
SupportData AS (
    SELECT CustomerKey, COUNT(*) AS TicketCount, AVG(ResolutionDays) AS AvgResolutionDays
    FROM SupportWarehouse.fact.Tickets
    GROUP BY CustomerKey
)
SELECT
    c.CustomerName,
    c.Segment,
    ISNULL(s.LifetimeSales, 0) AS LifetimeSales,
    ISNULL(sp.TicketCount, 0)  AS SupportTickets,
    sp.AvgResolutionDays
FROM SalesWarehouse.dim.Customer c
LEFT JOIN SalesData s   ON c.CustomerKey = s.CustomerKey
LEFT JOIN SupportData sp ON c.CustomerKey = sp.CustomerKey;
```

---

## Lakehouse SQL Endpoint Access

The lakehouse SQL endpoint provides read-only SQL access to Delta tables managed by Spark or Dataflow Gen2.

```sql
-- List tables available in a lakehouse SQL endpoint
SELECT TABLE_SCHEMA, TABLE_NAME, TABLE_TYPE
FROM SalesLakehouse.INFORMATION_SCHEMA.TABLES
WHERE TABLE_TYPE = 'BASE TABLE'
ORDER BY TABLE_SCHEMA, TABLE_NAME;

-- Check column types in a lakehouse table
SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE
FROM SalesLakehouse.INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'raw_orders'
ORDER BY ORDINAL_POSITION;

-- Query lakehouse data alongside warehouse dimensions
SELECT
    d.CalendarYear,
    d.MonthName,
    l.region,
    COUNT(*)             AS EventCount,
    SUM(l.session_duration_seconds) / 3600.0 AS TotalHours
FROM AnalyticsLakehouse.dbo.user_sessions l
JOIN SalesWarehouse.dim.DateDim d ON CAST(l.session_date AS DATE) = d.DateKey
GROUP BY d.CalendarYear, d.MonthName, l.region
ORDER BY d.CalendarYear, d.MonthName;
```

---

## Creating Views Across Databases

Cross-database views consolidate data from multiple sources into a single query surface.

```sql
-- Unified customer 360 view spanning warehouse and lakehouse
CREATE VIEW rpt.vw_Customer360
AS
WITH OrderSummary AS (
    SELECT
        CustomerKey,
        COUNT(DISTINCT SalesKey) AS TotalOrders,
        SUM(TotalAmount)          AS LifetimeValue,
        MIN(OrderDate)            AS FirstOrderDate,
        MAX(OrderDate)            AS LastOrderDate
    FROM fact.Sales
    GROUP BY CustomerKey
),
DigitalActivity AS (
    SELECT
        c.CustomerKey,
        COUNT(*)                  AS TotalWebSessions,
        MAX(ws.session_date)      AS LastWebVisit,
        SUM(ws.page_views)        AS TotalPageViews
    FROM dim.Customer c
    JOIN AnalyticsLakehouse.dbo.user_sessions ws ON c.CustomerID = ws.customer_id
    GROUP BY c.CustomerKey
)
SELECT
    c.CustomerKey,
    c.CustomerID,
    c.CustomerName,
    c.Email,
    c.Segment,
    c.CountryCode,
    ISNULL(o.TotalOrders,   0)   AS TotalOrders,
    ISNULL(o.LifetimeValue, 0)   AS LifetimeValue,
    o.FirstOrderDate,
    o.LastOrderDate,
    ISNULL(d.TotalWebSessions, 0) AS TotalWebSessions,
    d.LastWebVisit,
    ISNULL(d.TotalPageViews, 0)  AS TotalPageViews,
    CASE
        WHEN o.LifetimeValue > 10000 THEN 'Platinum'
        WHEN o.LifetimeValue > 5000  THEN 'Gold'
        WHEN o.LifetimeValue > 1000  THEN 'Silver'
        ELSE 'Bronze'
    END AS ValueTier
FROM dim.Customer c
LEFT JOIN OrderSummary    o ON c.CustomerKey = o.CustomerKey
LEFT JOIN DigitalActivity d ON c.CustomerKey = d.CustomerKey;
```

---

## Cross-Workspace Access via Shortcuts

To query data from a different workspace, first create a OneLake shortcut in a local lakehouse.

### Step 1: Create Shortcut via REST API

```bash
TOKEN=$(az account get-access-token --resource https://api.fabric.microsoft.com --query accessToken -o tsv)

curl -X POST \
  "https://api.fabric.microsoft.com/v1/workspaces/<local-workspace-id>/items/<local-lakehouse-id>/shortcuts" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "central_dim_customers",
    "path": "Tables",
    "target": {
      "oneLake": {
        "workspaceId": "<remote-workspace-id>",
        "itemId":      "<remote-lakehouse-id>",
        "path":        "Tables/dim_customers"
      }
    }
  }'
```

### Step 2: Query via Three-Part Name

```sql
-- The shortcut 'central_dim_customers' now appears as a table in LocalLakehouse
SELECT lc.CustomerKey, lc.CustomerName, lc.Segment
FROM LocalLakehouse.dbo.central_dim_customers lc
JOIN fact.Sales f ON lc.CustomerKey = f.CustomerKey
WHERE f.OrderDate >= '2025-01-01';
```

---

## Performance Considerations

### Cross-Database Query Cost Factors

| Factor | Impact | Mitigation |
|--------|--------|-----------|
| Lakehouse SQL endpoint (read-only) | Lower overhead than warehouse | Prefer lakehouse endpoint for raw/silver data queries |
| External shortcut (ADLS/S3) | Higher latency; reads from external storage | Cache shortcut data locally via Spark Delta table |
| Cross-workspace shortcut | Network hop between workspaces | Co-locate frequently joined data in same workspace |
| Large lakehouse tables without partition pruning | Full scan regardless of filter | Add WHERE clauses that map to Delta partition columns |
| Joining wide lakehouse tables to warehouse | Column materialization cost | Materialize frequently joined lakehouse subsets into warehouse staging tables |

### Query Optimization for Cross-Database

```sql
-- Push filters to the lakehouse side early
-- Bad: filter after join (full lakehouse scan)
SELECT c.CustomerName, l.total_amount
FROM dim.Customer c
JOIN SalesLakehouse.dbo.raw_orders l ON c.CustomerID = l.customer_id
WHERE c.Segment = 'Premium' AND l.order_date >= '2025-01-01';  -- lakehouse filter too late

-- Better: filter in a CTE or subquery to reduce data before join
SELECT c.CustomerName, l.total_amount
FROM dim.Customer c
JOIN (
    SELECT customer_id, total_amount
    FROM SalesLakehouse.dbo.raw_orders
    WHERE order_date >= '2025-01-01'  -- pushed to lakehouse scan
) l ON c.CustomerID = l.customer_id
WHERE c.Segment = 'Premium';

-- Use OPTION (LABEL) to identify cross-DB queries in monitoring
SELECT *
FROM SalesWarehouse.dim.Customer c
JOIN AnalyticsLakehouse.dbo.sessions s ON c.CustomerID = s.customer_id
OPTION (LABEL = 'cross-db-customer-sessions');

-- Check in Query Insights
SELECT command, start_time, DATEDIFF(SECOND, start_time, end_time) AS duration_s
FROM queryinsights.exec_requests_history
WHERE command LIKE '%cross-db-customer-sessions%'
ORDER BY start_time DESC;
```

---

## Query Folding

Query folding pushes predicate and projection logic to the data source rather than pulling all data and filtering locally.

### Folding Behavior in Fabric DW

| Scenario | Folds? | Notes |
|----------|--------|-------|
| WHERE on lakehouse partition column | Yes | Reads only matching partitions |
| WHERE on non-partition column | Partial | Statistics-based file skipping |
| Aggregate (SUM, COUNT) on lakehouse | Yes | Computed in columnar scan |
| JOIN between warehouse and lakehouse | Partial | Join may execute in warehouse engine after separate scans |
| DISTINCT on large cross-DB result | No full fold | Final dedup happens in warehouse engine |
| UDF or complex expression on lakehouse column | No | Function prevents folding |

### Materialization Pattern for Repeated Cross-DB Joins

When a cross-database join is used frequently in reports, materialize it into a warehouse table for consistent performance.

```sql
-- Materialize a commonly used cross-DB join
CREATE TABLE staging.CustomerSessions_Daily
AS
SELECT
    c.CustomerKey,
    c.Segment,
    CAST(s.session_date AS DATE)  AS SessionDate,
    COUNT(*)                      AS SessionCount,
    SUM(s.page_views)             AS TotalPageViews,
    SUM(s.session_duration_seconds) AS TotalDurationSeconds
FROM dim.Customer c
JOIN AnalyticsLakehouse.dbo.user_sessions s ON c.CustomerID = s.customer_id
GROUP BY c.CustomerKey, c.Segment, CAST(s.session_date AS DATE);

-- Refresh daily via pipeline or stored procedure
CREATE PROCEDURE staging.usp_RefreshCustomerSessions
    @RefreshDate DATE
AS
BEGIN
    SET NOCOUNT ON;
    DELETE FROM staging.CustomerSessions_Daily WHERE SessionDate = @RefreshDate;
    INSERT INTO staging.CustomerSessions_Daily
    SELECT
        c.CustomerKey,
        c.Segment,
        CAST(s.session_date AS DATE),
        COUNT(*),
        SUM(s.page_views),
        SUM(s.session_duration_seconds)
    FROM dim.Customer c
    JOIN AnalyticsLakehouse.dbo.user_sessions s ON c.CustomerID = s.customer_id
    WHERE CAST(s.session_date AS DATE) = @RefreshDate
    GROUP BY c.CustomerKey, c.Segment, CAST(s.session_date AS DATE);
END;
```

---

## Error Codes Table

| Error | Meaning | Remediation |
|-------|---------|-------------|
| `Invalid object name 'LakehouseName.dbo.TableName'` | Lakehouse not in same workspace or name is wrong | Verify lakehouse name (case-sensitive); confirm same workspace |
| `The user does not have permission to perform this action` | No access to the remote database | Add user/SPN to workspace with Viewer role |
| `Remote source is unavailable` | Lakehouse SQL endpoint not provisioned yet | Wait for endpoint provisioning; check item status |
| `Cannot write to remote database` | Attempted INSERT/UPDATE on a lakehouse (read-only) | Only write to local warehouse tables; use Spark to write to lakehouse |
| `The query exceeded the allowed memory` | Cross-DB join returning too many rows | Add filters; materialize into staging; reduce cross-DB join scope |
| `Object does not exist in shortcut` | Shortcut path is wrong or source data deleted | Verify shortcut target path; recreate shortcut if source moved |
| `Cross-workspace shortcut authentication failed` | Workspace identity not enabled or not granted access | Enable workspace identity on source; grant access to consumer workspace |

---

## Throttling / Limits Table

| Resource | Limit | Notes |
|----------|-------|-------|
| Three-part naming databases | Within same workspace only | Use shortcuts for cross-workspace |
| Cross-database query timeout | Configured per session (default 60 min) | Large cross-DB joins may time out on small SKUs |
| Shortcut depth | Maximum 1 level of indirection | No shortcut-to-shortcut chains |
| Cross-database writes | Not supported — local write only | Use Spark or Dataflow Gen2 for writing to lakehouses |
| Concurrent cross-DB queries sharing capacity | Governed by workspace capacity SKU | Heavy lakehouse scans consume shared CUs |
| View nesting depth | 32 levels | Standard SQL Server limit |
