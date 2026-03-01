---
name: dlp-review
description: Review DLP policy coverage, false-positive hotspots, and missing controls. Prioritize recommendations by risk reduction impact.
argument-hint: "[--policy <name>] [--workload <exchange|sharepoint|onedrive|teams|endpoints>] [--export]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
---

# DLP Policy Review

Evaluate existing DLP policies for coverage gaps, false-positive hotspots, and missing controls.

## Review Steps

1. **List existing policies** — `Get-DlpCompliancePolicy | Select-Object Name, Mode, Workload, Enabled`
2. **Check workload coverage** — Confirm each sensitive data type is protected across all relevant workloads
3. **Review rules and conditions** — `Get-DlpComplianceRule -Policy "<name>"` — check thresholds, exceptions, and actions
4. **Identify false-positive risk** — Flag overly broad rules (e.g., low instance counts, no confidence level filters)
5. **Check notification settings** — Verify policy tips, admin alerts, and incident reports are configured
6. **Review override settings** — Confirm override justification requirements match organizational policy
7. **Check test vs. enforcement mode** — Flag policies stuck in test mode that should be enforced

## Output Format

```markdown
# DLP Review — [Date]

## Policy Summary
| Policy | Mode | Workloads | Rules | Issues |
|---|---|---|---|---|

## Findings
### [Priority] Finding Title
- **Policy**: name
- **Issue**: description
- **Risk**: what could go wrong
- **Recommendation**: specific fix

## Coverage Matrix
| Sensitive Info Type | Exchange | SharePoint | OneDrive | Teams | Endpoints |
|---|---|---|---|---|---|
```

## Important Notes

- DLP policy changes can take up to 1 hour to propagate
- Test mode policies generate alerts but do not block content
- Review the DLP activity explorer in Purview for real match data before changing thresholds
- Reference: `skills/purview-compliance/SKILL.md`
