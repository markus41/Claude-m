---
name: func-durable
description: "Scaffold a Durable Functions orchestration — chaining, fan-out/fan-in, human interaction, or monitoring pattern"
argument-hint: "<chaining|fan-out|human-interaction|monitoring> --name <orchestration-name>"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - AskUserQuestion
---

# Scaffold a Durable Functions Orchestration

Generate a Durable Functions orchestrator, activity functions, and client starter based on the selected pattern.

## Instructions

### 1. Validate Inputs

- `<pattern>` — One of: `chaining`, `fan-out`, `human-interaction`, `monitoring`. Ask if not provided.
- `--name` — Orchestration name (used for file names and function registration). Ask if not provided.

### 2. Install Durable Functions Package

Check if `durable-functions` is installed:
```bash
npm list durable-functions 2>/dev/null || npm install durable-functions
```

### 3. Generate the Client Starter

Create an HTTP-triggered client function that starts the orchestration:

```typescript
import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import * as df from "durable-functions";

const clientHandler = df.app.client.http("httpStart-<name>", {
    route: "<name>/start",
    handler: async (request: HttpRequest, client: df.DurableClient, context: InvocationContext) => {
        const body = await request.json() as Record<string, unknown>;
        const instanceId = await client.startNew("<name>Orchestrator", { input: body });
        context.log(`Started orchestration with ID = '${instanceId}'.`);
        return client.createCheckStatusResponse(request, instanceId);
    },
});
```

### 4. Generate the Orchestrator (Pattern-Specific)

**Chaining pattern** — Sequential activity calls:
```typescript
df.app.orchestration("<name>Orchestrator", function* (context: df.OrchestrationContext) {
    const step1 = yield context.df.callActivity("step1Activity", context.df.getInput());
    const step2 = yield context.df.callActivity("step2Activity", step1);
    const step3 = yield context.df.callActivity("step3Activity", step2);
    return step3;
});
```

**Fan-out/fan-in pattern** — Parallel activity calls:
```typescript
df.app.orchestration("<name>Orchestrator", function* (context: df.OrchestrationContext) {
    const items: string[] = yield context.df.callActivity("getItemsActivity");
    const tasks = items.map((item) => context.df.callActivity("processItemActivity", item));
    const results = yield context.df.Task.all(tasks);
    yield context.df.callActivity("aggregateResultsActivity", results);
    return results;
});
```

**Human interaction pattern** — Wait for external event with timeout:
```typescript
df.app.orchestration("<name>Orchestrator", function* (context: df.OrchestrationContext) {
    const requestData = context.df.getInput();
    yield context.df.callActivity("sendApprovalRequestActivity", requestData);

    const expiration = new Date(context.df.currentUtcDateTime);
    expiration.setHours(expiration.getHours() + 24);
    const timeoutTask = context.df.createTimer(expiration);
    const approvalTask = context.df.waitForExternalEvent("ApprovalEvent");

    const winner = yield context.df.Task.any([approvalTask, timeoutTask]);

    if (winner === approvalTask) {
        timeoutTask.cancel();
        yield context.df.callActivity("processApprovalActivity", approvalTask.result);
    } else {
        yield context.df.callActivity("escalateActivity", requestData);
    }
});
```

**Monitoring pattern** — Periodic polling with backoff:
```typescript
df.app.orchestration("<name>Orchestrator", function* (context: df.OrchestrationContext) {
    const input = context.df.getInput() as { resourceId: string; expiryTime: string };
    const expiryTime = new Date(input.expiryTime);
    let pollingInterval = 30000; // 30 seconds

    while (context.df.currentUtcDateTime < expiryTime) {
        const status = yield context.df.callActivity("checkStatusActivity", input.resourceId);
        if (status === "completed") {
            yield context.df.callActivity("sendAlertActivity", input.resourceId);
            return "completed";
        }

        const nextCheck = new Date(context.df.currentUtcDateTime);
        nextCheck.setMilliseconds(nextCheck.getMilliseconds() + pollingInterval);
        yield context.df.createTimer(nextCheck);

        pollingInterval = Math.min(pollingInterval * 2, 300000); // Max 5 minutes
    }
    return "timed-out";
});
```

### 5. Generate Activity Functions

Create activity functions for each `callActivity` referenced in the orchestrator. Each activity should:
- Accept typed input and return typed output
- Be idempotent (safe to retry)
- Contain all I/O and non-deterministic operations

```typescript
df.app.activity("step1Activity", {
    handler: async (input: unknown, context: InvocationContext) => {
        context.log("Processing step 1:", input);
        // Perform I/O here (database, HTTP, file system)
        return { result: "step1-done" };
    },
});
```

### 6. Display Summary

Show the user:
- Created files and their roles (client, orchestrator, activities)
- Pattern used and how the orchestration flows
- How to start: `func start`, then `POST http://localhost:7071/api/<name>/start`
- How to check status: Use the `statusQueryGetUri` from the start response
- Determinism rules reminder (no I/O, DateTime, or random in orchestrator)
