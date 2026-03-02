# Azure Functions Plugin

Azure Functions serverless compute development — build HTTP APIs, event-driven processors, and orchestration workflows with triggers, bindings, Durable Functions, and Azure Functions Core Tools. Targets professional TypeScript developers building production serverless applications on the v4 programming model.

## What This Plugin Provides

This is a **knowledge plugin** — it gives Claude deep expertise in Azure Functions development so it can scaffold functions, configure triggers and bindings, design Durable Functions orchestrations, set up deployment pipelines, and guide local development. It does not contain runtime code, MCP servers, or executable scripts.

## Setup

Run `/setup` to install Azure Functions Core Tools, Azure CLI, and configure a Function App:

```
/setup              # Full guided setup
/setup --minimal    # Dependencies only
```

Requires an Azure subscription and optionally an Application Insights resource for monitoring.

## Commands

| Command | Description |
|---------|-------------|
| `/setup` | Install Azure Functions Core Tools, Azure CLI, create Function App, configure local.settings.json |
| `/func-create` | Create a new function with trigger type selection (HTTP/Timer/Blob/Queue/etc.) |
| `/func-trigger-add` | Add a trigger and binding to an existing function |
| `/func-deploy` | Deploy to Azure via CLI or generate GitHub Actions workflow |
| `/func-durable` | Scaffold a Durable Functions orchestration (chaining/fan-out/human interaction) |
| `/func-binding-config` | Configure input/output bindings for a function |

## Agent

| Agent | Description |
|-------|-------------|
| **Functions Reviewer** | Reviews Azure Functions projects for trigger correctness, binding configuration, Durable Functions determinism, security, and project structure |

## Trigger Keywords

The skill activates automatically when conversations mention: `azure functions`, `serverless`, `function app`, `durable functions`, `triggers bindings`, `azure func`, `function trigger`, `timer trigger`, `http trigger`, `blob trigger`, `queue trigger`, `event grid trigger`.

## Author

Markus Ahling
