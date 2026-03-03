# Medallion Architecture

## Overview

The medallion architecture organizes data into three quality tiers — Bronze (raw), Silver (cleansed and conformed), and Gold (curated, business-ready) — implemented as separate Fabric lakehouses or workspace layers. Each tier applies progressively more transformation, quality enforcement, and business semantics. This reference covers the tier design patterns, incremental load with Delta, CDC, schema enforcement, data quality with Great Expectations, and orchestration patterns.

---

## Layer Design Summary

| Layer | Purpose | Storage | Quality Level | Consumer |
|-------|---------|---------|---------------|----------|
| Bronze | Raw ingestion, append-only | Delta + Files | None — as-is from source | Data engineers |
| Silver | Cleansed, deduped, conformed | Delta | Enforced schema, nulls handled | Data scientists, analysts |
| Gold | Aggregated, business-ready, SCD dims | Delta (V-Order) | Business rules applied | Power BI, warehouses, apps |

---

## Bronze Layer — Raw Ingestion

Bronze stores data exactly as received from sources. Never transform or delete bronze data.

```python
from pyspark.sql import functions as F
from datetime import datetime

# Append raw records with load metadata
def ingest_to_bronze(source_df, bronze_table, source_name):
    """Write source data to bronze with ingestion metadata."""
    augmented = source_df \
        .withColumn("_ingested_at",  F.current_timestamp()) \
        .withColumn("_source",       F.lit(source_name)) \
        .withColumn("_source_file",  F.input_file_name()) \
        .withColumn("_batch_id",     F.lit(datetime.utcnow().strftime("%Y%m%d%H%M%S")))

    augmented.write \
        .format("delta") \
        .mode("append") \
        .option("mergeSchema", "true") \
        .saveAsTable(bronze_table)

    print(f"Ingested {augmented.count()} rows to {bronze_table}")

# Example: ingest CSV files from Files/landing/
raw_df = spark.read \
    .option("header", "true") \
    .option("inferSchema", "true") \
    .csv("Files/landing/orders/2025-03-01/*.csv")

ingest_to_bronze(raw_df, "bronze_lakehouse.raw_orders", "erp-system")
```

### Bronze Partitioning Strategy

```python
# Partition by ingestion date for efficient time-based queries
raw_df \
    .withColumn("_ingestion_date", F.to_date(F.current_timestamp())) \
    .write \
    .format("delta") \
    .mode("append") \
    .partitionBy("_ingestion_date") \
    .saveAsTable("bronze_lakehouse.raw_orders")
```

---

## Silver Layer — Cleansed and Conformed

Silver applies deduplication, null handling, type casting, and schema enforcement.

```python
from pyspark.sql import functions as F
from pyspark.sql.types import DecimalType, DateType, TimestampType

def bronze_to_silver_orders(spark, run_date):
    """Transform bronze raw_orders to silver cleaned_orders."""

    # Read only today's bronze partition (incremental)
    bronze = spark.sql(f"""
        SELECT *
        FROM bronze_lakehouse.raw_orders
        WHERE _ingestion_date = '{run_date}'
    """)

    # 1. Type casting
    silver = bronze \
        .withColumn("order_date",    F.to_date("order_date", "yyyy-MM-dd")) \
        .withColumn("total_amount",  F.col("total_amount").cast(DecimalType(18, 2))) \
        .withColumn("quantity",      F.col("quantity").cast("int")) \
        .withColumn("customer_id",   F.upper(F.trim("customer_id")))

    # 2. Null handling
    silver = silver \
        .filter(F.col("order_id").isNotNull()) \
        .filter(F.col("customer_id").isNotNull()) \
        .withColumn("status", F.coalesce("status", F.lit("unknown"))) \
        .withColumn("discount", F.coalesce("discount", F.lit(0.0)))

    # 3. Deduplication (keep the latest record per order_id)
    from pyspark.sql.window import Window
    window = Window.partitionBy("order_id").orderBy(F.col("_ingested_at").desc())
    silver = silver \
        .withColumn("row_rank", F.row_number().over(window)) \
        .filter("row_rank = 1") \
        .drop("row_rank")

    # 4. Add silver metadata
    silver = silver \
        .withColumn("_silver_processed_at", F.current_timestamp()) \
        .drop("_source_file", "_batch_id")

    # 5. Merge into silver (upsert for idempotency)
    from delta.tables import DeltaTable
    if DeltaTable.isDeltaTable(spark, "Tables/cleaned_orders"):
        target = DeltaTable.forName(spark, "silver_lakehouse.cleaned_orders")
        target.alias("tgt").merge(
            silver.alias("src"), "tgt.order_id = src.order_id"
        ).whenMatchedUpdateAll() \
         .whenNotMatchedInsertAll() \
         .execute()
    else:
        silver.write \
            .format("delta") \
            .mode("overwrite") \
            .option("overwriteSchema", "true") \
            .partitionBy("order_date") \
            .saveAsTable("silver_lakehouse.cleaned_orders")

bronze_to_silver_orders(spark, "2025-03-01")
```

---

## Gold Layer — Business-Ready

Gold applies aggregations, SCD logic, and business rules. Optimized for Power BI Direct Lake.

```python
from pyspark.sql import functions as F
from delta.tables import DeltaTable

def build_gold_fact_daily_sales(spark, run_date):
    """Build or update gold fact: daily sales aggregation."""
    silver_orders = spark.sql(f"""
        SELECT
            order_date,
            customer_id,
            product_id,
            SUM(quantity)     AS total_quantity,
            SUM(total_amount) AS total_revenue,
            COUNT(*)          AS order_count
        FROM silver_lakehouse.cleaned_orders
        WHERE order_date = '{run_date}'
          AND status != 'cancelled'
        GROUP BY order_date, customer_id, product_id
    """)

    # Join with dimension keys
    with_dim_keys = spark.sql(f"""
        SELECT
            f.order_date,
            c.customer_key,
            p.product_key,
            f.total_quantity,
            f.total_revenue,
            f.order_count
        FROM (
            SELECT order_date, customer_id, product_id,
                   SUM(quantity) AS total_quantity,
                   SUM(total_amount) AS total_revenue,
                   COUNT(*) AS order_count
            FROM silver_lakehouse.cleaned_orders
            WHERE order_date = '{run_date}'
              AND status != 'cancelled'
            GROUP BY order_date, customer_id, product_id
        ) f
        JOIN gold_lakehouse.dim_customers c ON f.customer_id = c.customer_id AND c.is_current = true
        JOIN gold_lakehouse.dim_products  p ON f.product_id = p.product_id
    """)

    with_dim_keys \
        .write \
        .format("delta") \
        .mode("append") \
        .option("parquet.vorder.enabled", "true") \
        .partitionBy("order_date") \
        .saveAsTable("gold_lakehouse.fact_daily_sales")

build_gold_fact_daily_sales(spark, "2025-03-01")
```

---

## Incremental Load with Delta

Use the Delta change data feed or watermark pattern for efficient incremental processing.

### Pattern 1: CDF-Based Incremental (Silver → Gold)

```python
def incremental_silver_to_gold(spark, last_version):
    """Process only new/changed silver records using CDF."""

    changes = spark.read.format("delta") \
        .option("readChangeFeed", "true") \
        .option("startingVersion", last_version) \
        .table("silver_lakehouse.cleaned_orders") \
        .filter("_change_type IN ('insert', 'update_postimage')")

    if changes.count() == 0:
        print("No changes to process.")
        return last_version

    # Process only changed orders
    from delta.tables import DeltaTable
    gold_target = DeltaTable.forName(spark, "gold_lakehouse.fact_daily_sales")
    gold_target.alias("tgt").merge(
        changes.alias("src"),
        "tgt.order_date = src.order_date AND tgt.customer_key = src.customer_key"
    ).whenMatchedUpdateAll() \
     .whenNotMatchedInsertAll() \
     .execute()

    # Return latest version for next run
    return spark.sql("DESCRIBE HISTORY silver_lakehouse.cleaned_orders LIMIT 1") \
               .select("version").first()[0]

last_version = 0  # Load from control table
new_version = incremental_silver_to_gold(spark, last_version)
# Persist new_version to control table
```

### Pattern 2: Watermark Table

```python
def get_watermark(spark, table_name, control_table="gold_lakehouse.etl_watermarks"):
    result = spark.sql(f"""
        SELECT COALESCE(MAX(last_processed_at), TIMESTAMP '1900-01-01 00:00:00')
        FROM {control_table}
        WHERE table_name = '{table_name}'
    """).collect()[0][0]
    return result

def update_watermark(spark, table_name, new_ts, control_table="gold_lakehouse.etl_watermarks"):
    spark.sql(f"""
        MERGE INTO {control_table} AS tgt
        USING (SELECT '{table_name}' AS table_name, TIMESTAMP '{new_ts}' AS last_processed_at) AS src
        ON tgt.table_name = src.table_name
        WHEN MATCHED THEN UPDATE SET tgt.last_processed_at = src.last_processed_at
        WHEN NOT MATCHED THEN INSERT *
    """)

from datetime import datetime
last_ts = get_watermark(spark, "cleaned_orders")
new_records = spark.sql(f"""
    SELECT * FROM silver_lakehouse.cleaned_orders
    WHERE _silver_processed_at > '{last_ts}'
""")
# ... process new_records ...
update_watermark(spark, "cleaned_orders", datetime.utcnow().isoformat())
```

---

## CDC Patterns

Change Data Capture tracks row-level inserts, updates, and deletes from source systems.

```python
# Pattern: Process CDC records from a source that provides operation codes
cdc_df = spark.read.format("parquet").load("Files/landing/cdc/2025-03-01")

# CDC operation codes: I=insert, U=update, D=delete
inserts = cdc_df.filter("op_code = 'I'").drop("op_code", "cdc_timestamp")
updates = cdc_df.filter("op_code = 'U'").drop("op_code", "cdc_timestamp")
deletes = cdc_df.filter("op_code = 'D'").select("order_id", "cdc_timestamp")

from delta.tables import DeltaTable
target = DeltaTable.forName(spark, "silver_lakehouse.cleaned_orders")

# Apply inserts and updates via merge
target.alias("tgt").merge(
    inserts.union(updates).alias("src"),
    "tgt.order_id = src.order_id"
).whenMatchedUpdateAll() \
 .whenNotMatchedInsertAll() \
 .execute()

# Apply soft deletes (mark as deleted rather than physical delete)
target.update(
    condition = F.col("order_id").isin([r.order_id for r in deletes.collect()]),
    set = {"is_deleted": F.lit(True), "deleted_at": F.current_timestamp()}
)
```

---

## Schema Enforcement

Enforce schema at ingestion to prevent bad data from propagating downstream.

```python
from pyspark.sql.types import StructType, StructField, StringType, DecimalType, DateType, IntegerType, TimestampType

SILVER_ORDERS_SCHEMA = StructType([
    StructField("order_id",    StringType(),       False),
    StructField("order_date",  DateType(),         False),
    StructField("customer_id", StringType(),       False),
    StructField("product_id",  StringType(),       False),
    StructField("quantity",    IntegerType(),      False),
    StructField("total_amount", DecimalType(18,2), False),
    StructField("status",      StringType(),       True),
])

def enforce_schema(df, schema):
    """Select and cast columns to match target schema. Reject mismatches."""
    selected_cols = []
    for field in schema.fields:
        if field.name in df.columns:
            selected_cols.append(F.col(field.name).cast(field.dataType).alias(field.name))
        elif not field.nullable:
            raise ValueError(f"Required column '{field.name}' missing from source DataFrame")
        else:
            selected_cols.append(F.lit(None).cast(field.dataType).alias(field.name))
    return df.select(selected_cols)

enforced_df = enforce_schema(bronze_df, SILVER_ORDERS_SCHEMA)
```

---

## Data Quality with Great Expectations

```python
%%pip install great-expectations==0.18.12

import great_expectations as gx
from great_expectations.dataset import SparkDFDataset

# Wrap Spark DataFrame in Great Expectations
ge_df = SparkDFDataset(silver_df)

# Define expectations
ge_df.expect_column_to_exist("order_id")
ge_df.expect_column_values_to_not_be_null("order_id")
ge_df.expect_column_values_to_not_be_null("customer_id")
ge_df.expect_column_values_to_be_of_type("total_amount", "DecimalType")
ge_df.expect_column_values_to_be_between("quantity", min_value=1, max_value=10000)
ge_df.expect_column_values_to_match_regex("customer_id", r"^CUST-\d{6}$")
ge_df.expect_column_distinct_values_to_be_in_set("status", ["pending", "processed", "shipped", "cancelled"])

# Validate and get results
results = ge_df.validate()
failed = [r for r in results["results"] if not r["success"]]

if failed:
    for f in failed:
        print(f"FAILED: {f['expectation_config']['expectation_type']} on {f['expectation_config']['kwargs']}")
    raise ValueError(f"{len(failed)} data quality checks failed. Aborting load.")

print(f"All {len(results['results'])} data quality checks passed.")
```

---

## Orchestration Patterns

### Pattern: Dependency-Ordered Notebook Execution via Pipeline

```json
{
  "activities": [
    { "name": "IngestBronze",    "type": "Notebook", "dependsOn": [] },
    { "name": "TransformSilver", "type": "Notebook", "dependsOn": [{"activity": "IngestBronze",    "dependencyConditions": ["Succeeded"]}] },
    { "name": "BuildGold",       "type": "Notebook", "dependsOn": [{"activity": "TransformSilver", "dependencyConditions": ["Succeeded"]}] },
    { "name": "RefreshDataset",  "type": "Notebook", "dependsOn": [{"activity": "BuildGold",       "dependencyConditions": ["Succeeded"]}] }
  ]
}
```

### Pattern: Self-Healing Pipeline with Reprocessing

```python
def get_failed_batches(spark, control_table="bronze_lakehouse.pipeline_log"):
    return spark.sql(f"""
        SELECT DISTINCT run_date
        FROM {control_table}
        WHERE status = 'FAILED'
          AND retry_count < 3
        ORDER BY run_date
    """).collect()

failed_batches = get_failed_batches(spark)
for row in failed_batches:
    try:
        bronze_to_silver_orders(spark, row.run_date)
        spark.sql(f"""
            UPDATE bronze_lakehouse.pipeline_log
            SET status = 'COMPLETED', completed_at = CURRENT_TIMESTAMP()
            WHERE run_date = '{row.run_date}'
        """)
    except Exception as e:
        spark.sql(f"""
            UPDATE bronze_lakehouse.pipeline_log
            SET retry_count = retry_count + 1, last_error = '{str(e)[:500]}'
            WHERE run_date = '{row.run_date}'
        """)
```

---

## Error Codes Table

| Error | Meaning | Remediation |
|-------|---------|-------------|
| `AnalysisException: Cannot write incompatible data` | Bronze data schema incompatible with silver Delta schema | Use `mergeSchema=true` or add explicit schema enforcement step |
| `ConcurrentAppendException` | Two jobs writing to same silver partition simultaneously | Use job scheduling to avoid overlapping runs; partition by ingestion_date |
| `DeltaMergeNotSupportedAnalysisException` | MERGE source columns don't match target | Align source DataFrame columns to target table schema before merge |
| `Great Expectations ValidationError` | Data quality check failed | Quarantine failing rows to `quarantine` table; alert and reprocess |
| `SparkException: Job aborted — task exceeded memory` | Silver transformation OOM on large partition | Repartition bronze data before transformation; reduce partition size |
| `AnalysisException: Resolved attribute missing from child` | Column referenced in merge condition not in source | Verify source DataFrame has all key columns before merge |
| `SchemaEvolutionException` | Bronze column types changed in incompatible way | Add type cast step; use `overwriteSchema` for breaking changes |

---

## Throttling / Limits Table

| Resource | Limit | Notes |
|----------|-------|-------|
| Delta MERGE on large tables | No hard limit; performance degrades >100M rows | Use partition-scoped merges with WHERE clauses |
| Great Expectations validation | All expectations evaluated on full DataFrame | Use sampling for non-critical quality checks on large datasets |
| CDF version range reads | Max versions retained by `delta.logRetentionDuration` | Avoid large version gaps; process incrementally each run |
| Concurrent Delta writes to same table | Serialized by Delta protocol; high concurrency causes retries | Partition writes to separate partitions for higher parallelism |
| Number of Delta table partitions | < 10,000 partitions practical limit | Use month or week granularity instead of daily for multi-year tables |

---

## Common Patterns and Gotchas

### Gotcha: Idempotency in Bronze

Bronze notebooks must be idempotent — running them twice for the same batch should not create duplicate records. Use the `_batch_id` column and a deduplication step, or use MERGE instead of append.

```python
# Non-idempotent (append causes duplicates on rerun)
df.write.format("delta").mode("append").saveAsTable("bronze_lakehouse.raw_orders")

# Idempotent (safe to rerun)
from delta.tables import DeltaTable
target = DeltaTable.forName(spark, "bronze_lakehouse.raw_orders")
target.alias("tgt").merge(
    df.alias("src"),
    "tgt.order_id = src.order_id AND tgt._batch_id = src._batch_id"
).whenNotMatchedInsertAll().execute()
```

### Gotcha: Null Propagation Across Layers

Nulls in bronze that are not handled in silver will propagate to gold, where they silently cause SUM() to skip rows. Always apply explicit null handling in silver transformation.

### Pattern: Quarantine Rows Failing Quality Checks

```python
# Separate good and bad rows
valid_df, quarantine_df = df.filter("total_amount > 0 AND quantity > 0"), \
                          df.filter("total_amount <= 0 OR quantity <= 0")

valid_df.write.format("delta").mode("append").saveAsTable("silver_lakehouse.cleaned_orders")
quarantine_df.withColumn("_quarantine_reason", F.lit("negative_amount_or_quantity")) \
             .write.format("delta").mode("append").saveAsTable("silver_lakehouse.quarantine_orders")
```
