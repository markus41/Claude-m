---
name: entra-auth-mfa-require
description: Enforce MFA registration for users — per-user, by group, or tenant-wide report of unregistered users
argument-hint: "[--user <upn-or-id>] [--group <group-name-or-id>] [--report] [--bulk-require]"
allowed-tools:
  - Read
  - Write
  - Bash
---

# Enforce MFA Registration

Identify users without MFA registered and require them to register on next sign-in.
Works per-user, by group, or generates a tenant-wide MFA gap report.

## Steps

### Mode 1: Per-User (--user)

Require MFA registration for a single user:
```
POST https://graph.microsoft.com/v1.0/users/{userId}/authentication/requireMfaRegistration
```

### Mode 2: By Group (--group)

Get group members:
```
GET /groups/{groupId}/members/microsoft.graph.user?$select=id,displayName,userPrincipalName
```

For each user, POST `requireMfaRegistration`. Rate-limit: batch of 10 with 429 handling.

### Mode 3: Report (--report)

Get MFA registration status for all users:
```
GET https://graph.microsoft.com/v1.0/reports/credentialUserRegistrationDetails
  ?$filter=isMfaRegistered eq false
  &$select=userDisplayName,userPrincipalName,isMfaRegistered,isRegistered,authMethods
```

Report unregistered users with their department (requires joining user data).

### Mode 4: Bulk Require All Unregistered (--bulk-require)

Combine report + per-user require:
1. Get all users without MFA from report
2. For each unregistered user: `POST requireMfaRegistration`
3. Report results

### Display Output — Report

```
MFA Registration Report
─────────────────────────────────────────────────────────────────
Tenant: contoso.onmicrosoft.com
─────────────────────────────────────────────────────────────────
 Status            Count   %
 MFA Registered    483     89%
 Not Registered    58      11%
─────────────────────────────────────────────────────────────────
Unregistered users (top 10):
  bob.jones@contoso.com — Engineering — Last sign-in: 2026-02-15
  charlie.b@contoso.com — Sales — Last sign-in: 2026-01-30
  ... and 48 more

Use --bulk-require to prompt all 58 users to register MFA on next sign-in.
─────────────────────────────────────────────────────────────────
```

### Display Output — Bulk Require

```
MFA Registration Required
─────────────────────────────────────────────────────────────────
Users prompted: 58
Errors:         0
─────────────────────────────────────────────────────────────────
These users will see the MFA registration prompt on their next sign-in.
```

## Azure CLI Alternative

```bash
# Require MFA registration for a single user
az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/users/<user-id>/authentication/requireMfaRegistration"

# Get MFA registration report (users without MFA)
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/reports/credentialUserRegistrationDetails?\$filter=isMfaRegistered eq false" \
  --query "value[].{User:userDisplayName, UPN:userPrincipalName, MFA:isMfaRegistered}" \
  --output table
```

## Error Handling

| Code | Fix |
|------|-----|
| `403` | Add `UserAuthenticationMethod.ReadWrite.All` and `AuditLog.Read.All` scope |
| `403` on report | Add `Reports.Read.All` scope |
