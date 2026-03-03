# Azure SQL Database Provisioning — Deep Reference

## Overview

Azure SQL Database is a fully managed PaaS relational database based on the latest stable SQL Server engine. It supports single databases and elastic pools (shared resource pools for variable-load databases). This reference covers provisioning patterns, service tiers, elastic pools, and connection management.

## REST API Endpoints

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|---|---|---|---|---|
| PUT | `/providers/Microsoft.Sql/servers/{server}` | SQL Server Contributor | Location, admin login, admin password | Create SQL server |
| PUT | `/servers/{server}/databases/{db}` | SQL DB Contributor | SKU, collation, maxSizeBytes | Create database |
| GET | `/servers/{server}/databases/{db}` | SQL DB Reader | — | Get database status |
| PUT | `/servers/{server}/elasticPools/{pool}` | SQL Server Contributor | SKU, per-database limits | Create elastic pool |
| PATCH | `/servers/{server}/databases/{db}` | SQL DB Contributor | SKU, maxSizeBytes, elasticPoolId | Update/move database |
| DELETE | `/servers/{server}/databases/{db}` | SQL DB Contributor | — | Delete database |
| PUT | `/servers/{server}/firewallRules/{rule}` | SQL Server Contributor | startIpAddress, endIpAddress | Add firewall rule |
| PUT | `/servers/{server}/virtualNetworkRules/{rule}` | SQL Server Contributor | subnetId | Add VNet service endpoint rule |
| PUT | `/servers/{server}/privateEndpointConnections/{conn}` | SQL Server Contributor | Connection state | Approve private endpoint |
| GET | `/servers/{server}/databases/{db}/metrics` | SQL DB Reader | `$filter=name.value eq 'dtu_consumption_percent'` | Get utilization metrics |
| POST | `/servers/{server}/databases/{db}/export` | SQL DB Contributor | storageKey, storageUri, format | Export BACPAC |
| POST | `/servers/{server}/databases/{db}/import` | SQL DB Contributor | storageKey, storageUri, administratorLogin | Import BACPAC |

Base: `https://management.azure.com/subscriptions/{sub}/resourceGroups/{rg}`

## Service Tiers Reference

### General Purpose (vCore model — recommended)

| Compute Tier | vCores | Memory | Max Storage | IOPS |
|---|---|---|---|---|
| Serverless | 0.5–40 vCores (auto-scale) | 2.02–120 GB | 32 TB | Up to 5,464 |
| Provisioned GP_Gen5 | 2–80 vCores | 10.2–408 GB | 32 TB | Up to 25,600 |

### Business Critical (vCore model — highest SLA)

| Compute Tier | vCores | Memory | Read Replicas | IOPS |
|---|---|---|---|---|
| BC_Gen5 | 2–80 vCores | 10.2–408 GB | Up to 4 | Up to 327,680 |

### Hyperscale (vCore model — largest scale)

| Feature | Value |
|---|---|
| Max database size | 100 TB |
| Read replicas | Up to 30 |
| IOPS | Up to 204,800 |
| Log throughput | 100 MB/s |

## Azure CLI Patterns — Provisioning

```bash
# Create SQL Server with Entra ID (AAD) admin
az sql server create \
  --name sql-prod-eastus \
  --resource-group rg-databases \
  --location eastus \
  --admin-user sqladmin \
  --admin-password "$SQL_ADMIN_PASSWORD" \
  --enable-public-network false

# Set Entra ID admin (service principal or group)
az sql server ad-admin create \
  --server-name sql-prod-eastus \
  --resource-group rg-databases \
  --display-name "SQL Admins Group" \
  --object-id "<aad-group-object-id>"

# Create database (General Purpose Serverless)
az sql db create \
  --server sql-prod-eastus \
  --resource-group rg-databases \
  --name "db-app-prod" \
  --compute-model Serverless \
  --edition GeneralPurpose \
  --family Gen5 \
  --capacity 8 \
  --min-capacity 1 \
  --auto-pause-delay 60 \
  --zone-redundant true \
  --collation SQL_Latin1_General_CP1_CI_AS

# Create database (Business Critical, provisioned)
az sql db create \
  --server sql-prod-eastus \
  --resource-group rg-databases \
  --name "db-crm-prod" \
  --edition BusinessCritical \
  --family Gen5 \
  --capacity 8 \
  --zone-redundant true \
  --read-scale Enabled \
  --backup-storage-redundancy Geo

# Create elastic pool
az sql elastic-pool create \
  --server sql-prod-eastus \
  --resource-group rg-databases \
  --name "pool-tenant-dbs" \
  --edition GeneralPurpose \
  --family Gen5 \
  --capacity 16 \
  --db-min-capacity 0 \
  --db-max-capacity 4 \
  --zone-redundant true

# Move database to elastic pool
az sql db update \
  --server sql-prod-eastus \
  --resource-group rg-databases \
  --name "db-tenant-001" \
  --elastic-pool "pool-tenant-dbs"

# Restrict network access — allow specific VNet subnet
az sql server vnet-rule create \
  --server sql-prod-eastus \
  --resource-group rg-databases \
  --name rule-subnet-app \
  --vnet-name vnet-prod-eastus \
  --subnet subnet-app

# Enable private endpoint (combined with blocking public access)
STORAGE_ID=$(az sql server show \
  --name sql-prod-eastus \
  --resource-group rg-databases \
  --query id -o tsv)

az network private-endpoint create \
  --name pe-sql-prod \
  --resource-group rg-networking \
  --vnet-name vnet-prod-eastus \
  --subnet subnet-private-endpoints \
  --private-connection-resource-id "$STORAGE_ID" \
  --group-id sqlServer \
  --connection-name conn-sql-prod
```

## TypeScript Connection Patterns

### Connect with managed identity (mssql package)

```typescript
import sql from "mssql";
import { DefaultAzureCredential } from "@azure/identity";

const credential = new DefaultAzureCredential();

// Get token for Azure SQL
const tokenResponse = await credential.getToken("https://database.windows.net/.default");

const config: sql.config = {
  server: "sql-prod-eastus.database.windows.net",
  database: "db-app-prod",
  authentication: {
    type: "azure-active-directory-access-token",
    options: {
      token: tokenResponse!.token,
    },
  },
  options: {
    encrypt: true,
    trustServerCertificate: false,
    connectTimeout: 30000,
    requestTimeout: 30000,
    enableArithAbort: true,
  },
  pool: {
    max: 10,
    min: 2,
    idleTimeoutMillis: 30000,
    acquireTimeoutMillis: 10000,
  },
};

const pool = await sql.connect(config);
const result = await pool.request()
  .input("userId", sql.UniqueIdentifier, userId)
  .query("SELECT * FROM Users WHERE Id = @userId");

console.log(result.recordset);
await pool.close();
```

### Retry pattern for transient errors

```typescript
import sql from "mssql";

async function executeWithRetry<T>(
  pool: sql.ConnectionPool,
  queryFn: (request: sql.Request) => Promise<T>,
  maxRetries = 3
): Promise<T> {
  const transientErrors = new Set([4060, 10928, 10929, 40197, 40501, 40613]);
  let attempt = 0;

  while (true) {
    try {
      const request = pool.request();
      return await queryFn(request);
    } catch (err: any) {
      attempt++;
      const isTransient = transientErrors.has(err.number) || err.code === "ECONNRESET";

      if (!isTransient || attempt >= maxRetries) {
        throw err;
      }

      // Exponential backoff with jitter
      const delay = Math.min(1000 * Math.pow(2, attempt) + Math.random() * 500, 30000);
      console.warn(`Transient SQL error ${err.number}, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

// Usage
const users = await executeWithRetry(pool, (req) =>
  req.input("status", sql.VarChar, "active").query("SELECT * FROM Users WHERE Status = @status")
);
```

## PowerShell Patterns

```powershell
# Create SQL Server and database
New-AzSqlServer `
  -ResourceGroupName "rg-databases" `
  -ServerName "sql-prod-eastus" `
  -Location "eastus" `
  -SqlAdministratorCredentials (New-Object PSCredential("sqladmin", (ConvertTo-SecureString $env:SQL_ADMIN_PASSWORD -AsPlainText -Force)))

New-AzSqlDatabase `
  -ResourceGroupName "rg-databases" `
  -ServerName "sql-prod-eastus" `
  -DatabaseName "db-app-prod" `
  -Edition GeneralPurpose `
  -VCore 4 `
  -ComputeGeneration Gen5 `
  -ZoneRedundant

# Scale database
Set-AzSqlDatabase `
  -ResourceGroupName "rg-databases" `
  -ServerName "sql-prod-eastus" `
  -DatabaseName "db-app-prod" `
  -VCore 8

# Get database utilization
Get-AzMetric `
  -ResourceId (Get-AzSqlDatabase -ResourceGroupName "rg-databases" -ServerName "sql-prod-eastus" -DatabaseName "db-app-prod").ResourceId `
  -MetricName "dtu_consumption_percent" `
  -StartTime (Get-Date).AddHours(-1) `
  -EndTime (Get-Date) `
  -TimeGrainInSeconds 60
```

## Error Codes

| Code | Meaning | Remediation |
|---|---|---|
| 4060 | Database unavailable | Retry with exponential backoff; check database state |
| 10928 | Resource limit (DTU/CPU exhausted) | Scale up tier; use elastic pool; optimize queries |
| 10929 | Minimum guarantee not met | Retry; transient capacity constraint |
| 18456 | Login failed | Check credentials; verify SQL auth is enabled |
| 40197 | Server error processing request | Retry; service is restarting after failover |
| 40501 | Service busy (throttled) | Retry with backoff; wait 10 seconds |
| 40613 | Database unavailable on server | Retry; database is in transition |
| 46 | Connection limit exceeded | Reduce connection pool size; use connection pooling |
| LoginError (40531) | Invalid server name | Check FQDN: `{server}.database.windows.net` |

## Throttling Limits

| Resource | Limit | Retry Strategy |
|---|---|---|
| Max connections (GP 2 vCores) | 90 active connections | Connection pool max ≤ 80% of limit |
| Max connections (BC 2 vCores) | 135 active connections | Pool appropriately per application tier |
| Log write throughput | 22 MB/s (GP), 96 MB/s (BC) | Batch DML operations; avoid single-row inserts at scale |
| DTU consumption alert | 80% sustained = scale needed | Set Azure Monitor alert at 80% for 15 minutes |
| Query store space | 100 MB default | Monitor `sys.database_query_store_options` |

## Production Gotchas

- **Serverless auto-pause**: The serverless compute tier pauses after the configured inactivity period. The first connection after a pause incurs a cold-start delay of 20–60 seconds. Disable auto-pause for production workloads or use provisioned compute.
- **Connection string must use FQDN**: Always use the FQDN `{server}.database.windows.net` in connection strings. IP addresses may change during failover. Use the read-write listener endpoint for Business Critical read-write workloads.
- **TLS 1.2 is minimum**: Azure SQL requires TLS 1.2 or higher. Set `encrypt: true` and ensure your ODBC/JDBC driver version supports TLS 1.2. Older drivers (e.g., JDBC 4.0) do not support TLS 1.2.
- **Max degree of parallelism (MAXDOP)**: The default MAXDOP is 8 in Azure SQL. For OLTP workloads, consider setting MAXDOP 1 at the database level to prevent parallel plan regressions. Use Query Store to identify parallelism-related regressions.
- **Elastic pool sizing**: Size the elastic pool based on the *simultaneous peak* vCores needed by all databases. Under-provisioned elastic pools cause resource contention across tenants. Monitor the `eDTU/vCore percentage` metric per pool.
- **Zone-redundant databases cost more**: Zone-redundant databases use locally redundant storage (LRS) with synchronous replicas across zones. This costs approximately 50% more than zone-local databases. Enable for all production workloads.
