---
name: Azure Monitor
description: >
  Deep expertise in Azure Monitor, Application Insights, and Log Analytics — write KQL queries,
  configure metric and log alerts with action groups, set up Application Insights instrumentation
  and sampling, create dashboards and workbooks, manage diagnostic settings for Azure resources,
  implement distributed tracing with OpenTelemetry, and optimize monitoring costs. Targets
  professional cloud engineers operating production Azure environments.
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
triggers:
  - azure monitor
  - application insights
  - app insights
  - log analytics
  - kql
  - kusto query
  - azure alerts
  - azure metrics
  - diagnostic settings
  - azure dashboard
  - workbook
  - action group
  - smart detection
---

# Azure Monitor

## 1. Azure Monitor Overview

Azure Monitor is the unified monitoring platform for all Azure resources and hybrid workloads. It collects, analyzes, and acts on telemetry from cloud and on-premises environments.

**Data hierarchy**:
| Layer | What It Captures | Storage |
|-------|-----------------|---------|
| Metrics | Numeric time-series (CPU %, request count, latency) | Azure Monitor Metrics (time-series DB) |
| Logs | Structured/unstructured event records, traces, diagnostics | Log Analytics workspace |
| Traces | Distributed request flows across services | Application Insights (backed by Log Analytics) |

**Data sources**:
| Source | Examples | Collection Method |
|--------|---------|-------------------|
| Azure resources | VMs, App Services, SQL, Storage, AKS | Platform metrics (automatic), diagnostic settings (logs) |
| Guest OS | Performance counters, syslog, Windows events | Azure Monitor Agent (AMA) with data collection rules |
| Application | Requests, dependencies, exceptions, custom events | Application Insights SDK or auto-instrumentation |
| Custom | Business metrics, external APIs, IoT devices | Custom metrics API, data collection endpoint (DCE) |
| Hybrid/multi-cloud | On-premises servers, AWS, GCP | Azure Arc + Azure Monitor Agent |

**Data sinks**:
| Destination | Use Case |
|-------------|----------|
| Log Analytics workspace | KQL queries, log alerts, workbooks, Sentinel |
| Azure Monitor Metrics | Near real-time metric alerts, Metrics Explorer charts |
| Azure Storage | Long-term archival, compliance |
| Azure Event Hubs | Stream to SIEM, Splunk, or custom consumers |
| Partner solutions | Datadog, Elastic, Dynatrace via partner integrations |

**Key services in the Azure Monitor ecosystem**:
- **Log Analytics** — Query engine and workspace for log data (KQL)
- **Application Insights** — APM for web applications (requests, dependencies, exceptions, traces)
- **Metrics Explorer** — Interactive charting for platform and custom metrics
- **Alerts** — Metric alerts, log alerts, activity log alerts, smart detection
- **Workbooks** — Rich interactive reports combining metrics, logs, and parameters
- **Dashboards** — Pinnable tiles in Azure Portal for at-a-glance views

## 2. Log Analytics Workspaces

A Log Analytics workspace is the central data store for Azure Monitor Logs. All KQL queries, log alerts, and workbooks run against one or more workspaces.

**Create a workspace**:
```bash
az monitor log-analytics workspace create \
  --resource-group monitoring-rg \
  --workspace-name prod-logs \
  --location eastus \
  --retention-time 90 \
  --sku PerGB2018
```

**Pricing tiers**:
| Tier | Model | Best For |
|------|-------|----------|
| Pay-as-you-go (PerGB2018) | Per-GB ingestion ($2.76/GB approx.) | < 100 GB/day |
| Commitment tier 100 | Fixed daily allowance, lower per-GB rate | 100+ GB/day predictable workloads |
| Commitment tier 200/300/400/500 | Higher commitments, deeper discounts | Large-scale environments |
| Free tier | 5 GB/month included, 7-day retention | Dev/test only |

**Data retention**:
- Default: 30 days (interactive retention, included in ingestion cost)
- Configurable: 30 to 730 days for interactive retention (charges apply beyond 31 days)
- Archive tier: Up to 12 years total (7 years archive), lower cost, requires search jobs or restore to query
- Per-table retention overrides: Set different retention per table (e.g., SecurityEvent = 365 days, Perf = 90 days)

```bash
# Set workspace-level retention
az monitor log-analytics workspace update \
  --resource-group monitoring-rg \
  --workspace-name prod-logs \
  --retention-time 180

# Set table-level retention
az monitor log-analytics workspace table update \
  --resource-group monitoring-rg \
  --workspace-name prod-logs \
  --table-name SecurityEvent \
  --retention-time 365 \
  --total-retention-time 730
```

**Data collection rules (DCR)**:
DCRs define what data to collect, how to transform it, and where to send it. They replace the legacy agent configuration model.

```bash
# Create a DCR for Windows performance counters
az monitor data-collection rule create \
  --resource-group monitoring-rg \
  --name "windows-perf-dcr" \
  --location eastus \
  --data-flows '[{"streams":["Microsoft-Perf"],"destinations":["prod-logs"]}]' \
  --destinations '{"logAnalytics":[{"workspaceResourceId":"/subscriptions/<sub>/resourceGroups/monitoring-rg/providers/Microsoft.OperationalInsights/workspaces/prod-logs","name":"prod-logs"}]}' \
  --data-sources '{"performanceCounters":[{"name":"perfCounters","streams":["Microsoft-Perf"],"samplingFrequencyInSeconds":60,"counterSpecifiers":["\\Processor(_Total)\\% Processor Time","\\Memory\\Available MBytes","\\LogicalDisk(_Total)\\% Free Space"]}]}'
```

**Cross-workspace queries**:
```kusto
// Query across multiple workspaces
union
  workspace("prod-logs").Heartbeat,
  workspace("staging-logs").Heartbeat
| summarize count() by Computer, _ResourceId
| order by count_ desc
```

**Workspace design patterns**:
| Pattern | When To Use |
|---------|------------|
| Single workspace | Small-to-medium organizations, simplest management |
| Per-environment | Separate dev/staging/prod for access control and cost isolation |
| Per-region | Data sovereignty requirements, reduce cross-region egress |
| Hybrid (centralized + satellite) | Central SOC workspace + team-specific workspaces with cross-workspace queries |

## 3. KQL (Kusto Query Language)

KQL is the query language for Log Analytics, Application Insights, Azure Data Explorer, and Microsoft Sentinel. Queries are composed of tabular operators chained with the pipe (`|`) character.

### Core Operators

| Operator | Purpose | Example |
|----------|---------|---------|
| `where` | Filter rows | `where TimeGenerated > ago(1h)` |
| `project` | Select/rename columns | `project Name=Computer, CPU=CounterValue` |
| `project-away` | Remove columns | `project-away TenantId, Type` |
| `extend` | Add computed columns | `extend DurationSec = DurationMs / 1000` |
| `summarize` | Aggregate rows | `summarize avg(CounterValue) by Computer` |
| `join` | Combine tables | `T1 \| join kind=inner T2 on CommonCol` |
| `union` | Merge tables | `union Table1, Table2` |
| `order by` / `sort by` | Sort results | `order by TimeGenerated desc` |
| `top` | First N rows | `top 10 by Count desc` |
| `take` / `limit` | Sample N rows | `take 100` |
| `distinct` | Unique values | `distinct Computer, OSType` |
| `count` | Count rows | `Heartbeat \| count` |
| `render` | Visualize | `render timechart` |
| `parse` | Extract fields from text | `parse Message with "Error: " ErrorCode " at " Location` |
| `mv-expand` | Expand arrays to rows | `mv-expand parsed=parse_json(CustomDimensions)` |
| `make-series` | Create time series | `make-series count() on TimeGenerated step 1h` |
| `evaluate` | Call plugin functions | `evaluate autocluster()` |

### Scalar Functions

| Function | Purpose | Example |
|----------|---------|---------|
| `ago(timespan)` | Relative time | `ago(24h)`, `ago(7d)`, `ago(30m)` |
| `now()` | Current UTC time | `where TimeGenerated > now() - 1h` |
| `datetime(value)` | Parse datetime | `datetime(2024-01-15T10:00:00Z)` |
| `tostring(value)` | Convert to string | `tostring(ResultCode)` |
| `toint(value)` | Convert to integer | `toint(CounterValue)` |
| `todouble(value)` | Convert to double | `todouble(DurationMs)` |
| `parse_json(str)` | Parse JSON string | `parse_json(CustomDimensions)` |
| `format_datetime(dt, fmt)` | Format datetime | `format_datetime(TimeGenerated, "yyyy-MM-dd")` |
| `strcat(a, b, ...)` | Concatenate strings | `strcat(Computer, " - ", CounterName)` |
| `iif(cond, true, false)` | Conditional value | `iif(CounterValue > 90, "High", "Normal")` |
| `case(cond1, val1, ...)` | Multi-branch conditional | `case(v>90,"Crit", v>70,"Warn", "OK")` |
| `extract(regex, group, text)` | Regex extraction | `extract("Error (\\d+)", 1, Message)` |
| `split(text, delimiter)` | Split string to array | `split(RequestPath, "/")` |
| `bin(value, roundTo)` | Round/bucket values | `bin(TimeGenerated, 5m)` |
| `hash(value, buckets)` | Hash to N buckets | `hash(UserId, 100)` |

### Aggregation Functions

| Function | Purpose |
|----------|---------|
| `count()` | Count rows in group |
| `countif(predicate)` | Count rows matching condition |
| `sum(expr)` | Sum of values |
| `avg(expr)` | Average of values |
| `min(expr)` / `max(expr)` | Minimum / maximum value |
| `percentile(expr, p)` | Percentile value (e.g., p95) |
| `percentiles(expr, p1, p2)` | Multiple percentiles |
| `stdev(expr)` | Standard deviation |
| `variance(expr)` | Variance |
| `dcount(expr)` | Distinct count (HyperLogLog) |
| `dcountif(expr, pred)` | Distinct count with filter |
| `make_list(expr)` | Collect values into JSON array |
| `make_set(expr)` | Collect distinct values into array |
| `arg_max(expr, *)` | Row with max value of expr |
| `arg_min(expr, *)` | Row with min value of expr |

### Time Series

```kusto
// Create a time series of request counts per 5 minutes
requests
| make-series RequestCount=count() on timestamp from ago(24h) to now() step 5m
| render timechart

// Decompose time series into trend, seasonal, and residual components
requests
| make-series RequestCount=count() on timestamp from ago(7d) to now() step 1h
| extend (anomalies, score, baseline) = series_decompose_anomalies(RequestCount)
| mv-expand timestamp to typeof(datetime), RequestCount to typeof(long),
    anomalies to typeof(int), score to typeof(double), baseline to typeof(double)
| where anomalies != 0
| project timestamp, RequestCount, baseline, score
```

### Practical Query Examples

**1. Top 10 exceptions in the last 24 hours**:
```kusto
exceptions
| where timestamp > ago(24h)
| summarize Count=count() by outerMessage, problemId
| top 10 by Count desc
| project outerMessage, Count, problemId
```

**2. P95 response time by operation**:
```kusto
requests
| where timestamp > ago(1h)
| where success == true
| summarize P95=percentile(duration, 95), Avg=avg(duration), Count=count()
    by operation_Name
| order by P95 desc
| render table
```

**3. Failed dependency calls with error details**:
```kusto
dependencies
| where timestamp > ago(6h)
| where success == false
| summarize FailCount=count(), AvgDuration=avg(duration)
    by target, type, resultCode
| order by FailCount desc
```

**4. VM CPU usage above 90% in the last hour**:
```kusto
Perf
| where TimeGenerated > ago(1h)
| where ObjectName == "Processor" and CounterName == "% Processor Time"
    and InstanceName == "_Total"
| summarize AvgCPU=avg(CounterValue), MaxCPU=max(CounterValue) by Computer
| where AvgCPU > 90
| order by AvgCPU desc
```

**5. Sign-in failures by user (Azure AD logs)**:
```kusto
SigninLogs
| where TimeGenerated > ago(24h)
| where ResultType != "0"
| summarize FailCount=count(), Reasons=make_set(ResultDescription) by UserPrincipalName, AppDisplayName
| order by FailCount desc
| take 20
```

**6. HTTP 5xx errors with request details**:
```kusto
requests
| where timestamp > ago(4h)
| where resultCode startswith "5"
| project timestamp, name, url, resultCode, duration, operation_Id
| order by timestamp desc
| take 50
```

**7. Slow database queries (dependencies)**:
```kusto
dependencies
| where timestamp > ago(1h)
| where type == "SQL"
| where duration > 2000
| project timestamp, target, data, duration, operation_Id
| order by duration desc
| take 25
```

**8. Availability test results**:
```kusto
availabilityResults
| where timestamp > ago(24h)
| summarize SuccessRate=countif(success == true) * 100.0 / count(),
    AvgDuration=avg(duration)
    by name, location
| order by SuccessRate asc
```

**9. Custom event analysis**:
```kusto
customEvents
| where timestamp > ago(7d)
| where name == "FeatureUsed"
| extend Feature = tostring(customDimensions["featureName"])
| summarize Users=dcount(user_Id), Uses=count() by Feature
| order by Users desc
| render barchart
```

**10. Resource health changes**:
```kusto
AzureActivity
| where TimeGenerated > ago(7d)
| where CategoryValue == "ResourceHealth"
| project TimeGenerated, ResourceGroup, Resource=_ResourceId,
    Status=ActivityStatusValue, Caller
| order by TimeGenerated desc
```

**11. Container (AKS) pod restarts**:
```kusto
KubePodInventory
| where TimeGenerated > ago(24h)
| where PodRestartCount > 0
| summarize MaxRestarts=max(PodRestartCount), LastSeen=max(TimeGenerated)
    by Namespace, Name, ContainerName
| where MaxRestarts > 5
| order by MaxRestarts desc
```

**12. Network Security Group flow logs**:
```kusto
AzureNetworkAnalytics_CL
| where TimeGenerated > ago(1h)
| where FlowStatus_s == "D"  // Denied flows
| summarize DeniedFlows=count() by SrcIP_s, DestIP_s, DestPort_d, NSGRule_s
| order by DeniedFlows desc
| take 20
```

## 4. Application Insights

Application Insights is the APM (Application Performance Management) feature of Azure Monitor. It monitors live web applications, detects anomalies, and provides deep diagnostics.

**Create an Application Insights resource**:
```bash
az monitor app-insights component create \
  --app my-web-app-insights \
  --location eastus \
  --resource-group monitoring-rg \
  --workspace "/subscriptions/<sub>/resourceGroups/monitoring-rg/providers/Microsoft.OperationalInsights/workspaces/prod-logs" \
  --kind web \
  --application-type web
```

### Telemetry Types

| Type | Table | What It Captures |
|------|-------|-----------------|
| Requests | `requests` | Incoming HTTP requests (URL, duration, status, operation ID) |
| Dependencies | `dependencies` | Outgoing calls to SQL, HTTP, Redis, Azure services |
| Exceptions | `exceptions` | Unhandled and tracked exceptions with stack traces |
| Traces | `traces` | Custom log messages (console.log, logger output) |
| Custom events | `customEvents` | Business events (feature usage, user actions) |
| Custom metrics | `customMetrics` | Business KPIs (revenue, conversion rate) |
| Page views | `pageViews` | Browser page loads (SPA route changes) |
| Availability | `availabilityResults` | Synthetic test results (URL ping, multi-step) |
| Performance counters | `performanceCounters` | CPU, memory, GC, thread counts |

### Instrumentation (Node.js / TypeScript)

**Auto-instrumentation with Azure Monitor OpenTelemetry**:
```bash
npm install @azure/monitor-opentelemetry
```

```typescript
import { useAzureMonitor } from "@azure/monitor-opentelemetry";

useAzureMonitor({
  azureMonitorExporterOptions: {
    connectionString: process.env.APPLICATIONINSIGHTS_CONNECTION_STRING,
  },
  instrumentationOptions: {
    http: { enabled: true },
    azureSdk: { enabled: true },
    mongoDb: { enabled: true },
    mySql: { enabled: true },
    postgreSql: { enabled: true },
    redis: { enabled: true },
  },
});

// Must be called before importing other modules
import express from "express";
const app = express();
```

**Manual telemetry with Application Insights SDK**:
```bash
npm install applicationinsights
```

```typescript
import * as appInsights from "applicationinsights";

appInsights.setup(process.env.APPLICATIONINSIGHTS_CONNECTION_STRING)
  .setAutoCollectRequests(true)
  .setAutoCollectDependencies(true)
  .setAutoCollectExceptions(true)
  .setAutoCollectPerformance(true, true)
  .setAutoCollectConsole(true, true)
  .setSendLiveMetrics(true)
  .start();

const client = appInsights.defaultClient;

// Track custom event
client.trackEvent({
  name: "OrderPlaced",
  properties: { orderId: "ORD-123", plan: "enterprise" },
  measurements: { orderValue: 499.99 },
});

// Track custom metric
client.trackMetric({
  name: "ActiveUsers",
  value: 142,
});

// Track exception
try {
  await processOrder(order);
} catch (err) {
  client.trackException({
    exception: err as Error,
    properties: { orderId: order.id },
  });
  throw err;
}
```

### Sampling

Sampling reduces telemetry volume while preserving statistical accuracy.

| Sampling Type | Description | Configuration |
|---------------|-------------|---------------|
| Adaptive (default) | Auto-adjusts rate based on volume | SDK config: `maxTelemetryItemsPerSecond` |
| Fixed-rate | Consistent percentage of all telemetry | SDK config: `samplingPercentage` (e.g., 50 = 50%) |
| Ingestion | Server-side sampling at the portal | App Insights resource settings |

```typescript
appInsights.setup(connectionString)
  .setSendLiveMetrics(true);

// Fixed-rate sampling at 25%
appInsights.defaultClient.config.samplingPercentage = 25;

appInsights.start();
```

**Sampling exclusions** (always collect certain telemetry types):
```typescript
const { SamplingTelemetryProcessor } = require("applicationinsights/out/TelemetryProcessors");

// Exclude exceptions and dependencies from sampling
appInsights.defaultClient.addTelemetryProcessor((envelope) => {
  if (envelope.data.baseType === "ExceptionData" ||
      envelope.data.baseType === "RemoteDependencyData") {
    return true; // Always send
  }
  return undefined; // Apply normal sampling
});
```

### Live Metrics

Live Metrics Stream provides real-time (1-second latency) visibility into requests, dependencies, exceptions, CPU, and memory without affecting performance.

```bash
# Enable live metrics in SDK
appInsights.setup(connectionString).setSendLiveMetrics(true).start();
```

Access in Azure Portal: Application Insights > Live Metrics.

### Application Map

Application Map automatically discovers the topology of your application — the web frontend, API, database, and external dependencies — and shows health, latency, and failure rates on each component.

Access in Azure Portal: Application Insights > Application map.

### Availability Tests

Synthetic tests that probe your application from Azure datacenters worldwide.

| Test Type | Description |
|-----------|-------------|
| URL ping test | HTTP GET to an endpoint, check status code and optional content match |
| Standard test | Supports HEAD/GET/POST, custom headers, SSL cert validation |
| Custom TrackAvailability | Programmatic tests using the SDK for complex flows |

```bash
# Create a URL ping availability test
az monitor app-insights web-test create \
  --resource-group monitoring-rg \
  --name "Homepage Ping" \
  --app-insights my-web-app-insights \
  --location "eastus" \
  --web-test-kind ping \
  --defined-web-test-name "HomepagePing" \
  --url "https://myapp.azurewebsites.net/health" \
  --frequency 300 \
  --timeout 120 \
  --expected-status-code 200 \
  --retry-enabled true
```

## 5. Metrics and Metric Alerts

### Platform Metrics

Platform metrics are collected automatically for all Azure resources at 1-minute granularity with 93 days of retention.

**Common metric namespaces**:
| Resource | Namespace | Key Metrics |
|----------|-----------|-------------|
| App Service | `Microsoft.Web/sites` | `HttpResponseTime`, `Requests`, `Http5xx`, `CpuPercentage`, `MemoryPercentage` |
| SQL Database | `Microsoft.Sql/servers/databases` | `cpu_percent`, `dtu_consumption_percent`, `storage_percent`, `deadlock` |
| Storage Account | `Microsoft.Storage/storageAccounts` | `Transactions`, `Availability`, `SuccessE2ELatency` |
| Virtual Machine | `Microsoft.Compute/virtualMachines` | `Percentage CPU`, `Available Memory Bytes`, `Disk Read/Write Bytes/sec` |
| AKS | `Microsoft.ContainerService/managedClusters` | `node_cpu_usage_percentage`, `node_memory_rss_percentage`, `kube_pod_status_ready` |
| Key Vault | `Microsoft.KeyVault/vaults` | `ServiceApiHit`, `ServiceApiLatency`, `Availability` |
| Cosmos DB | `Microsoft.DocumentDB/databaseAccounts` | `TotalRequests`, `TotalRequestUnits`, `NormalizedRUConsumption` |

**Query metrics via CLI**:
```bash
az monitor metrics list \
  --resource "/subscriptions/<sub>/resourceGroups/<rg>/providers/Microsoft.Web/sites/<app>" \
  --metric "HttpResponseTime" "Requests" "Http5xx" \
  --interval PT5M \
  --start-time 2024-01-15T00:00:00Z \
  --end-time 2024-01-15T12:00:00Z \
  --aggregation Average Count Sum
```

### Custom Metrics

Send application-specific metrics to Azure Monitor Metrics for near real-time alerting.

```typescript
// Via Application Insights SDK
client.trackMetric({ name: "OrderProcessingTime", value: 245 });
client.trackMetric({ name: "QueueDepth", value: 38 });

// Via REST API (custom metrics endpoint)
// POST https://<region>.monitoring.azure.com/<resourceId>/metrics
// Body: { "time": "...", "data": { "baseData": { "metric": "QueueDepth", "namespace": "Custom", "series": [{ "min": 38, "max": 38, "sum": 38, "count": 1 }] } } }
```

### Metric Alert Rules

| Alert Type | Use Case | Evaluation |
|------------|----------|------------|
| Static threshold | Known baselines (CPU > 90%) | Fixed value comparison |
| Dynamic threshold | Unknown baselines, auto-learns patterns | ML-based upper/lower bounds |
| Anomaly detection | Detect deviations from historical behavior | Built-in anomaly model |

**Create a metric alert (static threshold)**:
```bash
az monitor metrics alert create \
  --name "High CPU Alert" \
  --resource-group monitoring-rg \
  --scopes "/subscriptions/<sub>/resourceGroups/<rg>/providers/Microsoft.Web/sites/<app>" \
  --condition "avg Percentage CPU > 85" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --severity 2 \
  --action "/subscriptions/<sub>/resourceGroups/monitoring-rg/providers/microsoft.insights/actionGroups/ops-team" \
  --description "CPU usage exceeds 85% for 5 minutes"
```

**Create a metric alert (dynamic threshold)**:
```bash
az monitor metrics alert create \
  --name "Response Time Anomaly" \
  --resource-group monitoring-rg \
  --scopes "/subscriptions/<sub>/resourceGroups/<rg>/providers/Microsoft.Web/sites/<app>" \
  --condition "avg HttpResponseTime > dynamic medium 4 of 5 since 2024-01-01T00:00:00Z" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --severity 3 \
  --action "/subscriptions/<sub>/resourceGroups/monitoring-rg/providers/microsoft.insights/actionGroups/ops-team"
```

### Action Groups

Action groups define who gets notified and what automated actions to trigger.

| Action Type | Description |
|-------------|-------------|
| Email | Send email to specified addresses |
| SMS | Send SMS to phone numbers |
| Voice | Automated voice call |
| Push notification | Azure mobile app notification |
| Webhook | HTTP POST to a URL |
| ITSM | Create ticket in ServiceNow, BMC, etc. |
| Logic App | Trigger an Azure Logic App workflow |
| Azure Function | Invoke a Function App |
| Automation Runbook | Run an Azure Automation runbook |
| Event Hub | Stream alert to Event Hub |
| Secure webhook | Webhook with Azure AD authentication |

```bash
az monitor action-group create \
  --name ops-team \
  --resource-group monitoring-rg \
  --short-name OpsTeam \
  --email-receiver name=Lead email=ops-lead@contoso.com \
  --email-receiver name=Backup email=ops-backup@contoso.com \
  --webhook-receiver name=PagerDuty uri="https://events.pagerduty.com/integration/<key>/enqueue" \
  --logic-app-receiver name=AutoRemediate \
    resource-id="/subscriptions/<sub>/resourceGroups/monitoring-rg/providers/Microsoft.Logic/workflows/auto-scale-up" \
    callback-url="https://prod-00.eastus.logic.azure.com/workflows/<id>/triggers/manual/paths/invoke"
```

## 6. Log Alerts

Log alerts run KQL queries on a schedule against Log Analytics workspaces or Application Insights and fire when the query returns results matching a condition.

**Create a scheduled query rule (log alert)**:
```bash
az monitor scheduled-query create \
  --name "High Error Rate" \
  --resource-group monitoring-rg \
  --scopes "/subscriptions/<sub>/resourceGroups/monitoring-rg/providers/Microsoft.OperationalInsights/workspaces/prod-logs" \
  --condition "count > 50" \
  --condition-query "requests | where resultCode startswith '5' | summarize ErrorCount=count() by bin(timestamp, 5m)" \
  --evaluation-frequency 5m \
  --window-size 5m \
  --severity 2 \
  --action-groups "/subscriptions/<sub>/resourceGroups/monitoring-rg/providers/microsoft.insights/actionGroups/ops-team" \
  --description "More than 50 HTTP 5xx errors in 5 minutes"
```

**Dimensions in log alerts**:
Split alerts by dimension values so each unique combination fires independently:
```bash
az monitor scheduled-query create \
  --name "Per-Service Error Alert" \
  --resource-group monitoring-rg \
  --scopes "/subscriptions/<sub>/resourceGroups/monitoring-rg/providers/Microsoft.OperationalInsights/workspaces/prod-logs" \
  --condition "count > 10" \
  --condition-query "requests | where success == false | summarize ErrorCount=count() by cloud_RoleName, bin(timestamp, 5m)" \
  --evaluation-frequency 5m \
  --window-size 5m \
  --severity 3 \
  --action-groups "/subscriptions/<sub>/resourceGroups/monitoring-rg/providers/microsoft.insights/actionGroups/ops-team" \
  --dimension name=cloud_RoleName operator=Include values="*"
```

**Severity levels**:
| Severity | Level | Use For |
|----------|-------|---------|
| 0 | Critical | Service-down, data loss, immediate action required |
| 1 | Error | Significant degradation, P1 incidents |
| 2 | Warning | Performance issues, approaching limits |
| 3 | Informational | Notable events, trend changes |
| 4 | Verbose | Diagnostic information, low-priority notifications |

**Stateful alerts**:
Stateful alerts have a lifecycle (Fired -> Acknowledged -> Resolved). The alert auto-resolves when the condition is no longer met:
```bash
az monitor scheduled-query create \
  --name "Disk Space Low" \
  --resource-group monitoring-rg \
  --scopes "..." \
  --condition "count > 0" \
  --condition-query "Perf | where ObjectName == 'LogicalDisk' and CounterName == '% Free Space' and CounterValue < 10 | summarize MinFree=min(CounterValue) by Computer" \
  --evaluation-frequency 15m \
  --window-size 15m \
  --severity 2 \
  --auto-mitigate true \
  --action-groups "..."
```

**Evaluation frequency and window combinations**:
| Frequency | Window | Alert Latency | Cost Impact |
|-----------|--------|--------------|-------------|
| 1m | 5m | Very fast | Higher (more evaluations) |
| 5m | 5m | Fast | Moderate |
| 15m | 15m | Standard | Lower |
| 5m | 1h | Fast, wider context | Moderate |

## 7. Diagnostic Settings

Diagnostic settings route platform logs and metrics from Azure resources to one or more destinations.

**Common log categories by resource type**:
| Resource | Key Categories |
|----------|---------------|
| App Service | `AppServiceHTTPLogs`, `AppServiceConsoleLogs`, `AppServiceAppLogs`, `AppServicePlatformLogs` |
| SQL Database | `SQLInsights`, `AutomaticTuning`, `QueryStoreRuntimeStatistics`, `Errors`, `Deadlocks` |
| Key Vault | `AuditEvent`, `AzurePolicyEvaluationDetails` |
| Storage Account | `StorageRead`, `StorageWrite`, `StorageDelete` (per service: blob, table, queue, file) |
| AKS | `kube-apiserver`, `kube-controller-manager`, `kube-scheduler`, `cluster-autoscaler`, `guard` |
| Virtual Network | `VMProtectionAlerts` |
| NSG | `NetworkSecurityGroupEvent`, `NetworkSecurityGroupRuleCounter` |

**Create diagnostic settings via CLI**:
```bash
# Send App Service logs and metrics to Log Analytics
az monitor diagnostic-settings create \
  --name "appservice-to-loganalytics" \
  --resource "/subscriptions/<sub>/resourceGroups/<rg>/providers/Microsoft.Web/sites/<app>" \
  --workspace "/subscriptions/<sub>/resourceGroups/monitoring-rg/providers/Microsoft.OperationalInsights/workspaces/prod-logs" \
  --logs '[{"categoryGroup":"allLogs","enabled":true}]' \
  --metrics '[{"category":"AllMetrics","enabled":true}]'

# Send to multiple destinations (Log Analytics + Storage for archival)
az monitor diagnostic-settings create \
  --name "sql-diagnostics" \
  --resource "/subscriptions/<sub>/resourceGroups/<rg>/providers/Microsoft.Sql/servers/<server>/databases/<db>" \
  --workspace "/subscriptions/<sub>/resourceGroups/monitoring-rg/providers/Microsoft.OperationalInsights/workspaces/prod-logs" \
  --storage-account "/subscriptions/<sub>/resourceGroups/<rg>/providers/Microsoft.Storage/storageAccounts/<storage>" \
  --logs '[{"category":"SQLInsights","enabled":true},{"category":"Errors","enabled":true},{"category":"Deadlocks","enabled":true}]' \
  --metrics '[{"category":"AllMetrics","enabled":true}]'
```

**Bicep template for diagnostic settings**:
```bicep
resource diagnosticSettings 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = {
  name: 'send-to-loganalytics'
  scope: webApp
  properties: {
    workspaceId: logAnalyticsWorkspace.id
    logs: [
      {
        categoryGroup: 'allLogs'
        enabled: true
        retentionPolicy: {
          enabled: false
          days: 0
        }
      }
    ]
    metrics: [
      {
        category: 'AllMetrics'
        enabled: true
        retentionPolicy: {
          enabled: false
          days: 0
        }
      }
    ]
  }
}
```

**Destination options**:
| Destination | Use Case | Retention |
|-------------|----------|-----------|
| Log Analytics workspace | Querying, alerting, workbooks | 30-730 days interactive + archive |
| Azure Storage account | Long-term archival, compliance | Storage lifecycle policies |
| Azure Event Hubs | Stream to external SIEM / analytics | N/A (streaming) |
| Partner solutions | Datadog, Elastic, Dynatrace | Partner-managed |

**Audit diagnostic settings across a subscription**:
```bash
# List all resources without diagnostic settings
az resource list --query "[].id" -o tsv | while read resourceId; do
  settings=$(az monitor diagnostic-settings list --resource "$resourceId" --query "value[].name" -o tsv 2>/dev/null)
  if [ -z "$settings" ]; then
    echo "NO DIAGNOSTIC SETTINGS: $resourceId"
  fi
done
```

## 8. Dashboards and Workbooks

### Azure Dashboards

Azure dashboards provide a portal-based, pinnable tile view for at-a-glance monitoring.

**Dashboard JSON structure**:
```json
{
  "properties": {
    "lenses": [
      {
        "order": 0,
        "parts": [
          {
            "position": { "x": 0, "y": 0, "colSpan": 6, "rowSpan": 4 },
            "metadata": {
              "type": "Extension/Microsoft_OperationsManagementSuite_Workspace/PartType/LogsDashboardPart",
              "settings": {
                "content": {
                  "Query": "requests | where timestamp > ago(24h) | summarize count() by bin(timestamp, 1h) | render timechart",
                  "PartTitle": "Request Volume (24h)"
                }
              },
              "inputs": [
                {
                  "name": "resourceTypeMode",
                  "value": "workspace"
                },
                {
                  "name": "ComponentId",
                  "value": "/subscriptions/<sub>/resourceGroups/monitoring-rg/providers/Microsoft.OperationalInsights/workspaces/prod-logs"
                }
              ]
            }
          }
        ]
      }
    ]
  }
}
```

**Create a dashboard via CLI**:
```bash
az portal dashboard create \
  --resource-group monitoring-rg \
  --name "Production Monitoring" \
  --input-path dashboard.json \
  --location eastus
```

### Azure Workbooks

Workbooks are interactive reports combining text, KQL queries, metrics, and parameters into rich visualizations.

**Key features**:
| Feature | Description |
|---------|-------------|
| Parameters | Dropdowns, time pickers, text inputs that filter queries dynamically |
| Query steps | KQL, metrics, ARG (Resource Graph), and custom endpoint queries |
| Visualizations | Grids, charts (line, bar, pie, scatter), tiles, maps, text, heatmaps |
| Conditional visibility | Show/hide sections based on parameter values |
| Links and cross-resource | Link to other workbooks, drill through to resource blades |
| Templates | Shared gallery templates for common scenarios |

**Visualization types**:
| Type | Best For |
|------|----------|
| Time chart | Trends over time (request volume, CPU, errors) |
| Bar chart | Comparisons across categories (errors by service) |
| Pie chart | Proportional breakdown (error types, regions) |
| Grid (table) | Detailed data with conditional formatting |
| Tiles | KPI summary (total requests, error %, latency) |
| Map | Geographic distribution (users by region, latency by datacenter) |
| Heatmap | Density patterns (errors by hour of day) |

**Parameterized workbook query example**:
```kusto
// Uses workbook parameter {TimeRange} and {ServiceName}
requests
| where timestamp {TimeRange}
| where cloud_RoleName == "{ServiceName}"
| summarize Requests=count(), Errors=countif(success == false),
    P95=percentile(duration, 95)
    by bin(timestamp, {TimeRange:grain})
| render timechart
```

**Create a workbook from template via CLI**:
```bash
az monitor app-insights workbook create \
  --resource-group monitoring-rg \
  --name "Service Health Dashboard" \
  --location eastus \
  --kind shared \
  --category workbook \
  --serialized-data @workbook-template.json
```

## 9. Distributed Tracing

Distributed tracing follows a single user request across multiple services, showing exactly where time is spent and where failures occur.

### OpenTelemetry Integration

Azure Monitor supports OpenTelemetry as the standard for distributed tracing.

```bash
npm install @azure/monitor-opentelemetry @opentelemetry/api
```

```typescript
import { useAzureMonitor } from "@azure/monitor-opentelemetry";
import { trace, context, SpanKind, SpanStatusCode } from "@opentelemetry/api";

// Initialize Azure Monitor with OpenTelemetry
useAzureMonitor({
  azureMonitorExporterOptions: {
    connectionString: process.env.APPLICATIONINSIGHTS_CONNECTION_STRING,
  },
});

// Create custom spans
const tracer = trace.getTracer("my-service");

async function processOrder(orderId: string) {
  return tracer.startActiveSpan("processOrder", { kind: SpanKind.INTERNAL }, async (span) => {
    try {
      span.setAttribute("order.id", orderId);

      // Nested span for validation
      await tracer.startActiveSpan("validateOrder", async (validationSpan) => {
        await validateOrder(orderId);
        validationSpan.end();
      });

      // Nested span for payment
      await tracer.startActiveSpan("chargePayment", async (paymentSpan) => {
        paymentSpan.setAttribute("payment.method", "credit_card");
        await chargePayment(orderId);
        paymentSpan.end();
      });

      span.setStatus({ code: SpanStatusCode.OK });
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  });
}
```

### Correlation IDs

Azure Monitor uses W3C Trace Context for correlation across services:
- **Operation ID** (`operation_Id`): Root trace ID, shared by all telemetry in one user request
- **Parent ID** (`operation_ParentId`): Span ID of the calling service
- **Span ID**: Unique ID for each operation within the trace

**Query correlated telemetry**:
```kusto
// Find all telemetry for a specific operation
union requests, dependencies, exceptions, traces
| where operation_Id == "<operation-id>"
| project timestamp, itemType, name, duration, success, message,
    operation_ParentId, itemId
| order by timestamp asc
```

### Performance Profiler

Application Insights Profiler captures .NET call stacks during requests, showing exactly which code paths consume time. Enable it in Application Insights > Performance > Profiler.

For Node.js applications, use the distributed tracing view in Application Insights > Transaction search to drill into request timelines.

### Snapshot Debugger

Snapshot Debugger captures memory snapshots when exceptions occur, allowing you to inspect variable values at the time of failure without redeploying.

```bash
# Enable snapshot debugger (via portal or ARM)
az monitor app-insights component update \
  --app my-web-app-insights \
  --resource-group monitoring-rg \
  --set properties.DisableIpMasking=false
```

Access in Azure Portal: Application Insights > Failures > Select an exception > Open Debug Snapshot.

## 10. Alerting Best Practices

### Prevent Alert Fatigue

| Practice | Implementation |
|----------|---------------|
| Use dynamic thresholds | Let ML learn normal patterns instead of guessing static values |
| Set appropriate severity | Reserve Sev 0 for true outages; use Sev 3-4 for informational |
| Require sustained conditions | Use larger evaluation windows (15m) instead of single-point triggers |
| Group related alerts | Use smart groups (preview) to correlate related alerts |
| Deduplicate notifications | Configure alert processing rules to suppress duplicates |

### Severity Guidelines

| Severity | Who to notify | Response Time | Example |
|----------|--------------|---------------|---------|
| 0 - Critical | On-call page (PagerDuty/OpsGenie) | < 15 min | Service down, data loss, security breach |
| 1 - Error | Team channel + email | < 1 hour | High error rate, degraded performance |
| 2 - Warning | Team channel | < 4 hours | Approaching capacity, elevated latency |
| 3 - Informational | Dashboard / ticket | Next business day | Unusual patterns, configuration drift |
| 4 - Verbose | Log only | Review in weekly meeting | Diagnostic data, low-priority trends |

### Action Group Design

| Scenario | Action Group Configuration |
|----------|---------------------------|
| Critical (Sev 0) | PagerDuty webhook + SMS to on-call + email to ops-leads |
| Error (Sev 1) | Teams channel webhook + email to team DL |
| Warning (Sev 2) | Email to team DL + create ServiceNow ticket |
| Informational (Sev 3-4) | Email digest (use Logic App for batching) |

### Alert Processing Rules

Alert processing rules (formerly action rules) modify alert behavior without changing the alert rule itself.

```bash
# Suppress all alerts during a maintenance window
az monitor alert-processing-rule create \
  --name "maintenance-window" \
  --resource-group monitoring-rg \
  --rule-type RemoveAllActionGroups \
  --scopes "/subscriptions/<sub>/resourceGroups/production-rg" \
  --schedule-recurrence-type Weekly \
  --schedule-recurrence "Sunday" \
  --schedule-start-time "02:00:00" \
  --schedule-end-time "06:00:00" \
  --schedule-time-zone "Eastern Standard Time"
```

### Suppression Rules

Prevent duplicate notifications for the same issue:
- **Mute period**: After an alert fires, suppress repeat notifications for a specified duration (e.g., 1 hour)
- **Resolution required**: Only re-fire after the alert has auto-resolved and re-triggered
- **Daily digest**: Use Logic App to batch low-severity alerts into a daily summary

## 11. Cost Management

### Log Analytics Cost Drivers

| Factor | Impact | Optimization |
|--------|--------|-------------|
| Data ingestion volume | Primary cost driver ($2.76/GB pay-as-you-go) | Filter at collection, use DCR transforms |
| Data retention | Charges beyond 31 days of interactive retention | Use archive tier for older data |
| Log queries | Charged per GB scanned in archive tier | Use time filters, optimize queries |
| Commitment tiers | Discounts at 100+ GB/day | Analyze usage patterns, commit to predictable volume |

### Data Ingestion Optimization

**Use Basic logs for high-volume, low-query tables**:
Basic logs cost ~$0.65/GB (vs $2.76/GB analytics) but have limited query capabilities (8-day retention, no alerts, limited KQL).

```bash
# Set a table to Basic logs plan
az monitor log-analytics workspace table update \
  --resource-group monitoring-rg \
  --workspace-name prod-logs \
  --table-name ContainerLogV2 \
  --plan Basic
```

**Tables suitable for Basic logs**: `ContainerLogV2`, `AppTraces`, custom tables with high volume and infrequent queries.

**Data Collection Rule (DCR) transforms for filtering**:
```json
{
  "transformKql": "source | where SeverityLevel >= 2 | project-away RawData, AdditionalContext"
}
```
This KQL runs at ingestion time, dropping debug/verbose logs and unnecessary columns before they reach the workspace.

### Workspace Commitment Tiers

| Daily Volume | Recommended Tier | Approx. Savings vs Pay-as-you-go |
|-------------|-----------------|----------------------------------|
| < 100 GB | Pay-as-you-go | Baseline |
| 100-200 GB | 100 GB commitment | ~15-20% |
| 200-500 GB | 200-500 GB commitment | ~20-30% |
| 500+ GB | 500+ GB commitment | ~30%+ |

```bash
# Check current daily ingestion
az monitor log-analytics workspace show \
  --resource-group monitoring-rg \
  --workspace-name prod-logs \
  --query "properties.sku"

# Usage query to estimate daily volume
# Run in Log Analytics:
# Usage | where TimeGenerated > ago(30d) | summarize DailyGB=sum(Quantity)/1024 by bin(TimeGenerated, 1d) | summarize AvgDaily=avg(DailyGB), P95Daily=percentile(DailyGB, 95)
```

### Cost Monitoring Queries

```kusto
// Daily ingestion by table (last 30 days)
Usage
| where TimeGenerated > ago(30d)
| summarize IngestedGB = sum(Quantity) / 1024 by DataType, bin(TimeGenerated, 1d)
| summarize AvgDailyGB = avg(IngestedGB), TotalGB = sum(IngestedGB) by DataType
| order by TotalGB desc

// Billable vs non-billable data
Usage
| where TimeGenerated > ago(30d)
| summarize TotalGB = sum(Quantity) / 1024 by IsBillable, DataType
| order by TotalGB desc
```

## 12. Common Patterns

### Pattern 1: Full-Stack Monitoring for Web App + SQL + Functions

Set up comprehensive monitoring for a typical Azure web application.

**Step 1: Create shared monitoring infrastructure**:
```bash
# Create resource group and Log Analytics workspace
az group create --name monitoring-rg --location eastus
az monitor log-analytics workspace create \
  --resource-group monitoring-rg --workspace-name prod-logs \
  --location eastus --retention-time 90

# Create Application Insights (workspace-based)
az monitor app-insights component create \
  --app prod-app-insights --location eastus \
  --resource-group monitoring-rg \
  --workspace "/subscriptions/<sub>/resourceGroups/monitoring-rg/providers/Microsoft.OperationalInsights/workspaces/prod-logs" \
  --kind web --application-type web

# Create action group
az monitor action-group create \
  --name ops-team --resource-group monitoring-rg --short-name OpsTeam \
  --email-receiver name=Lead email=ops@contoso.com
```

**Step 2: Enable diagnostic settings for all resources**:
```bash
# App Service
az monitor diagnostic-settings create \
  --name "appservice-diag" \
  --resource "/subscriptions/<sub>/resourceGroups/<rg>/providers/Microsoft.Web/sites/<app>" \
  --workspace "/subscriptions/<sub>/resourceGroups/monitoring-rg/providers/Microsoft.OperationalInsights/workspaces/prod-logs" \
  --logs '[{"categoryGroup":"allLogs","enabled":true}]' \
  --metrics '[{"category":"AllMetrics","enabled":true}]'

# SQL Database
az monitor diagnostic-settings create \
  --name "sql-diag" \
  --resource "/subscriptions/<sub>/resourceGroups/<rg>/providers/Microsoft.Sql/servers/<server>/databases/<db>" \
  --workspace "/subscriptions/<sub>/resourceGroups/monitoring-rg/providers/Microsoft.OperationalInsights/workspaces/prod-logs" \
  --logs '[{"category":"SQLInsights","enabled":true},{"category":"Errors","enabled":true},{"category":"Deadlocks","enabled":true}]' \
  --metrics '[{"category":"AllMetrics","enabled":true}]'

# Azure Functions
az monitor diagnostic-settings create \
  --name "functions-diag" \
  --resource "/subscriptions/<sub>/resourceGroups/<rg>/providers/Microsoft.Web/sites/<function-app>" \
  --workspace "/subscriptions/<sub>/resourceGroups/monitoring-rg/providers/Microsoft.OperationalInsights/workspaces/prod-logs" \
  --logs '[{"categoryGroup":"allLogs","enabled":true}]' \
  --metrics '[{"category":"AllMetrics","enabled":true}]'
```

**Step 3: Configure Application Insights in the app**:
```typescript
import { useAzureMonitor } from "@azure/monitor-opentelemetry";

useAzureMonitor({
  azureMonitorExporterOptions: {
    connectionString: process.env.APPLICATIONINSIGHTS_CONNECTION_STRING,
  },
});
```

**Step 4: Create alerts**:
```bash
# High error rate
az monitor metrics alert create \
  --name "High-5xx-Rate" --resource-group monitoring-rg \
  --scopes "/subscriptions/<sub>/resourceGroups/<rg>/providers/Microsoft.Web/sites/<app>" \
  --condition "total Http5xx > 10" --window-size 5m --evaluation-frequency 1m \
  --severity 1 --action "/subscriptions/<sub>/resourceGroups/monitoring-rg/providers/microsoft.insights/actionGroups/ops-team"

# SQL DTU saturation
az monitor metrics alert create \
  --name "SQL-DTU-High" --resource-group monitoring-rg \
  --scopes "/subscriptions/<sub>/resourceGroups/<rg>/providers/Microsoft.Sql/servers/<server>/databases/<db>" \
  --condition "avg dtu_consumption_percent > 85" --window-size 10m --evaluation-frequency 5m \
  --severity 2 --action "/subscriptions/<sub>/resourceGroups/monitoring-rg/providers/microsoft.insights/actionGroups/ops-team"

# Availability test
az monitor app-insights web-test create \
  --resource-group monitoring-rg --name "Health Check" \
  --app-insights prod-app-insights --location eastus \
  --web-test-kind ping --defined-web-test-name "HealthCheck" \
  --url "https://myapp.azurewebsites.net/health" \
  --frequency 300 --timeout 120 --expected-status-code 200
```

### Pattern 2: KQL Dashboard for Error Analysis

Build a workbook-style query set for triaging production errors.

```kusto
// 1. Error overview tile
requests
| where timestamp > ago(24h)
| summarize TotalRequests=count(), FailedRequests=countif(success == false),
    ErrorRate=round(countif(success == false) * 100.0 / count(), 2)
| project TotalRequests, FailedRequests, ErrorRate

// 2. Errors by status code over time
requests
| where timestamp > ago(24h)
| where success == false
| summarize Count=count() by resultCode, bin(timestamp, 1h)
| render timechart

// 3. Top failing operations
requests
| where timestamp > ago(24h)
| where success == false
| summarize ErrorCount=count(), P95Latency=percentile(duration, 95) by operation_Name
| order by ErrorCount desc
| take 10

// 4. Exception breakdown with stack traces
exceptions
| where timestamp > ago(24h)
| summarize Count=count(), LastSeen=max(timestamp) by type, outerMessage
| order by Count desc
| take 10

// 5. Dependency failures impacting requests
dependencies
| where timestamp > ago(24h)
| where success == false
| join kind=inner (
    requests
    | where timestamp > ago(24h)
    | where success == false
    | project operation_Id
) on operation_Id
| summarize ImpactedRequests=dcount(operation_Id), AvgLatency=avg(duration)
    by target, type, resultCode
| order by ImpactedRequests desc
```

### Pattern 3: Custom Availability Monitoring with Multi-Step Tests

Implement programmatic availability tests for complex user flows.

```typescript
import * as appInsights from "applicationinsights";

appInsights.setup(process.env.APPLICATIONINSIGHTS_CONNECTION_STRING).start();
const client = appInsights.defaultClient;

async function runAvailabilityTest() {
  const testName = "Checkout Flow";
  const startTime = new Date();
  let success = true;
  let message = "All steps passed";
  let duration = 0;

  try {
    // Step 1: Load product page
    const step1Start = Date.now();
    const productRes = await fetch("https://myapp.com/api/products/1");
    if (!productRes.ok) throw new Error(`Product page failed: ${productRes.status}`);
    const step1Duration = Date.now() - step1Start;

    // Step 2: Add to cart
    const step2Start = Date.now();
    const cartRes = await fetch("https://myapp.com/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: "1", quantity: 1 }),
    });
    if (!cartRes.ok) throw new Error(`Add to cart failed: ${cartRes.status}`);
    const step2Duration = Date.now() - step2Start;

    // Step 3: Validate cart
    const step3Start = Date.now();
    const validateRes = await fetch("https://myapp.com/api/cart/validate");
    if (!validateRes.ok) throw new Error(`Cart validation failed: ${validateRes.status}`);
    const step3Duration = Date.now() - step3Start;

    duration = step1Duration + step2Duration + step3Duration;
    message = `Step1: ${step1Duration}ms, Step2: ${step2Duration}ms, Step3: ${step3Duration}ms`;
  } catch (error) {
    success = false;
    message = (error as Error).message;
    duration = Date.now() - startTime.getTime();
  }

  client.trackAvailability({
    name: testName,
    success,
    duration,
    runLocation: "Custom-EastUS",
    message,
    time: startTime,
    id: `${testName}-${startTime.toISOString()}`,
  });
}

// Run every 5 minutes
setInterval(runAvailabilityTest, 5 * 60 * 1000);
runAvailabilityTest();
```

### Pattern 4: Cost-Optimized Logging with DCR Filtering

Use Data Collection Rules to filter noisy telemetry at ingestion time, reducing costs.

**Step 1: Identify high-volume tables**:
```kusto
Usage
| where TimeGenerated > ago(30d)
| summarize DailyGB = sum(Quantity) / 1024.0 / 30.0 by DataType
| order by DailyGB desc
| take 10
```

**Step 2: Create a DCR with transform that filters verbose logs**:
```json
{
  "properties": {
    "dataCollectionEndpointId": "/subscriptions/<sub>/resourceGroups/monitoring-rg/providers/Microsoft.Insights/dataCollectionEndpoints/prod-dce",
    "streamDeclarations": {
      "Custom-AppLogs": {
        "columns": [
          { "name": "TimeGenerated", "type": "datetime" },
          { "name": "Level", "type": "string" },
          { "name": "Message", "type": "string" },
          { "name": "ServiceName", "type": "string" }
        ]
      }
    },
    "dataSources": {
      "logFiles": [
        {
          "streams": ["Custom-AppLogs"],
          "filePatterns": ["/var/log/myapp/*.log"],
          "format": "json",
          "name": "appLogs"
        }
      ]
    },
    "dataFlows": [
      {
        "streams": ["Custom-AppLogs"],
        "destinations": ["prod-logs"],
        "transformKql": "source | where Level in ('Error', 'Warning', 'Critical') or (Level == 'Information' and Message !has 'health check')",
        "outputStream": "Custom-AppLogs_CL"
      }
    ],
    "destinations": {
      "logAnalytics": [
        {
          "workspaceResourceId": "/subscriptions/<sub>/resourceGroups/monitoring-rg/providers/Microsoft.OperationalInsights/workspaces/prod-logs",
          "name": "prod-logs"
        }
      ]
    }
  }
}
```

**Step 3: Switch high-volume tables to Basic plan**:
```bash
# ContainerLogV2 is often the largest table in AKS environments
az monitor log-analytics workspace table update \
  --resource-group monitoring-rg \
  --workspace-name prod-logs \
  --table-name ContainerLogV2 \
  --plan Basic

# AppTraces for verbose application logs
az monitor log-analytics workspace table update \
  --resource-group monitoring-rg \
  --workspace-name prod-logs \
  --table-name AppTraces \
  --plan Basic
```

**Step 4: Set up cost alert**:
```bash
# Create a budget alert for the Log Analytics workspace
az consumption budget create \
  --budget-name "log-analytics-budget" \
  --amount 500 \
  --time-grain Monthly \
  --start-date 2024-01-01 \
  --end-date 2025-12-31 \
  --resource-group monitoring-rg \
  --category Cost \
  --notifications '{"actual_GreaterThan_80":{"enabled":true,"operator":"GreaterThan","threshold":80,"contactEmails":["ops@contoso.com"]}}'
```

## Knowledge references

- `references/operational-knowledge.md` — compact API surface map, prerequisite matrix, deterministic failure remediation, limits/quotas and pagination/throttling guidance, and safe-default read-first/apply-second pattern.
