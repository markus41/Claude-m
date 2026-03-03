# Azure App Service — App Service Plans

## Overview

An App Service Plan defines the compute region, number of VM instances, and the pricing tier (SKU) that determines available features, scale limits, and cost. Every App Service app (web app, Function App, Logic App) runs in an App Service Plan. Multiple apps can share one plan — they share the same VM instances and pay for the plan, not per-app.

---

## REST API Endpoints

Base URL: `https://management.azure.com`
API Version: `2023-12-01`

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|----------------------|----------------|-------|
| PUT | `/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Web/serverfarms/{planName}` | Web Plan Contributor | Body: plan definition | Create or update App Service Plan |
| GET | `/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Web/serverfarms/{planName}` | Reader | — | Get plan details including current SKU |
| GET | `/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Web/serverfarms` | Reader | — | List plans in resource group |
| DELETE | `/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Web/serverfarms/{planName}` | Web Plan Contributor | — | Delete plan (all apps must be removed first) |
| GET | `/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Web/serverfarms/{planName}/sites` | Reader | — | List all apps in the plan |
| POST | `/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Web/serverfarms/{planName}/restartSites` | Website Contributor | — | Restart all apps in the plan |
| GET | `/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Web/serverfarms/{planName}/usages` | Reader | — | Get current usage metrics for the plan |
| GET | `/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Web/serverfarms/{planName}/skus` | Reader | — | List available upgrade SKUs for the plan |

---

## SKU Tiers — Complete Reference

### Linux and Windows Tiers

| Tier | SKU Names | Instances | Custom Domain | SSL | Slots | Auto-Scale | VNet | Price Basis |
|------|-----------|-----------|---------------|-----|-------|-----------|------|-------------|
| Free | F1 | 1 (shared) | No | No | 0 | No | No | Free |
| Shared | D1 | 1 (shared) | Yes | No | 0 | No | No | ~$0.013/hr |
| Basic | B1, B2, B3 | 1-3 (dedicated) | Yes | SNI SSL | 0 | No | No | ~$0.075/hr (B1) |
| Standard | S1, S2, S3 | 1-10 (dedicated) | Yes | SNI SSL | 5 | Yes | Yes (regional) | ~$0.10/hr (S1) |
| Premium v2 | P1v2, P2v2, P3v2 | 1-20 (dedicated) | Yes | SNI SSL | 20 | Yes | Yes (regional) | ~$0.20/hr (P1v2) |
| Premium v3 | P0v3, P1v3, P1mv3, P2v3, P2mv3, P3v3, P3mv3 | 1-30 (dedicated) | Yes | SNI SSL | 20 | Yes | Yes (regional) | ~$0.173/hr (P1v3) |
| Isolated v1 | I1, I2, I3 | 1-100 (ASE) | Yes | SNI SSL | 20 | Yes | ASE (dedicated) | ~$0.30/hr + ASE |
| Isolated v2 | I1v2, I2v2, I3v2, I4v2, I5v2, I6v2 | 1-100 (ASE) | Yes | SNI SSL | 20 | Yes | ASE (dedicated) | ~$0.40/hr (I1v2) + ASE |

**`m` suffix SKUs** (e.g., P1mv3, P2mv3): Memory-optimized variants with more RAM. P1mv3 = 3.5 GB RAM vs P1v3 = 3.5 GB (similar — check current docs for exact specs).

**Premium v3 vCPU/Memory**:
| SKU | vCPU | Memory | SSD Storage |
|-----|------|--------|------------|
| P0v3 | 1 | 4 GB | 250 GB |
| P1v3 | 2 | 8 GB | 250 GB |
| P2v3 | 4 | 16 GB | 250 GB |
| P3v3 | 8 | 32 GB | 250 GB |

---

## Create App Service Plan (JSON)

### Linux Plan (Standard S1)

```json
PUT /subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Web/serverfarms/my-plan?api-version=2023-12-01
{
  "location": "eastus",
  "sku": {
    "name": "S1",
    "tier": "Standard",
    "size": "S1",
    "family": "S",
    "capacity": 1
  },
  "kind": "linux",
  "properties": {
    "reserved": true,
    "perSiteScaling": false,
    "maximumElasticWorkerCount": 1,
    "isSpot": false,
    "zoneRedundant": false
  }
}
```

**Key: `reserved: true` is mandatory for Linux plans.** For Windows plans, omit both `kind` and `reserved`.

### Premium v3 Plan with Zone Redundancy

```json
{
  "location": "eastus",
  "sku": {
    "name": "P1v3",
    "tier": "PremiumV3",
    "size": "P1v3",
    "family": "Pv3",
    "capacity": 3
  },
  "kind": "linux",
  "properties": {
    "reserved": true,
    "zoneRedundant": true,
    "perSiteScaling": false
  }
}
```

Zone redundancy requires **minimum 3 instances** and is only available in regions with Availability Zones support. `capacity: 3` is the minimum.

### Isolated v2 Plan (App Service Environment)

```json
{
  "location": "eastus",
  "sku": {
    "name": "I1v2",
    "tier": "IsolatedV2",
    "size": "I1v2",
    "family": "Iv2",
    "capacity": 1
  },
  "kind": "linux",
  "properties": {
    "reserved": true,
    "hostingEnvironmentProfile": {
      "id": "/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Web/hostingEnvironments/my-ase"
    }
  }
}
```

Isolated plans must reference an existing App Service Environment (ASE). The ASE provides the dedicated VNet-injected infrastructure.

---

## Bicep: App Service Plan

```bicep
@description('Location for all resources')
param location string = resourceGroup().location

@description('Plan name')
param planName string

@description('SKU tier')
@allowed(['Free', 'Shared', 'Basic', 'Standard', 'PremiumV2', 'PremiumV3', 'IsolatedV2'])
param tier string = 'PremiumV3'

@description('SKU name')
param skuName string = 'P1v3'

@description('Number of instances')
@minValue(1)
@maxValue(30)
param capacity int = 1

@description('Enable zone redundancy (minimum 3 instances required)')
param zoneRedundant bool = false

resource plan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: planName
  location: location
  sku: {
    name: skuName
    tier: tier
    capacity: capacity
  }
  kind: 'linux'
  properties: {
    reserved: true  // Required for Linux
    zoneRedundant: zoneRedundant
    perSiteScaling: false
  }
}

output planId string = plan.id
output planName string = plan.name
```

---

## Azure CLI: Plan Management

```bash
# Create Standard S1 Linux plan
az appservice plan create \
  --name my-plan \
  --resource-group rg-webapp \
  --location eastus \
  --sku S1 \
  --is-linux

# Create Premium v3 plan with zone redundancy (minimum 3 instances)
az appservice plan create \
  --name my-premium-plan \
  --resource-group rg-webapp \
  --location eastus \
  --sku P1V3 \
  --is-linux \
  --zone-redundant \
  --number-of-workers 3

# Scale plan to 5 instances
az appservice plan update \
  --name my-plan \
  --resource-group rg-webapp \
  --number-of-workers 5

# Upgrade plan SKU from S1 to P1v3
az appservice plan update \
  --name my-plan \
  --resource-group rg-webapp \
  --sku P1V3

# List plans in resource group
az appservice plan list \
  --resource-group rg-webapp \
  --output table

# Show plan details including current capacity
az appservice plan show \
  --name my-plan \
  --resource-group rg-webapp
```

---

## PowerShell: Plan Management

```powershell
# Create Standard S1 Linux plan
New-AzAppServicePlan `
  -ResourceGroupName "rg-webapp" `
  -Name "my-plan" `
  -Location "eastus" `
  -Tier "Standard" `
  -NumberofWorkers 1 `
  -WorkerSize "Small" `
  -Linux

# Scale to 3 instances
Set-AzAppServicePlan `
  -ResourceGroupName "rg-webapp" `
  -Name "my-plan" `
  -NumberofWorkers 3

# Get plan with usage metrics
$plan = Get-AzAppServicePlan -ResourceGroupName "rg-webapp" -Name "my-plan"
Write-Host "Current capacity: $($plan.Sku.Capacity)"
Write-Host "Maximum capacity: $($plan.MaximumNumberOfWorkers)"

# List all apps in the plan
Get-AzWebApp -AppServicePlan $plan | Select-Object Name, ResourceGroup, State
```

---

## App Service Environment (ASE v3)

ASE v3 is the fully isolated, single-tenant deployment of App Service within a customer's VNet. It hosts Isolated v2 (Iv2) App Service Plans.

**Key characteristics**:
| Feature | ASE v3 |
|---------|--------|
| VNet injection | Dedicated subnet (/24 minimum) |
| Inbound traffic | Private IP only (Internal Load Balancer) or public |
| Outbound traffic | Direct to internet or via firewall (UDR) |
| Pricing | Isolated v2 plan price + no stamp fee (v3 removed stamp fee) |
| Scale speed | ~20 minutes for new workers |
| DNS | Private DNS zone required for internal ASE |

**Create ASE v3 (ARM JSON)**:
```json
PUT /subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Web/hostingEnvironments/my-ase?api-version=2022-03-01
{
  "location": "eastus",
  "kind": "ASEV3",
  "properties": {
    "virtualNetwork": {
      "id": "/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Network/virtualNetworks/{vnet}/subnets/{subnet}"
    },
    "internalLoadBalancingMode": "Web, Publishing",
    "dedicatedHostCount": 0,
    "zoneRedundant": false
  }
}
```

**`internalLoadBalancingMode`**:
- `"None"` = external (public IP)
- `"Web, Publishing"` = internal (private IP only; requires private DNS zone `*.{asename}.appserviceenvironment.net`)

---

## Per-Site Scaling

Per-site scaling allows individual apps in a plan to have independent scale settings (overrides plan-level scaling).

```bash
# Enable per-site scaling on the plan
az appservice plan update \
  --name my-plan \
  --resource-group rg-webapp \
  --per-site-scaling true

# Set number of workers for a specific app (overrides plan default)
az webapp update \
  --name my-webapp \
  --resource-group rg-webapp \
  --number-of-workers 3
```

**Caution**: Per-site scaling increases complexity and billing. Each app's dedicated workers count against the plan's total capacity. Consider separate plans instead for completely isolated scaling.

---

## Error Codes Table

| Code | Meaning | Remediation |
|------|---------|-------------|
| `SkuNotAvailable` | Requested SKU not available in region | Check regional availability; try adjacent regions |
| `InvalidSkuForHostingEnvironment` | Non-Isolated SKU on ASE or vice versa | Isolated plans require ASE; standard plans cannot be in ASE |
| `ZoneRedundancyNotAvailable` | Zone redundancy not supported in region | Use a region with Availability Zones (East US, West EU, etc.) |
| `ZoneRedundancyRequiresMinimumWorkers` | Zone redundancy set but capacity < 3 | Set `capacity: 3` minimum when enabling zone redundancy |
| `CannotDeletePlanWithApps` | Delete attempted while apps still exist | Move or delete all apps in the plan first |
| `QuotaExceeded` | Subscription or region quota exceeded | Request quota increase via Azure Support; use different region |
| `ReservedNotSetForLinux` | Linux plan missing `reserved: true` | Add `"properties": { "reserved": true }` to plan body |
| `HostingEnvironmentNotReady` | ASE provisioning not complete | Wait 1-2 hours for ASE creation; check ASE status endpoint |

---

## Throttling Limits Table

| Resource | Limit | Retry Strategy |
|----------|-------|---------------|
| Apps per plan (Basic/Standard) | 10 apps per plan (recommended) | Create additional plans; use separate plans for critical apps |
| Apps per plan (Premium v3) | 100 apps per plan | Keep related apps together; separate high-traffic apps |
| Max instances (Standard) | 10 instances | Upgrade to Premium v3 for up to 30 instances |
| Max instances (Premium v3) | 30 instances | Upgrade to Isolated v2 for up to 100 instances |
| ARM write operations | 1,200/min per subscription | Batch infrastructure deployments; avoid rapid successive updates |
| Plan scale operation time | 2-5 minutes for scale-out | Pre-scale before anticipated traffic spikes |
| ASE scale time | 20 minutes per worker | Plan capacity ahead; use autoscale with buffer |

---

## Common Patterns and Gotchas

**1. Plan name is local, app names are global**
App Service Plan names are scoped to the resource group — they don't need to be globally unique. Web app names (the subdomain `*.azurewebsites.net`) must be globally unique. This asymmetry causes confusion when migrating environments.

**2. Free/Shared plans and Always On**
Free (F1) and Shared (D1) plans do NOT support the `alwaysOn` setting — apps spin down after 20 minutes of inactivity. Basic tier and above support Always On. For any production workload with latency requirements, use at least Basic tier.

**3. Linux vs Windows plan selection**
Linux and Windows plans cannot coexist in the same resource group in the same region (legacy limitation being phased out). Best practice: use separate resource groups for Linux and Windows workloads to avoid this constraint.

**4. Scale operations restart apps**
Scaling out (adding instances) does not restart existing instances. Scaling up (changing SKU) causes a brief cold restart of all apps in the plan. Schedule SKU upgrades during maintenance windows.

**5. Zone redundancy and data residency**
Zone-redundant plans spread instances across 3 Availability Zones within the region. This increases resilience to zone-level failures but does not replicate data across regions. For multi-region redundancy, combine with Azure Front Door or Traffic Manager.

**6. Premium v3 for Functions**
For Azure Functions requiring VNet integration, always-on behavior, unlimited timeout, and premium features, the EP (Elastic Premium) plan is the equivalent of Premium v3 but specifically for Functions. Standard P-series plans can host Function Apps but do not support the Elastic Premium autoscale model.
