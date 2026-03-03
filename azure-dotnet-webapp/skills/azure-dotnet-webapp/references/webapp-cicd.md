# App Service Deployment — Bicep, GitHub Actions, Azure DevOps, Slots

## Bicep — App Service Plan + Web App

```bicep
// main.bicep
@description('Base name for all resources')
param appName string

@description('Azure region')
param location string = resourceGroup().location

@description('App Service Plan SKU')
@allowed(['B1', 'B2', 'B3', 'P0v3', 'P1v3', 'P2v3', 'P3v3'])
param sku string = 'B1'

@description('Runtime stack')
param linuxFxVersion string = 'DOTNETCORE|8.0'

@description('Entra tenant ID for auth')
param tenantId string

@description('Entra app registration client ID')
param clientId string

// ── App Service Plan ─────────────────────────────────────────
resource appServicePlan 'Microsoft.Web/serverfarms@2023-01-01' = {
  name: '${appName}-plan'
  location: location
  kind: 'linux'
  sku: {
    name: sku
  }
  properties: {
    reserved: true // required for Linux
  }
}

// ── Application Insights ─────────────────────────────────────
resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: '${appName}-ai'
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    RetentionInDays: 90
  }
}

// ── Key Vault ────────────────────────────────────────────────
resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: '${appName}-kv'
  location: location
  properties: {
    sku: { family: 'A', name: 'standard' }
    tenantId: subscription().tenantId
    enableRbacAuthorization: true
    softDeleteRetentionInDays: 7
  }
}

// ── Web App ──────────────────────────────────────────────────
resource webApp 'Microsoft.Web/sites@2023-01-01' = {
  name: appName
  location: location
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: linuxFxVersion
      minTlsVersion: '1.2'
      ftpsState: 'Disabled'
      alwaysOn: sku != 'B1' // B1 doesn't support Always On
      appSettings: [
        {
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: appInsights.properties.ConnectionString
        }
        {
          name: 'ApplicationInsightsAgent_EXTENSION_VERSION'
          value: '~3'
        }
        {
          name: 'ASPNETCORE_ENVIRONMENT'
          value: 'Production'
        }
        {
          name: 'AzureAd__TenantId'
          value: tenantId
        }
        {
          name: 'AzureAd__ClientId'
          value: clientId
        }
        {
          name: 'KeyVaultName'
          value: keyVault.name
        }
      ]
    }
  }
}

// ── Key Vault RBAC — grant Web App Managed Identity read access ──
resource kvSecretReader 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(keyVault.id, webApp.id, 'Key Vault Secrets User')
  scope: keyVault
  properties: {
    roleDefinitionId: subscriptionResourceId(
      'Microsoft.Authorization/roleDefinitions',
      '4633458b-17de-408a-b874-0445c86b69e6') // Key Vault Secrets User
    principalId: webApp.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

// ── Staging Slot ─────────────────────────────────────────────
resource stagingSlot 'Microsoft.Web/sites/slots@2023-01-01' = {
  parent: webApp
  name: 'staging'
  location: location
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: linuxFxVersion
      appSettings: [
        {
          name: 'ASPNETCORE_ENVIRONMENT'
          value: 'Staging'
        }
      ]
    }
  }
}

output webAppName string = webApp.name
output webAppUrl string = 'https://${webApp.properties.defaultHostName}'
output stagingUrl string = 'https://${stagingSlot.properties.defaultHostName}'
output principalId string = webApp.identity.principalId
```

### Deploy Bicep

```bash
# Create resource group
az group create --name rg-webapp --location eastus

# What-if preview
az deployment group what-if \
  --resource-group rg-webapp \
  --template-file main.bicep \
  --parameters appName=mywebapp tenantId=$TENANT_ID clientId=$CLIENT_ID

# Deploy
az deployment group create \
  --resource-group rg-webapp \
  --template-file main.bicep \
  --parameters appName=mywebapp tenantId=$TENANT_ID clientId=$CLIENT_ID
```

---

## GitHub Actions — Build, Test, Deploy

```yaml
# .github/workflows/deploy.yml
name: Build and Deploy to Azure App Service

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  DOTNET_VERSION: '8.0.x'
  AZURE_WEBAPP_NAME: 'mywebapp'
  AZURE_WEBAPP_PACKAGE_PATH: './publish'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup .NET
        uses: actions/setup-dotnet@v4
        with:
          dotnet-version: ${{ env.DOTNET_VERSION }}

      - name: Restore
        run: dotnet restore

      - name: Build
        run: dotnet build --configuration Release --no-restore

      - name: Test
        run: dotnet test --no-build --configuration Release --verbosity normal --collect:"XPlat Code Coverage"

      - name: Publish
        run: dotnet publish --configuration Release --no-build --output ${{ env.AZURE_WEBAPP_PACKAGE_PATH }}

      - name: Upload artifact
        uses: actions/upload-artifact@v4
        with:
          name: webapp
          path: ${{ env.AZURE_WEBAPP_PACKAGE_PATH }}

  deploy-staging:
    needs: build
    runs-on: ubuntu-latest
    if: github.event_name == 'push'
    environment:
      name: staging
      url: ${{ steps.deploy.outputs.webapp-url }}
    steps:
      - name: Download artifact
        uses: actions/download-artifact@v4
        with:
          name: webapp
          path: ${{ env.AZURE_WEBAPP_PACKAGE_PATH }}

      - name: Deploy to staging slot
        id: deploy
        uses: azure/webapps-deploy@v3
        with:
          app-name: ${{ env.AZURE_WEBAPP_NAME }}
          slot-name: staging
          publish-profile: ${{ secrets.AZURE_WEBAPP_PUBLISH_PROFILE_STAGING }}
          package: ${{ env.AZURE_WEBAPP_PACKAGE_PATH }}

  swap-to-production:
    needs: deploy-staging
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    environment:
      name: production
      url: https://${{ env.AZURE_WEBAPP_NAME }}.azurewebsites.net
    steps:
      - name: Azure Login
        uses: azure/login@v2
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Swap slots
        run: |
          az webapp deployment slot swap \
            --resource-group rg-webapp \
            --name ${{ env.AZURE_WEBAPP_NAME }} \
            --slot staging \
            --target-slot production
```

---

## Azure DevOps — YAML Pipeline

```yaml
# azure-pipelines.yml
trigger:
  branches:
    include:
      - main

pool:
  vmImage: ubuntu-latest

variables:
  buildConfiguration: Release
  dotnetVersion: '8.0.x'
  webAppName: 'mywebapp'
  resourceGroup: 'rg-webapp'

stages:
- stage: Build
  jobs:
  - job: BuildAndTest
    steps:
    - task: UseDotNet@2
      inputs:
        packageType: sdk
        version: $(dotnetVersion)

    - script: dotnet restore
      displayName: Restore

    - script: dotnet build --configuration $(buildConfiguration) --no-restore
      displayName: Build

    - script: dotnet test --no-build --configuration $(buildConfiguration) --logger trx --results-directory $(Agent.TempDirectory)
      displayName: Test

    - task: PublishTestResults@2
      inputs:
        testResultsFormat: VSTest
        testResultsFiles: '$(Agent.TempDirectory)/**/*.trx'

    - script: dotnet publish --configuration $(buildConfiguration) --no-build --output $(Build.ArtifactStagingDirectory)/publish
      displayName: Publish

    - task: PublishBuildArtifacts@1
      inputs:
        pathToPublish: $(Build.ArtifactStagingDirectory)/publish
        artifactName: webapp

- stage: DeployStaging
  dependsOn: Build
  condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
  jobs:
  - deployment: DeployToStaging
    environment: staging
    strategy:
      runOnce:
        deploy:
          steps:
          - task: AzureWebApp@1
            inputs:
              azureSubscription: 'Azure Service Connection'
              appType: webAppLinux
              appName: $(webAppName)
              slotName: staging
              package: $(Pipeline.Workspace)/webapp

- stage: SwapToProduction
  dependsOn: DeployStaging
  jobs:
  - deployment: SwapSlots
    environment: production
    strategy:
      runOnce:
        deploy:
          steps:
          - task: AzureAppServiceManage@0
            inputs:
              azureSubscription: 'Azure Service Connection'
              action: Swap Slots
              webAppName: $(webAppName)
              resourceGroupName: $(resourceGroup)
              sourceSlot: staging
```

---

## Slot Swap — Zero-Downtime Deployment

```bash
# Deploy to staging slot
az webapp deploy \
  --resource-group rg-webapp \
  --name mywebapp \
  --slot staging \
  --src-path ./publish \
  --type zip

# Warm up staging slot (optional — check health endpoint)
curl https://mywebapp-staging.azurewebsites.net/health

# Swap staging → production
az webapp deployment slot swap \
  --resource-group rg-webapp \
  --name mywebapp \
  --slot staging \
  --target-slot production

# If something goes wrong — swap back
az webapp deployment slot swap \
  --resource-group rg-webapp \
  --name mywebapp \
  --slot production \
  --target-slot staging
```

### Sticky app settings (not swapped)

```bash
# Mark settings as slot-specific (not swapped with slot)
az webapp config appsettings set \
  --resource-group rg-webapp \
  --name mywebapp \
  --slot-settings ASPNETCORE_ENVIRONMENT ConnectionStrings__AzureSQL
```
