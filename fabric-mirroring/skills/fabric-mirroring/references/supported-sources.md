# Supported Sources — Per-Source Requirements, Permissions, Network Configuration

This reference covers all Fabric Mirroring supported source types with their specific prerequisites, required database permissions, network configuration patterns, and source-specific limitations.

---

## Supported Source Matrix

| Source | CDC Mechanism | Primary Key Required | Network Options | GA Status |
|--------|--------------|---------------------|-----------------|-----------|
| Azure SQL Database | Transaction log (CDC) | Yes | Public endpoint, Private Link, VNet | GA |
| Azure SQL Managed Instance | Transaction log (CDC) | Yes | Public endpoint, Private Link | GA |
| Azure Cosmos DB (NoSQL API) | Change Feed | No (uses `_id`) | Public endpoint, Private Endpoint | GA |
| Snowflake | Snowflake Streams | Yes | Public endpoint | GA |
| Azure Database for PostgreSQL | Logical replication (pgoutput) | Yes | Public endpoint, Private Link | Preview |
| Azure Database for MySQL | Binary log (binlog) | Yes | Public endpoint, Private Link | Preview |
| Open Mirroring (custom sources) | Custom connector via REST | Yes | Any (connector-managed) | Preview |

---

## Azure SQL Database

### Prerequisites

- Azure SQL Database (S0 tier or higher; not Serverless with auto-pause enabled during mirroring)
- Database-level CDC must be enabled
- A login with appropriate permissions (see below)
- The Fabric workspace must have access to the source via a supported network path

### Enable CDC on Azure SQL Database

```sql
-- Step 1: Enable CDC at the database level
EXEC sys.sp_cdc_enable_db;
GO

-- Step 2: Enable CDC on each table to be mirrored
-- This must be done for EVERY table in the mirroring config
EXEC sys.sp_cdc_enable_table
    @source_schema = N'dbo',
    @source_name   = N'FactSales',
    @role_name     = NULL,        -- NULL = no role restriction
    @supports_net_changes = 1;
GO

-- Repeat for each table:
EXEC sys.sp_cdc_enable_table
    @source_schema = N'dbo',
    @source_name   = N'DimCustomer',
    @role_name     = NULL,
    @supports_net_changes = 1;
GO

-- Verify CDC is enabled
SELECT name, is_cdc_enabled
FROM sys.databases
WHERE name = DB_NAME();

SELECT schema_name(schema_id) AS [Schema], name AS [Table], is_tracked_by_cdc
FROM sys.tables
ORDER BY [Schema], [Table];
```

### Required Permissions

```sql
-- Create a dedicated mirroring login
CREATE LOGIN fabric_mirror WITH PASSWORD = 'StrongPassword123!';
GO

USE SalesDB;
GO

-- Create user in the database
CREATE USER fabric_mirror FOR LOGIN fabric_mirror;
GO

-- Grant required permissions
-- CONTROL grants full database control — use if you want simpler setup
-- Or use fine-grained permissions:
GRANT SELECT ON SCHEMA::dbo TO fabric_mirror;
GRANT VIEW DATABASE STATE TO fabric_mirror;
GRANT VIEW ANY COLUMN ENCRYPTION KEY DEFINITION TO fabric_mirror;
GRANT VIEW ANY COLUMN MASTER KEY DEFINITION TO fabric_mirror;

-- Required for CDC table access
EXEC sys.sp_addrolemember 'db_owner', 'fabric_mirror';
-- Note: db_owner is currently required for CDC log reading in Azure SQL
-- Check current Fabric documentation — minimum permission requirements may change
GO
```

### Log Retention Configuration

```sql
-- CDC log retention: default is 3 days (4320 minutes)
-- Increase to ensure Fabric can survive temporary outages without re-snapshot
EXEC sys.sp_cdc_change_job
    @job_type = N'cleanup',
    @retention = 10080;  -- 7 days in minutes
GO

-- Verify current retention
SELECT retention
FROM msdb.dbo.cdc_jobs
WHERE job_type = 'cleanup';
```

### Network Configuration

**Option A — Public Endpoint (simplest):**
- Ensure "Allow Azure services and resources to access this server" is enabled in the Azure SQL firewall
- Or add the specific Fabric outbound IPs to the SQL firewall allowlist (check Fabric documentation for current IP ranges by region)

**Option B — Private Link:**
- Create a Private Endpoint for the Azure SQL server in your VNet
- Configure DNS to resolve the SQL server hostname to the private IP
- Ensure the Fabric-managed VNet (or your VNet if using a data gateway) can reach the Private Endpoint

```bash
# Create private endpoint for Azure SQL
az network private-endpoint create \
  --resource-group rg-data \
  --name pe-sql-mirroring \
  --vnet-name vnet-fabric \
  --subnet snet-private-endpoints \
  --private-connection-resource-id "/subscriptions/${SUB_ID}/resourceGroups/rg-data/providers/Microsoft.Sql/servers/${SQL_SERVER_NAME}" \
  --group-id sqlServer \
  --connection-name conn-sql-mirroring
```

### Connection Configuration in Fabric

```json
{
  "source": {
    "type": "AzureSqlDatabase",
    "connectionId": "fabric-connection-guid",
    "database": "SalesDB"
  }
}
```

**Create connection via Fabric UI:** Fabric portal → Settings → Manage connections and gateways → New connection → Azure SQL Database

---

## Azure SQL Managed Instance

### Prerequisites

- SQL Managed Instance (General Purpose or Business Critical)
- Public endpoint OR VPN/ExpressRoute (MI has no native Private Link to Fabric without additional networking)
- CDC enabled (same T-SQL commands as Azure SQL Database above)
- SQL Agent must be running (manages CDC cleanup jobs)

### Enable Public Endpoint on SQL MI

```bash
# Enable public endpoint on the managed instance
az sql mi update \
  --resource-group rg-data \
  --name sql-mi-contoso \
  --public-data-endpoint-enabled true

# Add a Network Security Group rule to allow Fabric access
az network nsg rule create \
  --resource-group rg-data \
  --nsg-name nsg-sql-mi \
  --name AllowFabricMirroring \
  --priority 200 \
  --source-address-prefixes AzureCloud \
  --destination-port-ranges 3342 \
  --protocol TCP \
  --access Allow
```

### Required Permissions

Same as Azure SQL Database — CDC requires `db_owner` on each database. Additionally:

```sql
-- SQL MI: grant sysadmin is sometimes required for cross-database CDC operations
-- Use dedicated login with db_owner as minimum viable configuration
```

---

## Azure Cosmos DB (NoSQL API)

### Prerequisites

- Cosmos DB account (NoSQL API only — SQL API containers)
- Change Feed must be supported — it is enabled by default on all containers
- The Cosmos DB account must have the Analytical Store or Change Feed enabled
- Fabric connection uses the account key or managed identity

### Permissions

**Option A — Account Key:**
- Read/write key or read-only key (read-only is sufficient for mirroring)
- Retrieve from Azure portal: Cosmos DB account → Keys → Primary Read-Only Key

**Option B — Managed Identity:**

```bash
# Assign Cosmos DB Built-in Data Reader role to Fabric's managed identity
# Get the Fabric service principal object ID first
FABRIC_SP_OBJECT_ID="your-fabric-sp-object-id"

az cosmosdb sql role assignment create \
  --account-name cosmos-contoso \
  --resource-group rg-data \
  --role-definition-id "/subscriptions/${SUB_ID}/resourceGroups/rg-data/providers/Microsoft.DocumentDB/databaseAccounts/cosmos-contoso/sqlRoleDefinitions/00000000-0000-0000-0000-000000000002" \
  --principal-id "${FABRIC_SP_OBJECT_ID}" \
  --scope "/subscriptions/${SUB_ID}/resourceGroups/rg-data/providers/Microsoft.DocumentDB/databaseAccounts/cosmos-contoso"
```

### Schema Considerations

Cosmos DB stores schemaless JSON documents. Fabric Mirroring handles this by:

1. **Schema inference at snapshot time** — Fabric samples documents to infer column names and types
2. **New properties in documents** — trigger schema drift handling (new columns added to Delta table)
3. **Nested objects** — flattened to dot-notation columns (e.g., `address.city`) or stored as JSON strings depending on depth
4. **Arrays** — stored as JSON strings in a single column

```json
// Source Cosmos DB document
{
  "_id": "customer-123",
  "name": "Contoso Corp",
  "address": {
    "street": "123 Main St",
    "city": "Seattle"
  },
  "tags": ["enterprise", "active"],
  "revenue": 1500000
}

// Resulting Delta table columns (example flattening)
// _id | name | address_street | address_city | tags | revenue
```

### Connection Configuration

```json
{
  "source": {
    "type": "CosmosDb",
    "connectionId": "fabric-connection-guid",
    "database": "SalesDatabase",
    "container": "Customers"
  }
}
```

**Note:** Each Cosmos DB container maps to one mirrored table. A single mirrored database item handles one container — to mirror multiple containers, create multiple mirrored database items or use a single item with container-per-table configuration (check current Fabric documentation).

---

## Snowflake

### Prerequisites

- Snowflake account (Standard edition or higher)
- Snowflake Streams enabled on the tables to be mirrored
- A Snowflake service account with stream access
- Network access from Fabric to the Snowflake account URL

### Enable Snowflake Streams

```sql
-- Create streams on source tables
-- Streams must exist BEFORE mirroring starts
CREATE STREAM IF NOT EXISTS stream_fact_sales
  ON TABLE SALES_DB.PUBLIC.FACT_SALES
  SHOW_INITIAL_ROWS = TRUE;

CREATE STREAM IF NOT EXISTS stream_dim_customer
  ON TABLE SALES_DB.PUBLIC.DIM_CUSTOMER
  SHOW_INITIAL_ROWS = TRUE;

-- Verify streams
SHOW STREAMS IN DATABASE SALES_DB;
```

### Required Permissions

```sql
-- Create dedicated role for Fabric Mirroring
CREATE ROLE FABRIC_MIRROR_ROLE;

-- Grant privileges
GRANT USAGE ON DATABASE SALES_DB TO ROLE FABRIC_MIRROR_ROLE;
GRANT USAGE ON SCHEMA SALES_DB.PUBLIC TO ROLE FABRIC_MIRROR_ROLE;
GRANT SELECT ON TABLE SALES_DB.PUBLIC.FACT_SALES TO ROLE FABRIC_MIRROR_ROLE;
GRANT SELECT ON TABLE SALES_DB.PUBLIC.DIM_CUSTOMER TO ROLE FABRIC_MIRROR_ROLE;
GRANT SELECT ON STREAM SALES_DB.PUBLIC.STREAM_FACT_SALES TO ROLE FABRIC_MIRROR_ROLE;
GRANT SELECT ON STREAM SALES_DB.PUBLIC.STREAM_DIM_CUSTOMER TO ROLE FABRIC_MIRROR_ROLE;

-- Create dedicated service account user
CREATE USER FABRIC_MIRROR_USER
  PASSWORD = 'StrongPassword123!'
  DEFAULT_ROLE = FABRIC_MIRROR_ROLE
  DEFAULT_WAREHOUSE = COMPUTE_WH;

GRANT ROLE FABRIC_MIRROR_ROLE TO USER FABRIC_MIRROR_USER;
```

### Connection Configuration

```json
{
  "source": {
    "type": "Snowflake",
    "connectionId": "fabric-connection-guid",
    "database": "SALES_DB",
    "schema": "PUBLIC"
  }
}
```

**Snowflake stream retention:** Snowflake streams have a data retention period (default 14 days). If Fabric mirroring is stopped for longer than the stream retention, the stream data is lost and re-snapshot is required. Keep streams fresh by not stopping mirroring for extended periods.

---

## Azure Database for PostgreSQL (Preview)

### Prerequisites

- Azure Database for PostgreSQL — Flexible Server (Single Server not supported)
- Logical replication enabled (`wal_level = logical`)
- Publication created on the source database
- Connection via public endpoint or Private Link

### Enable Logical Replication

```bash
# Enable logical replication on PostgreSQL Flexible Server
az postgres flexible-server parameter set \
  --resource-group rg-data \
  --server-name pg-contoso \
  --name wal_level \
  --value logical

# Restart server to apply (required for wal_level change)
az postgres flexible-server restart \
  --resource-group rg-data \
  --name pg-contoso
```

```sql
-- Create a replication publication for the tables to mirror
CREATE PUBLICATION fabric_mirror_pub
FOR TABLE public.fact_sales, public.dim_customer, public.dim_product;

-- Create a dedicated user with replication privileges
CREATE USER fabric_mirror WITH REPLICATION PASSWORD 'StrongPassword123!';
GRANT SELECT ON TABLE public.fact_sales TO fabric_mirror;
GRANT SELECT ON TABLE public.dim_customer TO fabric_mirror;
GRANT SELECT ON TABLE public.dim_product TO fabric_mirror;

-- Verify publication
SELECT * FROM pg_publication;
SELECT * FROM pg_publication_tables;
```

### Required PostgreSQL Version

- PostgreSQL 11 or higher
- `pgoutput` plugin (built-in since PostgreSQL 10) is used — no additional extensions required

---

## Azure Database for MySQL (Preview)

### Prerequisites

- Azure Database for MySQL — Flexible Server
- Binary logging enabled (`binlog_format = ROW`)
- Server parameter `binlog_row_image = FULL` (required for updates/deletes)

### Enable Binary Logging

```bash
# Enable binary logging parameters
az mysql flexible-server parameter set \
  --resource-group rg-data \
  --server-name mysql-contoso \
  --name binlog_format \
  --value ROW

az mysql flexible-server parameter set \
  --resource-group rg-data \
  --server-name mysql-contoso \
  --name binlog_row_image \
  --value FULL
```

```sql
-- Create dedicated mirroring user
CREATE USER 'fabric_mirror'@'%' IDENTIFIED BY 'StrongPassword123!';

-- Grant replication and select privileges
GRANT REPLICATION SLAVE ON *.* TO 'fabric_mirror'@'%';
GRANT REPLICATION CLIENT ON *.* TO 'fabric_mirror'@'%';
GRANT SELECT ON sales_db.* TO 'fabric_mirror'@'%';

FLUSH PRIVILEGES;
```

### MySQL-Specific Limitations

- Composite primary keys are supported
- Columns with `ENUM` and `SET` types are mapped to `string` in Delta
- JSON columns are stored as `string` in Delta
- Tables without a primary key are excluded from mirroring

---

## Open Mirroring (Custom Sources — Preview)

Open Mirroring allows any data source with a REST-capable connector to write changes directly to Fabric-managed Delta tables using a landing zone API. The source system is responsible for sending initial snapshot and incremental changes.

### Architecture

```
Custom Source System
    │
    ├── Step 1: Write initial snapshot rows
    │     POST /v1/workspaces/{wId}/mirroredDatabases/{itemId}/tables/{tableId}/rows
    │
    ├── Step 2: Signal snapshot complete
    │     POST /v1/.../tables/{tableId}/commitSnapshotCompletion
    │
    └── Step 3: Stream incremental changes
          POST /v1/.../tables/{tableId}/rows (with operation type: insert/update/delete)
```

### Use Cases for Open Mirroring

- On-premises SQL Server (not in Azure)
- Oracle Database
- IBM Db2
- SAP HANA
- Any custom application database with change capture capability

---

## Network Configuration Summary

| Source | Public Endpoint | Private Link | Data Gateway | Fabric Managed VNet |
|--------|----------------|-------------|-------------|-------------------|
| Azure SQL Database | Yes | Yes | No | Yes |
| Azure SQL MI | Yes (port 3342) | Requires additional networking | No | Planned |
| Cosmos DB | Yes | Yes (Private Endpoint) | No | Yes |
| Snowflake | Yes | No | No | No |
| PostgreSQL Flexible | Yes | Yes | No | Planned |
| MySQL Flexible | Yes | Yes | No | Planned |

---

## Connection Management

### Creating Connections via Fabric REST API

```bash
# List existing connections accessible to the workspace
TOKEN=$(az account get-access-token --resource https://api.fabric.microsoft.com --query accessToken -o tsv)

curl "https://api.fabric.microsoft.com/v1/connections" \
  -H "Authorization: Bearer ${TOKEN}"

# Get a specific connection details
curl "https://api.fabric.microsoft.com/v1/connections/${CONNECTION_ID}" \
  -H "Authorization: Bearer ${TOKEN}"
```

### Rotating Source Credentials

When source database credentials are rotated, update the Fabric connection to avoid mirroring interruption:

```bash
# Update connection credentials via Fabric UI:
# Fabric portal → Settings → Manage connections and gateways
# → Find connection → Edit → Update credentials

# After updating, verify mirroring resumes:
curl -X POST \
  "https://api.fabric.microsoft.com/v1/workspaces/${WORKSPACE_ID}/mirroredDatabases/${ITEM_ID}/getMirroringStatus" \
  -H "Authorization: Bearer ${TOKEN}"
```

---

## Error Codes and Remediation by Source

| Error | Source | Meaning | Fix |
|-------|--------|---------|-----|
| `CdcNotEnabled` | Azure SQL | CDC not enabled on database or table | Run `sys.sp_cdc_enable_db` + `sys.sp_cdc_enable_table` |
| `LogRetentionInsufficient` | Azure SQL | CDC log truncated before Fabric consumed | Increase CDC retention via `sys.sp_cdc_change_job` |
| `SnowflakeStreamStaleness` | Snowflake | Stream data retention expired | Recreate stream; Fabric will re-snapshot |
| `ReplicationSlotFull` | PostgreSQL | Logical replication slot lagging behind | Check `pg_replication_slots` for lag; restart mirroring |
| `BinlogRotated` | MySQL | Binary log rotated before consumed | Increase `expire_logs_days`; Fabric will re-snapshot |
| `CosmosChangeFeedExpired` | Cosmos DB | Change feed retention window missed | Increase Cosmos DB data retention; Fabric will re-snapshot |
| `FirewallBlocked` | All | Source firewall blocking Fabric IP | Add Fabric region outbound IPs to source firewall |
| `SslHandshakeFailed` | All | TLS certificate mismatch | Ensure source uses a valid CA-signed certificate |
| `AuthenticationFailed` | All | Wrong username/password or expired | Update credentials in Fabric connection settings |

---

## Limits by Source

| Limit | Azure SQL | Cosmos DB | Snowflake | PostgreSQL | MySQL |
|-------|-----------|-----------|-----------|------------|-------|
| Max tables per item | 500 | N/A (1 container) | 500 | 500 | 500 |
| Min CDC/Change Feed retention | 24 hours | Configurable (default 7 days) | 14 days (stream) | Configurable | Configurable |
| Computed columns | Excluded | N/A | Excluded | Generated columns excluded | Generated columns excluded |
| Spatial/geography types | Excluded | N/A | Excluded | PostGIS excluded | Excluded |
| Max column count per table | 1,024 | 1,024 (after flattening) | 1,024 | 1,024 | 1,024 |
| LOB column size limit | 1 MB per row | 2 MB per document | 16 MB per cell | 1 GB (text/bytea truncated) | 65 KB |
