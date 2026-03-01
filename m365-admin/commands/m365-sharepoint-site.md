---
name: m365-sharepoint-site
description: SharePoint site operations — create site, manage permissions, set sharing policy, associate with hub site.
argument-hint: "<operation> [--url <siteUrl>] [--template <team|communication>] [--hub <hubUrl>] [--sharing <level>]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
---

# SharePoint Site Operations

Manage SharePoint Online sites using Microsoft Graph API, SharePoint REST API, and PnP PowerShell.

## Operations

### Create Site
Create a new modern SharePoint site collection.

**Uses**: SharePoint Admin REST API (`/_api/SPSiteManager/create`)

Arguments:
- `--title <name>`: Site title
- `--url <siteUrl>`: Full site URL (e.g., `https://contoso.sharepoint.com/sites/my-site`)
- `--template <team|communication>`: Site template (team = `STS#3`, communication = `SITEPAGEPUBLISHING#0`)
- `--owner <upn>`: Site owner UPN
- `--description <text>`: Site description
- `--site-design <designId>`: Site design GUID to apply

### Manage Permissions
View or modify site permissions.

**Uses**: Graph API -- `/sites/{id}/permissions` (app permissions), PnP PowerShell (user permissions)

Arguments:
- `--url <siteUrl>`: Target site URL
- `--action <list|grant|revoke>`: Permission action
- `--user <upn>`: User to grant/revoke
- `--role <read|write|owner>`: Permission level

### Set Sharing Policy
Configure external sharing settings for a site.

**Uses**: PnP PowerShell (`Set-PnPSite -SharingCapability`)

Arguments:
- `--url <siteUrl>`: Target site URL
- `--sharing <Disabled|ExistingExternalUserSharingOnly|ExternalUserSharingOnly|ExternalUserAndGuestSharing>`: Sharing level

### Hub Site Association
Associate a site with a hub site or manage hub registration.

**Uses**: PnP PowerShell

Arguments:
- `--url <siteUrl>`: Site to associate
- `--hub <hubUrl>`: Hub site URL
- `--action <associate|disassociate|register|unregister>`: Hub action

### Storage Quota
View or set storage quota for a site.

**Uses**: PnP PowerShell

Arguments:
- `--url <siteUrl>`: Target site URL
- `--quota <sizeInMB>`: New storage quota in MB
- `--warning <sizeInMB>`: Warning level in MB

## Workflow

1. **Validate** -- Check site URL format, verify tenant admin permissions, check for URL conflicts
2. **Execute** -- Perform the requested operation
3. **Verify** -- Confirm the operation completed (site accessible, permissions applied)
4. **Report** -- Markdown report with operation details and status

## Important Notes

- Site creation is NOT available via Microsoft Graph -- use SharePoint Admin REST API
- Graph API site permissions are primarily for application-level access, not user permissions
- User-level permissions on SharePoint sites should use PnP PowerShell
- Site sharing level cannot exceed tenant-level sharing policy
- Hub site registration requires SharePoint Administrator or Global Administrator
- Communication sites support different layouts: Topic, Showcase, Blank
- Team sites are typically connected to an M365 group (created via M365 group creation)
- Reference: `skills/m365-admin/references/sharepoint-admin.md` for all SharePoint operations
- Reference: `skills/m365-admin/examples/sharepoint-operations.md` for code examples
