---
name: func-create
description: "Create a new Azure Function with trigger type selection (HTTP, Timer, Blob, Queue, Service Bus, Event Grid, Cosmos DB)"
argument-hint: "<trigger-type> --name <function-name>"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - AskUserQuestion
---

# Create a New Azure Function

Generate a new function file with the selected trigger type using the v4 programming model.

## Instructions

### 1. Validate Inputs

- `<trigger-type>` — One of: `http`, `timer`, `blob`, `queue`, `servicebus`, `eventgrid`, `cosmosdb`, `eventhub`. Ask if not provided.
- `--name` — Function name (used for file name and function registration). Ask if not provided.

### 2. Option A: Scaffold via Core Tools

If Azure Functions Core Tools are installed:

```bash
func new --template "<Template Name>" --name <function-name>
```

Template mapping:
| Input | Core Tools Template |
|-------|-------------------|
| `http` | `HTTP trigger` |
| `timer` | `Timer trigger` |
| `blob` | `Azure Blob Storage trigger` |
| `queue` | `Azure Queue Storage trigger` |
| `servicebus` | `Service Bus Queue trigger` or `Service Bus Topic trigger` |
| `eventgrid` | `Azure Event Grid trigger` |
| `cosmosdb` | `Azure Cosmos DB trigger` |
| `eventhub` | `Azure Event Hub trigger` |

### 3. Option B: Manual Scaffold (v4 Programmatic Model)

If Core Tools are not installed or the user prefers manual creation, create `src/functions/<function-name>.ts`.

**HTTP trigger**:
```typescript
import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";

export async function <functionName>(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`Http function processed request for url "${request.url}"`);

    const name = request.query.get("name") || (await request.text()) || "world";

    return { body: `Hello, ${name}!` };
}

app.http("<functionName>", {
    methods: ["GET", "POST"],
    authLevel: "anonymous",
    handler: <functionName>,
});
```

**Timer trigger**:
```typescript
import { app, InvocationContext, Timer } from "@azure/functions";

export async function <functionName>(myTimer: Timer, context: InvocationContext): Promise<void> {
    context.log("Timer function ran at", new Date().toISOString());

    if (myTimer.isPastDue) {
        context.log("Timer is past due!");
    }
}

app.timer("<functionName>", {
    schedule: "0 */5 * * * *",
    handler: <functionName>,
});
```

**Blob trigger**:
```typescript
import { app, InvocationContext } from "@azure/functions";

export async function <functionName>(blob: Buffer, context: InvocationContext): Promise<void> {
    context.log(`Blob trigger processed blob "${context.triggerMetadata.name}" with size ${blob.length} bytes`);
}

app.storageBlob("<functionName>", {
    path: "samples-workitems/{name}",
    connection: "AzureWebJobsStorage",
    handler: <functionName>,
});
```

**Queue trigger**:
```typescript
import { app, InvocationContext } from "@azure/functions";

export async function <functionName>(queueItem: unknown, context: InvocationContext): Promise<void> {
    context.log("Queue trigger processed message:", queueItem);
}

app.storageQueue("<functionName>", {
    queueName: "myqueue-items",
    connection: "AzureWebJobsStorage",
    handler: <functionName>,
});
```

Ask the user for trigger-specific configuration (schedule for timer, container path for blob, queue name for queue, etc.).

### 4. Update Configuration

If the trigger requires a connection string not yet in `local.settings.json`, add it:
- Blob/Queue: `AzureWebJobsStorage` (usually already present)
- Service Bus: `ServiceBusConnection`
- Event Hub: `EventHubConnection`
- Cosmos DB: `CosmosDBConnection`

### 5. Display Summary

Show the user:
- Created file path and trigger type
- How to test locally: `func start`
- Required app settings for the trigger
- Next steps (add bindings with `/func-binding-config`, deploy with `/func-deploy`)
