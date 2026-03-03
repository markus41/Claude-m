# OneDrive Delta Sync — Graph API Reference

## Overview

This reference covers the delta() function for incremental change tracking in OneDrive via
Microsoft Graph API. It includes delta token handling, processing deleted items, syncing from
root vs folder, token persistence strategies, and conflict resolution patterns.

Delta queries are the correct approach for building sync clients — they are dramatically more
efficient than full re-enumeration on every cycle.

Base URL: `https://graph.microsoft.com/v1.0`

---

## API Endpoint Table

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|---------------------|----------------|-------|
| GET | `/me/drive/root/delta` | `Files.Read` | `$select`, `$top` | First-page full enumeration + delta token |
| GET | `/me/drive/root/delta?token={token}` | `Files.Read` | token (from previous response) | Incremental changes only |
| GET | `/me/drive/items/{folderId}/delta` | `Files.Read` | `$select`, `$top` | Delta for a specific folder subtree |
| GET | `/me/drive/root/delta?token=latest` | `Files.Read` | — | Get current delta token without full enumeration |
| GET | `/drives/{driveId}/root/delta` | `Files.Read` | — | Delta for a specific drive |

### Delta Response Link Properties

| Property | Meaning | Action |
|----------|---------|--------|
| `@odata.nextLink` | More results pages available | Follow to get next page (do not persist) |
| `@odata.deltaLink` | Final page — contains the delta token | Persist this URL for next sync cycle |

---

## Code Snippets

### TypeScript — Full Initial Sync

```typescript
import { Client } from "@microsoft/microsoft-graph-client";

interface SyncState {
  deltaLink: string | null;
  lastSynced: string | null;
}

async function initialSync(client: Client): Promise<SyncState> {
  let url = "/me/drive/root/delta?$select=id,name,size,file,folder,deleted,parentReference,lastModifiedDateTime";
  const items: Record<string, unknown>[] = [];

  while (url) {
    const response = await client.api(url).get();

    for (const item of response.value) {
      if (item.deleted) {
        console.log(`[DELETED] ${item.id}`);
      } else {
        console.log(`[ITEM] ${item.name} (${item.file ? "file" : "folder"})`);
        items.push(item);
      }
    }

    if (response["@odata.nextLink"]) {
      url = response["@odata.nextLink"];
    } else {
      // Final page — save deltaLink for next incremental sync
      const deltaLink = response["@odata.deltaLink"] as string;
      console.log(`Initial sync complete. ${items.length} items found.`);
      return {
        deltaLink,
        lastSynced: new Date().toISOString(),
      };
    }
  }

  return { deltaLink: null, lastSynced: null };
}
```

### TypeScript — Incremental Sync Using Stored Delta Token

```typescript
async function incrementalSync(
  client: Client,
  state: SyncState
): Promise<{ changes: unknown[]; newState: SyncState }> {
  if (!state.deltaLink) {
    throw new Error("No delta token — run initial sync first");
  }

  const changes: unknown[] = [];
  let url = state.deltaLink;

  while (url) {
    const response = await client.api(url).get();

    for (const item of response.value) {
      if (item.deleted) {
        changes.push({ type: "deleted", id: item.id });
        console.log(`[DELETED] ${item.id}`);
      } else if (item.file) {
        changes.push({ type: "file", item });
        console.log(`[CHANGED FILE] ${item.name}`);
      } else if (item.folder) {
        changes.push({ type: "folder", item });
        console.log(`[CHANGED FOLDER] ${item.name}`);
      }
    }

    if (response["@odata.nextLink"]) {
      url = response["@odata.nextLink"];
    } else {
      const newDeltaLink = response["@odata.deltaLink"] as string;
      return {
        changes,
        newState: {
          deltaLink: newDeltaLink,
          lastSynced: new Date().toISOString(),
        },
      };
    }
  }

  return { changes, newState: state };
}
```

### TypeScript — Get Latest Delta Token Without Full Enumeration

```typescript
async function getLatestDeltaToken(client: Client): Promise<string> {
  // Using token=latest skips the full enumeration and returns just the current state token
  const response = await client
    .api("/me/drive/root/delta?token=latest")
    .get();

  const deltaLink = response["@odata.deltaLink"] as string;
  console.log(`Got current delta token: ${deltaLink}`);
  return deltaLink;
}
```

### TypeScript — Folder-Scoped Delta (Track a Specific Folder)

```typescript
async function folderDeltaSync(
  client: Client,
  folderId: string,
  savedDeltaLink?: string
): Promise<{ items: unknown[]; deltaLink: string }> {
  let url = savedDeltaLink ?? `/me/drive/items/${folderId}/delta?$select=id,name,file,folder,deleted,parentReference`;
  const items: unknown[] = [];

  while (url) {
    const response = await client.api(url).get();

    for (const item of response.value) {
      items.push(item);
    }

    if (response["@odata.nextLink"]) {
      url = response["@odata.nextLink"];
    } else {
      return {
        items,
        deltaLink: response["@odata.deltaLink"] as string,
      };
    }
  }

  throw new Error("Delta sync did not return a deltaLink");
}
```

### TypeScript — Persist Delta State to Azure Blob Storage

```typescript
import { BlobServiceClient } from "@azure/storage-blob";

const CONTAINER = "sync-state";
const BLOB_NAME = "onedrive-delta-state.json";

async function loadDeltaState(blobClient: BlobServiceClient): Promise<SyncState> {
  try {
    const container = blobClient.getContainerClient(CONTAINER);
    const blob = container.getBlobClient(BLOB_NAME);
    const downloaded = await blob.downloadToBuffer();
    return JSON.parse(downloaded.toString()) as SyncState;
  } catch {
    return { deltaLink: null, lastSynced: null };
  }
}

async function saveDeltaState(
  blobClient: BlobServiceClient,
  state: SyncState
): Promise<void> {
  const container = blobClient.getContainerClient(CONTAINER);
  const blob = container.getBlockBlobClient(BLOB_NAME);
  const content = JSON.stringify(state);
  await blob.upload(content, content.length, {
    blobHTTPHeaders: { blobContentType: "application/json" },
  });
}
```

### TypeScript — Process Deleted Items Correctly

```typescript
interface LocalFileStore {
  delete(id: string): Promise<void>;
  upsert(item: unknown): Promise<void>;
}

async function applyDeltaChanges(
  changes: unknown[],
  store: LocalFileStore
): Promise<void> {
  // Process deletes first to free up path conflicts before upserts
  const deletes = changes.filter((c: any) => c.type === "deleted");
  const upserts = changes.filter((c: any) => c.type !== "deleted");

  for (const change of deletes as any[]) {
    await store.delete(change.id);
  }

  for (const change of upserts as any[]) {
    await store.upsert(change.item);
  }
}
```

### PowerShell — Simple Delta State Tracking

```powershell
Connect-MgGraph -Scopes "Files.Read.All"

$stateFile = "$env:TEMP\onedrive-delta-state.json"

function Get-DeltaState {
    if (Test-Path $stateFile) {
        return Get-Content $stateFile | ConvertFrom-Json
    }
    return @{ DeltaLink = $null }
}

function Save-DeltaState($state) {
    $state | ConvertTo-Json | Set-Content $stateFile
}

$state = Get-DeltaState
$url = if ($state.DeltaLink) { $state.DeltaLink } else {
    "https://graph.microsoft.com/v1.0/me/drive/root/delta?`$select=id,name,deleted,lastModifiedDateTime"
}

$changes = @()
do {
    $response = Invoke-MgGraphRequest -Uri $url -Method GET
    $changes += $response.value

    if ($response.'@odata.nextLink') {
        $url = $response.'@odata.nextLink'
    } elseif ($response.'@odata.deltaLink') {
        Save-DeltaState @{ DeltaLink = $response.'@odata.deltaLink' }
        $url = $null
    }
} while ($url)

Write-Host "Delta changes found: $($changes.Count)"
$changes | Where-Object { $_.deleted } | ForEach-Object { Write-Host "[DELETED] $($_.id)" }
$changes | Where-Object { -not $_.deleted } | ForEach-Object { Write-Host "[CHANGED] $($_.name)" }
```

---

## Error Codes Table

| HTTP Status / Code | Meaning | Remediation |
|--------------------|---------|-------------|
| 400 BadRequest | Malformed delta URL or invalid token format | Restart from initial sync if token is corrupted |
| 401 Unauthorized | Token expired mid-sync | Re-acquire access token; delta tokens survive token expiry |
| 403 Forbidden | Insufficient scope | Ensure `Files.Read` or `Files.Read.All` is granted |
| 404 ItemNotFound | Drive or root path not found | Verify the drive ID or use `/me/drive` |
| 410 Gone | Delta token expired | Token stale (typically >30 days) — restart with full enumeration |
| 429 TooManyRequests | Rate limited | Respect `Retry-After` header; delta is already efficient |
| 500 InternalServerError | Server error | Retry with backoff; do not discard delta token yet |
| resyncRequired | The delta state is invalid and a full resync is needed | Discard delta token and run full initial sync |
| deltaTokenNotFound | Token no longer valid | Restart initial sync |

---

## Throttling Limits Table

| Resource | Limit | Retry Strategy |
|----------|-------|----------------|
| Delta query requests | Counted against 10,000 req/10 min per app | Use `$top=1000` to reduce number of pages |
| Delta token lifetime | ~30 days of inactivity before expiry | Run sync at minimum every 7 days |
| Page size default | 200 items | Use `$top=1000` for fewer round trips |
| Maximum page size | 1000 items per page | Always follow `@odata.nextLink` |
| Folder delta scope | All descendants (recursive) | Scope to a sub-folder for large drives |

---

## Common Patterns and Gotchas

### 1. Delta Token vs Delta Link — Use the Full URL

The `@odata.deltaLink` is a full URL including the token embedded as a query parameter. Always
store the complete URL, not just the token portion. Extracting just the token and re-constructing
the URL is fragile and unnecessary.

### 2. `@odata.nextLink` Must Never Be Persisted as the Delta Token

During multi-page delta responses, `@odata.nextLink` appears on all pages except the last.
`@odata.deltaLink` only appears on the LAST page. Common mistake: persisting `nextLink` as if
it were the delta token. If your sync is interrupted mid-page, restart from the last saved
`deltaLink` (previous cycle), not the `nextLink`.

### 3. Deleted Items Have Only an `id` and `deleted` Property

When an item is deleted, the delta response includes only `{ "id": "...", "deleted": {} }`.
No name, no path. This means your local store must use the item ID as the primary key (not the
name or path) to identify which item to delete.

### 4. Moved Items Appear as "Added" in the New Location

When a file is moved from folder A to folder B, the delta returns the item with the new
`parentReference` — it does not return a "moved" event. Compare `parentReference.id` with your
local record to detect moves vs new items.

### 5. `token=latest` for Starting a Monitoring-Only Sync

If you want to monitor for future changes but do not need the current state (e.g., you already
have a full copy), use `token=latest` to get the current delta token without enumerating all
items. This avoids a potentially slow and large initial enumeration.

### 6. Root Delta vs Folder Delta

`/me/drive/root/delta` returns changes for the entire OneDrive. For large drives (thousands of
files), this can return huge responses. Use `/me/drive/items/{folderId}/delta` to scope tracking
to a specific folder and its subtree. Note: root-level renames affecting the scoped folder are
not reported in folder-scoped deltas.

### 7. Handle `resyncRequired` Without Data Loss

If you receive a `resyncRequired` error, the server is telling you to restart a full enumeration.
This is rare but happens after service migrations or very long inactivity. Before discarding your
local state and running a full resync, consider taking a snapshot of your current local data to
reconcile after the full sync completes.

### 8. Delta Responses Include All Changes — Apply in Correct Order

When processing delta changes, apply deletes before creates/updates to avoid path collision
errors if a new item is created at a path where a deleted item previously existed. Then process
folder creates before file creates.

### 9. Concurrent Sync Clients Can Cause Conflicts

If multiple agents run delta sync against the same drive simultaneously, they share the delta
token state. Use distributed locking (Redis, Azure Blob leases) to ensure only one sync agent
runs at a time per drive.

### 10. Pagination During Initial Sync Can Be Slow for Large Drives

For drives with 100,000+ items, the initial full enumeration can take minutes and involve
hundreds of pages. Use `$top=1000` to reduce round trips. Consider running the initial sync
asynchronously and processing pages as a stream rather than collecting all items first.
