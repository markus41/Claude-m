---
name: mirror-azure-postgresql
description: Onboard Azure Database for PostgreSQL mirroring with logical replication readiness checks.
argument-hint: "[server] [database] [schema-filter]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
  - AskUserQuestion
---

# Mirror Azure PostgreSQL

## Prerequisites and Permissions

- Validate integration context using [`docs/integration-context.md`](../../docs/integration-context.md).
- Fabric workspace role: `Contributor` or higher.
- PostgreSQL principal with required replication and table read permissions.
- Server configuration supports logical replication for selected workloads.

## Deterministic Steps

1. Validate context and explicit source server/database inputs.
2. Run read-only PostgreSQL checks for logical replication prerequisites.
3. Validate role grants on target schemas/tables and reject wildcard over-scope.
4. Validate SSL/TLS connectivity path from Fabric to PostgreSQL.
5. Create mirrored source mapping for approved schemas and tables only.
6. Start mirroring and capture per-table snapshot status.
7. Return redacted output with replication slot assumptions and follow-up checks.

## Fail-Fast Rules

- Stop when logical replication prerequisites are not met.
- Stop when role grants cannot read all selected tables.
- Stop when network path validation fails.

## Redaction Requirements

- Redact server IDs, workspace IDs, tenant/subscription IDs, and principal identifiers.
- Never emit passwords, private keys, or full connection strings.

## Example Redacted Output

```json
{
  "source": "azure-postgresql",
  "server": "pg-prod...west",
  "tablesSelected": 23,
  "initialStatus": "Replicating"
}
```
