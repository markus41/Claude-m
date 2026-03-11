# Deployment and CI/CD Reference

## ARM Template: Consumption Logic Apps

Consumption Logic Apps use `Microsoft.Logic/workflows`. The workflow definition is embedded directly in the ARM template.

```json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "logicAppName": { "type": "string" },
    "location": { "type": "string", "defaultValue": "[resourceGroup().location]" },
    "office365ConnectionId": { "type": "string" },
    "apiEndpoint": { "type": "string" }
  },
  "resources": [{
    "type": "Microsoft.Logic/workflows",
    "apiVersion": "2019-05-01",
    "name": "[parameters('logicAppName')]",
    "location": "[parameters('location')]",
    "identity": { "type": "SystemAssigned" },
    "properties": {
      "state": "Enabled",
      "definition": {
        "$schema": "https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#",
        "contentVersion": "1.0.0.0",
        "parameters": { "$connections": { "type": "Object", "defaultValue": {} }, "apiEndpoint": { "type": "String" } },
        "triggers": { "..." : "..." }, "actions": { "..." : "..." }, "outputs": {}
      },
      "parameters": {
        "$connections": { "value": { "office365": { "connectionId": "[parameters('office365ConnectionId')]", "connectionName": "office365", "id": "[subscriptionResourceId('Microsoft.Web/locations/managedApis', parameters('location'), 'office365')]" } } },
        "apiEndpoint": { "value": "[parameters('apiEndpoint')]" }
      }
    }
  }]
}
```

### API Connection with Managed Identity Access Policy

```json
{
  "type": "Microsoft.Web/connections", "apiVersion": "2016-06-01", "name": "office365", "location": "[parameters('location')]",
  "properties": { "api": { "id": "[subscriptionResourceId('Microsoft.Web/locations/managedApis', parameters('location'), 'office365')]" }, "displayName": "Office 365 Outlook", "parameterValueType": "Alternative" }
},
{
  "type": "Microsoft.Web/connections/accessPolicies", "apiVersion": "2016-06-01",
  "name": "[concat('office365/', parameters('logicAppIdentityObjectId'))]",
  "dependsOn": ["[resourceId('Microsoft.Web/connections', 'office365')]"],
  "properties": { "principal": { "type": "ActiveDirectory", "identity": { "tenantId": "[parameters('tenantId')]", "objectId": "[parameters('logicAppIdentityObjectId')]" } } }
}
```

## ARM Template: Standard Logic Apps

Standard Logic Apps use `Microsoft.Web/sites` with `kind` = `functionapp,workflowapp`. Workflows are deployed separately via ZIP.

```json
{
  "resources": [{
    "type": "Microsoft.Web/sites", "apiVersion": "2022-09-01", "name": "[parameters('logicAppName')]",
    "location": "[parameters('location')]", "kind": "functionapp,workflowapp",
    "identity": { "type": "SystemAssigned" },
    "properties": {
      "serverFarmId": "[parameters('appServicePlanId')]", "httpsOnly": true,
      "siteConfig": { "appSettings": [
        { "name": "AzureWebJobsStorage", "value": "[concat('DefaultEndpointsProtocol=https;AccountName=', parameters('storageAccountName'), ';EndpointSuffix=core.windows.net;AccountKey=', listKeys(resourceId('Microsoft.Storage/storageAccounts', parameters('storageAccountName')), '2021-09-01').keys[0].value)]" },
        { "name": "FUNCTIONS_EXTENSION_VERSION", "value": "~4" },
        { "name": "APP_KIND", "value": "workflowapp" },
        { "name": "AzureFunctionsJobHost__extensionBundle__id", "value": "Microsoft.Azure.Functions.ExtensionBundle.Workflows" },
        { "name": "AzureFunctionsJobHost__extensionBundle__version", "value": "[1.*, 2.0.0)" }
      ]}
    }
  }]
}
```

## Bicep: Standard Logic App

```bicep
param logicAppName string
param location string = resourceGroup().location
param storageAccountName string

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' existing = { name: storageAccountName }

resource plan 'Microsoft.Web/serverfarms@2022-09-01' = {
  name: '${logicAppName}-plan'
  location: location
  sku: { name: 'WS1'; tier: 'WorkflowStandard' }
  kind: 'elastic'
  properties: { elasticScaleEnabled: true; maximumElasticWorkerCount: 20 }
}

resource logicApp 'Microsoft.Web/sites@2022-09-01' = {
  name: logicAppName
  location: location
  kind: 'functionapp,workflowapp'
  identity: { type: 'SystemAssigned' }
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    siteConfig: { appSettings: [
      { name: 'AzureWebJobsStorage', value: 'DefaultEndpointsProtocol=https;AccountName=${storageAccountName};EndpointSuffix=${environment().suffixes.storage};AccountKey=${storageAccount.listKeys().keys[0].value}' }
      { name: 'FUNCTIONS_EXTENSION_VERSION', value: '~4' }
      { name: 'APP_KIND', value: 'workflowapp' }
      { name: 'AzureFunctionsJobHost__extensionBundle__id', value: 'Microsoft.Azure.Functions.ExtensionBundle.Workflows' }
      { name: 'AzureFunctionsJobHost__extensionBundle__version', value: '[1.*, 2.0.0)' }
    ]}
  }
}

output principalId string = logicApp.identity.principalId
```

## Parameterization Best Practices

### Connections Across Environments

For Consumption, externalize `$connections` via parameter files per environment (`parameters.dev.json`, `parameters.prod.json`).

For Standard, use `connections.json` with `@appsetting()` references:

```json
{
  "managedApiConnections": {
    "office365": {
      "api": { "id": "/subscriptions/@appsetting('SUBSCRIPTION_ID')/providers/Microsoft.Web/locations/@appsetting('REGION')/managedApis/office365" },
      "connection": { "id": "@appsetting('OFFICE365_CONNECTION_ID')" },
      "connectionRuntimeUrl": "@appsetting('OFFICE365_RUNTIME_URL')",
      "authentication": { "type": "ManagedServiceIdentity" }
    }
  }
}
```

### Secrets via Key Vault

ARM parameter: `{ "reference": { "keyVault": { "id": "/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.KeyVault/vaults/{name}" }, "secretName": "ApiKey" } }`

Standard app setting: `{ "name": "ApiKey", "value": "@Microsoft.KeyVault(SecretUri=https://myvault.vault.azure.net/secrets/ApiKey/)" }`

## Azure CLI Commands

```bash
# Consumption
az logic workflow create --resource-group myRG --name my-app --location eastus --definition @workflow.json --state Enabled
az logic workflow update --resource-group myRG --name my-app --definition @workflow.json
az logic workflow show --resource-group myRG --name my-app
az logic workflow delete --resource-group myRG --name my-app --yes
az logic workflow list --resource-group myRG --output table
az logic workflow update --resource-group myRG --name my-app --state Disabled  # or Enabled

# Standard
az logicapp create --resource-group myRG --name my-std-app --storage-account mysa --plan my-plan --runtime-version ~4
az logicapp deployment source config-zip --resource-group myRG --name my-std-app --src ./deploy.zip
az logicapp config appsettings set --resource-group myRG --name my-std-app --settings "API_ENDPOINT=https://api.example.com"
az logicapp start --resource-group myRG --name my-std-app
az logicapp stop --resource-group myRG --name my-std-app
```

## GitHub Actions: Standard Deployment

```yaml
name: Deploy Standard Logic App
on:
  push: { branches: [main], paths: ['src/logic-app/**'] }
env:
  APP_NAME: my-standard-app
  RG: rg-logic-apps

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Package
        run: |
          mkdir output && cp -r src/logic-app/. output/
          rm -f output/local.settings.json && rm -rf output/.vscode
          cd output && zip -r ../deploy.zip . -x "*.git*"
      - uses: actions/upload-artifact@v4
        with: { name: pkg, path: deploy.zip }

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/download-artifact@v4
        with: { name: pkg }
      - uses: azure/login@v2
        with: { creds: '${{ secrets.AZURE_CREDENTIALS }}' }
      - uses: azure/appservice-settings@v1
        with:
          app-name: ${{ env.APP_NAME }}
          app-settings-json: '[{ "name": "API_ENDPOINT", "value": "${{ vars.API_ENDPOINT }}" }]'
      - uses: azure/functions-action@v1
        with: { app-name: '${{ env.APP_NAME }}', package: deploy.zip }
```

## Azure DevOps Pipeline: Standard Deployment

```yaml
trigger: { branches: { include: [main] }, paths: { include: ['src/logic-app/*'] } }
pool: { vmImage: 'ubuntu-latest' }
variables:
  azureSub: 'MyServiceConnection'
  appName: 'my-standard-app'

stages:
  - stage: Build
    jobs:
      - job: Package
        steps:
          - task: CopyFiles@2
            inputs: { sourceFolder: 'src/logic-app', contents: '**/*\n!local.settings.json\n!.vscode/**', targetFolder: '$(Build.ArtifactStagingDirectory)/app' }
          - task: ArchiveFiles@2
            inputs: { rootFolderOrFile: '$(Build.ArtifactStagingDirectory)/app', includeRootFolder: false, archiveType: 'zip', archiveFile: '$(Build.ArtifactStagingDirectory)/deploy.zip' }
          - publish: '$(Build.ArtifactStagingDirectory)/deploy.zip'
            artifact: pkg

  - stage: Deploy
    dependsOn: Build
    jobs:
      - deployment: Prod
        environment: Production
        strategy:
          runOnce:
            deploy:
              steps:
                - task: AzureFunctionApp@2
                  inputs: { azureSubscription: '$(azureSub)', appType: 'functionApp', appName: '$(appName)', package: '$(Pipeline.Workspace)/pkg/deploy.zip', deploymentMethod: 'zipDeploy' }
```

## Project Structure and ZIP Deployment

```
my-logic-app/
  host.json                    # required at root
  connections.json             # connection definitions
  parameters.json              # workflow parameters
  local.settings.json          # local dev only (NOT deployed)
  OrderProcessing/
    workflow.json
  InventoryCheck/
    workflow.json
  Artifacts/
    Maps/OrderTransform.xslt
    Schemas/OrderSchema.xsd
```

Best practice: Maintain two deployment streams -- infrastructure (Bicep/ARM for the Logic App resource, plan, storage) and workflow code (ZIP deploy for `workflow.json` files, connections, and artifacts).

```bash
cd src/logic-app
zip -r ../../deploy.zip . -x "local.settings.json" ".vscode/*" "*.git*"
az logicapp deployment source config-zip --resource-group myRG --name my-std-app --src ../../deploy.zip
```

The ZIP must contain `host.json` at root. Each workflow lives in its own folder with a `workflow.json`.
