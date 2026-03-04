---
name: mirror-azure-sql-database
description: Onboard Azure SQL Database mirroring with CDC, connectivity, and schema-scope guardrails.
argument-hint: "[server] [database] [table-filter]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
  - AskUserQuestion
---

# Mirror Azure SQL Database

## Prerequisites and Permissions

- Validate integration context using [`docs/integration-context.md`](../../docs/integration-context.md).
- Fabric workspace role: `Contributor` or higher.
- SQL principal with required permissions for CDC setup and table read operations.
- Firewall/private endpoint path validated between Fabric and Azure SQL Database.

## Deterministic Steps

1. Validate context and source server/database inputs.
2. Run read-only checks for compatibility level, CDC readiness, and table eligibility.
3. Validate SQL permissions for selected tables and reject wildcard full-database scope if not approved.
4. Validate network reachability and authentication method.
5. Create mirrored source mapping for explicit table scope.
6. Start mirroring and capture per-table phase (`Snapshot` or `CDC`).
7. Return redacted status summary and the first latency checkpoint target.

## Fail-Fast Rules

- Stop when CDC prerequisites or required SQL permissions are missing.
- Stop when target scope includes unsupported tables or blocked schemas.
- Stop when connectivity or authentication validation fails.

## Redaction Requirements

- Redact server names when sensitive and redact all IDs.
- Never expose SQL passwords, tokens, or connection strings.

## Example Redacted Output

```json
{
  "source": "azure-sql-database",
  "database": "salesdb",
  "tablesMirrored": 31,
  "status": "Replicating"
}
```
