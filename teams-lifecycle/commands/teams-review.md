---
name: teams-review
description: Audit teams for governance compliance — check ownership, activity, naming, sensitivity labels, and expiration status.
argument-hint: "[--inactive-days <90>] [--orphaned] [--no-label] [--export]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
---

# Teams Governance Review

Audit existing teams for compliance with governance policies.

## Audit Checks

### 1. Ownership
- Teams with zero owners (orphaned)
- Teams with only one owner
- Owners who are disabled or deleted

### 2. Activity
- Teams with no activity for 90+ days
- Teams with no messages for 30+ days
- Teams with no file activity for 60+ days

### 3. Naming Compliance
- Teams that don't follow the naming convention
- Teams with generic names ("Test", "New Team", etc.)

### 4. Sensitivity Labels
- Teams without any sensitivity label
- Teams with labels that don't match their content

### 5. Expiration
- Teams approaching expiration date
- Teams that have not been renewed by owners

## Audit Report

```markdown
# Teams Governance Review — [Date]

## Summary
| Metric | Count | Status |
|---|---|---|
| Total teams | 150 | |
| Orphaned (no owner) | 3 | Action needed |
| Single owner | 12 | Warning |
| Inactive (90+ days) | 8 | Review needed |
| No sensitivity label | 25 | Policy gap |
| Naming non-compliant | 7 | Cosmetic |

## Action Items
| Team | Issue | Recommended Action | Priority |
|---|---|---|---|
| Old Project X | Orphaned + inactive | Archive or delete | High |
| Test Team 1 | No owner, no label | Assign owner or archive | Medium |
```

## Arguments

- `--inactive-days <90>`: Inactivity threshold (default: 90)
- `--orphaned`: Show only orphaned teams
- `--no-label`: Show only teams without sensitivity labels
- `--export`: Save report to file
