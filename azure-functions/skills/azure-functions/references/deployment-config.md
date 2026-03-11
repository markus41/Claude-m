# Azure Functions — Deployment & Configuration

## Overview

Azure Functions supports four hosting plans with distinct scaling, timeout, and pricing models. Configuration is split between `host.json` (runtime behavior), `local.settings.json` (local dev only), and app settings (Azure portal / ARM). Deployment options include Azure CLI, GitHub Actions, Bicep/ARM, and the Azure Functions Core Tools.

---

## Hosting Plans Comparison

| Plan | Scaling | Max Timeout | Cold Start | vCPU | Memory | Use Case |
|------|---------|-------------|-----------|------|--------|----------|
| Consumption | Auto (0→N) | 10 min (default 5 min) | Yes | Shared | 1.5 GB | Infrequent, bursty workloads |
| Flex Consumption | Auto (0→N) | 60 min | Minimal | Configurable | 2–4 GB | Predictable scale, reduce cold starts |
| Premium (Elastic Premium) | Auto (min→N) | Unlimited | No (pre-warmed) | 1–4 vCPU | 3.5–14 GB | Always-on, VNet, unlimited timeout |
| Dedicated (App Service) | Manual / auto-scale rules | Unlimited | No | Per App Service Plan | Per plan | Predictable load, co-hosted apps |

**Flex Consumption** (GA 2024) is the recommended plan for new workloads: pay-per-use like Consumption but with configurable concurrency, faster scale, and optional pre-provisioned instances.

---

## REST API Endpoints (Function App Management)

Base URL: `https://management.azure.com`
API Version: `2023-01-01`

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|----------------------|----------------|-------|
| PUT | `/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Web/sites/{appName}` | Website Contributor | Body: site definition | Create or update Function App |
| GET | `/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Web/sites/{appName}` | Reader | — | Get Function App details |
| DELETE | `/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Web/sites/{appName}` | Contributor | — | Delete Function App |
| POST | `/.../sites/{appName}/config/appsettings/list` | Website Contributor | — | List app settings (returns values) |
| PUT | `/.../sites/{appName}/config/appsettings` | Website Contributor | Body: settings object | Update app settings |
| GET | `/.../sites/{appName}/config/web` | Reader | — | Get site configuration |
| PATCH | `/.../sites/{appName}/config/web` | Website Contributor | Body: partial config | Update site config |
| POST | `/.../sites/{appName}/restart` | Website Contributor | — | Restart Function App |
| POST | `/.../sites/{appName}/syncfunctiontriggers` | Website Contributor | — | Sync function triggers after deployment |

---

## Bicep: Complete Function App Deployment

```bicep
@description('Azure region for all resources')
param location string = resourceGroup().location

@description('Function App name (must be globally unique)')
param functionAppName string

@description('Storage account name')
param storageName string = 'st${uniqueString(resourceGroup().id)}'

@description('Hosting plan type')
@allowed(['Consumption', 'FlexConsumption', 'Premium'])
param planType string = 'FlexConsumption'

// Storage Account
resource storage 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: storageName
  location: location
  sku: { name: 'Standard_LRS' }
  kind: 'StorageV2'
  properties: {
    allowBlobPublicAccess: false
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
  }
}

// Log Analytics Workspace
resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: '${functionAppName}-law'
  location: location
  properties: {
    sku: { name: 'PerGB2018' }
    retentionInDays: 30
  }
}

// Application Insights
resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: '${functionAppName}-ai'
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalytics.id
    IngestionMode: 'LogAnalytics'
  }
}

// App Service Plan (Premium)
resource plan 'Microsoft.Web/serverfarms@2023-01-01' = if (planType == 'Premium') {
  name: '${functionAppName}-plan'
  location: location
  sku: { name: 'EP1', tier: 'ElasticPremium' }
  kind: 'elastic'
  properties: {
    maximumElasticWorkerCount: 20
  }
}

// Function App (Flex Consumption example)
resource functionApp 'Microsoft.Web/sites@2023-01-01' = {
  name: functionAppName
  location: location
  kind: 'functionapp,linux'
  identity: { type: 'SystemAssigned' }
  properties: {
    functionAppConfig: planType == 'FlexConsumption' ? {
      deployment: {
        storage: {
          type: 'blobContainer'
          value: '${storage.properties.primaryEndpoints.blob}deployments'
          authentication: { type: 'SystemAssignedIdentity' }
        }
      }
      scaleAndConcurrency: {
        instanceMemoryMB: 2048
        maximumInstanceCount: 40
      }
      runtime: {
        name: 'node'
        version: '20'
      }
    } : null
    serverFarmId: planType == 'Premium' ? plan.id : null
    siteConfig: planType != 'FlexConsumption' ? {
      linuxFxVersion: 'NODE|20'
      appSettings: [
        { name: 'AzureWebJobsStorage', value: 'DefaultEndpointsProtocol=https;AccountName=${storageName};...' }
        { name: 'FUNCTIONS_EXTENSION_VERSION', value: '~4' }
        { name: 'FUNCTIONS_WORKER_RUNTIME', value: 'node' }
        { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', value: appInsights.properties.ConnectionString }
        { name: 'WEBSITE_RUN_FROM_PACKAGE', value: '1' }
      ]
    } : null
    httpsOnly: true
  }
}

output functionAppName string = functionApp.name
output functionAppPrincipalId string = functionApp.identity.principalId
```

---

## host.json Reference

```json
{
  "version": "2.0",
  "logging": {
    "applicationInsights": {
      "samplingSettings": {
        "isEnabled": true,
        "maxTelemetryItemsPerSecond": 20,
        "excludedTypes": "Request"
      },
      "enableLiveMetricsFilters": true
    },
    "logLevel": {
      "default": "Warning",
      "Host.Results": "Error",
      "Function": "Information",
      "Host.Aggregator": "Trace"
    }
  },
  "functionTimeout": "00:10:00",
  "extensions": {
    "http": {
      "routePrefix": "api",
      "maxConcurrentRequests": 100,
      "maxOutstandingRequests": 200,
      "dynamicThrottlesEnabled": true
    },
    "queues": {
      "maxPollingInterval": "00:00:02",
      "visibilityTimeout": "00:00:30",
      "batchSize": 16,
      "maxDequeueCount": 5,
      "newBatchThreshold": 8,
      "messageEncoding": "base64"
    },
    "serviceBus": {
      "prefetchCount": 0,
      "maxConcurrentCalls": 16,
      "maxConcurrentSessions": 8,
      "autoCompleteMessages": true
    },
    "eventHubs": {
      "maxBatchSize": 64,
      "prefetchCount": 300,
      "batchCheckpointFrequency": 1
    }
  },
  "retry": {
    "strategy": "exponentialBackoff",
    "maxRetryCount": 3,
    "minimumInterval": "00:00:02",
    "maximumInterval": "00:00:30"
  },
  "healthMonitor": {
    "enabled": true,
    "healthCheckInterval": "00:00:10",
    "healthCheckWindow": "00:02:00",
    "healthCheckThreshold": 6,
    "counterThreshold": 0.80
  }
}
```

**`functionTimeout`**: `00:10:00` = 10 minutes (Consumption plan maximum). Set to `"00:00:00"` for unlimited on Premium/Dedicated.

---

## App Settings Reference

| Setting | Required | Description |
|---------|----------|-------------|
| `AzureWebJobsStorage` | Yes (non-Flex) | Storage connection for triggers/state; use managed identity on Flex |
| `FUNCTIONS_EXTENSION_VERSION` | Yes | Always `~4` for Functions v4 |
| `FUNCTIONS_WORKER_RUNTIME` | Yes | `node`, `dotnet-isolated`, `python`, `java`, `powershell` |
| `APPLICATIONINSIGHTS_CONNECTION_STRING` | Recommended | Application Insights connection string (preferred over key) |
| `WEBSITE_RUN_FROM_PACKAGE` | Recommended | `1` = run from ZIP package (read-only, reliable) |
| `WEBSITE_NODE_DEFAULT_VERSION` | Node.js | `~20` for Node.js 20 on Windows plans |
| `SCALE_CONTROLLER_LOGGING_ENABLED` | Debug | `AppInsights:Verbose` to log scale decisions |
| `WEBSITE_CONTENTAZUREFILECONNECTIONSTRING` | Consumption | Storage for function content (separate from AzureWebJobsStorage) |
| `WEBSITE_CONTENTSHARE` | Consumption | File share name for function content |
| `AzureWebJobsDisableHomepage` | Optional | `true` to disable default function homepage |
| `FUNCTIONS_V2_COMPATIBILITY_MODE` | Migration | `true` only during v3→v4 migrations |

---

## Deployment via Azure CLI

```bash
# Create resource group and storage
az group create --name rg-functions --location eastus
az storage account create --name stfuncsdemo --resource-group rg-functions \
  --sku Standard_LRS --kind StorageV2

# Create Application Insights
az monitor app-insights component create \
  --app func-ai \
  --location eastus \
  --resource-group rg-functions \
  --workspace /subscriptions/{sub}/resourceGroups/rg-functions/providers/Microsoft.OperationalInsights/workspaces/my-law

# Create Function App (Consumption, Linux, Node.js)
az functionapp create \
  --name my-func-app \
  --resource-group rg-functions \
  --storage-account stfuncsdemo \
  --consumption-plan-location eastus \
  --runtime node \
  --runtime-version 20 \
  --os-type linux \
  --functions-version 4 \
  --app-insights-key $(az monitor app-insights component show \
    --app func-ai --resource-group rg-functions --query instrumentationKey -o tsv)

# Deploy using ZIP deploy
func azure functionapp publish my-func-app --build remote

# Or via Azure CLI ZIP deploy
az functionapp deployment source config-zip \
  --name my-func-app \
  --resource-group rg-functions \
  --src ./dist/function-app.zip

# Update a single app setting
az functionapp config appsettings set \
  --name my-func-app \
  --resource-group rg-functions \
  --settings "MY_SETTING=value"

# Enable managed identity
az functionapp identity assign \
  --name my-func-app \
  --resource-group rg-functions
```

### Function App Management

```bash
# Show function app details
az functionapp show --name my-func-app --resource-group rg-functions
az functionapp show --name my-func-app --resource-group rg-functions \
  --query "{State:state, DefaultHostName:defaultHostName, Kind:kind, Runtime:siteConfig.linuxFxVersion}"

# List function apps in a resource group
az functionapp list --resource-group rg-functions --output table
az functionapp list --query "[?tags.environment=='production']" --output table

# Delete function app
az functionapp delete --name my-func-app --resource-group rg-functions

# Update function app properties
az functionapp update --name my-func-app --resource-group rg-functions \
  --set siteConfig.minTlsVersion=1.2

# Restart / start / stop
az functionapp restart --name my-func-app --resource-group rg-functions
az functionapp start --name my-func-app --resource-group rg-functions
az functionapp stop --name my-func-app --resource-group rg-functions
```

### Identity Management

```bash
# Assign system-assigned managed identity
az functionapp identity assign --name my-func-app --resource-group rg-functions

# Show identity details
az functionapp identity show --name my-func-app --resource-group rg-functions

# Assign user-assigned identity
az functionapp identity assign --name my-func-app --resource-group rg-functions \
  --identities /subscriptions/{sub}/resourceGroups/rg-functions/providers/Microsoft.ManagedIdentity/userAssignedIdentities/my-identity

# Remove identity
az functionapp identity remove --name my-func-app --resource-group rg-functions \
  --identities [system]
```

### Custom Domains

```bash
# Add custom hostname
az functionapp config hostname add --hostname www.contoso.com \
  --webapp-name my-func-app --resource-group rg-functions

# List hostnames
az functionapp config hostname list --webapp-name my-func-app \
  --resource-group rg-functions --output table

# Delete hostname
az functionapp config hostname delete --hostname www.contoso.com \
  --webapp-name my-func-app --resource-group rg-functions

# Bind SSL certificate
az functionapp config ssl bind --certificate-thumbprint <thumbprint> \
  --ssl-type SNI --name my-func-app --resource-group rg-functions
```

### CORS Configuration

```bash
# Add allowed origins
az functionapp cors add --name my-func-app --resource-group rg-functions \
  --allowed-origins "https://www.contoso.com" "https://app.contoso.com"

# Show CORS settings
az functionapp cors show --name my-func-app --resource-group rg-functions

# Remove origin
az functionapp cors remove --name my-func-app --resource-group rg-functions \
  --allowed-origins "https://old.contoso.com"

# Enable credentials
az functionapp cors credentials --name my-func-app --resource-group rg-functions \
  --enable true
```

### Diagnostic Settings

```bash
# Create diagnostic settings (send logs and metrics to Log Analytics)
az monitor diagnostic-settings create \
  --resource /subscriptions/{sub}/resourceGroups/rg-functions/providers/Microsoft.Web/sites/my-func-app \
  --name "func-diag" \
  --workspace /subscriptions/{sub}/resourceGroups/rg-functions/providers/Microsoft.OperationalInsights/workspaces/my-law \
  --logs '[{"categoryGroup":"allLogs","enabled":true}]' \
  --metrics '[{"category":"AllMetrics","enabled":true}]'
```

---

## GitHub Actions Deployment (OIDC)

```yaml
name: Deploy Azure Functions

on:
  push:
    branches: [main]

permissions:
  id-token: write
  contents: read

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Create deployment package
        run: |
          npm prune --production
          zip -r ../function-app.zip . -x "*.git*" "src/*" "*.ts" "jest*" ".eslint*"
        working-directory: ${{ github.workspace }}

      - name: Login to Azure (OIDC)
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      - name: Deploy to Azure Functions
        uses: azure/functions-action@v1
        with:
          app-name: my-func-app
          package: function-app.zip
          respect-funcignore: true
```

**Required GitHub secrets**: `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`.
**Required Azure setup**: App registration with federated credential; assign `Website Contributor` on the Function App.

---

## Deployment Slots

Deployment slots allow zero-downtime deployments with the ability to rollback instantly.

```bash
# Create staging slot
az functionapp deployment slot create \
  --name my-func-app \
  --resource-group rg-functions \
  --slot staging

# Deploy to staging slot
az functionapp deployment source config-zip \
  --name my-func-app \
  --resource-group rg-functions \
  --slot staging \
  --src ./dist/function-app.zip

# Swap staging → production
az webapp deployment slot swap \
  --name my-func-app \
  --resource-group rg-functions \
  --slot staging \
  --target-slot production
```

**Slot-sticky settings**: Mark environment-specific settings (like `SLOT_NAME` or slot-specific connection strings) as sticky via `az functionapp config appsettings set --slot-settings`. These do NOT swap — each slot retains its own value.

---

## Error Codes Table

| Code | Meaning | Remediation |
|------|---------|-------------|
| `FUNCTIONS_WORKER_RUNTIME mismatch` | Deployed code runtime differs from app setting | Update `FUNCTIONS_WORKER_RUNTIME` or rebuild for correct runtime |
| `WEBSITE_RUN_FROM_PACKAGE=1 but no package found` | Package URL or blob missing | Verify ZIP was uploaded; check storage permissions |
| `Could not find function with name` | Function not registered in host | Verify `df.app.*` or `app.*` registration; check entry point imports |
| `Host is unhealthy` | Health monitor threshold exceeded | Check CPU/memory spikes; increase `counterThreshold` temporarily |
| `409 Conflict (slot swap)` | Swap already in progress | Wait for active swap; check portal for pending operations |
| `403 on storage account` | Function identity lacks storage role | Assign `Storage Blob Data Owner` or `Storage Queue Data Contributor` |
| `The value for FUNCTIONS_EXTENSION_VERSION is invalid` | Wrong extension version | Must be `~4` (not `4` or `latest`) |
| `Remote build failed` | npm/pip errors during remote build | Check build logs via `az functionapp log deployment show` |

---

## Throttling Limits Table

| Resource | Limit | Retry Strategy |
|----------|-------|---------------|
| Consumption plan instances | ~200 concurrent instances per app | Use Premium for sustained high throughput |
| Flex Consumption max instances | 40 (default; configurable up to 1000) | Adjust `maximumInstanceCount` in `functionAppConfig` |
| Premium plan pre-warmed instances | 1–20 (set `preWarmedInstanceCount`) | Set pre-warmed = expected steady-state concurrency |
| ZIP deploy package size | 2 GB max | Split large apps; use `WEBSITE_RUN_FROM_PACKAGE` with blob URL |
| App settings count | 10,000 per Function App | Use Key Vault references for secrets; consolidate settings |
| ARM API: write operations | 1200/min per subscription | Batch Bicep deployments; avoid rapid successive deploys |
| Function App creation rate | ~10/min in a region | Stagger deployments across regions; use retry-after |

---

## Common Patterns and Gotchas

**1. `WEBSITE_RUN_FROM_PACKAGE=1` vs URL**
Setting `WEBSITE_RUN_FROM_PACKAGE=1` runs from the package uploaded via Kudu. Alternatively, set it to a blob SAS URL for remote package delivery. The `=1` approach is simpler for CI/CD but requires the package to be in the same storage account. Use a blob URL for air-gapped or cross-subscription scenarios.

**2. Node.js `dist/` in ZIP**
Always compile TypeScript before packaging. The ZIP must contain the compiled `dist/` output (or `lib/`), not TypeScript source. Include `package.json` and `node_modules` in the ZIP (or use remote build for dependency installation).

**3. Extension bundle vs NuGet packages**
For Node.js/Python, use extension bundles (configured in `host.json`). For .NET isolated, add NuGet packages directly. Never mix bundle and NuGet — they are mutually exclusive.

**4. Consumption plan cold start mitigation**
Cold starts are caused by instance scale-to-zero. Mitigations: (a) use Premium plan with pre-warmed instances, (b) use Flex Consumption with `alwaysReady` configuration, (c) keep function packages small (< 10 MB) for faster startup.

**5. Managed identity for storage (no connection string)**
On Flex Consumption, AzureWebJobsStorage connection strings are not supported — must use managed identity. Set `AzureWebJobsStorage__blobServiceUri`, `AzureWebJobsStorage__queueServiceUri`, `AzureWebJobsStorage__tableServiceUri`. Assign `Storage Blob Data Owner` + `Storage Queue Data Contributor` + `Storage Table Data Contributor` to the function's identity.

**6. Deployment order matters**
When deploying multiple apps that depend on each other (e.g., function app + API management), deploy infrastructure (storage, service bus, key vault) first, then assign RBAC, then deploy the function app. A function app that starts before its dependencies are ready will fail health checks.

**7. `syncfunctiontriggers` after ZIP deploy**
After a ZIP deploy via ARM API (not `func` CLI), you must call `POST .../syncfunctiontriggers` to refresh the host's trigger list. The `func` CLI does this automatically; direct ARM deploys do not.
