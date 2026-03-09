---
name: teams-migrate
description: "Assist migration from TeamsFx / Bot Framework SDK to Teams SDK v2 or M365 Agents SDK"
argument-hint: "[--from <teamsfx|botframework>] [--to <teams-sdk|agents-sdk>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

# Migrate Teams App to Current SDKs

Assist migration from deprecated TeamsFx SDK or Bot Framework SDK to the current Teams SDK v2 or M365 Agents SDK.

## Background

- **TeamsFx SDK**: Community-only support until Sep 2026; full deprecation Jul 2026
- **Bot Framework SDK**: Repository archived; long-term support retired
- **Multi-tenant bot registration**: Retiring; all new bots must be single-tenant

## Instructions

### 1. Detect Current Stack

Scan the project to identify what's being used:

**TeamsFx indicators**:
- `@microsoft/teamsfx` in `package.json`
- `teamsapp.yml` or `teamsapp.local.yml` config files
- `@microsoft/teamsapp-cli` references
- TeamsFx-specific patterns (e.g., `TeamsFxBotHandler`, `TeamsFxContext`)

**Bot Framework SDK indicators**:
- `botbuilder`, `botbuilder-teams`, `botbuilder-dialogs` in `package.json`
- Classes extending `TeamsActivityHandler` from `botbuilder`
- `CloudAdapter` or `BotFrameworkAdapter` usage
- `MicrosoftAppType: 'MultiTenant'` in config

**Manifest version**:
- Check `$schema` URL and `manifestVersion` in `manifest.json`

### 2. Determine Target

- `--to teams-sdk` (default) — Migrate to Teams SDK v2 (Teams-only apps)
- `--to agents-sdk` — Migrate to M365 Agents SDK (multi-channel agents)

Ask the user if not specified.

### 3. Migration Steps — TeamsFx to Teams SDK v2

#### a. Update Dependencies

```bash
# Remove TeamsFx packages
npm uninstall @microsoft/teamsfx

# Install Teams SDK v2
npm install @microsoft/teams-sdk

# Update TeamsJS to latest
npm install @microsoft/teams-js@latest
```

#### b. Update CLI Tooling

```bash
npm uninstall -g @microsoft/teamsapp-cli
npm install -g @microsoft/m365agentstoolkit-cli
```

#### c. Migrate Config Files

- Rename `teamsapp.yml` → `m365agents.yml` (update action names if needed)
- Update environment files to include `APP_TENANTID` and `MicrosoftAppType=SingleTenant`

#### d. Migrate Bot Code

Replace Bot Framework patterns with Teams SDK v2 patterns:

| Before (Bot Framework) | After (Teams SDK v2) |
|---|---|
| `class MyBot extends TeamsActivityHandler` | `const app = new Application({ auth: {...} })` |
| `this.onMessage(async (context, next) => {...})` | `app.message(async (context) => {...})` |
| `this.onMembersAdded(...)` | `app.membersAdded(...)` |
| `CloudAdapter` + `processActivity` | `app.processActivity()` or `app.listen()` |
| `handleTeamsTaskModuleFetch` | `app.dialogFetch(...)` |
| `handleTeamsTaskModuleSubmit` | `app.dialogSubmit(...)` |
| `handleTeamsMessagingExtensionQuery` | `app.messageExtension.query(...)` |
| `BotFrameworkAdapter` | Use `Application` directly |

#### e. Update Auth Configuration

- Change `MicrosoftAppType` from `MultiTenant` to `SingleTenant`
- Add `APP_TENANTID` to `.env`
- Update Azure Bot registration to single-tenant

### 4. Migration Steps — Bot Framework to M365 Agents SDK

#### a. Update Dependencies

```bash
npm uninstall botbuilder botbuilder-teams botbuilder-dialogs
npm install @microsoft/agents-core @microsoft/agents-hosting-express
```

#### b. Migrate Bot Code

| Before (Bot Framework) | After (M365 Agents SDK) |
|---|---|
| `import { TeamsActivityHandler } from "botbuilder"` | `import { ActivityHandler } from "@microsoft/agents-core"` |
| `class MyBot extends TeamsActivityHandler` | `class MyBot extends ActivityHandler` |
| `CloudAdapter` + Express route | `createExpressHost(agent, { port })` |

### 5. Update Manifest

- Update `$schema` to v1.25: `https://developer.microsoft.com/json-schemas/teams/v1.25/MicrosoftTeams.schema.json`
- Update `manifestVersion` to `"1.25"`
- Add `supportsChannelFeatures: "tier1"` if team-scoped
- Add `nestedAppAuthInfo` if using NAA
- Review for new v1.25 properties that may benefit the app

### 6. Update TeamsJS Usage

If tabs use the `tasks` namespace, migrate to `dialog`:

| Before | After |
|---|---|
| `microsoftTeams.tasks.startTask(taskInfo)` | `microsoftTeams.dialog.url.open(dialogInfo)` |
| `microsoftTeams.tasks.submitTask(result)` | `microsoftTeams.dialog.url.submit(result)` |

Ensure TeamsJS version is ≥ v2.19.0 (minimum for Store submission).

### 7. Validate Migration

- Run `m365agents validate --manifest-path ./appPackage/manifest.json`
- Test bot functionality locally with `m365agents preview --local` or Agents Playground
- Verify all message extension commands still work
- Check SSO/auth flows
- Run existing tests

### 8. Display Summary

Show the user:
- Files changed and what was migrated
- Deprecation timeline reminders
- Any manual steps remaining (e.g., Azure Bot registration update)
- How to test the migrated app
