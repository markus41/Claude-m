---
name: teams-bot-handler
description: "Generate a Teams SDK v2 activity handler with optional state management, dialogs, and proactive messaging"
argument-hint: "--name <BotClassName> [--dialogs] [--proactive] [--state <memory|blob|cosmos>] [--sdk <teams-sdk|agents-sdk>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - AskUserQuestion
---

# Generate a Teams Bot Handler

Create a Teams SDK v2 Application (or M365 Agents SDK ActivityHandler) with configurable features.

## Instructions

### 1. Validate Inputs

- `--name` — Class/module name for the bot (e.g., `HelpDeskBot`, `ApprovalBot`). Ask if not provided.
- `--dialogs` — Include dialog orchestration (using the `dialog` namespace, not deprecated `tasks`).
- `--proactive` — Include proactive messaging infrastructure (conversation reference storage + notification endpoint).
- `--state` — State storage provider: `memory` (default, dev only), `blob` (Azure Blob Storage), `cosmos` (Cosmos DB).
- `--sdk` — Which SDK to use: `teams-sdk` (default, Teams SDK v2) or `agents-sdk` (M365 Agents SDK for multi-channel).

### 2. Generate the Bot (Teams SDK v2 — Default)

Create `src/<botName>.ts` with:

**Always included**:
- Teams SDK v2 `Application` setup with single-tenant auth config
- Message handlers with basic command routing (`help`, unknown command fallback)
- Members added handler that welcomes new users (excluding the bot itself)
- `MicrosoftAppType: 'SingleTenant'` and `APP_TENANTID` configuration

**When --dialogs**:
- Dialog fetch and submit handlers using `app.dialogFetch()` / `app.dialogSubmit()`
- Adaptive Card–based dialog forms
- Note: Uses `dialog` namespace, NOT the deprecated `tasks` namespace

**When --proactive**:
- Conversation reference storage
- `/api/notify` Express endpoint for proactive messaging
- `app.continueConversation()` pattern

**When --state is specified**:
- `memory`: In-memory storage (with a comment warning this is dev-only)
- `blob`: Azure Blob Storage with connection string from env
- `cosmos`: Cosmos DB with connection config from env

### 3. Generate the Bot (M365 Agents SDK — When --sdk agents-sdk)

Create `src/<botName>.ts` with:
- Class extending `ActivityHandler` from `@microsoft/agents-core`
- `onMessage` and `onMembersAdded` handlers
- `createExpressHost` server setup from `@microsoft/agents-hosting-express`

### 4. Generate the Entry Point

Create or update `src/index.ts` with:
- Express server on port `process.env.PORT || 3978`
- Single-tenant auth configuration (`MicrosoftAppType`, `APP_TENANTID`)
- Bot instance creation with state management
- `POST /api/messages` route
- `POST /api/notify` route (when `--proactive`)
- Error handler

### 5. Update Dependencies

Check `package.json` and add any missing dependencies:
- `@microsoft/teams-sdk` (default) or `@microsoft/agents-core` + `@microsoft/agents-hosting-express` (when `--sdk agents-sdk`)
- `express`, `dotenv`

### 6. Display Summary

Show the user:
- Created/updated files
- Bot capabilities (message handling, dialogs, proactive messaging, state)
- How to run: `npx ts-node src/index.ts`
- How to test: `/teams-sideload` or `m365agents preview --local` or Agents Playground
- Reminder to configure `.env` with `BOT_ID`, `BOT_PASSWORD`, and `APP_TENANTID`
- Note: Bot Framework SDK patterns (TeamsActivityHandler, CloudAdapter) are archived — this uses Teams SDK v2
