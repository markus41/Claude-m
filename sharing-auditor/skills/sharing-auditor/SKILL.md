---
name: sharing-auditor
description: Deep expertise in SharePoint and OneDrive external sharing auditing — sharing links, guest users, anonymous access, external sharing policies, and safe revocation patterns.
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
---

# SharePoint/OneDrive External Sharing Auditor

This skill provides knowledge for auditing and managing external sharing across SharePoint and OneDrive, with a focus on safe remediation that avoids accidental data loss.

## Sharing Link Types

| Type | Description | Risk Level |
|---|---|---|
| Anonymous | Anyone with the link, no sign-in required | High |
| Organization | Anyone in the organization | Low |
| Specific people (internal) | Named internal users | Low |
| Specific people (external) | Named external guests | Medium |
| Company-wide + edit | Everyone in org can edit | Medium |

## Scanning APIs

### List Sharing Links for a Drive Item
```
GET https://graph.microsoft.com/v1.0/sites/{siteId}/drives/{driveId}/items/{itemId}/permissions
```

### List External Users (Guests)
```
GET https://graph.microsoft.com/v1.0/users?$filter=userType eq 'Guest'&$select=displayName,mail,userPrincipalName,signInActivity,createdDateTime
```

### SharePoint Sharing Report (PnP PowerShell)
```powershell
Connect-PnPOnline -Url "https://contoso.sharepoint.com/sites/project" -Interactive
Get-PnPSharingForNonOwnersOfSite
Get-PnPExternalUser -SiteUrl "https://contoso.sharepoint.com/sites/project"
```

### Site-Level Sharing Settings
```powershell
# SharePoint Admin
Connect-SPOService -Url "https://contoso-admin.sharepoint.com"
Get-SPOSite -Identity "https://contoso.sharepoint.com/sites/project" | Select-Object SharingCapability, SharingAllowedDomainList, SharingBlockedDomainList
```

### Sharing Capability Values
| Value | Description |
|---|---|
| Disabled | No external sharing |
| ExistingExternalUserSharingOnly | Only existing guests |
| ExternalUserSharingOnly | New and existing guests (no anonymous) |
| ExternalUserAndGuestSharing | Anyone, including anonymous links |

## Guest User Health Checks

### Stale Guest Detection
Guests who haven't signed in for 90+ days:
```
GET https://graph.microsoft.com/v1.0/users?$filter=userType eq 'Guest' and signInActivity/lastSignInDateTime le {90daysAgo}
```

### Guest Accounts Without Redemption
Guests who were invited but never accepted:
```
GET https://graph.microsoft.com/v1.0/users?$filter=userType eq 'Guest' and externalUserState eq 'PendingAcceptance'
```

## Safe Remediation Principles

1. **Never hard-delete** sharing links without owner approval
2. **Generate approval tasks** instead of immediate revocation
3. **Notify the file owner** before any link is removed
4. **Provide context** — show what the link grants access to and who has used it
5. **Batch by owner** — group findings by file owner for efficient review

## Revocation Patterns

### Remove a Sharing Permission
```
DELETE https://graph.microsoft.com/v1.0/sites/{siteId}/drives/{driveId}/items/{itemId}/permissions/{permissionId}
```

### Remove a Guest User
```
DELETE https://graph.microsoft.com/v1.0/users/{guestUserId}
```

### Disable Anonymous Links at Site Level
```powershell
Set-SPOSite -Identity "https://contoso.sharepoint.com/sites/project" -SharingCapability ExternalUserSharingOnly
```

## Required Permissions

| Operation | Permission / Role |
|---|---|
| Read sharing links | `Sites.Read.All` or `Sites.ReadWrite.All` |
| Remove permissions | `Sites.ReadWrite.All` |
| List guest users | `User.Read.All` |
| Delete guest users | `User.ReadWrite.All` |
| SharePoint admin settings | SharePoint Administrator role |
