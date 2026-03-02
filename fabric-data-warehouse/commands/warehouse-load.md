---
name: warehouse-load
description: "Generate data loading scripts — COPY INTO, CTAS, MERGE, or incremental load procedures"
argument-hint: "<copy-into|ctas|merge|incremental> --target <schema.table> [--source <path-or-table>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

# Generate a Data Loading Script

Create a T-SQL data loading script for the Fabric Data Warehouse.

## Instructions

### 1. Validate Inputs

- `<type>` — One of: `copy-into`, `ctas`, `merge`, `incremental`. Ask if not provided.
- `--target` — Target table in `schema.table` format (e.g., `staging.RawSales`, `dim.Customer`). Ask if not provided.
- `--source` — Source location: ADLS path, OneLake path, lakehouse table, or staging table name. Ask if not provided.

### 2. Generate the Loading Script

**For `copy-into`** (bulk load from external storage):
```sql
COPY INTO <target>
FROM '<source-path>'
WITH (
    FILE_TYPE = 'PARQUET',  -- or CSV
    CREDENTIAL = (IDENTITY = 'Shared Access Signature', SECRET = '<sas-token>')
);
```

Ask the user:
- File format (Parquet, CSV)
- Authentication method (SAS token, Managed Identity, OneLake same-tenant)
- CSV options if applicable (delimiter, header row, encoding)

**For `ctas`** (transform and create new table):
```sql
CREATE TABLE <target>
AS
SELECT <transformed-columns>
FROM <source>;
```

Ask the user:
- Source table or query
- Transformations to apply (column renames, type casts, filters, joins)

**For `merge`** (upsert existing table):
```sql
MERGE INTO <target> AS tgt
USING <source> AS src
ON tgt.<business-key> = src.<business-key>
WHEN MATCHED AND (<change-detection>) THEN
    UPDATE SET <columns>
WHEN NOT MATCHED BY TARGET THEN
    INSERT (<columns>) VALUES (<values>);
```

Ask the user:
- Business key for matching
- Which columns to compare for change detection
- Whether to handle deletes (WHEN NOT MATCHED BY SOURCE)

**For `incremental`** (watermark-based incremental load):
Generate a stored procedure that:
1. Reads the last watermark from `staging.Watermark`.
2. Loads only records modified since the watermark.
3. Updates the watermark after successful load.
4. Includes TRY/CATCH error handling.
5. Logs to `staging.LoadLog`.

### 3. Add Error Handling

For all procedure-based loads (merge, incremental):
- Wrap in `BEGIN TRY / BEGIN CATCH`.
- Use `BEGIN TRANSACTION / COMMIT / ROLLBACK`.
- Log errors to `staging.LoadLog`.
- Re-throw errors with `THROW`.

### 4. Make Loads Idempotent

- `copy-into`: Warn that repeated runs append data. Recommend DELETE + COPY or staging table pattern.
- `ctas`: Warn that the table must not already exist. Use `DROP TABLE IF EXISTS` before CTAS if appropriate.
- `merge`: Inherently idempotent by design.
- `incremental`: Idempotent via watermark — re-runs process the same window.

### 5. Output

Write the script to `data-load/<type>_<table>.sql` or `procedures/usp_Load<Table>.sql`.

Show the user:
- Generated script with inline comments
- How to execute (SSMS, Azure Data Studio, or Fabric pipeline)
- Prerequisite tables (staging, watermark, load log)
- Scheduling recommendations (Fabric pipeline with scheduled trigger)
