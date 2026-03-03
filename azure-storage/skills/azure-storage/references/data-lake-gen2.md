# Azure Data Lake Storage Gen2 — Deep Reference

## Overview

Azure Data Lake Storage Gen2 (ADLS Gen2) combines Azure Blob Storage with a hierarchical namespace (HNS), enabling atomic directory operations, POSIX-style ACLs, and HDFS compatibility. It is the preferred storage layer for Azure Synapse Analytics, Databricks, HDInsight, and Microsoft Fabric. HNS must be enabled at account creation and cannot be toggled later.

## REST API Endpoints (Data Lake Storage Gen2 — DFS endpoint)

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|---|---|---|---|---|
| PUT | `https://{account}.dfs.core.windows.net/{fs}` | Storage Blob Data Contributor | `?resource=filesystem` | Create filesystem (container) |
| DELETE | `https://{account}.dfs.core.windows.net/{fs}` | Storage Blob Data Contributor | `?resource=filesystem&recursive=true` | Delete filesystem |
| GET | `https://{account}.dfs.core.windows.net` | Storage Blob Data Reader | `?resource=account` | List filesystems |
| PUT | `https://{account}.dfs.core.windows.net/{fs}/{path}` | Storage Blob Data Contributor | `?resource=directory` | Create directory |
| DELETE | `https://{account}.dfs.core.windows.net/{fs}/{path}` | Storage Blob Data Contributor | `?recursive=true` | Delete directory recursively (atomic) |
| PATCH | `https://{account}.dfs.core.windows.net/{fs}/{dir}?action=move` | Storage Blob Data Contributor | `x-ms-rename-source` header | Atomic directory rename/move |
| PUT | `https://{account}.dfs.core.windows.net/{fs}/{path}` | Storage Blob Data Contributor | `?resource=file` | Create empty file |
| PATCH | `https://{account}.dfs.core.windows.net/{fs}/{path}?action=append` | Storage Blob Data Contributor | `?position={offset}`, body is data | Append data to file |
| PATCH | `https://{account}.dfs.core.windows.net/{fs}/{path}?action=flush` | Storage Blob Data Contributor | `?position={final-length}` | Commit (flush) appended data |
| GET | `https://{account}.dfs.core.windows.net/{fs}/{path}` | Storage Blob Data Reader | `Range` | Read file or range |
| GET | `https://{account}.dfs.core.windows.net/{fs}/{path}?action=getAccessControl` | Storage Blob Data Owner | — | Get POSIX ACLs |
| PATCH | `https://{account}.dfs.core.windows.net/{fs}/{path}?action=setAccessControl` | Storage Blob Data Owner | `x-ms-acl` header | Set POSIX ACLs |
| PATCH | `https://{account}.dfs.core.windows.net/{fs}/{path}?action=setAccessControlRecursive` | Storage Blob Data Owner | `x-ms-acl`, `?mode=set\|modify\|remove` | Apply ACLs recursively |
| GET | `https://{account}.dfs.core.windows.net/{fs}/{path}?resource=directory&recursive=true` | Storage Blob Data Reader | `continuation`, `maxResults` | List directory recursively |

## TypeScript SDK Patterns (Azure SDK v12)

### Create filesystem and directory

```typescript
import { DataLakeServiceClient, DataLakeFileSystemClient } from "@azure/storage-file-datalake";
import { DefaultAzureCredential } from "@azure/identity";

const accountName = process.env.ADLS_ACCOUNT_NAME!;
const serviceClient = new DataLakeServiceClient(
  `https://${accountName}.dfs.core.windows.net`,
  new DefaultAzureCredential()
);

// Create filesystem
const fsClient: DataLakeFileSystemClient = serviceClient.getFileSystemClient("raw-data");
await fsClient.createIfNotExists();

// Create hierarchical directory structure
const dirClient = fsClient.getDirectoryClient("ingest/2026/03/15");
await dirClient.createIfNotExists();

// Check if path exists
const properties = await dirClient.getProperties();
console.log("Last modified:", properties.lastModified);
```

### Upload a file to ADLS Gen2

```typescript
import { DataLakeFileSystemClient, DataLakeFileClient } from "@azure/storage-file-datalake";
import { DefaultAzureCredential } from "@azure/identity";
import { createReadStream, statSync } from "fs";

const fsClient = new DataLakeFileSystemClient(
  `https://${accountName}.dfs.core.windows.net/raw-data`,
  new DefaultAzureCredential()
);

const fileClient: DataLakeFileClient = fsClient.getFileClient("ingest/2026/03/15/events.parquet");

// Upload from a local file
const localPath = "/data/events.parquet";
const fileSize = statSync(localPath).size;
await fileClient.create();

// Upload in 64 MB chunks
const chunkSize = 64 * 1024 * 1024;
let offset = 0;
const stream = createReadStream(localPath, { highWaterMark: chunkSize });

for await (const chunk of stream) {
  await fileClient.append(chunk, offset, chunk.length);
  offset += chunk.length;
}

// Flush to commit the file
await fileClient.flush(offset, { close: true });
```

### Atomic rename (critical for ETL patterns)

```typescript
import { DataLakeFileSystemClient } from "@azure/storage-file-datalake";
import { DefaultAzureCredential } from "@azure/identity";

const fsClient = new DataLakeFileSystemClient(
  `https://${accountName}.dfs.core.windows.net/processed`,
  new DefaultAzureCredential()
);

// Write to a staging directory, then atomically rename to final location
// This is the "write-rename" pattern used in Spark/Databricks
const stagingDir = fsClient.getDirectoryClient("_staging/job-123");
const finalDir = fsClient.getDirectoryClient("2026/03/15/batch-run");

// After writing all files to staging:
await stagingDir.move("2026/03/15/batch-run"); // Atomic rename
console.log("Committed batch to final location");
```

### Set POSIX ACLs (fine-grained access control)

```typescript
import { DataLakePathClient } from "@azure/storage-file-datalake";
import { DefaultAzureCredential } from "@azure/identity";

const pathClient = new DataLakePathClient(
  `https://${accountName}.dfs.core.windows.net/data-lake/finance`,
  new DefaultAzureCredential()
);

// Set ACL: owner=rwx, group=r-x, other=---, named user OID=rw-
const acl = [
  { accessControlType: "user", entityId: "", defaultScope: false, permissions: { read: true, write: true, execute: true } },
  { accessControlType: "group", entityId: "", defaultScope: false, permissions: { read: true, write: false, execute: true } },
  { accessControlType: "other", entityId: "", defaultScope: false, permissions: { read: false, write: false, execute: false } },
  { accessControlType: "user", entityId: "<aad-object-id>", defaultScope: false, permissions: { read: true, write: true, execute: false } },
];
await pathClient.setAccessControl(acl);

// Also set default ACLs so new children inherit
const defaultAcl = acl.map(a => ({ ...a, defaultScope: true }));
await pathClient.setAccessControl([...acl, ...defaultAcl]);
```

### Recursive ACL update for large directory trees

```typescript
import { DataLakeDirectoryClient } from "@azure/storage-file-datalake";
import { DefaultAzureCredential } from "@azure/identity";

const dirClient = new DataLakeDirectoryClient(
  `https://${accountName}.dfs.core.windows.net/data-lake/dept-finance`,
  new DefaultAzureCredential()
);

// Apply ACLs recursively with continuation for large directories
const acl = "user::rwx,group::r-x,other::---,user:<oid>:rw-";

const poller = await dirClient.setAccessControlRecursive(acl, {
  batchSize: 2000, // process 2000 paths per batch
  onProgress: (progress) => {
    console.log(`Updated ${progress.successfulDirectoriesCount} dirs, ${progress.successfulFilesCount} files`);
  },
});

const result = await poller.pollUntilDone();
if (result.failedEntriesCount > 0) {
  console.error("Some entries failed:", result.failedEntries);
}
```

## Azure CLI Patterns

```bash
# Create ADLS Gen2 account
az storage account create \
  --name myadlsaccount \
  --resource-group rg-analytics \
  --location eastus \
  --sku Standard_LRS \
  --kind StorageV2 \
  --hierarchical-namespace true \
  --min-tls-version TLS1_2

# Create filesystem (container)
az storage fs create \
  --account-name myadlsaccount \
  --name raw-data \
  --auth-mode login

# Create directory
az storage fs directory create \
  --account-name myadlsaccount \
  --file-system raw-data \
  --name "ingest/2026/03/15" \
  --auth-mode login

# Upload file
az storage fs file upload \
  --account-name myadlsaccount \
  --file-system raw-data \
  --path "ingest/2026/03/15/events.parquet" \
  --source "/local/events.parquet" \
  --auth-mode login

# Move/rename directory (atomic)
az storage fs directory move \
  --account-name myadlsaccount \
  --file-system raw-data \
  --name "_staging/job-123" \
  --new-directory "processed/2026/03/15" \
  --auth-mode login

# Get ACLs
az storage fs access show \
  --account-name myadlsaccount \
  --file-system raw-data \
  --path "finance" \
  --auth-mode login

# Set ACLs
az storage fs access set \
  --account-name myadlsaccount \
  --file-system raw-data \
  --path "finance" \
  --acl "user::rwx,group::r-x,other::---,user:<oid>:rw-" \
  --auth-mode login

# Update ACLs recursively
az storage fs access update-recursive \
  --account-name myadlsaccount \
  --file-system raw-data \
  --path "finance" \
  --acl "user:<oid>:rw-" \
  --auth-mode login
```

## Error Codes

| Code | Meaning | Remediation |
|---|---|---|
| FilesystemNotFound (404) | Filesystem/container does not exist | Create filesystem first |
| PathNotFound (404) | Directory or file path does not exist | Create parent directories before writing |
| PathAlreadyExists (409) | Target path for rename already occupied | Delete or move existing path first |
| AclOperationNotSupported (409) | ACL operation on non-HNS account | Enable hierarchical namespace or use RBAC-only on non-HNS accounts |
| MissingRequiredHeader (400) | Missing `x-ms-acl` or `resource` parameter | Verify all required parameters for DFS operations |
| AuthorizationPermissionMismatch (403) | POSIX ACL denies operation | Check ACL execute bits on parent directories |
| BlobAccessTierNotSupported (409) | Tier change on HNS account with active lease | Release all leases before tier changes |
| RenameDestinationParentNotFound (409) | Parent directory of rename target missing | Create parent directories before rename |
| OperationTimedOut (500) | Recursive ACL on very large directory | Reduce batch size; use continuation tokens |
| HierarchicalNamespaceNotEnabled (409) | DFS operation on non-HNS account | Enable HNS at account creation; cannot be changed post-creation |

## Throttling Limits

| Resource | Limit | Retry Strategy |
|---|---|---|
| DFS API requests | 20,000 requests/second per account | Partition workloads across multiple accounts |
| Recursive ACL batch size | 2,000 paths per batch | Use `batchSize` parameter; handle continuation tokens |
| Max file size | 190.7 TiB | Use append pattern with 4 MB chunks for large writes |
| Concurrent rename operations | Serialized per directory | Queue rename operations; avoid concurrent renames to same target |
| Append flush latency | ~10 ms per flush call | Batch appends; only flush once after all chunks are uploaded |

## Production Gotchas

- **HNS cannot be enabled after account creation**: The hierarchical namespace flag must be set when creating the storage account. Plan ahead — migrating a flat Blob account to HNS requires Microsoft's ADLS Gen2 migration tool.
- **Blob endpoint vs DFS endpoint**: ADLS Gen2 has two endpoints — `.blob.core.windows.net` (Blob API) and `.dfs.core.windows.net` (DFS API). POSIX ACL operations, atomic rename, and directory list are DFS-only. Standard Blob SDK operations work on both.
- **Atomic rename enables write-rename pattern**: The ETL best practice is to write all output to a `_staging/` directory, then atomically rename to the final output path. This prevents consumers from reading partial/incomplete data.
- **ACL inheritance requires default ACLs**: Setting ACLs on a directory does not automatically apply to new child paths. You must set both access ACLs and default ACLs on the parent. Default ACLs are inherited by new children only.
- **POSIX ACL execute bit on directories**: To traverse a directory, a user needs execute (`x`) permission on every ancestor directory. Missing `x` on any parent causes `AuthorizationPermissionMismatch` even if the target has read permissions.
- **RBAC overrides ACLs**: If a user has the Storage Blob Data Owner RBAC role, ACL checks are bypassed. ACLs are only effective for users with lower RBAC roles (Storage Blob Data Reader/Contributor) or no RBAC role.
- **NFS 3.0 mount**: ADLS Gen2 accounts support NFS 3.0 protocol, but the storage account must be in a VNet (network access limited to private endpoint or selected networks). Public NFS access is not supported.
- **Lifecycle policies work differently on HNS**: Lifecycle policies that delete blobs on HNS accounts perform directory-aware deletions. Ensure policies do not delete intermediate directories needed for path traversal.
