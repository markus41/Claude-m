---
name: servicedesk-runbooks
description: Deep expertise in M365 service desk automation — safe guided workflows for common IT tickets with pre-checks, approval gates, and end-user verification.
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
---

# M365 Service Desk Auto-Runbooks

This skill provides safe, structured workflows for the most common M365 IT support tickets. Each runbook follows a consistent pattern: pre-checks, approval, execution, verification, and end-user communication.

## Runbook Pattern

Every runbook follows this structure:

1. **Pre-checks** — Validate the request before making changes
2. **Approval gate** — Get manager or admin approval if required
3. **Execution** — Perform the action with error handling
4. **Verification** — Confirm the action succeeded
5. **End-user text** — Generate a message for the requester

## Common Runbooks

### 1. Shared Mailbox Access

**Pre-checks:**
- Verify the shared mailbox exists
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

### 2. MFA Reset

**Pre-checks:**
- Verify the user exists and is active
- Check current MFA methods registered
- Confirm the reset is authorized (manager approval or IT admin)

**Execution (Graph API):**
```
DELETE https://graph.microsoft.com/v1.0/users/{userId}/authentication/microsoftAuthenticatorMethods/{methodId}
DELETE https://graph.microsoft.com/v1.0/users/{userId}/authentication/phoneMethods/{methodId}
```

**Verification:**
```
GET https://graph.microsoft.com/v1.0/users/{userId}/authentication/methods
```

### 3. File Recovery

**Pre-checks:**
- Identify the file location (OneDrive or SharePoint)
- Check the recycle bin (first-stage and second-stage)
- Verify the file exists in the recycle bin

**Execution (Graph API):**
```
POST https://graph.microsoft.com/v1.0/users/{userId}/drive/items/{itemId}/restore
```

Or via SharePoint recycle bin:
```powershell
Restore-PnPRecycleBinItem -Identity {itemId} -Force
```

### 4. Password Reset

**Pre-checks:**
- Verify the user exists and is active
- Check if the account is synced from on-prem AD (cannot reset cloud password for synced accounts)
- Verify the requester is authorized

**Execution (Graph API):**
```
PATCH https://graph.microsoft.com/v1.0/users/{userId}
{
  "passwordProfile": {
    "forceChangePasswordNextSignIn": true,
    "password": "{secureRandomPassword}"
  }
}
```

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

## Required Permissions

| Runbook | Permission / Role |
|---|---|
| Shared mailbox access | Exchange Administrator |
| MFA reset | Authentication Administrator |
| File recovery | Sites.ReadWrite.All or SharePoint Administrator |
| Password reset | User Administrator (or Helpdesk Administrator for non-admin users) |

## Safety Principles

1. **Always verify identity** — Confirm the requester is who they claim to be
2. **Least privilege** — Grant minimum required access
3. **Approval gates** — Require manager approval for sensitive operations
4. **Audit trail** — Log every action with who requested it and who executed it
5. **Temporary passwords** — Always use `forceChangePasswordNextSignIn: true`
6. **Never share secrets in tickets** — Use secure channels for password delivery
