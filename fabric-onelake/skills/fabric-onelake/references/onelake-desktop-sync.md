# OneLake Desktop Sync — Local File Access

OneLake desktop sync (formerly OneLake file explorer) mirrors Fabric lakehouse data to the local filesystem in near-real-time. This enables local reads of Delta tables and unmanaged files without API authentication.

## Installation and Setup

1. Install from Microsoft Store: search "OneLake" or download from [Microsoft](https://www.microsoft.com/store/productId/9NZ1JM9M60BF)
2. Sign in with your Entra ID (Azure AD) account
3. OneLake appears under `C:\Users\<user>\OneLake - <tenant>\` with workspace and item subfolders

## Local Path Convention

```
C:\Users\<user>\OneLake - <tenant>\
  └── <workspace-name>\
      └── <item-name>.Lakehouse\
          ├── Files\          ← unmanaged files (CSV, Parquet, JSON, images)
          └── Tables\         ← managed Delta tables (Parquet + _delta_log)
              └── <table-name>\
                  ├── _delta_log\
                  │   ├── 00000000000000000000.json
                  │   └── ...
                  └── part-00000-*.snappy.parquet
```

For the user of this repository, the base path is:
`C:\Users\MarkusAhling\OneLake - Microsoft\`

## Path Mapping: ABFSS <-> Local

| ABFSS URI | Local Path |
|-----------|------------|
| `abfss://<workspace>@onelake.dfs.fabric.microsoft.com/<item>.Lakehouse/Tables/<table>` | `C:\Users\<user>\OneLake - <tenant>\<workspace>\<item>.Lakehouse\Tables\<table>\` |
| `abfss://<workspace>@onelake.dfs.fabric.microsoft.com/<item>.Lakehouse/Files/<path>` | `C:\Users\<user>\OneLake - <tenant>\<workspace>\<item>.Lakehouse\Files\<path>` |

## Sync Behavior

- **Direction**: Bidirectional — reads and writes sync to/from OneLake cloud storage
- **Latency**: Near-real-time (typically seconds to minutes)
- **Conflict resolution**: Last-writer-wins
- **On-demand files**: By default, files are on-demand (downloaded on first access). Right-click > "Always keep on this device" to pin locally
- **Supported items**: Lakehouses, Data Warehouses (read-only), KQL databases (read-only)
- **Offline access**: Pinned files remain available offline; changes sync when reconnected

## Reading Delta Tables Locally

### Python — deltalake library
```python
import deltalake

table_path = r"C:\Users\MarkusAhling\OneLake - Microsoft\my-workspace\my-lakehouse.Lakehouse\Tables\sales"
dt = deltalake.DeltaTable(table_path)

# Schema and metadata
print(dt.schema())
print(f"Version: {dt.version()}")
print(f"Rows: {len(dt.to_pandas())}")
print(f"Files: {dt.files()}")

# Read as pandas DataFrame
df = dt.to_pandas()
```

### Python — polars
```python
import polars as pl

table_path = r"C:\Users\MarkusAhling\OneLake - Microsoft\my-workspace\my-lakehouse.Lakehouse\Tables\sales"
df = pl.read_delta(table_path)
print(df.schema)
print(df.head())
```

### Python — DuckDB
```python
import duckdb

table_path = r"C:/Users/MarkusAhling/OneLake - Microsoft/my-workspace/my-lakehouse.Lakehouse/Tables/sales"
con = duckdb.connect()
df = con.sql(f"SELECT * FROM delta_scan('{table_path}')").df()
print(df.head())
```

### Python — pandas (Parquet files directly)
```python
import pandas as pd
from pathlib import Path

table_path = Path(r"C:\Users\MarkusAhling\OneLake - Microsoft\my-workspace\my-lakehouse.Lakehouse\Tables\sales")
parquet_files = list(table_path.glob("*.parquet"))
df = pd.read_parquet(parquet_files[0])  # Single file
# Or read all partitions:
df = pd.read_parquet(table_path, engine="pyarrow")
```

## Reading Unmanaged Files Locally

```python
import pandas as pd
from pathlib import Path

files_path = Path(r"C:\Users\MarkusAhling\OneLake - Microsoft\my-workspace\my-lakehouse.Lakehouse\Files")

# CSV
df = pd.read_csv(files_path / "landing" / "data.csv")

# List files
for f in files_path.rglob("*"):
    if f.is_file():
        print(f"{f.relative_to(files_path)} — {f.stat().st_size / 1024:.1f} KB")
```

## Writing — Files/ Only

**CRITICAL**: Only write to the `Files/` folder. Never write directly to `Tables/` — managed Delta tables must be written by Spark or Fabric pipeline activities. Direct writes to `Tables/` corrupt Delta transaction logs.

```python
import shutil
from pathlib import Path

# Safe: copy a local file to Files/
local_file = Path("data/export.csv")
target = Path(r"C:\Users\MarkusAhling\OneLake - Microsoft\my-workspace\my-lakehouse.Lakehouse\Files\landing\export.csv")
target.parent.mkdir(parents=True, exist_ok=True)
shutil.copy2(local_file, target)
# The file will sync to OneLake and become available to Spark notebooks
```

## Use Cases

| Use Case | Approach |
|----------|----------|
| Quick data profiling | Read Delta table locally with polars/DuckDB — no Spark cluster needed |
| Schema inspection | Read `_delta_log/*.json` to see table schema and column metadata |
| Upload files for ingestion | Copy files to `Files/landing/` — they sync to OneLake for Spark to read |
| Local ML development | Load lakehouse features into local Python/Jupyter without Spark |
| Data validation | Compare local Delta table row counts with expected values |
| Debugging pipeline output | Inspect Parquet files written by a failed pipeline activity |

## Comparison: Local Sync vs DFS API vs Storage Explorer

| Capability | OneLake Desktop Sync | DFS REST API | Azure Storage Explorer |
|-----------|---------------------|--------------|----------------------|
| Authentication | Automatic (Entra ID SSO) | Bearer token required | Entra ID sign-in |
| Read Delta tables | Yes (local filesystem) | Yes (HTTP calls) | Yes (file browse) |
| Write to Files/ | Yes (file copy) | Yes (PUT request) | Yes (upload) |
| Write to Tables/ | No (corrupts Delta log) | No (same risk) | No (same risk) |
| Offline access | Yes (pinned files) | No | No |
| Automation friendly | Yes (standard file I/O) | Yes (REST/SDK) | No (GUI only) |
| Setup required | Install app + sign in | az login or token | Install app + sign in |
| Best for | Local dev, profiling, ML | CI/CD, scripts, cross-platform | One-off file management |

## Limitations

- **Windows only** — OneLake desktop sync is available only on Windows (10+)
- **No Tables/ writes** — writing directly to Tables/ bypasses Delta transaction logs and corrupts tables
- **Sync delay** — changes may take seconds to minutes to propagate
- **Large files** — very large files (>1 GB) may take significant time to sync
- **Permissions** — local access respects OneLake RBAC; if you lose access in Fabric, local files become inaccessible
- **Workspace limit** — sync may slow down with many workspaces; pin only what you need
