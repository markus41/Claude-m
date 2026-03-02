---
name: servicedesk-runbooks
description: >
  Deep expertise in M365 service desk automation — safe guided workflows for common IT tickets
  including shared mailbox access, MFA reset, file recovery, password reset, group membership,
  license assignment, and account lifecycle with pre-checks, approval gates, and end-user verification
  via Graph API and Exchange PowerShell.
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
triggers:
  - service desk
  - runbook
  - helpdesk
  - shared mailbox
  - reset mfa
  - recover file
  - password reset
  - ticket workflow
  - support request
  - it support
  - group membership
  - license assignment
  - disable account
  - enable account
---

# M365 Service Desk Auto-Runbooks

This skill provides safe, structured workflows for the most common M365 IT support tickets. Each runbook follows a consistent pattern with pre-checks, approval gates, execution, verification, and end-user communication.

## Base URL

```
https://graph.microsoft.com/v1.0
```

All Graph API endpoints below are relative to this base URL.

## API Endpoints

### User Management

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/users/{id}` | Get user details |
| PATCH | `/users/{id}` | Update user properties |
| GET | `/users/{id}/memberOf` | List user's group memberships |
| POST | `/users/{id}/assignLicense` | Assign/remove licenses |
| GET | `/users/{id}/licenseDetails` | Get user's license details |
| GET | `/users/{id}/authentication/methods` | List authentication methods |
| DELETE | `/users/{id}/authentication/microsoftAuthenticatorMethods/{methodId}` | Remove Authenticator |
| DELETE | `/users/{id}/authentication/phoneMethods/{methodId}` | Remove phone method |

### Group Management

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/groups/{id}` | Get group details |
| GET | `/groups/{id}/members` | List group members |
| POST | `/groups/{id}/members/$ref` | Add member to group |
| DELETE | `/groups/{id}/members/{userId}/$ref` | Remove member from group |
| GET | `/groups/{id}/owners` | List group owners |

### File Recovery

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/users/{id}/drive/root/delta` | List file changes |
| POST | `/users/{id}/drive/items/{itemId}/restore` | Restore deleted file |
| GET | `/users/{id}/drive/items/{itemId}/versions` | List file versions |
| POST | `/users/{id}/drive/items/{itemId}/versions/{versionId}/restoreVersion` | Restore to version |

## Runbook Pattern

Every runbook follows this structure:

1. **Pre-checks** — Validate the request before making changes
2. **Approval gate** — Get manager or admin approval if required
3. **Execution** — Perform the action with error handling
4. **Verification** — Confirm the action succeeded
5. **End-user text** — Generate a message for the requester

## Pre-Check Query Reference

| Runbook | Pre-Check API Call | What to Verify |
|---------|-------------------|----------------|
| Shared Mailbox Access | `Get-Mailbox -Identity "shared@contoso.com"` | Mailbox exists and is shared type |
| MFA Reset | `GET /users/{id}/authentication/methods` | User exists, list current methods |
| File Recovery | `GET /users/{id}/drive/root/search(q='{filename}')` | File exists in recycle bin |
| Password Reset | `GET /users/{id}?$select=onPremisesSyncEnabled` | Check if cloud-only (not synced) |
| Group Membership | `GET /groups/{id}/members` | Group exists, check current membership |
| License Assignment | `GET /subscribedSkus` | Verify available licenses in tenant |
| Account Disable | `GET /users/{id}?$select=accountEnabled,assignedLicenses` | User exists and is currently enabled |

## Runbook 1: Shared Mailbox Access

**Pre-checks:**
- Verify the shared mailbox exists and is type `SharedMailbox`
- Verify the requesting user exists and is active
- Check if the user already has access
- Confirm the type of access: Full Access, Send As, or Send on Behalf

**Execution (Exchange PowerShell):**
```powershell
# Full Access
Add-MailboxPermission -Identity "shared@contoso.com" -User "user@contoso.com" -AccessRights FullAccess -AutoMapping $true

# Send As
Add-RecipientPermission -Identity "shared@contoso.com" -Trustee "user@contoso.com" -AccessRights SendAs -Confirm:$false

# Send on Behalf
Set-Mailbox -Identity "shared@contoso.com" -GrantSendOnBehalfTo @{Add="user@contoso.com"}
```

**Verification:**
```powershell
Get-MailboxPermission -Identity "shared@contoso.com" | Where-Object {$_.User -like "*user*"}
```

## Runbook 2: MFA Reset

**Pre-checks:**
- Verify the user exists and is active
- Check current MFA methods registered
- Confirm the reset is authorized (manager approval or IT admin)

**Execution (Graph API):**
```
# List current methods
GET /users/{userId}/authentication/methods

# Remove Authenticator app
DELETE /users/{userId}/authentication/microsoftAuthenticatorMethods/{methodId}

# Remove phone method
DELETE /users/{userId}/authentication/phoneMethods/{methodId}
```

**Verification:**
```
GET /users/{userId}/authentication/methods
```

Confirm only password method remains.

## Runbook 3: File Recovery

**Pre-checks:**
- Identify the file location (OneDrive or SharePoint)
- Check the recycle bin (first-stage and second-stage)
- Verify the file exists in the recycle bin

**Execution (Graph API):**
```
POST /users/{userId}/drive/items/{itemId}/restore
```

Or for version restore:
```
POST /users/{userId}/drive/items/{itemId}/versions/{versionId}/restoreVersion
```

Or via SharePoint recycle bin:
```powershell
Restore-PnPRecycleBinItem -Identity {itemId} -Force
```

## Runbook 4: Password Reset

**Pre-checks:**
- Verify the user exists and is active
- Check if the account is synced from on-prem AD (cannot reset cloud password for synced accounts)
- Verify the requester is authorized

**Execution (Graph API):**
```json
PATCH /users/{userId}
{
  "passwordProfile": {
    "forceChangePasswordNextSignIn": true,
    "password": "{secureRandomPassword}"
  }
}
```

**Important:** For synced accounts (`onPremisesSyncEnabled: true`), password must be reset in on-premises Active Directory, not via Graph API.

## Runbook 5: Group Membership

**Pre-checks:**
- Verify the group exists: `GET /groups/{groupId}`
- Verify the user exists: `GET /users/{userId}`
- Check current membership: `GET /groups/{groupId}/members`
- Confirm the user is not already a member (for add) or is a member (for remove)
- Check if group is dynamic (dynamic groups cannot have manual member changes)

**Execution — Add Member (Graph API):**
```json
POST /groups/{groupId}/members/$ref
{
  "@odata.id": "https://graph.microsoft.com/v1.0/users/{userId}"
}
```

**Execution — Remove Member:**
```
DELETE /groups/{groupId}/members/{userId}/$ref
```

**Verification:**
```
GET /groups/{groupId}/members?$filter=id eq '{userId}'
```

**Dynamic group check:**
```
GET /groups/{groupId}?$select=groupTypes,membershipRule
```

If `groupTypes` contains `DynamicMembership`, membership is managed by the `membershipRule` — manual add/remove is not supported.

## Runbook 6: License Assignment

**Pre-checks:**
- Verify the user exists: `GET /users/{userId}`
- Check tenant license availability: `GET /subscribedSkus`
- Verify `prepaidUnits.enabled - consumedUnits > 0` for the target SKU
- Check user's current licenses: `GET /users/{userId}/licenseDetails`

**Execution — Assign License (Graph API):**
```json
POST /users/{userId}/assignLicense
{
  "addLicenses": [
    {
      "skuId": "{skuId}",
      "disabledPlans": []
    }
  ],
  "removeLicenses": []
}
```

**Execution — Remove License:**
```json
POST /users/{userId}/assignLicense
{
  "addLicenses": [],
  "removeLicenses": ["{skuId}"]
}
```

**Execution — Assign with Disabled Plans:**
```json
POST /users/{userId}/assignLicense
{
  "addLicenses": [
    {
      "skuId": "{skuId}",
      "disabledPlans": [
        "efb87545-963c-4e0d-99df-69c6916d9eb0",
        "a23b959c-7ce8-4e57-9140-b90eb88a9e97"
      ]
    }
  ],
  "removeLicenses": []
}
```

**Verification:**
```
GET /users/{userId}/licenseDetails
```

## Runbook 7: Account Disable / Enable

**Pre-checks:**
- Verify the user exists: `GET /users/{userId}?$select=accountEnabled,displayName,assignedLicenses`
- Confirm account status matches the requested action
- For disable: document current licenses and group memberships for potential re-enable

**Execution — Disable Account:**
```json
PATCH /users/{userId}
{
  "accountEnabled": false
}
```

**Execution — Revoke Sessions (immediately block access):**
```
POST /users/{userId}/revokeSignInSessions
```

**Execution — Enable Account:**
```json
PATCH /users/{userId}
{
  "accountEnabled": true
}
```

**Verification:**
```
GET /users/{userId}?$select=accountEnabled
```

**Full offboarding sequence:**
1. `PATCH /users/{id}` — disable account
2. `POST /users/{id}/revokeSignInSessions` — revoke all active sessions
3. `POST /users/{id}/assignLicense` — remove licenses (save SKU IDs for potential re-enable)
4. Remove from groups: `DELETE /groups/{gid}/members/{uid}/$ref`
5. Set out-of-office reply or forward mail
6. Document all changes in the ticket

## Approval Gate Patterns

### Teams Adaptive Card Approval

Send an Adaptive Card to a Teams channel or chat for manager approval:

```json
{
  "type": "AdaptiveCard",
  "body": [
    {
      "type": "TextBlock",
      "text": "Service Desk Request - Approval Needed",
      "weight": "bolder",
      "size": "medium"
    },
    {
      "type": "FactSet",
      "facts": [
        { "title": "Request", "value": "Add user@contoso.com to Finance group" },
        { "title": "Requester", "value": "Jane Smith" },
        { "title": "Ticket", "value": "INC-2026-0042" },
        { "title": "Urgency", "value": "Normal" }
      ]
    }
  ],
  "actions": [
    { "type": "Action.Submit", "title": "Approve", "data": { "action": "approve" } },
    { "type": "Action.Submit", "title": "Deny", "data": { "action": "deny" } }
  ],
  "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
  "version": "1.5"
}
```

### Planner Task Approval

Create a Planner task for tracking and approval:

```json
POST /planner/tasks
{
  "planId": "{planId}",
  "bucketId": "{approvalBucketId}",
  "title": "Approve: Add user@contoso.com to Finance group [INC-2026-0042]",
  "assignments": {
    "{managerId}": {
      "@odata.type": "#microsoft.graph.plannerAssignment",
      "orderHint": " !"
    }
  },
  "dueDateTime": "2026-03-03T17:00:00Z"
}
```

## Authentication Method Reference

| Method Type | Graph API Path | Description |
|-------------|---------------|-------------|
| Microsoft Authenticator | `/authentication/microsoftAuthenticatorMethods` | Push notification / TOTP |
| Phone (SMS/Voice) | `/authentication/phoneMethods` | SMS or voice call |
| FIDO2 Security Key | `/authentication/fido2Methods` | Hardware security key |
| Windows Hello | `/authentication/windowsHelloForBusinessMethods` | Biometric/PIN |
| Email | `/authentication/emailMethods` | Email OTP |
| Temporary Access Pass | `/authentication/temporaryAccessPassMethods` | Time-limited passcode |
| Password | `/authentication/passwordMethods` | Traditional password |
| Software OATH | `/authentication/softwareOathMethods` | Third-party TOTP app |

## End-User Communication Templates

### Access Granted Template
```
Hi [Name],

Your access to [resource] has been set up. Here's what you need to know:

- [Specific instructions for accessing the resource]
- Changes may take up to [time] to take effect
- If you have any issues, contact [support channel]

Best regards,
IT Support
```

### MFA Reset Template
```
Hi [Name],

Your multi-factor authentication has been reset. On your next sign-in:

1. You'll be prompted to set up a new verification method
2. We recommend using the Microsoft Authenticator app
3. Visit https://mysignins.microsoft.com to manage your methods

If you didn't request this change, contact IT immediately.

Best regards,
IT Support
```

### Password Reset Template
```
Hi [Name],

Your password has been reset. A temporary password has been provided to you securely.

On your next sign-in:
1. Enter the temporary password
2. You'll be prompted to create a new password
3. Your new password must meet the organization's complexity requirements

Never share your password with anyone. IT will never ask for your password.

Best regards,
IT Support
```

### Account Disabled Template
```
Hi [Requester],

The account for [Name] has been disabled as requested.

Actions taken:
- Account disabled and sign-in blocked
- Active sessions revoked
- Licenses removed: [list]
- Group memberships documented for potential future re-enable

Ticket reference: [ticket-id]

Best regards,
IT Support
```

## Required Permissions

| Runbook | Permission / Role |
|---------|-------------------|
| Shared mailbox access | Exchange Administrator |
| MFA reset | Authentication Administrator |
| File recovery | `Sites.ReadWrite.All` or SharePoint Administrator |
| Password reset | User Administrator (or Helpdesk Administrator for non-admin users) |
| Group membership | `GroupMember.ReadWrite.All` or `Group.ReadWrite.All` |
| License assignment | `User.ReadWrite.All` + `Directory.ReadWrite.All` (or License Administrator role) |
| Account disable/enable | User Administrator or `User.ReadWrite.All` |
| Revoke sessions | User Administrator or `User.ReadWrite.All` |

## Error Handling

| Status Code | Meaning | Common Cause |
|-------------|---------|--------------|
| 400 Bad Request | Malformed request | Invalid user ID, service plan conflict, dynamic group member add |
| 401 Unauthorized | Authentication failure | Expired token, missing scope consent |
| 403 Forbidden | Insufficient permissions | Missing required role — check delegation hierarchy |
| 404 Not Found | Resource not found | Invalid user/group ID, deleted file not in recycle bin |
| 409 Conflict | Operation conflict | License already assigned, user already member of group |
| 429 Too Many Requests | Throttled | Implement exponential backoff with `Retry-After` header |

### License Assignment Errors

| Error Code | Meaning | Resolution |
|------------|---------|------------|
| `CountViolation` | No available licenses | Purchase additional licenses or free up existing ones |
| `MutuallyExclusiveViolation` | Conflicting service plans | Remove conflicting license before assigning new one |
| `DependencyViolation` | Required service plan missing | Assign prerequisite license first |
| `ProhibitedInUsageLocationViolation` | Usage location not set | `PATCH /users/{id}` with `usageLocation` before license assignment |

### Partial Execution Recovery

If a multi-step runbook fails partway through:

1. **Document** which steps completed and which failed
2. **Do not retry** the entire runbook — only retry from the failed step
3. **Verify** the state after partial execution before proceeding
4. **Rollback** completed steps if the overall operation cannot succeed
5. **Escalate** if rollback is not possible — document the partial state in the ticket

## Safety Principles

1. **Always verify identity** — Confirm the requester is who they claim to be
2. **Least privilege** — Grant minimum required access
3. **Approval gates** — Require manager approval for sensitive operations
4. **Audit trail** — Log every action with who requested it and who executed it
5. **Temporary passwords** — Always use `forceChangePasswordNextSignIn: true`
6. **Never share secrets in tickets** — Use secure channels for password delivery
7. **Pre-check before execute** — Always validate state before making changes
8. **Document rollback** — Record enough detail to reverse any change
