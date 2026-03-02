---
name: sharing-auditor
description: >
  Deep expertise in SharePoint and OneDrive external sharing auditing — sharing links,
  guest users, anonymous access, external sharing policies, tenant-level controls,
  access reviews, safe revocation patterns, and paginated Graph API scanning.
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
triggers:
  - sharing audit
  - external sharing
  - anonymous links
  - guest users
  - overshared
  - sharing links
  - sharepoint sharing
  - onedrive sharing
  - external access review
  - identity data risk review
---

# SharePoint/OneDrive External Sharing Auditor

## Shared Workflow Routing
- Use the shared workflow spec for deterministic multi-plugin routing: [`workflows/multi-plugin-workflows.md`](../../../workflows/multi-plugin-workflows.md#identitydata-risk-review-entra-id-security--purview-compliance--sharing-auditor).
- Apply the trigger phrases, handoff contracts, auth prerequisites, validation checkpoints, and stop conditions before escalating to the next plugin.


This skill provides comprehensive knowledge for auditing and managing external sharing across SharePoint and OneDrive via Graph API and SharePoint PowerShell, with a focus on safe remediation that avoids accidental data loss.

## Base URL

```
https://graph.microsoft.com/v1.0
```

All Graph API endpoints below are relative to this base URL.

## API Endpoints

### Drive Item Permissions

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/sites/{siteId}/drives/{driveId}/items/{itemId}/permissions` | List sharing permissions on a file/folder |
| DELETE | `/sites/{siteId}/drives/{driveId}/items/{itemId}/permissions/{permId}` | Remove a sharing permission |
| PATCH | `/sites/{siteId}/drives/{driveId}/items/{itemId}/permissions/{permId}` | Update a permission (e.g., change role) |
| POST | `/sites/{siteId}/drives/{driveId}/items/{itemId}/invite` | Create sharing invitation |

### Guest User Management

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/users?$filter=userType eq 'Guest'` | List all guest users |
| GET | `/users/{guestId}` | Get guest user details |
| DELETE | `/users/{guestId}` | Remove guest user |
| GET | `/users/{guestId}/memberOf` | List guest's group memberships |

### Site Sharing Configuration

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/sites/{siteId}` | Get site details including sharing settings |
| GET | `/sites?search={keyword}` | Search for sites |
| GET | `/sites/{siteId}/drives` | List document libraries |
| GET | `/sites/{siteId}/permissions` | List site-level permissions |

### Access Reviews (Beta)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/beta/identityGovernance/accessReviews/definitions` | Create access review |
| GET | `/beta/identityGovernance/accessReviews/definitions` | List access reviews |
| GET | `/beta/identityGovernance/accessReviews/definitions/{id}/instances/{id}/decisions` | Get review decisions |

## Sharing Link Types

| Type | `link.scope` Value | Risk Level | Description |
|------|-------------------|------------|-------------|
| Anonymous | `anonymous` | High | Anyone with the link, no sign-in required |
| Organization | `organization` | Low | Anyone in the tenant |
| Specific people (internal) | `users` | Low | Named internal users only |
| Specific people (external) | `users` | Medium | Named external guests |
| Company-wide + edit | `organization` | Medium | Everyone in org with edit rights |

### Permission Link Response Example

```json
{
  "id": "perm-id-abc123",
  "roles": ["read"],
  "link": {
    "scope": "anonymous",
    "type": "view",
    "webUrl": "https://contoso.sharepoint.com/:b:/s/project/abc123",
    "preventsDownload": false
  },
  "grantedToIdentitiesV2": [],
  "hasPassword": false,
  "expirationDateTime": null,
  "createdDateTime": "2025-11-15T08:30:00Z"
}
```

**Key risk indicators in permission objects:**
- `link.scope` = `anonymous` — anyone can access without sign-in
- `expirationDateTime` = `null` — link never expires
- `hasPassword` = `false` — no password protection
- `roles` includes `write` or `owner` — edit access to external parties

## SharePoint Tenant Sharing Policies

### SharingCapability Values

| Value | Description | Risk Level |
|-------|-------------|------------|
| `Disabled` | No external sharing allowed | None |
| `ExistingExternalUserSharingOnly` | Only existing guest accounts | Low |
| `ExternalUserSharingOnly` | New and existing guests (no anonymous links) | Medium |
| `ExternalUserAndGuestSharing` | Anyone, including anonymous links | High |

### SharePoint PowerShell Commands

```powershell
# Connect to SharePoint admin
Connect-SPOService -Url "https://contoso-admin.sharepoint.com"

# Get tenant-level sharing settings
Get-SPOTenant | Select-Object SharingCapability, DefaultSharingLinkType,
  DefaultLinkPermission, RequireAnonymousLinksExpireInDays,
  ExternalUserExpirationRequired, ExternalUserExpireInDays

# Get site-level sharing settings
Get-SPOSite -Identity "https://contoso.sharepoint.com/sites/project" |
  Select-Object SharingCapability, SharingAllowedDomainList,
  SharingBlockedDomainList, DefaultSharingLinkType

# List external users for a site
Get-SPOExternalUser -SiteUrl "https://contoso.sharepoint.com/sites/project"
```

### Tenant Policy Enum Reference

| Setting | Values | Description |
|---------|--------|-------------|
| `DefaultSharingLinkType` | `None`, `Direct`, `Internal`, `AnonymousAccess` | Default link type when sharing |
| `DefaultLinkPermission` | `None`, `View`, `Edit` | Default permission for new links |
| `FileAnonymousLinkType` | `View`, `Edit` | Anonymous link permission for files |
| `FolderAnonymousLinkType` | `View`, `Edit` | Anonymous link permission for folders |
| `RequireAnonymousLinksExpireInDays` | Integer (0 = no expiry) | Anonymous link expiry |
| `ExternalUserExpireInDays` | Integer | Guest access expiry |

## Guest User Health Checks

### Stale Guest Detection (90+ Days Inactive)

```
GET /users?$filter=userType eq 'Guest' and signInActivity/lastSignInDateTime le 2025-12-01T00:00:00Z
  &$select=displayName,mail,userPrincipalName,signInActivity,createdDateTime,externalUserState
  &$count=true
  &$orderby=signInActivity/lastSignInDateTime asc
Header: ConsistencyLevel: eventual
```

### Guest Accounts Pending Redemption

```
GET /users?$filter=userType eq 'Guest' and externalUserState eq 'PendingAcceptance'
  &$select=displayName,mail,createdDateTime,externalUserState
  &$count=true
Header: ConsistencyLevel: eventual
```

### External User State Values

| State | Description |
|-------|-------------|
| `PendingAcceptance` | Invitation sent but not redeemed |
| `Accepted` | Guest has redeemed invitation |

## Pagination Pattern

All list endpoints may return paginated results. Follow `@odata.nextLink` to fetch additional pages:

```javascript
let allResults = [];
let url = "/users?$filter=userType eq 'Guest'&$top=100";

while (url) {
  const response = await client.api(url).get();
  allResults.push(...response.value);
  url = response["@odata.nextLink"] || null;
}
```

**Important:** Always paginate when scanning guest users or permissions — tenants may have thousands of guests.

## Safe Remediation Principles

1. **Never hard-delete** sharing links without owner approval
2. **Generate approval tasks** instead of immediate revocation
3. **Notify the file owner** before any link is removed
4. **Provide context** — show what the link grants access to and who has used it
5. **Batch by owner** — group findings by file owner for efficient review
6. **Snapshot before change** — record the permission object before deletion

## Revocation Patterns

### Remove a Sharing Permission

```
DELETE /sites/{siteId}/drives/{driveId}/items/{itemId}/permissions/{permissionId}
```

### Remove a Guest User

```
DELETE /users/{guestUserId}
```

### Disable Anonymous Links at Site Level

```powershell
Set-SPOSite -Identity "https://contoso.sharepoint.com/sites/project" -SharingCapability ExternalUserSharingOnly
```

### Set Link Expiration Policy

```powershell
Set-SPOTenant -RequireAnonymousLinksExpireInDays 30
```

## Required Permissions

| Operation | Permission / Role |
|-----------|-------------------|
| Read sharing links | `Sites.Read.All` or `Sites.ReadWrite.All` |
| Remove permissions | `Sites.ReadWrite.All` |
| List guest users | `User.Read.All` |
| Read sign-in activity | `AuditLog.Read.All` + `User.Read.All` |
| Delete guest users | `User.ReadWrite.All` |
| SharePoint admin settings | SharePoint Administrator role |
| Access reviews | `AccessReview.ReadWrite.All` |

## Error Handling

| Status Code | Meaning | Common Cause |
|-------------|---------|--------------|
| 400 Bad Request | Malformed request | Invalid OData filter syntax, bad `$filter` on signInActivity |
| 401 Unauthorized | Authentication failure | Expired token, missing `Authorization` header |
| 403 Forbidden | Insufficient permissions | App lacks `Sites.Read.All` or SharePoint Admin role |
| 404 Not Found | Resource not found | Invalid site ID, deleted file, removed guest |
| 409 Conflict | Operation conflict | Guest user has active access review in progress |
| 429 Too Many Requests | Throttled | Implement exponential backoff with `Retry-After` header |

### ConsistencyLevel Requirement

Queries using `$count`, `$search`, or advanced filters on `signInActivity` require:
```
Header: ConsistencyLevel: eventual
```

Without this header, the API returns `400 Bad Request`.

## Common Audit Patterns

### Pattern 1: Full External Sharing Audit

1. `Get-SPOTenant` — check tenant-level sharing policy
2. `Get-SPOSite -Limit All` — list all sites with their sharing capability
3. For each site with `ExternalUserAndGuestSharing`: scan `GET .../permissions` for anonymous links
4. `GET /users?$filter=userType eq 'Guest'` — enumerate all guest accounts
5. Cross-reference guests with site permissions to identify orphaned access
6. Produce report grouped by risk level (High: anonymous, Medium: guest, Low: internal)

### Pattern 2: Stale Guest Cleanup

1. `GET /users?$filter=userType eq 'Guest' and signInActivity/lastSignInDateTime le {90daysAgo}` — find stale guests
2. For each stale guest: `GET /users/{id}/memberOf` — list group memberships
3. Generate approval tasks for guest removal, grouped by the internal sponsor
4. After approval: `DELETE /users/{guestId}` — remove guest accounts
5. Verify removal: re-run guest query to confirm count reduction

### Pattern 3: Anonymous Link Remediation

1. Identify sites with `SharingCapability = ExternalUserAndGuestSharing`
2. Scan all drive items for permissions where `link.scope = 'anonymous'`
3. Flag links with no expiration (`expirationDateTime = null`)
4. Generate owner notification with link details and access history
5. After owner review: `DELETE .../permissions/{id}` to remove approved links
6. `Set-SPOSite -SharingCapability ExternalUserSharingOnly` — downgrade site policy

### Pattern 4: Tenant Sharing Policy Hardening

1. Audit current tenant settings: `Get-SPOTenant`
2. Set anonymous link expiration: `Set-SPOTenant -RequireAnonymousLinksExpireInDays 30`
3. Set guest expiration: `Set-SPOTenant -ExternalUserExpirationRequired $true -ExternalUserExpireInDays 90`
4. Set default link type to internal: `Set-SPOTenant -DefaultSharingLinkType Internal`
5. Block specific external domains: `Set-SPOTenant -SharingBlockedDomainList "competitor.com"`
6. Verify changes and document in change log

## OData Filter Reference

| Filter | Purpose | Example |
|--------|---------|---------|
| Guest users | Find all guests | `$filter=userType eq 'Guest'` |
| Stale guests | Inactive 90+ days | `$filter=userType eq 'Guest' and signInActivity/lastSignInDateTime le 2025-12-01` |
| Pending guests | Never redeemed | `$filter=userType eq 'Guest' and externalUserState eq 'PendingAcceptance'` |
| Sort by activity | Least active first | `$orderby=signInActivity/lastSignInDateTime asc` |
| With count | Include total count | `$count=true` (requires `ConsistencyLevel: eventual`) |
