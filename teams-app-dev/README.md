# Teams App Dev Plugin

Custom Microsoft Teams app development — build bots with Bot Framework, design Adaptive Cards, create message extensions (search/action/link unfurling), develop tab apps with SSO, author app manifests, and manage the full lifecycle with Teams Toolkit CLI.

## What This Plugin Provides

This is a **knowledge plugin** — it gives Claude deep expertise in custom Teams app development so it can scaffold projects, generate Adaptive Cards, write bot handlers, create message extensions, author manifests, and guide sideloading. It does not contain runtime code, MCP servers, or executable scripts.

## Setup

Run `/setup` to install Teams Toolkit CLI and configure Azure Bot credentials:

```
/setup              # Full guided setup
/setup --minimal    # Dependencies only
```

Requires an Azure Bot registration with Microsoft App ID and Client Secret.

## Commands

| Command | Description |
|---------|-------------|
| `/setup` | Install Teams Toolkit CLI, register Azure Bot, configure environment |
| `/teams-scaffold` | Scaffold a Teams app project (bot, tab, or message extension) |
| `/teams-adaptive-card` | Generate Adaptive Card JSON from a description |
| `/teams-message-extension` | Scaffold a message extension handler with manifest fragment |
| `/teams-manifest` | Generate or validate a Teams app manifest v1.17+ |
| `/teams-sideload` | Package (ZIP) and sideload the app for testing |
| `/teams-bot-handler` | Generate a TeamsActivityHandler with state, dialogs, proactive messaging |

## Agent

| Agent | Description |
|-------|-------------|
| **Teams App Reviewer** | Reviews Teams app projects for manifest correctness, Adaptive Card schema, bot patterns, message extension completeness, and security |

## Trigger Keywords

The skill activates automatically when conversations mention: `teams app`, `teams toolkit`, `adaptive card`, `message extension`, `bot framework`, `teams bot`, `teams tab`, `teams manifest`, `sideload`, `teams sso`, `link unfurling`, `task module`.

## Author

Markus Ahling
