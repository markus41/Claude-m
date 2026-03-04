---
name: dataflow-gen2-manage
description: Manage Dataflow Gen2 lifecycle with deterministic checks and redacted outputs.
argument-hint: "[--workspace <id>] [--dataflow <name>]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
---

# Dataflow Gen2 Manage

Manage Dataflow Gen2 assets in `fabric-data-factory`.

## Preconditions

- Validate context against [`docs/integration-context.md`](../../docs/integration-context.md).
- Confirm workspace permissions for Dataflow Gen2 creation and refresh operations.
- Fail fast when required identifiers or auth context are missing.

## Steps

1. Validate workspace and principal context, then verify permissions.
2. Collect baseline metadata for existing Dataflow Gen2 items and refresh status.
3. Prepare deterministic transformation and destination settings.
4. Execute create/update/refresh actions with explicit operation tracking.
5. Verify post-action state and refresh health indicators.
6. Return a redacted report with findings and remediation items.

## Endpoint Patterns

| Operation | Method | Endpoint |
|---|---|---|
| List Dataflow Gen2 | GET | `/v1/workspaces/{workspaceId}/items?type=Dataflow` |
| Create/update dataflow | POST | `/v1/workspaces/{workspaceId}/items` |
| Trigger refresh status | GET | `/v1/workspaces/{workspaceId}/items/{itemId}/jobs/instances` |

## Output

- Deterministic summary of dataflow changes and refresh validation.
- Redacted identifiers and no secret material.
