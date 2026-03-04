# OneLake Desktop Sync for Data Engineering

OneLake desktop sync mirrors Fabric lakehouse data to the local filesystem, enabling data engineers to inspect Delta tables, profile data, and stage files for ingestion without Spark or API authentication.

## Local Path Convention

```
C:\Users\<user>\OneLake - <tenant>\
  └── <workspace>\
      └── <lakehouse>.Lakehouse\
          ├── Files\          ← raw/staging files (CSV, Parquet, JSON)
          │   └── landing\    ← common drop zone for ingestion
          └── Tables\         ← managed Delta tables (READ ONLY locally)
              └── <table>\
                  ├── _delta_log\
                  └── *.snappy.parquet
```

Base path for this repository's user: `C:\Users\MarkusAhling\OneLake - Microsoft\`

## Inspecting Delta Tables Locally

### Schema and metadata
```python
import deltalake

path = r"C:\Users\MarkusAhling\OneLake - Microsoft\my-workspace\my-lakehouse.Lakehouse\Tables\sales"
dt = deltalake.DeltaTable(path)
print(dt.schema())       # Column names and types
print(dt.version())      # Current Delta version
print(dt.history())      # Transaction history (commits, operations, timestamps)
print(len(dt.files()))   # Number of data files
```

### Row count and profiling
```python
import polars as pl

path = r"C:\Users\MarkusAhling\OneLake - Microsoft\my-workspace\my-lakehouse.Lakehouse\Tables\sales"
df = pl.read_delta(path)
print(f"Rows: {len(df)}, Columns: {len(df.columns)}")
print(df.describe())  # Summary statistics
print(df.null_count()) # Null counts per column
```

### Query with DuckDB
```python
import duckdb

path = r"C:/Users/MarkusAhling/OneLake - Microsoft/my-workspace/my-lakehouse.Lakehouse/Tables/sales"
con = duckdb.connect()
# Row count
print(con.sql(f"SELECT COUNT(*) FROM delta_scan('{path}')").fetchone())
# Sample rows
print(con.sql(f"SELECT * FROM delta_scan('{path}') LIMIT 10").df())
# Column profiling
print(con.sql(f"SUMMARIZE SELECT * FROM delta_scan('{path}')").df())
```

## File Staging via Local Sync

Copy local files to the lakehouse `Files/` folder — they sync to OneLake and become available to Spark notebooks:

```python
import shutil
from pathlib import Path

source = Path("data/customers.csv")
target = Path(r"C:\Users\MarkusAhling\OneLake - Microsoft\my-workspace\my-lakehouse.Lakehouse\Files\landing\customers.csv")
target.parent.mkdir(parents=True, exist_ok=True)
shutil.copy2(source, target)
# After sync (seconds to minutes), read in a Spark notebook:
# df = spark.read.format("csv").option("header", "true").load("Files/landing/customers.csv")
```

## Development Workflow

1. **Profile data locally** — Read Delta tables with polars/DuckDB to understand schema, row counts, nulls, distributions
2. **Prototype transformations** — Build and test pandas/polars transforms on local data samples
3. **Stage test files** — Copy test CSV/Parquet to `Files/landing/` via local sync
4. **Deploy to Fabric** — Convert working logic to PySpark and run in Fabric notebooks
5. **Validate output** — Read the output Delta table locally to verify results

## Critical Rules for Data Engineers

| Rule | Why |
|------|-----|
| **Never write to Tables/** | Direct writes bypass Delta transaction logs — corrupts table state and breaks time travel, OPTIMIZE, and VACUUM |
| **Always write to Files/** | Safe for staging data; Spark reads from `Files/` path for ingestion |
| **Account for sync delay** | Changes take seconds to minutes; don't read immediately after writing |
| **Use for profiling, not production** | Local reads are for development and debugging; production pipelines should use Spark/Fabric APIs |
| **Pin large tables if needed** | Right-click → "Always keep on this device" for tables you access frequently |

## Mapping to Spark Paths

| Local Path | Spark Notebook Path |
|-----------|-------------------|
| `...\<lakehouse>.Lakehouse\Files\landing\data.csv` | `Files/landing/data.csv` |
| `...\<lakehouse>.Lakehouse\Tables\sales` | Table name: `sales` (or `spark.read.table("sales")`) |

When developing locally and deploying to Spark, replace local filesystem paths with the Spark-relative paths shown above.
