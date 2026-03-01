---
name: license-scan
description: Scan for inactive and underused licenses — identify waste, map downgrade candidates, and estimate monthly savings.
argument-hint: "[--tenant <tenantId>] [--inactive-days <30|60|90>] [--export] [--dry-run]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
  - AskUserQuestion
---

# License Scan

Identify inactive licenses, underused SKUs, and downgrade opportunities.

## Scan Flow

### Step 1: Gather License Inventory
- Fetch all subscribed SKUs and their utilization
- Calculate: total purchased, assigned, unassigned, utilization %

### Step 2: Check User Activity
- For each licensed user, check `signInActivity.lastSignInDateTime`
- Classify: active (signed in within threshold), inactive (no sign-in), never signed in

### Step 3: Identify Savings

**Quick Wins:**
- Disabled accounts with licenses → remove license (instant savings)
- Never-signed-in accounts with licenses → confirm and remove
- Inactive users (30+ days no sign-in) → flag for review

**Downgrade Opportunities:**
- Users on E5 not using Defender/Phone System/advanced compliance → recommend E3
- Users on E3 not using desktop Office apps → recommend E1 or F3
- Users on Business Premium not using Intune → recommend Business Standard

### Step 4: Calculate Savings

```markdown
# License Scan Results — [Tenant Name]

## Summary
| Metric | Value |
|---|---|
| Total licenses purchased | 500 |
| Total licenses assigned | 420 |
| Unassigned licenses | 80 (16%) |
| Inactive users (30+ days) | 35 |
| Disabled with license | 12 |

## Savings Opportunities

### Immediate Savings
| Action | Users | Monthly Savings |
|---|---|---|
| Remove licenses from disabled accounts | 12 | $432 |
| Remove licenses from never-signed-in | 8 | $288 |
| **Subtotal** | **20** | **$720/mo** |

### Downgrade Opportunities
| From | To | Users | Monthly Savings |
|---|---|---|---|
| E5 | E3 | 15 | $315 |
| E3 | E1 | 10 | $280 |
| **Subtotal** | | **25** | **$595/mo** |

### Total Estimated Savings
- Monthly: $1,315
- Annual: $15,780
```

## Arguments

- `--tenant <tenantId>`: Target tenant for multi-tenant scan
- `--inactive-days <30|60|90>`: Inactivity threshold (default: 30)
- `--export`: Save results to file
- `--dry-run`: Show what would be scanned without fetching data

## Important Notes

- Sign-in activity data requires Azure AD Premium P1
- Usage reports have a 48-hour delay
- Always verify with the customer before removing licenses or downgrading
- Some "inactive" users may be service accounts, room mailboxes, or shared mailboxes
- Reference: `skills/license-optimizer/SKILL.md` for SKU mapping and pricing
