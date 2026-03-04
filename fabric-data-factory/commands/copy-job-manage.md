---
name: copy-job-manage
description: Manage Fabric Copy job item lifecycle with deterministic validation and redacted outputs.
argument-hint: "[--workspace <id>] [--job <name>]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
---

# Copy Job Manage

Manage Fabric Copy job assets in `fabric-data-factory`.

## Preconditions

- Validate context against [`docs/integration-context.md`](../../docs/integration-context.md).
- Confirm workspace permissions for creating and updating Data Factory items.
- Fail fast when workspace ID, item ID, or identity context is missing.

## Steps

1. Resolve workspace and environment context, then confirm role and permission scope.
2. Inventory existing Copy job items and capture current configuration.
3. Build the desired job definition, including source, sink, schedule, and retry policy.
4. Apply create/update operations and capture operation IDs for traceability.
5. Re-query final state and compare against intended configuration.
6. Return a redacted summary with drift findings and next actions.

## Endpoint Patterns

| Operation | Method | Endpoint |
|---|---|---|
| List copy jobs | GET | `/v1/workspaces/{workspaceId}/items?type=CopyJob` |
| Create copy job | POST | `/v1/workspaces/{workspaceId}/items` |
| Verify status | GET | `/v1/operations/{operationId}` |

## Output

- Deterministic execution summary with validation, action results, and residual risks.
- Redacted IDs only; no tokens, secrets, or connection strings.
