# Azure Queue Storage, Table Storage, and Azure Files — Deep Reference

## Overview

This reference covers three Azure Storage services beyond Blob: Queue Storage for async messaging, Table Storage for NoSQL key-value data, and Azure Files for SMB/NFS shares. Each has distinct access patterns, throttling profiles, and SDK idioms.

---

## Queue Storage

### REST API Endpoints

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|---|---|---|---|---|
| PUT | `/queues/{queueName}` | Storage Queue Data Contributor | — | Create queue; idempotent |
| DELETE | `/queues/{queueName}` | Storage Queue Data Contributor | — | Deletes queue and all messages |
| GET | `/?comp=list` | Storage Queue Data Contributor | `prefix`, `maxresults`, `marker` | List all queues |
| POST | `/queues/{queue}/messages` | Storage Queue Data Message Sender | `visibilitytimeout`, `messagettl` | Enqueue message; body is XML `<QueueMessage>` |
| GET | `/queues/{queue}/messages` | Storage Queue Data Message Processor | `numofmessages` (1–32), `visibilitytimeout` | Dequeue and lock messages |
| GET | `/queues/{queue}/messages?peekonly=true` | Storage Queue Data Reader | `numofmessages` | Peek without locking |
| DELETE | `/queues/{queue}/messages/{messageId}` | Storage Queue Data Message Processor | `popreceipt` header required | Acknowledge/delete after processing |
| PUT | `/queues/{queue}/messages/{messageId}` | Storage Queue Data Message Processor | `popreceipt`, new `visibilitytimeout` | Extend visibility timeout (renew) |
| DELETE | `/queues/{queue}/messages` | Storage Queue Data Contributor | — | Clears all messages from queue |
| GET | `/queues/{queue}/metadata?comp=metadata` | Storage Queue Data Reader | — | Queue length in `x-ms-approximate-messages-count` |

Base URL: `https://{accountName}.queue.core.windows.net`

### TypeScript SDK — Queue Storage

```typescript
import { QueueServiceClient, QueueClient } from "@azure/storage-queue";
import { DefaultAzureCredential } from "@azure/identity";

const serviceClient = new QueueServiceClient(
  `https://${process.env.STORAGE_ACCOUNT}.queue.core.windows.net`,
  new DefaultAzureCredential()
);

// Create queue
const queueClient: QueueClient = serviceClient.getQueueClient("work-items");
await queueClient.createIfNotExists();

// Enqueue a message (must be a string; base64-encode binary data)
const message = JSON.stringify({ taskId: "abc-123", priority: "high" });
await queueClient.sendMessage(btoa(message), {
  messageTimeToLive: 86400, // 24 hours TTL
  visibilityTimeout: 0,     // visible immediately
});

// Dequeue and process (lock for 30 seconds)
const receiveResponse = await queueClient.receiveMessages({
  numberOfMessages: 5,
  visibilityTimeout: 30,
});

for (const msg of receiveResponse.receivedMessageItems) {
  const payload = JSON.parse(atob(msg.messageText));
  console.log("Processing:", payload.taskId);

  try {
    // process message...
    await queueClient.deleteMessage(msg.messageId, msg.popReceipt);
  } catch (err) {
    // Do NOT delete — message becomes visible again after timeout
    console.error("Processing failed, message will retry:", err);
  }
}
```

---

## Table Storage

### REST API Endpoints

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|---|---|---|---|---|
| POST | `/Tables` | Storage Table Data Contributor | JSON body with `TableName` | Create table |
| DELETE | `/Tables('{tableName}')` | Storage Table Data Contributor | — | Delete table and all entities |
| GET | `/Tables` | Storage Table Data Reader | `$filter`, `$top` | List all tables |
| POST | `/{tableName}` | Storage Table Data Contributor | JSON entity with `PartitionKey` and `RowKey` | Insert entity |
| PUT | `/{tableName}(PartitionKey='{pk}',RowKey='{rk}')` | Storage Table Data Contributor | `If-Match: *` or ETag | Upsert (replace) entity |
| MERGE | `/{tableName}(PartitionKey='{pk}',RowKey='{rk}')` | Storage Table Data Contributor | `If-Match: *` or ETag | Merge (update properties) |
| GET | `/{tableName}(PartitionKey='{pk}',RowKey='{rk}')` | Storage Table Data Reader | `$select` | Get single entity |
| GET | `/{tableName}()` | Storage Table Data Reader | `$filter`, `$top`, `$select` | Query entities |
| DELETE | `/{tableName}(PartitionKey='{pk}',RowKey='{rk}')` | Storage Table Data Contributor | `If-Match: *` or ETag | Delete entity |
| POST | `/$batch` | Storage Table Data Contributor | Multipart/mixed body | Batch up to 100 same-partition operations |

Base URL: `https://{accountName}.table.core.windows.net`

### TypeScript SDK — Table Storage

```typescript
import { TableClient, odata } from "@azure/data-tables";
import { DefaultAzureCredential } from "@azure/identity";

const tableClient = new TableClient(
  `https://${process.env.STORAGE_ACCOUNT}.table.core.windows.net`,
  "DeviceTelemetry",
  new DefaultAzureCredential()
);

// Create table if it doesn't exist
await tableClient.createTable();

// Upsert an entity
await tableClient.upsertEntity({
  partitionKey: "sensor-floor-1",
  rowKey: new Date().toISOString(),
  temperature: 22.5,
  humidity: 65,
  unit: "celsius",
});

// Query with OData filter
const filter = odata`PartitionKey eq ${"sensor-floor-1"} and temperature gt ${20}`;
const entities = tableClient.listEntities({
  queryOptions: { filter, select: ["rowKey", "temperature", "humidity"] },
});

for await (const entity of entities) {
  console.log(entity.rowKey, entity.temperature);
}

// Batch insert (up to 100 entities, same PartitionKey)
const batch = tableClient.createTransaction([
  ["upsert", { partitionKey: "p1", rowKey: "r1", value: 100 }],
  ["upsert", { partitionKey: "p1", rowKey: "r2", value: 200 }],
]);
await batch;
```

### Azure CLI — Table Storage

```bash
# Create table
az storage table create \
  --account-name mystorageaccount \
  --name DeviceTelemetry \
  --auth-mode login

# Insert entity
az storage entity insert \
  --account-name mystorageaccount \
  --table-name DeviceTelemetry \
  --entity PartitionKey=sensor-1 RowKey=2026-01-01 temperature=22.5 \
  --auth-mode login

# Query entities
az storage entity query \
  --account-name mystorageaccount \
  --table-name DeviceTelemetry \
  --filter "PartitionKey eq 'sensor-1' and temperature gt 20" \
  --auth-mode login
```

---

## Azure Files

### REST API Endpoints

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|---|---|---|---|---|
| PUT | `/shares/{share}?restype=share` | Storage File Data Privileged Contributor | `x-ms-share-quota` | Create file share with quota (GiB) |
| DELETE | `/shares/{share}?restype=share` | Storage File Data Privileged Contributor | `x-ms-delete-snapshots: include` | Delete share and contents |
| PUT | `/shares/{share}/{dir}?restype=directory` | Storage File Data Contributor | — | Create directory |
| PUT | `/shares/{share}/{dir}/{file}` | Storage File Data Contributor | `x-ms-type: file`, `x-ms-content-length` | Create file descriptor (empty) |
| PUT | `/shares/{share}/{dir}/{file}?comp=range` | Storage File Data Contributor | `Content-Range`, `x-ms-write: update` | Upload file content in ranges |
| GET | `/shares/{share}/{dir}/{file}` | Storage File Data Reader | `Range` | Download file or range |
| GET | `/shares/{share}?restype=share&comp=list` | Storage File Data Reader | `prefix`, `maxresults` | List files/directories |
| DELETE | `/shares/{share}/{dir}/{file}` | Storage File Data Contributor | — | Delete file |
| GET | `/shares/{share}?restype=share&comp=snapshot` | Storage File Data Privileged Contributor | — | Create share snapshot |

Base URL: `https://{accountName}.file.core.windows.net`

### TypeScript SDK — Azure Files

```typescript
import { ShareServiceClient, ShareClient } from "@azure/storage-file-share";
import { DefaultAzureCredential } from "@azure/identity";

const serviceClient = new ShareServiceClient(
  `https://${process.env.STORAGE_ACCOUNT}.file.core.windows.net`,
  new DefaultAzureCredential()
);

// Create share with 100 GiB quota
const shareClient: ShareClient = serviceClient.getShareClient("my-share");
await shareClient.createIfNotExists({ quota: 100 });

// Create a directory
const dirClient = shareClient.getDirectoryClient("logs/2026");
await dirClient.createIfNotExists();

// Upload a file
const fileClient = dirClient.getFileClient("app.log");
const content = "2026-01-01T00:00:00Z INFO Application started\n";
await fileClient.create(content.length);
await fileClient.uploadRange(content, 0, content.length);

// List files and directories
for await (const item of dirClient.listFilesAndDirectories()) {
  console.log(item.kind, item.name);
}

// Download a file
const downloadResponse = await fileClient.download(0);
const text = await streamToString(downloadResponse.readableStreamBody!);
console.log(text);
```

### Mount Azure Files on Linux

```bash
# Install dependencies
sudo apt-get install cifs-utils

# Mount via SMB (requires storage account key or identity with Kerberos)
sudo mount -t cifs \
  //mystorageaccount.file.core.windows.net/my-share \
  /mnt/myshare \
  -o vers=3.0,username=mystorageaccount,password=<storage-account-key>,dir_mode=0777,file_mode=0777,serverino

# Persistent mount in /etc/fstab:
# //mystorageaccount.file.core.windows.net/my-share /mnt/share cifs vers=3.0,...,_netdev 0 0
```

## Error Codes — All Services

| Code | Service | Meaning | Remediation |
|---|---|---|---|
| QueueNotFound (404) | Queue | Queue does not exist | Create queue first with `createIfNotExists` |
| MessageTooLarge (413) | Queue | Message > 64 KB | Encode payload reference (store large data in Blob, enqueue blob URL) |
| InvalidInput (400) | Queue | Message TTL < -1 or > 7 days | Set `messageTimeToLive` between 1 second and 604800 seconds |
| PopReceiptMismatch (400) | Queue | stale `popReceipt` after visibility renew | Re-receive to get fresh popReceipt |
| TableNotFound (404) | Table | Table does not exist | Call `createTable` before inserting entities |
| EntityAlreadyExists (409) | Table | Duplicate PartitionKey + RowKey | Use `upsertEntity` (merge) instead of insert |
| EntityTooLarge (400) | Table | Entity property total > 1 MiB | Move large properties to Blob Storage |
| OperationTimedOut (408) | Table | Batch cross-partition | Ensure all entities in batch share the same PartitionKey |
| ShareNotFound (404) | Files | Share does not exist | Create share first |
| ParentNotFound (404) | Files | Parent directory missing | Create all parent directories recursively |
| ShareQuotaExceeded (403) | Files | Write exceeds share quota | Increase quota or delete old files |
| AuthorizationFailure (403) | All | Token missing RBAC role | Assign appropriate Storage data-plane role |

## Throttling Limits

| Resource | Limit | Retry Strategy |
|---|---|---|
| Queue messages per GET | 32 messages per receive call | Always receive in batches of 32 |
| Queue message TTL | 7 days maximum | Use dead-letter patterns with separate DLQ queue |
| Table entity size | 1 MiB | Offload large properties to Blob |
| Table batch operations | 100 entities, same PartitionKey | Split into multiple batches for cross-partition bulk writes |
| Table query results page | 1,000 entities or 5 seconds | Use continuation tokens in list/query responses |
| Azure Files share throughput | 300 MiB/s (Premium), 60 MiB/s (Standard) | Use Premium tier for latency-sensitive workloads |
| Azure Files IOPS | 100,000 IOPS (Premium) | Scale share size to increase IOPS with Premium Files |
| Azure Files max share size | 100 TiB (Standard), 100 TiB (Premium) | Enable large file shares on Standard accounts |
| Azure Files snapshots | 200 per share | Automate snapshot management with lifecycle policies |

## Production Gotchas

- **Queue message visibility timeout**: The default visibility timeout is 30 seconds. For slow processing tasks, call `updateMessage` to extend the timeout before it expires — otherwise the message becomes visible again and another consumer picks it up.
- **Queue poison messages**: Messages that fail processing repeatedly cause loops. Implement a dequeue count check (`msg.dequeueCount`) and move messages to a dead-letter queue after N failures.
- **Table PartitionKey design**: Queries without a PartitionKey filter scan all partitions (table scan) and are slow. Design PartitionKey so that most queries filter on it. Common patterns: tenantId, date bucket, or entity type.
- **Table continuation tokens**: Queries return up to 1,000 entities per call. Always handle continuation tokens for large datasets.
- **Table OData filter injection**: When building dynamic OData filters, use the `odata` tagged template literal from `@azure/data-tables` to safely interpolate values and avoid injection vulnerabilities.
- **Azure Files NFS vs SMB**: NFS 4.1 requires a storage account with hierarchical namespace disabled and a Premium tier account in a VNet. SMB 3.0 with Kerberos (identity-based auth) is preferred for Active Directory-joined machines.
- **Azure Files identity auth**: Kerberos authentication with Active Directory or Azure AD Kerberos requires the storage account to be joined to the domain. This is required for per-user permission enforcement beyond storage account key access.
- **Large file share flag**: Standard tier shares are limited to 5 TiB by default. Enable the large file share feature flag on the storage account to expand to 100 TiB. This cannot be undone if you later want to use GRS/GZRS replication.
