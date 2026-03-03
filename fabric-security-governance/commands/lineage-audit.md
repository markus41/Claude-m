---
name: lineage-audit
description: Audit lineage visibility and control coverage across Fabric artifacts for compliance readiness.
argument-hint: "[--domain <name>] [--include-upstream] [--include-downstream]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
---

# Lineage Audit

Trace data flows and control points to prepare for security and compliance audits.

## Prerequisites

- Fabric admin or security governance permissions for target workspaces.
- Documented data classification policy and sensitivity label taxonomy.
- Identity groups mapped to business roles for access control.
- Audit and compliance stakeholders for policy review and sign-off.

## Steps

1. Map critical assets across ingestion, modeling, and reporting layers.
2. Verify lineage continuity and identify ownership blind spots.
3. Check control coverage for sensitive data paths.
4. Produce an audit-ready evidence pack with remediation tracking.

## Output

- Lineage and control coverage report for scoped domain.
- Audit evidence package with unresolved governance gaps.
