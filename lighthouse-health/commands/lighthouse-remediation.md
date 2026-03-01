---
name: lighthouse-remediation
description: Generate a prioritized remediation plan from Lighthouse health scan findings — one-click "create remediation plan" with effort estimates and step-by-step instructions.
argument-hint: "[--tenant <tenantId>] [--category <security|accounts|licensing>] [--severity <red|yellow>]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
  - AskUserQuestion
---

# Create Remediation Plan

Generate actionable remediation steps from health scan findings. Prioritized by risk, with effort estimates and plain-language instructions.

## Remediation Flow

### Step 1: Review Findings
- Load the most recent health scan results
- Or ask: "Which tenant needs a remediation plan?"
- Display red and yellow findings

### Step 2: Generate Plan

For each finding, produce:

```markdown
# Remediation Plan — [Tenant Name]

## Priority 1 (Red — Address Immediately)

### Enable MFA for Admin Accounts
- **Risk**: Admin accounts without MFA are the #1 attack vector
- **Affected**: 2 admin accounts
- **Effort**: Quick Fix (15 minutes)
- **Steps**:
  1. Navigate to Entra ID > Security > Conditional Access
  2. Create policy "Require MFA for Admins" targeting all admin roles
  3. Start in report-only mode, verify, then enable
- **API**: `POST /identity/conditionalAccess/policies` (see template in plan)

### Block Legacy Authentication
- **Risk**: Legacy auth bypasses MFA and is used in 90%+ of credential attacks
- **Effort**: Quick Fix (10 minutes)
- **Steps**:
  1. Create CA policy blocking legacy auth client types
  2. Monitor in report-only mode for 7 days
  3. Enable enforcement

## Priority 2 (Yellow — Address This Week)

### Clean Up Stale Accounts
- **Risk**: Stale accounts can be compromised without detection
- **Affected**: 3 accounts with no sign-in for 90+ days
- **Effort**: Moderate (30 minutes)
- **Steps**:
  1. Review list of stale accounts
  2. Confirm with tenant admin which should be disabled
  3. Disable accounts and revoke sessions

[Continue for each finding]
```

### Step 3: Approval & Tracking

- Ask: "Should I create a tracking checklist for this plan?"
- Generate a markdown checklist with due dates
- Reference customer meeting presentation format for review meetings

## Arguments

- `--tenant <tenantId>`: Target tenant (or ask interactively)
- `--category <name>`: Focus on security, accounts, or licensing only
- `--severity <level>`: Show only red or yellow findings

## Important Notes

- Remediation actions require appropriate GDAP roles for the target tenant
- Always start CA policies in report-only mode
- Account cleanup should be confirmed with the customer before execution
- Reference: `skills/lighthouse-health/SKILL.md` for scoring criteria and API patterns
