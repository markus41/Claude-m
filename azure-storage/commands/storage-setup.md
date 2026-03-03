---
name: storage-setup
description: Set up the Azure Storage plugin — install Azure CLI, create a storage account, configure network rules and managed identity
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

# Azure Storage Setup

Guide the user through setting up an Azure Storage development environment.

## Step 1: Check Prerequisites

Verify the following are installed:

- **Azure CLI 2.50+**: Required for storage account management.
- **Node.js 18+**: Required for the Azure Storage SDKs.

```bash
az --version      # Must be >= 2.50.0
node --version    # Must be >= 18.0.0
npm --version
```

## Step 2: Authenticate with Azure

```bash
az login
az account show   # Verify correct subscription
az account set --subscription <subscription-id>   # Switch if needed
```

## Step 3: Install Azure Storage SDKs

```bash
npm init -y && npm install @azure/storage-blob @azure/storage-queue @azure/data-tables @azure/storage-file-share @azure/identity dotenv
npm install --save-dev typescript @types/node ts-node
```

## Step 4: Create a Storage Account

Ask the user for:
- **Resource group** name (create one if needed)
- **Storage account name** (3-24 chars, lowercase letters and numbers only)
- **Region** (e.g., `eastus`, `westeurope`)
- **SKU** (default: `Standard_LRS`)
- **Kind** (default: `StorageV2`)

```bash
# Create resource group (if needed)
az group create --name <rg-name> --location <region>

# Create storage account
az storage account create \
  --name <storage-name> \
  --resource-group <rg-name> \
  --location <region> \
  --sku Standard_LRS \
  --kind StorageV2 \
  --min-tls-version TLS1_2 \
  --allow-blob-public-access false \
  --https-only true
```

## Step 5: Configure Network Rules

```bash
# Set default action to Deny (restrict public access)
az storage account update \
  --name <storage-name> \
  --resource-group <rg-name> \
  --default-action Deny

# Allow access from a specific VNet/subnet
az storage account network-rule add \
  --account-name <storage-name> \
  --resource-group <rg-name> \
  --vnet-name <vnet-name> \
  --subnet <subnet-name>

# Allow access from a specific IP
az storage account network-rule add \
  --account-name <storage-name> \
  --resource-group <rg-name> \
  --ip-address <your-ip>
```

## Step 6: Configure Managed Identity Access

Assign RBAC roles instead of using account keys:

```bash
# Get current user's object ID
USER_ID=$(az ad signed-in-user show --query id -o tsv)

# Assign Storage Blob Data Contributor
az role assignment create \
  --assignee $USER_ID \
  --role "Storage Blob Data Contributor" \
  --scope "/subscriptions/<sub-id>/resourceGroups/<rg-name>/providers/Microsoft.Storage/storageAccounts/<storage-name>"

# Assign Storage Queue Data Contributor
az role assignment create \
  --assignee $USER_ID \
  --role "Storage Queue Data Contributor" \
  --scope "/subscriptions/<sub-id>/resourceGroups/<rg-name>/providers/Microsoft.Storage/storageAccounts/<storage-name>"

# Assign Storage Table Data Contributor
az role assignment create \
  --assignee $USER_ID \
  --role "Storage Table Data Contributor" \
  --scope "/subscriptions/<sub-id>/resourceGroups/<rg-name>/providers/Microsoft.Storage/storageAccounts/<storage-name>"
```

## Step 7: Configure Environment

Create a `.env` file in the project root:

```
AZURE_STORAGE_ACCOUNT_NAME=<storage-account-name>
AZURE_STORAGE_ACCOUNT_URL=https://<storage-account-name>.blob.core.windows.net
AZURE_STORAGE_QUEUE_URL=https://<storage-account-name>.queue.core.windows.net
AZURE_STORAGE_TABLE_URL=https://<storage-account-name>.table.core.windows.net
AZURE_STORAGE_FILE_URL=https://<storage-account-name>.file.core.windows.net
AZURE_TENANT_ID=<your-tenant-id>
AZURE_CLIENT_ID=<your-client-id>
AZURE_CLIENT_SECRET=<your-client-secret>
```

Ensure `.env` is in `.gitignore`:
```bash
echo ".env" >> .gitignore
```

## Step 8: Verify Access

Test connectivity with a quick blob upload:

```bash
az storage blob upload \
  --account-name <storage-name> \
  --container-name test \
  --name hello.txt \
  --data "Hello from Azure Storage" \
  --auth-mode login

az storage blob list \
  --account-name <storage-name> \
  --container-name test \
  --auth-mode login \
  --output table
```

If `--minimal` is passed, stop after Step 3 (dependencies only).
