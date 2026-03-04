---
name: Fabric Real-Time Analytics
description: >
  Deep expertise in Microsoft Fabric Real-Time Analytics — create and manage Eventhouses and KQL databases,
  build eventstreams for streaming ingestion, write KQL (Kusto Query Language) queries with time series
  analysis and anomaly detection, design Real-Time Dashboards with auto-refresh tiles, configure Data Activator
  triggers for automated alerting, and integrate with OneLake for unified analytics. Targets data engineers
  and analysts building production streaming pipelines in Microsoft Fabric.
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
triggers:
  - real time analytics
  - kql
  - kusto
  - eventhouse
  - eventstream
  - kql database
  - streaming ingestion
  - real time dashboard
  - fabric kql
  - data activator
  - reflex
  - event processing
  - time series fabric
---

# Fabric Real-Time Analytics

## 1. Real-Time Analytics Overview

Microsoft Fabric Real-Time Analytics is a fully managed platform for ingesting, storing, querying, and visualizing streaming and near-real-time data. It is built on Azure Data Explorer (Kusto) technology and is natively integrated into the Fabric workspace experience.

**Core components**:
| Component | Purpose | Key capability |
|-----------|---------|---------------|
| Eventhouse | Logical container for KQL databases | Groups related databases, shared compute |
| KQL Database | Time-series optimized store | Sub-second queries over billions of rows |
| Eventstream | No-code streaming ingestion pipeline | Connect sources, transform, route to destinations |
| Real-Time Dashboard | Live visualization layer | KQL-powered tiles with auto-refresh |
| Data Activator (Reflex) | Automated alerting on data changes | Trigger emails, Teams messages, Power Automate flows |

**When to use Real-Time Analytics vs other Fabric stores**:
| Scenario | Recommended store | Why |
|----------|-------------------|-----|
| Streaming IoT telemetry, logs, events | KQL Database (Eventhouse) | Sub-second ingestion, time-series native, append-optimized |
| Structured transactional data, star schema | Warehouse | SQL-based, update/delete support, T-SQL |
| Data lake / big data exploration | Lakehouse | Open Delta format, Spark engine, large batch ETL |
| Near-real-time operational dashboards | KQL Database + Real-Time Dashboard | Auto-refresh, KQL aggregations, low latency |
| Complex BI with paginated reports | Warehouse or Lakehouse + Power BI | Semantic models, DAX, enterprise BI |

**Architecture flow**:
```
Sources (Event Hub, IoT Hub, Kafka, Custom App)
    |
    v
Eventstream (filter, transform, route)
    |
    +---> KQL Database (Eventhouse)  ---> Real-Time Dashboard
    |                                 \--> Data Activator (alerts)
    +---> Lakehouse (Delta tables)
    +---> Custom endpoint
```

**Fabric capacity considerations**:
- Real-Time Analytics workloads consume Fabric CU (Capacity Units) from the workspace capacity.
- Eventhouse compute scales independently of Lakehouse/Warehouse Spark or SQL compute.
- Ingestion throughput and query concurrency are governed by the assigned capacity SKU (F2 through F2048).
- Paused capacities stop all ingestion and queries; buffered events in Event Hub are retained per the Event Hub retention policy.

## 2. Eventhouse & KQL Databases

An Eventhouse is a Fabric item that groups one or more KQL databases under shared compute. Each KQL database is an independent schema namespace with its own tables, functions, materialized views, and policies.

**Create an Eventhouse (Fabric UI)**:
1. Open a Fabric workspace.
2. Select **+ New item** > **Eventhouse**.
3. Provide a name (e.g., `TelemetryEventhouse`).
4. The Eventhouse is created with a default KQL database of the same name.

**Create via Fabric REST API**:
```http
POST https://api.fabric.microsoft.com/v1/workspaces/{workspaceId}/items
Content-Type: application/json
Authorization: Bearer {token}

{
  "type": "Eventhouse",
  "displayName": "TelemetryEventhouse",
  "description": "Eventhouse for IoT telemetry data"
}
```

**Add a KQL database to an existing Eventhouse**:
```http
POST https://api.fabric.microsoft.com/v1/workspaces/{workspaceId}/items
Content-Type: application/json

{
  "type": "KQLDatabase",
  "displayName": "SensorReadings",
  "description": "KQL database for sensor telemetry",
  "definition": {
    "parts": [{
      "path": "DatabaseProperties.json",
      "payload": "eyJkYXRhYmFzZVR5cGUiOiJSZWFkV3JpdGUiLCJwYXJlbnRFdmVudGhvdXNlSXRlbUlkIjoiPGV2ZW50aG91c2UtaXRlbS1pZD4ifQ=="
    }]
  }
}
```

The `payload` is a base64-encoded JSON:
```json
{
  "databaseType": "ReadWrite",
  "parentEventhouseItemId": "<eventhouse-item-id>"
}
```

**Schema management (KQL control commands)**:

Create a table:
```kql
.create table SensorReadings (
    Timestamp: datetime,
    DeviceId: string,
    Temperature: real,
    Humidity: real,
    Pressure: real,
    Location: dynamic
)
```

Alter a table (add columns):
```kql
.alter-merge table SensorReadings (
    BatteryLevel: real,
    FirmwareVersion: string
)
```

Create an ingestion mapping for JSON data:
```kql
.create table SensorReadings ingestion json mapping 'SensorMapping'
'['
'  {"column":"Timestamp",   "path":"$.ts",          "datatype":"datetime"},'
'  {"column":"DeviceId",    "path":"$.deviceId",     "datatype":"string"},'
'  {"column":"Temperature", "path":"$.temp",         "datatype":"real"},'
'  {"column":"Humidity",    "path":"$.humidity",      "datatype":"real"},'
'  {"column":"Pressure",    "path":"$.pressure",      "datatype":"real"},'
'  {"column":"Location",    "path":"$.loc",           "datatype":"dynamic"}'
']'
```

Create an ingestion mapping for CSV data:
```kql
.create table SensorReadings ingestion csv mapping 'SensorCsvMapping'
'['
'  {"column":"Timestamp",   "ordinal":0, "datatype":"datetime"},'
'  {"column":"DeviceId",    "ordinal":1, "datatype":"string"},'
'  {"column":"Temperature", "ordinal":2, "datatype":"real"},'
'  {"column":"Humidity",    "ordinal":3, "datatype":"real"},'
'  {"column":"Pressure",    "ordinal":4, "datatype":"real"},'
'  {"column":"Location",    "ordinal":5, "datatype":"dynamic"}'
']'
```

**Retention and caching policies**:
```kql
// Set data retention to 365 days (data older than this is automatically deleted)
.alter table SensorReadings policy retention
```
```json
{
  "SoftDeletePeriod": "365.00:00:00",
  "Recoverability": "Enabled"
}
```
```kql
// Set hot cache to 30 days (recent data in SSD cache for fast queries)
.alter table SensorReadings policy caching hot = 30d

// View current policies
.show table SensorReadings policy retention
.show table SensorReadings policy caching
```

**Partitioning policy** (for high-cardinality tables):
```kql
.alter table SensorReadings policy partitioning
```
```json
{
  "PartitionKeys": [
    {
      "ColumnName": "DeviceId",
      "Kind": "Hash",
      "Properties": {
        "Function": "XxHash64",
        "MaxPartitionCount": 64
      }
    }
  ]
}
```

## 3. KQL (Kusto Query Language)

KQL is a read-only query language optimized for exploring large volumes of structured, semi-structured, and time-series data. Queries flow left to right through a pipeline of tabular operators separated by `|`.

**Basic query structure**:
```kql
TableName
| where Timestamp > ago(1h)
| where DeviceId == "sensor-42"
| project Timestamp, Temperature, Humidity
| sort by Timestamp desc
| take 100
```

### Core Tabular Operators

| Operator | Purpose | Example |
|----------|---------|---------|
| `where` | Filter rows | `where Temperature > 30` |
| `project` | Select/rename columns | `project Timestamp, Temp=Temperature` |
| `extend` | Add computed columns | `extend TempF = Temperature * 9/5 + 32` |
| `summarize` | Aggregate rows | `summarize avg(Temperature) by DeviceId` |
| `sort by` / `order by` | Sort results | `sort by Timestamp desc` |
| `take` / `limit` | Limit row count | `take 100` |
| `join` | Join two tables | `join kind=inner OtherTable on DeviceId` |
| `union` | Combine tables | `union Table1, Table2` |
| `distinct` | Unique values | `distinct DeviceId` |
| `top` | Top N by expression | `top 10 by Temperature desc` |
| `render` | Visualize results | `render timechart` |
| `count` | Count rows | `SensorReadings | count` |
| `parse` | Extract from strings | `parse Message with * "code=" Code:int` |
| `mv-expand` | Expand arrays/dynamic | `mv-expand Location` |
| `make-series` | Create time series | `make-series avg(Temp) on Timestamp step 1h` |
| `lookup` | Dimension lookup | `lookup kind=leftouter Devices on DeviceId` |
| `invoke` | Call stored function | `invoke MyFunction()` |

### Scalar Functions

**Date/time**:
| Function | Description | Example |
|----------|-------------|---------|
| `ago(timespan)` | Time relative to now | `ago(1h)`, `ago(7d)`, `ago(30m)` |
| `now()` | Current UTC time | `now()` |
| `datetime(value)` | Parse datetime | `datetime(2025-01-15T10:30:00Z)` |
| `startofday(dt)` | Truncate to day start | `startofday(Timestamp)` |
| `startofhour(dt)` | Truncate to hour start | `startofhour(Timestamp)` |
| `bin(value, step)` | Round down to step | `bin(Timestamp, 5m)` |
| `format_datetime(dt, fmt)` | Format as string | `format_datetime(Timestamp, "yyyy-MM-dd")` |
| `datetime_diff(part, dt1, dt2)` | Difference | `datetime_diff("hour", now(), Timestamp)` |

**String**:
| Function | Description | Example |
|----------|-------------|---------|
| `extract(regex, group, str)` | Regex capture | `extract(@"(\d+\.\d+)", 1, Message)` |
| `parse_json(str)` | Parse JSON string | `parse_json(RawPayload)` |
| `tostring(value)` | Convert to string | `tostring(StatusCode)` |
| `tolower(str)` / `toupper(str)` | Case conversion | `tolower(DeviceId)` |
| `substring(str, start, len)` | Substring | `substring(Message, 0, 50)` |
| `split(str, delim)` | Split to array | `split(Tags, ",")` |
| `strcat(a, b, ...)` | Concatenate | `strcat(Region, "-", DeviceId)` |
| `has` / `contains` | Substring test | `where Message has "error"` |
| `matches regex` | Regex match | `where Url matches regex @"/api/v\d+"` |

**Aggregation functions**:
| Function | Description |
|----------|-------------|
| `count()` | Count of rows |
| `sum(expr)` | Sum of values |
| `avg(expr)` | Average |
| `min(expr)` / `max(expr)` | Minimum / maximum |
| `percentile(expr, p)` | Percentile value |
| `percentiles(expr, p1, p2)` | Multiple percentiles |
| `dcount(expr)` | Approximate distinct count |
| `dcountif(expr, pred)` | Conditional distinct count |
| `countif(pred)` | Conditional count |
| `arg_max(expr, *)` | Row with max value |
| `arg_min(expr, *)` | Row with min value |
| `make_list(expr)` | Aggregate to JSON array |
| `make_set(expr)` | Aggregate to unique JSON array |
| `make_bag(expr)` | Aggregate to JSON object |
| `stdev(expr)` | Standard deviation |
| `variance(expr)` | Variance |

### Practical KQL Examples

**1. Average temperature per device in the last hour**:
```kql
SensorReadings
| where Timestamp > ago(1h)
| summarize AvgTemp = avg(Temperature), MaxTemp = max(Temperature) by DeviceId
| sort by AvgTemp desc
```

**2. Hourly event count trend over 24 hours**:
```kql
Events
| where Timestamp > ago(24h)
| summarize EventCount = count() by bin(Timestamp, 1h)
| render timechart
```

**3. Top 10 devices by error rate**:
```kql
SensorReadings
| where Timestamp > ago(1d)
| summarize TotalEvents = count(), Errors = countif(StatusCode >= 400) by DeviceId
| extend ErrorRate = round(100.0 * Errors / TotalEvents, 2)
| top 10 by ErrorRate desc
| project DeviceId, TotalEvents, Errors, ErrorRate
```

**4. Session analysis with sessionization**:
```kql
ClickEvents
| where Timestamp > ago(7d)
| sort by UserId asc, Timestamp asc
| extend SessionGap = iff(prev(UserId) == UserId, Timestamp - prev(Timestamp), timespan(null))
| extend NewSession = iff(isnull(SessionGap) or SessionGap > 30m, 1, 0)
| extend SessionId = row_cumsum(NewSession)
| summarize SessionStart = min(Timestamp), SessionEnd = max(Timestamp),
            PageViews = count(), DistinctPages = dcount(PageUrl) by UserId, SessionId
| extend SessionDuration = SessionEnd - SessionStart
```

**5. JSON payload parsing and flattening**:
```kql
RawEvents
| where Timestamp > ago(1h)
| extend Payload = parse_json(RawPayload)
| extend EventType = tostring(Payload.eventType),
         UserId = tostring(Payload.userId),
         Properties = Payload.properties
| mv-expand Property = Properties
| extend PropName = tostring(bag_keys(Property)[0])
| project Timestamp, EventType, UserId, PropName, PropValue = tostring(Property[PropName])
```

**6. Percentile latency analysis**:
```kql
ApiRequests
| where Timestamp > ago(6h)
| summarize p50 = percentile(DurationMs, 50),
            p95 = percentile(DurationMs, 95),
            p99 = percentile(DurationMs, 99),
            RequestCount = count()
    by bin(Timestamp, 5m), Endpoint
| render timechart
```

**7. Time-bucketed comparison (this week vs last week)**:
```kql
let thisWeek = Events | where Timestamp between (ago(7d) .. now()) | summarize ThisWeek = count() by bin(Timestamp, 1h);
let lastWeek = Events | where Timestamp between (ago(14d) .. ago(7d))
    | extend Timestamp = Timestamp + 7d
    | summarize LastWeek = count() by bin(Timestamp, 1h);
thisWeek
| join kind=fullouter lastWeek on Timestamp
| project Timestamp = coalesce(Timestamp, Timestamp1), ThisWeek = coalesce(ThisWeek, 0), LastWeek = coalesce(LastWeek, 0)
| sort by Timestamp asc
| render timechart
```

**8. Dynamic column extraction with bag_unpack**:
```kql
CustomEvents
| where Timestamp > ago(1d)
| extend Properties = parse_json(PropertiesJson)
| evaluate bag_unpack(Properties, "prop_")
| take 100
```

**9. Materialized view for pre-aggregated hourly stats**:
```kql
.create materialized-view HourlySensorStats on table SensorReadings
{
    SensorReadings
    | summarize AvgTemp = avg(Temperature), MaxTemp = max(Temperature),
                MinTemp = min(Temperature), ReadingCount = count()
      by DeviceId, bin(Timestamp, 1h)
}
```

**10. Stored function for reusable logic**:
```kql
.create-or-alter function with (folder="Queries", docstring="Get device stats for a time range")
GetDeviceStats(startTime:datetime, endTime:datetime) {
    SensorReadings
    | where Timestamp between (startTime .. endTime)
    | summarize AvgTemp = avg(Temperature), MaxTemp = max(Temperature),
                ReadingCount = count() by DeviceId
    | sort by AvgTemp desc
}

// Usage:
GetDeviceStats(ago(24h), now())
```

**11. Update policy for data transformation on ingestion**:
```kql
// Source table receives raw JSON
.create table RawTelemetry (RawData: dynamic, IngestionTime: datetime)

// Target table with structured schema
.create table ProcessedTelemetry (
    Timestamp: datetime, DeviceId: string, Temperature: real,
    Humidity: real, Region: string
)

// Transformation function
.create-or-alter function TransformTelemetry() {
    RawTelemetry
    | extend Timestamp = todatetime(RawData.ts),
             DeviceId = tostring(RawData.deviceId),
             Temperature = toreal(RawData.temp),
             Humidity = toreal(RawData.humidity),
             Region = tostring(RawData.region)
    | project Timestamp, DeviceId, Temperature, Humidity, Region
}

// Apply update policy (automatically transforms data on ingestion)
.alter table ProcessedTelemetry policy update
@'[{"IsEnabled": true, "Source": "RawTelemetry", "Query": "TransformTelemetry()", "IsTransactional": true}]'
```

## 4. Eventstreams

An Eventstream is a Fabric item that provides a no-code experience for building streaming data pipelines. It connects data sources to destinations with optional inline transformations.

**Create an Eventstream (Fabric UI)**:
1. Open a Fabric workspace.
2. Select **+ New item** > **Eventstream**.
3. Provide a name (e.g., `IoTTelemetryStream`).
4. The Eventstream designer canvas opens.

**Create via Fabric REST API**:
```http
POST https://api.fabric.microsoft.com/v1/workspaces/{workspaceId}/items
Content-Type: application/json

{
  "type": "Eventstream",
  "displayName": "IoTTelemetryStream",
  "description": "Ingestion pipeline for IoT sensor data"
}
```

### Sources

| Source type | Description | Configuration |
|------------|-------------|---------------|
| Azure Event Hubs | Managed event ingestion service | Connection string, consumer group, data format |
| Azure IoT Hub | IoT device management + ingestion | Connection string, consumer group |
| Custom App (SDK) | Send events from your application code | Eventstream endpoint + connection string |
| Azure Blob Storage | File-based event source | Storage account, container, file pattern |
| Sample data | Built-in sample datasets for testing | Select from available samples |
| Fabric Lakehouse | Delta table change feed | Workspace, Lakehouse, table name |
| Azure SQL DB CDC | Change data capture events | Connection string, tables to monitor |

**Custom App source (SDK ingestion)**:

After adding a Custom App source, the Eventstream provides an endpoint and connection string. Use the Event Hubs SDK to send events:

```typescript
import { EventHubProducerClient } from "@azure/event-hubs";

const connectionString = "Endpoint=sb://<namespace>.servicebus.windows.net/;SharedAccessKeyName=...";
const eventHubName = "<eventstream-name>";

const producer = new EventHubProducerClient(connectionString, eventHubName);

const batch = await producer.createBatch();
batch.tryAdd({
  body: {
    ts: new Date().toISOString(),
    deviceId: "sensor-42",
    temp: 23.5,
    humidity: 65.2
  }
});

await producer.sendBatch(batch);
await producer.close();
```

### Transformations

Eventstream supports inline transformations between source and destination:

| Transformation | Purpose | Example |
|---------------|---------|---------|
| Filter | Keep rows matching a condition | `Temperature > 0 AND Temperature < 100` |
| Manage fields | Select, rename, or remove columns | Remove `RawPayload`, rename `ts` to `Timestamp` |
| Aggregate | Window-based aggregations | Tumbling window 5 min: `AVG(Temperature) GROUP BY DeviceId` |
| Group by | Group and aggregate | Group by `Region`, count events |
| Expand | Flatten nested JSON arrays | Expand `$.sensors[*]` to individual rows |
| Union | Merge multiple streams | Combine two eventstreams into one |

**Windowed aggregation types**:
| Window | Behavior | Use case |
|--------|----------|----------|
| Tumbling | Fixed, non-overlapping intervals | "Average temperature every 5 minutes" |
| Hopping | Fixed size, sliding by hop size | "Average temperature over 10 minutes, every 2 minutes" |
| Session | Dynamic, gap-based grouping | "Group user clicks until 30-minute inactivity" |

### Destinations

| Destination | Description | Key settings |
|------------|-------------|--------------|
| KQL Database | Ingest into Eventhouse KQL DB | Target database, table, ingestion mapping |
| Lakehouse | Write to Delta table | Target Lakehouse, table name |
| Custom endpoint | Forward to another Event Hub or app | Connection string |
| Reflex (Data Activator) | Feed into Data Activator for alerting | Reflex item, trigger configuration |
| Derived stream | Create a new stream from transformations | Stream name (can be used as source elsewhere) |

**Eventstream-to-KQL Database routing**:
1. In the Eventstream designer, add a **KQL Database** destination.
2. Select the target Eventhouse and KQL database.
3. Choose or create a destination table. Eventstream can auto-create the table schema from the data shape.
4. Optionally select an ingestion mapping.
5. The connection is established and data flows continuously.

## 5. Streaming Ingestion

Fabric KQL databases support two ingestion modes: queued (batched) and streaming.

**Queued (default) ingestion**:
- Data is buffered and ingested in micro-batches (typically 1-5 minutes).
- Optimized for throughput over latency.
- Controlled by the batching policy (max time, max size, max count).

**Streaming ingestion**:
- Data is available for query within seconds of ingestion.
- Higher compute cost per event.
- Must be enabled at the database level.

**Enable streaming ingestion**:
```kql
.alter database MyDatabase policy streamingingestion enable
```

**Batching policy (for queued ingestion)**:
```kql
.alter table SensorReadings policy ingestionbatching
```
```json
{
  "MaximumBatchingTimeSpan": "00:00:30",
  "MaximumNumberOfItems": 500,
  "MaximumRawDataSizeMB": 100
}
```

**Inline ingestion (for testing/small datasets)**:
```kql
.ingest inline into table SensorReadings <|
2025-01-15T10:30:00Z,sensor-01,23.5,65.2,1013.25,{"lat":47.6,"lon":-122.3}
2025-01-15T10:30:01Z,sensor-02,24.1,63.8,1013.10,{"lat":47.6,"lon":-122.3}
2025-01-15T10:30:02Z,sensor-03,22.8,67.1,1013.30,{"lat":47.7,"lon":-122.2}
```

**Ingest from Azure Blob Storage**:
```kql
.ingest into table SensorReadings (
    'https://mystorageaccount.blob.core.windows.net/data/sensors/2025-01-15.json'
) with (
    format = 'json',
    ingestionMappingReference = 'SensorMapping',
    tags = '["drop-by:2025-01-15"]'
)
```

**SDK ingestion (Node.js with @azure/data-explorer)**:
```typescript
import { Client as KustoClient, KustoConnectionStringBuilder } from "azure-kusto-data";
import { IngestClient, IngestionProperties, DataFormat } from "azure-kusto-ingest";

const clusterUri = "https://<eventhouse-uri>.fabric.microsoft.com";
const database = "SensorReadings";

// Use managed identity or AAD token
const kcsb = KustoConnectionStringBuilder.withTokenCredential(
  clusterUri,
  new DefaultAzureCredential()
);

const ingestClient = new IngestClient(kcsb, {
  database: database,
  table: "SensorReadings",
  format: DataFormat.JSON,
  ingestionMappingReference: "SensorMapping"
} as IngestionProperties);

// Ingest from a local file
await ingestClient.ingestFromFile("./data/readings.json");

// Ingest from a stream
const stream = Readable.from(JSON.stringify(events));
await ingestClient.ingestFromStream(stream);
```

**Ingestion best practices**:
- Prefer queued ingestion for batch/bulk loads (higher throughput, lower cost).
- Use streaming ingestion only when sub-second query availability is required.
- Set appropriate batching policies to balance latency and efficiency.
- Always define ingestion mappings for JSON/CSV to ensure schema consistency.
- Use `tags` with `drop-by` prefix for efficient data management (e.g., dropping specific ingestion batches).
- Monitor ingestion failures with `.show ingestion failures`.

## 6. Real-Time Dashboards

Real-Time Dashboards are Fabric items that display live data from KQL databases with configurable auto-refresh intervals. Each tile on a dashboard is backed by a KQL query.

**Create a Real-Time Dashboard (Fabric UI)**:
1. Open a Fabric workspace.
2. Select **+ New item** > **Real-Time Dashboard**.
3. Provide a name (e.g., `IoT Operations Dashboard`).
4. Add a data source pointing to your KQL database.

**Add a data source**:
1. In the dashboard editor, click **Data sources** > **+ Add**.
2. Select your Eventhouse and KQL database.
3. Assign an alias (e.g., `sensors`) for use in tile queries.

### Tile Types

| Tile type | Visualization | Best for |
|-----------|--------------|----------|
| Table | Tabular data grid | Detail views, logs, recent events |
| Time chart | Line/area chart over time | Trends, time-series metrics |
| Bar chart | Vertical/horizontal bars | Comparisons, rankings |
| Pie chart | Proportional slices | Distribution, composition |
| Scatter chart | XY plot with points | Correlation analysis |
| Stat | Single large number/KPI | Current value, total count |
| Map | Geographic visualization | Location-based data |
| Multi-stat | Multiple KPI values | Dashboard header summaries |
| Anomaly chart | Time chart with anomaly highlighting | Anomaly detection results |

**Create a tile**:
1. Click **+ Add tile** in the dashboard editor.
2. Write a KQL query for the tile data.
3. Select the visualization type.
4. Configure formatting (title, colors, axis labels, legend).

**Example tile queries**:

Stat tile (current device count):
```kql
SensorReadings
| where Timestamp > ago(5m)
| summarize ActiveDevices = dcount(DeviceId)
```

Time chart tile (temperature trend):
```kql
SensorReadings
| where Timestamp > ago(24h)
| summarize AvgTemp = avg(Temperature) by bin(Timestamp, 15m), DeviceId
| render timechart
```

Bar chart tile (events by region):
```kql
SensorReadings
| where Timestamp > ago(1h)
| extend Region = tostring(Location.region)
| summarize EventCount = count() by Region
| sort by EventCount desc
| render barchart
```

### Parameters

Dashboard parameters allow users to filter data interactively across all tiles.

**Define a parameter**:
1. Click **Parameters** > **+ Add**.
2. Set the parameter name, label, type (string, datetime, number), and default value.
3. Optionally configure a KQL query to populate dropdown values:
```kql
SensorReadings
| distinct DeviceId
| sort by DeviceId asc
```

**Use parameters in tile queries**:
```kql
SensorReadings
| where Timestamp between (_startTime .. _endTime)
| where DeviceId == _selectedDevice or isempty(_selectedDevice)
| summarize AvgTemp = avg(Temperature) by bin(Timestamp, 1h)
| render timechart
```

Parameters are referenced with an underscore prefix: `_parameterName`.

**Auto-refresh**:
- Configure auto-refresh in dashboard settings: 30 seconds, 1 minute, 5 minutes, 15 minutes, 30 minutes, or 1 hour.
- Each refresh re-executes all tile queries against the KQL database.
- For high-frequency dashboards, use materialized views to reduce query load.

**Cross-filter and drill-through**:
- Enable cross-filter so clicking a value in one tile filters other tiles.
- Configure drill-through to navigate from a summary tile to a detail tile or another dashboard.

## 7. Data Activator (Reflex)

Data Activator (formerly known as Reflex) is a Fabric item that monitors data for specific conditions and automatically triggers actions when those conditions are met. It enables no-code reactive automation on streaming or batch data.

**Create a Reflex item (Fabric UI)**:
1. Open a Fabric workspace.
2. Select **+ New item** > **Reflex**.
3. Provide a name (e.g., `TemperatureAlerts`).

**Key concepts**:
| Concept | Description |
|---------|-------------|
| Object | An entity being monitored (e.g., a device, user, or order) |
| Event | A data point or change associated with an object |
| Trigger | A condition that, when met, fires an action |
| Action | What happens when a trigger fires (email, Teams, Power Automate) |
| Property | A value tracked over time for an object (e.g., temperature) |

### Connect Data Sources

**From Eventstream**:
1. In the Eventstream designer, add a **Reflex** destination.
2. Select the target Reflex item.
3. Map the incoming event fields to object ID and properties.

**From Power BI**:
1. In a Power BI report visual, select **Set alert** (triggers Data Activator).
2. Define the measure to monitor and the condition.

**From KQL Database (scheduled query)**:
1. In the Reflex designer, add a data source.
2. Write a KQL query that returns the data to monitor.
3. Set a polling interval (e.g., every 5 minutes).

### Define Triggers

**Condition types**:
| Condition | Description | Example |
|-----------|-------------|---------|
| Numeric threshold | Value crosses a boundary | `Temperature > 40` |
| Change detection | Value changes by amount/percentage | `Temperature changed by > 5 degrees` |
| Absence detection | No events received within a window | `No reading for 10 minutes` |
| State transition | Value moves between categories | `Status changed from "Normal" to "Critical"` |

**Trigger configuration**:
1. Select the property to monitor (e.g., `Temperature`).
2. Choose the condition type and set thresholds.
3. Optionally add a time window: "trigger only if condition persists for 5 minutes."
4. Configure the action.

### Actions

| Action | Description | Configuration |
|--------|-------------|---------------|
| Email | Send an email notification | Recipients, subject template, body template |
| Teams message | Post to a Teams channel | Channel selection, message template |
| Power Automate | Trigger a Power Automate flow | Flow URL, pass event data as trigger body |
| Custom endpoint | HTTP POST to a webhook | URL, headers, body template |

**Example: Temperature alert trigger**:
- **Object**: DeviceId
- **Property**: Temperature
- **Condition**: `Temperature > 40`
- **Sustain**: Condition must hold for 2 minutes
- **Action**: Send Teams message to `#operations-alerts` channel
- **Message template**: "Device {DeviceId} temperature is {Temperature}C (threshold: 40C) at {Timestamp}"

**Monitoring triggers**:
- View trigger history in the Reflex item to see past firings.
- Each firing logs the object, property values, timestamp, and action result.
- Use the trigger run log to debug false positives or missed alerts.

## 8. Time Series & Anomaly Detection

KQL provides native operators for time series analysis, anomaly detection, and forecasting directly within queries.

### make-series Operator

The `make-series` operator creates a regular time series from irregular event data by filling gaps and aligning timestamps:

```kql
SensorReadings
| make-series AvgTemp = avg(Temperature) default=real(null)
    on Timestamp from ago(7d) to now() step 1h
    by DeviceId
```

This produces one row per `DeviceId` with:
- `Timestamp`: array of hourly timestamps
- `AvgTemp`: array of corresponding average temperature values
- Gaps are filled with `null` (or a specified default)

### Anomaly Detection

**series_decompose_anomalies** — Detects anomalies by decomposing the series into baseline, seasonal, trend, and residual components:
```kql
SensorReadings
| make-series AvgTemp = avg(Temperature) default=real(null)
    on Timestamp from ago(7d) to now() step 1h
    by DeviceId
| extend (anomalies, score, baseline) = series_decompose_anomalies(AvgTemp, 1.5)
| mv-expand Timestamp to typeof(datetime), AvgTemp to typeof(real),
            anomalies to typeof(int), score to typeof(real), baseline to typeof(real)
| where anomalies != 0
| project Timestamp, DeviceId, AvgTemp, anomalies, score, baseline
```

The `1.5` parameter is the sensitivity threshold (lower = more sensitive, default 1.5).

Anomaly values: `1` = positive anomaly (spike), `-1` = negative anomaly (dip), `0` = normal.

**series_decompose** — Decompose into seasonal, trend, residual, and baseline:
```kql
SensorReadings
| make-series AvgTemp = avg(Temperature) on Timestamp from ago(30d) to now() step 1h by DeviceId
| extend (seasonal, trend, residual, baseline, season_period) = series_decompose(AvgTemp)
| project DeviceId, Timestamp, AvgTemp, seasonal, trend, residual, baseline
```

### Period Detection

**series_periods_detect** — Automatically detect repeating periods in data:
```kql
SensorReadings
| make-series AvgTemp = avg(Temperature) on Timestamp from ago(30d) to now() step 1h by DeviceId
| extend (periods, scores) = series_periods_detect(AvgTemp, 4, 168, 2)
| project DeviceId, periods, scores
```

Parameters: min period (4 hours), max period (168 hours = 1 week), number of periods to return (2).

### Trend Analysis and Forecasting

**series_fit_line** — Fit a linear regression:
```kql
SensorReadings
| make-series AvgTemp = avg(Temperature) on Timestamp from ago(30d) to now() step 1d by DeviceId
| extend (RSquare, Slope, Variance, RVariance, Interception, LineFit) = series_fit_line(AvgTemp)
| project DeviceId, RSquare, Slope, Interception
| where abs(Slope) > 0.1
```

**series_fit_2lines** — Detect trend changes (two-segment regression):
```kql
SensorReadings
| make-series AvgTemp = avg(Temperature) on Timestamp from ago(30d) to now() step 1d by DeviceId
| extend (RSquare, SplitIdx, Variance, RVariance, LineFit, RightSlope, RightIntercept,
          LeftSlope, LeftIntercept) = series_fit_2lines(AvgTemp)
| project DeviceId, RSquare, SplitIdx, LeftSlope, RightSlope
```

**Forecasting with series_decompose_forecast**:
```kql
SensorReadings
| make-series AvgTemp = avg(Temperature) on Timestamp from ago(30d) to now() + 7d step 1h by DeviceId
| extend forecast = series_decompose_forecast(AvgTemp, 168)
| render timechart
```

The `168` parameter is the number of forecast points (168 hours = 7 days).

### Render Time Charts

```kql
SensorReadings
| make-series AvgTemp = avg(Temperature) on Timestamp from ago(24h) to now() step 15m by DeviceId
| render timechart with (title="Temperature by Device", xtitle="Time", ytitle="Temperature (C)")
```

## 9. OneLake Integration

KQL databases in Fabric integrate with OneLake, providing a unified data layer across all Fabric workloads.

**KQL Database as OneLake shortcut source**:
- Data stored in a KQL database is automatically exposed as Delta/Parquet files in OneLake.
- Other Fabric items (Lakehouse, Warehouse, Notebooks) can create shortcuts to this data.
- Enables cross-engine queries without data duplication.

**Enable OneLake availability**:
```kql
// Enable OneLake integration for a table (data becomes accessible as Delta in OneLake)
.alter table SensorReadings policy mirroring '{"IsEnabled": true}'
```

Once enabled, the table data is accessible at:
```
abfss://<workspace-id>@onelake.dfs.fabric.microsoft.com/<eventhouse-id>/Tables/<table-name>
```

**Query Delta tables from KQL Database**:

Create a shortcut to a Lakehouse Delta table:
```kql
.create external table LakehouseOrders (
    OrderId: long,
    CustomerId: string,
    OrderDate: datetime,
    Amount: real
) kind=delta (
    'abfss://<workspace-id>@onelake.dfs.fabric.microsoft.com/<lakehouse-id>/Tables/Orders'
)
```

Query the external table alongside native KQL tables:
```kql
SensorReadings
| where Timestamp > ago(1h)
| join kind=inner external_table("LakehouseOrders") on $left.DeviceId == $right.CustomerId
| project Timestamp, DeviceId, Temperature, OrderId, Amount
```

**One logical copy pattern**:
- Ingest streaming data into KQL Database (optimized for real-time queries).
- The same data is mirrored to OneLake as Delta.
- Spark notebooks and SQL endpoints query the same data without a separate copy.
- Eliminates data duplication and ensures consistency across engines.

**Cross-workspace access**:
- Create OneLake shortcuts across workspaces to share KQL data with other teams.
- The shortcut respects Fabric workspace permissions.
- Use `external_table()` in KQL to query data from other workspaces via shortcuts.

## 10. Security & Access

KQL databases in Fabric follow a layered security model with workspace roles, database-level permissions, and optional row-level security.

**Workspace-level roles** (inherited from Fabric):
| Role | KQL Database Access |
|------|-------------------|
| Admin | Full control — schema, data, policies, permissions |
| Member | Read/write data, create tables and functions |
| Contributor | Read/write data, limited schema changes |
| Viewer | Read-only query access |

**Database-level permissions** (KQL-specific):
| Permission | Capabilities |
|-----------|-------------|
| Admin | Full control: schema, policies, permissions, data |
| Ingestor | Ingest data only (no query, no schema changes) |
| Viewer | Query data only (no ingestion, no schema changes) |
| UnrestrictedViewer | Query data including restricted tables |
| Monitor | View metadata, statistics, and policies |

**Grant database permissions**:
```kql
.add database MyDatabase viewers ('aaduser=user@contoso.com')
.add database MyDatabase ingestors ('aadapp=<app-id>;tenantid=<tenant-id>')
.add database MyDatabase admins ('aadgroup=DataEngineers;tenantid=<tenant-id>')
```

**Row-level security (RLS)**:
```kql
// Create an RLS function that filters by the caller's identity
.create-or-alter function with (folder="Security", docstring="Row-level security filter")
RLS_SensorReadings() {
    SensorReadings
    | where Region in (current_principal_details().Groups)
}

// Apply RLS to the table
.alter table SensorReadings policy row_level_security enable "RLS_SensorReadings"
```

With RLS enabled, all queries against `SensorReadings` are automatically filtered through the function. Admins can bypass RLS.

**Restricted view access**:
```kql
// Mark a table as restricted (only UnrestrictedViewers and Admins can query)
.alter table SensitiveData policy restricted_view_access true
```

**Managed identity for ingestion**:
- Assign a system-managed identity or user-assigned managed identity to the Eventhouse.
- Grant the identity `Ingestor` permission on the target database.
- Use the identity in Eventstream or SDK-based ingestion to avoid storing secrets.

```kql
// Grant ingestor role to a managed identity
.add database MyDatabase ingestors ('aadapp=<managed-identity-client-id>;tenantid=<tenant-id>')
```

## 11. Monitoring & Optimization

**Query diagnostics**:
```kql
// Show recent queries (last 1 hour) with duration and resource usage
.show queries
| where StartedOn > ago(1h)
| project User, Text, Duration, TotalCPU, MemoryPeak, State
| sort by Duration desc
| take 20
```

**Ingestion monitoring**:
```kql
// Show recent ingestion failures
.show ingestion failures
| where FailedOn > ago(24h)
| summarize FailureCount = count() by Table, Details
| sort by FailureCount desc

// Show ingestion result summary
.show ingestion results
| where IngestionTime > ago(1h)
| summarize count() by Table, Status
```

**Cache and extent statistics**:
```kql
// Show table extent (shard) statistics
.show table SensorReadings extents
| summarize ExtentCount = count(), TotalRows = sum(RowCount),
            TotalSize = sum(OriginalSize) / 1024 / 1024
| extend TotalSizeMB = round(TotalSize, 2)

// Show cache hit ratio (from query stats)
.show queries
| where StartedOn > ago(1h)
| summarize AvgCacheHitRatio = avg(CacheStatistics.Disk.Hits /
    (CacheStatistics.Disk.Hits + CacheStatistics.Disk.Misses) * 100)
```

**Optimization best practices**:
- Set appropriate retention policies — do not keep data longer than needed.
- Configure hot cache for the time range most frequently queried.
- Use materialized views for frequently-run aggregations.
- Avoid `contains` on large string columns — prefer `has` (uses the term index).
- Use `project` early in queries to reduce column scanning.
- Avoid `join` on high-cardinality columns without a preceding `where` filter.
- Use `summarize` with `hint.strategy=shuffle` for high-cardinality group-by keys.
- Monitor extent merge health — too many small extents degrade query performance.

**Extent merge monitoring**:
```kql
.show table SensorReadings extents
| summarize ExtentCount = count() by bin(MinCreatedOn, 1h)
| sort by MinCreatedOn desc
| take 24
```

## 12. Common Patterns

### Pattern 1: IoT Telemetry Pipeline

End-to-end streaming pipeline for IoT sensor data.

**Architecture**: Azure IoT Hub --> Eventstream --> KQL Database --> Real-Time Dashboard + Data Activator

**Step 1: Create the Eventhouse and KQL Database**:
```kql
.create table DeviceTelemetry (
    Timestamp: datetime,
    DeviceId: string,
    Temperature: real,
    Humidity: real,
    Pressure: real,
    BatteryPct: int,
    Location: dynamic
)

.create table DeviceTelemetry ingestion json mapping 'IoTMapping'
'['
'  {"column":"Timestamp",   "path":"$.enqueuedTime",   "datatype":"datetime"},'
'  {"column":"DeviceId",    "path":"$.systemProperties.iothub-connection-device-id", "datatype":"string"},'
'  {"column":"Temperature", "path":"$.body.temperature", "datatype":"real"},'
'  {"column":"Humidity",    "path":"$.body.humidity",    "datatype":"real"},'
'  {"column":"Pressure",    "path":"$.body.pressure",    "datatype":"real"},'
'  {"column":"BatteryPct",  "path":"$.body.battery",     "datatype":"int"},'
'  {"column":"Location",    "path":"$.body.location",    "datatype":"dynamic"}'
']'

.alter table DeviceTelemetry policy retention '{"SoftDeletePeriod":"90.00:00:00","Recoverability":"Enabled"}'
.alter table DeviceTelemetry policy caching hot = 7d
```

**Step 2: Create Eventstream**:
1. Create an Eventstream with an **Azure IoT Hub** source.
2. Add a **Filter** transformation: `Temperature is not null`.
3. Add a **KQL Database** destination mapped to `DeviceTelemetry` with `IoTMapping`.
4. Add a **Reflex** destination for alerting.

**Step 3: Real-Time Dashboard tiles**:
```kql
// Tile 1: Active device count (stat)
DeviceTelemetry | where Timestamp > ago(5m) | summarize dcount(DeviceId)

// Tile 2: Temperature trend (timechart)
DeviceTelemetry
| where Timestamp > ago(24h)
| summarize AvgTemp = avg(Temperature) by bin(Timestamp, 15m), DeviceId
| render timechart

// Tile 3: Low battery devices (table)
DeviceTelemetry
| summarize arg_max(Timestamp, *) by DeviceId
| where BatteryPct < 20
| project DeviceId, BatteryPct, Timestamp
| sort by BatteryPct asc

// Tile 4: Device locations (map)
DeviceTelemetry
| summarize arg_max(Timestamp, *) by DeviceId
| extend lat = todouble(Location.lat), lon = todouble(Location.lon)
| project DeviceId, lat, lon, Temperature
```

**Step 4: Data Activator alert**:
- Object: `DeviceId`
- Property: `Temperature`
- Condition: `Temperature > 45 for more than 2 minutes`
- Action: Teams message to `#iot-alerts`

### Pattern 2: Application Log Analytics with Anomaly Detection

Ingest application logs, detect error rate anomalies, and alert on spikes.

**Schema**:
```kql
.create table AppLogs (
    Timestamp: datetime,
    TraceId: string,
    SpanId: string,
    Service: string,
    Level: string,
    Message: string,
    StatusCode: int,
    DurationMs: real,
    Properties: dynamic
)
```

**Error rate anomaly detection query**:
```kql
AppLogs
| where Timestamp > ago(7d)
| summarize ErrorCount = countif(Level == "Error"), TotalCount = count() by bin(Timestamp, 5m)
| extend ErrorRate = 100.0 * ErrorCount / TotalCount
| make-series ErrorRateSeries = avg(ErrorRate) default=0.0 on Timestamp step 5m
| extend (anomalies, score, baseline) = series_decompose_anomalies(ErrorRateSeries, 2.0)
| mv-expand Timestamp to typeof(datetime), ErrorRateSeries to typeof(real),
            anomalies to typeof(int), score to typeof(real)
| where anomalies == 1
| project Timestamp, ErrorRate = ErrorRateSeries, AnomalyScore = score
```

**Latency percentile dashboard tile**:
```kql
AppLogs
| where Timestamp > ago(6h) and StatusCode >= 200
| summarize p50 = percentile(DurationMs, 50),
            p95 = percentile(DurationMs, 95),
            p99 = percentile(DurationMs, 99)
    by bin(Timestamp, 5m), Service
| render timechart
```

### Pattern 3: Real-Time Sales Metrics with Data Activator Alerts

Monitor sales transactions in real time and alert when daily targets are met or anomalies occur.

**Schema**:
```kql
.create table SalesEvents (
    Timestamp: datetime,
    TransactionId: string,
    StoreId: string,
    ProductCategory: string,
    Amount: real,
    Quantity: int,
    PaymentMethod: string
)
```

**Dashboard tiles**:
```kql
// Today's revenue (stat tile)
SalesEvents
| where Timestamp > startofday(now())
| summarize TotalRevenue = sum(Amount)

// Hourly sales trend (timechart)
SalesEvents
| where Timestamp > startofday(now())
| summarize HourlyRevenue = sum(Amount), Transactions = count() by bin(Timestamp, 1h)
| render timechart

// Revenue by category (pie chart)
SalesEvents
| where Timestamp > ago(24h)
| summarize Revenue = sum(Amount) by ProductCategory
| render piechart

// Store leaderboard (bar chart)
SalesEvents
| where Timestamp > startofday(now())
| summarize Revenue = sum(Amount) by StoreId
| top 10 by Revenue desc
| render barchart
```

**Data Activator triggers**:
- Trigger 1: `DailyRevenue > $100,000` per store --> Email store manager
- Trigger 2: No transactions for 15 minutes during business hours --> Teams alert to `#ops`

### Pattern 4: Clickstream Analysis with Sessionization

Analyze website clickstream data to understand user behavior, session patterns, and conversion funnels.

**Schema**:
```kql
.create table ClickEvents (
    Timestamp: datetime,
    UserId: string,
    SessionId: string,
    PageUrl: string,
    Referrer: string,
    EventType: string,
    Properties: dynamic,
    UserAgent: string
)
```

**Sessionization and funnel analysis**:
```kql
// Sessionize clickstream with 30-minute gap threshold
let SessionizedClicks = ClickEvents
| where Timestamp > ago(7d)
| sort by UserId asc, Timestamp asc
| extend PrevTimestamp = prev(Timestamp), PrevUser = prev(UserId)
| extend Gap = iff(UserId == PrevUser, Timestamp - PrevTimestamp, timespan(null))
| extend IsNewSession = iff(isnull(Gap) or Gap > 30m, 1, 0)
| extend ComputedSessionId = row_cumsum(IsNewSession);
// Session summary
SessionizedClicks
| summarize SessionStart = min(Timestamp), SessionEnd = max(Timestamp),
            PageViews = count(), DistinctPages = dcount(PageUrl),
            EntryPage = arg_min(Timestamp, PageUrl), ExitPage = arg_max(Timestamp, PageUrl)
    by UserId, ComputedSessionId
| extend SessionDurationMin = datetime_diff("minute", SessionEnd, SessionStart)
| summarize AvgSessionDuration = avg(SessionDurationMin),
            AvgPageViews = avg(PageViews),
            TotalSessions = count()
    by bin(SessionStart, 1d)
```

**Conversion funnel**:
```kql
ClickEvents
| where Timestamp > ago(30d)
| summarize
    Step1_Home = dcountif(UserId, PageUrl == "/"),
    Step2_Product = dcountif(UserId, PageUrl has "/product/"),
    Step3_Cart = dcountif(UserId, PageUrl == "/cart"),
    Step4_Checkout = dcountif(UserId, PageUrl == "/checkout"),
    Step5_Confirm = dcountif(UserId, PageUrl == "/order-confirmation")
| project Step1_Home, Step2_Product, Step3_Cart, Step4_Checkout, Step5_Confirm,
          HomeToProduct = round(100.0 * Step2_Product / Step1_Home, 1),
          ProductToCart = round(100.0 * Step3_Cart / Step2_Product, 1),
          CartToCheckout = round(100.0 * Step4_Checkout / Step3_Cart, 1),
          CheckoutToConfirm = round(100.0 * Step5_Confirm / Step4_Checkout, 1)
```

## OneLake Desktop Sync — Local Access to Persisted Eventstream Data

If OneLake desktop sync is installed and eventstream data is persisted to a lakehouse, the output Delta tables can be read locally.

**Read eventstream output locally**:
```python
import polars as pl

path = r"C:\Users\<user>\OneLake - <tenant>\<workspace>\<lakehouse>.Lakehouse\Tables\eventstream_output"
df = pl.read_delta(path)
print(f"Events: {len(df)}, Latest: {df['EventProcessedUtcTime'].max()}")
```

**Use case**: Verify eventstream-to-lakehouse routing is working by checking row counts and latest timestamps locally, without opening the Fabric portal.

Triggers: `onelake eventstream local`, `local eventstream data`

## Progressive Disclosure — Reference Files

| Topic | File |
|---|---|
| Eventhouse and KQL Database management — REST API, table DDL, retention policies | [`references/eventhouse-kql.md`](./references/eventhouse-kql.md) |
| Eventstream configuration — sources, transformations, destinations, routing | [`references/eventstreams.md`](./references/eventstreams.md) |
| Real-Time Dashboard design — tiles, auto-refresh, parameters, embedding | [`references/realtime-dashboards.md`](./references/realtime-dashboards.md) |
| KQL query patterns — time series, anomaly detection, joins, materialized views | [`references/kusto-queries.md`](./references/kusto-queries.md) |
