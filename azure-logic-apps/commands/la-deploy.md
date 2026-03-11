---
name: la-deploy
description: "Deploy Logic App to Azure via CLI, ARM/Bicep, or generate CI/CD pipeline"
argument-hint: "[--cli] [--bicep] [--github-actions] [--azure-devops] [--app-name <name>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

# Deploy Azure Logic App

Deploy a Logic App to Azure or generate a CI/CD pipeline configuration.

## Instructions

### 1. Detect Hosting Model

Determine whether the project is **Standard** or **Consumption**:

- **Standard**: Has `host.json` with `Microsoft.Azure.Functions.ExtensionBundle.Workflows`, workflow directories with `workflow.json` files.
- **Consumption**: Single ARM template or Bicep file defining `Microsoft.Logic/workflows` resource.

Ask the user if the model cannot be auto-detected.

### 2. Validate Project Structure

Before deploying, verify:
- `host.json` exists and contains the workflow extension bundle (Standard).
- At least one `<workflow-name>/workflow.json` file exists.
- `connections.json` is present if workflows use connectors.
- `local.settings.json` is NOT included in deployment (check `.funcignore`).

Create `.funcignore` if it does not exist:
```
.git*
.vscode
local.settings.json
test
.azurite
```

### 3. Option A: Deploy Standard via CLI (Zip Deploy)

**Create the Azure resources** (if they do not exist):
```bash
# Create resource group
az group create --name <rg-name> --location <region>

# Create storage account
az storage account create --name <storage-name> --location <region> \
  --resource-group <rg-name> --sku Standard_LRS

# Create App Service plan (WS1 for Standard Logic Apps)
az appservice plan create --name <plan-name> --resource-group <rg-name> \
  --location <region> --sku WS1

# Create Logic App (Standard)
az logicapp create --name <app-name> --resource-group <rg-name> \
  --plan <plan-name> --storage-account <storage-name>
```

**Deploy via zip**:
```bash
# Build and zip the project
cd <project-dir>
zip -r ../deploy.zip . -x ".git/*" ".vscode/*" "local.settings.json" ".azurite/*"

# Deploy
az logicapp deployment source config-zip \
  --name <app-name> --resource-group <rg-name> \
  --src ../deploy.zip
```

### 4. Option B: Deploy Consumption via CLI

**Create or update Consumption Logic App directly via CLI**:
```bash
# Create Consumption Logic App from workflow definition
az logic workflow create \
  --resource-group <rg-name> \
  --name <app-name> \
  --location <region> \
  --definition @workflow.json \
  --state Enabled

# Update workflow definition
az logic workflow update \
  --resource-group <rg-name> \
  --name <app-name> \
  --definition @workflow.json

# Show workflow details
az logic workflow show \
  --resource-group <rg-name> \
  --name <app-name>

# List all Consumption Logic Apps in resource group
az logic workflow list \
  --resource-group <rg-name> \
  --output table

# Enable/Disable workflow
az logic workflow update \
  --resource-group <rg-name> \
  --name <app-name> \
  --state Disabled

# Delete workflow
az logic workflow delete \
  --resource-group <rg-name> \
  --name <app-name> --yes
```

### 5. Option C: Deploy Consumption via Bicep

Generate a Bicep template for a Consumption Logic App:

```bicep
param logicAppName string
param location string = resourceGroup().location

resource logicApp 'Microsoft.Logic/workflows@2019-05-01' = {
  name: logicAppName
  location: location
  properties: {
    state: 'Enabled'
    definition: {
      '$schema': 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#'
      contentVersion: '1.0.0.0'
      triggers: {}
      actions: {}
      outputs: {}
    }
  }
}

output logicAppId string = logicApp.id
output logicAppUrl string = logicApp.properties.accessEndpoint
```

Deploy with:
```bash
az deployment group create \
  --resource-group <rg-name> \
  --template-file main.bicep \
  --parameters logicAppName=<app-name>
```

### 6. Option D: Generate GitHub Actions Workflow YAML

Create `.github/workflows/logic-app-deploy.yml`:

```yaml
name: Deploy Logic App (Standard)

on:
  push:
    branches: [main]
  workflow_dispatch:

env:
  AZURE_LOGICAPP_NAME: '<app-name>'
  AZURE_RESOURCE_GROUP: '<rg-name>'

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Login to Azure
        uses: azure/login@v2
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Create deployment package
        run: |
          mkdir -p output
          zip -r output/deploy.zip . \
            -x ".git/*" ".github/*" ".vscode/*" "local.settings.json" ".azurite/*" "output/*"

      - name: Deploy to Logic App
        uses: azure/CLI@v2
        with:
          inlineScript: |
            az logicapp deployment source config-zip \
              --name ${{ env.AZURE_LOGICAPP_NAME }} \
              --resource-group ${{ env.AZURE_RESOURCE_GROUP }} \
              --src output/deploy.zip
```

Instruct the user to:
1. Create an Azure service principal: `az ad sp create-for-rbac --name "github-deploy" --role contributor --scopes /subscriptions/<sub-id>/resourceGroups/<rg-name> --sdk-auth`
2. Add the JSON output as a GitHub secret named `AZURE_CREDENTIALS`.

### 7. Option E: Generate Azure DevOps Pipeline YAML

Create `azure-pipelines.yml`:

```yaml
trigger:
  branches:
    include:
      - main

pool:
  vmImage: 'ubuntu-latest'

variables:
  azureSubscription: '<service-connection-name>'
  logicAppName: '<app-name>'
  resourceGroup: '<rg-name>'

steps:
  - task: ArchiveFiles@2
    inputs:
      rootFolderOrFile: '$(System.DefaultWorkingDirectory)'
      includeRootFolder: false
      archiveType: 'zip'
      archiveFile: '$(Build.ArtifactStagingDirectory)/deploy.zip'
      replaceExistingArchive: true

  - task: AzureCLI@2
    inputs:
      azureSubscription: '$(azureSubscription)'
      scriptType: 'bash'
      scriptLocation: 'inlineScript'
      inlineScript: |
        az logicapp deployment source config-zip \
          --name $(logicAppName) \
          --resource-group $(resourceGroup) \
          --src $(Build.ArtifactStagingDirectory)/deploy.zip
```

### 8. Standard Logic App Lifecycle Management

After initial deployment, manage the Standard Logic App:
```bash
# Show Standard Logic App details
az logicapp show --resource-group <rg-name> --name <app-name>

# List Standard Logic Apps in resource group
az logicapp list --resource-group <rg-name> --output table

# Stop Logic App (disable all workflows)
az logicapp stop --resource-group <rg-name> --name <app-name>

# Start Logic App
az logicapp start --resource-group <rg-name> --name <app-name>

# Restart Logic App
az logicapp restart --resource-group <rg-name> --name <app-name>

# Delete Standard Logic App
az logicapp delete --resource-group <rg-name> --name <app-name> --yes

# Enable managed identity
az logicapp identity assign --resource-group <rg-name> --name <app-name>

# Show managed identity
az logicapp identity show --resource-group <rg-name> --name <app-name>
```

### 9. Post-Deployment: Configure Connections and Verify

After deployment, configure managed API connections:
```bash
# List connections
az resource list --resource-group <rg-name> \
  --resource-type "Microsoft.Web/connections" --output table

# Update app settings for connection strings
az logicapp config appsettings set \
  --name <app-name> --resource-group <rg-name> \
  --settings "ServiceBusConnectionString=<connection-string>"
```

Verify run history:
```bash
az rest --method GET \
  --url "https://management.azure.com/subscriptions/<sub-id>/resourceGroups/<rg-name>/providers/Microsoft.Web/sites/<app-name>/hostruntime/runtime/webhooks/workflow/api/management/workflows?api-version=2022-03-01"
```

### 10. Display Summary

Show the user:
- Deployment method used (CLI, Bicep, GitHub Actions, or Azure DevOps)
- Logic App URL: `https://<app-name>.azurewebsites.net` (Standard) or Azure Portal link (Consumption)
- How to view runs: Azure Portal > Logic App > Workflows > Run history
- How to stream logs: `az logicapp log tail --name <app-name> --resource-group <rg-name>`
- Next steps: configure connections, set up monitoring, enable Application Insights
