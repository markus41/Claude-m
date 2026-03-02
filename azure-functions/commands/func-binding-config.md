---
name: func-binding-config
description: "Configure input and output bindings for an Azure Function"
argument-hint: "--function <function-name> --binding <binding-type> --direction <input|output>"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

# Configure Function Bindings

Add input or output bindings to an existing Azure Function using the v4 programmatic model.

## Instructions

### 1. Locate the Function

Find the function file at `src/functions/<function-name>.ts`. If it does not exist, suggest using `/func-create` first.

### 2. Validate Inputs

- `--function` — Name of the existing function. Ask if not provided.
- `--binding` — Binding type: `blob`, `table`, `queue`, `cosmosdb`, `sendgrid`, `signalr`, `eventhub`, `servicebus`. Ask if not provided.
- `--direction` — `input` or `output`. Ask if not provided.

### 3. Available Bindings Reference

**Input bindings** (read data into the function):
| Binding | Registration Property | Type |
|---------|----------------------|------|
| Blob Storage | `extraInputs: [input.storageBlob()]` | `StorageBlobInputOptions` |
| Table Storage | `extraInputs: [input.table()]` | `TableInputOptions` |
| Cosmos DB | `extraInputs: [input.cosmosDB()]` | `CosmosDBInputOptions` |
| SQL | `extraInputs: [input.sql()]` | `SqlInputOptions` |

**Output bindings** (write data from the function):
| Binding | Registration Property | Type |
|---------|----------------------|------|
| Blob Storage | `extraOutputs: [output.storageBlob()]` | `StorageBlobOutputOptions` |
| Table Storage | `extraOutputs: [output.table()]` | `TableOutputOptions` |
| Queue Storage | `extraOutputs: [output.storageQueue()]` | `StorageQueueOutputOptions` |
| Cosmos DB | `extraOutputs: [output.cosmosDB()]` | `CosmosDBOutputOptions` |
| Service Bus Queue | `extraOutputs: [output.serviceBusQueue()]` | `ServiceBusQueueOutputOptions` |
| Service Bus Topic | `extraOutputs: [output.serviceBusTopic()]` | `ServiceBusTopicOutputOptions` |
| Event Hub | `extraOutputs: [output.eventHub()]` | `EventHubOutputOptions` |
| SendGrid | `extraOutputs: [output.sendGrid()]` | `SendGridOutputOptions` |

### 4. Add the Binding

**Input binding example** (Cosmos DB input):
```typescript
import { app, HttpRequest, HttpResponseInit, InvocationContext, input } from "@azure/functions";

const cosmosInput = input.cosmosDB({
    connection: "CosmosDBConnection",
    databaseName: "mydb",
    containerName: "items",
    id: "{id}",
    partitionKey: "{partitionKey}",
});

export async function getItem(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    const item = context.extraInputs.get(cosmosInput);
    return { jsonBody: item };
}

app.http("getItem", {
    methods: ["GET"],
    authLevel: "anonymous",
    route: "items/{id}/{partitionKey}",
    extraInputs: [cosmosInput],
    handler: getItem,
});
```

**Output binding example** (Queue output):
```typescript
import { app, HttpRequest, HttpResponseInit, InvocationContext, output } from "@azure/functions";

const queueOutput = output.storageQueue({
    queueName: "outqueue",
    connection: "AzureWebJobsStorage",
});

export async function enqueueItem(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    const body = await request.json();
    context.extraOutputs.set(queueOutput, body);
    return { status: 201, body: "Queued successfully" };
}

app.http("enqueueItem", {
    methods: ["POST"],
    authLevel: "anonymous",
    route: "enqueue",
    extraOutputs: [queueOutput],
    handler: enqueueItem,
});
```

**Multiple bindings** — A function can have multiple input and output bindings:
```typescript
app.http("processOrder", {
    methods: ["POST"],
    authLevel: "function",
    route: "orders",
    extraInputs: [cosmosInput],
    extraOutputs: [queueOutput, tableOutput],
    handler: processOrder,
});
```

### 5. Update local.settings.json

Add any new connection string settings required by the binding:
- Blob/Queue/Table: `AzureWebJobsStorage` (usually already present)
- Cosmos DB: `CosmosDBConnection`
- Service Bus: `ServiceBusConnection`
- Event Hub: `EventHubConnection`
- SendGrid: `SendGridApiKey`

### 6. Display Summary

Show the user:
- Updated function file path
- Binding type, direction, and configuration
- Required app settings
- How to test: `func start`
- How to access the binding data in the handler
