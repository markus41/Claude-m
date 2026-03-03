# Azure App Service — Deployment Slots

## Overview

Deployment slots are live web apps with their own hostnames. Each App Service app can have multiple deployment slots (in addition to the production slot). Slots enable zero-downtime deployments: deploy to a staging slot, validate, then swap staging into production atomically. The swap is nearly instantaneous from the user perspective — traffic routing changes in milliseconds.

Slots are available on Standard, Premium, and Isolated tiers. Standard allows 5 slots; Premium and Isolated allow 20 slots.

---

## REST API Endpoints

Base URL: `https://management.azure.com`
API Version: `2023-12-01`

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|----------------------|----------------|-------|
| PUT | `/.../sites/{appName}/slots/{slotName}` | Website Contributor | Body: slot definition | Create a deployment slot |
| GET | `/.../sites/{appName}/slots/{slotName}` | Reader | — | Get slot details |
| GET | `/.../sites/{appName}/slots` | Reader | — | List all slots |
| DELETE | `/.../sites/{appName}/slots/{slotName}` | Website Contributor | — | Delete a slot |
| POST | `/.../sites/{appName}/slotsswap` | Website Contributor | Body: swap config | Swap two slots |
| POST | `/.../sites/{appName}/slots/{slotName}/slotsswap` | Website Contributor | Body: swap config | Swap from named slot |
| POST | `/.../sites/{appName}/applySlotConfig` | Website Contributor | — | Apply production config to current slot |
| POST | `/.../sites/{appName}/resetSlotConfig` | Website Contributor | — | Reset slot config to auto-swap defaults |
| GET | `/.../sites/{appName}/operationresults/{operationId}` | Reader | — | Check async swap operation status |

**Full base path**: `/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Web/sites`

**Slot-specific endpoints** (replace `sites/{appName}` with `sites/{appName}/slots/{slotName}`):
- All site management endpoints apply to slots using `/slots/{slotName}` prefix
- Deploy to slot: `POST .../slots/{slotName}/deploy`
- Restart slot: `POST .../slots/{slotName}/restart`
- List slot app settings: `POST .../slots/{slotName}/config/appsettings/list`

---

## Create Deployment Slot

```json
PUT /subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Web/sites/{appName}/slots/staging?api-version=2023-12-01
{
  "location": "eastus",
  "properties": {
    "siteConfig": {
      "alwaysOn": true,
      "http20Enabled": true,
      "minTlsVersion": "1.2"
    },
    "httpsOnly": true
  }
}
```

The slot inherits the production app's configuration by default. App settings and connection strings can be overridden per-slot.

---

## Swap Operations

### Standard Swap (Staging → Production)

```json
POST /subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Web/sites/{appName}/slotsswap?api-version=2023-12-01
{
  "targetSlot": "production",
  "preserveVnet": true
}
```

**Swap behavior**:
1. Health check: App Service verifies the source slot responds on the health check path (if configured).
2. Warm-up: Instances in the source slot are warmed up by triggering `applicationInitialization` or health check endpoint.
3. Route switch: Incoming traffic is rerouted from the target to the source slot instantly.
4. Config swap: Non-sticky settings swap with the slots.

**`preserveVnet: true`**: Keeps each slot's VNet integration settings after swap (recommended to avoid routing disruption).

### Swap with Preview (Multi-Phase Swap)

Phase 1: Apply target slot's configuration to source slot (without routing traffic).
Phase 2: Complete the swap (route traffic) or cancel (revert configuration).

```bash
# Phase 1: Apply production config to staging
az webapp deployment slot swap \
  --name my-app \
  --resource-group rg-webapp \
  --slot staging \
  --target-slot production \
  --action preview

# Validate staging with production config applied
curl https://my-app-staging.azurewebsites.net/health

# Phase 2a: Complete swap
az webapp deployment slot swap \
  --name my-app \
  --resource-group rg-webapp \
  --slot staging \
  --target-slot production \
  --action swap

# Phase 2b: Cancel swap (revert staging config)
az webapp deployment slot swap \
  --name my-app \
  --resource-group rg-webapp \
  --slot staging \
  --target-slot production \
  --action reset
```

---

## Auto-Swap Configuration

Auto-swap automatically swaps a slot into the target slot after a successful deployment. Used in fully automated CI/CD pipelines.

**Enable auto-swap** (update slot configuration):
```json
PATCH /subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Web/sites/{appName}/slots/staging/config/web?api-version=2023-12-01
{
  "properties": {
    "autoSwapSlotName": "production"
  }
}
```

**Disable auto-swap**:
```json
{
  "properties": {
    "autoSwapSlotName": ""
  }
}
```

**`autoSwapSlotName`**: Name of the target slot. Set to empty string to disable. Auto-swap triggers after any deployment to the slot (ZIP deploy, Git push, container pull).

**Warning**: Auto-swap bypasses manual validation. Only use in pipelines with automated smoke tests that run before declaring the deployment successful.

---

## Slot-Sticky App Settings

Slot-sticky settings do NOT swap with the slot — each slot retains its own value after a swap. Use for environment-specific configuration like database connection strings, API keys, or the slot name itself.

### Mark Setting as Sticky via ARM

```json
POST /subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Web/sites/{appName}/config/slotConfigNames?api-version=2023-12-01
{
  "appSettingNames": [
    "SLOT_NAME",
    "DB_CONNECTION_STRING",
    "ENVIRONMENT"
  ],
  "connectionStringNames": [
    "DefaultConnection"
  ]
}
```

### Azure CLI: Sticky Settings

```bash
# Mark settings as slot-sticky when setting them
az webapp config appsettings set \
  --name my-app \
  --resource-group rg-webapp \
  --slot staging \
  --slot-settings SLOT_NAME=staging ENVIRONMENT=staging

# List sticky settings
az webapp config appsettings list \
  --name my-app \
  --resource-group rg-webapp \
  --slot staging \
  --query "[?slotSetting==true]"

# Get slot config names
az webapp config show \
  --name my-app \
  --resource-group rg-webapp \
  --query "siteConfig.stickySettings"
```

---

## Traffic Routing: Gradual Traffic Shifting

Gradually route a percentage of production traffic to a slot for canary deployments.

```json
POST /subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Web/sites/{appName}/config/web?api-version=2023-12-01
{
  "properties": {
    "experiments": {
      "rampUpRules": [
        {
          "actionHostName": "{appName}-staging.azurewebsites.net",
          "reroutePercentage": 10,
          "changeStep": 5,
          "changeIntervalInMinutes": 10,
          "minReroutePercentage": 0,
          "maxReroutePercentage": 50,
          "changeDecisionCallbackUrl": null,
          "name": "staging"
        }
      ]
    }
  }
}
```

**`reroutePercentage`**: Initial percentage of traffic sent to the named slot.
**`changeStep` + `changeIntervalInMinutes`**: Auto-increment traffic percentage over time.
**`changeDecisionCallbackUrl`**: Optional URL that returns `{ "TotalTrafficWeight": N }` to dynamically control traffic percentage.

```bash
# Route 20% to staging via CLI
az webapp traffic-routing set \
  --name my-app \
  --resource-group rg-webapp \
  --distribution staging=20
```

---

## Blue-Green Deployment Workflow

Complete zero-downtime deployment using slots:

```bash
# Step 1: Create staging slot (if not exists)
az webapp deployment slot create \
  --name my-app \
  --resource-group rg-webapp \
  --slot staging \
  --configuration-source my-app

# Step 2: Configure slot-sticky settings for staging
az webapp config appsettings set \
  --name my-app \
  --resource-group rg-webapp \
  --slot staging \
  --slot-settings SLOT_NAME=staging ENVIRONMENT=staging

# Step 3: Deploy new version to staging
az webapp deploy \
  --name my-app \
  --resource-group rg-webapp \
  --slot staging \
  --type zip \
  --src-path ./dist/app.zip

# Step 4: Verify staging is healthy
STAGING_URL=$(az webapp show \
  --name my-app \
  --resource-group rg-webapp \
  --slot staging \
  --query defaultHostName -o tsv)
curl -f "https://$STAGING_URL/health" || exit 1

# Step 5: Run smoke tests
npm run test:smoke -- --url "https://$STAGING_URL"

# Step 6: Swap staging to production
az webapp deployment slot swap \
  --name my-app \
  --resource-group rg-webapp \
  --slot staging \
  --target-slot production

# Step 7: Verify production (staging now has old production code)
curl -f "https://my-app.azurewebsites.net/health"

# Step 8 (rollback if needed): Swap back
az webapp deployment slot swap \
  --name my-app \
  --resource-group rg-webapp \
  --slot staging \
  --target-slot production
```

---

## Bicep: Slot Creation

```bicep
resource webApp 'Microsoft.Web/sites@2023-12-01' existing = {
  name: appName
}

resource stagingSlot 'Microsoft.Web/sites/slots@2023-12-01' = {
  parent: webApp
  name: 'staging'
  location: location
  properties: {
    siteConfig: {
      alwaysOn: true
      appSettings: [
        { name: 'SLOT_NAME', value: 'staging' }
        { name: 'ENVIRONMENT', value: 'staging' }
        { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', value: appInsightsConnectionString }
      ]
      minTlsVersion: '1.2'
      http20Enabled: true
    }
    httpsOnly: true
  }
}

// Mark settings as sticky
resource slotConfigNames 'Microsoft.Web/sites/config@2023-12-01' = {
  parent: webApp
  name: 'slotConfigNames'
  properties: {
    appSettingNames: ['SLOT_NAME', 'ENVIRONMENT']
    connectionStringNames: []
  }
}
```

---

## GitHub Actions: Blue-Green with Slots

```yaml
name: Deploy with Blue-Green

on:
  push:
    branches: [main]

permissions:
  id-token: write
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build application
        run: |
          npm ci
          npm run build
          zip -r app.zip dist/ package.json package-lock.json node_modules/

      - name: Login to Azure
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      - name: Deploy to staging slot
        uses: azure/webapps-deploy@v3
        with:
          app-name: my-app
          slot-name: staging
          package: app.zip

      - name: Wait for staging to warm up
        run: sleep 30

      - name: Run smoke tests against staging
        run: |
          STAGING_URL=$(az webapp show \
            --name my-app \
            --resource-group rg-webapp \
            --slot staging \
            --query defaultHostName -o tsv)
          curl -f "https://$STAGING_URL/health"
          npm run test:smoke -- --url "https://$STAGING_URL"

      - name: Swap staging to production
        run: |
          az webapp deployment slot swap \
            --name my-app \
            --resource-group rg-webapp \
            --slot staging \
            --target-slot production

      - name: Verify production health
        run: curl -f "https://my-app.azurewebsites.net/health"
```

---

## Error Codes Table

| Code | Meaning | Remediation |
|------|---------|-------------|
| `SlotSwapFailed: Health check failed` | Staging slot not responding on health check path | Verify app starts correctly; check health check path in slot config |
| `ConflictError: Slot swap already in progress` | Concurrent swap operation | Wait for pending swap; check portal for active swap operation |
| `SlotNotFound` | Slot name does not exist | Verify slot name; list slots with `GET .../slots` |
| `CannotSwapWithSelf` | Source and target slot are the same | Specify different source and target slots |
| `InvalidSlotsSwap` | Swap attempted on Free/Shared tier | Upgrade to Standard or above; slots require Standard+ tier |
| `GatewayTimeout during swap` | Warm-up exceeded timeout | Add Application Initialization to speed up warm-up; extend swap timeout |
| `AutoSwapFailed` | Auto-swap triggered but app not healthy | Check app logs in staging; verify health check returns 200 |

---

## Throttling Limits Table

| Resource | Limit | Retry Strategy |
|----------|-------|---------------|
| Slots per Standard plan app | 5 (including production) | Use staging + 1-2 test slots; avoid creating slots for every PR |
| Slots per Premium/Isolated plan app | 20 (including production) | Use separate slots for: staging, canary, A/B testing, feature flags |
| Swap operation duration | Variable (30s to 10 min depending on warm-up) | Monitor swap status via `operationresults` endpoint |
| Traffic routing max percentage | 100% | Use 0-100% range; cannot set negative or over 100 |
| ARM write operations | 1,200/min per subscription | Batch slot create/update operations |

---

## Common Patterns and Gotchas

**1. Health check endpoint is critical**
Configure a health check endpoint (`/health`) in the App Service settings before using slots. Without it, swap does not verify the new version is functional before routing traffic. The health check must return HTTP 200 for the swap to succeed.

**2. Sticky settings override during swap**
When you swap slots, non-sticky settings move with the code. If you store environment indicators (like `ENVIRONMENT=production`) as non-sticky settings, they will swap to staging after the swap. Always mark environment-specific settings as sticky.

**3. Warm-up with Application Initialization**
For apps with long startup times (loading caches, establishing connections), configure Application Initialization in the slot's `applicationInitialization` web.config section or App Service settings. The swap waits for warm-up to complete before routing traffic.

**4. Database migrations before swap**
Never run database migrations as part of app startup — they will run in staging AND production in sequence during a swap if both slots share a database. Run migrations as a separate pre-deployment step against the production database before the swap.

**5. Rollback window**
After swapping, the old production code is now in the staging slot. You have a fast rollback window until you deploy new code to staging. Track which commit is in each slot to know what you're rolling back to.

**6. Slot URL vs custom domain**
Slots get automatic hostnames: `{appName}-{slotName}.azurewebsites.net`. Custom domains can also be bound to slots (bind the domain to the slot, not the production app). After a swap, custom domain bindings do NOT swap — they stay with the slot. Plan your custom domain strategy accordingly for preview/staging URLs.
