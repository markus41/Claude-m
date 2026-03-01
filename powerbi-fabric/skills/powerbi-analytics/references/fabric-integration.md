# Microsoft Fabric Integration Reference

Reference for Microsoft Fabric capabilities including Lakehouse, PySpark notebooks, Direct Lake semantic models, data pipelines, Dataflow Gen2, and the Fabric REST API.

## Fabric Overview

Microsoft Fabric is a unified SaaS analytics platform that brings together data engineering, data integration, data warehousing, data science, real-time analytics, and business intelligence. All Fabric workloads store data in OneLake, a single multi-cloud data lake built on top of Azure Data Lake Storage Gen2.

### Capacity and Licensing

Fabric uses capacity-based licensing measured in Capacity Units (CUs):

| SKU | CUs | Spark Cores | Typical Use |
|-----|-----|-------------|-------------|
| F2 | 2 | 8 | Development/testing |
| F4 | 4 | 8 | Small team |
| F8 | 8 | 16 | Small team |
| F16 | 16 | 32 | Medium team |
| F32 | 32 | 64 | Production |
| F64 | 64 | 128 | Large production |
| F128+ | 128+ | 256+ | Enterprise |

Power BI Pro licenses can view content in Premium/Fabric workspaces. Fabric Trial provides F64 equivalent for 60 days.

## Lakehouse

A Lakehouse is a Fabric item that combines the best of data lakes and data warehouses. It stores data in Delta format on OneLake and supports both Spark (engineering) and SQL (analytics) access.

### OneLake Storage Structure

```
OneLake/
  workspace-name/
    lakehouse-name.Lakehouse/
      Tables/                      # Managed Delta tables
        customers/
          _delta_log/
          part-00000.parquet
        sales/
          _delta_log/
          part-00000.parquet
      Files/                       # Unstructured files (CSV, JSON, images)
        raw/
          data.csv
        staging/
```

### Shortcuts

Shortcuts are references to data stored outside the Lakehouse without copying it. Supported shortcut targets:

- Another OneLake location (different Lakehouse or workspace)
- Azure Data Lake Storage Gen2 (ADLS)
- Amazon S3
- Google Cloud Storage
- Dataverse

```python
# Shortcut tables appear as regular Delta tables in Spark
df = spark.read.format("delta").load("Tables/shortcut_table")
```

### Lakehouse SQL Endpoint

Every Lakehouse automatically gets a SQL analytics endpoint that provides read-only T-SQL access to managed Delta tables. This enables:
- Direct SQL querying from Power BI (DirectQuery or Direct Lake mode)
- Connection from SSMS, Azure Data Studio, or any SQL client
- Views and stored procedures (read-only)

## Notebooks (PySpark)

Fabric notebooks use Apache Spark (PySpark by default) for data transformation. Notebooks run on Spark clusters that auto-scale based on capacity.

### Standard Notebook Template

```python
# Cell 1: Configuration
from pyspark.sql import SparkSession
from pyspark.sql.functions import col, lit, when, year, month, current_timestamp
from pyspark.sql.types import StructType, StructField, StringType, IntegerType, DoubleType, DateType

# Spark session is pre-configured in Fabric notebooks
# spark = SparkSession.builder.getOrCreate()  # Not needed in Fabric
```

```python
# Cell 2: Read from Lakehouse
# Read a Delta table from the attached Lakehouse
df_sales = spark.read.format("delta").load("Tables/raw_sales")

# Read from Files area
df_csv = spark.read.format("csv") \
    .option("header", "true") \
    .option("inferSchema", "true") \
    .load("Files/raw/sales_data.csv")

# Read from external source
df_sql = spark.read.format("jdbc") \
    .option("url", "jdbc:sqlserver://server.database.windows.net:1433;database=mydb") \
    .option("dbtable", "dbo.Sales") \
    .option("user", username) \
    .option("password", password) \
    .load()
```

```python
# Cell 3: Transform
df_transformed = (
    df_sales
    .filter(col("order_date") >= "2024-01-01")
    .withColumn("year", year(col("order_date")))
    .withColumn("month", month(col("order_date")))
    .withColumn("revenue", col("quantity") * col("unit_price"))
    .withColumn("load_timestamp", current_timestamp())
    .dropDuplicates(["order_id"])
    .select(
        "order_id", "customer_id", "product_id",
        "order_date", "year", "month",
        "quantity", "unit_price", "revenue",
        "load_timestamp"
    )
)
```

```python
# Cell 4: Write to Lakehouse Delta table
df_transformed.write \
    .format("delta") \
    .mode("overwrite") \        # "overwrite", "append", "merge"
    .option("overwriteSchema", "true") \
    .saveAsTable("sales_fact")  # Saves to Tables/sales_fact in attached Lakehouse

# For merge/upsert operations
from delta.tables import DeltaTable

if DeltaTable.isDeltaTable(spark, "Tables/sales_fact"):
    delta_table = DeltaTable.forPath(spark, "Tables/sales_fact")
    delta_table.alias("target").merge(
        df_transformed.alias("source"),
        "target.order_id = source.order_id"
    ).whenMatchedUpdateAll() \
     .whenNotMatchedInsertAll() \
     .execute()
else:
    df_transformed.write.format("delta").saveAsTable("sales_fact")
```

```python
# Cell 5: Optimize table
spark.sql("OPTIMIZE sales_fact ZORDER BY (customer_id, order_date)")
spark.sql("VACUUM sales_fact RETAIN 168 HOURS")
```

### Notebook Parameters

Use the `%%configure` magic to set Spark configuration:

```python
%%configure
{
    "conf": {
        "spark.sql.shuffle.partitions": "8",
        "spark.executor.memory": "8g"
    }
}
```

Use widget-based parameters for notebook parameterization in pipelines:

```python
# Define parameter with default value
order_date = "2024-01-01"  # Pipeline overrides this value

# Use in transformation
df = spark.read.format("delta").load("Tables/raw_sales")
df_filtered = df.filter(col("order_date") >= order_date)
```

### Semantic Link (Power BI Integration)

```python
import sempy.fabric as fabric

# List datasets in the workspace
datasets = fabric.list_datasets()

# Read Power BI semantic model data
df = fabric.read_table("My Semantic Model", "Sales")

# Evaluate DAX query against a semantic model
result = fabric.evaluate_dax(
    "My Semantic Model",
    """
    EVALUATE
    SUMMARIZECOLUMNS(
        'Date'[Year],
        "Revenue", [Total Revenue]
    )
    """
)
```

## Direct Lake Mode

Direct Lake is a semantic model storage mode that reads data directly from Delta tables in a Lakehouse or Warehouse. It combines the performance of Import mode with the freshness of DirectQuery.

### How Direct Lake Works

1. The semantic model metadata points to Delta tables in a Lakehouse
2. When a query hits the model, data is loaded from Parquet files directly into the VertiPaq engine in memory
3. No scheduled refresh is needed -- data is automatically current when the Lakehouse tables are updated
4. If data exceeds memory or if unsupported features are used, the model "falls back" to DirectQuery mode

### Direct Lake Limitations

- Source must be a Fabric Lakehouse or Warehouse
- No calculated columns in the model (use Spark/SQL to pre-compute)
- No Power Query M transformations (all transforms must be done before the Lakehouse)
- Limited DAX function support in fallback mode
- Tables must be Delta format

### Creating a Direct Lake Semantic Model

1. In Fabric workspace, create a new Semantic Model
2. Select the Lakehouse as the data source
3. Choose the Delta tables to include
4. Define relationships and measures in the model
5. The model automatically uses Direct Lake mode

Alternatively, define in TMDL:

```tmdl
table Sales
    lineageTag: ...

    column OrderId
        dataType: int64
        sourceColumn: order_id
        lineageTag: ...

    partition Sales = entity
        mode: directLake
        source
            entityName: sales_fact
            schemaName: dbo
            expressionSource: DatabaseQuery
```

## Pipelines

Fabric data pipelines orchestrate data movement and transformation. They are similar to Azure Data Factory pipelines.

### Key Activities

| Activity | Purpose |
|----------|---------|
| Copy Data | Move data between sources and destinations |
| Notebook | Execute a Fabric notebook (PySpark) |
| Dataflow Gen2 | Run a Power Query Online dataflow |
| Stored Procedure | Execute SQL stored procedure |
| Set Variable | Set pipeline variable values |
| If Condition | Conditional branching |
| ForEach | Iterate over a collection |
| Wait | Pause pipeline execution |
| Web | Call HTTP endpoints |
| Delete Data | Delete files or tables |

### Pipeline Parameters and Expressions

```json
{
  "name": "DailyRefreshPipeline",
  "properties": {
    "activities": [
      {
        "name": "RunNotebook",
        "type": "TridentNotebook",
        "typeProperties": {
          "notebookId": "notebook-guid",
          "parameters": {
            "order_date": {
              "value": "@formatDateTime(pipeline().parameters.RunDate, 'yyyy-MM-dd')",
              "type": "string"
            }
          }
        }
      }
    ],
    "parameters": {
      "RunDate": { "type": "String", "defaultValue": "" }
    }
  }
}
```

## Dataflow Gen2

Dataflow Gen2 runs Power Query Online transformations and outputs to Lakehouse tables, Warehouse tables, or other destinations. It replaces the original Dataflow with improved performance and Fabric integration.

### Key Features

- Power Query M editor (browser-based)
- Output to Lakehouse Delta tables
- Staging enabled by default (uses Lakehouse for intermediate storage)
- Supports incremental refresh
- Can be orchestrated via pipelines

### Dataflow Gen2 Best Practices

1. Enable staging for complex transformations to improve performance
2. Set the output destination to a Lakehouse table for Direct Lake consumption
3. Use native query folding where possible (SQL sources)
4. For large datasets, use notebooks instead of dataflows

## Fabric REST API

The Fabric REST API (preview) extends the Power BI REST API with Fabric-specific endpoints.

### Base URL

```
https://api.fabric.microsoft.com/v1/
```

### List Fabric Items in Workspace

```
GET /workspaces/{workspaceId}/items?type=Lakehouse
```

```typescript
const items = await fabricRequest(`/workspaces/${workspaceId}/items?type=Lakehouse`);
// Returns: { value: [{ id, displayName, type, description }] }
```

### Supported Item Types

`Lakehouse`, `Notebook`, `Pipeline`, `SemanticModel`, `Report`, `Warehouse`, `DataPipeline`, `MLModel`, `MLExperiment`, `Eventstream`, `KQLDatabase`, `KQLQueryset`

### Run Notebook via API

```typescript
// Execute notebook through pipeline or use the Fabric Jobs API
const job = await fabricRequest(
  `/workspaces/${workspaceId}/items/${notebookId}/jobs/instances?jobType=RunNotebook`,
  "POST"
);
```

### Get Lakehouse Tables

```typescript
const tables = await fabricRequest(
  `/workspaces/${workspaceId}/lakehouses/${lakehouseId}/tables`
);
// Returns: { data: [{ name, format, location, type }] }
```

### OneLake File Access

OneLake supports ADLS Gen2 compatible APIs:

```
https://onelake.dfs.fabric.microsoft.com/{workspaceName}/{lakehouseName}.Lakehouse/Files/
https://onelake.dfs.fabric.microsoft.com/{workspaceName}/{lakehouseName}.Lakehouse/Tables/
```

Authentication uses the same Azure AD tokens with scope `https://storage.azure.com/.default`.

## Architecture Patterns

### Medallion Architecture in Fabric

```
Bronze (Raw)          Silver (Cleaned)       Gold (Business)
─────────────         ─────────────          ─────────────
Lakehouse: raw        Lakehouse: curated     Lakehouse: analytics
  Tables/               Tables/                Tables/
    raw_sales            clean_sales             sales_fact
    raw_customers        clean_customers         customer_dim
    raw_products         clean_products          product_dim
                                                 date_dim

Pipeline: Ingest      Pipeline: Transform    Direct Lake Model
(Copy Data)           (Notebook)             (Semantic Model)
```

### Recommended Data Flow

1. **Ingest**: Copy Data activity or Dataflow Gen2 loads raw data into Bronze Lakehouse
2. **Transform**: Notebook (PySpark) cleans and joins data into Silver Lakehouse
3. **Serve**: Notebook aggregates into Gold Lakehouse star schema tables
4. **Model**: Direct Lake semantic model reads from Gold Lakehouse
5. **Report**: Power BI report connects to the semantic model
