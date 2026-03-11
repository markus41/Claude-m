# User Activity Endpoints Reference

Organized reference of all Microsoft Graph API endpoints used in user investigation workflows, grouped by investigation domain. All endpoints use the `https://graph.microsoft.com/v1.0/` base URL unless otherwise noted.

---

## Users Domain

| Operation | Method | Endpoint | Required Scopes | Key Filters / Params | Notes |
|---|---|---|---|---|---|
| Get user profile | GET | /users/{id} | User.Read.All | $select | Use $select to limit payload |
| Get manager | GET | /users/{id}/manager | User.Read.All | $select | Single level up |
| Get direct reports | GET | /users/{id}/directReports | User.Read.All | $select, $top | Paginated |
| Get group memberships | GET | /users/{id}/memberOf | GroupMember.Read.All | $select, $top | Paginates — use nextLink |
| Get transitive groups | GET | /users/{id}/transitiveMemberOf | GroupMember.Read.All | $count, $select | Requires ConsistencyLevel: eventual |
| Get transitive group count | GET | /users/{id}/transitiveMemberOf/$count | GroupMember.Read.All | — | Returns integer |
| Get directory roles | GET | /users/{id}/transitiveMemberOf/microsoft.graph.directoryRole | RoleManagement.Read.Directory | $select | Filter to roles only |
| Get auth methods | GET | /users/{id}/authentication/methods | UserAuthenticationMethod.Read.All | — | Shows MFA registered methods |
| Get registered devices | GET | /users/{id}/registeredDevices | Device.Read.All | $select | Entra ID registered |
| Get owned devices | GET | /users/{id}/ownedDevices | Device.Read.All | $select | Entra ID owned |
| Get license details | GET | /users/{id}/licenseDetails | LicenseAssignment.ReadWrite.All | $select | SKU + service plan detail |
| Get assigned licenses | GET | /users/{id} | User.Read.All | $select=assignedLicenses | Embedded in profile |
| Get assigned plans | GET | /users/{id} | User.Read.All | $select=assignedPlans | Service plan states |
| Get sign-in activity | GET | /users/{id} | AuditLog.Read.All | $select=signInActivity | Last sign-in timestamps (embedded) |
| Get mailbox settings | GET | /users/{id}/mailboxSettings | MailboxSettings.Read | — | Forwarding, OOO, timezone |
| Get presence | GET | /users/{id}/presence | Presence.Read.All | — | Teams online status |
| Get photo | GET | /users/{id}/photo | User.Read.All | — | Profile photo metadata |
| Get manager chain (recursive) | GET | /users/{id}/manager | OrgContact.Read.All | — | Repeat upward for full chain |
| List all users | GET | /users | User.Read.All | $filter, $select, $top | Tenant-wide user list |
| Search users by name | GET | /users?$filter=startswith(displayName,'{q}') | User.Read.All | ConsistencyLevel: eventual | For lookalike account search |

### Profile $select Recommended Fields

```
id,displayName,userPrincipalName,mail,mailNickname,jobTitle,department,
officeLocation,accountEnabled,createdDateTime,deletedDateTime,
lastPasswordChangeDateTime,passwordPolicies,usageLocation,
onPremisesSyncEnabled,onPremisesLastSyncDateTime,onPremisesImmutableId,
onPremisesDistinguishedName,signInActivity,assignedLicenses,assignedPlans,
proxyAddresses,otherMails,mobilePhone,businessPhones,employeeId,
employeeType,employeeHireDate,userType
```

---

## Sign-In Logs Domain

| Operation | Method | Endpoint | Required Scopes | Key Filters | Notes |
|---|---|---|---|---|---|
| Interactive sign-ins | GET | /auditLogs/signIns | AuditLog.Read.All | userPrincipalName, createdDateTime, status | Max $top=1000 |
| Filter interactive only | GET | /auditLogs/signIns?$filter=isInteractive eq true | AuditLog.Read.All | Same + isInteractive | Interactive sessions only |
| Filter non-interactive | GET | /auditLogs/signIns?$filter=isInteractive eq false | AuditLog.Read.All | Same + isInteractive | Service/daemon logins |
| Filter by IP address | GET | /auditLogs/signIns?$filter=ipAddress eq '{ip}' | AuditLog.Read.All | ipAddress | All users from same IP |
| Filter by app | GET | /auditLogs/signIns?$filter=appDisplayName eq '{app}' | AuditLog.Read.All | appDisplayName, appId | Sign-ins to specific app |
| Filter by risk level | GET | /auditLogs/signIns?$filter=riskLevelAggregated eq 'high' | AuditLog.Read.All | riskLevelAggregated | High-risk sign-ins |
| Filter by CA status | GET | /auditLogs/signIns?$filter=conditionalAccessStatus eq 'failure' | AuditLog.Read.All | conditionalAccessStatus | Failed CA policy |
| Filter by error code | GET | /auditLogs/signIns?$filter=status/errorCode eq 50126 | AuditLog.Read.All | status/errorCode | Specific failure type |
| Service principal sign-ins | GET | /auditLogs/servicePrincipalSignIns | AuditLog.Read.All | appId, createdDateTime | SP-only sign-ins |
| Managed identity sign-ins | GET | /auditLogs/managedIdentitySignIns | AuditLog.Read.All | managedIdentityType | MI-only sign-ins |
| Provisioning logs | GET | /auditLogs/provisioning | AuditLog.Read.All | status, targetTenantId | Cross-tenant provisioning |

### Sign-In $select Recommended Fields

```
id,createdDateTime,userDisplayName,userPrincipalName,userId,
appDisplayName,appId,ipAddress,location,deviceDetail,status,
riskLevelAggregated,riskLevelDuringSignIn,riskDetail,riskEventTypes,
conditionalAccessStatus,appliedConditionalAccessPolicies,clientAppUsed,
authenticationDetails,authenticationRequirement,isInteractive,
sessionLifetimePolicies,resourceDisplayName,resourceId,
correlationId,flaggedForReview
```

### Sign-In Filter Examples

```bash
# User sign-ins in date range
$filter=userPrincipalName eq '{upn}' and createdDateTime ge {start}T00:00:00Z and createdDateTime le {end}T23:59:59Z

# High-risk sign-ins for user
$filter=userPrincipalName eq '{upn}' and riskLevelAggregated eq 'high'

# Legacy auth sign-ins (no MFA support)
$filter=userPrincipalName eq '{upn}' and clientAppUsed ne 'Browser' and clientAppUsed ne 'Mobile Apps and Desktop clients'

# Failed sign-ins (brute force detection)
$filter=userPrincipalName eq '{upn}' and status/errorCode ne 0 and createdDateTime ge {start}T00:00:00Z

# Sign-ins from specific country
$filter=userPrincipalName eq '{upn}' and location/countryOrRegion eq 'CN'

# New device sign-ins (unmanaged)
$filter=userPrincipalName eq '{upn}' and deviceDetail/isManaged eq false
```

---

## Audit Logs Domain

| Operation | Method | Endpoint | Required Scopes | Key Filters | Notes |
|---|---|---|---|---|---|
| Directory audits | GET | /auditLogs/directoryAudits | AuditLog.Read.All | activityDisplayName, category, activityDateTime | 30-day retention |
| Filter by initiating user | GET | /auditLogs/directoryAudits?$filter=initiatedBy/user/id eq '{id}' | AuditLog.Read.All | + activityDateTime | Actions performed by user |
| Filter by target user | GET | /auditLogs/directoryAudits?$filter=targetResources/any(t:t/id eq '{id}') | AuditLog.Read.All | + activityDateTime | Actions taken ON user |
| Filter by activity type | GET | /auditLogs/directoryAudits?$filter=activityDisplayName eq '{activity}' | AuditLog.Read.All | activityDateTime | Specific operation type |
| Role assignment changes | GET | /auditLogs/directoryAudits?$filter=category eq 'RoleManagement' | AuditLog.Read.All | activityDateTime | Role add/remove events |
| App consent events | GET | /auditLogs/directoryAudits?$filter=activityDisplayName eq 'Consent to application' | AuditLog.Read.All | activityDateTime, initiatedBy | OAuth consent audit |
| Inbox rule changes | GET | /auditLogs/directoryAudits?$filter=activityDisplayName eq 'Set-InboxRule' | AuditLog.Read.All | initiatedBy/user/userPrincipalName | Rule creation/modification |
| Group membership changes | GET | /auditLogs/directoryAudits?$filter=category eq 'GroupManagement' | AuditLog.Read.All | activityDateTime | Group add/remove |
| Password changes | GET | /auditLogs/directoryAudits?$filter=activityDisplayName eq 'Reset user password' or activityDisplayName eq 'Change user password' | AuditLog.Read.All | initiatedBy, activityDateTime | Password event audit |
| Token issuance anomalies | GET | /auditLogs/directoryAudits?$filter=category eq 'Authentication' | AuditLog.Read.All | activityDateTime | Auth events |

### Directory Audit Activity Names (Common)

| activityDisplayName | Category | Significance |
|---|---|---|
| Add user | UserManagement | Account created |
| Update user | UserManagement | Account modified |
| Delete user | UserManagement | Account deleted |
| Disable account | UserManagement | Account disabled |
| Reset user password | UserManagement | Password reset |
| Change user password | UserManagement | Self-service change |
| Add member to role | RoleManagement | Role assigned — critical |
| Remove member from role | RoleManagement | Role removed |
| Add member to group | GroupManagement | Group membership change |
| Remove member from group | GroupManagement | Group membership change |
| Consent to application | ApplicationManagement | OAuth consent — critical |
| Add service principal | ApplicationManagement | New SP registered |
| Add service principal credentials | ApplicationManagement | Credential added to SP |
| Set-InboxRule | ExchangeItem | Inbox rule created/modified — critical |
| Add owner to application | ApplicationManagement | App owner changed |
| Add application | ApplicationManagement | New app registration |

---

## Mailbox Domain

| Operation | Method | Endpoint | Required Scopes | Key Filters / Params | Notes |
|---|---|---|---|---|---|
| List mail folders | GET | /users/{id}/mailFolders | Mail.Read | includeHiddenFolders=true, $select, $top | Must include query param for hidden folders |
| Get specific folder | GET | /users/{id}/mailFolders/{folderId} | Mail.Read | $select | By well-known name or ID |
| List inbox rules | GET | /users/{id}/mailFolders/inbox/messageRules | Mail.Read | — | Critical for forensics — no createDateTime |
| Get a specific rule | GET | /users/{id}/mailFolders/inbox/messageRules/{ruleId} | Mail.Read | — | Full rule details |
| List messages | GET | /users/{id}/messages | Mail.Read | $filter, $search, $select, $top, $orderby | Max $top=1000 |
| Messages in folder | GET | /users/{id}/mailFolders/{folderId}/messages | Mail.Read | Same as above | Scoped to folder |
| Sent items | GET | /users/{id}/mailFolders/sentitems/messages | Mail.Read | $filter, $select, $orderby | Sent items folder |
| Deleted items | GET | /users/{id}/mailFolders/deleteditems/messages | Mail.Read | $filter, $select | Recoverable deleted |
| Get message detail | GET | /users/{id}/messages/{messageId} | Mail.Read | $select | Full message including body |
| Get message attachments | GET | /users/{id}/messages/{messageId}/attachments | Mail.Read | $select | Attachment metadata |
| Get attachment content | GET | /users/{id}/messages/{messageId}/attachments/{attachmentId}/$value | Mail.Read | — | Raw attachment binary |
| Get mailbox settings | GET | /users/{id}/mailboxSettings | MailboxSettings.Read | — | Forwarding, OOO, language, timezone |
| Update mailbox settings | PATCH | /users/{id}/mailboxSettings | MailboxSettings.ReadWrite | Body: JSON | Can remove forwarding config |
| Get calendar permissions | GET | /users/{id}/calendar/calendarPermissions | Calendars.Read.Shared | — | Calendar delegates |
| Get master categories | GET | /users/{id}/outlook/masterCategories | Mail.Read | — | Custom categories list |
| Get focused inbox overrides | GET | /users/{id}/inferenceClassification/overrides | Mail.Read | — | Focused inbox senders |

### Well-Known Folder Names

| Identifier | Folder |
|---|---|
| `inbox` | Inbox |
| `sentitems` | Sent Items |
| `deleteditems` | Deleted Items |
| `drafts` | Drafts |
| `junkemail` | Junk Email |
| `archive` | Archive |
| `outbox` | Outbox |
| `recoverableitemsdeletions` | Recoverable Items > Deletions |
| `recoverableitemspurges` | Recoverable Items > Purges |
| `recoverableitemsroot` | Recoverable Items root |

---

## Managed Devices Domain

| Operation | Method | Endpoint | Required Scopes | Key Filters | Notes |
|---|---|---|---|---|---|
| User's managed devices | GET | /deviceManagement/managedDevices?$filter=userPrincipalName eq '{upn}' | DeviceManagementManagedDevices.Read.All | complianceState, operatingSystem | Intune enrolled |
| Device detail | GET | /deviceManagement/managedDevices/{id} | DeviceManagementManagedDevices.Read.All | — | Full device object |
| Device compliance states | GET | /deviceManagement/managedDevices/{id}/deviceCompliancePolicyStates | DeviceManagementManagedDevices.Read.All | — | Per-policy compliance |
| Device configuration states | GET | /deviceManagement/managedDevices/{id}/deviceConfigurationStates | DeviceManagementManagedDevices.Read.All | — | Config profile states |
| All Intune devices | GET | /deviceManagement/managedDevices | DeviceManagementManagedDevices.Read.All | $filter, $top | Tenant-wide list |
| Compliance policies | GET | /deviceManagement/deviceCompliancePolicies | DeviceManagementConfiguration.Read.All | — | All compliance policies |
| Entra ID device objects | GET | /devices | Device.Read.All | accountEnabled, operatingSystem | Entra ID device directory |
| Entra device by deviceId | GET | /devices?$filter=deviceId eq '{aadDeviceId}' | Device.Read.All | — | Correlation key lookup |
| Device registered owners | GET | /devices/{id}/registeredOwners | Device.Read.All | — | Owners of device |
| Device registered users | GET | /devices/{id}/registeredUsers | Device.Read.All | — | Users of device |
| User's registered devices | GET | /users/{id}/registeredDevices | Device.Read.All | $select | Entra registered |
| User's owned devices | GET | /users/{id}/ownedDevices | Device.Read.All | $select | Entra owned |

### Managed Device $select Recommended Fields

```
id,deviceName,operatingSystem,osVersion,complianceState,lastSyncDateTime,
enrolledDateTime,serialNumber,manufacturer,model,azureADDeviceId,
userPrincipalName,userDisplayName,managedDeviceOwnerType,
deviceEnrollmentType,totalStorageSpaceInBytes,freeStorageSpaceInBytes,
isEncrypted,isSupervised,jailBroken,managementAgent,
imei,meid,phoneNumber,subscriberCarrier,wifiMacAddress,
managedDeviceName,partnerReportedThreatState
```

---

## Teams and Chats Domain

| Operation | Method | Endpoint | Required Scopes | Key Filters / Params | Notes |
|---|---|---|---|---|---|
| User's chats | GET | /users/{id}/chats | Chat.Read.All | $expand=members, $select | 1:1, group, meeting chats |
| Chat details | GET | /chats/{chatId} | Chat.Read.All | $expand=members | Chat metadata |
| Chat messages | GET | /chats/{chatId}/messages | Chat.Read.All | $top, $filter lastModifiedDateTime | Paginate with $skipToken |
| Specific message | GET | /chats/{chatId}/messages/{messageId} | Chat.Read.All | — | Full message with body |
| Chat members | GET | /chats/{chatId}/members | Chat.Read.All | — | All participants |
| Joined teams | GET | /users/{id}/joinedTeams | Team.ReadBasic.All | $select | Team list for user |
| Team details | GET | /teams/{teamId} | Team.ReadBasic.All | $select | Team metadata |
| Team channels | GET | /teams/{teamId}/channels | Channel.ReadBasic.All | $select | All channels in team |
| Channel messages | GET | /teams/{teamId}/channels/{channelId}/messages | ChannelMessage.Read.All | $top | Rate limited — 5 req/s |
| Message replies | GET | /teams/{teamId}/channels/{channelId}/messages/{msgId}/replies | ChannelMessage.Read.All | $top | Thread replies |
| Online meetings | GET | /users/{id}/onlineMeetings | OnlineMeetings.Read.All | $select | Meetings organized |
| Meeting attendance | GET | /users/{id}/onlineMeetings/{meetingId}/attendanceReports | OnlineMeetings.Read.All | — | Who attended |
| Call records | GET | /communications/callRecords | CallRecords.Read.All | $filter startDateTime | Full call detail records |
| Call record sessions | GET | /communications/callRecords/{id}/sessions | CallRecords.Read.All | $expand=segments | Detailed session data |
| Teams apps for user | GET | /users/{id}/teamwork/installedApps | TeamsAppInstallation.Read.All | $expand=teamsAppDefinition | Installed apps |
| User activity report | GET | /reports/getTeamsUserActivityUserDetail(period='{period}') | Reports.Read.All | period: D7/D30/D90 | Activity metrics |

---

## Risk and Identity Protection Domain

| Operation | Method | Endpoint | Required Scopes | Key Filters | Notes |
|---|---|---|---|---|---|
| Risky user state | GET | /identityProtection/riskyUsers/{userId} | IdentityRiskyUser.Read.All | — | Current risk level/state |
| All risky users | GET | /identityProtection/riskyUsers | IdentityRiskyUser.Read.All | $filter riskLevel, riskState | Tenant-wide risky users |
| Risk detections for user | GET | /identityProtection/riskDetections?$filter=userPrincipalName eq '{upn}' | IdentityRiskEvent.Read.All | riskEventDateTime, riskLevel, riskType | All detection events |
| All risk detections | GET | /identityProtection/riskDetections | IdentityRiskEvent.Read.All | $filter, $top, $orderby | Tenant-wide detections |
| Risky user history | GET | /identityProtection/riskyUsers/{userId}/history | IdentityRiskyUser.Read.All | — | Historical risk changes |
| Confirm compromised | POST | /identityProtection/riskyUsers/confirmCompromised | IdentityRiskyUser.ReadWrite.All | Body: {userIds:[]} | Triggers remediation |
| Dismiss risk | POST | /identityProtection/riskyUsers/dismiss | IdentityRiskyUser.ReadWrite.All | Body: {userIds:[]} | Clears risk state |
| Risky service principals | GET | /identityProtection/riskyServicePrincipals | IdentityRiskyServicePrincipal.Read.All | — | SP risk events |
| SP risk detections | GET | /identityProtection/servicePrincipalRiskDetections | IdentityRiskyServicePrincipal.Read.All | $filter appId | App-level risk events |

### Risk Detection $select Recommended Fields

```
id,userId,userPrincipalName,userDisplayName,riskEventDateTime,
riskLevel,riskState,riskType,riskDetail,detectionTimingType,
source,tokenIssuerType,ipAddress,location,additionalInfo,
correlatedEventTypes,requestId,correlationId,lastUpdatedDateTime,
activity,activityDateTime
```

---

## OAuth and App Permissions Domain

| Operation | Method | Endpoint | Required Scopes | Key Filters | Notes |
|---|---|---|---|---|---|
| User's delegated grants | GET | /oauth2PermissionGrants?$filter=principalId eq '{userId}' | DelegatedPermissionGrant.ReadWrite.All | — | Per-user OAuth consents |
| All delegated grants | GET | /oauth2PermissionGrants | DelegatedPermissionGrant.ReadWrite.All | $filter clientId, resourceId | Tenant-wide consents |
| Admin consent grants | GET | /oauth2PermissionGrants?$filter=consentType eq 'AllPrincipals' | DelegatedPermissionGrant.ReadWrite.All | — | Tenant-level consent |
| Revoke grant | DELETE | /oauth2PermissionGrants/{grantId} | DelegatedPermissionGrant.ReadWrite.All | — | Remove consent |
| User's app role assignments | GET | /users/{id}/appRoleAssignments | AppRoleAssignment.ReadWrite.All | — | App access for user |
| SP app role assignments | GET | /servicePrincipals/{spId}/appRoleAssignments | AppRoleAssignment.ReadWrite.All | — | App-to-app permissions |
| SP app role assigned to | GET | /servicePrincipals/{spId}/appRoleAssignedTo | AppRoleAssignment.ReadWrite.All | — | Who can access this SP |
| Get service principal | GET | /servicePrincipals/{id} | Application.Read.All | $select | App details for a consent |
| Search service principals | GET | /servicePrincipals?$filter=displayName eq '{name}' | Application.Read.All | $search, $filter | Find app by name |
| Get application | GET | /applications/{id} | Application.Read.All | $select | App registration details |
| Revoke user sessions | POST | /users/{id}/revokeSignInSessions | User.ReadWrite.All | — | Invalidate all tokens |
| Invalidate refresh tokens | POST | /users/{id}/invalidateAllRefreshTokens | User.ReadWrite.All | — | Legacy endpoint (deprecated) |

### OAuth Grant Object Shape

```json
{
  "id": "string",
  "clientId": "service-principal-object-id-of-consenting-app",
  "consentType": "Principal",
  "principalId": "user-object-id",
  "resourceId": "service-principal-id-of-resource",
  "scope": "Mail.Read offline_access User.Read",
  "expiryTime": null,
  "startTime": null
}
```

To resolve `clientId` to app name: `GET /servicePrincipals/{clientId}?$select=displayName,appId,publisherName,verifiedPublisher`

---

## Files and OneDrive Domain

| Operation | Method | Endpoint | Required Scopes | Key Filters / Params | Notes |
|---|---|---|---|---|---|
| User's OneDrive root | GET | /users/{id}/drive/root | Files.Read.All | — | Root folder item |
| OneDrive root children | GET | /users/{id}/drive/root/children | Files.Read.All | $select, $top | Paginated listing |
| OneDrive folder children | GET | /users/{id}/drive/items/{itemId}/children | Files.Read.All | $select, $top | Subfolder listing |
| Recent files | GET | /users/{id}/drive/recent | Files.Read.All | $select, $top | Recently accessed files |
| Shared with user | GET | /users/{id}/drive/sharedWithMe | Files.Read.All | $select | Files shared to user |
| Search OneDrive | GET | /users/{id}/drive/root/search(q='{query}') | Files.Read.All | $select, $top | Filename/content search |
| Get file metadata | GET | /users/{id}/drive/items/{itemId} | Files.Read.All | $select | File or folder metadata |
| Get sharing permissions | GET | /users/{id}/drive/items/{itemId}/permissions | Files.ReadWrite.All | — | Sharing links and permissions |
| List SharePoint sites | GET | /sites?search={query} | Sites.Read.All | — | Site search |
| SharePoint site drive | GET | /sites/{siteId}/drive | Sites.Read.All | — | Default document library |
| Site drive root children | GET | /sites/{siteId}/drive/root/children | Sites.Read.All | $select, $top | Document library root |
| Site drives list | GET | /sites/{siteId}/drives | Sites.Read.All | — | All libraries in site |
| SharePoint file search | GET | /sites/{siteId}/drive/root/search(q='{query}') | Sites.Read.All | $select, $top | Scoped site search |
| Get sharing link | GET | /drives/{driveId}/items/{itemId}/permissions | Files.Read.All | — | View sharing config |

---

## Reports Domain

| Operation | Method | Endpoint | Required Scopes | Key Filters | Notes |
|---|---|---|---|---|---|
| Email activity | GET | /reports/getEmailActivityUserDetail(period='{period}') | Reports.Read.All | period: D7/D30/D90/D180 | Exchange email volume |
| OneDrive activity | GET | /reports/getOneDriveActivityUserDetail(period='{period}') | Reports.Read.All | Same | OneDrive usage |
| SharePoint activity | GET | /reports/getSharePointActivityUserDetail(period='{period}') | Reports.Read.All | Same | SharePoint usage |
| Teams activity | GET | /reports/getTeamsUserActivityUserDetail(period='{period}') | Reports.Read.All | Same | Teams usage |
| M365 Apps activity | GET | /reports/getM365AppUserDetail(period='{period}') | Reports.Read.All | Same | Office apps usage |
| Yammer activity | GET | /reports/getYammerActivityUserDetail(period='{period}') | Reports.Read.All | Same | Yammer posts |
| Credential registration | GET | /reports/authenticationMethods/userRegistrationDetails | Reports.Read.All | $filter userPrincipalName | MFA registration status |
| Usage summary | GET | /reports/authenticationMethods/usersRegisteredByMethod | Reports.Read.All | — | Tenant-level MFA summary |

---

## Batch Request Pattern

For efficiency, batch up to 20 requests into a single HTTP call:

```bash
az rest --method POST \
  --uri "https://graph.microsoft.com/v1.0/\$batch" \
  --headers "Content-Type=application/json" \
  --body '{
    "requests": [
      {
        "id": "1",
        "method": "GET",
        "url": "/users/{userId}?$select=id,displayName,accountEnabled,signInActivity"
      },
      {
        "id": "2",
        "method": "GET",
        "url": "/users/{userId}/authentication/methods"
      },
      {
        "id": "3",
        "method": "GET",
        "url": "/identityProtection/riskyUsers/{userId}"
      },
      {
        "id": "4",
        "method": "GET",
        "url": "/users/{userId}/mailboxSettings"
      }
    ]
  }' \
  --output json
```

Batch responses include individual status codes. Check each `responses[].status` — 200 = success, 4xx = permission error or not found.

---

## Pagination Patterns

All list endpoints that return more than `$top` results include an `@odata.nextLink` in the response. Always paginate until no nextLink is returned.

```bash
# Pattern: Loop until no nextLink
NEXT_URL="https://graph.microsoft.com/v1.0/auditLogs/signIns?\$filter=userPrincipalName eq '{upn}'&\$top=1000"
while [ -n "$NEXT_URL" ]; do
  RESPONSE=$(az rest --method GET --uri "$NEXT_URL" --output json)
  # Process $RESPONSE
  NEXT_URL=$(echo $RESPONSE | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('@odata.nextLink',''))" )
done
```

Maximum `$top` values by endpoint:
- Sign-in logs: 1000
- Directory audits: 1000
- Messages: 1000
- Mail folders: 250
- Group memberships: 999
- Managed devices: 1000 (use $skipToken for continuation)
- Risk detections: 1000
