# Azure SQL Database Plugin

Azure SQL Database and Cosmos DB — provisioning, schema management, query optimization, security hardening, and backup/restore for both relational and NoSQL Azure database services.

## What This Plugin Provides

This is a **knowledge plugin** — it gives Claude deep expertise in Azure SQL Database and Azure Cosmos DB so it can provision databases, write and optimize queries, manage schemas, configure security, and guide backup and disaster recovery. It does not contain runtime code, MCP servers, or executable scripts.

## Setup

Run `/setup` to install Azure CLI, sqlcmd, and configure database connectivity:

```
/setup              # Full guided setup
/setup --minimal    # Tools and authentication only
```

Requires an Azure subscription with permissions to create SQL and/or Cosmos DB resources.

## Commands

| Command | Description |
|---------|-------------|
| `/setup` | Install Azure CLI, sqlcmd, create SQL Server + database or Cosmos account |
| `/sql-create` | Create Azure SQL database with server, firewall rules, and elastic pool option |
| `/sql-query` | Run T-SQL queries, analyze execution plans, get index recommendations |
| `/cosmos-create` | Create Cosmos DB account, database, container with partition key strategy |
| `/cosmos-query` | Run Cosmos DB SQL queries, analyze RU consumption, optimize |
| `/db-security-audit` | Audit database security posture (firewall, TDE, masking, AAD) |

## Agent

| Agent | Description |
|-------|-------------|
| **Database Reviewer** | Reviews database configurations for security, performance, backup, connectivity, and cost optimization |

## Trigger Keywords

The skill activates automatically when conversations mention: `azure sql`, `sql database`, `cosmos db`, `cosmosdb`, `azure database`, `t-sql`, `elastic pool`, `sql server azure`, `nosql azure`, `cosmos container`, `sql firewall`, `database migration`.

## Author

Markus Ahling
