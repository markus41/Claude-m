# Azure Monitor — Application Insights

## Overview

Application Insights is the APM (Application Performance Monitoring) component of Azure Monitor. It collects telemetry from applications — requests, dependencies, exceptions, traces, custom events, and metrics — and stores it in a Log Analytics workspace (workspace-based mode, recommended). It provides live metrics, distributed tracing, smart detection, availability tests, and AI-powered anomaly detection.

---

## REST API Endpoints

Base URL: `https://management.azure.com`
API Version: `2020-02-02`

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|----------------------|----------------|-------|
| PUT | `/subscriptions/{sub}/resourceGroups/{rg}/providers/microsoft.insights/components/{name}` | Monitoring Contributor | Body: component definition | Create or update App Insights resource |
| GET | `/subscriptions/{sub}/resourceGroups/{rg}/providers/microsoft.insights/components/{name}` | Monitoring Reader | — | Get component details (includes connection string) |
| GET | `/subscriptions/{sub}/resourceGroups/{rg}/providers/microsoft.insights/components` | Monitoring Reader | — | List App Insights resources in resource group |
| DELETE | `/subscriptions/{sub}/resourceGroups/{rg}/providers/microsoft.insights/components/{name}` | Monitoring Contributor | — | Delete component |
| POST | `/subscriptions/{sub}/resourceGroups/{rg}/providers/microsoft.insights/components/{name}/purge` | Monitoring Contributor | Body: table and filter | Purge specific telemetry data (GDPR) |
| PUT | `/subscriptions/{sub}/resourceGroups/{rg}/providers/microsoft.insights/webtests/{testName}` | Monitoring Contributor | Body: web test definition | Create availability test |
| GET | `/subscriptions/{sub}/resourceGroups/{rg}/providers/microsoft.insights/webtests` | Monitoring Reader | — | List availability tests |

**Direct query API** (`https://api.applicationinsights.io/v1`):

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|----------------------|----------------|-------|
| POST | `/apps/{appId}/query` | Monitoring Reader (or api key) | `query`, `timespan` | Execute KQL query |
| GET | `/apps/{appId}/metrics/{metricId}` | Monitoring Reader | `timespan`, `interval`, `aggregation` | Retrieve metric |
| GET | `/apps/{appId}/events/{eventType}` | Monitoring Reader | `$filter`, `$top`, `timespan` | Query events |

---

## Create App Insights Resource (Bicep)

```bicep
// Workspace-based Application Insights (recommended)
resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: '${appName}-law'
  location: location
  properties: {
    sku: { name: 'PerGB2018' }
    retentionInDays: 90
    features: {
      enableLogAccessUsingOnlyResourcePermissions: true
    }
  }
}

resource appInsights 'microsoft.insights/components@2020-02-02' = {
  name: '${appName}-ai'
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalytics.id
    IngestionMode: 'LogAnalytics'
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
    RetentionInDays: 90
    SamplingPercentage: 100 // disable sampling at resource level; configure in SDK
  }
}

output connectionString string = appInsights.properties.ConnectionString
output instrumentationKey string = appInsights.properties.InstrumentationKey
```

---

## SDK Integration

### Node.js / TypeScript

```bash
npm install applicationinsights
```

```typescript
// Initialize BEFORE any other imports — must be first
import appInsights from "applicationinsights";

appInsights
  .setup(process.env.APPLICATIONINSIGHTS_CONNECTION_STRING)
  .setAutoDependencyCorrelation(true)   // correlate outbound calls
  .setAutoCollectRequests(true)          // HTTP server requests
  .setAutoCollectPerformance(true)       // CPU, memory metrics
  .setAutoCollectExceptions(true)        // unhandled exceptions
  .setAutoCollectDependencies(true)      // HTTP, SQL, Redis dependencies
  .setAutoCollectConsole(true, true)     // console.log → traces
  .setUseDiskRetryCaching(true)          // buffer telemetry if offline
  .setSendLiveMetrics(true)              // enable live metrics stream
  .start();

export const telemetryClient = appInsights.defaultClient;

// Custom event
telemetryClient.trackEvent({
  name: "UserSignedUp",
  properties: { plan: "premium", source: "organic" },
  measurements: { conversionValue: 99.99 },
});

// Custom metric
telemetryClient.trackMetric({ name: "QueueDepth", value: 42 });

// Custom dependency
const startTime = Date.now();
telemetryClient.trackDependency({
  name: "Redis.Get",
  dependencyTypeName: "Cache",
  data: "GET user:123",
  duration: Date.now() - startTime,
  success: true,
  resultCode: "HIT",
  target: "redis.cache.windows.net",
});

// Custom trace
telemetryClient.trackTrace({
  message: "Processing started",
  severity: appInsights.Contracts.SeverityLevel.Information,
  properties: { correlationId: "abc-123" },
});
```

### .NET (ASP.NET Core)

```csharp
// Program.cs
using Microsoft.ApplicationInsights.Extensibility;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddApplicationInsightsTelemetry(options =>
{
    options.ConnectionString = builder.Configuration["APPLICATIONINSIGHTS_CONNECTION_STRING"];
    options.EnableAdaptiveSampling = true;
    options.EnableDependencyTrackingTelemetryModule = true;
});

// Custom telemetry in controller
public class OrdersController : ControllerBase
{
    private readonly TelemetryClient _telemetry;

    public OrdersController(TelemetryClient telemetry)
    {
        _telemetry = telemetry;
    }

    [HttpPost]
    public async Task<IActionResult> CreateOrder([FromBody] OrderDto dto)
    {
        _telemetry.TrackEvent("OrderCreated", new Dictionary<string, string>
        {
            ["orderId"] = dto.Id,
            ["customerId"] = dto.CustomerId
        });

        // Metric tracking
        _telemetry.TrackMetric("OrderValue", dto.Total);

        return Ok();
    }
}
```

### Python

```python
from azure.monitor.opentelemetry import configure_azure_monitor
from opentelemetry import trace

# Configure (reads APPLICATIONINSIGHTS_CONNECTION_STRING from environment)
configure_azure_monitor()

tracer = trace.get_tracer(__name__)

def process_request(request_data: dict) -> dict:
    with tracer.start_as_current_span("process_request") as span:
        span.set_attribute("request.id", request_data.get("id", "unknown"))
        span.set_attribute("request.size", len(str(request_data)))
        # Processing logic
        result = {"processed": True}
        return result
```

---

## Sampling Configuration

Sampling reduces ingestion volume and cost while preserving statistical accuracy.

### Adaptive Sampling (Server-Side, Recommended)

Adaptive sampling automatically adjusts the sampling rate to maintain a target telemetry volume.

**Node.js** (`host.json` for Functions, or in SDK):
```json
{
  "logging": {
    "applicationInsights": {
      "samplingSettings": {
        "isEnabled": true,
        "maxTelemetryItemsPerSecond": 20,
        "evaluationInterval": "PT15S",
        "initialSamplingPercentage": 100,
        "minSamplingPercentage": 0.1,
        "maxSamplingPercentage": 100,
        "movingAverageRatio": 0.25,
        "excludedTypes": "Exception;Event",
        "includedTypes": "Request;Dependency;Trace"
      }
    }
  }
}
```

**`excludedTypes`**: These telemetry types are never sampled — always ingested. Use for exceptions and business-critical events.

### Fixed-Rate Sampling (Client + Server)

```typescript
// Node.js SDK
import appInsights from "applicationinsights";

const config = appInsights.defaultClient.config;
config.samplingPercentage = 25; // send 25% of telemetry
```

### Ingestion Sampling (Last Resort)

Set at the Application Insights resource level — applies after data arrives. Use SDK sampling instead to save bandwidth.

```json
PATCH /subscriptions/{sub}/resourceGroups/{rg}/providers/microsoft.insights/components/{name}
{
  "properties": {
    "SamplingPercentage": 50
  }
}
```

---

## Availability Tests

### Standard URL Ping Test (Bicep)

```bicep
resource availabilityTest 'microsoft.insights/webtests@2022-06-15' = {
  name: 'ping-test-homepage'
  location: location
  tags: {
    'hidden-link:${appInsights.id}': 'Resource'
  }
  kind: 'ping'
  properties: {
    SyntheticMonitorId: 'ping-test-homepage'
    Name: 'Homepage Availability'
    Description: 'Check homepage returns 200 every 5 minutes'
    Enabled: true
    Frequency: 300  // seconds (5 minutes)
    Timeout: 30     // seconds
    Kind: 'ping'
    RetryEnabled: true
    Locations: [
      { Id: 'us-ca-sjc-azr' }   // West US
      { Id: 'us-tx-sn1-azr' }   // South Central US
      { Id: 'us-il-ch1-azr' }   // North Central US
      { Id: 'us-va-ash-azr' }   // East US
      { Id: 'emea-nl-ams-azr' } // West Europe
    ]
    Configuration: {
      WebTest: '''<WebTest Name="ping-test-homepage" xmlns="http://microsoft.com/schemas/VisualStudio/TeamTest/2010">
        <Items>
          <Request Method="GET" Version="1.1" Url="https://myapp.azurewebsites.net/" ThinkTime="0" Timeout="30" ParseDependentRequests="False" FollowRedirects="True" RecordResult="True" Cache="False" ResponseTimeGoal="0" Encoding="utf-8" ExpectedHttpStatusCode="200">
          </Request>
        </Items>
      </WebTest>'''
    }
  }
}

// Alert for availability
resource availabilityAlert 'microsoft.insights/metricalerts@2018-03-01' = {
  name: 'availability-alert'
  location: 'global'
  properties: {
    description: 'Alert when availability drops below 90%'
    severity: 1
    enabled: true
    scopes: [appInsights.id]
    evaluationFrequency: 'PT1M'
    windowSize: 'PT5M'
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.WebtestLocationAvailabilityCriteria'
      webTestId: availabilityTest.id
      componentId: appInsights.id
      failedLocationCount: 3
    }
    actions: [{ actionGroupId: actionGroup.id }]
  }
}
```

**Location IDs** (common subset):
| Location ID | Region |
|-------------|--------|
| `us-va-ash-azr` | East US |
| `us-ca-sjc-azr` | West US |
| `emea-nl-ams-azr` | West Europe |
| `emea-gb-db3-azr` | UK South |
| `apac-sg-sin-azr` | Southeast Asia |
| `apac-jp-kaw-azr` | Japan East |

---

## Smart Detection (Proactive Detection)

Smart Detection rules automatically analyze telemetry and alert on anomalies without manual configuration.

```json
GET .../components/{name}/proactiveDetectionConfigs?api-version=2018-05-01-preview

// Disable a specific rule (e.g., email digest)
PATCH .../components/{name}/proactiveDetectionConfigs/slowpageloadtime?api-version=2018-05-01-preview
{
  "properties": {
    "enabled": false,
    "sendEmailsToSubscriptionOwners": false,
    "customEmails": ["platform-team@example.com"]
  }
}
```

**Built-in smart detection rules**:
| Rule ID | Description |
|---------|-------------|
| `slowpageloadtime` | Degradation in page load time |
| `slowserverresponsetime` | Degradation in server response time |
| `longdependencyduration` | Degradation in dependency duration |
| `degradationinserverresponsetime` | Statistical degradation detection |
| `traceseveritydetector` | Unusual increase in severity level |
| `extensionexceptions` | Unusual increase in exceptions |
| `memoryleakextension` | Potential memory leak detection |

---

## Dependency Tracking

Application Insights auto-tracks outgoing HTTP calls, SQL queries, and Redis operations. Custom dependencies enable tracking of any external call.

```typescript
import appInsights from "applicationinsights";

const client = appInsights.defaultClient;

async function callExternalService(url: string, payload: object): Promise<unknown> {
  const startTime = new Date();
  const timer = process.hrtime();
  let success = false;
  let responseCode = "0";

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    success = response.ok;
    responseCode = response.status.toString();
    return await response.json();
  } catch (err) {
    success = false;
    throw err;
  } finally {
    const elapsed = process.hrtime(timer);
    const duration = elapsed[0] * 1000 + elapsed[1] / 1000000;

    client.trackDependency({
      name: `POST ${new URL(url).pathname}`,
      dependencyTypeName: "HTTP",
      data: url,
      target: new URL(url).host,
      duration,
      success,
      resultCode: responseCode,
      time: startTime,
    });
  }
}
```

---

## Error Codes Table

| Code | Meaning | Remediation |
|------|---------|-------------|
| `403 Forbidden on ingestion` | Ingestion endpoint blocked or wrong key | Verify `APPLICATIONINSIGHTS_CONNECTION_STRING` includes correct endpoint URL |
| `429 TooManyRequests on ingestion` | Ingestion rate limit hit | Enable adaptive sampling; reduce telemetry volume |
| `InvalidInstrumentationKey` | Wrong or malformed key | Use connection string instead of instrumentation key (deprecated for new resources) |
| `WorkspaceNotFound` | Linked workspace deleted or moved | Re-link to a new workspace; resource data may be inaccessible |
| `PurgeInProgress` | Data purge operation in progress | Wait for purge to complete; check status via purge status endpoint |
| `AvailabilityTestNotFound` | Availability test deleted but alert still references it | Delete the alert rule referencing the deleted test |
| `SamplingDropped` | Adaptive sampling dropped telemetry | Increase `maxTelemetryItemsPerSecond` or add type to `excludedTypes` |
| `SDK not initialized` | `appInsights.start()` not called | Call `setup().start()` before any imports that make HTTP calls |

---

## Throttling Limits Table

| Resource | Limit | Retry Strategy |
|----------|-------|---------------|
| Ingestion endpoint throughput | 32,000 events/second per resource | Enable sampling; use batch ingestion |
| Availability test regions | Up to 16 locations per test | Limit to 5-6 regions for SLA-relevant geography |
| Availability test frequency | Minimum 5 minutes | Use 1-minute frequency only for critical endpoints |
| Purge requests | 10 per hour | Batch purge requests; use table-level purge not row-level |
| SDK flush interval | 30 seconds default | Call `flush()` on graceful shutdown; set `disableTelemetry` in tests |
| Classic App Insights API keys | 10 per resource | Use workspace-based mode with Azure AD auth instead |
| Connection strings per resource | 1 per resource | Use workspace-based resources; one connection string is sufficient |

---

## Common Patterns and Gotchas

**1. Connection string vs instrumentation key**
Always use `APPLICATIONINSIGHTS_CONNECTION_STRING`. The instrumentation key alone (`APPINSIGHTS_INSTRUMENTATIONKEY`) is deprecated for new SDK versions and does not support sovereign cloud endpoints. Connection strings include both the key and the correct endpoint URLs for each cloud environment.

**2. SDK initialization order (Node.js)**
The Application Insights Node.js SDK uses monkey-patching to intercept HTTP calls, SQL clients, and other modules. It MUST be initialized before any other `require`/`import` statements. If initialized after `express` or `http`, automatic dependency tracking will not work.

**3. Workspace-based vs classic mode**
Workspace-based Application Insights (default since 2020) stores data in Log Analytics. Classic mode stores in a proprietary store. Classic resources cannot query their data alongside other Log Analytics data. Always create workspace-based resources.

**4. Correlation across microservices**
The SDK propagates W3C `traceparent` headers automatically for outbound HTTP calls. For Service Bus and Event Hubs, use `Diagnostic-Id` message properties. For manual correlation, use `telemetryClient.context.keys.operationId` to set the operation ID.

**5. Live metrics vs historical data**
Live Metrics (`/quickpulse`) shows real-time data with < 1 second latency but does not persist. It is separate from the ingestion pipeline — enabling or disabling it does not affect data retention. Use Live Metrics for real-time debugging, not for alerting or dashboards.

**6. Sampling and exceptions**
Adaptive sampling should always exclude exceptions from sampling (use `excludedTypes: "Exception"`). A sampled-out exception that caused a request failure will break distributed trace correlation and hide root cause analysis.

**7. Custom dimensions size limit**
Custom properties (dimensions) have a 150-character limit per key and 8,192-character limit per value. Custom measurements must be numeric. Exceeding these limits causes silently truncated or dropped telemetry.

**8. Application map dependencies**
The Application Map in the Azure portal is built from dependency telemetry. Ensure `target` is set to the downstream service name (not a URL with query strings) in `trackDependency` calls for meaningful map visualization.
