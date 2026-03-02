---
name: warehouse-table-create
description: "Generate CREATE TABLE DDL for dimension, fact, or staging tables with proper data types"
argument-hint: "<dim|fact|staging> --name <TableName> [--columns <spec>] [--scd <1|2|3>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - AskUserQuestion
---

# Create a Warehouse Table

Generate T-SQL CREATE TABLE DDL for a dimension, fact, or staging table following data warehouse best practices.

## Instructions

### 1. Validate Inputs

- `<type>` — One of: `dim`, `fact`, `staging`. Ask if not provided.
- `--name` — Table name (e.g., `Customer`, `Sales`, `RawOrders`). Ask if not provided.
- `--columns` — Optional column specification. If not provided, ask the user to describe the table purpose and infer columns.
- `--scd` — For dimension tables: SCD type (`1`, `2`, or `3`). Default: `1`.

### 2. Design the Table

**For `dim` (dimension) tables**:
- Add a surrogate key column: `<Name>Key INT NOT NULL` (or `BIGINT` for large dimensions).
- Add a business key column: `<Name>ID NVARCHAR(n) NOT NULL`.
- Add descriptive attribute columns based on user input.
- Add audit columns: `CreatedDate DATETIME2(0) NOT NULL`, `ModifiedDate DATETIME2(0) NOT NULL`.
- If `--scd 2`: Add `EffectiveDate DATE NOT NULL`, `ExpirationDate DATE NOT NULL DEFAULT '9999-12-31'`, `IsCurrent BIT NOT NULL DEFAULT 1`.
- If `--scd 3`: Add `Previous<Attribute>` and `<Attribute>ChangeDate` columns for tracked attributes.

**For `fact` tables**:
- Add a surrogate key column: `<Name>Key BIGINT NOT NULL`.
- Add foreign key columns referencing dimension surrogate keys: `<Dim>Key INT NOT NULL`.
- Add date key column: typically `<Event>Date DATE NOT NULL`.
- Add measure columns with appropriate types: `DECIMAL(18,2)` for currency, `INT` for counts.
- Add audit column: `LoadDate DATETIME2(0) NOT NULL`.
- Ask the user whether this is a transaction, periodic snapshot, or accumulating snapshot fact.

**For `staging` tables**:
- Mirror the source schema with permissive types (`NVARCHAR` for text, `NVARCHAR(MAX)` for unknown lengths).
- All columns should be `NULL`able (staging tolerates bad data).
- Add `LoadDate DATETIME2(0) NOT NULL DEFAULT GETDATE()` for load tracking.
- No surrogate keys — use source business keys.

### 3. Apply Data Type Best Practices

| Use | Instead of |
|-----|-----------|
| `DATETIME2(0)` or `DATETIME2(3)` | `DATETIME`, `SMALLDATETIME` |
| `NVARCHAR(n)` | `TEXT`, `NTEXT` |
| `DECIMAL(18,2)` | `FLOAT`, `MONEY` for currency |
| `VARBINARY(MAX)` | `IMAGE` |
| `BIT` | `TINYINT` for boolean values |
| `DATE` | `DATETIME2` when only date is needed |

### 4. Generate the DDL

Write the CREATE TABLE statement to `tables/<type>/<TableName>.sql`.

Example output:
```sql
CREATE TABLE dim.Customer (
    CustomerKey       INT            NOT NULL,
    CustomerID        NVARCHAR(20)   NOT NULL,
    CustomerName      NVARCHAR(200)  NOT NULL,
    Email             NVARCHAR(256)  NULL,
    City              NVARCHAR(100)  NULL,
    Country           NVARCHAR(100)  NULL,
    Segment           NVARCHAR(50)   NULL,
    CreatedDate       DATETIME2(0)   NOT NULL,
    ModifiedDate      DATETIME2(0)   NOT NULL
);
```

### 5. Generate Related Objects

- If `dim` with `--scd 2`: Generate the SCD2 MERGE stored procedure in `procedures/usp_Load<Name>SCD2.sql`.
- If `fact`: Generate a basic load procedure in `procedures/usp_Load<Name>.sql`.
- If `staging`: Generate a COPY INTO template in `data-load/copy_<name>.sql`.

### 6. Display Summary

Show the user:
- Created table DDL with column descriptions
- File path where the SQL was written
- Related generated objects (procedures, load scripts)
- Reminder to add informational PRIMARY KEY if desired (not enforced but aids optimizer)
