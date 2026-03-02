---
name: sql-create
description: "Create an Azure SQL database with server, firewall rules, and optional elastic pool"
argument-hint: "--name <db-name> --server <server-name> --rg <resource-group> [--elastic-pool <pool-name>] [--tier <serverless|basic|standard|premium>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - AskUserQuestion
---

# Create Azure SQL Database

Provision an Azure SQL logical server and database with firewall rules and optional elastic pool.

## Instructions

### 1. Validate Inputs

- `--name` — Database name. Ask if not provided.
- `--server` — SQL logical server name (globally unique). Ask if not provided.
- `--rg` — Resource group name. Ask if not provided; offer to create if it does not exist.
- `--elastic-pool` — Optional elastic pool name. When provided, the database is added to the pool.
- `--tier` — Service tier: `serverless` (default for dev), `basic`, `standard`, `premium`. Ask if not provided.

### 2. Create Resource Group (if needed)

```bash
az group show --name <rg> 2>/dev/null || az group create --name <rg> --location eastus
```

Ask the user for the preferred Azure region if not specified.

### 3. Create SQL Logical Server

```bash
az sql server create \
  --name <server-name> \
  --resource-group <rg> \
  --location <region> \
  --admin-user sqladmin \
  --admin-password '<password>'
```

Prompt the user for admin credentials. Enforce password complexity:
- Minimum 12 characters
- Must include uppercase, lowercase, number, and special character

Enable Azure AD admin:
```bash
az sql server ad-admin create \
  --resource-group <rg> \
  --server <server-name> \
  --display-name "<AAD-user-or-group>" \
  --object-id <aad-object-id>
```

### 4. Configure Firewall Rules

```bash
# Allow Azure services
az sql server firewall-rule create \
  --resource-group <rg> \
  --server <server-name> \
  --name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0

# Allow current client IP
MY_IP=$(curl -s https://api.ipify.org)
az sql server firewall-rule create \
  --resource-group <rg> \
  --server <server-name> \
  --name AllowMyIP \
  --start-ip-address $MY_IP \
  --end-ip-address $MY_IP
```

Ask the user if they want to add additional IP ranges or use virtual network rules instead.

### 5. Create Elastic Pool (if --elastic-pool)

```bash
az sql elastic-pool create \
  --resource-group <rg> \
  --server <server-name> \
  --name <pool-name> \
  --edition GeneralPurpose \
  --family Gen5 \
  --capacity 2 \
  --db-max-capacity 2 \
  --db-min-capacity 0.5
```

### 6. Create the Database

**Serverless (default for dev/test)**:
```bash
az sql db create \
  --resource-group <rg> \
  --server <server-name> \
  --name <db-name> \
  --edition GeneralPurpose \
  --compute-model Serverless \
  --family Gen5 \
  --capacity 1 \
  --auto-pause-delay 60 \
  --min-capacity 0.5
```

**In elastic pool**:
```bash
az sql db create \
  --resource-group <rg> \
  --server <server-name> \
  --name <db-name> \
  --elastic-pool <pool-name>
```

**Basic/Standard/Premium**:
```bash
az sql db create \
  --resource-group <rg> \
  --server <server-name> \
  --name <db-name> \
  --edition <Standard|Premium|Basic> \
  --capacity <DTUs>
```

### 7. Enable Security Features

```bash
# Enable auditing
az sql db audit-policy update \
  --resource-group <rg> \
  --server <server-name> \
  --name <db-name> \
  --state Enabled \
  --storage-account <storage-account>

# Enable threat detection
az sql db threat-policy update \
  --resource-group <rg> \
  --server <server-name> \
  --name <db-name> \
  --state Enabled
```

### 8. Display Summary

Show the user:
- Server FQDN: `<server-name>.database.windows.net`
- Database name
- Service tier and pricing estimate
- Connection string template
- Firewall rules configured
- Next steps: run `/sql-query` to execute queries, `/db-security-audit` to review security
