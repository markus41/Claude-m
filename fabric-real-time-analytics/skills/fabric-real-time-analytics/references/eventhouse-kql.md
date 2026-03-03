# Eventhouse and KQL Database Management

Eventhouse is the logical container for KQL databases in Microsoft Fabric Real-Time Analytics. It shares compute across its databases and is the primary management boundary for Real-Time Intelligence workloads. This reference covers the Fabric REST API for Eventhouse and KQL Database management, table DDL, retention policies, and operational limits.

---

## Fabric REST API — Eventhouse

**Base URL**: `https://api.fabric.microsoft.com/v1`

**Authentication**: Azure AD bearer token with scope `https://api.fabric.microsoft.com/.default`

```bash
# Acquire token via Azure CLI
TOKEN=$(az account get-access-token --resource https://api.fabric.microsoft.com --query accessToken -o tsv)
```

### Eventhouse CRUD

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|---------------------|----------------|-------|
| GET | `/workspaces/{workspaceId}/eventhouses` | Workspace Viewer | — | Lists all Eventhouses in workspace |
| GET | `/workspaces/{workspaceId}/eventhouses/{eventhouseId}` | Workspace Viewer | — | Returns displayName, id, properties |
| POST | `/workspaces/{workspaceId}/eventhouses` | Workspace Contributor | `displayName`, `description` | Creates Eventhouse; returns 201 with location header |
| PATCH | `/workspaces/{workspaceId}/eventhouses/{eventhouseId}` | Workspace Contributor | `displayName`, `description` | Partial update; omit fields to leave unchanged |
| DELETE | `/workspaces/{workspaceId}/eventhouses/{eventhouseId}` | Workspace Admin | — | Irreversible; deletes all child KQL databases |

```bash
# Create an Eventhouse
curl -X POST "https://api.fabric.microsoft.com/v1/workspaces/${WORKSPACE_ID}/eventhouses" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "displayName": "prod-telemetry-eventhouse",
    "description": "Production IoT telemetry and log analytics"
  }'

# Get Eventhouse details
curl "https://api.fabric.microsoft.com/v1/workspaces/${WORKSPACE_ID}/eventhouses/${EVENTHOUSE_ID}" \
  -H "Authorization: Bearer ${TOKEN}"
```

---

## Fabric REST API — KQL Database

### KQL Database CRUD

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|---------------------|----------------|-------|
| GET | `/workspaces/{workspaceId}/kqlDatabases` | Workspace Viewer | — | Lists all KQL databases in workspace |
| GET | `/workspaces/{workspaceId}/kqlDatabases/{kqlDatabaseId}` | Workspace Viewer | — | Includes queryServiceUri, ingestionServiceUri |
| POST | `/workspaces/{workspaceId}/kqlDatabases` | Workspace Contributor | `displayName`, `parentEventhouseItemId` | Associates database with Eventhouse |
| PATCH | `/workspaces/{workspaceId}/kqlDatabases/{kqlDatabaseId}` | Workspace Contributor | `displayName`, `description` | Partial update |
| DELETE | `/workspaces/{workspaceId}/kqlDatabases/{kqlDatabaseId}` | Workspace Admin | — | Deletes all tables and data |

```bash
# Create KQL Database under an Eventhouse
curl -X POST "https://api.fabric.microsoft.com/v1/workspaces/${WORKSPACE_ID}/kqlDatabases" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "displayName": "iot-telemetry-db",
    "description": "IoT device telemetry — 90-day hot retention",
    "creationPayload": {
      "databaseType": "ReadWrite",
      "parentEventhouseItemId": "'${EVENTHOUSE_ID}'"
    }
  }'

# Get KQL Database connection details
curl "https://api.fabric.microsoft.com/v1/workspaces/${WORKSPACE_ID}/kqlDatabases/${KQL_DB_ID}" \
  -H "Authorization: Bearer ${TOKEN}"
```

**Response fields**:
| Field | Description |
|-------|-------------|
| `id` | KQL database item ID (GUID) |
| `displayName` | Display name |
| `queryServiceUri` | KQL query endpoint (use with Kusto SDK) |
| `ingestionServiceUri` | Streaming ingestion endpoint |
| `databaseType` | `ReadWrite` or `ReadOnly` (shortcut) |

---

## KQL Table DDL

KQL table management uses `.create`, `.alter`, and `.drop` commands executed against the KQL database endpoint.

### Create Table

```kql
// Basic table creation
.create table DeviceTelemetry (
    Timestamp: datetime,
    DeviceId: string,
    Temperature: real,
    Humidity: real,
    Pressure: real,
    Status: string,
    Properties: dynamic
)

// Table with docstring
.create table DeviceTelemetry (
    Timestamp: datetime,
    DeviceId: string,
    Temperature: real
)
with (docstring = "IoT device temperature readings at 5-second intervals",
      folder = "IoT")
```

### Create Table with Ingestion Mapping

```kql
// JSON ingestion mapping
.create table DeviceTelemetry ingestion json mapping "DeviceMapping"
'[
  { "column": "Timestamp",   "path": "$.timestamp",  "datatype": "datetime" },
  { "column": "DeviceId",    "path": "$.device_id",  "datatype": "string"   },
  { "column": "Temperature", "path": "$.temp_c",     "datatype": "real"     },
  { "column": "Status",      "path": "$.status",     "datatype": "string"   }
]'

// CSV ingestion mapping
.create table SensorReadings ingestion csv mapping "SensorCsvMapping"
'[
  { "column": "Timestamp",  "ordinal": 0, "datatype": "datetime" },
  { "column": "SensorId",   "ordinal": 1, "datatype": "string"   },
  { "column": "Value",      "ordinal": 2, "datatype": "real"     }
]'
```

### Alter Table — Add Columns

```kql
// Add a single column
.alter-merge table DeviceTelemetry (FirmwareVersion: string)

// Add multiple columns at once
.alter-merge table DeviceTelemetry (
    FirmwareVersion: string,
    BatteryLevel: real,
    SignalStrength: int
)
```

### Alter Table — Rename

```kql
.rename table DeviceTelemetry to DeviceTelemetryArchive
```

### Drop Table

```kql
// Drop a single table
.drop table DeviceTelemetry

// Drop multiple tables
.drop tables (DeviceTelemetry, SensorReadings, AuditLog)

// Drop table if exists (safe)
.drop table DeviceTelemetry ifexists
```

### Show Table Schema

```kql
.show table DeviceTelemetry schema as csl

.show tables
| project TableName, Folder, DocString

.show table DeviceTelemetry details
```

---

## Retention and Caching Policies

### Database-Level Retention

```kql
// Set database-level hot cache to 30 days, soft-delete to 365 days
.alter database IoTTelemetryDB policy retention
'{
  "SoftDeletePeriod": "365.00:00:00",
  "Recoverability": "Enabled"
}'

// Set database-level cache policy (hot data window)
.alter database IoTTelemetryDB policy caching hot = 30d
```

### Table-Level Retention

```kql
// Override retention for a specific table (overrides database policy)
.alter table DeviceTelemetry policy retention
'{
  "SoftDeletePeriod": "90.00:00:00",
  "Recoverability": "Disabled"
}'

// Table-level cache — keep only last 7 days hot
.alter table DeviceTelemetry policy caching hot = 7d

// Show current policies
.show table DeviceTelemetry policy retention
.show table DeviceTelemetry policy caching
```

### Retention Policy Fields

| Field | Type | Description |
|-------|------|-------------|
| `SoftDeletePeriod` | timespan | How long data is kept before permanent deletion. Format: `days.hh:mm:ss` |
| `Recoverability` | string | `Enabled` = data can be recovered within 14 days after soft-delete; `Disabled` = immediate deletion |

---

## Streaming Ingestion

```kql
// Enable streaming ingestion on a table
.alter table DeviceTelemetry policy streamingingestion enable

// Verify streaming ingestion policy
.show table DeviceTelemetry policy streamingingestion
```

**Streaming ingestion limits**:
| Resource | Limit | Notes |
|----------|-------|-------|
| Throughput per table | 4 MB/s | Aggregate across all producers |
| Rows per second | ~500K | Depends on row size |
| Max row size | 64 KB | Larger rows must use batched ingestion |
| Latency | < 10 seconds | Typical end-to-end from ingest to queryable |

---

## Batched Ingestion

```kql
// Tune batching policy for lower latency at cost of efficiency
.alter table DeviceTelemetry policy ingestionbatching
'{
  "MaximumBatchingTimeSpan": "00:00:30",
  "MaximumNumberOfItems": 500,
  "MaximumRawDataSizeMB": 1024
}'

// Optimize batching for high-throughput bulk loads
.alter table DeviceTelemetry policy ingestionbatching
'{
  "MaximumBatchingTimeSpan": "00:05:00",
  "MaximumNumberOfItems": 100000,
  "MaximumRawDataSizeMB": 1024
}'
```

---

## Materialized Views

Materialized views pre-aggregate data for fast query performance, automatically updated as new data arrives.

```kql
// Create a materialized view — hourly aggregation
.create materialized-view with (backfill=true)
DeviceTelemetry_Hourly
on table DeviceTelemetry
{
    DeviceTelemetry
    | summarize
        AvgTemperature = avg(Temperature),
        MaxTemperature = max(Temperature),
        MinTemperature = min(Temperature),
        ReadingCount = count()
        by DeviceId, bin(Timestamp, 1h)
}

// Query the materialized view (fast)
DeviceTelemetry_Hourly
| where Timestamp > ago(7d)
| where DeviceId == "MCH-042"
| order by Timestamp desc

// Check materialized view status
.show materialized-view DeviceTelemetry_Hourly
```

**Materialized view backfill** (`backfill=true`) processes historical data asynchronously. Monitor progress:

```kql
.show materialized-view DeviceTelemetry_Hourly details
| project Name, MaterializedTo, LastRunTime, IsHealthy
```

---

## Update Policies

Update policies run a transformation function each time data is ingested, populating a derived table automatically.

```kql
// Create the target table
.create table DeviceAlerts (
    Timestamp: datetime,
    DeviceId: string,
    AlertType: string,
    Temperature: real
)

// Create the transformation function
.create function DeviceAlertsTransform() {
    DeviceTelemetry
    | where Temperature > 85 or Status == "Error"
    | project Timestamp, DeviceId,
              AlertType = iff(Temperature > 85, "HighTemp", "ErrorStatus"),
              Temperature
}

// Attach the update policy
.alter table DeviceAlerts policy update
@'[{
  "IsEnabled": true,
  "Source": "DeviceTelemetry",
  "Query": "DeviceAlertsTransform",
  "IsTransactional": false,
  "PropagateIngestionProperties": true
}]'
```

---

## Error Codes and Remediation

| Code / Error | Meaning | Remediation |
|---|---|---|
| `403 Forbidden` | Caller lacks permissions on workspace or database | Assign Contributor/Admin role on the workspace |
| `404 Not Found` | Eventhouse or KQL database ID is invalid | Verify IDs with GET list endpoint |
| `409 Conflict` | Item with same displayName already exists | Use a unique name or DELETE the existing item first |
| `Partial query failure: MemoryError` | Query exceeded per-node memory limit | Add `summarize` early in query; use `hint.shufflekey` |
| `Partial query failure: TimeoutError` | Query exceeded 4-minute execution timeout | Break into smaller time ranges; use materialized views |
| `Streaming ingestion disabled` | Table does not have streaming policy enabled | Run `.alter table T policy streamingingestion enable` |
| `Ingestion mapping not found` | Referenced mapping name does not exist | Create mapping with `.create table T ingestion json mapping` |
| `Schema mismatch` | Ingested data columns do not match table schema | Use `.alter-merge table` to add missing columns |
| `Soft delete period expired` | Data was purged and cannot be recovered | Increase SoftDeletePeriod before expiry |
| `Materialized view backfill timeout` | Large historical dataset took too long | Re-create view with `backfill=false` for forward-only |

---

## Limits

| Resource | Limit | Notes |
|----------|-------|-------|
| KQL databases per Eventhouse | 100 | Soft limit; contact support to increase |
| Tables per KQL database | 10,000 | Practical limit before performance degradation |
| Columns per table | 10,000 | Includes dynamic column expansions |
| Max row size (batched ingestion) | 1 MB | Larger payloads must be split |
| Max query result size | 500,000 rows / 64 MB | Use `take` + pagination for large exports |
| Query execution timeout | 4 minutes | Use `.set notruncation` only for admin queries |
| Max concurrent queries per database | 256 | Throttling above this limit |
| Soft-delete period maximum | 3,650 days (10 years) | Verify your Fabric capacity licensing |
| Hot cache maximum | Equal to soft-delete period | Hot cache cannot exceed total retention |
| Materialized views per database | 500 | |
| Update policy chains | 2 levels deep | A -> B -> C is max; avoid cascading update policies |

---

## Common Patterns and Gotchas

**Pattern: OneLake availability**
KQL database data is automatically available in OneLake under the workspace's lakehouse path. Query it from a Spark notebook using the Delta format shortcut:
```python
df = spark.read.format("delta").load("abfss://<workspace>@onelake.dfs.fabric.microsoft.com/<kql-db-id>/Tables/<TableName>")
```
Note: OneLake availability has a lag of a few minutes from ingestion.

**Pattern: Cross-database queries**
```kql
// Query a table in another KQL database within the same Eventhouse
cluster('https://<eventhouse-uri>').database('OtherDatabase').TableName
| where Timestamp > ago(1h)

// Simpler within same cluster
database('OtherDatabase').TableName | take 10
```

**Gotcha: Streaming ingestion and update policies conflict**
Do not enable both streaming ingestion and update policies on the same source table. Streaming ingestion bypasses the update policy pipeline. Use batched ingestion when update policies are needed.

**Gotcha: Dynamic column performance**
Querying inside `dynamic` columns (e.g., `Properties.temperature`) is slower than querying typed columns. For frequently queried fields, extract them into typed columns using an update policy or `.alter-merge table`.

**Gotcha: Soft-delete vs hard-delete**
`Recoverability: Enabled` costs storage (data is soft-deleted and retained for 14 days). For large tables with frequent purges, set `Recoverability: Disabled` to avoid storage bloat.

**Pattern: Table partitioning for hot path performance**
```kql
// Partition by DeviceId hash for high-cardinality tables
.alter table DeviceTelemetry policy partitioning
'{
  "PartitionKeys": [
    {
      "ColumnName": "DeviceId",
      "Kind": "Hash",
      "Properties": { "MaxPartitionCount": 128 }
    }
  ]
}'
```
Use hash partitioning only when most queries filter on the partition column. The overhead is not worth it for ad-hoc analytical workloads.

**Pattern: Continuous export to OneLake**
For long-term archival beyond retention limits:
```kql
.create-or-alter continuous-export LongTermArchive
over (DeviceTelemetry)
to table ExternalTable
with (intervalBetweenRuns=1h,
      forcedLatency=10m,
      distributed=true)
<|
DeviceTelemetry
| where Timestamp > ago(1h)
```
