# Teams Bots Reference — Teams SDK & Bot Framework

## Overview

Teams bots are built using the `TeamsActivityHandler` base class from the `botbuilder` package. The Bot Framework SDK is now archived (final LTS ended December 2025), but the `botbuilder` packages remain the runtime for Teams bots. For new projects, Microsoft recommends the **Teams SDK** (formerly Teams AI Library, GA in C#/JS, preview in Python) or the **Microsoft 365 Agents SDK** (multi-channel agents).

> **Important**: Bot Framework SDK repos are archived on GitHub and support tickets are no longer serviced as of December 31, 2025. The `botbuilder` npm packages still work but receive no new features. New bots should use Teams SDK or Agents SDK.

---

## Package Installation

```bash
# Core bot packages (still functional, but no new features)
npm install botbuilder @microsoft/botframework-connector

# Teams SDK (recommended for new projects)
npm install @microsoft/teams-sdk

# For TypeScript
npm install --save-dev @types/node
```

---

## Single-Tenant Bot Adapter (Required for v1.25)

All new bot registrations must be single-tenant (multi-tenant creation blocked after July 31, 2025).

```typescript
import {
  CloudAdapter,
  ConfigurationServiceClientCredentialFactory,
  ConfigurationBotFrameworkAuthentication,
} from "botbuilder";

const credentialsFactory = new ConfigurationServiceClientCredentialFactory({
  MicrosoftAppId: process.env.BOT_ID!,
  MicrosoftAppPassword: process.env.BOT_PASSWORD!,
  MicrosoftAppType: "SingleTenant",
  MicrosoftAppTenantId: process.env.APP_TENANTID!,
});

const botFrameworkAuthentication = new ConfigurationBotFrameworkAuthentication(
  {},
  credentialsFactory
);

const adapter = new CloudAdapter(botFrameworkAuthentication);

adapter.onTurnError = async (context, error) => {
  console.error(`Bot turn error: ${error.message}`, error);
  await context.sendActivity("An error occurred. Please try again.");
};
```

---

## TeamsActivityHandler — Full Reference

```typescript
import {
  TeamsActivityHandler,
  TurnContext,
  MessageFactory,
  CardFactory,
  TeamsInfo,
  ConversationReference,
  Activity,
} from "botbuilder";

export class MyTeamsBot extends TeamsActivityHandler {
  private conversationRefs = new Map<string, Partial<ConversationReference>>();

  constructor() {
    super();

    this.onMessage(async (context, next) => {
      const text = context.activity.text?.trim().toLowerCase() ?? "";
      const removedMentionText = TurnContext.removeRecipientMention(context.activity);
      const cleanText = removedMentionText?.trim().toLowerCase() ?? text;

      if (context.activity.value) {
        const data = context.activity.value as Record<string, string>;
        await context.sendActivity(`Received action: ${JSON.stringify(data)}`);
      } else if (cleanText === "help") {
        await context.sendActivity(MessageFactory.text("Available commands: help, status"));
      } else {
        await context.sendActivity(MessageFactory.text(`Echo: ${cleanText}`));
      }

      this.addConversationReference(context.activity);
      await next();
    });

    this.onTeamsMembersAdded(async (membersAdded, teamInfo, context, next) => {
      for (const member of membersAdded) {
        if (member.id !== context.activity.recipient.id) {
          await context.sendActivity(MessageFactory.text(`Welcome, ${member.name}!`));
        }
      }
      await next();
    });
  }

  // Universal Action handler
  protected async onAdaptiveCardInvoke(context: TurnContext, invokeValue: any) {
    const { verb, data } = invokeValue.action;
    if (verb === "approve") {
      return {
        statusCode: 200,
        type: "application/vnd.microsoft.card.adaptive",
        value: { type: "AdaptiveCard", version: "1.5", body: [
          { type: "TextBlock", text: `Approved! Item: ${data.itemId}`, color: "Good" }
        ]},
      };
    }
    return { statusCode: 400, type: "application/vnd.microsoft.error", value: {} };
  }

  // Dialog handlers (replaces "task module" client-side, but method names unchanged)
  protected async handleTeamsTaskModuleFetch(context: TurnContext, request: any) {
    return {
      task: {
        type: "continue",
        value: {
          title: "Dialog",
          height: 400,
          width: 600,
          card: CardFactory.adaptiveCard({
            type: "AdaptiveCard", version: "1.5",
            body: [{ type: "TextBlock", text: "Dialog content" }],
            actions: [{ type: "Action.Submit", title: "Submit" }]
          }),
        },
      },
    };
  }

  protected async handleTeamsTaskModuleSubmit(context: TurnContext, request: any) {
    await context.sendActivity(`Submitted: ${JSON.stringify(request.data)}`);
    return { task: { type: "message", value: "Done!" } };
  }

  private addConversationReference(activity: Partial<Activity>) {
    const ref = TurnContext.getConversationReference(activity);
    this.conversationRefs.set(activity.from!.id, ref);
  }
}
```

---

## Proactive Messaging

```typescript
import { ConversationReference, MessageFactory } from "botbuilder";

async function sendProactiveMessage(
  adapter: CloudAdapter,
  ref: Partial<ConversationReference>,
  text: string
) {
  await adapter.continueConversation(ref, async (ctx) => {
    await ctx.sendActivity(MessageFactory.text(text));
  });
}
```

---

## Meeting Bot Patterns

```typescript
// Detect meeting context
const meetingId = context.activity.channelData?.meeting?.id;

// Send content bubble during meeting
await context.sendActivity({
  type: "message",
  attachments: [card],
  channelData: {
    notification: { alertInMeeting: true },
  },
});
```

---

## Azure Bot Registration (Single-Tenant Bicep)

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
```

---

## Express Server Setup

```typescript
import express from "express";
import { CloudAdapter } from "botbuilder";
import { MyTeamsBot } from "./bot";

const app = express();
app.use(express.json());

const bot = new MyTeamsBot();

app.post("/api/messages", async (req, res) => {
  await adapter.process(req, res, async (context) => {
    await bot.run(context);
  });
});

const PORT = process.env.PORT ?? 3978;
app.listen(PORT, () => console.log(`Bot running on port ${PORT}`));
```

---

## SDK Decision Matrix

| Scenario | Recommended SDK | Notes |
|----------|----------------|-------|
| Teams-only bot/tab/ME | **Teams SDK** | GA in C#/JS, preview in Python. Supports MCP and A2A. |
| Multi-channel agent (Teams + Copilot + Slack) | **Microsoft 365 Agents SDK** | AI-agnostic agent container with multi-channel routing |
| Existing Bot Framework bot | **Migrate to Teams SDK** | Bot Framework SDK archived Dec 2025 |
| API-only message extension | **No SDK needed** | OpenAPI spec + manifest only |
| Agent 365 declarative agent | **Agent 365 SDK** | JS, Python, .NET packages available |

---

## Error Codes

| Error | Meaning | Remediation |
|-------|---------|-------------|
| `401 Unauthorized` | App ID or password incorrect | Verify `BOT_ID`, `BOT_PASSWORD`, `APP_TENANTID` |
| `403 Forbidden` | Bot not authorized | Ensure bot is installed and single-tenant matches |
| `BotNotInConversationMembership` | Proactive message failed | Install bot first or use `createConversation` |
| `429 Too Many Requests` | Rate limit | Implement exponential backoff |

---

## Limits

| Resource | Limit | Notes |
|---|---|---|
| Message text length | 28,000 characters | |
| Proactive messages per second | 1 per conversation | Throttled by Bot Connector |
| Conversation members returned | 10,000 | Use paged `getPagedMembers` |
| Dialog dimensions | 16–720px height, 16–1000px width | |
