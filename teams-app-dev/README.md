# Teams App Dev Plugin

Custom Microsoft Teams app development for the 2026 platform — manifest v1.25, M365 Agents Toolkit CLI, Adaptive Cards (with mobile profiles), message extensions (bot-based and API-based), meeting apps (side panel, stage, content bubble), Custom Engine Agents, Agent 365 blueprints, Nested App Authentication (NAA), dialog namespace, and single-tenant bot registration.

## What This Plugin Provides

This is a **knowledge plugin** — it gives Claude deep expertise in modern Teams app development so it can scaffold projects, generate Adaptive Cards, write bot handlers, create message extensions (including meeting-aware), author v1.25 manifests, build meeting apps, scaffold Custom Engine Agents and Agent 365 blueprints, and guide migration from legacy Teams Toolkit. It does not contain runtime code, MCP servers, or executable scripts.

## Setup

Run `/setup` to install M365 Agents Toolkit CLI and configure Azure Bot credentials:

```
/setup              # Full guided setup (single-tenant bot)
/setup --minimal    # Dependencies only
```

Requires an Azure Bot registration (single-tenant) with Microsoft App ID, Client Secret, and Tenant ID.

## Commands

| Command | Description |
|---------|-------------|
| `/setup` | Install M365 Agents Toolkit CLI, register Azure Bot (single-tenant), configure environment |
| `/teams-scaffold` | Scaffold a Teams app project (bot, tab, message-extension, meeting-app, or custom-engine-agent) |
| `/teams-adaptive-card` | Generate Adaptive Card JSON with optional meeting optimization and mobile profile |
| `/teams-message-extension` | Scaffold a message extension (search, action, link unfurl, or meeting-aware) |
| `/teams-manifest` | Generate or validate a Teams app manifest v1.25 |
| `/teams-sideload` | Package and sideload the app, or test with Agents Playground |
| `/teams-bot-handler` | Generate a TeamsActivityHandler with state, dialogs, proactive messaging, and meeting support |
| `/teams-agent` | Scaffold a Custom Engine Agent with AI capabilities and tool calling |
| `/teams-dialog` | Generate dialog orchestration code (replaces deprecated task modules) |
| `/teams-agent365` | Create an Agent 365 blueprint with declarative manifest, identity, and MCP tools |
| `/teams-migrate` | Migration guide from Teams Toolkit (TeamsFx) to M365 Agents Toolkit |

## Agent

| Agent | Description |
|-------|-------------|
| **Teams App Reviewer** | Reviews Teams app projects for manifest v1.25 correctness, single-tenant config, Adaptive Card schema (including mobile), bot patterns, message extension completeness, meeting app surfaces, auth/dialog patterns, and security |

## Key Platform Changes (2026)

- **Manifest**: v1.25 schema with `supportsChannelFeatures`, `nestedAppAuthInfo`, `backgroundLoadConfiguration`, `agenticUserTemplates`
- **Tooling**: M365 Agents Toolkit CLI (`m365agents`) replaces Teams Toolkit CLI (`teamsapp`). Config: `m365agents.yml`
- **Auth**: Single-tenant bot registration enforced (multi-tenant creation blocked since July 2025). NAA for pop-up-free tab SSO.
- **Dialog namespace**: `dialog.url.open()` / `dialog.adaptiveCard.open()` replace deprecated `tasks.startTask()`
- **TeamsJS**: v2.19.0+ required for submissions. v1 is blocked.
- **Bot Framework SDK**: Archived December 2025. Use Teams SDK or Agents SDK for new projects.
- **TeamsFx**: Deprecated (community-only until September 2026). Do not use for new projects.
- **LUIS**: Fully retired March 31, 2026. Do not use.
- **Adaptive Cards mobile**: v1.2 max on iOS/Android. Desktop/web supports v1.6.
- **Message extensions**: Bot-based and API-based (OpenAPI, no bot needed) tracks available.
- **Local testing**: Agents Playground (no bot registration or tunnel needed)
- **SDK decision**: Teams SDK (Teams-only), Agents SDK (multi-channel), Agent 365 (enterprise governance overlay with JS/Python/.NET packages)

## Trigger Keywords

The skill activates automatically when conversations mention: `teams app`, `m365 agents toolkit`, `adaptive card`, `message extension`, `bot framework`, `teams bot`, `teams tab`, `teams manifest`, `sideload`, `teams sso`, `link unfurling`, `dialog`, `meeting app`, `meeting extension`, `custom engine agent`, `agent 365`, `agents playground`, `nested app auth`, `naa`.

## Author

Markus Ahling
