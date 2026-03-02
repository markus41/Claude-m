---
name: lakehouse-load-data
description: "Load data from files, APIs, or databases into lakehouse Delta tables"
argument-hint: "<source-type> --target <table-name> [--lakehouse <lakehouse-name>] [--mode <overwrite|append|merge>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - AskUserQuestion
---

# Load Data into Lakehouse

Load data from various sources into Delta tables in a Fabric lakehouse.

## Instructions

### 1. Validate Inputs

- `<source-type>` -- One of: `csv`, `json`, `parquet`, `api`, `sql-database`, `excel`, `sharepoint`. Ask if not provided.
- `--target` -- Target Delta table name (e.g., `raw_customers`). Ask if not provided.
- `--lakehouse` -- Lakehouse context. Ask if not provided.
- `--mode` -- Write mode: `overwrite` (replace), `append` (add rows), `merge` (upsert by key). Default is `overwrite`.

### 2. Source: csv

Load CSV files from the lakehouse Files/ folder:

```python
from pyspark.sql.types import StructType, StructField, StringType, IntegerType, DoubleType, TimestampType
from pyspark.sql.functions import current_timestamp, input_file_name

# Define schema explicitly (do NOT use inferSchema in production)
schema = StructType([
    StructField("id", StringType(), False),
    StructField("name", StringType(), True),
    StructField("amount", DoubleType(), True),
    StructField("date", StringType(), True)
])

df = spark.read.format("csv") \
    .option("header", "true") \
    .option("dateFormat", "yyyy-MM-dd") \
    .option("nullValue", "NULL") \
    .option("mode", "PERMISSIVE") \
    .option("columnNameOfCorruptRecord", "_corrupt_record") \
    .schema(schema) \
    .load("Files/landing/*.csv")

# Add audit columns
df = df.withColumn("_ingested_at", current_timestamp()) \
       .withColumn("_source_file", input_file_name())

df.write.format("delta").mode("overwrite").saveAsTable(target_table)
```

### 3. Source: json

Load JSON files (single-line or multi-line):

```python
schema = StructType([...])  # Define explicitly

df = spark.read.format("json") \
    .option("multiLine", "true") \
    .option("mode", "PERMISSIVE") \
    .option("columnNameOfCorruptRecord", "_corrupt_record") \
    .schema(schema) \
    .load("Files/landing/*.json")

df.write.format("delta").mode("overwrite").saveAsTable(target_table)
```

### 4. Source: parquet

Load Parquet files (schema is embedded):

```python
df = spark.read.format("parquet").load("Files/landing/*.parquet")

# Add audit columns
df = df.withColumn("_ingested_at", current_timestamp()) \
       .withColumn("_source_file", input_file_name())

df.write.format("delta").mode("overwrite").saveAsTable(target_table)
```

### 5. Source: api

Fetch data from a REST API and load into Delta:

```python
import requests
import json
from pyspark.sql import Row
from pyspark.sql.functions import current_timestamp

# Retrieve API key from Key Vault
api_key = mssparkutils.credentials.getSecret("https://<kv>.vault.azure.net/", "api-key")

# Paginated fetch
all_records = []
url = "<api-url>"
while url:
    response = requests.get(url, headers={"Authorization": f"Bearer {api_key}"})
    response.raise_for_status()
    data = response.json()
    all_records.extend(data.get("value", []))
    url = data.get("@odata.nextLink")

df = spark.createDataFrame([Row(**r) for r in all_records])
df = df.withColumn("_ingested_at", current_timestamp())

df.write.format("delta").mode("overwrite").saveAsTable(target_table)
```

### 6. Source: sql-database

Load data from an Azure SQL Database or SQL Server:

```python
# Retrieve connection string from Key Vault
jdbc_url = mssparkutils.credentials.getSecret("https://<kv>.vault.azure.net/", "sql-jdbc-url")

df = spark.read.format("jdbc") \
    .option("url", jdbc_url) \
    .option("dbtable", "<schema>.<table>") \
    .option("fetchsize", "10000") \
    .load()

# For incremental loads, add a WHERE filter
# .option("query", f"SELECT * FROM <table> WHERE modified_date > '{last_watermark}'")

df.write.format("delta").mode("overwrite").saveAsTable(target_table)
```

### 7. Source: excel

Load Excel files using pandas as an intermediary:

```python
import pandas as pd
from pyspark.sql.functions import current_timestamp

# Read Excel from Files/ folder
pandas_df = pd.read_excel(
    "/lakehouse/default/Files/landing/data.xlsx",
    sheet_name="Sheet1",
    dtype=str  # Read all as string, cast later
)

df = spark.createDataFrame(pandas_df)
df = df.withColumn("_ingested_at", current_timestamp())

df.write.format("delta").mode("overwrite").saveAsTable(target_table)
```

### 8. Source: sharepoint

Load files from SharePoint via Microsoft Graph API:

```python
import requests
from pyspark.sql.functions import current_timestamp

# Get access token via mssparkutils
token = mssparkutils.credentials.getToken("https://graph.microsoft.com")

# Download file from SharePoint
site_id = "<site-id>"
drive_id = "<drive-id>"
file_path = "<path/to/file.csv>"

url = f"https://graph.microsoft.com/v1.0/sites/{site_id}/drives/{drive_id}/root:/{file_path}:/content"
response = requests.get(url, headers={"Authorization": f"Bearer {token}"})
response.raise_for_status()

# Save to lakehouse Files/ then read with Spark
with open("/lakehouse/default/Files/landing/sharepoint_file.csv", "wb") as f:
    f.write(response.content)

df = spark.read.format("csv").option("header", "true").load("Files/landing/sharepoint_file.csv")
df = df.withColumn("_ingested_at", current_timestamp())

df.write.format("delta").mode("overwrite").saveAsTable(target_table)
```

### 9. Merge Mode (upsert)

When `--mode merge` is specified, use MERGE INTO for idempotent upserts:

```python
from delta.tables import DeltaTable

merge_key = "id"  # Ask user for the merge key column

if spark.catalog.tableExists(target_table):
    target = DeltaTable.forName(spark, target_table)
    target.alias("t").merge(
        df.alias("s"),
        f"t.{merge_key} = s.{merge_key}"
    ).whenMatchedUpdateAll() \
     .whenNotMatchedInsertAll() \
     .execute()
else:
    df.write.format("delta").saveAsTable(target_table)
```

### 10. Display Summary

Show the user:
- Source type and file path / endpoint
- Target table and write mode
- Row count written
- Schema of the loaded table
- Recommendations: schedule with `/pipeline-create`, add quality checks with `/notebook-create data-quality`
