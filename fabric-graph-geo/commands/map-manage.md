---
name: map-manage
description: Manage Fabric geospatial map workflows with deterministic validation and preview guardrails.
argument-hint: "<create|update|list|delete|validate|render-check> [options]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
  - AskUserQuestion
---

# Map Manage

Manage map definitions, geospatial layers, and render-validation workflows.

## Preview Caveat

Map and geospatial rendering features are preview-heavy and may change in layer behavior, projection support, and limits.

## Prerequisites And Permissions

- `/graph-geo-setup` executed successfully.
- Workspace read/write access for map artifacts.
- Access to geospatial data sources used by the map.
- Integration context compliance per [`docs/integration-context.md`](../../docs/integration-context.md).

## Deterministic Steps

1. Validate action mode and required map or layer identifiers.
2. Read current map definition and source-layer baseline.
3. Apply requested mutation or run render-check validation.
4. Re-read map definition and execute deterministic render checks.
5. Return redacted output with compatibility and drift findings.

## Fail-Fast And Redaction

- Stop on missing context, invalid identifiers, or insufficient permissions.
- Require explicit confirmation before delete or broad layer rewrite actions.
- Redact tenant/workspace/item IDs and never expose sensitive source credentials.

## Output

- Map lifecycle action status.
- Layer/render verification summary.
- Ordered remediation list for failed checks.
