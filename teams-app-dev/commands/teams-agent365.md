---
name: teams-agent365
description: "Configure Agent 365 blueprint, Entra agent identity, and governed MCP tools"
argument-hint: "--name <agent-name> [--blueprint <blueprint-id>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - AskUserQuestion
---

# Configure Agent 365

Set up an Agent 365 enterprise agent with its own Entra identity, governed MCP tools, and compliance blueprint. Agent 365 SDK adds enterprise-grade capabilities on top of Teams SDK v2 or M365 Agents SDK.

## Prerequisites

- An existing Teams bot/agent project (created via `/teams-agent` or `/teams-scaffold`)
- Azure tenant admin access for Entra agent identity provisioning
- Agent 365 CLI installed

## Instructions

### 1. Validate Inputs

- `--name` — Agent display name. Ask if not provided.
- `--blueprint` — Blueprint ID (IT-approved agent type definition). Ask if not provided or list available blueprints.

### 2. Create Agent Identity

Use the Agent 365 CLI to create an Entra agent identity:

```bash
agent365 identity create --name "<agent-name>" --blueprint "<blueprint-id>"
```

This provisions:
- An Entra ID for the agent (the agent becomes a "user" in the directory)
- An agent mailbox (can receive and respond to email)
- User resource assignments per the blueprint's compliance policy

### 3. Configure Governed MCP Tools

Add governed MCP server connections for M365 workloads:

```bash
# Add mail access (read)
agent365 mcp add --tool "mail-read" --scope "user"

# Add calendar access
agent365 mcp add --tool "calendar-readwrite" --scope "user"

# Add SharePoint access
agent365 mcp add --tool "sharepoint-files-read" --scope "site"

# Add Teams messaging
agent365 mcp add --tool "teams-chat-send" --scope "user"
```

All tool access is admin-governed — the blueprint defines which tools are permitted.

### 4. Update App Manifest

Add the `agenticUserTemplates` section to `appPackage/manifest.json`:

```json
{
  "agenticUserTemplates": [
    {
      "id": "<template-id>",
      "blueprintId": "<org>.<blueprint-name>.v1"
    }
  ]
}
```

### 5. Configure Observability

Agent 365 includes OpenTelemetry tracing. Add configuration:

```typescript
import { Agent365Client } from "@microsoft/agents-a365";

const agent365 = new Agent365Client({
  agentId: process.env.AGENT_365_ID!,
  blueprintId: process.env.AGENT_365_BLUEPRINT!,
  telemetry: {
    enabled: true,
    exporterEndpoint: process.env.OTEL_ENDPOINT,
  },
});
```

This provides:
- Auditable agent interaction logs
- Inference event tracing
- Tool usage tracking
- Compliance reporting

### 6. Publish Agent

```bash
# Publish to Teams and Outlook
agent365 publish --target "teams,outlook"

# Deploy to Azure
agent365 deploy --resource-group "<rg-name>" --location "eastus"
```

### 7. Display Summary

Show the user:
- Agent identity details (Entra ID, display name)
- Blueprint and compliance policies applied
- MCP tools configured and their scopes
- Manifest changes made
- How to test the agent
- Note: Agent 365 SDK is currently .NET-only; TypeScript support is forthcoming
