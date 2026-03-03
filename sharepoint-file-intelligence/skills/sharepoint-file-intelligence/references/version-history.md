# Version History

Reference for SharePoint and OneDrive file version history via Microsoft Graph API — listing versions, restoring versions, version retention policies, major vs minor versions, co-authoring behavior, and programmatic version cleanup.

---

## Overview

SharePoint and OneDrive maintain version history for files in document libraries. Each save or check-in creates a new version. Versions consume storage quota and can be managed via Graph API or SharePoint Admin settings.

**Base endpoint pattern**: `/drives/{driveId}/items/{itemId}/versions`

---

## Key Endpoints

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|---|---|---|---|---|
| GET | `/drives/{driveId}/items/{itemId}/versions` | `Files.Read.All` | `$select`, `$top` | List all versions of an item |
| GET | `/drives/{driveId}/items/{itemId}/versions/{versionId}` | `Files.Read.All` | — | Get a specific version's metadata |
| GET | `/drives/{driveId}/items/{itemId}/versions/{versionId}/content` | `Files.Read.All` | — | Download specific version content |
| POST | `/drives/{driveId}/items/{itemId}/versions/{versionId}/restoreVersion` | `Files.ReadWrite.All` | JSON body (empty `{}`) | Restore item to a specific version |
| DELETE | `/drives/{driveId}/items/{itemId}/versions/{versionId}` | `Files.ReadWrite.All` | — | Delete a specific version |
| GET | `/sites/{siteId}/drives/{driveId}/items/{itemId}/versions` | `Sites.Read.All` | — | Via site context (same data) |

---

## List Versions

```http
GET https://graph.microsoft.com/v1.0/drives/{driveId}/items/{itemId}/versions
    ?$select=id,lastModifiedDateTime,size,lastModifiedBy
    &$orderby=lastModifiedDateTime desc
Authorization: Bearer {token}
```

Response structure:

```json
{
  "value": [
    {
      "id": "1.0",
      "lastModifiedDateTime": "2025-03-01T14:30:00Z",
      "size": 204800,
      "lastModifiedBy": {
        "user": { "displayName": "Jane Doe", "id": "user-guid" }
      }
    },
    {
      "id": "2.0",
      "lastModifiedDateTime": "2025-02-15T09:00:00Z",
      "size": 198656,
      "lastModifiedBy": {
        "user": { "displayName": "John Smith", "id": "user-guid-2" }
      }
    }
  ]
}
```

Version IDs are strings formatted as `1.0`, `2.0`, `3.0` etc. The **current version** is the most recently modified (lowest number = oldest).

---

## Get Specific Version

```http
GET https://graph.microsoft.com/v1.0/drives/{driveId}/items/{itemId}/versions/2.0
Authorization: Bearer {token}
```

---

## Download Version Content

```http
GET https://graph.microsoft.com/v1.0/drives/{driveId}/items/{itemId}/versions/2.0/content
Authorization: Bearer {token}
```

Returns a redirect (302) to a pre-authenticated download URL. Follow the redirect to download the binary content.

```typescript
// Node.js — download a specific version
const response = await client
  .api(`/drives/${driveId}/items/${itemId}/versions/${versionId}/content`)
  .responseType(ResponseType.RAW)
  .get();

// Response is a redirect — the SDK follows it automatically
const buffer = await response.arrayBuffer();
```

---

## Restore to Version

Restoring creates a new version that is a copy of the target version. The file history is preserved.

```http
POST https://graph.microsoft.com/v1.0/drives/{driveId}/items/{itemId}/versions/3.0/restoreVersion
Content-Type: application/json
Authorization: Bearer {token}

{}
```

Returns `204 No Content` on success.

```typescript
await client
  .api(`/drives/${driveId}/items/${itemId}/versions/${versionId}/restoreVersion`)
  .post({});

console.log(`Restored item ${itemId} to version ${versionId}`);
```

---

## Delete a Specific Version

```http
DELETE https://graph.microsoft.com/v1.0/drives/{driveId}/items/{itemId}/versions/2.0
Authorization: Bearer {token}
```

Returns `204 No Content`. The current version (most recent) cannot be deleted this way — delete the file itself to remove all versions.

---

## TypeScript Patterns

### List All Versions

```typescript
import { Client } from "@microsoft/microsoft-graph-client";

interface DriveItemVersion {
  id: string;
  lastModifiedDateTime: string;
  size: number;
  lastModifiedBy?: { user?: { displayName: string; id: string } };
}

export async function listVersions(
  client: Client,
  driveId: string,
  itemId: string
): Promise<DriveItemVersion[]> {
  const response = await client
    .api(`/drives/${driveId}/items/${itemId}/versions`)
    .select("id,lastModifiedDateTime,size,lastModifiedBy")
    .get();
  return response.value as DriveItemVersion[];
}
```

### Bulk Version Cleanup

Delete all versions older than N days, keeping the current version and the most recent N versions:

```typescript
export async function pruneVersions(
  client: Client,
  driveId: string,
  itemId: string,
  keepCount = 10
): Promise<{ deleted: number; kept: number }> {
  const versions = await listVersions(client, driveId, itemId);

  // Sort newest first; first item = current version (do not delete)
  const sorted = [...versions].sort(
    (a, b) => new Date(b.lastModifiedDateTime).getTime() - new Date(a.lastModifiedDateTime).getTime()
  );

  const toDelete = sorted.slice(keepCount); // Delete everything beyond keepCount
  let deleted = 0;

  for (const version of toDelete) {
    try {
      await client
        .api(`/drives/${driveId}/items/${itemId}/versions/${version.id}`)
        .delete();
      deleted++;
    } catch (err) {
      console.warn(`Could not delete version ${version.id} of item ${itemId}:`, err);
    }
  }

  return { deleted, kept: versions.length - deleted };
}
```

### PowerShell Version Cleanup

```powershell
Connect-MgGraph -Scopes "Files.ReadWrite.All"

$driveId   = "b!your-drive-id"
$itemId    = "01ABCDEFGHIJKLMNOPQRSTUVW"
$keepCount = 5

# Get all versions
$versions = Get-MgDriveItemVersion -DriveId $driveId -DriveItemId $itemId |
    Sort-Object LastModifiedDateTime -Descending

$toDelete = $versions | Select-Object -Skip $keepCount

foreach ($version in $toDelete) {
    Remove-MgDriveItemVersion -DriveId $driveId -DriveItemId $itemId -DriveItemVersionId $version.Id
    Write-Host "Deleted version $($version.Id) from $($version.LastModifiedDateTime)"
}
```

---

## Version Retention Policies

### SharePoint Document Library Settings

Version limits are configured per document library, not per file. There are three settings:

| Setting | Description | Default |
|---|---|---|
| `majorVersionLimit` | Maximum major versions to keep | 500 |
| `majorWithMinorVersionsLimit` | Number of major versions that retain their minor versions | 0 (no minor versions by default) |
| `requiresMinorVersions` | Whether minor versions are created on save (draft vs publish workflow) | false |

```http
# Get library versioning settings (via list resource)
GET https://graph.microsoft.com/v1.0/sites/{siteId}/lists/{listId}
    ?$select=id,name,list
```

The `list.contentTypesEnabled` and `list.template` fields describe the list type. Versioning settings are in `list.majorVersionLimit` (beta endpoint; not fully exposed in v1.0 via Graph).

For full versioning settings management, use SharePoint CSOM/PnP PowerShell:

```powershell
Connect-PnPOnline -Url https://contoso.sharepoint.com/sites/finance -Interactive
$library = Get-PnPList -Identity "Documents"

# View current settings
Write-Host "Major version limit: $($library.MajorVersionLimit)"
Write-Host "Minor versions retained: $($library.MajorWithMinorVersionsLimit)"

# Update limits
$library.MajorVersionLimit = 100
$library.MajorWithMinorVersionsLimit = 0  # Do not keep minor versions
$library.Update()
Invoke-PnPQuery
```

---

## Major vs Minor Versions

| Version Type | When Created | ID Format | Who Sees It |
|---|---|---|---|
| Major version | On publish (Check In as Major) or in libraries without approval | `1.0`, `2.0`, `3.0` | All users with Read access |
| Minor version | On save in libraries with minor versioning enabled (draft mode) | `0.1`, `1.1`, `2.1` | Only authors and approvers until published |

When a minor version is published, it becomes the next major version (e.g., `1.3` → `2.0`).

**Graph API behavior**: The Versions endpoint returns both major and minor versions. Minor versions have IDs like `"1.1"`. The `id` field in the version object indicates the version number.

---

## Co-Authoring and Version Creation

When multiple users edit a file simultaneously (co-authoring via Office Online):

- **Office Online co-authoring**: Does not create a version per save. Versions are created at periodic auto-save checkpoints (approximately every 30 minutes) and when the last user closes the document.
- **Upload-overwrite**: Uploading a file via `PUT /drives/{driveId}/root:/{path}:/content` always creates a new version.
- **Check-out/Check-in (classic)**: Creates explicit versions on each check-in. Requires library to have check-out enforcement enabled.

---

## OneDrive vs SharePoint Versioning Differences

| Behavior | SharePoint Document Library | OneDrive for Business |
|---|---|---|
| Default major version limit | 500 | 500 |
| Minor versions by default | No (depends on library) | No |
| Approval workflows | Yes (configurable) | No |
| Custom version limits per library | Yes (via admin/PnP) | No (tenant-wide only) |
| Version deletion by user | Yes (for their own files) | Yes |
| Admin override version limit | SharePoint Admin Center or PnP | OneDrive Admin Center |
| Delta endpoint includes version info | No (versions are separate API) | No (same) |
| Restore from version | Yes (Graph API) | Yes (Graph API) |

OneDrive for Business version limits can be set tenant-wide via the SharePoint Admin Center under OneDrive settings (since OneDrive uses SharePoint infrastructure).

---

## Version Storage and Quota Impact

Each version stores the full file, not a diff. For large files with frequent edits, versions can significantly consume quota.

```typescript
// Calculate total storage used by versions of a file
export async function calculateVersionStorage(
  client: Client,
  driveId: string,
  itemId: string
): Promise<{ versionCount: number; totalBytes: number; averageBytes: number }> {
  const versions = await listVersions(client, driveId, itemId);
  const totalBytes = versions.reduce((sum, v) => sum + (v.size ?? 0), 0);
  return {
    versionCount: versions.length,
    totalBytes,
    averageBytes: versions.length > 0 ? Math.round(totalBytes / versions.length) : 0,
  };
}
```

---

## Error Codes Table

| HTTP Status | Graph Code | Meaning | Remediation |
|---|---|---|---|
| 400 | `BadRequest` | Invalid version ID format | Use the exact `id` string returned by the list endpoint |
| 403 | `Authorization_RequestDenied` | Missing `Files.ReadWrite.All` for delete/restore | Verify scope; admin must consent |
| 404 | `Request_ResourceNotFound` | Version or item not found | Version may have been pruned automatically |
| 405 | `MethodNotAllowed` | Trying to delete current (latest) version | Cannot delete current version directly |
| 409 | `Conflict` | Restore failed due to active co-authoring session | Wait for co-authoring session to end |
| 423 | `Locked` | File is checked out | Check the file in before restoring a version |
| 429 | `TooManyRequests` | Throttled | Honor `Retry-After` header |
| 503 | `ServiceUnavailable` | Transient | Retry with exponential backoff |

---

## Throttling Limits

| Resource | Limit | Notes |
|---|---|---|
| `GET /versions` | 10,000 req / 10 min per app | Shared Graph throttle budget |
| `DELETE /versions/{id}` | 10,000 req / 10 min per app | Bulk cleanup: space out deletions |
| `POST /restoreVersion` | 10,000 req / 10 min per app | Restoration creates a new version (counts as write) |
| Maximum versions per file | 500 (default library limit) | Configurable per library up to 50,000 |
| Maximum minor versions retained | 0–499 major versions with minors | Depends on library `majorWithMinorVersionsLimit` setting |

---

## Common Gotchas

- **Version IDs are strings, not integers**: The `id` is `"1.0"`, `"2.0"`, etc. — always treat as strings, not numbers. Do not sort by parsing them as floats without testing.
- **Current version cannot be deleted via versions endpoint**: Attempting to `DELETE` the most recent version returns 405. To remove the current version, restore an older version (which adds a new current version) or delete the file.
- **Delta endpoint does not return version history**: The `/delta` endpoint (used for file enumeration) only returns the current state of each item, not historical versions. You must call the versions endpoint per-item separately.
- **Version content download uses a redirect**: The `/versions/{id}/content` endpoint returns HTTP 302. The Graph SDK follows this automatically, but if you use raw `fetch`, you must follow the redirect.
- **Restore creates, not replaces**: Restoring version `3.0` does not remove versions `4.0`, `5.0`, etc. It creates a new version that is a copy of `3.0`. All versions between the target and the new current are still retained and still consume quota.
- **Minor versions require library configuration**: Minor versions are only created when the document library has `EnableMinorVersions = true`. This is not the default on most libraries. Check before assuming minor version IDs will exist.
- **OneDrive personal (consumer) uses different API**: The Microsoft consumer OneDrive API (`api.onedrive.com`) is different from OneDrive for Business. This reference applies only to OneDrive for Business (Graph `v1.0`).
