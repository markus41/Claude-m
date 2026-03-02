---
name: setup
description: Set up the Fabric OneLake plugin — install Azure CLI, authenticate, configure workspace access and OneLake endpoints
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

# Fabric OneLake Setup

Guide the user through setting up a Fabric OneLake development environment.

## Step 1: Check Prerequisites

Verify the following are installed:

- **Node.js 18+**: Required for Azure SDK packages.
- **npm**: Comes with Node.js.
- **Python 3.10+** (optional): Required for `azure-storage-file-datalake` Python SDK.

```bash
node --version   # Must be >= 18.0.0
npm --version
python --version  # Optional, >= 3.10
```

## Step 2: Install Azure CLI

```bash
# Windows (winget)
winget install Microsoft.AzureCLI

# macOS
brew install azure-cli

# Linux
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Verify
az --version
```

## Step 3: Authenticate to Azure

```bash
az login
az account show   # Verify correct subscription
```

If the user has multiple subscriptions, set the correct one:
```bash
az account set --subscription "<subscription-id>"
```

## Step 4: Verify Fabric Capacity

Confirm the tenant has Microsoft Fabric capacity enabled:

1. Go to the Fabric portal at `https://app.fabric.microsoft.com`.
2. Verify at least one workspace is backed by a Fabric capacity (F2+, P1+, or trial).
3. Confirm OneLake is accessible: navigate to any lakehouse and check the Files/ or Tables/ section.

## Step 5: Install SDK Dependencies

**Node.js (for ADLS Gen2 / DFS API access)**:
```bash
npm init -y && npm install @azure/storage-file-datalake @azure/identity dotenv
npm install --save-dev typescript @types/node ts-node
```

**Python (optional, for notebook/Spark workflows)**:
```bash
pip install azure-storage-file-datalake azure-identity
```

## Step 6: Configure Environment

Create a `.env` file in the project root:

```
AZURE_TENANT_ID=<your-tenant-id>
AZURE_CLIENT_ID=<your-client-id>
AZURE_CLIENT_SECRET=<your-client-secret>
ONELAKE_WORKSPACE_NAME=<your-workspace-name>
ONELAKE_WORKSPACE_ID=<your-workspace-guid>
FABRIC_CAPACITY_NAME=<your-capacity-name>
```

Ensure `.env` is in `.gitignore`:
```bash
echo ".env" >> .gitignore
```

## Step 7: Verify OneLake Access

Test connectivity to the OneLake DFS endpoint:

```bash
# Get an access token for Azure Storage
TOKEN=$(az account get-access-token --resource https://storage.azure.com/ --query accessToken -o tsv)

# List items in a workspace
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://onelake.dfs.fabric.microsoft.com/<workspace-name>?resource=filesystem&recursive=false" \
  | python -m json.tool
```

If the call returns a list of items (lakehouses, warehouses), OneLake access is confirmed.

## Step 8: Verify SDK Access (Optional)

Create a quick test script to verify the Node.js SDK works:

```typescript
import { DataLakeServiceClient } from "@azure/storage-file-datalake";
import { DefaultAzureCredential } from "@azure/identity";

const client = new DataLakeServiceClient(
  "https://onelake.dfs.fabric.microsoft.com",
  new DefaultAzureCredential()
);

const fsClient = client.getFileSystemClient("<workspace-name>");
for await (const item of fsClient.listPaths({ path: "<lakehouse-name>/Files" })) {
  console.log(item.name);
}
```

If `--minimal` is passed, stop after Step 5 (dependencies only).
