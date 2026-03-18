---
name: lakehouse-optimize
description: "Run comprehensive lakehouse optimization — table compaction, Z-ordering, vacuum, file statistics, and health scoring"
argument-hint: "<lakehouse-name> [--tables <table1,table2>] [--zorder <col1,col2>] [--vacuum-days <days>] [--report]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - AskUserQuestion
---

# Optimize a Fabric Lakehouse

Run comprehensive optimization on a lakehouse: compact small files, apply Z-ordering, vacuum old versions, analyze file health, and generate a maintenance report.

## Instructions

### 1. Validate Inputs

- `<lakehouse-name>` — Target lakehouse. Ask if not provided.
- `--tables` — Comma-separated table names to optimize. Default: all tables.
- `--zorder` — Columns for Z-ORDER (applied to all tables, or per-table with `table:col1,col2` syntax).
- `--vacuum-days` — Retention period for VACUUM (minimum 7). Default: 14.
- `--report` — Generate a detailed health report after optimization.

### 2. Pre-Optimization Assessment

Before optimizing, assess each table:

```python
def assess_table(table_name):
    detail = spark.sql(f"DESCRIBE DETAIL {table_name}").collect()[0]
    return {
        "table": table_name,
        "num_files": detail["numFiles"],
        "size_bytes": detail["sizeInBytes"],
        "size_gb": round(detail["sizeInBytes"] / (1024**3), 3),
        "avg_file_size_mb": round(detail["sizeInBytes"] / max(detail["numFiles"], 1) / (1024**2), 1),
        "partitions": detail["partitionColumns"],
        "recommendations": []
    }
```

Generate recommendations:
- **Too many small files** (avg < 50 MB, > 100 files): Recommend OPTIMIZE
- **Very large files** (avg > 2 GB): Recommend repartition
- **No recent OPTIMIZE**: Check history, recommend if last optimize > 7 days ago
- **Z-ORDER candidates**: Suggest columns based on partition columns and common filter patterns
- **VACUUM overdue**: Check if vacuum hasn't run in > 14 days

### 3. Run Optimization

For each table:

**Step 1: OPTIMIZE** (compact small files)
```sql
OPTIMIZE <table_name>;
-- With Z-ORDER if specified:
OPTIMIZE <table_name> ZORDER BY (<columns>);
```

**Step 2: VACUUM** (remove old versions)
```sql
VACUUM <table_name> RETAIN <vacuum_days> DAYS;
```

**Step 3: ANALYZE** (update statistics)
```sql
ANALYZE TABLE <table_name> COMPUTE STATISTICS FOR ALL COLUMNS;
```

### 4. Post-Optimization Assessment

Re-assess each table and compare before/after:
- File count reduction
- Average file size improvement
- Storage freed by vacuum
- Time taken per operation

### 5. Health Report (when --report)

Generate a comprehensive report:

```
## Lakehouse Health Report: <lakehouse-name>
Generated: <timestamp>

### Overall Health Score: <score>/100

| Table | Files Before | Files After | Size (GB) | Avg File (MB) | Z-Ordered | Score |
|-------|-------------|-------------|-----------|---------------|-----------|-------|
| orders | 1,247 | 48 | 12.3 | 262 | ✓ date,region | 95/100 |
| customers | 89 | 12 | 1.8 | 153 | ✗ | 80/100 |

### Recommendations
- [ ] Add Z-ORDER on customers(customer_type, region) — frequent filter columns
- [ ] Schedule weekly maintenance notebook
- [ ] Consider partitioning orders by order_date (12.3 GB)

### Storage Summary
- Total size: 14.1 GB across 2 tables
- Storage freed by VACUUM: 2.3 GB
- File count reduced: 1,336 → 60 (95.5% reduction)
```

### 6. Generate Maintenance Notebook

Create a reusable maintenance notebook that can be scheduled:
- Runs OPTIMIZE + VACUUM on all tables
- Configurable Z-ORDER per table
- Logs results to a `_metadata.maintenance_log` table
- Alerts if any table health score drops below threshold

### 7. Display Summary

Show:
- Tables optimized with before/after metrics
- Storage freed
- Z-ORDER columns applied
- Health scores
- Maintenance notebook location
- Recommended schedule (weekly for most workloads)
