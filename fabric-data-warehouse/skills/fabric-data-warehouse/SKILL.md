---
name: Fabric Data Warehouse
description: >
  Deep expertise in Microsoft Fabric Synapse Data Warehouse — provision warehouses, author T-SQL DDL/DML
  with auto-distributed storage, design star and snowflake schemas with SCD patterns, load data via
  COPY INTO and cross-database queries, write stored procedures with error handling, configure row-level
  and column-level security, monitor query performance with Query Insights, and build dimensional models
  for the default semantic model. Targets data engineers and analysts working in Fabric workspaces.
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
triggers:
  - fabric warehouse
  - synapse warehouse
  - fabric data warehouse
  - fabric t-sql
  - cross database query
  - fabric stored procedure
  - warehouse table
  - star schema fabric
  - fabric sql
  - dimensional model
  - warehouse load
  - fabric dw
---

# Fabric Data Warehouse

## 1. Fabric Data Warehouse Overview

Microsoft Fabric Data Warehouse is a fully managed, SaaS-based relational data warehouse within the Microsoft Fabric platform. It provides a full T-SQL surface area for DDL, DML, and querying, built on top of OneLake's open Delta Parquet storage format.

**Warehouse vs Lakehouse SQL endpoint**:
| Aspect | Warehouse | Lakehouse SQL Endpoint |
|--------|-----------|------------------------|
| Write support | Full T-SQL DDL/DML (INSERT, UPDATE, DELETE, MERGE) | Read-only SQL (write via Spark/Dataflow) |
| Storage format | Delta Parquet in OneLake (managed) | Delta Parquet in OneLake (managed by Spark) |
| Schema management | T-SQL CREATE/ALTER TABLE | Spark-managed schema |
| Transactions | Full ACID transactions | Read-only queries |
| Cross-database queries | Yes, three-part naming | Yes, three-part naming (read-only) |
| Default semantic model | Auto-generated, customizable | Auto-generated |
| Security | RLS, CLS, dynamic data masking, object-level GRANT/DENY | RLS, CLS (limited) |
| Use case | Structured enterprise data warehouse, ETL landing zone | Exploratory analytics, data science reads |

**Key characteristics**:
- **Auto-distributed storage**: No manual distribution or partition management required. Fabric optimizes storage layout automatically.
- **No index management**: No clustered/non-clustered indexes. Fabric uses automatic column-level statistics and optimized file layouts.
- **Capacity-based compute**: Warehouse compute scales with Fabric capacity (F2 through F2048). No dedicated compute provisioning.
- **T-SQL compatibility**: Supports most T-SQL syntax including CTEs, window functions, MERGE, stored procedures, views, and schemas.
- **OneLake integration**: All warehouse data is stored as Delta Parquet files in OneLake, accessible via shortcuts, Spark, and other Fabric items.
- **Burstable compute**: Queries can burst beyond baseline capacity temporarily, managed by Fabric capacity smoothing.

**Limitations**:
- No user-defined functions (UDFs) — use views, CTEs, or stored procedures instead.
- No triggers — use Fabric pipelines or Dataflow Gen2 for event-driven logic.
- No materialized views — use CTAS (CREATE TABLE AS SELECT) to persist pre-computed results.
- No linked servers — use cross-database queries with three-part naming within the same Fabric workspace.
- Maximum 100 concurrent queries per warehouse (varies by capacity SKU).

## 2. Warehouse Provisioning

**Create via Fabric Portal**:
1. Navigate to a Fabric workspace.
2. Select **+ New** > **Warehouse**.
3. Provide a name (letters, numbers, underscores, hyphens — max 256 chars).
4. The warehouse is created with an empty `dbo` schema and a default semantic model.

**Create via Fabric REST API**:
```bash
# Create a warehouse in a workspace
POST https://api.fabric.microsoft.com/v1/workspaces/{workspaceId}/items
Content-Type: application/json
Authorization: Bearer {token}

{
  "displayName": "SalesWarehouse",
  "type": "Warehouse",
  "description": "Enterprise sales data warehouse"
}
```

**List warehouses in a workspace**:
```bash
GET https://api.fabric.microsoft.com/v1/workspaces/{workspaceId}/items?type=Warehouse
Authorization: Bearer {token}
```

**Naming conventions**:
- Use descriptive, PascalCase or snake_case names: `SalesWarehouse`, `sales_warehouse`
- Include environment suffix for non-production: `SalesWarehouse_Dev`, `SalesWarehouse_UAT`
- Avoid generic names like `Warehouse1` or `Test`

**Workspace placement considerations**:
- Place warehouse and its source data (lakehouse, dataflows) in the same workspace for cross-database query simplicity.
- Use separate workspaces per environment (Dev, Test, Prod) with Fabric deployment pipelines for promotion.
- Assign appropriate capacity to the workspace — warehouse query performance scales with capacity SKU.

**Capacity considerations**:
| SKU | CUs | Max concurrent queries | Best for |
|-----|-----|----------------------|----------|
| F2 | 2 | ~4 | Dev/test, small workloads |
| F8 | 8 | ~8 | Departmental warehouses |
| F32 | 32 | ~16 | Mid-size enterprise |
| F64 | 64 | ~32 | Large enterprise |
| F128+ | 128+ | ~50+ | High-concurrency production |

**Connection strings**:
```
# SQL connection string for external tools (SSMS, Azure Data Studio, dbt)
Server: <workspace-guid>.datawarehouse.fabric.microsoft.com
Database: <warehouse-name>
Authentication: Azure Active Directory
```

## 3. T-SQL DDL

Fabric Data Warehouse supports standard T-SQL DDL for creating and managing database objects.

**CREATE SCHEMA**:
```sql
CREATE SCHEMA staging;
CREATE SCHEMA dim;
CREATE SCHEMA fact;
CREATE SCHEMA rpt;
```

**CREATE TABLE**:
```sql
-- Basic table creation
CREATE TABLE dim.Customer (
    CustomerKey       INT            NOT NULL,
    CustomerID        NVARCHAR(20)   NOT NULL,
    CustomerName      NVARCHAR(200)  NOT NULL,
    Email             NVARCHAR(256)  NULL,
    City              NVARCHAR(100)  NULL,
    StateProvince     NVARCHAR(100)  NULL,
    Country           NVARCHAR(100)  NULL,
    Segment           NVARCHAR(50)   NULL,
    CreatedDate       DATETIME2(0)   NOT NULL,
    ModifiedDate      DATETIME2(0)   NOT NULL,
    IsActive          BIT            NOT NULL DEFAULT 1
);

-- Fact table
CREATE TABLE fact.Sales (
    SalesKey          BIGINT         NOT NULL,
    OrderDate         DATE           NOT NULL,
    CustomerKey       INT            NOT NULL,
    ProductKey        INT            NOT NULL,
    StoreKey          INT            NOT NULL,
    Quantity          INT            NOT NULL,
    UnitPrice         DECIMAL(18,2)  NOT NULL,
    TotalAmount       DECIMAL(18,2)  NOT NULL,
    DiscountAmount    DECIMAL(18,2)  NOT NULL DEFAULT 0,
    LoadDate          DATETIME2(0)   NOT NULL
);
```

**Supported data types**:
| Category | Types |
|----------|-------|
| Integer | `TINYINT`, `SMALLINT`, `INT`, `BIGINT` |
| Decimal | `DECIMAL(p,s)`, `NUMERIC(p,s)`, `FLOAT`, `REAL` |
| String | `CHAR(n)`, `VARCHAR(n)`, `NCHAR(n)`, `NVARCHAR(n)`, `VARCHAR(MAX)`, `NVARCHAR(MAX)` |
| Date/time | `DATE`, `TIME`, `DATETIME2(n)`, `DATETIMEOFFSET(n)` |
| Binary | `BINARY(n)`, `VARBINARY(n)`, `VARBINARY(MAX)` |
| Other | `BIT`, `UNIQUEIDENTIFIER`, `MONEY`, `SMALLMONEY` |

**Not supported**: `DATETIME`, `SMALLDATETIME` (use `DATETIME2`), `TEXT`, `NTEXT`, `IMAGE` (use `VARCHAR(MAX)`, `NVARCHAR(MAX)`, `VARBINARY(MAX)`), `SQL_VARIANT`, `XML`, `GEOMETRY`, `GEOGRAPHY`, `HIERARCHYID`.

**Distribution**: Fabric Data Warehouse auto-distributes data. Unlike Synapse dedicated SQL pool, you do NOT specify `DISTRIBUTION = HASH(column)` or `REPLICATE`. Fabric handles data layout optimization automatically.

**ALTER TABLE**:
```sql
-- Add a column
ALTER TABLE dim.Customer ADD PhoneNumber NVARCHAR(20) NULL;

-- Drop a column
ALTER TABLE dim.Customer DROP COLUMN PhoneNumber;

-- Rename a column is not directly supported — use sp_rename
EXEC sp_rename 'dim.Customer.Email', 'EmailAddress', 'COLUMN';
```

**CREATE VIEW**:
```sql
CREATE VIEW rpt.vw_MonthlySales
AS
SELECT
    d.CalendarYear,
    d.MonthName,
    p.ProductCategory,
    SUM(f.TotalAmount) AS TotalSales,
    COUNT(DISTINCT f.CustomerKey) AS UniqueCustomers
FROM fact.Sales f
JOIN dim.DateDim d ON f.OrderDate = d.DateKey
JOIN dim.Product p ON f.ProductKey = p.ProductKey
GROUP BY d.CalendarYear, d.MonthName, p.ProductCategory;
```

**CREATE PROCEDURE**: See Section 7 for full stored procedure coverage.

**Table clones**:
```sql
-- Zero-copy table clone (metadata-only, shares underlying Delta files)
CREATE TABLE staging.Customer_Backup
AS CLONE OF dim.Customer;

-- Clone with point-in-time (if available)
CREATE TABLE staging.Customer_Snapshot
AS CLONE OF dim.Customer
AT (TIMESTAMP = '2025-01-15T10:00:00');
```

**Constraints**:
- `NOT NULL` and `DEFAULT` constraints are enforced.
- `PRIMARY KEY` and `UNIQUE` constraints are informational only (not enforced) — they aid the query optimizer.
- `FOREIGN KEY` constraints are not supported — enforce referential integrity in ETL logic.
- `CHECK` constraints are not supported.

## 4. T-SQL DML & Queries

**INSERT**:
```sql
-- Single row insert
INSERT INTO dim.Customer (CustomerKey, CustomerID, CustomerName, Email, CreatedDate, ModifiedDate)
VALUES (1, 'CUST-001', 'Contoso Ltd', 'info@contoso.com', GETDATE(), GETDATE());

-- Multi-row insert
INSERT INTO dim.Customer (CustomerKey, CustomerID, CustomerName, CreatedDate, ModifiedDate)
VALUES
    (2, 'CUST-002', 'Fabrikam Inc', GETDATE(), GETDATE()),
    (3, 'CUST-003', 'Northwind Traders', GETDATE(), GETDATE());

-- Insert from SELECT
INSERT INTO fact.Sales (SalesKey, OrderDate, CustomerKey, ProductKey, StoreKey, Quantity, UnitPrice, TotalAmount, LoadDate)
SELECT
    ROW_NUMBER() OVER (ORDER BY o.OrderID) + (SELECT ISNULL(MAX(SalesKey), 0) FROM fact.Sales),
    o.OrderDate,
    c.CustomerKey,
    p.ProductKey,
    s.StoreKey,
    ol.Quantity,
    ol.UnitPrice,
    ol.Quantity * ol.UnitPrice,
    GETDATE()
FROM staging.Orders o
JOIN staging.OrderLines ol ON o.OrderID = ol.OrderID
JOIN dim.Customer c ON o.CustomerID = c.CustomerID
JOIN dim.Product p ON ol.ProductID = p.ProductID
JOIN dim.Store s ON o.StoreID = s.StoreID;
```

**UPDATE**:
```sql
UPDATE dim.Customer
SET
    Email = s.Email,
    City = s.City,
    ModifiedDate = GETDATE()
FROM dim.Customer c
JOIN staging.CustomerUpdates s ON c.CustomerID = s.CustomerID
WHERE c.Email <> s.Email OR c.City <> s.City;
```

**DELETE**:
```sql
DELETE FROM staging.Orders
WHERE LoadDate < DATEADD(DAY, -30, GETDATE());
```

**MERGE (upsert)**:
```sql
MERGE INTO dim.Product AS tgt
USING staging.Product AS src
ON tgt.ProductID = src.ProductID
WHEN MATCHED AND (tgt.ProductName <> src.ProductName OR tgt.UnitPrice <> src.UnitPrice) THEN
    UPDATE SET
        tgt.ProductName = src.ProductName,
        tgt.UnitPrice = src.UnitPrice,
        tgt.ModifiedDate = GETDATE()
WHEN NOT MATCHED BY TARGET THEN
    INSERT (ProductKey, ProductID, ProductName, ProductCategory, UnitPrice, CreatedDate, ModifiedDate)
    VALUES (src.ProductKey, src.ProductID, src.ProductName, src.ProductCategory, src.UnitPrice, GETDATE(), GETDATE());
```

**CTEs and window functions**:
```sql
-- Running total with CTE and window function
WITH MonthlySales AS (
    SELECT
        YEAR(OrderDate) AS SalesYear,
        MONTH(OrderDate) AS SalesMonth,
        SUM(TotalAmount) AS MonthlyTotal
    FROM fact.Sales
    GROUP BY YEAR(OrderDate), MONTH(OrderDate)
)
SELECT
    SalesYear,
    SalesMonth,
    MonthlyTotal,
    SUM(MonthlyTotal) OVER (PARTITION BY SalesYear ORDER BY SalesMonth) AS RunningTotal,
    LAG(MonthlyTotal) OVER (PARTITION BY SalesYear ORDER BY SalesMonth) AS PreviousMonth,
    MonthlyTotal - LAG(MonthlyTotal) OVER (PARTITION BY SalesYear ORDER BY SalesMonth) AS MoMChange,
    RANK() OVER (PARTITION BY SalesYear ORDER BY MonthlyTotal DESC) AS MonthRank
FROM MonthlySales;
```

**CROSS APPLY and STRING_AGG**:
```sql
-- STRING_AGG for comma-separated list
SELECT
    c.CustomerName,
    STRING_AGG(p.ProductName, ', ') WITHIN GROUP (ORDER BY p.ProductName) AS ProductsPurchased
FROM dim.Customer c
JOIN fact.Sales f ON c.CustomerKey = f.CustomerKey
JOIN dim.Product p ON f.ProductKey = p.ProductKey
GROUP BY c.CustomerName;

-- CROSS APPLY for row expansion
SELECT c.CustomerName, o.OrderDate, o.TotalAmount
FROM dim.Customer c
CROSS APPLY (
    SELECT TOP 5 f.OrderDate, f.TotalAmount
    FROM fact.Sales f
    WHERE f.CustomerKey = c.CustomerKey
    ORDER BY f.OrderDate DESC
) o;
```

**JSON functions**:
```sql
-- Parse JSON metadata column
SELECT
    CustomerID,
    JSON_VALUE(Metadata, '$.tier') AS CustomerTier,
    JSON_VALUE(Metadata, '$.region') AS Region
FROM staging.CustomerRaw
WHERE ISJSON(Metadata) = 1;
```

**APPROX_COUNT_DISTINCT**:
```sql
-- Approximate distinct count for large datasets (faster than COUNT(DISTINCT))
SELECT
    ProductCategory,
    APPROX_COUNT_DISTINCT(CustomerKey) AS ApproxUniqueCustomers
FROM fact.Sales f
JOIN dim.Product p ON f.ProductKey = p.ProductKey
GROUP BY ProductCategory;
```

## 5. Data Loading

**COPY INTO** (preferred for bulk loading from external storage):
```sql
-- Load from Azure Data Lake Storage (ADLS Gen2)
COPY INTO staging.RawSales
FROM 'https://mydatalake.dfs.core.windows.net/raw/sales/2025/*.parquet'
WITH (
    FILE_TYPE = 'PARQUET',
    CREDENTIAL = (IDENTITY = 'Shared Access Signature', SECRET = '<sas-token>')
);

-- Load CSV files with options
COPY INTO staging.RawCustomers
FROM 'https://mydatalake.dfs.core.windows.net/raw/customers/*.csv'
WITH (
    FILE_TYPE = 'CSV',
    FIRSTROW = 2,
    FIELDTERMINATOR = ',',
    ROWTERMINATOR = '\n',
    FIELDQUOTE = '"',
    ENCODING = 'UTF8',
    CREDENTIAL = (IDENTITY = 'Shared Access Signature', SECRET = '<sas-token>')
);

-- Load from OneLake shortcut (no credential needed for same-tenant OneLake)
COPY INTO staging.RawOrders
FROM 'https://onelake.dfs.fabric.microsoft.com/<workspace-id>/<lakehouse-id>/Files/orders/*.parquet'
WITH (
    FILE_TYPE = 'PARQUET'
);
```

**Supported COPY INTO file formats**: `PARQUET` (recommended), `CSV`, `DELTA` (preview).

**CTAS (CREATE TABLE AS SELECT)** for transforming and persisting data:
```sql
-- Transform staging to dimension
CREATE TABLE dim.Product
AS
SELECT
    ROW_NUMBER() OVER (ORDER BY ProductID) AS ProductKey,
    ProductID,
    ProductName,
    Category AS ProductCategory,
    SubCategory AS ProductSubCategory,
    ListPrice AS UnitPrice,
    GETDATE() AS CreatedDate,
    GETDATE() AS ModifiedDate
FROM staging.RawProducts
WHERE ProductID IS NOT NULL;
```

**Cross-database loading** (from lakehouse or another warehouse):
```sql
-- Load from a lakehouse SQL endpoint in the same workspace
INSERT INTO staging.RawSales
SELECT *
FROM MyLakehouse.dbo.sales_raw
WHERE year = 2025;

-- Load from another warehouse
INSERT INTO dim.SharedCustomer
SELECT CustomerKey, CustomerID, CustomerName, Segment
FROM CentralWarehouse.dim.Customer;
```

**Dataflow Gen2 to warehouse**:
1. Create a Dataflow Gen2 in the workspace.
2. Add source (e.g., SQL Server, Excel, REST API).
3. Apply Power Query transformations.
4. Set destination to the Fabric warehouse table.
5. Map columns and configure update method (Append or Replace).

**Pipeline Copy activity**:
1. Create a Fabric Data Pipeline.
2. Add a Copy activity.
3. Configure source (any supported connector).
4. Set sink to Fabric Warehouse with table name.
5. Configure mapping and write behavior (Insert, Upsert).

**Loading best practices**:
- Use `PARQUET` format for COPY INTO when possible — fastest and most type-safe.
- Stage raw data in a `staging` schema, then transform into `dim`/`fact` tables.
- Use `CTAS` for initial dimension builds; use `MERGE` for incremental updates.
- Avoid row-by-row INSERTs — batch operations are significantly faster.
- For large loads (>1 GB), ensure adequate capacity is assigned to the workspace.

## 6. Cross-Database Queries

Fabric Data Warehouse supports cross-database queries using three-part naming within the same workspace.

**Three-part naming syntax**:
```sql
-- database.schema.table
SELECT * FROM MyLakehouse.dbo.sales_raw;
SELECT * FROM OtherWarehouse.dim.Customer;
SELECT * FROM MyLakehouse.dbo.product_catalog WHERE category = 'Electronics';
```

**Cross-warehouse joins**:
```sql
-- Join data from two different warehouses in the same workspace
SELECT
    c.CustomerName,
    c.Segment,
    o.OrderDate,
    o.TotalAmount
FROM SalesWarehouse.dim.Customer c
JOIN OrdersWarehouse.fact.Orders o ON c.CustomerKey = o.CustomerKey
WHERE o.OrderDate >= '2025-01-01';
```

**Lakehouse SQL endpoint + warehouse joins**:
```sql
-- Join lakehouse raw data with warehouse dimensions
SELECT
    d.ProductName,
    d.ProductCategory,
    l.event_type,
    COUNT(*) AS EventCount
FROM SalesWarehouse.dim.Product d
JOIN ClickstreamLakehouse.dbo.user_events l ON d.ProductID = l.product_id
WHERE l.event_date >= '2025-01-01'
GROUP BY d.ProductName, d.ProductCategory, l.event_type;
```

**Creating views across databases**:
```sql
-- View that spans warehouse and lakehouse
CREATE VIEW rpt.vw_ProductEngagement
AS
SELECT
    p.ProductKey,
    p.ProductName,
    p.ProductCategory,
    s.TotalSales,
    e.PageViews,
    e.AddToCartCount
FROM dim.Product p
LEFT JOIN (
    SELECT ProductKey, SUM(TotalAmount) AS TotalSales
    FROM fact.Sales
    GROUP BY ProductKey
) s ON p.ProductKey = s.ProductKey
LEFT JOIN (
    SELECT
        product_id,
        SUM(CASE WHEN event_type = 'page_view' THEN 1 ELSE 0 END) AS PageViews,
        SUM(CASE WHEN event_type = 'add_to_cart' THEN 1 ELSE 0 END) AS AddToCartCount
    FROM ClickstreamLakehouse.dbo.user_events
    GROUP BY product_id
) e ON p.ProductID = e.product_id;
```

**Shortcuts**:
- OneLake shortcuts allow warehouses to reference data from external storage (ADLS, S3, GCS) without copying.
- Shortcut data appears as tables in the lakehouse SQL endpoint and can be queried via three-part naming.
- Shortcuts are read-only from the SQL perspective.

**Limitations**:
- Cross-database queries work only within the same Fabric workspace (or across workspaces the user has access to).
- Cross-database writes (INSERT/UPDATE/DELETE on a remote database) are not supported — write to the local warehouse only.
- Cross-database queries to a lakehouse SQL endpoint are always read-only.
- Performance may vary depending on data volume and capacity.

## 7. Stored Procedures & Functions

Fabric Data Warehouse supports T-SQL stored procedures for encapsulating business logic, ETL operations, and data transformations.

**Basic stored procedure**:
```sql
CREATE PROCEDURE staging.usp_LoadCustomerDimension
AS
BEGIN
    SET NOCOUNT ON;

    -- Upsert from staging to dimension
    MERGE INTO dim.Customer AS tgt
    USING staging.RawCustomers AS src
    ON tgt.CustomerID = src.CustomerID
    WHEN MATCHED AND (
        tgt.CustomerName <> src.CustomerName OR
        tgt.Email <> src.Email
    ) THEN
        UPDATE SET
            tgt.CustomerName = src.CustomerName,
            tgt.Email = src.Email,
            tgt.ModifiedDate = GETDATE()
    WHEN NOT MATCHED BY TARGET THEN
        INSERT (CustomerKey, CustomerID, CustomerName, Email, CreatedDate, ModifiedDate)
        VALUES (
            (SELECT ISNULL(MAX(CustomerKey), 0) + 1 FROM dim.Customer),
            src.CustomerID,
            src.CustomerName,
            src.Email,
            GETDATE(),
            GETDATE()
        );
END;
```

**Parameterized stored procedure**:
```sql
CREATE PROCEDURE fact.usp_LoadSalesByDate
    @StartDate DATE,
    @EndDate DATE,
    @SourceSchema NVARCHAR(50) = 'staging'
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @RowsInserted INT;

    INSERT INTO fact.Sales (SalesKey, OrderDate, CustomerKey, ProductKey, StoreKey, Quantity, UnitPrice, TotalAmount, LoadDate)
    SELECT
        ROW_NUMBER() OVER (ORDER BY o.OrderID) + (SELECT ISNULL(MAX(SalesKey), 0) FROM fact.Sales),
        o.OrderDate,
        c.CustomerKey,
        p.ProductKey,
        s.StoreKey,
        ol.Quantity,
        ol.UnitPrice,
        ol.Quantity * ol.UnitPrice,
        GETDATE()
    FROM staging.Orders o
    JOIN staging.OrderLines ol ON o.OrderID = ol.OrderID
    JOIN dim.Customer c ON o.CustomerID = c.CustomerID
    JOIN dim.Product p ON ol.ProductID = p.ProductID
    JOIN dim.Store s ON o.StoreID = s.StoreID
    WHERE o.OrderDate BETWEEN @StartDate AND @EndDate;

    SET @RowsInserted = @@ROWCOUNT;

    -- Log the load
    INSERT INTO staging.LoadLog (ProcedureName, StartDate, EndDate, RowsAffected, LoadTimestamp)
    VALUES ('usp_LoadSalesByDate', @StartDate, @EndDate, @RowsInserted, GETDATE());
END;
```

**Error handling with TRY/CATCH**:
```sql
CREATE PROCEDURE staging.usp_SafeLoadProducts
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRY
        -- Start explicit transaction
        BEGIN TRANSACTION;

        -- Truncate and reload
        DELETE FROM staging.ProductStaging;

        INSERT INTO staging.ProductStaging
        SELECT * FROM MyLakehouse.dbo.product_feed;

        -- Transform and load dimension
        MERGE INTO dim.Product AS tgt
        USING staging.ProductStaging AS src
        ON tgt.ProductID = src.ProductID
        WHEN MATCHED THEN
            UPDATE SET tgt.ProductName = src.ProductName, tgt.ModifiedDate = GETDATE()
        WHEN NOT MATCHED BY TARGET THEN
            INSERT (ProductKey, ProductID, ProductName, ProductCategory, UnitPrice, CreatedDate, ModifiedDate)
            VALUES ((SELECT ISNULL(MAX(ProductKey), 0) + 1 FROM dim.Product),
                    src.ProductID, src.ProductName, src.Category, src.ListPrice, GETDATE(), GETDATE());

        COMMIT TRANSACTION;

        INSERT INTO staging.LoadLog (ProcedureName, Status, RowsAffected, LoadTimestamp)
        VALUES ('usp_SafeLoadProducts', 'SUCCESS', @@ROWCOUNT, GETDATE());
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        INSERT INTO staging.LoadLog (ProcedureName, Status, ErrorMessage, LoadTimestamp)
        VALUES ('usp_SafeLoadProducts', 'FAILED', ERROR_MESSAGE(), GETDATE());

        -- Re-throw the error
        THROW;
    END CATCH;
END;
```

**Dynamic SQL**:
```sql
CREATE PROCEDURE staging.usp_TruncateSchema
    @SchemaName NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @SQL NVARCHAR(MAX) = '';

    SELECT @SQL = @SQL + 'DELETE FROM ' + QUOTENAME(@SchemaName) + '.' + QUOTENAME(TABLE_NAME) + '; '
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = @SchemaName AND TABLE_TYPE = 'BASE TABLE';

    EXEC sp_executesql @SQL;
END;
```

**Temporary tables**:
```sql
-- Local temp tables are supported within stored procedures
CREATE PROCEDURE staging.usp_TransformWithTemp
AS
BEGIN
    SET NOCOUNT ON;

    CREATE TABLE #TempAggregation (
        CustomerKey INT,
        TotalOrders INT,
        TotalSpend DECIMAL(18,2)
    );

    INSERT INTO #TempAggregation
    SELECT CustomerKey, COUNT(*), SUM(TotalAmount)
    FROM fact.Sales
    GROUP BY CustomerKey;

    UPDATE dim.Customer
    SET
        Segment = CASE
            WHEN t.TotalSpend > 10000 THEN 'Premium'
            WHEN t.TotalSpend > 1000 THEN 'Standard'
            ELSE 'Basic'
        END
    FROM dim.Customer c
    JOIN #TempAggregation t ON c.CustomerKey = t.CustomerKey;

    DROP TABLE #TempAggregation;
END;
```

**Limitations**:
- User-defined functions (UDFs) are not supported — use stored procedures or views as alternatives.
- CLR stored procedures are not supported.
- Table-valued parameters are not supported — use temp tables or staging tables for multi-row inputs.
- `EXECUTE AS` (impersonation) is not supported.

## 8. Data Modeling

**Star schema** (recommended for Fabric Data Warehouse):
```
           ┌──────────────┐
           │  dim.Date    │
           └──────┬───────┘
                  │
┌─────────────┐   │   ┌──────────────┐
│dim.Customer ├───┼───┤ dim.Product  │
└─────────────┘   │   └──────────────┘
                  │
           ┌──────┴───────┐
           │ fact.Sales   │
           └──────┬───────┘
                  │
           ┌──────┴───────┐
           │  dim.Store   │
           └──────────────┘
```

**Dimension types**:

*SCD Type 1 (overwrite)* — replace old value, no history:
```sql
-- Current customer record, latest values only
CREATE TABLE dim.Customer (
    CustomerKey       INT            NOT NULL,
    CustomerID        NVARCHAR(20)   NOT NULL,   -- Business key
    CustomerName      NVARCHAR(200)  NOT NULL,
    Email             NVARCHAR(256)  NULL,
    Segment           NVARCHAR(50)   NULL,
    CreatedDate       DATETIME2(0)   NOT NULL,
    ModifiedDate      DATETIME2(0)   NOT NULL
);
```

*SCD Type 2 (add row, track history)* — new row for each change:
```sql
CREATE TABLE dim.Customer_SCD2 (
    CustomerKey       INT            NOT NULL,   -- Surrogate key (unique per version)
    CustomerID        NVARCHAR(20)   NOT NULL,   -- Business key
    CustomerName      NVARCHAR(200)  NOT NULL,
    Email             NVARCHAR(256)  NULL,
    Segment           NVARCHAR(50)   NULL,
    EffectiveDate     DATE           NOT NULL,
    ExpirationDate    DATE           NOT NULL DEFAULT '9999-12-31',
    IsCurrent         BIT            NOT NULL DEFAULT 1
);
```

*SCD Type 3 (add column)* — store previous value alongside current:
```sql
CREATE TABLE dim.Customer_SCD3 (
    CustomerKey       INT            NOT NULL,
    CustomerID        NVARCHAR(20)   NOT NULL,
    CustomerName      NVARCHAR(200)  NOT NULL,
    CurrentSegment    NVARCHAR(50)   NULL,
    PreviousSegment   NVARCHAR(50)   NULL,
    SegmentChangeDate DATE           NULL,
    ModifiedDate      DATETIME2(0)   NOT NULL
);
```

**Fact table types**:

*Transaction fact* — one row per event:
```sql
CREATE TABLE fact.Sales (
    SalesKey          BIGINT         NOT NULL,   -- Surrogate key
    OrderDate         DATE           NOT NULL,   -- Degenerate dimension / date FK
    CustomerKey       INT            NOT NULL,   -- FK to dim.Customer
    ProductKey        INT            NOT NULL,   -- FK to dim.Product
    StoreKey          INT            NOT NULL,   -- FK to dim.Store
    Quantity          INT            NOT NULL,
    UnitPrice         DECIMAL(18,2)  NOT NULL,
    TotalAmount       DECIMAL(18,2)  NOT NULL,
    DiscountAmount    DECIMAL(18,2)  NOT NULL DEFAULT 0,
    LoadDate          DATETIME2(0)   NOT NULL
);
```

*Periodic snapshot fact* — one row per period:
```sql
CREATE TABLE fact.DailyInventory (
    SnapshotDate      DATE           NOT NULL,
    ProductKey        INT            NOT NULL,
    StoreKey          INT            NOT NULL,
    QuantityOnHand    INT            NOT NULL,
    QuantityOnOrder   INT            NOT NULL,
    ReorderPoint      INT            NOT NULL
);
```

*Accumulating snapshot fact* — one row per process instance, updated as milestones occur:
```sql
CREATE TABLE fact.OrderFulfillment (
    OrderKey          BIGINT         NOT NULL,
    OrderDate         DATE           NOT NULL,
    PaymentDate       DATE           NULL,
    ShipDate          DATE           NULL,
    DeliveryDate      DATE           NULL,
    CustomerKey       INT            NOT NULL,
    OrderToPayDays    INT            NULL,
    PayToShipDays     INT            NULL,
    ShipToDeliverDays INT            NULL,
    TotalAmount       DECIMAL(18,2)  NOT NULL
);
```

**Surrogate keys**: Use `INT` or `BIGINT` surrogate keys generated via `ROW_NUMBER()`, `IDENTITY`-like patterns (max value + 1), or deterministic hash. `IDENTITY` columns are not supported in Fabric warehouse — generate surrogate keys explicitly.

**Business keys**: Always store the natural/business key (e.g., `CustomerID`, `ProductSKU`) alongside the surrogate key for traceability and ETL matching.

**Default semantic model**: Fabric auto-generates a Power BI semantic model (dataset) from warehouse tables. Define relationships and measures in the model to enable self-service BI. Use proper naming and star schema to ensure the auto-generated model is useful.

## 9. Security

**Workspace roles** (apply to all items in the workspace):
| Role | Permissions |
|------|-------------|
| Admin | Full control, manage membership |
| Member | Create/edit items, run pipelines |
| Contributor | Create/edit items, no sharing |
| Viewer | Read-only access to items |

**SQL-level permissions** (granular, within the warehouse):
```sql
-- Grant SELECT on specific schema
GRANT SELECT ON SCHEMA::dim TO [user@domain.com];

-- Grant EXECUTE on stored procedures
GRANT EXECUTE ON SCHEMA::staging TO [etl-service-principal@domain.com];

-- Deny access to sensitive tables
DENY SELECT ON dim.Employee TO [analyst-group@domain.com];

-- Revoke previously granted permission
REVOKE SELECT ON SCHEMA::staging FROM [user@domain.com];
```

**Row-Level Security (RLS)**:
```sql
-- 1. Create a filter predicate function
CREATE FUNCTION rls.fn_SalesFilter(@Region NVARCHAR(50))
RETURNS TABLE
WITH SCHEMABINDING
AS
RETURN
    SELECT 1 AS fn_result
    WHERE @Region = USER_NAME()
       OR USER_NAME() = 'admin@domain.com';

-- 2. Create a security policy
CREATE SECURITY POLICY rls.SalesPolicy
ADD FILTER PREDICATE rls.fn_SalesFilter(Region) ON fact.Sales
WITH (STATE = ON);
```

**Column-Level Security (CLS)**:
```sql
-- Grant SELECT on all columns except salary
GRANT SELECT ON dim.Employee (EmployeeKey, EmployeeID, EmployeeName, Department, Title) TO [analyst-role];
-- Salary column is implicitly denied
```

**Dynamic Data Masking**:
```sql
-- Mask email addresses
ALTER TABLE dim.Customer
ALTER COLUMN Email ADD MASKED WITH (FUNCTION = 'email()');

-- Mask partial phone number
ALTER TABLE dim.Customer
ALTER COLUMN PhoneNumber ADD MASKED WITH (FUNCTION = 'partial(0,"XXX-XXX-",4)');

-- Grant UNMASK to privileged users
GRANT UNMASK ON dim.Customer TO [data-steward@domain.com];
```

**Best practices**:
- Use workspace roles for broad access control; use SQL permissions for fine-grained object-level control.
- Apply RLS when different users should see different subsets of rows (e.g., regional sales data).
- Apply CLS to restrict sensitive columns (e.g., salary, SSN) from non-privileged users.
- Use dynamic data masking for PII columns exposed to analysts who need partial data.
- Grant permissions to security groups, not individual users.
- Follow least-privilege: grant `SELECT` on reporting views rather than base tables.
- Avoid granting `dbo` schema access broadly — create dedicated schemas for each access tier.

## 10. Performance

**Statistics**:
- Fabric auto-creates column-level statistics on first query. No manual `CREATE STATISTICS` needed in most cases.
- For complex queries or unusual distributions, manually create statistics:
```sql
CREATE STATISTICS stat_Sales_OrderDate ON fact.Sales (OrderDate);
CREATE STATISTICS stat_Sales_CustomerKey ON fact.Sales (CustomerKey);

-- Update statistics manually (rarely needed)
UPDATE STATISTICS fact.Sales;
```

**Result set caching**:
- Fabric caches query results at the capacity level. Repeated identical queries return cached results instantly.
- Caching is automatic — no configuration required.
- Cache is invalidated when underlying data changes (DML operations).
- Cache TTL is managed by Fabric (typically 24 hours or until data changes).

**Query optimization tips**:
- Avoid `SELECT *` — select only needed columns to reduce I/O on columnar storage.
- Use predicate pushdown — filter early in `WHERE` clauses, especially on date/partition columns.
- Prefer `APPROX_COUNT_DISTINCT` over `COUNT(DISTINCT)` for large-cardinality columns.
- Use CTEs to break complex queries into readable, optimizable steps.
- Avoid correlated subqueries — rewrite as JOINs or CROSS APPLY.
- Use `OPTION (LABEL = 'my-query')` to tag queries for monitoring.
- Test with `SET STATISTICS TIME ON` and `SET STATISTICS IO ON` for query diagnostics.

**Execution plans**:
```sql
-- View estimated execution plan
SET SHOWPLAN_XML ON;
GO
SELECT * FROM fact.Sales WHERE OrderDate = '2025-01-15';
GO
SET SHOWPLAN_XML OFF;
```

**Capacity utilization**:
- Monitor Capacity Metrics app in Power BI for CU (Capacity Unit) consumption.
- Long-running or heavy queries consume more CUs — optimize expensive queries first.
- Burstable compute allows temporary spikes above baseline, with smoothing over 24 hours.
- If throttling occurs (HTTP 429 or query queuing), consider upgrading the capacity SKU.

## 11. Monitoring

**Query Insights views** (built-in, per-warehouse):
```sql
-- Recent query executions (last 30 days)
SELECT
    distributed_statement_id,
    start_time,
    end_time,
    DATEDIFF(SECOND, start_time, end_time) AS duration_seconds,
    command,
    status,
    row_count,
    login_name
FROM queryinsights.exec_requests_history
ORDER BY start_time DESC;

-- Long-running queries (> 60 seconds)
SELECT
    distributed_statement_id,
    start_time,
    command,
    DATEDIFF(SECOND, start_time, end_time) AS duration_seconds,
    login_name
FROM queryinsights.long_running_queries
ORDER BY duration_seconds DESC;

-- Frequently run queries
SELECT
    command,
    COUNT(*) AS execution_count,
    AVG(DATEDIFF(SECOND, start_time, end_time)) AS avg_duration_seconds
FROM queryinsights.exec_requests_history
WHERE start_time >= DATEADD(DAY, -7, GETDATE())
GROUP BY command
ORDER BY execution_count DESC;
```

**DMVs (Dynamic Management Views)**:
```sql
-- Currently running queries
SELECT
    session_id,
    request_id,
    start_time,
    status,
    command,
    total_elapsed_time
FROM sys.dm_exec_requests
WHERE status = 'running';
```

**Monitoring Hub**: The Fabric Monitoring Hub in the portal shows pipeline runs, dataflow refreshes, and warehouse query activity. Use it for end-to-end visibility of data loading and transformation workflows.

**Capacity metrics**: Use the Microsoft Fabric Capacity Metrics app (Power BI) to monitor CU utilization, throttling events, and per-item resource consumption across the workspace.

## 12. Common Patterns

### Pattern 1: Star Schema with COPY INTO from Lakehouse

Load raw data from a lakehouse into staging, transform into a star schema.

```sql
-- Step 1: Create schemas
CREATE SCHEMA staging;
CREATE SCHEMA dim;
CREATE SCHEMA fact;

-- Step 2: Create staging tables
CREATE TABLE staging.RawSales (
    OrderID       NVARCHAR(50),
    OrderDate     DATE,
    CustomerID    NVARCHAR(20),
    ProductSKU    NVARCHAR(30),
    StoreCode     NVARCHAR(10),
    Quantity      INT,
    UnitPrice     DECIMAL(18,2)
);

-- Step 3: Load from lakehouse
INSERT INTO staging.RawSales
SELECT OrderID, OrderDate, CustomerID, ProductSKU, StoreCode, Quantity, UnitPrice
FROM SalesLakehouse.dbo.raw_orders
WHERE OrderDate >= '2025-01-01';

-- Step 4: Build dimensions (CTAS for initial load)
CREATE TABLE dim.Product
AS
SELECT
    ROW_NUMBER() OVER (ORDER BY ProductSKU) AS ProductKey,
    ProductSKU AS ProductID,
    p.ProductName,
    p.Category AS ProductCategory,
    p.ListPrice AS UnitPrice,
    GETDATE() AS CreatedDate,
    GETDATE() AS ModifiedDate
FROM SalesLakehouse.dbo.product_master p;

-- Step 5: Build fact table
CREATE TABLE fact.Sales
AS
SELECT
    ROW_NUMBER() OVER (ORDER BY s.OrderID) AS SalesKey,
    s.OrderDate,
    c.CustomerKey,
    p.ProductKey,
    st.StoreKey,
    s.Quantity,
    s.UnitPrice,
    s.Quantity * s.UnitPrice AS TotalAmount,
    CAST(0 AS DECIMAL(18,2)) AS DiscountAmount,
    GETDATE() AS LoadDate
FROM staging.RawSales s
JOIN dim.Customer c ON s.CustomerID = c.CustomerID
JOIN dim.Product p ON s.ProductSKU = p.ProductID
JOIN dim.Store st ON s.StoreCode = st.StoreCode;
```

### Pattern 2: SCD Type 2 with MERGE

Maintain historical dimension records using effective/expiration dates.

```sql
CREATE PROCEDURE dim.usp_LoadCustomerSCD2
AS
BEGIN
    SET NOCOUNT ON;

    -- Step 1: Expire changed records
    UPDATE dim.Customer_SCD2
    SET
        ExpirationDate = CAST(GETDATE() AS DATE),
        IsCurrent = 0
    FROM dim.Customer_SCD2 c
    JOIN staging.RawCustomers s ON c.CustomerID = s.CustomerID
    WHERE c.IsCurrent = 1
      AND (c.CustomerName <> s.CustomerName OR c.Segment <> s.Segment);

    -- Step 2: Insert new versions for changed records
    INSERT INTO dim.Customer_SCD2 (CustomerKey, CustomerID, CustomerName, Email, Segment, EffectiveDate, ExpirationDate, IsCurrent)
    SELECT
        (SELECT ISNULL(MAX(CustomerKey), 0) FROM dim.Customer_SCD2) + ROW_NUMBER() OVER (ORDER BY s.CustomerID),
        s.CustomerID,
        s.CustomerName,
        s.Email,
        s.Segment,
        CAST(GETDATE() AS DATE),
        '9999-12-31',
        1
    FROM staging.RawCustomers s
    WHERE EXISTS (
        SELECT 1 FROM dim.Customer_SCD2 c
        WHERE c.CustomerID = s.CustomerID AND c.IsCurrent = 0
          AND c.ExpirationDate = CAST(GETDATE() AS DATE)
    );

    -- Step 3: Insert truly new customers
    INSERT INTO dim.Customer_SCD2 (CustomerKey, CustomerID, CustomerName, Email, Segment, EffectiveDate, ExpirationDate, IsCurrent)
    SELECT
        (SELECT ISNULL(MAX(CustomerKey), 0) FROM dim.Customer_SCD2) + ROW_NUMBER() OVER (ORDER BY s.CustomerID),
        s.CustomerID,
        s.CustomerName,
        s.Email,
        s.Segment,
        CAST(GETDATE() AS DATE),
        '9999-12-31',
        1
    FROM staging.RawCustomers s
    WHERE NOT EXISTS (
        SELECT 1 FROM dim.Customer_SCD2 c
        WHERE c.CustomerID = s.CustomerID
    );
END;
```

### Pattern 3: Cross-Database Reporting View

Create a unified reporting view spanning warehouse and lakehouse data.

```sql
CREATE VIEW rpt.vw_CustomerLifetimeValue
AS
WITH OrderHistory AS (
    SELECT
        CustomerKey,
        COUNT(DISTINCT SalesKey) AS TotalOrders,
        SUM(TotalAmount) AS LifetimeSpend,
        MIN(OrderDate) AS FirstOrderDate,
        MAX(OrderDate) AS LastOrderDate,
        DATEDIFF(DAY, MIN(OrderDate), MAX(OrderDate)) AS CustomerTenureDays
    FROM fact.Sales
    GROUP BY CustomerKey
),
WebActivity AS (
    SELECT
        c.CustomerKey,
        COUNT(*) AS TotalPageViews,
        MAX(l.event_timestamp) AS LastWebVisit
    FROM dim.Customer c
    JOIN ClickstreamLakehouse.dbo.user_events l ON c.CustomerID = l.customer_id
    WHERE l.event_type = 'page_view'
    GROUP BY c.CustomerKey
)
SELECT
    c.CustomerKey,
    c.CustomerID,
    c.CustomerName,
    c.Segment,
    ISNULL(o.TotalOrders, 0) AS TotalOrders,
    ISNULL(o.LifetimeSpend, 0) AS LifetimeSpend,
    o.FirstOrderDate,
    o.LastOrderDate,
    o.CustomerTenureDays,
    ISNULL(w.TotalPageViews, 0) AS TotalPageViews,
    w.LastWebVisit,
    CASE
        WHEN o.LifetimeSpend > 10000 THEN 'Platinum'
        WHEN o.LifetimeSpend > 5000 THEN 'Gold'
        WHEN o.LifetimeSpend > 1000 THEN 'Silver'
        ELSE 'Bronze'
    END AS ValueTier
FROM dim.Customer c
LEFT JOIN OrderHistory o ON c.CustomerKey = o.CustomerKey
LEFT JOIN WebActivity w ON c.CustomerKey = w.CustomerKey;
```

### Pattern 4: Incremental Load Pipeline with Watermark

Use a watermark table to track incremental loading progress.

```sql
-- Watermark table
CREATE TABLE staging.Watermark (
    TableName         NVARCHAR(128)  NOT NULL,
    LastLoadTimestamp  DATETIME2(0)   NOT NULL,
    LastLoadRowCount  INT            NOT NULL DEFAULT 0,
    UpdatedDate       DATETIME2(0)   NOT NULL
);

-- Initialize watermark
INSERT INTO staging.Watermark (TableName, LastLoadTimestamp, LastLoadRowCount, UpdatedDate)
VALUES ('fact.Sales', '1900-01-01', 0, GETDATE());

-- Incremental load procedure
CREATE PROCEDURE staging.usp_IncrementalLoadSales
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @LastLoad DATETIME2(0);
    DECLARE @CurrentLoad DATETIME2(0) = GETDATE();
    DECLARE @RowsLoaded INT;

    -- Get last watermark
    SELECT @LastLoad = LastLoadTimestamp
    FROM staging.Watermark
    WHERE TableName = 'fact.Sales';

    -- Load only new/changed records since last watermark
    INSERT INTO fact.Sales (SalesKey, OrderDate, CustomerKey, ProductKey, StoreKey, Quantity, UnitPrice, TotalAmount, LoadDate)
    SELECT
        ROW_NUMBER() OVER (ORDER BY o.OrderID) + (SELECT ISNULL(MAX(SalesKey), 0) FROM fact.Sales),
        o.OrderDate,
        c.CustomerKey,
        p.ProductKey,
        s.StoreKey,
        ol.Quantity,
        ol.UnitPrice,
        ol.Quantity * ol.UnitPrice,
        @CurrentLoad
    FROM staging.Orders o
    JOIN staging.OrderLines ol ON o.OrderID = ol.OrderID
    JOIN dim.Customer c ON o.CustomerID = c.CustomerID
    JOIN dim.Product p ON ol.ProductID = p.ProductID
    JOIN dim.Store s ON o.StoreID = s.StoreID
    WHERE o.ModifiedTimestamp > @LastLoad
      AND o.ModifiedTimestamp <= @CurrentLoad;

    SET @RowsLoaded = @@ROWCOUNT;

    -- Update watermark
    UPDATE staging.Watermark
    SET
        LastLoadTimestamp = @CurrentLoad,
        LastLoadRowCount = @RowsLoaded,
        UpdatedDate = GETDATE()
    WHERE TableName = 'fact.Sales';

    -- Log
    INSERT INTO staging.LoadLog (ProcedureName, Status, RowsAffected, LoadTimestamp)
    VALUES ('usp_IncrementalLoadSales', 'SUCCESS', @RowsLoaded, GETDATE());
END;
```
