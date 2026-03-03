# T-SQL Patterns

## Overview

Fabric Data Warehouse exposes a full T-SQL surface for DDL, DML, and analytics queries. It stores data as Delta Parquet on OneLake with automatic distribution managed by Fabric — no manual `DISTRIBUTION` or `INDEX` declarations. This reference covers CREATE TABLE/VIEW/PROCEDURE patterns, COPY INTO for bulk ingestion, distributed table design, statistics management, column-level considerations, and common T-SQL gotchas specific to Fabric DW.

---

## CREATE TABLE Patterns

### Basic Table Creation

```sql
-- Dimension table
CREATE TABLE dim.Customer (
    CustomerKey       INT            NOT NULL,
    CustomerID        NVARCHAR(20)   NOT NULL,
    CustomerName      NVARCHAR(200)  NOT NULL,
    Email             NVARCHAR(256)  NULL,
    Phone             NVARCHAR(30)   NULL,
    City              NVARCHAR(100)  NULL,
    StateProvince     NVARCHAR(100)  NULL,
    CountryCode       CHAR(2)        NULL,
    Segment           NVARCHAR(50)   NULL,
    IsActive          BIT            NOT NULL DEFAULT 1,
    CreatedDate       DATETIME2(0)   NOT NULL DEFAULT GETDATE(),
    ModifiedDate      DATETIME2(0)   NOT NULL DEFAULT GETDATE()
);

-- Fact table
CREATE TABLE fact.Sales (
    SalesKey          BIGINT         NOT NULL,
    OrderDate         DATE           NOT NULL,
    CustomerKey       INT            NOT NULL,
    ProductKey        INT            NOT NULL,
    StoreKey          INT            NOT NULL,
    ChannelKey        INT            NOT NULL,
    Quantity          INT            NOT NULL,
    UnitPrice         DECIMAL(18,2)  NOT NULL,
    Discount          DECIMAL(5,4)   NOT NULL DEFAULT 0,
    TotalAmount       DECIMAL(18,2)  NOT NULL,
    TaxAmount         DECIMAL(18,2)  NOT NULL DEFAULT 0,
    LoadDate          DATETIME2(0)   NOT NULL DEFAULT GETDATE()
);
```

### Supported Data Types Reference

| Category | Supported Types | Unsupported (use instead) |
|----------|----------------|--------------------------|
| Integer | `TINYINT`, `SMALLINT`, `INT`, `BIGINT` | — |
| Decimal | `DECIMAL(p,s)`, `NUMERIC(p,s)`, `FLOAT`, `REAL`, `MONEY`, `SMALLMONEY` | — |
| String | `CHAR(n)`, `VARCHAR(n)`, `NCHAR(n)`, `NVARCHAR(n)`, `VARCHAR(MAX)`, `NVARCHAR(MAX)` | `TEXT`, `NTEXT` → use `NVARCHAR(MAX)` |
| Date/Time | `DATE`, `TIME`, `DATETIME2(n)`, `DATETIMEOFFSET(n)` | `DATETIME`, `SMALLDATETIME` → use `DATETIME2` |
| Binary | `BINARY(n)`, `VARBINARY(n)`, `VARBINARY(MAX)` | `IMAGE` → use `VARBINARY(MAX)` |
| Other | `BIT`, `UNIQUEIDENTIFIER` | `XML`, `SQL_VARIANT`, `HIERARCHYID`, `GEOMETRY`, `GEOGRAPHY` |

### CTAS (CREATE TABLE AS SELECT)

```sql
-- Initial full load of dimension
CREATE TABLE dim.Product
AS
SELECT
    ROW_NUMBER() OVER (ORDER BY ProductSKU)   AS ProductKey,
    ProductSKU                                 AS ProductID,
    ProductName,
    ISNULL(Category, 'Uncategorized')          AS ProductCategory,
    ISNULL(SubCategory, 'General')             AS ProductSubCategory,
    ListPrice                                  AS UnitPrice,
    CAST(1 AS BIT)                             AS IsActive,
    GETDATE()                                  AS CreatedDate,
    GETDATE()                                  AS ModifiedDate
FROM staging.RawProducts
WHERE ProductSKU IS NOT NULL;

-- Zero-copy table clone (Fabric-specific)
CREATE TABLE staging.Customer_Backup
AS CLONE OF dim.Customer;

-- Point-in-time clone
CREATE TABLE staging.Customer_Snapshot_Jan
AS CLONE OF dim.Customer
AT (TIMESTAMP = '2025-01-31T23:59:59');
```

---

## CREATE VIEW

```sql
-- Reporting view spanning multiple tables
CREATE VIEW rpt.vw_SalesSummary
AS
SELECT
    d.CalendarYear,
    d.MonthName,
    d.MonthNumber,
    p.ProductCategory,
    p.ProductSubCategory,
    c.Segment               AS CustomerSegment,
    s.StoreName,
    COUNT(DISTINCT f.SalesKey) AS TransactionCount,
    SUM(f.Quantity)            AS TotalUnits,
    SUM(f.TotalAmount)         AS GrossRevenue,
    SUM(f.Discount * f.TotalAmount) AS TotalDiscount,
    SUM(f.TotalAmount * (1 - f.Discount)) AS NetRevenue
FROM fact.Sales f
JOIN dim.DateDim d   ON f.OrderDate   = d.DateKey
JOIN dim.Product p   ON f.ProductKey  = p.ProductKey
JOIN dim.Customer c  ON f.CustomerKey = c.CustomerKey
JOIN dim.Store s     ON f.StoreKey    = s.StoreKey
GROUP BY
    d.CalendarYear, d.MonthName, d.MonthNumber,
    p.ProductCategory, p.ProductSubCategory,
    c.Segment, s.StoreName;

-- View with security filtering
CREATE VIEW rpt.vw_MyRegionSales
AS
SELECT *
FROM rpt.vw_SalesSummary
WHERE Region = USER_NAME();
```

---

## CREATE PROCEDURE

### ETL Stored Procedure with Error Handling

```sql
CREATE PROCEDURE staging.usp_LoadDimProduct
    @SourceSchema NVARCHAR(50) = 'staging',
    @Debug        BIT = 0
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @RowsInserted INT = 0;
    DECLARE @RowsUpdated  INT = 0;
    DECLARE @StartTime    DATETIME2 = GETDATE();

    BEGIN TRY
        BEGIN TRANSACTION;

        -- Upsert from staging
        MERGE INTO dim.Product AS tgt
        USING staging.RawProducts AS src
        ON tgt.ProductID = src.ProductSKU
        WHEN MATCHED AND (
            tgt.ProductName     <> src.ProductName     OR
            tgt.ProductCategory <> src.Category        OR
            tgt.UnitPrice       <> src.ListPrice
        ) THEN UPDATE SET
            tgt.ProductName     = src.ProductName,
            tgt.ProductCategory = src.Category,
            tgt.UnitPrice       = src.ListPrice,
            tgt.ModifiedDate    = GETDATE()
        WHEN NOT MATCHED BY TARGET THEN INSERT (
            ProductKey, ProductID, ProductName, ProductCategory,
            ProductSubCategory, UnitPrice, IsActive, CreatedDate, ModifiedDate
        ) VALUES (
            (SELECT ISNULL(MAX(ProductKey), 0) + 1 FROM dim.Product),
            src.ProductSKU, src.ProductName, src.Category,
            src.SubCategory, src.ListPrice, 1, GETDATE(), GETDATE()
        );

        SET @RowsUpdated  = @@ROWCOUNT;

        COMMIT TRANSACTION;

        -- Log success
        INSERT INTO staging.ETLLog (ProcedureName, Status, RowsAffected, DurationMs, LogTime)
        VALUES ('usp_LoadDimProduct', 'SUCCESS', @RowsUpdated,
                DATEDIFF(MILLISECOND, @StartTime, GETDATE()), GETDATE());

        IF @Debug = 1
            PRINT 'usp_LoadDimProduct completed. Rows: ' + CAST(@RowsUpdated AS NVARCHAR);
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        INSERT INTO staging.ETLLog (ProcedureName, Status, ErrorMessage, DurationMs, LogTime)
        VALUES ('usp_LoadDimProduct', 'FAILED', ERROR_MESSAGE(),
                DATEDIFF(MILLISECOND, @StartTime, GETDATE()), GETDATE());

        THROW;
    END CATCH;
END;
GO
```

---

## COPY INTO for Ingestion

COPY INTO is the recommended bulk load mechanism for Fabric Data Warehouse.

```sql
-- Load Parquet files from ADLS Gen2
COPY INTO staging.RawSales
FROM 'https://mydatalake.dfs.core.windows.net/raw/sales/2025/03/01/*.parquet'
WITH (
    FILE_TYPE  = 'PARQUET',
    CREDENTIAL = (
        IDENTITY = 'Shared Access Signature',
        SECRET   = '<sas-token>'
    )
);

-- Load CSV with all options
COPY INTO staging.RawCustomers
FROM 'https://mydatalake.dfs.core.windows.net/raw/customers/*.csv'
WITH (
    FILE_TYPE       = 'CSV',
    FIRSTROW        = 2,           -- skip header
    FIELDTERMINATOR = ',',
    ROWTERMINATOR   = '\n',
    FIELDQUOTE      = '"',
    ENCODING        = 'UTF8',
    CREDENTIAL      = (IDENTITY = 'Shared Access Signature', SECRET = '<sas-token>')
);

-- Load from OneLake (same tenant — no credential needed)
COPY INTO staging.RawOrders
FROM 'https://onelake.dfs.fabric.microsoft.com/<workspace-id>/<lakehouse-id>/Tables/raw_orders/'
WITH (
    FILE_TYPE = 'PARQUET'
);

-- Load multiple files with wildcard pattern
COPY INTO staging.RawEvents
FROM 'https://mydatalake.dfs.core.windows.net/raw/events/year=2025/month=03/*.parquet'
WITH (
    FILE_TYPE  = 'PARQUET',
    CREDENTIAL = (IDENTITY = 'Managed Identity')
);
```

### COPY INTO Supported Options

| Option | Values | Notes |
|--------|--------|-------|
| `FILE_TYPE` | `PARQUET`, `CSV`, `DELTA` (preview) | PARQUET recommended |
| `FIRSTROW` | Integer (e.g., `2`) | CSV only; skip header row |
| `FIELDTERMINATOR` | String (e.g., `','`, `'\t'`) | CSV only |
| `ROWTERMINATOR` | String (e.g., `'\n'`, `'\r\n'`) | CSV only |
| `FIELDQUOTE` | String (e.g., `'"'`) | CSV only |
| `ENCODING` | `UTF8`, `UTF16`, `Latin1` | CSV only |
| `CREDENTIAL` | `SAS`, `Managed Identity`, `Service Principal` | Auth method |
| `MAXERRORS` | Integer | Abort after N errors; default 0 (abort on first) |

---

## Distributed Table Design

Unlike Synapse Dedicated SQL Pool, Fabric Data Warehouse uses **automatic distribution**. You do not declare `DISTRIBUTION = HASH(column)` or `REPLICATE`. Fabric analyzes query patterns and automatically optimizes data layout.

```sql
-- Fabric automatically distributes — just CREATE TABLE normally
CREATE TABLE fact.Sales (
    SalesKey     BIGINT         NOT NULL,
    OrderDate    DATE           NOT NULL,
    CustomerKey  INT            NOT NULL,
    ProductKey   INT            NOT NULL,
    TotalAmount  DECIMAL(18,2)  NOT NULL
);
-- No DISTRIBUTION clause needed or supported
```

### Design Principles for Fabric DW

| Principle | Recommendation |
|-----------|---------------|
| Surrogate keys | Use INT/BIGINT surrogate keys; Fabric does not support IDENTITY columns — generate via `ROW_NUMBER()` or max+1 pattern |
| Constraints | PRIMARY KEY and UNIQUE are declarable but unenforced (optimizer hints only); NOT NULL and DEFAULT are enforced |
| Foreign keys | Not supported — enforce referential integrity in ETL |
| Wide tables | Avoid SELECT * — columnar storage reads only referenced columns |
| Data types | Prefer smaller types (INT over BIGINT, DATE over DATETIME2) to reduce storage |

---

## Statistics Management

Fabric auto-creates column statistics on first query execution. Manual statistics are rarely needed but can improve complex query plans.

```sql
-- Create manual statistics on a join key
CREATE STATISTICS stat_Sales_OrderDate     ON fact.Sales (OrderDate);
CREATE STATISTICS stat_Sales_CustomerKey   ON fact.Sales (CustomerKey);
CREATE STATISTICS stat_Sales_ProductKey    ON fact.Sales (ProductKey);
CREATE STATISTICS stat_Customer_CustomerID ON dim.Customer (CustomerID);

-- Update statistics after large data loads
UPDATE STATISTICS fact.Sales;
UPDATE STATISTICS dim.Customer;
UPDATE STATISTICS dim.Product;

-- View existing statistics
SELECT
    s.name          AS StatName,
    c.name          AS ColumnName,
    sp.last_updated,
    sp.rows,
    sp.rows_sampled
FROM sys.stats s
JOIN sys.stats_columns sc ON s.object_id = sc.object_id AND s.stats_id = sc.stats_id
JOIN sys.columns c        ON sc.object_id = c.object_id AND sc.column_id = c.column_id
CROSS APPLY sys.dm_db_stats_properties(s.object_id, s.stats_id) sp
WHERE OBJECT_SCHEMA_NAME(s.object_id) IN ('dim', 'fact')
ORDER BY sp.last_updated DESC;
```

---

## Columnstore Considerations

Fabric Data Warehouse stores all data as Delta Parquet, which provides columnar compression similar to columnstore indexes. Key differences from traditional columnstore:

- No explicit `CREATE CLUSTERED COLUMNSTORE INDEX` — storage is automatically columnar.
- No row group management — Delta handles file layout.
- Compression is managed by Delta and Parquet.
- V-Order optimization applies within each Parquet file for better scan performance.

```sql
-- V-Order is applied via Spark/Dataflow Gen2 on write
-- For warehouse-written data, Fabric automatically applies optimal layout
-- No manual index management required

-- Query to check table storage details
SELECT
    name,
    total_pages * 8 / 1024.0    AS total_size_mb,
    used_pages  * 8 / 1024.0    AS used_size_mb,
    data_pages  * 8 / 1024.0    AS data_size_mb
FROM sys.tables t
JOIN sys.schemas s ON t.schema_id = s.schema_id
JOIN sys.partitions p ON t.object_id = p.object_id
JOIN sys.allocation_units au ON p.partition_id = au.container_id
WHERE s.name IN ('dim', 'fact')
ORDER BY total_size_mb DESC;
```

---

## Common T-SQL Gotchas in Fabric DW

### Gotcha 1: No IDENTITY Columns

Fabric Data Warehouse does not support `IDENTITY` columns. Generate surrogate keys explicitly.

```sql
-- Wrong — not supported
CREATE TABLE dim.Customer (
    CustomerKey INT IDENTITY(1,1) NOT NULL  -- ERROR
);

-- Correct — use ROW_NUMBER() for initial load
INSERT INTO dim.Customer (CustomerKey, CustomerID, CustomerName, CreatedDate, ModifiedDate)
SELECT
    ROW_NUMBER() OVER (ORDER BY CustomerID)
        + ISNULL((SELECT MAX(CustomerKey) FROM dim.Customer), 0),
    CustomerID,
    CustomerName,
    GETDATE(),
    GETDATE()
FROM staging.NewCustomers;
```

### Gotcha 2: No Materialized Views

Fabric DW does not support `CREATE MATERIALIZED VIEW`. Use CTAS to pre-compute results.

```sql
-- Wrong — not supported
CREATE MATERIALIZED VIEW rpt.mv_MonthlySales AS SELECT ...  -- ERROR

-- Correct — use CTAS and refresh regularly
CREATE TABLE rpt.MonthlySales_Cache AS
SELECT
    YEAR(OrderDate)  AS SalesYear,
    MONTH(OrderDate) AS SalesMonth,
    SUM(TotalAmount) AS Revenue
FROM fact.Sales
GROUP BY YEAR(OrderDate), MONTH(OrderDate);

-- Refresh on schedule
TRUNCATE TABLE rpt.MonthlySales_Cache;
INSERT INTO rpt.MonthlySales_Cache
SELECT ... FROM fact.Sales ...;
```

### Gotcha 3: No Linked Servers or External Tables

Use cross-database three-part naming (within the same workspace) instead.

```sql
-- Wrong — not supported
SELECT * FROM OPENROWSET(...) -- Limited support
SELECT * FROM OPENDATASOURCE(...) -- Not supported

-- Correct — three-part naming within same workspace
SELECT * FROM OtherWarehouse.dim.Customer;
SELECT * FROM SalesLakehouse.dbo.raw_orders;
```

### Gotcha 4: Table Clones are Metadata-Only

Table clones share underlying Parquet files. Modifying the cloned table writes new files; the original is unaffected. However, VACUUM on the original can remove files shared with the clone.

```sql
-- Create clone (zero-copy, instant)
CREATE TABLE staging.dim_Customer_Backup AS CLONE OF dim.Customer;

-- Safe to run DML on the clone — doesn't affect original
UPDATE staging.dim_Customer_Backup SET Email = 'test@example.com' WHERE CustomerKey = 1;
```

### Gotcha 5: TRUNCATE vs DELETE

`TRUNCATE TABLE` is fully supported and preferred over `DELETE` for clearing staging tables (faster, non-logged in Delta).

```sql
-- Preferred for staging table refresh
TRUNCATE TABLE staging.RawSales;

-- Use DELETE only when filtering rows
DELETE FROM staging.RawSales WHERE LoadDate < DATEADD(DAY, -7, GETDATE());
```

---

## Error Codes Table

| Error | Meaning | Remediation |
|-------|---------|-------------|
| `Cannot find the object 'IDENTITY'` | IDENTITY keyword used in CREATE TABLE | Remove IDENTITY; use ROW_NUMBER() or max+1 pattern |
| `Foreign key constraint is not supported` | FOREIGN KEY declared in CREATE TABLE | Remove FOREIGN KEY constraint; enforce in ETL |
| `The specified column 'x' is not supported` | Unsupported data type (XML, GEOMETRY, etc.) | Use supported equivalent (NVARCHAR(MAX) for XML content) |
| `COPY INTO: Failed to read file` | Source file not found or wrong SAS permissions | Verify file path and SAS token has Storage Blob Data Reader role |
| `Deadlock found when trying to get lock` | Concurrent writes to same table | Serialize concurrent writers; use staging tables |
| `Statement is not supported within a multi-statement transaction` | DDL inside a transaction | Run DDL outside transactions; Fabric DDL is auto-committed |
| `The view is not schema-bound` | Schema binding required for indexed view | Fabric doesn't support indexed views; use CTAS instead |
| `MERGE: The target table is the same as the source table` | Self-merge | Use a staging CTE or temp table as source |
| `sp_rename failed` | Column mapping mode not enabled | For column renames, use column mapping mode or recreate the table |

---

## Throttling / Limits Table

| Resource | Limit | Notes |
|----------|-------|-------|
| Max concurrent queries | ~4 (F2) to ~50+ (F128) | Queries queue when limit reached |
| Max table name length | 128 chars | SQL Server standard |
| Max columns per table | 1,024 | SQL Server standard |
| COPY INTO max file size | 4 GB per file | Split files larger than 4 GB before loading |
| COPY INTO max files per statement | 1,000 | Use multiple COPY INTO for > 1,000 files |
| Temp table session scope | Session-only | Temp tables dropped at session end |
| Stored procedure nesting | 32 levels | Standard SQL Server limit |
| MERGE source size | No hard limit; performance degrades at scale | Partition MERGE by date range for large loads |
| Query result cache TTL | ~24 hours or until data changes | Cache is per-warehouse; invalidated by DML |
