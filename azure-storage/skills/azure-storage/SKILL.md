---
name: Azure Storage
description: >
  Deep expertise in Azure Storage services — manage Blob containers with block/append/page blobs,
  Queue Storage for asynchronous messaging, Table Storage for NoSQL key-value data, and Azure Files
  for SMB/NFS shares. Covers storage account provisioning, SAS token generation, managed identity
  access with RBAC, lifecycle management policies, static website hosting, Data Lake Storage Gen2
  with hierarchical namespaces, and monitoring with Azure Monitor. Targets professional developers
  and cloud architects building production storage solutions.
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
triggers:
  - azure storage
  - blob storage
  - azure blob
  - storage account
  - azure queue
  - azure table
  - azure files
  - sas token
  - storage lifecycle
  - data lake
  - adls
  - blob container
  - storage firewall
---

# Azure Storage

## 1. Azure Storage Overview

Azure Storage provides massively scalable, durable, and highly available cloud storage for unstructured, semi-structured, and structured data.

**Storage services**:
| Service | Data Type | Access Protocol | Use Case |
|---------|-----------|----------------|----------|
| Blob Storage | Unstructured (files, images, video, backups) | REST, SDKs, AzCopy, Storage Explorer | Media hosting, backups, data lake |
| Queue Storage | Messages (up to 64 KB each) | REST, SDKs | Asynchronous task dispatching |
| Table Storage | Semi-structured key-value (NoSQL) | REST, SDKs, OData | Logging, IoT telemetry, user profiles |
| Azure Files | Files (SMB/NFS shares) | SMB 3.x, NFS 4.1, REST | Lift-and-shift, shared config, home directories |

**Storage account types**:
| Type | Services | Performance | Use Case |
|------|----------|-------------|----------|
| General-purpose v2 (GPv2) | Blob, Queue, Table, Files | Standard (HDD) | Default for most workloads |
| Premium Block Blob | Blob (block blobs only) | Premium (SSD) | Low-latency blob access, IoT, analytics |
| Premium File Shares | Files only | Premium (SSD) | High-IOPS file workloads |
| Premium Page Blobs | Blob (page blobs only) | Premium (SSD) | VM disks, databases |

**Redundancy options**:
| Option | Copies | Durability | Scope |
|--------|--------|-----------|-------|
| LRS (Locally Redundant) | 3 | 99.999999999% (11 nines) | Single datacenter |
| ZRS (Zone Redundant) | 3 | 99.9999999999% (12 nines) | 3 availability zones |
| GRS (Geo-Redundant) | 6 | 99.99999999999999% (16 nines) | Primary + secondary region |
| GZRS (Geo-Zone Redundant) | 6 | 99.99999999999999% (16 nines) | 3 zones + secondary region |
| RA-GRS / RA-GZRS | 6 | Same as GRS/GZRS | Read access to secondary region |

**Access tiers** (Blob Storage):
| Tier | Access Frequency | Min Retention | Storage Cost | Access Cost |
|------|-----------------|---------------|--------------|-------------|
| Hot | Frequent | None | Highest | Lowest |
| Cool | Infrequent (30+ days) | 30 days | Lower | Higher |
| Cold | Rare (90+ days) | 90 days | Lower still | Higher still |
| Archive | Long-term (180+ days) | 180 days | Lowest | Highest (rehydration required) |

## 2. Storage Account Provisioning

### Azure CLI

```bash
# Create a General-purpose v2 storage account
az storage account create \
  --name contosostorage2024 \
  --resource-group rg-contoso \
  --location eastus \
  --sku Standard_ZRS \
  --kind StorageV2 \
  --min-tls-version TLS1_2 \
  --allow-blob-public-access false \
  --https-only true \
  --default-action Deny

# Create with hierarchical namespace (ADLS Gen2)
az storage account create \
  --name contosodatalake2024 \
  --resource-group rg-contoso \
  --location eastus \
  --sku Standard_ZRS \
  --kind StorageV2 \
  --enable-hierarchical-namespace true \
  --min-tls-version TLS1_2 \
  --allow-blob-public-access false \
  --https-only true
```

### Bicep Template

```bicep
param storageAccountName string
param location string = resourceGroup().location
param sku string = 'Standard_ZRS'

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageAccountName
  location: location
  kind: 'StorageV2'
  sku: {
    name: sku
  }
  properties: {
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
    allowBlobPublicAccess: false
    allowSharedKeyAccess: false  // Enforce RBAC only
    networkAcls: {
      defaultAction: 'Deny'
      bypass: 'AzureServices'
      ipRules: []
      virtualNetworkRules: []
    }
    encryption: {
      services: {
        blob: { enabled: true, keyType: 'Account' }
        file: { enabled: true, keyType: 'Account' }
        queue: { enabled: true, keyType: 'Account' }
        table: { enabled: true, keyType: 'Account' }
      }
      keySource: 'Microsoft.Storage'
    }
  }
}

resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-05-01' = {
  parent: storageAccount
  name: 'default'
  properties: {
    deleteRetentionPolicy: {
      enabled: true
      days: 30
    }
    containerDeleteRetentionPolicy: {
      enabled: true
      days: 30
    }
    isVersioningEnabled: true
    changeFeed: {
      enabled: true
    }
  }
}

output storageAccountId string = storageAccount.id
output blobEndpoint string = storageAccount.properties.primaryEndpoints.blob
output queueEndpoint string = storageAccount.properties.primaryEndpoints.queue
output tableEndpoint string = storageAccount.properties.primaryEndpoints.table
output fileEndpoint string = storageAccount.properties.primaryEndpoints.file
```

### Network Rules

```bash
# Deny all public access by default
az storage account update \
  --name contosostorage2024 \
  --resource-group rg-contoso \
  --default-action Deny

# Allow a VNet subnet
az storage account network-rule add \
  --account-name contosostorage2024 \
  --resource-group rg-contoso \
  --vnet-name vnet-contoso \
  --subnet subnet-apps

# Allow trusted Azure services
az storage account update \
  --name contosostorage2024 \
  --resource-group rg-contoso \
  --bypass AzureServices

# Create a private endpoint
az network private-endpoint create \
  --name pe-contosostorage-blob \
  --resource-group rg-contoso \
  --vnet-name vnet-contoso \
  --subnet subnet-private-endpoints \
  --private-connection-resource-id $(az storage account show --name contosostorage2024 --resource-group rg-contoso --query id -o tsv) \
  --group-ids blob \
  --connection-name pec-contosostorage-blob
```

## 3. Blob Storage

Azure Blob Storage is optimized for storing massive amounts of unstructured data.

### Blob Types

| Type | Max Size | Use Case | Write Pattern |
|------|----------|----------|--------------|
| Block blob | 190.7 TiB (50,000 blocks x 4000 MiB) | Files, images, video, backups | Upload in blocks, commit |
| Append blob | 195 GiB (50,000 blocks x 4 MiB) | Log files, audit trails | Append-only writes |
| Page blob | 8 TiB | VM disks, databases | Random read/write at page (512 B) offsets |

### Container Operations

```typescript
import { BlobServiceClient, ContainerClient } from "@azure/storage-blob";
import { DefaultAzureCredential } from "@azure/identity";

const blobService = new BlobServiceClient(
  `https://${accountName}.blob.core.windows.net`,
  new DefaultAzureCredential()
);

// Create a container
const containerClient = blobService.getContainerClient("documents");
await containerClient.create();

// List containers
for await (const container of blobService.listContainers()) {
  console.log(`Container: ${container.name}, Last Modified: ${container.properties.lastModified}`);
}

// Delete a container
await containerClient.delete();
```

### Upload and Download

```typescript
const containerClient = blobService.getContainerClient("documents");
const blockBlobClient = containerClient.getBlockBlobClient("reports/q4-2024.pdf");

// Upload from file
await blockBlobClient.uploadFile("./local/q4-2024.pdf", {
  blobHTTPHeaders: { blobContentType: "application/pdf" },
  metadata: { department: "finance", quarter: "Q4" },
  tags: { category: "reports", year: "2024" },
  tier: "Cool",  // Set access tier on upload
});

// Upload from stream (large files)
import { createReadStream } from "fs";
const stream = createReadStream("./local/large-dataset.csv");
const fileSize = (await stat("./local/large-dataset.csv")).size;
await blockBlobClient.uploadStream(stream, fileSize, 4 * 1024 * 1024, {
  maxSingleShotSize: 256 * 1024 * 1024,  // 256 MB threshold for single PUT
  concurrency: 4,  // Parallel block uploads
});

// Upload from buffer
const data = Buffer.from("Hello, Azure Storage!");
await blockBlobClient.upload(data, data.length);

// Download to file
const downloadResponse = await blockBlobClient.downloadToFile("./local/downloaded.pdf");

// Download to buffer
const buffer = await blockBlobClient.downloadToBuffer();

// Download specific range
const rangeResponse = await blockBlobClient.download(0, 1024); // First 1 KB
```

### Blob Index Tags

Blob index tags enable key-value indexing for filtering blobs across containers.

```typescript
// Set tags on upload or existing blob
await blockBlobClient.setTags({
  project: "contoso-web",
  status: "processed",
  uploadDate: "2024-11-15",
});

// Find blobs by tag filter (works across containers!)
for await (const blob of blobService.findBlobsByTags(
  `"project" = 'contoso-web' AND "status" = 'processed'`
)) {
  console.log(`${blob.containerName}/${blob.name} — tags: ${JSON.stringify(blob.tags)}`);
}
```

### Versioning and Soft Delete

```bash
# Enable blob versioning
az storage account blob-service-properties update \
  --account-name contosostorage2024 \
  --resource-group rg-contoso \
  --enable-versioning true

# Enable blob soft delete (30 days)
az storage account blob-service-properties update \
  --account-name contosostorage2024 \
  --resource-group rg-contoso \
  --enable-delete-retention true \
  --delete-retention-days 30

# Enable container soft delete (30 days)
az storage account blob-service-properties update \
  --account-name contosostorage2024 \
  --resource-group rg-contoso \
  --enable-container-delete-retention true \
  --container-delete-retention-days 30
```

```typescript
// List blob versions
for await (const blob of containerClient.listBlobsFlat({ includeVersions: true })) {
  console.log(`${blob.name} | Version: ${blob.versionId} | Current: ${blob.isCurrentVersion}`);
}

// Create a snapshot
const snapshotResponse = await blockBlobClient.createSnapshot();
console.log(`Snapshot created: ${snapshotResponse.snapshot}`);
```

### Blob Lease

Leases provide exclusive write/delete access to a blob or container.

```typescript
const leaseClient = blockBlobClient.getBlobLeaseClient();

// Acquire a 30-second lease
const lease = await leaseClient.acquireLease(30);
console.log(`Lease ID: ${lease.leaseId}`);

// Renew the lease
await leaseClient.renewLease();

// Release the lease
await leaseClient.releaseLease();
```

## 4. Queue Storage

Azure Queue Storage provides reliable messaging between application components.

**Limits**:
- Max message size: 64 KB (base64 encoding reduces effective size to ~48 KB)
- Max TTL: 7 days (or -1 for infinite)
- Max messages in a queue: Unlimited (up to storage account capacity)
- Max visibility timeout: 7 days
- Max dequeue count: Unlimited

### Queue Operations

```typescript
import { QueueServiceClient, QueueClient } from "@azure/storage-queue";
import { DefaultAzureCredential } from "@azure/identity";

const queueService = new QueueServiceClient(
  `https://${accountName}.queue.core.windows.net`,
  new DefaultAzureCredential()
);

// Create a queue
const queueClient = queueService.getQueueClient("work-items");
await queueClient.create();

// List queues
for await (const queue of queueService.listQueues()) {
  console.log(`Queue: ${queue.name}`);
}
```

### Message Operations

```typescript
// Send a message
await queueClient.sendMessage("Process order #12345");

// Send JSON payload
const payload = { orderId: 12345, action: "ship", priority: "high" };
await queueClient.sendMessage(Buffer.from(JSON.stringify(payload)).toString("base64"));

// Send with delayed visibility (visible after 60s)
await queueClient.sendMessage("Delayed task", {
  visibilityTimeout: 60,
  messageTimeToLive: 3600,  // 1 hour TTL
});

// Receive messages (makes them invisible to other consumers)
const response = await queueClient.receiveMessages({
  numberOfMessages: 5,
  visibilityTimeout: 30,
});

for (const msg of response.receivedMessageItems) {
  const body = Buffer.from(msg.messageText, "base64").toString();
  console.log(`Processing: ${body} (attempt ${msg.dequeueCount})`);

  // Process the message...
  await processWorkItem(JSON.parse(body));

  // Delete after successful processing
  await queueClient.deleteMessage(msg.messageId, msg.popReceipt);
}

// Peek messages (read without hiding)
const peeked = await queueClient.peekMessages({ numberOfMessages: 5 });

// Update a message (change content or extend visibility)
await queueClient.updateMessage(
  messageId,
  popReceipt,
  "Updated content",
  60  // New visibility timeout
);

// Clear all messages from a queue
await queueClient.clearMessages();

// Get approximate message count
const properties = await queueClient.getProperties();
console.log(`Approximate count: ${properties.approximateMessagesCount}`);
```

### Queue Storage vs Service Bus

| Feature | Queue Storage | Service Bus |
|---------|--------------|-------------|
| Max message size | 64 KB | 256 KB (Standard) / 100 MB (Premium) |
| Max queue size | Up to storage account limit | 1-80 GB |
| Ordering | FIFO (best effort) | FIFO (guaranteed with sessions) |
| Duplicate detection | No | Yes |
| Dead-letter queue | Manual (poison queue) | Built-in |
| Topics / subscriptions | No | Yes |
| Transactions | No | Yes |
| Sessions | No | Yes |
| Pricing | Very low (per transaction) | Higher (per message + unit) |

**When to choose Queue Storage**: Simple, high-volume message passing; cost-sensitive; no ordering guarantees needed.

**When to choose Service Bus**: Complex routing (topics), guaranteed FIFO, transactions, dead-letter, large messages.

## 5. Table Storage

Azure Table Storage is a NoSQL key-value store for semi-structured data at petabyte scale.

**Design principles**:
- **Partition key**: Groups related entities for efficient queries. Queries filtering on partition key are fast (single partition scan).
- **Row key**: Uniquely identifies an entity within a partition. Combined with partition key, forms the primary key.
- **Hot partition avoidance**: Distribute writes across partitions to avoid throttling. Avoid monotonically increasing keys (timestamps) as partition keys.

### Table Operations

```typescript
import { TableServiceClient, TableClient, odata } from "@azure/data-tables";
import { DefaultAzureCredential } from "@azure/identity";

const tableService = new TableServiceClient(
  `https://${accountName}.table.core.windows.net`,
  new DefaultAzureCredential()
);

// Create a table
const tableClient = tableService.getTableClient("Customers");
await tableService.createTable("Customers");

// Or use TableClient directly
const client = TableClient.fromNamedKeyCredential(
  `https://${accountName}.table.core.windows.net`,
  "Customers",
  new DefaultAzureCredential()
);
```

### Entity Operations

```typescript
const tableClient = new TableClient(
  `https://${accountName}.table.core.windows.net`,
  "Customers",
  new DefaultAzureCredential()
);

// Insert an entity
await tableClient.createEntity({
  partitionKey: "US-West",
  rowKey: "CUST-001",
  name: "Contoso Ltd",
  email: "contact@contoso.com",
  revenue: 1500000,
  isActive: true,
  createdAt: new Date(),
});

// Get a single entity
const entity = await tableClient.getEntity("US-West", "CUST-001");
console.log(`${entity.name} — ${entity.email}`);

// Update an entity (merge -- only updates specified properties)
await tableClient.updateEntity(
  { partitionKey: "US-West", rowKey: "CUST-001", revenue: 1750000 },
  "Merge"
);

// Replace an entity (full replace)
await tableClient.updateEntity(
  {
    partitionKey: "US-West",
    rowKey: "CUST-001",
    name: "Contoso Corporation",
    email: "info@contoso.com",
    revenue: 1750000,
    isActive: true,
  },
  "Replace"
);

// Upsert an entity (insert or replace)
await tableClient.upsertEntity(
  { partitionKey: "US-West", rowKey: "CUST-002", name: "Fabrikam Inc", email: "hello@fabrikam.com" },
  "Merge"
);

// Delete an entity
await tableClient.deleteEntity("US-West", "CUST-001");
```

### Query Entities

```typescript
// Query by partition key (fast -- single partition scan)
const entities = tableClient.listEntities({
  queryOptions: { filter: odata`PartitionKey eq 'US-West'` },
});
for await (const entity of entities) {
  console.log(`${entity.rowKey}: ${entity.name}`);
}

// Query with multiple filters
const filtered = tableClient.listEntities({
  queryOptions: {
    filter: odata`PartitionKey eq 'US-West' and revenue gt 1000000 and isActive eq true`,
    select: ["rowKey", "name", "revenue"],
  },
});

// Cross-partition query (slower -- full table scan)
const allActive = tableClient.listEntities({
  queryOptions: { filter: odata`isActive eq true` },
});

// Top N results
const topCustomers = tableClient.listEntities({
  queryOptions: {
    filter: odata`PartitionKey eq 'US-West'`,
  },
});
// Use iterator to get first N
let count = 0;
for await (const entity of topCustomers) {
  if (++count > 10) break;
  console.log(entity.name);
}
```

### Batch Operations

```typescript
// Batch operations (up to 100 entities, same partition key)
const actions: TransactionAction[] = [
  ["create", { partitionKey: "US-West", rowKey: "CUST-010", name: "Acme Corp" }],
  ["create", { partitionKey: "US-West", rowKey: "CUST-011", name: "Globex Inc" }],
  ["update", { partitionKey: "US-West", rowKey: "CUST-001", revenue: 2000000 }, "Merge"],
  ["delete", { partitionKey: "US-West", rowKey: "CUST-005" }],
];
await tableClient.submitTransaction(actions);
```

### Partition Key Design Patterns

| Pattern | Partition Key | Row Key | Example |
|---------|--------------|---------|---------|
| Region/tenant | Region or tenant ID | Entity ID | `US-West` / `CUST-001` |
| Time-bucketed | Date bucket (YYYYMM) | Timestamp + ID | `202411` / `20241115T103000-EVT001` |
| Reversed timestamp | Constant or category | Reversed tick count | `logs` / `(MaxTicks - Ticks)-ID` |
| Composite | Category | Sub-category + ID | `Orders-2024` / `Shipped-ORD123` |

## 6. Azure Files

Azure Files provides fully managed file shares accessible via SMB and NFS protocols.

**Tier comparison**:
| Feature | Standard (GPv2) | Premium |
|---------|----------------|---------|
| Media | HDD | SSD |
| Max share size | 100 TiB | 100 TiB |
| Max IOPS | 20,000 (per share) | 100,000 (per share) |
| Throughput | Up to 300 MiB/s | Up to 10 GiB/s |
| Protocol | SMB 3.x, NFS 4.1 | SMB 3.x, NFS 4.1 |
| Redundancy | LRS, ZRS, GRS, GZRS | LRS, ZRS |

### Share Operations

```bash
# Create a file share
az storage share-rm create \
  --storage-account <storage-name> \
  --resource-group <rg-name> \
  --name documents \
  --quota 1024 \
  --enabled-protocols SMB \
  --access-tier Hot

# List shares
az storage share-rm list \
  --storage-account <storage-name> \
  --resource-group <rg-name> \
  --output table

# Upload a file
az storage file upload \
  --account-name <storage-name> \
  --share-name documents \
  --source ./local-file.pdf \
  --path "reports/q4-report.pdf" \
  --auth-mode login

# Download a file
az storage file download \
  --account-name <storage-name> \
  --share-name documents \
  --path "reports/q4-report.pdf" \
  --dest ./downloaded.pdf \
  --auth-mode login
```

### Mount SMB Share

**Windows**:
```powershell
# Mount as network drive
$connectTestResult = Test-NetConnection -ComputerName <storage-name>.file.core.windows.net -Port 445
if ($connectTestResult.TcpTestSucceeded) {
    net use Z: \\<storage-name>.file.core.windows.net\documents /user:Azure\<storage-name> <storage-key>
}
```

**Linux**:
```bash
sudo mkdir -p /mnt/documents
sudo mount -t cifs //<storage-name>.file.core.windows.net/documents /mnt/documents \
  -o vers=3.0,username=<storage-name>,password=<storage-key>,dir_mode=0777,file_mode=0777,serverino
```

### Azure File Sync

Azure File Sync enables centralizing file shares in Azure Files while maintaining local access performance.

```bash
# Register a server with the Storage Sync Service
az storagesync registered-server create \
  --resource-group <rg-name> \
  --storage-sync-service <sync-service-name> \
  --server-id <server-id>

# Create a sync group
az storagesync sync-group create \
  --resource-group <rg-name> \
  --storage-sync-service <sync-service-name> \
  --name <sync-group-name>

# Add cloud endpoint (Azure file share)
az storagesync sync-group cloud-endpoint create \
  --resource-group <rg-name> \
  --storage-sync-service <sync-service-name> \
  --sync-group-name <sync-group-name> \
  --name <endpoint-name> \
  --storage-account <storage-name> \
  --azure-file-share-name documents
```

### Snapshots

```bash
# Create a share snapshot
az storage share snapshot \
  --account-name <storage-name> \
  --name documents

# List snapshots
az storage share list \
  --account-name <storage-name> \
  --include-snapshots \
  --output table
```

## 7. Security & Access Control

### SAS Token Types

| Type | Signed With | Scope | Best For |
|------|------------|-------|----------|
| Account SAS | Account key | All services (blob, queue, table, file) | Broad delegated access |
| Service SAS | Account key | Single service (container, queue, table, share) | Scoped delegated access |
| User Delegation SAS | Azure AD credentials | Blob / Data Lake only | Most secure delegated access |

**Always prefer User Delegation SAS** -- it uses Azure AD instead of account keys and can be revoked by revoking the delegation key.

### User Delegation SAS

```typescript
import {
  BlobServiceClient,
  BlobSASPermissions,
  generateBlobSASQueryParameters,
  SASProtocol,
} from "@azure/storage-blob";
import { DefaultAzureCredential } from "@azure/identity";

const blobService = new BlobServiceClient(
  `https://${accountName}.blob.core.windows.net`,
  new DefaultAzureCredential()
);

const startsOn = new Date();
const expiresOn = new Date(startsOn.getTime() + 60 * 60 * 1000); // 1 hour

// Get user delegation key
const delegationKey = await blobService.getUserDelegationKey(startsOn, expiresOn);

// Generate SAS for a blob
const sasParams = generateBlobSASQueryParameters(
  {
    containerName: "documents",
    blobName: "reports/q4-2024.pdf",
    permissions: BlobSASPermissions.parse("r"),
    startsOn,
    expiresOn,
    protocol: SASProtocol.Https,
  },
  delegationKey,
  accountName
);

const sasUrl = `${blobService.getContainerClient("documents").getBlobClient("reports/q4-2024.pdf").url}?${sasParams}`;
```

### Stored Access Policies

Stored access policies define reusable permission sets that can be revoked server-side.

```bash
# Create a stored access policy on a container
az storage container policy create \
  --account-name <storage-name> \
  --container-name documents \
  --name read-only-policy \
  --permissions r \
  --expiry 2025-12-31T00:00:00Z \
  --auth-mode login

# Generate a service SAS using the stored policy
az storage blob generate-sas \
  --account-name <storage-name> \
  --container-name documents \
  --name "reports/q4-2024.pdf" \
  --policy-name read-only-policy \
  --auth-mode login

# Revoke access by deleting or modifying the policy
az storage container policy delete \
  --account-name <storage-name> \
  --container-name documents \
  --name read-only-policy \
  --auth-mode login
```

### RBAC Roles

| Role | Scope | Permissions |
|------|-------|------------|
| Storage Blob Data Owner | Blob | Full access including ACLs |
| Storage Blob Data Contributor | Blob | Read, write, delete blobs |
| Storage Blob Data Reader | Blob | Read blobs only |
| Storage Blob Delegator | Account | Generate user delegation keys |
| Storage Queue Data Contributor | Queue | Send, receive, delete messages |
| Storage Queue Data Reader | Queue | Read and peek messages |
| Storage Queue Data Message Processor | Queue | Peek, receive, delete messages |
| Storage Queue Data Message Sender | Queue | Send messages only |
| Storage Table Data Contributor | Table | Read, write, delete entities |
| Storage Table Data Reader | Table | Read entities only |
| Storage File Data SMB Share Contributor | Files | Read, write, delete in SMB shares |
| Storage File Data SMB Share Reader | Files | Read access to SMB shares |
| Storage File Data SMB Share Elevated Contributor | Files | Read, write, delete, modify ACLs |

```bash
# Assign role
az role assignment create \
  --assignee <principal-id> \
  --role "Storage Blob Data Contributor" \
  --scope "/subscriptions/<sub>/resourceGroups/<rg>/providers/Microsoft.Storage/storageAccounts/<account>"

# Disable shared key access (enforce RBAC only)
az storage account update \
  --name <storage-name> \
  --resource-group <rg-name> \
  --allow-shared-key-access false
```

### Private Endpoints

```bash
# Create a private endpoint for blob service
az network private-endpoint create \
  --name pe-storage-blob \
  --resource-group <rg-name> \
  --vnet-name <vnet-name> \
  --subnet <pe-subnet> \
  --private-connection-resource-id <storage-account-resource-id> \
  --group-ids blob \
  --connection-name pec-storage-blob

# Create private DNS zone
az network private-dns zone create \
  --resource-group <rg-name> \
  --name "privatelink.blob.core.windows.net"

# Link DNS zone to VNet
az network private-dns zone link create \
  --resource-group <rg-name> \
  --zone-name "privatelink.blob.core.windows.net" \
  --name link-vnet \
  --virtual-network <vnet-name> \
  --registration-enabled false
```

### Encryption

- **SSE (Storage Service Encryption)**: All data encrypted at rest by default with Microsoft-managed keys (256-bit AES).
- **CMK (Customer-Managed Keys)**: Use Azure Key Vault to manage encryption keys.
- **Infrastructure encryption**: Double encryption (service-level + infrastructure-level).
- **Client-side encryption**: Encrypt data before uploading using the SDK.

```bash
# Enable CMK encryption
az storage account update \
  --name <storage-name> \
  --resource-group <rg-name> \
  --encryption-key-source Microsoft.Keyvault \
  --encryption-key-vault <keyvault-uri> \
  --encryption-key-name <key-name> \
  --encryption-key-version <key-version>

# Enable infrastructure encryption (double encryption)
az storage account create \
  --name <storage-name> \
  --resource-group <rg-name> \
  --location eastus \
  --sku Standard_ZRS \
  --kind StorageV2 \
  --require-infrastructure-encryption true
```

## 8. Lifecycle Management

Lifecycle management policies automate tiering and deletion of blobs to optimize costs.

### Policy Structure

```json
{
  "rules": [
    {
      "enabled": true,
      "name": "rule-name",
      "type": "Lifecycle",
      "definition": {
        "actions": {
          "baseBlob": {
            "tierToCool": { "daysAfterModificationGreaterThan": 30 },
            "tierToCold": { "daysAfterModificationGreaterThan": 90 },
            "tierToArchive": { "daysAfterModificationGreaterThan": 180 },
            "delete": { "daysAfterModificationGreaterThan": 365 },
            "enableAutoTierToHotFromCool": true
          },
          "snapshot": {
            "tierToCool": { "daysAfterCreationGreaterThan": 30 },
            "delete": { "daysAfterCreationGreaterThan": 90 }
          },
          "version": {
            "tierToCool": { "daysAfterCreationGreaterThan": 30 },
            "delete": { "daysAfterCreationGreaterThan": 90 }
          }
        },
        "filters": {
          "blobTypes": ["blockBlob"],
          "prefixMatch": ["logs/", "backups/"],
          "blobIndexMatch": [
            { "name": "status", "op": "==", "value": "archived" }
          ]
        }
      }
    }
  ]
}
```

### Lifecycle Triggers

| Trigger | Description |
|---------|-------------|
| `daysAfterModificationGreaterThan` | Days since blob was last modified |
| `daysAfterCreationGreaterThan` | Days since blob/snapshot/version was created |
| `daysAfterLastAccessTimeGreaterThan` | Days since last read (requires access tracking) |
| `daysAfterLastTierChangeGreaterThan` | Days since tier was last changed |

```bash
# Enable last access time tracking (required for access-based tiering)
az storage account blob-service-properties update \
  --account-name <storage-name> \
  --resource-group <rg-name> \
  --enable-last-access-tracking true

# Apply lifecycle policy
az storage account management-policy create \
  --account-name <storage-name> \
  --resource-group <rg-name> \
  --policy @lifecycle-policy.json
```

### Immutability Policies

| Type | Description | Reversible? |
|------|-------------|------------|
| Time-based retention (Unlocked) | Prevents deletion for N days | Can extend or delete policy |
| Time-based retention (Locked) | Prevents deletion for N days | IRREVERSIBLE -- cannot reduce period |
| Legal hold | Prevents deletion until tags removed | Yes -- remove tags |

```bash
# Set container-level immutability (365 days)
az storage container immutability-policy create \
  --account-name <storage-name> \
  --container-name compliance-docs \
  --period 365

# Set legal hold
az storage container legal-hold set \
  --account-name <storage-name> \
  --container-name compliance-docs \
  --tags "audit-2024" "sec-investigation"
```

### Blob Inventory

Blob inventory reports provide a complete list of blobs and their metadata.

```bash
# Create an inventory policy
az storage account blob-inventory-policy create \
  --account-name <storage-name> \
  --resource-group <rg-name> \
  --policy @inventory-policy.json
```

## 9. Static Website Hosting

Azure Blob Storage can serve static websites directly from a `$web` container.

### Enable Static Website

```bash
az storage blob service-properties update \
  --account-name <storage-name> \
  --static-website true \
  --index-document index.html \
  --404-document 404.html
```

**Static website endpoint**: `https://<account>.z13.web.core.windows.net`

### Deploy Content

```bash
az storage blob upload-batch \
  --account-name <storage-name> \
  --destination '$web' \
  --source ./dist \
  --overwrite true \
  --auth-mode login
```

### Custom Domain + CDN

```bash
# Create CDN profile and endpoint
az cdn profile create --name cdn-profile --resource-group <rg-name> --sku Standard_Microsoft
az cdn endpoint create \
  --name cdn-endpoint \
  --resource-group <rg-name> \
  --profile-name cdn-profile \
  --origin <account>.z13.web.core.windows.net \
  --origin-host-header <account>.z13.web.core.windows.net \
  --enable-compression true

# Add custom domain
az cdn custom-domain create \
  --name www-contoso \
  --resource-group <rg-name> \
  --profile-name cdn-profile \
  --endpoint-name cdn-endpoint \
  --hostname www.contoso.com

# Enable HTTPS
az cdn custom-domain enable-https \
  --name www-contoso \
  --resource-group <rg-name> \
  --profile-name cdn-profile \
  --endpoint-name cdn-endpoint
```

### SPA Routing

For single-page applications (React, Angular, Vue), set both index and error documents to `index.html` so that client-side routing works:

```bash
az storage blob service-properties update \
  --account-name <storage-name> \
  --static-website true \
  --index-document index.html \
  --404-document index.html
```

## 10. Data Lake Storage Gen2

Azure Data Lake Storage Gen2 (ADLS Gen2) extends Blob Storage with a hierarchical namespace, POSIX-like ACLs, and atomic directory operations -- optimized for big data analytics.

### Hierarchical Namespace

ADLS Gen2 organizes blobs into a true directory structure (not just prefix-based).

```bash
# Create a storage account with hierarchical namespace
az storage account create \
  --name contosodatalake \
  --resource-group rg-contoso \
  --location eastus \
  --sku Standard_ZRS \
  --kind StorageV2 \
  --enable-hierarchical-namespace true
```

### Directory Operations

```typescript
import { DataLakeServiceClient } from "@azure/storage-file-datalake";
import { DefaultAzureCredential } from "@azure/identity";

const datalakeService = new DataLakeServiceClient(
  `https://${accountName}.dfs.core.windows.net`,
  new DefaultAzureCredential()
);

// Create a file system (container)
const fileSystemClient = datalakeService.getFileSystemClient("analytics");
await fileSystemClient.create();

// Create directories
const directoryClient = fileSystemClient.getDirectoryClient("raw/2024/11");
await directoryClient.create();

// Upload a file
const fileClient = directoryClient.getFileClient("events.parquet");
await fileClient.create();
await fileClient.append(data, 0, data.length);
await fileClient.flush(data.length);

// Rename / move a directory (atomic operation)
await directoryClient.rename("analytics", "processed/2024/11");

// Delete a directory recursively
await directoryClient.delete(true);
```

### ACLs (Access Control Lists)

ADLS Gen2 supports POSIX-like ACLs for fine-grained access control.

```bash
# Set ACL on a directory (rwx for owner, r-x for group, --- for other)
az storage fs access set \
  --account-name contosodatalake \
  --file-system analytics \
  --path raw/2024/11 \
  --acl "user::rwx,group::r-x,other::---" \
  --auth-mode login

# Set ACL recursively
az storage fs access set-recursive \
  --account-name contosodatalake \
  --file-system analytics \
  --path raw/ \
  --acl "user::rwx,group::r-x,other::---" \
  --auth-mode login

# Grant specific user access
az storage fs access set \
  --account-name contosodatalake \
  --file-system analytics \
  --path raw/ \
  --acl "user:<user-object-id>:r-x" \
  --auth-mode login
```

### Integration with Analytics

| Service | Integration | Use Case |
|---------|-------------|----------|
| Azure Databricks | Direct mount or ABFS driver | Spark-based ETL, ML |
| Azure Synapse Analytics | External tables, OPENROWSET | SQL queries on data lake |
| Azure Data Factory | Copy activity, dataflows | ETL/ELT pipelines |
| Azure HDInsight | ABFS driver | Hadoop/Spark clusters |
| Power BI | Dataflows, DirectQuery via Synapse | Business intelligence |

**ABFS URI format**: `abfss://<container>@<account>.dfs.core.windows.net/<path>`

## 11. Monitoring

### Diagnostic Settings

```bash
# Enable diagnostic logging for blob service
az monitor diagnostic-settings create \
  --name storage-diagnostics \
  --resource $(az storage account show --name <storage-name> --resource-group <rg-name> --query id -o tsv)/blobServices/default \
  --workspace <log-analytics-workspace-id> \
  --logs '[
    {"category":"StorageRead","enabled":true,"retentionPolicy":{"enabled":false}},
    {"category":"StorageWrite","enabled":true,"retentionPolicy":{"enabled":false}},
    {"category":"StorageDelete","enabled":true,"retentionPolicy":{"enabled":false}}
  ]' \
  --metrics '[{"category":"Transaction","enabled":true,"retentionPolicy":{"enabled":false}}]'
```

### Azure Monitor Metrics

| Metric | Description | Useful For |
|--------|-------------|-----------|
| `Transactions` | Number of storage requests | Traffic analysis |
| `Ingress` | Bytes received | Upload volume |
| `Egress` | Bytes sent | Download volume / cost |
| `SuccessServerLatency` | Average server-side latency | Performance monitoring |
| `SuccessE2ELatency` | Average end-to-end latency | User experience |
| `Availability` | Service availability percentage | SLA monitoring |
| `UsedCapacity` | Storage used in bytes | Capacity planning |

### Alerts

```bash
# Alert on high latency (> 500ms average)
az monitor metrics alert create \
  --name high-latency-alert \
  --resource-group <rg-name> \
  --scopes <storage-account-resource-id> \
  --condition "avg SuccessServerLatency > 500" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --action-group <action-group-id>

# Alert on capacity threshold (> 80% of 5 TB)
az monitor metrics alert create \
  --name capacity-alert \
  --resource-group <rg-name> \
  --scopes <storage-account-resource-id>/blobServices/default \
  --condition "avg BlobCapacity > 4398046511104" \
  --window-size 1h \
  --evaluation-frequency 1h \
  --action-group <action-group-id>
```

### Storage Analytics (Classic)

```bash
# Enable Storage Analytics logging
az storage logging update \
  --account-name <storage-name> \
  --log rwd \
  --retention 30 \
  --services bqt \
  --auth-mode login

# Enable Storage Analytics metrics
az storage metrics update \
  --account-name <storage-name> \
  --hour true \
  --minute true \
  --retention 30 \
  --services bqt \
  --auth-mode login
```

## 12. Common Patterns

### Pattern 1: Image Upload Pipeline with Blob Trigger

Upload images to a container, trigger an Azure Function to generate thumbnails.

```typescript
// Azure Function: Blob trigger
import { app, InvocationContext } from "@azure/functions";
import sharp from "sharp";
import { BlobServiceClient } from "@azure/storage-blob";
import { DefaultAzureCredential } from "@azure/identity";

const blobService = new BlobServiceClient(
  process.env.STORAGE_ACCOUNT_URL!,
  new DefaultAzureCredential()
);

app.storageBlob("generateThumbnail", {
  path: "images/{name}",
  connection: "AzureWebJobsStorage",
  handler: async (blob: Buffer, context: InvocationContext) => {
    const blobName = context.triggerMetadata.name as string;
    context.log(`Processing image: ${blobName}`);

    // Generate thumbnail (150x150)
    const thumbnail = await sharp(blob)
      .resize(150, 150, { fit: "cover" })
      .toBuffer();

    // Upload thumbnail to thumbnails container
    const thumbnailClient = blobService
      .getContainerClient("thumbnails")
      .getBlockBlobClient(blobName);
    await thumbnailClient.upload(thumbnail, thumbnail.length, {
      blobHTTPHeaders: { blobContentType: "image/jpeg" },
    });

    context.log(`Thumbnail created: thumbnails/${blobName}`);
  },
});
```

### Pattern 2: Queue-Based Work Dispatcher

Distribute work items across multiple workers using Queue Storage.

```typescript
import { QueueServiceClient } from "@azure/storage-queue";
import { DefaultAzureCredential } from "@azure/identity";

const queueService = new QueueServiceClient(
  process.env.STORAGE_QUEUE_URL!,
  new DefaultAzureCredential()
);

// Producer: enqueue work items
async function enqueueWorkItems(items: WorkItem[]) {
  const queueClient = queueService.getQueueClient("work-items");
  for (const item of items) {
    const encoded = Buffer.from(JSON.stringify(item)).toString("base64");
    await queueClient.sendMessage(encoded);
  }
}

// Consumer: process work items with poison message handling
async function processWorkItems() {
  const workQueue = queueService.getQueueClient("work-items");
  const poisonQueue = queueService.getQueueClient("work-items-poison");
  await poisonQueue.createIfNotExists();

  while (true) {
    const response = await workQueue.receiveMessages({
      numberOfMessages: 5,
      visibilityTimeout: 120,
    });

    if (response.receivedMessageItems.length === 0) {
      await sleep(5000);
      continue;
    }

    for (const msg of response.receivedMessageItems) {
      if (msg.dequeueCount > 5) {
        await poisonQueue.sendMessage(msg.messageText);
        await workQueue.deleteMessage(msg.messageId, msg.popReceipt);
        continue;
      }

      try {
        const item: WorkItem = JSON.parse(
          Buffer.from(msg.messageText, "base64").toString()
        );
        await processItem(item);
        await workQueue.deleteMessage(msg.messageId, msg.popReceipt);
      } catch (err) {
        console.error(`Failed to process ${msg.messageId}:`, err);
      }
    }
  }
}
```

### Pattern 3: Static Website with CDN and Custom Domain

Full setup for a production static website.

```bash
# 1. Create storage account
az storage account create \
  --name contosowebsite \
  --resource-group rg-contoso \
  --location eastus \
  --sku Standard_LRS \
  --kind StorageV2

# 2. Enable static website
az storage blob service-properties update \
  --account-name contosowebsite \
  --static-website true \
  --index-document index.html \
  --404-document index.html   # SPA routing

# 3. Deploy built assets
az storage blob upload-batch \
  --account-name contosowebsite \
  --destination '$web' \
  --source ./dist \
  --overwrite true

# 4. Create CDN
az cdn profile create --name cdn-contoso --resource-group rg-contoso --sku Standard_Microsoft
az cdn endpoint create \
  --name www-contoso \
  --resource-group rg-contoso \
  --profile-name cdn-contoso \
  --origin contosowebsite.z13.web.core.windows.net \
  --origin-host-header contosowebsite.z13.web.core.windows.net \
  --enable-compression true

# 5. Map custom domain (after CNAME DNS record is created)
az cdn custom-domain create \
  --name www \
  --resource-group rg-contoso \
  --profile-name cdn-contoso \
  --endpoint-name www-contoso \
  --hostname www.contoso.com

# 6. Enable HTTPS
az cdn custom-domain enable-https \
  --name www \
  --resource-group rg-contoso \
  --profile-name cdn-contoso \
  --endpoint-name www-contoso
```

### Pattern 4: Data Lake ETL Pipeline with Azure Functions

Ingest raw data into ADLS Gen2, transform, and load into processed zone.

```typescript
import { DataLakeServiceClient } from "@azure/storage-file-datalake";
import { DefaultAzureCredential } from "@azure/identity";
import { app, InvocationContext, Timer } from "@azure/functions";

const datalakeService = new DataLakeServiceClient(
  process.env.DATALAKE_URL!,
  new DefaultAzureCredential()
);

app.timer("dailyETL", {
  schedule: "0 0 2 * * *", // Run at 2 AM daily
  handler: async (timer: Timer, context: InvocationContext) => {
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const fileSystem = datalakeService.getFileSystemClient("analytics");

    // 1. List raw files for today
    const rawDir = fileSystem.getDirectoryClient(`raw/${today}`);
    const files: string[] = [];
    for await (const item of fileSystem.listPaths({ path: `raw/${today}`, recursive: false })) {
      if (!item.isDirectory && item.name?.endsWith(".json")) {
        files.push(item.name);
      }
    }
    context.log(`Found ${files.length} raw files for ${today}`);

    // 2. Transform and write to processed zone
    for (const filePath of files) {
      const rawFile = fileSystem.getFileClient(filePath);
      const downloadResponse = await rawFile.read();
      const rawData = await streamToBuffer(downloadResponse.readableStreamBody!);

      const records = JSON.parse(rawData.toString());
      const transformed = records.map(transformRecord);

      const processedPath = filePath.replace("raw/", "processed/").replace(".json", ".parquet");
      const processedFile = fileSystem.getFileClient(processedPath);
      const output = Buffer.from(JSON.stringify(transformed));
      await processedFile.create();
      await processedFile.append(output, 0, output.length);
      await processedFile.flush(output.length);
    }

    // 3. Archive raw files
    for (const filePath of files) {
      const rawDir = fileSystem.getDirectoryClient("raw");
      const archivedPath = filePath.replace("raw/", "archived/");
      const sourceFile = fileSystem.getFileClient(filePath);
      await sourceFile.rename("analytics", archivedPath);
    }

    context.log(`ETL complete: ${files.length} files processed`);
  },
});
```

## Progressive Disclosure — Reference Files

| Topic | File |
|---|---|
| Blob containers, block/append/page blobs, copy operations, index tags | [`references/blob-storage.md`](./references/blob-storage.md) |
| Queue Storage, Table Storage, and Azure Files | [`references/queue-table-files.md`](./references/queue-table-files.md) |
| Data Lake Storage Gen2, hierarchical namespace, POSIX ACLs | [`references/data-lake-gen2.md`](./references/data-lake-gen2.md) |
| SAS tokens, RBAC roles, storage firewall, private endpoints | [`references/sas-identity-security.md`](./references/sas-identity-security.md) |
| Lifecycle management policies, monitoring, KQL diagnostics | [`references/lifecycle-monitoring.md`](./references/lifecycle-monitoring.md) |
