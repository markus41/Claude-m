# Teams SDK v2 and M365 Agents SDK — Bot/Agent Reference

## Overview

Teams bots and agents are built with either **Teams SDK v2** (Teams-only, recommended) or the **M365 Agents SDK** (multi-channel). The Bot Framework SDK is archived and should not be used for new projects. This reference covers both SDKs, the activity handler lifecycle, proactive messaging, single-tenant auth, and production patterns.

**Deprecation note**: The `botbuilder` / `botbuilder-teams` npm packages (Bot Framework SDK v4) are archived. The activity protocol, turn context, and adapter patterns carry forward into both new SDKs.

---

## Teams SDK v2 — Package Installation

```bash
npm install @microsoft/teams-sdk
npm install --save-dev typescript @types/node
```

---

## Teams SDK v2 — Application Pattern

```typescript
import {
  Application,
  TurnContext,
  MessageFactory,
  CardFactory,
  TeamsInfo,
} from "@microsoft/teams-sdk";

const app = new Application({
  auth: {
    appId: process.env.BOT_ID!,
    appPassword: process.env.BOT_PASSWORD!,
    appType: "SingleTenant",
    appTenantId: process.env.APP_TENANTID!,
  },
});

// ─── Message handlers ─────────────────────────────────────────────────
app.message("help", async (context: TurnContext) => {
  await context.sendActivity(MessageFactory.text("Available commands: help, status, report"));
});

app.message(async (context: TurnContext) => {
  const text = TurnContext.removeRecipientMention(context.activity)?.trim() ?? "";

  if (context.activity.value) {
    // Adaptive Card Action.Submit / Action.Execute data
    const data = context.activity.value as Record<string, string>;
    await context.sendActivity(`Received action: ${JSON.stringify(data)}`);
  } else {
    await context.sendActivity(MessageFactory.text(`Echo: ${text}`));
  }
});

// ─── Members added ────────────────────────────────────────────────────
app.membersAdded(async (context: TurnContext, members) => {
  for (const member of members) {
    if (member.id !== context.activity.recipient.id) {
      await context.sendActivity(MessageFactory.text(`Welcome, ${member.name}!`));
    }
  }
});

// ─── Adaptive Card invoke (Universal Actions) ────────────────────────
app.adaptiveCardAction("approve", async (context: TurnContext, data) => {
  return {
    statusCode: 200,
    type: "application/vnd.microsoft.card.adaptive",
    value: {
      type: "AdaptiveCard",
      version: "1.5",
      body: [{ type: "TextBlock", text: `Approved! Item: ${data.itemId}`, color: "Good" }],
    },
  };
});

// ─── Dialog fetch (replaces task/fetch) ──────────────────────────────
app.dialogFetch(async (context: TurnContext, request) => {
  return {
    task: {
      type: "continue",
      value: {
        title: "Dialog",
        height: 400,
        width: 600,
        card: CardFactory.adaptiveCard({
          type: "AdaptiveCard",
          version: "1.5",
          body: [{ type: "TextBlock", text: "Dialog content" }],
          actions: [{ type: "Action.Submit", title: "Submit", data: { action: "submit" } }],
        }),
      },
    },
  };
});

// ─── Dialog submit (replaces task/submit) ────────────────────────────
app.dialogSubmit(async (context: TurnContext, request) => {
  await context.sendActivity(`Submitted: ${JSON.stringify(request.data)}`);
  return { task: { type: "message", value: "Done!" } };
});

// ─── Start server ────────────────────────────────────────────────────
app.listen(process.env.PORT ?? 3978);
```

---

## M365 Agents SDK — Package Installation

```bash
npm install @microsoft/agents-core @microsoft/agents-hosting-express
# Node 20+ required (Node 22 recommended)
```

---

## M365 Agents SDK — ActivityHandler Pattern

```typescript
import { ActivityHandler, TurnContext, MessageFactory } from "@microsoft/agents-core";
import { createExpressHost } from "@microsoft/agents-hosting-express";

class MyAgent extends ActivityHandler {
  async onMessage(context: TurnContext) {
    const text = context.activity.text?.trim() ?? "";
    await context.sendActivity(MessageFactory.text(`Echo: ${text}`));
  }

  async onMembersAdded(context: TurnContext, membersAdded: any[]) {
    for (const member of membersAdded) {
      if (member.id !== context.activity.recipient.id) {
        await context.sendActivity(MessageFactory.text(`Welcome!`));
      }
    }
  }
}

const agent = new MyAgent();
createExpressHost(agent, { port: process.env.PORT ?? 3978 });
```

---

## Proactive Messaging

```typescript
// Store conversation reference during a turn
const ref = TurnContext.getConversationReference(context.activity);
// Persist ref to DB or in-memory store

// Send proactive message later
await app.continueConversation(ref, async (proactiveContext) => {
  await proactiveContext.sendActivity(MessageFactory.text("Notification!"));
});
```

---

## Mentioning Users

```typescript
import { Mention, MessageFactory } from "@microsoft/teams-sdk";

const mention: Mention = {
  mentioned: context.activity.from,
  text: `<at>${context.activity.from.name}</at>`,
  type: "mention",
};

const activity = MessageFactory.text(`Hi ${mention.text}, please review this.`);
activity.entities = [mention];
await context.sendActivity(activity);
```

---

## Getting Team and Member Information

```typescript
import { TeamsInfo } from "@microsoft/teams-sdk";

const teamDetails = await TeamsInfo.getTeamDetails(context);
const members = await TeamsInfo.getPagedMembers(context);
const channels = await TeamsInfo.getTeamChannels(context);
const member = await TeamsInfo.getMember(context, context.activity.from.id);
```

---

## Express Server Setup

```typescript
import express from "express";
import { Application } from "@microsoft/teams-sdk";

const expressApp = express();
expressApp.use(express.json());

const bot = new Application({
  auth: {
    appId: process.env.BOT_ID!,
    appPassword: process.env.BOT_PASSWORD!,
    appType: "SingleTenant",
    appTenantId: process.env.APP_TENANTID!,
  },
});

bot.onTurnError = async (context, error) => {
  console.error(`Bot turn error: ${error.message}`, error);
  await context.sendActivity("An error occurred. Please try again.");
};

expressApp.post("/api/messages", async (req, res) => {
  await bot.processActivity(req, res);
});

const PORT = process.env.PORT ?? 3978;
expressApp.listen(PORT, () => console.log(`Bot running on port ${PORT}`));
```

---

## Azure Bot Service Registration (Single-Tenant)

```bicep
resource botService 'Microsoft.BotService/botServices@2022-09-15' = {
  name: 'my-teams-bot'
  location: 'global'
  sku: { name: 'F0' }
  kind: 'azurebot'
  properties: {
    displayName: 'My Teams Bot'
    endpoint: 'https://${appService.properties.defaultHostName}/api/messages'
    msaAppId: appRegistration.properties.appId
    msaAppType: 'SingleTenant'
    msaAppTenantId: subscription().tenantId
  }
}

resource teamsChannel 'Microsoft.BotService/botServices/channels@2022-09-15' = {
  parent: botService
  name: 'MsTeamsChannel'
  location: 'global'
  properties: {
    channelName: 'MsTeamsChannel'
    properties: { isEnabled: true }
  }
}
```

**Important**: Multi-tenant bot registration is retiring. All new bots must use single-tenant.

---

## Invoke Activities Reference

| Invoke Name | When Triggered | Response Type |
|---|---|---|
| `adaptiveCard/action` | `Action.Execute` on Adaptive Card | `AdaptiveCardInvokeResponse` |
| `task/fetch` (dialog fetch) | Dialog open request | Dialog response with `continue` |
| `task/submit` (dialog submit) | Dialog form submit | Dialog response with `message` or `continue` |
| `composeExtension/query` | Message extension search | `MessagingExtensionResponse` |
| `composeExtension/selectItem` | User selects search result | `MessagingExtensionResponse` |
| `composeExtension/submitAction` | Action extension submit | `MessagingExtensionActionResponse` |
| `composeExtension/fetchTask` | Action extension dialog open | Dialog response |
| `composeExtension/queryLink` | Link unfurling | `MessagingExtensionResponse` |
| `signin/verifyState` | OAuth sign-in callback | No response body |

---

## Error Codes

| Error | Meaning | Remediation |
|-------|---------|-------------|
| `401 Unauthorized` | App ID, password, or tenant ID incorrect | Verify `BOT_ID`, `BOT_PASSWORD`, and `APP_TENANTID` |
| `403 Forbidden` | Bot not authorized for team/channel | Ensure bot is installed; check admin policies |
| `BotNotInConversationMembership` | Proactive message where bot not installed | Install bot first or use `createConversation` |
| `ServiceUrl` mismatch | Proactive message to wrong service URL | Use exact `serviceUrl` from stored `ConversationReference` |
| `429 Too Many Requests` | Rate limit | Implement exponential backoff |
| `invoke` returns 500 | Handler threw exception | Wrap handlers in try/catch |

---

## Limits

| Resource | Limit | Notes |
|---|---|---|
| Message text length | 28,000 characters | Adaptive Card JSON also counts |
| Proactive messages per second | 1 per conversation | Throttled by Bot Connector |
| Conversation members returned | 10,000 | Use `getPagedMembers` for large teams |
| Dialog dimensions | 16px–720px height, 16px–1000px width | Teams clips to min/max |
| Bot registrations per subscription | 10 (free tier) | Unlimited for paid tier |
