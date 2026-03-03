# Microsoft Loop — Workspaces & Pages

## Workspace Architecture

Loop workspaces are backed by **Fluid containers** stored in Microsoft's cloud storage.
Internally, each workspace maps to:

- A **fileStorage container** in Microsoft Graph (container type = Loop)
- A **OneDrive drive** (the workspace's document library)
- A **SharePoint site** (for permissions and compliance)

The Loop app URL format: `https://loop.microsoft.com/r/s/workspace/{encodedId}`

---

## Graph API — Workspace Operations

Base URL: `https://graph.microsoft.com/v1.0`

### Loop Container Type ID

Before making API calls, retrieve the Loop container type ID for your tenant:

```http
GET https://graph.microsoft.com/v1.0/storage/fileStorage/containerTypes
    ?$filter=ownerAppId eq 'a187e399-0c36-4b98-8f04-1efc167a35d6'
```

The `ownerAppId` `a187e399-0c36-4b98-8f04-1efc167a35d6` is the Microsoft Loop app ID.
Store the returned `containerTypeId` as an environment variable or app constant.

```typescript
// TypeScript — get Loop container type ID
const containerTypes = await graphClient
  .api('/storage/fileStorage/containerTypes')
  .filter("ownerAppId eq 'a187e399-0c36-4b98-8f04-1efc167a35d6'")
  .get();
const loopContainerTypeId = containerTypes.value[0].id;
```

---

### Create Workspace

```http
POST https://graph.microsoft.com/v1.0/storage/fileStorage/containers
Content-Type: application/json
Authorization: Bearer {token}

{
  "displayName": "Q2 Product Launch",
  "description": "Planning workspace for Q2 product launch — engineering + marketing",
  "containerTypeId": "{loopContainerTypeId}"
}
```

**Response:**
```json
{
  "id": "b!abc123...",
  "displayName": "Q2 Product Launch",
  "description": "Planning workspace for Q2 product launch...",
  "containerTypeId": "...",
  "status": "active",
  "webUrl": "https://loop.microsoft.com/r/s/...",
  "createdDateTime": "2026-03-03T10:00:00Z",
  "createdBy": { "user": { "displayName": "Markus Ahling", "id": "..." } }
}
```

Store the `id` for all subsequent operations on this workspace.

---

### List Workspaces

```http
GET https://graph.microsoft.com/v1.0/storage/fileStorage/containers
    ?$filter=containerTypeId eq '{loopContainerTypeId}'
    &$select=id,displayName,description,webUrl,status,createdDateTime,createdBy
    &$top=50
    &$orderby=createdDateTime desc
```

**TypeScript:**
```typescript
const containers = await graphClient
  .api('/storage/fileStorage/containers')
  .filter(`containerTypeId eq '${loopContainerTypeId}'`)
  .select('id,displayName,description,webUrl,status,createdDateTime')
  .top(50)
  .orderby('createdDateTime desc')
  .get();

for (const workspace of containers.value) {
  console.log(`${workspace.displayName}: ${workspace.webUrl}`);
}
```

---

### Get Workspace Details

```http
GET https://graph.microsoft.com/v1.0/storage/fileStorage/containers/{containerId}
```

---

### Delete (Deactivate) Workspace

Loop workspaces transition to `inactive` before permanent deletion (30-day grace period):

```http
DELETE https://graph.microsoft.com/v1.0/storage/fileStorage/containers/{containerId}
```

Sets status to `inactive`. After 30 days, permanently deleted.

To restore within grace period:
```http
POST https://graph.microsoft.com/v1.0/storage/fileStorage/containers/{containerId}/restore
```

---

### Workspace Permissions

Add a member to a workspace:

```http
POST https://graph.microsoft.com/v1.0/storage/fileStorage/containers/{containerId}/permissions
Content-Type: application/json

{
  "roles": ["writer"],
  "grantedToV2": {
    "user": {
      "id": "{userId}"
    }
  }
}
```

**Roles:** `reader`, `writer`, `owner`

List permissions:
```http
GET https://graph.microsoft.com/v1.0/storage/fileStorage/containers/{containerId}/permissions
```

---

## Graph API — Page Operations

Pages are stored as `.loop` files (MIME type `application/fluid`) in the workspace's drive.

### Get Workspace Drive

```http
GET https://graph.microsoft.com/v1.0/storage/fileStorage/containers/{containerId}/drive
```

Returns the `driveId` needed for all item operations.

---

### List Pages

```http
GET https://graph.microsoft.com/v1.0/storage/fileStorage/containers/{containerId}/drive/root/children
    ?$select=id,name,webUrl,createdDateTime,lastModifiedDateTime,size,createdBy,lastModifiedBy
```

**TypeScript:**
```typescript
const pages = await graphClient
  .api(`/storage/fileStorage/containers/${containerId}/drive/root/children`)
  .select('id,name,webUrl,createdDateTime,lastModifiedDateTime,createdBy')
  .get();

for (const page of pages.value) {
  console.log(`${page.name}: ${page.webUrl} (modified: ${page.lastModifiedDateTime})`);
}
```

---

### Create a Page

```http
POST https://graph.microsoft.com/v1.0/drives/{driveId}/items/{parentItemId}/children
Content-Type: application/json

{
  "name": "Sprint 12 Planning.loop",
  "file": {},
  "@microsoft.graph.conflictBehavior": "rename"
}
```

Note: The page body content is set via the Fluid Framework, not the Graph API directly.
The Graph API creates the file entry; Loop app initializes the Fluid document on first open.

---

### Move / Rename a Page

```http
PATCH https://graph.microsoft.com/v1.0/drives/{driveId}/items/{itemId}
Content-Type: application/json

{
  "name": "Sprint 12 Planning — FINAL.loop"
}
```

---

### Copy a Page

```http
POST https://graph.microsoft.com/v1.0/drives/{driveId}/items/{itemId}/copy
Content-Type: application/json

{
  "parentReference": {
    "driveId": "{driveId}",
    "id": "{destinationFolderId}"
  },
  "name": "Sprint 13 Planning.loop"
}
```

Returns `202 Accepted` with a `Location` header for polling the async copy operation.

---

## Page Design Patterns

### Recommended Page Structures

**Sprint Planning Page:**
```
# Sprint 12 Planning

## Goals
[Loop task list — 3-5 sprint goals with owners]

## Backlog Items
[Loop table — columns: Item, Priority, Owner, Status, Story Points]

## Decisions
[Loop Q&A component — open questions + decisions made]

## Links
- [Design specs] [Code repo] [Previous sprint retro]
```

**Weekly Standup Page:**
```
# Week of March 3, 2026

## Monday - Friday

### [Date]
[Loop task list — what's done, what's in progress, blockers per person]
```

**Project Retrospective:**
```
# Sprint 12 Retro

## What went well
[Loop voting table — team adds items, votes on top wins]

## What to improve
[Loop voting table — improvement suggestions + votes]

## Action items
[Loop task list — owners + due dates]
```

---

## Workspace Templates

Loop provides built-in templates (Project, Meeting notes, etc.) accessible from the Loop app.
To use programmatically, create a page and apply content via the Fluid document API
(available via `@fluidframework/azure-client` or Loop app deep links).

**Deep link to create page from template:**
```
https://loop.microsoft.com/r/s/{workspaceId}?createPage=true&template={templateId}
```

Template IDs (common):
- `project` — Project planning template
- `meeting` — Meeting notes template
- `brainstorm` — Brainstorming session template

---

## Workspace Sections

Sections are virtual groupings of pages within a workspace (displayed as folders in the Loop app).
Create a section via the drive API:

```http
POST https://graph.microsoft.com/v1.0/drives/{driveId}/root/children
Content-Type: application/json

{
  "name": "Engineering",
  "folder": {}
}
```

Then create pages inside the section folder.

---

## Limits

| Resource | Limit |
|---|---|
| Workspaces per user | No published limit (governed by storage quota) |
| Pages per workspace | No published limit |
| Workspace storage | Shared tenant storage (same pool as OneDrive/SharePoint) |
| Max file size (.loop) | 250 MB (same as OneDrive item limit) |
| Graph API request rate | 10,000 requests per 10 minutes per app |
| Pagination (`$top`) | Max 200 items per page |

---

## Error Codes

| HTTP Code | Error | Cause | Fix |
|---|---|---|---|
| 400 | `InvalidRequest` | Missing `containerTypeId` or invalid workspace ID | Verify container type ID is correct for tenant |
| 403 | `Forbidden` | Missing `FileStorageContainer.Selected` permission | Add permission in app registration |
| 403 | `AccessDenied` | User not a member of the workspace | Add user via `/permissions` endpoint |
| 404 | `ItemNotFound` | Workspace or page does not exist | Verify container ID / drive item ID |
| 409 | `Conflict` | Workspace name already exists | Use unique name or `@microsoft.graph.conflictBehavior: rename` |
| 429 | `TooManyRequests` | Throttled | Respect `Retry-After` header; add exponential backoff |
| 503 | `ServiceUnavailable` | Loop service unavailable | Retry with exponential backoff (max 3 attempts) |

---

## Production Gotchas

- **Container type ID is tenant-specific** — always look it up dynamically; never hardcode it.
- **Pages are async on first open** — creating a `.loop` file via Graph creates the metadata, but
  the Fluid document is initialized when the page is first opened in the Loop app. Don't attempt
  to read content immediately after creating via API.
- **Workspace deletion is soft** — DELETE transitions to `inactive`, not immediate destruction.
  Build cleanup workflows around the 30-day grace period.
- **Permissions are separate from M365 groups** — workspace membership is managed per-workspace,
  not inherited from Teams or SharePoint groups. Manage via `/permissions` API.
- **Guest access requires tenant-level enablement** — external users can only join workspaces if
  the Loop guest access setting is enabled in M365 admin center.
