---
name: pa-governance
description: Audit and remediate Power Platform governance issues — DLP policies, orphaned flows, inactive automations, license compliance, environment health, and CoE Toolkit reports.
argument-hint: "<scope> [--environment <env-id|all>] [--check <dlp|orphaned|inactive|license|all>] [--output <report|remediate>]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
  - AskUserQuestion
---

# Power Platform Governance Audit

## Purpose
Comprehensive governance audit and remediation for Power Platform environments:
DLP policy coverage, flow ownership, inactive automation cleanup, license compliance,
and environment hygiene using the Admin PowerShell module and CoE Toolkit patterns.

## Required Inputs
- Environment scope (single environment ID, or "all" for tenant-wide)
- Check types to run: `dlp`, `orphaned`, `inactive`, `license`, `all`
- Output preference: `report` (produce findings) or `remediate` (fix issues)
- Inactivity threshold (default: 90 days without runs)
- License check: list of premium connectors in use

## Steps

### 1. DLP Policy Audit
Using `references/governance-dlp.md`:
- List all DLP policies and their environment scopes
- Identify environments with no DLP policy (shadow IT risk)
- Check for flows suspended by DLP violations
- Identify connectors not in any policy group (default classification risk)
- Report: list of policy gaps with recommended connector group assignments

### 2. Orphaned Flow Detection
Flows whose creator has left the organization or whose connections are broken:
```powershell
# Check via CoE inventory or direct API
GET /api/data/v9.2/workflows?$filter=category eq 5 and statecode eq 1
```
- Cross-reference flow owners against active AAD users
- Identify flows running under personal connections (not service accounts)
- Report: orphaned flows with last run date and business impact assessment
- Remediate: transfer ownership to team mailbox/service account

### 3. Inactive Flow Cleanup
- Query flows with no successful runs in past N days (default 90)
- Classify by: never ran, ran then stopped, seasonal (OK), truly abandoned
- For abandoned flows: disable, notify former owner, schedule deletion after 30 days
- Estimate resource savings from cleanup (Power Platform Requests freed)

### 4. License Compliance Check
- Identify flows using premium connectors (HTTP, Dataverse non-seeded, SQL, ServiceNow, etc.)
- Cross-reference flow owners against licensed users (Power Automate Premium or Process)
- Report: unlicensed usage with estimated cost to remediate
- Options: reassign to licensed owner, replace premium connector, purchase licenses

### 5. Environment Health Report
- Count of active flows per environment
- Flow failure rate over past 30 days (goal: < 2%)
- Top 5 error codes across environment
- Connectors with throttle violations
- Flows consuming highest Power Platform Requests

### 6. Output

#### Report Format
```markdown
## Power Platform Governance Report — {date}
**Environment:** {name} | **Scope:** {tenant/single}

### DLP Summary
- Policies: {count} | Suspended flows: {count}
- Uncovered environments: {list}

### Flow Health
- Active flows: {count} | Inactive (>90d): {count}
- Orphaned: {count} | DLP-suspended: {count}
- 30-day failure rate: {percent}%

### License Compliance
- Premium connector usage without license: {count} flows
- Estimated monthly cost gap: ${amount}

### Recommended Actions (Priority Order)
1. {action} — affects {count} flows — effort: {low/medium/high}
2. ...
```

#### Remediation Output
Produce ready-to-run PowerShell scripts:
- Transfer orphaned flow ownership
- Disable inactive flows (with notification template)
- Update DLP policies to cover uncovered environments
- Archive (export + delete) confirmed-abandoned flows

## Quality Checks
- Report includes both findings AND recommended actions
- Remediation scripts are non-destructive (disable, not delete) for first pass
- Owner notification drafted before any changes made
- Change documented with rollback procedure
