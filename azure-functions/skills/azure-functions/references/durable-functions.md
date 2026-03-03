# Azure Functions — Durable Functions

## Overview

Durable Functions is an extension for Azure Functions that lets you write stateful workflows (orchestrations) in serverless compute. It manages state, checkpoints, and replay automatically using the Event Sourcing pattern. The orchestrator function replays from the beginning on each step, so all code inside an orchestrator must be deterministic — no random numbers, no current time, no direct I/O.

Supported languages: TypeScript/JavaScript, C#, Python, Java, PowerShell.

**Key function types**:
| Type | Role | May Await? | May Call I/O? |
|------|------|-----------|---------------|
| Orchestrator | Defines workflow logic; calls activities and sub-orchestrations | Yes (via `context.df.*`) | No — only via activity calls |
| Activity | Single unit of work; executes once | Yes (normal async) | Yes — full SDK access |
| Entity | Stateful actor (counter, accumulator) | Yes | Yes |
| Client | Starts, queries, terminates orchestrations | Yes | Yes |

---

## REST API Endpoints (Durable Management)

Base URL: `https://<functionapp>.azurewebsites.net/runtime/webhooks/durabletask`

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|----------------------|----------------|-------|
| POST | `/orchestrators/{functionName}` | Function key (`code=`) | Request body = orchestration input | Starts new orchestration instance |
| GET | `/instances/{instanceId}` | Function key | `showHistory`, `showHistoryOutput` | Query instance status |
| GET | `/instances` | Function key | `createdTimeFrom`, `runtimeStatus`, `top` | List instances |
| POST | `/instances/{instanceId}/terminate` | Function key | `reason` in body | Terminate running instance |
| POST | `/instances/{instanceId}/raiseEvent/{eventName}` | Function key | Event data in body | Send external event |
| GET | `/instances/{instanceId}/suspend` | Function key | — | Suspend instance |
| GET | `/instances/{instanceId}/resume` | Function key | — | Resume suspended instance |
| DELETE | `/instances/{instanceId}` | Function key | — | Purge instance history |

**ARM-level status query**:
| Method | Endpoint | Required Permissions | Notes |
|--------|----------|----------------------|-------|
| GET | `/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Web/sites/{app}/hostruntime/runtime/webhooks/durabletask/instances` | Website Contributor | Requires `x-ms-durable-task-hub` header for non-default task hubs |

---

## Core Patterns

### Pattern 1: Function Chaining

Execute activities in sequence, each receiving the output of the previous.

```typescript
import * as df from "durable-functions";

const orchestrator = df.orchestrator(function* (context) {
  const step1Result = yield context.df.callActivity("StepOne", context.df.getInput());
  const step2Result = yield context.df.callActivity("StepTwo", step1Result);
  const finalResult = yield context.df.callActivity("StepThree", step2Result);
  return finalResult;
});

df.app.orchestration("ChainOrchestration", orchestrator);

df.app.activity("StepOne", {
  handler: async (input: string) => {
    return `${input}-step1`;
  },
});
```

### Pattern 2: Fan-Out / Fan-In

Launch multiple activities in parallel and aggregate results.

```typescript
const orchestrator = df.orchestrator(function* (context) {
  const items: string[] = context.df.getInput();

  // Fan-out: start all tasks in parallel
  const tasks = items.map((item) => context.df.callActivity("ProcessItem", item));

  // Fan-in: wait for all to complete
  const results: string[] = yield context.df.Task.all(tasks);

  // Aggregate
  return results.join(",");
});

df.app.orchestration("FanOutFanIn", orchestrator);
```

**`Task.all`** waits for all tasks. **`Task.any`** returns when the first task completes (useful for racing with a timeout).

### Pattern 3: Async HTTP API (Human Interaction)

Long-running workflow that waits for external input before continuing.

```typescript
const orchestrator = df.orchestrator(function* (context) {
  const orderId: string = context.df.getInput();

  // Do initial work
  yield context.df.callActivity("ProcessOrder", orderId);

  // Wait up to 7 days for approval
  const approvalDeadline = moment.utc(context.df.currentUtcDateTime).add(7, "d").toDate();
  const approvalTask = context.df.waitForExternalEvent("ApprovalReceived");
  const timeoutTask = context.df.createTimer(approvalDeadline);

  const winner = yield context.df.Task.any([approvalTask, timeoutTask]);

  if (winner === approvalTask) {
    timeoutTask.cancel(); // Important: always cancel unused timers
    const approved: boolean = approvalTask.result;
    if (approved) {
      yield context.df.callActivity("FulfillOrder", orderId);
    } else {
      yield context.df.callActivity("CancelOrder", orderId);
    }
  } else {
    // Timeout: escalate
    yield context.df.callActivity("EscalateOrder", orderId);
  }

  return { orderId, completed: true };
});
```

**Always cancel unused timer tasks** — uncancelled durable timers create orphaned state and delay instance cleanup.

### Pattern 4: Aggregator (Stateful Entity)

Actor-based pattern for stateful counters, buffers, or accumulators.

```typescript
import * as df from "durable-functions";
import { EntityContext } from "durable-functions";

const counterEntity = df.entity(function (context: EntityContext<number>) {
  const currentValue = context.df.getState(() => 0);
  switch (context.df.operationName) {
    case "add":
      context.df.setState(currentValue + (context.df.getInput() as number));
      break;
    case "reset":
      context.df.setState(0);
      break;
    case "get":
      context.df.return(currentValue);
      break;
  }
});

df.app.entity("Counter", counterEntity);

// Calling entity from orchestrator:
const orchestrator = df.orchestrator(function* (context) {
  const entityId = new df.EntityId("Counter", "myCounter");
  yield context.df.callEntity(entityId, "add", 5);
  const value: number = yield context.df.callEntity(entityId, "get");
  return value;
});
```

### Pattern 5: Monitor (Recurring with Condition Check)

Polling pattern with variable intervals — replaces Timer triggers for condition-based recurrence.

```typescript
const orchestrator = df.orchestrator(function* (context) {
  const { jobId, pollingIntervalSeconds, expiryTime } = context.df.getInput() as {
    jobId: string;
    pollingIntervalSeconds: number;
    expiryTime: string;
  };

  const expiry = new Date(expiryTime);

  while (context.df.currentUtcDateTime < expiry) {
    const status: string = yield context.df.callActivity("CheckJobStatus", jobId);

    if (status === "Completed" || status === "Failed") {
      return { jobId, status };
    }

    // Wait before next poll
    const nextCheck = moment.utc(context.df.currentUtcDateTime)
      .add(pollingIntervalSeconds, "s").toDate();
    yield context.df.createTimer(nextCheck);
  }

  return { jobId, status: "TimedOut" };
});
```

---

## Client Functions

The client function starts and manages orchestration instances.

```typescript
import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import * as df from "durable-functions";

app.http("startOrchestration", {
  methods: ["POST"],
  authLevel: "function",
  extraInputs: [df.input.durableClient()],
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    const client = df.getClient(ctx);
    const body = await req.json() as { orderId: string };

    const instanceId = await client.startNew("ChainOrchestration", {
      instanceId: body.orderId, // optional: use custom ID for idempotency
      input: body.orderId,
    });

    ctx.log(`Started orchestration: ${instanceId}`);
    return client.createCheckStatusResponse(req, instanceId);
  },
});
```

**`createCheckStatusResponse`** returns a 202 response with `statusQueryGetUri`, `sendEventPostUri`, and `terminatePostUri` headers for polling.

---

## Status Query API

```typescript
// Query single instance
const status = await client.getStatus(instanceId, {
  showHistory: true,
  showHistoryOutput: true,
  showInput: true,
});

console.log(status.runtimeStatus); // "Running" | "Completed" | "Failed" | "Terminated" | "Pending" | "Suspended"
console.log(status.output); // Final return value when Completed
console.log(status.customStatus); // Set via context.df.setCustomStatus() in orchestrator

// Raise external event
await client.raiseEvent(instanceId, "ApprovalReceived", true);

// Terminate
await client.terminate(instanceId, "User cancelled");

// Purge history (free storage)
await client.purgeInstanceHistory(instanceId);
```

---

## DurableTaskScheduler (Preview)

Azure DurableTaskScheduler is the next-generation backend for Durable Functions, replacing Azure Storage with a purpose-built scheduler service. It offers lower latency, higher throughput, and built-in dashboard.

**Configuration** (`host.json`):
```json
{
  "extensions": {
    "durableTask": {
      "storageProvider": {
        "type": "azureManaged",
        "endpoint": "https://<scheduler-name>.<region>.durabletask.io",
        "taskHubName": "myTaskHub"
      }
    }
  }
}
```

**App setting**: `DURABLE_TASK_SCHEDULER_CONNECTION_STRING` (or managed identity via `__credential` suffix pattern).

---

## host.json Durable Configuration

```json
{
  "extensions": {
    "durableTask": {
      "hubName": "MyTaskHub",
      "storageProvider": {
        "connectionStringName": "AzureWebJobsStorage",
        "controlQueueBatchSize": 32,
        "controlQueueBufferThreshold": 256,
        "partitionCount": 4,
        "maxQueuePollingInterval": "00:00:30",
        "trackingStoreConnectionStringName": "AzureWebJobsStorage"
      },
      "tracing": {
        "traceInputsAndOutputs": false,
        "traceReplayEvents": false
      },
      "notifications": {
        "eventGrid": {
          "topicEndpoint": "https://<topic>.eventgrid.azure.net/api/events",
          "keySettingName": "EventGridKey"
        }
      },
      "maxConcurrentActivityFunctions": 10,
      "maxConcurrentOrchestratorFunctions": 10
    }
  }
}
```

---

## Error Handling in Orchestrations

```typescript
const orchestrator = df.orchestrator(function* (context) {
  try {
    const result = yield context.df.callActivity("RiskyActivity", context.df.getInput());
    return result;
  } catch (err) {
    // err is TaskFailedException with .message and .innerException
    context.log.error(`Activity failed: ${(err as Error).message}`);
    // Compensate
    yield context.df.callActivity("CompensateActivity", context.df.getInput());
    throw err; // Re-throw to mark orchestration as Failed
  }
});
```

**Retry policies**:
```typescript
const retryOptions = new df.RetryOptions(
  5000,  // first retry interval (ms)
  3      // max retry count
);
retryOptions.backoffCoefficient = 2.0;  // exponential backoff
retryOptions.maxRetryIntervalInMilliseconds = 30000;
retryOptions.retryTimeout = df.TaskOptions.create({ timeout: 120000 });

const result = yield context.df.callActivityWithRetry("FlakyActivity", retryOptions, input);
```

---

## Error Codes Table

| Code / Exception | Meaning | Remediation |
|-----------------|---------|-------------|
| `OrchestrationAlreadyExistsException` | Instance ID already in use and not in terminal state | Use `createIfNotExists` or generate unique ID |
| `TaskFailedException` | Activity threw an unhandled exception | Add retry policy; handle in try/catch in orchestrator |
| `StorageException: 409` | Concurrent write to orchestration state | Indicates replay issue — ensure orchestrator is deterministic |
| `InvalidOperationException: Orchestrator function completed with an error` | Unhandled exception escaped orchestrator | Wrap orchestrator body in try/catch |
| `TimeoutException` | `callActivityWithRetry` retry timeout exceeded | Increase `retryTimeout`; check activity performance |
| `InstanceId not found` | Querying non-existent or purged instance | Check instance lifetime; avoid purging active instances |
| `Function 'X' doesn't exist` | Activity/entity not registered | Verify `df.app.activity()` registration and deployment |

---

## Throttling Limits Table

| Resource | Limit | Retry Strategy |
|----------|-------|---------------|
| Orchestration history size (Azure Storage) | 64 KB per event, ~200 events recommended | Use sub-orchestrations to partition large workflows |
| Max running instances (Consumption) | ~200 concurrent orchestrations per app | Use Premium plan for high-scale; tune `maxConcurrentOrchestratorFunctions` |
| Activity fan-out degree | No hard limit but watch storage throughput | Batch fan-out in groups of 100; use partitioned entities |
| External event wait timeout | No built-in limit | Always pair with `createTimer` for timeout |
| Control queue polling interval | 30s default | Reduce `maxQueuePollingInterval` for lower latency (at storage cost) |
| ARM status query rate | 1200/min per subscription | Cache instance IDs; avoid polling from high-frequency clients |
| Entity signaling (fire-and-forget) | No direct rate limit | Batch signals; avoid hot entities with thousands of signals/sec |

---

## Common Patterns and Gotchas

**1. Non-determinism causes replay errors**
Any non-deterministic code in the orchestrator (random, Date.now(), direct HTTP calls) corrupts replay. Use `context.df.currentUtcDateTime` for time, `context.df.newGuid()` for GUIDs. All I/O must go through activity calls.

**2. Large inputs/outputs**
Durable Functions stores all activity inputs and outputs in the history. Passing large payloads (> 64KB) degrades performance and increases storage costs. Use blob references: store large data in Blob Storage, pass the URI as activity input.

**3. Infinite orchestrations**
The `continueAsNew` pattern resets orchestration history without ending the instance — essential for long-running loops that would otherwise grow history indefinitely:
```typescript
context.df.continueAsNew(newInput, preserveUnprocessedEvents);
```

**4. Sub-orchestrations vs activities**
Use sub-orchestrations when the sub-workflow itself has fan-out or needs retry semantics. Use activities for single, atomic operations. Sub-orchestrations add overhead (additional control queue messages).

**5. Task hub isolation**
Use different `hubName` values per environment (dev/staging/prod) — they share the same storage account but are logically isolated. Never mix production and development in the same task hub.

**6. Entity contention**
Entities serialize operations per entity ID. If thousands of callers target the same entity ID, they queue up. Use sharded entity IDs (e.g., `Counter-{hash % 16}`) to distribute load.

**7. Missing activity registration**
In the v4 programming model, if `df.app.activity()` is called in a file not imported by the entry point, the activity is never registered and orchestration fails at runtime. Ensure all function files are imported/loaded.
