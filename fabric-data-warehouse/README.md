# fabric-data-warehouse

Microsoft Fabric Data Warehouse — Synapse warehouse provisioning, T-SQL operations, and dimensional modeling.

## Purpose

`fabric-data-warehouse` provides operational runbooks for warehouse creation, loading, query tuning, and governance.

## Prerequisites

- Fabric workspace with Warehouse capability.
- SQL endpoint access and Azure AD authentication.
- Workspace role: Admin, Member, or Contributor with warehouse item rights.

## Setup

Run `/setup` to configure workspace connection and SQL tooling baselines.

## Commands

| Command | Description |
|---|---|
| `/setup` | Configure workspace connection, install SQL tools, verify access. |
| `/warehouse-create` | Create a new warehouse with schemas and utility tables. |
| `/warehouse-table-create` | Generate CREATE TABLE DDL for dimension, fact, or staging tables. |
| `/warehouse-query` | Generate optimized T-SQL queries, views, or CTEs. |
| `/warehouse-load` | Generate COPY INTO, CTAS, MERGE, or incremental load procedures. |
| `/warehouse-monitor` | Generate monitoring queries for performance and capacity. |
| `/sample-warehouse-bootstrap` | Bootstrap a sample warehouse item for rapid validation and onboarding. |

## Agent

| Agent | Description |
|---|---|
| **Warehouse Reviewer** | Reviews schema design, query efficiency, loading patterns, and security configuration. |
