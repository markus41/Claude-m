---
name: mirror-external-setup
description: Prepare Fabric workspace, connector prerequisites, and integration context for external-source mirroring.
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

# Mirror External Setup

## Prerequisites and Permissions

- Validate integration context using [`docs/integration-context.md`](../../docs/integration-context.md).
- Fabric workspace role: `Contributor` or higher.
- Source credentials stored in approved secret-management path.
- Explicit list of in-scope connectors and data domains.

## Deterministic Steps

1. Validate required context and reject missing/invalid fields.
2. Confirm workspace ID, capacity, and tenant alignment.
3. Validate connector-level prerequisites for each requested source.
4. Validate credential ownership and secret rotation policy coverage.
5. Create or select mirrored database container for external sources.
6. Run read-only connectivity checks for each selected source.
7. Return a redacted readiness summary with pass/fail by source.

## Fail-Fast Rules

- Return `MissingIntegrationContext` for absent required fields.
- Return `InsufficientScopesOrRoles` for missing workspace or source grants.
- Return `SourcePrerequisiteFailed` when connector prerequisites are unmet.

## Redaction Requirements

- Redact workspace, tenant, source IDs, and principal IDs.
- Never output passwords, tokens, API keys, or connection strings.

## Example Redacted Output

```json
{
  "workspaceId": "3f9a4c...2b10",
  "sourcesValidated": 6,
  "status": "ReadyForMirroring"
}
```
