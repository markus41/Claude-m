# Teams Administration

This reference covers Microsoft Teams administration via Microsoft Graph API and Teams PowerShell module.

## Required Scopes

| Operation | Scope |
|---|---|
| Team CRUD | `Team.ReadWrite.All` |
| Team membership | `TeamMember.ReadWrite.All` |
| App installation | `TeamsAppInstallation.ReadWriteForTeam.All` |
| Messaging/meeting policies | Teams PowerShell (`Connect-MicrosoftTeams`) |

## Team Management (Graph API)

### List Teams

```
GET https://graph.microsoft.com/v1.0/groups?$filter=resourceProvisioningOptions/Any(x:x eq 'Team')&$select=id,displayName,description,visibility
```

Or list teams the signed-in user is a member of:

```
GET https://graph.microsoft.com/v1.0/me/joinedTeams
```

### Get Team Details

```
GET https://graph.microsoft.com/v1.0/teams/{teamId}
```

Response includes `memberSettings`, `messagingSettings`, `funSettings`, `guestSettings`.

### Create Team

```
POST https://graph.microsoft.com/v1.0/teams
Content-Type: application/json

{
  "template@odata.bind": "https://graph.microsoft.com/v1.0/teamsTemplates('standard')",
  "displayName": "Engineering Team",
  "description": "Engineering collaboration team",
  "visibility": "Private",
  "members": [
    {
      "@odata.type": "#microsoft.graph.aadUserConversationMember",
      "roles": ["owner"],
      "user@odata.bind": "https://graph.microsoft.com/v1.0/users('user-object-id')"
    }
  ]
}
```

Response: `202 Accepted` with a `Location` header for polling team provisioning status.

### Update Team Settings

```
PATCH https://graph.microsoft.com/v1.0/teams/{teamId}
Content-Type: application/json

{
  "memberSettings": {
    "allowCreateUpdateChannels": false,
    "allowDeleteChannels": false
  },
  "messagingSettings": {
    "allowUserEditMessages": true,
    "allowUserDeleteMessages": false
  },
  "funSettings": {
    "allowGiphy": false
  }
}
```

### Archive / Restore Team

```
POST https://graph.microsoft.com/v1.0/teams/{teamId}/archive
POST https://graph.microsoft.com/v1.0/teams/{teamId}/unarchive
```

### Delete Team

Deleting a team deletes the underlying Microsoft 365 Group:

```
DELETE https://graph.microsoft.com/v1.0/groups/{teamId}
```

## Channel Management

### List Channels

```
GET https://graph.microsoft.com/v1.0/teams/{teamId}/channels
```

Use `?$filter=membershipType eq 'standard'` to exclude private channels.

### Create Channel

```
POST https://graph.microsoft.com/v1.0/teams/{teamId}/channels
Content-Type: application/json

{
  "displayName": "Announcements",
  "description": "Company-wide announcements",
  "membershipType": "standard"
}
```

For private channels, set `"membershipType": "private"` and include initial members.

### Delete Channel

Standard channels only (General channel cannot be deleted):

```
DELETE https://graph.microsoft.com/v1.0/teams/{teamId}/channels/{channelId}
```

## Team Membership

### List Members

```
GET https://graph.microsoft.com/v1.0/teams/{teamId}/members
```

Response includes `roles` array (`owner` or empty for member).

### Add Member

```
POST https://graph.microsoft.com/v1.0/teams/{teamId}/members
Content-Type: application/json

{
  "@odata.type": "#microsoft.graph.aadUserConversationMember",
  "roles": [],
  "user@odata.bind": "https://graph.microsoft.com/v1.0/users('user-object-id')"
}
```

### Update Member Role

```
PATCH https://graph.microsoft.com/v1.0/teams/{teamId}/members/{membershipId}
Content-Type: application/json

{
  "roles": ["owner"]
}
```

### Remove Member

```
DELETE https://graph.microsoft.com/v1.0/teams/{teamId}/members/{membershipId}
```

## Team Templates

```
GET https://graph.microsoft.com/v1.0/teamwork/teamTemplates
```

Standard templates include: `standard`, `educationClass`, `educationProfessionalLearningCommunity`, `retailStore`, `healthcareWard`, `healthcareHospital`.

## App Management

### List Installed Apps

```
GET https://graph.microsoft.com/v1.0/teams/{teamId}/installedApps?$expand=teamsApp
```

### Install App

```
POST https://graph.microsoft.com/v1.0/teams/{teamId}/installedApps
Content-Type: application/json

{
  "teamsApp@odata.bind": "https://graph.microsoft.com/v1.0/appCatalogs/teamsApps/{appId}"
}
```

### Upgrade App

```
POST https://graph.microsoft.com/v1.0/teams/{teamId}/installedApps/{appInstallationId}/upgrade
```

## Teams PowerShell — Policy Management

```powershell
# Connect
Install-Module -Name MicrosoftTeams -Force
Connect-MicrosoftTeams

# Messaging policies
Get-CsTeamsMessagingPolicy
New-CsTeamsMessagingPolicy -Identity "RestrictedMessaging" -AllowUserEditMessages $false -AllowUserDeleteMessages $false
Grant-CsTeamsMessagingPolicy -PolicyName "RestrictedMessaging" -Identity "user@contoso.com"

# Meeting policies
Get-CsTeamsMeetingPolicy
New-CsTeamsMeetingPolicy -Identity "ExternalMeetingsDisabled" -AllowExternalParticipantGiveRequestControl $false
Grant-CsTeamsMeetingPolicy -PolicyName "ExternalMeetingsDisabled" -Identity "user@contoso.com"

# App permission policies
Get-CsTeamsAppPermissionPolicy
New-CsTeamsAppPermissionPolicy -Identity "BlockAllThirdParty" -GlobalCatalogAppsType BlockedAppList -PrivateCatalogAppsType AllowedAppList
Grant-CsTeamsAppPermissionPolicy -PolicyName "BlockAllThirdParty" -Identity "user@contoso.com"

# Voice policies (calling)
Get-CsTeamsCallingPolicy
Grant-CsTeamsCallingPolicy -PolicyName "AllowCalling" -Identity "user@contoso.com"

# Disconnect
Disconnect-MicrosoftTeams
```

## Teams Lifecycle Settings

```powershell
# Set group expiration policy (applies to M365 Groups / Teams)
$policy = Get-AzureADMSGroupLifecyclePolicy
New-AzureADMSGroupLifecyclePolicy -GroupLifetimeInDays 180 -ManagedGroupTypes "All" -AlternateNotificationEmails "admin@contoso.com"

# Renew a team before expiration
Invoke-MgRenewGroup -GroupId "team-object-id"
```

## Guest Access

```powershell
# Check current guest access setting
Get-CsTeamsClientConfiguration | Select-Object AllowGuestUser

# Disable guest access tenant-wide
Set-CsTeamsClientConfiguration -AllowGuestUser $false
```

Via Graph, manage guest membership the same as regular members — guest users have `userType: "Guest"` in Entra ID.

## Sensitivity Labels for Teams

Apply sensitivity labels to control privacy, guest access, and external sharing at team creation:

```
PATCH https://graph.microsoft.com/v1.0/groups/{teamId}
Content-Type: application/json

{
  "assignedLabels": [
    {
      "labelId": "sensitivity-label-guid"
    }
  ]
}
```

## Bulk Team Provisioning Pattern

For provisioning multiple teams from a CSV:

1. Read CSV with columns: `TeamName`, `Description`, `Visibility`, `Owners`, `Members`
2. Validate all owner/member UPNs exist in Entra ID (`GET /users/{upn}`)
3. For each row: POST to `/teams` and capture the `Location` header
4. Poll provisioning status: `GET {locationUrl}` until `provisioningState: "Succeeded"`
5. Add members/owners after provisioning completes
6. Generate markdown report with team IDs and deep links

## Shared Channels (B2B Direct Connect Federation)

Shared channels allow external users from partner tenants to participate without becoming guests. This uses B2B Direct Connect, which requires mutual configuration on both sides.

### Prerequisites — Cross-Tenant Access Policy

Both tenants must enable B2B direct connect in their cross-tenant access settings. B2B direct connect is disabled by default.

Configure outbound B2B direct connect (allowing your users to join external shared channels):

```
PATCH https://graph.microsoft.com/v1.0/policies/crossTenantAccessPolicy/partners/{partnerTenantId}
Content-Type: application/json

{
  "b2bDirectConnectOutbound": {
    "usersAndGroups": {
      "accessType": "allowed",
      "targets": [
        { "target": "AllUsers", "targetType": "user" }
      ]
    },
    "applications": {
      "accessType": "allowed",
      "targets": [
        { "target": "AllApplications", "targetType": "application" }
      ]
    }
  }
}
```

Configure inbound B2B direct connect (allowing partner users into your shared channels):

```
PATCH https://graph.microsoft.com/v1.0/policies/crossTenantAccessPolicy/partners/{partnerTenantId}
Content-Type: application/json

{
  "b2bDirectConnectInbound": {
    "usersAndGroups": {
      "accessType": "allowed",
      "targets": [
        { "target": "AllUsers", "targetType": "user" }
      ]
    },
    "applications": {
      "accessType": "allowed",
      "targets": [
        { "target": "AllApplications", "targetType": "application" }
      ]
    }
  }
}
```

### Create a Shared Channel

```
POST https://graph.microsoft.com/v1.0/teams/{teamId}/channels
Content-Type: application/json

{
  "displayName": "Cross-Company Project",
  "description": "Shared channel for partner collaboration",
  "membershipType": "shared"
}
```

Response: `201 Created` with the channel object. The `membershipType` value `"shared"` creates a Teams Connect shared channel.

### List Teams That Share the Channel

```
GET https://graph.microsoft.com/v1.0/teams/{teamId}/channels/{channelId}/sharedWithTeams
```

Response includes `tenantId` for each external team sharing the channel.

### List Allowed Members in a Shared Channel

Returns both direct and indirect members (includes members from the team the channel is shared with):

```
GET https://graph.microsoft.com/v1.0/teams/{teamId}/channels/{channelId}/sharedWithTeams/{sharedWithChannelTeamId}/allowedMembers
```

### Edge Cases and Constraints

- B2B direct connect is **disabled by default** — both tenants must explicitly enable it
- Shared channels only work with B2B direct connect; standard guest (B2B collaboration) users cannot be added to shared channels
- External users in shared channels remain in their home tenant; they are not represented as guest objects in your directory
- The General channel of a team cannot be converted to or created as a shared channel
- When configuring B2B direct connect outbound, your tenant shares limited contact data (display name, email) with the partner tenant
- Maximum of 50 teams can share a single channel
- Shared channels do not support all Teams features (e.g., scheduled meetings within the channel, some bots)

## Teams Phone: Call Queues and Auto Attendants

Teams Phone call queues and auto attendants are managed primarily via Teams PowerShell. The Microsoft Graph API does not yet expose dedicated CRUD endpoints for these resources. The Graph Call Records API can be used for call analytics.

### Resource Account Setup (Graph API)

Call queues and auto attendants require a resource account (an online application instance) with a Teams Phone Resource Account license:

```
POST https://graph.microsoft.com/v1.0/users
Content-Type: application/json

{
  "accountEnabled": true,
  "displayName": "Sales Call Queue",
  "mailNickname": "sales-callqueue",
  "userPrincipalName": "sales-callqueue@contoso.onmicrosoft.com",
  "passwordProfile": {
    "forceChangePasswordNextSignIn": false,
    "password": "<complex-password>"
  }
}
```

After creating the user, set up the application instance via PowerShell:

```powershell
Connect-MicrosoftTeams

# Create a resource account for a call queue
New-CsOnlineApplicationInstance `
  -UserPrincipalName "sales-callqueue@contoso.com" `
  -ApplicationId "11cd3e2e-fccb-42ad-ad00-878b93575e07" `
  -DisplayName "Sales Call Queue"
# ApplicationId 11cd3e2e-... = Call Queue
# ApplicationId ce933385-... = Auto Attendant
```

### Create and Configure a Call Queue

```powershell
# Retrieve available agents (users or distribution groups)
$agentGroup = Get-AzureADGroup -SearchString "Sales Team"

# Create the call queue
New-CsCallQueue `
  -Name "Sales Queue" `
  -UseDefaultMusicOnHold $true `
  -WelcomeMusicAudioFileId $null `
  -RoutingMethod Attendant `
  -PresenceBasedRouting $true `
  -ConferenceMode $true `
  -DistributionLists @($agentGroup.ObjectId) `
  -OverflowThreshold 50 `
  -OverflowAction DisconnectWithBusy `
  -TimeoutThreshold 300 `
  -TimeoutAction Disconnect

# Associate the resource account with the call queue
$callQueue = Get-CsCallQueue -NameFilter "Sales Queue"
$resourceAccount = Get-CsOnlineApplicationInstance -UPN "sales-callqueue@contoso.com"
New-CsOnlineApplicationInstanceAssociation `
  -Identities @($resourceAccount.ObjectId) `
  -ConfigurationId $callQueue.Identity `
  -ConfigurationType CallQueue
```

### Create an Auto Attendant

```powershell
# Build business hours schedule
$timeRange = New-CsOnlineTimeRange -Start 09:00 -End 17:00
$businessHours = New-CsOnlineSchedule -Name "Business Hours" `
  -WeeklyRecurrentSchedule $true `
  -MondayHours @($timeRange) `
  -TuesdayHours @($timeRange) `
  -WednesdayHours @($timeRange) `
  -ThursdayHours @($timeRange) `
  -FridayHours @($timeRange)

# Build greeting prompt
$greeting = New-CsAutoAttendantPrompt -TextToSpeechPrompt "Thank you for calling Contoso. Press 1 for Sales, Press 2 for Support."

# Build dial-by-name menu
$salesEntity = New-CsAutoAttendantCallableEntity -Identity "sales-callqueue@contoso.com" -Type ApplicationEndpoint
$menuOption1 = New-CsAutoAttendantMenuOption -Action TransferCallToTarget -DtmfResponse Tone1 -CallTarget $salesEntity
$menu = New-CsAutoAttendantMenu -Name "Main Menu" -Prompts @($greeting) -MenuOptions @($menuOption1)

# Build the call flow for business hours
$businessHoursFlow = New-CsAutoAttendantCallFlow -Name "Business Hours Flow" -Menu $menu -Greetings @($greeting)
$businessHoursAssociation = New-CsAutoAttendantCallHandlingAssociation -Type Regular -ScheduleId $businessHours.Id -CallFlowId $businessHoursFlow.Id

# Create the auto attendant
New-CsAutoAttendant `
  -Name "Contoso Main AA" `
  -DefaultCallFlow $businessHoursFlow `
  -Language "en-US" `
  -TimeZoneId "Eastern Standard Time" `
  -CallHandlingAssociations @($businessHoursAssociation)
```

### Query Call Records for Call Queue Analytics (Graph API)

```
GET https://graph.microsoft.com/v1.0/communications/callRecords?$filter=startDateTime ge 2025-01-01T00:00:00Z&$select=id,startDateTime,endDateTime,type,sessions
```

To get detailed session-level data (which includes queue routing information):

```
GET https://graph.microsoft.com/v1.0/communications/callRecords/{callRecordId}?$expand=sessions($expand=segments)
```

### Key PowerShell Cmdlet Reference

| Purpose | Cmdlet |
|---|---|
| List all call queues | `Get-CsCallQueue` |
| Update a call queue | `Set-CsCallQueue -Identity <id> -OverflowThreshold 30` |
| List all auto attendants | `Get-CsAutoAttendant` |
| Update auto attendant | `Set-CsAutoAttendant` |
| List resource accounts | `Get-CsOnlineApplicationInstance` |
| Check association status | `Get-CsOnlineApplicationInstanceAssociationStatus` |
| Assign phone number to resource account | `Set-CsPhoneNumberAssignment -Identity <upn> -PhoneNumber <e164> -PhoneNumberType DirectRouting` |

## Sensitivity Label Assignment to Teams

Sensitivity labels on Microsoft 365 groups (and therefore Teams) control privacy settings, external user access, and unmanaged device access. Assignment via Graph API uses the `/beta` endpoint and requires **delegated** permissions — application-only tokens cannot set `assignedLabels`.

### List Available Sensitivity Labels

```
GET https://graph.microsoft.com/beta/security/informationProtection/sensitivityLabels
```

### Assign a Sensitivity Label to a Team's Group

```
PATCH https://graph.microsoft.com/beta/groups/{teamId}
Content-Type: application/json

{
  "assignedLabels": [
    {
      "labelId": "sensitivity-label-guid",
      "displayName": "Confidential"
    }
  ]
}
```

Response: `204 No Content` on success.

**Critical constraint**: `assignedLabels` cannot be updated using application permissions. Only delegated authentication (acting as a signed-in user) is supported. Attempting to set labels with app-only authentication returns `403 Forbidden`.

### Read Current Label on a Team

```
GET https://graph.microsoft.com/v1.0/groups/{teamId}?$select=id,displayName,assignedLabels
```

### Label-Enforced Behaviors

When a sensitivity label is applied, it enforces the following settings configured in Microsoft Purview compliance portal:

| Setting | Effect |
|---|---|
| Privacy | Forces team to `Private` or `Public` |
| External user access | Blocks or allows guest addition |
| Unmanaged device access | Forces limited web-only access |
| External sharing from SharePoint | Controls the associated SharePoint site |

### Edge Cases

- Labels with `contentMarkings` or DLP policies are enforced at the SharePoint/Exchange level, not in the Teams settings directly
- Removing a label sets `assignedLabels` to an empty array, which reverts the team to tenant-default settings
- If a higher-priority label is already assigned (e.g., by Azure Information Protection auto-labeling), the PATCH will be rejected with `409 Conflict`

## Teams Meeting Recording Lifecycle Policies

Teams meeting recordings are stored in the meeting organizer's OneDrive for Business (for personal/channel meetings) or in SharePoint (for channel meetings). The Graph API provides access to recordings and change notifications.

### List Recordings for a Specific Meeting

Requires `OnlineMeetingRecording.Read.All` (application) or `OnlineMeetingRecording.Read.Chat` (resource-specific consent):

```
GET https://graph.microsoft.com/v1.0/users/{userId}/onlineMeetings/{meetingId}/recordings
```

Response includes a `callRecording` object with `recordingContentUrl` and `createdDateTime`.

### Get All Recordings Across All of a User's Meetings

```
GET https://graph.microsoft.com/v1.0/users/{userId}/onlineMeetings/getAllRecordings
```

Use delta query for incremental sync:

```
GET https://graph.microsoft.com/v1.0/users/{userId}/onlineMeetings/getAllRecordings/delta
```

### Subscribe to Recording Available Notifications

```
POST https://graph.microsoft.com/v1.0/subscriptions
Content-Type: application/json

{
  "changeType": "created",
  "notificationUrl": "https://your-webhook.contoso.com/notifications",
  "resource": "/communications/onlineMeetings/getAllRecordings",
  "expirationDateTime": "2025-04-01T00:00:00Z",
  "clientState": "secretClientValue"
}
```

The notification payload includes the `callRecording` resource with the meeting ID and recording URL.

### Recording Auto-Expiration Policy (Teams Admin Center / PowerShell)

Auto-expiration is controlled via Teams meeting policy, not via Graph API:

```powershell
# Set recording expiration to 60 days
Set-CsTeamsMeetingPolicy -Identity Global -NewMeetingRecordingExpirationDays 60

# Disable auto-expiration (keep recordings indefinitely via Teams policy)
Set-CsTeamsMeetingPolicy -Identity Global -NewMeetingRecordingExpirationDays -1
```

**Important precedence rules:**
- Microsoft Purview retention policies always take precedence over Teams auto-expiration
- If a Purview retention label is applied to a recording (stored in OneDrive/SharePoint), the retention label's expiry governs deletion
- Auto-expiration in Teams is **not** a compliance feature — use Purview for compliance-grade retention
- Default auto-expiration period: 120 days (configurable 1–99,999 days, or -1 to disable)

### Recording Permissions and Scope

| Scenario | Required permission |
|---|---|
| App reads recordings for a specific user | `OnlineMeetingRecording.Read.All` (application) |
| Resource-specific consent (per-meeting) | `OnlineMeetingRecording.Read.Chat` |
| User reads their own recordings | `OnlineMeetingRecording.Read` (delegated) |

Application access also requires an application access policy granted to the target user (tenant admins must run `Grant-CsApplicationAccessPolicy`).

## Common Error Codes

| HTTP Status | Error Code | Cause | Resolution |
|---|---|---|---|
| `404 Not Found` | `itemNotFound` | Team ID does not exist, or the caller does not have access to see it | Verify the team exists using `GET /groups?$filter=resourceProvisioningOptions/Any(x:x eq 'Team')`. Confirm `Team.ReadWrite.All` or `Team.Read.All` is consented. |
| `403 Forbidden` | `authorization_requestDenied` | Missing `Team.ReadWrite.All` scope, or the application has not been granted admin consent | Grant admin consent in Entra ID app registrations; confirm the correct permission is in the token using jwt.ms |
| `409 Conflict` | `conflict` | A Microsoft 365 group with the same `mailNickname` or `displayName` already exists, and a team is being created for it | Use `GET /groups?$filter=mailNickname eq 'desired-nickname'` to check for duplicates before creating; generate unique mail nicknames by appending a random suffix |
| `409 Conflict` | `teamsAppAlreadyInstalled` | App is already installed in the team | Use `GET /teams/{id}/installedApps` to check before installing |
| `429 Too Many Requests` | `throttled` | Exceeded Graph API rate limits for Teams resources | Implement exponential backoff using the `Retry-After` header; Teams API limit is approximately 30 requests/second per app per tenant |
| `400 Bad Request` | `invalidRequest` | Invalid `membershipType` or missing required fields when creating a channel | Ensure `membershipType` is `standard`, `private`, or `shared`; `shared` requires B2B direct connect to be enabled |
| `500 Internal Server Error` | — | Team provisioning is still in progress (async operation) | Poll the `Location` header URL returned from `POST /teams`; wait for `provisioningState: "Succeeded"` |
