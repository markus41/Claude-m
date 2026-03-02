---
name: cosmos-query
description: "Run Cosmos DB SQL queries, analyze RU consumption, and optimize query performance"
argument-hint: "<query> --account <account> --db <database> --container <container> [--analyze] [--cross-partition]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

# Run Cosmos DB Queries

Execute SQL queries against Azure Cosmos DB (NoSQL API), analyze RU consumption, and optimize query performance.

## Instructions

### 1. Validate Inputs

- `<query>` — SQL query string (e.g., `SELECT * FROM c WHERE c.tenantId = 'abc'`).
- `--account` — Cosmos DB account name. Read from `.env` if not provided.
- `--db` — Database name. Read from `.env` if not provided.
- `--container` — Container name. Ask if not provided.
- `--analyze` — Show RU charge, query metrics, and optimization suggestions.
- `--cross-partition` — Enable cross-partition query execution.

### 2. Execute the Query

**Via Azure CLI**:
```bash
az cosmosdb sql container invoke-query \
  --account-name <account> \
  --resource-group <rg> \
  --database-name <db> \
  --name <container> \
  --query-text "<query>" \
  --partition-key-value "<value>"
```

**Via Node.js script** (for detailed metrics):
```typescript
import { CosmosClient } from "@azure/cosmos";

const client = new CosmosClient({
  endpoint: process.env.COSMOS_ENDPOINT!,
  key: process.env.COSMOS_KEY!,
});

const container = client.database("<db>").container("<container>");

const { resources, requestCharge, diagnostics } = await container.items
  .query({
    query: "<query>",
    parameters: [],
  })
  .fetchAll();

console.log(`Results: ${resources.length}`);
console.log(`Request Charge: ${requestCharge} RUs`);
```

### 3. Analyze RU Consumption (when --analyze)

Evaluate query cost:
- **< 10 RUs**: Efficient point read or single-partition query.
- **10-100 RUs**: Typical indexed query; review if this runs frequently.
- **100-1000 RUs**: Expensive query; check for missing indexes or cross-partition fan-out.
- **> 1000 RUs**: Very expensive; likely a full scan or large cross-partition query. Must optimize.

Check query metrics for:
- **Index utilization**: Flag queries that fall back to full scans.
- **Retrieved vs output document count**: Large ratios indicate inefficient filtering.
- **Cross-partition round trips**: Flag unnecessary cross-partition queries.
- **Response size**: Flag queries returning large documents when only a few fields are needed (use VALUE projection).

### 4. Suggest Optimizations

Based on analysis, recommend:

**Indexing improvements**:
```json
{
  "compositeIndexes": [
    [
      { "path": "/tenantId", "order": "ascending" },
      { "path": "/createdAt", "order": "descending" }
    ]
  ]
}
```

**Query rewrites**:
- Replace `SELECT *` with explicit field projection: `SELECT c.id, c.name, c.status FROM c`
- Add partition key to WHERE clause to avoid cross-partition queries
- Use `TOP` or `OFFSET LIMIT` for pagination
- Use point reads (`container.item(id, partitionKey).read()`) instead of queries for single-document lookups

**Throughput adjustments**:
- If consistent high RU consumption, recommend increasing autoscale max
- If sporadic spikes, recommend autoscale over manual throughput

### 5. Display Results

Show the user:
- Query results (formatted as table or JSON)
- RU charge and query execution metrics (when `--analyze`)
- Optimization suggestions ranked by impact
- Estimated RU savings from applying optimizations
- Next steps: update indexing policy, rewrite query, or adjust throughput
