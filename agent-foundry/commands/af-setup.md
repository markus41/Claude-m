---
name: af-setup
description: Set up the Agent Foundry plugin -- install prerequisites, configure Azure AI Foundry credentials, and verify the MCP server connection
argument-hint: "[--check-only]"
allowed-tools:
  - Read
  - Write
  - Bash
  - AskUserQuestion
---

# Agent Foundry Setup

Guide the user through configuring the Agent Foundry plugin and verifying connectivity to Azure AI Foundry.

## Step 1: Check Prerequisites

Verify the following are installed:

```bash
python --version      # Must be >= 3.10
uvx --version         # Must be installed (pipx install uv)
az version            # Azure CLI >= 2.55.0 (optional but recommended)
```

If `uvx` is missing:
```bash
pip install uv
# or
pipx install uv
```

## Step 2: Install the MCP Server Package

The MCP server uses `azure-ai-mcp` (Python). Verify it is available:

```bash
uvx azure-ai-mcp --help
```

If the package is not found, install it:

```bash
pip install azure-ai-mcp
```

## Step 3: Collect Azure AI Foundry Credentials

Ask the user for the following values (or offer to retrieve them from `az` CLI):

1. **Project Connection String** (`AZURE_AI_FOUNDRY_CONNECTION_STRING`)
   - Format: `<region>.api.azureml.ms;<subscription-id>;<resource-group>;<project-name>`
   - Find it: Azure Portal → AI Foundry → Your Project → Overview → "Project connection string"

2. **Service Principal credentials**:
   - `AZURE_CLIENT_ID` — App Registration Application (client) ID
   - `AZURE_CLIENT_SECRET` — Client secret value
   - `AZURE_TENANT_ID` — Entra ID tenant ID

To create a Service Principal:
```bash
az ad sp create-for-rbac --name "agent-foundry-sp" --role "Azure AI Developer" \
  --scopes "/subscriptions/<sub-id>/resourceGroups/<rg>/providers/Microsoft.MachineLearningServices/workspaces/<project>"
```

## Step 4: Set Environment Variables

Show the user how to persist credentials:

**Option A — `.env` file** (add to `.gitignore`):
```
AZURE_AI_FOUNDRY_CONNECTION_STRING=<your-value>
AZURE_CLIENT_ID=<your-value>
AZURE_CLIENT_SECRET=<your-value>
AZURE_TENANT_ID=<your-value>
```

**Option B — Shell profile** (`~/.bashrc` or `~/.zshrc`):
```bash
export AZURE_AI_FOUNDRY_CONNECTION_STRING="<your-value>"
export AZURE_CLIENT_ID="<your-value>"
export AZURE_CLIENT_SECRET="<your-value>"
export AZURE_TENANT_ID="<your-value>"
```

**Option C — Claude Code settings** (`~/.claude/settings.json`):
```json
{
  "env": {
    "AZURE_AI_FOUNDRY_CONNECTION_STRING": "<your-value>",
    "AZURE_CLIENT_ID": "<your-value>",
    "AZURE_CLIENT_SECRET": "<your-value>",
    "AZURE_TENANT_ID": "<your-value>"
  }
}
```

## Step 5: Verify MCP Connection

Test connectivity by listing projects via the MCP server. Ask the user to run:

```
Use the azure-ai-foundry MCP tool to list projects or agents in the configured project.
```

If the MCP tool responds with project data, setup is complete.

If it fails with auth errors:
- Verify the connection string format is correct
- Confirm the Service Principal has `Azure AI Developer` role on the AI Foundry project
- Check that the client secret has not expired

## Step 6: Verify Deployed Models

Confirm at least one model is deployed in the project:

```bash
az ml model list --workspace-name <project-name> --resource-group <rg> --subscription <sub-id>
```

Or use the MCP tool to list available deployments.

---

If `--check-only` is passed, run Steps 1 and 5 only (no credential collection).
