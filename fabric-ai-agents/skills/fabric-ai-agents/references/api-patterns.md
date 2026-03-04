# API Patterns - Fabric AI Agents

## Preview Caveat

All patterns below target preview-heavy Fabric AI agent capabilities. Validate current API versions and schema expectations before execution.

## Core Pattern

1. Validate integration context and permissions.
2. Gather read-only baseline (existing items, versions, bindings).
3. Apply targeted create/update/delete operation.
4. Re-read state and compare with baseline.
5. Return a redacted result summary.

## Endpoint Families (Pattern-Level)

| Family | Typical Scope Pattern | Notes |
|---|---|---|
| Workspace item inventory | `/v1/workspaces/{workspaceId}/items` | Use for baseline discovery and type filtering. |
| Agent configuration workflows | `/v1/workspaces/{workspaceId}/items/{itemId}` | Use optimistic update patterns and immediate re-read. |
| Operational health workflows | `/v1/workspaces/{workspaceId}/items/{itemId}/runs` | Use for status and drift checks. |

## Permission Pattern

- Read-only discovery: workspace read permissions.
- Mutation operations: workspace contributor-level write permissions.
- Azure-linked dependencies (if used): subscription-scoped read/write roles as required by the linked resource.

## Fail-Fast Pattern

Stop before API calls when any required value is missing or invalid:
- `tenantId`
- `environmentCloud`
- `principalType`
- `scopesOrRoles`
- `workspaceId` and command-specific identifiers

## Redaction Pattern

- Redact IDs as `prefix...suffix` in operator-visible output.
- Do not print secrets, token fragments, or credential material.
- Keep a secure internal handle for replay instead of full identifier echoing.
