# Mailbox Forensics Reference

Comprehensive reference for Exchange Online and Outlook mailbox investigation via Microsoft Graph API and Exchange PowerShell. Covers inbox rule forensics, forwarding detection, delegate analysis, audit log interpretation, and hidden folder discovery.

---

## 1. Inbox Rule Investigation

Inbox rules are the most common persistence mechanism in Business Email Compromise (BEC) and account compromise scenarios. Attackers create rules immediately after gaining access to silently forward, delete, or hide emails from the victim.

### Enumerate All Inbox Rules

```bash
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/users/{userId}/mailFolders/inbox/messageRules" \
  --output json
```

The response is an array of rule objects. Even a single suspicious rule warrants immediate investigation.

### Full Rule Object Shape

```json
{
  "id": "AQAAABAAABAAABAAABAAABAAABAAABAAABAAABAAABAA=",
  "displayName": "Auto-Process",
  "sequence": 1,
  "isEnabled": true,
  "hasError": false,
  "isReadOnly": false,
  "conditions": {
    "senderContains": ["cfo@company.com", "finance@company.com"],
    "subjectContains": ["invoice", "payment", "wire", "urgent", "transfer"],
    "bodyContains": [],
    "bodyOrSubjectContains": [],
    "recipientContains": [],
    "fromAddresses": [],
    "sentToMe": null,
    "sentOnlyToMe": null,
    "importance": null,
    "sensitivity": null,
    "hasAttachments": null,
    "messageActionFlag": null,
    "notSentToMe": null,
    "sentCcMe": null,
    "withinSizeRange": null
  },
  "actions": {
    "forwardTo": [
      {
        "emailAddress": {
          "name": "External Contact",
          "address": "attacker@gmail.com"
        }
      }
    ],
    "forwardAsAttachmentTo": [],
    "redirectTo": [],
    "copyToFolder": null,
    "moveToFolder": null,
    "delete": false,
    "permanentDelete": false,
    "markAsRead": true,
    "markImportance": null,
    "stopProcessingRules": true,
    "assignCategories": [],
    "notifyDeliveryTo": []
  }
}
```

### Suspicious Rule Pattern Matrix

| Pattern | Rule Property | Risk Level | Description |
|---|---|---|---|
| External forward | `actions.forwardTo[*].emailAddress.address` contains non-company domain | Critical | Silently copies all matching email to attacker |
| External forward as attachment | `actions.forwardAsAttachmentTo[*]` contains external address | Critical | Same as above — different protocol |
| External redirect | `actions.redirectTo[*]` contains external address | Critical | Removes original from victim inbox |
| Permanent delete | `actions.permanentDelete = true` | Critical | Destroys email evidence — bypasses Recoverable Items |
| Soft delete | `actions.delete = true` | High | Deletes matching email from victim inbox |
| Financial keyword filter | `conditions.subjectContains` contains "invoice", "payment", "wire", "transfer", "bank" + any action | High | Intercepting financial communications |
| Security alert filter | `conditions.senderContains` contains known security tools + `actions.markAsRead = true` | High | Hiding security alerts from victim |
| Mark as read only | `actions.markAsRead = true` without forward/delete | Medium | Hiding alerts — victim sees no unread indicator |
| Move to obscure folder | `actions.moveToFolder` set to non-standard folder ID | Medium | Hiding intercepted email in unusual folder |
| Stop processing | `actions.stopProcessingRules = true` and rule has high sequence number | Medium | Preventing other rules from firing |
| Blank rule name | `displayName` is empty, whitespace, or single character | High | Obfuscation — hiding the rule from victim |
| Sequence 1 | `sequence = 1` + suspicious conditions/actions | Medium | Attacker set rule to run before victim's rules |

### Rule Analysis Checklist

For each rule found, answer these questions:
- [ ] Is `actions.forwardTo` or `actions.forwardAsAttachmentTo` pointing to an external domain?
- [ ] Is `actions.redirectTo` pointing to an external address?
- [ ] Are `conditions.senderContains` or `conditions.subjectContains` matching financial or security-related terms?
- [ ] Is `actions.permanentDelete` or `actions.delete` enabled?
- [ ] Is `actions.markAsRead` enabled with no other visible action?
- [ ] Is the rule name suspicious (blank, random characters, lookalike Unicode)?
- [ ] Is this rule newly created (see audit log for creation timestamp)?
- [ ] Does the sequence number suggest it was designed to run before legitimate rules?

### Determining When a Rule Was Created

The `/messageRules` API does NOT return a `createdDateTime`. Use the directory audit log to find creation events:

```bash
# Find inbox rule creation events for a specific user
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/auditLogs/directoryAudits?\$filter=activityDisplayName eq 'Set-InboxRule' and initiatedBy/user/userPrincipalName eq '{upn}'&\$orderby=activityDateTime desc&\$top=50&\$select=id,activityDateTime,activityDisplayName,initiatedBy,targetResources,result" \
  --output json
```

Exchange Online Unified Audit Log provides more complete rule history:

```powershell
# Full inbox rule audit history
Search-UnifiedAuditLog `
  -StartDate "2024-01-01" `
  -EndDate "2024-03-31" `
  -UserIds "user@domain.com" `
  -Operations "New-InboxRule","Set-InboxRule","Enable-InboxRule","Disable-InboxRule","Remove-InboxRule" `
  -ResultSize 5000 |
  ForEach-Object {
    $data = $_.AuditData | ConvertFrom-Json
    [PSCustomObject]@{
      Timestamp   = $_.CreationDate
      Operation   = $_.Operations
      RuleName    = $data.Parameters | Where-Object { $_.Name -eq "Name" } | Select-Object -ExpandProperty Value
      Parameters  = $data.Parameters | ConvertTo-Json -Compress
      ClientIP    = $data.ClientIP
      SessionId   = $data.SessionId
    }
  } | Sort-Object Timestamp
```

---

## 2. Forwarding Configuration

Three distinct forwarding mechanisms exist in Exchange Online. A sophisticated attacker may configure all three simultaneously for redundancy. All must be checked.

### Type 1: SMTP Forwarding (Per-Mailbox)

Configured via `mailboxSettings` in Graph API or `Set-Mailbox -ForwardingSmtpAddress` in PowerShell.

```bash
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/users/{userId}/mailboxSettings" \
  --query "{
    ForwardingSmtpAddress: forwardingSmtpAddress,
    DeliverToMailboxAndForward: deliverToMailboxAndForward,
    AutomaticRepliesStatus: automaticRepliesSetting.status,
    AutomaticReplyMessage: automaticRepliesSetting.internalReplyMessage,
    TimeZone: timeZone,
    Language: language.displayName
  }" \
  --output json
```

Key field interpretation:
- `forwardingSmtpAddress`: If set, ALL email is silently forwarded to this address
- `deliverToMailboxAndForward`: If `false`, email goes ONLY to the forwarding address (victim never sees it). If `true`, delivered to both.

To remove SMTP forwarding via Graph:

```bash
az rest --method PATCH \
  --uri "https://graph.microsoft.com/v1.0/users/{userId}/mailboxSettings" \
  --headers "Content-Type=application/json" \
  --body '{"forwardingSmtpAddress": null, "deliverToMailboxAndForward": false}'
```

### Type 2: Inbox Rule Forwarding

Covered in Section 1. Check `actions.forwardTo`, `actions.forwardAsAttachmentTo`, and `actions.redirectTo` on all inbox rules.

### Type 3: Transport Rule Forwarding (Tenant-Wide)

Transport rules are tenant-level and apply to all mail flow. Cannot be queried via Graph API — requires Exchange Online PowerShell.

```powershell
# Connect to Exchange Online
Connect-ExchangeOnline -UserPrincipalName admin@domain.com

# Find transport rules that forward, redirect, or BCC
Get-TransportRule | Where-Object {
    $_.RedirectMessageTo -ne $null -or
    $_.BlindCopyTo -ne $null -or
    $_.CopyTo -ne $null -or
    $_.AddToRecipients -ne $null
} | Select-Object Name, Priority, State, RedirectMessageTo, BlindCopyTo, CopyTo, Conditions, Description |
    Format-Table -AutoSize

# Check if any rule specifically targets the investigation subject
Get-TransportRule | Where-Object {
    $_.Conditions -match "{upn}" -or
    $_.Comments -match "{upn}"
} | Select-Object Name, Priority, Conditions, RedirectMessageTo
```

### SMTP Forwarding Audit History

```powershell
# Find when forwarding was set on a mailbox
Search-UnifiedAuditLog -StartDate "2024-01-01" -EndDate "2024-03-31" `
  -Operations "Set-Mailbox" `
  -ResultSize 5000 |
  Where-Object { $_.AuditData -match "ForwardingSmtpAddress" -and $_.UserIds -match "{upn}" } |
  ForEach-Object {
    $data = $_.AuditData | ConvertFrom-Json
    [PSCustomObject]@{
      Timestamp           = $_.CreationDate
      ModifiedBy          = $data.UserId
      ForwardingAddress   = ($data.Parameters | Where-Object { $_.Name -eq "ForwardingSmtpAddress" }).Value
      DeliverAndForward   = ($data.Parameters | Where-Object { $_.Name -eq "DeliverToMailboxAndForward" }).Value
    }
  }
```

---

## 3. Delegate and Permission Investigation

Mailbox delegation grants third-party access to a user's mailbox. There are three types of delegation, each with different capabilities.

### Delegation Types

| Type | What It Allows | How Attacker Uses It | API/Method |
|---|---|---|---|
| Full Access | Read/delete all mail, impersonate owner in Outlook | Read victim's email after compromise, pivot to other accounts | Exchange PowerShell only |
| Send As | Send email appearing exactly as the mailbox owner | Send phishing from victim account, no "on behalf of" visible | Exchange PowerShell only |
| Send on Behalf | Send email with "on behalf of" visible in From | Lower-risk but still allows impersonation | Exchange PowerShell + Graph |

### Calendar Delegates via Graph

```bash
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/users/{userId}/calendar/calendarPermissions?\$select=id,allowedRoles,role,isInsideOrganization,emailAddress" \
  --output json
```

Calendar permission roles: `none`, `freeBusyRead`, `limitedRead`, `read`, `write`, `delegateWithoutPrivateEventAccess`, `delegateWithPrivateEventAccess`, `custom`

### Full Mailbox Access — Exchange PowerShell

```powershell
# Who has FullAccess to this mailbox?
Get-MailboxPermission -Identity "{upn}" |
  Where-Object {
    $_.IsInherited -eq $false -and
    $_.AccessRights -contains "FullAccess" -and
    $_.User -notlike "NT AUTHORITY\*" -and
    $_.User -notlike "S-1-5-*"
  } |
  Select-Object User, AccessRights, Deny, IsInherited

# Who has FullAccess to all mailboxes? (Tenant-wide sweep)
Get-Mailbox -ResultSize Unlimited |
  Get-MailboxPermission |
  Where-Object {
    $_.IsInherited -eq $false -and
    $_.AccessRights -contains "FullAccess" -and
    $_.User -notlike "NT AUTHORITY\*"
  } |
  Select-Object Identity, User, AccessRights
```

### Send As Permission — Exchange PowerShell

```powershell
# Who can send as this mailbox?
Get-RecipientPermission -Identity "{upn}" |
  Where-Object {
    $_.Trustee -ne "NT AUTHORITY\SELF" -and
    $_.AccessControlType -eq "Allow"
  } |
  Select-Object Trustee, AccessControlType, AccessRights

# Audit SendAs activity
Search-UnifiedAuditLog -StartDate "2024-01-01" -EndDate "2024-01-31" `
  -Operations "SendAs" `
  -UserIds "{upn}" `
  -ResultSize 5000
```

### Send on Behalf — Exchange PowerShell

```powershell
# Who can send on behalf of this mailbox?
Get-Mailbox -Identity "{upn}" |
  Select-Object -ExpandProperty GrantSendOnBehalfTo

# Remove unauthorized Send on Behalf delegate
Set-Mailbox -Identity "{upn}" -GrantSendOnBehalfTo @{Remove="{delegateUpn}"}
```

### Mailbox Permission Changes via Audit Log

```powershell
# Find when mailbox permissions were added
Search-UnifiedAuditLog -StartDate "2024-01-01" -EndDate "2024-03-31" `
  -Operations "AddFolderPermissions","UpdateFolderPermissions","AddMailboxPermissions","UpdateCalendarDelegation" `
  -ResultSize 5000 |
  Where-Object { $_.AuditData -match "{upn}" } |
  ForEach-Object {
    $data = $_.AuditData | ConvertFrom-Json
    [PSCustomObject]@{
      Timestamp   = $_.CreationDate
      Operation   = $_.Operations
      ModifiedBy  = $data.UserId
      TargetUser  = $data.MailboxOwnerUPN
      Parameters  = $data.Parameters | ConvertTo-Json -Compress
    }
  }
```

---

## 4. Mailbox Audit Log Categories

Exchange Online maintains a per-mailbox audit log capturing actions on mailbox items. This is distinct from the Unified Audit Log.

### Enable Mailbox Auditing (if not enabled)

```powershell
# Check if auditing is enabled
Get-Mailbox -Identity "{upn}" | Select-Object AuditEnabled, AuditLogAgeLimit, AuditAdmin, AuditDelegate, AuditOwner

# Enable with comprehensive audit coverage
Set-Mailbox -Identity "{upn}" -AuditEnabled $true -AuditLogAgeLimit 180 `
  -AuditAdmin HardDelete,SoftDelete,MoveToDeletedItems,SendAs,SendOnBehalf,Update,Copy,Create,FolderBind,Move `
  -AuditDelegate HardDelete,SoftDelete,MoveToDeletedItems,SendAs,SendOnBehalf,Update,Move,FolderBind,MessageBind `
  -AuditOwner HardDelete,SoftDelete,MoveToDeletedItems,Update,Move,MailboxLogin,Create
```

### Mailbox Audit Operations Reference

| Operation | Category | Actor | Forensic Significance |
|---|---|---|---|
| MailboxLogin | Authentication | Owner/Delegate | Who accessed the mailbox and from where |
| HardDelete | Deletion | Owner/Delegate/Admin | Permanently deleted — evidence destruction |
| SoftDelete | Deletion | Owner/Delegate/Admin | Moved to Deleted Items (still recoverable) |
| MoveToDeletedItems | Deletion | Owner/Delegate | Deleted via UI (Recoverable Items) |
| Send | Mail Send | Owner | Email sent from mailbox |
| SendAs | Mail Send | Delegate | Sent impersonating owner — exact email appears from victim |
| SendOnBehalf | Mail Send | Delegate | "On behalf of" in header — delegate visible |
| Create | Content | Owner/Delegate | Item created (draft, calendar item, etc.) |
| Update | Content | Owner/Delegate | Item modified |
| Copy | Data Movement | Owner/Delegate | Item copied (potentially cross-mailbox) |
| Move | Data Movement | Owner/Delegate | Item moved between folders |
| UpdateInboxRules | Configuration | Owner | Inbox rule modified |
| AddFolderPermissions | Configuration | Owner/Admin | Folder access granted to delegate |
| UpdateFolderPermissions | Configuration | Owner/Admin | Folder permissions changed |
| UpdateCalendarDelegation | Configuration | Owner | Calendar delegate added/changed |
| ApplyRecord | Compliance | System | Retention label applied |
| FolderBind | Access | Delegate | Folder accessed by delegate |
| MessageBind | Access | Delegate | Message read by delegate |
| RecordDelete | Compliance | Admin | Record deletion (requires retention unlock) |

### Querying Mailbox Audit Log via Unified Audit Log

```powershell
# Full mailbox audit for a user — last 30 days
Search-UnifiedAuditLog `
  -StartDate ((Get-Date).AddDays(-30).ToString("yyyy-MM-dd")) `
  -EndDate (Get-Date).ToString("yyyy-MM-dd") `
  -UserIds "user@domain.com" `
  -RecordType ExchangeItemAggregated `
  -ResultSize 5000 |
  ForEach-Object {
    $data = $_.AuditData | ConvertFrom-Json
    [PSCustomObject]@{
      Timestamp    = $_.CreationDate
      Operation    = $_.Operations
      MailboxOwner = $data.MailboxOwnerUPN
      ClientIP     = $data.ClientIPAddress
      LogonType    = $data.LogonType
      ItemSubject  = $data.AffectedItems.Subject
      FolderPath   = $data.AffectedItems.ParentFolder.Path
      ItemCount    = $data.AffectedItems.Count
    }
  } | Sort-Object Timestamp | Export-Csv -Path "C:\Investigation\mailbox_audit.csv" -NoTypeInformation

# Focus on deletion events specifically
Search-UnifiedAuditLog `
  -StartDate "2024-01-01" -EndDate "2024-01-31" `
  -UserIds "user@domain.com" `
  -RecordType ExchangeItemAggregated `
  -Operations "HardDelete","SoftDelete","MoveToDeletedItems" `
  -ResultSize 5000
```

### LogonType Values

| LogonType | Meaning |
|---|---|
| 0 | Owner — mailbox owner accessed |
| 1 | Admin — administrator accessed |
| 2 | Delegated — delegate with FullAccess |

LogonType 1 (Admin) accessing a user mailbox warrants investigation: who was the admin and what did they do?

---

## 5. Hidden Folder Detection

Attackers sometimes create hidden folders to store intercepted emails or maintain persistence without the victim noticing.

### List All Folders Including Hidden

```bash
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/users/{userId}/mailFolders?includeHiddenFolders=true&\$select=id,displayName,totalItemCount,unreadItemCount,childFolderCount,isHidden,parentFolderId&\$top=100" \
  --output json
```

### Get Child Folders (Recursive Discovery)

```bash
# Get child folders of a specific folder (recursively explore hierarchy)
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/users/{userId}/mailFolders/{folderId}/childFolders?includeHiddenFolders=true&\$select=id,displayName,totalItemCount,isHidden,parentFolderId&\$top=100" \
  --output json
```

### Hidden Folder Red Flags

| Indicator | Significance |
|---|---|
| `isHidden = true` for non-standard folder | Should be investigated — only system folders should be hidden |
| Folder name is random string | Obfuscation — "aB3xK9" style names |
| Folder with Unicode lookalike characters | E.g., "lnbox" (capital I looks like lowercase L), "Drаfts" (Cyrillic а) |
| Folder with `totalItemCount > 0` and unusual name | Content is being stored there |
| Folder deep in hierarchy (3+ levels down) | Buried to avoid casual discovery |
| Folder created during compromise window | Time-correlate creation with suspicious sign-in |
| Folder matching rule's `moveToFolder` action | Direct evidence of rule-driven data staging |

### Standard Hidden System Folders (Expected)

These folders are legitimately hidden and do not indicate compromise:
- `Conversation History`
- `Purges`
- `Versions`
- `SubstrateHolds`
- `DiscoveryHolds`
- `Yammer Root`
- `Files`
- `ExternalContacts`
- `Analytics`
- `PeopleCentricConversation_Deleted`

---

## 6. Large Attachment and Bulk Export Patterns

Data exfiltration via email is one of the most common methods. Look for large attachments sent externally, especially compressed archives.

### Large Sent Items Query

```bash
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/users/{userId}/mailFolders/sentitems/messages?\$filter=sentDateTime ge {startDate}T00:00:00Z and hasAttachments eq true&\$select=id,subject,sentDateTime,toRecipients,ccRecipients,hasAttachments,size,internetMessageId&\$orderby=size desc&\$top=50" \
  --output json
```

### Analyze Recipients of Large Emails

```bash
# Get specific large message details including all recipients
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/users/{userId}/messages/{messageId}?\$select=id,subject,from,toRecipients,ccRecipients,bccRecipients,sentDateTime,hasAttachments,size,internetMessageId,conversationId" \
  --output json
```

### Attachment Metadata

```bash
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/users/{userId}/messages/{messageId}/attachments?\$select=id,name,contentType,size,lastModifiedDateTime,isInline" \
  --output json
```

### Suspicious Attachment Indicators

| Indicator | Significance |
|---|---|
| `.zip`, `.7z`, `.tar.gz`, `.rar` attachments | Compressed archives — common staging format |
| `.csv`, `.xlsx` with high file size | Data export (employee list, customer data, financial records) |
| Multiple attachments to same external recipient in short time | Systematic exfiltration |
| Attachment to personal email (gmail.com, yahoo.com, hotmail.com) | Personal address bypass |
| Attachment to competitor domain | Intellectual property theft |
| Large attachment sent immediately before termination/resignation | Pre-departure exfiltration |
| Encrypted ZIP (no `contentType` content inspection possible) | Obfuscation attempt |

### PowerShell: Large Email Extraction Analysis

```powershell
# Find all large emails sent externally
Search-UnifiedAuditLog -StartDate "2024-01-01" -EndDate "2024-01-31" `
  -UserIds "user@domain.com" `
  -RecordType ExchangeItem `
  -Operations "Send" `
  -ResultSize 5000 |
  ForEach-Object {
    $data = $_.AuditData | ConvertFrom-Json
    if ($data.MessageSizeInBytes -gt 5000000) {  # > 5MB
      [PSCustomObject]@{
        Timestamp   = $_.CreationDate
        Subject     = $data.Subject
        Recipients  = $data.SendAsUPN
        SizeBytes   = $data.MessageSizeInBytes
        SizeMB      = [math]::Round($data.MessageSizeInBytes / 1MB, 2)
        ClientIP    = $data.ClientIPAddress
      }
    }
  } | Sort-Object SizeBytes -Descending
```

---

## 7. Suspicious Pattern Checklist

Use this checklist for every mailbox forensics investigation. Document findings with specific evidence IDs for the investigation report.

### Inbox Rules
- [ ] Any rule with `actions.forwardTo` pointing to external domain
- [ ] Any rule with `actions.forwardAsAttachmentTo` pointing external
- [ ] Any rule with `actions.redirectTo` pointing external
- [ ] Any rule with `actions.permanentDelete = true`
- [ ] Any rule with `actions.delete = true` + financial/security keyword conditions
- [ ] Any rule with `actions.moveToFolder` pointing to non-standard folder
- [ ] Any rule with blank or suspicious `displayName`
- [ ] Any rule created during the compromise window (check UAL for New-InboxRule)
- [ ] Any disabled rules that may have been temporarily active (UAL Enable-InboxRule)

### Forwarding Configuration
- [ ] `mailboxSettings.forwardingSmtpAddress` is set
- [ ] `mailboxSettings.deliverToMailboxAndForward` is `false` (email not delivered to victim)
- [ ] Tenant-level transport rules forwarding this user's email
- [ ] Auto-reply message contains unusual content (e.g., alternate contact info)

### Delegate Access
- [ ] Unexpected accounts with Full Access to mailbox
- [ ] Unexpected accounts with Send As permission
- [ ] Unexpected accounts with Send on Behalf
- [ ] Calendar delegates with Editor or Delegate role unexpectedly granted
- [ ] AddFolderPermissions events in UAL during compromise window

### Sent Items
- [ ] Emails sent to personal addresses (gmail, yahoo, etc.)
- [ ] Emails sent to competitor domains
- [ ] Large emails (> 5MB) with attachments sent externally
- [ ] Emails sent at unusual hours (consistent with attacker's timezone)
- [ ] SendAs events in UAL (email sent appearing as victim from another account)
- [ ] Phishing emails sent to victim's contacts from compromised account

### Deleted Items
- [ ] Mass HardDelete events (> 50 items) in UAL
- [ ] HardDelete of items in compressed time window (clearing evidence)
- [ ] Deleted items corresponding to security alert emails
- [ ] Items purged from Recoverable Items (requires litigation hold to recover)

### Hidden Folders
- [ ] Folders with `isHidden = true` that are not standard system folders
- [ ] Folders with random or lookalike names containing email items
- [ ] Folders created during the compromise window

### Mailbox Settings
- [ ] Automatic replies enabled with unusual content or timing
- [ ] Language/timezone settings changed (possible attacker locale)
- [ ] `workingHours` settings modified

---

## 8. Remediation Actions

### Remove Inbox Rule

```bash
az rest --method DELETE \
  --uri "https://graph.microsoft.com/v1.0/users/{userId}/mailFolders/inbox/messageRules/{ruleId}"
```

### Remove SMTP Forwarding

```bash
az rest --method PATCH \
  --uri "https://graph.microsoft.com/v1.0/users/{userId}/mailboxSettings" \
  --headers "Content-Type=application/json" \
  --body '{"forwardingSmtpAddress": null, "deliverToMailboxAndForward": false}'
```

### Remove FullAccess Delegate (PowerShell)

```powershell
Remove-MailboxPermission -Identity "{victimUpn}" -User "{delegateUpn}" -AccessRights FullAccess -Confirm:$false
```

### Remove SendAs Permission (PowerShell)

```powershell
Remove-RecipientPermission -Identity "{victimUpn}" -Trustee "{delegateUpn}" -AccessRights SendAs -Confirm:$false
```

### Revoke All User Sessions (After Remediation)

```bash
az rest --method POST \
  --uri "https://graph.microsoft.com/v1.0/users/{userId}/revokeSignInSessions" \
  --output json
```

### Recover Deleted Items (Litigation Hold Required)

```powershell
# Search-Mailbox (requires litigation hold or In-Place Hold)
Search-Mailbox -Identity "{upn}" -SearchQuery "Subject:'Suspicious Subject'" `
  -TargetMailbox "admin@domain.com" -TargetFolder "ForensicRecovery" -LogLevel Full
```
