# Offboarding & Access Cleanup — Patterns

API patterns for guided offboarding, risky app detection, and Lighthouse batch execution.

## Check User Status

```
GET https://graph.microsoft.com/v1.0/users/{userId}?$select=displayName,accountEnabled,assignedLicenses,department,jobTitle,manager
```

## Disable Account

```
PATCH https://graph.microsoft.com/v1.0/users/{userId}
{
  "accountEnabled": false
}
```

## Revoke Sessions

```
POST https://graph.microsoft.com/v1.0/users/{userId}/revokeSignInSessions
```

## Set Mail Forwarding (Exchange PowerShell)

```powershell
Set-Mailbox -Identity "john.doe@contoso.com" `
  -ForwardingSmtpAddress "smtp:jane.smith@contoso.com" `
  -DeliverToMailboxAndForward $false
```

## Set Auto-Reply

```
PATCH https://graph.microsoft.com/v1.0/users/{userId}/mailboxSettings
{
  "automaticRepliesSetting": {
    "status": "alwaysEnabled",
    "internalReplyMessage": "<html><body>This person is no longer with the organization. Please contact <a href='mailto:jane.smith@contoso.com'>Jane Smith</a>.</body></html>",
    "externalReplyMessage": "<html><body>This person is no longer with the organization. Please contact <a href='mailto:jane.smith@contoso.com'>Jane Smith</a>.</body></html>"
  }
}
```

## Transfer OneDrive Access

Grant manager access to the departing user's OneDrive:

```
POST https://graph.microsoft.com/v1.0/users/{userId}/drive/root/invite
{
  "recipients": [
    { "email": "manager@contoso.com" }
  ],
  "roles": ["write"],
  "requireSignIn": true,
  "sendInvitation": true,
  "message": "OneDrive access transferred as part of offboarding for [user]."
}
```

## List Group Memberships

```
GET https://graph.microsoft.com/v1.0/users/{userId}/memberOf?$select=displayName,id,groupTypes,onPremisesSyncEnabled
```

Filter results:
- `onPremisesSyncEnabled: true` → Skip (must be handled on-prem)
- `groupTypes` contains `DynamicMembership` → Skip (membership is automatic)

## Remove from Group

```
DELETE https://graph.microsoft.com/v1.0/groups/{groupId}/members/{userId}/$ref
```

## Risky App Detection

### List OAuth Consent Grants
```
GET https://graph.microsoft.com/v1.0/users/{userId}/oauth2PermissionGrants?$select=clientId,scope,consentType
```

### List Owned App Registrations
```
GET https://graph.microsoft.com/v1.0/users/{userId}/ownedObjects?$filter=@odata.type eq '#microsoft.graph.application'
```

### Red Flags to Check
| Signal | Risk Level | Action |
|---|---|---|
| App with `Mail.ReadWrite` scope | High | Revoke consent |
| App with `Files.ReadWrite.All` scope | High | Revoke consent |
| User owns app registrations | Medium | Reassign ownership |
| Third-party app with admin consent | High | Review with security team |
| App last used > 90 days ago | Low | Mark for cleanup |

### Revoke App Consent
```
DELETE https://graph.microsoft.com/v1.0/oauth2PermissionGrants/{grantId}
```

## Convert Mailbox to Shared (Exchange PowerShell)

```powershell
Set-Mailbox -Identity "john.doe@contoso.com" -Type Shared
```

After conversion, the license can be removed. Shared mailboxes under 50 GB do not require a license.

## Lighthouse Batch Execution

### List Managed Tenants
```
GET https://graph.microsoft.com/beta/tenantRelationships/managedTenants/tenants?$select=tenantId,displayName,tenantStatusInformation
```

### Batch Execution Pattern
1. Enumerate target tenants
2. For each tenant, authenticate via GDAP
3. Look up the user in that tenant
4. Display summary and require explicit approval
5. Execute offboarding steps
6. Collect results

### Cross-Tenant Summary Report

```markdown
| Tenant | User | Status | Steps Completed | Issues |
|---|---|---|---|---|
| Contoso | john@contoso.com | Complete | 9/9 | None |
| Fabrikam | john@fabrikam.com | Partial | 7/9 | On-prem groups skipped |
```

### Required GDAP Roles for Offboarding
| Operation | Minimum GDAP Role |
|---|---|
| Disable account | User Administrator |
| Revoke sessions | User Administrator |
| Remove from groups | Groups Administrator |
| Remove licenses | License Administrator |
| Set mail forwarding | Exchange Administrator |
| Convert mailbox | Exchange Administrator |
| Revoke app consent | Cloud Application Administrator |
