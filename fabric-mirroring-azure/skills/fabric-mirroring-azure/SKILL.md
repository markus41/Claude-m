---
name: Fabric Mirroring Azure
description: >
  Microsoft Fabric mirroring workflows for Azure-native sources with deterministic
  setup, source-specific onboarding checks, fail-fast validation, and redacted output.
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
triggers:
  - fabric mirroring azure
  - mirror cosmos db
  - mirror azure postgresql
  - mirror databricks catalog
  - mirror azure sql database
  - mirror sql managed instance
---

# Fabric Mirroring Azure

## Integration Context Contract
- Canonical contract: [`docs/integration-context.md`](../../../docs/integration-context.md)

| Workflow | tenantId | subscriptionId | environmentCloud | principalType | scopesOrRoles |
|---|---|---|---|---|---|
| Azure mirroring setup | required | required | `AzureCloud`* | delegated-user, service-principal, or managed-identity | `Fabric Workspace Contributor`, `Reader` |
| Cosmos DB source workflow | required | required | `AzureCloud`* | delegated-user or service-principal | `Cosmos DB Account Reader Role`, Fabric workspace permissions |
| PostgreSQL source workflow | required | required | `AzureCloud`* | delegated-user or service-principal | PostgreSQL replication privileges, Fabric workspace permissions |
| Databricks catalog workflow | required | required | `AzureCloud`* | delegated-user or service-principal | Databricks Unity Catalog read grants |
| Azure SQL / SQL MI workflow | required | required | `AzureCloud`* | delegated-user, service-principal, or managed-identity | SQL permissions for CDC setup and read access |

* Use sovereign cloud values from the canonical contract when applicable.

Fail fast before API calls when required fields, cloud alignment, or grants are missing. Redact tenant, subscription, object IDs, and all secrets in every output.

## Command Surface

| Command | Purpose |
|---|---|
| `mirror-azure-setup` | Baseline workspace, context, and source prerequisites. |
| `mirror-azure-cosmosdb` | Configure and validate mirroring for Cosmos DB. |
| `mirror-azure-postgresql` | Configure and validate mirroring for Azure PostgreSQL. |
| `mirror-azure-databricks-catalog` | Configure and validate mirroring for Databricks catalogs. |
| `mirror-azure-sql-database` | Configure and validate mirroring for Azure SQL Database. |
| `mirror-azure-sql-managed-instance` | Configure and validate mirroring for SQL Managed Instance. |

## Guardrails

1. Validate integration context before any network/API call.
2. Run read-only readiness checks before mutating actions.
3. Gate mirroring start behind explicit prerequisite confirmation.
4. Verify post-action table status and latency with redacted output.
5. Stop early on schema mismatch, permission errors, or unsupported object types.

## Progressive Disclosure - Reference Files

| Topic | File |
|---|---|
| API and onboarding patterns | [`references/api-patterns.md`](./references/api-patterns.md) |
