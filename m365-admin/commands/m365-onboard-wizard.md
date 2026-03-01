---
name: m365-onboard-wizard
description: Guided "Set up new employee" wizard — create account, assign license, add to groups, provision Teams, set up OneDrive folder template, and send welcome email. Supports Lighthouse multi-tenant mode.
argument-hint: "<displayName> <userPrincipalName> [--license <skuId>] [--groups <groupIds>] [--template <name>] [--tenant <tenantId>] [--dry-run]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
  - AskUserQuestion
---

# Set Up New Employee

A guided, non-technical wizard for onboarding a new employee into Microsoft 365. Walks through each step with plain-language prompts and produces a completion report.

## Wizard Flow

### Step 1: Gather Employee Details
Ask the user in plain language:
- **Full name** — "What is the new employee's full name?"
- **Email address** — "What email address should they have?" (validates domain)
- **Department** — "Which department are they joining?"
- **Manager** — "Who is their manager?" (UPN lookup)
- **Job title** — "What is their job title?"
- **Start date** — "When do they start?"
- **Location** — "Which office/country?" (sets usageLocation for licensing)

### Step 2: Create Account
- POST `/users` with gathered details
- Generate a strong temporary password with `forceChangePasswordNextSignIn: true`
- Set `usageLocation` (required before license assignment)
- If `--dry-run`: show the request body without executing

**Plain-language confirmation**: "I'll create an account for **Jane Smith** (jane.smith@contoso.com) in the **Marketing** department. They'll get a temporary password and must change it on first login."

### Step 3: Assign License
- Ask: "Which license should they get?" — present friendly names:
  - "Microsoft 365 Business Basic" / "Business Standard" / "Business Premium"
  - "Microsoft 365 E1" / "E3" / "E5"
  - "Microsoft 365 F1" (frontline)
- POST `/users/{id}/assignLicense` with selected SKU
- Verify assignment succeeded

### Step 4: Add to Groups
- Ask: "Which groups should they join?" — present existing groups by display name
- Support: security groups, M365 groups, distribution lists
- POST `/groups/{groupId}/members/$ref` for each group
- Report per-group success/failure

### Step 5: Set Up Teams
- Add user to relevant Teams via group membership
- Optionally create a 1:1 welcome chat with their manager
- POST `/chats` with manager + new employee as members

### Step 6: Prepare OneDrive
- Trigger OneDrive provisioning: GET `/users/{id}/drive` (creates drive on first access)
- Optionally copy a folder template (starter docs, handbooks, onboarding materials)
- If template specified: copy files from a shared library to their OneDrive

### Step 7: Send Welcome Email
- Ask: "Should I send a welcome email to their personal email or manager?"
- POST `/users/{senderId}/sendMail` with:
  - Welcome message including login URL, temporary password delivery instructions, and key contacts
  - Never include the actual password in the email — instruct manager to share it securely

### Step 8: Completion Report

```markdown
# New Employee Onboarding Report

| Step | Status | Details |
|---|---|---|
| Account created | OK | jane.smith@contoso.com |
| License assigned | OK | Microsoft 365 E3 |
| Groups added | OK | Marketing, All Employees (2/2) |
| Teams provisioned | OK | Marketing Team |
| OneDrive ready | OK | Starter template copied |
| Welcome email | OK | Sent to manager |

Onboarded by: [admin UPN]
Date: [timestamp]
```

## Lighthouse Multi-Tenant Mode

When `--tenant` is specified or the user says "set up across customer tenants":

1. List managed tenants via Lighthouse API
2. Ask which tenants to run the onboarding in
3. Require explicit approval before proceeding with each tenant
4. Execute the wizard per tenant with GDAP delegated permissions
5. Produce a cross-tenant summary report

## Arguments

- `<displayName>`: Full name of the new employee
- `<userPrincipalName>`: Email/UPN for the account
- `--license <skuId>`: License SKU ID or friendly name
- `--groups <groupIds>`: Comma-separated group IDs or names
- `--template <name>`: OneDrive folder template name
- `--tenant <tenantId>`: Target tenant for Lighthouse multi-tenant mode
- `--dry-run`: Preview all steps without making changes

## Important Notes

- `usageLocation` must be set before license assignment — the wizard handles this automatically
- Temporary passwords use cryptographically secure generation (min 16 chars, mixed case, digits, special)
- Never include passwords in emails or logs — instruct secure delivery via manager
- Group membership for dynamic groups cannot be directly assigned — these are logged as skipped
- OneDrive provisioning can take a few minutes — the wizard retries up to 3 times
- Reference: `skills/m365-admin/references/onboarding-concierge.md` for Graph API patterns
- Reference: `skills/m365-admin/examples/user-management.md` for code examples
