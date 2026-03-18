# Proactive Messaging Patterns — Advanced Reference

## Overview

Proactive messaging allows bots to initiate conversations without user input — triggered by external events, schedules, webhooks, or workflow state changes. This reference covers enterprise-grade patterns beyond simple notifications.

---

## Conversation Reference Persistence

### In-Memory (Development Only)

```typescript
const conversationRefs = new Map<string, Partial<ConversationReference>>();

bot.onConversationUpdate(async (context, next) => {
  const ref = TurnContext.getConversationReference(context.activity);
  conversationRefs.set(ref.conversation!.id, ref);
  await next();
});
```

### Azure Cosmos DB (Production)

```typescript
import { CosmosClient } from "@azure/cosmos";

const cosmos = new CosmosClient(process.env.COSMOS_CONNECTION!);
const container = cosmos.database("bot-state").container("conversation-refs");

async function storeRef(ref: Partial<ConversationReference>): Promise<void> {
  await container.items.upsert({
    id: ref.conversation!.id,
    ref,
    userId: ref.user?.id,
    tenantId: ref.conversation?.tenantId,
    lastActivity: new Date().toISOString(),
    channel: ref.channelId,
  });
}

async function getRefsByTenant(tenantId: string): Promise<Partial<ConversationReference>[]> {
  const { resources } = await container.items
    .query({
      query: "SELECT c.ref FROM c WHERE c.tenantId = @tid",
      parameters: [{ name: "@tid", value: tenantId }],
    })
    .fetchAll();
  return resources.map((r) => r.ref);
}
```

### Azure Table Storage (Cost-Effective)

```typescript
import { TableClient } from "@azure/data-tables";

const table = TableClient.fromConnectionString(process.env.TABLE_STORAGE!, "conversationRefs");

async function storeRef(ref: Partial<ConversationReference>): Promise<void> {
  await table.upsertEntity({
    partitionKey: ref.conversation?.tenantId ?? "default",
    rowKey: ref.conversation!.id,
    refJson: JSON.stringify(ref),
    userId: ref.user?.id,
    lastActivity: new Date(),
  });
}
```

---

## Fan-Out Patterns

### Targeted User Notification

```typescript
async function notifyUser(
  adapter: CloudAdapter,
  userId: string,
  message: string,
  card?: Attachment
): Promise<{ success: boolean; error?: string }> {
  const ref = await getRefByUserId(userId);
  if (!ref) return { success: false, error: "No conversation reference found" };

  try {
    await adapter.continueConversationAsync(
      process.env.BOT_ID!,
      ref,
      async (ctx) => {
        if (card) {
          await ctx.sendActivity({ attachments: [card] });
        } else {
          await ctx.sendActivity(MessageFactory.text(message));
        }
      }
    );
    return { success: true };
  } catch (err: any) {
    if (err.statusCode === 403) {
      await removeStaleRef(userId);
      return { success: false, error: "Bot removed from conversation" };
    }
    throw err;
  }
}
```

### Batch Broadcast with Rate Limiting

```typescript
import pLimit from "p-limit";

const limit = pLimit(5); // Max 5 concurrent sends (Bot Connector: 1/sec/conversation)

async function broadcastToAll(
  adapter: CloudAdapter,
  refs: Partial<ConversationReference>[],
  messageFactory: (ref: Partial<ConversationReference>) => Partial<Activity>
): Promise<{ sent: number; failed: number; errors: string[] }> {
  const results = { sent: 0, failed: 0, errors: [] as string[] };

  const tasks = refs.map((ref) =>
    limit(async () => {
      try {
        await adapter.continueConversationAsync(
          process.env.BOT_ID!,
          ref,
          async (ctx) => {
            await ctx.sendActivity(messageFactory(ref));
          }
        );
        results.sent++;
      } catch (err: any) {
        results.failed++;
        results.errors.push(`${ref.conversation?.id}: ${err.message}`);
        if (err.statusCode === 429) {
          const retryAfter = parseInt(err.headers?.["retry-after"] ?? "2", 10);
          await new Promise((r) => setTimeout(r, retryAfter * 1000));
        }
      }
    })
  );

  await Promise.all(tasks);
  return results;
}
```

### Channel-Targeted Broadcast

```typescript
async function postToChannel(
  adapter: CloudAdapter,
  serviceUrl: string,
  tenantId: string,
  teamId: string,
  channelId: string,
  activity: Partial<Activity>
): Promise<string> {
  const ref: Partial<ConversationReference> = {
    bot: { id: process.env.BOT_ID!, name: "Bot" },
    serviceUrl,
    conversation: { id: channelId, tenantId, isGroup: true },
    channelId: "msteams",
  };

  let messageId = "";
  await adapter.continueConversationAsync(
    process.env.BOT_ID!,
    ref,
    async (ctx) => {
      const response = await ctx.sendActivity(activity);
      messageId = response?.id ?? "";
    }
  );
  return messageId;
}
```

---

## Event-Driven Triggers

### Azure Event Grid → Bot

```typescript
import { EventGridEvent } from "@azure/eventgrid";

app.post("/api/events", async (req, res) => {
  const events: EventGridEvent[] = req.body;

  // Handle Event Grid validation
  if (events[0]?.eventType === "Microsoft.EventGrid.SubscriptionValidationEvent") {
    res.json({ validationResponse: events[0].data.validationCode });
    return;
  }

  for (const event of events) {
    switch (event.eventType) {
      case "Microsoft.Storage.BlobCreated":
        await notifyDataTeam(event.data.url, event.data.contentLength);
        break;
      case "Custom.Approval.Required":
        await sendApprovalCard(event.data.requestId, event.data.approverIds);
        break;
    }
  }
  res.sendStatus(200);
});
```

### Azure Service Bus → Bot

```typescript
import { ServiceBusClient } from "@azure/service-bus";

const sbClient = new ServiceBusClient(process.env.SERVICE_BUS_CONNECTION!);
const receiver = sbClient.createReceiver("bot-notifications");

receiver.subscribe({
  processMessage: async (message) => {
    const { userId, type, payload } = message.body;
    switch (type) {
      case "ticket-assigned":
        await notifyUser(adapter, userId, `Ticket ${payload.ticketId} assigned to you`, buildTicketCard(payload));
        break;
      case "deploy-complete":
        await notifyChannel(adapter, payload.channelId, buildDeployCard(payload));
        break;
    }
    await receiver.completeMessage(message);
  },
  processError: async (err) => {
    console.error("Service Bus error:", err);
  },
});
```

### Microsoft Graph Subscriptions (Change Notifications)

```typescript
import { Client } from "@microsoft/microsoft-graph-client";

// Subscribe to new emails for a user
await graphClient.api("/subscriptions").post({
  changeType: "created",
  notificationUrl: `https://${process.env.BOT_DOMAIN}/api/graph-notify`,
  resource: `/users/${userId}/messages`,
  expirationDateTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
  clientState: process.env.GRAPH_WEBHOOK_SECRET,
});

// Handler
app.post("/api/graph-notify", async (req, res) => {
  // Validation token
  if (req.query.validationToken) {
    res.send(req.query.validationToken);
    return;
  }

  const notifications = req.body.value;
  for (const n of notifications) {
    if (n.clientState !== process.env.GRAPH_WEBHOOK_SECRET) continue;
    await processGraphNotification(n);
  }
  res.sendStatus(202);
});
```

---

## Scheduled Proactive Messages

### Azure Functions Timer Trigger

```typescript
// function.json: { "bindings": [{ "type": "timerTrigger", "schedule": "0 0 9 * * 1-5" }] }

import { AzureFunction, Context } from "@azure/functions";

const timerTrigger: AzureFunction = async (context: Context): Promise<void> => {
  const refs = await getAllActiveConversationRefs();

  for (const ref of refs) {
    const user = await getUserProfile(ref.user!.id);
    const tasks = await getPendingTasks(user.email);

    if (tasks.length > 0) {
      await notifyUser(adapter, ref.user!.id, "", buildDailyDigestCard(tasks, user));
    }
  }
};

export default timerTrigger;
```

---

## Proactive Message Delivery Guarantees

| Strategy | Guarantee | Latency | Cost |
|----------|-----------|---------|------|
| Direct `continueConversation` | At-most-once | <1s | Low |
| Service Bus queue + retry | At-least-once | 1-5s | Medium |
| Durable Functions orchestration | Exactly-once | 2-10s | Medium |
| Event Grid + dead-letter | At-least-once | <2s | Low |

### Durable Functions for Exactly-Once

```typescript
import * as df from "durable-functions";

const orchestrator = df.orchestrator(function* (context) {
  const { userId, message, card } = context.df.getInput();

  // Retry with backoff
  const retryOptions = new df.RetryOptions(5000, 3);
  retryOptions.backoffCoefficient = 2;

  yield context.df.callActivityWithRetry("SendProactiveMessage", retryOptions, {
    userId,
    message,
    card,
  });

  yield context.df.callActivity("LogDelivery", { userId, timestamp: new Date() });
});
```

---

## Anti-Patterns

| Anti-Pattern | Problem | Solution |
|---|---|---|
| Storing refs in memory | Lost on restart | Use Cosmos DB or Table Storage |
| No rate limiting on broadcast | 429 errors, throttling | Use `p-limit` with max 5 concurrent |
| Ignoring 403 errors | Stale refs accumulate | Remove ref on 403, log cleanup |
| Sending to removed bots | Silent failures | Check installation status before send |
| No retry on transient errors | Missed notifications | Use Service Bus or Durable Functions |
| Broadcasting during peak hours | User fatigue, throttling | Schedule off-peak or batch with delays |

---

## Limits

| Resource | Limit |
|---|---|
| Proactive messages per conversation | 1/second |
| Bot Connector message size | 28 KB |
| Attachments per message | 10 |
| Graph subscription expiration (messages) | 3 days (must renew) |
| Graph subscription max per app | 1000 |
| Service Bus message size | 256 KB (Standard), 100 MB (Premium) |
