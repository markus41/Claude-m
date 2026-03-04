# fabric-mirroring

Microsoft Fabric Mirroring — source onboarding, CDC replication, latency monitoring, schema drift handling, and reconciliation workflows.

## Purpose

`fabric-mirroring` remains the broad runbook layer for mirrored data operations and incident triage.

## Prerequisites

- Supported source systems configured for Fabric Mirroring.
- Network and identity access from Fabric to source databases.
- Ownership for source schema changes and downstream consumers.
- Defined freshness targets and reconciliation tolerances.

## Setup

Run `/mirroring-setup` first to baseline environment, permissions, and rollout constraints.

## Commands

| Command | Description |
|---|---|
| `/mirroring-setup` | Prepare Fabric Mirroring by validating source readiness, connectivity, identity, and target workspace controls. |
| `/source-onboarding` | Onboard a new source to Fabric Mirroring with controlled table scope and replication guardrails. |
| `/latency-health-check` | Assess mirroring latency and replication health against defined freshness targets. |
| `/cdc-reconciliation` | Reconcile mirrored datasets with source-of-truth systems for CDC completeness and integrity. |

## Routing Boundaries

- Use `fabric-mirroring-azure` for Azure-native mirrored sources: Azure Cosmos DB, Azure PostgreSQL, Azure Databricks catalog, Azure SQL Database, and Azure SQL Managed Instance.
- Use `fabric-mirroring-external` for non-Azure mirrored sources: generic mirrored database, BigQuery (preview), Oracle (preview), SAP, Snowflake, and SQL Server.
- Keep `fabric-mirroring` focused on cross-source reliability, latency, drift, and reconciliation runbooks.

## Agent

| Agent | Description |
|---|---|
| **Mirroring Reviewer** | Reviews onboarding safety, CDC integrity, latency controls, and reconciliation rigor. |
