---
name: sharepoint-file-intelligence
description: >
  Deep expertise in SharePoint and OneDrive file intelligence at scale — bulk file enumeration,
  duplicate detection, metadata and content-type management, folder governance, batch Graph API
  operations, and reorganization workflows for large document libraries.
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
  - AskUserQuestion
triggers:
  - scan sharepoint
  - file inventory
  - find duplicates
  - categorize files
  - organize sharepoint
  - sharepoint file management
  - onedrive cleanup
  - scan onedrive
  - onedrive inventory
  - onedrive files
  - onedrive duplicates
  - onedrive organization
  - bulk metadata
  - content type
  - file consolidation
  - stale files
  - orphaned files
  - folder structure
  - sharepoint governance
  - deduplicate files
  - sharepoint reorganization
  - file categorization
  - drive items
  - document library scan
  - shared drives
  - all drives
---

# SharePoint File Intelligence

This skill provides comprehensive knowledge for scanning, categorizing, deduplicating, and
organizing files across SharePoint and OneDrive for Business via Microsoft Graph API. It covers
bulk file enumeration, duplicate detection strategies, managed metadata, content types, folder
governance, and safe reorganization workflows.

## Integration Context Contract

| Workflow | tenantId | subscriptionId | principalType | scopesOrRoles |
|---|---|---|---|---|
| File scan and inventory | required | optional | `delegated-user` or `app` | `Sites.Read.All`, `Files.Read.All` |
| Metadata / content-type updates | required | optional | `delegated-user` or `app` | `Sites.ReadWrite.All`, `Files.ReadWrite.All` |
| File moves and consolidation | required | optional | `delegated-user` or `app` | `Sites.ReadWrite.All`, `Files.ReadWrite.All` |

Fail fast before Graph calls when required context is missing. Redact tenant/object identifiers in outputs.

## Base URL

```
https://graph.microsoft.com/v1.0
```

All Graph API endpoints below are relative to this base URL.

---

## Scan Targets

This plugin covers all drive types accessible via Microsoft Graph:

| Target | API entry point | Typical use |
|--------|----------------|-------------|
| SharePoint site (single library) | `GET /sites/{siteId}/drives` | Focused department/project scan |
| SharePoint site (all libraries) | `GET /sites/{siteId}/drives` + `--all-drives` | Full site inventory |
| My OneDrive for Business | `GET /me/drive` | Personal drive cleanup |
| Another user's OneDrive | `GET /users/{userId}/drive` | IT-managed cleanup |
| All OneDrives in tenant | `GET /users` → loop `/users/{id}/drive` | Tenant-wide governance |
| Specific drive ID | `GET /drives/{driveId}` | Direct targeting |

The delta endpoint (`/drives/{driveId}/root/delta`) is the same for all drive types, so all
scan, dedup, categorize, and consolidate workflows apply equally to SharePoint libraries and
OneDrive accounts.

---

## 1. Graph API — Site, Drive, and File Enumeration

### List Sites

```
GET /sites?search=*&$select=id,displayName,webUrl,createdDateTime,lastModifiedDateTime
```

For all sites in the tenant (requires `Sites.Read.All`). Use `search=*` to enumerate all known sites; supplement with SharePoint Admin Center for full coverage.

### List Drives in a Site

```
GET /sites/{siteId}/drives?$select=id,name,driveType,quota,createdDateTime,lastModifiedDateTime
```

`driveType` values: `documentLibrary`, `personal` (OneDrive), `business`.

### Delta Query — Enumerate All driveItems

Use the **delta endpoint** for large libraries; it returns all items and supports incremental sync on subsequent runs:

```
GET /drives/{driveId}/root/delta?$select=id,name,size,file,folder,parentReference,createdDateTime,lastModifiedDateTime,createdBy,lastModifiedBy,webUrl
```

**Paging loop:**

```javascript
let url = `/drives/${driveId}/root/delta?$select=id,name,size,file,folder,parentReference,createdDateTime,lastModifiedDateTime,createdBy,lastModifiedBy,webUrl`;
let items = [];

while (url) {
  const res = await client.api(url).get();
  items.push(...res.value);
  url = res["@odata.nextLink"] || null;
  // Store res["@odata.deltaLink"] for next incremental run
}
```

Save the `@odata.deltaLink` token for incremental scans — subsequent delta calls only return changed items.

### List Children of a Folder

```
GET /drives/{driveId}/items/{folderId}/children?$select=id,name,size,file,folder,parentReference,createdDateTime,lastModifiedDateTime&$top=200
```

### File Hashes (for deduplication)

```
GET /drives/{driveId}/items/{itemId}?$select=id,name,file,size
```

The `file` facet contains:
```json
{
  "mimeType": "application/pdf",
  "hashes": {
    "quickXorHash": "AbCdEf==",
    "sha1Hash":    "DA39A3EE5E6B4B0D3255BFEF95601890AFD80709",
    "sha256Hash":  "E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855"
  }
}
```

**Use `sha1Hash` for exact duplicate matching.** `quickXorHash` is always present; `sha256Hash` requires requesting it explicitly and may not be populated for all items.

### Get Item Metadata / List Columns

```
GET /sites/{siteId}/lists/{listId}/items/{itemId}?$expand=fields
```

The `fields` object contains all SharePoint column values, including managed metadata columns.

---

## 2. Duplicate Detection

See detailed strategies: [`references/duplicate-detection.md`](./references/duplicate-detection.md)

### Exact Duplicate (Binary)

Group inventory items by `sha1Hash`. Items in the same group are byte-for-byte identical.

**Algorithm:**
1. Build a map: `{ sha1Hash → [driveItem, driveItem, ...] }`
2. Discard entries with only one item (no duplicate)
3. For each group, sort by `lastModifiedDateTime` descending — the most recently modified is the "keep" candidate (or the oldest-created if you prefer canonical originals)

### Near-Duplicate (Name + Size)

Group by `name` + `size` within ±1 KB tolerance. Catches files renamed slightly or with minor edits.

```javascript
function nearDupKey(item) {
  const sizeBucket = Math.round(item.size / 1024); // KB bucket
  return `${item.name.toLowerCase()}|${sizeBucket}`;
}
```

### Potential Space Savings

```javascript
const savings = dupGroups.reduce((acc, group) => {
  const keepSize = group[0].size;
  const wasteSize = group.slice(1).reduce((s, i) => s + i.size, 0);
  return acc + wasteSize;
}, 0);
console.log(`Potential savings: ${(savings / 1_073_741_824).toFixed(2)} GB`);
```

---

## 3. Metadata and Content Types

See detailed reference: [`references/metadata-content-types.md`](./references/metadata-content-types.md)

### List Site Content Types

```
GET /sites/{siteId}/contentTypes?$select=id,name,description,isBuiltIn
```

### Get List Columns (Schema)

```
GET /sites/{siteId}/lists/{listId}/columns?$select=id,name,displayName,columnGroup,type,required
```

### Batch PATCH Metadata (List Items)

Use `$batch` to update up to 20 items per request:

```http
POST https://graph.microsoft.com/v1.0/$batch
Content-Type: application/json

{
  "requests": [
    {
      "id": "1",
      "method": "PATCH",
      "url": "/sites/{siteId}/lists/{listId}/items/{itemId}/fields",
      "headers": { "Content-Type": "application/json" },
      "body": {
        "Department": "Finance",
        "ContentType": "Contract",
        "RetentionLabel": "7-Year"
      }
    }
  ]
}
```

### Apply a Content Type to a List Item

```http
PATCH /sites/{siteId}/lists/{listId}/items/{itemId}
Content-Type: application/json

{
  "contentType": { "id": "{contentTypeId}" }
}
```

### Managed Metadata (Term Store) Lookup

```
GET /sites/{siteId}/termStore/sets?$select=id,localizedNames
GET /sites/{siteId}/termStore/sets/{setId}/terms?$select=id,labels
```

Managed metadata fields expect the term GUID, not the display name:
```json
{ "MetadataColumn": { "TermGuid": "8b5e8b3a-...", "Label": "Finance" } }
```

---

## 4. Folder Governance

See detailed reference: [`references/folder-governance.md`](./references/folder-governance.md)

### Create a Folder

```http
POST /drives/{driveId}/items/{parentFolderId}/children
Content-Type: application/json

{
  "name": "2025-contracts",
  "folder": {},
  "@microsoft.graph.conflictBehavior": "rename"
}
```

### Move a File (Rename/Relocate)

```http
PATCH /drives/{driveId}/items/{itemId}
Content-Type: application/json

{
  "parentReference": { "id": "{targetFolderId}" },
  "name": "new-filename.docx"
}
```

### Delete a File (to Recycle Bin)

```http
DELETE /drives/{driveId}/items/{itemId}
```

This moves the item to the site recycle bin — **it is not permanent**. Items stay there for 93 days by default.

---

## 5. Throttling and Paging

See detailed reference: [`references/graph-api-patterns.md`](./references/graph-api-patterns.md)

### Throttling (429 Too Many Requests)

```javascript
async function callWithRetry(fn, maxRetries = 5) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (err.statusCode === 429) {
        const retryAfter = parseInt(err.headers?.['retry-after'] || '10', 10);
        await new Promise(r => setTimeout(r, retryAfter * 1000));
      } else {
        throw err;
      }
    }
  }
  throw new Error('Max retries exceeded');
}
```

### Batch Requests (up to 20 per batch)

```http
POST https://graph.microsoft.com/v1.0/$batch
Content-Type: application/json

{
  "requests": [
    { "id": "1", "method": "GET", "url": "/drives/{id1}/root/delta" },
    { "id": "2", "method": "GET", "url": "/drives/{id2}/root/delta" }
  ]
}
```

Batch responses include per-request status codes. Check each `responses[n].status`.

---

## 6. Progressive Disclosure — Reference Files

| Topic | File |
|-------|------|
| Graph API patterns, delta queries, batching, throttling | [`references/graph-api-patterns.md`](./references/graph-api-patterns.md) |
| Duplicate detection strategies — exact hash, near-duplicate, space savings | [`references/duplicate-detection.md`](./references/duplicate-detection.md) |
| Managed metadata, content types, term store, sensitivity labels | [`references/metadata-content-types.md`](./references/metadata-content-types.md) |
| Folder governance, naming conventions, depth limits, lifecycle rules | [`references/folder-governance.md`](./references/folder-governance.md) |
| Microsoft Search API — KQL, entity types, pagination, refiners, Bookmarks | [`references/search-api.md`](./references/search-api.md) |
| File version history — list, restore, delete, retention policies, co-authoring | [`references/version-history.md`](./references/version-history.md) |

---

## Required Permissions Summary

| Operation | Permission |
|-----------|-----------|
| Enumerate SharePoint sites/drives/files | `Sites.Read.All` |
| Enumerate current user's OneDrive | `Files.Read` (delegated) |
| Enumerate another user's OneDrive | `Files.Read.All` |
| Enumerate all users' OneDrives (tenant) | `Files.Read.All` + `User.Read.All` (app-only) |
| Update metadata / content types | `Sites.ReadWrite.All` or `Files.ReadWrite.All` |
| Move / rename files | `Sites.ReadWrite.All` or `Files.ReadWrite.All` |
| Delete files (to recycle bin) | `Sites.ReadWrite.All` |
| Term store (read) | `TermStore.Read.All` |
| Term store (write) | `TermStore.ReadWrite.All` |

---

## Error Handling Quick Reference

| Status | Cause | Action |
|--------|-------|--------|
| 400 | Bad OData filter or batch format | Fix query syntax |
| 401 | Expired or missing token | Re-authenticate |
| 403 | Insufficient permissions | Request required scopes |
| 404 | Item deleted or ID wrong | Skip or log, continue scan |
| 409 | Name conflict on move | Use `@microsoft.graph.conflictBehavior: rename` |
| 429 | Throttled | Back off using `Retry-After` header |
| 503 | Service unavailable | Exponential backoff, max 5 retries |
