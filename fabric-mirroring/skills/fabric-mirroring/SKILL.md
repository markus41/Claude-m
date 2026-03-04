---
name: Fabric Mirroring
description: >
  Advanced Fabric Mirroring guidance for source onboarding, CDC replication reliability, latency monitoring, schema drift management, and reconciliation workflows.
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
triggers:
  - fabric mirroring
  - mirrored database
  - cdc lag
  - replication health
  - schema drift mirroring
  - fabric reconciliation
  - source onboarding fabric
  - mirroring incident
---

# Fabric Mirroring

## 1. Overview

Microsoft Fabric Mirroring continuously replicates data from external database sources into a Fabric Lakehouse using Change Data Capture (CDC). The replicated data lands as Delta Parquet files in OneLake, making it immediately available for analytics via Lakehouse SQL endpoints, semantic models, notebooks, and KQL queries — without data movement pipelines.

**Supported source systems**:
| Source | Authentication | CDC Mechanism |
|--------|---------------|--------------|
| Azure SQL Database | SQL login or Managed Identity | SQL Server CDC (log-based) |
| Azure SQL Managed Instance | SQL login or Managed Identity | SQL Server CDC (log-based) |
| Azure Cosmos DB (NoSQL) | Account key or Managed Identity | Cosmos DB Change Feed |
| Snowflake | Username/password or Key Pair | Snowflake Streams |
| Azure Database for PostgreSQL | Service principal or password | pglogical / logical replication |
| Azure Database for MySQL | Password | Binlog replication |
| Open Mirroring (custom sources) | OAuth / custom | Custom event feed |

**Mirroring vs alternative ingestion patterns**:
| Approach | Latency | Complexity | Use case |
|----------|---------|-----------|----------|
| Fabric Mirroring | Seconds–minutes | Low | Continuous replication from supported sources |
| Data Factory Copy | Hours (scheduled) | Medium | Batch extracts, complex transformations |
| Eventstream | Sub-seconds | Medium | Event-based streaming |
| Shortcut (read-only) | Query-time | Low | Read-only access to external data |

---

## 2. Quick Start

### Onboard an Azure SQL Database

```
1. Open a Fabric workspace.
2. Click + New item > Mirrored Database.
3. Select Azure SQL Database.
4. Enter:
   - Server name: contoso.database.windows.net
   - Database name: SalesDB
   - Authentication: SQL login (username/password) or Managed Identity
5. Test connection.
6. Select tables to replicate (or select all).
7. Click Mirror.
8. Monitor status in the Mirroring monitoring page.
```

### Verify Replication is Active

```bash
# Get mirrored database status
curl "https://api.fabric.microsoft.com/v1/workspaces/${WORKSPACE_ID}/mirroredDatabases/${MIRRORED_DB_ID}" \
  -H "Authorization: Bearer ${TOKEN}"

# Get replication status per table
curl "https://api.fabric.microsoft.com/v1/workspaces/${WORKSPACE_ID}/mirroredDatabases/${MIRRORED_DB_ID}/tableStatuses" \
  -H "Authorization: Bearer ${TOKEN}"
```

---

## 3. Core Concepts

### How Mirroring Works

```
Source Database (Azure SQL)
    │
    ├── CDC enabled on source tables
    │   (Fabric enables this automatically if needed)
    │
    ▼
Fabric Mirroring Service
    │ (reads CDC log changes every few seconds)
    │
    ▼
OneLake (Delta Parquet files)
    ├── Tables/SourceTableName/  (Delta format)
    └── _delta_log/              (transaction log)
    │
    ├──► Lakehouse SQL endpoint (T-SQL queries)
    ├──► Semantic model (Power BI Direct Lake)
    ├──► Spark notebooks (PySpark)
    └──► KQL database (via shortcut)
```

### CDC Replication Phases

| Phase | Description | Duration |
|-------|-------------|----------|
| Initial snapshot | Full copy of all selected tables | Minutes to hours depending on table size |
| CDC catchup | Applies changes that occurred during snapshot | Short |
| Steady-state CDC | Continuous replication of INSERT/UPDATE/DELETE | Ongoing |

**Important**: During the initial snapshot, the mirrored tables are not queryable. Fabric creates the Delta table atomically only when the snapshot is complete.

### Change Data Capture Details

| Operation | How Mirrored |
|-----------|-------------|
| INSERT | New row added to Delta table |
| UPDATE | Existing row updated in-place (Delta merge) |
| DELETE | Row deleted from Delta table |
| TRUNCATE | All rows deleted from mirrored Delta table |
| DDL (ALTER TABLE) | See Schema Drift section |

**Latency**: Steady-state latency is typically 5–60 seconds from source commit to OneLake availability. Latency increases under heavy source load or during capacity throttling.

---

## 4. Mirroring REST API

**Base URL**: `https://api.fabric.microsoft.com/v1`

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|---------------------|----------------|-------|
| GET | `/workspaces/{wId}/mirroredDatabases` | Workspace Viewer | — | Lists all mirrored databases |
| GET | `/workspaces/{wId}/mirroredDatabases/{mId}` | Workspace Viewer | — | Returns mirrored DB details and status |
| POST | `/workspaces/{wId}/mirroredDatabases` | Workspace Contributor | Definition JSON | Create a mirrored database |
| PATCH | `/workspaces/{wId}/mirroredDatabases/{mId}` | Workspace Contributor | `displayName` | Update metadata |
| DELETE | `/workspaces/{wId}/mirroredDatabases/{mId}` | Workspace Admin | — | Stop mirroring and delete |
| POST | `/workspaces/{wId}/mirroredDatabases/{mId}/startMirroring` | Workspace Contributor | — | Resume stopped mirroring |
| POST | `/workspaces/{wId}/mirroredDatabases/{mId}/stopMirroring` | Workspace Contributor | — | Pause mirroring |
| GET | `/workspaces/{wId}/mirroredDatabases/{mId}/tableStatuses` | Workspace Viewer | — | Per-table replication status and latency |

```bash
# Start mirroring
curl -X POST \
  "https://api.fabric.microsoft.com/v1/workspaces/${WORKSPACE_ID}/mirroredDatabases/${MIRRORED_DB_ID}/startMirroring" \
  -H "Authorization: Bearer ${TOKEN}"

# Stop mirroring
curl -X POST \
  "https://api.fabric.microsoft.com/v1/workspaces/${WORKSPACE_ID}/mirroredDatabases/${MIRRORED_DB_ID}/stopMirroring" \
  -H "Authorization: Bearer ${TOKEN}"

# Get table-level replication status
curl "https://api.fabric.microsoft.com/v1/workspaces/${WORKSPACE_ID}/mirroredDatabases/${MIRRORED_DB_ID}/tableStatuses" \
  -H "Authorization: Bearer ${TOKEN}"
```

**Table status response**:
```json
{
  "value": [
    {
      "sourceTableName": "dbo.FactSales",
      "status": "Replicating",
      "lastSyncedTime": "2025-03-15T14:29:55Z",
      "replicationLagSeconds": 12,
      "rowCount": 450000000,
      "phase": "CDC"
    },
    {
      "sourceTableName": "dbo.DimProduct",
      "status": "Replicating",
      "lastSyncedTime": "2025-03-15T14:29:58Z",
      "replicationLagSeconds": 5,
      "rowCount": 25000,
      "phase": "CDC"
    }
  ]
}
```

---

## 5. Source-Specific Requirements

### Azure SQL Database

**Prerequisites**:
- SQL Server compatibility level 130+ (SQL Server 2016+)
- `db_owner` or `db_datareader` + `VIEW DATABASE STATE` permissions
- CDC not required to be pre-enabled (Fabric enables it)
- Sufficient storage on source for CDC log retention (minimum 24 hours)

**Required SQL permissions**:
```sql
-- Create a dedicated user for Fabric Mirroring
CREATE USER FabricMirror FOR LOGIN FabricMirrorLogin;
ALTER ROLE db_owner ADD MEMBER FabricMirror;

-- OR with minimal permissions:
ALTER ROLE db_datareader ADD MEMBER FabricMirror;
GRANT VIEW DATABASE STATE TO FabricMirror;
GRANT EXECUTE ON sys.sp_cdc_add_job TO FabricMirror;
GRANT EXECUTE ON sys.sp_cdc_enable_table TO FabricMirror;
```

**Firewall configuration**:
```sql
-- Allow Fabric Mirroring service IPs (or use Managed Identity + Private Endpoint)
-- Azure portal > Azure SQL Database > Networking > Firewall rules
-- Add Fabric Mirroring service IP ranges for your Azure region
-- OR: Enable "Allow Azure services and resources to access this server"
```

### Azure Cosmos DB

**Prerequisites**:
- Cosmos DB account with API: Core (SQL)
- Change Feed enabled on the Cosmos DB account
- Account key or Managed Identity with "Cosmos DB Account Reader" role

**Container requirements**:
- Containers must have a defined partition key
- Containers used by multiple applications: verify Change Feed retention (default 24 hours)

```javascript
// Test Change Feed is enabled (Azure CLI)
az cosmosdb show --name contoso-cosmos --resource-group rg-data \
  --query "enableAnalyticalStorage"
```

### Snowflake

**Prerequisites**:
- Snowflake account on a cloud provider and region Fabric supports
- USAGE permission on database and schema
- SELECT permission on tables to be mirrored
- SHOW STREAMS permission

```sql
-- Create Snowflake user for Fabric Mirroring
CREATE USER FABRIC_MIRROR_USER PASSWORD='strong-password' DEFAULT_ROLE = FABRIC_MIRROR_ROLE;
CREATE ROLE FABRIC_MIRROR_ROLE;
GRANT USAGE ON DATABASE SALES_DB TO ROLE FABRIC_MIRROR_ROLE;
GRANT USAGE ON SCHEMA SALES_DB.PUBLIC TO ROLE FABRIC_MIRROR_ROLE;
GRANT SELECT ON ALL TABLES IN SCHEMA SALES_DB.PUBLIC TO ROLE FABRIC_MIRROR_ROLE;
GRANT ROLE FABRIC_MIRROR_ROLE TO USER FABRIC_MIRROR_USER;
```

---

## 6. Schema Drift Handling

Schema drift occurs when the source table structure changes (columns added, modified, or removed) after mirroring is established.

### Behavior by Change Type

| DDL Change | Default Behavior | Action Required |
|-----------|-----------------|----------------|
| ADD COLUMN | Auto-detects; adds column to Delta table | None — handled automatically |
| DROP COLUMN | Mirroring may pause for that table | Re-sync the table |
| ALTER COLUMN (type change) | Mirroring may pause | Widen the type or re-sync |
| RENAME COLUMN | Treated as DROP + ADD | Re-sync the table |
| RENAME TABLE | Mirroring stops for the table | Remove and re-add the table |
| ADD TABLE | New table not automatically added | Add table in Fabric Mirroring settings |

### Handle Schema Drift

```bash
# When mirroring pauses due to schema drift:
# 1. Get current table status
curl "https://api.fabric.microsoft.com/v1/workspaces/${WORKSPACE_ID}/mirroredDatabases/${MIRRORED_DB_ID}/tableStatuses" \
  -H "Authorization: Bearer ${TOKEN}"
# Look for status: "SchemaChangeDetected" or "Error"

# 2. Resolve at source (if possible): widen column types instead of changing them
# Example SQL: ALTER TABLE dbo.Events ALTER COLUMN EventData NVARCHAR(MAX)

# 3. Re-sync the affected table
curl -X POST \
  "https://api.fabric.microsoft.com/v1/workspaces/${WORKSPACE_ID}/mirroredDatabases/${MIRRORED_DB_ID}/tables/dbo.Events/resync" \
  -H "Authorization: Bearer ${TOKEN}"

# 4. Monitor until table returns to "Replicating" status
```

### Schema Drift Prevention

```sql
-- Recommended: Use backward-compatible schema changes on source
-- 1. Always ADD new columns with DEFAULT NULL (not NOT NULL without default)
ALTER TABLE dbo.Orders ADD DeliveryMethod NVARCHAR(50) NULL;  -- Good

-- 2. NEVER narrow column types (VARCHAR(100) → VARCHAR(50))
-- 3. NEVER change column data types without a migration plan
-- 4. Rename: add new column, backfill, migrate app, then drop old column
-- 5. Communicate schema changes to Fabric Mirroring team 24h in advance
```

---

## 7. Latency Monitoring

### Monitor Replication Lag

```python
import requests
from datetime import datetime, timezone

def check_replication_health(
    workspace_id: str,
    mirrored_db_id: str,
    token: str,
    slo_lag_seconds: int = 120
) -> dict:
    """Check replication latency against an SLO target."""
    headers = {"Authorization": f"Bearer {token}"}

    resp = requests.get(
        f"https://api.fabric.microsoft.com/v1/workspaces/{workspace_id}"
        f"/mirroredDatabases/{mirrored_db_id}/tableStatuses",
        headers=headers
    )
    tables = resp.json().get("value", [])

    health = {"ok": [], "warning": [], "critical": [], "stopped": []}

    for table in tables:
        name = table["sourceTableName"]
        status = table.get("status")
        lag = table.get("replicationLagSeconds", 0)

        if status not in ("Replicating", "Initializing"):
            health["stopped"].append({"table": name, "status": status})
        elif lag > slo_lag_seconds * 2:
            health["critical"].append({"table": name, "lag_seconds": lag})
        elif lag > slo_lag_seconds:
            health["warning"].append({"table": name, "lag_seconds": lag})
        else:
            health["ok"].append({"table": name, "lag_seconds": lag})

    return health

# Usage
health = check_replication_health(
    workspace_id=WORKSPACE_ID,
    mirrored_db_id=MIRRORED_DB_ID,
    token=TOKEN,
    slo_lag_seconds=120
)

if health["critical"] or health["stopped"]:
    print("ALERT: Replication health issues detected")
    print(f"Critical: {health['critical']}")
    print(f"Stopped: {health['stopped']}")
```

### Latency Alert via Data Activator

```
Setup:
1. Create a monitoring notebook that runs every 5 minutes
2. Notebook checks table statuses via REST API
3. Notebook sends events to an eventstream when lag > SLO
4. Reflex item:
   - Object: MirroredTable (key: sourceTableName)
   - Property: replicationLagSeconds
   - Trigger: replicationLagSeconds > 300 remains true for 5 minutes
   - Action: Email data-platform-ops@contoso.com
```

---

## 8. Reconciliation

Reconciliation verifies that the mirrored data matches the source data — critical after incidents, schema changes, or capacity throttling that caused replication gaps.

### Row Count Reconciliation

```python
# Compare row counts between source and mirrored tables
import pyodbc  # For Azure SQL source
import pandas as pd
from pyspark.sql import SparkSession

spark = SparkSession.builder.getOrCreate()

def reconcile_row_counts(tables: list) -> pd.DataFrame:
    """Compare row counts between source SQL and mirrored Delta tables."""
    conn_str = "DRIVER={ODBC Driver 18 for SQL Server};SERVER=contoso.database.windows.net;DATABASE=SalesDB;Authentication=ActiveDirectoryMsi"

    results = []
    with pyodbc.connect(conn_str) as conn:
        cursor = conn.cursor()
        for source_table, mirrored_table in tables:
            # Source count
            cursor.execute(f"SELECT COUNT(*) FROM {source_table}")
            source_count = cursor.fetchone()[0]

            # Mirrored count
            mirror_df = spark.read.format("delta").table(mirrored_table)
            mirror_count = mirror_df.count()

            diff = source_count - mirror_count
            diff_pct = round(abs(diff) / max(source_count, 1) * 100, 4)

            results.append({
                "SourceTable": source_table,
                "MirroredTable": mirrored_table,
                "SourceCount": source_count,
                "MirroredCount": mirror_count,
                "Difference": diff,
                "DifferencePercent": diff_pct,
                "IsMatch": diff == 0
            })

    return pd.DataFrame(results)

# Run reconciliation
tables = [
    ("dbo.FactSales", "salesdb.dbo_FactSales"),
    ("dbo.DimCustomer", "salesdb.dbo_DimCustomer"),
    ("dbo.DimProduct", "salesdb.dbo_DimProduct")
]
reconciliation_df = reconcile_row_counts(tables)
reconciliation_df.display()
```

### Deep Reconciliation — Hash Comparison

```python
# For critical tables: compare row-level checksums to find data discrepancies
def deep_reconcile_table(
    source_conn_str: str,
    source_table: str,
    mirrored_table: str,
    key_column: str,
    sample_size: int = 10000
) -> dict:
    """Compare checksums of a sample of rows between source and mirror."""
    spark = SparkSession.builder.getOrCreate()

    # Get sample from mirrored table
    mirror_df = (
        spark.read.format("delta").table(mirrored_table)
        .sample(fraction=sample_size/1000000, seed=42)
        .limit(sample_size)
    )
    mirror_keys = [row[key_column] for row in mirror_df.select(key_column).collect()]

    # Query source for same keys
    key_list = ",".join(f"'{k}'" for k in mirror_keys)
    source_query = f"SELECT *, CHECKSUM(*) AS row_checksum FROM {source_table} WHERE {key_column} IN ({key_list})"

    # Compare checksums
    # ... (implement comparison logic)
    pass
```

---

## 9. Common Workflows

### Workflow 1: Onboard a New Source Table

```
1. Verify source prerequisites (permissions, CDC-enabled, network access)
2. In Fabric portal > Mirrored Database > Settings
3. Add the new table to the replication scope
4. Monitor initial snapshot progress (status: Initializing → Replicating)
5. Verify row count matches source after snapshot
6. Run a sample reconciliation query
7. Update downstream consumers (semantic models, notebooks) to use the new table
8. Document in the data catalog (Purview)
```

### Workflow 2: Handle a Replication Incident

```
1. Alert fires: replication lag > 5 minutes for FactSales
2. Check table status via REST API
3. Classify the issue:
   - Status = "Error" → Read error message; apply error runbook
   - Status = "Replicating" but lag is high → Capacity pressure; check Capacity Metrics
   - Status = "SchemaChangeDetected" → Apply schema drift runbook
   - Status = "Initializing" longer than expected → Re-initialize snapshot
4. Apply remediation:
   - For lag: Check Fabric capacity CU usage; pause non-critical background jobs
   - For error: Verify source connectivity; check CDC log retention
   - For schema drift: Re-sync affected table
5. Verify lag returns to SLO range (< 2 minutes)
6. Run row count reconciliation to verify data integrity
7. Notify downstream consumers if data gap occurred
```

### Workflow 3: Planned Maintenance Window

```
1. Notify downstream consumers of maintenance window
2. Stop mirroring:
   POST /mirroredDatabases/{id}/stopMirroring
3. Perform maintenance on source (schema changes, upgrades)
4. Resume mirroring:
   POST /mirroredDatabases/{id}/startMirroring
5. Monitor replication lag until steady-state restored
6. Run reconciliation to verify no data loss during maintenance
7. Notify consumers that data is current
```

---

## 10. Error Handling and Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| `Status: Error — CDC not enabled` | Source table does not have CDC enabled | Fabric enables CDC automatically; verify `db_owner` permission |
| `Status: Error — Insufficient permissions` | Mirroring service principal lacks required SQL permissions | Grant `db_datareader` + `VIEW DATABASE STATE` + CDC stored proc execute |
| `Status: SchemaChangeDetected` | Source table DDL changed | Review the change; re-sync table if needed |
| `Replication lag > 10 minutes` | Capacity CU throttling; high source DML volume | Check Capacity Metrics; reduce concurrent background jobs; upgrade SKU |
| `Initial snapshot taking > 24 hours` | Very large table (> 100 GB) | This is normal; monitor progress; verify snapshot is advancing |
| `Rows missing after snapshot` | Table was being modified during snapshot | Re-sync the table to get a fresh consistent snapshot |
| `404 on tableStatuses API` | Mirrored database ID invalid | Re-fetch the ID from GET /mirroredDatabases |
| `Cosmos DB Change Feed gap` | Change Feed retention window exceeded during downtime | Full re-sync required; Change Feed default retention is 24 hours |

---

## 11. Performance and Limits

| Resource | Limit | Notes |
|----------|-------|-------|
| Tables per mirrored database | 500 | |
| Mirrored databases per workspace | 10 | |
| Maximum table size | No documented limit | Initial snapshot time scales with size |
| Steady-state latency | 5–60 seconds (typical) | Increases during capacity throttling |
| CDC log retention (Azure SQL default) | 3 days | Increase if Fabric mirroring experiences prolonged outages |
| Cosmos DB Change Feed retention | 24 hours (default) | Increase for tolerable downtime longer than 24 hours |
| Snowflake stream retention | 14 days | Configurable via DATA_RETENTION_TIME_IN_DAYS |
| Replication lag SLO (recommended) | < 2 minutes (steady state) | |
| Maximum rows reconciled per notebook | Depends on Spark capacity | Partition reconciliation for tables > 1B rows |

---

## OneLake Desktop Sync — Local CDC Inspection

If OneLake desktop sync is installed, mirrored Delta tables can be inspected locally to debug CDC replication issues.

**Inspect replicated tables locally**:
```python
import deltalake

path = r"C:\Users\<user>\OneLake - <tenant>\<workspace>\<lakehouse>.Lakehouse\Tables\mirrored_orders"
dt = deltalake.DeltaTable(path)
print(f"Version: {dt.version()}")
print(dt.history(10))  # Check CDC commit frequency and operation types

# Verify row count matches source
import polars as pl
df = pl.read_delta(path)
print(f"Replicated rows: {len(df)}")
```

**Debug `_delta_log/`**: Read transaction log JSON files to inspect CDC operations, check for schema drift, and verify replication latency by comparing commit timestamps with source change times.

**Critical rule**: Mirrored tables are **read-only** — never write locally. Mirroring manages the Delta log automatically.

Triggers: `onelake mirroring local`, `local cdc debug`

## Progressive Disclosure — Reference Files

| Topic | File |
|---|---|
| Database mirroring — onboarding walkthrough, CDC mechanics, Delta table output | [`references/database-mirroring.md`](./references/database-mirroring.md) |
| Supported sources — per-source requirements, permissions, network configuration | [`references/supported-sources.md`](./references/supported-sources.md) |
| Replication monitoring — latency tracking, health checks, reconciliation patterns | [`references/replication-monitoring.md`](./references/replication-monitoring.md) |
