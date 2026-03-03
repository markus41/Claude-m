# Azure App Service — Scaling & Autoscale

## Overview

Azure App Service supports two dimensions of scaling: scaling up (changing the SKU to get more CPU/memory per instance) and scaling out (adding more instances). Auto-scale rules on Standard tier and above automatically add or remove instances based on metrics (CPU, memory, HTTP queue length) or schedules. For apps requiring elastic scale beyond standard limits, Premium v3 or Isolated v2 plans provide higher instance counts.

---

## REST API Endpoints

Base URL: `https://management.azure.com`

### Manual Scaling

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|----------------------|----------------|-------|
| PATCH | `/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Web/serverfarms/{planName}` | Web Plan Contributor | `sku.capacity` | Update instance count directly |
| GET | `/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Web/serverfarms/{planName}` | Reader | — | Get current capacity |
| POST | `/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Web/sites/{appName}/config/web` | Website Contributor | — | Configure app-level settings |

### Autoscale Settings

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|----------------------|----------------|-------|
| PUT | `/subscriptions/{sub}/resourceGroups/{rg}/providers/microsoft.insights/autoscalesettings/{settingName}` | Monitoring Contributor | Body: autoscale definition | Create or update autoscale rules |
| GET | `/subscriptions/{sub}/resourceGroups/{rg}/providers/microsoft.insights/autoscalesettings/{settingName}` | Monitoring Reader | — | Get autoscale configuration |
| GET | `/subscriptions/{sub}/resourceGroups/{rg}/providers/microsoft.insights/autoscalesettings` | Monitoring Reader | — | List autoscale settings in resource group |
| DELETE | `/subscriptions/{sub}/resourceGroups/{rg}/providers/microsoft.insights/autoscalesettings/{settingName}` | Monitoring Contributor | — | Delete autoscale settings |

---

## Manual Scaling

### Scale Up (Change SKU)

```bash
# Scale up from S1 to P1v3
az appservice plan update \
  --name my-plan \
  --resource-group rg-webapp \
  --sku P1V3

# Scale up via ARM JSON
PATCH /subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Web/serverfarms/my-plan
{
  "sku": {
    "name": "P1v3",
    "tier": "PremiumV3",
    "capacity": 2
  }
}
```

### Scale Out (Increase Instance Count)

```bash
# Immediately scale to 5 instances
az appservice plan update \
  --name my-plan \
  --resource-group rg-webapp \
  --number-of-workers 5
```

---

## Autoscale Configuration

### Complete Autoscale Rule Set (ARM JSON)

```json
PUT /subscriptions/{sub}/resourceGroups/{rg}/providers/microsoft.insights/autoscalesettings/my-app-autoscale?api-version=2022-10-01
{
  "location": "eastus",
  "properties": {
    "name": "my-app-autoscale",
    "enabled": true,
    "targetResourceUri": "/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Web/serverfarms/my-plan",
    "profiles": [
      {
        "name": "Auto created scale condition",
        "capacity": {
          "minimum": "2",
          "maximum": "10",
          "default": "2"
        },
        "rules": [
          {
            "metricTrigger": {
              "metricName": "CpuPercentage",
              "metricNamespace": "microsoft.web/serverfarms",
              "metricResourceUri": "/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Web/serverfarms/my-plan",
              "timeGrain": "PT1M",
              "statistic": "Average",
              "timeWindow": "PT10M",
              "timeAggregation": "Average",
              "operator": "GreaterThan",
              "threshold": 70
            },
            "scaleAction": {
              "direction": "Increase",
              "type": "ChangeCount",
              "value": "2",
              "cooldown": "PT5M"
            }
          },
          {
            "metricTrigger": {
              "metricName": "CpuPercentage",
              "metricNamespace": "microsoft.web/serverfarms",
              "metricResourceUri": "/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Web/serverfarms/my-plan",
              "timeGrain": "PT1M",
              "statistic": "Average",
              "timeWindow": "PT10M",
              "timeAggregation": "Average",
              "operator": "LessThan",
              "threshold": 30
            },
            "scaleAction": {
              "direction": "Decrease",
              "type": "ChangeCount",
              "value": "1",
              "cooldown": "PT10M"
            }
          }
        ]
      }
    ],
    "notifications": [
      {
        "operation": "Scale",
        "email": {
          "sendToSubscriptionAdministrator": false,
          "sendToSubscriptionCoAdministrators": false,
          "customEmails": ["ops@example.com"]
        },
        "webhooks": [
          {
            "serviceUri": "https://my-webhook.example.com/autoscale",
            "properties": {}
          }
        ]
      }
    ]
  }
}
```

---

## Autoscale Metric Options

| Metric Name | Namespace | Description | Scale Trigger |
|-------------|-----------|-------------|--------------|
| `CpuPercentage` | `microsoft.web/serverfarms` | CPU usage across all instances (plan-level) | Scale out > 70% for 10 min |
| `MemoryPercentage` | `microsoft.web/serverfarms` | Memory usage across all instances (plan-level) | Scale out > 80% for 10 min |
| `HttpQueueLength` | `microsoft.web/serverfarms` | HTTP requests queued waiting for instances | Scale out > 100 for 5 min |
| `DiskQueueLength` | `microsoft.web/serverfarms` | I/O requests queued | Scale out > 100 for 5 min |
| `BytesReceived` | `microsoft.web/sites` | Incoming network bytes per app | Traffic-based scaling |
| `Requests` | `microsoft.web/sites` | HTTP request count per app | RPS-based scaling |
| `AverageResponseTime` | `microsoft.web/sites` | Average response time per app | Latency-based scaling |

**Note**: Plan-level metrics (`microsoft.web/serverfarms`) are best for autoscale — they represent aggregate load across all instances. App-level metrics (`microsoft.web/sites`) are aggregated across all instances of that app.

---

## Scale Action Types

| Type | Description | `value` Meaning |
|------|-------------|----------------|
| `ChangeCount` | Add/remove N instances | Number of instances to add/remove |
| `PercentChangeCount` | Add/remove by percentage of current count | Percentage (e.g., `"50"` = add 50% more) |
| `ExactCount` | Scale to exactly N instances | Target instance count |
| `ServiceAllowedNextValue` | Scale to the next allowed value | Not applicable (value ignored) |

---

## Scale-Out Triggers and Cool-Down

```json
"scaleAction": {
  "direction": "Increase",
  "type": "ChangeCount",
  "value": "1",
  "cooldown": "PT5M"
}
```

**`cooldown`**: ISO 8601 duration. After a scale-out action, no further scale-out triggers for this duration. Prevents rapid successive scale-outs. Minimum is `PT1M`.

**Recommended cool-down periods**:
| Action | Recommended Cool-Down |
|--------|----------------------|
| Scale-out | 5 minutes (`PT5M`) |
| Scale-in | 10-15 minutes (`PT10M` or `PT15M`) |

Scale-in cool-down should be longer than scale-out to prevent thrashing (repeatedly adding/removing instances).

---

## Scheduled Autoscale Profiles

Use scheduled profiles to pre-scale before anticipated load (e.g., business hours, weekly batch jobs).

```json
"profiles": [
  {
    "name": "Business Hours",
    "capacity": {
      "minimum": "4",
      "maximum": "20",
      "default": "4"
    },
    "rules": [],
    "recurrence": {
      "frequency": "Week",
      "schedule": {
        "timeZone": "Eastern Standard Time",
        "days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        "hours": [8],
        "minutes": [0]
      }
    }
  },
  {
    "name": "Off Hours",
    "capacity": {
      "minimum": "1",
      "maximum": "5",
      "default": "1"
    },
    "rules": [],
    "recurrence": {
      "frequency": "Week",
      "schedule": {
        "timeZone": "Eastern Standard Time",
        "days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        "hours": [19],
        "minutes": [0]
      }
    }
  },
  {
    "name": "Weekend",
    "capacity": {
      "minimum": "1",
      "maximum": "3",
      "default": "1"
    },
    "rules": [],
    "recurrence": {
      "frequency": "Week",
      "schedule": {
        "timeZone": "Eastern Standard Time",
        "days": ["Saturday", "Sunday"],
        "hours": [0],
        "minutes": [0]
      }
    }
  }
]
```

**Note**: Multiple profiles can coexist — scheduled profiles take priority over the default profile when active.

---

## Bicep: Autoscale Settings

```bicep
param planName string
param planId string
param location string = resourceGroup().location

resource autoscale 'microsoft.insights/autoscalesettings@2022-10-01' = {
  name: '${planName}-autoscale'
  location: location
  properties: {
    enabled: true
    targetResourceUri: planId
    profiles: [
      {
        name: 'Default'
        capacity: {
          minimum: '2'
          maximum: '10'
          default: '2'
        }
        rules: [
          {
            metricTrigger: {
              metricName: 'CpuPercentage'
              metricNamespace: 'microsoft.web/serverfarms'
              metricResourceUri: planId
              timeGrain: 'PT1M'
              statistic: 'Average'
              timeWindow: 'PT10M'
              timeAggregation: 'Average'
              operator: 'GreaterThan'
              threshold: 70
            }
            scaleAction: {
              direction: 'Increase'
              type: 'ChangeCount'
              value: '2'
              cooldown: 'PT5M'
            }
          }
          {
            metricTrigger: {
              metricName: 'CpuPercentage'
              metricNamespace: 'microsoft.web/serverfarms'
              metricResourceUri: planId
              timeGrain: 'PT1M'
              statistic: 'Average'
              timeWindow: 'PT10M'
              timeAggregation: 'Average'
              operator: 'LessThan'
              threshold: 30
            }
            scaleAction: {
              direction: 'Decrease'
              type: 'ChangeCount'
              value: '1'
              cooldown: 'PT10M'
            }
          }
        ]
      }
    ]
    notifications: [
      {
        operation: 'Scale'
        email: {
          sendToSubscriptionAdministrator: false
          customEmails: ['ops@example.com']
        }
      }
    ]
  }
}
```

---

## Azure CLI: Autoscale Management

```bash
# Enable autoscale with CPU-based rules
az monitor autoscale create \
  --resource-group rg-webapp \
  --resource my-plan \
  --resource-type Microsoft.Web/serverfarms \
  --name my-app-autoscale \
  --min-count 2 \
  --max-count 10 \
  --count 2

# Add scale-out rule (CPU > 70%)
az monitor autoscale rule create \
  --resource-group rg-webapp \
  --autoscale-name my-app-autoscale \
  --condition "CpuPercentage > 70 avg 10m" \
  --scale out 2 \
  --cooldown 5

# Add scale-in rule (CPU < 30%)
az monitor autoscale rule create \
  --resource-group rg-webapp \
  --autoscale-name my-app-autoscale \
  --condition "CpuPercentage < 30 avg 10m" \
  --scale in 1 \
  --cooldown 10

# Add scheduled profile for business hours
az monitor autoscale profile create \
  --resource-group rg-webapp \
  --autoscale-name my-app-autoscale \
  --name "BusinessHours" \
  --timezone "Eastern Standard Time" \
  --start 08:00 \
  --end 19:00 \
  --recurrence week mon tue wed thu fri \
  --min-count 4 \
  --max-count 20 \
  --count 4

# View autoscale history
az monitor autoscale show \
  --resource-group rg-webapp \
  --name my-app-autoscale

# Disable autoscale (keep rules, stop evaluating)
az monitor autoscale update \
  --resource-group rg-webapp \
  --name my-app-autoscale \
  --enabled false
```

---

## PowerShell: Autoscale

```powershell
# Create autoscale profile with CPU rules
$planId = "/subscriptions/{sub}/resourceGroups/rg-webapp/providers/Microsoft.Web/serverfarms/my-plan"

$scaleOutRule = New-AzAutoscaleRuleObject `
  -MetricName "CpuPercentage" `
  -MetricNamespace "microsoft.web/serverfarms" `
  -MetricResourceUri $planId `
  -Operator GreaterThan `
  -Threshold 70 `
  -TimeWindow ([System.TimeSpan]::FromMinutes(10)) `
  -TimeAggregation Average `
  -Statistic Average `
  -TimeGrain ([System.TimeSpan]::FromMinutes(1)) `
  -ScaleActionDirection Increase `
  -ScaleActionType ChangeCount `
  -ScaleActionValue 2 `
  -ScaleActionCooldown ([System.TimeSpan]::FromMinutes(5))

$scaleInRule = New-AzAutoscaleRuleObject `
  -MetricName "CpuPercentage" `
  -MetricNamespace "microsoft.web/serverfarms" `
  -MetricResourceUri $planId `
  -Operator LessThan `
  -Threshold 30 `
  -TimeWindow ([System.TimeSpan]::FromMinutes(10)) `
  -TimeAggregation Average `
  -Statistic Average `
  -TimeGrain ([System.TimeSpan]::FromMinutes(1)) `
  -ScaleActionDirection Decrease `
  -ScaleActionType ChangeCount `
  -ScaleActionValue 1 `
  -ScaleActionCooldown ([System.TimeSpan]::FromMinutes(10))

$profile = New-AzAutoscaleProfileObject `
  -Name "Default" `
  -CapacityDefault 2 `
  -CapacityMinimum 2 `
  -CapacityMaximum 10 `
  -Rule @($scaleOutRule, $scaleInRule)

Add-AzAutoscaleSetting `
  -Location "eastus" `
  -Name "my-app-autoscale" `
  -ResourceGroupName "rg-webapp" `
  -TargetResourceId $planId `
  -AutoscaleProfile @($profile) `
  -Enabled $true
```

---

## KEDA for Container Apps (Reference)

For containerized workloads on Azure Container Apps, KEDA (Kubernetes Event-Driven Autoscaler) provides event-driven scaling based on queue depth, Service Bus messages, custom metrics, and more. Container Apps uses KEDA natively — it is not directly applicable to App Service plans, but is relevant for the next generation of containerized workloads.

**App Service does NOT use KEDA** — App Service uses Azure Monitor autoscale. KEDA applies to Azure Container Apps and AKS workloads.

For App Service containerized deployments (Docker containers on App Service plans), use the standard Azure Monitor autoscale rules documented above.

---

## Error Codes Table

| Code | Meaning | Remediation |
|------|---------|-------------|
| `AutoscaleNotSupported` | Autoscale not available on plan tier | Upgrade to Standard or above; Free/Shared/Basic don't support autoscale |
| `InvalidMetricName` | Metric name doesn't match namespace | Verify metric name with `metricDefinitions` endpoint |
| `CooldownTooShort` | Cool-down period below minimum (PT1M) | Set cooldown ≥ `PT1M` (recommend `PT5M` for scale-out) |
| `InvalidCapacity` | Min > max, or default outside min-max range | Ensure `minimum ≤ default ≤ maximum` |
| `ScaleActionFailed` | Could not allocate new instances | Regional capacity issue; try different region; raise support ticket |
| `AutoscaleThrottled` | Too many autoscale operations | Platform internal; usually self-resolves; check activity log |
| `TargetResourceNotFound` | App Service Plan ID incorrect | Verify plan resource ID includes correct subscription, RG, and name |

---

## Throttling Limits Table

| Resource | Limit | Retry Strategy |
|----------|-------|---------------|
| Max instances Standard plan | 10 | Upgrade to Premium v3 for up to 30 |
| Max instances Premium v3 | 30 | Upgrade to Isolated v2 for up to 100 |
| Autoscale rule evaluations | Every 1 minute | Minimum polling interval; cannot be reduced |
| Scale-out speed | ~2-5 minutes per wave | Pre-scale with scheduled profiles; use larger `value` per scale action |
| Scale-in protection | Minimum instances floor | Set `minimum` ≥ 2 for HA; never scale to 0 on App Service |
| Autoscale notifications | No rate limit on webhook calls | Implement idempotent webhook handlers |
| ARM write operations | 1,200/min per subscription | Batch autoscale updates; avoid per-request updates |

---

## Common Patterns and Gotchas

**1. Scale-in aggressiveness**
Aggressive scale-in (removing instances quickly when load drops) can cause repeated scale-out/in thrashing. Use a longer cool-down for scale-in (`PT15M`) than scale-out (`PT5M`) and a lower scale-in threshold (e.g., CPU < 30%) to avoid cycling.

**2. Minimum instance count for High Availability**
Always set `minimum ≥ 2` for production workloads. A single instance makes your app a single point of failure. Standard S1 supports up to 10 instances; even at base capacity, use 2.

**3. Default capacity value**
The `default` capacity is used when autoscale cannot read metrics (e.g., metrics service temporarily unavailable). Set it to a safe value — usually equal to `minimum`. If set too high, costs increase during metric outages; if too low, the app may be under-provisioned.

**4. CPU metric is plan-level, not app-level**
The `CpuPercentage` metric for autoscale is measured at the **App Service Plan level** — it averages across all VMs in the plan. If you have multiple apps in one plan, a spike in one app triggers scale-out that benefits all apps. Consider dedicated plans for high-traffic apps.

**5. Scale action notification lag**
After autoscale triggers, it can take 2-5 minutes for new instances to be ready to serve traffic. Pre-scale with scheduled profiles before anticipated high-traffic periods rather than relying on reactive scale-out.

**6. Zone redundancy and autoscale**
Zone-redundant plans require minimum 3 instances (`minimum: "3"`). If autoscale tries to scale in below 3 instances, the scale-in action is blocked. Set `minimum: "3"` in the autoscale profile capacity to match this requirement.

**7. Monitoring autoscale decisions**
Enable the Activity Log and monitor `microsoft.insights/autoscalesettings` events. In Application Insights, set app setting `SCALE_CONTROLLER_LOGGING_ENABLED=AppInsights:Verbose` to log scale controller decisions for debugging unexpected scaling behavior.
