---
name: db-setup
description: Set up the Azure SQL Database plugin — install Azure CLI, sqlcmd, create SQL Server + database or Cosmos DB account
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

# Azure SQL Database Setup

Guide the user through setting up an Azure database development environment.

## Step 1: Check Prerequisites

Verify the following are installed:

- **Azure CLI 2.50+**: Required for resource provisioning.
- **Node.js 18+**: Required for application development and Cosmos DB SDK.

```bash
az --version    # Must be >= 2.50.0
node --version  # Must be >= 18.0.0
```

## Step 2: Install Database Tools

### sqlcmd (for Azure SQL)

```bash
# Windows (winget)
winget install Microsoft.Sqlcmd

# macOS (Homebrew)
brew install sqlcmd

# Linux (apt)
curl https://packages.microsoft.com/keys/microsoft.asc | sudo tee /etc/apt/trusted.gpg.d/microsoft.asc
sudo add-apt-repository "$(wget -qO- https://packages.microsoft.com/config/ubuntu/$(lsb_release -rs)/prod.list)"
sudo apt-get update && sudo apt-get install sqlcmd
```

Verify:
```bash
sqlcmd --version
```

### Azure CLI Extensions

```bash
az extension add --name cosmosdb-preview   # Cosmos DB preview features
az extension add --name db-up              # Quick database provisioning
```

## Step 3: Authenticate with Azure

```bash
az login
az account show   # Verify correct subscription
az account set --subscription <subscription-id>  # Switch if needed
```

## Step 4: Create Azure SQL Database (Optional)

```bash
# Create a resource group
az group create --name rg-database-dev --location eastus

# Create a SQL Server
az sql server create \
  --name sqlsrv-dev-$(date +%s) \
  --resource-group rg-database-dev \
  --location eastus \
  --admin-user sqladmin \
  --admin-password '<StrongPassword123!>'

# Create a database (serverless, good for dev)
az sql db create \
  --resource-group rg-database-dev \
  --server <server-name> \
  --name mydb \
  --edition GeneralPurpose \
  --compute-model Serverless \
  --family Gen5 \
  --capacity 1 \
  --auto-pause-delay 60

# Configure firewall (allow your IP)
az sql server firewall-rule create \
  --resource-group rg-database-dev \
  --server <server-name> \
  --name AllowMyIP \
  --start-ip-address <your-ip> \
  --end-ip-address <your-ip>
```

## Step 5: Create Azure Cosmos DB Account (Optional)

```bash
# Create a Cosmos DB account (NoSQL API)
az cosmosdb create \
  --name cosmosdb-dev-$(date +%s) \
  --resource-group rg-database-dev \
  --default-consistency-level Session \
  --locations regionName=eastus failoverPriority=0

# Create a database
az cosmosdb sql database create \
  --account-name <account-name> \
  --resource-group rg-database-dev \
  --name mydb

# Create a container
az cosmosdb sql container create \
  --account-name <account-name> \
  --resource-group rg-database-dev \
  --database-name mydb \
  --name items \
  --partition-key-path /tenantId \
  --throughput 400
```

## Step 6: Configure Environment

Create a `.env` file in the project root:

```
# Azure SQL
SQL_SERVER=<server-name>.database.windows.net
SQL_DATABASE=mydb
SQL_USER=sqladmin
SQL_PASSWORD=<password>

# Cosmos DB
COSMOS_ENDPOINT=https://<account-name>.documents.azure.com:443/
COSMOS_KEY=<primary-key>
COSMOS_DATABASE=mydb

# Azure Identity (for managed identity)
AZURE_TENANT_ID=<your-tenant-id>
AZURE_CLIENT_ID=<your-client-id>
AZURE_CLIENT_SECRET=<your-client-secret>
```

Ensure `.env` is in `.gitignore`:
```bash
echo ".env" >> .gitignore
```

## Step 7: Install Application Dependencies

```bash
npm init -y
npm install mssql @azure/cosmos @azure/identity dotenv
npm install --save-dev typescript @types/node ts-node
```

## Step 8: Verify Connectivity

### Azure SQL
```bash
sqlcmd -S <server-name>.database.windows.net -d mydb -U sqladmin -P '<password>' -Q "SELECT @@VERSION"
```

### Cosmos DB
```bash
az cosmosdb sql database list --account-name <account-name> --resource-group rg-database-dev
```

If `--minimal` is passed, stop after Step 3 (authentication and tools only).
