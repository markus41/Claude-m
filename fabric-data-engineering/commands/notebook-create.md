---
name: notebook-create
description: "Create a Fabric Spark notebook with starter code for a given scenario"
argument-hint: "<scenario> --lakehouse <lakehouse-name> [--language <pyspark|sparksql|scala>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - AskUserQuestion
---

# Create a Fabric Spark Notebook

Generate a Spark notebook with starter code tailored to a specific data engineering scenario.

## Instructions

### 1. Validate Inputs

- `<scenario>` -- The notebook purpose. Common scenarios: `ingest-csv`, `ingest-api`, `transform-silver`, `aggregate-gold`, `scd2-merge`, `data-quality`, `schema-migration`. Ask if not provided.
- `--lakehouse` -- Target lakehouse to attach. Ask if not provided.
- `--language` -- Notebook language: `pyspark` (default), `sparksql`, or `scala`. Default is `pyspark`.

### 2. Generate Notebook Structure

Every notebook should follow this cell structure:

**Cell 1: Header and parameters** (markdown)
```markdown
# <Notebook Title>
- **Lakehouse**: <lakehouse-name>
- **Layer**: <bronze|silver|gold>
- **Schedule**: <daily|weekly|on-demand>
- **Author**: <user>
- **Created**: <date>
```

**Cell 2: Configuration** (code)
```python
# Notebook parameters (for pipeline parameterization)
source_path = ""  # Override via pipeline notebook activity parameters
target_table = ""
run_date = ""

# Spark configuration
spark.conf.set("spark.sql.shuffle.partitions", "auto")
spark.conf.set("spark.databricks.delta.optimizeWrite.enabled", "true")
spark.conf.set("spark.databricks.delta.autoCompact.enabled", "true")
```

**Cell 3-N: Scenario-specific code** (see below)

**Final Cell: Summary** (code)
```python
# Log completion
print(f"Notebook completed successfully")
print(f"Target table: {target_table}")
print(f"Rows written: {df.count()}")
```

### 3. Scenario Templates

**ingest-csv** -- Load CSV files from Files/ into a Delta table:
```python
from pyspark.sql.types import StructType, StructField, StringType, IntegerType, TimestampType

schema = StructType([
    StructField("id", StringType(), False),
    StructField("name", StringType(), True),
    StructField("value", IntegerType(), True),
    StructField("timestamp", TimestampType(), True)
])

df = spark.read.format("csv") \
    .option("header", "true") \
    .schema(schema) \
    .load(f"{source_path}/*.csv")

df.write.format("delta") \
    .mode("overwrite") \
    .saveAsTable(target_table)
```

**ingest-api** -- Fetch data from a REST API and load into Delta:
```python
import requests
import json
from pyspark.sql import Row

secret = mssparkutils.credentials.getSecret("https://<kv>.vault.azure.net/", "api-key")
response = requests.get("<api-url>", headers={"Authorization": f"Bearer {secret}"})
data = response.json()

df = spark.createDataFrame([Row(**item) for item in data["value"]])
df.write.format("delta").mode("overwrite").saveAsTable(target_table)
```

**transform-silver** -- Clean and conform bronze data to silver:
```python
from pyspark.sql.functions import col, trim, lower, current_timestamp, sha2, concat_ws

bronze_df = spark.read.table(f"lh_bronze_{domain}.{source_table}")

silver_df = bronze_df \
    .dropDuplicates(["id"]) \
    .withColumn("name", trim(col("name"))) \
    .withColumn("email", lower(col("email"))) \
    .withColumn("_hash", sha2(concat_ws("||", *[col(c) for c in bronze_df.columns]), 256)) \
    .withColumn("_ingested_at", current_timestamp()) \
    .filter(col("id").isNotNull())

silver_df.write.format("delta").mode("overwrite").saveAsTable(target_table)
```

**aggregate-gold** -- Build business-level aggregation for Power BI:
```python
from pyspark.sql.functions import sum, count, avg, col, date_trunc

silver_df = spark.read.table(f"lh_silver_{domain}.{source_table}")

gold_df = silver_df \
    .withColumn("month", date_trunc("month", col("order_date"))) \
    .groupBy("month", "region", "product_category") \
    .agg(
        sum("revenue").alias("total_revenue"),
        count("order_id").alias("order_count"),
        avg("order_value").alias("avg_order_value")
    )

gold_df.write.format("delta").mode("overwrite").saveAsTable(target_table)
```

**scd2-merge** -- Slowly Changing Dimension Type 2 merge:
```python
from delta.tables import DeltaTable
from pyspark.sql.functions import current_timestamp, lit

source_df = spark.read.table(f"lh_bronze_{domain}.{source_table}") \
    .withColumn("_valid_from", current_timestamp()) \
    .withColumn("_valid_to", lit(None).cast("timestamp")) \
    .withColumn("_is_current", lit(True))

if spark.catalog.tableExists(target_table):
    target = DeltaTable.forName(spark, target_table)
    target.alias("t").merge(
        source_df.alias("s"),
        "t.id = s.id AND t._is_current = true"
    ).whenMatchedUpdate(
        condition="t._hash != s._hash",
        set={"_is_current": "false", "_valid_to": "current_timestamp()"}
    ).whenNotMatchedInsertAll().execute()

    # Insert new current records for changed rows
    changed = source_df.alias("s").join(
        target.toDF().alias("t"),
        (col("s.id") == col("t.id")) & (col("t._is_current") == False) & (col("t._valid_to").isNotNull()),
        "inner"
    ).select("s.*")
    changed.write.format("delta").mode("append").saveAsTable(target_table)
else:
    source_df.write.format("delta").saveAsTable(target_table)
```

**data-quality** -- Run data quality checks:
```python
from pyspark.sql.functions import col, count, when, isnan, isnull

df = spark.read.table(target_table)
total = df.count()

checks = []
for c in df.columns:
    null_count = df.filter(isnull(col(c)) | (col(c) == "")).count()
    checks.append({"column": c, "null_count": null_count, "null_pct": round(null_count / total * 100, 2)})

quality_df = spark.createDataFrame(checks)
quality_df.show(truncate=False)

# Fail if critical columns have nulls
critical_columns = ["id", "name"]
for c in critical_columns:
    null_count = df.filter(isnull(col(c))).count()
    assert null_count == 0, f"Critical column '{c}' has {null_count} null values"
```

### 4. Save Notebook

Write the notebook as a `.py` file (Fabric notebook format) or as a JSON notebook definition for REST API upload:

```bash
curl -X POST "https://api.fabric.microsoft.com/v1/workspaces/$WORKSPACE_ID/notebooks" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"displayName": "<notebook-name>", "definition": {"format": "ipynb", "parts": [...]}}'
```

### 5. Display Summary

Show the user:
- Notebook name and attached lakehouse
- Cells created and their purpose
- How to run: Open in Fabric portal > Run All
- How to schedule: Attach to a pipeline with `/pipeline-create`
- How to parameterize: Use pipeline notebook activity parameters
