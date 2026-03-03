---
name: af-deploy-agent
description: Deploy an agent to Azure AI Foundry -- reads an agent JSON file or extracts the payload from a Claude Code .md file and creates or updates the agent via the MCP server
argument-hint: "<agent-file.json|agent-file.md> [--update]"
allowed-tools:
  - Read
  - Bash
  - Glob
  - AskUserQuestion
---

# Deploy Agent to Azure AI Foundry

Deploy an agent definition to Azure AI Foundry Agent Service.

## Step 1: Identify the Agent File

If `<agent-file>` is provided:
- Read the file
- If it is a `.json` file: use its contents as the agent payload directly
- If it is a `.md` file: extract the Azure AI Foundry JSON block from the file body (look for a JSON code block containing `"model"`, `"instructions"`, and `"name"` fields)

If no file is provided:
- Scan the current directory for `*.json` files in the current directory and `agents/` subdirectory
- Ask the user to select which file to deploy

## Step 2: Validate the Payload

Before deploying, verify the payload contains:

- `name` — required, used as the agent identifier in Foundry
- `model` — required, must match a deployed model name in the project
- `instructions` — required, the system prompt

Warn if:
- `description` is missing (recommended for Foundry portal visibility)
- `tools` array is empty (agent will have no tool capabilities)
- `name` contains spaces or special characters (Foundry may reject it)

## Step 3: Check for Existing Agent

Use the MCP tool to check whether an agent with the same `name` already exists in the project.

- If it exists and `--update` is NOT passed: ask the user "An agent named '<name>' already exists. Update it or cancel?"
- If it exists and `--update` is passed: proceed with update (PATCH)
- If it does not exist: proceed with create (POST)

## Step 4: Deploy via MCP

Use the `azure-ai-foundry` MCP server to create or update the agent:

- **Create**: POST to agents endpoint with the payload
- **Update**: PATCH the existing agent ID with updated fields

Report the result:
- Agent ID assigned by Foundry
- Agent name
- Model used
- Deployment status

## Step 5: Confirm and Suggest Next Steps

On success:
- Show the agent ID and a link to the Foundry portal (if the connection string region is known)
- Suggest: `af-test-agent <agent-id>` to send a test message
- Suggest: `af-agent-status <agent-id>` to monitor the agent

On failure:
- Show the full error response from the MCP tool
- Common causes: model not deployed, insufficient role, malformed payload
