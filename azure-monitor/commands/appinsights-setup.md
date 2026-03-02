---
name: appinsights-setup
description: "Add Application Insights instrumentation to a Node.js/TypeScript project with sampling configuration"
argument-hint: "[--sdk <opentelemetry|classic>] [--sampling <percentage>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

# Set Up Application Insights

Add Application Insights instrumentation to a Node.js or TypeScript project.

## Instructions

### 1. Parse Options

- `--sdk` — Instrumentation approach: `opentelemetry` (recommended, uses `@azure/monitor-opentelemetry`) or `classic` (uses `applicationinsights` npm package). Default: `opentelemetry`.
- `--sampling` — Sampling percentage (1-100). Default: 100 (no sampling). Recommend 25-50 for high-traffic apps.

### 2. Check for Existing Instrumentation

Search the project for existing Application Insights setup:
```bash
# Look for existing Application Insights imports
grep -r "applicationinsights\|monitor-opentelemetry\|APPLICATIONINSIGHTS" src/ --include="*.ts" --include="*.js"
```

If instrumentation already exists, warn the user and ask whether to replace or skip.

### 3. Get the Connection String

Ask the user for their Application Insights connection string, or help them find it:

```bash
az monitor app-insights component show \
  --app <app-insights-name> \
  --resource-group <rg> \
  --query "connectionString" -o tsv
```

If no Application Insights resource exists, offer to create one (see `/setup`).

### 4a. Install Dependencies (OpenTelemetry — Recommended)

```bash
npm install @azure/monitor-opentelemetry @opentelemetry/api
```

### 4b. Install Dependencies (Classic SDK)

```bash
npm install applicationinsights
```

### 5a. Add Instrumentation (OpenTelemetry)

Create or update the instrumentation file. This file **must** be imported before any other application modules.

Create `src/instrumentation.ts`:
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
```

Update the entry point (`src/index.ts` or `src/app.ts`) to import instrumentation first:
```typescript
import "./instrumentation"; // Must be first import
import express from "express";
// ... rest of app
```

### 5b. Add Instrumentation (Classic SDK)

Create `src/instrumentation.ts`:
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

// Configure sampling
appInsights.defaultClient.config.samplingPercentage = <sampling>;

export default appInsights;
```

### 6. Configure Environment

Add the connection string to the environment:

```bash
# Add to .env
echo "APPLICATIONINSIGHTS_CONNECTION_STRING=InstrumentationKey=<key>;IngestionEndpoint=<endpoint>" >> .env
```

Verify `.env` is in `.gitignore`:
```bash
grep -q ".env" .gitignore || echo ".env" >> .gitignore
```

### 7. Add Custom Telemetry Examples

Show the user how to track custom events and metrics:

**OpenTelemetry**:
```typescript
import { trace, metrics } from "@opentelemetry/api";

const tracer = trace.getTracer("my-app");
const meter = metrics.getMeter("my-app");
const orderCounter = meter.createCounter("orders_placed");

// Custom span
await tracer.startActiveSpan("processOrder", async (span) => {
  span.setAttribute("order.id", orderId);
  orderCounter.add(1, { plan: "enterprise" });
  // ... process order
  span.end();
});
```

**Classic SDK**:
```typescript
import appInsights from "./instrumentation";

const client = appInsights.defaultClient;
client.trackEvent({ name: "OrderPlaced", properties: { orderId: "123" } });
client.trackMetric({ name: "QueueDepth", value: 42 });
```

### 8. Verify Instrumentation

```bash
# Start the application
npm run dev

# Make a few requests, then check in Azure Portal:
# Application Insights > Live Metrics (real-time)
# Application Insights > Transaction search (after ~2 minutes)
```

### 9. Display Summary

Show the user:
- SDK type installed (OpenTelemetry or Classic)
- Files created or modified
- Sampling percentage configured
- How to view telemetry in Azure Portal
- Next steps: create alerts (`/alert-create`), build dashboards (`/dashboard-create`)
