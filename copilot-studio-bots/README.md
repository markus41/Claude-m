# Copilot Studio Bots Plugin

A Claude Code knowledge plugin for Microsoft Copilot Studio (formerly Power Virtual Agents) — design bot topics, author trigger phrases, configure generative AI orchestration, test conversation flows, and publish chatbots to Teams, web, or custom channels.

## What This Plugin Provides

This is a **knowledge plugin** -- it gives Claude deep expertise in Copilot Studio so it can create well-structured bot topics, write diverse trigger phrases, configure generative AI nodes, test conversation flows via Direct Line API, and publish bots to channels. It does not contain runtime code, MCP servers, or executable scripts.

## Setup

Run `/setup` to configure Power Platform and Dataverse access:

```
/setup              # Full guided setup
/setup --minimal    # Node.js dependencies only
```

Requires an Azure Entra app registration with **Environment.Read** (Power Platform API) and **Chatbots.ReadWrite** (Dataverse) permissions. You will need your Dataverse environment URL (e.g., `https://orgXXXXX.crm.dynamics.com`).

## Commands

| Command | Description |
|---------|-------------|
| `/bot-topic-create` | Create a new topic with trigger phrases and conversation nodes |
| `/bot-test-conversation` | Test a bot conversation flow with sample inputs via Direct Line |
| `/bot-publish` | Publish a bot to Teams, web widget, or custom Direct Line channel |
| `/setup` | Configure Power Platform environment access and Dataverse credentials |

## Agent

| Agent | Description |
|-------|-------------|
| **Copilot Studio Reviewer** | Reviews bot topic definitions for trigger phrase quality, conversation flow completeness, and generative AI configuration |

## Trigger Keywords

The skill activates automatically when conversations mention: `copilot studio`, `power virtual agents`, `chatbot`, `bot topic`, `trigger phrases`, `conversation flow`, `bot publish`, `pva`, `virtual agent`.

## Author

Markus Ahling
