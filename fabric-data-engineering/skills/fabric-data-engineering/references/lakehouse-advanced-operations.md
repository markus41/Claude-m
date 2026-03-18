# Lakehouse Advanced Operations — Reference

## Overview

Advanced lakehouse operations covering table maintenance, optimization strategies, partitioning, Z-ordering, data compaction, retention policies, cross-lakehouse queries, and monitoring.

---

## Table Maintenance

### OPTIMIZE (Compaction)

```sql
-- Compact small files into larger ones for read performance
OPTIMIZE silver_customers;

-- Target specific partitions
OPTIMIZE silver_orders WHERE order_date >= '2026-01-01';

-- Z-Order for multi-dimensional query optimization
OPTIMIZE gold_sales ZORDER BY (region, product_category);

-- V-Order for Power BI Direct Lake
-- Enabled via Spark config, applied automatically during OPTIMIZE
-- spark.conf.set("spark.sql.parquet.vorder.enabled", "true")
```

### VACUUM (Cleanup)

```sql
-- Remove files older than retention period (default 7 days)
VACUUM silver_customers;

-- Custom retention (minimum 7 days in Fabric)
VACUUM silver_customers RETAIN 30 DAYS;

-- Dry run — see what would be deleted
VACUUM silver_customers DRY RUN;
```

### Automated Maintenance Notebook

```python
from delta.tables import DeltaTable
from datetime import datetime
import json

def maintain_all_tables(lakehouse_name, retention_days=7, zorder_config=None):
    """Run OPTIMIZE and VACUUM on all Delta tables in a lakehouse."""
    zorder_config = zorder_config or {}
    results = []

    tables = spark.sql(f"SHOW TABLES IN {lakehouse_name}").collect()

    for table_row in tables:
        table_name = f"{lakehouse_name}.{table_row['tableName']}"
        start = datetime.now()

        try:
            # OPTIMIZE with optional Z-ORDER
            zorder_cols = zorder_config.get(table_row['tableName'], [])
            if zorder_cols:
                spark.sql(f"OPTIMIZE {table_name} ZORDER BY ({', '.join(zorder_cols)})")
            else:
                spark.sql(f"OPTIMIZE {table_name}")

            # VACUUM
            spark.sql(f"VACUUM {table_name} RETAIN {retention_days} DAYS")

            # Collect stats
            dt = DeltaTable.forName(spark, table_name)
            history = dt.history(1).collect()[0]

            results.append({
                "table": table_name,
                "status": "success",
                "duration_seconds": (datetime.now() - start).total_seconds(),
                "version": history["version"],
                "operation": history["operation"]
            })
        except Exception as e:
            results.append({
                "table": table_name,
                "status": "error",
                "error": str(e),
                "duration_seconds": (datetime.now() - start).total_seconds()
            })

    return results

# Usage
results = maintain_all_tables(
    "lh_silver_sales",
    retention_days=14,
    zorder_config={
        "orders": ["order_date", "customer_id"],
        "products": ["category", "brand"],
    }
)

# Log results
for r in results:
    print(f"{r['table']}: {r['status']} ({r['duration_seconds']:.1f}s)")
```

---

## Partitioning Strategy

### When to Partition

| Data Volume | Partition? | Strategy |
|---|---|---|
| < 1 GB | No | Z-ORDER only |
| 1-100 GB | Maybe | Partition by low-cardinality column (date, region) |
| 100 GB+ | Yes | Partition by date + Z-ORDER on filter columns |
| 1 TB+ | Yes | Partition by date, sub-partition if needed |

### Partition Best Practices

```python
# Good: Partition by date (low cardinality per partition)
df.write.format("delta") \
    .partitionBy("order_date") \
    .mode("overwrite") \
    .saveAsTable("silver_orders")

# Bad: Partition by high-cardinality column (creates too many small files)
# df.write.format("delta").partitionBy("customer_id")  # DON'T DO THIS

# Repartition before write for even file sizes
df.repartition(16, "order_date").write \
    .format("delta") \
    .partitionBy("order_date") \
    .mode("overwrite") \
    .saveAsTable("silver_orders")

# Target file size: 128 MB - 1 GB per file
spark.conf.set("spark.databricks.delta.targetFileSize", "134217728")  # 128 MB
```

### Liquid Clustering (Preview in Fabric)

```sql
-- Liquid clustering replaces partitioning + Z-ORDER
-- Automatically optimizes data layout based on query patterns
CREATE TABLE silver_orders (
    order_id STRING,
    order_date DATE,
    customer_id STRING,
    amount DECIMAL(10,2)
) USING DELTA
CLUSTER BY (order_date, customer_id);

-- Re-cluster after significant writes
OPTIMIZE silver_orders;
```

---

## Cross-Lakehouse Queries

### SQL Analytics Endpoint

```sql
-- Query across lakehouses within the same workspace
SELECT c.name, SUM(o.amount) as total_spend
FROM lh_silver_sales.orders o
JOIN lh_silver_customers.customers c ON o.customer_id = c.id
GROUP BY c.name
ORDER BY total_spend DESC;
```

### Cross-Workspace via Shortcuts

```python
# Create shortcut to another workspace's lakehouse table
# This avoids data duplication
import requests

headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

shortcut_payload = {
    "path": "Tables/remote_customers",
    "target": {
        "oneLake": {
            "workspaceId": "<source-workspace-id>",
            "itemId": "<source-lakehouse-id>",
            "path": "Tables/customers"
        }
    }
}

response = requests.post(
    f"https://api.fabric.microsoft.com/v1/workspaces/{workspace_id}/items/{lakehouse_id}/shortcuts",
    headers=headers,
    json=shortcut_payload
)
```

### Three-Part Name Queries (SQL Endpoint)

```sql
-- Access tables across lakehouses using three-part naming
SELECT *
FROM [lh_silver_sales].[dbo].[orders] o
CROSS JOIN [lh_silver_customers].[dbo].[customers] c
WHERE o.customer_id = c.id;
```

---

## OneLake File Operations

### Programmatic File Management

```python
from notebookutils import mssparkutils

# List files in lakehouse
files = mssparkutils.fs.ls("Files/landing/")
for f in files:
    print(f"{f.name} | {f.size} bytes | {f.modifyTime}")

# Move processed files to archive
for f in mssparkutils.fs.ls("Files/landing/"):
    if f.name.endswith(".csv"):
        mssparkutils.fs.mv(
            f"Files/landing/{f.name}",
            f"Files/archive/{run_date}/{f.name}"
        )

# Copy files between lakehouses
mssparkutils.fs.cp(
    "abfss://workspace1@onelake.dfs.fabric.microsoft.com/lh_bronze.Lakehouse/Files/export.parquet",
    "abfss://workspace2@onelake.dfs.fabric.microsoft.com/lh_staging.Lakehouse/Files/import.parquet",
    recurse=True
)

# Delete old archive files
for f in mssparkutils.fs.ls("Files/archive/"):
    if f.modifyTime < retention_cutoff:
        mssparkutils.fs.rm(f"Files/archive/{f.name}", recurse=True)
```

### Mount External Storage

```python
# Mount ADLS Gen2 for external data access
mssparkutils.fs.mount(
    "abfss://container@storageaccount.dfs.core.windows.net/path",
    "/mnt/external-data",
    {"linkedService": "MyADLSLinkedService"}
)

df = spark.read.parquet("/mnt/external-data/sales/*.parquet")
```

---

## Table Cloning

### Shallow Clone (Metadata Only)

```sql
-- Fast: copies metadata, references same data files
CREATE TABLE dev_customers SHALLOW CLONE silver_customers;

-- Clone at specific version for testing
CREATE TABLE test_customers SHALLOW CLONE silver_customers VERSION AS OF 10;
```

### Deep Clone (Full Copy)

```sql
-- Complete independent copy of table and data
CREATE TABLE backup_customers DEEP CLONE silver_customers;

-- Incremental deep clone (only new files since last clone)
CREATE TABLE backup_customers DEEP CLONE silver_customers;
```

---

## Lakehouse Monitoring

### Table Health Dashboard

```python
def get_table_health(table_name):
    """Collect health metrics for a Delta table."""
    dt = DeltaTable.forName(spark, table_name)
    detail = spark.sql(f"DESCRIBE DETAIL {table_name}").collect()[0]
    history = dt.history(10).collect()

    return {
        "table": table_name,
        "num_files": detail["numFiles"],
        "size_bytes": detail["sizeInBytes"],
        "size_gb": round(detail["sizeInBytes"] / (1024**3), 2),
        "partitions": detail["partitionColumns"],
        "created_at": detail["createdAt"],
        "last_modified": detail["lastModified"],
        "current_version": history[0]["version"],
        "operations_last_10": [h["operation"] for h in history],
        "avg_file_size_mb": round(detail["sizeInBytes"] / max(detail["numFiles"], 1) / (1024**2), 1),
        "needs_optimize": detail["numFiles"] > 100 and (detail["sizeInBytes"] / max(detail["numFiles"], 1)) < 50 * 1024 * 1024,
    }

# Scan all tables in lakehouse
tables = spark.sql("SHOW TABLES").collect()
health_report = [get_table_health(t["tableName"]) for t in tables]

# Find tables needing maintenance
for t in health_report:
    if t["needs_optimize"]:
        print(f"⚠ {t['table']}: {t['num_files']} files, avg {t['avg_file_size_mb']} MB — needs OPTIMIZE")
```

### Storage Size Tracking

```python
def track_lakehouse_growth():
    """Track lakehouse storage growth over time."""
    tables = spark.sql("SHOW TABLES").collect()
    total_size = 0

    rows = []
    for t in tables:
        detail = spark.sql(f"DESCRIBE DETAIL {t['tableName']}").collect()[0]
        total_size += detail["sizeInBytes"]
        rows.append({
            "table": t["tableName"],
            "size_gb": round(detail["sizeInBytes"] / (1024**3), 3),
            "files": detail["numFiles"],
            "snapshot_date": datetime.now().isoformat()
        })

    # Store growth history
    growth_df = spark.createDataFrame(rows)
    growth_df.write.format("delta").mode("append").saveAsTable("_metadata.storage_growth")

    print(f"Total lakehouse size: {round(total_size / (1024**3), 2)} GB across {len(tables)} tables")
```

---

## Lakehouse Security

### Row-Level Security (via Views)

```sql
-- Create a security view that filters by user identity
CREATE VIEW secure_orders AS
SELECT * FROM silver_orders
WHERE region IN (
    SELECT allowed_region
    FROM security_mappings
    WHERE user_email = current_user()
);
```

### Column-Level Masking

```python
from pyspark.sql.functions import col, when, lit, sha2

def mask_pii(df, pii_columns, user_role):
    """Mask PII columns based on user role."""
    for column in pii_columns:
        if user_role != "admin":
            df = df.withColumn(
                column,
                when(col(column).isNotNull(), sha2(col(column), 256)).otherwise(lit(None))
            )
    return df
```

---

## Limits

| Resource | Limit |
|---|---|
| Max lakehouse tables | 10,000 |
| Max file size (OneLake) | 5 TB |
| Max files per table (recommended) | 10,000 (OPTIMIZE if exceeded) |
| Delta log retention | 30 days default |
| VACUUM minimum retention | 7 days |
| Shortcut targets per lakehouse | 1,000 |
| SQL analytics endpoint query timeout | 30 minutes |
| Concurrent SQL endpoint connections | 200 |
