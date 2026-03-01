---
name: sharing-remediate
description: Generate approval-based revocation tasks for overshared links and stale guest users — safe remediation without immediate hard deletes.
argument-hint: "[--findings <report-path>] [--auto-approve <anonymous-expired>] [--notify-owners]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
  - AskUserQuestion
---

# Sharing Remediation

Generate approval tasks for revoking overshared links and removing stale guest users. Designed for safe, owner-approved remediation — not immediate hard deletes.

## Remediation Flow

### Step 1: Load Findings
- Load the most recent sharing scan results
- Or run a fresh scan if no recent data exists

### Step 2: Generate Approval Tasks

For each finding, create an approval task:

```markdown
# Sharing Remediation Tasks

## Task 1: Revoke Anonymous Link — Budget.xlsx
- **Site**: /sites/project-x
- **File**: Budget.xlsx
- **Link type**: Anonymous with edit access
- **Created**: 2025-06-15
- **Expiration**: Never
- **Owner**: jane@contoso.com
- **Action**: Remove anonymous link, replace with organization-only link
- **Approved by**: [ ] Owner approval needed

## Task 2: Remove Stale Guest — john@partner.com
- **Guest**: John External (john@partner.com)
- **Last sign-in**: 2025-01-15 (180 days ago)
- **Invited by**: jane@contoso.com
- **Sites accessed**: /sites/project-x
- **Action**: Remove guest user from directory
- **Approved by**: [ ] Inviter approval needed
```

### Step 3: Notify Owners (Optional)
If `--notify-owners` is used:
- Group tasks by file/site owner
- Generate an email summary for each owner
- Include links to review the shared items
- Request approval or keep decisions

### Step 4: Execute Approved Tasks
After owner approval:
- Remove approved sharing links via Graph API
- Remove approved guest users
- Log all actions with timestamps
- Generate completion report

## Auto-Approve Rules

The `--auto-approve` flag allows automatic remediation for low-risk items:

| Auto-Approve Rule | Description |
|---|---|
| `anonymous-expired` | Remove anonymous links that have passed their expiration date |
| `unredeemed-30d` | Remove guest invitations unredeemed for 30+ days |

All other remediations require explicit approval.

## Arguments

- `--findings <report-path>`: Path to a sharing scan report
- `--auto-approve <rule>`: Auto-approve low-risk remediations
- `--notify-owners`: Send owner notification emails before remediation

## Important Notes

- Never hard-delete without owner approval (except auto-approve rules for expired items)
- Guest user removal is soft-delete — recoverable for 30 days
- Removing a sharing link is immediate and permanent — the link stops working instantly
- Notify file owners before removing links to active collaborations
- Reference: `skills/sharing-auditor/SKILL.md` for revocation API patterns
