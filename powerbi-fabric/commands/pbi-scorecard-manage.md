---
name: pbi-scorecard-manage
description: Manage Power BI scorecards in Fabric with deterministic governance and verification checks.
argument-hint: "[--workspace <id>] [--scorecard <name>]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
---

# PBI Scorecard Manage

Manage scorecard assets in `powerbi-fabric`.

## Preconditions

- Validate integration context via [`docs/integration-context.md`](../../docs/integration-context.md).
- Confirm scorecard and goal-management permissions in Power BI/Fabric.
- Fail fast when workspace context, owner assignments, or metric sources are missing.

## Steps

1. Validate workspace context and scorecard management permissions.
2. Inventory existing scorecards, goals, and linked datasets.
3. Prepare deterministic updates for goal hierarchy, owners, and KPI thresholds.
4. Apply create/update operations and capture operation references.
5. Verify goal status computation and linked dataset freshness.
6. Return a redacted governance summary with unresolved risks.

## Endpoint Patterns

| Operation | Method | Endpoint |
|---|---|---|
| List scorecards | GET | `/v1.0/myorg/groups/{groupId}/scorecards` |
| Create/update scorecard | POST | `/v1.0/myorg/groups/{groupId}/scorecards` |
| Goal status read-back | GET | `/v1.0/myorg/groups/{groupId}/scorecards/{scorecardId}` |

## Output

- Deterministic scorecard status report with goal-health and ownership checks.
- Redacted identifiers only.
