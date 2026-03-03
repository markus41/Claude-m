# Azure Functions — Triggers & Bindings

## Overview

Azure Functions uses a trigger-plus-binding model: every function has exactly one trigger that defines how it is invoked, and zero or more input/output bindings that connect it to other services without writing SDK boilerplate. Bindings are declared in `function.json` (v3 model) or as decorators/attributes in the v4 TypeScript/C# programming model.

The v4 TypeScript programming model (package `@azure/functions` ≥ 4.0) eliminates `function.json` entirely — all metadata lives in code.

---

## REST API Endpoints (Functions Management)

Base URL: `https://management.azure.com`
API Version: `2023-01-01`

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|----------------------|----------------|-------|
| GET | `/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Web/sites/{app}/functions` | Website Contributor | — | List all functions in a Function App |
| GET | `/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Web/sites/{app}/functions/{funcName}` | Website Contributor | — | Get function metadata |
| POST | `/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Web/sites/{app}/functions/{funcName}/listsecrets` | Website Contributor | — | Retrieve HTTP function key |
| GET | `/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Web/sites/{app}/hostruntime/admin/host/status` | Website Contributor | — | Host runtime status |
| POST | `/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Web/sites/{app}/syncfunctiontriggers` | Website Contributor | — | Sync trigger metadata after deployment |

---

## Trigger Types

### HTTP Trigger

Invokes the function on an HTTP request. Supports anonymous, function-level, or admin auth levels.

**v4 TypeScript**:
```typescript
import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";

app.http("httpTrigger", {
  methods: ["GET", "POST"],
  authLevel: "function",
  route: "items/{id?}",
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    const id = req.params.id;
    const body = await req.json();
    ctx.log(`Processing item ${id}`);
    return { status: 200, jsonBody: { id, received: body } };
  },
});
```

**Auth levels**:
| Level | Description |
|-------|-------------|
| `anonymous` | No key required |
| `function` | Function-specific key required (`?code=<key>`) |
| `admin` | Master key required |

**Route parameters** are available via `req.params`. Set `route` to override the default `api/{functionName}` path. Custom routes cannot start with `admin`.

---

### Timer Trigger

Invokes the function on a CRON schedule. Uses NCronTab expression format (6 fields including seconds).

**v4 TypeScript**:
```typescript
import { app, Timer, InvocationContext } from "@azure/functions";

app.timer("timerTrigger", {
  schedule: "0 */5 * * * *", // every 5 minutes
  runOnStartup: false,
  useMonitor: true,
  handler: async (timer: Timer, ctx: InvocationContext): Promise<void> => {
    if (timer.isPastDue) {
      ctx.log("Timer is past due — missed schedule");
    }
    ctx.log(`Timer fired at ${new Date().toISOString()}`);
  },
});
```

**Common CRON expressions**:
| Expression | Meaning |
|-----------|---------|
| `0 */5 * * * *` | Every 5 minutes |
| `0 0 * * * *` | Every hour |
| `0 0 0 * * *` | Daily at midnight UTC |
| `0 0 9 * * 1-5` | Weekdays at 09:00 UTC |
| `0 30 6 * * *` | Daily at 06:30 UTC |

Use `%SCHEDULE_CRON%` to read the schedule from an app setting — useful for environment-specific schedules.

**`useMonitor: true`** persists the last run time in storage. Set to `false` for high-frequency timers (< 1 min) to avoid storage overhead.

---

### Service Bus Trigger

Invokes on messages from a Service Bus queue or topic subscription.

**v4 TypeScript**:
```typescript
import { app, ServiceBusQueueTrigger, InvocationContext } from "@azure/functions";

app.serviceBusQueue("sbQueueTrigger", {
  queueName: "orders",
  connection: "SERVICE_BUS_CONNECTION",
  isSessionsEnabled: false,
  handler: async (message: unknown, ctx: InvocationContext): Promise<void> => {
    ctx.log("Message body:", message);
    ctx.log("Delivery count:", ctx.triggerMetadata?.deliveryCount);
    // Throw to dead-letter; return normally to complete
  },
});
```

**Topic subscription variant**:
```typescript
app.serviceBusTopic("sbTopicTrigger", {
  topicName: "events",
  subscriptionName: "functions-sub",
  connection: "SERVICE_BUS_CONNECTION",
  handler: async (message: unknown, ctx: InvocationContext): Promise<void> => {
    ctx.log("Topic message:", message);
  },
});
```

**Connection string app setting format**:
```
SERVICE_BUS_CONNECTION=Endpoint=sb://<ns>.servicebus.windows.net/;SharedAccessKeyName=...;SharedAccessKey=...
```
For managed identity: set `SERVICE_BUS_CONNECTION__fullyQualifiedNamespace=<ns>.servicebus.windows.net` (no connection string).

---

### Event Hub Trigger

Processes events from Azure Event Hubs, batched by default.

**v4 TypeScript**:
```typescript
import { app, EventHubTrigger, InvocationContext } from "@azure/functions";

app.eventHub("ehTrigger", {
  eventHubName: "telemetry",
  connection: "EVENT_HUB_CONNECTION",
  consumerGroup: "$Default",
  cardinality: "many", // process as array
  handler: async (messages: unknown[], ctx: InvocationContext): Promise<void> => {
    ctx.log(`Processing batch of ${messages.length} events`);
    for (const msg of messages) {
      ctx.log("Event:", msg);
    }
  },
});
```

**Cardinality**:
| Value | Behavior |
|-------|----------|
| `many` | Function receives array of events (recommended) |
| `one` | Function receives single event |

Use `many` for throughput. Set `maxBatchSize` in `host.json` under `extensions.eventHubs`.

---

### Blob Trigger

Invokes when a blob is created or modified in Azure Blob Storage.

**v4 TypeScript**:
```typescript
import { app, StorageBlobTrigger, InvocationContext } from "@azure/functions";

app.storageBlob("blobTrigger", {
  path: "uploads/{name}",
  connection: "STORAGE_CONNECTION",
  source: "EventGrid", // recommended over polling
  handler: async (blob: Buffer, ctx: InvocationContext): Promise<void> => {
    ctx.log(`Blob name: ${ctx.triggerMetadata?.name}`);
    ctx.log(`Blob size: ${blob.length} bytes`);
  },
});
```

**`source: "EventGrid"`** is strongly recommended over default polling. Event Grid delivery is near-real-time and avoids the 10-minute polling delay. Requires registering the Event Grid subscription on the storage account.

**Path binding expressions**:
| Expression | Meaning |
|-----------|---------|
| `{name}` | Full blob name including path |
| `{blobName}.{extension}` | Name and extension separately |
| `container/{date}/{name}` | Hierarchical path |

---

### Queue Trigger

Processes messages from Azure Storage Queues.

**v4 TypeScript**:
```typescript
import { app, StorageQueueTrigger, InvocationContext } from "@azure/functions";

app.storageQueue("queueTrigger", {
  queueName: "work-items",
  connection: "STORAGE_CONNECTION",
  handler: async (message: unknown, ctx: InvocationContext): Promise<void> => {
    ctx.log("Queue message:", message);
    const meta = ctx.triggerMetadata;
    ctx.log(`DequeueCount: ${meta?.dequeueCount}, InsertionTime: ${meta?.insertionTime}`);
    // After maxDequeueCount (default 5), message auto-moves to poison queue
  },
});
```

**Poison queue**: Automatically created as `{queueName}-poison`. After `maxDequeueCount` failures (configurable in `host.json`), message is moved there.

---

## Input Bindings

Input bindings load data from external sources before handler execution.

### Blob Input Binding

```typescript
app.http("readBlob", {
  methods: ["GET"],
  authLevel: "function",
  extraInputs: [
    app.input.storageBlob({
      name: "configBlob",
      path: "config/{Query.env}.json",
      connection: "STORAGE_CONNECTION",
    }),
  ],
  handler: async (req, ctx) => {
    const config = ctx.extraInputs.get("configBlob") as Buffer;
    return { jsonBody: JSON.parse(config.toString()) };
  },
});
```

### Cosmos DB Input Binding

```typescript
app.http("getItem", {
  methods: ["GET"],
  authLevel: "function",
  extraInputs: [
    app.input.cosmosDB({
      name: "item",
      databaseName: "mydb",
      containerName: "items",
      id: "{Query.id}",
      partitionKey: "{Query.pk}",
      connection: "COSMOS_CONNECTION",
    }),
  ],
  handler: async (req, ctx) => {
    const item = ctx.extraInputs.get("item");
    return { jsonBody: item };
  },
});
```

---

## Output Bindings

Output bindings write data to external services after handler execution.

### Queue Output Binding

```typescript
app.http("enqueueItem", {
  methods: ["POST"],
  authLevel: "function",
  extraOutputs: [
    app.output.storageQueue({
      name: "outputQueue",
      queueName: "work-items",
      connection: "STORAGE_CONNECTION",
    }),
  ],
  handler: async (req, ctx) => {
    const body = await req.json() as { id: string };
    ctx.extraOutputs.set("outputQueue", { id: body.id, enqueuedAt: new Date().toISOString() });
    return { status: 202, jsonBody: { queued: true } };
  },
});
```

### Blob Output Binding

```typescript
app.storageQueue("processAndStore", {
  queueName: "raw-events",
  connection: "STORAGE_CONNECTION",
  extraOutputs: [
    app.output.storageBlob({
      name: "resultBlob",
      path: "results/{rand-guid}.json",
      connection: "STORAGE_CONNECTION",
    }),
  ],
  handler: async (message: unknown, ctx) => {
    const result = { processed: true, data: message };
    ctx.extraOutputs.set("resultBlob", JSON.stringify(result));
  },
});
```

### Event Hub Output Binding

```typescript
app.http("publishEvent", {
  methods: ["POST"],
  authLevel: "function",
  extraOutputs: [
    app.output.eventHub({
      name: "outputEvents",
      eventHubName: "outbound",
      connection: "EVENT_HUB_CONNECTION",
    }),
  ],
  handler: async (req, ctx) => {
    const body = await req.json();
    // Set array for batch publish
    ctx.extraOutputs.set("outputEvents", [body, { ...body, copy: true }]);
    return { status: 202 };
  },
});
```

### Service Bus Output Binding

```typescript
app.storageQueue("routeMessage", {
  queueName: "inbound",
  connection: "STORAGE_CONNECTION",
  extraOutputs: [
    app.output.serviceBusQueue({
      name: "sbOutput",
      queueName: "processed",
      connection: "SERVICE_BUS_CONNECTION",
    }),
  ],
  handler: async (message: unknown, ctx) => {
    ctx.extraOutputs.set("sbOutput", { payload: message, routedAt: Date.now() });
  },
});
```

---

## Binding Expressions Reference

Binding expressions are evaluated at runtime from trigger metadata, app settings, or request context.

| Expression | Source | Example Usage |
|-----------|--------|--------------|
| `{name}` | Trigger path param | `path: "uploads/{name}"` |
| `{rand-guid}` | Random GUID | `path: "output/{rand-guid}.json"` |
| `{DateTime}` | Current UTC timestamp | `path: "logs/{DateTime}.log"` |
| `{sys.utcNow}` | UTC timestamp (format: `yyyy-MM-dd'T'HH-mm-ss`)| Path segments |
| `{Query.paramName}` | HTTP query string | Input binding id lookup |
| `{Headers.x-custom}` | HTTP header | Conditional routing |
| `%APP_SETTING%` | App setting value | `connection: "%STORAGE_CONN%"` |

---

## host.json Trigger Configuration

```json
{
  "version": "2.0",
  "extensions": {
    "http": {
      "routePrefix": "api",
      "maxConcurrentRequests": 100,
      "maxOutstandingRequests": 200
    },
    "queues": {
      "maxPollingInterval": "00:00:02",
      "visibilityTimeout": "00:00:30",
      "batchSize": 16,
      "maxDequeueCount": 5,
      "newBatchThreshold": 8
    },
    "serviceBus": {
      "prefetchCount": 0,
      "maxConcurrentCalls": 16,
      "maxConcurrentSessions": 8,
      "messageHandlerOptions": {
        "autoComplete": true,
        "maxAutoRenewDuration": "00:05:00"
      }
    },
    "eventHubs": {
      "maxBatchSize": 64,
      "prefetchCount": 300,
      "batchCheckpointFrequency": 1
    }
  }
}
```

---

## Error Codes Table

| Code | Meaning | Remediation |
|------|---------|-------------|
| `Microsoft.Azure.WebJobs.Host.FunctionInvocationException` | Unhandled exception in handler | Add try/catch; check inner exception for root cause |
| `StorageException: The specified container does not exist` | Blob container missing | Create container before deploying function |
| `ServiceBusException: MessagingEntityNotFound` | Queue/topic does not exist | Create Service Bus entity; verify connection string namespace |
| `EventHubsException: Resource not found` | Event Hub name mismatch | Verify `eventHubName` matches Azure resource |
| `System.InvalidOperationException: Timeout` | Function exceeded timeout | Increase timeout in `host.json`; use Durable for long tasks |
| `Microsoft.Azure.Storage.StorageException: 403` | Storage access denied | Grant Storage Blob Data Contributor/Reader to function identity |
| `Azure.Messaging.ServiceBus.ServiceBusException: 401` | SB auth failed | Verify connection string or grant Azure Service Bus Data Receiver role |

---

## Throttling Limits Table

| Resource | Limit | Retry Strategy |
|----------|-------|---------------|
| HTTP Trigger concurrent requests (Consumption) | 100 per instance | Scale-out handles this; configure `maxConcurrentRequests` |
| HTTP Trigger concurrent requests (Premium/Dedicated) | 200 per instance default | Increase via `host.json` |
| Queue Trigger batch size | 32 messages (default 16) | Tune `batchSize` in `host.json` |
| Service Bus max concurrent calls | 16 (default) | Increase `maxConcurrentCalls`; premium tier for high throughput |
| Event Hub max batch size | 64 events (v2 SDK default) | Tune `maxBatchSize`; use `cardinality: "many"` |
| Blob trigger (polling) | 10-minute delay | Switch to `source: "EventGrid"` for near-real-time |
| ARM API: list functions | 1200/min per subscription | Cache function list; avoid polling in loops |

---

## Common Patterns and Gotchas

**1. Connection string vs managed identity**
Prefer managed identity over connection strings in production. For Storage: set `STORAGE_CONNECTION__blobServiceUri`, `STORAGE_CONNECTION__queueServiceUri`. For Service Bus: set `SERVICE_BUS_CONNECTION__fullyQualifiedNamespace`. Assign the function's managed identity the appropriate data-plane role (not just ARM role).

**2. Route prefix collision**
The default `routePrefix` is `"api"`. If you set a custom route like `route: "health"`, the full URL is `https://<app>.azurewebsites.net/api/health`. Setting `routePrefix: ""` removes the prefix — useful for root-level routes, but conflicts with Kudu SCM endpoints at `/admin`.

**3. Timer trigger cold starts**
On Consumption plan, a timer function cold-starts before firing. If startup takes > 10 seconds, the trigger fires late. Use `runOnStartup: false` in production to avoid accidental double-fires on deployment. For precise timing requirements, use Premium plan.

**4. Blob trigger ordering**
Blob triggers do NOT guarantee order. For ordered processing, use a Storage Queue fed by an Event Grid subscription on the container. The queue trigger processes in FIFO order.

**5. Service Bus sessions**
For ordered, per-session processing, set `isSessionsEnabled: true`. This serializes processing within a session ID but may reduce throughput. Each session is locked to one instance.

**6. Output binding null check**
If you conditionally set an output binding (e.g., only write to queue in error cases), never call `ctx.extraOutputs.set()` with `undefined` — this causes a binding error. Either always set the output or restructure as an SDK call.

**7. Binding extension packages**
The v4 Node.js model requires explicit extension packages. Ensure `package.json` includes:
- `@azure/functions` (core, always)
- `@azure/functions-core` is auto-included
- For Cosmos DB bindings: ensure `extensionBundle` version ≥ 3.x in `host.json`

**8. Local settings file**
`local.settings.json` is gitignored by default. Missing it causes `undefined` connections locally. Use `func azure functionapp fetch-app-settings <appName>` to pull settings from Azure for local development.
