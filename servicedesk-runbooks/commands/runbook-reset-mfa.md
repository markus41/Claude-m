---
name: runbook-reset-mfa
description: Reset MFA for a user — guided workflow with identity verification, method removal, and re-registration instructions.
argument-hint: "<userPrincipalName> [--method <all|authenticator|phone>] [--dry-run]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
  - AskUserQuestion
---

# Runbook: Reset MFA

Guided workflow for resetting multi-factor authentication methods for a user.

## Workflow

### Pre-Checks
1. Verify the user exists and is active
2. List current MFA methods:
   ```
   GET https://graph.microsoft.com/v1.0/users/{userId}/authentication/methods
   ```
3. Show registered methods: Authenticator app, phone number, email, FIDO2 key, etc.
4. Confirm the user's identity has been verified (they are who they say they are)

### Approval Gate
Ask: "How was the user's identity verified?"
- "Called back on known phone number"
- "Verified by their manager in person/Teams"
- "Matched answers to security questions"
- "Presented government-issued ID"

If identity was NOT verified: **stop and do not proceed**.

### Method Selection
Ask: "Which MFA methods should be reset?"
- "All methods" — Remove everything, user must re-register from scratch
- "Authenticator app only" — Remove app registration, keep phone
- "Phone number only" — Remove phone, keep authenticator

### Execution

Remove Authenticator:
```
DELETE https://graph.microsoft.com/v1.0/users/{userId}/authentication/microsoftAuthenticatorMethods/{methodId}
```

Remove Phone:
```
DELETE https://graph.microsoft.com/v1.0/users/{userId}/authentication/phoneMethods/{methodId}
```

### Verification
```
GET https://graph.microsoft.com/v1.0/users/{userId}/authentication/methods
```

Confirm the targeted methods have been removed.

### End-User Notification

```markdown
Hi [User Name],

Your multi-factor authentication (MFA) has been reset. On your next sign-in:

1. Sign in with your username and password as usual
2. You'll be prompted to set up a new verification method
3. We recommend the **Microsoft Authenticator** app:
   - Download from your phone's app store
   - Follow the on-screen prompts to scan the QR code
4. You can manage your sign-in methods anytime at: https://mysignins.microsoft.com

**Important:** If you did NOT request this reset, contact IT immediately at [support contact].
```

### Completion Report

```markdown
| Field | Value |
|---|---|
| User | user@contoso.com |
| Methods removed | Microsoft Authenticator, Phone (+1 XXX-XXX-1234) |
| Identity verified by | Manager confirmation via Teams |
| Status | Reset complete — awaiting re-registration |
| Ticket | [reference] |
```

## Arguments

- `<userPrincipalName>`: User whose MFA should be reset
- `--method <all|authenticator|phone>`: Which methods to remove (or ask interactively)
- `--dry-run`: Show current methods without removing

## Important Notes

- **Identity verification is mandatory** — never reset MFA without confirming the requester's identity
- MFA reset for admin accounts requires a higher-level admin or break-glass procedure
- After reset, the user must re-register on next sign-in (they cannot be locked out if password auth works)
- Consider using Temporary Access Pass (TAP) if the user also needs a new password
- Reference: `skills/servicedesk-runbooks/SKILL.md` for MFA API patterns
