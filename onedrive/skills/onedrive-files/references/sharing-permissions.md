# OneDrive Sharing & Permissions — Graph API Reference

## Overview

This reference covers all sharing and permissions operations for OneDrive items via Microsoft
Graph API. Topics include creating sharing links (view/edit/embed), adding drive permissions,
inherited vs direct permissions, password-protected links, expiry dates, and the sharingDetail API.

Base URL: `https://graph.microsoft.com/v1.0`

---

## API Endpoint Table

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|---------------------|----------------|-------|
| POST | `/me/drive/items/{itemId}/createLink` | `Files.ReadWrite` | `type`, `scope`, `expirationDateTime`, `password` | Create a sharing link |
| GET | `/me/drive/items/{itemId}/permissions` | `Files.Read` | `$select` | List all permissions on an item |
| GET | `/me/drive/items/{itemId}/permissions/{permId}` | `Files.Read` | — | Get a specific permission |
| POST | `/me/drive/items/{itemId}/invite` | `Files.ReadWrite` | `roles`, `recipients`, `message` | Grant access to specific people |
| PATCH | `/me/drive/items/{itemId}/permissions/{permId}` | `Files.ReadWrite` | `roles` | Update permission (change role) |
| DELETE | `/me/drive/items/{itemId}/permissions/{permId}` | `Files.ReadWrite` | — | Remove a permission |
| POST | `/shares/{encodedUrl}/driveItem/invite` | `Files.ReadWrite` | — | Add permissions via share URL |
| GET | `/shares/{encodedSharingUrl}` | `Files.Read` | — | Decode sharing URL to driveItem |

### Sharing Link Types and Scopes

| Link Type | Scope | Description |
|-----------|-------|-------------|
| `view` | `anonymous` | Anyone with link can view (read-only) |
| `view` | `organization` | Anyone in the org can view (read-only) |
| `edit` | `anonymous` | Anyone with link can edit (read-write) |
| `edit` | `organization` | Anyone in the org can edit (read-write) |
| `embed` | `anonymous` | Embeddable read-only link for web pages |

---

## Code Snippets

### TypeScript — Create a View Link (Anonymous)

```typescript
import { Client } from "@microsoft/microsoft-graph-client";

async function createViewLink(
  client: Client,
  itemId: string,
  expiryDays: number = 30
): Promise<string> {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + expiryDays);

  const body = {
    type: "view",
    scope: "anonymous",
    expirationDateTime: expiry.toISOString(),
  };

  const result = await client
    .api(`/me/drive/items/${itemId}/createLink`)
    .post(body);

  console.log(`Sharing URL: ${result.link.webUrl}`);
  return result.link.webUrl;
}
```

### TypeScript — Create an Edit Link (Organization-Scoped)

```typescript
async function createOrgEditLink(client: Client, itemId: string): Promise<string> {
  const result = await client
    .api(`/me/drive/items/${itemId}/createLink`)
    .post({
      type: "edit",
      scope: "organization",
    });

  return result.link.webUrl;
}
```

### TypeScript — Create Password-Protected Link

```typescript
async function createPasswordProtectedLink(
  client: Client,
  itemId: string,
  password: string,
  expiryDays: number = 7
): Promise<string> {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + expiryDays);

  const result = await client
    .api(`/me/drive/items/${itemId}/createLink`)
    .post({
      type: "view",
      scope: "anonymous",
      password: password,
      expirationDateTime: expiry.toISOString(),
    });

  // NOTE: The password is set but not returned in the response.
  // Store it securely and share separately from the URL.
  console.log(`Protected link: ${result.link.webUrl}`);
  return result.link.webUrl;
}
```

### TypeScript — Invite Specific Users (Direct Permission)

```typescript
async function inviteUsers(
  client: Client,
  itemId: string,
  emails: string[],
  role: "read" | "write" = "read",
  message: string = "I've shared a file with you."
): Promise<void> {
  const recipients = emails.map((email) => ({ email }));

  const result = await client
    .api(`/me/drive/items/${itemId}/invite`)
    .post({
      requireSignIn: true,
      sendInvitation: true,
      roles: [role],
      recipients,
      message,
    });

  for (const perm of result.value) {
    console.log(`Granted ${role} to: ${perm.grantedToV2?.user?.displayName}`);
  }
}
```

### TypeScript — List All Permissions on an Item

```typescript
interface DrivePermission {
  id: string;
  roles: string[];
  link?: { type: string; scope: string; webUrl: string };
  grantedToV2?: { user?: { displayName: string; email: string } };
  inheritedFrom?: { id: string; path: string };
  expirationDateTime?: string;
}

async function listPermissions(client: Client, itemId: string): Promise<DrivePermission[]> {
  const result = await client
    .api(`/me/drive/items/${itemId}/permissions`)
    .select("id,roles,link,grantedToV2,inheritedFrom,expirationDateTime")
    .get();

  for (const perm of result.value as DrivePermission[]) {
    if (perm.inheritedFrom) {
      console.log(`[INHERITED from ${perm.inheritedFrom.path}] roles: ${perm.roles.join(",")}`);
    } else {
      const who = perm.link ? `link(${perm.link.scope})` : perm.grantedToV2?.user?.email;
      console.log(`[DIRECT] ${who} — roles: ${perm.roles.join(",")}`);
    }
  }

  return result.value;
}
```

### TypeScript — Remove a Permission

```typescript
async function removePermission(
  client: Client,
  itemId: string,
  permissionId: string
): Promise<void> {
  await client
    .api(`/me/drive/items/${itemId}/permissions/${permissionId}`)
    .delete();
  console.log(`Permission ${permissionId} removed from item ${itemId}`);
}
```

### TypeScript — Update Permission Role

```typescript
async function updatePermissionRole(
  client: Client,
  itemId: string,
  permissionId: string,
  newRole: "read" | "write"
): Promise<void> {
  await client
    .api(`/me/drive/items/${itemId}/permissions/${permissionId}`)
    .patch({ roles: [newRole] });
  console.log(`Permission ${permissionId} updated to role: ${newRole}`);
}
```

### TypeScript — Resolve Sharing URL to DriveItem

```typescript
function encodeSharingUrl(url: string): string {
  // Graph API requires base64url encoding without padding
  const base64 = Buffer.from(url).toString("base64");
  return "u!" + base64.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

async function resolveSharedItem(client: Client, sharingUrl: string) {
  const encoded = encodeSharingUrl(sharingUrl);
  const result = await client
    .api(`/shares/${encoded}/driveItem`)
    .select("id,name,size,webUrl")
    .get();
  return result;
}
```

### PowerShell — Microsoft.Graph Module: Sharing Operations

```powershell
Connect-MgGraph -Scopes "Files.ReadWrite.All"

$driveId = (Get-MgDrive).Id
$itemId = "YOUR_ITEM_ID"

# Create a view link expiring in 7 days
$expiry = (Get-Date).AddDays(7).ToString("o")
$linkBody = @{
    type = "view"
    scope = "anonymous"
    expirationDateTime = $expiry
}
$link = New-MgDriveItemPermission -DriveId $driveId -DriveItemId $itemId `
    -BodyParameter @{ createLink = $linkBody }
Write-Host "Sharing URL: $($link.Link.WebUrl)"

# List all permissions
$permissions = Get-MgDriveItemPermission -DriveId $driveId -DriveItemId $itemId
foreach ($perm in $permissions) {
    if ($perm.InheritedFrom) {
        Write-Host "[INHERITED] Roles: $($perm.Roles -join ',')"
    } else {
        Write-Host "[DIRECT] Roles: $($perm.Roles -join ',')"
    }
}

# Remove a permission
Remove-MgDriveItemPermission -DriveId $driveId -DriveItemId $itemId -PermissionId "PERM_ID"
```

---

## Error Codes Table

| HTTP Status / Code | Meaning | Remediation |
|--------------------|---------|-------------|
| 400 BadRequest | Invalid link type, scope, or expiry format | Verify `type`, `scope`, and ISO 8601 `expirationDateTime` |
| 400 linkTypeNotSupported | Link type not supported for this drive type | Anonymous links may be disabled by tenant policy |
| 403 Forbidden | Insufficient permission to share | User must have `write` access to share; check drive permissions |
| 403 sharingNotEnabled | Sharing disabled by tenant policy | Contact SharePoint admin to enable external sharing |
| 403 sharingBypassRequiresPermission | Password/expiry setting requires additional permission | Verify `Files.ReadWrite.All` or admin consent |
| 404 ItemNotFound | Item not found | Verify item ID; item may have been deleted |
| 404 noSuchPermission | Permission ID not found | Permission may have been removed concurrently |
| 409 alreadyHasPermission | User already has a direct permission | Update existing permission rather than creating a new one |
| 423 LockFailed | Item is locked/checked out | Wait for checkout to complete |
| 429 TooManyRequests | Rate limit exceeded | Back off per `Retry-After` header |
| unauthenticatedLinksDisabled | Tenant has disabled anonymous links | Switch scope to `organization` |
| expirationNotSupported | Drive does not support expiry | Expiry not available on personal OneDrive without business license |

---

## Throttling Limits Table

| Resource | Limit | Retry Strategy |
|----------|-------|----------------|
| createLink calls | ~200 per 10 minutes per user | Cache link URLs; re-use existing links |
| invite calls | ~100 per 10 minutes per user | Batch recipients into a single invite call |
| Permissions list | Included in general 10,000 req/10 min limit | Use `$select` to reduce response size |
| Concurrent permission grants | No hard limit; throttle at ~50 concurrent | Queue grants; process in batches of 10 |
| Link expiry maximum | Up to 180 days for anonymous links (tenant configurable) | Set org policy for max expiry |
| Password length | 4–256 characters | Enforce minimum 8-character passwords in production |

---

## Common Patterns and Gotchas

### 1. Anonymous Links May Be Disabled by Tenant Policy

Before generating `scope: "anonymous"` links, check tenant sharing settings. If anonymous
sharing is disabled, the API returns `403 unauthenticatedLinksDisabled`. Fall back to
`scope: "organization"` links when this happens.

### 2. Inherited Permissions Cannot Be Removed via the Child Item

Permissions where `inheritedFrom` is set are inherited from a parent folder. You cannot delete
them from the child item directly — you must either remove the permission from the parent or
create an explicit "stop inheritance" operation (SharePoint only, via SharePoint REST API).

### 3. Creating a Link Is Idempotent for the Same Type/Scope Combination

If you call `createLink` multiple times with the same `type` and `scope`, Microsoft Graph
returns the same existing link rather than creating a new one. This is useful for "get or
create" link patterns. However, adding a password or changing the expiry creates a new link.

### 4. Password Is Write-Only — Never Returned in Responses

When creating a password-protected link, the `password` field is accepted but never returned
in any subsequent GET response. Store the password in a secrets manager (Azure Key Vault, etc.)
immediately after creating the link. There is no way to retrieve it later.

### 5. `requireSignIn` Must Be True for Role-Based Grants

When using `/invite` to grant direct permissions, `requireSignIn: true` is required for
business accounts. Setting it to `false` is only valid for anonymous sharing scenarios. Without
it, users invited with specific email addresses will still need to sign in.

### 6. `grantedToV2` vs `grantedTo` Property Names

In Graph API v1.0, use `grantedToV2` (not the older `grantedTo`) to get the complete user and
group information on permission objects. `grantedTo` is deprecated. Always use `grantedToV2` and
check for both `.user` and `.group` sub-properties.

### 7. Embed Links Require Specific Domain Allowlisting

`embed` type sharing links work only on domains that are explicitly allowlisted in the SharePoint
admin center under "Site collection features" → "Publishing". For personal OneDrive, embed links
work freely but may be blocked by content security policies on the embedding site.

### 8. Expiry Dates Are Enforced at Access Time

Setting an `expirationDateTime` on a link does not proactively invalidate it — the link simply
stops working when accessed after the expiry time. There is no webhook or event when a link
expires. Schedule audits if link hygiene is a compliance requirement.

### 9. Sharing Audit Logs Are in Microsoft Purview

All sharing events (link creation, permission grants, link access) are logged in the Microsoft
Purview Unified Audit Log under `SharePoint` workload activities. Use the Security & Compliance
PowerShell module to query: `Search-UnifiedAuditLog -RecordType SharePointFileOperation`.

### 10. SharingDetail API for Discovering All Shared Items

To enumerate all items shared by or with a user, use the search API with a filter rather than
iterating all drive items:

```
GET /me/drive/root/search(q='')$filter=shared ne null&$select=id,name,shared
```

The `shared` property on a DriveItem indicates when and by whom the item was last shared.
