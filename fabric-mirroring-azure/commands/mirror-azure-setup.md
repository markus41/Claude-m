---
name: mirror-azure-setup
description: Prepare Fabric workspace, permissions, and integration context for Azure-source mirroring.
argument-hint: "[workspace-id] [options]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
  - AskUserQuestion
---

# Mirror Azure Setup

## Prerequisites and Permissions

- Validate integration context using [`docs/integration-context.md`](../../docs/integration-context.md).
- Fabric workspace role: `Contributor` or higher.
- Azure permissions: `Reader` at subscription scope plus source-specific read/metadata access.
- Approved target capacity and region for mirrored databases.

## Deterministic Steps

1. Validate required `integrationContext` fields and stop on missing or malformed values.
2. Confirm workspace ID, capacity assignment, and region compatibility.
3. Enumerate intended Azure sources and validate minimum permissions per source.
4. Validate network path (private endpoint/firewall) from Fabric to each source.
5. Create or select mirrored database container and record redacted IDs.
6. Run a read-only connectivity test for each source before enabling mirroring.
7. Return a redacted readiness report with explicit pass/fail per source.

## Fail-Fast Rules

- Return `MissingIntegrationContext` when required context fields are absent.
- Return `InsufficientScopesOrRoles` when source or workspace grants are incomplete.
- Return `ContextCloudMismatch` when endpoint family conflicts with `environmentCloud`.

## Redaction Requirements

- Redact tenant, subscription, workspace, and source IDs (`first6...last4`).
- Never emit tokens, connection strings, passwords, keys, or certificate material.

## Example Redacted Output

```json
{
  "workspaceId": "3f9a4c...2b10",
  "subscriptionId": "111111...5555",
  "sourcesValidated": 5,
  "status": "ReadyForMirroring"
}
```
