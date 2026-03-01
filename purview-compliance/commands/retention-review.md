---
name: retention-review
description: Evaluate retention and records coverage across workloads — identify gaps, conflicts, and operational risks in retention labels and policies.
argument-hint: "[--workload <exchange|sharepoint|onedrive|teams>] [--framework <GDPR|HIPAA|SOX>] [--export]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
---

# Retention Policy Review

Evaluate retention and records coverage across workloads. Identify gaps, conflicts, expiration risks, and regulatory alignment issues.

## Review Steps

1. **List retention labels** — `Get-ComplianceTag | Select-Object Name, RetentionAction, RetentionDuration, IsRecordLabel`
2. **List retention policies** — `Get-RetentionCompliancePolicy | Select-Object Name, Enabled, SharePointLocation, ExchangeLocation`
3. **Check for conflicts** — Identify overlapping policies targeting the same locations with different retention periods
4. **Verify regulatory alignment** — Cross-reference retention periods against the stated regulatory framework
5. **Check adaptive vs. static scopes** — Verify scope targeting is intentional and complete
6. **Review preservation lock** — Flag any policies with preservation lock and document implications
7. **Identify gaps** — Workloads or content types not covered by any retention policy

## Output Format

```markdown
# Retention Review — [Date]

## Label Inventory
| Label | Retention Period | Action | Record | Locations |
|---|---|---|---|---|

## Policy Coverage
| Workload | Policies Applied | Gaps |
|---|---|---|

## Findings
### [Priority] Finding Title
- **Issue**: description
- **Regulatory risk**: which requirement is at risk
- **Recommendation**: specific fix

## Compliance Mapping
| Requirement | Retention Period Needed | Current Setting | Status |
|---|---|---|---|
```

## Important Notes

- Retention policies take precedence: retain always wins over delete when policies conflict
- Preservation lock is irreversible — document before applying
- Adaptive scopes update dynamically but may take up to 7 days to reflect changes
- Reference: `skills/purview-compliance/SKILL.md`
