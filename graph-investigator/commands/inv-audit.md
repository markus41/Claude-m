---
name: inv-audit
description: Search unified audit logs for a user — Exchange, SharePoint, Teams, Azure AD activities
argument-hint: "<upn> [--days <number>] [--service <exchange|sharepoint|teams|azuread|all>] [--operations <op1,op2>] [--top <number>]"
allowed-tools:
  - Bash
  - Read
  - Write
---

# Graph Investigator — Unified Audit Log Search

Searches Microsoft 365 unified audit logs for all activity by a user across Azure AD, Exchange, SharePoint, OneDrive, and Teams. Categorizes events by risk level and generates a frequency timeline.

## Arguments

| Argument | Description |
|---|---|
| `<upn>` | **Required.** User Principal Name to investigate |
| `--days <number>` | Number of days of audit history to fetch (default: 30, max: 180) |
| `--service <exchange\|sharepoint\|teams\|azuread\|all>` | Restrict to a specific service (default: `all`) |
| `--operations <op1,op2>` | Comma-separated list of specific operations to filter (e.g. `HardDelete,SendAs`) |
| `--top <number>` | Maximum events to return (default: 500) |

## Integration Context Check

Required scopes:
- `AuditLog.Read.All` — access to `/auditLogs/directoryAudits` (Azure AD events)
- `User.Read.All` — resolve UPN

**Important**: The Graph API `/auditLogs/directoryAudits` endpoint covers Azure AD operations only. For Exchange, SharePoint, and Teams audit events, the `Search-UnifiedAuditLog` PowerShell cmdlet (Exchange Online PowerShell module) is required. This command provides both Graph and PowerShell paths.

If only the Graph path is available, Exchange/SharePoint/Teams events will not be returned. Surface this limitation clearly to the user.

## Step 1: Azure AD Directory Audit Events (Graph)

```bash
UPN="<upn>"
START_DATE="<ISO-8601-date>"

az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/auditLogs/directoryAudits?\$filter=initiatedBy/user/userPrincipalName eq '${UPN}' and activityDateTime ge ${START_DATE}&\$select=id,activityDateTime,activityDisplayName,category,result,resultReason,targetResources,initiatedBy,loggedByService,operationType&\$top=200&\$orderby=activityDateTime desc" \
  --output json
```

Also query for operations where the user is the **target** (e.g. admin operations performed on the user):

```bash
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/auditLogs/directoryAudits?\$filter=targetResources/any(t:t/userPrincipalName eq '${UPN}') and activityDateTime ge ${START_DATE}&\$select=id,activityDateTime,activityDisplayName,category,result,targetResources,initiatedBy,loggedByService&\$top=100&\$orderby=activityDateTime desc" \
  --output json
```

## Step 2: Exchange Audit Events (PowerShell)

For Exchange-specific audit events, provide the PowerShell command to run in an Exchange Online PowerShell session. This requires the `ExchangeOnlineManagement` module.

```powershell
# Connect to Exchange Online first:
# Connect-ExchangeOnline -UserPrincipalName admin@contoso.com

$startDate = (Get-Date).AddDays(-30).ToString("MM/dd/yyyy")
$endDate = (Get-Date).ToString("MM/dd/yyyy")

Search-UnifiedAuditLog `
  -StartDate $startDate `
  -EndDate $endDate `
  -UserIds "<upn>" `
  -RecordType ExchangeItemAggregated,ExchangeItem,ExchangeAdmin `
  -ResultSize 5000 |
  Select-Object CreationDate,Operations,UserType,ResultStatus,AuditData |
  ConvertTo-Json | Out-File "exchange-audit.json"
```

Key operations to flag in Exchange logs:
- `HardDelete` — permanently deleted items (not recoverable)
- `SendAs` — sent email as another user
- `SendOnBehalf` — sent on behalf of another user
- `UpdateInboxRules` — inbox rule modifications (BEC indicator)
- `New-InboxRule` — new inbox rule created (BEC indicator)
- `Set-InboxRule` — existing inbox rule changed
- `Remove-InboxRule` — inbox rule removed (cover tracks)
- `AddFolderPermissions` — folder access shared to another account
- `Set-Mailbox` — mailbox configuration changed
- `Set-MailboxAutoReplyConfiguration` — out-of-office changed (sometimes used by attackers to gather intel)

## Step 3: SharePoint and OneDrive Audit Events (PowerShell)

```powershell
Search-UnifiedAuditLog `
  -StartDate $startDate `
  -EndDate $endDate `
  -UserIds "<upn>" `
  -RecordType SharePoint,SharePointSharingOperation,SharePointFileOperation,OneDrive `
  -ResultSize 5000 |
  Select-Object CreationDate,Operations,UserType,ResultStatus,AuditData |
  ConvertTo-Json | Out-File "sharepoint-audit.json"
```

Key operations to flag:
- `FileDeleted` — file deleted
- `FileDeletedFirstStageRecycleBin` — moved to recycle bin
- `FilePreviewed` / `FileAccessed` — file opened/viewed
- `FileDownloaded` — file downloaded
- `FileCopied` — file copied
- `FileMoved` — file moved (possibly to personal OneDrive)
- `SharingSet` — sharing permission created
- `SharingInvitationCreated` — invitation sent (check for external)
- `AnonymousLinkCreated` — anyone link created
- `AnonymousLinkUpdated` — anyone link modified
- `SecureLinkCreated` — secure sharing link created

## Step 4: Teams Audit Events (PowerShell)

```powershell
Search-UnifiedAuditLog `
  -StartDate $startDate `
  -EndDate $endDate `
  -UserIds "<upn>" `
  -RecordType MicrosoftTeams,MicrosoftTeamsAdmin `
  -ResultSize 5000 |
  Select-Object CreationDate,Operations,UserType,ResultStatus,AuditData |
  ConvertTo-Json | Out-File "teams-audit.json"
```

Key operations to flag:
- `TeamCreated` — new team created
- `MemberAdded` — member added to team (who was added?)
- `MemberRemoved` — member removed from team
- `MessageDeleted` — message deleted
- `AppInstalled` — app added to a team channel
- `BotAddedToPersonalScope` — bot installed for user
- `MeetingRecord` — meeting recorded

## Step 5: Risk-Scored Event Categorization

After collecting events from all sources, categorize each by risk level:

### HIGH Risk Events
| Operation | Service | Reason |
|---|---|---|
| `HardDelete` | Exchange | Permanent deletion — evidence destruction |
| `SendAs` | Exchange | Sending as another identity — impersonation |
| `UpdateInboxRules` / `New-InboxRule` | Exchange | BEC persistence mechanism |
| `AddFolderPermissions` | Exchange | Unauthorized mailbox access |
| `AnonymousLinkCreated` | SharePoint | Uncontrolled external sharing |
| Admin consented OAuth app | Azure AD | Privilege escalation via consent |
| Role assignment added | Azure AD | Privilege escalation |
| MFA method registered | Azure AD | Attacker registering their own MFA |
| SSPR registration | Azure AD | Attacker registering password reset |
| Conditional Access policy modified | Azure AD | Weakening security controls |

### MEDIUM Risk Events
| Operation | Service | Reason |
|---|---|---|
| `SharingSet` with external domain | SharePoint | External data sharing |
| Bulk `FileDownloaded` (>10/hour) | SharePoint/OneDrive | Possible exfiltration |
| `Set-Mailbox` | Exchange | Mailbox configuration changed |
| Group membership changed | Azure AD | Access scope change |
| Application permission granted | Azure AD | App access expansion |

### LOW Risk Events
- Normal `FileAccessed`, `FilePreviewed` — routine file viewing
- Sign-in events — normal authentication
- Calendar updates — routine calendar management
- Password change initiated by user — expected self-service

## Step 6: ASCII Activity Frequency Chart

After collecting all events, group by day and generate a visual activity bar chart:

```
Activity Frequency — jsmith@contoso.com (Last 30 days)

Jan 15 ████████████░░░░ 48 events (12 flagged ⚠️)
Jan 14 ████████░░░░░░░░ 31 events ( 3 flagged ⚠️)
Jan 13 ████░░░░░░░░░░░░ 14 events ( 0 flagged)
Jan 12 ██░░░░░░░░░░░░░░  8 events ( 0 flagged)
Jan 11 ░░░░░░░░░░░░░░░░  0 events
...
```

Scale: each █ = 3 events. Days with no activity show as ░░.

## Output Format

```markdown
## Unified Audit Log — jsmith@contoso.com

**Period**: Last 30 days | **Service Filter**: All | **Total Events**: 324

### Event Counts by Service
| Service | Events | High Risk | Medium Risk |
|---|---|---|---|
| Azure AD | 45 | 2 | 5 |
| Exchange | 189 | 1 | 3 |
| SharePoint/OneDrive | 82 | 0 | 2 |
| Teams | 8 | 0 | 0 |

### HIGH Risk Events (3)

🔴 **2024-01-15 14:22** — `New-InboxRule` | Exchange | Rule "Move to Archive" created: forwards all email with keyword "invoice" to external@gmail.com. **BEC indicator.**
🔴 **2024-01-14 09:15** — `AnonymousLinkCreated` | SharePoint | Anyone link created for `/Finance/Q4-Report-2023.xlsx` — no expiry set.
🔴 **2024-01-13 16:42** — Role assignment: **Security Administrator** added to `jsmith@contoso.com` by `admin@contoso.com`.

### MEDIUM Risk Events (10)
...

### Activity Frequency (Last 14 days)
Jan 15 ████████████████ 48 events (3 HIGH ⚠️)
Jan 14 ████████░░░░░░░░ 31 events (1 HIGH ⚠️)
...
```
