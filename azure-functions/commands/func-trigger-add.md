---
name: func-trigger-add
description: "Add a trigger and binding to an existing Azure Function"
argument-hint: "--function <function-name> --trigger <trigger-type>"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

# Add a Trigger to an Existing Function

Replace or add a trigger to an existing function file, updating the registration call and handler signature.

## Instructions

### 1. Locate the Function

Find the function file at `src/functions/<function-name>.ts` or search for the function registration by name using Grep.

If the file does not exist, suggest using `/func-create` instead.

### 2. Validate Inputs

- `--function` — Name of the existing function. Ask if not provided.
- `--trigger` — New trigger type: `http`, `timer`, `blob`, `queue`, `servicebus`, `eventgrid`, `cosmosdb`, `eventhub`. Ask if not provided.

### 3. Update the Registration

Replace the existing `app.<triggerType>()` call with the new trigger type registration.

**Trigger registration mapping** (v4 model):
| Trigger | Registration Method | Key Options |
|---------|-------------------|-------------|
| HTTP | `app.http()` | `methods`, `authLevel`, `route` |
| Timer | `app.timer()` | `schedule` (CRON), `runOnStartup` |
| Blob Storage | `app.storageBlob()` | `path`, `connection` |
| Queue Storage | `app.storageQueue()` | `queueName`, `connection` |
| Service Bus Queue | `app.serviceBusQueue()` | `queueName`, `connection` |
| Service Bus Topic | `app.serviceBusTopic()` | `topicName`, `subscriptionName`, `connection` |
| Event Grid | `app.eventGrid()` | (no required options) |
| Cosmos DB | `app.cosmosDB()` | `connection`, `databaseName`, `containerName`, `leaseContainerName`, `createLeaseContainerIfNotExists` |
| Event Hub | `app.eventHub()` | `eventHubName`, `connection`, `cardinality` |

### 4. Update the Handler Signature

Update the handler function's first parameter type to match the new trigger:

| Trigger | First Parameter Type |
|---------|---------------------|
| HTTP | `HttpRequest` |
| Timer | `Timer` |
| Blob | `Buffer` or `string` |
| Queue | `unknown` |
| Service Bus | `unknown` |
| Event Grid | `EventGridEvent` |
| Cosmos DB | `unknown[]` |
| Event Hub | `unknown` |

Update the return type:
- HTTP: `Promise<HttpResponseInit>`
- All others: `Promise<void>`

### 5. Update Imports

Ensure the import statement from `@azure/functions` includes all needed types:
```typescript
import { app, HttpRequest, HttpResponseInit, InvocationContext, Timer } from "@azure/functions";
```

### 6. Update local.settings.json

Add any new connection string settings required by the new trigger type if not already present.

### 7. Display Summary

Show the user:
- Updated function file path
- New trigger type and configuration
- Required app settings
- How to test: `func start`
