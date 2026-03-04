# fabric-mirroring-external

Microsoft Fabric mirroring for external sources - generic databases, BigQuery, Oracle, SAP, Snowflake, and SQL Server with preview caveats where applicable.

## Purpose

This is a knowledge plugin for deterministic Fabric mirroring workflows across non-Azure-native and hybrid sources. It provides setup guidance, source runbooks, and reviewer checks without shipping runtime MCP binaries.

## Install

```bash
/plugin install fabric-mirroring-external@claude-m-microsoft-marketplace
```

## Prerequisites

- Fabric workspace access with at least `Contributor` on the target workspace.
- Identity path for Fabric plus source-side credentials/secrets management.
- Approved source scope and ownership for mirrored schemas/tables.
- Defined fallback path for preview connectors and connector incidents.

## Preview Caveat (BigQuery and Oracle)

`BigQuery` and `Oracle` mirroring paths are treated as preview in this plugin. Availability, limits, and behavior can vary by tenant, region, and release ring. Validate current support before production rollout and keep a fallback ingestion pattern.

## Integration Context Contract
- Canonical contract: [`docs/integration-context.md`](../docs/integration-context.md)

| Command family | tenantId | subscriptionId | environmentCloud | principalType | scopesOrRoles |
|---|---|---|---|---|---|
| External mirroring setup | required | optional | `AzureCloud`* | delegated-user or service-principal | `Fabric Workspace Contributor` |
| Generic DB / SQL Server / Snowflake | required | optional | `AzureCloud`* | delegated-user or service-principal | Fabric workspace grants + source read/replication permissions |
| BigQuery / Oracle (preview caveat) | required | optional | `AzureCloud`* | delegated-user or service-principal | Fabric workspace grants + source-specific preview connector permissions |
| SAP mirroring | required | optional | `AzureCloud`* | delegated-user or service-principal | Fabric workspace grants + SAP source reader permissions |

* Use sovereign cloud values from the canonical contract when applicable.

Commands fail fast before network calls when required context, prerequisites, or grants are missing. Outputs and logs must redact IDs, secrets, and connection material.

## Commands

| Command | Description |
|---|---|
| `/mirror-external-setup` | Baseline workspace, credentials path, and connector readiness for external sources. |
| `/mirror-external-generic-database` | Onboard a generic external database with controlled object scope. |
| `/mirror-external-bigquery` | Onboard BigQuery mirroring with explicit preview caveat checks. |
| `/mirror-external-oracle` | Onboard Oracle mirroring with explicit preview caveat checks. |
| `/mirror-external-sap` | Onboard SAP source mirroring with object and extraction scope validation. |
| `/mirror-external-snowflake` | Onboard Snowflake mirroring with role and stream/read checks. |
| `/mirror-external-sql-server` | Onboard SQL Server mirroring with CDC and connectivity validation. |

## Agent

| Agent | Description |
|---|---|
| `fabric-mirroring-external-reviewer` | Reviews docs for connector caveats, permissions, deterministic steps, and safety controls. |

## Trigger Keywords

- `fabric mirroring external`
- `mirror generic database`
- `mirror bigquery`
- `mirror oracle`
- `mirror sap`
- `mirror snowflake`
- `mirror sql server`
