---
name: Azure SQL Database
description: >
  Deep expertise in Azure SQL Database and Azure Cosmos DB — provision and manage relational and NoSQL
  databases, write and optimize T-SQL and Cosmos SQL queries, design schemas with partition key strategy,
  configure elastic pools, implement security hardening (TDE, Always Encrypted, AAD auth, firewall rules),
  set up backup/DR with geo-replication and failover groups, and connect from Node.js/TypeScript applications
  using managed identity and the @azure/cosmos SDK.
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
triggers:
  - azure sql
  - sql database
  - cosmos db
  - cosmosdb
  - azure database
  - t-sql
  - elastic pool
  - sql server azure
  - nosql azure
  - cosmos container
  - sql firewall
  - database migration
---

# Azure SQL Database

## 1. Azure Database Services Overview

Azure offers several managed database services. This skill covers the two most widely used: **Azure SQL Database** (relational) and **Azure Cosmos DB** (multi-model NoSQL).

**Decision matrix**:
| Criteria | Azure SQL Database | Azure Cosmos DB | Azure Database for PostgreSQL Flexible |
|----------|-------------------|-----------------|---------------------------------------|
| Data model | Relational (tables, rows, columns) | Document, key-value, graph, column-family | Relational (PostgreSQL-compatible) |
| Query language | T-SQL | SQL API, MongoDB, Cassandra, Gremlin | PostgreSQL SQL |
| Schema | Strict schema (DDL-defined) | Schema-flexible (JSON documents) | Strict schema |
| Scaling | Vertical (DTU/vCore tiers), read replicas | Horizontal (partition-based), multi-region | Vertical, read replicas |
| Consistency | Strong (ACID transactions) | Tunable (5 levels: Strong to Eventual) | Strong (ACID transactions) |
| Best for | Line-of-business apps, ERP, reporting | Global apps, IoT, real-time, high write volume | OSS PostgreSQL workloads, PostGIS |
| Pricing model | DTU or vCore (provisioned/serverless) | Request Units (manual or autoscale) | vCore (provisioned/burstable) |

**Azure SQL Database pricing tiers**:
| Model | Tiers | Best For |
|-------|-------|----------|
| DTU | Basic (5 DTU), Standard (10-3000 DTU), Premium (125-4000 DTU) | Simple workloads with bundled compute+storage |
| vCore | General Purpose, Business Critical, Hyperscale | Flexible compute/storage scaling, production |
| Serverless | General Purpose only | Dev/test, intermittent workloads (auto-pause) |

**Cosmos DB pricing**:
| Throughput | Min RU/s | Billing | Best For |
|-----------|----------|---------|----------|
| Manual | 400 RU/s per container | Fixed hourly rate | Predictable workloads |
| Autoscale | 100 RU/s (scales to max) | Pay for peak in each hour | Variable workloads |
| Serverless | 0 (pay per request) | Per-RU consumed | Dev/test, low-traffic apps |

## 2. Azure SQL Database Provisioning

Azure SQL Database runs on a **logical server** that hosts one or more databases. The server provides a shared management endpoint for firewall rules, AAD auth, and auditing.

**Create a SQL Server and database (Azure CLI)**:
```bash
# Create resource group
az group create --name rg-myapp --location eastus

# Create SQL logical server
az sql server create \
  --name sqlsrv-myapp \
  --resource-group rg-myapp \
  --location eastus \
  --admin-user sqladmin \
  --admin-password 'P@ssw0rd!2024'

# Create database (General Purpose, serverless)
az sql db create \
  --resource-group rg-myapp \
  --server sqlsrv-myapp \
  --name appdb \
  --edition GeneralPurpose \
  --compute-model Serverless \
  --family Gen5 \
  --capacity 2 \
  --auto-pause-delay 60 \
  --min-capacity 0.5

# Configure firewall — allow Azure services
az sql server firewall-rule create \
  --resource-group rg-myapp \
  --server sqlsrv-myapp \
  --name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0
```

**Elastic pools** — share resources across multiple databases on the same server:
```bash
# Create an elastic pool
az sql elastic-pool create \
  --resource-group rg-myapp \
  --server sqlsrv-myapp \
  --name pool-myapp \
  --edition GeneralPurpose \
  --family Gen5 \
  --capacity 2 \
  --db-max-capacity 2 \
  --db-min-capacity 0

# Add a database to the pool
az sql db create \
  --resource-group rg-myapp \
  --server sqlsrv-myapp \
  --name tenant1db \
  --elastic-pool pool-myapp
```

**Bicep template** for repeatable deployments:
```bicep
param serverName string
param location string = resourceGroup().location
param adminLogin string
@secure()
param adminPassword string
param databaseName string

resource sqlServer 'Microsoft.Sql/servers@2023-05-01-preview' = {
  name: serverName
  location: location
  properties: {
    administratorLogin: adminLogin
    administratorLoginPassword: adminPassword
    minimalTlsVersion: '1.2'
    publicNetworkAccess: 'Enabled'
  }
}

resource sqlDatabase 'Microsoft.Sql/servers/databases@2023-05-01-preview' = {
  parent: sqlServer
  name: databaseName
  location: location
  sku: {
    name: 'GP_S_Gen5'
    tier: 'GeneralPurpose'
    family: 'Gen5'
    capacity: 1
  }
  properties: {
    collation: 'SQL_Latin1_General_CP1_CI_AS'
    maxSizeBytes: 34359738368  // 32 GB
    autoPauseDelay: 60
    minCapacity: json('0.5')
  }
}

resource firewallAllowAzure 'Microsoft.Sql/servers/firewallRules@2023-05-01-preview' = {
  parent: sqlServer
  name: 'AllowAzureServices'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}
```

**Serverless auto-pause behavior**:
- Database pauses after the configured idle delay (minutes of no activity).
- First connection after pause incurs a cold-start delay (typically 30-60 seconds).
- Set `auto-pause-delay` to `-1` to disable auto-pause.
- Serverless is cost-effective for dev/test but not suitable for latency-sensitive production.

## 3. T-SQL & Schema Management

Azure SQL Database supports nearly all T-SQL features of SQL Server. Key differences: no cross-database queries (use elastic queries), no SQL Agent (use Azure Automation or Logic Apps).

**Common DDL patterns**:
```sql
-- Create a table with identity, constraints, and indexes
CREATE TABLE dbo.Orders (
    OrderId       INT IDENTITY(1,1) PRIMARY KEY,
    CustomerId    UNIQUEIDENTIFIER NOT NULL,
    OrderDate     DATETIME2(0) NOT NULL DEFAULT SYSUTCDATETIME(),
    Status        NVARCHAR(20) NOT NULL DEFAULT 'Pending'
        CHECK (Status IN ('Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled')),
    TotalAmount   DECIMAL(18,2) NOT NULL,
    ShippingJson  NVARCHAR(MAX) NULL,  -- JSON column
    CONSTRAINT FK_Orders_Customers FOREIGN KEY (CustomerId)
        REFERENCES dbo.Customers(CustomerId)
);

CREATE NONCLUSTERED INDEX IX_Orders_CustomerId
    ON dbo.Orders (CustomerId)
    INCLUDE (OrderDate, Status, TotalAmount);

CREATE NONCLUSTERED INDEX IX_Orders_Status_Date
    ON dbo.Orders (Status, OrderDate DESC);
```

**Schema migration approach** (using sqlcmd scripts):
```
migrations/
├── 001_create_customers.sql
├── 002_create_orders.sql
├── 003_add_shipping_json.sql
└── 004_add_order_items.sql
```

Apply migrations in order:
```bash
for f in migrations/*.sql; do
  sqlcmd -S myserver.database.windows.net -d mydb -U sqladmin -P '<pwd>' -i "$f"
done
```

Track applied migrations with a version table:
```sql
CREATE TABLE dbo.SchemaVersion (
    Version     INT PRIMARY KEY,
    ScriptName  NVARCHAR(256) NOT NULL,
    AppliedAt   DATETIME2(0) NOT NULL DEFAULT SYSUTCDATETIME()
);
```

**Temporal tables** (system-versioned) — automatic history tracking:
```sql
CREATE TABLE dbo.Products (
    ProductId     INT PRIMARY KEY,
    Name          NVARCHAR(200) NOT NULL,
    Price         DECIMAL(10,2) NOT NULL,
    ValidFrom     DATETIME2 GENERATED ALWAYS AS ROW START NOT NULL,
    ValidTo       DATETIME2 GENERATED ALWAYS AS ROW END NOT NULL,
    PERIOD FOR SYSTEM_TIME (ValidFrom, ValidTo)
)
WITH (SYSTEM_VERSIONING = ON (HISTORY_TABLE = dbo.ProductsHistory));

-- Query historical data
SELECT * FROM dbo.Products
FOR SYSTEM_TIME AS OF '2024-06-01T00:00:00';
```

**Columnstore indexes** — for analytical queries on large tables:
```sql
-- Clustered columnstore (entire table in columnar format)
CREATE CLUSTERED COLUMNSTORE INDEX CCI_SalesHistory ON dbo.SalesHistory;

-- Nonclustered columnstore (hybrid: rowstore + columnstore)
CREATE NONCLUSTERED COLUMNSTORE INDEX NCCI_Orders_Analytics
    ON dbo.Orders (OrderDate, Status, TotalAmount);
```

**JSON support** — store and query JSON in NVARCHAR columns:
```sql
-- Parse JSON
SELECT
    OrderId,
    JSON_VALUE(ShippingJson, '$.address.city') AS City,
    JSON_VALUE(ShippingJson, '$.carrier') AS Carrier
FROM dbo.Orders
WHERE ISJSON(ShippingJson) = 1;

-- Modify JSON
UPDATE dbo.Orders
SET ShippingJson = JSON_MODIFY(ShippingJson, '$.trackingNumber', 'TRK-12345')
WHERE OrderId = 1;

-- Cross-apply OPENJSON for arrays
SELECT o.OrderId, item.ProductName, item.Quantity
FROM dbo.Orders o
CROSS APPLY OPENJSON(o.LineItemsJson)
WITH (ProductName NVARCHAR(200), Quantity INT) AS item;
```

**Computed columns**:
```sql
ALTER TABLE dbo.Orders
ADD TotalWithTax AS (TotalAmount * 1.08) PERSISTED;
```

## 4. Azure SQL Performance

### Query Store

Query Store captures query plans and runtime statistics, enabling performance regression detection and analysis.

```sql
-- Enable Query Store (enabled by default on Azure SQL)
ALTER DATABASE mydb SET QUERY_STORE = ON;
ALTER DATABASE mydb SET QUERY_STORE (
    OPERATION_MODE = READ_WRITE,
    DATA_FLUSH_INTERVAL_SECONDS = 900,
    INTERVAL_LENGTH_MINUTES = 60,
    MAX_STORAGE_SIZE_MB = 1000,
    QUERY_CAPTURE_MODE = AUTO
);
```

**Top resource-consuming queries**:
```sql
SELECT TOP 20
    qt.query_sql_text,
    q.query_id,
    rs.avg_duration / 1000.0 AS avg_duration_ms,
    rs.avg_cpu_time / 1000.0 AS avg_cpu_ms,
    rs.avg_logical_io_reads,
    rs.avg_rowcount,
    rs.count_executions,
    p.plan_id,
    TRY_CAST(p.query_plan AS XML) AS query_plan_xml
FROM sys.query_store_query_text AS qt
JOIN sys.query_store_query AS q ON qt.query_text_id = q.query_text_id
JOIN sys.query_store_plan AS p ON q.query_id = p.query_id
JOIN sys.query_store_runtime_stats AS rs ON p.plan_id = rs.plan_id
JOIN sys.query_store_runtime_stats_interval AS rsi ON rs.runtime_stats_interval_id = rsi.runtime_stats_interval_id
WHERE rsi.start_time > DATEADD(day, -1, GETUTCDATE())
ORDER BY rs.avg_duration DESC;
```

**Regressed queries** (plan changes that degraded performance):
```sql
SELECT
    q.query_id,
    qt.query_sql_text,
    rs1.avg_duration / 1000.0 AS old_avg_ms,
    rs2.avg_duration / 1000.0 AS new_avg_ms
FROM sys.query_store_query q
JOIN sys.query_store_query_text qt ON q.query_text_id = qt.query_text_id
JOIN sys.query_store_plan p1 ON q.query_id = p1.query_id
JOIN sys.query_store_plan p2 ON q.query_id = p2.query_id AND p1.plan_id <> p2.plan_id
JOIN sys.query_store_runtime_stats rs1 ON p1.plan_id = rs1.plan_id
JOIN sys.query_store_runtime_stats rs2 ON p2.plan_id = rs2.plan_id
WHERE rs2.avg_duration > rs1.avg_duration * 2
  AND rs2.last_execution_time > rs1.last_execution_time
ORDER BY (rs2.avg_duration - rs1.avg_duration) DESC;
```

### Automatic Tuning

Azure SQL Database can automatically apply performance recommendations:

```sql
-- Enable automatic tuning
ALTER DATABASE mydb SET AUTOMATIC_TUNING (
    CREATE_INDEX = ON,
    DROP_INDEX = ON,
    FORCE_LAST_GOOD_PLAN = ON
);

-- Check tuning status
SELECT name, desired_state_desc, actual_state_desc, reason_desc
FROM sys.database_automatic_tuning_options;
```

### Index Recommendations

```sql
-- Missing index DMV
SELECT
    ROUND(migs.avg_user_impact, 2) AS avg_impact_pct,
    migs.user_seeks + migs.user_scans AS total_usage,
    mid.statement AS [table],
    ISNULL(mid.equality_columns, '') AS equality_cols,
    ISNULL(mid.inequality_columns, '') AS inequality_cols,
    ISNULL(mid.included_columns, '') AS include_cols
FROM sys.dm_db_missing_index_group_stats migs
JOIN sys.dm_db_missing_index_groups mig ON migs.group_handle = mig.index_group_handle
JOIN sys.dm_db_missing_index_details mid ON mig.index_handle = mid.index_handle
WHERE mid.database_id = DB_ID()
ORDER BY migs.avg_user_impact * (migs.user_seeks + migs.user_scans) DESC;
```

### Execution Plan Analysis

Key operators to watch for:
| Operator | Good/Bad | Action |
|----------|----------|--------|
| Clustered Index Seek | Good | Efficient key lookup |
| Index Seek | Good | Efficient non-clustered lookup |
| Table Scan | Bad (on large tables) | Add an appropriate index |
| Clustered Index Scan | Warning | May be OK for small tables; add index for large ones |
| Key Lookup | Warning | Add INCLUDE columns to the non-clustered index |
| Sort | Warning | Add index with matching sort order |
| Hash Match (aggregate) | Depends | Check memory grant; may spill to tempdb |
| Nested Loop | Good for small sets | Bad if driving table is large |

### DTU vs vCore Sizing

**DTU sizing signals**:
- DTU percentage consistently > 80% → scale up
- DTU percentage consistently < 20% → scale down or use serverless
- Worker threads near limit → scale up tier

**vCore sizing**:
```sql
-- Check CPU and I/O pressure
SELECT
    AVG(avg_cpu_percent) AS avg_cpu,
    MAX(avg_cpu_percent) AS max_cpu,
    AVG(avg_data_io_percent) AS avg_io,
    AVG(avg_log_write_percent) AS avg_log_write
FROM sys.dm_db_resource_stats
WHERE end_time > DATEADD(hour, -1, GETUTCDATE());
```

## 5. Azure Cosmos DB Provisioning

Cosmos DB is a globally distributed, multi-model database. The **NoSQL API** (formerly SQL API) is the most popular and uses a SQL-like query language over JSON documents.

**Create a Cosmos DB account (Azure CLI)**:
```bash
# NoSQL API account
az cosmosdb create \
  --name cosmos-myapp \
  --resource-group rg-myapp \
  --default-consistency-level Session \
  --locations regionName=eastus failoverPriority=0 isZoneRedundant=false \
  --enable-automatic-failover true

# Create a database
az cosmosdb sql database create \
  --account-name cosmos-myapp \
  --resource-group rg-myapp \
  --name appdb

# Create a container with autoscale
az cosmosdb sql container create \
  --account-name cosmos-myapp \
  --resource-group rg-myapp \
  --database-name appdb \
  --name orders \
  --partition-key-path /tenantId \
  --max-throughput 4000
```

**API types**:
| API | Wire Protocol | Query Language | Best For |
|-----|--------------|----------------|----------|
| NoSQL (SQL) | REST/HTTPS | SQL-like over JSON | New apps, document stores |
| MongoDB | MongoDB wire protocol | MQL | Migrating MongoDB workloads |
| Cassandra | CQL wire protocol | CQL | Wide-column, high write throughput |
| Gremlin | Apache TinkerPop | Gremlin traversal | Graph relationships |
| Table | Azure Table Storage | OData | Key-value, migrating Table Storage |

**Partition key strategy**:

The partition key determines how data is distributed across physical partitions. Choose carefully — it cannot be changed after container creation.

| Pattern | Partition Key | Why |
|---------|--------------|-----|
| Multi-tenant SaaS | `/tenantId` | Isolates tenant data; most queries filter by tenant |
| User-centric app | `/userId` | Even distribution; queries target a single user |
| IoT telemetry | `/deviceId` | High cardinality; time-series per device |
| E-commerce orders | `/customerId` | Orders queried per customer |
| Event log | Synthetic key `/partitionKey` | Combine fields for even distribution |

**Hierarchical partition keys** (for sub-partitioning):
```bash
az cosmosdb sql container create \
  --account-name cosmos-myapp \
  --resource-group rg-myapp \
  --database-name appdb \
  --name events \
  --partition-key-path /tenantId /userId /sessionId \
  --max-throughput 4000
```

**Throughput modes**:
| Mode | Min | Max | Use Case |
|------|-----|-----|----------|
| Manual | 400 RU/s | 1,000,000 RU/s | Predictable, steady workloads |
| Autoscale | 100 RU/s (10% of max) | Configurable max | Variable traffic, production |
| Serverless | 0 | 5,000 RU/s | Dev/test, low-traffic |

## 6. Cosmos DB Queries & Operations

### SQL API Queries

Cosmos DB NoSQL API uses a SQL-like syntax to query JSON documents.

**Basic queries**:
```sql
-- Select all fields
SELECT * FROM c WHERE c.tenantId = 'tenant-001'

-- Project specific fields
SELECT c.id, c.name, c.status, c.createdAt FROM c
WHERE c.tenantId = 'tenant-001' AND c.status = 'active'

-- Order and limit
SELECT c.id, c.name, c.amount
FROM c
WHERE c.tenantId = 'tenant-001'
ORDER BY c.createdAt DESC
OFFSET 0 LIMIT 20

-- Aggregate functions
SELECT COUNT(1) AS total, SUM(c.amount) AS totalAmount, AVG(c.amount) AS avgAmount
FROM c
WHERE c.tenantId = 'tenant-001' AND c.status = 'completed'

-- Array operations
SELECT c.id, c.name, tag
FROM c
JOIN tag IN c.tags
WHERE c.tenantId = 'tenant-001' AND tag = 'priority'

-- Nested object access
SELECT c.id, c.address.city, c.address.state
FROM c
WHERE c.address.country = 'US'

-- String functions
SELECT c.id, LOWER(c.email) AS email, CONCAT(c.firstName, ' ', c.lastName) AS fullName
FROM c
WHERE CONTAINS(c.email, '@contoso.com')

-- EXISTS subquery
SELECT c.id, c.name
FROM c
WHERE c.tenantId = 'tenant-001'
AND EXISTS (SELECT VALUE t FROM t IN c.tags WHERE t = 'urgent')
```

### Point Reads

The most efficient operation in Cosmos DB (1 RU for a 1 KB document):
```typescript
const { resource } = await container.item(id, partitionKeyValue).read();
```

Always prefer point reads over queries when you have both `id` and partition key.

### Cross-Partition Queries

Queries without the partition key in the WHERE clause fan out to all partitions. These are expensive and should be avoided in hot paths.

```sql
-- Single-partition query (efficient, includes partition key)
SELECT * FROM c WHERE c.tenantId = 'tenant-001' AND c.status = 'active'

-- Cross-partition query (expensive, no partition key filter)
SELECT * FROM c WHERE c.email = 'user@example.com'
```

To enable cross-partition queries in the SDK:
```typescript
const { resources } = await container.items
  .query("SELECT * FROM c WHERE c.email = @email", {
    parameters: [{ name: "@email", value: "user@example.com" }],
  })
  .fetchAll();
```

### Stored Procedures

Server-side JavaScript that executes within a single partition:
```javascript
function bulkDelete(partitionKey, predicate) {
  var context = getContext();
  var collection = context.getCollection();
  var response = context.getResponse();
  var deleted = 0;

  var query = `SELECT * FROM c WHERE c.tenantId = '${partitionKey}' AND ${predicate}`;

  var accepted = collection.queryDocuments(collection.getSelfLink(), query, {},
    function (err, documents) {
      if (err) throw err;
      if (documents.length === 0) {
        response.setBody({ deleted: deleted });
        return;
      }
      documents.forEach(function (doc) {
        collection.deleteDocument(doc._self, {}, function (err) {
          if (err) throw err;
          deleted++;
        });
      });
      response.setBody({ deleted: deleted });
    }
  );
  if (!accepted) throw new Error("Query was not accepted by the server.");
}
```

### Change Feed

Stream of document changes (inserts and updates) in order:
```typescript
const iterator = container.items.changeFeed("/tenantId", "tenant-001", {
  startFromBeginning: true,
});

while (iterator.hasMoreResults) {
  const { resources, statusCode } = await iterator.readNext();
  if (statusCode === 304) {
    // No new changes; wait and retry
    await new Promise((resolve) => setTimeout(resolve, 1000));
    continue;
  }
  for (const doc of resources) {
    console.log("Changed document:", doc.id);
    await processChange(doc);
  }
}
```

### Bulk Operations

For high-throughput ingestion:
```typescript
const operations = items.map((item) => ({
  operationType: "Create" as const,
  resourceBody: item,
}));

const response = await container.items.bulk(operations);
const failed = response.filter((r) => r.statusCode >= 400);
console.log(`Inserted: ${response.length - failed.length}, Failed: ${failed.length}`);
```

### Indexing Policies

Control which paths are indexed to optimize write performance and RU cost:
```json
{
  "indexingMode": "consistent",
  "automatic": true,
  "includedPaths": [
    { "path": "/tenantId/?" },
    { "path": "/status/?" },
    { "path": "/createdAt/?" }
  ],
  "excludedPaths": [
    { "path": "/*" }
  ],
  "compositeIndexes": [
    [
      { "path": "/tenantId", "order": "ascending" },
      { "path": "/createdAt", "order": "descending" }
    ]
  ],
  "spatialIndexes": [
    { "path": "/location/*", "types": ["Point", "Polygon"] }
  ]
}
```

**Index tuning rules**:
- Exclude `/*` and include only queried paths for write-heavy workloads.
- Add composite indexes for ORDER BY on multiple fields.
- Add spatial indexes for geospatial queries.
- Range indexes (default) cover both equality and range filters.

## 7. Security

### Azure SQL: Azure AD Authentication

```bash
# Set Azure AD admin on the server
az sql server ad-admin create \
  --resource-group rg-myapp \
  --server sqlsrv-myapp \
  --display-name "DBA Team" \
  --object-id <aad-group-object-id>

# Enable Azure AD-only authentication
az sql server ad-only-auth enable \
  --resource-group rg-myapp \
  --server sqlsrv-myapp
```

**Grant database access to an Azure AD user or managed identity**:
```sql
CREATE USER [myapp-identity] FROM EXTERNAL PROVIDER;
ALTER ROLE db_datareader ADD MEMBER [myapp-identity];
ALTER ROLE db_datawriter ADD MEMBER [myapp-identity];
```

### Azure SQL: Firewall Rules

```bash
# List current rules
az sql server firewall-rule list --server sqlsrv-myapp --resource-group rg-myapp -o table

# Add a specific IP
az sql server firewall-rule create \
  --server sqlsrv-myapp \
  --resource-group rg-myapp \
  --name DevMachine \
  --start-ip-address 203.0.113.10 \
  --end-ip-address 203.0.113.10

# Use virtual network rule (more secure than IP rules)
az sql server vnet-rule create \
  --server sqlsrv-myapp \
  --resource-group rg-myapp \
  --name AllowAppSubnet \
  --vnet-name myVnet \
  --subnet appSubnet
```

### Azure SQL: Private Endpoints

```bash
az network private-endpoint create \
  --name pe-sqlsrv-myapp \
  --resource-group rg-myapp \
  --vnet-name myVnet \
  --subnet privateEndpointSubnet \
  --private-connection-resource-id $(az sql server show --name sqlsrv-myapp --resource-group rg-myapp --query id -o tsv) \
  --group-id sqlServer \
  --connection-name sqlConnection

# Disable public access after private endpoint is configured
az sql server update --name sqlsrv-myapp --resource-group rg-myapp --public-network-access Disabled
```

### Azure SQL: TDE (Transparent Data Encryption)

TDE is enabled by default on Azure SQL Database. For compliance, use customer-managed keys:

```bash
# Check TDE status
az sql db tde show --server sqlsrv-myapp --resource-group rg-myapp --database appdb

# Enable with customer-managed key (requires Key Vault)
az sql server key create \
  --server sqlsrv-myapp \
  --resource-group rg-myapp \
  --kid "https://myvault.vault.azure.net/keys/mykey/version"

az sql db tde set \
  --server sqlsrv-myapp \
  --resource-group rg-myapp \
  --database appdb \
  --status Enabled
```

### Azure SQL: Always Encrypted

Encrypt sensitive columns so that even DBAs cannot see plaintext values:

```sql
-- Create a column master key (backed by Azure Key Vault)
CREATE COLUMN MASTER KEY CMK_KeyVault
WITH (
    KEY_STORE_PROVIDER_NAME = 'AZURE_KEY_VAULT',
    KEY_PATH = 'https://myvault.vault.azure.net/keys/AlwaysEncryptedCMK'
);

-- Create a column encryption key
CREATE COLUMN ENCRYPTION KEY CEK_Auto
WITH VALUES (
    COLUMN_MASTER_KEY = CMK_KeyVault,
    ALGORITHM = 'RSA_OAEP',
    ENCRYPTED_VALUE = 0x...
);

-- Encrypt a column
ALTER TABLE dbo.Customers
ALTER COLUMN SSN NVARCHAR(11)
ENCRYPTED WITH (
    COLUMN_ENCRYPTION_KEY = CEK_Auto,
    ENCRYPTION_TYPE = Deterministic,
    ALGORITHM = 'AEAD_AES_256_CBC_HMAC_SHA_256'
);
```

### Azure SQL: Dynamic Data Masking

```sql
-- Mask email column
ALTER TABLE dbo.Customers
ALTER COLUMN Email ADD MASKED WITH (FUNCTION = 'email()');

-- Mask SSN (show last 4)
ALTER TABLE dbo.Customers
ALTER COLUMN SSN ADD MASKED WITH (FUNCTION = 'partial(0,"XXX-XX-",4)');

-- Mask credit card
ALTER TABLE dbo.Payments
ALTER COLUMN CardNumber ADD MASKED WITH (FUNCTION = 'partial(0,"XXXX-XXXX-XXXX-",4)');

-- Grant unmask permission to specific users
GRANT UNMASK TO [ReportingUser];
```

### Azure SQL: Row-Level Security

```sql
-- Create a security predicate function
CREATE FUNCTION dbo.fn_TenantFilter(@TenantId UNIQUEIDENTIFIER)
RETURNS TABLE
WITH SCHEMABINDING
AS
RETURN SELECT 1 AS result
WHERE @TenantId = CAST(SESSION_CONTEXT(N'TenantId') AS UNIQUEIDENTIFIER);

-- Apply the security policy
CREATE SECURITY POLICY dbo.TenantPolicy
ADD FILTER PREDICATE dbo.fn_TenantFilter(TenantId) ON dbo.Orders,
ADD BLOCK PREDICATE dbo.fn_TenantFilter(TenantId) ON dbo.Orders;

-- Set tenant context in application code
EXEC sp_set_session_context @key = N'TenantId', @value = @currentTenantId;
```

### Cosmos DB: Managed Identity & RBAC

```bash
# Assign Cosmos DB data contributor role to a managed identity
az cosmosdb sql role assignment create \
  --account-name cosmos-myapp \
  --resource-group rg-myapp \
  --role-definition-name "Cosmos DB Built-in Data Contributor" \
  --principal-id <managed-identity-object-id> \
  --scope "/"

# Disable key-based auth (production recommendation)
az cosmosdb update \
  --name cosmos-myapp \
  --resource-group rg-myapp \
  --disable-key-based-metadata-write-access true
```

## 8. Backup & DR

### Azure SQL: Automated Backups (PITR)

Azure SQL Database automatically takes full backups (weekly), differential backups (every 12 hours), and transaction log backups (every 5-10 minutes).

```bash
# Check backup retention
az sql db show --server sqlsrv-myapp --resource-group rg-myapp --name appdb \
  --query "{retentionDays:earliestRestoreDate}"

# Set short-term retention (7-35 days)
az sql db str-policy set \
  --server sqlsrv-myapp \
  --resource-group rg-myapp \
  --name appdb \
  --retention-days 14

# Restore to a point in time
az sql db restore \
  --dest-name appdb-restored \
  --server sqlsrv-myapp \
  --resource-group rg-myapp \
  --name appdb \
  --time "2024-06-15T10:30:00Z"
```

### Azure SQL: Long-Term Retention (LTR)

```bash
# Configure weekly + monthly + yearly retention
az sql db ltr-policy set \
  --server sqlsrv-myapp \
  --resource-group rg-myapp \
  --name appdb \
  --weekly-retention P4W \
  --monthly-retention P12M \
  --yearly-retention P5Y \
  --week-of-year 1
```

### Azure SQL: Geo-Replication & Failover Groups

```bash
# Create a failover group across regions
az sql failover-group create \
  --name fg-myapp \
  --resource-group rg-myapp \
  --server sqlsrv-myapp \
  --partner-server sqlsrv-myapp-westus \
  --partner-resource-group rg-myapp-westus \
  --failover-policy Automatic \
  --grace-period 1

# Add database to failover group
az sql failover-group update \
  --name fg-myapp \
  --resource-group rg-myapp \
  --server sqlsrv-myapp \
  --add-db appdb

# Manual failover (for testing)
az sql failover-group set-primary \
  --name fg-myapp \
  --resource-group rg-myapp-westus \
  --server sqlsrv-myapp-westus
```

Failover group endpoints:
- Read-write: `fg-myapp.database.windows.net`
- Read-only: `fg-myapp.secondary.database.windows.net`

### Cosmos DB: Multi-Region Writes

```bash
# Add a second region
az cosmosdb update \
  --name cosmos-myapp \
  --resource-group rg-myapp \
  --locations regionName=eastus failoverPriority=0 \
  --locations regionName=westus failoverPriority=1

# Enable multi-region writes
az cosmosdb update \
  --name cosmos-myapp \
  --resource-group rg-myapp \
  --enable-multiple-write-locations true
```

### Cosmos DB: Consistency Levels

| Level | Guarantee | Latency | RU Cost | Use Case |
|-------|-----------|---------|---------|----------|
| Strong | Linearizable reads | Highest | 2x writes | Financial transactions |
| Bounded Staleness | Reads lag by k versions or t time | High | 2x writes | Leaderboards, counters |
| Session | Read-your-own-writes within session | Medium | 1x | Most applications (default) |
| Consistent Prefix | Reads never see out-of-order writes | Low | 1x | Social feeds, notifications |
| Eventual | No ordering guarantee | Lowest | 1x | Telemetry, analytics |

**Recommendation**: Use **Session** consistency for most applications. Only use **Strong** when you need cross-session linearizable reads and can tolerate higher latency and cost.

### Cosmos DB: Continuous Backup (PITR)

```bash
# Enable continuous backup (7-day or 30-day retention)
az cosmosdb update \
  --name cosmos-myapp \
  --resource-group rg-myapp \
  --backup-policy-type Continuous \
  --continuous-tier Continuous30Days

# Restore to a point in time
az cosmosdb restore \
  --target-database-account-name cosmos-myapp-restored \
  --account-name cosmos-myapp \
  --resource-group rg-myapp \
  --restore-timestamp "2024-06-15T10:30:00Z" \
  --location eastus
```

## 9. Connectivity Patterns

### Azure SQL: Connection Strings

**SQL authentication**:
```
Server=tcp:sqlsrv-myapp.database.windows.net,1433;Initial Catalog=appdb;User ID=sqladmin;Password={password};Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;
```

**Azure AD with managed identity**:
```
Server=tcp:sqlsrv-myapp.database.windows.net,1433;Initial Catalog=appdb;Authentication=Active Directory Managed Identity;Encrypt=True;
```

### Node.js: mssql Package

```typescript
import sql from "mssql";

const pool = new sql.ConnectionPool({
  server: process.env.SQL_SERVER!,
  database: process.env.SQL_DATABASE!,
  authentication: {
    type: "azure-active-directory-msi-app-service",
  },
  options: {
    encrypt: true,
    trustServerCertificate: false,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
});

await pool.connect();

// Parameterized query (always use parameters to prevent SQL injection)
const result = await pool
  .request()
  .input("tenantId", sql.UniqueIdentifier, tenantId)
  .input("status", sql.NVarChar(20), "active")
  .query("SELECT * FROM dbo.Orders WHERE TenantId = @tenantId AND Status = @status");

console.log(result.recordset);

// Cleanup on shutdown
process.on("SIGTERM", () => pool.close());
```

### Node.js: tedious (Lower-Level Driver)

```typescript
import { Connection, Request, TYPES } from "tedious";

const connection = new Connection({
  server: process.env.SQL_SERVER!,
  authentication: {
    type: "azure-active-directory-msi-app-service",
    options: { clientId: process.env.AZURE_CLIENT_ID },
  },
  options: {
    database: process.env.SQL_DATABASE!,
    encrypt: true,
    port: 1433,
  },
});

connection.on("connect", (err) => {
  if (err) throw err;

  const request = new Request("SELECT TOP 10 * FROM dbo.Orders WHERE Status = @status", (err, rowCount) => {
    if (err) throw err;
    console.log(`${rowCount} rows returned`);
  });

  request.addParameter("status", TYPES.NVarChar, "active");

  request.on("row", (columns) => {
    columns.forEach((col) => console.log(col.metadata.colName, col.value));
  });

  connection.execSql(request);
});

connection.connect();
```

### Cosmos DB SDK: @azure/cosmos

```typescript
import { CosmosClient } from "@azure/cosmos";
import { DefaultAzureCredential } from "@azure/identity";

// Option 1: Key-based auth (dev only)
const client = new CosmosClient({
  endpoint: process.env.COSMOS_ENDPOINT!,
  key: process.env.COSMOS_KEY!,
});

// Option 2: Azure AD / Managed Identity (production)
const credential = new DefaultAzureCredential();
const client2 = new CosmosClient({
  endpoint: process.env.COSMOS_ENDPOINT!,
  aadCredentials: credential,
});

// IMPORTANT: Create a single CosmosClient instance and reuse it (singleton pattern)
const database = client.database("appdb");
const container = database.container("orders");

// Point read (most efficient: 1 RU for 1 KB doc)
const { resource: order } = await container.item("order-123", "tenant-001").read();

// Query with parameters
const { resources: orders } = await container.items
  .query({
    query: "SELECT * FROM c WHERE c.tenantId = @tenantId AND c.status = @status",
    parameters: [
      { name: "@tenantId", value: "tenant-001" },
      { name: "@status", value: "active" },
    ],
  })
  .fetchAll();

// Upsert
const { resource: upserted } = await container.items.upsert({
  id: "order-123",
  tenantId: "tenant-001",
  status: "shipped",
  updatedAt: new Date().toISOString(),
});
```

### Connection Pooling & Retry Logic

```typescript
import sql from "mssql";

// mssql handles connection pooling internally via the ConnectionPool.
// Configure pool size based on expected concurrency.

const poolConfig: sql.config = {
  server: process.env.SQL_SERVER!,
  database: process.env.SQL_DATABASE!,
  pool: {
    max: 20,   // Max concurrent connections
    min: 5,    // Keep 5 warm connections
    idleTimeoutMillis: 60000,
  },
  options: {
    encrypt: true,
    connectTimeout: 15000,
    requestTimeout: 15000,
  },
};

// Retry wrapper for transient failures
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const isTransient =
        err.code === "ETIMEOUT" ||
        err.code === "ESOCKET" ||
        err.number === 40613 || // Database not available
        err.number === 40197 || // Service error
        err.number === 40501;   // Service busy
      if (!isTransient || attempt === maxRetries) throw err;
      const delay = Math.pow(2, attempt) * 1000 + Math.random() * 500;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error("Unreachable");
}

// Usage
const result = await withRetry(() =>
  pool.request().query("SELECT COUNT(*) AS cnt FROM dbo.Orders")
);
```

## 10. Monitoring

### Azure SQL Analytics

```bash
# Enable diagnostic settings to Log Analytics
az monitor diagnostic-settings create \
  --name sql-diagnostics \
  --resource $(az sql db show --server sqlsrv-myapp --resource-group rg-myapp --name appdb --query id -o tsv) \
  --workspace <log-analytics-workspace-id> \
  --logs '[{"category":"SQLInsights","enabled":true},{"category":"AutomaticTuning","enabled":true},{"category":"QueryStoreRuntimeStatistics","enabled":true}]' \
  --metrics '[{"category":"Basic","enabled":true}]'
```

**Key Azure SQL metrics**:
| Metric | Description | Alert Threshold |
|--------|-------------|----------------|
| `cpu_percent` | CPU utilization | > 80% sustained |
| `dtu_consumption_percent` | DTU usage (DTU model) | > 80% sustained |
| `storage_percent` | Data space used | > 85% |
| `workers_percent` | Worker thread utilization | > 70% |
| `sessions_percent` | Session count vs limit | > 70% |
| `deadlock` | Deadlock count | > 0 |
| `connection_failed` | Failed connection attempts | > 10/min |

**Query via Azure CLI**:
```bash
az monitor metrics list \
  --resource $(az sql db show --server sqlsrv-myapp --resource-group rg-myapp --name appdb --query id -o tsv) \
  --metric "cpu_percent" \
  --interval PT1H \
  --start-time 2024-06-15T00:00:00Z \
  --end-time 2024-06-16T00:00:00Z
```

### Cosmos DB Metrics

**Key Cosmos DB metrics**:
| Metric | Description | Alert Threshold |
|--------|-------------|----------------|
| `TotalRequestUnits` | RU consumption | > 80% of provisioned |
| `TotalRequests` | Request count by status code | 429 count > 0 (throttled) |
| `ServerSideLatency` | Server-side latency (P99) | > 10ms for reads |
| `NormalizedRUConsumption` | RU usage as % of max | > 70% sustained |
| `DataUsage` | Storage consumed (bytes) | > 80% of provisioned |
| `IndexUsage` | Index storage (bytes) | Monitor for unexpected growth |

```bash
# Check for throttled requests (HTTP 429)
az monitor metrics list \
  --resource $(az cosmosdb show --name cosmos-myapp --resource-group rg-myapp --query id -o tsv) \
  --metric "TotalRequests" \
  --dimension StatusCode \
  --interval PT1H
```

### Setting Up Alerts

```bash
# Alert on Azure SQL CPU > 80%
az monitor metrics alert create \
  --name "SQL High CPU" \
  --resource-group rg-myapp \
  --scopes $(az sql db show --server sqlsrv-myapp --resource-group rg-myapp --name appdb --query id -o tsv) \
  --condition "avg cpu_percent > 80" \
  --window-size PT5M \
  --evaluation-frequency PT1M \
  --action <action-group-id>

# Alert on Cosmos DB throttling
az monitor metrics alert create \
  --name "Cosmos Throttled" \
  --resource-group rg-myapp \
  --scopes $(az cosmosdb show --name cosmos-myapp --resource-group rg-myapp --query id -o tsv) \
  --condition "total TotalRequests{StatusCode=429} > 0" \
  --window-size PT5M \
  --action <action-group-id>
```

## 11. Migration

### Azure Database Migration Service (DMS)

For migrating on-premises SQL Server to Azure SQL Database:

```bash
# Create a DMS instance
az dms create \
  --name dms-migration \
  --resource-group rg-myapp \
  --location eastus \
  --sku-name Standard_1vCores

# Create a migration project
az dms project create \
  --name migrate-appdb \
  --resource-group rg-myapp \
  --service-name dms-migration \
  --source-platform SQL \
  --target-platform SQLDB
```

### BACPAC Import/Export

```bash
# Export a database to BACPAC
az sql db export \
  --server sqlsrv-myapp \
  --resource-group rg-myapp \
  --name appdb \
  --admin-user sqladmin \
  --admin-password '<password>' \
  --storage-key-type StorageAccessKey \
  --storage-key <storage-account-key> \
  --storage-uri "https://mystorage.blob.core.windows.net/bacpac/appdb.bacpac"

# Import a BACPAC to a new database
az sql db import \
  --server sqlsrv-myapp \
  --resource-group rg-myapp \
  --name appdb-imported \
  --admin-user sqladmin \
  --admin-password '<password>' \
  --storage-key-type StorageAccessKey \
  --storage-key <storage-account-key> \
  --storage-uri "https://mystorage.blob.core.windows.net/bacpac/appdb.bacpac"
```

### SqlPackage CLI

```bash
# Generate a DACPAC (schema only)
SqlPackage /Action:Extract /TargetFile:appdb.dacpac \
  /SourceServerName:sqlsrv-myapp.database.windows.net \
  /SourceDatabaseName:appdb \
  /SourceUser:sqladmin /SourcePassword:'<password>'

# Deploy a DACPAC (schema update)
SqlPackage /Action:Publish /SourceFile:appdb.dacpac \
  /TargetServerName:sqlsrv-myapp.database.windows.net \
  /TargetDatabaseName:appdb \
  /TargetUser:sqladmin /TargetPassword:'<password>'

# Generate diff script
SqlPackage /Action:Script /SourceFile:appdb.dacpac \
  /TargetServerName:sqlsrv-myapp.database.windows.net \
  /TargetDatabaseName:appdb \
  /OutputFile:migrate.sql
```

### Cosmos DB Data Migration

**Azure Cosmos DB Data Migration Tool** (for bulk import from JSON, CSV, MongoDB, SQL):

```bash
# Install dt (Data Migration Tool)
dotnet tool install -g Microsoft.Azure.Cosmos.Table.DataMigrationTool

# Import from JSON files
dt import \
  --source json --source-path ./data/*.json \
  --target cosmosdb \
  --target-endpoint "https://cosmos-myapp.documents.azure.com:443/" \
  --target-key "<primary-key>" \
  --target-database appdb \
  --target-collection items
```

**Azure Data Factory** for ongoing data pipelines between SQL and Cosmos DB or other sources.

## 12. Common Patterns

### Pattern 1: Multi-Tenant Azure SQL with Elastic Pool

A SaaS application with one database per tenant in a shared elastic pool.

```bash
# Create the elastic pool
az sql elastic-pool create \
  --resource-group rg-saas \
  --server sqlsrv-saas \
  --name pool-tenants \
  --edition GeneralPurpose \
  --family Gen5 \
  --capacity 4 \
  --db-max-capacity 2 \
  --db-min-capacity 0

# Script to create a new tenant database
create_tenant_db() {
  local tenant_id=$1
  az sql db create \
    --resource-group rg-saas \
    --server sqlsrv-saas \
    --name "tenant-${tenant_id}" \
    --elastic-pool pool-tenants

  sqlcmd -S sqlsrv-saas.database.windows.net -d "tenant-${tenant_id}" \
    -U sqladmin -P '<pwd>' \
    -i ./migrations/init-tenant-schema.sql
}
```

**Tenant routing** in application code:
```typescript
import sql from "mssql";

const tenantPools = new Map<string, sql.ConnectionPool>();

async function getTenantPool(tenantId: string): Promise<sql.ConnectionPool> {
  if (!tenantPools.has(tenantId)) {
    const pool = new sql.ConnectionPool({
      server: process.env.SQL_SERVER!,
      database: `tenant-${tenantId}`,
      authentication: { type: "azure-active-directory-msi-app-service" },
      options: { encrypt: true },
      pool: { max: 5, min: 0, idleTimeoutMillis: 60000 },
    });
    await pool.connect();
    tenantPools.set(tenantId, pool);
  }
  return tenantPools.get(tenantId)!;
}
```

### Pattern 2: Cosmos DB Document Store with Change Feed

An event-driven architecture using Cosmos DB change feed to trigger downstream processing.

```typescript
import { CosmosClient, ChangeFeedIteratorOptions } from "@azure/cosmos";

const client = new CosmosClient({ endpoint: process.env.COSMOS_ENDPOINT!, key: process.env.COSMOS_KEY! });
const container = client.database("appdb").container("events");

// Write events
async function publishEvent(event: { tenantId: string; type: string; data: any }) {
  await container.items.create({
    id: crypto.randomUUID(),
    tenantId: event.tenantId,
    type: event.type,
    data: event.data,
    timestamp: new Date().toISOString(),
    _ttl: 2592000, // 30-day TTL
  });
}

// Process change feed (in a worker/Azure Function)
async function processChangeFeed() {
  const iterator = container.items.changeFeed({ startFromBeginning: false });

  while (true) {
    const { resources, statusCode } = await iterator.readNext();
    if (statusCode === 304) {
      await new Promise((r) => setTimeout(r, 5000));
      continue;
    }
    for (const event of resources) {
      switch (event.type) {
        case "order.created":
          await handleOrderCreated(event.data);
          break;
        case "order.shipped":
          await handleOrderShipped(event.data);
          break;
      }
    }
  }
}
```

### Pattern 3: Azure SQL with Managed Identity from App Service

Connect an Azure App Service to Azure SQL Database using system-assigned managed identity (no passwords).

```bash
# Enable system-assigned identity on App Service
az webapp identity assign --name myapp --resource-group rg-myapp

# Get the identity's object ID
IDENTITY_OID=$(az webapp identity show --name myapp --resource-group rg-myapp --query principalId -o tsv)

# Grant the identity access to the database
sqlcmd -S sqlsrv-myapp.database.windows.net -d appdb \
  --authentication-method ActiveDirectoryDefault \
  -Q "CREATE USER [myapp] FROM EXTERNAL PROVIDER; ALTER ROLE db_datareader ADD MEMBER [myapp]; ALTER ROLE db_datawriter ADD MEMBER [myapp];"
```

**Application code** (no credentials needed):
```typescript
import sql from "mssql";

const pool = new sql.ConnectionPool({
  server: "sqlsrv-myapp.database.windows.net",
  database: "appdb",
  authentication: {
    type: "azure-active-directory-default",
  },
  options: {
    encrypt: true,
  },
});

await pool.connect();
const result = await pool.request().query("SELECT TOP 10 * FROM dbo.Orders");
```

**App Service configuration** (no connection string secrets):
```bash
az webapp config appsettings set --name myapp --resource-group rg-myapp \
  --settings SQL_SERVER=sqlsrv-myapp.database.windows.net SQL_DATABASE=appdb
```

### Pattern 4: Cosmos DB with Hierarchical Partition Key

For multi-tenant applications with sub-partitioning by user, use hierarchical partition keys to avoid hot partitions and enable efficient sub-partition queries.

```bash
# Create container with hierarchical partition key
az cosmosdb sql container create \
  --account-name cosmos-myapp \
  --resource-group rg-myapp \
  --database-name appdb \
  --name user-activities \
  --partition-key-path /tenantId /userId \
  --max-throughput 10000
```

**Document structure**:
```json
{
  "id": "act-001",
  "tenantId": "tenant-001",
  "userId": "user-abc",
  "type": "page_view",
  "page": "/dashboard",
  "timestamp": "2024-06-15T10:30:00Z",
  "metadata": {
    "browser": "Chrome",
    "os": "Windows"
  }
}
```

**Query patterns**:
```sql
-- Efficient: filters on full partition key hierarchy
SELECT * FROM c
WHERE c.tenantId = 'tenant-001' AND c.userId = 'user-abc'
ORDER BY c.timestamp DESC
OFFSET 0 LIMIT 20

-- Efficient: filters on first level of hierarchy (fan-out within tenant only)
SELECT c.userId, COUNT(1) AS activityCount
FROM c
WHERE c.tenantId = 'tenant-001' AND c.timestamp > '2024-06-01'
GROUP BY c.userId

-- Expensive: no partition key filter (full fan-out)
SELECT * FROM c WHERE c.type = 'page_view'
```

**Application code**:
```typescript
import { CosmosClient } from "@azure/cosmos";

const client = new CosmosClient({ endpoint: process.env.COSMOS_ENDPOINT!, key: process.env.COSMOS_KEY! });
const container = client.database("appdb").container("user-activities");

// Point read with hierarchical partition key
const { resource } = await container.item("act-001", ["tenant-001", "user-abc"]).read();

// Query within a tenant (efficient sub-partition fan-out)
const { resources } = await container.items
  .query({
    query: "SELECT * FROM c WHERE c.tenantId = @tenantId AND c.type = @type ORDER BY c.timestamp DESC",
    parameters: [
      { name: "@tenantId", value: "tenant-001" },
      { name: "@type", value: "page_view" },
    ],
  })
  .fetchAll();
```

## Progressive Disclosure — Reference Files

| Topic | File |
|---|---|
| Azure SQL provisioning, service tiers, elastic pools, connection management | [`references/azure-sql-provisioning.md`](./references/azure-sql-provisioning.md) |
| Cosmos DB partition design, SDK patterns, RU management, change feed | [`references/cosmos-db-patterns.md`](./references/cosmos-db-patterns.md) |
| Security: RLS, Always Encrypted, Dynamic Data Masking, auditing | [`references/sql-security-compliance.md`](./references/sql-security-compliance.md) |
| Query Store, DMV analysis, index management, wait statistics | [`references/query-performance.md`](./references/query-performance.md) |
| Backup retention, PITR, geo-replication, Auto-Failover Groups | [`references/backup-dr.md`](./references/backup-dr.md) |
