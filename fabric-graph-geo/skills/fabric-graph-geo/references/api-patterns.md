# API Patterns - Fabric Graph And Geo

## Preview Caveat

These patterns target preview-heavy graph and geospatial capabilities. Confirm currently supported contracts in the active Fabric tenant before execution.

## Core Pattern

1. Validate integration context and permissions.
2. Collect baseline model/query/map state.
3. Apply scoped mutation.
4. Re-read and verify expected state.
5. Return a redacted summary with drift notes.

## Endpoint Families (Pattern-Level)

| Family | Typical Scope Pattern | Notes |
|---|---|---|
| Workspace item discovery | `/v1/workspaces/{workspaceId}/items` | Baseline inventory and type filtering. |
| Graph model and queryset workflows | `/v1/workspaces/{workspaceId}/items/{itemId}` | Use targeted updates with immediate verification reads. |
| Exploration and map execution workflows | `/v1/workspaces/{workspaceId}/items/{itemId}/runs` | Use for query/map execution status and diagnostics. |

## Permission Pattern

- Read-only inventory and query execution: workspace read permissions.
- Model/query/map mutations: workspace contributor-level permissions.
- External or Azure-linked sources: add source-specific RBAC permissions.

## Fail-Fast Pattern

Abort before API calls when required fields are missing or invalid:
- `tenantId`
- `environmentCloud`
- `principalType`
- `scopesOrRoles`
- `workspaceId` and command-specific identifiers

## Redaction Pattern

- Redact IDs as `prefix...suffix` in user-visible output.
- Never output credentials, tokens, or secret payloads.
- Use secure handles for replay and cross-step references.
