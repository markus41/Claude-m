---
name: teams-bot-handler
description: "Generate a TeamsActivityHandler with optional state management, dialogs, and proactive messaging"
argument-hint: "--name <BotClassName> [--dialogs] [--proactive] [--state <memory|blob|cosmos>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - AskUserQuestion
---

# Generate a Teams Bot Handler

Create a `TeamsActivityHandler` subclass with configurable features.

## Instructions

### 1. Validate Inputs

- `--name` — Class name for the bot (e.g., `HelpDeskBot`, `ApprovalBot`). Ask if not provided.
- `--dialogs` — Include WaterfallDialog setup with prompts.
- `--proactive` — Include proactive messaging infrastructure (conversation reference storage + notification endpoint).
- `--state` — State storage provider: `memory` (default, dev only), `blob` (Azure Blob Storage), `cosmos` (Cosmos DB).

### 2. Generate the Bot Class

Create `src/<botName>.ts` with:

**Always included**:
- Class extending `TeamsActivityHandler`
- `onMessage` handler with basic command routing (`help`, unknown command fallback)
- `onMembersAdded` handler that welcomes new users (excluding the bot itself)
- Proper `await next()` calls in all handlers

**When --dialogs**:
- Import `DialogSet`, `WaterfallDialog`, `TextPrompt`, `ChoicePrompt` from `botbuilder-dialogs`
- Create a `DialogSet` with a sample `WaterfallDialog`
- Route `onMessage` through `dialogContext.continueDialog()` / `dialogContext.beginDialog()`
- Add dialog state accessor via `conversationState.createProperty("DialogState")`

**When --proactive**:
- Add a `conversationReferences` map to store conversation references
- Save references in `onMessage` via `TurnContext.getConversationReference()`
- Generate a `/api/notify` Express endpoint that sends a proactive message to all stored references

**When --state is specified**:
- `memory`: Use `MemoryStorage` (with a comment warning this is dev-only)
- `blob`: Import `BlobsStorage` from `botbuilder-azure-blobs` with connection string from env
- `cosmos`: Import `CosmosDbPartitionedStorage` from `botbuilder-azure` with connection config from env

### 3. Generate the Entry Point

Create or update `src/index.ts` with:
- Express server on port `process.env.PORT || 3978`
- `CloudAdapter` with `onTurnError` error handler
- Bot instance creation with state management
- `POST /api/messages` route for the bot
- `POST /api/notify` route (when `--proactive`)
- State save middleware (when `--state` or `--dialogs`)

### 4. Update Dependencies

Check `package.json` and add any missing dependencies:
- `botbuilder`, `botbuilder-dialogs` (when `--dialogs`)
- `botbuilder-azure-blobs` (when `--state blob`)
- `botbuilder-azure` (when `--state cosmos`)
- `express`, `dotenv`

### 5. Display Summary

Show the user:
- Created/updated files
- Bot capabilities (message handling, dialogs, proactive messaging, state)
- How to run: `npx ts-node src/index.ts`
- How to test: `/teams-sideload` or `teamsapp preview --local`
- Reminder to configure `.env` with `BOT_ID` and `BOT_PASSWORD`
