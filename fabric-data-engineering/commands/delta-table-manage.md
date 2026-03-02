---
name: delta-table-manage
description: "Create, optimize, vacuum, and manage Delta Lake tables in a Fabric lakehouse"
argument-hint: "<action> --table <table-name> [--lakehouse <lakehouse-name>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - AskUserQuestion
---

# Manage Delta Lake Tables

Create, optimize, vacuum, and manage Delta Lake tables in a Fabric lakehouse.

## Instructions

### 1. Validate Inputs

- `<action>` -- One of: `create`, `optimize`, `vacuum`, `zorder`, `describe`, `history`, `restore`, `alter`. Ask if not provided.
- `--table` -- Fully qualified table name (e.g., `lh_silver_sales.customers`). Ask if not provided.
- `--lakehouse` -- Lakehouse context. If the table name is fully qualified, this is optional.

### 2. Action: create

Create a new managed Delta table with proper schema and settings:

```sql
CREATE TABLE IF NOT EXISTS <table_name> (
    id STRING NOT NULL,
    name STRING,
    value DECIMAL(18,2),
    category STRING,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    _ingested_at TIMESTAMP DEFAULT current_timestamp(),
    _source_file STRING
)
USING DELTA
PARTITIONED BY (category)
TBLPROPERTIES (
    'delta.autoOptimize.optimizeWrite' = 'true',
    'delta.autoOptimize.autoCompact' = 'true',
    'delta.columnMapping.mode' = 'name',
    'delta.minReaderVersion' = '2',
    'delta.minWriterVersion' = '5'
);
```

Ask the user for column definitions if not specified. Include audit columns (`_ingested_at`, `_source_file`) by default.

### 3. Action: optimize

Run OPTIMIZE to compact small files into larger ones:

```sql
-- Basic optimize
OPTIMIZE <table_name>;

-- Optimize with file size target (128 MB recommended for Fabric)
OPTIMIZE <table_name> WHERE date_key >= current_date() - INTERVAL 7 DAYS;
```

Recommend running OPTIMIZE:
- After large batch writes
- On tables with many small files (check with `DESCRIBE DETAIL <table_name>` -- look at `numFiles`)
- As a scheduled weekly maintenance task

### 4. Action: vacuum

Remove old file versions to reclaim storage:

```sql
-- Check files that would be deleted (dry run)
VACUUM <table_name> DRY RUN;

-- Vacuum with default 7-day retention
VACUUM <table_name>;

-- Vacuum with custom retention (minimum 168 hours unless overridden)
VACUUM <table_name> RETAIN 168 HOURS;
```

**Warning**: Do not reduce retention below 168 hours unless you are certain no long-running queries reference old versions. To override:
```sql
SET spark.databricks.delta.retentionDurationCheck.enabled = false;
VACUUM <table_name> RETAIN 24 HOURS;
```

### 5. Action: zorder

Apply Z-ORDER clustering on frequently filtered columns:

```sql
OPTIMIZE <table_name> ZORDER BY (customer_id, order_date);
```

Guidelines for choosing Z-ORDER columns:
- Columns used in WHERE clauses frequently
- Columns used in JOIN conditions
- Maximum 4 columns (diminishing returns beyond that)
- High-cardinality columns benefit most (e.g., `customer_id` over `status`)

**Liquid clustering** (alternative to Z-ORDER + partitioning):
```sql
ALTER TABLE <table_name> CLUSTER BY (customer_id, order_date);
```

### 6. Action: describe

Show detailed table metadata:

```sql
-- Schema and column details
DESCRIBE TABLE EXTENDED <table_name>;

-- Table physical details (size, files, partitions)
DESCRIBE DETAIL <table_name>;

-- Table properties
SHOW TBLPROPERTIES <table_name>;
```

### 7. Action: history

View table version history for auditing and time travel:

```sql
-- Full history
DESCRIBE HISTORY <table_name>;

-- Recent history
DESCRIBE HISTORY <table_name> LIMIT 20;

-- Query a specific version
SELECT * FROM <table_name> VERSION AS OF 5;

-- Query as of a timestamp
SELECT * FROM <table_name> TIMESTAMP AS OF '2024-01-15T10:00:00Z';
```

### 8. Action: restore

Restore a table to a previous version:

```sql
-- Restore to a version number
RESTORE TABLE <table_name> TO VERSION AS OF 5;

-- Restore to a timestamp
RESTORE TABLE <table_name> TO TIMESTAMP AS OF '2024-01-15T10:00:00Z';
```

**Warning**: Restore creates a new version. Files referenced by the restored version must not have been removed by VACUUM.

### 9. Action: alter

Modify table schema or properties:

```sql
-- Add a column
ALTER TABLE <table_name> ADD COLUMN new_col STRING AFTER existing_col;

-- Rename a column (requires column mapping mode = 'name')
ALTER TABLE <table_name> RENAME COLUMN old_name TO new_name;

-- Drop a column (requires column mapping mode = 'name')
ALTER TABLE <table_name> DROP COLUMN unused_col;

-- Change table property
ALTER TABLE <table_name> SET TBLPROPERTIES ('delta.autoOptimize.optimizeWrite' = 'true');
```

### 10. Display Summary

Show the user:
- Action performed and table affected
- Results (row counts, file counts, storage reclaimed for vacuum)
- Recommendations for maintenance scheduling
- Related commands: `/lakehouse-create`, `/notebook-create`, `/lakehouse-load-data`
