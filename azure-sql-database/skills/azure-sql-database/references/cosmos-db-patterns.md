# Azure Cosmos DB Patterns — Deep Reference

## Overview

Azure Cosmos DB is a globally distributed, multi-model NoSQL database supporting multiple APIs: SQL (Core), MongoDB, Cassandra, Gremlin (graph), and Table. This reference focuses on the SQL API (most common), partition key design, request unit (RU) management, and the `@azure/cosmos` TypeScript SDK.

## REST API Endpoints (SQL API — Control Plane)

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|---|---|---|---|---|
| PUT | `/providers/Microsoft.DocumentDB/databaseAccounts/{account}` | Cosmos DB Account Contributor | locations, capabilities, consistencyPolicy | Create account |
| PUT | `/databaseAccounts/{account}/sqlDatabases/{db}` | Cosmos DB Account Contributor | `resource.id`, `options.throughput` | Create database |
| PUT | `/databaseAccounts/{account}/sqlDatabases/{db}/containers/{container}` | Cosmos DB Account Contributor | `partitionKey.paths`, indexingPolicy, throughput | Create container |
| DELETE | `/databaseAccounts/{account}/sqlDatabases/{db}/containers/{container}` | Cosmos DB Account Contributor | — | Delete container (irreversible) |
| POST | `/databaseAccounts/{account}/sqlDatabases/{db}/containers/{container}/throughputSettings/default/migrateToAutoscale` | Cosmos DB Account Contributor | — | Switch to autoscale throughput |
| GET | `/databaseAccounts/{account}/sqlDatabases/{db}/containers/{container}/throughputSettings/default` | Reader | — | Get current RU/s setting |

Base: `https://management.azure.com/subscriptions/{sub}/resourceGroups/{rg}`

## Cosmos DB SQL API — Data Plane REST

| Method | Endpoint | Auth | Notes |
|---|---|---|---|
| POST | `/{account}.documents.azure.com/dbs/{db}/colls/{container}/docs` | Master key or RBAC token | Create document |
| GET | `/{account}.documents.azure.com/dbs/{db}/colls/{container}/docs/{id}` | Master key or RBAC token | Read by ID (must include partition key header) |
| PUT | `/{account}.documents.azure.com/dbs/{db}/colls/{container}/docs/{id}` | Master key or RBAC token | Replace document |
| PATCH | `/{account}.documents.azure.com/dbs/{db}/colls/{container}/docs/{id}` | Master key or RBAC token | Partial update (patch) |
| DELETE | `/{account}.documents.azure.com/dbs/{db}/colls/{container}/docs/{id}` | Master key or RBAC token | Delete document |
| POST | `/{account}.documents.azure.com/dbs/{db}/colls/{container}/docs` (with `x-ms-documentdb-isquery: true`) | Master key or RBAC token | Query with SQL |

## TypeScript SDK Patterns (`@azure/cosmos`)

### Connect with managed identity (recommended)

```typescript
import { CosmosClient } from "@azure/cosmos";
import { DefaultAzureCredential } from "@azure/identity";

// Preferred: RBAC-based access with managed identity
const credential = new DefaultAzureCredential();
const client = new CosmosClient({
  endpoint: process.env.COSMOS_ENDPOINT!, // https://{account}.documents.azure.com:443/
  aadCredentials: credential,
});

const db = client.database("mydb");
const container = db.container("users");
```

### Create a container with optimal partition key

```typescript
import { CosmosClient, PartitionKeyKind } from "@azure/cosmos";
import { DefaultAzureCredential } from "@azure/identity";

const client = new CosmosClient({
  endpoint: process.env.COSMOS_ENDPOINT!,
  aadCredentials: new DefaultAzureCredential(),
});

// Create database with shared throughput (autoscale)
const { database } = await client.databases.createIfNotExists({
  id: "mydb",
  throughput: {
    autoscaleMaxThroughput: 4000, // 400–4000 RU/s autoscale
  },
});

// Create container with hierarchical partition key (avoids hot partitions in large datasets)
const { container } = await database.containers.createIfNotExists({
  id: "orders",
  partitionKey: {
    paths: ["/tenantId", "/customerId"], // hierarchical (first level = tenant, second = customer)
    kind: PartitionKeyKind.MultiHash,
    version: 2,
  },
  indexingPolicy: {
    indexingMode: "consistent",
    includedPaths: [{ path: "/*" }],
    excludedPaths: [
      { path: "/largePayload/*" }, // exclude large fields not used in queries
      { path: '/"_etag"/?'},
    ],
    compositeIndexes: [
      [
        { path: "/customerId", order: "ascending" },
        { path: "/createdAt", order: "descending" },
      ],
    ],
  },
  defaultTtl: 60 * 60 * 24 * 90, // 90 days TTL (for soft-delete / expiry patterns)
});
```

### CRUD operations

```typescript
import { CosmosClient, PatchOperation } from "@azure/cosmos";
import { DefaultAzureCredential } from "@azure/identity";

const container = new CosmosClient({
  endpoint: process.env.COSMOS_ENDPOINT!,
  aadCredentials: new DefaultAzureCredential(),
}).database("mydb").container("orders");

// Create
const { resource: created, requestCharge: createRU } = await container.items.create({
  id: crypto.randomUUID(),
  tenantId: "tenant-abc",
  customerId: "cust-123",
  amount: 99.99,
  status: "pending",
  createdAt: new Date().toISOString(),
});
console.log(`Created order ${created!.id} (${createRU} RU)`);

// Read by ID (partition key required for single-partition read)
const { resource: order, requestCharge: readRU } = await container.item(
  created!.id,
  ["tenant-abc", "cust-123"] // hierarchical partition key value
).read();
console.log(`Read order (${readRU} RU)`);

// Patch (partial update)
const patches: PatchOperation[] = [
  { op: "set", path: "/status", value: "completed" },
  { op: "add", path: "/completedAt", value: new Date().toISOString() },
  { op: "incr", path: "/version", value: 1 },
];
await container.item(created!.id, ["tenant-abc", "cust-123"]).patch(patches);

// Delete
await container.item(created!.id, ["tenant-abc", "cust-123"]).delete();
```

### Query patterns

```typescript
import { CosmosClient, SqlQuerySpec } from "@azure/cosmos";
import { DefaultAzureCredential } from "@azure/identity";

const container = new CosmosClient({
  endpoint: process.env.COSMOS_ENDPOINT!,
  aadCredentials: new DefaultAzureCredential(),
}).database("mydb").container("orders");

// Parameterized query (always use parameters — avoid string interpolation)
const querySpec: SqlQuerySpec = {
  query: "SELECT * FROM c WHERE c.tenantId = @tenantId AND c.status = @status ORDER BY c.createdAt DESC OFFSET 0 LIMIT 20",
  parameters: [
    { name: "@tenantId", value: "tenant-abc" },
    { name: "@status", value: "pending" },
  ],
};

const { resources: orders, requestCharge } = await container.items
  .query(querySpec, {
    partitionKey: "tenant-abc", // scope to single partition for efficiency
    maxItemCount: 20,
  })
  .fetchAll();

console.log(`Found ${orders.length} orders (${requestCharge} RU)`);

// Stream large result sets with pagination
const queryIterator = container.items.query(querySpec, { maxItemCount: 100 });
let page = 0;
while (queryIterator.hasMoreResults()) {
  const { resources, requestCharge: pageRU } = await queryIterator.fetchNext();
  console.log(`Page ${++page}: ${resources.length} items (${pageRU} RU)`);
}

// Cross-partition query (expensive — avoid in hot paths)
const crossPartitionQuery: SqlQuerySpec = {
  query: "SELECT c.id, c.tenantId, c.amount FROM c WHERE c.amount > @minAmount",
  parameters: [{ name: "@minAmount", value: 1000 }],
};

const { resources: largeOrders } = await container.items
  .query(crossPartitionQuery) // no partitionKey = cross-partition
  .fetchAll();
```

### Transactions (Transactional Batch — same partition only)

```typescript
import { CosmosClient } from "@azure/cosmos";
import { DefaultAzureCredential } from "@azure/identity";

const container = new CosmosClient({
  endpoint: process.env.COSMOS_ENDPOINT!,
  aadCredentials: new DefaultAzureCredential(),
}).database("mydb").container("accounts");

// All items in the batch must share the same partition key
const partitionKey = "tenant-abc";
const batch = container.items.batch(partitionKey);

batch.create({ id: "acct-001", tenantId: "tenant-abc", balance: 1000, type: "savings" });
batch.replace("acct-002", { id: "acct-002", tenantId: "tenant-abc", balance: 500, type: "checking" });
batch.delete("acct-old");

const batchResponse = await batch.execute();
if (batchResponse.result?.some(r => r.statusCode >= 400)) {
  console.error("Batch failed:", batchResponse.result);
}
// Either all operations succeed or none do (ACID within partition)
```

### Change Feed — Event streaming pattern

```typescript
import { CosmosClient } from "@azure/cosmos";
import { DefaultAzureCredential } from "@azure/identity";

const container = new CosmosClient({
  endpoint: process.env.COSMOS_ENDPOINT!,
  aadCredentials: new DefaultAzureCredential(),
}).database("mydb").container("orders");

// Read change feed from a point in time
const changeFeedIterator = container.items.getChangeFeedIterator({
  changeFeedStartFrom: {
    type: "Time",
    time: new Date(Date.now() - 60 * 60 * 1000), // last 1 hour
  },
  maxItemCount: 100,
});

while (changeFeedIterator.hasMoreResults) {
  const { result: changes } = await changeFeedIterator.readNext();
  for (const change of changes ?? []) {
    console.log("Changed document:", change.id, change._ts);
    // Process change event (e.g., push to message queue, update read model)
  }
}
```

## Error Codes

| Code | Meaning | Remediation |
|---|---|---|
| 404 (NotFound) | Document or container does not exist | Check id and partition key value |
| 409 (Conflict) | Document with same ID already exists | Use `upsert` or check before insert |
| 412 (PreconditionFailed) | ETag mismatch (optimistic concurrency) | Re-read and retry with current ETag |
| 429 (TooManyRequests) | RU limit exceeded | Retry after `x-ms-retry-after-ms` header; consider scaling throughput |
| 400 (BadRequest) | Invalid query or document too large (2 MB) | Check query syntax; reduce document size |
| 413 (RequestEntityTooLarge) | Document exceeds 2 MB limit | Split large documents; store large blobs in Blob Storage |
| 403 (Forbidden) | Missing RBAC role | Assign Cosmos DB Built-in Data Contributor or custom data-plane role |
| 503 (ServiceUnavailable) | Transient service error | Retry with exponential backoff |

## Throttling Limits

| Resource | Limit | Retry Strategy |
|---|---|---|
| Max document size | 2 MB | Split documents; store large blobs externally |
| Max partition size | 20 GB logical | Use hierarchical partition key to distribute data |
| Max RU/s per container (manual) | 1,000,000 RU/s | Use autoscale; contact support for higher limits |
| Max RU/s per partition (physical) | 10,000 RU/s | Design partition keys to avoid hot partitions |
| Transactional batch size | 100 operations per batch | Split large batches; all items must share partition key |
| Change feed pages | 1 page per request | Use continuation token for streaming |

## Production Gotchas

- **Partition key is immutable and permanent**: Choose the partition key carefully before creating a container. Changing the partition key requires migrating all data to a new container. The partition key must be a string or numeric property present in every document.
- **Avoid hot partitions**: A partition becomes "hot" when too many RUs are consumed on one partition key value. Use a high-cardinality key (user ID, order ID, UUID) rather than low-cardinality keys (status, country). Hierarchical partition keys further distribute data.
- **Always include partition key in queries**: Cross-partition queries fan out to all physical partitions and cost significantly more RUs. Include the partition key in the `WHERE` clause or supply it as a query option to scope the query to a single partition.
- **RU cost varies by operation**: A point read (GET by ID + partition key) costs 1 RU per KB. A query with a filter costs more depending on index utilization. Use `requestCharge` from the response to profile query costs.
- **Disable full-text index for large fields**: The default indexing policy indexes all properties. For large string fields (e.g., raw HTML, JSON blobs, log messages), use `excludedPaths` to prevent them from being indexed. Unnecessary indexing wastes RUs and storage.
- **Autoscale pausing**: Autoscale containers scale down to 10% of the max RU/s during inactivity. After a quiet period, the first burst of requests may be throttled (429) until autoscale provisions additional RUs. This is expected; the SDK will retry automatically.
- **SDK retry behavior**: The Azure Cosmos SDK automatically retries 429 errors with the `x-ms-retry-after-ms` delay. Do not implement your own retry logic on top — double retries waste RUs. Set `maxRetryWaitTimeInSeconds` and `retryOptions` in the client config.
