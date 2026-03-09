---
name: teams-scaffold
description: "Scaffold a new Teams app project by type (bot, tab, message-extension, or agent)"
argument-hint: "<bot|tab|message-extension|agent> --name <app-name>"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - AskUserQuestion
---

# Scaffold a Teams App Project

Create a new Teams app project with all required files based on the app type, using the current Microsoft 365 Agents Toolkit and SDK stack.

## Instructions

### 1. Validate Inputs

- `<type>` — One of: `bot`, `tab`, `message-extension`, `agent`. Ask if not provided.
- `--name` — App name (used for directory, manifest, and package.json). Ask if not provided.

### 2. Option A: Scaffold via M365 Agents Toolkit (Recommended)

If the M365 Agents Toolkit CLI is installed, use it for scaffolding:

```bash
m365agents new --app-name <app-name> --capability <type> --programming-language typescript
```

Capability mapping:

| Input | ATK Capability | SDK Path |
|-------|---------------|----------|
| `bot` | `bot` | Teams SDK v2 |
| `tab` | `tab` or `sso-tab` (with SSO) | TeamsJS v2.24+ |
| `message-extension` | `search-message-extension` or `action-message-extension` | Teams SDK v2 |
| `agent` | `custom-engine-agent` | M365 Agents SDK |

Ask the user which sub-type they want if relevant. For `agent`, also ask:
- **Teams-only** (Teams SDK v2 path) or **multi-channel** (M365 Agents SDK path)?
- AI-powered or traditional?

### 3. Option B: Manual Scaffold

If the toolkit is not installed, create the project manually.

**Common files (all types)**:
- `package.json` — Dependencies for the chosen type
- `tsconfig.json` — TypeScript configuration
- `.env` — Environment variables template (including `APP_TENANTID` and `MicrosoftAppType=SingleTenant`)
- `.gitignore` — Includes `.env`, `node_modules/`, `dist/`, `appPackage/build/`
- `appPackage/manifest.json` — Microsoft 365 app manifest v1.25 with placeholder GUIDs
- `appPackage/color.png` — Placeholder 192x192 icon (instruct user to replace)
- `appPackage/outline.png` — Placeholder 32x32 icon (instruct user to replace)
- `m365agents.yml` — Lifecycle configuration for the toolkit

**Bot-specific files** (Teams SDK v2):
- `src/index.ts` — Express server with Teams SDK v2 Application setup (single-tenant auth)
- `src/teamsBot.ts` — Teams SDK v2 Application with message handlers

**Tab-specific files**:
- `src/index.tsx` — React entry point with TeamsJS v2.24+ initialization
- `src/components/Tab.tsx` — Main tab component with theme support
- `public/index.html` — HTML shell

**Message extension files** (Teams SDK v2):
- `src/index.ts` — Express server with adapter
- `src/searchBot.ts` — Teams SDK v2 message extension handlers

**Agent files** (M365 Agents SDK):
- `src/index.ts` — Express host with M365 Agents SDK
- `src/agent.ts` — ActivityHandler with message and member handlers

### 4. Generate Manifest

Create `appPackage/manifest.json` with:
- `$schema` pointing to the v1.25 schema
- `manifestVersion`: `"1.25"`
- `id`: `"{{APP_ID}}"` (toolkit placeholder) or a generated UUID
- `botId`: `"{{BOT_ID}}"` for bot, message extension, and agent types
- Appropriate `bots`, `composeExtensions`, `staticTabs`, or `configurableTabs` sections
- `validDomains` with the app's hosting domain
- `webApplicationInfo` if SSO is requested
- `nestedAppAuthInfo` for tab apps with NAA
- `supportsChannelFeatures`: `"tier1"` for team-scoped tabs

### 5. Initialize and Install

```bash
cd <app-name>
npm install
```

### 6. Display Summary

Show the user:
- Created files and their purposes
- Next steps (configure `.env`, run `/setup`, test with `/teams-sideload`)
- Relevant commands for their app type
- Note about single-tenant bot configuration requirement
