---
name: teams-notification-hub
description: "Build an enterprise notification hub bot with multi-channel delivery, user preferences, digest scheduling, and delivery tracking"
argument-hint: "--name <HubName> [--sources <webhook|graph|servicebus|eventgrid>] [--digest] [--preferences]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - AskUserQuestion
---

# Build a Notification Hub Bot

Create a centralized Teams notification system that aggregates events from multiple sources, respects user delivery preferences, supports digest scheduling, and tracks delivery status.

## Instructions

### 1. Validate Inputs

- `--name` — Hub name (e.g., `NotificationHub`). Ask if not provided.
- `--sources` — Comma-separated event sources to scaffold:
  - `webhook` — Generic webhook endpoint for external systems
  - `graph` — Microsoft Graph change notifications (email, calendar, files)
  - `servicebus` — Azure Service Bus topic subscription
  - `eventgrid` — Azure Event Grid subscription
  Default: `webhook,graph`.
- `--digest` — Enable digest mode: batch notifications and deliver at scheduled intervals.
- `--preferences` — Enable user preference management (channel, frequency, categories, quiet hours).

### 2. Generate Project Structure

```
<hub-name>/
├── m365agents.yml
├── appPackage/
│   ├── manifest.json
│   └── ...
├── src/
│   ├── index.ts
│   ├── bot.ts                     # Bot handler with notification delivery
│   ├── sources/
│   │   ├── webhook-source.ts      # Generic webhook ingestion
│   │   ├── graph-source.ts        # Graph change notification handler
│   │   ├── servicebus-source.ts   # Service Bus consumer
│   │   └── eventgrid-source.ts    # Event Grid handler
│   ├── delivery/
│   │   ├── engine.ts              # Notification delivery orchestrator
│   │   ├── formatter.ts           # Card template engine per notification type
│   │   ├── router.ts              # Route to user/channel/team based on rules
│   │   └── tracker.ts             # Delivery tracking and retry
│   ├── preferences/               # (when --preferences)
│   │   ├── store.ts               # User preference CRUD
│   │   └── cards.ts               # Preference management Adaptive Cards
│   ├── digest/                    # (when --digest)
│   │   ├── aggregator.ts          # Batch notifications by user/category
│   │   ├── scheduler.ts           # Timer-based digest delivery
│   │   └── templates.ts           # Digest summary card templates
│   ├── storage/
│   │   └── notification-store.ts  # Cosmos DB for notifications, preferences, tracking
│   └── types.ts                   # Shared notification types
├── infra/
│   ├── main.bicep
│   └── parameters.json
├── .env
└── package.json
```

### 3. Notification Types

```typescript
interface Notification {
  id: string;
  source: string;
  category: string;            // "deployment", "security", "hr", "system", etc.
  severity: "info" | "warning" | "critical";
  title: string;
  body: string;
  data?: Record<string, any>;
  actionUrl?: string;
  targets: NotificationTarget[];
  createdAt: Date;
  expiresAt?: Date;
}

interface NotificationTarget {
  type: "user" | "channel" | "team";
  id: string;
  deliveryStatus: "pending" | "sent" | "delivered" | "read" | "failed";
  deliveredAt?: Date;
  readAt?: Date;
  retryCount: number;
}

interface UserPreferences {
  userId: string;
  channels: {
    teams: boolean;
    email: boolean;
  };
  categories: Record<string, { enabled: boolean; severity: string }>;
  quietHours?: { start: string; end: string; timezone: string };
  digestMode: boolean;
  digestSchedule?: string; // cron expression
}
```

### 4. Source Handlers

**Webhook source** — POST `/api/notify` with JSON body:
```typescript
app.post("/api/notify", authenticateWebhook, async (req, res) => {
  const notification = validateAndParse(req.body);
  await deliveryEngine.enqueue(notification);
  res.json({ id: notification.id, status: "accepted" });
});
```

**Graph source** — Subscribe to M365 events and convert to notifications:
- New email → notification with sender, subject, preview
- Calendar event → notification with meeting details, join URL
- File changes → notification with file name, modifier, change type

**Service Bus source** — Consume from topic subscriptions with category-based filtering.

**Event Grid source** — Handle Azure resource events (deployment complete, alert fired, etc.).

### 5. Delivery Engine

The delivery engine must:
- Check user preferences before delivering (category enabled, severity threshold, quiet hours)
- Route to correct conversation reference (personal chat, channel, or team)
- Format notification as Adaptive Card with action buttons
- Track delivery status (sent, delivered, read via card action)
- Retry failed deliveries with exponential backoff (max 3 retries)
- Respect rate limits (1 msg/sec/conversation for proactive)
- Support priority override: `critical` notifications bypass quiet hours and digest mode

### 6. Adaptive Card Templates

Generate card builders for each notification type:

**Standard notification card**: Icon (based on category/severity), title, body, timestamp, action button, dismiss button.
**Critical alert card**: Red accent, bold title, immediate action required, acknowledge button.
**Digest card**: Summary header (count by category), expandable sections per category, "View all" link.
**Preference card**: Toggle switches for categories, severity slider, quiet hours picker, digest schedule selector.

All cards use `Action.Execute` with verbs: `acknowledge`, `dismiss`, `snooze`, `view-detail`, `update-preferences`.

### 7. Digest Mode (when --digest)

The digest aggregator:
- Collects non-critical notifications in a buffer per user
- Groups by category and severity
- Delivers at user's preferred schedule (default: 9 AM local time)
- Includes count summaries and top-3 items per category
- Links to full notification history

Scheduler uses Azure Functions timer trigger or `node-cron` for local dev.

### 8. User Preferences (when --preferences)

Bot commands:
- "notification settings" → Show preference management card
- "mute <category>" → Disable a notification category
- "quiet hours 10pm-7am" → Set quiet hours
- "digest mode on/off" → Toggle digest delivery
- "subscribe to <category>" → Enable a new category

Preferences stored in Cosmos DB, cached in-memory with 5-minute TTL.

### 9. Delivery Tracking Dashboard

Generate a status card command ("notification status") showing:
- Last 24h: sent, delivered, read, failed counts
- Delivery success rate
- Average time-to-read by category
- Failed delivery details with retry status

### 10. Display Summary

Show the user:
- Created files and architecture diagram
- Configured notification sources and their endpoints
- Webhook authentication setup (API key or Azure AD)
- Graph subscription configuration requirements
- Preference management commands
- Digest scheduling configuration
- Monitoring and delivery tracking
- Next steps: configure `.env`, register Graph subscriptions, deploy infrastructure
