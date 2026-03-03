# Performance Optimization

## Overview

Fabric Data Engineering performance involves tuning Spark execution (executor sizing, memory, partitioning), Delta table layout (OPTIMIZE, ZORDER, V-Order), and managing Fabric capacity unit (CU) consumption. This reference covers executor and memory configuration, partition strategies, Delta table optimization, V-Order for Direct Lake, CU consumption tracking, and caching strategies.

---

## Spark Executor and Memory Configuration

Fabric Spark nodes are provisioned based on workspace capacity SKU. Executor sizing must match the node pool.

### Node Sizes by Fabric SKU

| Fabric SKU | CUs | Executor vCores | Executor Memory | Max Executors (approx.) |
|-----------|-----|----------------|----------------|------------------------|
| F2        | 2   | 4              | 14 GB          | 1                      |
| F4        | 4   | 4              | 14 GB          | 2                      |
| F8        | 8   | 8              | 28 GB          | 3                      |
| F16       | 16  | 8              | 56 GB          | 5                      |
| F32       | 32  | 16             | 112 GB         | 8                      |
| F64       | 64  | 16             | 112 GB         | 18                     |

### Optimal Session Configuration

```python
# For F8 workspaces — medium workloads
spark.conf.set("spark.executor.memory",                    "24g")
spark.conf.set("spark.executor.cores",                     "4")
spark.conf.set("spark.driver.memory",                      "8g")
spark.conf.set("spark.sql.shuffle.partitions",             "200")
spark.conf.set("spark.sql.adaptive.enabled",               "true")
spark.conf.set("spark.sql.adaptive.coalescePartitions.enabled", "true")
spark.conf.set("spark.sql.adaptive.skewJoin.enabled",      "true")
spark.conf.set("spark.sql.broadcastTimeout",               "600")
spark.conf.set("spark.serializer",                         "org.apache.spark.serializer.KryoSerializer")
```

### %%configure for Cluster-Level Settings

```json
%%configure -f
{
  "conf": {
    "spark.executor.memory":                         "24g",
    "spark.executor.cores":                          "4",
    "spark.executor.instances":                      "3",
    "spark.driver.memory":                           "8g",
    "spark.driver.cores":                            "4",
    "spark.sql.shuffle.partitions":                  "200",
    "spark.sql.adaptive.enabled":                    "true",
    "spark.sql.adaptive.coalescePartitions.enabled": "true",
    "spark.sql.adaptive.skewJoin.enabled":           "true",
    "spark.sql.parquet.vorder.enabled":              "true",
    "spark.microsoft.delta.optimizeWrite.enabled":   "true"
  }
}
```

### Adaptive Query Execution (AQE)

AQE is enabled by default in Fabric. It dynamically re-plans queries at runtime based on actual data statistics.

```python
# Enable AQE features
spark.conf.set("spark.sql.adaptive.enabled",                        "true")
spark.conf.set("spark.sql.adaptive.coalescePartitions.enabled",     "true")
spark.conf.set("spark.sql.adaptive.coalescePartitions.minPartitionNum", "1")
spark.conf.set("spark.sql.adaptive.advisoryPartitionSizeInBytes",   "134217728")  # 128 MB
spark.conf.set("spark.sql.adaptive.skewJoin.enabled",               "true")
spark.conf.set("spark.sql.adaptive.skewJoin.skewedPartitionFactor", "5")
spark.conf.set("spark.sql.adaptive.skewJoin.skewedPartitionThresholdInBytes", "268435456")  # 256 MB
```

---

## Partition Strategies

### Partition Column Selection

| Pattern | Partition Key | Reason |
|---------|--------------|--------|
| Event/transaction data | Date (`order_date`, `event_date`) | Most queries filter by date range |
| Reference/dimension data | No partitioning | Small tables; overhead not worth it |
| Multi-region data | Region + Date | Region queries dominate |
| Log data | Year-Month | Avoid too many partitions; month granularity safer |

### Checking and Adjusting Partitions

```python
# Check current partition count after reading
df = spark.read.format("delta").load("Tables/cleaned_orders")
print(f"Partition count: {df.rdd.getNumPartitions()}")

# Repartition for better parallelism
df_repartitioned = df.repartition(200, "order_date")

# Coalesce to reduce small partitions (shuffle-free)
df_coalesced = df.coalesce(50)

# Check partition sizes (approximate)
df.groupBy(F.spark_partition_id()).count().orderBy("count", ascending=False).show(20)
```

### Avoid Partition Over-Skew

Data skew occurs when one partition contains far more rows than others (e.g., all orders from a single large customer dominate a customer-partitioned table).

```python
# Detect skew
df.groupBy("customer_id").count() \
  .orderBy(F.col("count").desc()) \
  .limit(20).show()

# Salting to break skew
import random
SALT_BUCKETS = 10
df_salted = df.withColumn("salt", (F.rand() * SALT_BUCKETS).cast("int"))
df_salted = df_salted.repartition(200, "salt")

# Or use AQE skew handling (automatic — just enable it)
spark.conf.set("spark.sql.adaptive.skewJoin.enabled", "true")
```

---

## Delta Table Optimization

### OPTIMIZE with Z-Ordering

OPTIMIZE compacts small files and Z-ORDER clusters data within each file by specified columns.

```python
# Basic compaction
spark.sql("OPTIMIZE silver_lakehouse.cleaned_orders")

# Z-ORDER by most common filter columns (after partition key)
spark.sql("OPTIMIZE silver_lakehouse.cleaned_orders ZORDER BY (customer_id, product_id)")

# OPTIMIZE a specific partition
spark.sql("OPTIMIZE silver_lakehouse.cleaned_orders WHERE order_date = '2025-03-01'")
```

### OPTIMIZE Scheduling Recommendations

| Table size | Frequency |
|-----------|-----------|
| < 10 GB   | Weekly    |
| 10–100 GB | Daily     |
| > 100 GB  | After each major load or at off-peak |

### Auto-Optimize Properties

```python
# Enable auto-optimize on write (avoids small files from incremental appends)
spark.sql("""
    ALTER TABLE silver_lakehouse.cleaned_orders SET TBLPROPERTIES (
        'delta.autoOptimize.optimizeWrite' = 'true',
        'delta.autoOptimize.autoCompact'   = 'true'
    )
""")
```

### VACUUM for Storage Reclamation

```python
# Check which files would be removed (dry run)
spark.sql("VACUUM silver_lakehouse.cleaned_orders RETAIN 168 HOURS DRY RUN")

# Execute VACUUM
spark.sql("VACUUM silver_lakehouse.cleaned_orders RETAIN 168 HOURS")

# Shortened retention (testing only)
spark.conf.set("spark.databricks.delta.retentionDurationCheck.enabled", "false")
spark.sql("VACUUM silver_lakehouse.cleaned_orders RETAIN 24 HOURS")
spark.conf.set("spark.databricks.delta.retentionDurationCheck.enabled", "true")
```

---

## V-Order for Direct Lake

V-Order is a Fabric-specific Parquet optimization that reorders data within row groups for maximum compression and Direct Lake read speed.

```python
# Enable globally for session
spark.conf.set("spark.sql.parquet.vorder.enabled", "true")

# Enable per-write
df.write \
    .format("delta") \
    .option("parquet.vorder.enabled", "true") \
    .mode("overwrite") \
    .saveAsTable("gold_lakehouse.fact_daily_sales")

# Apply V-Order to existing table (OPTIMIZE with VORDER)
spark.sql("OPTIMIZE gold_lakehouse.fact_daily_sales VORDER")

# Verify V-Order applied (check Parquet file metadata)
spark.sql("DESCRIBE DETAIL gold_lakehouse.fact_daily_sales") \
     .select("name", "numFiles", "sizeInBytes") \
     .show(truncate=False)
```

### V-Order Impact by Table Type

| Table Type | V-Order Benefit | Recommendation |
|-----------|----------------|----------------|
| Wide fact tables (50+ columns) | 30–50% faster Direct Lake | Always apply |
| Narrow dimension tables | 10–20% faster | Apply |
| JSON/blob/unstructured | N/A | Not applicable |
| Streaming micro-batch tables | Apply in periodic OPTIMIZE | Not on every write (overhead) |

---

## Fabric Capacity Units (CU) Consumption

### CU Consumption Sources

| Operation | CU Consumption | Notes |
|-----------|---------------|-------|
| Spark notebook (active session) | Continuous while session is alive | End sessions promptly; use `%%configure` to right-size |
| Delta OPTIMIZE | High (file rewrite) | Schedule off-peak |
| Delta VACUUM | Low (file deletion) | Low impact |
| Data pipeline Copy activity | Per-activity billing | Parallelism increases throughput but also CU cost |
| Dataflow Gen2 refresh | Per-row processed | Incremental refresh reduces CU |
| Direct Lake query | Shared with warehouse CUs | Heavy BI queries compete with ETL |

### Monitoring CU Consumption

```python
# Install and use the Fabric Capacity Metrics app (Power BI)
# Or query the monitoring REST API:
import requests

TOKEN = "..."  # Bearer token for Fabric API
resp = requests.get(
    "https://api.fabric.microsoft.com/v1/capacities/<capacity-id>/workloads",
    headers={"Authorization": f"Bearer {TOKEN}"}
)
print(resp.json())
```

### Reducing CU Consumption

```python
# 1. Stop Spark sessions when done
spark.stop()

# 2. Use the right-sized session
%%configure -f
{"conf": {"spark.executor.instances": "2", "spark.executor.memory": "8g"}}

# 3. Limit concurrent sessions
# Set max concurrent Spark sessions via Fabric Admin Portal > Capacity settings

# 4. Avoid full table scans — use partition pruning
# Bad:
df = spark.sql("SELECT * FROM silver_lakehouse.orders WHERE YEAR(order_date) = 2025")
# Good:
df = spark.sql("SELECT * FROM silver_lakehouse.orders WHERE order_date BETWEEN '2025-01-01' AND '2025-12-31'")

# 5. Cache hot DataFrames
df.cache()
df.count()  # Trigger caching
# ... multiple operations on df ...
df.unpersist()
```

---

## Caching Strategies

### Spark DataFrame Caching

```python
from pyspark import StorageLevel

# Default cache (memory + disk spill)
df.cache()

# Explicit storage level
df.persist(StorageLevel.MEMORY_AND_DISK)
df.persist(StorageLevel.DISK_ONLY)  # For DataFrames too large for memory

# Trigger cache population
df.count()

# Verify caching
print(df.storageLevel)

# Release cache
df.unpersist()
```

### When to Cache

```python
# Cache when: same DataFrame is read >2 times in a notebook
dim_customers = spark.sql("SELECT * FROM gold_lakehouse.dim_customers").cache()
dim_customers.count()  # materialize

# Join dim_customers multiple times
fact_orders = spark.sql("SELECT * FROM silver_lakehouse.orders").join(dim_customers, "customer_id")
fact_revenue = spark.sql("SELECT * FROM silver_lakehouse.revenue").join(dim_customers, "customer_id")

dim_customers.unpersist()  # Release when done
```

### Delta Caching (OneLake Caching)

Delta caching in Fabric operates at the OneLake storage layer and caches frequently accessed Parquet file data close to compute. This is automatic and does not require code changes.

Enable at the lakehouse item level:
1. Open the lakehouse in the Fabric portal.
2. Go to Settings > OneLake caching.
3. Enable caching (on by default for lakehouses with Direct Lake).

---

## Broadcast Joins

For small dimension tables (< 10 MB), use broadcast joins to eliminate shuffle.

```python
from pyspark.sql import functions as F

# Explicit broadcast hint
result = orders.join(
    F.broadcast(dim_products),
    "product_id"
)

# Auto-broadcast threshold (adjust for larger dims)
spark.conf.set("spark.sql.autoBroadcastJoinThreshold", str(50 * 1024 * 1024))  # 50 MB

# Check if broadcast was used in the query plan
result.explain(True)
```

---

## Data Skipping and File Statistics

Delta collects min/max statistics per column per file. Queries with selective predicates skip irrelevant files automatically.

```python
# Ensure statistics are collected (default: first 32 columns)
spark.sql("""
    ALTER TABLE silver_lakehouse.orders SET TBLPROPERTIES (
        'delta.dataSkippingNumIndexedCols' = '64'
    )
""")

# Verify statistics collection
spark.sql("DESCRIBE DETAIL silver_lakehouse.orders").show(truncate=False)

# Force statistics collection after bulk load
spark.sql("ANALYZE TABLE silver_lakehouse.orders COMPUTE STATISTICS FOR ALL COLUMNS")
```

---

## Error Codes Table

| Error | Meaning | Remediation |
|-------|---------|-------------|
| `java.lang.OutOfMemoryError: GC overhead` | JVM heap exhausted | Increase `spark.executor.memory`; reduce `spark.sql.shuffle.partitions` |
| `org.apache.spark.shuffle.FetchFailedException` | Shuffle read failed (often OOM on executor) | Increase executor memory; enable AQE coalesce |
| `TaskKilledException` | Executor killed (OOM or preemption) | Add memory overhead: `spark.executor.memoryOverhead=4g` |
| `SparkException: Job aborted due to stage failure` | One or more tasks failed permanently | Check task logs for root cause; reduce partition size |
| `OPTIMIZE failed: cannot lock table` | Concurrent OPTIMIZE or write on same table | Schedule OPTIMIZE when no writers are active |
| `Cannot broadcast the DataFrame: data exceeds threshold` | Broadcast join target too large | Increase `spark.sql.autoBroadcastJoinThreshold` or remove broadcast hint |
| `DeltaNotATableException` | Path not a Delta table | Verify path; check `Tables/` folder naming in lakehouse |
| `ConcurrentDeleteReadException` | VACUUM ran while read query was active | Increase VACUUM retention; schedule VACUUM at off-peak |

---

## Throttling / Limits Table

| Resource | Limit | Notes |
|----------|-------|-------|
| Spark executor memory max | Node pool size (up to 112 GB on F64) | Cannot exceed physical node memory |
| Shuffle partitions practical max | 2000 | More partitions = more task overhead |
| Broadcast join auto-threshold | 10 MB (default) | Configurable up to ~2 GB with care |
| Delta file statistics indexed columns | 32 (default), max 64 | More indexed columns = more metadata overhead on write |
| OPTIMIZE target file size | 256 MB (Fabric default) | Configurable via `delta.targetFileSize` property |
| CU smoothing window | 24 hours | CU spikes are smoothed; throttling applies to sustained overages |
| OneLake cache size | Managed by Fabric | No user-configurable limit; Fabric evicts based on LRU |
| Direct Lake frame size | Determined by semantic model size and SKU | Larger models require higher capacity SKU |

---

## Common Patterns and Gotchas

### Gotcha: Default Shuffle Partitions on Small Capacities

200 shuffle partitions on an F2 (1 executor) creates massive task scheduling overhead. Set `spark.sql.shuffle.partitions` to 2–4× the available executor cores.

```python
# For F2/F4 (4 cores total)
spark.conf.set("spark.sql.shuffle.partitions", "16")
```

### Gotcha: Reading Delta History Bloat

`DESCRIBE HISTORY` on a table with many small commits (e.g., streaming) returns thousands of rows and can be slow. Checkpoint files (`_delta_log/XXXXXXXXXXXX.checkpoint.parquet`) are created every 10 commits automatically; ensure they are not deleted by VACUUM.

### Pattern: Benchmark Query Before and After OPTIMIZE

```python
import time

def benchmark(spark, query, label):
    spark.sql("CLEAR CACHE")
    start = time.time()
    spark.sql(query).count()
    elapsed = time.time() - start
    print(f"[{label}] {elapsed:.2f}s")

benchmark(spark, "SELECT COUNT(*) FROM silver_lakehouse.orders WHERE customer_id = 'CUST-001234'", "Before OPTIMIZE")
spark.sql("OPTIMIZE silver_lakehouse.orders ZORDER BY (customer_id)")
benchmark(spark, "SELECT COUNT(*) FROM silver_lakehouse.orders WHERE customer_id = 'CUST-001234'", "After OPTIMIZE")
```

### Pattern: Memory-Efficient Large Dataset Processing

```python
# Process in date chunks instead of all at once
from datetime import date, timedelta

start = date(2025, 1, 1)
end   = date(2025, 3, 1)
delta = timedelta(days=7)  # weekly chunks

current = start
while current < end:
    chunk_end = min(current + delta, end)
    chunk_df = spark.sql(f"""
        SELECT * FROM bronze_lakehouse.raw_orders
        WHERE order_date >= '{current}' AND order_date < '{chunk_end}'
    """)
    # Process chunk
    chunk_df.write.format("delta").mode("append").saveAsTable("silver_lakehouse.cleaned_orders")
    chunk_df.unpersist()
    current = chunk_end
    print(f"Processed through {chunk_end}")
```
