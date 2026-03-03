---
name: warehouse-setup
description: Set up the Fabric Data Warehouse plugin — configure workspace connection, install SQL tools, verify access
argument-hint: "[--minimal]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

# Fabric Data Warehouse Setup

Guide the user through setting up a Fabric Data Warehouse development environment.

## Step 1: Check Prerequisites

Verify the following are available:

- **Azure CLI**: Required for authentication and Fabric REST API access.
- **SQL tools**: SSMS, Azure Data Studio, or `sqlcmd` for running T-SQL.

```bash
az --version         # Azure CLI
sqlcmd --version     # sqlcmd utility (optional)
```

## Step 2: Authenticate to Azure

```bash
az login
az account set --subscription <subscription-id>
```

For service principal authentication (CI/CD):
```bash
az login --service-principal -u <app-id> -p <client-secret> --tenant <tenant-id>
```

## Step 3: Install SQL Tooling

**Option A: Azure Data Studio (recommended)**
Download from https://learn.microsoft.com/sql/azure-data-studio/download — supports Fabric warehouse connections natively.

**Option B: sqlcmd**
```bash
# Windows (winget)
winget install Microsoft.SqlCmd

# macOS (brew)
brew install sqlcmd
```

**Option C: SSMS**
Download SQL Server Management Studio from https://learn.microsoft.com/sql/ssms/download — full T-SQL IntelliSense and execution plan support.

## Step 4: Connect to Fabric Warehouse

Get the SQL connection endpoint from the Fabric portal:
1. Open the workspace in Fabric portal.
2. Click on the warehouse item.
3. Copy the **SQL connection string** from the bottom of the page.

Connection parameters:
```
Server: <workspace-guid>.datawarehouse.fabric.microsoft.com
Database: <warehouse-name>
Authentication: Azure Active Directory - Universal with MFA
```

Test connectivity:
```bash
sqlcmd -S <workspace-guid>.datawarehouse.fabric.microsoft.com -d <warehouse-name> -G -Q "SELECT @@VERSION"
```

## Step 5: Configure Environment File

Create a `.env` file in the project root for scripts and automation:

```
FABRIC_WORKSPACE_ID=<workspace-guid>
FABRIC_WAREHOUSE_NAME=<warehouse-name>
FABRIC_SQL_ENDPOINT=<workspace-guid>.datawarehouse.fabric.microsoft.com
AZURE_TENANT_ID=<tenant-id>
AZURE_CLIENT_ID=<client-id>
AZURE_CLIENT_SECRET=<client-secret>
```

Ensure `.env` is in `.gitignore`:
```bash
echo ".env" >> .gitignore
```

## Step 6: Verify Access

Run a test query to verify the connection:

```sql
-- Check warehouse metadata
SELECT DB_NAME() AS CurrentDatabase;
SELECT SCHEMA_NAME(schema_id) AS SchemaName, name AS TableName
FROM sys.tables
ORDER BY SchemaName, TableName;
```

## Step 7: Set Up Project Structure

Create a standard project directory layout for warehouse SQL files:

```
warehouse-project/
├── schemas/            # CREATE SCHEMA scripts
├── tables/             # CREATE TABLE scripts (dim/, fact/, staging/)
├── views/              # Reporting views
├── procedures/         # Stored procedures
├── security/           # RLS, CLS, permissions
├── data-load/          # COPY INTO, CTAS, pipeline configs
├── tests/              # Validation queries
└── .env                # Connection config (gitignored)
```

If `--minimal` is passed, stop after Step 4 (connectivity verification only).
