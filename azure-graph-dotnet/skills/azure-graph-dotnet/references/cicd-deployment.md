# CI/CD Deployment — GitHub Actions and Azure DevOps

---

## GitHub Actions — Azure Functions

```yaml
# .github/workflows/deploy-functions.yml
name: Deploy Azure Functions

on:
  push:
    branches: [main]
  workflow_dispatch:

env:
  AZURE_FUNCTIONAPP_NAME: graph-file-intelligence
  AZURE_FUNCTIONAPP_PACKAGE_PATH: .
  DOTNET_VERSION: 8.0.x

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    permissions:
      id-token: write   # Required for OIDC
      contents: read

    steps:
      - uses: actions/checkout@v4

      - name: Setup .NET
        uses: actions/setup-dotnet@v4
        with:
          dotnet-version: ${{ env.DOTNET_VERSION }}

      - name: Restore dependencies
        run: dotnet restore

      - name: Build
        run: dotnet build --configuration Release --no-restore

      - name: Test
        run: dotnet test --no-build --verbosity normal

      - name: Publish
        run: dotnet publish -c Release -o ./publish --no-restore

      - name: Azure login (OIDC — no secrets needed)
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      - name: Deploy to Azure Functions
        uses: azure/functions-action@v1
        with:
          app-name: ${{ env.AZURE_FUNCTIONAPP_NAME }}
          package: ./publish
          respect-funcignore: true
```

### Required GitHub repository secrets

| Secret | Value |
|--------|-------|
| `AZURE_CLIENT_ID` | App registration client ID (for OIDC federated identity) |
| `AZURE_TENANT_ID` | Azure AD tenant ID |
| `AZURE_SUBSCRIPTION_ID` | Azure subscription ID |

**Set up OIDC (no client secret required):**
```bash
# Add federated credential to app registration
az ad app federated-credential create \
  --id <app-id> \
  --parameters '{
    "name": "github-actions",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:<owner>/<repo>:ref:refs/heads/main",
    "audiences": ["api://AzureADTokenExchange"]
  }'
```

---

## GitHub Actions — Azure Container Job (Docker)

```yaml
# .github/workflows/deploy-container-job.yml
name: Deploy Container Job

on:
  push:
    branches: [main]
    paths:
      - 'src/**'
      - 'Dockerfile'
  workflow_dispatch:

env:
  ACR_NAME: graphintelligence
  IMAGE_NAME: graph-scan-job
  RESOURCE_GROUP: rg-graph-intelligence
  CONTAINER_JOB_NAME: graph-scan-job

jobs:
  build-push-deploy:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read

    steps:
      - uses: actions/checkout@v4

      - name: Azure login
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      - name: Build and push to ACR
        run: |
          az acr build \
            --registry ${{ env.ACR_NAME }} \
            --image ${{ env.IMAGE_NAME }}:${{ github.sha }} \
            --image ${{ env.IMAGE_NAME }}:latest \
            .

      - name: Update Container App Job image
        run: |
          az containerapp job update \
            --name ${{ env.CONTAINER_JOB_NAME }} \
            --resource-group ${{ env.RESOURCE_GROUP }} \
            --image ${{ env.ACR_NAME }}.azurecr.io/${{ env.IMAGE_NAME }}:${{ github.sha }}
```

---

## Azure DevOps — YAML Pipeline (Functions)

```yaml
# azure-pipelines.yml
trigger:
  branches:
    include:
      - main

variables:
  buildConfiguration: Release
  dotnetVersion: 8.0.x
  functionAppName: graph-file-intelligence
  azureServiceConnection: azure-prod

pool:
  vmImage: ubuntu-latest

stages:
  - stage: Build
    jobs:
      - job: BuildAndTest
        steps:
          - task: UseDotNet@2
            inputs:
              version: $(dotnetVersion)

          - script: dotnet restore
            displayName: Restore

          - script: dotnet build -c $(buildConfiguration) --no-restore
            displayName: Build

          - script: dotnet test --no-build --logger trx --results-directory $(Agent.TempDirectory)/TestResults
            displayName: Test

          - task: PublishTestResults@2
            inputs:
              testResultsFormat: VSTest
              testResultsFiles: '$(Agent.TempDirectory)/TestResults/*.trx'

          - script: dotnet publish -c $(buildConfiguration) -o $(Build.ArtifactStagingDirectory)/publish --no-restore
            displayName: Publish

          - task: PublishPipelineArtifact@1
            inputs:
              targetPath: $(Build.ArtifactStagingDirectory)/publish
              artifact: functions-package

  - stage: Deploy
    dependsOn: Build
    condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
    jobs:
      - deployment: DeployFunctions
        environment: production
        strategy:
          runOnce:
            deploy:
              steps:
                - task: AzureFunctionApp@2
                  inputs:
                    connectedServiceNameARM: $(azureServiceConnection)
                    appType: functionAppLinux
                    appName: $(functionAppName)
                    package: $(Pipeline.Workspace)/functions-package
                    runtimeStack: DOTNET-ISOLATED|8.0
                    deploymentMethod: zipDeploy
```

---

## Infrastructure as Code — Bicep (Functions)

```bicep
// infra/main.bicep
param location string = resourceGroup().location
param appName string = 'graph-file-intelligence'
param tenantRootUrl string

var storageAccountName = replace('st${appName}', '-', '')
var functionAppName = 'func-${appName}'
var appServicePlanName = 'asp-${appName}'
var appInsightsName = 'ai-${appName}'

// Storage account
resource storage 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: storageAccountName
  location: location
  sku: { name: 'Standard_LRS' }
  kind: 'StorageV2'
}

// App Insights
resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: appInsightsName
  location: location
  kind: 'web'
  properties: { Application_Type: 'web' }
}

// Consumption plan
resource appServicePlan 'Microsoft.Web/serverfarms@2022-09-01' = {
  name: appServicePlanName
  location: location
  sku: { name: 'Y1', tier: 'Dynamic' }
  kind: 'linux'
  properties: { reserved: true }
}

// Function App
resource functionApp 'Microsoft.Web/sites@2022-09-01' = {
  name: functionAppName
  location: location
  kind: 'functionapp,linux'
  identity: { type: 'SystemAssigned' }  // ManagedIdentity
  properties: {
    serverFarmId: appServicePlan.id
    siteConfig: {
      linuxFxVersion: 'DOTNET-ISOLATED|8.0'
      appSettings: [
        { name: 'AzureWebJobsStorage', value: 'DefaultEndpointsProtocol=https;AccountName=${storageAccountName};...' }
        { name: 'FUNCTIONS_WORKER_RUNTIME', value: 'dotnet-isolated' }
        { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', value: appInsights.properties.ConnectionString }
        { name: 'GRAPH_TENANT_ROOT_URL', value: tenantRootUrl }
        { name: 'SCAN_OUTPUT_CONTAINER', value: 'sp-reports' }
      ]
    }
  }
}

output functionAppPrincipalId string = functionApp.identity.principalId
output functionAppName string = functionApp.name
```

---

## Assign Graph Permissions Post-Deployment

After deploying, run this script to grant the Function App's Managed Identity the required
Microsoft Graph app roles:

```bash
#!/bin/bash
# assign-graph-roles.sh
# Usage: ./assign-graph-roles.sh <principalId> <roleName>...

PRINCIPAL_ID=$1
shift
GRAPH_SP_ID=$(az ad sp show --id "00000003-0000-0000-c000-000000000000" --query id -o tsv)

for ROLE in "$@"; do
  ROLE_ID=$(az ad sp show --id "00000003-0000-0000-c000-000000000000" \
    --query "appRoles[?value=='$ROLE'].id | [0]" -o tsv)

  az rest --method POST \
    --uri "https://graph.microsoft.com/v1.0/servicePrincipals/$PRINCIPAL_ID/appRoleAssignments" \
    --body "{
      \"principalId\": \"$PRINCIPAL_ID\",
      \"resourceId\": \"$GRAPH_SP_ID\",
      \"appRoleId\": \"$ROLE_ID\"
    }"
  echo "Assigned $ROLE"
done

# Example:
# ./assign-graph-roles.sh <principalId> Sites.Read.All Files.Read.All User.Read.All
```
