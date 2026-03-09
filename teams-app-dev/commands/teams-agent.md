---
name: teams-agent
description: "Scaffold a Custom Engine Agent with AI capabilities, tool calling, and Teams integration"
argument-hint: "--name <agent-name> [--ai <openai|azure-openai|anthropic>] [--tools] [--rag]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - AskUserQuestion
---

# Scaffold a Custom Engine Agent

Create a Custom Engine Agent project using the M365 Agents Toolkit with AI-powered conversational capabilities.

## Instructions

### 1. Validate Inputs

- `--name` — Agent name (used for directory, manifest, and package.json). Ask if not provided.
- `--ai` — AI provider: `openai`, `azure-openai`, or `anthropic`. Default: `azure-openai`.
- `--tools` — When set, include function-calling tool definitions and execution scaffolding.
- `--rag` — When set, include RAG (Retrieval-Augmented Generation) with Azure AI Search or SharePoint knowledge.

### 2. Option A: Scaffold via M365 Agents Toolkit (Recommended)

If M365 Agents Toolkit CLI is installed:

```bash
m365agents new --capability custom-engine-agent --app-name <agent-name>
```

### 3. Option B: Manual Scaffold

Create the project structure:

```
<agent-name>/
├── m365agents.yml
├── m365agents.local.yml
├── appPackage/
│   ├── manifest.json        # v1.25 manifest with agenticUserTemplates
│   ├── color.png
│   └── outline.png
├── src/
│   ├── index.ts             # Express server with CloudAdapter (single-tenant)
│   ├── agent.ts             # CustomEngineAgent class extending TeamsActivityHandler
│   ├── aiClient.ts          # AI provider wrapper (OpenAI, Azure OpenAI, or Anthropic)
│   ├── tools.ts             # Tool definitions and handlers (when --tools)
│   └── knowledge.ts         # RAG retrieval service (when --rag)
├── .env
├── package.json
└── tsconfig.json
```

**Agent class** (`src/agent.ts`):
- Extend `TeamsActivityHandler`
- In `onMessage`, route user messages through the AI client
- Handle conversation history with a turn-scoped or state-managed message array
- If `--tools`, include function-calling loop: send tools to AI, execute returned tool calls, feed results back
- If `--rag`, prepend retrieved context to the system prompt before AI completion

**AI client** (`src/aiClient.ts`):
- For `azure-openai`: use `@azure/openai` SDK with `AZURE_OPENAI_ENDPOINT` and `AZURE_OPENAI_DEPLOYMENT`
- For `openai`: use `openai` SDK with `OPENAI_API_KEY`
- For `anthropic`: use `@anthropic-ai/sdk` with `ANTHROPIC_API_KEY`

**Single-tenant adapter** (`src/index.ts`):
```typescript
const credentialsFactory = new ConfigurationServiceClientCredentialFactory({
  MicrosoftAppId: process.env.BOT_ID!,
  MicrosoftAppPassword: process.env.BOT_PASSWORD!,
  MicrosoftAppType: "SingleTenant",
  MicrosoftAppTenantId: process.env.APP_TENANTID!,
});
```

### 4. Generate Manifest v1.25

Create `appPackage/manifest.json` with:
- `$schema` pointing to v1.25
- `manifestVersion`: `"1.25"`
- Bot registration section with single-tenant enforcement
- `agenticUserTemplates` with 2-3 starter prompt templates
- `webApplicationInfo` for SSO
- `nestedAppAuthInfo` for NAA

### 5. Environment Configuration

Generate `.env` with:
```
BOT_ID=
BOT_PASSWORD=
APP_TENANTID=
AZURE_OPENAI_ENDPOINT=     # (azure-openai)
AZURE_OPENAI_DEPLOYMENT=   # (azure-openai)
AZURE_OPENAI_API_KEY=      # (azure-openai)
OPENAI_API_KEY=            # (openai)
ANTHROPIC_API_KEY=         # (anthropic)
```

### 6. Display Summary

Show the user:
- Created files and their purposes
- AI provider configuration needed
- How to test locally: `m365agents preview --local` (uses Agents Playground)
- How to add tools and knowledge sources
- Next steps: configure `.env`, test in Agents Playground
