# SharePoint Online Administration

This reference covers SharePoint Online administration using Microsoft Graph API, SharePoint REST API, and PnP PowerShell. Graph handles site discovery, permissions, and document library operations. SharePoint Admin REST and PnP PowerShell are required for site creation, storage quotas, hub sites, and sharing policies.

## Sites via Microsoft Graph

### Search Sites

Find sites by keyword.

**Endpoint**: `GET https://graph.microsoft.com/v1.0/sites?search={keyword}`

**Required scope**: `Sites.Read.All` or `Sites.FullControl.All`

```typescript
interface SiteCollection {
  value: Site[];
}

interface Site {
  id: string;                    // siteCollectionId,siteId format
  name: string;
  displayName: string;
  description: string;
  webUrl: string;
  createdDateTime: string;
  lastModifiedDateTime: string;
  root: Record<string, never>;   // empty object if root site
  siteCollection: {
    hostname: string;
  };
}
```

### Get Site by Path

Access a site by its server-relative path.

```
GET https://graph.microsoft.com/v1.0/sites/{hostname}:{serverRelativePath}
```

Examples:

```
GET /sites/contoso.sharepoint.com:/sites/marketing
GET /sites/contoso.sharepoint.com:/sites/hr-portal
GET /sites/contoso.sharepoint.com:  (root site)
```

### Get Site by ID

```
GET https://graph.microsoft.com/v1.0/sites/{siteId}
```

### List Subsites

```
GET https://graph.microsoft.com/v1.0/sites/{siteId}/sites
```

## Site Permissions

Graph supports application-level permissions on sites. This is primarily used for granting app-only access to specific sites rather than user permissions.

### List Site Permissions

```
GET https://graph.microsoft.com/v1.0/sites/{siteId}/permissions
```

**Required scope**: `Sites.FullControl.All`

```typescript
interface SitePermission {
  id: string;
  roles: string[];              // "read", "write", "owner"
  grantedToIdentitiesV2: Array<{
    application?: {
      id: string;
      displayName: string;
    };
    user?: {
      id: string;
      displayName: string;
    };
  }>;
}
```

### Grant Site Permission (Application)

```
POST https://graph.microsoft.com/v1.0/sites/{siteId}/permissions
Content-Type: application/json

{
  "roles": ["write"],
  "grantedToIdentities": [
    {
      "application": {
        "id": "app-client-id",
        "displayName": "My Integration App"
      }
    }
  ]
}
```

### Update Site Permission

```
PATCH https://graph.microsoft.com/v1.0/sites/{siteId}/permissions/{permissionId}
Content-Type: application/json

{
  "roles": ["read"]
}
```

### Delete Site Permission

```
DELETE https://graph.microsoft.com/v1.0/sites/{siteId}/permissions/{permissionId}
```

## Document Libraries (Drives)

### List Document Libraries

```
GET https://graph.microsoft.com/v1.0/sites/{siteId}/drives
```

**Required scope**: `Sites.Read.All`

```typescript
interface Drive {
  id: string;
  name: string;
  description: string;
  driveType: "documentLibrary" | "personal";
  webUrl: string;
  createdDateTime: string;
  lastModifiedDateTime: string;
  quota: {
    total: number;
    used: number;
    remaining: number;
    deleted: number;
    state: "normal" | "nearing" | "critical" | "exceeded";
  };
  owner: {
    group?: { id: string; displayName: string };
    user?: { id: string; displayName: string };
  };
}
```

### Browse Drive Contents

```
GET https://graph.microsoft.com/v1.0/sites/{siteId}/drives/{driveId}/root/children
GET https://graph.microsoft.com/v1.0/sites/{siteId}/drives/{driveId}/root:/{path}:/children
```

### Create Folder

```
POST https://graph.microsoft.com/v1.0/sites/{siteId}/drives/{driveId}/root/children
Content-Type: application/json

{
  "name": "New Folder",
  "folder": {},
  "@microsoft.graph.conflictBehavior": "rename"
}
```

### Drive Item Permissions

```
GET https://graph.microsoft.com/v1.0/sites/{siteId}/drives/{driveId}/items/{itemId}/permissions
```

Grant sharing permission to a drive item:

```
POST https://graph.microsoft.com/v1.0/sites/{siteId}/drives/{driveId}/items/{itemId}/invite
Content-Type: application/json

{
  "recipients": [
    { "email": "user@contoso.com" }
  ],
  "roles": ["read"],
  "requireSignIn": true,
  "sendInvitation": false
}
```

## Site Creation via SharePoint Admin REST

Microsoft Graph does not support creating new site collections. Use the SharePoint Admin REST API.

**Endpoint**: `POST https://{tenant}-admin.sharepoint.com/_api/SPSiteManager/create`

### Create Modern Team Site

```typescript
interface CreateSiteRequest {
  request: {
    Title: string;
    Url: string;
    Lcid: number;           // Language (1033 = English)
    ShareByEmailEnabled: boolean;
    Description: string;
    WebTemplate: string;    // "STS#3" for team site, "SITEPAGEPUBLISHING#0" for communication site
    SiteDesignId: string;   // GUID of site design to apply
    Owner: string;          // UPN of site owner
  };
}
```

**Team site** (WebTemplate: `STS#3`):

```json
{
  "request": {
    "Title": "Engineering Portal",
    "Url": "https://contoso.sharepoint.com/sites/engineering",
    "Lcid": 1033,
    "ShareByEmailEnabled": false,
    "Description": "Engineering team collaboration site",
    "WebTemplate": "STS#3",
    "Owner": "admin@contoso.com"
  }
}
```

**Communication site** (WebTemplate: `SITEPAGEPUBLISHING#0`):

```json
{
  "request": {
    "Title": "Company News",
    "Url": "https://contoso.sharepoint.com/sites/news",
    "Lcid": 1033,
    "ShareByEmailEnabled": false,
    "Description": "Company-wide news and announcements",
    "WebTemplate": "SITEPAGEPUBLISHING#0",
    "SiteDesignId": "6142d2a0-63a5-4ba0-aede-d9fefca2c767",
    "Owner": "admin@contoso.com"
  }
}
```

## Sharing Policies

SharePoint sharing is controlled at the tenant and site level.

### External Sharing Levels

| Level | Value | Description |
|---|---|---|
| Disabled | `0` | No external sharing allowed |
| ExistingExternalUserSharingOnly | `1` | Only with guests already in directory |
| ExternalUserSharingOnly | `2` | Require sign-in (new guests invited) |
| ExternalUserAndGuestSharing | `3` | Anyone (including anonymous links) |

### PnP PowerShell for Sharing Policy

```powershell
# Set tenant-level sharing
Set-PnPTenant -SharingCapability ExternalUserSharingOnly

# Set site-level sharing (cannot exceed tenant level)
Set-PnPSite -Identity "https://contoso.sharepoint.com/sites/marketing" -SharingCapability ExternalUserSharingOnly

# Get current sharing setting
Get-PnPSite -Identity "https://contoso.sharepoint.com/sites/marketing" | Select-Object SharingCapability
```

## Storage Quotas

### PnP PowerShell

```powershell
# Get site storage usage
Get-PnPTenantSite -Identity "https://contoso.sharepoint.com/sites/marketing" | Select-Object Url, StorageQuota, StorageUsageCurrent

# Set storage quota (in MB)
Set-PnPTenantSite -Identity "https://contoso.sharepoint.com/sites/marketing" -StorageQuota 5120 -StorageQuotaWarningLevel 4096

# List all sites with storage
Get-PnPTenantSite | Select-Object Url, StorageQuota, StorageUsageCurrent, Template | Sort-Object StorageUsageCurrent -Descending
```

## Hub Sites

Hub sites connect related sites for unified navigation and search.

### Register a Hub Site

```powershell
# Register a site as a hub site
Register-PnPHubSite -Site "https://contoso.sharepoint.com/sites/engineering-hub"

# Set hub site properties
Set-PnPHubSite -Identity "https://contoso.sharepoint.com/sites/engineering-hub" -Title "Engineering Hub" -Description "Central hub for all engineering sites" -LogoUrl "https://contoso.sharepoint.com/sites/engineering-hub/SiteAssets/logo.png"

# Associate a site with a hub
Add-PnPHubSiteAssociation -Site "https://contoso.sharepoint.com/sites/team-alpha" -HubSite "https://contoso.sharepoint.com/sites/engineering-hub"

# Remove hub association
Remove-PnPHubSiteAssociation -Site "https://contoso.sharepoint.com/sites/team-alpha"

# List all hub sites
Get-PnPHubSite | Select-Object SiteUrl, Title, Description

# List sites associated with a hub
Get-PnPHubSite -Identity "https://contoso.sharepoint.com/sites/engineering-hub" | Select-Object -ExpandProperty AssociatedSites

# Unregister a hub site
Unregister-PnPHubSite -Site "https://contoso.sharepoint.com/sites/engineering-hub"
```

## Site Designs and Templates

Site designs apply predefined configurations when creating new sites.

```powershell
# List available site designs
Get-PnPSiteDesign | Select-Object Id, Title, WebTemplate, Description

# Get site design details
Get-PnPSiteDesign -Identity "design-guid"

# Apply a site design to an existing site
Invoke-PnPSiteDesign -Identity "design-guid" -WebUrl "https://contoso.sharepoint.com/sites/marketing"

# Create a custom site script
$siteScript = @"
{
  "`$schema": "https://developer.microsoft.com/json-schemas/sp/site-design-script-actions.schema.json",
  "actions": [
    { "verb": "createSPList", "listName": "Project Tasks", "templateType": 171 },
    { "verb": "addNavLink", "url": "/sites/engineering-hub", "displayName": "Engineering Hub", "isWebRelative": false }
  ],
  "version": 1
}
"@

Add-PnPSiteScript -Title "Engineering Site Setup" -Content $siteScript -Description "Standard engineering site configuration"

# Create site design using the script
Add-PnPSiteDesign -Title "Engineering Team Site" -WebTemplate "64" -SiteScripts "script-guid" -Description "Engineering team site with standard lists"
```

WebTemplate values for site designs: `"64"` = Team site, `"68"` = Communication site.

## PnP PowerShell Connection Patterns

```powershell
# Install PnP PowerShell (one-time)
Install-Module -Name PnP.PowerShell -Force -AllowClobber

# Interactive login to a site
Connect-PnPOnline -Url "https://contoso.sharepoint.com/sites/marketing" -Interactive

# Interactive login to admin center
Connect-PnPOnline -Url "https://contoso-admin.sharepoint.com" -Interactive

# Certificate-based login (for automation)
Connect-PnPOnline -Url "https://contoso.sharepoint.com" -ClientId "app-id" -Tenant "contoso.onmicrosoft.com" -CertificatePath "./cert.pfx" -CertificatePassword (ConvertTo-SecureString "password" -AsPlainText -Force)

# Disconnect
Disconnect-PnPOnline
```

**Important**: PnP PowerShell uses its own registered Azure AD app ("PnP Management Shell") for interactive login. For production automation, register a dedicated app with certificate-based auth and grant it the necessary SharePoint API permissions.

## Permissions Audit

Enumerate all permissions across a site for security review.

### PnP PowerShell Audit

```powershell
# Get all site users and their permissions
Get-PnPSiteCollectionAdmin | Select-Object Title, Email

# Get all unique permissions on the site
Get-PnPList | ForEach-Object {
    $list = $_
    if ($list.HasUniqueRoleAssignments) {
        Get-PnPListItem -List $list -PageSize 500 | Where-Object { $_.HasUniqueRoleAssignments } | ForEach-Object {
            Get-PnPProperty -ClientObject $_ -Property RoleAssignments
            $_.RoleAssignments | ForEach-Object {
                Get-PnPProperty -ClientObject $_ -Property Member, RoleDefinitionBindings
                [PSCustomObject]@{
                    List    = $list.Title
                    Item    = $_.Member.Title
                    Role    = ($_.RoleDefinitionBindings | Select-Object -ExpandProperty Name) -join ", "
                }
            }
        }
    }
}

# Get external sharing links
Get-PnPSharingLink -List "Documents" | Select-Object Url, LinkKind, Expiration, Scope
```

### Graph-Based Permission Check

```typescript
interface PermissionAuditEntry {
  siteUrl: string;
  siteName: string;
  permissionId: string;
  roles: string[];
  grantedTo: string;
  grantedToType: "user" | "application" | "group";
}

// Fetch permissions for a specific site
// GET /sites/{siteId}/permissions
// Iterate through all sites from GET /sites?search=* for a full audit
```

## Sensitivity Labels

Apply sensitivity labels to SharePoint sites for information protection.

```powershell
# Set sensitivity label on a site
Set-PnPSite -Identity "https://contoso.sharepoint.com/sites/confidential-project" -SensitivityLabel "Confidential"

# Get current sensitivity label
Get-PnPSite -Identity "https://contoso.sharepoint.com/sites/confidential-project" | Select-Object SensitivityLabel

# List available sensitivity labels (requires Security & Compliance PowerShell)
# Labels are configured in Microsoft Purview compliance portal
```

Sensitivity labels can enforce:
- External sharing restrictions
- Privacy settings (Public/Private)
- Conditional access policies
- Default sharing link type

## Content Type Hub

Manage content types across site collections using the content type hub.

```powershell
# Get content types for a site
Get-PnPContentType | Select-Object Name, Id, Group

# Add a content type from the hub to a list
Add-PnPContentTypeToList -List "Documents" -ContentType "Project Document"

# Sync content type updates from hub
$ct = Get-PnPContentType -Identity "Project Document"
Sync-PnPContentType -ContentType $ct
```

Via Graph API:

```
GET https://graph.microsoft.com/v1.0/sites/{siteId}/contentTypes
GET https://graph.microsoft.com/v1.0/sites/{siteId}/lists/{listId}/contentTypes
```

## Site Collection App Catalog

Deploy apps to specific site collections.

```powershell
# Add a site collection app catalog
Add-PnPSiteCollectionAppCatalog -Site "https://contoso.sharepoint.com/sites/marketing"

# Deploy an app
Add-PnPApp -Path "./my-app.sppkg" -Scope Site -Overwrite

# Remove site collection app catalog
Remove-PnPSiteCollectionAppCatalog -Site "https://contoso.sharepoint.com/sites/marketing"
```

## Site Lifecycle Management

```powershell
# Lock a site (read-only)
Set-PnPTenantSite -Identity "https://contoso.sharepoint.com/sites/old-project" -LockState "ReadOnly"

# Unlock a site
Set-PnPTenantSite -Identity "https://contoso.sharepoint.com/sites/old-project" -LockState "Unlock"

# Archive (no-access lock)
Set-PnPTenantSite -Identity "https://contoso.sharepoint.com/sites/old-project" -LockState "NoAccess"

# Delete a site
Remove-PnPTenantSite -Url "https://contoso.sharepoint.com/sites/old-project" -Force

# Restore deleted site (from recycle bin, within 93 days)
Restore-PnPTenantSite -Identity "https://contoso.sharepoint.com/sites/old-project"
```
