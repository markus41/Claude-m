# Lakehouses and Delta Lake

## Overview

A Microsoft Fabric Lakehouse combines flexible file storage (schema-on-read) with structured query capability (SQL, ACID) in a single item backed by OneLake. Every lakehouse stores tabular data as Delta Lake tables — Parquet files plus a `_delta_log/` transaction log. This reference covers the Fabric REST API for lakehouse management, Delta table operations with PySpark, ACID transactions, time travel, schema evolution, V-Order optimization, and table maintenance.

---

## Fabric REST API — Lakehouse Management

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|---------------------|----------------|-------|
| POST | `/v1/workspaces/{workspaceId}/items` | Workspace Contributor | `type=Lakehouse`, `displayName` | Creates lakehouse + SQL endpoint |
| GET | `/v1/workspaces/{workspaceId}/items?type=Lakehouse` | Workspace Viewer | — | Lists all lakehouses |
| GET | `/v1/workspaces/{workspaceId}/items/{itemId}` | Workspace Viewer | — | Returns item metadata |
| PATCH | `/v1/workspaces/{workspaceId}/items/{itemId}` | Workspace Contributor | `displayName`, `description` | Rename or update description |
| DELETE | `/v1/workspaces/{workspaceId}/items/{itemId}` | Workspace Admin | — | Deletes lakehouse and all data |
| GET | `/v1/workspaces/{workspaceId}/lakehouses/{itemId}/tables` | Workspace Viewer | — | Lists Delta tables in lakehouse |
| POST | `/v1/workspaces/{workspaceId}/lakehouses/{itemId}/tables/{tableName}/loadTable` | Workspace Contributor | `relativePath`, `pathType`, `mode` | Loads file into managed table |

**Base URL**: `https://api.fabric.microsoft.com`
**Auth scope**: `https://api.fabric.microsoft.com/.default`

### Create a Lakehouse

```bash
TOKEN=$(az account get-access-token --resource https://api.fabric.microsoft.com --query accessToken -o tsv)

curl -X POST \
  "https://api.fabric.microsoft.com/v1/workspaces/<workspace-id>/items" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "Lakehouse",
    "displayName": "bronze-lakehouse",
    "description": "Raw ingestion layer"
  }'
```

Response includes `id` (item GUID), `workspaceId`, and `type`. The SQL analytics endpoint is provisioned asynchronously — poll for `provisioningStatus: Succeeded` before running SQL queries.

### Load a File into a Managed Table

```bash
curl -X POST \
  "https://api.fabric.microsoft.com/v1/workspaces/<workspace-id>/lakehouses/<item-id>/tables/raw_orders/loadTable" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "relativePath": "Files/landing/orders_2025.parquet",
    "pathType": "File",
    "mode": "Overwrite",
    "formatOptions": {
      "format": "Parquet"
    }
  }'
```

---

## Delta Lake Table Creation with PySpark

```python
from pyspark.sql.types import (
    StructType, StructField, StringType, IntegerType,
    DecimalType, DateType, TimestampType, BooleanType
)
from delta.tables import DeltaTable

# Define schema explicitly for production tables
schema = StructType([
    StructField("order_id",      StringType(),       nullable=False),
    StructField("order_date",    DateType(),         nullable=False),
    StructField("customer_id",   StringType(),       nullable=False),
    StructField("product_sku",   StringType(),       nullable=False),
    StructField("quantity",      IntegerType(),      nullable=False),
    StructField("unit_price",    DecimalType(18, 2), nullable=False),
    StructField("total_amount",  DecimalType(18, 2), nullable=False),
    StructField("status",        StringType(),       nullable=True),
    StructField("loaded_at",     TimestampType(),    nullable=False),
])

# Create an empty Delta table with explicit schema
spark.createDataFrame([], schema).write \
    .format("delta") \
    .mode("overwrite") \
    .option("overwriteSchema", "true") \
    .partitionBy("order_date") \
    .saveAsTable("bronze_lakehouse.raw_orders")

# Or write a DataFrame to a new table
df.write \
    .format("delta") \
    .mode("overwrite") \
    .option("parquet.vorder.enabled", "true") \
    .partitionBy("order_date") \
    .saveAsTable("silver_lakehouse.orders")

# Create via SQL
spark.sql("""
    CREATE TABLE IF NOT EXISTS gold_lakehouse.fact_sales (
        sale_key        BIGINT      NOT NULL,
        order_date      DATE        NOT NULL,
        customer_key    INT         NOT NULL,
        product_key     INT         NOT NULL,
        quantity        INT         NOT NULL,
        total_amount    DECIMAL(18,2) NOT NULL,
        loaded_at       TIMESTAMP   NOT NULL
    )
    USING DELTA
    PARTITIONED BY (order_date)
    TBLPROPERTIES (
        'delta.autoOptimize.optimizeWrite' = 'true',
        'delta.autoOptimize.autoCompact'   = 'true',
        'delta.enableChangeDataFeed'       = 'true'
    )
""")
```

---

## ACID Transactions

Delta Lake guarantees ACID semantics via the `_delta_log/` transaction log.

```python
from delta.tables import DeltaTable
from pyspark.sql import functions as F

# --- INSERT --- (append new rows)
new_orders = spark.read.format("parquet").load("Files/landing/new_orders.parquet")
new_orders.write.format("delta").mode("append").saveAsTable("bronze_lakehouse.raw_orders")

# --- UPDATE ---
delta_table = DeltaTable.forName(spark, "silver_lakehouse.orders")
delta_table.update(
    condition = F.col("status") == "pending",
    set       = {"status": F.lit("processed"), "updated_at": F.current_timestamp()}
)

# --- DELETE ---
delta_table.delete(condition = F.col("order_date") < F.lit("2023-01-01"))

# --- MERGE (upsert) ---
source_df = spark.read.format("delta").load("Tables/staging_orders")

delta_table.alias("tgt").merge(
    source_df.alias("src"),
    "tgt.order_id = src.order_id"
).whenMatchedUpdate(
    condition = "src.status != tgt.status",
    set = {
        "tgt.status":     "src.status",
        "tgt.updated_at": F.current_timestamp()
    }
).whenNotMatchedInsertAll() \
 .execute()
```

---

## Time Travel Queries

Delta's transaction log enables querying any historical version of a table.

```python
# Query by version number
df_v5 = spark.read.format("delta") \
    .option("versionAsOf", 5) \
    .load("Tables/orders")

# Query by timestamp
df_yesterday = spark.read.format("delta") \
    .option("timestampAsOf", "2025-03-01T00:00:00") \
    .load("Tables/orders")

# SQL syntax
spark.sql("""
    SELECT * FROM silver_lakehouse.orders
    VERSION AS OF 10
""")

spark.sql("""
    SELECT * FROM silver_lakehouse.orders
    TIMESTAMP AS OF '2025-03-01'
""")

# Show Delta history
display(spark.sql("DESCRIBE HISTORY silver_lakehouse.orders"))

# Restore a table to a previous version
spark.sql("RESTORE TABLE silver_lakehouse.orders TO VERSION AS OF 8")
spark.sql("RESTORE TABLE silver_lakehouse.orders TO TIMESTAMP AS OF '2025-02-28T12:00:00'")
```

---

## Schema Evolution

Delta supports adding columns and changing column types without rewriting data.

```python
# Merge schema (add new columns automatically)
new_df_with_extra_col.write \
    .format("delta") \
    .mode("append") \
    .option("mergeSchema", "true") \
    .saveAsTable("silver_lakehouse.orders")

# Overwrite schema (full schema replacement)
reshaped_df.write \
    .format("delta") \
    .mode("overwrite") \
    .option("overwriteSchema", "true") \
    .saveAsTable("silver_lakehouse.orders")

# Add a column via SQL ALTER TABLE
spark.sql("ALTER TABLE silver_lakehouse.orders ADD COLUMN (discount_amount DECIMAL(18,2))")

# Rename a column (requires column mapping feature)
spark.sql("""
    ALTER TABLE silver_lakehouse.orders
    SET TBLPROPERTIES (
        'delta.minReaderVersion' = '2',
        'delta.minWriterVersion' = '5',
        'delta.columnMapping.mode' = 'name'
    )
""")
spark.sql("ALTER TABLE silver_lakehouse.orders RENAME COLUMN product_sku TO product_id")

# Drop a column
spark.sql("ALTER TABLE silver_lakehouse.orders DROP COLUMN legacy_field")
```

---

## V-Order Optimization

V-Order reorders data within Parquet row groups for optimal compression and read performance, particularly for Power BI Direct Lake mode.

```python
# Enable V-Order on Spark writes (on by default in Fabric Spark)
spark.conf.set("spark.sql.parquet.vorder.enabled", "true")

# Explicit per-write option
df.write \
    .format("delta") \
    .option("parquet.vorder.enabled", "true") \
    .mode("overwrite") \
    .saveAsTable("gold_lakehouse.fact_sales")

# Apply V-Order to an existing table via OPTIMIZE
spark.sql("OPTIMIZE gold_lakehouse.fact_sales VORDER")

# Verify V-Order on existing files
spark.sql("DESCRIBE DETAIL gold_lakehouse.fact_sales").show(truncate=False)
```

V-Order is lossless — files remain standard Parquet. Gains of 10–50% in Direct Lake query speed are typical for wide analytical tables.

---

## Table Maintenance — OPTIMIZE and VACUUM

```python
# OPTIMIZE: compact small files into ~256 MB target files
spark.sql("OPTIMIZE silver_lakehouse.orders")

# OPTIMIZE with Z-ordering for multi-column predicates
spark.sql("OPTIMIZE silver_lakehouse.orders ZORDER BY (customer_id, order_date)")

# VACUUM: delete old file versions beyond the retention period
# Default retention = 7 days. Do not go below 7 days unless you understand the risks.
spark.sql("VACUUM silver_lakehouse.orders RETAIN 168 HOURS")  # 7 days

# Force VACUUM below default (testing only — dangerous in production)
spark.conf.set("spark.databricks.delta.retentionDurationCheck.enabled", "false")
spark.sql("VACUUM silver_lakehouse.orders RETAIN 0 HOURS")  # removes all old files
spark.conf.set("spark.databricks.delta.retentionDurationCheck.enabled", "true")

# Dry run VACUUM to preview deletions
spark.sql("VACUUM silver_lakehouse.orders RETAIN 168 HOURS DRY RUN")

# Auto-optimize table properties (recommended for streaming/micro-batch ingestion)
spark.sql("""
    ALTER TABLE silver_lakehouse.orders
    SET TBLPROPERTIES (
        'delta.autoOptimize.optimizeWrite' = 'true',
        'delta.autoOptimize.autoCompact'   = 'true'
    )
""")
```

---

## Change Data Feed (CDF)

CDF exposes row-level change data for downstream incremental processing.

```python
# Enable CDF on an existing table
spark.sql("""
    ALTER TABLE silver_lakehouse.orders
    SET TBLPROPERTIES ('delta.enableChangeDataFeed' = 'true')
""")

# Read changes since a version
changes_df = spark.read.format("delta") \
    .option("readChangeFeed", "true") \
    .option("startingVersion", 10) \
    .table("silver_lakehouse.orders")

# Read changes since a timestamp
changes_df = spark.read.format("delta") \
    .option("readChangeFeed", "true") \
    .option("startingTimestamp", "2025-03-01T00:00:00") \
    .table("silver_lakehouse.orders")

# _change_type values: insert, update_preimage, update_postimage, delete
display(changes_df.filter("_change_type = 'update_postimage'"))
```

---

## Error Codes Table

| Code / Error | Meaning | Remediation |
|-------------|---------|-------------|
| `DeltaAnalysisException: DELTA_SCHEMA_NOT_SET` | Writing DataFrame without specifying schema to an empty path | Use `saveAsTable` or provide explicit schema |
| `ConcurrentAppendException` | Two Spark jobs wrote to the same partition concurrently | Enable `delta.autoOptimize.optimizeWrite`; use partition-level isolation |
| `MetadataChangedException` | Schema changed between read plan and execution | Retry the read; avoid schema changes during active reads |
| `DeltaNotATableException` | Path does not contain a valid Delta table | Verify path; use `DeltaTable.isDeltaTable(spark, path)` before reading |
| `ProtocolChangedException` | Reader/writer protocol version too low | Upgrade client Delta library or disable unsupported features |
| `DELTA_CANNOT_OVERWRITE_SCHEMA` | Overwrite attempted without `overwriteSchema=true` | Add `.option("overwriteSchema", "true")` to write |
| `VACUUM retention check failed` | VACUUM retain hours < default 168 | Set `spark.databricks.delta.retentionDurationCheck.enabled=false` only for testing |
| HTTP 404 on lakehouse API | Workspace or item GUID is incorrect | Verify IDs with `GET /workspaces/{id}/items` |
| HTTP 409 Conflict | Item with same name already exists | Use a unique name or delete the existing item first |
| HTTP 429 Too Many Requests | API rate limit exceeded | Implement exponential backoff; see throttling table below |

---

## Throttling / Limits Table

| Resource | Limit | Notes |
|----------|-------|-------|
| Tables per lakehouse | No hard limit documented; practical limit ~10,000 | Large table counts slow metadata operations |
| Files per Delta table | ~10,000 before noticeable slowdown | Run OPTIMIZE regularly to compact |
| Parquet file target size | 128–512 MB | Fabric targets ~256 MB after OPTIMIZE |
| `_delta_log` entries before checkpoint | 10 | Delta checkpoints automatically every 10 commits |
| VACUUM minimum retention | 168 hours (7 days) by default | Shorter retention risks breaking time travel |
| Fabric REST API requests | 1,000 per minute per user | Use service principal with exponential backoff |
| Lakehouse `loadTable` file size | 512 MB per file | Split large files before calling loadTable |
| Max concurrent Spark sessions | Varies by capacity SKU (F2: ~2, F64: ~20+) | Queue or schedule notebooks to avoid contention |

---

## Common Patterns and Gotchas

### Gotcha: Writing to Tables/ with Raw Files Corrupts Delta Log

Never use the DFS API to write raw Parquet files directly into the `Tables/<table-name>/` folder. Only Spark and Dataflow Gen2 should write there. The Delta transaction log (`_delta_log/`) must be updated atomically — direct file writes bypass this and leave the table in a corrupted state.

**Solution**: Write raw files to `Files/landing/` and process them into `Tables/` via a Spark notebook.

### Gotcha: Schema on Read vs Schema on Write

Fabric Lakehouse allows schema-on-read CSV/JSON files in `Files/`, but Delta tables are schema-on-write. Always define your Delta schema explicitly with `StructType` rather than inferring from source data in production. Schema inference reads all files to determine types and is slow; it also produces inconsistent types across loads.

### Pattern: Idempotent Incremental Load with MERGE

```python
from delta.tables import DeltaTable

def incremental_merge(spark, source_df, target_table, merge_key_cols, update_cols):
    """Generic idempotent merge into a Delta table."""
    target = DeltaTable.forName(spark, target_table)
    merge_condition = " AND ".join([f"tgt.{c} = src.{c}" for c in merge_key_cols])
    update_set = {c: f"src.{c}" for c in update_cols}

    target.alias("tgt").merge(
        source_df.alias("src"),
        merge_condition
    ).whenMatchedUpdate(set=update_set) \
     .whenNotMatchedInsertAll() \
     .execute()

# Usage
incremental_merge(
    spark,
    source_df=new_orders,
    target_table="silver_lakehouse.orders",
    merge_key_cols=["order_id"],
    update_cols=["status", "total_amount", "updated_at"]
)
```

### Pattern: Partition Pruning Best Practice

Partition keys should appear in WHERE clauses to trigger partition pruning. Date is the most effective partition key for time-series tables.

```python
# Efficient — Spark reads only the 2025-03-01 partition directory
df = spark.sql("""
    SELECT * FROM silver_lakehouse.orders
    WHERE order_date = '2025-03-01'
""")

# Inefficient — full table scan despite partitioned table
df = spark.sql("""
    SELECT * FROM silver_lakehouse.orders
    WHERE year(order_date) = 2025  -- function on partition column bypasses pruning
""")
```

### Pattern: Checking Table Delta Format Compatibility

```python
# Check Delta table details including format version
spark.sql("DESCRIBE DETAIL my_lakehouse.orders").show(truncate=False)

# Check if a path is a valid Delta table before reading
from delta.tables import DeltaTable
if DeltaTable.isDeltaTable(spark, "abfss://ws@onelake.dfs.fabric.microsoft.com/lh.Lakehouse/Tables/orders"):
    df = spark.read.format("delta").load(...)
```

### Gotcha: ZORDER and Partition Interaction

ZORDER operates within partitions, not across them. If you partition by `order_date` and ZORDER by `customer_id`, the ZORDER only clusters data within each date partition — it does not sort across all dates. Design partitions and ZORDER to work together: partition on the highest-cardinality filter (date), ZORDER on the next most selective filter (customer_id).

### Pattern: Table Properties for Production Reliability

```python
# Set recommended properties for production Delta tables
spark.sql("""
    ALTER TABLE silver_lakehouse.orders SET TBLPROPERTIES (
        'delta.autoOptimize.optimizeWrite'     = 'true',
        'delta.autoOptimize.autoCompact'       = 'true',
        'delta.enableChangeDataFeed'           = 'true',
        'delta.dataSkippingNumIndexedCols'     = '32',
        'delta.logRetentionDuration'           = 'interval 30 days',
        'delta.deletedFileRetentionDuration'   = 'interval 7 days'
    )
""")
```
