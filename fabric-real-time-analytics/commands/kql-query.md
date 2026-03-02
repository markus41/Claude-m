---
name: kql-query
description: "Generate and run KQL queries — explore data, aggregate metrics, detect anomalies, build time series"
argument-hint: "<description> [--table <table-name>] [--timerange <1h|24h|7d|30d>] [--anomaly] [--forecast]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - AskUserQuestion
---

# Generate and Run KQL Queries

Create KQL queries from natural-language descriptions, with support for time series analysis, anomaly detection, and forecasting.

## Instructions

### 1. Parse the Request

- `<description>` — What the user wants to query (e.g., "average temperature per device in the last hour"). Ask if not provided.
- `--table` — Target table name. If not provided, list available tables and ask.
- `--timerange` — Time range filter: `1h`, `6h`, `24h`, `7d`, `30d`. Default: `24h`.
- `--anomaly` — Include anomaly detection using `series_decompose_anomalies`.
- `--forecast` — Include forecasting using `series_decompose_forecast`.

### 2. Discover Table Schema

If the user has not specified a table or schema details, attempt to discover:

```kql
.show tables

.show table <TableName> schema as json
```

Use the schema to understand available columns and their types.

### 3. Build the KQL Query

Based on the description and schema, construct the query following these rules:

**Query construction order**:
1. Start with the table name.
2. Apply `where` filters (always include a time filter first).
3. Apply `extend` for computed columns.
4. Apply `summarize` for aggregations.
5. Apply `sort by` or `top` for ordering.
6. Apply `project` to select output columns.
7. Apply `render` for visualization (if applicable).

**Common query patterns**:
| User intent | KQL pattern |
|------------|-------------|
| "Show recent events" | `where Timestamp > ago(1h) | take 100` |
| "Count by category" | `summarize count() by Category` |
| "Average over time" | `summarize avg(Value) by bin(Timestamp, 1h) | render timechart` |
| "Top N" | `top 10 by Value desc` |
| "Unique values" | `distinct ColumnName` |
| "Percentiles" | `summarize percentile(Duration, 95) by bin(Timestamp, 5m)` |
| "Parse JSON" | `extend Field = parse_json(RawData).fieldName` |
| "Join tables" | `join kind=inner Table2 on KeyColumn` |
| "Sessionize" | `sort by UserId, Timestamp | extend Gap = ...` |

### 4. Add Anomaly Detection (when --anomaly)

Wrap the base query with `make-series` and `series_decompose_anomalies`:

```kql
<base aggregation>
| make-series MetricSeries = avg(Metric) default=real(null)
    on Timestamp from ago(<timerange>) to now() step <step>
    by <groupby>
| extend (anomalies, score, baseline) = series_decompose_anomalies(MetricSeries, 1.5)
| mv-expand Timestamp to typeof(datetime), MetricSeries to typeof(real),
            anomalies to typeof(int), score to typeof(real), baseline to typeof(real)
| where anomalies != 0
```

Choose the step size based on the time range:
| Time range | Step |
|-----------|------|
| 1h | 1m |
| 6h | 5m |
| 24h | 15m |
| 7d | 1h |
| 30d | 6h |

### 5. Add Forecasting (when --forecast)

Extend the time range into the future and apply `series_decompose_forecast`:

```kql
<base aggregation>
| make-series MetricSeries = avg(Metric)
    on Timestamp from ago(<timerange>) to now() + <forecast_period> step <step>
| extend forecast = series_decompose_forecast(MetricSeries, <forecast_points>)
| render timechart
```

Forecast period is typically 1/4 of the lookback time range.

### 6. Execute and Display

Option A: Display the KQL query for the user to run in the Fabric KQL queryset.

Option B: If SDK connectivity is configured (`.env` has `EVENTHOUSE_URI`), execute via the Kusto SDK:

```typescript
import { Client, KustoConnectionStringBuilder } from "azure-kusto-data";
import { DefaultAzureCredential } from "@azure/identity";

const kcsb = KustoConnectionStringBuilder.withTokenCredential(
  process.env.EVENTHOUSE_URI!,
  new DefaultAzureCredential()
);
const client = new Client(kcsb);
const result = await client.execute(process.env.KQL_DATABASE_NAME!, `<generated-query>`);
console.table(result.primaryResults[0].toJSON().data);
```

### 7. Output

Show the user:
- The generated KQL query with syntax highlighting.
- Explanation of what the query does (step by step through the pipeline).
- Visualization recommendation (`render timechart`, `render barchart`, etc.).
- If anomalies or forecasting were used, explain how to interpret the results.
- Suggestions for follow-up queries based on the results.
