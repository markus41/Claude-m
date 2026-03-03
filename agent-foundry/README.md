# agent-foundry

Azure AI Foundry agent lifecycle management — scaffold, deploy, test, and manage AI agents directly from Claude Code, with full Azure AI Foundry MCP integration.

## Features

- **Scaffold agents** from natural language descriptions (Claude Code `.md` + Azure AI Foundry JSON)
- **Deploy agents** to Azure AI Agent Service via MCP
- **Test agents** with interactive thread/run conversations
- **List and monitor** all deployed agents with health diagnostics
- **Auto-validate** agent files with the Agent Evaluator on every save
- **MCP integration** with Azure AI Foundry (agents, models, evaluations, projects)

## Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| `uv` / `uvx` | Latest | Run the `azure-ai-mcp` MCP server |
| Azure CLI | >= 2.55 | Optional — for credential setup |
| Azure AI Foundry project | — | Target for agent deployments |

## Installation

```bash
/plugin install agent-foundry@claude-m-microsoft-marketplace
```

Then run setup:
```
/af-setup
```

## Required Environment Variables

| Variable | Description |
|---|---|
| `AZURE_AI_FOUNDRY_CONNECTION_STRING` | Project connection string from Azure Portal |
| `AZURE_CLIENT_ID` | Service Principal Application (client) ID |
| `AZURE_CLIENT_SECRET` | Service Principal client secret |
| `AZURE_TENANT_ID` | Entra ID tenant ID |

Add to `~/.claude/settings.json`:
```json
{
  "env": {
    "AZURE_AI_FOUNDRY_CONNECTION_STRING": "eastus.api.azureml.ms;<sub>;<rg>;<project>",
    "AZURE_CLIENT_ID": "<client-id>",
    "AZURE_CLIENT_SECRET": "<secret>",
    "AZURE_TENANT_ID": "<tenant-id>"
  }
}
```

## Commands

| Command | Description |
|---|---|
| `/af-setup` | Install prerequisites and verify MCP connection |
| `/af-scaffold-agent <description>` | Generate a new agent from a description |
| `/af-deploy-agent <file> [--update]` | Deploy agent JSON to Azure AI Foundry |
| `/af-test-agent <agent-id>` | Start an interactive test conversation |
| `/af-list-agents [--filter <prefix>]` | List all deployed agents |
| `/af-agent-status <agent-id>` | View agent health and run history |

## Agents

| Agent | Trigger |
|---|---|
| **Agent Generator** | "create an agent", "scaffold an agent that does X" |
| **Agent Evaluator** | Automatic on agent file saves; "evaluate this agent" |

## Quick Start

```
1. /af-setup
2. /af-scaffold-agent "An agent that reviews Azure cost reports and flags anomalies"
3. /af-deploy-agent agents/cost-reviewer.json
4. /af-test-agent asst_xxxxx
```

## MCP Server

The `azure-ai-foundry` MCP server uses [azure-ai-mcp](https://pypi.org/project/azure-ai-mcp/) and exposes tools for agent management, model deployments, evaluations, and project connections.

Tools exposed: agent CRUD, thread/run management, model listing, evaluation runs, project and connection listing.
