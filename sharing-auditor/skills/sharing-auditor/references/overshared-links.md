# Overshared Links — SharePoint/OneDrive Reference

Overshared links expose files and folders to unintended audiences — anonymous users, entire organizations with edit rights, or external parties who no longer need access. This reference covers the Graph driveItem permissions API for identifying and remediating overshared links at scale.

---

## REST API Endpoints (Microsoft Graph)

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|----------------------|----------------|-------|
| GET | `/sites/{siteId}/drives` | `Sites.Read.All` | — | List document libraries in a site |
| GET | `/drives/{driveId}/root/children` | `Sites.Read.All` | `$select`, `$top` | List root folder items |
| GET | `/drives/{driveId}/items/{itemId}/children` | `Sites.Read.All` | `$select`, `$top` | List folder children |
| GET | `/drives/{driveId}/items/{itemId}/permissions` | `Sites.Read.All` | — | List item permissions |
| DELETE | `/drives/{driveId}/items/{itemId}/permissions/{permId}` | `Sites.ReadWrite.All` | — | Remove a permission |
| PATCH | `/drives/{driveId}/items/{itemId}/permissions/{permId}` | `Sites.ReadWrite.All` | Body: update | Modify permission (e.g., role) |
| POST | `/drives/{driveId}/items/{itemId}/invite` | `Sites.ReadWrite.All` | Body: invitation | Create specific-people sharing |
| GET | `/sites` | `Sites.Read.All` | `$search`, `$filter` | List/search sites |
| GET | `/sites/{siteId}` | `Sites.Read.All` | — | Get site details |
| GET | `/users/{id}/drives` | `Files.Read.All` | — | User's OneDrive |
| GET | `/users/{id}/drive/root/children` | `Files.Read.All` | — | User's OneDrive root |
| GET | `/drives/{driveId}/search(q='')` | `Sites.Read.All` | `q`, `$filter` | Search all files in drive |
| GET | `/reports/getSharePointSiteUsageDetail(period='D30')` | `Reports.Read.All` | — | Site sharing activity CSV |

**Base URL:** `https://graph.microsoft.com/v1.0`

---

## Permission Object Structure

```typescript
interface DriveItemPermission {
  id: string;                         // Permission ID for DELETE/PATCH
  roles: string[];                    // ['read'] | ['write'] | ['owner']
  link?: {
    type: 'view' | 'edit' | 'embed';
    scope: 'anonymous' | 'organization' | 'users';
    webUrl: string;
    preventsDownload: boolean;
    application?: { id: string; displayName: string };
  };
  grantedTo?: {                       // Present for direct user grants
    user: { id: string; displayName: string; email: string };
  };
  grantedToV2?: {                     // Preferred — includes identity types
    user?: { id: string; displayName: string; email: string };
    group?: { id: string; displayName: string; email: string };
    application?: { id: string; displayName: string };
    siteUser?: { loginName: string; displayName: string; email: string };
  };
  grantedToIdentitiesV2?: Array<{    // Multiple grantees on shared link
    user?: { id: string; displayName: string; email: string };
    siteUser?: { loginName: string; displayName: string; email: string };
  }>;
  hasPassword: boolean;               // Password-protected link
  expirationDateTime: string | null;  // null = never expires
  inheritedFrom?: {                   // Present if inherited from parent
    id: string; path: string;
  };
  createdDateTime: string;
  shareId: string;                    // Short link identifier
}
```

---

## Scan for Anonymous Links at Scale

```typescript
import { Client } from '@microsoft/microsoft-graph-client';

interface AnonLinkFinding {
  siteUrl: string;
  driveId: string;
  itemId: string;
  itemName: string;
  itemPath: string;
  permissionId: string;
  linkType: string;
  roles: string[];
  hasExpiry: boolean;
  expiresAt: string | null;
  hasPassword: boolean;
  createdAt: string;
}

// Scan all items in a drive for anonymous permissions
async function* scanDriveForAnonLinks(
  client: Client,
  driveId: string,
  siteUrl: string
): AsyncGenerator<AnonLinkFinding> {
  // Traverse drive items recursively
  const queue: string[] = ['root'];

  while (queue.length > 0) {
    const folderId = queue.shift()!;
    let childrenUrl = `/drives/${driveId}/items/${folderId}/children?$select=id,name,webUrl,folder&$top=200`;

    // Paginate through children
    while (childrenUrl) {
      const children = await client.api(childrenUrl).get();

      for (const item of children.value) {
        if (item.folder) {
          queue.push(item.id); // Add subfolder to queue
        }

        // Get permissions for this item
        const permsResult = await client
          .api(`/drives/${driveId}/items/${item.id}/permissions`)
          .get();

        for (const perm of permsResult.value) {
          if (perm.link?.scope === 'anonymous') {
            yield {
              siteUrl,
              driveId,
              itemId: item.id,
              itemName: item.name,
              itemPath: item.webUrl,
              permissionId: perm.id,
              linkType: `${perm.link.scope}/${perm.link.type}`,
              roles: perm.roles,
              hasExpiry: perm.expirationDateTime !== null,
              expiresAt: perm.expirationDateTime,
              hasPassword: perm.hasPassword,
              createdAt: perm.createdDateTime
            };
          }
        }
      }

      childrenUrl = children['@odata.nextLink'] || null;
    }
  }
}
```

---

## Organization-Wide "Edit" Link Detection

```typescript
// Detect organization-wide links with write access — unnecessarily broad
async function findOrgWideEditLinks(
  client: Client,
  driveId: string
): Promise<any[]> {
  const findings: any[] = [];
  const queue = ['root'];

  while (queue.length > 0) {
    const folderId = queue.shift()!;
    let url = `/drives/${driveId}/items/${folderId}/children?$top=200`;

    while (url) {
      const children = await client.api(url).get();
      for (const item of children.value) {
        if (item.folder) queue.push(item.id);

        const perms = await client
          .api(`/drives/${driveId}/items/${item.id}/permissions`)
          .get();

        for (const perm of perms.value) {
          if (
            perm.link?.scope === 'organization' &&
            perm.roles.includes('write')
          ) {
            findings.push({
              itemId: item.id,
              itemName: item.name,
              permissionId: perm.id,
              scope: 'organization',
              roles: perm.roles,
              expiresAt: perm.expirationDateTime
            });
          }
        }
      }
      url = children['@odata.nextLink'] || null;
    }
  }

  return findings;
}
```

---

## External Sharing by Site Collection

```powershell
Connect-SPOService -Url "https://contoso-admin.sharepoint.com"

# Sites with unrestricted external sharing (Anyone)
$riskysSites = Get-SPOSite -Limit All -IncludePersonalSite $false |
    Where-Object { $_.SharingCapability -eq "ExternalUserAndGuestSharing" } |
    Select-Object Url, Title, SharingCapability, ExternalUserCount, LastContentModifiedDate

$riskySites | Sort-Object ExternalUserCount -Descending | Format-Table -AutoSize

# Export to CSV for compliance review
$riskySites | Export-Csv -Path ".\risky-sites-$(Get-Date -Format 'yyyy-MM-dd').csv" -NoTypeInformation

# Find all sites with more than 10 external users
$highExternalSites = Get-SPOSite -Limit All -IncludePersonalSite $false |
    Where-Object { $_.ExternalUserCount -gt 10 } |
    Sort-Object ExternalUserCount -Descending

Write-Host "Sites with 10+ external users: $($highExternalSites.Count)"
```

---

## Anonymous Link Risk Matrix

| Combination | Risk Level | Action |
|-------------|------------|--------|
| `anonymous` + `edit` + no expiry + no password | CRITICAL | Revoke immediately |
| `anonymous` + `view` + no expiry + no password | HIGH | Set expiry or revoke |
| `anonymous` + `view` + expiry within 90 days + no password | MEDIUM | Review before expiry |
| `anonymous` + `view` + expiry + password | LOW | Acceptable for external sharing |
| `organization` + `edit` + no expiry | MEDIUM | Convert to specific-people or restrict |
| `organization` + `view` + no expiry | LOW | Acceptable internal sharing |
| `users` + `edit` + external user | MEDIUM | Verify need; set expiry |

---

## Identify Sharing Links Created Long Ago

```typescript
// Find anonymous links older than 90 days
const cutoffDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

const staleLinks = scanResults.filter(finding => {
  const created = new Date(finding.createdAt);
  return (
    finding.linkType.startsWith('anonymous') &&
    created < cutoffDate &&
    !finding.hasExpiry
  );
});

// Sort by age (oldest first)
staleLinks.sort(
  (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
);
```

---

## Check Sharing Capabilities at Tenant and Site Level

```typescript
// Get tenant-level sharing settings via SharePoint Admin REST API
async function getTenantSharingSettings(
  adminUrl: string,
  accessToken: string
): Promise<any> {
  const response = await fetch(
    `${adminUrl}/_api/SPO.Tenant/GetSharingCapability`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json;odata=verbose'
      }
    }
  );
  return response.json();
}

// Get site-level sharing settings via Graph
async function getSiteSharingCapability(
  client: Client,
  siteId: string
): Promise<string> {
  const site = await client
    .api(`/sites/${siteId}`)
    .select('id,displayName,sharingCapability')
    .get();

  return site.sharingCapability;
  // Returns: 'disabled' | 'existingExternalUserSharingOnly' |
  //          'externalUserSharingOnly' | 'externalUserAndGuestSharing'
}
```

---

## Error Codes

| Code | Meaning | Remediation |
|------|---------|-------------|
| 400 `InvalidRequest` | Malformed permission request | Check drive ID and item ID are both correct |
| 403 `AccessDenied` | Missing `Sites.ReadWrite.All` for DELETE | App requires `Sites.FullControl.All` to delete inherited permissions |
| 403 `Forbidden` | Cannot delete inherited permissions | Permissions inherited from parent cannot be deleted on child; break inheritance first |
| 404 `ItemNotFound` | Drive item not found | Item may have been deleted; verify item ID |
| 404 `PermissionNotFound` | Permission ID not found | Permission may already have been deleted |
| 409 `Conflict` | Cannot modify external sharing when disabled | Site external sharing must be enabled before sharing |
| 429 `TooManyRequests` | Graph API throttled | Add `Retry-After` delay; reduce parallel requests |

---

## Limits

| Resource | Limit | Notes |
|----------|-------|-------|
| Items per `children` response | 200 (max `$top`) | Paginate large folders |
| Sites per tenant | Thousands | Use `$filter` and `$top` to paginate site list |
| Permissions per item | No documented limit | Large permission sets indicate oversharing |
| Graph concurrent requests | 4 per app per user | Use sequential for safety; or use batching |
| SharePoint Admin site list | 10,000 per API call | Use `$skiptoken` for pagination |
| Anonymous link expiry max | Tenant-configured (default unlimited) | Set via `Set-SPOTenant -RequireAnonymousLinksExpireInDays` |
| Graph batch request size | 20 requests per batch | Use `$batch` endpoint for efficiency |

---

## Common Patterns and Gotchas

1. **Inheritance breaks performance** — Items with unique permissions (broken inheritance) require individual permission reads. Items with inherited permissions inherit from their parent. Checking inheritance status before scanning individual items saves API calls.

2. **Permission flooding** — Large file libraries with broken inheritance on many items can have thousands of individual permission objects. Filter to items with `link.scope eq 'anonymous'` via SharePoint search before Graph permission reads.

3. **Site drive IDs change** — SharePoint site drive IDs can change after site restore or migration. Do not hardcode drive IDs in long-running automation. Always look up the drive ID from the site ID at runtime.

4. **Paginating permissions** — The permissions endpoint does not use `$top` for pagination. It returns all permissions for an item in one response. However, items with many permissions (100+) indicate a governance problem.

5. **Deleted items retain permissions** — When a file is moved to the Recycle Bin, sharing links continue to exist but are inactive. Permanently deleted items have no permissions. Include `?includedeletedItems=true` in drive queries if you need to audit recycle bin items.

6. **External sharing via group membership** — Files shared with a SharePoint group that contains external users are not captured by `link.scope = 'anonymous'` checks. Also query group membership to identify external members.

7. **OneDrive vs SharePoint drives** — OneDrive personal drives are accessible via `/users/{id}/drive`. SharePoint team site drives are accessible via `/sites/{siteId}/drives`. Always identify which type of drive you are scanning.

8. **Preview links** — Some sharing links have `link.type = 'embed'` — these allow embedding but are typically view-only. Still flag if `link.scope = 'anonymous'`.

9. **Graph batching for efficiency** — When scanning many items for permissions, use the `/$batch` endpoint to send up to 20 permission reads in one HTTP request. This reduces scan time by 10x.

10. **SharePoint-specific vs Graph permissions** — SharePoint has its own permission model (design, contribute, read) mapped to Graph roles (read, write, owner). A Graph `write` role in SharePoint corresponds to "Edit" permission level — members can add/delete files.
