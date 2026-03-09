---
name: teams-agent
description: "Scaffold a Custom Engine Agent using Teams SDK v2 or M365 Agents SDK"
argument-hint: "--name <agent-name> [--sdk <teams-sdk|agents-sdk>] [--ai <azure-openai|openai|anthropic|custom>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - AskUserQuestion
---

# Scaffold a Custom Engine Agent

Create a Custom Engine Agent project for Teams using either Teams SDK v2 (Teams-only) or M365 Agents SDK (multi-channel).

## Instructions

### 1. Validate Inputs

- `--name` — Agent name (e.g., `HelpDeskAgent`, `ResearchAgent`). Ask if not provided.
- `--sdk` — SDK choice:
  - `teams-sdk` (default) — Teams SDK v2 for Teams-only agents
  - `agents-sdk` — M365 Agents SDK for multi-channel agents (Teams + Web + Slack + SMS + email)
- `--ai` — AI provider integration:
  - `azure-openai` — Azure OpenAI Service
  - `openai` — OpenAI API
  - `anthropic` — Anthropic Claude
  - `custom` — Custom/no AI (traditional command bot)

Ask the user which SDK and AI provider to use if not specified.

### 2. Option A: Scaffold via M365 Agents Toolkit

If the ATK CLI is installed:

```bash
# Teams SDK v2 path
m365agents new --app-name <agent-name> --capability bot --programming-language typescript

# M365 Agents SDK path (multi-channel)
m365agents new --app-name <agent-name> --capability custom-engine-agent --programming-language typescript
```

### 3. Option B: Manual Scaffold — Teams SDK v2

Create project files:

**`src/agent.ts`** — Teams SDK v2 Application with AI integration:
```typescript
import { Application, TurnContext, MessageFactory } from "@microsoft/teams-sdk";

const app = new Application({
  auth: {
    appId: process.env.BOT_ID!,
    appPassword: process.env.BOT_PASSWORD!,
    appType: "SingleTenant",
    appTenantId: process.env.APP_TENANTID!,
  },
});

// AI-powered message handler
app.message(async (context: TurnContext) => {
  const userMessage = TurnContext.removeRecipientMention(context.activity)?.trim() ?? "";
  const response = await processWithAI(userMessage);
  await context.sendActivity(MessageFactory.text(response));
});

app.listen(process.env.PORT ?? 3978);
```

Add AI provider integration based on `--ai` flag:
- **azure-openai**: Import `@azure/openai`, configure endpoint and deployment
- **openai**: Import `openai`, configure API key
- **anthropic**: Import `@anthropic-ai/sdk`, configure API key
- **custom**: No AI integration, basic command routing

### 4. Option C: Manual Scaffold — M365 Agents SDK

Create project files:

**`src/agent.ts`** — M365 Agents SDK ActivityHandler:
```typescript
import { ActivityHandler, TurnContext, MessageFactory } from "@microsoft/agents-core";
import { createExpressHost } from "@microsoft/agents-hosting-express";

class MyAgent extends ActivityHandler {
  async onMessage(context: TurnContext) {
    const text = context.activity.text?.trim() ?? "";
    const response = await processWithAI(text);
    await context.sendActivity(MessageFactory.text(response));
  }
}

const agent = new MyAgent();
createExpressHost(agent, { port: process.env.PORT ?? 3978 });
```

### 5. Generate Configuration

Create:
- `.env` with `BOT_ID`, `BOT_PASSWORD`, `APP_TENANTID`, `MicrosoftAppType=SingleTenant`, and AI provider keys
- `m365agents.yml` with lifecycle actions
- `appPackage/manifest.json` (v1.25) with bot capabilities
- `package.json` with appropriate dependencies

### 6. Display Summary

Show the user:
- Created files and structure
- SDK choice and what it means (Teams-only vs multi-channel)
- AI provider integration details
- How to run locally: `npx ts-node src/agent.ts` or `m365agents preview --local`
- How to test: Agents Playground (no registration needed) or `/teams-sideload`
- Next steps for A2A (Agent2Agent) or MCP integration if relevant
