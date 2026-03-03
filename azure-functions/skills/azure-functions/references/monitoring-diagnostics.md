# Azure Functions — Monitoring & Diagnostics

## Overview

Azure Functions integrates with Application Insights for telemetry collection, structured logging, distributed tracing, live metrics, and alerting. Log Analytics workspaces aggregate logs for long-term analysis and KQL queries. The Functions host emits built-in telemetry (requests, dependencies, exceptions, traces) that can be supplemented with custom events and metrics from application code.

---

## REST API Endpoints

### Application Insights REST API

Base URL: `https://api.applicationinsights.io/v1`
Authentication: `api_key` header or Azure AD token with scope `https://api.applicationinsights.io/.default`

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|----------------------|----------------|-------|
| GET | `/apps/{appId}/query` | Monitoring Reader | `query` (KQL), `timespan` | Execute KQL query against App Insights |
| GET | `/apps/{appId}/metrics/{metricId}` | Monitoring Reader | `timespan`, `interval`, `aggregation` | Retrieve metric time-series |
| GET | `/apps/{appId}/events/{eventType}` | Monitoring Reader | `$filter`, `$top`, `timespan` | Query events (requests, exceptions, etc.) |

### Azure Monitor Alert Rules

Base URL: `https://management.azure.com`

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|----------------------|----------------|-------|
| PUT | `/subscriptions/{sub}/resourceGroups/{rg}/providers/microsoft.insights/metricalerts/{ruleName}` | Monitoring Contributor | Body: alert rule definition | Create or update metric alert |
| GET | `/subscriptions/{sub}/resourceGroups/{rg}/providers/microsoft.insights/metricalerts` | Monitoring Reader | — | List metric alerts |
| PUT | `/subscriptions/{sub}/resourceGroups/{rg}/providers/microsoft.insights/scheduledqueryrules/{ruleName}` | Monitoring Contributor | Body: log alert rule | Create log-based alert |
| PUT | `/subscriptions/{sub}/resourceGroups/{rg}/providers/microsoft.insights/actiongroups/{groupName}` | Monitoring Contributor | Body: action group | Create or update action group |

### Log Analytics Workspace

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|----------------------|----------------|-------|
| POST | `/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.OperationalInsights/workspaces/{ws}/api/query` | Log Analytics Reader | `query`, `timespan` | Execute KQL against workspace |

---

## Application Insights Integration

### Auto-Instrumentation Setup

```typescript
// App settings (no code changes needed for auto-instrumentation)
// APPLICATIONINSIGHTS_CONNECTION_STRING=InstrumentationKey=xxx;IngestionEndpoint=https://xxx...
// For Node.js v4 SDK: set before any imports

import { app } from "@azure/functions";
// Auto-instrumentation is active via the connection string app setting
// All HTTP requests, dependencies, and exceptions are tracked automatically
```

### Manual Instrumentation (TelemetryClient)

```typescript
import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { TelemetryClient } from "applicationinsights";

let telemetryClient: TelemetryClient | null = null;

function getTelemetryClient(): TelemetryClient {
  if (!telemetryClient) {
    const appInsights = require("applicationinsights");
    appInsights.setup().start();
    telemetryClient = appInsights.defaultClient;
  }
  return telemetryClient!;
}

app.http("processOrder", {
  methods: ["POST"],
  authLevel: "function",
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    const client = getTelemetryClient();
    const body = await req.json() as { orderId: string; amount: number };
    const startTime = Date.now();

    try {
      // Track custom event
      client.trackEvent({
        name: "OrderReceived",
        properties: { orderId: body.orderId, source: "api" },
        measurements: { amount: body.amount },
      });

      // Track custom metric
      client.trackMetric({ name: "OrderAmount", value: body.amount });

      // Simulate processing
      await processOrder(body.orderId);

      // Track dependency (e.g., downstream service call)
      client.trackDependency({
        name: "PaymentService.charge",
        dependencyTypeName: "HTTP",
        data: "POST /charge",
        duration: Date.now() - startTime,
        success: true,
        resultCode: "200",
      });

      return { status: 200, jsonBody: { processed: true } };
    } catch (err) {
      client.trackException({ exception: err as Error });
      throw err;
    }
  },
});

async function processOrder(orderId: string): Promise<void> {
  // business logic
}
```

---

## Structured Logging

The `InvocationContext` logger writes to Application Insights as traces.

```typescript
app.http("structuredLog", {
  methods: ["GET"],
  authLevel: "function",
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    // Log levels: trace, debug, information, warning, error, critical
    ctx.trace("Detailed trace — verbose output");
    ctx.debug("Debug message with data", { key: "value" });
    ctx.log("Information message"); // ctx.log = information level
    ctx.warn("Warning: rate limit approaching", { current: 950, limit: 1000 });
    ctx.error("Error occurred", new Error("Something failed"));

    // Structured properties automatically flow to App Insights
    // Query in KQL: traces | where message contains "Warning" | project timestamp, message, customDimensions
    return { status: 200, body: "OK" };
  },
});
```

**Log level filtering** (`host.json`):
```json
{
  "logging": {
    "logLevel": {
      "default": "Warning",
      "Function.structuredLog": "Information",
      "Function.structuredLog.User": "Trace"
    }
  }
}
```

The `.User` suffix targets application-level logs only (not host framework logs).

---

## KQL Queries for Azure Functions

### Request Success Rate (Last Hour)

```kql
requests
| where timestamp > ago(1h)
| where cloud_RoleName == "my-func-app"
| summarize
    total = count(),
    success = countif(success == true),
    failed = countif(success == false)
    by bin(timestamp, 5m)
| extend successRate = round(100.0 * success / total, 2)
| order by timestamp asc
```

### Function Execution Duration (P50/P95/P99)

```kql
requests
| where timestamp > ago(1h)
| where cloud_RoleName == "my-func-app"
| summarize
    p50 = percentile(duration, 50),
    p95 = percentile(duration, 95),
    p99 = percentile(duration, 99),
    avg = avg(duration),
    count = count()
    by name
| order by p95 desc
```

### Exception Summary

```kql
exceptions
| where timestamp > ago(24h)
| where cloud_RoleName == "my-func-app"
| summarize
    errorCount = count(),
    affected = dcount(operation_Id)
    by type, outerMessage
| order by errorCount desc
| take 20
```

### Slow Dependencies

```kql
dependencies
| where timestamp > ago(1h)
| where cloud_RoleName == "my-func-app"
| where duration > 1000 // > 1 second
| summarize
    avgDuration = avg(duration),
    p95 = percentile(duration, 95),
    count = count(),
    failRate = countif(success == false) * 100.0 / count()
    by target, name, type
| order by p95 desc
```

### Function Invocation Failures with Stack Trace

```kql
exceptions
| where timestamp > ago(6h)
| where cloud_RoleName == "my-func-app"
| where severityLevel >= 3 // Error or Critical
| project timestamp, operation_Name, type, outerMessage, innermostMessage, details
| order by timestamp desc
| take 50
```

### Custom Events Query

```kql
customEvents
| where timestamp > ago(24h)
| where cloud_RoleName == "my-func-app"
| where name == "OrderReceived"
| summarize
    count = count(),
    totalAmount = sum(todouble(customMeasurements.amount))
    by bin(timestamp, 1h)
| order by timestamp asc
```

### Cold Start Detection

```kql
traces
| where timestamp > ago(1h)
| where cloud_RoleName == "my-func-app"
| where message contains "Host started" or message contains "Executing"
| project timestamp, message, operation_Id
| order by timestamp asc
```

### Scale Controller Events

```kql
traces
| where timestamp > ago(2h)
| where cloud_RoleName == "my-func-app"
| where customDimensions.Category == "ScaleController"
| project timestamp, message, customDimensions
| order by timestamp asc
```

Enable with app setting: `SCALE_CONTROLLER_LOGGING_ENABLED=AppInsights:Verbose`

---

## Distributed Tracing

Azure Functions automatically propagates trace context (W3C TraceContext format) across HTTP calls and service bus messages. Operations are linked via `operation_Id`.

```typescript
import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";

app.http("orchestrate", {
  methods: ["POST"],
  authLevel: "function",
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    // ctx.traceContext contains traceparent and tracestate
    ctx.log(`TraceId: ${ctx.traceContext.traceParent}`);

    // Outgoing HTTP call — Application Insights SDK auto-injects traceparent header
    const response = await fetch("https://downstream.example.com/api/process", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // SDK auto-injects: "traceparent": "00-<traceId>-<spanId>-01"
      },
      body: JSON.stringify(await req.json()),
    });

    return { status: response.status };
  },
});
```

**End-to-end transaction search**: In Application Insights → Transaction Search, filter by `operation_Id` to see the full call chain across functions, HTTP calls, and Service Bus messages.

---

## Alert Rules

### Metric Alert: High Failure Rate

```json
PUT /subscriptions/{sub}/resourceGroups/{rg}/providers/microsoft.insights/metricalerts/FunctionHighFailureRate
{
  "location": "global",
  "properties": {
    "description": "Alert when function failure rate exceeds 5%",
    "severity": 2,
    "enabled": true,
    "scopes": [
      "/subscriptions/{sub}/resourceGroups/{rg}/providers/microsoft.insights/components/{appInsightsName}"
    ],
    "evaluationFrequency": "PT1M",
    "windowSize": "PT5M",
    "criteria": {
      "odata.type": "Microsoft.Azure.Monitor.MultipleResourceMultipleMetricCriteria",
      "allOf": [
        {
          "name": "FailureRate",
          "metricName": "requests/failed",
          "metricNamespace": "microsoft.insights/components",
          "operator": "GreaterThan",
          "threshold": 5,
          "timeAggregation": "Count",
          "criterionType": "StaticThresholdCriterion"
        }
      ]
    },
    "actions": [
      {
        "actionGroupId": "/subscriptions/{sub}/resourceGroups/{rg}/providers/microsoft.insights/actiongroups/ops-alerts"
      }
    ]
  }
}
```

### Log Alert: Unhandled Exceptions

```json
PUT .../scheduledqueryrules/FunctionUnhandledExceptions
{
  "location": "eastus",
  "properties": {
    "displayName": "Function Unhandled Exceptions",
    "severity": 2,
    "enabled": true,
    "evaluationFrequency": "PT5M",
    "windowSize": "PT10M",
    "scopes": ["/subscriptions/{sub}/resourceGroups/{rg}/providers/microsoft.insights/components/{appInsightsName}"],
    "criteria": {
      "allOf": [
        {
          "query": "exceptions | where cloud_RoleName == 'my-func-app' | where severityLevel >= 3",
          "timeAggregation": "Count",
          "operator": "GreaterThan",
          "threshold": 10,
          "failingPeriods": {
            "numberOfEvaluationPeriods": 1,
            "minFailingPeriodsToAlert": 1
          }
        }
      ]
    },
    "actions": {
      "actionGroups": [
        "/subscriptions/{sub}/resourceGroups/{rg}/providers/microsoft.insights/actiongroups/ops-alerts"
      ]
    }
  }
}
```

---

## Action Group Configuration

```json
PUT .../actiongroups/ops-alerts
{
  "location": "global",
  "properties": {
    "groupShortName": "OpsAlerts",
    "enabled": true,
    "emailReceivers": [
      {
        "name": "OpsTeam",
        "emailAddress": "ops@example.com",
        "useCommonAlertSchema": true
      }
    ],
    "webhookReceivers": [
      {
        "name": "PagerDuty",
        "serviceUri": "https://events.pagerduty.com/integration/xxx/enqueue",
        "useCommonAlertSchema": true
      }
    ]
  }
}
```

---

## Live Metrics Stream

Live Metrics provides real-time monitoring with < 1 second latency.

**Access**: Application Insights → Live Metrics
**API**: `https://rt.services.visualstudio.com/QuickPulseService.svc` (internal; not public)

**Filtering live data** (reduce ingestion cost):
```json
{
  "logging": {
    "applicationInsights": {
      "samplingSettings": {
        "isEnabled": true,
        "maxTelemetryItemsPerSecond": 5,
        "excludedTypes": "Request;Dependency",
        "includedTypes": "Exception;Event"
      }
    }
  }
}
```

---

## PowerShell: Alert and Diagnostic Setup

```powershell
# Create action group
$emailReceiver = New-AzActionGroupReceiver -Name "OpsTeam" -EmailReceiver `
  -EmailAddress "ops@example.com"

$ag = Set-AzActionGroup `
  -Name "ops-alerts" `
  -ResourceGroupName "rg-functions" `
  -ShortName "OpsAlerts" `
  -Receiver $emailReceiver

# Create metric alert for function failures
$condition = New-AzMetricAlertRuleV2Criteria `
  -MetricName "requests/failed" `
  -MetricNamespace "microsoft.insights/components" `
  -TimeAggregation Count `
  -Operator GreaterThan `
  -Threshold 5

Add-AzMetricAlertRuleV2 `
  -Name "FunctionHighFailureRate" `
  -ResourceGroupName "rg-functions" `
  -WindowSize (New-TimeSpan -Minutes 5) `
  -Frequency (New-TimeSpan -Minutes 1) `
  -TargetResourceId "/subscriptions/{sub}/resourceGroups/rg-functions/providers/microsoft.insights/components/func-ai" `
  -Condition $condition `
  -ActionGroup $ag.Id `
  -Severity 2

# Enable diagnostic settings on Function App
Set-AzDiagnosticSetting `
  -Name "FuncAppDiagnostics" `
  -ResourceId "/subscriptions/{sub}/resourceGroups/rg-functions/providers/Microsoft.Web/sites/my-func-app" `
  -WorkspaceId "/subscriptions/{sub}/resourceGroups/rg-functions/providers/Microsoft.OperationalInsights/workspaces/my-law" `
  -Enabled $true `
  -Category "FunctionAppLogs"
```

---

## Error Codes Table

| Code | Meaning | Remediation |
|------|---------|-------------|
| `429 Too Many Requests (App Insights ingestion)` | Data ingestion rate exceeded | Enable adaptive sampling; reduce telemetry verbosity |
| `APPLICATIONINSIGHTS_CONNECTION_STRING not set` | No telemetry collected | Add connection string to app settings; verify Key Vault reference if used |
| `Sampling dropped X% of telemetry` | Sampling active and high volume | Adjust `maxTelemetryItemsPerSecond`; exclude critical types from sampling |
| `Operation_Id not linking traces` | Missing trace propagation | Ensure `traceparent` header forwarded on outbound calls; use App Insights SDK |
| `Live Metrics not showing data` | SDK not initialized | Set `APPLICATIONINSIGHTS_CONNECTION_STRING`; restart function host |
| `Alert not firing despite threshold exceeded` | Wrong scope or metric namespace | Verify `scopes` array points to correct App Insights resource ID |
| `Log query returns no data` | Wrong workspace or time range | Verify workspace ID; default data latency is 2-5 minutes |

---

## Throttling Limits Table

| Resource | Limit | Retry Strategy |
|----------|-------|---------------|
| App Insights ingestion | 1 GB/day (free), unlimited (pay-per-use) | Enable sampling to reduce volume; archive to Storage |
| App Insights data retention | 90 days default (up to 730 days) | Export to Log Analytics or Storage for longer retention |
| Alert evaluation frequency | Minimum 1 minute | Use 5-minute windows for cost efficiency |
| Scheduled query alerts | 5 evaluations/rule/hour for free tier | Use metric alerts where possible (cheaper, faster) |
| Log Analytics query concurrency | 200 concurrent queries per workspace | Queue queries; use caching for repeated dashboards |
| Live Metrics retention | Real-time only — no historical data | Use Application Insights for historical; live metrics for real-time only |
| App Insights SDK flush | Batches sent every 30 seconds by default | Call `client.flush()` in function shutdown handler to avoid data loss |

---

## Common Patterns and Gotchas

**1. Sampling vs complete telemetry**
Default sampling reduces ingestion costs but can hide infrequent errors. For production debugging, temporarily disable sampling (`"isEnabled": false`) then re-enable. Use `excludedTypes: "Exception"` to always capture exceptions regardless of sampling rate.

**2. Correlation ID propagation across Service Bus**
Application Insights automatically injects `Diagnostic-Id` into Service Bus message properties. Downstream functions reading those messages will automatically link their telemetry to the same operation. This requires the `@azure/service-bus` SDK (not raw HTTP) for the correlation headers to be set.

**3. Cloud role name customization**
When multiple function apps share one Application Insights resource, set `WEBSITE_CLOUD_ROLE_NAME` (or `cloud.role` in SDK) to distinguish them. Default is the function app name, but this can be overridden for consistent naming in dashboards.

**4. Log Analytics vs Application Insights workspace**
Since workspace-based Application Insights (2020+), all App Insights data flows to the linked Log Analytics workspace. Prefer workspace-based mode — it enables cross-resource queries, longer retention, and access control at the workspace level.

**5. Structured logging with App Insights**
The `ctx.log()` call emits trace telemetry. Pass structured objects as additional arguments — they appear in `customDimensions` in Application Insights. Avoid string interpolation for objects (`ctx.log("User: " + JSON.stringify(user))`) — use `ctx.log("User processed", { userId: user.id })` instead.

**6. Diagnostic settings vs App Insights**
Diagnostic settings send platform logs (function host logs) to Log Analytics directly — these are different from SDK-based telemetry. Enable `FunctionAppLogs` category in diagnostic settings for host-level logging (scale events, worker restarts). Application Insights captures application-level telemetry.

**7. Function timeout and App Insights flush**
On Consumption plan, the function host may shut down abruptly at the timeout boundary, dropping buffered telemetry. If tracking critical business events, call `telemetryClient.flush()` before the function returns and use `appInsights.defaultClient.config.disableAppInsights = false` to ensure the client is initialized.
