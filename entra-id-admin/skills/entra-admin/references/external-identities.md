# External Identities / B2B — Reference

## Guest User Invitation

```
POST /invitations
{
  "invitedUserEmailAddress": "partner@fabrikam.com",
  "inviteRedirectUrl": "https://myapps.microsoft.com",
  "invitedUserDisplayName": "Alice Chen (Fabrikam)",
  "sendInvitationMessage": true,
  "invitedUserMessageInfo": {
    "customizedMessageBody": "You have been invited to Contoso's collaboration portal. Click the link below to accept.",
    "ccRecipients": [
      { "emailAddress": { "address": "sponsor@contoso.com" } }
    ]
  }
}
```

Response:
```json
{
  "id": "<invitation-id>",
  "invitedUser": { "id": "<new-guest-user-id>" },
  "inviteRedeemUrl": "https://invitations.microsoft.com/...",
  "status": "PendingAcceptance"
}
```

`inviteRedeemUrl` — share with guest if `sendInvitationMessage: false` or for manual distribution.

## Guest User States

| `externalUserState` | Meaning |
|--------------------|---------|
| `PendingAcceptance` | Invitation sent, not yet redeemed |
| `Accepted` | Guest has signed in and accepted |

Check invite status:
```
GET /users/{guestUserId}?$select=externalUserState,externalUserStateChangeDateTime,mail,displayName
```

## List All Guest Users

```
GET /users?$filter=userType eq 'Guest'
  &$select=id,displayName,mail,externalUserState,externalUserStateChangeDateTime,createdDateTime,signInActivity
  &$orderby=createdDateTime desc
```

## Resend Invitation

Resend the invitation email to a guest who hasn't redeemed:
```
POST /invitations
{
  "invitedUserEmailAddress": "partner@fabrikam.com",
  "inviteRedirectUrl": "https://myapps.microsoft.com",
  "resetRedemption": true
}
```

`resetRedemption: true` resets the acceptance state, allowing re-invitation of a previously accepted guest with a new email.

## External Collaboration Settings

```
GET /policies/authorizationPolicy
```

Key fields:
- `allowInvitesFrom` — who can invite guests
- `guestUserRoleId` — default permissions for guests

```
PATCH /policies/authorizationPolicy
{
  "allowInvitesFrom": "adminsAndGuestInviters",
  "guestUserRoleId": "10dae51f-b6af-4016-8d66-8c2a99b929b3"
}
```

`allowInvitesFrom` values:
| Value | Who can invite |
|-------|---------------|
| `everyone` | All users including guests |
| `adminsAndGuestInviters` | Admins + Guest Inviter role members |
| `adminsAndSingleUserInviters` | Admins + users who can invite specific users |
| `none` | Only Global Admins |

`guestUserRoleId` values:
| Role | GUID |
|------|------|
| Guest (restricted) | `10dae51f-b6af-4016-8d66-8c2a99b929b3` |
| Member (same as members) | `a0b1b346-4d3e-4e8b-98f8-753987be4970` |
| Restricted Guest | `2af84b1e-32c8-42b7-82bc-daa82404023b` |

## Cross-Tenant Access Policy (XTAP)

Configure trust settings per external organization:

```
# Get default cross-tenant access settings
GET /policies/crossTenantAccessPolicy/default

# List per-org partner settings
GET /policies/crossTenantAccessPolicy/partners

# Get settings for a specific partner tenant
GET /policies/crossTenantAccessPolicy/partners/{tenantId}

# Create settings for a partner org
POST /policies/crossTenantAccessPolicy/partners
{
  "tenantId": "<partner-tenant-id>",
  "b2bCollaborationInbound": {
    "usersAndGroups": { "accessType": "allowed", "targets": [{ "target": "AllUsers", "targetType": "user" }] },
    "applications": { "accessType": "allApplications" }
  },
  "b2bCollaborationOutbound": {
    "usersAndGroups": { "accessType": "allowed", "targets": [{ "target": "AllUsers", "targetType": "user" }] }
  },
  "inboundTrust": {
    "isMfaAccepted": true,
    "isCompliantDeviceAccepted": true,
    "isHybridAzureADJoinedDeviceAccepted": true
  }
}
```

## Guest Lifecycle — Expiration

Review and expire inactive guests using access reviews (see `entitlement-management.md`).

Manually check last sign-in for stale guests:
```
GET /users?$filter=userType eq 'Guest'
  &$select=id,displayName,mail,signInActivity
  &$orderby=signInActivity/lastSignInDateTime asc
```

Remove a guest:
```
DELETE /users/{guestUserId}   → soft delete (30 days to restore)
```
