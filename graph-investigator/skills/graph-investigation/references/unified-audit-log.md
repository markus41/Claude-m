# Unified Audit Log Reference

Comprehensive reference for the Microsoft 365 Unified Audit Log (UAL) — the authoritative cross-service activity log for Exchange, SharePoint, OneDrive, Teams, Azure AD, Intune, and all other M365 services. Covers PowerShell cmdlets, Management Activity API, RecordType enumeration, Operations by service, and investigation query templates.

---

## 1. Unified Audit Log Overview

The Microsoft 365 Unified Audit Log (UAL) aggregates activity from virtually every M365 service into a single, queryable store. It is the most comprehensive source of user activity evidence in a Microsoft 365 investigation.

### Access Methods Comparison

| Method | Best For | Limitations | Required Role |
|---|---|---|---|
| **PowerShell** `Search-UnifiedAuditLog` | Interactive investigation, ad-hoc queries | Max 5000 results per call, session-based pagination | View-Only Audit Logs (Exchange Online) |
| **Microsoft Purview Compliance Portal** | Non-technical reviewers, quick searches, export to CSV | UI-only, limited automation | Audit Logs reader |
| **Management Activity API** (REST) | Automated pipelines, SIEM integration, high-volume collection | Subscription-based, 24-hour delay possible | Application permission + admin consent |
| **Graph API directoryAudits** | Azure AD / Entra ID events only | Subset only — not full UAL | AuditLog.Read.All |

### Retention Periods

| License / Add-on | Retention |
|---|---|
| Exchange Online Plan 1, Business Basic/Standard | 90 days |
| Microsoft 365 E3, Business Premium | 90 days (default) |
| Microsoft 365 E5, E5 Compliance | 1 year (with Audit add-on) |
| Microsoft 365 Audit (Premium) add-on | 1 year |
| Microsoft 365 Audit 10-Year Retention add-on | 10 years |

### Required Role Assignment (PowerShell)

```powershell
# Check who has the View-Only Audit Logs role in Exchange Online
Get-ManagementRoleAssignment -Role "View-Only Audit Logs" |
  Select-Object RoleAssigneeName, RoleAssigneeType, AssignmentMethod

# Assign role to a user (requires Exchange Administrator)
New-ManagementRoleAssignment -Role "View-Only Audit Logs" -User "analyst@domain.com"

# Alternatively — assign via role group
Add-RoleGroupMember -Identity "Compliance Management" -Member "analyst@domain.com"
```

---

## 2. PowerShell Reference

### Connect to Exchange Online

```powershell
# Install module (one-time)
Install-Module -Name ExchangeOnlineManagement -Force -AllowClobber

# Connect with MFA (interactive)
Connect-ExchangeOnline -UserPrincipalName admin@domain.com

# Connect with service principal (automation)
Connect-ExchangeOnline -AppId "{appId}" -CertificateThumbprint "{thumbprint}" -Organization "domain.com"

# Verify connection and UAL access
Get-Command Search-UnifiedAuditLog
```

### Core Command Syntax

```powershell
Search-UnifiedAuditLog `
  -StartDate "2024-01-01" `
  -EndDate "2024-01-31" `
  -UserIds "user@domain.com" `
  -RecordType ExchangeItem `
  -Operations "HardDelete","SoftDelete","Send","SendAs","UpdateInboxRules" `
  -ResultSize 5000 `
  -SessionId "Forensic-Investigation-001" `
  -SessionCommand ReturnLargeSet `
  -Formatted
```

### Parameter Reference

| Parameter | Description | Constraints |
|---|---|---|
| `-StartDate` | Start of query window | Required. Max 90-day range per call |
| `-EndDate` | End of query window | Required. Must be after StartDate |
| `-UserIds` | Comma-separated UPNs or "all" | Optional. Max 100 UPNs per call |
| `-RecordType` | Filter by M365 service | Optional. See RecordType table below |
| `-Operations` | Specific activity names | Optional. Comma-separated list |
| `-ResultSize` | Max results per call | Max 5000 per call |
| `-SessionId` | Arbitrary string for pagination | Use unique ID per query session |
| `-SessionCommand` | Pagination control | `ReturnLargeSet` or `ReturnNextPreviewPage` |
| `-ObjectIds` | Filter by specific object (file, user, etc.) | Optional. Useful for targeted file audit |
| `-FreeText` | Keyword search in AuditData | Optional. Slow — prefer Operations filter |
| `-IPAddresses` | Filter by client IP | Optional. Comma-separated |
| `-Formatted` | Return formatted output | Optional. Makes AuditData more readable |

### Result Object Properties

| Property | Description |
|---|---|
| `CreationDate` | Timestamp of the event (UTC) |
| `UserIds` | UPN of the user who performed the action |
| `Operations` | Name of the activity |
| `RecordType` | Numeric code for the M365 service |
| `ResultStatus` | Success/Failure/PartiallySucceeded |
| `AuditData` | JSON string with full event details — always parse with `ConvertFrom-Json` |
| `Identity` | Internal audit record ID |
| `IsValid` | Whether the record is complete |
| `ObjectId` | Object affected (file path, user UPN, etc.) |

---

## 3. Pagination Patterns

### Pattern 1: Session-Based Pagination (Recommended for > 5000 Results)

```powershell
$allResults = @()
$sessionId = [System.Guid]::NewGuid().ToString()
$page = 0

do {
    $page++
    Write-Host "Fetching page $page..."
    $results = Search-UnifiedAuditLog `
      -StartDate "2024-01-01" `
      -EndDate "2024-01-31" `
      -UserIds "user@domain.com" `
      -SessionId $sessionId `
      -SessionCommand ReturnLargeSet `
      -ResultSize 5000

    if ($results -and $results.Count -gt 0) {
        $allResults += $results
        Write-Host "Collected $($allResults.Count) records so far..."
    }
} while ($results -and $results.Count -eq 5000)

Write-Host "Total records: $($allResults.Count)"
```

### Pattern 2: Long-Duration Query (> 90 Days)

The UAL only allows a 90-day window per query. For longer periods, chunk the time range.

```powershell
function Get-FullAuditLog {
    param(
        [datetime]$StartDate,
        [datetime]$EndDate,
        [string[]]$UserIds,
        [string]$RecordType,
        [string[]]$Operations
    )

    $allResults = @()
    $windowDays = 89  # Stay under 90-day limit
    $current = $StartDate

    while ($current -lt $EndDate) {
        $windowEnd = $current.AddDays($windowDays)
        if ($windowEnd -gt $EndDate) { $windowEnd = $EndDate }

        Write-Host "Window: $($current.ToString('yyyy-MM-dd')) to $($windowEnd.ToString('yyyy-MM-dd'))"
        $sessionId = [System.Guid]::NewGuid().ToString()

        do {
            $params = @{
                StartDate      = $current
                EndDate        = $windowEnd
                SessionId      = $sessionId
                SessionCommand = 'ReturnLargeSet'
                ResultSize     = 5000
            }
            if ($UserIds)    { $params['UserIds']    = $UserIds }
            if ($RecordType) { $params['RecordType'] = $RecordType }
            if ($Operations) { $params['Operations'] = $Operations }

            $results = Search-UnifiedAuditLog @params
            if ($results) { $allResults += $results }
        } while ($results -and $results.Count -eq 5000)

        $current = $windowEnd.AddDays(1)
        Start-Sleep -Seconds 2  # Brief pause to avoid throttling
    }

    return $allResults
}

# Usage
$logs = Get-FullAuditLog `
  -StartDate ([datetime]"2023-10-01") `
  -EndDate ([datetime]"2024-03-31") `
  -UserIds "user@domain.com" `
  -Operations "FileDownloaded","SharingSet","HardDelete"
```

---

## 4. RecordType Reference Table

| RecordType Name | Numeric Value | Services / Workloads Covered |
|---|---|---|
| ExchangeAdmin | 1 | Exchange admin cmdlet operations |
| ExchangeItem | 2 | Mailbox item operations (per-item) |
| ExchangeItemGroup | 3 | Group mailbox operations |
| SharePoint | 4 | SharePoint document and list operations |
| SyntheticProbe | 5 | Synthetic monitoring probes |
| OneDrive | 6 | OneDrive for Business operations |
| AzureActiveDirectory | 8 | Entra ID / Azure AD directory operations |
| AzureActiveDirectoryAccountLogon | 9 | AAD sign-in / account logon events |
| DataCenterSecurityCmdlet | 11 | Datacenter security PowerShell |
| ComplianceDLPSharePoint | 13 | SharePoint DLP policy events |
| Sway | 14 | Microsoft Sway activity |
| ComplianceDLPExchange | 15 | Exchange DLP policy events |
| SharePointSharingOperation | 16 | SharePoint sharing-specific events |
| AzureActiveDirectoryStsLogon | 17 | STS token issuance events |
| SecurityComplianceCenter | 18 | Compliance portal operations |
| PowerBIAudit | 20 | Power BI operations |
| CRMOnline | 21 | Dynamics 365 / CRM operations |
| Compliance | 22 | DLP, retention, label events |
| MicrosoftTeams | 25 | Teams chats, meetings, calls |
| ThreatIntelligence | 28 | Threat intelligence events |
| ExchangeItemAggregated | 28 | Aggregated mailbox events (efficient) |
| HygieneEvent | 29 | EOP hygiene / spam filter events |
| DataInsightsRestApiAudit | 32 | Data insights REST API |
| InformationBarrierPolicyApplication | 33 | Information barrier enforcement |
| SharePointListOperation | 36 | SharePoint list operations |
| SharePointCommentOperation | 37 | SharePoint comments |
| DataGovernance | 38 | Governance lifecycle events |
| Kaizala | 39 | Microsoft Kaizala activity |
| SecurityAlert | 40 | Security alert events |
| MicrosoftFlow | 40 | Power Automate cloud flows |
| AeDExperience | 41 | AED experience |
| InformationProtectionPolicy | 41 | AIP / Information Protection |
| WorkplaceAnalytics | 44 | Viva Insights / Workplace Analytics |
| PowerAppsApp | 46 | Power Apps canvas/model-driven apps |
| PowerAppsPlan | 47 | Power Apps licensing plan events |
| ThreatFinder | 52 | Threat finder events |
| MicrosoftStream | 54 | Microsoft Stream video activity |
| ComplianceDLPSharePointClassification | 55 | SharePoint DLP classification |
| ThreatIntelligenceUrl | 56 | URL threat intelligence |
| SecurityComplianceAlerts | 59 | Security and compliance alerts |
| MicrosoftForms | 60 | Microsoft Forms responses and activity |
| ApplicationAudit | 61 | Application governance / app audit |
| ComplianceManager | 62 | Compliance Manager operations |
| AuditPolicyUpdate | 63 | Audit configuration changes |
| OneDriveSharingOperation | 64 | OneDrive sharing-specific events |
| SharePointSharingAndAccessOperations | 65 | SharePoint sharing + access |
| SharePointSearch | 66 | SharePoint search queries |
| PrivacyDataMinimization | 68 | Privacy / data minimization |
| LabelAnalytics | 70 | Label analytics events |
| MyAnalyticsSettings | 71 | Personal analytics settings |
| SecurityComplianceRBAC | 72 | Compliance center RBAC changes |
| UserTraining | 77 | Security awareness training |
| AirInvestigation | 78 | Automated investigation / AIR |
| WDATPAlerts | 82 | Defender for Endpoint alerts |
| SensitivityLabeledFileAction | 83 | Sensitivity-labeled file actions |
| AssessmentProcess | 84 | Assessment process |
| PrivacyDigestEmail | 85 | Privacy digest emails |
| ComplianceSupervision | 86 | Communication compliance |
| CustomerKeyEncryption | 87 | Customer Key events |
| InformationBarrierPolicyApplication | 93 | Information barrier application |
| AzureInformationProtectionAuditEvent | 100 | AIP classic audit |
| InformationProtectionPolicyLabel | 133 | Sensitivity label apply/change events |
| SecurityBaseline | 147 | Security baseline compliance |

---

## 5. Operations by Service

### Exchange / Outlook Operations

| Operation | Category | Description |
|---|---|---|
| `MailboxLogin` | Authentication | Mailbox accessed (logon) |
| `Send` | Mail Send | Email sent by mailbox owner |
| `SendAs` | Mail Send | Email sent impersonating mailbox owner |
| `SendOnBehalf` | Mail Send | Email sent on behalf of owner |
| `Create` | Content | Item created (message, meeting, note) |
| `Update` | Content | Item modified |
| `HardDelete` | Deletion | Permanently deleted — bypasses Recoverable Items |
| `SoftDelete` | Deletion | Moved to Recoverable Items\Deletions |
| `MoveToDeletedItems` | Deletion | Moved to Deleted Items folder |
| `Move` | Movement | Item moved between folders |
| `Copy` | Movement | Item copied |
| `FolderBind` | Access | Folder opened by delegate |
| `MessageBind` | Access | Message read by delegate |
| `New-InboxRule` | Configuration | New inbox rule created |
| `Set-InboxRule` | Configuration | Inbox rule modified |
| `Enable-InboxRule` | Configuration | Inbox rule enabled |
| `Disable-InboxRule` | Configuration | Inbox rule disabled |
| `Remove-InboxRule` | Configuration | Inbox rule deleted |
| `AddFolderPermissions` | Configuration | Folder access granted to delegate |
| `UpdateFolderPermissions` | Configuration | Folder permission changed |
| `RemoveFolderPermissions` | Configuration | Folder permission removed |
| `UpdateCalendarDelegation` | Configuration | Calendar delegate added/changed |
| `AddCalendarPermissions` | Configuration | Calendar permission added |
| `RemoveCalendarPermissions` | Configuration | Calendar permission removed |
| `ApplyRecord` | Compliance | Retention record label applied |
| `RecordDelete` | Compliance | Retention record deleted |

### SharePoint / OneDrive Operations

| Operation | Category | Description |
|---|---|---|
| `FileAccessed` | Access | File viewed or downloaded |
| `FileAccessedExtended` | Access | File accessed repeatedly in short period |
| `FileModified` | Content | File content modified |
| `FileUploaded` | Content | File uploaded |
| `FileDeleted` | Deletion | File deleted |
| `FileRecycled` | Deletion | File sent to recycle bin |
| `FileRestored` | Recovery | File restored from recycle bin |
| `FileCopied` | Movement | File copied |
| `FileMoved` | Movement | File moved |
| `FileDownloaded` | Export | File explicitly downloaded |
| `FileRenamed` | Metadata | File renamed |
| `FolderCreated` | Content | New folder created |
| `FolderDeleted` | Deletion | Folder deleted |
| `FolderModified` | Content | Folder modified |
| `SharingSet` | Sharing | Sharing permission applied |
| `SharingInvitationCreated` | Sharing | Sharing invitation sent |
| `SharingInvitationAccepted` | Sharing | Sharing invitation accepted |
| `AnonymousLinkCreated` | Sharing | Anonymous (Anyone) link created |
| `AnonymousLinkUsed` | Sharing | Anonymous link accessed |
| `AnonymousLinkUpdated` | Sharing | Anonymous link modified |
| `CompanyLinkCreated` | Sharing | Company-wide link created |
| `SecureLinkCreated` | Sharing | Specific-people link created |
| `SearchQueryPerformed` | Search | SharePoint search executed |
| `ListItemCreated` | List | SharePoint list item created |
| `ListItemUpdated` | List | SharePoint list item modified |
| `ListItemDeleted` | List | SharePoint list item deleted |
| `SiteCollectionCreated` | Admin | New site collection created |
| `SiteDeleted` | Admin | Site deleted |
| `SitePermissionsModified` | Admin | Site-level permissions changed |

### Teams Operations

| Operation | Category | Description |
|---|---|---|
| `ChatCreated` | Chat | New chat thread created |
| `ChatUpdated` | Chat | Chat metadata modified |
| `ChatDeleted` | Chat | Chat deleted |
| `MessageCreated` | Message | Message created in chat or channel |
| `MessageUpdated` | Message | Message edited |
| `MessageDeleted` | Message | Message deleted |
| `MessageSent` | Message | Message sent (confirmation event) |
| `MeetingCreated` | Meeting | Meeting scheduled |
| `MeetingUpdated` | Meeting | Meeting modified |
| `MeetingDeleted` | Meeting | Meeting cancelled |
| `MeetingStarted` | Meeting | Meeting started |
| `MeetingEnded` | Meeting | Meeting ended |
| `CallStarted` | Call | Call initiated |
| `CallEnded` | Call | Call ended |
| `RecordingStarted` | Recording | Meeting recording started |
| `RecordingEnded` | Recording | Meeting recording ended |
| `TeamCreated` | Team | New team created |
| `TeamUpdated` | Team | Team settings modified |
| `TeamDeleted` | Team | Team deleted |
| `MemberAdded` | Membership | Member added to team |
| `MemberRemoved` | Membership | Member removed from team |
| `BotAddedToTeam` | Apps | Bot installed in team |
| `TabAdded` | Apps | Tab added to channel |
| `ConnectorAdded` | Apps | Connector added to channel |
| `AppInstalled` | Apps | Teams app installed |
| `AppUninstalled` | Apps | Teams app uninstalled |

### Azure AD / Entra ID Operations

| Operation | Category | Description |
|---|---|---|
| `Add user` | User | New user account created |
| `Update user` | User | User account modified |
| `Delete user` | User | User account deleted |
| `Disable account` | User | Account disabled |
| `Reset user password` | User | Admin reset password |
| `Change user password` | User | User self-service password change |
| `UserLoggedIn` | Authentication | User sign-in (interactive) |
| `UserLoginFailed` | Authentication | Failed sign-in |
| `Add member to group` | Group | User added to group |
| `Remove member from group` | Group | User removed from group |
| `Add member to role` | Role | User assigned to directory role |
| `Remove member from role` | Role | Role assignment removed |
| `Add application` | App | New app registration created |
| `Delete application` | App | App registration deleted |
| `Add service principal` | App | New service principal created |
| `Add service principal credentials` | App | Secret/cert added to SP |
| `Remove service principal credentials` | App | Secret/cert removed from SP |
| `Consent to application` | OAuth | OAuth consent granted |
| `Add delegated permission grant` | OAuth | Delegated permission added |
| `Set company information` | Tenant | Tenant settings modified |
| `Add owner to application` | App | Owner added to app registration |
| `Remove owner from application` | App | Owner removed from app registration |

---

## 6. AuditData JSON Parsing

Every UAL result contains a raw `AuditData` field as a JSON string. Always parse it to extract meaningful details.

### Parse Single Record

```powershell
$results = Search-UnifiedAuditLog -StartDate "2024-01-01" -EndDate "2024-01-31" `
  -UserIds "user@domain.com" -ResultSize 10

$results | ForEach-Object {
    $data = $_.AuditData | ConvertFrom-Json
    [PSCustomObject]@{
        Timestamp       = $_.CreationDate.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
        User            = $_.UserIds
        Operation       = $_.Operations
        RecordType      = $_.RecordType
        ResultStatus    = $data.ResultStatus
        ObjectId        = $data.ObjectId
        ClientIP        = $data.ClientIP
        UserAgent       = $data.UserAgent
        Workload        = $data.Workload
        SiteUrl         = $data.SiteUrl
        SourceFile      = $data.SourceFileName
        TargetFile      = $data.DestinationFileName
        ItemType        = $data.ItemType
        ListId          = $data.ListId
    }
}
```

### Export to CSV for Analysis

```powershell
$results | ForEach-Object {
    $data = $_.AuditData | ConvertFrom-Json
    [PSCustomObject]@{
        Timestamp    = $_.CreationDate.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
        User         = $_.UserIds
        Operation    = $_.Operations
        RecordType   = $_.RecordType
        ObjectId     = $data.ObjectId
        ClientIP     = $data.ClientIP
        SiteUrl      = $data.SiteUrl
        SourceFile   = $data.SourceFileName
    }
} | Export-Csv -Path "C:\Investigation\ual_export_{timestamp}.csv" -NoTypeInformation -Encoding UTF8
```

### Common AuditData Fields by Service

| Field | Services | Description |
|---|---|---|
| `ClientIP` | All | Client IP address |
| `UserAgent` | Most | Browser/client user-agent string |
| `ResultStatus` | All | Success/Failure/PartiallySucceeded |
| `ObjectId` | All | Primary object affected |
| `Workload` | All | Service name (Exchange, SharePoint, Teams, etc.) |
| `SiteUrl` | SharePoint/OneDrive | Site collection URL |
| `SourceFileName` | SharePoint/OneDrive | File name |
| `SourceFileExtension` | SharePoint/OneDrive | File extension |
| `DestinationFileName` | SharePoint/OneDrive | Target file name (for copy/move) |
| `ItemType` | SharePoint/OneDrive | File, Folder, ListItem, etc. |
| `MailboxOwnerUPN` | Exchange | Owner of the accessed mailbox |
| `ClientInfoString` | Exchange | Client application details |
| `LogonType` | Exchange | 0=Owner, 1=Admin, 2=Delegate |
| `MessageSizeInBytes` | Exchange | Email size in bytes |
| `Subject` | Exchange | Email subject |
| `SendAsUPN` | Exchange | UPN of user who sent (SendAs) |
| `ChatThreadId` | Teams | Thread ID for Teams chat |
| `TeamName` | Teams | Team name |
| `ChannelName` | Teams | Channel name |
| `CommunicationType` | Teams | Chat type |
| `Parameters` | Exchange Admin | PowerShell parameters array |

---

## 7. Management Activity API (REST)

For programmatic, automated, or high-volume collection without PowerShell.

### API Base URL

```
https://manage.office.com/api/v1.0/{tenantId}/activity/feed/
```

### Available Content Types

| ContentType | Description |
|---|---|
| `Audit.AzureActiveDirectory` | Azure AD events |
| `Audit.Exchange` | Exchange events |
| `Audit.SharePoint` | SharePoint and OneDrive events |
| `Audit.General` | All other M365 services (Teams, Forms, etc.) |
| `DLP.All` | All DLP events |

### Step 1: Start Subscription (One-Time Setup)

```bash
# Start subscription for Audit.General
az rest --method POST \
  --uri "https://manage.office.com/api/v1.0/{tenantId}/activity/feed/subscriptions/start?contentType=Audit.General" \
  --headers "Content-Type=application/json" \
  --output json

# Verify active subscriptions
az rest --method GET \
  --uri "https://manage.office.com/api/v1.0/{tenantId}/activity/feed/subscriptions/list" \
  --output json
```

### Step 2: List Available Content Blobs

Content is organized into 1-hour blobs. List available blobs for a time window:

```bash
az rest --method GET \
  --uri "https://manage.office.com/api/v1.0/{tenantId}/activity/feed/subscriptions/content?contentType=Audit.General&startTime=2024-01-15T14:00:00&endTime=2024-01-15T16:00:00" \
  --output json
```

Response contains an array of content blobs with `contentUri` and `contentExpiration`.

### Step 3: Fetch Individual Content Blob

```bash
# Fetch a specific content blob (URL from Step 2)
az rest --method GET \
  --uri "{contentUri}" \
  --output json
```

Each blob returns an array of audit events in the same format as PowerShell `AuditData`.

### PowerShell REST Client for Management Activity API

```powershell
function Get-M365AuditViaAPI {
    param(
        [string]$TenantId,
        [string]$AccessToken,
        [string]$ContentType = "Audit.General",
        [datetime]$StartTime,
        [datetime]$EndTime
    )

    $baseUri = "https://manage.office.com/api/v1.0/$TenantId/activity/feed"
    $headers = @{ Authorization = "Bearer $AccessToken" }

    # List content blobs
    $listUri = "$baseUri/subscriptions/content?contentType=$ContentType" +
               "&startTime=$($StartTime.ToString('yyyy-MM-ddTHH:mm:ss'))" +
               "&endTime=$($EndTime.ToString('yyyy-MM-ddTHH:mm:ss'))"

    $blobs = (Invoke-RestMethod -Uri $listUri -Headers $headers).contentUri

    $allEvents = @()
    foreach ($blobUri in $blobs) {
        $events = Invoke-RestMethod -Uri $blobUri -Headers $headers
        $allEvents += $events
    }
    return $allEvents
}
```

---

## 8. Investigation Query Templates

### Template 1: Compromised Account — Full Activity Last 30 Days

```powershell
$start = (Get-Date).AddDays(-30).ToString("yyyy-MM-dd")
$end = Get-Date -Format "yyyy-MM-dd"
$upn = "victim@contoso.com"
$sessionId = [System.Guid]::NewGuid().ToString()
$allResults = @()

do {
    $results = Search-UnifiedAuditLog `
      -StartDate $start -EndDate $end `
      -UserIds $upn `
      -SessionId $sessionId -SessionCommand ReturnLargeSet -ResultSize 5000
    if ($results) { $allResults += $results }
} while ($results -and $results.Count -eq 5000)

# Group by service and operation
$allResults |
  Group-Object RecordType |
  Select-Object Name, Count |
  Sort-Object Count -Descending

# Export timeline
$allResults | ForEach-Object {
    $data = $_.AuditData | ConvertFrom-Json
    [PSCustomObject]@{
        UTC_Time     = $_.CreationDate.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
        Operation    = $_.Operations
        Service      = $_.RecordType
        ObjectId     = $data.ObjectId
        ClientIP     = $data.ClientIP
        SiteUrl      = $data.SiteUrl
        SourceFile   = $data.SourceFileName
    }
} | Sort-Object UTC_Time | Export-Csv -Path ".\compromise_timeline.csv" -NoTypeInformation
```

### Template 2: Inbox Rule Changes

```powershell
Search-UnifiedAuditLog -StartDate "2024-01-01" -EndDate "2024-03-31" `
  -UserIds "user@domain.com" `
  -Operations "New-InboxRule","Set-InboxRule","Enable-InboxRule","Disable-InboxRule","Remove-InboxRule" `
  -ResultSize 5000 |
  ForEach-Object {
    $data = $_.AuditData | ConvertFrom-Json
    [PSCustomObject]@{
      UTC_Time    = $_.CreationDate.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
      Operation   = $_.Operations
      RuleName    = ($data.Parameters | Where-Object { $_.Name -eq "Name" }).Value
      ForwardTo   = ($data.Parameters | Where-Object { $_.Name -eq "ForwardTo" }).Value
      DeleteMsg   = ($data.Parameters | Where-Object { $_.Name -eq "DeleteMessage" }).Value
      SubjectContains = ($data.Parameters | Where-Object { $_.Name -eq "SubjectContains" }).Value
      ClientIP    = $data.ClientIP
      SessionId   = $data.SessionId
    }
  } | Sort-Object UTC_Time
```

### Template 3: File Exfiltration — Bulk Downloads with Sensitive Extensions

```powershell
Search-UnifiedAuditLog -StartDate "2024-01-01" -EndDate "2024-01-31" `
  -UserIds "user@domain.com" `
  -RecordType SharePoint,OneDrive `
  -Operations "FileDownloaded","FileCopied","FileAccessed" `
  -ResultSize 5000 |
  ForEach-Object {
    $data = $_.AuditData | ConvertFrom-Json
    $ext = $data.SourceFileExtension?.ToLower()
    if ($ext -in @("xlsx","docx","pdf","zip","csv","pptx","txt","json","sql","bak")) {
      [PSCustomObject]@{
        UTC_Time   = $_.CreationDate.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
        Operation  = $_.Operations
        FileName   = $data.SourceFileName
        Extension  = $ext
        SiteUrl    = $data.SiteUrl
        ClientIP   = $data.ClientIP
        UserAgent  = $data.UserAgent
      }
    }
  } |
  Sort-Object UTC_Time |
  Group-Object {$_.UTC_Time.Substring(0,13)} |  # Group by hour
  Select-Object Name, Count, @{N="Files";E={$_.Group.FileName -join ", "}} |
  Where-Object Count -gt 10 |
  Sort-Object Count -Descending
```

### Template 4: External Sharing Audit

```powershell
Search-UnifiedAuditLog -StartDate "2024-01-01" -EndDate "2024-01-31" `
  -UserIds "user@domain.com" `
  -Operations "SharingSet","SharingInvitationCreated","AnonymousLinkCreated","AnonymousLinkUsed","CompanyLinkCreated" `
  -ResultSize 5000 |
  ForEach-Object {
    $data = $_.AuditData | ConvertFrom-Json
    [PSCustomObject]@{
      UTC_Time        = $_.CreationDate.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
      Operation       = $_.Operations
      FileName        = $data.SourceFileName
      SharedWith      = $data.TargetUserOrGroupName
      ShareeType      = $data.TargetUserOrGroupType  # Guest, External, Member, etc.
      SiteUrl         = $data.SiteUrl
      LinkType        = $data.SharingType
      ClientIP        = $data.ClientIP
    }
  } |
  Where-Object ShareeType -in @("Guest","External","Anyone") |
  Sort-Object UTC_Time
```

### Template 5: Mass Deletion Detection

```powershell
$deletions = Search-UnifiedAuditLog -StartDate "2024-01-01" -EndDate "2024-01-31" `
  -UserIds "user@domain.com" `
  -RecordType ExchangeItemAggregated `
  -Operations "HardDelete","SoftDelete","MoveToDeletedItems" `
  -ResultSize 5000

# Group by hour and flag hours with > 50 deletions
$deletions |
  Group-Object { $_.CreationDate.ToUniversalTime().ToString("yyyy-MM-dd HH") } |
  Where-Object Count -gt 50 |
  Select-Object Name, Count |
  Sort-Object Count -Descending |
  Format-Table -AutoSize
```

### Template 6: OAuth Consent Audit

```powershell
Search-UnifiedAuditLog -StartDate "2024-01-01" -EndDate "2024-03-31" `
  -Operations "Consent to application","Add delegated permission grant" `
  -ResultSize 5000 |
  ForEach-Object {
    $data = $_.AuditData | ConvertFrom-Json
    [PSCustomObject]@{
      UTC_Time     = $_.CreationDate.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
      GrantedBy    = $_.UserIds
      Operation    = $_.Operations
      AppName      = ($data.ModifiedProperties | Where-Object { $_.Name -eq "TargetId.Name" }).NewValue
      Scopes       = ($data.ModifiedProperties | Where-Object { $_.Name -eq "Scope" }).NewValue
      ClientIP     = $data.ClientIP
    }
  } | Sort-Object UTC_Time
```

### Template 7: SendAs Impersonation Detection

```powershell
Search-UnifiedAuditLog -StartDate "2024-01-01" -EndDate "2024-01-31" `
  -Operations "SendAs" `
  -ResultSize 5000 |
  ForEach-Object {
    $data = $_.AuditData | ConvertFrom-Json
    [PSCustomObject]@{
      UTC_Time      = $_.CreationDate.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
      SentAsUser    = $data.MailboxOwnerUPN  # Victim being impersonated
      SentByUser    = $_.UserIds             # Actor who sent
      Subject       = $data.AffectedItems.Subject
      ClientIP      = $data.ClientIPAddress
      LogonType     = $data.LogonType         # Should be 2 for delegate
    }
  } |
  Where-Object { $_.SentAsUser -ne $_.SentByUser } |  # Filter out self-sends
  Sort-Object UTC_Time
```

---

## 9. Throttling and Rate Limits

Search-UnifiedAuditLog is subject to throttling in high-volume environments:
- Maximum 5000 results per cmdlet execution
- No explicit published rate limit — use `Start-Sleep -Seconds 2` between paginated calls
- For Management Activity API: no explicit limit, but content blobs are pre-staged hourly

If throttling errors occur:
```powershell
# Add retry logic for throttling
$maxRetries = 3
$retryCount = 0
do {
    try {
        $results = Search-UnifiedAuditLog @params
        break
    } catch {
        $retryCount++
        if ($retryCount -ge $maxRetries) { throw }
        Write-Warning "Throttled — waiting 30 seconds (attempt $retryCount of $maxRetries)..."
        Start-Sleep -Seconds 30
    }
} while ($retryCount -lt $maxRetries)
```
