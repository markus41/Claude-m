# Exchange Online Administration

This reference covers Exchange Online administration using both Microsoft Graph API and Exchange Online PowerShell. Graph handles mailbox settings, mail folders, and calendar permissions. PowerShell is required for shared mailboxes, distribution lists, mail flow rules, and full delegation management.

## Graph-Accessible Operations

### Mailbox Settings

Read and update mailbox settings including auto-replies, language, time zone, and working hours.

**Endpoint**: `GET https://graph.microsoft.com/v1.0/users/{id}/mailboxSettings`

**Required scope**: `MailboxSettings.ReadWrite`

```typescript
interface MailboxSettings {
  automaticRepliesSetting: AutomaticRepliesSetting;
  language: {
    locale: string;      // e.g., "en-US"
    displayName: string;  // e.g., "English (United States)"
  };
  timeZone: string;       // e.g., "Pacific Standard Time"
  workingHours: {
    daysOfWeek: string[];
    startTime: string;    // e.g., "08:00:00.0000000"
    endTime: string;      // e.g., "17:00:00.0000000"
    timeZone: {
      name: string;
    };
  };
  dateFormat: string;     // e.g., "MM/dd/yyyy"
  timeFormat: string;     // e.g., "h:mm tt"
}
```

### Automatic Replies (Out of Office)

Set or clear automatic replies for a user.

**Endpoint**: `PATCH https://graph.microsoft.com/v1.0/users/{id}/mailboxSettings`

```typescript
interface AutomaticRepliesSetting {
  status: "disabled" | "alwaysEnabled" | "scheduled";
  externalAudience: "none" | "contactsOnly" | "all";
  internalReplyMessage: string;  // HTML allowed
  externalReplyMessage: string;  // HTML allowed
  scheduledStartDateTime: {
    dateTime: string;   // ISO 8601: "2025-07-01T08:00:00"
    timeZone: string;   // "Pacific Standard Time"
  };
  scheduledEndDateTime: {
    dateTime: string;
    timeZone: string;
  };
}
```

**Enable scheduled auto-reply**:

```json
{
  "automaticRepliesSetting": {
    "status": "scheduled",
    "externalAudience": "contactsOnly",
    "internalReplyMessage": "<html><body><p>I am currently out of office and will return on July 15. For urgent matters, please contact helpdesk@contoso.com.</p></body></html>",
    "externalReplyMessage": "<html><body><p>Thank you for your email. I am currently out of office. I will respond when I return.</p></body></html>",
    "scheduledStartDateTime": {
      "dateTime": "2025-07-01T08:00:00",
      "timeZone": "Pacific Standard Time"
    },
    "scheduledEndDateTime": {
      "dateTime": "2025-07-15T08:00:00",
      "timeZone": "Pacific Standard Time"
    }
  }
}
```

**Disable auto-reply**:

```json
{
  "automaticRepliesSetting": {
    "status": "disabled"
  }
}
```

### Mail Folders

List mail folders for a user mailbox.

**Endpoint**: `GET https://graph.microsoft.com/v1.0/users/{id}/mailFolders`

**Required scope**: `Mail.ReadWrite`

```typescript
interface MailFolder {
  id: string;
  displayName: string;
  parentFolderId: string;
  childFolderCount: number;
  unreadItemCount: number;
  totalItemCount: number;
  isHidden: boolean;
}
```

Well-known folder names: `inbox`, `drafts`, `sentitems`, `deleteditems`, `junkemail`, `archive`.

Access by well-known name: `GET /users/{id}/mailFolders/inbox`

### Calendar Permissions

Manage calendar sharing permissions via Graph.

**Endpoint**: `GET https://graph.microsoft.com/v1.0/users/{id}/calendar/calendarPermissions`

**Required scope**: `Calendars.ReadWrite`

```typescript
interface CalendarPermission {
  id: string;
  emailAddress: {
    name: string;
    address: string;
  } | null;
  isRemovable: boolean;
  isInsideOrganization: boolean;
  role: CalendarRole;
  allowedRoles: CalendarRole[];
}

type CalendarRole =
  | "none"
  | "freeBusyRead"
  | "limitedRead"
  | "read"
  | "write"
  | "delegateWithoutPrivateEventAccess"
  | "delegateWithPrivateEventAccess";
```

**Grant calendar access**:

```
POST https://graph.microsoft.com/v1.0/users/{id}/calendar/calendarPermissions
Content-Type: application/json

{
  "emailAddress": {
    "name": "Jane Smith",
    "address": "jane@contoso.com"
  },
  "role": "read"
}
```

**Update calendar permission**:

```
PATCH https://graph.microsoft.com/v1.0/users/{id}/calendar/calendarPermissions/{permissionId}
Content-Type: application/json

{
  "role": "write"
}
```

**Remove calendar permission**:

```
DELETE https://graph.microsoft.com/v1.0/users/{id}/calendar/calendarPermissions/{permissionId}
```

### Send Mail

Send an email on behalf of a user (delegated) or as the application.

**Endpoint**: `POST https://graph.microsoft.com/v1.0/users/{id}/sendMail`

**Required scope**: `Mail.Send`

```json
{
  "message": {
    "subject": "Welcome to Contoso",
    "body": {
      "contentType": "HTML",
      "content": "<p>Welcome aboard!</p>"
    },
    "toRecipients": [
      {
        "emailAddress": {
          "address": "newuser@contoso.com"
        }
      }
    ]
  },
  "saveToSentItems": true
}
```

## PowerShell-Required Operations

The following Exchange Online operations are not available through Microsoft Graph and require the Exchange Online PowerShell module.

### Module Setup

```powershell
# Install the module (one-time)
Install-Module -Name ExchangeOnlineManagement -Force -AllowClobber

# Connect with interactive login
Connect-ExchangeOnline -UserPrincipalName admin@contoso.com

# Connect with certificate (for automation)
Connect-ExchangeOnline -CertificateThumbprint "THUMBPRINT" -AppId "APP_ID" -Organization "contoso.onmicrosoft.com"

# Disconnect when done
Disconnect-ExchangeOnline -Confirm:$false
```

### Shared Mailbox

Create and manage shared mailboxes that multiple users can access.

```powershell
# Create shared mailbox
New-Mailbox -Shared -Name "Support Team" -DisplayName "Support Team" -Alias "support" -PrimarySmtpAddress "support@contoso.com"

# Grant Full Access (can open and read the mailbox)
Add-MailboxPermission -Identity "support@contoso.com" -User "user@contoso.com" -AccessRights FullAccess -InheritanceType All -AutoMapping $true

# Grant Send As (can send as the shared mailbox)
Add-RecipientPermission -Identity "support@contoso.com" -Trustee "user@contoso.com" -AccessRights SendAs -Confirm:$false

# Grant Send on Behalf (sends with "on behalf of" notation)
Set-Mailbox -Identity "support@contoso.com" -GrantSendOnBehalfTo @{Add="user@contoso.com"}

# List shared mailbox permissions
Get-MailboxPermission -Identity "support@contoso.com" | Where-Object { $_.User -ne "NT AUTHORITY\SELF" }
Get-RecipientPermission -Identity "support@contoso.com" | Where-Object { $_.Trustee -ne "NT AUTHORITY\SELF" }

# Convert user mailbox to shared mailbox
Set-Mailbox -Identity "user@contoso.com" -Type Shared

# Convert shared mailbox to user mailbox
Set-Mailbox -Identity "shared@contoso.com" -Type Regular
```

**Important**: After converting a mailbox to shared, you can remove the license from the user (shared mailboxes under 50 GB do not require a license). If the shared mailbox needs more than 50 GB or In-Place Archive, an Exchange Online Plan 2 license is required.

### Distribution Lists

Create and manage distribution lists for email distribution.

```powershell
# Create distribution list
New-DistributionGroup -Name "All Engineering" -Alias "all-engineering" -PrimarySmtpAddress "all-engineering@contoso.com" -Type "Distribution" -MemberDepartRestriction "Closed" -MemberJoinRestriction "Closed"

# Create mail-enabled security group
New-DistributionGroup -Name "Finance Access" -Alias "finance-access" -PrimarySmtpAddress "finance-access@contoso.com" -Type "Security"

# Add members
Add-DistributionGroupMember -Identity "all-engineering" -Member "user@contoso.com"

# Add multiple members from a list
$members = @("user1@contoso.com", "user2@contoso.com", "user3@contoso.com")
foreach ($member in $members) {
    Add-DistributionGroupMember -Identity "all-engineering" -Member $member -ErrorAction SilentlyContinue
}

# Remove member
Remove-DistributionGroupMember -Identity "all-engineering" -Member "user@contoso.com" -Confirm:$false

# List members
Get-DistributionGroupMember -Identity "all-engineering" | Select-Object DisplayName, PrimarySmtpAddress

# List all distribution lists
Get-DistributionGroup -ResultSize Unlimited | Select-Object DisplayName, PrimarySmtpAddress, GroupType

# Update distribution list properties
Set-DistributionGroup -Identity "all-engineering" -ManagedBy "manager@contoso.com" -RequireSenderAuthenticationEnabled $true

# Delete distribution list
Remove-DistributionGroup -Identity "all-engineering" -Confirm:$false
```

### Mail Flow Rules (Transport Rules)

Create rules that process email in transit.

```powershell
# Disclaimer/signature rule
New-TransportRule -Name "Legal Disclaimer" -ApplyHtmlDisclaimerLocation "Append" -ApplyHtmlDisclaimerText "<hr><p style='font-size:10px'>Confidential notice...</p>" -ApplyHtmlDisclaimerFallbackAction "Wrap" -SentToScope "NotInOrganization"

# Block external auto-forwards
New-TransportRule -Name "Block External Auto-Forwards" -From @() -SentToScope "NotInOrganization" -MessageTypeMatches "AutoForward" -RejectMessageReasonText "External auto-forwarding is not permitted." -RejectMessageEnhancedStatusCode "5.7.1"

# Add external email warning
New-TransportRule -Name "External Email Warning" -FromScope "NotInOrganization" -PrependSubject "[EXTERNAL] "

# Redirect specific emails
New-TransportRule -Name "Redirect CEO Mail" -RecipientAddressContainsWords "ceo@contoso.com" -CopyTo "executive-assistant@contoso.com"

# List all transport rules
Get-TransportRule | Select-Object Name, State, Priority

# Disable a rule
Disable-TransportRule -Identity "External Email Warning" -Confirm:$false

# Remove a rule
Remove-TransportRule -Identity "External Email Warning" -Confirm:$false
```

### Mailbox Delegation

Configure full delegation permissions.

```powershell
# Full Access — user can open the mailbox
Add-MailboxPermission -Identity "manager@contoso.com" -User "assistant@contoso.com" -AccessRights FullAccess -InheritanceType All -AutoMapping $true

# Remove Full Access
Remove-MailboxPermission -Identity "manager@contoso.com" -User "assistant@contoso.com" -AccessRights FullAccess -InheritanceType All -Confirm:$false

# Send As
Add-RecipientPermission -Identity "manager@contoso.com" -Trustee "assistant@contoso.com" -AccessRights SendAs -Confirm:$false

# Remove Send As
Remove-RecipientPermission -Identity "manager@contoso.com" -Trustee "assistant@contoso.com" -AccessRights SendAs -Confirm:$false

# Send on Behalf
Set-Mailbox -Identity "manager@contoso.com" -GrantSendOnBehalfTo @{Add="assistant@contoso.com"}

# Remove Send on Behalf
Set-Mailbox -Identity "manager@contoso.com" -GrantSendOnBehalfTo @{Remove="assistant@contoso.com"}

# View all delegates
Get-MailboxPermission -Identity "manager@contoso.com" | Where-Object { $_.User -ne "NT AUTHORITY\SELF" -and $_.IsInherited -eq $false }
```

### Message Trace

Track email delivery for troubleshooting.

```powershell
# Trace messages for a specific sender (last 10 days)
Get-MessageTrace -SenderAddress "user@contoso.com" -StartDate (Get-Date).AddDays(-10) -EndDate (Get-Date) | Select-Object Received, SenderAddress, RecipientAddress, Subject, Status

# Trace messages to a specific recipient
Get-MessageTrace -RecipientAddress "user@contoso.com" -StartDate (Get-Date).AddDays(-2) -EndDate (Get-Date)

# Trace failed deliveries
Get-MessageTrace -Status "Failed" -StartDate (Get-Date).AddDays(-7) -EndDate (Get-Date) | Select-Object Received, SenderAddress, RecipientAddress, Subject, Status

# Detailed trace (for messages older than 10 days, up to 90 days)
Start-HistoricalSearch -ReportTitle "Monthly Trace" -StartDate (Get-Date).AddDays(-30) -EndDate (Get-Date) -ReportType MessageTrace -SenderAddress "user@contoso.com"
```

### Mailbox Properties

Query and update mailbox configuration.

```powershell
# Get mailbox details
Get-Mailbox -Identity "user@contoso.com" | Select-Object DisplayName, PrimarySmtpAddress, RecipientTypeDetails, ProhibitSendQuota, ProhibitSendReceiveQuota

# Get mailbox statistics (size)
Get-MailboxStatistics -Identity "user@contoso.com" | Select-Object DisplayName, TotalItemSize, ItemCount, LastLogonTime

# Set mailbox quota
Set-Mailbox -Identity "user@contoso.com" -ProhibitSendQuota 49GB -ProhibitSendReceiveQuota 50GB -IssueWarningQuota 48GB

# Enable archive mailbox
Enable-Mailbox -Identity "user@contoso.com" -Archive

# Get all mailbox sizes (for reporting)
Get-Mailbox -ResultSize Unlimited | Get-MailboxStatistics | Select-Object DisplayName, TotalItemSize, ItemCount | Sort-Object TotalItemSize -Descending
```

## Room and Resource Mailboxes

Room and equipment mailboxes are managed via Exchange Online PowerShell.

```powershell
# Create a room mailbox
New-Mailbox -Room -Name "Conference Room A" -Alias "conf-room-a" -PrimarySmtpAddress "conf-room-a@contoso.com"

# Create an equipment mailbox
New-Mailbox -Equipment -Name "Projector 1" -Alias "projector-1" -PrimarySmtpAddress "projector-1@contoso.com"

# Configure room settings
Set-CalendarProcessing -Identity "conf-room-a@contoso.com" -AutomateProcessing AutoAccept -AddOrganizerToSubject $true -DeleteComments $false -DeleteSubject $false

# Set room capacity
Set-Place -Identity "conf-room-a@contoso.com" -Capacity 10 -Building "HQ" -Floor 3

# List all room mailboxes
Get-Mailbox -RecipientTypeDetails RoomMailbox | Select-Object DisplayName, PrimarySmtpAddress

# Configure booking window (60 days ahead)
Set-CalendarProcessing -Identity "conf-room-a@contoso.com" -BookingWindowInDays 60 -MaximumDurationInMinutes 480
```

Room mailboxes can also be queried via Graph API for calendar availability:

```
GET https://graph.microsoft.com/v1.0/users/conf-room-a@contoso.com/calendar/calendarView?startDateTime=2025-07-01T00:00:00Z&endDateTime=2025-07-02T00:00:00Z
```

## Email Forwarding

Configure email forwarding for mailboxes.

```powershell
# Forward to external address (keeping a copy in the original mailbox)
Set-Mailbox -Identity "user@contoso.com" -ForwardingSmtpAddress "smtp:external@partner.com" -DeliverToMailboxAndForward $true

# Forward to internal user (no copy kept)
Set-Mailbox -Identity "user@contoso.com" -ForwardingAddress "other-user@contoso.com" -DeliverToMailboxAndForward $false

# Remove forwarding
Set-Mailbox -Identity "user@contoso.com" -ForwardingSmtpAddress $null -ForwardingAddress $null

# Check forwarding settings
Get-Mailbox -Identity "user@contoso.com" | Select-Object ForwardingAddress, ForwardingSmtpAddress, DeliverToMailboxAndForward
```

## Retention Policies

Apply retention policies to mailboxes for compliance.

```powershell
# Apply a retention policy to a mailbox
Set-Mailbox -Identity "user@contoso.com" -RetentionPolicy "Default MRM Policy"

# Place a mailbox on litigation hold
Set-Mailbox -Identity "user@contoso.com" -LitigationHoldEnabled $true -LitigationHoldDuration 365

# Check litigation hold status
Get-Mailbox -Identity "user@contoso.com" | Select-Object LitigationHoldEnabled, LitigationHoldDate, LitigationHoldDuration
```

## Hybrid Considerations

For organizations with hybrid Exchange (on-premises and cloud):

- **Mailbox routing**: Users may have mailboxes on-premises or in the cloud. Check `RecipientTypeDetails` to determine location (`UserMailbox` for cloud, `MailUser` for on-premises with mail routing)
- **Directory sync**: Changes to on-premises AD sync to Entra ID via Azure AD Connect. Do not modify synced attributes directly in the cloud
- **Mail flow**: Hybrid mail flow uses connectors between on-premises and Exchange Online. Transport rules may exist in both locations
- **Shared mailboxes**: Must be created in the location where they will reside. Cross-premises shared mailboxes have limited functionality
- **Migration**: Use `New-MoveRequest` for mailbox migration from on-premises to Exchange Online

Always verify the mailbox location before attempting management operations:

```powershell
Get-Mailbox -Identity "user@contoso.com" | Select-Object RecipientTypeDetails, PrimarySmtpAddress
# Cloud mailbox: RecipientTypeDetails = UserMailbox
# On-prem (mail-enabled in cloud): RecipientTypeDetails = MailUser
```
