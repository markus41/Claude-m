---
name: func-setup
description: Set up the Azure Functions plugin — install Azure Functions Core Tools, Azure CLI, create Function App, configure local.settings.json
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

# Azure Functions Setup

Guide the user through setting up an Azure Functions development environment.

## Step 1: Check Prerequisites

Verify the following are installed:

- **Node.js 18+**: Required for Azure Functions v4 runtime.
- **npm**: Comes with Node.js.

```bash
node --version   # Must be >= 18.0.0
npm --version
```

## Step 2: Install Azure Functions Core Tools

```bash
npm install -g azure-functions-core-tools@4 --unsafe-perm true
func --version   # Should output 4.x
```

On Windows, Core Tools can also be installed via winget:
```bash
winget install Microsoft.Azure.FunctionsCoreTools
```

On macOS:
```bash
brew tap azure/functions
brew install azure-functions-core-tools@4
```

## Step 3: Install Azure CLI (Optional but Recommended)

```bash
# Windows (winget)
winget install Microsoft.AzureCLI

# macOS
brew install azure-cli

# Verify
az --version
az login
```

## Step 4: Initialize a Function App Project

```bash
func init <project-name> --typescript --model V4
cd <project-name>
npm install
```

This creates:
- `host.json` — Runtime configuration with extension bundle
- `local.settings.json` — Local environment variables (connection strings, app settings)
- `package.json` — Dependencies including `@azure/functions` v4
- `tsconfig.json` — TypeScript configuration
- `src/functions/` — Directory for function files

## Step 5: Configure local.settings.json

Create or update `local.settings.json` with required settings:

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "node"
  },
  "Host": {
    "CORS": "*",
    "CORSCredentials": false
  }
}
```

For Azurite (local storage emulator):
```bash
npm install -g azurite
azurite --silent --location .azurite --debug .azurite/debug.log
```

Ensure `local.settings.json` is in `.gitignore`:
```bash
echo "local.settings.json" >> .gitignore
```

## Step 6: Create an Azure Function App Resource (Optional)

If deploying to Azure, create the Function App:

**Option A: Via Azure CLI**
```bash
az group create --name <rg-name> --location <region>
az storage account create --name <storage-name> --location <region> \
  --resource-group <rg-name> --sku Standard_LRS
az functionapp create --resource-group <rg-name> --consumption-plan-location <region> \
  --runtime node --runtime-version 18 --functions-version 4 \
  --name <app-name> --storage-account <storage-name>
```

**Option B: Via Azure Portal**
1. Go to Azure Portal > Create a resource > Function App.
2. Select **Node.js** runtime, version **18 LTS**.
3. Choose **Consumption (Serverless)** plan for pay-per-execution.
4. Select or create a Storage Account.
5. Optionally enable Application Insights for monitoring.

## Step 7: Verify Local Development

```bash
func start
```

This starts the local Functions runtime. HTTP-triggered functions will be available at `http://localhost:7071/api/<function-name>`.

If `--minimal` is passed, stop after Step 4 (project initialization only).
