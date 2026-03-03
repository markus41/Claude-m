---
name: entra-user-disable
description: Disable or re-enable an Entra ID user account, revoke sessions, and optionally remove licenses
argument-hint: "<upn-or-id> [--enable] [--revoke-sessions] [--remove-licenses] [--remove-groups] [--reason <text>]"
allowed-tools:
  - Read
  - Write
  - Bash
---

# Disable / Enable Entra ID User

Disable a user account (prevents sign-in) or re-enable it. Supports full offboarding flow including session revocation and license removal.

## Steps

### 1. Resolve User

`GET /users/{upnOrId}?$select=id,displayName,userPrincipalName,accountEnabled,assignedLicenses,onPremisesSyncEnabled`

If `onPremisesSyncEnabled` is true:
- `accountEnabled` can still be set via Graph even for synced users (it's a cloud-writable attribute)
- Warn: "User is synced from on-prem AD. Disabling here affects cloud sign-in only. Disable in on-prem AD to prevent writeback reactivating the account."

### 2. Disable or Enable Account

If `--enable` flag is absent (default: disable):
```
PATCH https://graph.microsoft.com/v1.0/users/{userId}
{ "accountEnabled": false }
```

If `--enable` flag is present:
```
PATCH https://graph.microsoft.com/v1.0/users/{userId}
{ "accountEnabled": true }
```

### 3. Revoke All Active Sessions (if --revoke-sessions or default for disable)

```
POST https://graph.microsoft.com/v1.0/users/{userId}/revokeSignInSessions
```

This invalidates all refresh tokens and requires re-authentication across all apps.

### 4. Remove All Licenses (if --remove-licenses)

Get current licenses: `GET /users/{userId}?$select=assignedLicenses`

Remove each SKU:
```
POST https://graph.microsoft.com/v1.0/users/{userId}/assignLicense
{
  "addLicenses": [],
  "removeLicenses": ["<sku-id-1>", "<sku-id-2>"]
}
```

### 5. Remove from All Groups (if --remove-groups)

Get groups: `GET /users/{userId}/memberOf/microsoft.graph.group?$select=id,displayName,groupTypes`

For each group (skip dynamic groups — membership is auto-managed):
```
DELETE https://graph.microsoft.com/v1.0/groups/{groupId}/members/{userId}/$ref
```

Skip groups where `groupTypes` contains `DynamicMembership`.

### 6. Display Summary

**Disable output:**
```
User disabled
─────────────────────────────────────────────────────────────────
User:            Jane Smith (jane.smith@contoso.com)
Account Status:  DISABLED — sign-in blocked
Sessions:        Revoked ✓
Licenses:        Removed (M365 E3, Intune) ✓
Groups removed:  5 groups (2 skipped — dynamic) ✓
─────────────────────────────────────────────────────────────────
Reason:          Employee departure (2026-03-01)
─────────────────────────────────────────────────────────────────
Note: Account remains in directory for 30 days before permanent deletion.
Restore with: /entra-id-admin:entra-user-disable <id> --enable
```

**Enable output:**
```
User enabled
─────────────────────────────────────────────────────────────────
User:            Jane Smith (jane.smith@contoso.com)
Account Status:  ENABLED — sign-in allowed
─────────────────────────────────────────────────────────────────
```

## Error Handling

| Code | Fix |
|------|-----|
| `403` | Add `User.ReadWrite.All` scope |
| `404` | User not found — verify UPN |
| `400 DirectorySyncEnabled` | Can only change `accountEnabled` for synced users via Graph |
