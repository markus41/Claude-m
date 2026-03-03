# OneDrive File Operations — Graph API Reference

## Overview

This reference covers all DriveItem CRUD operations via Microsoft Graph API v1.0. It includes
upload/download patterns, copy/move, folder management, search, metadata, versioning, restoring
deleted items, and thumbnail generation.

Base URL: `https://graph.microsoft.com/v1.0`

---

## API Endpoint Table

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|---------------------|----------------|-------|
| GET | `/me/drive/root/children` | `Files.Read` | `$select`, `$top`, `$orderby` | Lists root folder items |
| GET | `/me/drive/items/{itemId}/children` | `Files.Read` | `$select`, `$filter`, `$top` | Lists folder contents |
| GET | `/me/drive/items/{itemId}` | `Files.Read` | `$select`, `$expand` | Get item by ID |
| GET | `/me/drive/root:/{path}` | `Files.Read` | path segment | Get item by path |
| POST | `/me/drive/items/{parentId}/children` | `Files.ReadWrite` | `name`, `folder: {}` | Create folder |
| PUT | `/me/drive/items/{parentId}:/{filename}:/content` | `Files.ReadWrite` | `Content-Type`, `@microsoft.graph.conflictBehavior` | Simple upload (<4 MB) |
| PUT | `/me/drive/root:/{path}:/content` | `Files.ReadWrite` | `Content-Type` | Upload by path |
| GET | `/me/drive/items/{itemId}/content` | `Files.Read` | — | Download file content |
| PATCH | `/me/drive/items/{itemId}` | `Files.ReadWrite` | `name`, `parentReference` | Rename or move item |
| POST | `/me/drive/items/{itemId}/copy` | `Files.ReadWrite` | `parentReference`, `name` | Copy item (async) |
| DELETE | `/me/drive/items/{itemId}` | `Files.ReadWrite` | — | Move to recycle bin |
| GET | `/me/drive/root/search(q='{query}')` | `Files.Read` | `$select`, `$top`, `$filter` | Search by name/content |
| GET | `/me/drive/items/{itemId}/versions` | `Files.Read` | `$select` | List version history |
| GET | `/me/drive/items/{itemId}/versions/{versionId}` | `Files.Read` | — | Get specific version |
| POST | `/me/drive/items/{itemId}/versions/{versionId}/restoreVersion` | `Files.ReadWrite` | — | Restore a version |
| GET | `/me/drive/items/{itemId}/thumbnails` | `Files.Read` | `$select` | Get thumbnails |
| GET | `/me/drive/special/{name}` | `Files.Read` | — | Access well-known folder |

### Drive Discovery Endpoints

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|---------------------|----------------|-------|
| GET | `/me/drive` | `Files.Read` | — | Current user default drive |
| GET | `/me/drives` | `Files.Read` | — | All accessible drives |
| GET | `/users/{userId}/drive` | `Files.Read.All` | userId | Another user's drive (admin) |
| GET | `/groups/{groupId}/drive` | `Files.Read`, `Group.Read.All` | groupId | Group document library |
| GET | `/sites/{siteId}/drive` | `Files.Read`, `Sites.Read.All` | siteId | SPO default doc library |
| GET | `/drives/{driveId}` | `Files.Read` | driveId | Specific drive by ID |

---

## Code Snippets

### TypeScript — Graph SDK v3: List Folder Contents

```typescript
import { Client } from "@microsoft/microsoft-graph-client";
import { TokenCredentialAuthenticationProvider } from "@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials";
import { ClientSecretCredential } from "@azure/identity";

const credential = new ClientSecretCredential(
  process.env.AZURE_TENANT_ID!,
  process.env.AZURE_CLIENT_ID!,
  process.env.AZURE_CLIENT_SECRET!
);

const authProvider = new TokenCredentialAuthenticationProvider(credential, {
  scopes: ["https://graph.microsoft.com/.default"],
});

const client = Client.initWithMiddleware({ authProvider });

// List items in a folder with select to reduce payload
async function listFolderContents(itemId: string): Promise<void> {
  let url = `/me/drive/items/${itemId}/children?$select=id,name,size,lastModifiedDateTime,file,folder&$top=100`;

  while (url) {
    const response = await client.api(url).get();
    for (const item of response.value) {
      console.log(`${item.name} — ${item.file ? "file" : "folder"} — ${item.size} bytes`);
    }
    url = response["@odata.nextLink"] ?? null;
  }
}
```

### TypeScript — Create a Folder

```typescript
async function createFolder(parentId: string, folderName: string): Promise<string> {
  const body = {
    name: folderName,
    folder: {},
    "@microsoft.graph.conflictBehavior": "rename",
  };

  const result = await client
    .api(`/me/drive/items/${parentId}/children`)
    .post(body);

  console.log(`Created folder: ${result.id}`);
  return result.id;
}
```

### TypeScript — Simple File Upload (<4 MB)

```typescript
import * as fs from "fs";

async function simpleUpload(parentId: string, filename: string, filePath: string): Promise<void> {
  const fileContent = fs.readFileSync(filePath);

  const result = await client
    .api(`/me/drive/items/${parentId}:/${filename}:/content`)
    .header("Content-Type", "application/octet-stream")
    .put(fileContent);

  console.log(`Uploaded: ${result.id} — size: ${result.size}`);
}
```

### TypeScript — Download File Content

```typescript
async function downloadFile(itemId: string, outputPath: string): Promise<void> {
  const stream = await client
    .api(`/me/drive/items/${itemId}/content`)
    .getStream();

  const writer = fs.createWriteStream(outputPath);
  stream.pipe(writer);

  await new Promise<void>((resolve, reject) => {
    writer.on("finish", resolve);
    writer.on("error", reject);
  });

  console.log(`Downloaded to: ${outputPath}`);
}
```

### TypeScript — Move/Rename Item

```typescript
async function moveItem(itemId: string, newParentId: string, newName?: string): Promise<void> {
  const body: Record<string, unknown> = {
    parentReference: { id: newParentId },
  };
  if (newName) body.name = newName;

  await client.api(`/me/drive/items/${itemId}`).patch(body);
  console.log(`Moved item ${itemId} to parent ${newParentId}`);
}
```

### TypeScript — Copy Item (Async)

```typescript
async function copyItem(
  itemId: string,
  destinationParentId: string,
  newName: string
): Promise<string> {
  const response = await client
    .api(`/me/drive/items/${itemId}/copy`)
    .responseType("raw")
    .post({
      parentReference: { id: destinationParentId },
      name: newName,
    });

  // Copy is async — returns 202 with Location header
  const operationUrl = response.headers.get("Location");
  console.log(`Copy operation polling URL: ${operationUrl}`);
  return operationUrl!;
}

async function pollCopyOperation(operationUrl: string): Promise<void> {
  while (true) {
    const res = await fetch(operationUrl, {
      headers: { Authorization: `Bearer ${/* your token */}` },
    });
    const data = await res.json();
    if (data.status === "completed") {
      console.log("Copy completed:", data.resourceId);
      return;
    } else if (data.status === "failed") {
      throw new Error(`Copy failed: ${data.error?.message}`);
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
}
```

### TypeScript — Search Files

```typescript
async function searchFiles(query: string): Promise<void> {
  const result = await client
    .api(`/me/drive/root/search(q='${encodeURIComponent(query)}')`)
    .select("id,name,size,parentReference,lastModifiedDateTime")
    .top(25)
    .get();

  for (const item of result.value) {
    console.log(`${item.name} — in ${item.parentReference.path}`);
  }
}
```

### TypeScript — Get Thumbnails

```typescript
async function getThumbnails(itemId: string): Promise<void> {
  const result = await client
    .api(`/me/drive/items/${itemId}/thumbnails`)
    .get();

  for (const thumb of result.value) {
    console.log(`Small: ${thumb.small?.url}`);
    console.log(`Medium: ${thumb.medium?.url}`);
    console.log(`Large: ${thumb.large?.url}`);
  }
}
```

### TypeScript — Restore Deleted Item (Recycle Bin)

```typescript
async function restoreDeletedItem(driveId: string, itemId: string): Promise<void> {
  // Items in recycle bin are accessible via the drive's root/deleted items
  await client
    .api(`/drives/${driveId}/items/${itemId}/restore`)
    .post({});
  console.log(`Item ${itemId} restored`);
}
```

### PowerShell — Microsoft.Graph Module: File Operations

```powershell
# Install module if needed
# Install-Module Microsoft.Graph -Scope CurrentUser

Connect-MgGraph -Scopes "Files.ReadWrite.All"

# List root folder
$children = Get-MgDriveRootChild -DriveId (Get-MgDrive).Id
$children | Select-Object Name, Id, @{N="Size";E={$_.File.Size}}

# Get item by path
$item = Get-MgDriveItemByPath -DriveId (Get-MgDrive).Id -ItemPath "/Documents/report.xlsx"

# Create folder
$folderBody = @{
    name = "NewFolder"
    folder = @{}
    "@microsoft.graph.conflictBehavior" = "rename"
}
$newFolder = New-MgDriveItemChild -DriveId (Get-MgDrive).Id -DriveItemId "root" -BodyParameter $folderBody

# Delete item (moves to recycle bin)
Remove-MgDriveItem -DriveId (Get-MgDrive).Id -DriveItemId $item.Id

# List item versions
$versions = Get-MgDriveItemVersion -DriveId (Get-MgDrive).Id -DriveItemId $item.Id
$versions | Select-Object Id, LastModifiedDateTime, Size
```

---

## Error Codes Table

| HTTP Status / Code | Meaning | Remediation |
|--------------------|---------|-------------|
| 400 BadRequest | Malformed request body or invalid OData query | Validate JSON structure; check `conflictBehavior` values |
| 400 InvalidRequest | Invalid `$filter` or `$orderby` expression | Escape special characters; verify supported properties |
| 401 Unauthorized | Missing or expired token | Re-acquire token; verify credential config |
| 403 Forbidden | Insufficient scope or permission | Add `Files.ReadWrite` or `Files.ReadWrite.All`; grant admin consent |
| 404 ItemNotFound | Item ID or path not found | Check item exists; item may have been deleted |
| 409 Conflict | Conflict behavior triggered | Use `rename`, `replace`, or `fail` conflict behavior param |
| 412 PreconditionFailed | ETag mismatch on conditional request | Re-fetch item for latest `eTag` before PATCH |
| 423 LockFailed | Item is checked out or locked | Wait for lock release; check SharePoint checkout status |
| 429 TooManyRequests | Graph API rate limit hit | Respect `Retry-After` header; implement exponential backoff |
| 500 InternalServerError | Server error | Retry with backoff; report if persistent |
| 503 ServiceUnavailable | Service temporarily down | Retry with exponential backoff |
| itemNameInvalid | Filename contains invalid characters | Remove `/ \ * : ? " < > \|` from filenames |
| nameAlreadyExists | Item with this name already exists | Use `conflictBehavior: replace` or `rename` |
| notSupported | Operation not supported on this drive type | Check drive type (personal vs business vs SharePoint) |
| quotaLimitReached | OneDrive quota exceeded | User must free up storage |

---

## Throttling Limits Table

| Resource | Limit | Retry Strategy |
|----------|-------|----------------|
| Per-app, per-tenant | 10,000 requests per 10 minutes | Respect `Retry-After`; implement token bucket |
| Per-user (delegated) | 1,200 requests per minute | Spread requests; add jitter to retry delays |
| Download bandwidth | No enforced limit but deprioritized at high volume | Off-peak scheduling for large transfers |
| Simple upload | 4 MB maximum file size | Use resumable upload session for larger files |
| Resumable upload chunk | Must be multiple of 320 KiB; recommended 5–10 MB | Use 10 MB chunks for reliable throughput |
| Maximum file size | 250 GB per file | Single file upload session supports up to 250 GB |
| Concurrent upload sessions | No hard limit but recommendation: <5 concurrent | Queue concurrent uploads to avoid throttling |
| Search results | Max 200 per page; use `@odata.nextLink` | Page through all results; do not rely on a single response |
| Batch requests | Max 20 requests per `$batch` call | Group related reads into batches |

---

## Common Patterns and Gotchas

### 1. Conflict Behavior Is Required for Reliable Uploads

When uploading files, always specify `@microsoft.graph.conflictBehavior` as a query parameter
or in the request body. Without it, the default behavior is `fail` for simple uploads and
`rename` for upload sessions. Production code should be explicit:

```
PUT /me/drive/items/{parentId}:/{filename}:/content?@microsoft.graph.conflictBehavior=replace
```

### 2. `$expand=children` Is Expensive — Prefer Explicit Listing

Avoid `GET /me/drive/items/{id}?$expand=children` for large folders. It returns all children in
a single (potentially huge) response and does not support `$top` on the expansion. Always use
the dedicated `/children` endpoint with `$top` and pagination.

### 3. Copy Operations Are Asynchronous

`POST /me/drive/items/{itemId}/copy` returns `202 Accepted` — **not** a completed item.
The response `Location` header contains an operation URL. Poll it until `status` is `completed`
or `failed`. Many integrations incorrectly assume copy is synchronous.

### 4. Drive Item Paths Must Be URL-Encoded

When using path-based endpoints (`/drive/root:/{path}`), URL-encode the path segments but not
the `:` separators. Spaces become `%20`, not `+`. The Graph SDK handles this automatically; raw
HTTP calls require manual encoding.

### 5. Deleted Items Remain in Recycle Bin for 30 Days

`DELETE /me/drive/items/{itemId}` moves items to the recycle bin — it does not permanently delete
them. The item stays recoverable via `/me/drive/items/{itemId}/restore` for 30 days (93 days for
SharePoint document libraries with versioning enabled).

### 6. Thumbnails Are Only Generated for Known File Types

Thumbnails are generated for images, PDFs, and Office documents. Arbitrary binary files (`.zip`,
`.exe`, `.bin`) do not have thumbnails. Check `file.mimeType` before requesting thumbnails to
avoid 404 responses.

### 7. Special Folders Are Drive-Relative

`GET /me/drive/special/documents` returns the user's "Documents" folder in their OneDrive. This
is NOT the same as the SharePoint site's `Documents` document library. For SharePoint sites, use
`/sites/{siteId}/drive/root/children` instead.

### 8. Search Scope Is User-Scoped by Default

`/me/drive/root/search(q='...')` searches only within the signed-in user's OneDrive. To search
across all drives the user has access to, use `/me/drive/search(q='...')` (note: `drive`, not
`root`). Enterprise-wide search uses the separate Search API.

### 9. Item Versions Are Only Available for OneDrive for Business

Version history (`/items/{id}/versions`) works for OneDrive for Business (SharePoint-backed)
drives. Personal OneDrive (Microsoft Account) accounts may have limited or no versioning support
depending on plan.

### 10. Batch Requests for Bulk Operations

Use `POST /$batch` to send up to 20 requests in a single HTTP call. This dramatically reduces
latency for operations like creating multiple folders or uploading metadata for many items:

```typescript
const batch = {
  requests: [
    { id: "1", method: "POST", url: "/me/drive/items/root/children", body: { name: "Folder1", folder: {} } },
    { id: "2", method: "POST", url: "/me/drive/items/root/children", body: { name: "Folder2", folder: {} } },
  ],
};
await client.api("/$batch").post(batch);
```

Each request in the batch can fail independently — check each individual response status.
