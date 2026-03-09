# Teams App Dev Plugin

Custom Microsoft Teams app development — build apps with Teams SDK v2, M365 Agents SDK, and Agent 365 SDK. Design Adaptive Cards, create message extensions (search/action/link unfurling), develop tabs with SSO and Nested App Auth, scaffold Custom Engine Agents, author Microsoft 365 app manifests v1.25, orchestrate dialogs, and manage the full lifecycle with the Microsoft 365 Agents Toolkit CLI.

## What This Plugin Provides

This is a **knowledge plugin** — it gives Claude deep expertise in custom Teams app development so it can scaffold projects, generate Adaptive Cards, write bot/agent handlers, create message extensions, author manifests, orchestrate dialogs, and guide deployment. It does not contain runtime code, MCP servers, or executable scripts.

## SDK Landscape (March 2026)

Three SDKs now coexist for Teams development:

| SDK | Use When | Scope |
|-----|----------|-------|
| **Teams SDK v2** | Building Teams-only apps (tabs, bots, message extensions, meeting apps, AI agents) | Teams-native |
| **M365 Agents SDK** | Building multi-channel agents (Teams + Web + Slack + SMS + email) | Cross-channel |
| **Agent 365 SDK** | Enterprise agents with own Entra identity, audit trails, governed MCP tools | Enterprise-grade |

**Deprecated/archived** (do not use for new projects):
- TeamsFx SDK — community-only support until Sep 2026, full deprecation Jul 2026
- Bot Framework SDK — repository archived, long-term support retired
- Multi-tenant bot registration — retiring; all new bots must be single-tenant

## Setup

Run `/setup` to install the Microsoft 365 Agents Toolkit CLI and configure bot credentials:

```
/setup              # Full guided setup
/setup --minimal    # Dependencies only
```

Requires an Azure Bot registration with **single-tenant** configuration.

## Commands

| Command | Description |
|---------|-------------|
| `/setup` | Install M365 Agents Toolkit CLI, register Azure Bot (single-tenant), configure environment |
| `/teams-scaffold` | Scaffold a Teams app project (bot, tab, message extension, or Custom Engine Agent) |
| `/teams-adaptive-card` | Generate Adaptive Card JSON from a description |
| `/teams-message-extension` | Scaffold a message extension handler with manifest fragment |
| `/teams-manifest` | Generate or validate a Microsoft 365 app manifest v1.25 |
| `/teams-sideload` | Package (ZIP) and sideload the app for testing |
| `/teams-bot-handler` | Generate a Teams SDK v2 activity handler with state, dialogs, proactive messaging |
| `/teams-agent` | Scaffold a Custom Engine Agent (Teams SDK v2 or M365 Agents SDK) |
| `/teams-dialog` | Generate dialog orchestration code (replacing task module patterns) |
| `/teams-agent365` | Configure Agent 365 blueprint, Entra agent identity, and governed MCP tools |
| `/teams-migrate` | Assist migration from TeamsFx / Bot Framework SDK to Teams SDK v2 |

## Agent

| Agent | Description |
|-------|-------------|
| **Teams App Reviewer** | Reviews Teams app projects for manifest v1.25 correctness, SDK usage patterns, Adaptive Card schema, message extension completeness, auth configuration, and security |

## Trigger Keywords

The skill activates automatically when conversations mention: `teams app`, `teams sdk`, `agents toolkit`, `adaptive card`, `message extension`, `teams bot`, `teams tab`, `teams manifest`, `sideload`, `teams sso`, `link unfurling`, `dialog`, `custom engine agent`, `agent 365`, `blueprint`, `agents sdk`, `agents playground`, `nested app auth`, `NAA`, `copilot plugin`, `declarative agent`, `single tenant bot`.

## Author

Markus Ahling
