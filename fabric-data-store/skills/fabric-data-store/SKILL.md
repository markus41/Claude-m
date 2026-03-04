---
name: fabric-data-store
description: Microsoft Fabric data store operations - Cosmos DB database, SQL database, Snowflake database links, datamarts, and Event Schema Set governance.
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
triggers:
  - fabric data store
  - fabric cosmos database
  - fabric sql database
  - datamart governance
  - event schema set
  - snowflake database link
---

# fabric-data-store

Use this skill to operate and govern Microsoft Fabric data store assets with deterministic, policy-driven workflows.

## Integration Context Contract

- Canonical contract: `docs/integration-context.md`

| Command family | tenantId | subscriptionId | environmentCloud | principalType | scopesOrRoles |
|---|---|---|---|---|---|
| Setup/discovery | required | optional | required | delegated-user or service-principal | `Fabric.Read.All` (or workspace read role) |
| Cosmos/SQL/Snowflake write operations | required | optional | required | delegated-user or service-principal | `Fabric.ReadWrite.All` + workspace Contributor/Admin |
| Datamart/Event Schema Set governance | required | optional | required | delegated-user or service-principal | `Fabric.ReadWrite.All` + workspace Contributor/Admin + semantic artifact write |

Fail-fast statement: reject missing/invalid context and insufficient grants before sending API calls.

Redaction statement: redact IDs and suppress secrets/tokens in all command and review outputs.

## Preview Caveat

Datamart and Event Schema Set operations may run on preview capabilities. Validate tenant feature status before write operations and avoid assuming backward-compatible payloads.

## Execution Pattern

1. Validate integration context and target workspace.
2. Resolve immutable target item identity.
3. Read current schema/governance state.
4. Apply minimal deterministic change.
5. Re-read and report redacted diff with verification guidance.

## Command Map

- `/store-setup`
- `/fabric-cosmos-db-database-manage`
- `/datamart-manage`
- `/event-schema-set-manage`
- `/fabric-snowflake-database-link`
- `/fabric-sql-database-manage`

## References

- API patterns: `skills/fabric-data-store/references/api-patterns.md`
