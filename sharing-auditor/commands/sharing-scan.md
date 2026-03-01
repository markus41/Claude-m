---
name: sharing-scan
description: Scan SharePoint and OneDrive for overshared links, anonymous access, and stale guest users. Produces a risk-ranked sharing audit report.
argument-hint: "[--site <url>] [--all-sites] [--guest-days <90>] [--export]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
  - AskUserQuestion
---

# Sharing Scan

Scan for external sharing risks across SharePoint sites and OneDrive accounts.

## Scan Flow

### Step 1: Select Scope
Ask the user:
- "Which SharePoint sites should I scan?" or use `--all-sites`
- "Should I also check OneDrive accounts?"
- "What guest inactivity threshold?" (default: 90 days)

### Step 2: Scan Sharing Links

For each site/drive:
- Enumerate all sharing links via Graph API
- Classify by type: anonymous, external guest, organization-wide
- Flag high-risk links (anonymous with edit access, no expiration)

### Step 3: Scan Guest Users
- List all guest users in the directory
- Check last sign-in date
- Identify stale guests (no sign-in for 90+ days)
- Identify unredeemed invitations

### Step 4: Check Site-Level Policies
- Report sharing capability per site
- Flag sites with more permissive sharing than the tenant default
- Identify sites allowing anonymous links

### Step 5: Generate Audit Report

```markdown
# Sharing Audit Report — [Date]

## Summary
| Metric | Count | Risk |
|---|---|---|
| Anonymous links | 12 | High |
| External guest links | 45 | Medium |
| Stale guest users (90+ days) | 8 | Medium |
| Unredeemed invitations | 3 | Low |
| Sites with anonymous sharing enabled | 4 | High |

## High-Risk Findings

### Anonymous Links with Edit Access
| Site | File/Folder | Link Created | Expiration | Owner |
|---|---|---|---|---|
| /sites/project-x | Budget.xlsx | 2025-06-15 | Never | jane@contoso.com |
| /sites/hr | Policies/ | 2025-03-01 | Never | bob@contoso.com |

### Stale Guest Users
| Guest | Email | Last Sign-In | Invited By | Sites Accessed |
|---|---|---|---|---|
| John Ext | john@partner.com | 2025-01-15 | jane@contoso.com | /sites/project-x |

### Overly Permissive Sites
| Site | Sharing Capability | Tenant Default | Delta |
|---|---|---|---|
| /sites/public | ExternalUserAndGuestSharing | ExternalUserSharingOnly | More permissive |
```

## Arguments

- `--site <url>`: Scan a specific SharePoint site
- `--all-sites`: Scan all site collections
- `--guest-days <90>`: Inactivity threshold for stale guests (default: 90)
- `--export`: Save report to file

## Important Notes

- Scanning all sites may take several minutes for large tenants
- Anonymous link enumeration requires `Sites.Read.All` permission
- Guest sign-in activity requires Azure AD Premium P1
- Reference: `skills/sharing-auditor/SKILL.md` for API patterns
