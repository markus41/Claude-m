---
name: blob-manage
description: "Upload, download, list, and delete blobs; configure container access and blob properties"
argument-hint: "<upload|download|list|delete|create-container> [--container <name>] [--path <file>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - AskUserQuestion
---

# Blob Management

Manage Azure Blob Storage containers and blobs via Azure CLI and Node.js SDK.

## Instructions

### 1. Parse the Request

- `<action>` -- One of: `upload`, `download`, `list`, `delete`, `create-container`. Ask if not provided.
- `--container` -- Container name. Ask if not provided.
- `--path` -- Local file path (for upload/download). Ask if not provided for upload/download.
- `--prefix` -- Blob name prefix for filtering (optional, for list/delete).
- `--recursive` -- Process all blobs matching prefix (for delete).

### 2. Create Container

```bash
az storage container create \
  --account-name <storage-name> \
  --name <container-name> \
  --auth-mode login

# Verify no public access
az storage container show \
  --account-name <storage-name> \
  --name <container-name> \
  --auth-mode login \
  --query "properties.publicAccess"
```

**Node.js SDK**:
```typescript
import { BlobServiceClient } from "@azure/storage-blob";
import { DefaultAzureCredential } from "@azure/identity";

const blobService = new BlobServiceClient(
  `https://${accountName}.blob.core.windows.net`,
  new DefaultAzureCredential()
);
const containerClient = blobService.getContainerClient(containerName);
await containerClient.create();
```

### 3. Upload Blob

**Azure CLI**:
```bash
# Upload a single file
az storage blob upload \
  --account-name <storage-name> \
  --container-name <container> \
  --name <blob-name> \
  --file <local-path> \
  --auth-mode login \
  --overwrite

# Upload a directory
az storage blob upload-batch \
  --account-name <storage-name> \
  --destination <container> \
  --source <local-dir> \
  --auth-mode login
```

**Node.js SDK**:
```typescript
const containerClient = blobService.getContainerClient(containerName);
const blockBlobClient = containerClient.getBlockBlobClient(blobName);

// Upload from file path
await blockBlobClient.uploadFile(localFilePath);

// Upload from buffer
await blockBlobClient.upload(buffer, buffer.length);

// Upload with options (content type, metadata, tags)
await blockBlobClient.uploadFile(localFilePath, {
  blobHTTPHeaders: { blobContentType: "image/png" },
  metadata: { uploadedBy: "automation", project: "contoso" },
  tags: { category: "images", status: "processed" },
});
```

### 4. Download Blob

**Azure CLI**:
```bash
az storage blob download \
  --account-name <storage-name> \
  --container-name <container> \
  --name <blob-name> \
  --file <local-path> \
  --auth-mode login
```

**Node.js SDK**:
```typescript
const blockBlobClient = containerClient.getBlockBlobClient(blobName);
const downloadResponse = await blockBlobClient.download(0);

// Save to file
const fs = require("fs");
const writable = fs.createWriteStream(localFilePath);
downloadResponse.readableStreamBody!.pipe(writable);

// Read to buffer
const downloaded = await blockBlobClient.downloadToBuffer();
```

### 5. List Blobs

**Azure CLI**:
```bash
az storage blob list \
  --account-name <storage-name> \
  --container-name <container> \
  --prefix <optional-prefix> \
  --auth-mode login \
  --output table
```

**Node.js SDK**:
```typescript
for await (const blob of containerClient.listBlobsFlat({ prefix })) {
  console.log(`${blob.name} | ${blob.properties.contentLength} bytes | ${blob.properties.lastModified}`);
}

// List with metadata and tags
for await (const blob of containerClient.listBlobsFlat({
  prefix,
  includeMetadata: true,
  includeTags: true,
})) {
  console.log(blob.name, blob.metadata, blob.tags);
}
```

### 6. Delete Blob

**Azure CLI**:
```bash
# Delete a single blob
az storage blob delete \
  --account-name <storage-name> \
  --container-name <container> \
  --name <blob-name> \
  --auth-mode login

# Delete all blobs with a prefix
az storage blob delete-batch \
  --account-name <storage-name> \
  --source <container> \
  --pattern "<prefix>*" \
  --auth-mode login
```

**Node.js SDK**:
```typescript
const blockBlobClient = containerClient.getBlockBlobClient(blobName);
await blockBlobClient.delete({ deleteSnapshots: "include" });
```

### 7. Display Summary

Show the user:
- Action performed and result
- Container and blob details
- SDK code snippet for programmatic access
- Reminder to use `--auth-mode login` (RBAC) over account keys
