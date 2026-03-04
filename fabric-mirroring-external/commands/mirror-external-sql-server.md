---
name: mirror-external-sql-server
description: Onboard SQL Server mirroring with CDC, permissions, and connectivity validation.
argument-hint: "[server] [database] [table-allowlist]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
  - AskUserQuestion
---

# Mirror External SQL Server

## Prerequisites and Permissions

- Validate integration context using [`docs/integration-context.md`](../../docs/integration-context.md).
- Fabric workspace role: `Contributor` or higher.
- SQL Server principal with required CDC and table read permissions.
- Network path validated between Fabric and SQL Server.

## Deterministic Steps

1. Validate context and explicit server/database/table inputs.
2. Run read-only checks for CDC prerequisites and table eligibility.
3. Validate SQL grants for every allowlisted table.
4. Validate connectivity, TLS requirements, and authentication method.
5. Create mirroring mapping limited to allowlisted tables.
6. Start mirroring and poll per-table status.
7. Return redacted output with initial lag baseline and next verification point.

## Fail-Fast Rules

- Stop when CDC prerequisites are not met.
- Stop when allowlist or permissions are incomplete.
- Stop when network or authentication validation fails.

## Redaction Requirements

- Redact server identifiers, tenant/workspace IDs, and principal IDs.
- Never output passwords, tokens, or full connection strings.

## Example Redacted Output

```json
{
  "source": "sql-server",
  "serverHandle": "sql-edge...8831",
  "tablesMirrored": 21,
  "status": "SnapshotInProgress"
}
```
