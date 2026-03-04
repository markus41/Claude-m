---
name: Fabric Data Engineering
description: >
  Deep expertise in Microsoft Fabric Data Engineering — create and manage lakehouses with OneLake,
  author PySpark and SparkSQL notebooks, build Delta Lake tables with ACID transactions and time travel,
  design data pipelines with Copy/Notebook/Dataflow activities, implement medallion architecture
  (bronze/silver/gold), and optimize Spark workloads for performance. Targets professional data engineers
  building production Fabric analytics solutions.
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
triggers:
  - fabric data engineering
  - lakehouse
  - spark notebook
  - fabric notebook
  - delta lake
  - fabric pipeline
  - pyspark fabric
  - lakehouse sql
  - fabric spark
  - data pipeline fabric
  - delta table
  - medallion architecture
---

# Fabric Data Engineering

## 1. Fabric Data Engineering Overview

Microsoft Fabric is a unified analytics platform that brings together data engineering, data science, real-time analytics, and business intelligence into a single SaaS experience. The **Data Engineering** persona focuses on building lakehouses, authoring Spark notebooks, managing Delta Lake tables, and orchestrating data pipelines.

**Core concepts**:
| Concept | Description |
|---------|-------------|
| OneLake | Single-copy data lake for the entire organization — ADLS Gen2 under the hood |
| Lakehouse | Combines the best of data lakes (schema-on-read, file flexibility) with data warehouses (SQL, ACID) |
| Delta Lake | Default table format — Parquet files + transaction log providing ACID, time travel, schema evolution |
| Spark | Apache Spark runtime for distributed data processing (PySpark, SparkSQL, Scala, R) |
| Data Pipeline | Orchestration engine (based on Azure Data Factory) for scheduling and chaining activities |
| SQL Analytics Endpoint | Auto-generated read-only T-SQL endpoint for every lakehouse |

**Fabric capacity model**:
| SKU | CUs | Spark vCores | Use Case |
|-----|-----|-------------|----------|
| F2 | 2 | 8 | Dev/test, small workloads |
| F4 | 4 | 16 | Small team, moderate workloads |
| F8 | 8 | 32 | Departmental analytics |
| F16 | 16 | 64 | Large team, multiple workloads |
| F32 | 32 | 128 | Enterprise, heavy Spark processing |
| F64+ | 64+ | 256+ | Large enterprise, concurrent workloads |

**Workspace roles**:
| Role | Permissions |
|------|------------|
| Admin | Full control — manage settings, members, and all items |
| Member | Create, edit, delete items; share items; cannot manage workspace settings |
| Contributor | Create and edit items; cannot delete others' items or manage settings |
| Viewer | Read-only access to items and SQL analytics endpoint |

**Relationship to OneLake**: Every Fabric tenant has one OneLake. Every workspace maps to a folder in OneLake. Every lakehouse maps to a subfolder. Data is stored once and accessed by all Fabric engines (Spark, SQL, Power BI, KQL) without duplication. The ADLS Gen2 endpoint is: `abfss://<workspace-name>@onelake.dfs.fabric.microsoft.com/<item-name>.<item-type>`.

## 2. Lakehouses

A Fabric lakehouse is a unified analytics store that combines unstructured files with managed Delta tables, automatically exposing a read-only SQL analytics endpoint.

### Create a Lakehouse

**Via Fabric portal**: Workspace > New > Lakehouse > Enter name.

**Via REST API**:
```bash
POST https://api.fabric.microsoft.com/v1/workspaces/{workspaceId}/lakehouses
Content-Type: application/json
Authorization: Bearer {token}

{
  "displayName": "lh_bronze_sales"
}
```

**Response** includes the lakehouse `id`, `displayName`, and properties including SQL connection string.

### Folder Structure

Every lakehouse has two top-level sections:

```
<lakehouse-name>.Lakehouse/
├── Tables/           # Managed Delta Lake tables (appear in SQL endpoint)
│   ├── customers/    # Delta table (Parquet files + _delta_log/)
│   ├── orders/
│   └── products/
└── Files/            # Unstructured/raw files (not in SQL endpoint)
    ├── landing/      # Raw ingested files (CSV, JSON, Parquet, Excel)
    ├── archive/      # Processed files moved after ingestion
    └── _errors/      # Files that failed processing
```

- **Tables/**: Only managed Delta tables. These automatically appear in the SQL analytics endpoint. Created via `spark.write.saveAsTable()` or `CREATE TABLE`.
- **Files/**: Raw data, staging files, exports. Accessed via `spark.read.load("Files/...")` or OneLake ADLS Gen2 path. NOT visible in the SQL endpoint.

### SQL Analytics Endpoint

Every lakehouse auto-generates a read-only T-SQL endpoint:
- **Connection string**: Found in lakehouse settings > SQL analytics endpoint.
- **Supported queries**: SELECT, views, table-valued functions. No INSERT/UPDATE/DELETE.
- **Use cases**: Power BI DirectQuery/Import, SSMS exploration, cross-lakehouse queries.
- **Cross-database queries**: Reference other lakehouses in the same workspace with three-part naming: `SELECT * FROM [other_lakehouse].[dbo].[table_name]`.

### Table Maintenance

Delta tables accumulate small files over time and require periodic maintenance:

```sql
-- Compact small files into larger ones (target ~128 MB per file)
OPTIMIZE lakehouse_name.table_name;

-- Remove old file versions (default retention: 7 days)
VACUUM lakehouse_name.table_name;

-- Cluster data by frequently filtered columns
OPTIMIZE lakehouse_name.table_name ZORDER BY (customer_id, order_date);

-- Check table health
DESCRIBE DETAIL lakehouse_name.table_name;
-- Look at: numFiles (should be reasonable), sizeInBytes, numPartitions
```

**Recommended maintenance schedule**:
| Operation | Frequency | When |
|-----------|-----------|------|
| OPTIMIZE | Weekly or after large writes | After batch ingestion completes |
| VACUUM | Weekly | After OPTIMIZE, during low-usage window |
| Z-ORDER | Weekly | Combined with OPTIMIZE |
| DESCRIBE DETAIL | On-demand | When investigating query performance |

### Lakehouse Explorer

The lakehouse explorer in the Fabric portal provides:
- **Table preview**: View schema, sample data, and statistics for any Delta table.
- **File browser**: Navigate the Files/ section, upload/download files.
- **SQL editor**: Run T-SQL queries against the SQL analytics endpoint.
- **Table maintenance**: Run OPTIMIZE and VACUUM from the UI.

## 3. Spark Notebooks

Fabric Spark notebooks are interactive development environments for PySpark, SparkSQL, Scala, and R. They run on managed Spark clusters within the Fabric capacity.

### Notebook Structure

A Fabric notebook consists of cells, each with a language and execution order:

```
Cell 1 [markdown]  - Title, description, parameters documentation
Cell 2 [pyspark]   - Configuration and parameters
Cell 3 [pyspark]   - Read source data
Cell 4 [pyspark]   - Transform
Cell 5 [sparksql]  - Validate with SQL query
Cell 6 [pyspark]   - Write to target
Cell 7 [pyspark]   - Log completion
```

**Language magics** (switch language within a notebook):
| Magic | Language |
|-------|---------|
| `%%pyspark` | PySpark (default) |
| `%%sql` | SparkSQL |
| `%%scala` | Scala |
| `%%r` | R (SparkR) |

### PySpark DataFrame Operations

**Reading data**:
```python
# Read a Delta table
df = spark.read.table("lakehouse_name.table_name")

# Read from the Files section
df = spark.read.format("csv").option("header", "true").load("Files/landing/*.csv")
df = spark.read.format("parquet").load("Files/staging/data.parquet")
df = spark.read.format("json").option("multiLine", "true").load("Files/landing/data.json")

# Read from OneLake path
df = spark.read.format("delta").load("abfss://workspace@onelake.dfs.fabric.microsoft.com/lakehouse.Lakehouse/Tables/table_name")

# Read from a shortcut
df = spark.read.table("shortcut_table_name")
```

**Transformations**:
```python
from pyspark.sql.functions import col, when, lit, trim, lower, upper, concat, date_format, current_timestamp
from pyspark.sql.functions import sum, count, avg, min, max, row_number, dense_rank
from pyspark.sql.window import Window

# Column operations
df = df.select("id", "name", "amount")
df = df.withColumn("amount_usd", col("amount") * col("exchange_rate"))
df = df.withColumnRenamed("old_name", "new_name")
df = df.drop("unwanted_column")

# Filtering
df = df.filter(col("status") == "active")
df = df.filter(col("amount").between(100, 1000))
df = df.filter(col("name").isNotNull())

# Aggregation
summary = df.groupBy("region", "category") \
    .agg(
        sum("amount").alias("total_amount"),
        count("id").alias("record_count"),
        avg("amount").alias("avg_amount")
    )

# Joins
result = orders.join(customers, orders.customer_id == customers.id, "left")
result = orders.join(broadcast(lookup_table), "status_code", "inner")  # Broadcast small tables

# Window functions
window = Window.partitionBy("customer_id").orderBy(col("order_date").desc())
df = df.withColumn("row_num", row_number().over(window))
df = df.withColumn("rank", dense_rank().over(window))

# Deduplication
df = df.dropDuplicates(["id"])
# or keep latest by date
df = df.withColumn("rn", row_number().over(
    Window.partitionBy("id").orderBy(col("updated_at").desc())
)).filter(col("rn") == 1).drop("rn")
```

**Writing data**:
```python
# Write as managed Delta table
df.write.format("delta").mode("overwrite").saveAsTable("table_name")

# Write with partitioning
df.write.format("delta").mode("overwrite").partitionBy("year", "month").saveAsTable("table_name")

# Append
df.write.format("delta").mode("append").saveAsTable("table_name")

# Write to Files section (non-Delta)
df.write.format("parquet").mode("overwrite").save("Files/staging/output.parquet")
df.write.format("csv").option("header", "true").mode("overwrite").save("Files/exports/output.csv")
```

### SparkSQL Magic

Use `%%sql` cells for SQL queries that leverage Spark SQL:

```sql
%%sql
-- Query Delta tables directly
SELECT customer_id, SUM(amount) as total
FROM lh_silver_sales.orders
WHERE order_date >= '2024-01-01'
GROUP BY customer_id
ORDER BY total DESC
LIMIT 100;

-- Create a temp view from a previous DataFrame
-- (run in a PySpark cell first: df.createOrReplaceTempView("my_view"))
SELECT * FROM my_view WHERE status = 'active';

-- CTAS (Create Table As Select)
CREATE OR REPLACE TABLE lh_gold_sales.customer_summary AS
SELECT customer_id, COUNT(*) as order_count, SUM(amount) as lifetime_value
FROM lh_silver_sales.orders
GROUP BY customer_id;
```

### Notebook Parameters and Scheduling

Notebooks can receive parameters when called from pipelines:

```python
# Define parameters at the top of the notebook
# These are overridden by pipeline Notebook Activity parameters
source_table = "raw_orders"       # type: string
target_table = "clean_orders"     # type: string
run_date = "2024-01-15"           # type: string
batch_size = 10000                # type: int
```

**Pipeline integration**: When a pipeline Notebook Activity calls this notebook, it passes parameter values that override the defaults. The parameter cell must be tagged as a "Parameters" cell in the notebook UI.

### mssparkutils

`mssparkutils` is a built-in utility library available in all Fabric notebooks:

**File system operations** (`mssparkutils.fs`):
```python
# List files
files = mssparkutils.fs.ls("Files/landing/")
for f in files:
    print(f.name, f.size, f.isDir)

# Copy files
mssparkutils.fs.cp("Files/landing/data.csv", "Files/archive/data.csv")

# Move files
mssparkutils.fs.mv("Files/landing/data.csv", "Files/archive/data.csv")

# Delete files
mssparkutils.fs.rm("Files/archive/old_data.csv")

# Create directory
mssparkutils.fs.mkdirs("Files/staging/temp/")
```

**Credentials** (`mssparkutils.credentials`):
```python
# Get secret from Azure Key Vault
secret = mssparkutils.credentials.getSecret("https://myvault.vault.azure.net/", "secret-name")

# Get access token for an Azure service
token = mssparkutils.credentials.getToken("https://graph.microsoft.com")
token = mssparkutils.credentials.getToken("https://database.windows.net")
token = mssparkutils.credentials.getToken("https://storage.azure.com")
```

**Notebook orchestration** (`mssparkutils.notebook`):
```python
# Run another notebook (synchronous)
result = mssparkutils.notebook.run("child_notebook", timeout_seconds=600, arguments={"param1": "value1"})

# Run multiple notebooks in parallel
mssparkutils.notebook.runMultiple([
    {"name": "notebook_a", "timeoutPerCellInSeconds": 300, "args": {"param1": "val1"}},
    {"name": "notebook_b", "timeoutPerCellInSeconds": 300, "args": {"param1": "val2"}}
])

# Exit notebook with a value (returned to pipeline or parent notebook)
mssparkutils.notebook.exit("success")
```

### Session Configuration

Configure Spark behavior at the notebook level:

```python
# Shuffle partitions (auto-tune in Fabric)
spark.conf.set("spark.sql.shuffle.partitions", "auto")

# Delta write optimization
spark.conf.set("spark.databricks.delta.optimizeWrite.enabled", "true")
spark.conf.set("spark.databricks.delta.autoCompact.enabled", "true")

# V-Order optimization (Fabric-specific, optimizes for Power BI)
spark.conf.set("spark.sql.parquet.vorder.enabled", "true")

# Adaptive query execution
spark.conf.set("spark.sql.adaptive.enabled", "true")
spark.conf.set("spark.sql.adaptive.coalescePartitions.enabled", "true")

# Memory and overhead
spark.conf.set("spark.driver.memory", "8g")
spark.conf.set("spark.executor.memory", "16g")
```

## 4. Delta Lake Tables

Delta Lake is the default and required table format in Fabric lakehouses. It stores data as Parquet files with a JSON transaction log (`_delta_log/`) that provides ACID transactions, time travel, schema evolution, and audit history.

### Delta Format Features

| Feature | Description |
|---------|-------------|
| ACID transactions | Serializable isolation — concurrent readers and writers are safely handled |
| Time travel | Query any previous version by version number or timestamp |
| Schema enforcement | Reject writes that do not match the table schema |
| Schema evolution | Safely add/rename/drop columns with merge or alter |
| Audit history | Full history of all operations (INSERT, UPDATE, DELETE, MERGE, OPTIMIZE) |
| Unified batch + streaming | Same table supports both batch reads/writes and structured streaming |

### CREATE TABLE

```sql
-- Managed table (stored in Tables/ of the lakehouse)
CREATE TABLE IF NOT EXISTS customers (
    customer_id STRING NOT NULL,
    first_name STRING,
    last_name STRING,
    email STRING,
    segment STRING,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    _ingested_at TIMESTAMP DEFAULT current_timestamp()
)
USING DELTA
COMMENT 'Customer master data from CRM system'
TBLPROPERTIES (
    'delta.autoOptimize.optimizeWrite' = 'true',
    'delta.autoOptimize.autoCompact' = 'true'
);

-- Partitioned table
CREATE TABLE IF NOT EXISTS orders (
    order_id STRING NOT NULL,
    customer_id STRING NOT NULL,
    order_date DATE,
    amount DECIMAL(18,2),
    status STRING,
    year_month STRING GENERATED ALWAYS AS (date_format(order_date, 'yyyy-MM'))
)
USING DELTA
PARTITIONED BY (year_month)
TBLPROPERTIES (
    'delta.autoOptimize.optimizeWrite' = 'true'
);

-- Table with liquid clustering (alternative to partitioning + Z-ORDER)
CREATE TABLE IF NOT EXISTS events (
    event_id STRING NOT NULL,
    user_id STRING NOT NULL,
    event_type STRING,
    event_timestamp TIMESTAMP,
    properties MAP<STRING, STRING>
)
USING DELTA
CLUSTER BY (user_id, event_type);
```

### MERGE INTO (Upsert)

```sql
MERGE INTO silver.customers AS target
USING bronze.raw_customers AS source
ON target.customer_id = source.customer_id
WHEN MATCHED AND target._hash != source._hash THEN
    UPDATE SET
        target.first_name = source.first_name,
        target.last_name = source.last_name,
        target.email = source.email,
        target.segment = source.segment,
        target.updated_at = current_timestamp()
WHEN NOT MATCHED THEN
    INSERT (customer_id, first_name, last_name, email, segment, created_at, updated_at)
    VALUES (source.customer_id, source.first_name, source.last_name, source.email, source.segment, current_timestamp(), current_timestamp())
WHEN NOT MATCHED BY SOURCE AND target.is_active = true THEN
    UPDATE SET target.is_active = false, target.updated_at = current_timestamp();
```

**PySpark MERGE**:
```python
from delta.tables import DeltaTable

target = DeltaTable.forName(spark, "silver.customers")
target.alias("t").merge(
    source_df.alias("s"),
    "t.customer_id = s.customer_id"
).whenMatchedUpdate(
    condition="t._hash != s._hash",
    set={
        "first_name": "s.first_name",
        "last_name": "s.last_name",
        "email": "s.email",
        "updated_at": "current_timestamp()"
    }
).whenNotMatchedInsertAll() \
 .execute()
```

### UPDATE and DELETE

```sql
-- Update specific rows
UPDATE silver.customers
SET segment = 'premium', updated_at = current_timestamp()
WHERE lifetime_value > 10000;

-- Delete rows
DELETE FROM silver.customers
WHERE is_active = false AND updated_at < dateadd(YEAR, -2, current_timestamp());
```

### Schema Enforcement vs Evolution

**Schema enforcement** (default): Any write that adds, removes, or changes column types is rejected.

```python
# This FAILS if df has columns not in the table schema
df.write.format("delta").mode("append").saveAsTable("customers")
# AnalysisException: A schema mismatch detected when writing to the Delta table.
```

**Schema evolution**: Explicitly allow schema changes:

```python
# Merge schema (add new columns from source)
df.write.format("delta").mode("append").option("mergeSchema", "true").saveAsTable("customers")

# Overwrite schema entirely (replace with new schema)
df.write.format("delta").mode("overwrite").option("overwriteSchema", "true").saveAsTable("customers")
```

**Best practices**:
- Bronze layer: `mergeSchema = true` (accept whatever the source sends).
- Silver layer: Enforce schema by default; use `mergeSchema` only in planned migration notebooks.
- Gold layer: Strict schema enforcement always.

### Partitioning Strategy

| Scenario | Strategy |
|----------|----------|
| Table < 1 GB | No partitioning needed |
| Time-series data queried by date range | Partition by `year_month` or `year` |
| Multi-tenant data filtered by tenant | Partition by `tenant_id` (if < 10,000 tenants) |
| High-cardinality filter column | Use Z-ORDER or liquid clustering instead of partitioning |
| Multiple filter patterns | Liquid clustering (up to 4 columns) |

**Anti-patterns to avoid**:
- Partitioning by high-cardinality columns (>10,000 values) creates too many small files.
- Partitioning by columns not used in WHERE clauses adds overhead with no benefit.
- Nested partitioning with more than 2 levels (e.g., `year/month/day`) often creates excessive directories.

### Liquid Clustering

Liquid clustering is a newer alternative to partitioning + Z-ORDER that dynamically reorganizes data:

```sql
-- Create a table with liquid clustering
CREATE TABLE events CLUSTER BY (user_id, event_date) ...;

-- Change clustering columns without rewriting data
ALTER TABLE events CLUSTER BY (event_type, event_date);

-- Remove clustering
ALTER TABLE events CLUSTER BY NONE;

-- Trigger clustering (happens automatically during writes with autoCompact)
OPTIMIZE events;
```

**Advantages over partitioning + Z-ORDER**:
- No need to choose partition columns upfront.
- Clustering columns can be changed without full table rewrite.
- Works well with high-cardinality columns.
- Incremental clustering (only reorganizes new data during OPTIMIZE).

### V-Order Optimization

V-Order is a Fabric-specific write-time optimization that reorders Parquet row groups for faster reads by Power BI and SQL endpoints:

```python
# Enable V-Order (recommended for Gold-layer tables consumed by Power BI)
spark.conf.set("spark.sql.parquet.vorder.enabled", "true")

df.write.format("delta").mode("overwrite").saveAsTable("gold.sales_summary")
```

V-Order adds minimal write overhead (~5%) but can improve Power BI DirectQuery scan performance by 2-10x.

## 5. Data Pipelines

Fabric data pipelines orchestrate data movement and transformation. They are built on the same engine as Azure Data Factory with Fabric-specific activities.

### Pipeline Activities

| Activity | Purpose | Use When |
|----------|---------|----------|
| Copy | Move data between sources and sinks | Ingesting from external databases, files, APIs |
| Notebook | Run a Spark notebook | Complex transformations, PySpark processing |
| Dataflow Gen2 | Visual Power Query transformations | Simple transforms by citizen developers |
| ForEach | Loop over an array of items | Processing multiple files, tables, or partitions |
| If Condition | Branch based on expression | Conditional logic (skip weekends, check row counts) |
| Wait | Pause execution | Rate limiting, waiting for external processes |
| Web | Call an HTTP endpoint | Trigger external APIs, send notifications |
| Set Variable | Assign a value to a pipeline variable | Store intermediate results for later activities |
| Lookup | Read first row or all rows from a source | Get watermark values, configuration tables |
| Stored Procedure | Execute a SQL stored procedure | Post-processing in SQL analytics endpoint |
| Script | Run inline SQL or Spark SQL | Quick SQL operations without a full notebook |
| Delete | Remove files from a lakehouse or storage | Clean up staging files after processing |
| Get Metadata | Retrieve metadata about a dataset | Check if files exist, get file counts, last modified date |

### Parameters and Expressions

**Pipeline parameters** (set at pipeline level, passed at trigger time):
```json
{
  "parameters": {
    "environment": { "type": "string", "defaultValue": "prod" },
    "run_date": { "type": "string", "defaultValue": "" },
    "source_path": { "type": "string", "defaultValue": "Files/landing" }
  }
}
```

**System variables**:
| Expression | Returns |
|------------|---------|
| `@pipeline().Pipeline` | Pipeline name |
| `@pipeline().RunId` | Current run GUID |
| `@pipeline().TriggerTime` | Trigger timestamp |
| `@pipeline().parameters.run_date` | Parameter value |

**Expression functions**:
```
@utcNow()                                    # Current UTC datetime
@utcNow('yyyy-MM-dd')                        # Formatted date string
@addDays(utcNow(), -7)                       # 7 days ago
@concat('prefix_', pipeline().parameters.env) # String concatenation
@if(equals(pipeline().parameters.env, 'prod'), 'lh_prod', 'lh_dev')  # Conditional
@activity('Copy_Data').output.rowsCopied      # Output from previous activity
@activity('Lookup_Watermark').output.firstRow.last_value  # Lookup result
```

### Triggers

**Schedule trigger** (cron-based recurring):
```json
{
  "type": "ScheduleTrigger",
  "typeProperties": {
    "recurrence": {
      "frequency": "Day",
      "interval": 1,
      "startTime": "2024-01-01T06:00:00Z",
      "timeZone": "UTC",
      "schedule": {
        "hours": [6],
        "minutes": [0]
      }
    }
  }
}
```

**Tumbling window trigger** (fixed intervals with backfill support):
```json
{
  "type": "TumblingWindowTrigger",
  "typeProperties": {
    "frequency": "Hour",
    "interval": 1,
    "startTime": "2024-01-01T00:00:00Z",
    "delay": "00:05:00",
    "maxConcurrency": 1,
    "retryPolicy": { "count": 3, "intervalInSeconds": 300 }
  }
}
```

**Event trigger** (fires when files arrive in OneLake):
- Supported event: Blob created in a lakehouse Files/ path.
- Use for real-time ingestion: file lands in `Files/landing/` -> trigger fires -> pipeline processes file.

### Pipeline JSON Structure via REST API

```bash
# Create a pipeline
POST https://api.fabric.microsoft.com/v1/workspaces/{workspaceId}/dataPipelines
Content-Type: application/json
Authorization: Bearer {token}

{
  "displayName": "pl_ingest_sales_daily",
  "definition": {
    "parts": [
      {
        "path": "pipeline-content.json",
        "payload": "<base64-encoded pipeline JSON>",
        "payloadType": "InlineBase64"
      }
    ]
  }
}
```

The pipeline JSON payload follows the ADF pipeline schema with activities, dependencies, parameters, and triggers.

## 6. Data Transformations

Common PySpark transformation patterns for Fabric data engineering.

### Cleaning Patterns

```python
from pyspark.sql.functions import col, trim, lower, regexp_replace, when, lit, coalesce

# Trim whitespace from all string columns
for c in [f.name for f in df.schema.fields if f.dataType == StringType()]:
    df = df.withColumn(c, trim(col(c)))

# Normalize email
df = df.withColumn("email", lower(trim(col("email"))))

# Remove special characters from phone
df = df.withColumn("phone", regexp_replace(col("phone"), r"[^\d+]", ""))

# Replace empty strings with null
for c in df.columns:
    df = df.withColumn(c, when(col(c) == "", None).otherwise(col(c)))

# Fill nulls with defaults
df = df.fillna({"status": "unknown", "amount": 0.0})

# Coalesce multiple columns
df = df.withColumn("full_name", coalesce(col("display_name"), concat(col("first_name"), lit(" "), col("last_name"))))
```

### Join Patterns

```python
from pyspark.sql.functions import broadcast

# Standard join
result = orders.join(customers, orders.customer_id == customers.id, "left")

# Broadcast join (small lookup table < 100 MB)
result = orders.join(broadcast(status_lookup), "status_code", "inner")

# Anti join (find unmatched records)
orphaned = orders.join(customers, orders.customer_id == customers.id, "left_anti")

# Cross join with filter (use sparingly)
combos = products.crossJoin(regions).filter(col("region") != "excluded")
```

### Window Functions

```python
from pyspark.sql.window import Window
from pyspark.sql.functions import row_number, lag, lead, sum as spark_sum, avg as spark_avg

# Running total
window_running = Window.partitionBy("customer_id").orderBy("order_date").rowsBetween(Window.unboundedPreceding, Window.currentRow)
df = df.withColumn("running_total", spark_sum("amount").over(window_running))

# Previous and next values
window_ordered = Window.partitionBy("customer_id").orderBy("order_date")
df = df.withColumn("prev_amount", lag("amount", 1).over(window_ordered))
df = df.withColumn("next_amount", lead("amount", 1).over(window_ordered))

# Moving average (7-day window)
window_moving = Window.partitionBy("product_id").orderBy("date").rowsBetween(-6, 0)
df = df.withColumn("moving_avg_7d", spark_avg("sales").over(window_moving))

# Rank and dedup
window_dedup = Window.partitionBy("id").orderBy(col("updated_at").desc())
df = df.withColumn("rn", row_number().over(window_dedup)).filter(col("rn") == 1).drop("rn")
```

### UDFs (Use Sparingly)

```python
from pyspark.sql.functions import udf
from pyspark.sql.types import StringType

# Only use UDFs when NO built-in function exists
# UDFs disable Catalyst optimization and require serialization

@udf(returnType=StringType())
def custom_hash(val):
    """Example: custom business logic that has no built-in equivalent."""
    import hashlib
    return hashlib.sha256(str(val).encode()).hexdigest()[:12] if val else None

df = df.withColumn("short_hash", custom_hash(col("id")))
```

**Prefer built-ins**: `concat()`, `sha2()`, `regexp_replace()`, `when()`, `coalesce()` — these run natively in Spark's JVM and are 10-100x faster than Python UDFs.

### Schema Drift Handling

```python
from pyspark.sql.types import StructType

# Read with a defined schema — extra columns are dropped, missing columns become null
expected_schema = StructType([...])
df = spark.read.schema(expected_schema).format("csv").load(path)

# Or detect drift and log it
actual_cols = set(df.columns)
expected_cols = set([f.name for f in expected_schema.fields])
new_cols = actual_cols - expected_cols
missing_cols = expected_cols - actual_cols

if new_cols:
    print(f"WARNING: New columns detected: {new_cols}")
if missing_cols:
    print(f"WARNING: Missing columns: {missing_cols}")
    for mc in missing_cols:
        df = df.withColumn(mc, lit(None))
```

### SCD Type 2 Pattern

```python
from delta.tables import DeltaTable
from pyspark.sql.functions import current_timestamp, lit, sha2, concat_ws, col

# Compute hash for change detection
hash_cols = ["first_name", "last_name", "email", "segment"]
source = source_df.withColumn("_hash", sha2(concat_ws("||", *[col(c) for c in hash_cols]), 256))

target = DeltaTable.forName(spark, "silver.customers_scd2")

# Step 1: Close changed records
target.alias("t").merge(
    source.alias("s"),
    "t.customer_id = s.customer_id AND t._is_current = true"
).whenMatchedUpdate(
    condition="t._hash != s._hash",
    set={"_is_current": "false", "_valid_to": "current_timestamp()"}
).execute()

# Step 2: Insert new current records
changed_or_new = source.alias("s").join(
    target.toDF().filter(col("_is_current") == True).alias("t"),
    col("s.customer_id") == col("t.customer_id"),
    "left_anti"  # Records not in target (new or just closed)
).withColumn("_is_current", lit(True)) \
 .withColumn("_valid_from", current_timestamp()) \
 .withColumn("_valid_to", lit(None).cast("timestamp"))

changed_or_new.write.format("delta").mode("append").saveAsTable("silver.customers_scd2")
```

## 7. Medallion Architecture

The medallion architecture organizes data into three layers — Bronze, Silver, and Gold — each with a specific purpose and quality level.

### Bronze Layer (Raw Ingestion)

- **Purpose**: Land data exactly as received from source systems.
- **Quality**: Raw, unvalidated, schema-on-read.
- **Format**: Delta tables with minimal transformation (add audit columns only).
- **Retention**: Keep raw data for reprocessing (30-90 days typical).
- **Schema**: Accept everything — use `mergeSchema = true`.

```python
# Bronze ingestion pattern
df = spark.read.format("csv").option("header", "true").schema(source_schema).load("Files/landing/*.csv")
df = df.withColumn("_ingested_at", current_timestamp()) \
       .withColumn("_source_file", input_file_name()) \
       .withColumn("_batch_id", lit(batch_id))

df.write.format("delta").mode("append").option("mergeSchema", "true").saveAsTable("lh_bronze_sales.raw_orders")
```

### Silver Layer (Cleaned and Conformed)

- **Purpose**: Cleaned, deduplicated, conformed data with business-level naming.
- **Quality**: Validated, typed, null-handled, deduplicated.
- **Format**: Delta tables with enforced schema.
- **Transformations**: Type casting, dedup, null handling, standardization, SCD2.

```python
# Silver transformation pattern
bronze_df = spark.read.table("lh_bronze_sales.raw_orders")

silver_df = bronze_df \
    .dropDuplicates(["order_id"]) \
    .withColumn("order_date", col("order_date").cast("date")) \
    .withColumn("amount", col("amount").cast("decimal(18,2)")) \
    .withColumn("customer_email", lower(trim(col("customer_email")))) \
    .filter(col("order_id").isNotNull()) \
    .withColumn("_processed_at", current_timestamp())

silver_df.write.format("delta").mode("overwrite").saveAsTable("lh_silver_sales.orders")
```

### Gold Layer (Business Aggregates)

- **Purpose**: Business-ready aggregations and metrics for Power BI and reporting.
- **Quality**: Fully validated, aggregated, business KPIs.
- **Format**: Delta tables with V-Order enabled for Power BI performance.
- **Consumers**: Power BI datasets, SQL analytics endpoint, ad-hoc queries.

```python
# Gold aggregation pattern
spark.conf.set("spark.sql.parquet.vorder.enabled", "true")

silver_df = spark.read.table("lh_silver_sales.orders")

gold_df = silver_df \
    .withColumn("month", date_trunc("month", col("order_date"))) \
    .groupBy("month", "region", "product_category") \
    .agg(
        sum("amount").alias("total_revenue"),
        count("order_id").alias("order_count"),
        avg("amount").alias("avg_order_value"),
        countDistinct("customer_id").alias("unique_customers")
    )

gold_df.write.format("delta").mode("overwrite").saveAsTable("lh_gold_sales.monthly_sales_summary")
```

### Implementation in Fabric

**One lakehouse per layer** (recommended for separation of concerns):
```
Workspace: ws_sales_analytics
├── lh_bronze_sales     # Raw ingested data
├── lh_silver_sales     # Cleaned and conformed
├── lh_gold_sales       # Business aggregates (Power BI connects here)
├── nb_ingest_bronze    # Ingestion notebook
├── nb_transform_silver # Cleaning notebook
├── nb_aggregate_gold   # Aggregation notebook
└── pl_sales_daily      # Pipeline orchestrating all three
```

**Cross-lakehouse references** in Spark:
```python
# Read from bronze lakehouse while attached to silver
bronze_df = spark.read.table("lh_bronze_sales.raw_orders")

# Write to the current (attached) lakehouse
silver_df.write.format("delta").saveAsTable("orders")

# Or reference by full OneLake path
df = spark.read.format("delta").load(
    "abfss://ws_sales_analytics@onelake.dfs.fabric.microsoft.com/lh_bronze_sales.Lakehouse/Tables/raw_orders"
)
```

**Cross-lakehouse references** in SQL analytics endpoint:
```sql
-- Three-part naming within the same workspace
SELECT * FROM [lh_silver_sales].[dbo].[orders]
WHERE order_date >= '2024-01-01';
```

## 8. REST API

The Fabric REST API manages Fabric items (lakehouses, notebooks, pipelines) programmatically.

### Authentication

```bash
# Get token via Azure CLI
TOKEN=$(az account get-access-token --resource https://api.fabric.microsoft.com --query accessToken -o tsv)

# Or via service principal (MSAL)
# POST https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/token
# grant_type=client_credentials&client_id={clientId}&client_secret={clientSecret}&scope=https://api.fabric.microsoft.com/.default
```

### Workspace Management

```bash
# List workspaces
GET https://api.fabric.microsoft.com/v1/workspaces

# Create workspace
POST https://api.fabric.microsoft.com/v1/workspaces
{ "displayName": "ws_sales_analytics", "capacityId": "{capacityId}" }

# Get workspace items
GET https://api.fabric.microsoft.com/v1/workspaces/{workspaceId}/items
```

### Item Operations (Lakehouses, Notebooks, Pipelines)

```bash
# List lakehouses
GET https://api.fabric.microsoft.com/v1/workspaces/{workspaceId}/lakehouses

# Create lakehouse
POST https://api.fabric.microsoft.com/v1/workspaces/{workspaceId}/lakehouses
{ "displayName": "lh_bronze_sales" }

# Get lakehouse details (includes SQL endpoint connection string)
GET https://api.fabric.microsoft.com/v1/workspaces/{workspaceId}/lakehouses/{lakehouseId}

# Create notebook
POST https://api.fabric.microsoft.com/v1/workspaces/{workspaceId}/notebooks
{ "displayName": "nb_ingest_csv", "definition": { "format": "ipynb", "parts": [...] } }

# Create pipeline
POST https://api.fabric.microsoft.com/v1/workspaces/{workspaceId}/dataPipelines
{ "displayName": "pl_daily_ingest", "definition": { "parts": [...] } }

# Delete an item
DELETE https://api.fabric.microsoft.com/v1/workspaces/{workspaceId}/items/{itemId}
```

### Long-Running Operations

Some operations (e.g., creating large items, running notebooks) return a `202 Accepted` with a `Location` header:

```bash
# Poll for completion
GET https://api.fabric.microsoft.com/v1/operations/{operationId}

# Response when complete:
{ "status": "Succeeded", "createdTimeUtc": "...", "lastUpdatedTimeUtc": "..." }
```

### Run a Pipeline

```bash
POST https://api.fabric.microsoft.com/v1/workspaces/{workspaceId}/items/{pipelineId}/jobs/instances?jobType=Pipeline
{
  "executionData": {
    "parameters": {
      "run_date": "2024-01-15",
      "environment": "prod"
    }
  }
}
```

## 9. Connectivity

### OneLake ADLS Gen2 Endpoint

Every Fabric item is accessible via the standard ADLS Gen2 endpoint:

```
abfss://<workspace-name>@onelake.dfs.fabric.microsoft.com/<item-name>.<item-type>
```

**Examples**:
```python
# Read a Delta table from another workspace
df = spark.read.format("delta").load(
    "abfss://ws_shared_data@onelake.dfs.fabric.microsoft.com/lh_reference.Lakehouse/Tables/countries"
)

# Read raw files
df = spark.read.format("csv").load(
    "abfss://ws_sales@onelake.dfs.fabric.microsoft.com/lh_bronze.Lakehouse/Files/landing/orders.csv"
)
```

**External access** (from outside Fabric — Azure Databricks, Synapse, ADF):
- Authenticate with Azure AD (OAuth 2.0).
- Use the same `abfss://` path with `onelake.dfs.fabric.microsoft.com` as the account name.
- No storage account keys — OneLake uses Azure AD only.

### Shortcuts

Shortcuts allow a lakehouse to reference data from external sources without copying:

| Shortcut Target | Protocol | Use Case |
|----------------|----------|----------|
| Another lakehouse | Internal | Share tables across workspaces |
| ADLS Gen2 | abfss:// | Reference existing data lake files |
| Amazon S3 | s3:// | Cross-cloud data access |
| Dataverse | Dataverse connector | Power Platform data integration |
| Google Cloud Storage | gs:// | Cross-cloud data access |

**Create a shortcut** (REST API):
```bash
POST https://api.fabric.microsoft.com/v1/workspaces/{workspaceId}/items/{lakehouseId}/shortcuts
{
  "name": "external_customers",
  "path": "Tables",
  "target": {
    "type": "AdlsGen2",
    "adlsGen2": {
      "location": "https://storageaccount.dfs.core.windows.net",
      "subpath": "/container/path/to/delta/table",
      "connectionId": "{connectionId}"
    }
  }
}
```

Shortcuts appear as regular tables or folders in the lakehouse. Spark reads them transparently.

### Gateway Connections

For on-premises or private-network data sources, use a Fabric data gateway:

1. Install the on-premises data gateway on a machine with network access to the source.
2. Register the gateway in the Fabric portal (Settings > Manage gateways).
3. Create a connection in the Fabric workspace that uses the gateway.
4. Reference the connection in Copy activities or notebooks.

## 10. Performance

### Spark Pool Sizing

**Starter pools** (default, shared):
- Auto-created per workspace.
- Pool warms up in ~30 seconds (vs. 2-3 minutes for custom pools).
- Suitable for development and small-to-medium workloads.
- Node count auto-scales based on capacity.

**Custom pools** (dedicated, larger):
- Created in workspace settings > Data Engineering > Spark Settings > Custom Pools.
- Choose node family (Memory Optimized, etc.) and min/max nodes.
- Use for production workloads requiring predictable performance.
- Can configure autoscale min/max.

### V-Order

V-Order is a write-time optimization that reorganizes Parquet row groups for faster reads:

```python
spark.conf.set("spark.sql.parquet.vorder.enabled", "true")
```

- Apply to Gold-layer tables consumed by Power BI.
- Adds ~5% write overhead for 2-10x read improvement.
- Automatically applied when writing through Power BI dataflows.

### Partition Pruning

Spark automatically prunes partitions when WHERE clauses match partition columns:

```python
# This reads only the 2024-01 partition (not the entire table)
df = spark.read.table("orders").filter(col("year_month") == "2024-01")
```

Verify partition pruning is working:
```python
df.explain(True)  # Look for "PartitionFilters" in the physical plan
```

### Predicate Pushdown

Spark pushes filter conditions down to the storage layer:

```python
# Predicate pushdown — Spark reads only matching Parquet row groups
df = spark.read.table("customers").filter(col("segment") == "premium")
```

Works best with:
- Z-ORDER or liquid clustering on the filter column.
- Delta statistics (min/max per file) — maintained automatically.

### Cache

```python
# Cache a DataFrame that will be used multiple times
df = spark.read.table("large_table").filter(col("year") == 2024)
df.cache()  # Stores in executor memory
df.count()  # Triggers materialization

# Use after multiple operations on the same DataFrame
result1 = df.groupBy("region").count()
result2 = df.groupBy("category").sum("amount")

# Unpersist when done
df.unpersist()
```

**Do NOT cache**:
- DataFrames used only once.
- Very large DataFrames that exceed executor memory (causes spilling to disk).
- DataFrames in a simple read-transform-write pipeline.

### Autotune

Fabric Spark includes autotune, which automatically adjusts:
- `spark.sql.shuffle.partitions` — auto-sizes based on data volume.
- `spark.sql.files.maxPartitionBytes` — auto-sizes file splits.
- Query plan optimization via adaptive query execution (AQE).

Enable with:
```python
spark.conf.set("spark.sql.adaptive.enabled", "true")
```

This is enabled by default in Fabric. Avoid overriding shuffle partitions manually unless you have a specific reason.

## 11. Monitoring

### Spark Application Monitoring

In the Fabric portal, navigate to **Monitor Hub** or the notebook's **Spark application** view:

- **Stages**: See task distribution, skew, and spill metrics per stage.
- **SQL/DataFrame**: View the logical and physical query plans.
- **Storage**: See data read/written per stage.
- **Environment**: Spark configuration and library versions.

**Spark UI** (accessible from a running notebook):
- Jobs tab: Overall job progress and duration.
- Stages tab: Task-level metrics, identify data skew (tasks with 10x more input than average).
- Storage tab: Cached DataFrames and memory usage.
- SQL tab: Query plans with metrics (rows processed, bytes scanned).

### Pipeline Run History

In the Fabric portal, navigate to the pipeline and view the **Run History** tab:

- **Run status**: Succeeded, Failed, In Progress, Queued.
- **Activity details**: Duration, input/output rows, error messages per activity.
- **Rerun**: Re-run failed pipelines from the failed activity (not from scratch).
- **Gantt chart**: Visual timeline of activity execution showing parallelism and bottlenecks.

### Monitoring Hub

The workspace-level Monitoring Hub shows all running and recent activities:

| Item Type | Metrics |
|-----------|---------|
| Notebook | Run duration, Spark application ID, status |
| Pipeline | Run duration, activity success/failure counts |
| Lakehouse | Table load operations, SQL endpoint queries |
| Dataflow Gen2 | Refresh duration, rows processed |

### Capacity Metrics

Capacity admins can monitor usage via the **Microsoft Fabric Capacity Metrics** app:

- **CU utilization**: Current and historical compute unit consumption.
- **Throttling**: Whether background or interactive operations are being throttled.
- **Per-item breakdown**: Which items consume the most capacity.
- **Smoothing**: Fabric uses a 24-hour smoothing window for burst capacity.

## 12. Common Patterns

### Pattern 1: Bronze Ingestion from CSV/JSON Files to Delta

**Scenario**: Daily CSV files arrive in `Files/landing/`. Load them into a bronze Delta table and archive the originals.

```python
from pyspark.sql.functions import current_timestamp, input_file_name, lit
from pyspark.sql.types import StructType, StructField, StringType, DoubleType

# Parameters
source_path = "Files/landing/"
target_table = "lh_bronze_sales.raw_orders"
archive_path = "Files/archive/"

# Define schema (never rely on inferSchema in production)
schema = StructType([
    StructField("order_id", StringType(), False),
    StructField("customer_id", StringType(), True),
    StructField("product_id", StringType(), True),
    StructField("amount", DoubleType(), True),
    StructField("order_date", StringType(), True),
    StructField("status", StringType(), True)
])

# Read all CSV files from landing
df = spark.read.format("csv") \
    .option("header", "true") \
    .option("mode", "PERMISSIVE") \
    .option("columnNameOfCorruptRecord", "_corrupt_record") \
    .schema(schema) \
    .load(f"{source_path}*.csv")

# Add audit columns
df = df.withColumn("_ingested_at", current_timestamp()) \
       .withColumn("_source_file", input_file_name())

# Write to bronze table (append to preserve history)
df.write.format("delta") \
    .mode("append") \
    .option("mergeSchema", "true") \
    .saveAsTable(target_table)

# Archive processed files
for f in mssparkutils.fs.ls(source_path):
    if f.name.endswith(".csv"):
        mssparkutils.fs.mv(f.path, f"{archive_path}{f.name}")

print(f"Ingested {df.count()} rows into {target_table}")
```

### Pattern 2: Silver Transformation with Dedup and SCD2

**Scenario**: Transform bronze orders into a clean silver table with deduplication and slowly-changing dimension tracking.

```python
from pyspark.sql.functions import col, trim, lower, current_timestamp, sha2, concat_ws, lit, row_number
from pyspark.sql.window import Window
from delta.tables import DeltaTable

source_table = "lh_bronze_sales.raw_orders"
target_table = "lh_silver_sales.orders"

# Read bronze data
bronze_df = spark.read.table(source_table)

# Clean and deduplicate
clean_df = bronze_df \
    .withColumn("order_date", col("order_date").cast("date")) \
    .withColumn("amount", col("amount").cast("decimal(18,2)")) \
    .withColumn("status", trim(lower(col("status")))) \
    .filter(col("order_id").isNotNull()) \
    .filter(col("amount") >= 0)

# Dedup: keep latest record per order_id
window = Window.partitionBy("order_id").orderBy(col("_ingested_at").desc())
deduped_df = clean_df \
    .withColumn("rn", row_number().over(window)) \
    .filter(col("rn") == 1) \
    .drop("rn", "_corrupt_record")

# Add hash for change detection
hash_cols = ["customer_id", "product_id", "amount", "status"]
silver_df = deduped_df \
    .withColumn("_hash", sha2(concat_ws("||", *[col(c) for c in hash_cols]), 256)) \
    .withColumn("_processed_at", current_timestamp())

# MERGE into silver (upsert)
if spark.catalog.tableExists(target_table):
    target = DeltaTable.forName(spark, target_table)
    target.alias("t").merge(
        silver_df.alias("s"),
        "t.order_id = s.order_id"
    ).whenMatchedUpdate(
        condition="t._hash != s._hash",
        set={"customer_id": "s.customer_id", "product_id": "s.product_id",
             "amount": "s.amount", "order_date": "s.order_date",
             "status": "s.status", "_hash": "s._hash",
             "_processed_at": "s._processed_at"}
    ).whenNotMatchedInsertAll() \
     .execute()
else:
    silver_df.write.format("delta").saveAsTable(target_table)

print(f"Silver table {target_table} updated with {silver_df.count()} records")
```

### Pattern 3: Gold Aggregation for Power BI

**Scenario**: Aggregate silver orders into monthly sales summaries optimized for Power BI DirectQuery.

```python
from pyspark.sql.functions import sum, count, avg, countDistinct, col, date_trunc, current_timestamp

source_table = "lh_silver_sales.orders"
target_table = "lh_gold_sales.monthly_sales_summary"

# Enable V-Order for Power BI performance
spark.conf.set("spark.sql.parquet.vorder.enabled", "true")

# Read silver data
silver_df = spark.read.table(source_table)

# Aggregate by month, region, and category
gold_df = silver_df \
    .filter(col("status").isin("completed", "shipped")) \
    .withColumn("month", date_trunc("month", col("order_date"))) \
    .groupBy("month", "region", "product_category") \
    .agg(
        sum("amount").alias("total_revenue"),
        count("order_id").alias("order_count"),
        avg("amount").alias("avg_order_value"),
        countDistinct("customer_id").alias("unique_customers")
    ) \
    .withColumn("_refreshed_at", current_timestamp())

# Overwrite gold table (full refresh each run)
gold_df.write.format("delta") \
    .mode("overwrite") \
    .saveAsTable(target_table)

# Run OPTIMIZE with Z-ORDER on commonly filtered columns
spark.sql(f"OPTIMIZE {target_table} ZORDER BY (month, region)")

print(f"Gold table {target_table} refreshed with {gold_df.count()} rows")
```

### Pattern 4: Orchestrated Pipeline (Copy -> Notebook -> Refresh)

**Scenario**: End-to-end daily pipeline that copies data from an external SQL database, transforms it through bronze/silver/gold, and triggers a Power BI dataset refresh.

**Pipeline definition** (`pl_daily_sales_etl`):

```
Activity 1: Copy_SQL_To_Bronze (Copy Activity)
  Source: Azure SQL Database (sales.orders WHERE modified_date > @pipeline().parameters.watermark)
  Sink: lh_bronze_sales / Files/landing/orders/
  On Success -> Activity 2
  On Failure -> Activity 6

Activity 2: Transform_Bronze_To_Silver (Notebook Activity)
  Notebook: nb_transform_silver
  Parameters: { "source_table": "raw_orders", "run_date": "@pipeline().parameters.run_date" }
  On Success -> Activity 3
  On Failure -> Activity 6

Activity 3: Aggregate_Silver_To_Gold (Notebook Activity)
  Notebook: nb_aggregate_gold
  Parameters: { "source_table": "orders", "run_date": "@pipeline().parameters.run_date" }
  On Success -> Activity 4
  On Failure -> Activity 6

Activity 4: Maintenance_Optimize (Notebook Activity)
  Notebook: nb_table_maintenance
  Parameters: { "tables": "lh_silver_sales.orders,lh_gold_sales.monthly_sales_summary" }
  On Success -> Activity 5

Activity 5: Update_Watermark (Script Activity)
  SQL: UPDATE config.watermarks SET last_value = '@pipeline().parameters.run_date' WHERE table_name = 'orders'
  On Success -> [Pipeline Complete]

Activity 6: Notify_Failure (Web Activity)
  URL: @pipeline().parameters.alert_webhook_url
  Method: POST
  Body: { "pipeline": "@pipeline().Pipeline", "runId": "@pipeline().RunId", "error": "@activity('*').error.message" }
```

**Pipeline parameters**:
```json
{
  "run_date": "@utcNow('yyyy-MM-dd')",
  "watermark": "",
  "alert_webhook_url": "https://hooks.teams.example.com/webhook/..."
}
```

**Schedule trigger**: Daily at 06:00 UTC with retry policy (3 retries, 5-minute interval).

This pattern ensures:
- **Idempotency**: MERGE operations make re-runs safe.
- **Error handling**: Every activity has a failure path to the notification activity.
- **Parameterization**: No hardcoded values — everything is driven by pipeline parameters.

## OneLake Desktop Sync — Local Data Access

If OneLake desktop sync is installed, data engineers can access lakehouse data directly from the local filesystem without Spark or API authentication.

**Local path**: `C:\Users\<user>\OneLake - <tenant>\<workspace>\<lakehouse>.Lakehouse\{Files,Tables}\`

**What you can do locally**:
- **Inspect Delta tables**: Read schema, row counts, and history with `deltalake`, `polars`, or `DuckDB` — no Spark cluster spin-up needed
- **Profile data**: Run `df.describe()`, null counts, and distribution checks on local Delta table snapshots
- **Stage files for ingestion**: Copy CSV/Parquet/JSON to `Files/landing/` — files sync to OneLake and Spark reads them via `Files/landing/*.csv`
- **Debug pipeline output**: Inspect Parquet files in `Tables/` after a pipeline run to verify data quality locally

**Critical rule**: Only write to `Files/`. Never write to `Tables/` — direct writes corrupt Delta transaction logs.

**Development workflow**: Profile locally → prototype with polars/pandas → convert to PySpark → deploy to Fabric → validate output locally.

Triggers: `onelake desktop sync`, `onelake local`, `local delta`, `local lakehouse`

→ Full reference: [`references/onelake-desktop-sync.md`](./references/onelake-desktop-sync.md)

## Progressive Disclosure — Reference Files

| Topic | File |
|---|---|
| Lakehouse creation, Delta tables, ACID transactions, time travel, V-Order, OPTIMIZE/VACUUM | [`references/lakehouses-delta.md`](./references/lakehouses-delta.md) |
| Notebook API, Spark session config, magic commands, mssparkutils, cross-lakehouse access | [`references/spark-notebooks.md`](./references/spark-notebooks.md) |
| Pipeline REST API, Copy activity, activity dependencies, parallel execution, retry, monitoring | [`references/data-pipelines.md`](./references/data-pipelines.md) |
| Bronze/Silver/Gold patterns, incremental load, CDC, schema enforcement, data quality | [`references/medallion-architecture.md`](./references/medallion-architecture.md) |
| Spark tuning, partition strategies, Delta optimization, V-Order, CU consumption, caching | [`references/performance-optimization.md`](./references/performance-optimization.md) |
| OneLake desktop sync, local path convention, Delta table local reads, file staging workflow | [`references/onelake-desktop-sync.md`](./references/onelake-desktop-sync.md) |
- **Monitoring**: Failure alerts sent via webhook to Teams/Slack/PagerDuty.
