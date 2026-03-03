# Database Mirroring — Onboarding Walkthrough, CDC Mechanics, Delta Table Output

This reference covers the end-to-end onboarding process for Fabric Mirroring, the CDC replication mechanics, output Delta table structure, and operational patterns for ongoing maintenance.

---

## Mirroring Architecture Overview

```
Source Database (Azure SQL / Cosmos DB / Snowflake / etc.)
    │
    ├── Phase 1: Initial Snapshot
    │     Full table scan → batched writes → Delta tables in OneLake
    │
    ├── Phase 2: CDC Catchup
    │     Change log replay → catch up to current log position
    │
    └── Phase 3: Steady-State CDC
          Continuous log tail → near-real-time Delta table updates
                │
                ▼
    OneLake (Fabric Lakehouse — mirrored database item)
          ├── _metadata/     (Fabric internal sync state)
          ├── <schema>/<table>/   (Delta tables, Parquet files)
          └── <schema>/<table>/_delta_log/   (Delta transaction log)
                │
                ▼
    Fabric SQL Analytics Endpoint (read-only T-SQL access)
    Fabric Semantic Models (Direct Lake over mirrored tables)
```

---

## Onboarding Walkthrough

### Step 1 — Create a Mirrored Database Item

```bash
TOKEN=$(az account get-access-token --resource https://api.fabric.microsoft.com --query accessToken -o tsv)
WORKSPACE_ID="your-workspace-id"

# Create a mirrored database item
curl -X POST \
  "https://api.fabric.microsoft.com/v1/workspaces/${WORKSPACE_ID}/mirroredDatabases" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "displayName": "MirroredSalesDB",
    "description": "Mirrored copy of on-prem sales database"
  }'
# Returns: { "id": "item-guid", "type": "MirroredDatabase", ... }
```

### Step 2 — Configure the Mirroring Definition

The mirroring definition specifies the source connection, tables to mirror, and replication settings. The definition is set via the item definition API using base64-encoded JSON parts.

```bash
# Retrieve item definition (after creation)
curl "https://api.fabric.microsoft.com/v1/workspaces/${WORKSPACE_ID}/mirroredDatabases/${ITEM_ID}/getDefinition" \
  -H "Authorization: Bearer ${TOKEN}"

# Update item definition with source configuration
# The definition payload structure:
{
  "definition": {
    "parts": [
      {
        "path": "mirroring.json",
        "payload": "<base64-encoded mirroring config>",
        "payloadType": "InlineBase64"
      }
    ]
  }
}
```

**mirroring.json structure (decoded):**

```json
{
  "source": {
    "type": "AzureSqlDatabase",
    "connectionId": "connection-guid",
    "database": "SalesDB"
  },
  "tables": [
    {
      "schema": "dbo",
      "table": "FactSales",
      "enabled": true
    },
    {
      "schema": "dbo",
      "table": "DimCustomer",
      "enabled": true
    },
    {
      "schema": "dbo",
      "table": "DimProduct",
      "enabled": true
    }
  ],
  "properties": {
    "landingZone": "OneLake"
  }
}
```

### Step 3 — Start Mirroring

```bash
# Start mirroring
curl -X POST \
  "https://api.fabric.microsoft.com/v1/workspaces/${WORKSPACE_ID}/mirroredDatabases/${ITEM_ID}/startMirroring" \
  -H "Authorization: Bearer ${TOKEN}"
# Returns: 200 OK (no body) — mirroring starts asynchronously
```

### Step 4 — Verify Status

```bash
# Check overall mirroring status
curl "https://api.fabric.microsoft.com/v1/workspaces/${WORKSPACE_ID}/mirroredDatabases/${ITEM_ID}/getMirroringStatus" \
  -H "Authorization: Bearer ${TOKEN}"
# Returns: { "status": "Running" | "Stopped" | "Failed" | "Initializing" }

# Check per-table replication status
curl "https://api.fabric.microsoft.com/v1/workspaces/${WORKSPACE_ID}/mirroredDatabases/${ITEM_ID}/getTablesMirroringStatus" \
  -H "Authorization: Bearer ${TOKEN}"
```

**Table status response:**

```json
{
  "data": [
    {
      "sourceSchemaName": "dbo",
      "sourceTableName": "FactSales",
      "status": "Replicating",
      "processedBytes": 10485760,
      "processedRows": 250000,
      "lastSyncTime": "2025-03-15T14:30:00Z"
    },
    {
      "sourceSchemaName": "dbo",
      "sourceTableName": "DimCustomer",
      "status": "Snapshotting",
      "processedBytes": 524288,
      "processedRows": 5000,
      "lastSyncTime": null
    }
  ]
}
```

**Table status values:**

| Status | Phase | Description |
|--------|-------|-------------|
| `Initializing` | Pre-snapshot | Connection verified; snapshot about to start |
| `Snapshotting` | Phase 1 | Initial full table scan in progress |
| `CdcCatchup` | Phase 2 | Snapshot done; replaying change log to current position |
| `Replicating` | Phase 3 | Steady-state CDC; near-real-time replication active |
| `Stopped` | Any | Mirroring manually stopped |
| `Failed` | Any | Replication error; check error details |
| `Disabled` | N/A | Table excluded from replication in config |

---

## CDC Mechanics

### How CDC Works in Fabric Mirroring

Fabric Mirroring uses **native change data capture** from each source (transaction log reading for SQL, change feed for Cosmos DB, stream API for Snowflake). It does NOT use triggers or timestamps.

```
Source Transaction Log
    │
    ├── INSERT  →  New row appears in Delta table
    ├── UPDATE  →  Row updated in Delta table (upsert by primary key)
    └── DELETE  →  Row removed from Delta table (delete-aware merge)
```

**CDC Phases in Detail:**

**Phase 1 — Initial Snapshot:**
- Fabric reads the entire table in batches of ~1M rows
- Rows are written as Parquet files to OneLake
- A `_delta_log` transaction log is created
- Source table is locked only briefly (checkpoint taken at snapshot start; log position recorded)

**Phase 2 — CDC Catchup:**
- After snapshot completes, Fabric replays all changes from the log position captured at snapshot start
- Ensures no changes are missed during the potentially slow snapshot phase
- Duration depends on how active the source was during snapshot

**Phase 3 — Steady-State CDC:**
- Continuous log tailing at the source
- Changes land in the Delta table typically within 1–30 seconds (varies by source type and load)
- Fabric batches micro-transactions to reduce Delta table write amplification

### Delta Table Merge Behavior

Fabric Mirroring uses Delta Lake **merge (upsert)** operations driven by the primary key:

```sql
-- Conceptual merge operation performed by Fabric for each CDC batch
MERGE INTO delta_table AS target
USING cdc_batch AS source
ON target.primary_key = source.primary_key
WHEN MATCHED AND source.operation = 'DELETE' THEN DELETE
WHEN MATCHED AND source.operation = 'UPDATE' THEN UPDATE SET *
WHEN NOT MATCHED AND source.operation = 'INSERT' THEN INSERT *
```

**Important:** Tables without a primary key cannot be mirrored. Fabric requires at minimum one column or composite key that uniquely identifies rows.

---

## Delta Table Output Structure

### OneLake Path Layout

```
<workspace-name>/<mirrored-database-name>.MirroredDatabase/
├── dbo/
│   ├── FactSales/
│   │   ├── _delta_log/
│   │   │   ├── 00000000000000000000.json   (table creation)
│   │   │   ├── 00000000000000000001.json   (first snapshot batch)
│   │   │   ├── 00000000000000000002.json   (CDC commit)
│   │   │   └── ...
│   │   ├── part-00000-abc123.snappy.parquet
│   │   ├── part-00001-def456.snappy.parquet
│   │   └── ...
│   ├── DimCustomer/
│   │   └── ...
│   └── DimProduct/
│       └── ...
└── _metadata/
    └── (Fabric internal sync state — do not modify)
```

### Accessing Mirrored Tables

**From a Lakehouse Shortcut (read via SQL Analytics Endpoint):**

```sql
-- The mirrored database has its own SQL Analytics Endpoint
-- Connect to: <mirrored-db-name>.datawarehouse.fabric.microsoft.com

SELECT TOP 100 *
FROM dbo.FactSales
WHERE SaleDate >= '2025-01-01'
ORDER BY SaleDate DESC;
```

**From a Spark Notebook (reading Delta directly via OneLake ABFS):**

```python
# Read a mirrored Delta table from Spark
workspace_id = "your-workspace-id"
item_id = "mirrored-database-item-id"

df = spark.read.format("delta").load(
    f"abfss://{workspace_id}@onelake.dfs.fabric.microsoft.com/"
    f"{item_id}/dbo/FactSales"
)

df.createOrReplaceTempView("FactSales")
result = spark.sql("SELECT COUNT(*) as total, MAX(SaleDate) as latest FROM FactSales")
result.show()
```

**From a Lakehouse (shortcut to mirrored table):**

```python
# Create a shortcut to the mirrored table in a lakehouse
# This allows you to query mirrored data alongside your own Delta tables

# In a notebook connected to your lakehouse:
df = spark.read.format("delta").load(
    "abfss://<workspace_id>@onelake.dfs.fabric.microsoft.com/"
    "<mirrored_db_item_id>/dbo/FactSales"
)

# Or via the shortcut if configured:
df = spark.read.format("delta").table("mirrored_sales.FactSales")
```

### Schema Mapping — Source to Delta

| Source SQL Type | Delta / Parquet Type | Notes |
|----------------|---------------------|-------|
| `INT`, `SMALLINT`, `TINYINT` | `integer` | |
| `BIGINT` | `long` | |
| `DECIMAL(p,s)`, `NUMERIC(p,s)` | `decimal(p,s)` | Precision/scale preserved |
| `FLOAT`, `REAL` | `double`, `float` | |
| `VARCHAR(n)`, `NVARCHAR(n)` | `string` | `MAX` → `string` |
| `CHAR(n)`, `NCHAR(n)` | `string` | Trailing spaces preserved |
| `DATE` | `date` | |
| `DATETIME`, `DATETIME2` | `timestamp` | Microsecond precision |
| `DATETIMEOFFSET` | `timestamp_ntz` + offset column | |
| `BIT` | `boolean` | |
| `UNIQUEIDENTIFIER` | `string` (UUID format) | |
| `VARBINARY`, `IMAGE` | `binary` | |
| `XML` | `string` (serialized XML) | |
| `JSON` (Cosmos DB) | `string` or struct | Nested docs flattened optionally |

---

## Mirroring REST API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/workspaces/{wId}/mirroredDatabases` | List all mirrored databases in workspace |
| POST | `/v1/workspaces/{wId}/mirroredDatabases` | Create a new mirrored database item |
| GET | `/v1/workspaces/{wId}/mirroredDatabases/{itemId}` | Get mirrored database item metadata |
| PATCH | `/v1/workspaces/{wId}/mirroredDatabases/{itemId}` | Update display name / description |
| DELETE | `/v1/workspaces/{wId}/mirroredDatabases/{itemId}` | Delete mirrored database item |
| POST | `/v1/workspaces/{wId}/mirroredDatabases/{itemId}/getDefinition` | Get item definition (mirroring config) |
| POST | `/v1/workspaces/{wId}/mirroredDatabases/{itemId}/updateDefinition` | Update mirroring configuration |
| POST | `/v1/workspaces/{wId}/mirroredDatabases/{itemId}/startMirroring` | Start replication |
| POST | `/v1/workspaces/{wId}/mirroredDatabases/{itemId}/stopMirroring` | Stop replication |
| POST | `/v1/workspaces/{wId}/mirroredDatabases/{itemId}/getMirroringStatus` | Get overall status |
| POST | `/v1/workspaces/{wId}/mirroredDatabases/{itemId}/getTablesMirroringStatus` | Get per-table status |

---

## Stopping and Restarting Mirroring

```bash
# Stop mirroring (preserves Delta tables in OneLake — data is not deleted)
curl -X POST \
  "https://api.fabric.microsoft.com/v1/workspaces/${WORKSPACE_ID}/mirroredDatabases/${ITEM_ID}/stopMirroring" \
  -H "Authorization: Bearer ${TOKEN}"

# Restart mirroring
# NOTE: After stop + restart, Fabric may re-snapshot tables where CDC log
# has been truncated. For SQL sources this depends on log retention settings.
curl -X POST \
  "https://api.fabric.microsoft.com/v1/workspaces/${WORKSPACE_ID}/mirroredDatabases/${ITEM_ID}/startMirroring" \
  -H "Authorization: Bearer ${TOKEN}"
```

**Important:** Stopping mirroring does NOT delete the Delta tables from OneLake. The data remains queryable. Only the live replication stops.

---

## Table Configuration — Adding and Removing Tables

To add or remove tables from an active mirroring session, update the item definition:

```python
import requests
import json
import base64

def update_mirroring_tables(workspace_id: str, item_id: str, token: str, tables: list) -> None:
    """
    Update the list of mirrored tables.
    tables: [{"schema": "dbo", "table": "TableName", "enabled": True}, ...]
    """
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    # Build the mirroring config
    config = {
        "source": {
            "type": "AzureSqlDatabase",
            "connectionId": "your-connection-id",
            "database": "SalesDB"
        },
        "tables": tables,
        "properties": {"landingZone": "OneLake"}
    }

    # Encode as base64
    encoded = base64.b64encode(json.dumps(config).encode()).decode()

    payload = {
        "definition": {
            "parts": [
                {
                    "path": "mirroring.json",
                    "payload": encoded,
                    "payloadType": "InlineBase64"
                }
            ]
        }
    }

    resp = requests.post(
        f"https://api.fabric.microsoft.com/v1/workspaces/{workspace_id}"
        f"/mirroredDatabases/{item_id}/updateDefinition",
        headers=headers,
        json=payload
    )
    resp.raise_for_status()
    print(f"Table configuration updated: {resp.status_code}")
```

---

## Error Codes and Remediation

| Error | Meaning | Fix |
|-------|---------|-----|
| `SourceNotReachable` | Fabric cannot connect to the source database | Verify network connectivity; check VNet/firewall; confirm connection ID is valid |
| `InvalidCredentials` | Source connection credentials rejected | Re-authenticate the connection in Fabric data gateway or connection settings |
| `CdcNotEnabled` | CDC not enabled on source database | Run `sys.sp_cdc_enable_db` on Azure SQL; enable Change Feed on Cosmos DB |
| `InsufficientPermissions` | Mirroring service account lacks required permissions | Grant `CONTROL DATABASE` (Azure SQL) or `Enable CDC` permission; see supported-sources.md |
| `PrimaryKeyMissing` | A mirrored table has no primary key | Add a primary key to the table or exclude it from mirroring |
| `SchemaDriftDetected` | Column added/dropped/renamed in source | Check schema drift handling; may require table re-snapshot |
| `SnapshotTimeout` | Initial snapshot exceeded maximum duration | Large table: increase timeout in support; or partition the table to reduce row count |
| `LogTruncated` | Source CDC log was truncated before Fabric consumed it | Fabric must re-snapshot the affected table; increase SQL log retention settings |
| `DeltaWriteConflict` | Concurrent write to the Delta table from an external process | Do not write to mirrored Delta tables — they are read-only managed by Fabric |
| `QuotaExceeded` | OneLake storage or request quota exceeded | Check OneLake capacity usage; reduce number of mirrored tables |

---

## Limits

| Resource | Limit | Notes |
|----------|-------|-------|
| Mirrored databases per workspace | 10 | Soft limit; contact support to increase |
| Tables per mirrored database | 500 | |
| Maximum table size (initial snapshot) | No enforced limit | Very large tables (100GB+) will take hours for initial snapshot |
| Minimum latency (steady-state) | ~1 second | Azure SQL with optimized settings |
| Typical latency (steady-state) | 5–30 seconds | Depends on source load and change volume |
| Maximum latency before alert | 30 minutes | Configurable via monitoring patterns |
| Source CDC log retention required | At least 24 hours | To survive transient connectivity issues without re-snapshot |
| Column types supported | Most SQL types | Computed columns, spatial types, and CLR types are excluded |
| OneLake Delta table access | Read-only via shortcut | Do not write to mirrored tables externally |
