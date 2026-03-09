---
name: teams-scaffold
description: "Scaffold a new Teams app project by type (bot, tab, message-extension, meeting-app, or custom-engine-agent)"
argument-hint: "<bot|tab|message-extension|meeting-app|custom-engine-agent> --name <app-name>"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - AskUserQuestion
---

# Scaffold a Teams App Project

Create a new Teams app project with all required files based on the app type, using manifest v1.25 and M365 Agents Toolkit.

## Instructions

### 1. Validate Inputs

- `<type>` — One of: `bot`, `tab`, `message-extension`, `meeting-app`, `custom-engine-agent`. Ask if not provided.
- `--name` — App name (used for directory, manifest, and package.json). Ask if not provided.

### 2. Option A: Scaffold via M365 Agents Toolkit (Recommended)

If M365 Agents Toolkit CLI is installed, use it for scaffolding:

```bash
m365agents new --app-name <app-name> --capability <type>
```

Capability mapping:
| Input | M365 Agents Toolkit capability |
|-------|-------------------------------|
| `bot` | `bot` |
| `tab` | `tab-non-sso` or `tab` (with SSO) |
| `message-extension` | `search-message-extension` or `action-message-extension` |
| `meeting-app` | `tab` with meeting context scopes |
| `custom-engine-agent` | `custom-engine-agent` |

Ask the user which sub-type they want if relevant.

### 3. Option B: Manual Scaffold

If M365 Agents Toolkit is not installed, create the project manually.

**Common files (all types)**:
- `package.json` — Dependencies for the chosen type
- `tsconfig.json` — TypeScript configuration
- `.env` — Environment variables template (includes `APP_TENANTID` for single-tenant)
- `.gitignore` — Includes `.env`, `node_modules/`, `dist/`, `appPackage/build/`
- `appPackage/manifest.json` — App manifest v1.25 with placeholder GUIDs
- `appPackage/color.png` — Placeholder 192x192 icon (instruct user to replace)
- `appPackage/outline.png` — Placeholder 32x32 icon (instruct user to replace)

**Bot-specific files**:
- `src/index.ts` — Express server with `CloudAdapter` and single-tenant auth
- `src/teamsBot.ts` — `TeamsActivityHandler` with `onMessage` and `onMembersAdded`

**Tab-specific files**:
- `src/index.tsx` — React entry point with Teams SDK initialization
- `src/components/Tab.tsx` — Main tab component with theme support
- `public/index.html` — HTML shell

**Message extension files**:
- `src/index.ts` — Express server with single-tenant adapter
- `src/searchBot.ts` — Bot with `handleTeamsMessagingExtensionQuery`

**Meeting app files**:
- `src/index.ts` — Express server with single-tenant adapter
- `src/meetingBot.ts` — Bot with meeting notification handlers
- `src/components/SidePanel.tsx` — Meeting side panel with stage sharing
- `src/components/Stage.tsx` — Meeting stage content component

**Custom Engine Agent files**:
- `src/index.ts` — Express server with single-tenant adapter
- `src/agent.ts` — Agent class with AI client integration
- `src/aiClient.ts` — AI provider wrapper

### 4. Generate Manifest v1.25

Create `appPackage/manifest.json` with:
- `$schema` pointing to v1.25: `https://developer.microsoft.com/json-schemas/teams/v1.25/MicrosoftTeams.schema.json`
- `manifestVersion`: `"1.25"`
- `id`: `"{{APP_ID}}"` (placeholder for M365 Agents Toolkit) or a generated UUID
- `botId`: `"{{BOT_ID}}"` for bot, message extension, and meeting app types
- Single-tenant bot configuration
- Appropriate `bots`, `composeExtensions`, `staticTabs`, `configurableTabs` sections
- For meeting apps: `configurableTabs` with `context` including `meetingSidePanel`, `meetingStage`, `meetingDetailsTab`
- `validDomains` with the hosting domain
- `webApplicationInfo` if SSO is requested
- `nestedAppAuthInfo` for NAA support
- `supportsChannelFeatures: true` on configurable tabs

### 5. Initialize and Install

```bash
cd <app-name>
npm install
```

### 6. Display Summary

Show the user:
- Created files and their purposes
- Next steps (configure `.env` with `BOT_ID`, `BOT_PASSWORD`, `APP_TENANTID`)
- How to test: `m365agents preview --local` (Agents Playground)
- Relevant commands for their app type
