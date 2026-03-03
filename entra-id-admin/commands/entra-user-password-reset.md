---
name: entra-user-password-reset
description: Reset an Entra ID user password, revoke sessions, and optionally force re-registration of MFA
argument-hint: "<upn-or-id> [--password <new-password>] [--no-force-change] [--revoke-sessions] [--require-mfa-register]"
allowed-tools:
  - Read
  - Write
  - Bash
---

# Reset Entra ID User Password

Reset a user's password administratively. Generates a secure random password if none provided. Optionally revoke existing sessions and require MFA re-registration.

## Steps

### 1. Resolve User

`GET /users/{upnOrId}?$select=id,displayName,userPrincipalName,accountEnabled,onPremisesSyncEnabled,passwordPolicies`

If `onPremisesSyncEnabled` is true, warn:
"This user's password is managed by on-premises Active Directory. Setting a password via Graph will fail if password write-back is not enabled. Use your on-prem AD admin tools or confirm write-back is configured."

If `accountEnabled` is false, warn: "User account is disabled. Password reset will succeed but user cannot sign in until re-enabled."

### 2. Generate Password (if --password not provided)

Generate a strong random password: 16+ characters, including:
- At least 2 uppercase letters
- At least 2 lowercase letters
- At least 2 digits
- At least 2 special characters (`!@#$%^&*`)

Format: `<4 upper><4 lower><4 digit><4 special>` shuffled.

### 3. Set Password

```
PATCH https://graph.microsoft.com/v1.0/users/{userId}
{
  "passwordProfile": {
    "password": "<new-password>",
    "forceChangePasswordNextSignIn": true
  }
}
```

If `--no-force-change`: set `"forceChangePasswordNextSignIn": false`.

If user has `passwordPolicies: "DisablePasswordExpiration"` (service account), note this and preserve the setting.

### 4. Revoke Sessions (if --revoke-sessions, default: yes)

```
POST https://graph.microsoft.com/v1.0/users/{userId}/revokeSignInSessions
```

This signs the user out of all apps and devices immediately.

### 5. Require MFA Re-registration (if --require-mfa-register)

```
POST https://graph.microsoft.com/v1.0/users/{userId}/authentication/requireMfaRegistration
```

### 6. Display Output

```
Password Reset Complete
─────────────────────────────────────────────────────────────────
User:              Jane Smith (jane.smith@contoso.com)
New Password:      Xk8mN2qR!@9Kp3$w  ← Deliver securely
Force Change:      Yes (on next sign-in)
Sessions Revoked:  Yes ✓
MFA Re-register:   Not required
─────────────────────────────────────────────────────────────────
IMPORTANT: This password will not be shown again.
Deliver it to the user via a secure channel (phone, secure message).
```

## Error Handling

| Code | Fix |
|------|-----|
| `400 PasswordPolicyViolation` | Password doesn't meet tenant complexity requirements |
| `400 DirectorySyncEnabled` | Password sync from on-prem AD; use write-back or reset in AD |
| `403` | Add `User.ReadWrite.All` scope; or target user has higher privileges |
| `404` | User not found |
