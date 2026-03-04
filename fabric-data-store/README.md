# fabric-data-store

Microsoft Fabric data store operations - Cosmos DB database, SQL database, Snowflake database links, datamarts, and Event Schema Set governance.

## Category

`analytics`

## Commands

| Command | Purpose |
|---|---|
| `/store-setup` | Validate workspace/store context and baseline permissions |
| `/fabric-cosmos-db-database-manage` | Create, inspect, update, or retire Fabric Cosmos DB database assets |
| `/datamart-manage` | Create, govern, refresh, or retire datamarts |
| `/event-schema-set-manage` | Create and govern Event Schema Sets for event-driven store contracts |
| `/fabric-snowflake-database-link` | Create or govern Snowflake database links into Fabric |
| `/fabric-sql-database-manage` | Create, inspect, update, or retire Fabric SQL database assets |

## Agent

| Agent | Purpose |
|---|---|
| `fabric-data-store-reviewer` | Reviews store definitions for schema governance, deterministic operations, and secure output handling |

## Integration Context Contract

- Canonical contract: `docs/integration-context.md`

| Command family | tenantId | subscriptionId | environmentCloud | principalType | scopesOrRoles |
|---|---|---|---|---|---|
| Setup + read discovery | required | optional | required | delegated-user or service-principal | `Fabric.Read.All` or workspace read role |
| Cosmos/SQL/Snowflake link updates | required | optional | required | delegated-user or service-principal | `Fabric.ReadWrite.All` + workspace Contributor/Admin |
| Datamart/Event Schema Set governance | required | optional | required | delegated-user or service-principal | `Fabric.ReadWrite.All` + workspace Contributor/Admin + semantic artifact write |

Fail-fast statement: commands validate integration context, cloud boundary, and minimum permissions before any write or execution request.

Redaction statement: outputs redact tenant/workspace/item IDs and never print secret-bearing values (tokens, keys, credentials).

## Preview Caveat

`datamart-manage` and `event-schema-set-manage` can rely on preview capabilities in some tenants/regions. Validate availability before expecting stable API shape or GA behavior.
