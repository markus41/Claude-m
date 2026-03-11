---
name: inv-apps
description: OAuth consent and app permission audit — delegated grants, app role assignments, risky consent patterns, revocation
argument-hint: "<upn> [--revoke-all-consents] [--flag-risky-only] [--format <markdown|json>]"
allowed-tools:
  - Bash
  - Read
  - Write
---

# Graph Investigator — OAuth App Audit

Audits all OAuth 2.0 delegated permission grants and app role assignments for a user. Enriches each consent with service principal metadata, scores each application for risk based on scope combinations, publisher verification, and behavioral signals, and optionally revokes suspicious consents.

## Arguments

| Argument | Description |
|---|---|
| `<upn>` | **Required.** User Principal Name to audit |
| `--revoke-all-consents` | **Destructive action**: Revoke all delegated permission grants for this user. Requires confirmation. Or specify a single grant ID to revoke only that grant. |
| `--flag-risky-only` | Only output applications that score as MEDIUM or higher risk |
| `--format <markdown\|json>` | Output format — defaults to `markdown` |

## Integration Context Check

Required scopes:
- `DelegatedPermissionGrant.ReadWrite.All` — read (and optionally revoke) delegated grants
- `Application.Read.All` — enrich service principal details
- `User.Read.All` — resolve UPN to object ID

Optional scopes:
- `AppRoleAssignment.ReadWrite.All` — enumerate and revoke app role assignments
- `AuditLog.Read.All` — correlate consent grant time with sign-in logs (last used)

## Step 1: Resolve User Object ID

```bash
UPN="<upn>"

USER_ID=$(az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/users/${UPN}?\$select=id,displayName,userPrincipalName" \
  --output json | jq -r '.id')

echo "User ID: ${USER_ID}"
```

## Step 2: Delegated Permission Grants

Fetch all OAuth2 permission grants where this user is the principal (i.e. the user who consented):

```bash
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/oauth2PermissionGrants?\$filter=principalId eq '${USER_ID}'&\$select=id,clientId,principalId,resourceId,scope,consentType,startTime,expiryTime" \
  --output json
```

Each record represents a consent that an application has to act on behalf of this user. Key fields:

| Field | Description |
|---|---|
| `clientId` | Service principal object ID of the app that was granted access |
| `resourceId` | Service principal object ID of the resource being accessed (e.g. Microsoft Graph = `00000003-0000-0000-c000-000000000000`'s SP) |
| `scope` | Space-delimited list of OAuth scopes granted (e.g. `Mail.Read User.Read offline_access`) |
| `consentType` | `Principal` (user-level) or `AllPrincipals` (admin-level) |
| `expiryTime` | When the grant expires (null = no expiry) |

Note: `startTime` is not always populated. Use audit logs to determine actual consent date.

## Step 3: App Role Assignments

Application-level (non-delegated) permissions assigned to the user from service principals:

```bash
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/users/${USER_ID}/appRoleAssignments?\$select=id,principalId,resourceId,resourceDisplayName,appRoleId,createdDateTime&\$orderby=createdDateTime desc" \
  --output json
```

These are roles assigned to the user by applications (e.g. a custom app grants the user a specific role within that app's authorization model).

## Step 4: Enrich with Service Principal Details

For each unique `clientId` from the grants, fetch the service principal details:

```bash
SP_ID="<service-principal-object-id>"

az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/servicePrincipals/${SP_ID}?\$select=id,appId,displayName,publisherName,verifiedPublisher,appOwnerOrganizationId,signInAudience,tags,servicePrincipalType,appRoles,oauth2PermissionScopes,homepage,replyUrls,createdDateTime" \
  --output json
```

Key enrichment fields:

| Field | Risk Signal |
|---|---|
| `verifiedPublisher` | Null = unverified publisher (high risk if accessing sensitive data) |
| `appOwnerOrganizationId` | If different from your tenant ID, this is a third-party app |
| `signInAudience` | `AzureADMultipleOrgs` or `AzureADandPersonalMicrosoftAccount` = multi-tenant app |
| `servicePrincipalType` | `Application` (standard), `ManagedIdentity`, `Legacy` |
| `publisherName` | Display name of the publisher (verify against `verifiedPublisher`) |
| `tags` | `WindowsAzureActiveDirectoryIntegratedApp` = Entra-integrated |

## Step 5: Risk Scoring Per Application

Score each application based on the following criteria. Add points for each risk factor present:

### Scope Risk Scoring

| Scope Combination / Individual Scope | Risk Points |
|---|---|
| `Mail.ReadWrite` + `Mail.Send` | +40 — Can read all mail AND send as user |
| `Mail.ReadWrite` alone | +25 — Can read and modify all mail |
| `Mail.Send` alone | +20 — Can send email as user |
| `Files.ReadWrite.All` | +25 — Full read/write to all files |
| `Files.ReadWrite` | +15 — Read/write to app-specific files |
| `User.ReadWrite` | +20 — Can modify user profile |
| `Contacts.ReadWrite` | +10 — Can read/write all contacts |
| `Calendars.ReadWrite` | +10 — Can read/write calendar |
| `offline_access` | +15 — Can act on user's behalf without the user present |
| `MailboxSettings.ReadWrite` | +20 — Can change mailbox settings (auto-forward rules) |
| `ChatMessage.Send` | +15 — Can send Teams messages as user |
| `Chat.ReadWrite` | +20 — Can read and write all Teams chats |
| `EWS.AccessAsUser.All` | +30 — Legacy Exchange access bypassing Graph controls |
| `full_access_as_user` | +50 — Full Exchange access as user |

### Publisher and App Risk Scoring

| Risk Factor | Points |
|---|---|
| Unverified publisher (`verifiedPublisher` is null) | +20 |
| Multi-tenant app (`signInAudience` != `AzureADMyOrg`) accessing sensitive scopes | +15 |
| App consented less than 7 days ago (recent consent — may be attacker-installed) | +25 |
| App homepage or replyUrls contain non-HTTPS URLs | +15 |
| Publisher name does not match a known vendor | +10 |

### Risk Level Thresholds

| Total Score | Risk Level |
|---|---|
| 0–15 | 🟢 LOW |
| 16–40 | 🟡 MEDIUM |
| 41–70 | 🔴 HIGH |
| 70+ | 🚨 CRITICAL |

## Step 6: Last Used via Sign-In Logs

Correlate each `clientId` (mapped to its `appId`) with sign-in logs to determine when the app was last used:

```bash
APP_ID="<app-id>"

az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/auditLogs/signIns?\$filter=userPrincipalName eq '${UPN}' and appId eq '${APP_ID}'&\$select=createdDateTime,status&\$top=1&\$orderby=createdDateTime desc" \
  --headers "ConsistencyLevel=eventual" \
  --output json
```

An app consented months ago but never used may be a stale consent (lower urgency). An app consented in the last 7 days and already heavily used is higher priority.

## Step 7: Consent Revocation (--revoke-all-consents)

**Before executing**: Display all grants that will be revoked and require explicit confirmation.

To revoke a single delegated permission grant:

```bash
GRANT_ID="<oauth2-permission-grant-id>"

az rest --method DELETE \
  --uri "https://graph.microsoft.com/v1.0/oauth2PermissionGrants/${GRANT_ID}"
```

To revoke all grants for the user, iterate through all grant IDs from Step 2 and execute the DELETE for each. Log each revocation with the grant ID and app name.

Note: Revoking a consent only removes the permission grant. The app itself (service principal) remains in the tenant. For apps that should never have been installed, consider disabling the service principal entirely via Entra admin.

Also remove app role assignments if appropriate:

```bash
ASSIGNMENT_ID="<app-role-assignment-id>"

az rest --method DELETE \
  --uri "https://graph.microsoft.com/v1.0/users/${USER_ID}/appRoleAssignments/${ASSIGNMENT_ID}"
```

## Output Format

```markdown
## OAuth App Audit — jsmith@contoso.com

**Delegated Grants**: 8 | **App Role Assignments**: 2 | **Flagged**: 2 (1 CRITICAL, 1 HIGH)

### App Permission Summary

| App Name | Publisher | Scopes | Risk | Score | Consented | Last Used |
|---|---|---|---|---|---|---|
| MaliciousApp | Unknown (unverified) | Mail.ReadWrite, Mail.Send, offline_access | 🚨 CRITICAL | 95 | 2024-01-15 | 2024-01-15 |
| FileSync Pro | FileSync Inc (unverified) | Files.ReadWrite.All, offline_access | 🔴 HIGH | 50 | 2024-01-14 | 2024-01-14 |
| Microsoft Teams | Microsoft (verified) | User.Read, Chat.Read | 🟢 LOW | 5 | 2023-06-01 | 2024-01-15 |
| Outlook Mobile | Microsoft (verified) | Mail.ReadWrite, Calendars.ReadWrite | 🟢 LOW | 12 | 2023-01-15 | 2024-01-14 |
| Company HR App | Contoso IT (verified, internal) | User.Read | 🟢 LOW | 0 | 2023-03-01 | 2023-12-01 |

### 🚨 Critical Consents Requiring Immediate Action

**MaliciousApp** (Score: 95)
- Publisher: Unknown — `verifiedPublisher` is null
- Scopes: `Mail.ReadWrite` + `Mail.Send` + `offline_access`
- Risk: Can read ALL email, send email as the user, and act without user being logged in
- Consented: 2024-01-15 02:45 UTC (28 minutes after the suspicious Berlin sign-in)
- Last Used: 2024-01-15 03:12 UTC
- **Recommendation**: Immediate revocation. Correlates with the BEC attack timeline.
  Run: `inv-apps jsmith@contoso.com --revoke-all-consents` or revoke grant ID `AAMkAGI...`

### 🔴 High Risk Consents

**FileSync Pro** (Score: 50)
- Publisher: FileSync Inc — unverified publisher
- Scopes: `Files.ReadWrite.All` + `offline_access`
- Risk: Can read, write, and delete ALL files in OneDrive without user being present
- Consented: 2024-01-14 17:30 UTC (one day before the incident)
- Multi-tenant app: Yes (AzureADMultipleOrgs)
- **Recommendation**: Investigate legitimacy with user. If not recognized, revoke.

### App Role Assignments (2)
| App | Role | Assigned | By |
|---|---|---|---|
| Company CRM | Sales.User | 2023-06-15 | admin@contoso.com |
| Project Tracker | ProjectMember | 2023-08-01 | admin@contoso.com |

✅ Both app role assignments appear legitimate (assigned by admin, established apps).

### Revocation Summary
If you run `--revoke-all-consents`, the following grants will be deleted:
1. MaliciousApp — `Mail.ReadWrite, Mail.Send, offline_access` ← REVOKE
2. FileSync Pro — `Files.ReadWrite.All, offline_access` ← REVOKE
3. Microsoft Teams — `User.Read, Chat.Read` ← KEEP (Microsoft verified)
4. Outlook Mobile — `Mail.ReadWrite, Calendars.ReadWrite` ← KEEP (Microsoft verified)
```

If `--format json` is specified, emit a single JSON object with keys: `delegatedGrants`, `appRoleAssignments`, `riskSummary`, `flaggedApps`.
