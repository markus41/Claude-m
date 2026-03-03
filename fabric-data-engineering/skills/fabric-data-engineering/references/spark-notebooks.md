# Spark Notebooks

## Overview

Microsoft Fabric notebooks are the primary authoring surface for PySpark, Scala, and SparkSQL workloads. They run on managed Spark clusters provisioned per workspace capacity. This reference covers the Notebook REST API, Spark session configuration, magic commands, parameterized notebooks, the `mssparkutils` API, and cross-lakehouse access patterns.

---

## Notebook REST API

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|---------------------|----------------|-------|
| POST | `/v1/workspaces/{workspaceId}/items` | Workspace Contributor | `type=Notebook`, `displayName`, `definition` | Creates notebook with optional content |
| GET | `/v1/workspaces/{workspaceId}/items?type=Notebook` | Workspace Viewer | — | Lists notebooks in workspace |
| GET | `/v1/workspaces/{workspaceId}/notebooks/{notebookId}` | Workspace Viewer | — | Gets notebook metadata |
| GET | `/v1/workspaces/{workspaceId}/notebooks/{notebookId}/content` | Workspace Viewer | — | Downloads notebook `.ipynb` content |
| PATCH | `/v1/workspaces/{workspaceId}/items/{notebookId}` | Workspace Contributor | `displayName`, `description` | Rename or update metadata |
| DELETE | `/v1/workspaces/{workspaceId}/items/{notebookId}` | Workspace Admin | — | Deletes notebook |
| POST | `/v1/workspaces/{workspaceId}/items/{notebookId}/jobs/instances` | Workspace Contributor | `jobType=RunNotebook`, `executionData.parameters` | Triggers a notebook run |
| GET | `/v1/workspaces/{workspaceId}/items/{notebookId}/jobs/instances/{jobInstanceId}` | Workspace Viewer | — | Polls run status |

**Base URL**: `https://api.fabric.microsoft.com`

### Trigger a Notebook Run via API

```bash
TOKEN=$(az account get-access-token --resource https://api.fabric.microsoft.com --query accessToken -o tsv)

# Start a notebook run with parameters
curl -X POST \
  "https://api.fabric.microsoft.com/v1/workspaces/<workspace-id>/items/<notebook-id>/jobs/instances" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jobType": "RunNotebook",
    "executionData": {
      "parameters": {
        "run_date":   {"value": "2025-03-01", "type": "string"},
        "batch_size": {"value": "1000",       "type": "int"}
      }
    }
  }'

# Poll for completion
JOB_INSTANCE_ID="<jobInstanceId-from-response>"
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.fabric.microsoft.com/v1/workspaces/<workspace-id>/items/<notebook-id>/jobs/instances/$JOB_INSTANCE_ID"
```

Response `status` values: `NotStarted`, `InProgress`, `Completed`, `Failed`, `Cancelled`.

---

## Spark Session Configuration

Spark session configuration in Fabric notebooks is set either via `%%configure` (cluster-level) or `spark.conf.set` (session-level).

```python
# Session-level config (per notebook cell)
spark.conf.set("spark.sql.shuffle.partitions", "200")
spark.conf.set("spark.sql.adaptive.enabled",   "true")
spark.conf.set("spark.sql.adaptive.coalescePartitions.enabled", "true")

# Read current session config
print(spark.conf.get("spark.sql.shuffle.partitions"))
```

### %%configure Magic (cluster-level, must be first cell)

```json
%%configure -f
{
  "conf": {
    "spark.executor.memory":                    "8g",
    "spark.executor.cores":                     "4",
    "spark.executor.instances":                 "4",
    "spark.driver.memory":                      "4g",
    "spark.sql.shuffle.partitions":             "400",
    "spark.sql.adaptive.enabled":               "true",
    "spark.sql.adaptive.coalescePartitions.enabled": "true",
    "spark.sql.parquet.vorder.enabled":         "true",
    "spark.microsoft.delta.optimizeWrite.enabled": "true"
  }
}
```

### Spark Session from Scratch (for unit testing or custom scenarios)

```python
from pyspark.sql import SparkSession

spark = SparkSession.builder \
    .appName("my-etl-job") \
    .config("spark.sql.extensions", "io.delta.sql.DeltaSparkSessionExtension") \
    .config("spark.sql.catalog.spark_catalog", "org.apache.spark.sql.delta.catalog.DeltaCatalog") \
    .config("spark.sql.shuffle.partitions", "200") \
    .getOrCreate()
```

---

## Magic Commands

| Magic | Purpose | Example |
|-------|---------|---------|
| `%%pyspark` | Force Python cell in mixed-language notebook | `%%pyspark` |
| `%%spark` | Force Scala cell | `%%spark` |
| `%%sql` | Run SparkSQL inline | `%%sql SELECT * FROM my_table LIMIT 10` |
| `%%configure` | Set Spark session config (must be first cell) | See above |
| `%%pip` | Install Python packages in current session | `%%pip install great-expectations` |
| `%%sh` | Run shell commands | `%%sh ls /tmp` |
| `%%run` | Run another notebook | `%%run ./utils/helpers` |
| `%env` | Set environment variable | `%env MY_VAR=value` |
| `%lsmagic` | List all available magic commands | `%lsmagic` |

### %%sql Example

```python
# %%sql runs SparkSQL and returns a display result
```

```sql
%%sql
SELECT
    order_date,
    COUNT(*) AS order_count,
    SUM(total_amount) AS daily_revenue
FROM silver_lakehouse.orders
WHERE order_date >= '2025-01-01'
GROUP BY order_date
ORDER BY order_date DESC
LIMIT 30
```

### %%pip Example

```python
%%pip install great-expectations==0.18.12 pyarrow==14.0.2
```

Note: `%%pip` installs into the current Spark driver. Workers are not updated. For worker-side libraries, use a custom Fabric environment.

---

## Parameterized Notebooks

Fabric notebooks support parameters defined in a dedicated "parameters" cell. When triggered via pipeline or API, parameter values override the defaults.

### Define Parameters Cell

```python
# Tag this cell as "parameters" in the cell toolbar (... > Toggle parameter cell)
run_date   = "2025-03-01"  # default value
batch_size = 1000
source_env = "prod"
```

### Read Parameters in Notebook Body

```python
from datetime import datetime, timedelta

# Parameters are injected as Python variables — use them directly
print(f"Processing date: {run_date}, batch: {batch_size}, env: {source_env}")

run_dt = datetime.strptime(run_date, "%Y-%m-%d")
prev_date = (run_dt - timedelta(days=1)).strftime("%Y-%m-%d")

df = spark.sql(f"""
    SELECT * FROM silver_lakehouse.orders
    WHERE order_date = '{run_date}'
""")
```

### Pass Parameters via Data Pipeline

In a Fabric Data Pipeline, add a Notebook activity:
1. Set the notebook reference.
2. Under **Base parameters**, add key-value pairs.
3. Values can reference pipeline expressions: `@formatDateTime(pipeline().TriggerTime, 'yyyy-MM-dd')`.

---

## mssparkutils API

`mssparkutils` is Microsoft's built-in utility library for Fabric and Synapse notebooks.

```python
import notebookutils.mssparkutils as mssparkutils
# Or simply: mssparkutils is pre-imported in Fabric notebooks
```

### File System Operations

```python
# List files in a lakehouse Files/ folder
files = mssparkutils.fs.ls("Files/landing")
for f in files:
    print(f.name, f.size, f.modifyTime)

# Copy a file
mssparkutils.fs.cp(
    "Files/landing/orders.csv",
    "Files/archive/orders_2025-03-01.csv",
    recurse=False
)

# Move a file
mssparkutils.fs.mv("Files/landing/orders.csv", "Files/processed/orders.csv")

# Delete a file or directory
mssparkutils.fs.rm("Files/temp", recurse=True)

# Create a directory
mssparkutils.fs.mkdirs("Files/exports/2025/03/01")

# Read file content (small text files only)
content = mssparkutils.fs.head("Files/config/settings.json", maxBytes=4096)
```

### Notebook Utilities

```python
# Run another notebook and pass parameters
result = mssparkutils.notebook.run(
    "transform-orders",
    timeoutSeconds=1800,
    arguments={
        "run_date":   "2025-03-01",
        "batch_size": "500"
    }
)
print(f"Sub-notebook result: {result}")

# Exit the current notebook with a return value
mssparkutils.notebook.exit("COMPLETED: 1234 rows processed")
```

### Secret Management

```python
# Get a secret from Azure Key Vault linked service
# (Requires a Fabric connection to Key Vault)
secret = mssparkutils.credentials.getSecret(
    "https://my-keyvault.vault.azure.net/",
    "my-secret-name"
)

# Get an Entra ID token for a resource
token = mssparkutils.credentials.getToken("https://storage.azure.com/")
```

### Environment Information

```python
# Get Fabric context (workspace, item)
context = mssparkutils.env.getUserName()
print(context)

# Get workspace ID
ws_id = spark.conf.get("trident.workspace.id")
lh_id = spark.conf.get("trident.lakehouse.id")
print(f"Workspace: {ws_id}, Lakehouse: {lh_id}")
```

---

## Cross-Lakehouse Access Patterns

### Option 1: Spark SQL Three-Part Name

```python
# Works within the same Fabric workspace
df = spark.sql("SELECT * FROM gold_lakehouse.dim_customers WHERE is_active = true")

# Join across lakehouses in the same workspace
df = spark.sql("""
    SELECT o.order_id, o.total_amount, c.customer_name, c.segment
    FROM silver_lakehouse.orders o
    JOIN gold_lakehouse.dim_customers c ON o.customer_id = c.customer_id
    WHERE o.order_date >= '2025-01-01'
""")
```

### Option 2: Explicit ABFSS Path

```python
# Cross-workspace access via explicit path
df = spark.read.format("delta").load(
    "abfss://other-workspace@onelake.dfs.fabric.microsoft.com/gold-lakehouse.Lakehouse/Tables/dim_customers"
)
```

### Option 3: Add Lakehouse to Notebook

Notebooks can have multiple lakehouses attached. Adding a lakehouse via the notebook toolbar makes its tables visible in SparkSQL without needing explicit paths.

```python
# After adding second lakehouse via notebook UI toolbar
# Tables from both lakehouses are queryable by name
df = spark.sql("""
    SELECT * FROM shared_dimensions.dim_products WHERE is_active = true
""")
```

### Option 4: OneLake Shortcuts

Create a shortcut from the target lakehouse pointing to source tables. The shortcut appears as a local folder, accessible via simple path or SQL name.

---

## Notebook Scheduling

Notebooks can be scheduled directly without a pipeline.

1. In the notebook editor, click **Schedule**.
2. Set frequency (hourly, daily, weekly) and start time.
3. Optionally add parameters as key-value pairs.
4. The schedule runs with the current user's identity — use a service principal identity if user tokens should not be used for production.

**Note**: For complex dependencies or error handling, prefer Data Pipeline over built-in notebook scheduling.

---

## Error Codes Table

| Error | Meaning | Remediation |
|-------|---------|-------------|
| `Py4JJavaError: SparkException: Job aborted due to stage failure` | Spark stage failed, usually OOM or corrupt data | Increase executor memory; check input data for nulls or bad types |
| `AnalysisException: Table or view not found` | Lakehouse not attached or table name wrong | Add lakehouse to notebook; verify table name with `SHOW TABLES` |
| `AnalysisException: Resolved attribute(s) missing from child` | Column name mismatch in complex queries | Use explicit column aliases and fully-qualified names |
| `TimeoutException: Notebook run timed out` | API-triggered run exceeded timeout | Increase `timeoutSeconds` or split notebook into smaller steps |
| `mssparkutils.fs: Access denied` | Notebook identity lacks permission on target lakehouse | Grant Viewer + ReadAll on the target item or use cross-workspace shortcut |
| `%%configure: Cannot configure an active Spark session` | `%%configure` not in the first cell | Move `%%configure` to the first cell and restart the session |
| `ModuleNotFoundError` after `%%pip install` | Library installed on driver but not workers | Use a custom Fabric environment for worker-side dependencies |
| `java.lang.OutOfMemoryError: GC overhead limit exceeded` | JVM heap exhausted | Increase `spark.executor.memory`; use aggregation before `.toPandas()` |
| HTTP 400 on notebook run API | Invalid parameter types in `executionData` | Verify parameter value types match declared types (`string`, `int`, `bool`, `float`) |
| HTTP 429 on notebook API | Request rate limit exceeded | Implement exponential backoff; reduce polling frequency to every 10 s |

---

## Throttling / Limits Table

| Resource | Limit | Notes |
|----------|-------|-------|
| Concurrent Spark sessions per workspace | Varies by SKU (F2: ~2, F16: ~8, F64: ~20) | Sessions queue when limit is reached |
| Notebook cell output size | 2 MB per cell display | Use `display(df.limit(100))` instead of full DataFrames |
| Spark executor memory max | Depends on SKU node size | F2 nodes: 14 GB RAM; F64 nodes: up to 112 GB |
| `%%pip` install timeout | 300 seconds | Pre-install large packages in a custom environment |
| Notebook parameter count | 50 parameters per run | Consolidate parameters into a JSON string parameter if needed |
| `mssparkutils.notebook.run` timeout | Max 3600 seconds | Split long-running sub-notebooks or use pipelines |
| Fabric API job instance poll | 1 request/second recommended | Too-frequent polling triggers 429 responses |
| Notebook file size | 100 MB | Large notebooks with embedded outputs slow the editor |

---

## Common Patterns and Gotchas

### Gotcha: toPandas() on Large DataFrames

`toPandas()` collects the entire distributed DataFrame to the driver. For tables larger than driver memory (~4–8 GB on small SKUs), this causes OOM errors.

**Solution**: Aggregate or sample before collecting.

```python
# Bad: full table to driver
df_pd = spark.sql("SELECT * FROM silver_lakehouse.orders").toPandas()

# Good: aggregate first
df_pd = spark.sql("""
    SELECT order_date, SUM(total_amount) AS daily_revenue
    FROM silver_lakehouse.orders
    GROUP BY order_date
""").toPandas()

# Good: sample for exploration
df_pd = spark.sql("SELECT * FROM silver_lakehouse.orders").sample(fraction=0.01).toPandas()
```

### Gotcha: Shuffle Partitions Default

Default `spark.sql.shuffle.partitions = 200` is designed for large clusters. On small Fabric capacities (F2, F4), this creates 200 small shuffle partitions causing excessive task overhead.

**Solution**: Reduce to 2–4× the executor count.

```python
spark.conf.set("spark.sql.shuffle.partitions", "40")
spark.conf.set("spark.sql.adaptive.enabled", "true")
spark.conf.set("spark.sql.adaptive.coalescePartitions.enabled", "true")
```

### Pattern: Reusable Notebook as a Module

```python
# In helpers.py (stored in Files/libs/)
# Loaded by other notebooks via:
import importlib.util, sys

spec = importlib.util.spec_from_file_location(
    "helpers",
    "/lakehouse/default/Files/libs/helpers.py"
)
mod = importlib.util.module_from_spec(spec)
sys.modules["helpers"] = mod
spec.loader.exec_module(mod)

from helpers import run_quality_checks
```

### Pattern: Structured Logging from Notebooks

```python
import logging, json
from datetime import datetime

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

def log_event(event_type, details):
    msg = json.dumps({
        "timestamp": datetime.utcnow().isoformat(),
        "event_type": event_type,
        **details
    })
    logger.info(msg)

log_event("load_started", {"table": "silver_lakehouse.orders", "run_date": run_date})
df.write.format("delta").mode("append").saveAsTable("silver_lakehouse.orders")
log_event("load_completed", {"table": "silver_lakehouse.orders", "rows": df.count()})
```
