---
name: lighthouse-health-scan
description: Run a health scan across selected managed tenants — produces a green/yellow/red scorecard for security, MFA, stale accounts, and licensing.
argument-hint: "[--tenants <tenantIds>] [--all] [--category <security|accounts|licensing>] [--export]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
  - AskUserQuestion
---

# Lighthouse Health Scan

Scan managed customer tenants and produce a health scorecard with green/yellow/red ratings.

## Scan Flow

### Step 1: Select Tenants
- Ask: "Which customer tenants should I scan?"
- Option: `--all` to scan all managed tenants
- Option: `--tenants` to specify specific tenant IDs
- Display list of managed tenants for selection

### Step 2: Run Health Checks

For each selected tenant, check:

**Security Posture**
- MFA registration coverage (`credentialUserRegistrationsSummaries`)
- Admin accounts with MFA enabled
- Conditional Access policy count and coverage
- Legacy authentication status
- Security defaults status

**Account Hygiene**
- Stale accounts (no sign-in for 90+ days)
- Inactive accounts (no sign-in for 30+ days)
- Guest accounts without recent access review
- Disabled accounts still consuming licenses

**Licensing Health**
- Total licenses vs. assigned licenses
- Unused license count and percentage
- License assignment errors
- Over-provisioned SKU identification

### Step 3: Generate Scorecard

```markdown
# Lighthouse Health Scorecard — [Date]

## Summary
| Tenant | Security | Accounts | Licensing | Overall |
|---|---|---|---|---|
| Contoso Ltd | 🟢 Green | 🟡 Yellow | 🟢 Green | 🟡 Yellow |
| Fabrikam Inc | 🔴 Red | 🟢 Green | 🟡 Yellow | 🔴 Red |
| Woodgrove | 🟢 Green | 🟢 Green | 🟢 Green | 🟢 Green |

## Contoso Ltd — Details
### Security: 🟢 Green
- MFA coverage: 97% ✓
- Admin MFA: 100% ✓
- CA policies: 4 active ✓
- Legacy auth: Blocked ✓

### Accounts: 🟡 Yellow
- Stale accounts (90+ days): 3 ⚠
- Inactive accounts: 8% ✓
- Guest accounts to review: 2 ⚠

### Licensing: 🟢 Green
- Unused licenses: 3% ✓
- Assignment errors: 0 ✓

[Repeat for each tenant]
```

## Arguments

- `--tenants <tenantIds>`: Comma-separated tenant IDs to scan
- `--all`: Scan all managed tenants
- `--category <name>`: Scan only security, accounts, or licensing
- `--export`: Save scorecard to file

## Important Notes

- Scanning requires GDAP roles: Security Reader, Global Reader, Reports Reader
- Health checks use beta API endpoints which may change
- Large tenant scans may take several minutes due to rate limiting
- Reference: `skills/lighthouse-health/SKILL.md` for scoring criteria
