---
name: m365-offboard-wizard
description: Guided employee offboarding checklist — mailbox forwarding, OneDrive transfer, license removal, session revocation, risky app cleanup, and access review. Supports Lighthouse multi-tenant batch mode.
argument-hint: "<userPrincipalName> [--manager <upn>] [--forward-to <email>] [--tenant <tenantId>] [--dry-run]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
  - AskUserQuestion
---

# Offboard Employee — Guided Checklist

A non-technical, guided offboarding workflow. Walks through each step with plain-language confirmations and approval gates. Produces a client-safe completion report.

## Guided Checklist

### Step 1: Confirm Who Is Leaving
Ask the user:
- "Who is leaving the organization?" (look up user by name or email)
- "When is their last day?"
- "Who is their manager or delegate?" (for file/mailbox transfer)
- Display current status: account enabled, licenses, group count, mailbox size

**Plain-language summary**: "I found **John Doe** (john.doe@contoso.com). They have an E3 license, belong to 12 groups, and their mailbox is 4.2 GB. Their manager is **Jane Smith**."

### Step 2: Block Sign-In
- PATCH `/users/{id}` with `accountEnabled: false`
- POST `/users/{id}/revokeSignInSessions`

**Confirmation**: "John's account is now disabled and all active sessions have been revoked. They can no longer sign in."

### Step 3: Set Up Mailbox Forwarding
Ask: "Should incoming emails be forwarded to someone?"
- If yes: configure mail forwarding via Exchange PowerShell or Graph
- Set auto-reply: "This person is no longer with the organization. Please contact [manager/alternate]."
- PATCH `/users/{id}/mailboxSettings` for auto-reply

### Step 4: Transfer OneDrive Files
Ask: "Who should get access to their OneDrive files?"
- Grant the manager/delegate access to the departing user's OneDrive
- Provide link to the OneDrive for file review
- Remind: OneDrive content is retained for 30 days after account deletion (configurable)

### Step 5: Remove Group Memberships
- List all groups: GET `/users/{id}/memberOf`
- Remove from each group: DELETE `/groups/{groupId}/members/{userId}/$ref`
- Skip dynamic groups and on-prem synced groups (log as warnings)

**Confirmation**: "Removed from 10 of 12 groups. 2 groups are synced from Active Directory and must be handled on-premises."

### Step 6: Revoke Licenses
- List current licenses: GET `/users/{id}/licenseDetails`
- POST `/users/{id}/assignLicense` with `removeLicenses` for all assigned SKUs

**Confirmation**: "Removed Microsoft 365 E3 license. This license is now available for reassignment."

### Step 7: Check for Risky Apps & Delegated Access
- GET `/users/{id}/oauth2PermissionGrants` — list app consent grants
- GET `/users/{id}/ownedObjects` — check for app registrations owned by this user
- Flag any third-party apps with broad permissions
- Recommend: revoke suspicious grants, reassign app ownership

### Step 8: Convert Mailbox (Optional)
Ask: "Should we convert their mailbox to a shared mailbox? (Free under 50 GB)"
- If yes: `Set-Mailbox -Identity "{upn}" -Type Shared` via Exchange PowerShell
- After conversion, the license can be fully removed

### Step 9: Completion Report

```markdown
# Employee Offboarding Report

| Step | Status | Details |
|---|---|---|
| Account disabled | OK | Blocked sign-in |
| Sessions revoked | OK | All active sessions terminated |
| Mail forwarding | OK | Forwarding to jane.smith@contoso.com |
| Auto-reply set | OK | Standard departure message |
| OneDrive transferred | OK | Manager granted access |
| Groups removed | OK | 10/12 removed, 2 on-prem skipped |
| Licenses revoked | OK | E3 license freed |
| Risky apps checked | OK | 1 app flagged for review |
| Mailbox converted | OK | Converted to shared mailbox |

Offboarded by: [admin UPN]
Date: [timestamp]
Last working day: [date]
```

## Lighthouse Multi-Tenant Batch Mode

When `--tenant` is specified or the user says "offboard across customer tenants":

1. List managed tenants via Lighthouse API
2. Ask which tenants to include in the batch
3. For each tenant: look up the user, display summary, require explicit approval
4. Execute offboarding steps per tenant with GDAP delegated permissions
5. Produce a cross-tenant summary report with per-tenant status

## Arguments

- `<userPrincipalName>`: User to offboard
- `--manager <upn>`: Manager/delegate for file and mail transfer
- `--forward-to <email>`: Email address for mail forwarding (defaults to manager)
- `--tenant <tenantId>`: Target tenant for Lighthouse mode
- `--dry-run`: Preview all steps without making changes

## Important Notes

- Disabling the account does NOT terminate active sessions — always call `revokeSignInSessions`
- This wizard does NOT delete the user account — only disables it. Deletion is a separate decision.
- Shared mailboxes under 50 GB are free (no license required)
- OneDrive retention period is configurable in SharePoint Admin (default 30 days after deletion)
- Dynamic groups and on-prem AD synced groups cannot be modified via Graph — these require on-prem action
- Reference: `skills/m365-admin/references/offboarding-cleanup.md` for risky app detection patterns
- Reference: `skills/m365-admin/references/entra-id.md` for disable/license/group operations
