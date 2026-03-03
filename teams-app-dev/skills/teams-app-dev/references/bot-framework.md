# Bot Framework SDK v4 — Teams Bots Reference

## Overview

Teams bots are built with Bot Framework SDK v4 using the `TeamsActivityHandler` base class. This reference covers the full handler lifecycle, proactive messaging, conversation references, invoke activities, Azure Bot Service registration, and production deployment patterns.

---

## Package Installation

```bash
npm install botbuilder botbuilder-teams @microsoft/botframework-connector
# For TypeScript
npm install --save-dev @types/node
```

---

## TeamsActivityHandler — Full Handler Reference

```typescript
import {
  TeamsActivityHandler,
  TurnContext,
  MessageFactory,
  CardFactory,
  TeamsInfo,
  ConversationReference,
  Activity,
  ActivityTypes,
} from "botbuilder";

export class MyTeamsBot extends TeamsActivityHandler {
  private conversationRefs = new Map<string, Partial<ConversationReference>>();

  constructor() {
    super();

    // ─── Message received ────────────────────────────────────────────────
    this.onMessage(async (context, next) => {
      const text = context.activity.text?.trim().toLowerCase() ?? "";

      // Remove bot mention from text
      const removedMentionText = TurnContext.removeRecipientMention(context.activity);
      const cleanText = removedMentionText?.trim().toLowerCase() ?? text;

      if (context.activity.value) {
        // Adaptive Card Action.Submit
        const data = context.activity.value as Record<string, string>;
        await context.sendActivity(`Received action: ${JSON.stringify(data)}`);
      } else if (cleanText === "help") {
        await context.sendActivity(MessageFactory.text("Available commands: help, status, report"));
      } else {
        await context.sendActivity(MessageFactory.text(`Echo: ${cleanText}`));
      }

      // Save conversation reference for proactive messaging
      this.addConversationReference(context.activity);

      await next();
    });

    // ─── Members added ────────────────────────────────────────────────────
    this.onTeamsMembersAdded(async (membersAdded, teamInfo, context, next) => {
      for (const member of membersAdded) {
        if (member.id !== context.activity.recipient.id) {
          await context.sendActivity(
            MessageFactory.text(`Welcome to the team, ${member.name}!`)
          );
        }
      }
      await next();
    });

    // ─── Members removed ─────────────────────────────────────────────────
    this.onTeamsMembersRemoved(async (membersRemoved, teamInfo, context, next) => {
      for (const member of membersRemoved) {
        console.log(`Member left: ${member.name}`);
      }
      await next();
    });

    // ─── Channel created ─────────────────────────────────────────────────
    this.onTeamsChannelCreated(async (channelInfo, teamInfo, context, next) => {
      await context.sendActivity(
        MessageFactory.text(`Channel created: ${channelInfo.name}`)
      );
      await next();
    });

    // ─── Channel deleted ─────────────────────────────────────────────────
    this.onTeamsChannelDeleted(async (channelInfo, teamInfo, context, next) => {
      console.log(`Channel deleted: ${channelInfo.name}`);
      await next();
    });

    // ─── Team renamed ────────────────────────────────────────────────────
    this.onTeamsTeamRenamedActivity(async (teamInfo, context, next) => {
      await context.sendActivity(`Team renamed to: ${teamInfo.name}`);
      await next();
    });
  }

  // ─── Adaptive Card invoke (Universal Actions) ─────────────────────────
  protected async onAdaptiveCardInvoke(
    context: TurnContext,
    invokeValue: { action: { verb: string; data: Record<string, unknown> } }
  ) {
    const { verb, data } = invokeValue.action;

    if (verb === "approve") {
      return {
        statusCode: 200,
        type: "application/vnd.microsoft.card.adaptive",
        value: { type: "AdaptiveCard", version: "1.6", body: [
          { type: "TextBlock", text: `Approved! Item: ${data.itemId}`, color: "Good" }
        ]},
      };
    }

    return { statusCode: 400, type: "application/vnd.microsoft.error", value: {} };
  }

  // ─── Task module fetch (message extensions / bots) ────────────────────
  protected async handleTeamsTaskModuleFetch(
    context: TurnContext,
    taskModuleRequest: { data: Record<string, string> }
  ) {
    return {
      task: {
        type: "continue",
        value: {
          title: "Task Module",
          height: 400,
          width: 600,
          card: CardFactory.adaptiveCard({
            type: "AdaptiveCard",
            version: "1.6",
            body: [{ type: "TextBlock", text: "Task content" }],
            actions: [{ type: "Action.Submit", title: "Submit", data: { taskAction: "submit" } }]
          }),
        },
      },
    };
  }

  // ─── Task module submit ───────────────────────────────────────────────
  protected async handleTeamsTaskModuleSubmit(
    context: TurnContext,
    taskModuleRequest: { data: Record<string, string> }
  ) {
    await context.sendActivity(`Task submitted: ${JSON.stringify(taskModuleRequest.data)}`);
    return { task: { type: "message", value: "Task complete!" } };
  }

  private addConversationReference(activity: Partial<Activity>) {
    const ref = TurnContext.getConversationReference(activity);
    this.conversationRefs.set(activity.from!.id, ref);
  }

  getConversationRefs() {
    return this.conversationRefs;
  }
}
```

---

## Proactive Messaging

Proactive messages are sent outside of a user-initiated turn. You need a stored `ConversationReference`.

```typescript
import { BotFrameworkAdapter, ConversationReference } from "botbuilder";

// Set up adapter (Express example)
const adapter = new BotFrameworkAdapter({
  appId: process.env.MicrosoftAppId,
  appPassword: process.env.MicrosoftAppPassword,
});

// Store a reference during a normal turn (in the bot handler):
const ref = TurnContext.getConversationReference(context.activity);
// Persist ref to DB or in-memory store

// Later, send a proactive message:
async function sendProactiveMessage(
  adapter: BotFrameworkAdapter,
  ref: Partial<ConversationReference>,
  text: string
) {
  await adapter.continueConversation(ref, async (proactiveContext) => {
    await proactiveContext.sendActivity(MessageFactory.text(text));
  });
}

// Start a NEW conversation proactively (in a team channel):
async function startNewConversation(
  adapter: BotFrameworkAdapter,
  teamId: string,
  channelId: string,
  serviceUrl: string,
  tenantId: string
) {
  const conversationParams = {
    isGroup: true,
    channelData: { channel: { id: channelId } },
    activity: MessageFactory.text("Hello team!"),
    bot: { id: process.env.MicrosoftAppId!, name: "MyBot" },
    members: [],
    tenantId,
  };

  const connector = adapter.createConnectorClient(serviceUrl);
  const response = await connector.conversations.createConversation(conversationParams);

  // Save the new conversation ID for future proactive messages
  return response.id;
}
```

---

## Mentioning Users in Messages

```typescript
import { Mention, MessageFactory } from "botbuilder";

async function mentionUser(context: TurnContext) {
  const mention: Mention = {
    mentioned: context.activity.from,
    text: `<at>${context.activity.from.name}</at>`,
    type: "mention",
  };

  const activity = MessageFactory.text(`Hi ${mention.text}, please review this.`);
  activity.entities = [mention];

  await context.sendActivity(activity);
}
```

---

## Getting Team and Member Information

```typescript
import { TeamsInfo } from "botbuilder";

// Get team details
const teamDetails = await TeamsInfo.getTeamDetails(context);
console.log(teamDetails.name, teamDetails.aadGroupId);

// Get team members
const members = await TeamsInfo.getTeamMembers(context);
for (const member of members) {
  console.log(member.name, member.email, member.aadObjectId);
}

// Get channels in a team
const channels = await TeamsInfo.getTeamChannels(context);
for (const channel of channels) {
  console.log(channel.name, channel.id);
}

// Get a single member
const member = await TeamsInfo.getMember(context, context.activity.from.id);
```

---

## Bot Middleware

```typescript
import { Middleware, TurnContext } from "botbuilder";

// Logging middleware
class LoggingMiddleware implements Middleware {
  async onTurn(context: TurnContext, next: () => Promise<void>) {
    const start = Date.now();
    console.log(`[${new Date().toISOString()}] Incoming activity: ${context.activity.type}`);

    await next();

    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] Turn completed in ${duration}ms`);
  }
}

// Register middleware
adapter.use(new LoggingMiddleware());
```

---

## Express Server Setup

```typescript
import express from "express";
import { BotFrameworkAdapter } from "botbuilder";
import { MyTeamsBot } from "./bot";

const app = express();
app.use(express.json());

const adapter = new BotFrameworkAdapter({
  appId: process.env.MicrosoftAppId ?? "",
  appPassword: process.env.MicrosoftAppPassword ?? "",
});

adapter.onTurnError = async (context, error) => {
  console.error(`Bot turn error: ${error.message}`, error);
  await context.sendActivity("An error occurred. Please try again.");
};

const bot = new MyTeamsBot();

app.post("/api/messages", async (req, res) => {
  await adapter.processActivity(req, res, async (context) => {
    await bot.run(context);
  });
});

const PORT = process.env.PORT ?? 3978;
app.listen(PORT, () => console.log(`Bot running on port ${PORT}`));
```

---

## Azure Bot Service Registration

```bicep
// Azure Bot Service + App Service Plan (Bicep)
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
    properties: {
      isEnabled: true
    }
  }
}
```

---

## Bot Framework Emulator Configuration

```json
// .env for local development
MicrosoftAppId=
MicrosoftAppPassword=
MicrosoftAppType=MultiTenant
PORT=3978

// Bot Framework Emulator connection
// URL: http://localhost:3978/api/messages
// AppId: (empty for local testing without auth)
// AppPassword: (empty for local testing)
```

For testing with real Teams auth locally, use `ngrok`:
```bash
ngrok http 3978
# Then update Bot Service endpoint to: https://<ngrok-id>.ngrok-free.app/api/messages
```

---

## Invoke Activities Reference

| Invoke Name | When Triggered | Response Type |
|---|---|---|
| `adaptiveCard/action` | `Action.Execute` on an Adaptive Card | `AdaptiveCardInvokeResponse` |
| `task/fetch` | Task module open request | `TaskModuleResponse` with `continue` |
| `task/submit` | Task module form submit | `TaskModuleResponse` with `message` or `continue` |
| `composeExtension/query` | Message extension search | `MessagingExtensionResponse` |
| `composeExtension/selectItem` | User selects a search result | `MessagingExtensionResponse` |
| `composeExtension/submitAction` | Action-based extension submit | `MessagingExtensionActionResponse` |
| `composeExtension/fetchTask` | Action extension task module open | `TaskModuleResponse` |
| `composeExtension/queryLink` | Link unfurling | `MessagingExtensionResponse` |
| `signin/verifyState` | OAuth sign-in callback | No response body |

---

## Error Codes

| Error | Meaning | Remediation |
|-------|---------|-------------|
| `401 Unauthorized` | App ID or password incorrect | Verify `MicrosoftAppId` and `MicrosoftAppPassword` in env |
| `403 Forbidden` | Bot not authorized for the team/channel | Ensure bot is installed in the team; check admin policies |
| `BotNotInConversationMembership` | Proactive message to user where bot not installed | Install bot first or use `createConversation` with the team |
| `ServiceUrl` mismatch | Proactive message to wrong service URL | Use exact `serviceUrl` from stored `ConversationReference` |
| `Activity too large` | Message or card exceeds size limits | Split into multiple messages or compress card JSON |
| `429 Too Many Requests` | Rate limit on Bot Connector | Implement exponential backoff; reduce message frequency |
| `invoke` returns 500 | Bot threw exception in invoke handler | Wrap invoke handlers in try/catch; return proper error response |
| Token expired in proactive | Connector client token expired | Use `refreshToken` pattern or short-lived token cache |

---

## Limits

| Resource | Limit | Notes |
|---|---|---|
| Message text length | 28,000 characters | Adaptive Card JSON also counts |
| Proactive messages per second | 1 per second per conversation | Throttling enforced by Bot Connector |
| Mentions per message | No hard limit | More than 10 degrades UX |
| Conversation members returned | 10,000 | Use paged `getPagedMembers` for large teams |
| Task module dimensions | 16px–720px height, 16px–1000px width | Height/width in `continue` response |
| Bot channel registrations per subscription | 10 (free tier) | Unlimited for paid tier |
| Simultaneous proactive messages | Throttled by Bot Service | Batch with queue; do not fan out in parallel loops |
