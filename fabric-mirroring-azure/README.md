# fabric-mirroring-azure

Microsoft Fabric mirroring for Azure-native sources - Cosmos DB, PostgreSQL, Databricks catalog, Azure SQL Database, and SQL Managed Instance.

## Purpose

This is a knowledge plugin for deterministic Azure-source mirroring workflows in Fabric. It provides setup and source-specific runbooks plus reviewer checks; it does not ship runtime MCP binaries.

## Install

```bash
/plugin install fabric-mirroring-azure@claude-m-microsoft-marketplace
```

## Prerequisites

- Fabric workspace access with at least `Contributor` on the target workspace.
- Tenant-level identity available as `delegated-user`, `service-principal`, or `managed-identity`.
- Source-specific access for Cosmos DB, Azure Database for PostgreSQL, Databricks, Azure SQL Database, and SQL Managed Instance.
- Documented rollback path if initial snapshot or CDC enablement fails.

## Integration Context Contract
- Canonical contract: [`docs/integration-context.md`](../docs/integration-context.md)

| Command family | tenantId | subscriptionId | environmentCloud | principalType | scopesOrRoles |
|---|---|---|---|---|---|
| Azure mirroring setup | required | required | `AzureCloud`* | delegated-user, service-principal, or managed-identity | `Fabric Workspace Contributor`, `Reader` |
| Cosmos DB / PostgreSQL onboarding | required | required | `AzureCloud`* | delegated-user or service-principal | `Cosmos DB Account Reader Role`, PostgreSQL replication grants |
| Databricks catalog onboarding | required | required | `AzureCloud`* | delegated-user or service-principal | Databricks metastore read grants, workspace access |
| Azure SQL Database / SQL MI onboarding | required | required | `AzureCloud`* | delegated-user, service-principal, or managed-identity | SQL login or Entra principal with CDC-related permissions |

* Use sovereign cloud values from the canonical contract when applicable.

Commands fail fast before network calls when required context or grants are missing. Command and review output must redact sensitive identifiers and secrets.

## Commands

| Command | Description |
|---|---|
| `/mirror-azure-setup` | Baseline workspace, identity, and source readiness for Azure-native mirroring. |
| `/mirror-azure-cosmosdb` | Onboard Azure Cosmos DB mirroring with change feed readiness checks. |
| `/mirror-azure-postgresql` | Onboard Azure Database for PostgreSQL mirroring with logical replication validation. |
| `/mirror-azure-databricks-catalog` | Mirror Databricks Unity Catalog objects into Fabric with scope controls. |
| `/mirror-azure-sql-database` | Onboard Azure SQL Database mirroring with CDC and connectivity guardrails. |
| `/mirror-azure-sql-managed-instance` | Onboard SQL Managed Instance mirroring with CDC and network validation. |

## Agent

| Agent | Description |
|---|---|
| `fabric-mirroring-azure-reviewer` | Reviews docs for source safety gates, permissions, fail-fast handling, and redaction compliance. |

## Trigger Keywords

- `fabric mirroring azure`
- `mirror cosmos db`
- `mirror azure postgresql`
- `mirror databricks catalog`
- `mirror azure sql database`
- `mirror sql managed instance`
