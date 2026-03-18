# Teams SDK & Agents SDK Migration — Advanced Reference

## Overview

The Bot Framework SDK was archived December 31, 2025. New Teams bots should use the **Teams SDK** (formerly Teams AI Library, GA in C#/JS) or the **Microsoft 365 Agents SDK** (multi-channel agents). This reference covers migration patterns, API mappings, and decision frameworks.

---

## SDK Timeline

| SDK | Status (March 2026) | Use Case |
|-----|---------------------|----------|
| Bot Framework SDK (`botbuilder`) | Archived, no patches | Legacy maintenance only |
| Teams SDK (`@microsoft/teams-sdk`) | GA (C#, JS); Preview (Python) | Teams-only bots, tabs, MEs |
| M365 Agents SDK | GA (C#, JS, Python) | Multi-channel agents |
| Agent 365 SDK | GA (JS, Python, .NET) | Declarative agents |
| Teams AI Library (`@microsoft/teams-ai`) | Merged into Teams SDK | N/A — use Teams SDK |

---

## Migration: Bot Framework → Teams SDK

### Package Changes

```bash
# Remove
npm uninstall botbuilder @microsoft/botframework-connector botbuilder-dialogs

# Install
npm install @microsoft/teams-sdk
```

### Adapter Migration

**Before (Bot Framework):**
```typescript
import { CloudAdapter, ConfigurationServiceClientCredentialFactory } from "botbuilder";

const creds = new ConfigurationServiceClientCredentialFactory({
  MicrosoftAppId: process.env.BOT_ID!,
  MicrosoftAppPassword: process.env.BOT_PASSWORD!,
  MicrosoftAppType: "SingleTenant",
  MicrosoftAppTenantId: process.env.APP_TENANTID!,
});
const adapter = new CloudAdapter(new ConfigurationBotFrameworkAuthentication({}, creds));
```

**After (Teams SDK):**
```typescript
import { TeamsAdapter, TeamsAdapterSettings } from "@microsoft/teams-sdk";

const adapter = new TeamsAdapter({
  appId: process.env.BOT_ID!,
  appPassword: process.env.BOT_PASSWORD!,
  appType: "SingleTenant",
  tenantId: process.env.APP_TENANTID!,
});
```

### Handler Migration

**Before (Bot Framework):**
```typescript
import { TeamsActivityHandler, TurnContext } from "botbuilder";

class MyBot extends TeamsActivityHandler {
  constructor() {
    super();
    this.onMessage(async (context, next) => {
      await context.sendActivity(`Echo: ${context.activity.text}`);
      await next();
    });
  }

  protected async handleTeamsTaskModuleFetch(context: TurnContext, request: any) {
    return { task: { type: "continue", value: { title: "Dialog", card: ... } } };
  }
}
```

**After (Teams SDK):**
```typescript
import { TeamsApp, MessageContext, DialogContext } from "@microsoft/teams-sdk";

const app = new TeamsApp({
  adapter,
  // AI integration built-in
  ai: {
    planner: {
      model: "gpt-4o",
      endpoint: process.env.AZURE_OPENAI_ENDPOINT,
      apiKey: process.env.AZURE_OPENAI_KEY,
    },
  },
});

app.message("/echo (.*)/", async (ctx: MessageContext, matches: RegExpMatchArray) => {
  await ctx.reply(`Echo: ${matches[1]}`);
});

app.message(async (ctx: MessageContext) => {
  // Falls through to AI planner if no route matches
  const response = await ctx.ai.complete(ctx.activity.text);
  await ctx.reply(response);
});

app.dialogFetch("myDialog", async (ctx: DialogContext) => {
  return ctx.dialogCard({
    title: "Dialog",
    card: buildAdaptiveCard(),
  });
});
```

### Key API Mappings

| Bot Framework | Teams SDK | Notes |
|---|---|---|
| `TeamsActivityHandler` | `TeamsApp` + route handlers | Declarative routing replaces class inheritance |
| `this.onMessage()` | `app.message()` | Supports regex, string, and catch-all |
| `this.onAdaptiveCardInvoke()` | `app.adaptiveCard.actionExecute()` | Verb-based routing |
| `handleTeamsTaskModuleFetch` | `app.dialogFetch()` | Renamed to dialog namespace |
| `handleTeamsTaskModuleSubmit` | `app.dialogSubmit()` | Renamed to dialog namespace |
| `this.onTeamsMembersAdded()` | `app.conversationUpdate.membersAdded()` | More granular event routing |
| `context.sendActivity()` | `ctx.reply()` / `ctx.send()` | Simplified API |
| `TurnContext.removeRecipientMention()` | Automatic | Teams SDK strips mentions by default |
| `adapter.continueConversation()` | `app.sendProactive()` | Built-in proactive support |
| `DialogSet` / `WaterfallDialog` | `app.dialog()` chain | Fluent dialog API |
| `MemoryStorage` / `BlobsStorage` | `app.storage()` | Pluggable storage interface |

### State Management Migration

**Before:**
```typescript
import { MemoryStorage, ConversationState, UserState } from "botbuilder";

const storage = new MemoryStorage();
const conversationState = new ConversationState(storage);
const userState = new UserState(storage);
const accessor = conversationState.createProperty("data");
```

**After:**
```typescript
import { TeamsApp } from "@microsoft/teams-sdk";

const app = new TeamsApp({
  storage: { type: "cosmos", connectionString: process.env.COSMOS_CONNECTION },
});

// State is automatically managed per conversation and user
app.message(async (ctx) => {
  const count = (await ctx.state.conversation.get("count")) ?? 0;
  await ctx.state.conversation.set("count", count + 1);
  await ctx.reply(`Message count: ${count + 1}`);
});
```

---

## Migration: Bot Framework → M365 Agents SDK

Use the Agents SDK when your bot needs to work across Teams, Copilot, Slack, or custom channels.

### Package Changes

```bash
npm install @microsoft/agents-sdk @microsoft/agents-sdk-teams
```

### Agent Pattern

```typescript
import { Agent, AgentRuntime, TeamsChannel } from "@microsoft/agents-sdk";
import { TeamsChannel as TeamsExt } from "@microsoft/agents-sdk-teams";

const agent = new Agent({
  name: "support-agent",
  instructions: "You are a helpful IT support agent...",
  channels: [
    new TeamsExt({
      appId: process.env.BOT_ID!,
      appPassword: process.env.BOT_PASSWORD!,
      tenantId: process.env.APP_TENANTID!,
    }),
  ],
  tools: [
    {
      name: "create_ticket",
      description: "Create a support ticket",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          priority: { type: "string", enum: ["low", "medium", "high", "critical"] },
          description: { type: "string" },
        },
        required: ["title", "priority"],
      },
      handler: async (params) => {
        const ticket = await ticketService.create(params);
        return { ticketId: ticket.id, url: ticket.url };
      },
    },
  ],
});

const runtime = new AgentRuntime({ agents: [agent] });
runtime.listen(3978);
```

---

## MCP (Model Context Protocol) Integration

Teams SDK and Agents SDK both support MCP servers as tool providers:

```typescript
const app = new TeamsApp({
  adapter,
  ai: {
    planner: { model: "gpt-4o", endpoint: process.env.AZURE_OPENAI_ENDPOINT },
    tools: {
      mcp: [
        {
          name: "sharepoint",
          transport: "stdio",
          command: "npx",
          args: ["@anthropic/sharepoint-mcp-server"],
        },
        {
          name: "jira",
          transport: "sse",
          url: "https://mcp.example.com/jira",
          headers: { Authorization: `Bearer ${process.env.JIRA_TOKEN}` },
        },
      ],
    },
  },
});
```

---

## A2A (Agent-to-Agent) Protocol

Teams SDK supports A2A for multi-agent orchestration:

```typescript
import { A2AClient } from "@microsoft/teams-sdk/a2a";

app.message(async (ctx) => {
  // Delegate to specialist agent
  const a2a = new A2AClient("https://specialist-agent.example.com/.well-known/agent.json");

  const result = await a2a.sendTask({
    message: {
      role: "user",
      parts: [{ type: "text", text: ctx.activity.text }],
    },
  });

  if (result.status === "completed") {
    const textPart = result.artifacts?.[0]?.parts.find((p) => p.type === "text");
    await ctx.reply(textPart?.text ?? "Agent completed with no response.");
  }
});
```

---

## Streaming Responses

Teams SDK supports streaming bot responses for AI-generated content:

```typescript
app.message(async (ctx) => {
  await ctx.streamReply(async (stream) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: ctx.activity.text }],
      stream: true,
    });

    for await (const chunk of completion) {
      const text = chunk.choices[0]?.delta?.content;
      if (text) {
        await stream.append(text);
      }
    }

    await stream.end();
  });
});
```

---

## Migration Checklist

- [ ] Replace `botbuilder` imports with `@microsoft/teams-sdk`
- [ ] Convert `TeamsActivityHandler` class to `TeamsApp` route handlers
- [ ] Replace `CloudAdapter` with `TeamsAdapter`
- [ ] Migrate dialogs from `WaterfallDialog` to `app.dialog()` chains
- [ ] Replace manual mention stripping (automatic in Teams SDK)
- [ ] Update state management to Teams SDK storage API
- [ ] Replace `continueConversation` with `app.sendProactive()`
- [ ] Update `handleTeamsTaskModuleFetch/Submit` to `dialogFetch/Submit`
- [ ] Add AI planner configuration if using AI features
- [ ] Update manifest from `teamsapp.yml` to `m365agents.yml`
- [ ] Test in Agents Playground with `m365agents preview --local`
- [ ] Verify single-tenant authentication still works
