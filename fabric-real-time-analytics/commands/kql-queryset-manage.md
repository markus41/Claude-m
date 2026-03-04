---
name: kql-queryset-manage
description: Manage Fabric KQL Queryset items with deterministic validation and safe rollout checks.
argument-hint: "[--workspace <id>] [--queryset <name>]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
---

# KQL Queryset Manage

Manage KQL Queryset assets in `fabric-real-time-analytics`.

## Preconditions

- Validate integration context using [`docs/integration-context.md`](../../docs/integration-context.md).
- Confirm Eventhouse and Queryset authoring permissions.
- Fail fast if workspace, database, or queryset identifiers are missing.

## Steps

1. Validate tenant, workspace, and KQL database context before any action.
2. Inventory querysets, saved queries, and execution policies.
3. Prepare deterministic queryset updates with explicit ownership and naming controls.
4. Apply create/update operations and capture operation tracking IDs.
5. Execute read-back verification for query validity and saved-state integrity.
6. Return a redacted status summary with remediation guidance.

## Endpoint Patterns

| Operation | Method | Endpoint |
|---|---|---|
| List KQL Querysets | GET | `/v1/workspaces/{workspaceId}/items?type=KQLQueryset` |
| Create/update queryset | POST | `/v1/workspaces/{workspaceId}/items` |
| Operation status | GET | `/v1/operations/{operationId}` |

## Output

- Deterministic summary of queryset changes, validation checks, and outstanding risks.
- Redacted identifiers only.
