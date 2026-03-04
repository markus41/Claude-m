---
name: graph-geo-setup
description: Validate graph and geospatial workflow prerequisites in Fabric with preview guardrails.
argument-hint: "[--workspace <id>] [--cloud <AzureCloud>]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
  - AskUserQuestion
---

# Graph Geo Setup

Validate environment, context, and permissions required for graph/geospatial workflows.

## Preview Caveat

This command targets preview-heavy Fabric graph/geo surfaces. Validate endpoint behavior and permissions at runtime in the target tenant.

## Prerequisites And Permissions

- Integration context contract available: [`docs/integration-context.md`](../../docs/integration-context.md).
- Required context: `tenantId`, `environmentCloud`, `principalType`, `scopesOrRoles`.
- Workspace read access to inventory graph and map assets.
- Write permissions if setup includes object creation or mutation.

## Deterministic Steps

1. Validate required context fields and reject invalid values.
2. Resolve workspace and verify minimum read permissions.
3. Inventory graph, queryset, map, and exploration assets as baseline.
4. Check preview readiness prerequisites for target workflows.
5. Return readiness status and ordered remediation actions.

## Fail-Fast And Redaction

- Fail before network calls when context, IDs, or permissions are missing.
- Redact all tenant/workspace/item identifiers in output.
- Never print secrets, token fragments, or confidential payloads.

## Output

- Readiness summary: `ready` or `blocked`.
- Baseline inventory with redacted identifiers.
- Deterministic remediation list for blocking issues.
