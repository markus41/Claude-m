---
name: teams-scaffold
description: "Scaffold a new Teams app project by type (bot, tab, or message extension)"
argument-hint: "<bot|tab|message-extension> --name <app-name>"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - AskUserQuestion
---

# Scaffold a Teams App Project

Create a new Teams app project with all required files based on the app type.

## Instructions

### 1. Validate Inputs

- `<type>` — One of: `bot`, `tab`, `message-extension`. Ask if not provided.
- `--name` — App name (used for directory, manifest, and package.json). Ask if not provided.

### 2. Option A: Scaffold via Teams Toolkit (Recommended)

If Teams Toolkit CLI is installed, use it for scaffolding:

```bash
teamsapp new --app-name <app-name> --capability <type>
```

Capability mapping:
| Input | Teams Toolkit capability |
|-------|-------------------------|
| `bot` | `bot` |
| `tab` | `tab-non-sso` or `tab` (with SSO) |
| `message-extension` | `search-message-extension` or `action-message-extension` |

Ask the user which sub-type they want if relevant.

### 3. Option B: Manual Scaffold

If Teams Toolkit is not installed, create the project manually.

**Common files (all types)**:
- `package.json` — Dependencies for the chosen type
- `tsconfig.json` — TypeScript configuration
- `.env` — Environment variables template
- `.gitignore` — Includes `.env`, `node_modules/`, `dist/`, `appPackage/build/`
- `appPackage/manifest.json` — App manifest with placeholder GUIDs
- `appPackage/color.png` — Placeholder 192x192 icon (instruct user to replace)
- `appPackage/outline.png` — Placeholder 32x32 icon (instruct user to replace)

**Bot-specific files**:
- `src/index.ts` — Express server with `CloudAdapter` and bot setup
- `src/teamsBot.ts` — `TeamsActivityHandler` with `onMessage` and `onMembersAdded`

**Tab-specific files**:
- `src/index.tsx` — React entry point with Teams SDK initialization
- `src/components/Tab.tsx` — Main tab component with theme support
- `public/index.html` — HTML shell

**Message extension files**:
- `src/index.ts` — Express server with adapter
- `src/searchBot.ts` — Bot with `handleTeamsMessagingExtensionQuery`

### 4. Generate Manifest

Create `appPackage/manifest.json` with:
- `id`: `"{{APP_ID}}"` (placeholder for Teams Toolkit) or a generated UUID
- `botId`: `"{{BOT_ID}}"` for bot and message extension types
- Appropriate `bots`, `composeExtensions`, `staticTabs`, or `configurableTabs` section
- `validDomains` including the app's hosting domain

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
