# Permission Scopes Reference

Complete reference for Microsoft Graph API permission requirements across all graph-investigator investigation workflows. Covers delegated vs application permission guidance, minimum permission sets by scenario, and required Entra directory roles.

---

## 1. Permission Requirements by Investigation Activity

Full mapping of each investigation activity to the required Graph API permission scopes. All listed scopes require admin consent.

| Investigation Activity | Delegated Scope | Application Scope | Admin Consent | Notes |
|---|---|---|---|---|
| **User Profile** | | | | |
| User profile (basic) | User.Read.All | User.Read.All | Yes | Read all user properties |
| Sign-in activity timestamp | AuditLog.Read.All | AuditLog.Read.All | Yes | signInActivity embedded in user object |
| Manager and org chart | User.Read.All | User.Read.All | Yes | /users/{id}/manager chain |
| Group memberships | GroupMember.Read.All | GroupMember.Read.All | Yes | Transitive memberships |
| Directory roles | RoleManagement.Read.Directory | RoleManagement.Read.Directory | Yes | Role assignment read |
| Auth methods (MFA) | UserAuthenticationMethod.Read.All | UserAuthenticationMethod.Read.All | Yes | Sensitive — reveals MFA coverage |
| License details | LicenseAssignment.ReadWrite.All | LicenseAssignment.ReadWrite.All | Yes | Or Directory.Read.All |
| **Sign-In and Audit** | | | | |
| Interactive sign-in logs | AuditLog.Read.All | AuditLog.Read.All | Yes | Also requires Reports Reader role |
| Non-interactive sign-ins | AuditLog.Read.All | AuditLog.Read.All | Yes | Same endpoint |
| Service principal sign-ins | AuditLog.Read.All | AuditLog.Read.All | Yes | /auditLogs/servicePrincipalSignIns |
| Directory audits | AuditLog.Read.All | AuditLog.Read.All | Yes | 30-day retention |
| **Risk and Identity Protection** | | | | |
| Risky user state | IdentityRiskyUser.Read.All | IdentityRiskyUser.Read.All | Yes | Requires P2 license |
| Risk detections | IdentityRiskEvent.Read.All | IdentityRiskEvent.Read.All | Yes | Requires P2 license |
| Risky user history | IdentityRiskyUser.Read.All | IdentityRiskyUser.Read.All | Yes | Requires P2 license |
| Confirm compromised | IdentityRiskyUser.ReadWrite.All | IdentityRiskyUser.ReadWrite.All | Yes | Write action — use carefully |
| Dismiss risk | IdentityRiskyUser.ReadWrite.All | IdentityRiskyUser.ReadWrite.All | Yes | Write action |
| **Mailbox and Email** | | | | |
| Read user email | Mail.Read | Mail.Read | Yes | Full mailbox read access |
| Read sent items | Mail.Read | Mail.Read | Yes | Included in Mail.Read |
| Inbox rules | Mail.Read | Mail.Read | Yes | /mailFolders/inbox/messageRules |
| Mailbox settings | MailboxSettings.Read | MailboxSettings.Read | Yes | Forwarding, OOO, timezone |
| Update mailbox settings | MailboxSettings.ReadWrite | MailboxSettings.ReadWrite | Yes | Can remove forwarding |
| Delete inbox rule | MailboxSettings.ReadWrite | Mail.ReadWrite | Yes | Remediation action |
| **Device Management** | | | | |
| Intune managed devices | DeviceManagementManagedDevices.Read.All | DeviceManagementManagedDevices.Read.All | Yes | Intune enrollment data |
| Device compliance states | DeviceManagementManagedDevices.Read.All | DeviceManagementManagedDevices.Read.All | Yes | Per-policy compliance |
| Entra registered devices | Device.Read.All | Device.Read.All | Yes | Entra device objects |
| **Teams and Communication** | | | | |
| User's chats (1:1, group) | Chat.Read.All | Chat.Read.All | Yes | Very sensitive — legal review first |
| Chat messages | Chat.Read.All | Chat.Read.All | Yes | Message content |
| Channel messages | ChannelMessage.Read.All | ChannelMessage.Read.All | Yes | Channel content |
| Joined teams list | Team.ReadBasic.All | Team.ReadBasic.All | Yes | Team metadata only |
| Online meetings | OnlineMeetings.Read.All | OnlineMeetings.Read.All | Yes | Meeting metadata |
| Call records | CallRecords.Read.All | CallRecords.Read.All | Yes | Call detail records |
| **Files and Documents** | | | | |
| OneDrive files | Files.Read.All | Files.Read.All | Yes | User's OneDrive |
| SharePoint sites | Sites.Read.All | Sites.Read.All | Yes | All SharePoint content |
| Share permissions | Files.Read.All | Files.Read.All | Yes | Sharing link details |
| **OAuth and App Permissions** | | | | |
| Delegated permission grants | DelegatedPermissionGrant.ReadWrite.All | DelegatedPermissionGrant.ReadWrite.All | Yes | Read-only: DelegatedPermissionGrant.Read.All if available |
| App role assignments | AppRoleAssignment.ReadWrite.All | AppRoleAssignment.ReadWrite.All | Yes | User-to-app assignments |
| Service principal details | Application.Read.All | Application.Read.All | Yes | App metadata |
| Revoke OAuth grant | DelegatedPermissionGrant.ReadWrite.All | DelegatedPermissionGrant.ReadWrite.All | Yes | Remediation action |
| Revoke all sessions | User.ReadWrite.All | User.ReadWrite.All | Yes | Token revocation |
| **Reporting** | | | | |
| Usage reports | Reports.Read.All | Reports.Read.All | Yes | Aggregate activity reports |
| MFA registration details | Reports.Read.All | Reports.Read.All | Yes | Auth method registration |
| **Presence and Communication** | | | | |
| User presence | Presence.Read.All | Presence.Read.All | Yes | Online/offline status |

---

## 2. Minimum Permission Sets by Investigation Scenario

### Tier 1: Quick Risk Check (Minimal Footprint)

Suitable for: Initial triage, determining if further investigation is warranted. Lowest privilege required.

```
Required Scopes:
  - AuditLog.Read.All          (sign-in logs, risk detections gateway)
  - IdentityRiskyUser.Read.All (risk level and state)
  - IdentityRiskEvent.Read.All (specific risk detections)
  - User.Read.All              (user profile and sign-in activity timestamp)
```

**What you can investigate**: Risk level, recent risk detections, last sign-in timestamp, basic user profile.

**What you cannot investigate**: Mailbox content, file access, Teams messages, device compliance.

**Time to complete**: 5–10 minutes.

### Tier 2: Standard User Investigation

Suitable for: Most SOC investigations — compromised account assessment, suspicious sign-in follow-up.

All Tier 1 scopes, plus:

```
Additional Scopes:
  - GroupMember.Read.All                        (group membership context)
  - DeviceManagementManagedDevices.Read.All     (Intune device compliance)
  - Device.Read.All                             (Entra registered devices)
  - Mail.Read                                   (mailbox and inbox rules)
  - MailboxSettings.Read                        (forwarding configuration)
  - RoleManagement.Read.Directory               (admin role assignments)
```

**What you can investigate**: Full sign-in history, risk detections, user profile, group/role context, device inventory, mailbox rules and forwarding, email content.

**What you cannot investigate**: Teams message content, OneDrive file listing, OAuth consent details (without additional scopes).

**Time to complete**: 15–30 minutes.

### Tier 3: Full Forensic Investigation (Maximum Coverage)

Suitable for: Confirmed compromise, insider threat, BEC investigation, legal hold cases.

All Tier 2 scopes, plus:

```
Additional Scopes:
  - Chat.Read.All                               (Teams 1:1 and group chats)
  - ChannelMessage.Read.All                     (Teams channel messages)
  - CallRecords.Read.All                        (meeting and call records)
  - Files.Read.All                              (OneDrive file access)
  - Sites.Read.All                              (SharePoint content)
  - DelegatedPermissionGrant.ReadWrite.All      (OAuth consent audit and remediation)
  - AppRoleAssignment.ReadWrite.All             (app access audit)
  - UserAuthenticationMethod.Read.All           (MFA method details)
  - Reports.Read.All                            (usage and activity reports)
```

**What you can investigate**: Everything — complete cross-service investigation including Teams content, OneDrive files, SharePoint access, OAuth consents, and detailed MFA configuration.

**Note**: Chat.Read.All and ChannelMessage.Read.All are extremely sensitive — legal and privacy review is required before requesting in most jurisdictions.

**Time to complete**: 30–90 minutes.

---

## 3. Delegated vs Application Permission Guidance

### Delegated Permissions

**What**: Permission granted to a user (via their sign-in session). The application acts on behalf of the signed-in user and is limited to what THAT user can access.

**When to use**: Ad-hoc investigation by a SOC analyst or security engineer using their own credentials. Interactive workflows where the analyst is signed in via `az login`.

**Advantages**:
- Actions are attributed to the analyst (full audit trail)
- Natural access control — analyst can only see what their role permits
- No standing permissions — access expires with token

**Limitations**:
- Requires the analyst to have the necessary directory roles
- Cannot run unattended or scheduled
- Token expires — long investigations may require re-authentication

**Example**: SOC analyst with Security Reader role uses delegated permissions to investigate a compromised user. The analyst's UPN appears in any audit log entries created by their investigation queries.

### Application Permissions

**What**: Permission granted directly to a service principal (application) via admin consent. No user sign-in required — the application acts as itself.

**When to use**: Automated forensic pipelines, scheduled investigation jobs, SOAR playbook integration, or when analyst credentials should not be embedded.

**Advantages**:
- No user interaction required — fully automated
- Consistent access regardless of analyst availability
- Can run 24/7 on a schedule

**Limitations**:
- Service principal has standing access — must be tightly controlled
- Actions appear as service principal in audit logs (less attribution)
- Admin consent required for all scopes
- Over-provisioning risk if scopes aren't minimized

**Recommendation**: Use **delegated permissions** for ad-hoc SOC investigations. Use **application permissions** for automated forensic pipelines, SIEM integration, and scheduled evidence collection.

### Hybrid Approach (Recommended for Enterprise SOC)

1. Create a dedicated **Forensic Investigation** service principal with Tier 2 scopes (application permissions)
2. Require SOC analysts to authenticate using their own credentials (delegated) for Tier 3 sensitive operations (Teams content, etc.)
3. Log all forensic investigation actions to a dedicated audit workspace

---

## 4. Required Entra Directory Roles

Beyond permission scopes, certain API categories require the calling identity to hold specific Entra directory roles. Having the scope alone is insufficient if the role requirement isn't met.

| API Category | Minimum Required Role | Notes |
|---|---|---|
| AuditLog.Read.All | Reports Reader, Security Reader, or Global Reader | Security Reader preferred for SOC analysts |
| IdentityRiskyUser.Read.All | Security Reader, Security Operator, or Global Reader | Security Reader minimum |
| IdentityRiskEvent.Read.All | Security Reader, Security Operator, or Global Reader | Same as above |
| DeviceManagementManagedDevices.Read.All | Intune Service Administrator or Global Reader | Global Reader has read-only for Intune |
| Chat.Read.All | Teams Administrator or Global Reader | Teams Admin preferred for audit context |
| ChannelMessage.Read.All | Teams Administrator or Global Reader | Same |
| UserAuthenticationMethod.Read.All | Authentication Administrator (for own methods only) or Global Reader | Global Reader for read-only across all users |
| Unified Audit Log (PowerShell) | Compliance Administrator, Security Administrator, or View-Only Audit Logs | Exchange Online role — not Entra role |
| Mail.Read (other users) | Exchange Administrator or Global Reader | Or use Application permissions with admin consent |
| DelegatedPermissionGrant.ReadWrite.All | Cloud Application Administrator or Global Administrator | High privilege — restrict access |

### Role Combinations for SOC Analyst

Recommended role set for a SOC analyst performing Tier 2 investigations:
- **Security Reader** — covers AuditLog, risk data, security settings read
- **Global Reader** — broad read-only across most services
- **Exchange View-Only Audit Logs** (Exchange Online role) — required for Search-UnifiedAuditLog

Do NOT grant Security Administrator or Global Administrator for investigation-only roles — these add write capabilities that are not needed.

---

## 5. Permission Request and Consent Templates

### Azure CLI Scope Verification

Check what permissions the current session has:

```bash
# Show current signed-in account and tenant
az account show --output json

# Verify access to specific API by making a test call
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/auditLogs/signIns?\$top=1" \
  --output json
```

If the call returns `Authorization_RequestDenied` or `Forbidden`, the current session lacks the required scope or role.

### Service Principal Permission Assignment

For application permissions, assign via admin consent:

```bash
# List current app role assignments for a service principal
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/servicePrincipals/{spId}/appRoleAssignments" \
  --output json

# Add an app role assignment (requires Global Administrator)
az rest --method POST \
  --uri "https://graph.microsoft.com/v1.0/servicePrincipals/{spId}/appRoleAssignments" \
  --headers "Content-Type=application/json" \
  --body '{
    "principalId": "{spId}",
    "resourceId": "{graphSpId}",
    "appRoleId": "{appRoleId}"
  }'
```

Common Graph API resource SP ID: `00000003-0000-0000-c000-000000000000` (Microsoft Graph)

Key appRoleId values for Microsoft Graph:
- `AuditLog.Read.All`: `b0afded3-3588-46d8-8b3d-9842eff778da`
- `User.Read.All`: `df021288-bdef-4463-88db-98f22de89214`
- `Mail.Read`: `810c84a8-4a9e-49e6-bf7d-12d183f40d01`
- `IdentityRiskyUser.Read.All`: `dc5007c0-2d7d-4c42-879c-2dab87571379`
- `DeviceManagementManagedDevices.Read.All`: `2f51be20-0bb4-4fed-bf7b-db946066c75e`

---

## 6. Permission Verification Checklist

Before beginning an investigation, verify all required permissions are available:

```bash
# Test 1: User profile read
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/users/{upn}?\$select=id,displayName,accountEnabled" \
  --output json

# Test 2: Sign-in log access
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/auditLogs/signIns?\$top=1" \
  --output json

# Test 3: Risk detection access
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/identityProtection/riskDetections?\$top=1" \
  --output json

# Test 4: Mailbox read access
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/users/{upn}/mailFolders/inbox/messageRules" \
  --output json

# Test 5: Intune device access
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/deviceManagement/managedDevices?\$top=1" \
  --output json
```

A 200 response from each indicates the required permission is available. Document which tests passed/failed before starting the investigation to clearly scope what evidence can be collected.
