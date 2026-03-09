---
name: teams-bot-handler
description: "Generate a TeamsActivityHandler with optional state, dialogs, proactive messaging, and meeting support — single-tenant auth"
argument-hint: "--name <BotClassName> [--dialogs] [--proactive] [--state <memory|blob|cosmos>] [--meeting]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - AskUserQuestion
---

# Generate a Teams Bot Handler

Create a `TeamsActivityHandler` subclass with configurable features and single-tenant authentication.

## Instructions

### 1. Validate Inputs

- `--name` — Class name for the bot. Ask if not provided.
- `--dialogs` — Include WaterfallDialog setup with prompts.
- `--proactive` — Include proactive messaging infrastructure.
- `--state` — State storage: `memory` (default), `blob`, or `cosmos`.
- `--meeting` — Include meeting-specific handlers (content bubble, stage sharing, meeting events).

### 2. Generate the Bot Class

Create `src/<botName>.ts` with:

**Always included**:
- Class extending `TeamsActivityHandler`
- `onMessage` handler with basic command routing
- `onMembersAdded` handler (excludes bot itself)
- Proper `await next()` calls

**When --dialogs**: DialogSet, WaterfallDialog, prompts
**When --proactive**: Conversation reference storage, `/api/notify` endpoint
**When --state**: Storage provider (MemoryStorage, BlobsStorage, or CosmosDb)
**When --meeting**:
- Meeting context detection from `channelData.meeting.id`
- Content bubble notification method with `alertInMeeting: true`
- Meeting stage sharing action handler via `onAdaptiveCardInvoke`
- Meeting message extension handlers for agenda search and action items

### 3. Generate the Entry Point

Create or update `src/index.ts` with single-tenant `CloudAdapter`:
```typescript
const credentialsFactory = new ConfigurationServiceClientCredentialFactory({
  MicrosoftAppId: process.env.BOT_ID!,
  MicrosoftAppPassword: process.env.BOT_PASSWORD!,
  MicrosoftAppType: "SingleTenant",
  MicrosoftAppTenantId: process.env.APP_TENANTID!,
});
```

### 4. Update Dependencies

Check `package.json` and add any missing dependencies.

### 5. Display Summary

Show created files, capabilities, how to run/test, and `.env` configuration reminder.
