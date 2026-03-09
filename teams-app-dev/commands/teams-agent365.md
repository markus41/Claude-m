---
name: teams-agent365
description: "Create an Agent 365 blueprint with declarative manifest, identity configuration, and MCP tool integration"
argument-hint: "--name <agent-name> [--tools <tool1,tool2>] [--knowledge <sharepoint|search>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - AskUserQuestion
---

# Agent 365 Blueprint

Create a declarative Agent 365 project with manifest-driven configuration, identity setup, and optional MCP tool integration.

## Instructions

### 1. Validate Inputs

- `--name` — Agent display name (e.g., `Contoso Support Agent`). Ask if not provided.
- `--tools` — Comma-separated list of MCP tool names to integrate. Optional.
- `--knowledge` — Knowledge source: `sharepoint` (SharePoint site), `search` (Azure AI Search index). Optional.

### 2. Scaffold the Agent 365 Project

Create the project structure:

```
<agent-slug>/
├── m365agents.yml
├── appPackage/
│   ├── manifest.json          # v1.25 manifest with agenticUserTemplates
│   ├── agent-manifest.json    # Declarative agent manifest
│   ├── color.png
│   └── outline.png
├── .env
└── README.md
```

### 3. Generate the Agent Manifest

Create `appPackage/agent-manifest.json`:

```json
{
  "agentManifest": {
    "id": "<agent-slug>",
    "name": "<agent-name>",
    "description": "<description from user>",
    "instructions": "<system prompt — ask user for agent personality and scope>",
    "capabilities": {
      "tools": [],
      "knowledge": { "sources": [] }
    }
  }
}
```

**When `--tools` is provided**:
Add MCP tool references:
```json
{
  "tools": [
    {
      "type": "mcp",
      "server": "<mcp-server-name>",
      "tools": ["<tool1>", "<tool2>"]
    }
  ]
}
```

Ask the user for the MCP server name and confirm which tools to expose.

**When `--knowledge sharepoint`**:
```json
{
  "knowledge": {
    "sources": [
      {
        "type": "sharepoint",
        "siteUrl": "https://<tenant>.sharepoint.com/sites/<site>"
      }
    ]
  }
}
```

Ask the user for the SharePoint site URL.

**When `--knowledge search`**:
```json
{
  "knowledge": {
    "sources": [
      {
        "type": "azure-ai-search",
        "endpoint": "https://<search-service>.search.windows.net",
        "indexName": "<index-name>"
      }
    ]
  }
}
```

Ask the user for the search endpoint and index name.

### 4. Generate the App Manifest v1.25

Create `appPackage/manifest.json` with:
- `$schema` pointing to v1.25
- `manifestVersion`: `"1.25"`
- `webApplicationInfo` for identity
- `nestedAppAuthInfo` for NAA (pop-up-free auth)
- `agenticUserTemplates` with starter prompts relevant to the agent's purpose
- Bot section if the agent uses conversational interaction

### 5. Generate Identity Configuration

Set up Entra ID app registration requirements:
- Single-tenant app registration
- `api://<domain>/<client-id>` as Application ID URI
- `access_as_user` delegated scope
- Authorized Teams client IDs:
  - `1fec8e78-bce4-4aaf-ab1b-5451cc387264` (desktop/mobile)
  - `5e3ce6c0-2b1f-4285-8d4b-75ee78787346` (web)

Create `.env` with required variables:
```
APP_TENANTID=
AZURE_CLIENT_ID=
AZURE_CLIENT_SECRET=
```

### 6. Generate Agentic User Templates

Based on the agent's purpose, generate 2-4 prompt templates:

```json
{
  "agenticUserTemplates": [
    {
      "id": "<template-id>",
      "title": "<short title>",
      "description": "<what this template does>",
      "prompt": "<the actual prompt text>"
    }
  ]
}
```

Ask the user what common tasks the agent should handle, then generate templates.

### 7. Display Summary

Show the user:
- Created files and their purposes
- How the agent manifest connects to the app manifest
- Identity setup steps (Entra ID app registration)
- MCP tool integration details (if tools provided)
- Knowledge source configuration (if knowledge provided)
- How to test: `m365agents preview --local` (Agents Playground)
- How to deploy: `m365agents provision && m365agents deploy`
