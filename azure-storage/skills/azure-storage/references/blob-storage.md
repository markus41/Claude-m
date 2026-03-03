# Azure Blob Storage — Deep Reference

## Overview

Azure Blob Storage is the object storage solution for unstructured data in Azure. It supports block blobs (files, backups, media), append blobs (logging), and page blobs (VHDs). This reference covers REST API patterns, SDK usage, error handling, and production considerations.

## REST API Endpoints

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|---|---|---|---|---|
| PUT | `/containers/{container}` | Storage Blob Data Contributor | `x-ms-blob-public-access: container\|blob` | Creates container; omit header for private |
| DELETE | `/containers/{container}` | Storage Blob Data Contributor | — | Fails if container has leased blobs |
| GET | `/containers?comp=list` | Storage Blob Data Reader | `prefix`, `maxresults`, `marker` | List containers with pagination |
| PUT | `/containers/{container}/blobs/{blob}` | Storage Blob Data Contributor | `x-ms-blob-type: BlockBlob\|AppendBlob\|PageBlob` | Upload blob; replaces existing |
| GET | `/containers/{container}/blobs/{blob}` | Storage Blob Data Reader | `x-ms-range`, `x-ms-range-get-content-md5` | Download; supports partial reads |
| HEAD | `/containers/{container}/blobs/{blob}` | Storage Blob Data Reader | — | Fetch metadata without body |
| DELETE | `/containers/{container}/blobs/{blob}` | Storage Blob Data Contributor | `x-ms-delete-snapshots: include\|only` | Soft delete if policy enabled |
| PUT | `/containers/{container}/blobs/{blob}?comp=copy` | Storage Blob Data Contributor | `x-ms-copy-source` header | Async server-side copy |
| PUT | `/containers/{container}/blobs/{blob}?comp=block` | Storage Blob Data Contributor | `blockid` (base64, 64 byte max) | Upload one block (max 4000 MiB) |
| PUT | `/containers/{container}/blobs/{blob}?comp=blocklist` | Storage Blob Data Contributor | XML body with block IDs | Commit staged blocks to a blob |
| POST | `/containers/{container}/blobs/{blob}?comp=appendblock` | Storage Blob Data Contributor | Body is the block content | Append to AppendBlob only |
| PUT | `/containers/{container}/blobs/{blob}?comp=lease` | Storage Blob Data Contributor | `x-ms-lease-action: acquire\|renew\|break\|release` | Distributed locking on blob |
| GET | `/containers/{container}/blobs?restype=container&comp=list` | Storage Blob Data Reader | `prefix`, `delimiter`, `include=snapshots\|metadata\|tags` | List blobs in a container |
| PUT | `/containers/{container}/blobs/{blob}?comp=tags` | Storage Blob Data Contributor | XML body with tag key-value pairs | Index tags for cross-container queries |
| GET | `/?comp=blobs` | Storage Blob Data Reader | `where=<OData filter expression>` | Find blobs by index tags across account |

Base URL: `https://{accountName}.blob.core.windows.net`

## TypeScript SDK Patterns (Azure SDK v12)

### Create a container and upload a blob

```typescript
import { BlobServiceClient } from "@azure/storage-blob";
import { DefaultAzureCredential } from "@azure/identity";

const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME!;
const credential = new DefaultAzureCredential();
const blobServiceClient = new BlobServiceClient(
  `https://${accountName}.blob.core.windows.net`,
  credential
);

// Create container if it does not exist
const containerClient = blobServiceClient.getContainerClient("my-container");
await containerClient.createIfNotExists({
  access: "private", // no public access
});

// Upload a blob from a Buffer
const blockBlobClient = containerClient.getBlockBlobClient("uploads/my-file.json");
const content = JSON.stringify({ message: "hello" });
await blockBlobClient.uploadData(Buffer.from(content), {
  blobHTTPHeaders: { blobContentType: "application/json" },
  tags: { environment: "production", owner: "team-a" },
  metadata: { uploadedBy: "service-account" },
});
```

### Stream upload for large files (>256 MB)

```typescript
import { createReadStream } from "fs";
import { BlockBlobClient } from "@azure/storage-blob";
import { DefaultAzureCredential } from "@azure/identity";

const client = new BlockBlobClient(
  `https://${accountName}.blob.core.windows.net/container/large-file.bin`,
  new DefaultAzureCredential()
);

const fileStream = createReadStream("/path/to/large-file.bin");
const fileSize = 2 * 1024 * 1024 * 1024; // 2 GB

await client.uploadStream(fileStream, fileSize, 8, // 8 parallel upload threads
  {
    blobHTTPHeaders: { blobContentType: "application/octet-stream" },
    onProgress: (progress) => {
      console.log(`Uploaded ${progress.loadedBytes} bytes`);
    },
  }
);
```

### Download a blob to a file

```typescript
import { BlobClient } from "@azure/storage-blob";
import { DefaultAzureCredential } from "@azure/identity";

const blobClient = new BlobClient(
  `https://${accountName}.blob.core.windows.net/container/data.csv`,
  new DefaultAzureCredential()
);

// Option 1: download to file
await blobClient.downloadToFile("/tmp/data.csv");

// Option 2: stream download with error handling
const downloadResponse = await blobClient.download(0); // offset 0 = entire blob
const readableStream = downloadResponse.readableStreamBody!;
// pipe to writable stream...
```

### Copy a blob asynchronously

```typescript
import { BlobClient } from "@azure/storage-blob";
import { DefaultAzureCredential } from "@azure/identity";

const sourceBlob = new BlobClient(
  `https://${accountName}.blob.core.windows.net/source/data.parquet`,
  new DefaultAzureCredential()
);
const destBlob = new BlobClient(
  `https://${accountName}.blob.core.windows.net/dest/data.parquet`,
  new DefaultAzureCredential()
);

// Start copy
const copyPoller = await destBlob.beginCopyFromURL(sourceBlob.url);
// Poll until complete
const result = await copyPoller.pollUntilDone();
console.log("Copy status:", result.copyStatus); // "success"
```

### Set blob index tags and query

```typescript
import { BlobServiceClient } from "@azure/storage-blob";
import { DefaultAzureCredential } from "@azure/identity";

const serviceClient = new BlobServiceClient(
  `https://${accountName}.blob.core.windows.net`,
  new DefaultAzureCredential()
);

// Find blobs by tag across all containers
const tagFilter = `"environment" = 'production' AND "owner" = 'team-a'`;
for await (const blob of serviceClient.findBlobsByTags(tagFilter)) {
  console.log(blob.containerName, blob.name);
}
```

## Azure CLI Patterns

```bash
# Create storage account
az storage account create \
  --name mystorageaccount \
  --resource-group rg-prod \
  --location eastus \
  --sku Standard_LRS \
  --kind StorageV2 \
  --allow-blob-public-access false \
  --min-tls-version TLS1_2

# Create container
az storage container create \
  --account-name mystorageaccount \
  --name my-container \
  --auth-mode login

# Upload a file
az storage blob upload \
  --account-name mystorageaccount \
  --container-name my-container \
  --name "uploads/file.txt" \
  --file "/local/path/file.txt" \
  --auth-mode login

# List blobs
az storage blob list \
  --account-name mystorageaccount \
  --container-name my-container \
  --auth-mode login \
  --output table

# Copy blob
az storage blob copy start \
  --account-name mystorageaccount \
  --destination-container dest-container \
  --destination-blob new-blob.txt \
  --source-account-name mystorageaccount \
  --source-container source-container \
  --source-blob original.txt

# Generate SAS token (User Delegation preferred)
az storage blob generate-sas \
  --account-name mystorageaccount \
  --container-name my-container \
  --name sensitive-file.pdf \
  --permissions r \
  --expiry "$(date -u -d '1 hour' '+%Y-%m-%dT%H:%MZ')" \
  --auth-mode login \
  --as-user
```

## PowerShell Patterns

```powershell
# Authenticate
Connect-AzAccount

# Create container
$ctx = New-AzStorageContext -StorageAccountName "mystorageaccount" -UseConnectedAccount
New-AzStorageContainer -Name "my-container" -Context $ctx -Permission Off

# Upload blob
Set-AzStorageBlobContent `
  -Container "my-container" `
  -File "C:\local\file.txt" `
  -Blob "uploads/file.txt" `
  -Context $ctx `
  -Force

# Download blob
Get-AzStorageBlobContent `
  -Container "my-container" `
  -Blob "uploads/file.txt" `
  -Destination "C:\downloads\" `
  -Context $ctx

# Set access tier
$blob = Get-AzStorageBlob -Container "my-container" -Blob "archive/old.zip" -Context $ctx
$blob.BlobClient.SetAccessTier([Azure.Storage.Blobs.Models.AccessTier]::Archive)

# Delete blobs older than 90 days (soft delete should be enabled)
$cutoff = (Get-Date).AddDays(-90)
Get-AzStorageBlob -Container "logs" -Context $ctx | Where-Object {
  $_.LastModified -lt $cutoff
} | Remove-AzStorageBlob
```

## Error Codes

| Code | Meaning | Remediation |
|---|---|---|
| BlobNotFound (404) | Blob does not exist | Check container/blob name; check soft-delete recycle bin |
| ContainerNotFound (404) | Container does not exist | Verify container name and region |
| AuthorizationFailure (403) | Token lacks RBAC role | Assign Storage Blob Data Reader or Contributor at container/account scope |
| PublicAccessNotPermitted (403) | Account has public access disabled | Use SAS or managed identity; do not enable public access for blobs |
| BlobAlreadyExists (409) | Blob exists with active lease | Break or release the lease first |
| LeaseIdMissing (412) | Operation requires a lease but none provided | Acquire lease or provide leaseId header |
| LeaseIdMismatchWithBlobOperation (412) | Wrong leaseId supplied | Use current leaseId from HEAD response |
| RequestBodyTooLarge (413) | Single block > 4000 MiB | Use Put Block + Put Block List (staged upload) |
| ConditionNotMet (412) | ETag mismatch (optimistic concurrency) | Re-fetch current ETag, retry with updated data |
| BlobAccessTierNotSupported (409) | Access tier not valid for blob type | Page blobs do not support Hot/Cool/Archive tiers |
| InvalidBlockList (400) | Block IDs in commit list are not staged | Upload all blocks before calling Put Block List |
| OperationTimedOut (500) | Server timeout on large operations | Retry with exponential backoff; reduce block size |
| ServerBusy (503) | Storage throttled | Retry after Retry-After header; use multiple storage accounts |

## Throttling Limits

| Resource | Limit | Retry Strategy |
|---|---|---|
| Storage account ingress (LRS/ZRS) | 60 Gbps | Distribute writes across multiple accounts; use exponential backoff |
| Storage account egress (LRS) | 60 Gbps | Distribute reads; use CDN for static content |
| IOPS per premium page blob | 7,500 IOPS | Use Premium storage for disk workloads; scale out to multiple blobs |
| API requests per account | 20,000 requests/second | Jitter retry with ExponentialRetryPolicy in SDK |
| Max block size (Put Block) | 4000 MiB | Use 100–4000 MiB blocks for large uploads |
| Max blob size (block blob) | 190.7 TiB | Compose with Put Block List (up to 50,000 blocks) |
| Container list per account | 500 containers (soft) | Use prefix-based naming; split across multiple accounts if needed |
| Blob tags per blob | 10 tags | Consolidate tag usage; use metadata for non-indexed attributes |
| Concurrent lease operations | 1 lease per blob | Queue lease acquisition; use retry with randomized delay |

## Production Gotchas

- **Soft delete is per service, not global**: Container-level soft delete does NOT protect individual blobs. Enable blob-level soft delete AND container soft delete separately in the Data Protection blade.
- **Access tier rehydration latency**: Archive→Hot/Cool rehydration has two priority levels. Standard priority takes up to 15 hours; High priority takes 1–10 hours and costs more. Plan ahead for archive restores.
- **SAS token security**: Always use User Delegation SAS (requires Entra ID token) rather than account key SAS. Set expiry ≤ 1 hour for interactive use. Never log SAS URIs.
- **Large file memory**: `uploadData()` loads the entire file into memory. Use `uploadStream()` for files > 256 MB to avoid OOM errors in serverless/container environments.
- **NFS mounts with Data Lake Gen2**: NFS 3.0 requires hierarchical namespace enabled at creation time — this cannot be changed later. Create a new account if needed.
- **Index tags vs metadata**: Blob index tags are stored as a separate index and support cross-container queries. Metadata is stored alongside the blob and only queryable via list operations with `include=metadata`.
- **Immutable storage**: WORM (Write Once Read Many) policies require Blob Versioning to be enabled and cannot be removed once locked. Test with unlocked policies first.
- **Network routing**: Use Microsoft Routing (default) for lowest latency; Internet Routing for traffic that must leave Azure backbone. These are set per storage account.
- **Blob versioning cost**: Enabling versioning without a lifecycle policy that deletes old versions will cause unbounded cost growth from accumulated historical versions.
- **Parallel uploads**: The SDK default concurrency for `uploadStream` is 5 parallel threads. Increase to 8–16 for very large files on high-bandwidth networks, but monitor memory usage.
