---
name: entra-ca-wizard
description: Plain-language Conditional Access policy builder — describe what you want in everyday words, simulate impact, and generate a rollback plan before applying.
argument-hint: "<description> [--simulate] [--dry-run] [--rollback]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
  - AskUserQuestion
---

# Conditional Access Policy Assistant

Build Conditional Access policies using plain language. Describe what you want, see the impact, and get a rollback plan — all before anything is applied.

## How It Works

### Step 1: Describe What You Want

Ask the user to describe the policy in plain language. Common examples:

| You say... | Policy created |
|---|---|
| "Require MFA for all admins" | Target: directory roles (Global Admin, User Admin, etc.), Grant: require MFA |
| "Block legacy authentication" | Condition: client apps = legacy auth, Grant: block |
| "Require MFA from outside the office" | Condition: exclude trusted locations, Grant: require MFA |
| "Require compliant devices for finance team" | Target: Finance group, Grant: require compliant device |
| "Block sign-in from risky countries" | Condition: named location = blocked countries, Grant: block |
| "Require MFA for guest users" | Target: guest/external users, Grant: require MFA |

### Step 2: Translate to Policy Configuration

Map the plain-language description to a Conditional Access policy JSON:

```json
{
  "displayName": "Require MFA for Admins",
  "state": "enabledForReportingButNotEnforced",
  "conditions": {
    "users": {
      "includeRoles": ["62e90394-69f5-4237-9190-012177145e10"]
    },
    "applications": {
      "includeApplications": ["All"]
    }
  },
  "grantControls": {
    "operator": "OR",
    "builtInControls": ["mfa"]
  }
}
```

Show the user a plain-language summary:
- **Who**: All users with admin roles (Global Admin, User Admin, ...)
- **What apps**: All cloud apps
- **When**: Always
- **Then**: Require multi-factor authentication
- **Mode**: Report-only (safe to test)

### Step 3: Simulate Impact (What-If)

Use the Conditional Access What-If API to preview which users would be affected:

```
POST https://graph.microsoft.com/beta/identity/conditionalAccess/evaluate
{
  "appliedPoliciesOnly": false,
  "conditionalAccessWhatIfSubject": {
    "userId": "{testUserId}"
  },
  "conditionalAccessContext": {
    "includeApplications": ["All"]
  }
}
```

Report results:
- How many users would be impacted
- Which users would be blocked vs. prompted for MFA
- Any users who might be locked out (e.g., admins without MFA registered)

### Step 4: Generate Rollback Plan

Before applying, produce a rollback document:

```markdown
# Rollback Plan — [Policy Name]

## Quick Rollback
1. Set policy to "Report-only": PATCH `/identity/conditionalAccess/policies/{id}` with `"state": "enabledForReportingButNotEnforced"`
2. Or disable completely: `"state": "disabled"`

## Full Removal
DELETE `/identity/conditionalAccess/policies/{id}`

## Emergency Access
- Ensure break-glass accounts are excluded from all CA policies
- Break-glass account: [admin should document this]

## Rollback Trigger Criteria
- [ ] Users reporting unexpected lockouts
- [ ] Help desk ticket volume spike
- [ ] Business-critical app inaccessible
```

### Step 5: Apply Policy

Only after user approval:
1. Create policy in **report-only** mode first
2. Monitor for 1-7 days
3. When ready, switch to **enabled** mode

## Pre-Built Policy Templates

| Template | Description |
|---|---|
| `mfa-admins` | Require MFA for all admin roles |
| `block-legacy-auth` | Block legacy authentication protocols |
| `mfa-all-users` | Require MFA for all users on all apps |
| `compliant-device` | Require Intune-compliant device for access |
| `block-countries` | Block sign-in from selected countries |
| `mfa-guests` | Require MFA for guest/external users |
| `mfa-risky-signin` | Require MFA when sign-in risk is medium or above |
| `block-high-risk-users` | Block users flagged as high risk |

## Arguments

- `<description>`: Plain-language description of the desired policy
- `--simulate`: Run What-If analysis without creating the policy
- `--dry-run`: Show the policy JSON without creating it
- `--rollback`: Generate a rollback plan for an existing policy

## Important Notes

- Always create policies in **report-only** mode first — never go straight to enforcement
- Ensure at least 2 break-glass accounts are excluded from ALL CA policies
- The What-If API is in beta — results are approximate
- Named locations must exist before referencing them in policies
- CA policies can take up to 30 minutes to propagate
- Reference: `skills/entra-security/references/ca-plain-language.md` for template mappings
- Reference: existing `entra-ca-policy-create` command for technical policy creation
