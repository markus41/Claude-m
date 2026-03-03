---
name: OneDrive File Management
description: >
  Deep expertise in OneDrive personal and business file management via Microsoft Graph API —
  upload, download, share, search, manage permissions, sync status, and delta queries for
  change tracking across OneDrive and OneDrive for Business.
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
triggers:
  - onedrive
  - file upload
  - file download
  - sharing link
  - file search
  - drive item
  - delta query
  - onedrive sync
  - file permissions
  - large file upload
  - resumable upload
---

# OneDrive File Management

## OneDrive Overview

Microsoft OneDrive provides personal and business cloud file storage integrated with Microsoft 365. The Microsoft Graph API exposes full programmatic control over OneDrive content.

**OneDrive Personal** is tied to a Microsoft Account (consumer). **OneDrive for Business** is tied to a Microsoft 365 work or school account and backed by SharePoint document libraries. While both use the same Graph API surface, business accounts have additional admin controls, retention policies, and compliance features.

## Microsoft Graph API — Drive Endpoints

Base URL: `https://graph.microsoft.com/v1.0`

### Drive Discovery

| Endpoint | Description |
|----------|-------------|
| `/me/drive` | Current user's default OneDrive |
| `/me/drives` | All drives accessible to the current user |
| `/users/{userId}/drive` | Another user's OneDrive (admin) |
| `/groups/{groupId}/drive` | Group's document library |
| `/sites/{siteId}/drive` | SharePoint site's default document library |
| `/drives/{driveId}` | Specific drive by ID |

### Item Operations

| Operation | Method | Endpoint |
|-----------|--------|----------|
| List children | GET | `/me/drive/root/children` or `/me/drive/items/{itemId}/children` |
| Get item | GET | `/me/drive/items/{itemId}` |
| Get by path | GET | `/me/drive/root:/{path}` |
| Create folder | POST | `/me/drive/items/{parentId}/children` with `folder: {}` |
| Delete item | DELETE | `/me/drive/items/{itemId}` |
| Move/rename | PATCH | `/me/drive/items/{itemId}` with `parentReference` and/or `name` |
| Copy item | POST | `/me/drive/items/{itemId}/copy` |
| Search | GET | `/me/drive/root/search(q='{query}')` |

### Upload Patterns

**Simple upload** (< 4 MB):
```
PUT /me/drive/items/{parentId}:/{filename}:/content
Content-Type: application/octet-stream

<file bytes>
```

**Resumable upload** (> 4 MB, up to 250 GB):
1. Create upload session: `POST /me/drive/items/{parentId}:/{filename}:/createUploadSession`
2. Upload chunks with `PUT` to the returned `uploadUrl`, using `Content-Range` headers.
3. Chunk size must be a multiple of 320 KiB (327,680 bytes). Recommended: 5-10 MB per chunk.
4. On final chunk, the API returns the completed `driveItem`.

**Upload to path**:
```
PUT /me/drive/root:/path/to/file.txt:/content
```

### Sharing

| Operation | Method | Endpoint |
|-----------|--------|----------|
| Create sharing link | POST | `/me/drive/items/{itemId}/createLink` |
| List permissions | GET | `/me/drive/items/{itemId}/permissions` |
| Grant access | POST | `/me/drive/items/{itemId}/invite` |
| Remove permission | DELETE | `/me/drive/items/{itemId}/permissions/{permId}` |

**Sharing link types**: `view` (read-only), `edit` (read-write), `embed` (embeddable).
**Scope**: `anonymous` (anyone with link), `organization` (org members only), `users` (specific people).

### Delta Queries (Change Tracking)

Track changes to a drive or folder over time:

```
GET /me/drive/root/delta
```

Returns a list of changed items and a `@odata.deltaLink`. Store the deltaLink and use it on subsequent calls to get only changes since the last query. This is the foundation for building sync clients.

### Search

```
GET /me/drive/root/search(q='quarterly report')
```

Searches file names, metadata, and file content (for indexed types like Office documents and PDFs). Results include `@search.score` for relevance ranking. Supports KQL (Keyword Query Language) in OneDrive for Business.

## Authentication & Scopes

OneDrive operations require these Microsoft Graph delegated permissions:

| Scope | Description |
|-------|-------------|
| `Files.Read` | Read user's files |
| `Files.ReadWrite` | Read and write user's files |
| `Files.Read.All` | Read all files the user can access |
| `Files.ReadWrite.All` | Read and write all files the user can access |
| `Sites.Read.All` | Read SharePoint sites (for OneDrive for Business) |
| `offline_access` | Maintain access (refresh tokens) |

For application-level access (daemon/service), use `Files.ReadWrite.All` as an application permission with admin consent.

## Common Patterns

### Pagination
List operations return pages of results. Check for `@odata.nextLink` in the response and follow it to get subsequent pages. Default page size is 200 items.

### Conflict Handling
Upload and move operations support `@microsoft.graph.conflictBehavior`:
- `rename` — Auto-rename the new item (e.g., `file (1).txt`)
- `replace` — Overwrite the existing item
- `fail` — Return a 409 Conflict error

### Thumbnails
Get thumbnails for image and document files:
```
GET /me/drive/items/{itemId}/thumbnails
```

Returns small, medium, and large thumbnail URLs.

### Special Folders
Access well-known folders:
```
GET /me/drive/special/{name}
```
Names: `documents`, `photos`, `cameraroll`, `approot`, `music`.

## Best Practices

- Always use resumable upload for files over 4 MB to handle network interruptions.
- Use delta queries instead of full re-listing for sync scenarios — dramatically reduces API calls.
- Cache the `deltaLink` between sync cycles.
- Use `$select` to request only needed properties and reduce payload size.
- Use `$expand=children` sparingly — prefer explicit children listing for large folders.
- Set appropriate conflict behavior on uploads to avoid accidental overwrites.
- For batch operations, use the Microsoft Graph JSON batching endpoint (`POST /$batch`) to send up to 20 requests in a single HTTP call.

## Reference Files

| Reference | Path | Content |
|-----------|------|---------|
| Graph Drive API | `references/graph-drive-api.md` | Complete endpoint reference with request/response examples |
| Sharing Patterns | `references/sharing-patterns.md` | Link creation, permission management, external sharing |
| Delta Sync | `references/delta-sync.md` | Change tracking patterns and sync client architecture |
| Large File Upload | `references/large-file-upload.md` | Resumable upload session handling and chunking |

## Example Files

| Example | Path | Content |
|---------|------|---------|
| File Operations | `examples/file-operations.md` | Upload, download, move, copy, delete examples |
| Sharing Workflows | `examples/sharing-workflows.md` | Create links, invite users, manage permissions |
| Sync Client | `examples/sync-client.md` | Delta query-based change tracking implementation |
| Batch Operations | `examples/batch-operations.md` | Graph batch API for bulk file operations |

## Progressive Disclosure — Reference Files

| Topic | File |
|---|---|
| DriveItem CRUD, upload/download, copy/move, folder management, search, versioning, thumbnails | [`references/file-operations.md`](./references/file-operations.md) |
| Sharing links (view/edit/embed), direct permissions, password-protected links, expiry, inherited vs direct | [`references/sharing-permissions.md`](./references/sharing-permissions.md) |
| Delta function, incremental sync, delta tokens, deleted item handling, token persistence, conflict resolution | [`references/delta-sync.md`](./references/delta-sync.md) |
| Upload session creation, chunked upload, resume interrupted uploads, progress tracking, 250 GB limit | [`references/large-file-upload.md`](./references/large-file-upload.md) |
