# Eventstreams — Configuration, Sources, Transformations, and Destinations

Fabric Eventstreams is the no-code/low-code streaming ingestion pipeline in Microsoft Fabric Real-Time Intelligence. It connects event sources to multiple destinations with optional real-time transformations. This reference covers source connectors, transformation operators, destination routing, and the Fabric REST API for eventstream management.

---

## Eventstream REST API

**Base URL**: `https://api.fabric.microsoft.com/v1`

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|---------------------|----------------|-------|
| GET | `/workspaces/{workspaceId}/eventstreams` | Workspace Viewer | — | Lists all eventstreams |
| GET | `/workspaces/{workspaceId}/eventstreams/{eventstreamId}` | Workspace Viewer | — | Returns definition with sources and destinations |
| POST | `/workspaces/{workspaceId}/eventstreams` | Workspace Contributor | `displayName` | Creates empty eventstream |
| PATCH | `/workspaces/{workspaceId}/eventstreams/{eventstreamId}` | Workspace Contributor | `displayName`, `description` | Partial update |
| DELETE | `/workspaces/{workspaceId}/eventstreams/{eventstreamId}` | Workspace Admin | — | Stops all active flows; irreversible |

```bash
# Create an Eventstream
curl -X POST "https://api.fabric.microsoft.com/v1/workspaces/${WORKSPACE_ID}/eventstreams" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "displayName": "iot-device-telemetry-stream",
    "description": "Ingests telemetry from Azure IoT Hub to KQL and Lakehouse"
  }'
```

---

## Supported Event Sources

### Azure Event Hubs

| Parameter | Description | Example |
|-----------|-------------|---------|
| Event Hub namespace | Fully qualified hostname | `contoso-iot.servicebus.windows.net` |
| Event Hub name | Hub name within namespace | `device-telemetry` |
| Consumer group | Partition consumer group | `$Default` or a dedicated group |
| Authentication | Shared Access Key or Managed Identity | Prefer Managed Identity for production |
| Data format | JSON, Avro, CSV, Parquet | JSON is most common |
| Compression | None, GZip, Deflate | |

**Best practice**: Create a dedicated consumer group per eventstream destination. Sharing `$Default` with other consumers causes checkpoint conflicts.

### Azure IoT Hub

| Parameter | Description | Notes |
|-----------|-------------|-------|
| IoT Hub hostname | `<hub>.azure-devices.net` | |
| Consumer group | Built-in endpoint consumer group | Create a dedicated group |
| Endpoint | Built-in events endpoint | |
| Authentication | SAS token or Managed Identity | |

IoT Hub messages include system properties (`iothub-connection-device-id`, `iothub-enqueuedtime`) automatically available as columns in the eventstream.

### Kafka (Compatible Sources)

Supported sources exposing Kafka protocol:
- Azure Event Hubs with Kafka surface
- Confluent Cloud
- On-premises Kafka clusters (via VNet integration)

| Parameter | Description |
|-----------|-------------|
| Bootstrap servers | Comma-separated `host:port` list |
| Topic | Kafka topic name |
| Consumer group | Consumer group ID |
| Security protocol | `SASL_SSL`, `SASL_PLAINTEXT`, `SSL` |
| SASL mechanism | `PLAIN`, `SCRAM-SHA-256`, `SCRAM-SHA-512` |
| Authentication | Username/password or OAuth |

### Custom App (REST)

The Custom App source provides an HTTPS endpoint and connection string for applications to push events.

```python
# Python example — send events via Eventhub SDK to Custom App endpoint
from azure.eventhub import EventHubProducerClient, EventData
import json

connection_string = "<custom-app-connection-string-from-portal>"
producer = EventHubProducerClient.from_connection_string(connection_string)

event_batch = producer.create_batch()
event_batch.add(EventData(json.dumps({
    "deviceId": "MCH-042",
    "temperature": 87.3,
    "timestamp": "2025-03-15T14:30:05Z"
})))
producer.send_batch(event_batch)
producer.close()
```

### Sample Data Source

Built-in sample data sources for testing (no external infrastructure required):
- **Bicycle rentals**: Location, duration, bike type
- **Stock market ticks**: Symbol, price, volume
- **Yellow taxi rides**: Trip metadata, fares

---

## Transformation Operators

Transformations are applied in the eventstream canvas between source and destination. They execute as continuous streaming queries.

### Filter

Passes only events matching a predicate. Drops non-matching events.

```
// Keep only events from devices with temperature above threshold
Temperature > 50 AND DeviceId startsWith "MCH-"
```

| Property | Value |
|----------|-------|
| Operator | `=`, `!=`, `>`, `<`, `>=`, `<=`, `contains`, `startsWith`, `endsWith` |
| Logical | `AND`, `OR`, `NOT` |
| Null handling | Null values fail comparisons — use `isNotNull()` check |

### Project (Select Columns)

Selects a subset of columns to pass downstream. Reduces payload size.

```
Select columns: Timestamp, DeviceId, Temperature, Status
Drop columns: Metadata, InternalTag, ProcessingFlags
```

**Note**: Dropping columns reduces storage costs for KQL and Lakehouse destinations. Always project before routing to multiple destinations.

### Derived Column (Computed Fields)

Adds new columns based on expressions over existing columns.

| Expression Type | Example | Output |
|-----------------|---------|--------|
| Arithmetic | `Temperature * 1.8 + 32` | Celsius to Fahrenheit |
| String concat | `CONCAT(Plant, '-', Line)` | Composite key |
| Type cast | `CAST(OrderId AS bigint)` | String to integer |
| Conditional | `IIF(Status == 'OK', 1, 0)` | Boolean flag |
| Timestamp format | `DATEADD(hour, -8, EventTime)` | UTC to PST |

### Aggregate (Windowed Aggregation)

Pre-aggregates events over a time window before sending to destinations.

| Window Type | Description | Use Case |
|-------------|-------------|----------|
| Tumbling | Non-overlapping fixed intervals (e.g., every 5 min) | Batch summaries |
| Hopping | Overlapping fixed windows (e.g., 5-min window every 1 min) | Sliding averages |
| Session | Variable-length windows based on inactivity gap | User session analytics |

```
// Tumbling window — 1-minute averages
Window type: Tumbling
Window size: 1 minute
Aggregations:
  AvgTemperature = AVG(Temperature)
  MaxTemperature = MAX(Temperature)
  EventCount = COUNT(*)
Group by: DeviceId
```

**Important**: Windowed aggregations introduce latency equal to the window size plus watermark delay. Do not use aggregation if sub-second action latency is needed in Data Activator.

### Union

Merges two or more event streams with compatible schemas into a single stream.

Requirements:
- All input streams must have the same column names and compatible data types.
- Timestamp columns must align.

### Expand (Array Expansion)

Flattens an array-type column into individual rows. Useful for IoT payloads that batch multiple readings per message.

```json
// Input event
{ "deviceId": "MCH-042", "readings": [
    {"ts": "2025-03-15T14:30:00Z", "temp": 85.1},
    {"ts": "2025-03-15T14:30:05Z", "temp": 85.3}
]}

// After Expand on 'readings':
// Row 1: { deviceId: "MCH-042", ts: "...", temp: 85.1 }
// Row 2: { deviceId: "MCH-042", ts: "...", temp: 85.3 }
```

### Group By (with Aggregation)

Similar to SQL GROUP BY with time-windowed aggregation.

---

## Destinations

### KQL Database

| Parameter | Description | Notes |
|-----------|-------------|-------|
| Workspace | Target workspace | Must contain a KQL database |
| KQL Database | Target database | |
| Table | Target table (existing or new) | Schema auto-created from first batch if new |
| Ingestion mapping | JSON/CSV mapping name | Optional; uses default if omitted |
| Ingestion mode | Streaming or Batched | Streaming: < 10s latency; Batched: higher throughput |

**Streaming vs Batched ingestion**:
- **Streaming**: Events available for query within seconds. Maximum 4 MB/s per table.
- **Batched**: Events available within 2–5 minutes (default batching interval). Higher throughput, lower cost.

### Lakehouse (Delta Table)

| Parameter | Description | Notes |
|-----------|-------------|-------|
| Workspace | Target workspace | |
| Lakehouse | Target Lakehouse | |
| Table | Delta table name | Created automatically if not present |
| Partition columns | Columns to partition Delta by | Partition by date for time-series data |

```python
# Read the eventstream's Delta output from a notebook
df = spark.read.format("delta").load(
    "abfss://<workspace>@onelake.dfs.fabric.microsoft.com/<lakehouse>/Tables/DeviceTelemetry"
)
df.show()
```

### Data Activator (Reflex)

Routes events directly to a Reflex item for trigger evaluation. No intermediate storage.

| Parameter | Description |
|-----------|-------------|
| Workspace | Workspace containing the Reflex item |
| Reflex item | Target Reflex item name |

### Fabric OneLake (Files)

Routes events as files (JSON, Parquet) into OneLake's Files section (unmanaged files, not Delta tables).

### Custom Endpoint (Webhook / Event Hubs)

Routes events to an external Azure Event Hub or HTTPS endpoint for downstream processing outside Fabric.

---

## Multi-Destination Routing

An eventstream can route to multiple destinations simultaneously. Use the canvas to branch the stream after filtering or transformation.

```
IoT Hub Source
    │
    ├── [Filter: all events]     ─────► KQL Database (raw storage)
    │
    ├── [Filter: Temperature > 80] ──► Data Activator (alerts)
    │
    └── [Aggregate: 5-min avg] ──────► Lakehouse (reporting table)
```

**Design rule**: Apply transformations (Filter, Project) upstream of the branch point so each downstream destination only processes the data it needs.

---

## Error Codes and Remediation

| Code / Error | Meaning | Remediation |
|---|---|---|
| `Source connection failed` | Event Hub / IoT Hub connection string invalid or SAS expired | Regenerate SAS key or re-authorize Managed Identity |
| `Consumer group conflict` | Another consumer already holds the lease | Create a dedicated consumer group for this eventstream |
| `Schema evolution error` | New column in source not in target KQL table | Run `.alter-merge table T (NewColumn: string)` in KQL |
| `KQL ingestion throttled` | Exceeds streaming ingestion rate limit (4 MB/s) | Switch destination to batched ingestion mode |
| `Destination not reachable` | KQL database or Lakehouse deleted/moved | Reconnect destination in eventstream canvas |
| `Watermark behind` | Event source has large backlog; watermark cannot advance | Scale up Event Hub partitions; check consumer group health |
| `Invalid JSON at offset` | Source events contain malformed JSON | Add a Filter transformation to drop malformed events upstream |
| `403 on destination` | Eventstream service principal lacks write access | Grant Contributor role to the Fabric eventstream identity on destination workspace |

---

## Limits

| Resource | Limit | Notes |
|----------|-------|-------|
| Sources per eventstream | 10 | |
| Destinations per eventstream | 10 | |
| Transformation nodes per eventstream | 20 | |
| Max event size | 1 MB | Per individual event |
| Max throughput per eventstream | Depends on Fabric SKU | F4: ~10 MB/s; F64: ~100 MB/s |
| Event Hub partitions supported | Up to 1,024 | Match eventstream concurrency to partition count |
| Streaming ingestion to KQL | 4 MB/s per table | Aggregate limit across all producers |
| Windowed aggregation max window | 7 days | Session window max inactive gap: 24 hours |
| Eventstream retention (replay) | 1 day | Events not consumed within 1 day are dropped |

---

## Common Patterns and Gotchas

**Pattern: Deduplicate events**
Use a derived column `MessageId` from the source's sequence number, then use an aggregate `LAST(*)` grouped by `MessageId` in a short tumbling window (1 minute) to deduplicate retry storms from producers.

**Pattern: Schema normalization**
IoT devices often send different schemas per firmware version. Use the Union transformation to merge normalized streams from per-version filter branches, producing a single consistent schema for downstream KQL tables.

**Pattern: Fanout to dev and prod**
During testing, add a second KQL destination pointing to a dev database alongside the prod destination. Remove it after validation. This avoids running two separate eventstreams.

**Gotcha: Eventstream restart resets consumer offset**
When you stop and restart an eventstream, it resumes from the last committed checkpoint. However, if the eventstream is deleted and recreated, it starts from the current position (not the beginning). Use a long Event Hub retention period (7 days minimum) to allow recovery.

**Gotcha: Dynamic schema and Lakehouse destinations**
The Lakehouse Delta table schema is inferred from the first batch of events. If the source schema changes (new columns added), the Delta table must be updated with `ALTER TABLE` in a Spark notebook, or the eventstream destination will fail.

**Gotcha: Aggregate window and Data Activator**
When using windowed aggregation before a Data Activator destination, the minimum alerting latency equals the window size. For sub-minute alerting, route raw events directly to Data Activator without aggregation.

**Pattern: Monitor eventstream health**
```kql
// Check ingestion rate into KQL destination (from KQL database)
.show ingestion failures | take 20

// Operational stats
.show operations
| where StartedOn > ago(1h)
| where OperationKind == "DataIngestPull"
| summarize count() by State, bin(StartedOn, 5m)
```
