---
name: reflex-create
description: "Create a new Reflex item in a Fabric workspace with objects and data source binding"
argument-hint: "--name <reflex-name> [--workspace <workspace-id>] [--source <eventstream|powerbi>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - AskUserQuestion
---

# Create a Reflex Item

Create a new Data Activator Reflex item in a Fabric workspace with initial object and data source configuration.

## Instructions

### 1. Validate Inputs

- `--name` — Display name for the Reflex item (e.g., `Factory-Temperature-Monitor`). Ask if not provided.
- `--workspace` — Fabric workspace ID. If not provided, use `FABRIC_WORKSPACE_ID` from `.env` or ask.
- `--source` — Data source type: `eventstream` or `powerbi`. Ask if not provided.

### 2. Create the Reflex Item via API

```bash
TOKEN=$(az account get-access-token --resource https://api.fabric.microsoft.com --query accessToken -o tsv)

curl -X POST "https://api.fabric.microsoft.com/v1/workspaces/{workspaceId}/reflexes" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "displayName": "<reflex-name>",
    "description": "Created by fabric-data-activator plugin"
  }'
```

Capture the returned `id` as `reflexId`.

### 3. Configure Data Source

**For eventstream source**:
- List available eventstreams in the workspace.
- Ask the user to select one.
- Show the eventstream's output schema (column names and types).
- Guide the user through selecting columns for object keys and properties.

**For Power BI source**:
- Inform the user to open the Power BI report in the Fabric portal.
- Right-click the visual they want to monitor and select "Set alert".
- This will open the Reflex item with the visual's data pre-bound.
- Note: Power BI binding is done through the portal UI, not the API.

### 4. Define Initial Object

Ask the user for:
- **Object name**: The entity being tracked (e.g., `Machine`, `SalesOrder`).
- **Key column**: The column that uniquely identifies instances.
- **Properties**: Which data columns to map as object properties.

Display a summary:
```
Object: Machine
  Key column: machineId
  Properties:
    - temperature (Numeric)
    - pressure (Numeric)
    - status (String)
```

### 5. Display Summary

Show the user:
- Reflex item ID and name
- Workspace location
- Connected data source
- Defined objects and properties
- Next steps: Use `/trigger-define` to create trigger conditions and `/action-configure` to set up actions
