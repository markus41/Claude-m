---
name: af-list-agents
description: List all agents deployed in the configured Azure AI Foundry project -- shows agent ID, name, model, description, and creation date in a formatted table
argument-hint: "[--filter <name-prefix>]"
allowed-tools:
  - Bash
---

# List Agents

List all agents deployed in the configured Azure AI Foundry project.

## Behavior

1. Use the `azure-ai-foundry` MCP server to retrieve the list of agents from the project
2. If `--filter <name-prefix>` is provided, filter results to agents whose name starts with that prefix
3. Display results in a markdown table

## Output Format

```
Project: <project-name>
Region:  <region>
─────────────────────────────────────────────────────────────────────────────

| Agent ID          | Name                  | Model        | Description                  | Created             |
|-------------------|-----------------------|--------------|------------------------------|---------------------|
| asst_abc123       | invoice-processor     | gpt-4o       | Processes invoice documents  | 2025-01-15 10:30    |
| asst_def456       | policy-reviewer       | gpt-4o-mini  | Reviews Azure policy drift   | 2025-01-20 14:15    |

Total: 2 agents
```

## Empty State

If no agents are deployed, display:
```
No agents found in project '<project-name>'.
Run af-scaffold-agent to create one.
```

## After Listing

Suggest relevant follow-up commands:
- `af-agent-status <agent-id>` — view run history and health for a specific agent
- `af-test-agent <agent-id>` — start a test conversation
- `af-deploy-agent` — deploy a new agent
