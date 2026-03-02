# Fabric Data Warehouse Plugin

Microsoft Fabric Data Warehouse — provision Synapse warehouses, author T-SQL DDL/DML, design star and snowflake schemas with SCD patterns, load data via COPY INTO and cross-database queries, write stored procedures with error handling, configure row-level and column-level security, and monitor query performance with Query Insights.

## What This Plugin Provides

This is a **knowledge plugin** — it gives Claude deep expertise in Microsoft Fabric Data Warehouse so it can create warehouses, generate table DDL, write optimized queries, build loading procedures, configure security, and diagnose performance issues. It does not contain runtime code, MCP servers, or executable scripts.

## Setup

Run `/setup` to configure workspace connection and install SQL tooling:

```
/setup              # Full guided setup
/setup --minimal    # Connectivity verification only
```

Requires a Fabric workspace with Data Warehouse capability and Azure AD authentication.

## Commands

| Command | Description |
|---------|-------------|
| `/setup` | Configure workspace connection, install SQL tools, verify access |
| `/warehouse-create` | Create a new warehouse with schemas and utility tables |
| `/warehouse-table-create` | Generate CREATE TABLE DDL for dimension, fact, or staging tables |
| `/warehouse-query` | Generate optimized T-SQL queries, views, or CTEs |
| `/warehouse-load` | Generate COPY INTO, CTAS, MERGE, or incremental load procedures |
| `/warehouse-monitor` | Generate monitoring queries for performance and capacity |

## Agent

| Agent | Description |
|-------|-------------|
| **Warehouse Reviewer** | Reviews schema design, query efficiency, loading patterns, security configuration, and cross-database correctness |

## Trigger Keywords

The skill activates automatically when conversations mention: `fabric warehouse`, `synapse warehouse`, `fabric data warehouse`, `fabric t-sql`, `cross database query`, `fabric stored procedure`, `warehouse table`, `star schema fabric`, `fabric sql`, `dimensional model`, `warehouse load`, `fabric dw`.

## Author

Markus Ahling
