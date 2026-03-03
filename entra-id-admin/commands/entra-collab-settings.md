---
name: entra-collab-settings
description: View and configure external collaboration settings — who can invite guests, guest permissions, and cross-tenant access
argument-hint: "[--show] [--allow-invites <everyone|admins|adminsAndGuestInviters|none>] [--guest-role <guest|member>] [--xtap <tenant-id>]"
allowed-tools:
  - Read
  - Write
  - Bash
---

# External Collaboration Settings

View and configure who can invite external guests, what permissions guests have, and cross-tenant access (XTAP) settings per partner organization.

## Steps

### Mode 1: Show Current Settings (--show or default)

```
GET https://graph.microsoft.com/v1.0/policies/authorizationPolicy
  ?$select=allowInvitesFrom,guestUserRoleId,allowedToSignUpEmailBasedSubscriptions,
    allowedToUseSSPR,defaultUserRolePermissions
```

```
GET https://graph.microsoft.com/v1.0/policies/crossTenantAccessPolicy/default
```

### Mode 2: Update Invite Settings (--allow-invites)

```
PATCH https://graph.microsoft.com/v1.0/policies/authorizationPolicy
{ "allowInvitesFrom": "<value>" }
```

Values:
- `everyone` — all users including guests can invite
- `adminsAndGuestInviters` — Admins + Guest Inviter role members (recommended)
- `adminsAndSingleUserInviters` — Admins + specific users
- `none` — only Global Admins

### Mode 3: Set Guest Role (--guest-role)

```
PATCH /policies/authorizationPolicy
{ "guestUserRoleId": "<guid>" }
```

- `guest` (restricted): `10dae51f-b6af-4016-8d66-8c2a99b929b3`
- `member` (same as members): `a0b1b346-4d3e-4e8b-98f8-753987be4970`

### Mode 4: View/Configure XTAP for Partner (--xtap <tenant-id>)

```
GET https://graph.microsoft.com/v1.0/policies/crossTenantAccessPolicy/partners/{tenantId}
```

If not found, create:
```
POST /policies/crossTenantAccessPolicy/partners
{
  "tenantId": "<tenantId>",
  "b2bCollaborationInbound": { "usersAndGroups": { "accessType": "allowed", "targets": [{ "target": "AllUsers", "targetType": "user" }] }, "applications": { "accessType": "allApplications" } },
  "inboundTrust": { "isMfaAccepted": true, "isCompliantDeviceAccepted": true }
}
```

### Display Output

```
External Collaboration Settings
─────────────────────────────────────────────────────────────────
Who can invite guests:   Admins and Guest Inviters
Guest default role:      Guest User (restricted permissions)
Email subscriptions:     Disabled
─────────────────────────────────────────────────────────────────
Cross-Tenant Access (default):
  Inbound B2B:   Allowed (all Microsoft tenants)
  Outbound B2B:  Allowed
  Trusted MFA:   Not accepted
─────────────────────────────────────────────────────────────────
Partner overrides: 3 configured
  fabrikam.com    — MFA trusted ✓
  partner2.com    — Inbound blocked ✗
─────────────────────────────────────────────────────────────────
```

## Error Handling

| Code | Fix |
|------|-----|
| `403` | Add `Policy.ReadWrite.AuthorizationPolicy` scope |
| `403` on XTAP | Add `Policy.ReadWrite.CrossTenantAccess` scope |
