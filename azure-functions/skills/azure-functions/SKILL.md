---
name: Azure Functions
description: >
  Deep expertise in Azure Functions serverless compute — build HTTP APIs, event-driven processors,
  and orchestration workflows with triggers, bindings, Durable Functions, and Azure Functions Core Tools.
  Covers Consumption/Premium/Flex hosting plans, v4 Node.js/TypeScript programming model, cold start
  optimization, deployment pipelines, and Application Insights monitoring. Targets professional
  TypeScript developers building production serverless applications.
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
triggers:
  - azure functions
  - serverless
  - function app
  - durable functions
  - triggers bindings
  - azure func
  - function trigger
  - timer trigger
  - http trigger
  - blob trigger
  - queue trigger
  - event grid trigger
---

# Azure Functions

## 1. Azure Functions Overview

Azure Functions is a serverless compute service that runs event-driven code without managing infrastructure. Functions scale automatically and you pay only for compute time consumed.

**Hosting plans**:
| Plan | Scaling | Timeout | vCPU/Memory | Use Case |
|------|---------|---------|-------------|----------|
| Consumption | Event-driven, 0-200 instances | 5 min (default), max 10 min | 1.5 GB | Low-traffic, sporadic workloads |
| Flex Consumption | Event-driven, 0-1000 instances | 30 min (default) | Configurable | Variable traffic with fast scale |
| Premium (EP1-EP3) | Event-driven, 1-100+ instances | 30 min (default), unlimited config | 3.5-14 GB | Always-warm, VNet, large payloads |
| Dedicated (App Service) | Manual/autoscale | Unlimited | Plan-dependent | Existing App Service plan reuse |

**Runtime versions and language support**:
| Runtime | Node.js | .NET | Python | Java |
|---------|---------|------|--------|------|
| v4 (current) | 18, 20 | .NET 8 (isolated) | 3.9-3.11 | 11, 17, 21 |

**Cold start**: Functions on Consumption plan may experience cold starts (typically 1-3 seconds for Node.js). Mitigation strategies:
- Use **Premium plan** with minimum instance count for always-warm instances.
- Use **Flex Consumption** with always-ready instance counts.
- Keep function packages small — minimize dependencies.
- Use `WEBSITE_RUN_FROM_PACKAGE=1` for faster startup.

**v4 programming model** (Node.js/TypeScript):
The v4 model uses programmatic registration instead of `function.json` files. Functions are registered using `app.http()`, `app.timer()`, `app.storageBlob()`, etc. This is the recommended model for all new TypeScript projects.

```typescript
import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";

export async function hello(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    return { body: `Hello, ${request.query.get("name") || "world"}!` };
}

app.http("hello", {
    methods: ["GET"],
    authLevel: "anonymous",
    handler: hello,
});
```

## 2. Azure Functions Core Tools CLI

Azure Functions Core Tools (`func`) is the local development CLI for creating, running, and deploying functions.

**Install**:
```bash
npm install -g azure-functions-core-tools@4 --unsafe-perm true
```

**Core commands**:
| Command | Description |
|---------|-------------|
| `func init <name> --typescript --model V4` | Initialize a new TypeScript project with v4 model |
| `func new --template "HTTP trigger" --name myFunc` | Add a new function from template |
| `func start` | Start the local Functions runtime |
| `func azure functionapp publish <app-name>` | Deploy to Azure |
| `func azure functionapp list-functions <app-name>` | List deployed functions |
| `func azure functionapp logstream <app-name>` | Stream live logs |
| `func settings list` | Show local settings |
| `func settings add <name> <value>` | Add a local setting |
| `func extensions install` | Install binding extensions |

**Project structure** (v4 TypeScript model):
```
my-functions-app/
├── host.json                    # Runtime configuration
├── local.settings.json          # Local environment variables (NOT committed)
├── package.json                 # Dependencies (@azure/functions v4)
├── tsconfig.json                # TypeScript configuration
├── .funcignore                  # Files to exclude from deployment
├── .gitignore                   # Git ignore (includes local.settings.json)
├── src/
│   └── functions/
│       ├── httpTrigger1.ts      # HTTP-triggered function
│       ├── timerTrigger1.ts     # Timer-triggered function
│       └── queueTrigger1.ts     # Queue-triggered function
└── dist/                        # Compiled JavaScript output
```

**host.json** (runtime configuration):
```json
{
  "version": "2.0",
  "logging": {
    "applicationInsights": {
      "samplingSettings": {
        "isEnabled": true,
        "excludedTypes": "Request"
      }
    }
  },
  "extensionBundle": {
    "id": "Microsoft.Azure.Functions.ExtensionBundle",
    "version": "[4.*, 5.0.0)"
  },
  "functionTimeout": "00:05:00"
}
```

**local.settings.json** (local development only):
```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "node"
  }
}
```

## 3. Triggers

Triggers define how a function is invoked. Each function has exactly one trigger.

### Trigger Reference Table

| Trigger | Registration Method | First Parameter | Key Options |
|---------|-------------------|-----------------|-------------|
| HTTP | `app.http()` | `HttpRequest` | `methods`, `authLevel`, `route` |
| Timer | `app.timer()` | `Timer` | `schedule` (CRON), `runOnStartup` |
| Blob Storage | `app.storageBlob()` | `Buffer` | `path`, `connection` |
| Queue Storage | `app.storageQueue()` | `unknown` | `queueName`, `connection` |
| Service Bus Queue | `app.serviceBusQueue()` | `unknown` | `queueName`, `connection` |
| Service Bus Topic | `app.serviceBusTopic()` | `unknown` | `topicName`, `subscriptionName`, `connection` |
| Event Grid | `app.eventGrid()` | `EventGridEvent` | (none required) |
| Event Hub | `app.eventHub()` | `unknown` | `eventHubName`, `connection`, `cardinality` |
| Cosmos DB | `app.cosmosDB()` | `unknown[]` | `connection`, `databaseName`, `containerName`, `leaseContainerName` |
| SignalR | `app.generic()` with `type: "signalRTrigger"` | `InvocationContext` | `hubName`, `category`, `event` |

### HTTP Trigger

```typescript
import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";

export async function httpTrigger(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`HTTP ${request.method} ${request.url}`);
    const name = request.query.get("name") || (await request.text()) || "world";
    return {
        status: 200,
        headers: { "Content-Type": "application/json" },
        jsonBody: { message: `Hello, ${name}!` },
    };
}

app.http("httpTrigger", {
    methods: ["GET", "POST"],
    authLevel: "anonymous",
    route: "hello/{name?}",
    handler: httpTrigger,
});
```

### Timer Trigger (CRON)

CRON expressions use 6 fields: `{second} {minute} {hour} {day} {month} {day-of-week}`.

| Expression | Schedule |
|-----------|----------|
| `0 */5 * * * *` | Every 5 minutes |
| `0 0 * * * *` | Every hour |
| `0 0 8 * * *` | Daily at 8:00 AM UTC |
| `0 0 0 * * 1` | Every Monday at midnight |
| `0 30 9 * * 1-5` | Weekdays at 9:30 AM |

```typescript
import { app, InvocationContext, Timer } from "@azure/functions";

export async function scheduledCleanup(myTimer: Timer, context: InvocationContext): Promise<void> {
    context.log("Timer function executed at:", context.df?.currentUtcDateTime ?? new Date().toISOString());

    if (myTimer.isPastDue) {
        context.log("Timer is running late!");
    }

    // Perform cleanup logic
}

app.timer("scheduledCleanup", {
    schedule: "0 0 2 * * *",   // Daily at 2:00 AM UTC
    runOnStartup: false,        // Do NOT set true in production
    handler: scheduledCleanup,
});
```

### Blob Storage Trigger

```typescript
import { app, InvocationContext } from "@azure/functions";

export async function blobProcessor(blob: Buffer, context: InvocationContext): Promise<void> {
    const blobName = context.triggerMetadata.name as string;
    context.log(`Processing blob "${blobName}", size: ${blob.length} bytes`);

    // Process blob content
    const content = blob.toString("utf-8");
    context.log(`First 100 chars: ${content.substring(0, 100)}`);
}

app.storageBlob("blobProcessor", {
    path: "uploads/{name}",
    connection: "AzureWebJobsStorage",
    handler: blobProcessor,
});
```

### Queue Storage Trigger

```typescript
import { app, InvocationContext } from "@azure/functions";

interface OrderMessage {
    orderId: string;
    customerId: string;
    amount: number;
}

export async function processOrder(queueItem: OrderMessage, context: InvocationContext): Promise<void> {
    context.log(`Processing order ${queueItem.orderId} for customer ${queueItem.customerId}`);
    context.log(`Amount: $${queueItem.amount}`);
}

app.storageQueue("processOrder", {
    queueName: "order-queue",
    connection: "AzureWebJobsStorage",
    handler: processOrder,
});
```

### Service Bus Trigger

```typescript
import { app, InvocationContext } from "@azure/functions";

export async function serviceBusHandler(message: unknown, context: InvocationContext): Promise<void> {
    context.log("Service Bus message received:", message);
    context.log("Message ID:", context.triggerMetadata.messageId);
    context.log("Delivery count:", context.triggerMetadata.deliveryCount);
}

app.serviceBusQueue("serviceBusHandler", {
    queueName: "myqueue",
    connection: "ServiceBusConnection",
    handler: serviceBusHandler,
});
```

### Event Grid Trigger

```typescript
import { app, EventGridEvent, InvocationContext } from "@azure/functions";

export async function eventGridHandler(event: EventGridEvent, context: InvocationContext): Promise<void> {
    context.log("Event Grid event received:");
    context.log("  Subject:", event.subject);
    context.log("  Event Type:", event.eventType);
    context.log("  Data:", JSON.stringify(event.data));
}

app.eventGrid("eventGridHandler", {
    handler: eventGridHandler,
});
```

### Event Hub Trigger

```typescript
import { app, InvocationContext } from "@azure/functions";

export async function eventHubHandler(messages: unknown[], context: InvocationContext): Promise<void> {
    for (const message of messages) {
        context.log("Event Hub message:", message);
    }
    context.log(`Processed ${messages.length} events`);
}

app.eventHub("eventHubHandler", {
    eventHubName: "my-event-hub",
    connection: "EventHubConnection",
    cardinality: "many",
    handler: eventHubHandler,
});
```

### Cosmos DB Change Feed Trigger

```typescript
import { app, InvocationContext } from "@azure/functions";

export async function cosmosDBHandler(documents: unknown[], context: InvocationContext): Promise<void> {
    context.log(`Cosmos DB change feed: ${documents.length} documents changed`);
    for (const doc of documents) {
        context.log("Changed document:", JSON.stringify(doc));
    }
}

app.cosmosDB("cosmosDBHandler", {
    connection: "CosmosDBConnection",
    databaseName: "mydb",
    containerName: "items",
    leaseContainerName: "leases",
    createLeaseContainerIfNotExists: true,
    handler: cosmosDBHandler,
});
```

## 4. Input/Output Bindings

Bindings connect functions to external resources without writing explicit client code. Input bindings read data; output bindings write data.

### Binding Types Reference

| Binding | Direction | Registration | Key Options |
|---------|-----------|-------------|-------------|
| Blob Storage | Input | `input.storageBlob()` | `path`, `connection` |
| Blob Storage | Output | `output.storageBlob()` | `path`, `connection` |
| Table Storage | Input | `input.table()` | `tableName`, `partitionKey`, `rowKey`, `connection` |
| Table Storage | Output | `output.table()` | `tableName`, `connection` |
| Queue Storage | Output | `output.storageQueue()` | `queueName`, `connection` |
| Cosmos DB | Input | `input.cosmosDB()` | `connection`, `databaseName`, `containerName`, `id`, `partitionKey` |
| Cosmos DB | Output | `output.cosmosDB()` | `connection`, `databaseName`, `containerName` |
| Service Bus Queue | Output | `output.serviceBusQueue()` | `queueName`, `connection` |
| Service Bus Topic | Output | `output.serviceBusTopic()` | `topicName`, `connection` |
| Event Hub | Output | `output.eventHub()` | `eventHubName`, `connection` |
| SendGrid | Output | `output.sendGrid()` | `apiKey`, `from`, `to`, `subject` |
| SignalR | Output | `output.generic({ type: "signalR" })` | `hubName` |
| SQL | Input | `input.sql()` | `commandText`, `connectionStringSetting` |
| SQL | Output | `output.sql()` | `commandText`, `connectionStringSetting` |

### Input Binding Example (Cosmos DB)

```typescript
import { app, HttpRequest, HttpResponseInit, InvocationContext, input } from "@azure/functions";

const cosmosInput = input.cosmosDB({
    connection: "CosmosDBConnection",
    databaseName: "mydb",
    containerName: "products",
    id: "{id}",
    partitionKey: "{category}",
});

export async function getProduct(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    const product = context.extraInputs.get(cosmosInput);
    if (!product) {
        return { status: 404, jsonBody: { error: "Product not found" } };
    }
    return { jsonBody: product };
}

app.http("getProduct", {
    methods: ["GET"],
    authLevel: "function",
    route: "products/{category}/{id}",
    extraInputs: [cosmosInput],
    handler: getProduct,
});
```

### Output Binding Example (Queue + Table)

```typescript
import { app, HttpRequest, HttpResponseInit, InvocationContext, output } from "@azure/functions";

const queueOutput = output.storageQueue({
    queueName: "order-processing",
    connection: "AzureWebJobsStorage",
});

const tableOutput = output.table({
    tableName: "OrderLog",
    connection: "AzureWebJobsStorage",
});

export async function createOrder(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    const order = await request.json() as { id: string; product: string; quantity: number };

    // Write to queue for async processing
    context.extraOutputs.set(queueOutput, {
        orderId: order.id,
        product: order.product,
        quantity: order.quantity,
    });

    // Write to table for audit log
    context.extraOutputs.set(tableOutput, {
        partitionKey: "orders",
        rowKey: order.id,
        product: order.product,
        quantity: order.quantity,
        createdAt: new Date().toISOString(),
    });

    return { status: 201, jsonBody: { message: "Order created", orderId: order.id } };
}

app.http("createOrder", {
    methods: ["POST"],
    authLevel: "function",
    route: "orders",
    extraOutputs: [queueOutput, tableOutput],
    handler: createOrder,
});
```

### Blob Input/Output Bindings

```typescript
import { app, HttpRequest, HttpResponseInit, InvocationContext, input, output } from "@azure/functions";

const blobInput = input.storageBlob({
    path: "templates/{templateName}.html",
    connection: "AzureWebJobsStorage",
});

const blobOutput = output.storageBlob({
    path: "rendered/{templateName}-{datetime:yyyy-MM-dd}.html",
    connection: "AzureWebJobsStorage",
});

export async function renderTemplate(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    const template = context.extraInputs.get(blobInput) as string;
    const data = await request.json() as Record<string, string>;

    let rendered = template;
    for (const [key, value] of Object.entries(data)) {
        rendered = rendered.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
    }

    context.extraOutputs.set(blobOutput, rendered);
    return { body: rendered, headers: { "Content-Type": "text/html" } };
}

app.http("renderTemplate", {
    methods: ["POST"],
    authLevel: "function",
    route: "render/{templateName}",
    extraInputs: [blobInput],
    extraOutputs: [blobOutput],
    handler: renderTemplate,
});
```

## 5. Durable Functions

Durable Functions extend Azure Functions with stateful orchestrations, enabling complex workflows with automatic checkpointing, replay, and error recovery.

**Components**:
| Component | Purpose | Registration |
|-----------|---------|-------------|
| Client function | Starts and manages orchestrations | `df.app.client.http()` |
| Orchestrator | Defines workflow logic (must be deterministic) | `df.app.orchestration()` |
| Activity | Performs single units of work (I/O allowed) | `df.app.activity()` |
| Entity | Manages small pieces of state (actor model) | `df.app.entity()` |

**Install**:
```bash
npm install durable-functions
```

### Function Chaining Pattern

Sequential execution where each activity's output feeds the next activity's input.

```typescript
import * as df from "durable-functions";
import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";

// Orchestrator
df.app.orchestration("orderProcessingOrchestrator", function* (context: df.OrchestrationContext) {
    const order = context.df.getInput() as { orderId: string; items: string[] };

    const validated = yield context.df.callActivity("validateOrder", order);
    const reserved = yield context.df.callActivity("reserveInventory", validated);
    const charged = yield context.df.callActivity("processPayment", reserved);
    const confirmation = yield context.df.callActivity("sendConfirmation", charged);

    return confirmation;
});

// Activities
df.app.activity("validateOrder", {
    handler: async (input: { orderId: string; items: string[] }, context: InvocationContext) => {
        context.log(`Validating order ${input.orderId}`);
        // Validate items exist, prices correct, etc.
        return { ...input, validated: true };
    },
});

df.app.activity("reserveInventory", {
    handler: async (input: unknown, context: InvocationContext) => {
        context.log("Reserving inventory");
        return { ...input as object, reserved: true };
    },
});

df.app.activity("processPayment", {
    handler: async (input: unknown, context: InvocationContext) => {
        context.log("Processing payment");
        return { ...input as object, paid: true };
    },
});

df.app.activity("sendConfirmation", {
    handler: async (input: unknown, context: InvocationContext) => {
        context.log("Sending confirmation email");
        return { ...input as object, confirmed: true };
    },
});

// Client starter
df.app.client.http("startOrderProcessing", {
    route: "orders/process",
    handler: async (request: HttpRequest, client: df.DurableClient, context: InvocationContext) => {
        const body = await request.json();
        const instanceId = await client.startNew("orderProcessingOrchestrator", { input: body });
        context.log(`Started orchestration: ${instanceId}`);
        return client.createCheckStatusResponse(request, instanceId);
    },
});
```

### Fan-Out/Fan-In Pattern

Parallel execution of multiple activities, then aggregate results.

```typescript
df.app.orchestration("batchProcessorOrchestrator", function* (context: df.OrchestrationContext) {
    const items: string[] = yield context.df.callActivity("getWorkItems");

    // Fan out — start all tasks in parallel
    const tasks = items.map((item) => context.df.callActivity("processWorkItem", item));

    // Fan in — wait for all tasks to complete
    const results: unknown[] = yield context.df.Task.all(tasks);

    // Aggregate results
    yield context.df.callActivity("summarizeResults", results);

    return { processed: results.length };
});
```

### Human Interaction Pattern

Wait for an external event (e.g., human approval) with a timeout.

```typescript
df.app.orchestration("approvalOrchestrator", function* (context: df.OrchestrationContext) {
    const request = context.df.getInput() as { requestId: string; requester: string; amount: number };

    // Send approval request notification
    yield context.df.callActivity("sendApprovalRequest", request);

    // Wait for approval or timeout (24 hours)
    const expiration = new Date(context.df.currentUtcDateTime);
    expiration.setHours(expiration.getHours() + 24);

    const timeoutTask = context.df.createTimer(expiration);
    const approvalTask = context.df.waitForExternalEvent("ApprovalResponse");

    const winner = yield context.df.Task.any([approvalTask, timeoutTask]);

    if (winner === approvalTask) {
        timeoutTask.cancel();
        const approved = (approvalTask.result as { approved: boolean }).approved;
        if (approved) {
            yield context.df.callActivity("processApproval", request);
            return { status: "approved" };
        } else {
            yield context.df.callActivity("processRejection", request);
            return { status: "rejected" };
        }
    } else {
        yield context.df.callActivity("handleTimeout", request);
        return { status: "timed-out" };
    }
});
```

**Raise an external event** (via HTTP):
```
POST /runtime/webhooks/durabletask/instances/{instanceId}/raiseEvent/ApprovalResponse
Content-Type: application/json

{ "approved": true, "approver": "admin@contoso.com" }
```

### Monitor Pattern

Periodic polling with exponential backoff.

```typescript
df.app.orchestration("monitorOrchestrator", function* (context: df.OrchestrationContext) {
    const input = context.df.getInput() as { jobId: string; maxRetries: number };
    let pollingInterval = 10000; // Start at 10 seconds

    for (let i = 0; i < input.maxRetries; i++) {
        const status = yield context.df.callActivity("checkJobStatus", input.jobId);

        if (status === "completed") {
            yield context.df.callActivity("notifyCompletion", input.jobId);
            return { status: "completed", attempts: i + 1 };
        }

        // Wait with exponential backoff (max 5 minutes)
        const nextCheck = new Date(context.df.currentUtcDateTime);
        nextCheck.setMilliseconds(nextCheck.getMilliseconds() + pollingInterval);
        yield context.df.createTimer(nextCheck);
        pollingInterval = Math.min(pollingInterval * 2, 300000);
    }

    return { status: "max-retries-exceeded" };
});
```

### Durable Entity (Virtual Actor)

```typescript
df.app.entity("Counter", {
    handler: (context: df.EntityContext<number>) => {
        const state = context.df.getState(() => 0);
        switch (context.df.operationName) {
            case "add":
                context.df.setState(state + (context.df.getInput() as number));
                break;
            case "reset":
                context.df.setState(0);
                break;
            case "get":
                context.df.return(state);
                break;
        }
    },
});
```

### Orchestrator Determinism Rules

Orchestrator functions MUST be deterministic — they are replayed from history on each invocation:

| DO NOT use in orchestrators | USE instead |
|-----------------------------|-------------|
| `Date.now()`, `new Date()` | `context.df.currentUtcDateTime` |
| `Math.random()` | `context.df.newGuid()` |
| `setTimeout`, `setInterval` | `context.df.createTimer(date)` |
| HTTP requests, DB queries | `context.df.callActivity("name", input)` |
| `fs.readFile`, file I/O | Activity functions |
| Non-deterministic libraries | Activity functions |

## 6. HTTP API Patterns

### Route Templates

```typescript
// Simple route
app.http("getUsers", { route: "users", methods: ["GET"], ... });

// Route with parameter
app.http("getUser", { route: "users/{userId}", methods: ["GET"], ... });

// Optional parameter
app.http("getItems", { route: "items/{category?}", methods: ["GET"], ... });

// Constrained parameter
app.http("getOrder", { route: "orders/{orderId:int}", methods: ["GET"], ... });
```

**Accessing route parameters**:
```typescript
export async function getUser(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    const userId = request.params.userId;
    // ...
}
```

### Auth Levels

| Level | Description | Key Required |
|-------|-------------|-------------|
| `anonymous` | No authentication required | No |
| `function` | Function-specific API key in `x-functions-key` header or `code` query param | Yes |
| `admin` | Host master key required | Yes |

### Request/Response Handling

```typescript
export async function apiHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    // Read query parameters
    const page = parseInt(request.query.get("page") || "1");

    // Read headers
    const authHeader = request.headers.get("Authorization");

    // Read JSON body
    const body = await request.json() as { name: string };

    // Read form data
    const formData = await request.formData();

    // Read raw body
    const rawBody = await request.text();

    // Return JSON response
    return {
        status: 200,
        headers: {
            "Content-Type": "application/json",
            "X-Request-Id": context.invocationId,
        },
        jsonBody: { message: "Success", data: body },
    };
}
```

### CORS Configuration

In `host.json`:
```json
{
  "extensions": {
    "http": {
      "routePrefix": "api",
      "customHeaders": {
        "Access-Control-Allow-Origin": "https://contoso.com",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      }
    }
  }
}
```

Or in `local.settings.json` for local development:
```json
{
  "Host": {
    "CORS": "http://localhost:3000",
    "CORSCredentials": true
  }
}
```

## 7. Deployment

### Azure CLI Deployment

```bash
# Build the TypeScript project
npm run build

# Deploy using Core Tools
func azure functionapp publish <app-name>

# Deploy with build flag (runs npm install on Azure)
func azure functionapp publish <app-name> --build remote

# Deploy to a specific slot
func azure functionapp publish <app-name> --slot staging
```

### App Settings Management

```bash
# Set app settings
az functionapp config appsettings set \
  --name <app-name> --resource-group <rg-name> \
  --settings "CosmosDBConnection=AccountEndpoint=..." "ServiceBusConnection=Endpoint=..."

# List current settings
az functionapp config appsettings list \
  --name <app-name> --resource-group <rg-name> --output table

# Delete a setting
az functionapp config appsettings delete \
  --name <app-name> --resource-group <rg-name> --setting-names "OldSetting"
```

### GitHub Actions CI/CD Workflow

```yaml
name: Deploy Azure Functions

on:
  push:
    branches: [main]
  workflow_dispatch:

env:
  AZURE_FUNCTIONAPP_NAME: 'my-func-app'
  NODE_VERSION: '18.x'

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Run tests
        run: npm test --if-present

      - name: Login to Azure
        uses: azure/login@v2
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Deploy to Azure Functions
        uses: azure/functions-action@v1
        with:
          app-name: ${{ env.AZURE_FUNCTIONAPP_NAME }}
          package: '.'
```

### Deployment Slots

```bash
# Create staging slot
az functionapp deployment slot create \
  --name <app-name> --resource-group <rg-name> --slot staging

# Deploy to staging
func azure functionapp publish <app-name> --slot staging

# Swap staging to production (zero-downtime)
az functionapp deployment slot swap \
  --name <app-name> --resource-group <rg-name> \
  --slot staging --target-slot production
```

## 8. App Settings & Configuration

### local.settings.json

Used only for local development. Never commit to source control.

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "CosmosDBConnection": "AccountEndpoint=https://mydb.documents.azure.com:443/;AccountKey=...",
    "ServiceBusConnection": "Endpoint=sb://mysb.servicebus.windows.net/;SharedAccessKeyName=...;SharedAccessKey=...",
    "APPINSIGHTS_INSTRUMENTATIONKEY": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
  }
}
```

### Key Vault References

Instead of storing secrets directly in app settings, reference Azure Key Vault:

```
@Microsoft.KeyVault(SecretUri=https://myvault.vault.azure.net/secrets/CosmosDBKey/)
@Microsoft.KeyVault(VaultName=myvault;SecretName=CosmosDBKey;SecretVersion=abc123)
```

Set via CLI:
```bash
az functionapp config appsettings set \
  --name <app-name> --resource-group <rg-name> \
  --settings "CosmosDBConnection=@Microsoft.KeyVault(VaultName=myvault;SecretName=CosmosDBConnection)"
```

Requires the Function App to have a managed identity with `Key Vault Secrets User` role on the vault.

### Managed Identity for Connections

Use identity-based connections instead of connection string secrets:

```json
{
  "Values": {
    "AzureWebJobsStorage__accountName": "mystorageaccount",
    "CosmosDBConnection__accountEndpoint": "https://mydb.documents.azure.com:443/",
    "ServiceBusConnection__fullyQualifiedNamespace": "mysb.servicebus.windows.net"
  }
}
```

The Function App's managed identity must have the appropriate RBAC roles:
| Service | Required Role |
|---------|---------------|
| Storage (triggers) | `Storage Blob Data Owner` + `Storage Queue Data Contributor` + `Storage Account Contributor` |
| Cosmos DB | `Cosmos DB Built-in Data Contributor` |
| Service Bus | `Azure Service Bus Data Receiver` |
| Event Hubs | `Azure Event Hubs Data Receiver` |

## 9. Monitoring & Diagnostics

### Application Insights Integration

Enable via `host.json`:
```json
{
  "logging": {
    "applicationInsights": {
      "samplingSettings": {
        "isEnabled": true,
        "maxTelemetryItemsPerSecond": 20,
        "excludedTypes": "Request"
      }
    },
    "logLevel": {
      "default": "Information",
      "Host.Results": "Error",
      "Function": "Information",
      "Host.Aggregator": "Trace"
    }
  }
}
```

### Structured Logging

```typescript
export async function myFunction(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log("Processing request", { url: request.url, method: request.method });
    context.warn("Slow query detected", { duration: 2500 });
    context.error("Failed to process", { error: "Connection timeout" });

    // Trace with custom properties (appears in Application Insights customDimensions)
    context.trace("Custom metric", { orderId: "ORD-123", processingTime: 450 });

    return { status: 200 };
}
```

### Key Diagnostic Queries (KQL)

**Failed function executions**:
```kql
requests
| where success == false
| where timestamp > ago(24h)
| summarize count() by name, resultCode
| order by count_ desc
```

**Function execution duration**:
```kql
requests
| where timestamp > ago(24h)
| summarize avg(duration), percentile(duration, 95), max(duration) by name
| order by avg_duration desc
```

**Live Metrics** (real-time monitoring):
```bash
func azure functionapp logstream <app-name>
```

### Custom Metrics

```typescript
import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";

export async function trackedFunction(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    const startTime = Date.now();

    // Business logic
    const result = await processRequest(request);

    const duration = Date.now() - startTime;
    context.log(`Request processed in ${duration}ms`, {
        customMetric: "processingDuration",
        value: duration,
        operation: "processRequest",
    });

    return { jsonBody: result };
}
```

## 10. Authentication

### Built-in Authentication (EasyAuth)

Enable via Azure Portal or CLI without code changes:

```bash
az webapp auth update --name <app-name> --resource-group <rg-name> \
  --enabled true --action LoginWithAzureActiveDirectory \
  --aad-client-id <client-id> --aad-tenant-id <tenant-id>
```

EasyAuth injects claims into the request headers:
```typescript
export async function securedFunction(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    const userId = request.headers.get("x-ms-client-principal-id");
    const userName = request.headers.get("x-ms-client-principal-name");
    const encodedPrincipal = request.headers.get("x-ms-client-principal");

    if (!userId) {
        return { status: 401, body: "Unauthorized" };
    }

    return { jsonBody: { userId, userName } };
}
```

### Function Keys

| Key Type | Scope | Use Case |
|----------|-------|----------|
| Function key | Single function | External callers to specific endpoints |
| Host key (default) | All functions | Internal service-to-service calls |
| Master key | All functions + admin APIs | Management operations only |

**Manage keys via CLI**:
```bash
# List function keys
az functionapp function keys list \
  --name <app-name> --resource-group <rg-name> --function-name <func-name>

# Create a new function key
az functionapp function keys set \
  --name <app-name> --resource-group <rg-name> --function-name <func-name> \
  --key-name mykey --key-value <key-value>
```

### Managed Identity for Downstream Services

```typescript
import { DefaultAzureCredential } from "@azure/identity";
import { SecretClient } from "@azure/keyvault-secrets";

const credential = new DefaultAzureCredential();
const vaultClient = new SecretClient("https://myvault.vault.azure.net", credential);

export async function getSecret(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    const secret = await vaultClient.getSecret("my-secret");
    return { jsonBody: { value: secret.value } };
}
```

### Azure AD Token Validation

```typescript
import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";

const client = jwksClient({
    jwksUri: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/discovery/v2.0/keys`,
});

async function validateToken(token: string): Promise<jwt.JwtPayload> {
    const decoded = jwt.decode(token, { complete: true });
    const key = await client.getSigningKey(decoded?.header.kid);
    return jwt.verify(token, key.getPublicKey(), {
        audience: process.env.AZURE_CLIENT_ID,
        issuer: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/v2.0`,
    }) as jwt.JwtPayload;
}

export async function protectedApi(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
        return { status: 401, jsonBody: { error: "Missing Bearer token" } };
    }

    try {
        const claims = await validateToken(authHeader.slice(7));
        return { jsonBody: { user: claims.preferred_username, roles: claims.roles } };
    } catch (error) {
        return { status: 403, jsonBody: { error: "Invalid token" } };
    }
}

app.http("protectedApi", {
    methods: ["GET"],
    authLevel: "anonymous",
    route: "protected",
    handler: protectedApi,
});
```

## 11. Error Handling

### Retry Policies

Configure automatic retries in the function registration:

```typescript
app.storageQueue("processMessage", {
    queueName: "my-queue",
    connection: "AzureWebJobsStorage",
    handler: processMessage,
    retry: {
        strategy: "exponentialBackoff",
        maxRetryCount: 5,
        minimumInterval: { seconds: 1 },
        maximumInterval: { seconds: 30 },
    },
});
```

Fixed delay strategy:
```typescript
retry: {
    strategy: "fixedDelay",
    maxRetryCount: 3,
    delayInterval: { seconds: 5 },
},
```

### Poison Message Handling

Queue-triggered functions automatically move messages to a poison queue after `maxDequeueCount` failures (default: 5).

Configure in `host.json`:
```json
{
  "extensions": {
    "queues": {
      "maxDequeueCount": 5,
      "visibilityTimeout": "00:00:30",
      "batchSize": 16,
      "maxPollingInterval": "00:00:02",
      "newBatchThreshold": 8
    }
  }
}
```

The poison queue name is `<original-queue-name>-poison`. Monitor it separately:
```typescript
app.storageQueue("handlePoisonMessages", {
    queueName: "order-queue-poison",
    connection: "AzureWebJobsStorage",
    handler: async (message: unknown, context: InvocationContext) => {
        context.error("Poison message received:", message);
        // Alert, log to dead-letter store, or attempt manual remediation
    },
});
```

### Custom Error Responses (HTTP)

```typescript
export async function apiHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        const body = await request.json() as { id: string };
        if (!body.id) {
            return { status: 400, jsonBody: { error: "Missing required field: id" } };
        }
        const result = await processItem(body.id);
        return { jsonBody: result };
    } catch (error) {
        context.error("Unhandled error:", error);
        if (error instanceof NotFoundError) {
            return { status: 404, jsonBody: { error: error.message } };
        }
        return { status: 500, jsonBody: { error: "Internal server error" } };
    }
}
```

## 12. Common Patterns

### Pattern 1: HTTP API with Cosmos DB

A REST API backed by Cosmos DB using input/output bindings.

```typescript
import { app, HttpRequest, HttpResponseInit, InvocationContext, input, output } from "@azure/functions";

const cosmosInput = input.cosmosDB({
    connection: "CosmosDBConnection",
    databaseName: "tododb",
    containerName: "items",
    sqlQuery: "SELECT * FROM c WHERE c.userId = {userId}",
});

const cosmosOutput = output.cosmosDB({
    connection: "CosmosDBConnection",
    databaseName: "tododb",
    containerName: "items",
});

// GET /api/todos/{userId}
export async function getTodos(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    const items = context.extraInputs.get(cosmosInput) as unknown[];
    return { jsonBody: items };
}

app.http("getTodos", {
    methods: ["GET"],
    authLevel: "function",
    route: "todos/{userId}",
    extraInputs: [cosmosInput],
    handler: getTodos,
});

// POST /api/todos
export async function createTodo(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    const todo = await request.json() as { userId: string; title: string };
    const newItem = {
        id: crypto.randomUUID(),
        userId: todo.userId,
        title: todo.title,
        completed: false,
        createdAt: new Date().toISOString(),
    };
    context.extraOutputs.set(cosmosOutput, newItem);
    return { status: 201, jsonBody: newItem };
}

app.http("createTodo", {
    methods: ["POST"],
    authLevel: "function",
    route: "todos",
    extraOutputs: [cosmosOutput],
    handler: createTodo,
});
```

### Pattern 2: Queue-Triggered Processor with Blob Output

A queue processor that reads messages, processes them, and writes results to Blob Storage.

```typescript
import { app, InvocationContext, output } from "@azure/functions";

interface ReportRequest {
    reportId: string;
    type: string;
    parameters: Record<string, string>;
}

const blobOutput = output.storageBlob({
    path: "reports/{reportId}.json",
    connection: "AzureWebJobsStorage",
});

export async function generateReport(message: ReportRequest, context: InvocationContext): Promise<void> {
    context.log(`Generating ${message.type} report: ${message.reportId}`);

    // Simulate report generation
    const report = {
        id: message.reportId,
        type: message.type,
        generatedAt: new Date().toISOString(),
        data: await fetchReportData(message.type, message.parameters),
    };

    // Write report to blob storage
    context.extraOutputs.set(blobOutput, JSON.stringify(report, null, 2));
    context.log(`Report ${message.reportId} saved to blob storage`);
}

app.storageQueue("generateReport", {
    queueName: "report-requests",
    connection: "AzureWebJobsStorage",
    extraOutputs: [blobOutput],
    handler: generateReport,
});

async function fetchReportData(type: string, params: Record<string, string>): Promise<unknown> {
    // Business logic to gather report data
    return { type, params, rows: [] };
}
```

### Pattern 3: Durable Functions Approval Workflow

An end-to-end approval workflow with email notification, human approval, and timeout handling.

```typescript
import * as df from "durable-functions";
import { app, HttpRequest, InvocationContext } from "@azure/functions";

interface ApprovalRequest {
    requestId: string;
    requester: string;
    amount: number;
    description: string;
}

// Client — start the workflow
df.app.client.http("startApproval", {
    route: "approvals/start",
    handler: async (request: HttpRequest, client: df.DurableClient, context: InvocationContext) => {
        const body = await request.json() as ApprovalRequest;
        const instanceId = await client.startNew("approvalOrchestrator", { input: body });
        return client.createCheckStatusResponse(request, instanceId);
    },
});

// Orchestrator — coordinate the workflow
df.app.orchestration("approvalOrchestrator", function* (context: df.OrchestrationContext) {
    const request = context.df.getInput() as ApprovalRequest;

    // Step 1: Send notification
    yield context.df.callActivity("sendApprovalEmail", request);

    // Step 2: Wait for human response or timeout (48 hours)
    const deadline = new Date(context.df.currentUtcDateTime);
    deadline.setHours(deadline.getHours() + 48);

    const timerTask = context.df.createTimer(deadline);
    const approvalEvent = context.df.waitForExternalEvent("Approval");

    const winner = yield context.df.Task.any([approvalEvent, timerTask]);

    if (winner === approvalEvent) {
        timerTask.cancel();
        const decision = approvalEvent.result as { approved: boolean; approver: string; comments: string };

        if (decision.approved) {
            yield context.df.callActivity("executeApproval", { request, decision });
            yield context.df.callActivity("notifyRequester", { request, status: "approved", decision });
            return { status: "approved", decision };
        } else {
            yield context.df.callActivity("notifyRequester", { request, status: "rejected", decision });
            return { status: "rejected", decision };
        }
    } else {
        yield context.df.callActivity("notifyRequester", { request, status: "expired" });
        return { status: "expired" };
    }
});

// Activities
df.app.activity("sendApprovalEmail", {
    handler: async (request: ApprovalRequest, context: InvocationContext) => {
        context.log(`Sending approval email for request ${request.requestId}`);
        // Integration with email service (SendGrid, Graph API, etc.)
    },
});

df.app.activity("executeApproval", {
    handler: async (input: { request: ApprovalRequest; decision: unknown }, context: InvocationContext) => {
        context.log(`Executing approved request ${input.request.requestId}`);
        // Process the approved request
    },
});

df.app.activity("notifyRequester", {
    handler: async (input: { request: ApprovalRequest; status: string; decision?: unknown }, context: InvocationContext) => {
        context.log(`Notifying ${input.request.requester} — status: ${input.status}`);
    },
});
```

### Pattern 4: Timer-Triggered Cleanup with Table Storage

A scheduled function that scans Table Storage for expired records and removes them.

```typescript
import { app, InvocationContext, Timer, input, output } from "@azure/functions";
import { TableClient } from "@azure/data-tables";
import { DefaultAzureCredential } from "@azure/identity";

export async function cleanupExpiredRecords(myTimer: Timer, context: InvocationContext): Promise<void> {
    context.log("Starting expired record cleanup");

    const tableClient = new TableClient(
        `https://${process.env.STORAGE_ACCOUNT_NAME}.table.core.windows.net`,
        "SessionTokens",
        new DefaultAzureCredential()
    );

    const now = new Date().toISOString();
    let deletedCount = 0;

    // Query for expired records
    const entities = tableClient.listEntities({
        queryOptions: { filter: `expiresAt lt '${now}'` },
    });

    for await (const entity of entities) {
        try {
            await tableClient.deleteEntity(entity.partitionKey!, entity.rowKey!);
            deletedCount++;
        } catch (error) {
            context.warn(`Failed to delete entity ${entity.rowKey}:`, error);
        }
    }

    context.log(`Cleanup complete: ${deletedCount} expired records removed`);
}

app.timer("cleanupExpiredRecords", {
    schedule: "0 0 3 * * *",   // Daily at 3:00 AM UTC
    runOnStartup: false,
    handler: cleanupExpiredRecords,
});
```

## Knowledge references

- `references/operational-knowledge.md` — compact API surface map, prerequisite matrix, deterministic failure remediation, limits/throttling guidance, and safe-default read-first/apply-second pattern.
