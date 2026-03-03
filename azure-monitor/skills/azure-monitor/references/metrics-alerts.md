# Azure Monitor — Metrics & Alerts

## Overview

Azure Monitor Metrics is a time-series database storing numeric data at one-minute or finer granularity for up to 93 days (standard retention). Alert rules evaluate metrics or log queries on a schedule and trigger action groups when conditions are met. Alerts support static thresholds, dynamic thresholds (ML-based baselines), and multi-dimensional filtering.

---

## REST API Endpoints

Base URL: `https://management.azure.com`

### Metrics Data

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|----------------------|----------------|-------|
| GET | `/subscriptions/{sub}/resourceGroups/{rg}/providers/{resourceType}/{resourceName}/providers/microsoft.insights/metrics` | Monitoring Reader | `metricnames`, `timespan`, `interval`, `aggregation` | Query metric values for a resource |
| GET | `/subscriptions/{sub}/providers/microsoft.insights/metrics` | Monitoring Reader | `region`, `metricnames` | Query subscription-level metrics |
| GET | `/subscriptions/{sub}/resourceGroups/{rg}/providers/{resourceType}/{resourceName}/providers/microsoft.insights/metricDefinitions` | Monitoring Reader | — | List available metrics for a resource type |
| GET | `/subscriptions/{sub}/resourceGroups/{rg}/providers/{resourceType}/{resourceName}/providers/microsoft.insights/metricNamespaces` | Monitoring Reader | — | List metric namespaces for a resource |

**Query parameters for metrics**:
| Parameter | Description | Example |
|-----------|-------------|---------|
| `metricnames` | Comma-separated metric names | `CpuPercentage,MemoryPercentage` |
| `timespan` | ISO 8601 duration or interval | `PT1H`, `2026-01-01T00:00:00Z/2026-01-02T00:00:00Z` |
| `interval` | Data granularity | `PT1M`, `PT5M`, `PT1H` |
| `aggregation` | Aggregation types | `Average,Maximum,Minimum,Count,Total` |
| `$filter` | Dimension filter | `ResponseCode eq '200'` |
| `top` | Max data points | `100` |
| `orderby` | Sort order | `timestamp asc` |

### Metric Alert Rules

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|----------------------|----------------|-------|
| PUT | `/subscriptions/{sub}/resourceGroups/{rg}/providers/microsoft.insights/metricalerts/{ruleName}` | Monitoring Contributor | Body: alert definition | Create or update metric alert |
| GET | `/subscriptions/{sub}/resourceGroups/{rg}/providers/microsoft.insights/metricalerts/{ruleName}` | Monitoring Reader | — | Get alert rule details |
| GET | `/subscriptions/{sub}/resourceGroups/{rg}/providers/microsoft.insights/metricalerts` | Monitoring Reader | — | List metric alerts |
| DELETE | `/subscriptions/{sub}/resourceGroups/{rg}/providers/microsoft.insights/metricalerts/{ruleName}` | Monitoring Contributor | — | Delete alert rule |
| GET | `/subscriptions/{sub}/resourceGroups/{rg}/providers/microsoft.insights/metricalerts/{ruleName}/status` | Monitoring Reader | — | Get current alert status |

### Log Alert Rules (Scheduled Query Rules v2)

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|----------------------|----------------|-------|
| PUT | `/subscriptions/{sub}/resourceGroups/{rg}/providers/microsoft.insights/scheduledqueryrules/{ruleName}` | Monitoring Contributor | Body: SQR definition | Create or update log alert |
| GET | `/subscriptions/{sub}/resourceGroups/{rg}/providers/microsoft.insights/scheduledqueryrules` | Monitoring Reader | — | List log alerts |

### Action Groups

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|----------------------|----------------|-------|
| PUT | `/subscriptions/{sub}/resourceGroups/{rg}/providers/microsoft.insights/actiongroups/{groupName}` | Monitoring Contributor | Body: action group | Create or update action group |
| GET | `/subscriptions/{sub}/resourceGroups/{rg}/providers/microsoft.insights/actiongroups` | Monitoring Reader | — | List action groups |
| POST | `/subscriptions/{sub}/resourceGroups/{rg}/providers/microsoft.insights/actiongroups/{groupName}/notify` | Monitoring Contributor | Body: notification test | Test action group |

---

## Metric Namespaces Reference

| Resource Type | Metric Namespace | Common Metrics |
|---------------|-----------------|----------------|
| Virtual Machines | `Microsoft.Compute/virtualMachines` | `Percentage CPU`, `Network In Total`, `Disk Read Bytes` |
| App Service | `Microsoft.Web/sites` | `CpuTime`, `Requests`, `Http5xx`, `AverageResponseTime` |
| Azure SQL Database | `Microsoft.Sql/servers/databases` | `cpu_percent`, `dtu_consumption_percent`, `deadlock` |
| Storage Accounts | `Microsoft.Storage/storageAccounts` | `UsedCapacity`, `Transactions`, `SuccessE2ELatency` |
| Service Bus | `Microsoft.ServiceBus/namespaces` | `ActiveMessages`, `DeadletteredMessages`, `IncomingMessages` |
| Event Hubs | `Microsoft.EventHub/namespaces` | `IncomingMessages`, `OutgoingMessages`, `ThrottledRequests` |
| Cosmos DB | `Microsoft.DocumentDB/databaseAccounts` | `TotalRequests`, `TotalRequestUnits`, `NormalizedRUConsumption` |
| Key Vault | `Microsoft.KeyVault/vaults` | `ServiceApiHit`, `ServiceApiLatency`, `SaturationShoebox` |
| AKS | `Microsoft.ContainerService/managedClusters` | `node_cpu_usage_percentage`, `kube_pod_status_ready` |
| Application Insights | `microsoft.insights/components` | `requests/count`, `requests/failed`, `exceptions/count` |

---

## Static Threshold Alert (Bicep)

```bicep
resource metricAlert 'microsoft.insights/metricalerts@2018-03-01' = {
  name: 'high-cpu-alert'
  location: 'global'
  properties: {
    description: 'Alert when CPU exceeds 80% for 5 minutes'
    severity: 2
    enabled: true
    scopes: [virtualMachine.id]
    evaluationFrequency: 'PT1M'
    windowSize: 'PT5M'
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria'
      allOf: [
        {
          name: 'HighCPU'
          metricName: 'Percentage CPU'
          metricNamespace: 'Microsoft.Compute/virtualMachines'
          operator: 'GreaterThan'
          threshold: 80
          timeAggregation: 'Average'
          criterionType: 'StaticThresholdCriterion'
        }
      ]
    }
    actions: [
      { actionGroupId: actionGroup.id }
    ]
    autoMitigate: true
  }
}
```

---

## Dynamic Threshold Alert (JSON)

Dynamic thresholds use ML to learn seasonal patterns and set baselines automatically.

```json
PUT .../metricalerts/dynamic-latency-alert?api-version=2018-03-01
{
  "location": "global",
  "properties": {
    "description": "Alert on latency anomaly using dynamic thresholds",
    "severity": 2,
    "enabled": true,
    "scopes": ["/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Web/sites/my-app"],
    "evaluationFrequency": "PT5M",
    "windowSize": "PT15M",
    "criteria": {
      "odata.type": "Microsoft.Azure.Monitor.MultipleResourceMultipleMetricCriteria",
      "allOf": [
        {
          "name": "LatencyAnomaly",
          "metricName": "AverageResponseTime",
          "metricNamespace": "Microsoft.Web/sites",
          "operator": "GreaterThan",
          "timeAggregation": "Average",
          "criterionType": "DynamicThresholdCriterion",
          "alertSensitivity": "Medium",
          "failingPeriods": {
            "numberOfEvaluationPeriods": 4,
            "minFailingPeriodsToAlert": 3
          },
          "ignoreDataBefore": "2026-01-01T00:00:00Z"
        }
      ]
    },
    "actions": [
      { "actionGroupId": "/subscriptions/{sub}/resourceGroups/{rg}/providers/microsoft.insights/actiongroups/ops" }
    ]
  }
}
```

**`alertSensitivity`**: `High` = tight bands (more alerts), `Medium` = balanced, `Low` = wide bands (fewer alerts).
**`ignoreDataBefore`**: Prevents historical anomalies from skewing baseline calculation.

---

## Multi-Dimensional Alert (HTTP Status Codes)

```json
{
  "criteria": {
    "odata.type": "Microsoft.Azure.Monitor.MultipleResourceMultipleMetricCriteria",
    "allOf": [
      {
        "name": "Http5xxErrors",
        "metricName": "Http5xx",
        "metricNamespace": "Microsoft.Web/sites",
        "operator": "GreaterThan",
        "threshold": 10,
        "timeAggregation": "Total",
        "criterionType": "StaticThresholdCriterion",
        "dimensions": [
          {
            "name": "Instance",
            "operator": "Include",
            "values": ["*"]
          }
        ]
      }
    ]
  }
}
```

---

## Composite Alert (Multiple Conditions)

```json
{
  "criteria": {
    "odata.type": "Microsoft.Azure.Monitor.MultipleResourceMultipleMetricCriteria",
    "allOf": [
      {
        "name": "HighCPU",
        "metricName": "Percentage CPU",
        "operator": "GreaterThan",
        "threshold": 90,
        "timeAggregation": "Average",
        "criterionType": "StaticThresholdCriterion"
      },
      {
        "name": "HighMemory",
        "metricName": "Available Memory Bytes",
        "operator": "LessThan",
        "threshold": 524288000,
        "timeAggregation": "Average",
        "criterionType": "StaticThresholdCriterion"
      }
    ]
  }
}
```

All conditions in `allOf` must be true simultaneously for the alert to fire.

---

## Action Group Configuration (All Channels)

```json
PUT .../actiongroups/ops-full?api-version=2023-01-01
{
  "location": "global",
  "properties": {
    "groupShortName": "OpsFull",
    "enabled": true,
    "emailReceivers": [
      {
        "name": "PlatformTeam",
        "emailAddress": "platform@example.com",
        "useCommonAlertSchema": true
      }
    ],
    "smsReceivers": [
      { "name": "OncallPhone", "countryCode": "1", "phoneNumber": "5555551234" }
    ],
    "webhookReceivers": [
      {
        "name": "SlackWebhook",
        "serviceUri": "https://hooks.slack.com/services/xxx/yyy/zzz",
        "useCommonAlertSchema": true,
        "useAadAuth": false
      }
    ],
    "azureFunctionReceivers": [
      {
        "name": "IncidentCreator",
        "functionAppResourceId": "/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Web/sites/my-func",
        "functionName": "createIncident",
        "httpTriggerUrl": "https://my-func.azurewebsites.net/api/createIncident?code=xxx",
        "useCommonAlertSchema": true
      }
    ],
    "logicAppReceivers": [
      {
        "name": "PagerDutyLogicApp",
        "resourceId": "/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Logic/workflows/pagerduty-alert",
        "callbackUrl": "https://prod-xx.logic.azure.com:443/workflows/xxx/triggers/manual/paths/invoke?...",
        "useCommonAlertSchema": true
      }
    ]
  }
}
```

---

## Prometheus Metrics Integration

Azure Monitor managed service for Prometheus (part of Azure Monitor workspace) collects Prometheus metrics from AKS clusters.

```bash
# Enable Azure Monitor workspace and link to AKS
az monitor account create \
  --name my-monitor-workspace \
  --resource-group rg-monitoring \
  --location eastus

# Enable Prometheus metrics collection on AKS
az aks update \
  --name my-aks-cluster \
  --resource-group rg-aks \
  --enable-azure-monitor-metrics \
  --azure-monitor-workspace-resource-id /subscriptions/{sub}/resourceGroups/rg-monitoring/providers/microsoft.monitor/accounts/my-monitor-workspace

# Link to Grafana for visualization
az grafana create \
  --name my-grafana \
  --resource-group rg-monitoring

az monitor account update \
  --name my-monitor-workspace \
  --resource-group rg-monitoring \
  --linked-grafana-resource-id /subscriptions/{sub}/resourceGroups/rg-monitoring/providers/Microsoft.Dashboard/grafana/my-grafana
```

**PromQL to KQL bridge**: Azure Managed Prometheus stores data queryable via PromQL in Grafana or via the Azure Monitor Metrics API with namespace `microsoft.monitor/accounts`.

---

## TypeScript: Query Metrics

```typescript
import { MetricsQueryClient, MetricAggregationType } from "@azure/monitor-query";
import { DefaultAzureCredential } from "@azure/identity";

const credential = new DefaultAzureCredential();
const client = new MetricsQueryClient(credential);

async function getAppServiceMetrics(resourceId: string): Promise<void> {
  const result = await client.queryResource(resourceId, ["CpuTime", "Http5xx", "Requests"], {
    granularity: "PT5M",
    duration: "PT1H",
    aggregations: [
      MetricAggregationType.Average,
      MetricAggregationType.Total,
      MetricAggregationType.Maximum,
    ],
  });

  for (const metric of result.metrics) {
    console.log(`Metric: ${metric.name}`);
    for (const ts of metric.timeseries) {
      for (const point of ts.data ?? []) {
        console.log(`  ${point.timestamp}: avg=${point.average}, total=${point.total}`);
      }
    }
  }
}
```

---

## PowerShell: Create Metric Alert

```powershell
# Create action group
$ag = Set-AzActionGroup `
  -Name "ops-alerts" `
  -ResourceGroupName "rg-monitoring" `
  -ShortName "OpsAlerts" `
  -Receiver (New-AzActionGroupReceiver -Name "OpsEmail" -EmailReceiver -EmailAddress "ops@example.com")

# Define alert condition
$condition = New-AzMetricAlertRuleV2Criteria `
  -MetricName "Percentage CPU" `
  -MetricNamespace "Microsoft.Compute/virtualMachines" `
  -TimeAggregation Average `
  -Operator GreaterThan `
  -Threshold 80

# Create alert rule
Add-AzMetricAlertRuleV2 `
  -Name "high-cpu-vm" `
  -ResourceGroupName "rg-monitoring" `
  -WindowSize (New-TimeSpan -Minutes 5) `
  -Frequency (New-TimeSpan -Minutes 1) `
  -TargetResourceId "/subscriptions/{sub}/resourceGroups/rg-compute/providers/Microsoft.Compute/virtualMachines/my-vm" `
  -Condition $condition `
  -ActionGroup $ag.Id `
  -Severity 2 `
  -Description "Alert when VM CPU exceeds 80% for 5 minutes"
```

---

## Error Codes Table

| Code | Meaning | Remediation |
|------|---------|-------------|
| `ResourceNotFound` | Target resource for alert scopes does not exist | Verify resource ID including subscription, resource group, and resource name |
| `InvalidMetricName` | Specified metric name not valid for resource type | Query `metricDefinitions` endpoint to list valid metric names |
| `InvalidTimeGranularity` | Requested interval not supported | Use intervals from metricDefinitions (e.g., PT1M, PT5M, PT1H) |
| `TooManyScopes` | Alert rule has more than 50 scopes | Split into multiple alert rules; use resource groups as scope |
| `DynamicThresholdInsufficientData` | Not enough historical data for dynamic threshold | Set `ignoreDataBefore` to recent date; wait for 7+ days of data |
| `ActionGroupNotFound` | Referenced action group does not exist | Create action group before referencing in alert rules |
| `429 TooManyRequests` | Metrics API throttled | Implement exponential backoff; cache metric results |
| `NoDataCondition` | Alert fired because metric has no data points | Check resource health; verify metric is being emitted |

---

## Throttling Limits Table

| Resource | Limit | Retry Strategy |
|----------|-------|---------------|
| Metrics API requests | 12,000 read / 3,000 write per hour per subscription | Cache metric queries; use batch requests |
| Alert rule evaluations | 1 min minimum frequency | Use 5-min frequency for non-critical alerts |
| Alert rules per subscription | 5,000 metric alerts | Use resource group scopes to cover multiple resources per rule |
| Action group notifications | 1 notification per alert per 5 minutes (suppression) | Use severity levels to avoid notification fatigue |
| Metric data retention | 93 days for 1-min granularity | Export to Log Analytics for longer retention |
| Prometheus scrape interval | 30 seconds minimum | Increase interval for low-churn metrics |

---

## Common Patterns and Gotchas

**1. Alert evaluation timing**
Metric alerts evaluate on the trailing window, not real-time data. A 5-minute window with 1-minute frequency means the alert evaluates data from 1-6 minutes ago. Account for this lag when setting thresholds for SLO alerting.

**2. `autoMitigate: true` behavior**
When `autoMitigate` is true, the alert automatically resolves when the condition is no longer met. Set to `false` for fire-and-forget alerts (e.g., one-time cost budget exceeded). Action groups are notified on both fire and resolve when `autoMitigate` is true.

**3. Multi-resource alerts and dimensions**
A single alert rule can cover a resource type across a subscription by setting `targetResourceType` and `targetResourceRegion` with subscription scope. This reduces alert rule count significantly for fleet monitoring.

**4. Dynamic threshold training period**
Dynamic thresholds require 7 days of data to establish baselines, 3-4 weeks for seasonal patterns. During this period, sensitivity may be high. Set `ignoreDataBefore` to skip noisy training data from deployments or load tests.

**5. Action group suppression**
Azure Monitor suppresses repeated notifications from the same alert rule for 5 minutes. For high-frequency alerts (e.g., every minute), use alert processing rules to add suppression windows or route to different channels based on severity.

**6. Prometheus vs platform metrics**
Azure-native metrics (platform metrics) have different namespaces and query patterns from Prometheus metrics (custom namespace). Do not mix them in the same alert rule criteria block.
