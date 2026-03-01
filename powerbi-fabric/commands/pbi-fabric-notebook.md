---
name: pbi-fabric-notebook
description: Generate a Microsoft Fabric notebook (PySpark) for data transformation with Lakehouse integration. Outputs Python cells for reading, transforming, and writing Delta tables.
argument-hint: "<description of data pipeline> [--source sql|csv|api|lakehouse] [--output <table-name>] [--upsert]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
---

# Generate Fabric Notebook

Generate a PySpark notebook for Microsoft Fabric with Lakehouse integration.

## Instructions

1. Parse the user's description to understand the data pipeline requirements.
2. If `--source` is provided, use the specified source type for the initial data read.
3. If `--output` is provided, use that as the Delta table output name.
4. If `--upsert` flag is present, use Delta merge (upsert) instead of overwrite.
5. Read the Fabric reference at `skills/powerbi-analytics/references/fabric-integration.md` for patterns.

## Source Options

| Flag | Read Method |
|------|-------------|
| `sql` | `spark.read.format("jdbc")` with SQL Server connection |
| `csv` | `spark.read.format("csv")` from Files area |
| `api` | `requests` library with JSON response converted to DataFrame |
| `lakehouse` | `spark.read.format("delta").load("Tables/<name>")` |

## Output Format

Generate a series of Python code cells (markdown and code) that form a complete notebook:

### Cell 1: Configuration and Imports
```python
# Standard imports for Fabric notebooks
from pyspark.sql import SparkSession
from pyspark.sql.functions import *
from pyspark.sql.types import *
from delta.tables import DeltaTable
```

### Cell 2: Read Source Data
```python
# Read from source with appropriate connector
df = spark.read.format("...").load("...")
```

### Cell 3: Transform
```python
# Data transformations: filter, join, derive columns, clean data
df_transformed = (df
    .filter(...)
    .withColumn(...)
    .select(...)
)
```

### Cell 4: Write to Lakehouse
```python
# Write to Delta table in Lakehouse
df_transformed.write.format("delta").mode("overwrite").saveAsTable("output_table")
```

### Cell 5: Optimize (optional)
```python
# Optimize Delta table for query performance
spark.sql("OPTIMIZE output_table ZORDER BY (key_column)")
```

## Guidelines

- Always include `from pyspark.sql.functions import *` for column operations.
- Include `from delta.tables import DeltaTable` if upsert/merge is needed.
- Add a `load_timestamp` column using `current_timestamp()` for lineage tracking.
- Use `dropDuplicates()` on key columns to handle duplicate source records.
- For upsert operations, use `DeltaTable.forPath().alias("target").merge()` pattern.
- Include `display(df.limit(10))` calls for data preview during development.
- Add `spark.sql("OPTIMIZE ... ZORDER BY (...)")` for frequently queried columns.
- For large datasets, configure shuffle partitions: `spark.conf.set("spark.sql.shuffle.partitions", "8")`.
- Comment each transformation step clearly.
- If reading from SQL Server, note that the user needs to configure the JDBC connection string and credentials.
- Output the table name so it appears automatically in the Lakehouse SQL endpoint for Direct Lake consumption.
