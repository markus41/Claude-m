---
name: pbi-dashboard-create
description: Create Power BI dashboards in Fabric with deterministic setup and verification checks.
argument-hint: "[--workspace <id>] [--name <dashboard-name>]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
---

# PBI Dashboard Create

Create dashboard assets in `powerbi-fabric`.

## Preconditions

- Validate integration context via [`docs/integration-context.md`](../../docs/integration-context.md).
- Confirm Power BI workspace and dashboard creation permissions.
- Fail fast when workspace ID, dataset bindings, or target audience are missing.

## Steps

1. Validate tenant/workspace context and required Power BI permissions.
2. Inventory existing dashboards and dependency tiles in the workspace.
3. Build deterministic dashboard definition with layout and data source bindings.
4. Create dashboard and required tiles through API operations.
5. Validate tile rendering and data refresh dependencies post-creation.
6. Return a redacted deployment summary with next actions.

## Endpoint Patterns

| Operation | Method | Endpoint |
|---|---|---|
| List dashboards | GET | `/v1.0/myorg/groups/{groupId}/dashboards` |
| Create dashboard | POST | `/v1.0/myorg/groups/{groupId}/dashboards` |
| Add tile | POST | `/v1.0/myorg/groups/{groupId}/dashboards/{dashboardId}/tiles` |

## Output

- Deterministic create report including dashboard ID, tile status, and validation notes.
- Redacted identifiers and no secret values.
