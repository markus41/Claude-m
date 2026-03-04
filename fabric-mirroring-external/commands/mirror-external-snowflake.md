---
name: mirror-external-snowflake
description: Onboard Snowflake mirroring with role-grant, scope, and replication checks.
argument-hint: "[account] [database] [schema-allowlist]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
  - AskUserQuestion
---

# Mirror External Snowflake

## Prerequisites and Permissions

- Validate integration context using [`docs/integration-context.md`](../../docs/integration-context.md).
- Fabric workspace role: `Contributor` or higher.
- Snowflake role with required database/schema/table access.
- Approved database/schema scope.

## Deterministic Steps

1. Validate context and explicit Snowflake account/database inputs.
2. Run read-only schema/table discovery for target scope.
3. Validate Snowflake role grants and visibility for selected objects.
4. Reject non-allowlisted schemas/tables.
5. Create mirroring mapping for approved objects only.
6. Start mirroring and collect initial table status.
7. Return a redacted summary including mirrored object count and lag baseline.

## Fail-Fast Rules

- Stop when required role grants are missing.
- Stop when selected object scope is outside allowlist.
- Stop when source connectivity or authentication checks fail.

## Redaction Requirements

- Redact source/account handles and all tenant/workspace IDs.
- Never output passwords, private keys, tokens, or connection strings.

## Example Redacted Output

```json
{
  "source": "snowflake",
  "accountHandle": "acme-eu...4b8c",
  "objectsMirrored": 27,
  "status": "Replicating"
}
```
