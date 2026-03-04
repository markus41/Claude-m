---
name: org-app-adoption-report
description: Produce deterministic Fabric org app adoption reporting with rollout evidence, permission coverage, and risk-focused insights.
argument-hint: "[--app <name>] [--window <7d|30d|90d>] [--audience <group|all>]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
  - AskUserQuestion
---

# org-app-adoption-report

## Preview Caveat

Org app adoption telemetry for Fabric distribution is preview. Validate metric definitions and data availability for the active tenant before interpretation.

## Prerequisites and Permissions

- Integration context is valid per [`docs/integration-context.md`](../../docs/integration-context.md).
- Caller has read permissions for org app release telemetry and audience assignments.
- Reporting window and audience scope are explicit.

## Deterministic Steps

1. Validate context, permissions, reporting window, and audience scope.
2. Collect read-only adoption signals: assigned audience count, active usage indicators, and release stage coverage.
3. Correlate adoption with permission model state to flag access gaps.
4. Compare observed adoption against expected rollout targets.
5. Generate a risk-ranked action list for release, permission, and enablement improvements.
6. Return a redacted adoption report with trend summary and follow-up actions.

## Fail-Fast and Redaction

- Stop when required telemetry context or permissions are missing.
- Mark report as partial when telemetry sources are incomplete.
- Redact tenant, group, app, and principal identifiers in all outputs.
