---
name: la-setup
description: "Set up Azure Logic Apps development — install VS Code extension, Azure CLI, configure local dev environment"
argument-hint: "[--standard] [--consumption] [--minimal]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

# Azure Logic Apps Setup

Guide the user through setting up an Azure Logic Apps (Standard) local development environment.

## Step 1: Check Prerequisites

Verify the following are installed:

- **Node.js 18+**: Required for Azure Functions runtime (Standard Logic Apps run on the Functions host).
- **.NET 6 SDK**: Required for the Logic Apps designer and local runtime.

```bash
node --version   # Must be >= 18.0.0
dotnet --version # Must be >= 6.0.0
```

If `--consumption` is specified, skip .NET and local runtime checks — Consumption Logic Apps are portal/ARM-only and do not support local development.

## Step 2: Install Azure CLI and Log In

```bash
# Windows (winget)
winget install Microsoft.AzureCLI

# macOS
brew install azure-cli

# Verify and authenticate
az --version
az login
```

## Step 3: Install Azure Functions Core Tools v4

Standard Logic Apps run on the Azure Functions runtime. Core Tools v4 is required for local execution.

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

## Step 4: Install VS Code Extensions

Install the following VS Code extensions:

- **Azure Logic Apps (Standard)** (`ms-azuretools.vscode-azurelogicapps`): Workflow designer, debugging, deployment.
- **Azurite** (`Azurite.azurite`): Local Azure Storage emulator.

```bash
code --install-extension ms-azuretools.vscode-azurelogicapps
code --install-extension Azurite.azurite
```

## Step 5: Initialize Standard Logic App Project

Create the project directory structure:

```bash
mkdir -p <project-name>/.vscode
mkdir -p <project-name>/Artifacts/Maps
mkdir -p <project-name>/Artifacts/Schemas
```

Create `host.json`:
```json
{
  "version": "2.0",
  "extensionBundle": {
    "id": "Microsoft.Azure.Functions.ExtensionBundle.Workflows",
    "version": "[1.*, 2.0.0)"
  }
}
```

Create `local.settings.json`:
```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "WORKFLOWS_SUBSCRIPTION_ID": "",
    "WORKFLOWS_TENANT_ID": "",
    "WORKFLOWS_RESOURCE_GROUP_NAME": "",
    "WORKFLOWS_LOCATION_NAME": ""
  }
}
```

Ensure `local.settings.json` is in `.gitignore`:
```bash
echo "local.settings.json" >> <project-name>/.gitignore
```

Create `.vscode/settings.json` for designer support:
```json
{
  "azureLogicAppsStandard.autoRuntimeDependenciesValidation": true,
  "azureLogicAppsStandard.dotnetBinaryPath": "dotnet"
}
```

Create `.vscode/extensions.json`:
```json
{
  "recommendations": [
    "ms-azuretools.vscode-azurelogicapps",
    "Azurite.azurite"
  ]
}
```

## Step 6: Start Azurite for Local Storage Emulation

Standard Logic Apps require Azure Storage for state persistence. Azurite provides a local emulator.

```bash
npm install -g azurite
azurite --silent --location .azurite --debug .azurite/debug.log
```

Or start Azurite from the VS Code command palette: **Azurite: Start**.

## Step 7: Verify Local Development Environment

Create a test workflow to verify everything works. Create directory `test-workflow/` with a minimal `workflow.json`, then start the runtime:

```bash
func host start
```

The Logic Apps runtime should start and list any discovered workflows. HTTP-triggered workflows will be available at `http://localhost:7071/api/<workflow-name>/triggers/manual/invoke`.

## Step 8: Create Azure Resources (Optional)

If deploying to Azure, create the infrastructure:

**Standard Logic App**:
```bash
# Create resource group
az group create --name <rg-name> --location <region>

# Create storage account (required for Standard)
az storage account create \
  --name <storage-name> --resource-group <rg-name> \
  --location <region> --sku Standard_LRS

# Create Workflow Service Plan (WS1/WS2/WS3)
az appservice plan create \
  --name <plan-name> --resource-group <rg-name> \
  --location <region> --sku WS1

# Verify plan
az appservice plan show \
  --name <plan-name> --resource-group <rg-name> --output table

# Create Standard Logic App
az logicapp create \
  --name <app-name> --resource-group <rg-name> \
  --plan <plan-name> --storage-account <storage-name>

# Verify Logic App
az logicapp show --name <app-name> --resource-group <rg-name> --output table

# Enable managed identity
az logicapp identity assign --name <app-name> --resource-group <rg-name>

# Add VNet integration (optional, for private connectivity)
az logicapp vnet-integration add \
  --name <app-name> --resource-group <rg-name> \
  --vnet <vnet-name> --subnet <subnet-name>

# Remove VNet integration
az logicapp vnet-integration remove \
  --name <app-name> --resource-group <rg-name>

# List app settings
az logicapp config appsettings list \
  --name <app-name> --resource-group <rg-name> --output table

# Delete app settings
az logicapp config appsettings delete \
  --name <app-name> --resource-group <rg-name> \
  --setting-names KEY1 KEY2
```

**Consumption Logic App** (no local dev — portal/ARM only):
```bash
# Create from a workflow definition file
az logic workflow create \
  --resource-group <rg-name> \
  --name <app-name> \
  --location <region> \
  --definition @workflow.json \
  --state Enabled

# Verify
az logic workflow show --resource-group <rg-name> --name <app-name>
```

## Step 9: Minimal Mode

If `--minimal` is passed, stop after Step 5 (project initialization only, no Azurite start or runtime verification).
