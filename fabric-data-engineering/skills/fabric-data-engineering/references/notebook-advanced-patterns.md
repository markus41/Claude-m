# Spark Notebook Advanced Patterns — Reference

## Overview

Advanced patterns for production Fabric Spark notebooks covering multi-notebook orchestration, session management, parameterized execution, streaming, testing, and performance profiling.

---

## Notebook Parameterization

### Pipeline Parameters

```python
# Cell 1: Parameters (tagged as parameter cell in Fabric)
# These values are overridden when notebook is called from a pipeline
source_path = "Files/landing/sales"
target_table = "bronze_sales"
run_date = "2026-03-18"
batch_id = ""
watermark_value = ""
environment = "prod"
```

### Dynamic Parameters with mssparkutils

```python
# Read parameters from pipeline or set defaults
from notebookutils import mssparkutils

run_date = mssparkutils.notebook.getContext().get("run_date", "")
if not run_date:
    run_date = spark.sql("SELECT current_date()").collect()[0][0].isoformat()

workspace_id = mssparkutils.env.getWorkspaceId()
lakehouse_id = mssparkutils.env.getLakehouseId()
```

### Key Vault Secret Access

```python
# Access secrets from Azure Key Vault
kv_url = "https://my-keyvault.vault.azure.net/"
api_key = mssparkutils.credentials.getSecret(kv_url, "api-key")
connection_string = mssparkutils.credentials.getSecret(kv_url, "sql-connection")

# Use in downstream connections
jdbc_url = f"jdbc:sqlserver://server.database.windows.net;database=mydb"
df = spark.read.format("jdbc") \
    .option("url", jdbc_url) \
    .option("dbtable", "schema.table") \
    .option("user", "reader") \
    .option("password", mssparkutils.credentials.getSecret(kv_url, "sql-password")) \
    .load()
```

---

## Multi-Notebook Orchestration

### Parent-Child Notebook Pattern

```python
# Parent orchestrator notebook
from notebookutils import mssparkutils

# Run child notebooks in sequence
result_bronze = mssparkutils.notebook.run(
    "nb_ingest_bronze",
    timeout_seconds=3600,
    arguments={
        "source_path": "Files/landing/sales",
        "target_table": "bronze_sales",
        "run_date": run_date
    }
)
print(f"Bronze result: {result_bronze}")

# Run silver transforms in parallel
handles = []
for domain in ["sales", "inventory", "customers"]:
    handle = mssparkutils.notebook.runNonBlocking(
        "nb_transform_silver",
        timeout_seconds=3600,
        arguments={
            "source_table": f"bronze_{domain}",
            "target_table": f"silver_{domain}",
            "run_date": run_date
        }
    )
    handles.append((domain, handle))

# Wait for all parallel notebooks to complete
for domain, handle in handles:
    result = mssparkutils.notebook.getStatus(handle)
    print(f"Silver {domain}: {result}")
```

### Cross-Workspace Notebook Execution

```python
# Run notebook in another workspace
mssparkutils.notebook.run(
    "nb_shared_utility",
    timeout_seconds=1800,
    arguments={"param1": "value1"},
    workspace_id="<target-workspace-id>"
)
```

### Notebook Exit Values

```python
# Child notebook: return structured result
import json

rows_written = df.count()
quality_score = 0.98

mssparkutils.notebook.exit(json.dumps({
    "rows_written": rows_written,
    "quality_score": quality_score,
    "status": "success",
    "target_table": target_table
}))
```

```python
# Parent notebook: parse child result
import json

result = mssparkutils.notebook.run("nb_child", 3600, {"param": "value"})
result_data = json.loads(result)
print(f"Child wrote {result_data['rows_written']} rows with quality {result_data['quality_score']}")

if result_data["quality_score"] < 0.95:
    raise Exception(f"Data quality below threshold: {result_data['quality_score']}")
```

---

## Structured Streaming

### Stream from Event Hub to Lakehouse

```python
from pyspark.sql.functions import from_json, col, current_timestamp
from pyspark.sql.types import StructType, StructField, StringType, DoubleType, TimestampType

# Define event schema
event_schema = StructType([
    StructField("deviceId", StringType()),
    StructField("temperature", DoubleType()),
    StructField("humidity", DoubleType()),
    StructField("eventTime", TimestampType())
])

# Read from Event Hub
eh_connection = mssparkutils.credentials.getSecret("https://kv.vault.azure.net/", "eh-connection")

stream_df = spark.readStream \
    .format("eventhubs") \
    .option("eventhubs.connectionString", sc._jvm.org.apache.spark.eventhubs.EventHubsUtils.encrypt(eh_connection)) \
    .option("eventhubs.consumerGroup", "$Default") \
    .option("eventhubs.startingPosition", '{"offset": "-1", "isInclusive": true}') \
    .load()

# Parse and transform
parsed_df = stream_df \
    .withColumn("body", col("body").cast("string")) \
    .withColumn("parsed", from_json(col("body"), event_schema)) \
    .select(
        col("parsed.deviceId").alias("device_id"),
        col("parsed.temperature"),
        col("parsed.humidity"),
        col("parsed.eventTime").alias("event_time"),
        col("enqueuedTime").alias("enqueued_time"),
        current_timestamp().alias("_ingested_at")
    )

# Write to Delta table with checkpointing
query = parsed_df.writeStream \
    .format("delta") \
    .outputMode("append") \
    .option("checkpointLocation", "Files/_checkpoints/iot_events") \
    .option("mergeSchema", "true") \
    .trigger(processingTime="30 seconds") \
    .toTable("bronze_iot_events")
```

### Stream with Watermark and Aggregation

```python
# Windowed aggregation with late data handling
from pyspark.sql.functions import window, avg, max as spark_max, count

agg_df = parsed_df \
    .withWatermark("event_time", "10 minutes") \
    .groupBy(
        window("event_time", "5 minutes"),
        "device_id"
    ) \
    .agg(
        avg("temperature").alias("avg_temperature"),
        spark_max("temperature").alias("max_temperature"),
        avg("humidity").alias("avg_humidity"),
        count("*").alias("event_count")
    )

query = agg_df.writeStream \
    .format("delta") \
    .outputMode("append") \
    .option("checkpointLocation", "Files/_checkpoints/iot_aggregates") \
    .trigger(processingTime="1 minute") \
    .toTable("silver_iot_aggregates")
```

---

## Advanced Delta Lake Operations

### Schema Evolution

```python
# Enable automatic schema evolution
spark.conf.set("spark.databricks.delta.schema.autoMerge.enabled", "true")

# Write with schema merge
df_with_new_columns.write \
    .format("delta") \
    .mode("append") \
    .option("mergeSchema", "true") \
    .saveAsTable("silver_customers")

# Explicit schema change
from delta.tables import DeltaTable

dt = DeltaTable.forName(spark, "silver_customers")
spark.sql("ALTER TABLE silver_customers ADD COLUMNS (loyalty_tier STRING AFTER email)")
```

### Change Data Feed (CDF)

```python
# Enable CDF on table
spark.sql("ALTER TABLE silver_customers SET TBLPROPERTIES (delta.enableChangeDataFeed = true)")

# Read changes since version
changes_df = spark.read \
    .format("delta") \
    .option("readChangeFeed", "true") \
    .option("startingVersion", 5) \
    .table("silver_customers")

# Changes include _change_type: insert, update_preimage, update_postimage, delete
changes_df.filter(col("_change_type") == "update_postimage").show()

# Stream changes
change_stream = spark.readStream \
    .format("delta") \
    .option("readChangeFeed", "true") \
    .option("startingVersion", "latest") \
    .table("silver_customers")
```

### Time Travel

```python
# Read specific version
df_v5 = spark.read.format("delta").option("versionAsOf", 5).table("silver_customers")

# Read at specific timestamp
df_yesterday = spark.read.format("delta") \
    .option("timestampAsOf", "2026-03-17T00:00:00Z") \
    .table("silver_customers")

# Restore to previous version
spark.sql("RESTORE TABLE silver_customers TO VERSION AS OF 5")

# View table history
spark.sql("DESCRIBE HISTORY silver_customers").show(truncate=False)
```

---

## Data Quality Framework

### Great Expectations Integration

```python
import great_expectations as gx

context = gx.get_context()

# Create expectation suite
suite = context.add_expectation_suite("silver_customers_quality")

# Define expectations
suite.add_expectation(gx.expectations.ExpectColumnValuesToNotBeNull(column="customer_id"))
suite.add_expectation(gx.expectations.ExpectColumnValuesToBeUnique(column="customer_id"))
suite.add_expectation(gx.expectations.ExpectColumnValuesToMatchRegex(column="email", regex=r".+@.+\..+"))
suite.add_expectation(gx.expectations.ExpectColumnValuesToBeBetween(column="age", min_value=0, max_value=150))
suite.add_expectation(gx.expectations.ExpectTableRowCountToBeBetween(min_value=1000))

# Validate
validator = context.get_validator(batch_request=batch_request, expectation_suite=suite)
results = validator.validate()

if not results.success:
    failed = [r for r in results.results if not r.success]
    raise Exception(f"Data quality check failed: {len(failed)} expectations failed")
```

### Custom Quality Checks with Quarantine

```python
from pyspark.sql.functions import col, when, lit, current_timestamp

def quality_gate(df, rules, quarantine_table):
    """Apply quality rules and quarantine bad records."""
    quality_col = lit(True)
    quality_reasons = lit("")

    for rule_name, condition in rules.items():
        quality_col = quality_col & condition
        quality_reasons = when(
            ~condition,
            concat(quality_reasons, lit(f"{rule_name}; "))
        ).otherwise(quality_reasons)

    df_tagged = df \
        .withColumn("_quality_pass", quality_col) \
        .withColumn("_quality_reasons", quality_reasons) \
        .withColumn("_quality_checked_at", current_timestamp())

    # Good records
    good_df = df_tagged.filter(col("_quality_pass")).drop("_quality_pass", "_quality_reasons", "_quality_checked_at")

    # Quarantined records
    bad_df = df_tagged.filter(~col("_quality_pass"))
    if bad_df.count() > 0:
        bad_df.write.format("delta").mode("append").saveAsTable(quarantine_table)
        print(f"Quarantined {bad_df.count()} records to {quarantine_table}")

    return good_df

# Usage
rules = {
    "id_not_null": col("customer_id").isNotNull(),
    "email_valid": col("email").rlike(r".+@.+\..+"),
    "age_range": col("age").between(0, 150),
    "name_not_empty": col("name") != "",
}

clean_df = quality_gate(raw_df, rules, "quarantine_customers")
```

---

## Performance Profiling

### Session Configuration

```python
# Fabric Spark pool sizing
# Small: 4 vCores, 28 GB — dev/test, < 10 GB data
# Medium: 8 vCores, 56 GB — standard workloads, 10-100 GB
# Large: 16 vCores, 112 GB — large transforms, 100 GB-1 TB
# XLarge: 32 vCores, 224 GB — heavy aggregations, > 1 TB

# Optimal settings for most workloads
spark.conf.set("spark.sql.shuffle.partitions", "auto")
spark.conf.set("spark.sql.adaptive.enabled", "true")
spark.conf.set("spark.sql.adaptive.coalescePartitions.enabled", "true")
spark.conf.set("spark.sql.adaptive.skewJoin.enabled", "true")
spark.conf.set("spark.databricks.delta.optimizeWrite.enabled", "true")
spark.conf.set("spark.databricks.delta.autoCompact.enabled", "true")

# V-Order for Power BI Direct Lake
spark.conf.set("spark.sql.parquet.vorder.enabled", "true")
```

### Execution Plan Analysis

```python
# View logical and physical plan
df.explain(mode="extended")

# Check for data skew
df.groupBy(spark_partition_id()).count().orderBy(col("count").desc()).show()

# Monitor stage metrics
spark.sparkContext.setJobGroup("etl_job", "Silver transform")
# ... run transforms ...
# Check Spark UI at the session monitoring URL
```

---

## Notebook Testing Patterns

### Unit Testing with pytest

```python
# test_transforms.py — run via spark-submit or notebook cell
import pytest
from pyspark.sql import SparkSession
from transforms import clean_customer_data

@pytest.fixture(scope="session")
def spark():
    return SparkSession.builder.master("local[2]").getOrCreate()

def test_clean_customer_data_removes_nulls(spark):
    input_df = spark.createDataFrame([
        (1, "Alice", "alice@example.com"),
        (None, "Bob", "bob@example.com"),
        (3, None, "charlie@example.com"),
    ], ["id", "name", "email"])

    result = clean_customer_data(input_df)
    assert result.count() == 1
    assert result.collect()[0]["name"] == "Alice"

def test_clean_customer_data_normalizes_email(spark):
    input_df = spark.createDataFrame([
        (1, "Alice", "ALICE@Example.COM"),
    ], ["id", "name", "email"])

    result = clean_customer_data(input_df)
    assert result.collect()[0]["email"] == "alice@example.com"
```

### Integration Testing with Sample Data

```python
# Create test fixtures in a dedicated lakehouse
test_lakehouse = "lh_test_fixtures"

def setup_test_data():
    """Create known test datasets."""
    customers = spark.createDataFrame([
        (1, "Alice", "alice@test.com", 30),
        (2, "Bob", "bob@test.com", 25),
        (3, "Charlie", "charlie@test.com", 35),
    ], ["id", "name", "email", "age"])
    customers.write.format("delta").mode("overwrite").saveAsTable(f"{test_lakehouse}.test_customers")

def teardown_test_data():
    """Clean up test datasets."""
    spark.sql(f"DROP TABLE IF EXISTS {test_lakehouse}.test_customers")
```

---

## Notebook Logging

```python
import logging
from datetime import datetime

# Configure logging for notebook
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
logger = logging.getLogger("notebook")

class NotebookLogger:
    """Structured logging for notebook execution tracking."""

    def __init__(self, notebook_name, run_id=None):
        self.notebook_name = notebook_name
        self.run_id = run_id or datetime.now().strftime("%Y%m%d_%H%M%S")
        self.metrics = {}

    def log_step(self, step, message, **kwargs):
        logger.info(f"[{self.notebook_name}][{self.run_id}][{step}] {message}", extra=kwargs)

    def log_metric(self, name, value):
        self.metrics[name] = value
        logger.info(f"[{self.notebook_name}][{self.run_id}][METRIC] {name}={value}")

    def log_completion(self):
        logger.info(f"[{self.notebook_name}][{self.run_id}][COMPLETE] metrics={self.metrics}")

# Usage
nb_log = NotebookLogger("nb_transform_silver")
nb_log.log_step("read", f"Reading from {source_table}")
nb_log.log_metric("input_rows", source_df.count())
# ... transform ...
nb_log.log_metric("output_rows", result_df.count())
nb_log.log_completion()
```
