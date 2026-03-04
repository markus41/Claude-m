---
name: sample-warehouse-bootstrap
description: Bootstrap a Fabric Sample Warehouse with deterministic setup and validation steps.
argument-hint: "[--workspace <id>] [--name <warehouse-name>]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
---

# Sample Warehouse Bootstrap

Bootstrap a sample warehouse item in `fabric-data-warehouse`.

## Preconditions

- Validate context with [`docs/integration-context.md`](../../docs/integration-context.md).
- Confirm warehouse item creation permissions in the workspace.
- Fail fast when workspace or capacity context is missing.

## Steps

1. Validate workspace and capacity context, then verify role requirements.
2. Inventory existing warehouse items and naming collisions.
3. Create a sample warehouse item with deterministic metadata and tags.
4. Apply baseline schema and sample-data validation checks.
5. Verify query connectivity and workspace item health after creation.
6. Produce a redacted bootstrap summary with next-step recommendations.

## Endpoint Patterns

| Operation | Method | Endpoint |
|---|---|---|
| List warehouses | GET | `/v1/workspaces/{workspaceId}/items?type=Warehouse` |
| Create sample warehouse | POST | `/v1/workspaces/{workspaceId}/items` |
| Verify operation | GET | `/v1/operations/{operationId}` |

## Output

- Deterministic bootstrap report with status, validation evidence, and unresolved risks.
- Redacted identifiers and no secret data.
