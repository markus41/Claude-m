---
name: runbook-password-reset
description: Reset a user's password — guided workflow with compliance checks, secure password generation, and delivery instructions.
argument-hint: "<userPrincipalName> [--temporary] [--dry-run]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
  - AskUserQuestion
---

# Runbook: Reset Password

Guided workflow for resetting a user's password with proper security controls.

## Workflow

### Pre-Checks
1. Verify the user exists and is active
2. Check if the account is cloud-only or synced from on-prem AD:
   ```
   GET https://graph.microsoft.com/v1.0/users/{userId}?$select=onPremisesSyncEnabled
   ```
   - If `onPremisesSyncEnabled: true`: cannot reset password in cloud — must be done on-prem
   - If `false` or `null`: proceed with cloud reset
3. Check if the user is an admin (requires higher-privilege admin to reset)
4. Verify the requester's identity (see MFA reset runbook for verification methods)

### Approval Gate
- Standard users: IT admin can reset directly
- Admin accounts: require Global Administrator or Privileged Authentication Administrator
- If the requester is the user themselves: verify identity first

### Password Generation
Generate a secure temporary password:
- Minimum 16 characters
- Mixed uppercase, lowercase, digits, and special characters
- Cryptographically random
- `forceChangePasswordNextSignIn: true` — always

### Execution
```
PATCH https://graph.microsoft.com/v1.0/users/{userId}
{
  "passwordProfile": {
    "forceChangePasswordNextSignIn": true,
    "password": "{generatedPassword}"
  }
}
```

### Secure Delivery
Ask: "How should the temporary password be delivered?"
- "Tell the manager to share in person" (most secure)
- "Send via separate secure channel" (e.g., Teams chat to manager)
- Never send passwords via email or include in ticket systems

### Verification
- Confirm the password was changed: check `passwordLastChangedDateTime` after the user logs in
- Or ask the user to confirm they can sign in with the new temporary password

### End-User Notification

```markdown
Hi [User Name],

Your password has been reset. A temporary password has been provided to you through [delivery method].

On your next sign-in:
1. Go to https://portal.office.com
2. Enter your email and the temporary password
3. You'll be asked to create a new password
4. Your new password must be at least [X] characters and include a mix of letters, numbers, and symbols

**Important:**
- Never share your password with anyone
- IT support will never ask for your password
- If you didn't request this reset, contact IT immediately at [support contact]
```

### Completion Report

```markdown
| Field | Value |
|---|---|
| User | user@contoso.com |
| Account type | Cloud-only |
| Password reset | Yes |
| Force change on next sign-in | Yes |
| Delivery method | Shared with manager in person |
| Identity verified by | [method] |
| Status | Reset — awaiting user sign-in |
| Ticket | [reference] |
```

## Arguments

- `<userPrincipalName>`: User whose password should be reset
- `--temporary`: Generate and set a temporary password (default behavior)
- `--dry-run`: Show what would happen without resetting

## Important Notes

- **Never** include passwords in emails, ticket systems, or chat logs
- **Always** set `forceChangePasswordNextSignIn: true`
- For synced accounts (`onPremisesSyncEnabled: true`): password must be reset in on-premises Active Directory
- Admin account resets require a higher-privilege admin
- Password complexity requirements are set by the tenant's password policy
- Consider issuing a Temporary Access Pass (TAP) if the user also needs to re-register MFA
- Reference: `skills/servicedesk-runbooks/SKILL.md` for password reset patterns
