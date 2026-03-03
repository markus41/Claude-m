# KQL Query Patterns — Time Series, Anomaly Detection, Joins, and Materialized Views

This reference provides production-ready KQL (Kusto Query Language) patterns for Microsoft Fabric Real-Time Analytics. Covers time-series analysis, statistical functions, anomaly detection, multi-table joins, aggregation patterns, performance optimization, and materialized view design.

---

## KQL Fundamentals

### Query Structure

```kql
// Standard tabular expression pipeline: source | operator1 | operator2 | ...
TableName
| where Timestamp > ago(1h)            // Filter rows
| where DeviceId startswith "MCH-"     // Additional filter
| project Timestamp, DeviceId, Temp    // Select columns
| extend TempF = Temp * 1.8 + 32      // Computed column
| summarize AvgTemp = avg(TempF) by DeviceId, bin(Timestamp, 5m)
| order by Timestamp desc
| take 1000                            // Limit output (ALWAYS use in ad-hoc queries)
```

### Time Range Operators

| Expression | Meaning |
|-----------|---------|
| `ago(1h)` | 1 hour ago from now |
| `ago(7d)` | 7 days ago |
| `now()` | Current UTC time |
| `startofday(now())` | Midnight UTC today |
| `startofweek(now())` | Start of current week (Monday) |
| `startofmonth(now())` | First day of current month |
| `startofyear(now())` | January 1 of current year |
| `between(ago(7d) .. ago(1d))` | Between 7 and 1 day ago |

### Data Types

| KQL Type | Description | Literal Example |
|----------|-------------|-----------------|
| `datetime` | UTC timestamp | `datetime(2025-03-15T14:30:00Z)` |
| `timespan` | Duration | `1h`, `30m`, `7d`, `timespan(00:05:00)` |
| `string` | Unicode text | `"hello"` |
| `long` | 64-bit integer | `42L` |
| `real` | Double-precision float | `3.14` |
| `bool` | Boolean | `true`, `false` |
| `dynamic` | JSON-like variant | `dynamic({"key":"val"})` |
| `guid` | UUID | `guid(null)` |

---

## Time-Series Analysis

### Basic Time Binning

```kql
// Count events per 5-minute window
DeviceTelemetry
| where Timestamp > ago(24h)
| summarize EventCount = count() by bin(Timestamp, 5m)
| order by Timestamp asc
| render timechart
```

### Multi-Series with make_series

`make_series` creates evenly spaced time series arrays — required for statistical functions like `series_decompose_anomalies`.

```kql
// Create time series per device — 1-hour bins over 7 days
let StartTime = ago(7d);
let EndTime = now();
let BinSize = 1h;
DeviceTelemetry
| where Timestamp between (StartTime .. EndTime)
| make-series AvgTemp = avg(Temperature) default = real(null)
    on Timestamp from StartTime to EndTime step BinSize
    by DeviceId
| render timechart
```

### Filling Gaps in Time Series

```kql
// Fill gaps with previous value (forward fill)
DeviceTelemetry
| where Timestamp > ago(24h)
| make-series AvgTemp = avg(Temperature) default = real(null)
    on Timestamp from ago(24h) to now() step 5m
    by DeviceId
| extend FilledTemp = series_fill_forward(AvgTemp)
```

### Moving Average

```kql
// 5-point moving average (smoothing)
DeviceTelemetry
| where Timestamp > ago(24h)
| make-series AvgTemp = avg(Temperature) default = real(null)
    on Timestamp from ago(24h) to now() step 5m
    by DeviceId
| extend SmoothedTemp = series_moving_avg(AvgTemp, 5)
| mv-expand Timestamp, AvgTemp, SmoothedTemp
| project Timestamp = todatetime(Timestamp), AvgTemp = toreal(AvgTemp), SmoothedTemp = toreal(SmoothedTemp), DeviceId
```

### Rate of Change (Derivative)

```kql
// Detect rapid temperature increases (derivative)
DeviceTelemetry
| where Timestamp > ago(6h)
| make-series Temp = avg(Temperature) default = real(null)
    on Timestamp from ago(6h) to now() step 1m
    by DeviceId
| extend TempDerivative = series_iir(Temp, dynamic([1,-1]), dynamic([1]))
| mv-expand Timestamp, Temp, TempDerivative
| project Timestamp = todatetime(Timestamp), DeviceId,
          Temp = toreal(Temp), RatePerMin = toreal(TempDerivative)
| where RatePerMin > 2   // Rising more than 2 degrees per minute
```

---

## Anomaly Detection

### Basic Anomaly Detection

```kql
// Detect anomalies in temperature — 3-sigma threshold
DeviceTelemetry
| where Timestamp > ago(7d)
| make-series Temp = avg(Temperature) default = real(null)
    on Timestamp from ago(7d) to now() step 10m
    by DeviceId
| extend AnomalyFlags = series_decompose_anomalies(Temp, 1.5)
| mv-expand Timestamp, Temp, AnomalyFlags
| where tolong(AnomalyFlags) != 0
| project Timestamp = todatetime(Timestamp), DeviceId,
          Temperature = toreal(Temp), AnomalyScore = tolong(AnomalyFlags)
| order by Timestamp desc
```

**AnomalyScore values**:
| Value | Meaning |
|-------|---------|
| `1` | Positive anomaly (spike) |
| `-1` | Negative anomaly (dip) |
| `0` | Normal |

### Decomposition with Seasonality

```kql
// Decompose time series into trend, seasonality, and residual
DeviceTelemetry
| where Timestamp > ago(30d)
| make-series Temp = avg(Temperature) default = real(null)
    on Timestamp from ago(30d) to now() step 1h
    by DeviceId
| extend (Baseline, Seasonal, Trend, Residuals) = series_decompose(Temp)
| mv-expand Timestamp, Temp, Baseline, Trend
| project Timestamp = todatetime(Timestamp), DeviceId,
          Actual = toreal(Temp), Baseline = toreal(Baseline), Trend = toreal(Trend)
```

### Forecast (Extrapolation)

```kql
// Forecast next 24 hours based on 7-day history
DeviceTelemetry
| where Timestamp > ago(7d)
| make-series Temp = avg(Temperature) default = real(null)
    on Timestamp from ago(7d) to now() step 1h
    by DeviceId
| extend Forecast = series_decompose_forecast(Temp, 24)  // 24 future points
| project DeviceId, Timestamp, Temp, Forecast
```

### Percentile Baselines

```kql
// Establish percentile baselines per device, per hour-of-day (day-of-week pattern)
DeviceTelemetry
| where Timestamp > ago(28d)       // 4 weeks of history
| extend HourOfDay = hourofday(Timestamp), DayOfWeek = dayofweek(Timestamp)
| summarize
    P50 = percentile(Temperature, 50),
    P95 = percentile(Temperature, 95),
    P99 = percentile(Temperature, 99)
    by DeviceId, HourOfDay, DayOfWeek
```

---

## Joins

### Inner Join

```kql
// Join telemetry with device metadata
DeviceTelemetry
| where Timestamp > ago(1h)
| join kind=inner (
    DeviceMetadata
    | project DeviceId, Location, AssetType, Owner
) on DeviceId
| project Timestamp, DeviceId, Temperature, Location, AssetType, Owner
```

### Left Outer Join

```kql
// Find telemetry events with no matching device metadata
DeviceTelemetry
| where Timestamp > ago(1h)
| join kind=leftouter (
    DeviceMetadata
    | project DeviceId, Location
) on DeviceId
| where isempty(Location)    // Missing metadata
| summarize Count = count() by DeviceId
| order by Count desc
```

### Anti Join (Events Without Match)

```kql
// Find devices that sent no telemetry in the last hour
DeviceMetadata
| join kind=leftanti (
    DeviceTelemetry
    | where Timestamp > ago(1h)
    | summarize by DeviceId
) on DeviceId
| project DeviceId, Location, Owner
| order by DeviceId asc
```

### Join Performance Hints

```kql
// Hint: small lookup table on the right side (default — no hint needed for small tables)
DeviceTelemetry
| where Timestamp > ago(1h)
| join kind=inner hint.strategy=broadcast (
    DeviceMetadata         // This table is small — broadcast to all nodes
) on DeviceId

// Hint: shuffle join for large-large table joins
DeviceTelemetry
| where Timestamp > ago(7d)
| join kind=inner hint.shufflekey=DeviceId (
    AlertHistory
    | where AlertTime > ago(7d)
) on DeviceId
```

**Join performance rules**:
1. Always put the smaller table on the right side of `join`.
2. Filter both tables with `where` before joining.
3. Use `hint.strategy=broadcast` when the right table has < 1M rows.
4. Use `hint.shufflekey=<key>` for large-large joins to distribute load.
5. Avoid joining before `summarize` — summarize first, then join.

---

## Aggregation Patterns

### TopN by Group

```kql
// Top 5 hottest machines per plant (distinct top-N per group)
DeviceTelemetry
| where Timestamp > ago(1h)
| summarize MaxTemp = max(Temperature) by Plant, DeviceId
| top-nested 1 of Plant by count(),
  top-nested 5 of DeviceId by MaxTemp desc
```

### Percentile Aggregations

```kql
// Request latency percentiles — 50th, 95th, 99th
RequestLog
| where Timestamp > ago(24h)
| summarize
    P50 = percentile(LatencyMs, 50),
    P95 = percentile(LatencyMs, 95),
    P99 = percentile(LatencyMs, 99),
    Count = count()
    by ServiceName, bin(Timestamp, 1h)
```

### Statistical Aggregations

```kql
// Comprehensive statistics per device
DeviceTelemetry
| where Timestamp > ago(24h)
| summarize
    Count = count(),
    Mean = avg(Temperature),
    Stdev = stdev(Temperature),
    Variance = variance(Temperature),
    Min = min(Temperature),
    Max = max(Temperature),
    P25 = percentile(Temperature, 25),
    P75 = percentile(Temperature, 75)
    by DeviceId
| extend IQR = P75 - P25
| extend LowerBound = P25 - 1.5 * IQR
| extend UpperBound = P75 + 1.5 * IQR
```

### Count Distinct (Approximate)

```kql
// Fast approximate distinct count (HyperLogLog)
ClickEvents
| where Timestamp > ago(24h)
| summarize ApproxUniqueUsers = dcount(UserId)   // ~2% error

// Exact distinct count (slower, more memory)
ClickEvents
| where Timestamp > ago(24h)
| summarize ExactUniqueUsers = dcountif(UserId, isnotempty(UserId))
```

### Session Analysis with arg_min / arg_max

```kql
// First and last events per session
UserEvents
| where Timestamp > ago(7d)
| summarize
    SessionStart = min(Timestamp),
    SessionEnd = max(Timestamp),
    FirstPage = arg_min(Timestamp, PageUrl),
    LastPage = arg_max(Timestamp, PageUrl),
    PageCount = count()
    by UserId, SessionId
| extend DurationMin = datetime_diff("minute", SessionEnd, SessionStart)
```

---

## Dynamic Column Operations

```kql
// Parse a JSON dynamic column
DeviceTelemetry
| where Timestamp > ago(1h)
| extend ExtendedProps = todynamic(Properties)
| extend FirmwareVersion = tostring(ExtendedProps.firmware)
| extend BatteryLevel = toreal(ExtendedProps.battery)
| project Timestamp, DeviceId, Temperature, FirmwareVersion, BatteryLevel

// mv-expand: flatten an array column into rows
DeviceTelemetry
| where Timestamp > ago(1h)
| extend Tags = todynamic(Tags)   // Tags is a JSON array column
| mv-expand Tags
| extend Tag = tostring(Tags)
| summarize Count = count() by Tag
| order by Count desc

// bag_unpack: expand a dynamic object into typed columns
DeviceTelemetry
| where Timestamp > ago(1h)
| extend Props = todynamic(Properties)
| evaluate bag_unpack(Props)
```

---

## String Operations

```kql
// Extract patterns with extract()
AuditLog
| extend UserId = extract(@"user:([a-zA-Z0-9-]+)", 1, Message)
| where isnotempty(UserId)

// Parse structured log messages
AppLog
| extend Parsed = parse_json(Message)
| extend Level = tostring(Parsed.level), Code = toint(Parsed.code)

// Split and index
Events
| extend Parts = split(ResourceId, "/")
| extend Subscription = Parts[2], ResourceGroup = Parts[4], Resource = Parts[8]

// String contains (case-insensitive)
Events
| where tolower(Message) contains "error" or tolower(Message) contains "exception"
```

---

## Materialized Views — Design and Management

### When to Use Materialized Views

Use materialized views when:
- A query runs frequently (e.g., every tile refresh, every API call).
- The base query involves heavy aggregation (avg, percentile, dcount) over large tables.
- The query pattern is consistent (same grouping and aggregation function).

Do NOT use materialized views for:
- Queries with ad-hoc filters (the view pre-aggregates without filters).
- Very low cardinality groupings (total row count < 100K — just query the table).
- Short-lived tables that are rebuilt frequently.

### Materialized View Examples

```kql
// Hourly device averages — backfill historical data
.create materialized-view with (backfill=true)
DeviceTelemetry_Hourly
on table DeviceTelemetry
{
    DeviceTelemetry
    | summarize
        AvgTemp = avg(Temperature),
        MaxTemp = max(Temperature),
        MinTemp = min(Temperature),
        ReadingCount = count()
        by DeviceId, bin(Timestamp, 1h)
}

// Daily distinct device count
.create materialized-view DeviceActivity_Daily
on table DeviceTelemetry
{
    DeviceTelemetry
    | summarize ActiveDevices = dcount(DeviceId) by bin(Timestamp, 1d)
}

// Status distribution (string cardinality)
.create materialized-view DeviceStatus_5min
on table DeviceTelemetry
{
    DeviceTelemetry
    | summarize StatusCount = count() by Status, bin(Timestamp, 5m)
}
```

### Querying Materialized Views Safely

```kql
// Prefer the materialized view (fast)
DeviceTelemetry_Hourly
| where Timestamp > ago(7d)
| summarize MaxTemp = max(MaxTemp) by DeviceId

// Combine materialized view with raw table for latest data
union
    (DeviceTelemetry_Hourly | where Timestamp > ago(7d) and Timestamp < ago(1h)),
    (DeviceTelemetry | where Timestamp >= ago(1h) | summarize AvgTemp = avg(Temperature), MaxTemp = max(Temperature), MinTemp = min(Temperature), ReadingCount = count() by DeviceId, bin(Timestamp, 1h))
| summarize arg_max(Timestamp, *) by DeviceId, Timestamp
```

### Materialized View Health Check

```kql
.show materialized-views
| project Name, SourceTable, MaterializedTo, LastRunTime, IsHealthy, Extents, RowCount

// Check if view is healthy and current
.show materialized-view DeviceTelemetry_Hourly
| project MaterializedTo, IsHealthy, LastRunTime
```

---

## Performance Optimization

### Query Best Practices

```kql
// BAD: Filter after aggregation
DeviceTelemetry
| summarize AvgTemp = avg(Temperature) by DeviceId, bin(Timestamp, 1h)
| where Timestamp > ago(7d)   // Filter AFTER aggregation — reads all data

// GOOD: Filter before aggregation
DeviceTelemetry
| where Timestamp > ago(7d)   // Filter FIRST — reduces data processed
| summarize AvgTemp = avg(Temperature) by DeviceId, bin(Timestamp, 1h)

// BAD: Count all rows then filter
DeviceTelemetry
| count
| where Count > 1000000

// GOOD: Direct predicate
DeviceTelemetry
| where Timestamp > ago(1h)
| summarize count()
```

### `has` vs `contains` vs `==`

| Operator | Performance | Use Case |
|----------|-------------|----------|
| `==` | Fastest | Exact string match |
| `has` | Fast (indexed) | Whole-word match in string columns |
| `startswith` | Fast (indexed prefix) | Prefix match |
| `contains` | Slow (full scan) | Substring match — avoid in large tables |
| `matches regex` | Slowest | Complex pattern — only use when necessary |

```kql
// GOOD: Use == for exact IDs
DeviceTelemetry | where DeviceId == "MCH-042"

// GOOD: Use has for word-level search in messages
AuditLog | where Message has "unauthorized"

// AVOID for large tables
DeviceTelemetry | where DeviceId contains "042"  // Full scan
```

### `set` Statements for Query Hints

```kql
// Disable result truncation for admin exports
set notruncation;
DeviceTelemetry | where Timestamp > ago(1h)

// Set explicit query timeout (max 4 minutes)
set query_timeout = time(00:03:00);
DeviceTelemetry | where Timestamp > ago(30d) | summarize count() by DeviceId

// Enable weak consistency for lower latency (may miss last few seconds)
set queryfanoutnodesintercept = false;
DeviceTelemetry | where Timestamp > ago(1h) | summarize count()
```

---

## Error Codes and Remediation

| Error | Meaning | Remediation |
|-------|---------|-------------|
| `Partial query failure: BadRequest` | Syntax error in query | Check operator spelling; validate with `.show tables` |
| `Partial query failure: MemoryError` | Query exceeded per-node 8 GB memory | Add early `where` filter; use `hint.shufflekey`; pre-aggregate with view |
| `Partial query failure: TimeoutError` | Exceeded 4-minute execution timeout | Break into smaller time ranges; use materialized views |
| `Column 'X' of type 'Y' was expected` | Type mismatch in join or extend | Use `tostring()`, `toreal()`, `toint()` cast functions |
| `mv-expand: no array column` | Column is not an array or dynamic type | Verify with `.show table T schema`; use `todynamic()` first |
| `series_decompose_anomalies: too few points` | Time series has < 12 points | Expand time range or reduce bin size |
| `join exceeds result size limit` | Join result too large | Add filters; use `project` to reduce columns before join |
| `Materialized view not healthy` | View fell behind and stopped materializing | Check `.show materialized-view V`; re-create with `backfill=false` |

---

## Limits

| Resource | Limit | Notes |
|----------|-------|-------|
| Query result rows | 500,000 default | Use `set notruncation` for admin; paginate with `skip`/`take` |
| Query execution timeout | 4 minutes | Cannot be extended in Real-Time Dashboards |
| Query memory per node | 8 GB | Aggregate early to reduce memory pressure |
| `make-series` max data points | 1,000,000 per series | Reduce time range or increase bin size |
| `join` max right-side rows | 100,000 (default) | Use `hint.strategy=broadcast` to increase; add `hint.num_partitions` |
| `mv-expand` output rows | 500,000 per input row | Large arrays in dynamic columns require chunking |
| Materialized view aggregation functions | avg, sum, count, min, max, dcount, percentile | `series_*` functions not supported in materialized views |
| `dcount` accuracy | ~2% error | Use `count_distinct` plugin for exact count at higher cost |
