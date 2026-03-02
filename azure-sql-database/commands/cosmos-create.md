---
name: cosmos-create
description: "Create a Cosmos DB account, database, and container with partition key strategy"
argument-hint: "--account <name> --rg <resource-group> --db <database> --container <container> --partition-key <path> [--api <nosql|mongodb|cassandra|gremlin|table>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - AskUserQuestion
---

# Create Azure Cosmos DB Resources

Provision an Azure Cosmos DB account, database, and container with optimized partition key strategy.

## Instructions

### 1. Validate Inputs

- `--account` — Cosmos DB account name (globally unique). Ask if not provided.
- `--rg` — Resource group name. Ask if not provided; offer to create if it does not exist.
- `--db` — Database name. Ask if not provided.
- `--container` — Container name. Ask if not provided.
- `--partition-key` — Partition key path (e.g., `/tenantId`). Ask if not provided; guide the user through selection.
- `--api` — API type: `nosql` (default), `mongodb`, `cassandra`, `gremlin`, `table`.

### 2. Guide Partition Key Selection

If the user is unsure about partition key, walk through the decision:

**Good partition keys**:
- High cardinality (many distinct values): `tenantId`, `userId`, `deviceId`
- Even data distribution: documents spread roughly equally across partitions
- Common query filter: most queries include the partition key in the WHERE clause

**Bad partition keys**:
- Low cardinality: `status` (only a few values like "active"/"inactive")
- Monotonically increasing: `timestamp` (creates hot partitions)
- Skewed distribution: a few values hold most of the data

**Hierarchical partition keys** (preview): For multi-tenant with sub-partitioning:
```
/tenantId /userId
```

### 3. Create Resource Group (if needed)

```bash
az group show --name <rg> 2>/dev/null || az group create --name <rg> --location eastus
```

### 4. Create Cosmos DB Account

```bash
az cosmosdb create \
  --name <account> \
  --resource-group <rg> \
  --default-consistency-level Session \
  --locations regionName=eastus failoverPriority=0 isZoneRedundant=false \
  --enable-automatic-failover true
```

For MongoDB API:
```bash
az cosmosdb create \
  --name <account> \
  --resource-group <rg> \
  --kind MongoDB \
  --server-version 6.0 \
  --default-consistency-level Session \
  --locations regionName=eastus failoverPriority=0
```

### 5. Create Database

**NoSQL API**:
```bash
az cosmosdb sql database create \
  --account-name <account> \
  --resource-group <rg> \
  --name <db>
```

**MongoDB API**:
```bash
az cosmosdb mongodb database create \
  --account-name <account> \
  --resource-group <rg> \
  --name <db>
```

### 6. Create Container

**With autoscale (recommended for production)**:
```bash
az cosmosdb sql container create \
  --account-name <account> \
  --resource-group <rg> \
  --database-name <db> \
  --name <container> \
  --partition-key-path "/<partition-key>" \
  --max-throughput 4000
```

**With manual throughput (for dev/test)**:
```bash
az cosmosdb sql container create \
  --account-name <account> \
  --resource-group <rg> \
  --database-name <db> \
  --name <container> \
  --partition-key-path "/<partition-key>" \
  --throughput 400
```

**With unique key constraint**:
```bash
az cosmosdb sql container create \
  --account-name <account> \
  --resource-group <rg> \
  --database-name <db> \
  --name <container> \
  --partition-key-path "/<partition-key>" \
  --unique-key-policy '{"uniqueKeys": [{"paths": ["/email"]}]}' \
  --throughput 400
```

**With TTL (for event/log data)**:
```bash
az cosmosdb sql container create \
  --account-name <account> \
  --resource-group <rg> \
  --database-name <db> \
  --name <container> \
  --partition-key-path "/<partition-key>" \
  --default-ttl 2592000 \
  --throughput 400
```

### 7. Configure Indexing Policy (Optional)

For write-heavy workloads, optimize the indexing policy:
```bash
az cosmosdb sql container update \
  --account-name <account> \
  --resource-group <rg> \
  --database-name <db> \
  --name <container> \
  --idx '{
    "indexingMode": "consistent",
    "automatic": true,
    "includedPaths": [
      {"path": "/tenantId/?"},
      {"path": "/createdAt/?"},
      {"path": "/status/?"}
    ],
    "excludedPaths": [
      {"path": "/*"}
    ]
  }'
```

### 8. Display Summary

Show the user:
- Account endpoint: `https://<account>.documents.azure.com:443/`
- Database name and container name
- Partition key path and throughput configuration
- Connection information (endpoint + key)
- Indexing policy summary
- Next steps: run `/cosmos-query` to execute queries, `/db-security-audit` to review security
