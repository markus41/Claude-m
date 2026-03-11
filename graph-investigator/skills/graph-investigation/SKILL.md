---
name: Microsoft Graph Investigator
description: >
  Deep expertise in unified user investigation across Microsoft 365 via Microsoft Graph — mailbox forensics,
  sign-in analysis, device correlation, file access audit, Teams activity, OAuth consent audit,
  risk assessment, and multi-source forensic timeline construction.
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
triggers:
  - graph investigator
  - investigate user
  - user investigation
  - mailbox forensics
  - email investigation
  - sign-in investigation
  - device investigation
  - activity timeline
  - forensic timeline
  - microsoft graph investigation
  - m365 investigation
  - audit log search
  - unified audit log
  - compromise assessment
  - data exfiltration investigation
  - insider threat
  - BEC investigation
  - teams investigation
  - file access audit
  - oauth consent audit
  - app permission investigation
  - user activity report
  - exchange investigation
  - sharepoint investigation
---

# Microsoft Graph Investigator

Deep expertise in unified user investigation across Microsoft 365 via Microsoft Graph API. This skill covers mailbox forensics, sign-in analysis, device correlation, file access audit, Teams activity, OAuth consent review, risk assessment, and multi-source forensic timeline construction.

---

## 1. Integration Context Contract

See canonical contract definition: `docs/integration-context.md`

Every investigation session requires integration context to be resolved before issuing Graph API calls. The following table defines required and optional context fields per workflow:

| Workflow | tenantId | subscriptionId | environmentCloud | principalType | scopesOrRoles |
|---|---|---|---|---|---|
| User profile, sign-in, mailbox forensics | required | optional | AzureCloud | delegated-user or service-principal | AuditLog.Read.All, Mail.Read, User.Read.All, Directory.Read.All |
| Device investigation | required | optional | AzureCloud | delegated-user or service-principal | DeviceManagementManagedDevices.Read.All, User.Read.All |
| Risk assessment | required | optional | AzureCloud | delegated-user or service-principal | IdentityRiskyUser.Read.All, IdentityRiskEvent.Read.All |
| Teams investigation | required | optional | AzureCloud | delegated-user or service-principal | Chat.Read.All, ChannelMessage.Read.All, CallRecords.Read.All |
| OAuth/app audit | required | optional | AzureCloud | delegated-user or service-principal | DelegatedPermissionGrant.ReadWrite.All, Directory.Read.All |
| File access audit | required | optional | AzureCloud | delegated-user or service-principal | AuditLog.Read.All, Sites.Read.All |
| Unified audit log | required | optional | AzureCloud | delegated-user or service-principal | UnifiedAuditLog via compliance endpoint or Exchange admin |

Graph API base URL: `https://graph.microsoft.com/v1.0/` (use `beta/` only when a capability is unavailable in v1.0)

Authentication via `az rest` inherits the active `az login` session. For service principal contexts, ensure `az login --service-principal` is completed prior to invoking any Graph queries.

---

## 2. Plugin Purpose and When to Use

### This Plugin vs Adjacent Plugins

| Plugin | Best For | When NOT to Use This Plugin |
|---|---|---|
| `entra-id-security` | Conditional access policies, app registrations, service principal audits, sign-in basics | Use entra-id-security for policy analysis; use this plugin for per-user sign-in forensics |
| `defender-sentinel` | Alert triage, KQL threat hunting, SOAR playbook execution, incident management | Use defender-sentinel for existing incidents; use this plugin for proactive investigation |
| `purview-compliance` | eDiscovery content searches, DLP policy enforcement, retention labels | Use purview-compliance for legal hold/export workflows; use this plugin for operational forensics |
| `exchange-mailflow` | Mail delivery diagnostics, SPF/DKIM/DMARC checks, connector troubleshooting | Use exchange-mailflow for delivery failures; use this plugin for mailbox compromise/BEC |

### This Plugin Excels At
- Unified cross-service investigation of a single user across sign-in, mail, files, devices, and Teams
- Mailbox rule forensics — detecting forwarding rules, deletion rules, and hidden folders
- OAuth consent audit per user — identifying over-permissioned third-party apps
- Multi-source forensic timeline synthesis — correlating events from 5+ sources into a single timeline
- Compromise assessment workflows — structured investigation following known attack chains
- Risk score interpretation and remediation guidance

### Trigger Scenarios
- Security team receives alert: "User X flagged for impossible travel"
- SOC needs to determine if a phishing victim clicked a malicious link and forwarded credentials
- Compliance team needs to know if an exiting employee downloaded sensitive files
- IT admin suspects a compromised service account is forwarding emails externally
- Insider threat investigation: activity pattern analysis for a terminated employee

---

## 3. User Profile Investigation

### Initial Profile Pull

Always start an investigation with a complete user profile snapshot. Use `$select` to minimize response payload while capturing all forensically relevant fields.

```bash
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/users/{userPrincipalName}?\$select=id,displayName,userPrincipalName,mail,jobTitle,department,officeLocation,accountEnabled,createdDateTime,lastPasswordChangeDateTime,passwordPolicies,assignedLicenses,assignedPlans,usageLocation,onPremisesSyncEnabled,onPremisesLastSyncDateTime,signInActivity" \
  --output json
```

Key fields and their investigative significance:

| Field | Investigative Significance |
|---|---|
| `accountEnabled` | Is the account currently active? If disabled during investigation, when? |
| `createdDateTime` | Account age — new accounts during incident window are suspicious |
| `lastPasswordChangeDateTime` | Was password changed recently? Could indicate compromise or remediation |
| `passwordPolicies` | `DisablePasswordExpiration` — service account indicator |
| `onPremisesSyncEnabled` | Hybrid-synced user — on-prem may also be compromised |
| `onPremisesLastSyncDateTime` | Last sync — helps correlate on-prem events |
| `signInActivity.lastSignInDateTime` | Last interactive sign-in |
| `signInActivity.lastNonInteractiveSignInDateTime` | Last service/daemon sign-in |

### Manager Chain and Org Context

```bash
# Get user's direct manager
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/users/{userId}/manager?\$select=id,displayName,userPrincipalName,jobTitle" \
  --output json

# Get direct reports (useful for insider threat — who had access to their subordinates' resources)
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/users/{userId}/directReports?\$select=id,displayName,userPrincipalName,jobTitle" \
  --output json
```

### Group Membership

```bash
# Transitive group memberships with count (requires ConsistencyLevel header)
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/users/{userId}/transitiveMemberOf/\$count" \
  --headers "ConsistencyLevel=eventual" \
  --output json

# All group memberships (paginated)
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/users/{userId}/memberOf?\$select=id,displayName,groupTypes,mail,securityEnabled,mailEnabled&\$top=100" \
  --output json
```

### Directory Role Memberships

```bash
# Filter transitive memberships to only directory roles
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/users/{userId}/transitiveMemberOf/microsoft.graph.directoryRole?\$select=id,displayName,description" \
  --headers "ConsistencyLevel=eventual" \
  --output json
```

Elevated roles to flag immediately: Global Administrator, Exchange Administrator, SharePoint Administrator, Security Administrator, Privileged Role Administrator, Authentication Administrator, Helpdesk Administrator.

### MFA / Authentication Methods

```bash
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/users/{userId}/authentication/methods" \
  --output json
```

Method types and significance:

| Method Type | OData Type | Forensic Note |
|---|---|---|
| Password | `#microsoft.graph.passwordAuthenticationMethod` | Primary credential |
| Authenticator app | `#microsoft.graph.microsoftAuthenticatorAuthenticationMethod` | TOTP/push |
| FIDO2 key | `#microsoft.graph.fido2AuthenticationMethod` | Hardware key |
| Phone | `#microsoft.graph.phoneAuthenticationMethod` | SMS/voice — phishable |
| Hello for Business | `#microsoft.graph.windowsHelloForBusinessAuthenticationMethod` | Device-bound |
| Temporary Access Pass | `#microsoft.graph.temporaryAccessPassAuthenticationMethod` | Short-lived — check if recently issued |

### Assigned Licenses

```bash
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/users/{userId}/licenseDetails?\$select=id,skuId,skuPartNumber,servicePlans" \
  --output json
```

Important SKU patterns: E5 includes Defender, Purview, and Identity Protection P2. E3 includes basic audit. F1/F3 licenses have limited audit retention.

### Registered and Owned Devices

```bash
# Entra ID registered devices
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/users/{userId}/registeredDevices?\$select=id,displayName,deviceId,operatingSystem,operatingSystemVersion,trustType,approximateLastSignInDateTime,isManaged,isCompliant" \
  --output json

# Entra ID owned devices
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/users/{userId}/ownedDevices?\$select=id,displayName,deviceId,operatingSystem,trustType,approximateLastSignInDateTime" \
  --output json
```

---

## 4. Sign-In and Authentication Analysis

### Core Sign-In Query

```bash
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/auditLogs/signIns?\$filter=userPrincipalName eq '{upn}' and createdDateTime ge {startDate}T00:00:00Z and createdDateTime le {endDate}T23:59:59Z&\$orderby=createdDateTime desc&\$top=1000&\$select=id,createdDateTime,userPrincipalName,appDisplayName,ipAddress,location,deviceDetail,status,riskLevelAggregated,riskLevelDuringSignIn,riskDetail,riskEventTypes,conditionalAccessStatus,appliedConditionalAccessPolicies,clientAppUsed,authenticationDetails,isInteractive" \
  --output json
```

### Paginating Sign-In Logs

Sign-in logs return `@odata.nextLink` when results exceed `$top`. Always paginate to capture the full set:

```bash
# Initial request — capture @odata.nextLink from response
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/auditLogs/signIns?\$filter=userPrincipalName eq '{upn}' and createdDateTime ge {startDate}T00:00:00Z&\$top=1000&\$orderby=createdDateTime desc" \
  --output json > signin_page1.json

# Continue with nextLink value from @odata.nextLink field in previous response
az rest --method GET \
  --uri "{nextLinkUrl}" \
  --output json > signin_page2.json
```

### Key Sign-In Fields for Investigation

| Field | Values | Forensic Significance |
|---|---|---|
| `status.errorCode` | 0 = success, non-zero = failure | Failure codes reveal attack type |
| `riskLevelAggregated` | none, low, medium, high | Identity Protection risk score |
| `riskEventTypes` | Array of detection types | Specific risk signals |
| `conditionalAccessStatus` | success, failure, notApplied | CA policy enforcement |
| `clientAppUsed` | Browser, mobileApps, exchangeActiveSync, other | Legacy auth = no MFA support |
| `deviceDetail.isCompliant` | true/false | Non-compliant device access |
| `deviceDetail.trustType` | AzureAD, Hybrid, none | Unregistered device = suspicious |
| `authenticationDetails` | Array of auth steps | MFA method and result |
| `appliedConditionalAccessPolicies` | Array with result | Which policies ran and passed/failed |

### Anomaly Detection Patterns

**Impossible Travel**
Two sign-ins from geographic locations more than 500 km apart within a 2-hour window. Calculate haversine distance between lat/long coordinates from the `location` field. Flag if:
`distance_km / time_hours > 500`

**New Country Sign-In**
Extract all unique `location.countryOrRegion` values from the prior 30 days. Flag any sign-in from a country not in that baseline set.

**Legacy Authentication Usage**
`clientAppUsed` values indicating legacy auth: `Exchange ActiveSync`, `IMAP4`, `MAPI`, `SMTP`, `POP3`, `Other clients`. Legacy protocols bypass MFA — flag all occurrences.

**MFA Fatigue Indicators**
Multiple sign-in attempts with `status.errorCode = 500121` (MFA required but not performed) or `authenticationDetails` showing repeated push notification rejections within a short window.

**Conditional Access Policy Failures**
`conditionalAccessStatus = failure` indicates a policy blocked the sign-in. Cross-reference with `appliedConditionalAccessPolicies[*].result` to determine which policy failed and why.

**Service Principal Sign-Ins Using User Context**
If `servicePrincipalId` is populated but the sign-in is attributed to a user UPN, this may indicate token replay or service principal impersonation.

### Non-Interactive and Service Principal Sign-Ins

```bash
# Non-interactive sign-ins (daemon/service flows)
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/auditLogs/signIns?\$filter=userPrincipalName eq '{upn}' and isInteractive eq false and createdDateTime ge {startDate}T00:00:00Z&\$top=1000&\$orderby=createdDateTime desc" \
  --output json

# Service principal sign-ins correlated to the investigation period
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/auditLogs/servicePrincipalSignIns?\$filter=createdDateTime ge {startDate}T00:00:00Z&\$top=200&\$orderby=createdDateTime desc" \
  --output json
```

### Sign-In Error Code Reference

| Error Code | Meaning | Investigative Action |
|---|---|---|
| 0 | Success | Normal |
| 50055 | Expired password | Password change event — correlate timing |
| 50057 | Account disabled | Administrative action — who disabled? |
| 50074 | Strong MFA required | CA policy enforcement |
| 50126 | Invalid credentials | Brute force indicator |
| 500121 | MFA required | Legacy app or MFA bypass attempt |
| 53003 | Blocked by CA | CA policy doing its job |
| 70011 | Invalid scope requested | Token abuse attempt |
| 90095 | Admin consent required | App requesting elevated consent |

---

## 5. Mailbox Forensics

### Inbox Rule Investigation

Inbox rules are the most common persistence mechanism in Business Email Compromise (BEC). Always enumerate all inbox rules early in a mailbox investigation.

```bash
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/users/{userId}/mailFolders/inbox/messageRules" \
  --output json
```

Example rule object shape:

```json
{
  "id": "string",
  "displayName": "string",
  "sequence": 1,
  "isEnabled": true,
  "hasError": false,
  "isReadOnly": false,
  "conditions": {
    "senderContains": ["boss@company.com"],
    "subjectContains": ["invoice", "payment", "wire", "urgent"],
    "recipientContains": [],
    "bodyContains": [],
    "bodyOrSubjectContains": [],
    "fromAddresses": [],
    "sentToMe": null,
    "sentOnlyToMe": null
  },
  "actions": {
    "forwardTo": [{"emailAddress": {"address": "external@gmail.com", "name": "External"}}],
    "forwardAsAttachmentTo": [],
    "redirectTo": [],
    "moveToFolder": null,
    "copyToFolder": null,
    "delete": false,
    "permanentDelete": false,
    "markAsRead": true,
    "markImportance": null,
    "stopProcessingRules": true
  }
}
```

### Suspicious Rule Patterns

Flag any rule matching these patterns immediately:

| Pattern | Indicator | Severity |
|---|---|---|
| `actions.forwardTo` pointing to external domain | External forwarding | Critical |
| `actions.forwardAsAttachmentTo` pointing external | External forwarding | Critical |
| `actions.redirectTo` pointing external | External redirect | Critical |
| `actions.delete = true` + `conditions.senderContains` with bank/IT names | Deleting security alerts | High |
| `actions.permanentDelete = true` | Evidence destruction | Critical |
| `conditions.subjectContains` with financial keywords + `actions.moveToFolder` | Hiding financial emails | High |
| `actions.markAsRead = true` without any move/forward | Hiding alerts from victim | Medium |
| Rule name is blank or a single space | Obfuscated rule | High |
| `sequence` = 1 and recently created | Created to run first | Medium |

### Detecting Inbox Rule Creation via Audit Log

The `/mailFolders/inbox/messageRules` endpoint returns current rules but NOT when they were created (no `createdDateTime`). To determine when a rule was created, query directory audits:

```bash
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/auditLogs/directoryAudits?\$filter=activityDisplayName eq 'Set-InboxRule' and initiatedBy/user/userPrincipalName eq '{upn}'&\$orderby=activityDateTime desc&\$top=50" \
  --output json
```

For full inbox rule audit history including New-InboxRule, Set-InboxRule, Enable-InboxRule, use Exchange PowerShell via Unified Audit Log:

```powershell
Search-UnifiedAuditLog -StartDate "2024-01-01" -EndDate "2024-03-31" `
  -UserIds "user@domain.com" `
  -Operations "New-InboxRule","Set-InboxRule","Enable-InboxRule","Disable-InboxRule","Remove-InboxRule" `
  -ResultSize 5000
```

### Forwarding Configuration

Three distinct forwarding mechanisms must ALL be checked — a sophisticated attacker may use multiple simultaneously:

**1. SMTP Forwarding (per-mailbox)**

```bash
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/users/{userId}/mailboxSettings" \
  --query "{ForwardingSmtpAddress: forwardingSmtpAddress, DeliverToMailboxAndForward: deliverToMailboxAndForward, AutomaticRepliesStatus: automaticRepliesSetting.status, TimeZone: timeZone}" \
  --output json
```

If `forwardingSmtpAddress` is set, the mailbox is silently copying all email to that address. If `deliverToMailboxAndForward = false`, the victim never sees the original email.

**2. Inbox Rule Forwarding**

Covered above — `actions.forwardTo`, `actions.forwardAsAttachmentTo`, `actions.redirectTo`.

**3. Transport Rule Forwarding (tenant-wide)**

Cannot be queried via Graph API. Requires Exchange Online PowerShell:

```powershell
Connect-ExchangeOnline -UserPrincipalName admin@domain.com
Get-TransportRule | Where-Object {
  $_.RedirectMessageTo -ne $null -or
  $_.BlindCopyTo -ne $null -or
  $_.CopyTo -ne $null
} | Select-Object Name, RedirectMessageTo, BlindCopyTo, CopyTo, Conditions, Priority
```

### Mail Folder Enumeration

```bash
# List all folders including hidden ones
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/users/{userId}/mailFolders?includeHiddenFolders=true&\$select=id,displayName,totalItemCount,unreadItemCount,childFolderCount,isHidden&\$top=100" \
  --output json
```

Hidden folder red flags:
- `isHidden = true` that are not standard system folders
- Folders with `totalItemCount > 0` but unusual names (random strings, Unicode lookalikes)
- Folders nested deep in the hierarchy to avoid casual discovery
- Folders with names resembling system folders (e.g., "lnbox" instead of "inbox")

### Message Search

```bash
# Filter messages by sender and date range
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/users/{userId}/messages?\$filter=receivedDateTime ge {startDate}T00:00:00Z and from/emailAddress/address eq 'sender@domain.com'&\$select=id,subject,from,toRecipients,ccRecipients,receivedDateTime,sentDateTime,hasAttachments,internetMessageId,conversationId,importance,isRead&\$top=50&\$orderby=receivedDateTime desc" \
  --headers "ConsistencyLevel=eventual" \
  --output json

# Search sent items for external recipients
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/users/{userId}/mailFolders/sentitems/messages?\$filter=sentDateTime ge {startDate}T00:00:00Z and hasAttachments eq true&\$select=id,subject,toRecipients,sentDateTime,hasAttachments,size&\$orderby=size desc&\$top=50" \
  --output json
```

### Attachment Investigation

```bash
# List attachments on a specific message
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/users/{userId}/messages/{messageId}/attachments?\$select=id,name,contentType,size,lastModifiedDateTime" \
  --output json
```

### Conversation Threading

```bash
# Get all messages in a conversation thread
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/users/{userId}/messages?\$filter=conversationId eq '{conversationId}'&\$select=id,subject,from,toRecipients,receivedDateTime,sentDateTime,body&\$orderby=receivedDateTime asc" \
  --output json
```

### Delegate and Permission Investigation

```bash
# Calendar delegates via Graph
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/users/{userId}/calendar/calendarPermissions" \
  --output json
```

Exchange PowerShell for full mailbox access delegation (Graph API does not expose FullAccess/SendAs):

```powershell
# Full access delegates
Get-MailboxPermission -Identity {upn} |
  Where-Object {$_.IsInherited -eq $false -and $_.AccessRights -contains "FullAccess"} |
  Select-Object User, AccessRights

# Send As permission
Get-RecipientPermission -Identity {upn} |
  Where-Object {$_.Trustee -ne "NT AUTHORITY\SELF"} |
  Select-Object Trustee, AccessControlType, AccessRights

# Send on Behalf
Get-Mailbox -Identity {upn} |
  Select-Object -ExpandProperty GrantSendOnBehalfTo
```

---

## 6. Exchange Message Search

### Search Patterns

The Graph API supports two search mechanisms for messages:
- `$filter`: Structured OData filtering on indexed properties (fast, precise)
- `$search`: Full-text content search (requires `ConsistencyLevel: eventual` header)

Always prefer `$filter` for known-field searches. Use `$search` only for content body searches.

```bash
# Filter: Messages from specific sender with attachments in date range
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/users/{userId}/messages?\$filter=receivedDateTime ge {startDate}T00:00:00Z and receivedDateTime le {endDate}T23:59:59Z and from/emailAddress/address eq '{senderEmail}' and hasAttachments eq true&\$select=id,subject,from,toRecipients,receivedDateTime,hasAttachments,internetMessageId&\$top=50&\$orderby=receivedDateTime desc" \
  --output json

# Filter: Large outbound messages to external recipients
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/users/{userId}/mailFolders/sentitems/messages?\$filter=sentDateTime ge {startDate}T00:00:00Z and hasAttachments eq true&\$select=id,subject,toRecipients,sentDateTime,hasAttachments,size&\$orderby=size desc&\$top=50" \
  --output json
```

### $search for Content Search

```bash
# Full-text search for keywords in message bodies
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/users/{userId}/messages?\$search=\"wire transfer\" OR \"routing number\" OR \"bank account\"&\$select=id,subject,from,receivedDateTime,hasAttachments&\$top=50" \
  --headers "ConsistencyLevel=eventual" \
  --output json
```

Note: `$search` does not support `$filter` in the same query. Use `$search` alone, then filter client-side by date or sender.

### Pagination for Message Search

```bash
# Initial request — note the @odata.nextLink in the response
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/users/{userId}/messages?\$filter=receivedDateTime ge {startDate}T00:00:00Z&\$top=1000&\$orderby=receivedDateTime desc" \
  --output json
```

Continue fetching `@odata.nextLink` until no nextLink is returned. Maximum `$top` for messages is 1000.

### Targeted Folder Search

```bash
# Search a specific folder (e.g., Deleted Items)
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/users/{userId}/mailFolders/deleteditems/messages?\$filter=receivedDateTime ge {startDate}T00:00:00Z&\$select=id,subject,from,toRecipients,receivedDateTime,hasAttachments&\$top=200&\$orderby=receivedDateTime desc" \
  --output json

# Search in a specific folder by ID
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/users/{userId}/mailFolders/{folderId}/messages?\$top=200&\$orderby=receivedDateTime desc" \
  --output json
```

---

## 7. File and Document Access

### OneDrive File Listing

```bash
# Root of user's OneDrive
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/users/{userId}/drive/root/children?\$select=id,name,size,createdDateTime,lastModifiedDateTime,webUrl,folder,file&\$top=200" \
  --output json

# Recently accessed files
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/users/{userId}/drive/recent?\$select=id,name,size,lastModifiedDateTime,webUrl,remoteItem&\$top=100" \
  --output json

# Files shared with the user
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/users/{userId}/drive/sharedWithMe?\$select=id,name,size,lastModifiedDateTime,webUrl,remoteItem&\$top=100" \
  --output json
```

### SharePoint File Access

```bash
# List files in a SharePoint site drive
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/sites/{siteId}/drive/root/children?\$select=id,name,size,createdDateTime,lastModifiedDateTime,webUrl,file,folder&\$top=200" \
  --output json

# Search for files by name across a site
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/sites/{siteId}/drive/root/search(q='{searchQuery}')?\$select=id,name,size,webUrl,lastModifiedDateTime&\$top=50" \
  --output json
```

### File Access Audit via Unified Audit Log

Graph API does NOT provide file-level access logs directly. File access events come from the Unified Audit Log (SharePoint/OneDrive record types):

```powershell
# SharePoint and OneDrive file operations for a user
Search-UnifiedAuditLog -StartDate "2024-01-01" -EndDate "2024-01-31" `
  -UserIds "user@domain.com" `
  -RecordType SharePoint,OneDrive `
  -Operations "FileAccessed","FileModified","FileDeleted","FileCopied","FileDownloaded","FileMoved","FileRenamed","SharingSet","SharingInvitationCreated","AnonymousLinkCreated" `
  -ResultSize 5000 |
  ForEach-Object {
    $data = $_.AuditData | ConvertFrom-Json
    [PSCustomObject]@{
      Timestamp = $_.CreationDate
      Operation = $_.Operations
      FileName = $data.ObjectId
      SourceFileName = $data.SourceFileName
      UserAgent = $data.UserAgent
      ClientIP = $data.ClientIP
      SiteUrl = $data.SiteUrl
    }
  } | Sort-Object Timestamp
```

### External Sharing Detection

```powershell
# Detect files shared externally
Search-UnifiedAuditLog -StartDate "2024-01-01" -EndDate "2024-01-31" `
  -UserIds "user@domain.com" `
  -Operations "SharingSet","SharingInvitationCreated","AnonymousLinkCreated","AnonymousLinkUsed" `
  -ResultSize 5000 |
  ForEach-Object {
    $data = $_.AuditData | ConvertFrom-Json
    if ($data.TargetUserOrGroupType -eq "Guest" -or $data.TargetUserOrGroupType -eq "External") {
      $_
    }
  }
```

### Bulk Download Detection

Threshold: Flag users with > 50 file download events in a 1-hour window. This is a strong indicator of data exfiltration staging.

```powershell
# Identify bulk download patterns
$downloads = Search-UnifiedAuditLog -StartDate "2024-01-01" -EndDate "2024-01-31" `
  -UserIds "user@domain.com" `
  -Operations "FileDownloaded","FileAccessed" `
  -ResultSize 5000

# Group by hour and count
$downloads | Group-Object {$_.CreationDate.ToString("yyyy-MM-dd HH")} |
  Where-Object {$_.Count -gt 50} |
  Select-Object Name, Count |
  Sort-Object Count -Descending
```

---

## 8. Teams and Collaboration Investigation

### Chat and Message Investigation

```bash
# List all chats for user (1:1 and group chats)
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/users/{userId}/chats?\$expand=members&\$select=id,topic,chatType,createdDateTime,lastUpdatedDateTime&\$top=50" \
  --output json

# Get messages in a specific chat
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/chats/{chatId}/messages?\$select=id,messageType,createdDateTime,from,body,attachments,mentionedUsersIds&\$top=50" \
  --output json
```

Note: Chat message content is highly sensitive. Ensure legal authorization before retrieving message bodies.

### Team Membership and Channel Messages

```bash
# Teams the user has joined
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/users/{userId}/joinedTeams?\$select=id,displayName,description,visibility,createdDateTime" \
  --output json

# Channel messages in a team (requires knowing channel ID)
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/teams/{teamId}/channels/{channelId}/messages?\$select=id,messageType,createdDateTime,from,body,attachments&\$top=50" \
  --output json

# List channels in a team
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/teams/{teamId}/channels?\$select=id,displayName,description,membershipType,createdDateTime" \
  --output json
```

### Call Records

```bash
# Communications call records (requires CallRecords.Read.All)
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/communications/callRecords?\$filter=startDateTime ge {startDate}T00:00:00Z&\$select=id,type,modalities,startDateTime,endDateTime,organizer,participants&\$top=50" \
  --output json
```

### Teams Unified Audit Log

```powershell
# Teams activity in audit log
Search-UnifiedAuditLog -StartDate "2024-01-01" -EndDate "2024-01-31" `
  -UserIds "user@domain.com" `
  -RecordType MicrosoftTeams `
  -ResultSize 5000 |
  ForEach-Object {
    $data = $_.AuditData | ConvertFrom-Json
    [PSCustomObject]@{
      Timestamp = $_.CreationDate
      Operation = $_.Operations
      CommunicationType = $data.CommunicationType
      TeamName = $data.TeamName
      ChannelName = $data.ChannelName
      ClientIP = $data.ClientIP
    }
  }
```

### Meeting Attendance and Recording

```bash
# Online meetings organized by user
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/users/{userId}/onlineMeetings?\$select=id,subject,startDateTime,endDateTime,participants,recordingStatus&\$top=50" \
  --output json
```

---

## 9. Device Investigation

### Intune Managed Device Inventory

```bash
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/deviceManagement/managedDevices?\$filter=userPrincipalName eq '{upn}'&\$select=id,deviceName,operatingSystem,osVersion,complianceState,lastSyncDateTime,enrolledDateTime,serialNumber,manufacturer,model,azureADDeviceId,userPrincipalName,managedDeviceOwnerType,deviceEnrollmentType,totalStorageSpaceInBytes,freeStorageSpaceInBytes,isEncrypted,isSupervised" \
  --output json
```

### Device Compliance Details

```bash
# Get compliance policy states for a specific device
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/deviceManagement/managedDevices/{deviceId}/deviceCompliancePolicyStates" \
  --output json

# Get configuration profile states for a device
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/deviceManagement/managedDevices/{deviceId}/deviceConfigurationStates" \
  --output json
```

### Correlating Devices Across Sources

The `azureADDeviceId` from Intune is the same as `deviceId` in Entra ID registered devices and `deviceDetail.deviceId` in sign-in logs. Use this as the correlation key.

```bash
# Get Entra device object using the AAD device ID from Intune
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/devices?\$filter=deviceId eq '{azureADDeviceId}'&\$select=id,displayName,deviceId,operatingSystem,operatingSystemVersion,trustType,approximateLastSignInDateTime,isManaged,isCompliant,registrationDateTime" \
  --output json
```

### Defender for Endpoint Device Timeline

If Defender for Endpoint is deployed, correlate via the MDE security API:

```bash
# List MDE-onboarded machines for the user
az rest --method GET \
  --uri "https://api.securitycenter.microsoft.com/api/machines?\$filter=lastLoggedInUser/upn eq '{upn}'" \
  --headers "Authorization=Bearer {mdeToken}" \
  --output json

# Device timeline for investigation period
az rest --method GET \
  --uri "https://api.securitycenter.microsoft.com/api/machines/{mdeId}/timeline?\$filter=Timestamp gt {startDate}T00:00:00Z" \
  --headers "Authorization=Bearer {mdeToken}" \
  --output json
```

Note: The MDE API requires a separate token scoped to `https://api.securitycenter.microsoft.com`. This is distinct from the Graph API token.

### Unmanaged Device Detection

Sign-in log indicators of unmanaged device usage:
- `deviceDetail.isManaged = false`
- `deviceDetail.trustType = "none"` or absent
- `deviceDetail.deviceId` absent or `00000000-0000-0000-0000-000000000000`
- OS/browser combination not matching any Intune-enrolled device for the user
- `deviceDetail.isCompliant = false` — CA bypass attempt

---

## 10. OAuth and App Consent Investigation

### User's OAuth Consent Grants

```bash
# All delegated permission grants where user consented
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/oauth2PermissionGrants?\$filter=principalId eq '{userId}'&\$select=id,clientId,principalId,resourceId,scope,consentType&\$top=200" \
  --output json
```

Each grant's `clientId` is the service principal ID of the consenting application. Expand to get app name:

```bash
# Get service principal display name for a client ID
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/servicePrincipals/{clientId}?\$select=id,displayName,appId,publisherName,verifiedPublisher,appRoles,replyUrls" \
  --output json
```

### App Role Assignments

```bash
# Applications the user has been assigned to (app role assignments)
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/users/{userId}/appRoleAssignments?\$select=id,principalId,resourceId,resourceDisplayName,appRoleId,createdDateTime" \
  --output json
```

### Risky OAuth Permission Combinations

Flag any application holding these permission combinations:

| Permission Combination | Risk | Investigation Action |
|---|---|---|
| `Mail.ReadWrite` + `Mail.Send` | Full mailbox control | Check if app is legitimate |
| `Files.ReadWrite.All` + `offline_access` | Permanent OneDrive access | Verify app publisher |
| `Mail.Read` + `offline_access` on unknown app | Persistent email reading | Check publisher, verify consent |
| `User.ReadWrite.All` on third-party app | Directory write access | Critical — revoke immediately |
| `Directory.ReadWrite.All` | Full tenant write | Critical — investigate immediately |
| `Chat.Read.All` on consumer app | All Teams messages | Verify authorization |

### Detecting Consent via Audit Log

```bash
# Find recent OAuth consent grants in directory audits
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/auditLogs/directoryAudits?\$filter=activityDisplayName eq 'Consent to application' and initiatedBy/user/id eq '{userId}'&\$orderby=activityDateTime desc&\$top=50" \
  --output json
```

### Revoking Suspicious Consent Grants

```bash
# Revoke a specific OAuth permission grant
az rest --method DELETE \
  --uri "https://graph.microsoft.com/v1.0/oauth2PermissionGrants/{grantId}"
```

Revoking consent does not invalidate existing tokens. To fully revoke: revoke the grant AND then revoke all refresh tokens for the user:

```bash
# Revoke all refresh tokens for a user (forces re-authentication)
az rest --method POST \
  --uri "https://graph.microsoft.com/v1.0/users/{userId}/revokeSignInSessions" \
  --output json
```

---

## 11. Risk Assessment

### Current Risk State

```bash
# Get current risk level and state for a specific user
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/identityProtection/riskyUsers/{userId}" \
  --output json
```

Risk level values: `none`, `low`, `medium`, `high`
Risk state values: `none`, `confirmedSafe`, `remediated`, `dismissed`, `atRisk`, `confirmedCompromised`

### Risk Detections for a User

```bash
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/identityProtection/riskDetections?\$filter=userPrincipalName eq '{upn}'&\$orderby=riskEventDateTime desc&\$top=100&\$select=id,userId,userPrincipalName,riskEventDateTime,riskLevel,riskState,riskType,detectionTimingType,ipAddress,location,additionalInfo,correlatedEventTypes" \
  --output json
```

### Risk Detection Type Reference

| Detection Type | Description | Severity |
|---|---|---|
| `anonymizedIPAddress` | Sign-in from Tor or anonymizing proxy | Medium |
| `atypicalTravelActivity` | Impossible travel between sign-ins | Medium |
| `genericLikelihoodBasedDetection` | ML-based anomaly | Low–Medium |
| `impossibleTravel` | Geographic impossibility between sign-ins | High |
| `leakedCredentials` | Credentials found in breach databases | High |
| `maliciousIPAddress` | Known malicious IP sign-in | High |
| `mcasSuspiciousInboxManipulationRules` | MCAS detected suspicious inbox rule | High |
| `newCountry` | First sign-in from this country | Low–Medium |
| `passwordSpray` | Pattern consistent with password spray | High |
| `riskyIPAddress` | IP with suspicious activity history | Medium |
| `suspiciousAPITraffic` | Anomalous API call pattern | Medium |
| `suspiciousInboxForwarding` | Suspicious forwarding rule detected | High |
| `unfamiliarFeatures` | Sign-in properties unusual for user | Low |
| `unlikelyTravel` | Atypical travel pattern | Medium |
| `userReportedSuspiciousActivity` | User reported MFA push as not them | High |

### Risk History

```bash
# Full risk history for a user
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/identityProtection/riskyUsers/{userId}/history?\$orderby=initiatedDateTime desc&\$top=50" \
  --output json
```

### Confirming Compromise or Safe

```bash
# Confirm compromise — elevates risk to high and triggers automated remediation
az rest --method POST \
  --uri "https://graph.microsoft.com/v1.0/identityProtection/riskyUsers/confirmCompromised" \
  --body '{"userIds": ["{userId}"]}' \
  --headers "Content-Type=application/json"

# Dismiss risk — mark as investigated and safe
az rest --method POST \
  --uri "https://graph.microsoft.com/v1.0/identityProtection/riskyUsers/dismiss" \
  --body '{"userIds": ["{userId}"]}' \
  --headers "Content-Type=application/json"
```

Note: `confirmCompromised` requires `IdentityRiskyUser.ReadWrite.All`. It triggers automated response policies if configured (e.g., block sign-in, require MFA re-registration).

---

## 12. Unified Audit Log

### Overview

The Microsoft 365 Unified Audit Log (UAL) is the single authoritative source for cross-service activity. It aggregates events from Exchange, SharePoint, OneDrive, Teams, Azure AD, Intune, and other M365 services.

Access methods:
1. **PowerShell**: `Search-UnifiedAuditLog` via Exchange Online Management module
2. **Compliance Portal**: Microsoft Purview > Audit
3. **Management Activity API**: REST endpoint at `https://manage.office.com/api/v1.0/{tenantId}/activity/feed/`
4. **Graph API**: Only `directoryAudits` — subset of Azure AD events only

Retention: 90 days default, up to 1 year (with Microsoft 365 Audit add-on), up to 10 years (with 10-year retention add-on)

### Required Role

To run `Search-UnifiedAuditLog`, the account must have the **View-Only Audit Logs** or **Audit Logs** role in Exchange Online. Assign via the Exchange Admin Center or:

```powershell
# Check current UAL role assignments
Get-ManagementRoleAssignment -Role "View-Only Audit Logs" | Select-Object RoleAssigneeName
```

### Core PowerShell Command

```powershell
Search-UnifiedAuditLog `
  -StartDate "2024-01-01" `
  -EndDate "2024-01-31" `
  -UserIds "user@domain.com" `
  -RecordType ExchangeItem `
  -Operations "HardDelete","SoftDelete","SendAs","UpdateInboxRules" `
  -ResultSize 5000 `
  -SessionId "Investigation-001" `
  -SessionCommand ReturnLargeSet
```

### Pagination for Large Result Sets

```powershell
$allResults = @()
$sessionId = [System.Guid]::NewGuid().ToString()
do {
    $results = Search-UnifiedAuditLog `
      -StartDate "2024-01-01" `
      -EndDate "2024-03-31" `
      -UserIds "user@domain.com" `
      -SessionId $sessionId `
      -SessionCommand ReturnLargeSet `
      -ResultSize 5000
    if ($results) {
        $allResults += $results
        Write-Host "Collected $($allResults.Count) records..."
    }
} while ($results -and $results.Count -eq 5000)
Write-Host "Total records: $($allResults.Count)"
```

### Long-Duration Query (> 90 Days)

```powershell
$start = [DateTime]"2023-10-01"
$end = [DateTime]"2024-03-31"
$windowDays = 89  # Keep under 90-day limit per request
$allResults = @()

while ($start -lt $end) {
    $windowEnd = $start.AddDays($windowDays)
    if ($windowEnd -gt $end) { $windowEnd = $end }

    Write-Host "Querying $start to $windowEnd..."
    $sessionId = [System.Guid]::NewGuid().ToString()
    do {
        $results = Search-UnifiedAuditLog `
          -StartDate $start -EndDate $windowEnd `
          -UserIds "user@domain.com" `
          -SessionId $sessionId -SessionCommand ReturnLargeSet -ResultSize 5000
        if ($results) { $allResults += $results }
    } while ($results -and $results.Count -eq 5000)

    $start = $windowEnd.AddDays(1)
}
Write-Host "Total: $($allResults.Count) records across $([math]::Round(($end-[DateTime]'2023-10-01').TotalDays)) days"
```

### Key RecordTypes for User Investigation

| RecordType | Numeric | Services Covered |
|---|---|---|
| ExchangeItem | 2 | Mailbox item operations |
| ExchangeItemAggregated | 28 | Aggregated mailbox events |
| SharePoint | 4 | SharePoint document operations |
| OneDrive | 6 | OneDrive for Business |
| AzureActiveDirectory | 8 | Entra ID / Azure AD |
| MicrosoftTeams | 25 | Teams chat, meetings, calls |
| PowerBIAudit | 20 | Power BI (data exfiltration risk) |
| MicrosoftForms | 60 | Forms (data collection) |
| InformationProtectionPolicyLabel | 133 | Sensitivity label changes |

### Parsing AuditData JSON

```powershell
# Parse and flatten AuditData JSON field
$results | ForEach-Object {
    $data = $_.AuditData | ConvertFrom-Json
    [PSCustomObject]@{
        Timestamp    = $_.CreationDate
        User         = $_.UserIds
        Operation    = $_.Operations
        RecordType   = $_.RecordType
        ObjectId     = $data.ObjectId
        ClientIP     = $data.ClientIP
        UserAgent    = $data.UserAgent
        SiteUrl      = $data.SiteUrl
        SourceFile   = $data.SourceFileName
        WorkloadName = $data.Workload
        ResultStatus = $data.ResultStatus
    }
} | Export-Csv -Path "C:\Investigation\audit_export.csv" -NoTypeInformation
```

---

## 13. Timeline Construction

### Overview

A forensic timeline is the primary artifact of a user investigation. It synthesizes events from 5+ sources into a single, chronological, analyst-readable sequence. The timeline enables:
- Attack chain reconstruction
- Attribution of individual actions
- Identification of dwell time
- Evidence of impact and scope

### Step-by-Step Construction

**Step 1: Define Investigation Window**
Establish start and end dates. Use a 30-day window initially; extend if anomalies are found near the edges.

**Step 2: Collect from All Sources**

| Source | API/Method | Time Field | Max Records/Call |
|---|---|---|---|
| Sign-in logs | GET /auditLogs/signIns | createdDateTime | 1000 |
| Directory audits | GET /auditLogs/directoryAudits | activityDateTime | 1000 |
| Risk detections | GET /identityProtection/riskDetections | riskEventDateTime | 1000 |
| Exchange mailbox | Search-UnifiedAuditLog RecordType=ExchangeItem | CreationDate | 5000 |
| SharePoint/OneDrive | Search-UnifiedAuditLog RecordType=SharePoint,OneDrive | CreationDate | 5000 |
| Teams | Search-UnifiedAuditLog RecordType=MicrosoftTeams | CreationDate | 5000 |
| Intune device | GET /deviceManagement/managedDevices | lastSyncDateTime | All |
| Inbox rules | GET /mailFolders/inbox/messageRules + audit | activityDateTime | All |
| OAuth consents | GET /auditLogs/directoryAudits | activityDateTime | 1000 |

**Step 3: Normalize to Unified Schema**

```json
{
  "timestamp": "2024-01-15T14:32:00Z",
  "source": "signIn",
  "eventType": "UserSignIn",
  "actor": "user@contoso.com",
  "actorObjectId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "target": "Microsoft Teams",
  "targetId": "00000003-0000-0ff1-ce00-000000000000",
  "ipAddress": "203.0.113.42",
  "location": {
    "city": "Berlin",
    "countryOrRegion": "DE",
    "state": "Berlin"
  },
  "riskIndicator": true,
  "riskReason": "New country — first sign-in from DE in 30-day baseline",
  "severity": "medium",
  "rawEventId": "aabbccdd-1234-5678-abcd-reference-id",
  "metadata": {
    "clientAppUsed": "Browser",
    "conditionalAccessStatus": "success",
    "deviceIsCompliant": true,
    "deviceTrustType": "AzureAD"
  }
}
```

Event source values: `signIn`, `directoryAudit`, `mailboxAudit`, `sharepointAudit`, `teamsAudit`, `deviceAudit`, `riskDetection`, `inboxRuleChange`, `oauthConsent`

**Step 4: Sort by Timestamp Ascending**

All timestamps must be UTC. Convert any local time fields to UTC before sorting.

**Step 5: Apply Anomaly Detection**

Run the following checks after building the sorted timeline:
- Impossible travel: Sign-ins > 500 km apart in < 2h
- New geography: Country not seen in prior 30-day baseline
- Off-hours: Access between 22:00–06:00 in user's local timezone (from `mailboxSettings.timeZone`)
- Bulk operations: > 50 file operations in 1-hour window
- First-time app consent: OAuth consent not previously recorded
- Mass deletion: HardDelete count > 100 in 24-hour window

**Step 6: Identify Gaps**

Gaps > 5 business days in an otherwise active account followed by high-risk activity indicate either:
- Account dormancy (legitimate) then unusual return
- Account handover (credential theft, insider handoff)
- Investigation should extend before the gap

### Markdown Timeline Output Format

```markdown
## Forensic Timeline — user@contoso.com
**Investigation Period**: 2024-01-10 to 2024-01-17 UTC
**Generated**: {currentDateTime}

| Timestamp (UTC) | Source | Event Type | Target | IP Address | Location | Risk |
|---|---|---|---|---|---|---|
| 2024-01-15 14:32:00 | Sign-In | UserSignIn | Teams | 203.0.113.42 | Berlin, DE | New country |
| 2024-01-15 14:35:00 | SharePoint | FileDownloaded | Finance_Q4.xlsx | 203.0.113.42 | Berlin, DE | Bulk download |
| 2024-01-15 14:36:00 | SharePoint | FileDownloaded | Budget_2024.xlsx | 203.0.113.42 | Berlin, DE | Bulk download |
| 2024-01-15 14:41:00 | Exchange | UpdateInboxRules | inbox | 203.0.113.42 | Berlin, DE | External forward |
```

### ASCII Timeline Visualization

```
2024-01-15 (Tuesday) — INVESTIGATION DAY
  14:32  [SIGN-IN ] Teams from Berlin, DE — NEW COUNTRY
  14:35  [FILE    ] Downloaded: Finance_Q4.xlsx (SharePoint/Finance)
  14:36  [FILE    ] Downloaded: Budget_2024.xlsx (SharePoint/Finance)
  14:37  [FILE    ] Downloaded: HR_Salaries.xlsx (SharePoint/HR)  << BULK (3 in 2 min)
  14:41  [MAIL    ] UpdateInboxRules — Forward to external@gmail.com
  14:43  [MAIL    ] 3 emails forwarded externally (rule triggered)
  15:02  [SIGN-OUT] Session ended (30 min total session)

RISK SUMMARY:
  - New country sign-in (DE — baseline: US, GB only)
  - 3 sensitive files downloaded in 2 minutes
  - New inbox forwarding rule created during session
  - Rule forwarded 3 emails to gmail.com immediately
```

---

## 14. Common Investigation Patterns

### Pattern 1: Compromised Account

**Trigger**: Identity Protection risk alert, user reports suspicious activity, anomalous sign-in detected

**Investigation Steps**:

1. **Risk State** — `GET /identityProtection/riskyUsers/{userId}` — current risk level and state
2. **Risk Detections** — `GET /identityProtection/riskDetections?$filter=userPrincipalName eq '{upn}'` — all detection events
3. **Sign-In History** — last 30 days, look for new locations, impossible travel, legacy auth usage
4. **Inbox Rules** — `GET /users/{id}/mailFolders/inbox/messageRules` — new forwarding/delete rules
5. **Sent Items** — search sent folder for phishing emails sent from compromised account
6. **OAuth Grants** — `GET /oauth2PermissionGrants?$filter=principalId eq '{userId}'` — newly consented apps during compromise window
7. **Teams Messages** — chats around incident timeframe for sensitive data shared
8. **File Access** — UAL file download events, especially bulk downloads
9. **Unified Timeline** — construct and annotate

**Containment Actions** (in order):
1. `POST /users/{userId}/revokeSignInSessions` — invalidate all tokens
2. Disable account: `PATCH /users/{userId}` with `{"accountEnabled": false}`
3. Revoke suspicious OAuth grants
4. Remove suspicious inbox rules
5. Reset password (out-of-band channel to user)
6. `POST /identityProtection/riskyUsers/confirmCompromised`

### Pattern 2: Business Email Compromise (BEC)

**Trigger**: Finance reports unusual payment request, suspected email hijacking

**Investigation Steps**:

1. **Inbox Rules** — Any rules forwarding finance/invoice/payment emails externally
2. **Sent Items** — Search for wire transfer requests, payment redirect emails
3. **Reply-To Manipulation** — Search messages where reply-to differs from sender (requires message inspection)
4. **Look-alike Accounts** — Check `GET /users?$filter=startswith(displayName, '{targetName}')` for impersonation accounts
5. **External Communications** — Audit log SharingSet events with ExternalUser type for finance documents
6. **Forwarding Config** — mailboxSettings.forwardingSmtpAddress, inbox rules, transport rules
7. **Sign-In Audit** — When did the attacker access the mailbox? Correlate with when rules were created
8. **Timeline** — Map the full attack: initial access → rule creation → email interception → financial request sent

**Key Indicators**:
- Rule created at unusual hour (off-hours for the user)
- Rule conditions target financial keywords: invoice, payment, wire, urgent, transfer
- Sent items contain emails never seen by victim (attacker sent from victim's account)
- Changes to auto-reply settings to buy time

### Pattern 3: Data Exfiltration

**Trigger**: DLP alert, departing employee, insider threat flag

**Investigation Steps**:

1. **File Downloads** — UAL FileDownloaded events, bulk download threshold analysis
2. **Email Attachments Sent External** — Sent items with attachments to personal/competitor domains
3. **External Sharing** — UAL SharingSet, AnonymousLinkCreated events
4. **OneDrive Sync** — Check if user sync'd a large SharePoint library before departure
5. **Print/USB** — If Defender for Endpoint available, device timeline for print jobs and USB events
6. **OAuth Apps** — Any app with Files.ReadWrite.All that could be exfiltrating via API
7. **Teams Messages** — Chats containing file shares or screenshots of sensitive content
8. **Timeline** — Focus on final 30 days of employment, compare to baseline behavior

**Data Volume Indicators**:
- > 50 file downloads in 1 hour
- > 100 MB of email attachments sent externally in 1 day
- AnonymousLinkCreated for files containing financial/HR/IP data
- Sync of entire SharePoint document library (sync events in UAL)

### Pattern 4: Insider Threat

**Trigger**: HR referral, peer report, anomaly in behavioral analytics

**Investigation Steps**:

1. **Baseline Normal Activity** — Establish typical working hours, files accessed, systems used (30-day baseline)
2. **Off-Hours Spikes** — Activity between 22:00–06:00 local time without prior pattern
3. **Scope Deviation** — Files accessed in departments/projects outside normal work scope
4. **Printing** — Print job volume increase (MDE device timeline)
5. **Employee Directory Access** — Search for access to HR files, organizational charts, email lists
6. **Competitive Intelligence** — Access to product roadmaps, customer lists, pricing files
7. **Personal Device Usage** — Sign-ins from unmanaged/personal devices
8. **Communication Patterns** — Teams/email to personal addresses, competitors, recruiters
9. **Timeline** — Map activity changes relative to key events (PIP, rejection, resignation)

**Long-Term Pattern Analysis**:
Look for gradual escalation: occasional off-hours access → regular off-hours → bulk access → exfiltration. Insider threats rarely spike suddenly — they escalate over weeks.

### Pattern 5: Privilege Escalation Investigation

**Trigger**: Alert on role assignment, unexpected admin activity

**Investigation Steps**:

1. **Current Roles** — `GET /users/{id}/transitiveMemberOf/microsoft.graph.directoryRole`
2. **Role Assignment History** — UAL: `activityDisplayName eq 'Add member to role'`
3. **Who Assigned the Role** — `initiatedBy/user/userPrincipalName` in directory audits
4. **Actions Taken as Admin** — Directory audits filtered to `initiatedBy/user/id eq '{userId}'` after role assignment
5. **Service Principal Creation** — Look for new app registrations or service principals created
6. **Credential Additions** — `activityDisplayName eq 'Add service principal credentials'`
7. **Consent Grant Abuse** — New admin consent grants issued by this user
8. **Policy Changes** — CA policy modifications, audit setting changes

---

## 15. Reference Files

For detailed reference on specific investigation areas, see:

- `references/user-activity-endpoints.md` — Complete Graph API endpoint reference organized by domain
- `references/mailbox-forensics.md` — Comprehensive Exchange/Outlook forensic techniques
- `references/timeline-construction.md` — Forensic timeline schemas, algorithms, and output formats
- `references/device-correlation.md` — Multi-source device inventory and correlation patterns
- `references/permission-scopes.md` — Permission requirements by investigation type and scenario
- `references/unified-audit-log.md` — Full UAL reference: PowerShell, REST API, RecordTypes, Operations

---

## 16. Output and Reporting Standards

### Investigation Report Structure

Every investigation should produce a report with these sections:

1. **Executive Summary** (3–5 bullets): What happened, when, what was accessed, current status
2. **Investigation Scope**: User investigated, date range, data sources queried
3. **Timeline**: Forensic timeline as markdown table (key events only if > 50 events)
4. **Findings by Domain**: Sign-in, mailbox, files, devices, Teams — what was found in each
5. **Risk Indicators Identified**: Ranked list of specific anomalies
6. **Conclusion**: Compromise confirmed / suspicious but unconfirmed / cleared
7. **Remediation Actions**: Completed and recommended
8. **Evidence References**: IDs of specific audit events supporting findings

### Confidence Levels

Tag each finding with a confidence level:
- `HIGH`: Multiple corroborating sources, clear indicator
- `MEDIUM`: Single source, plausible indicator
- `LOW`: Circumstantial, requires further investigation
- `INFORMATIONAL`: Noted but not indicative of compromise

### Data Handling

All investigation data containing PII or message content must be:
- Stored in compliance-aware systems (not plain text files)
- Accessed only by authorized investigators
- Documented in the investigation record for audit trail
- Handled per the organization's incident response data classification policy
