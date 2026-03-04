---
name: ado-agent-status
description: Check agent pool health, agent status, and capabilities
argument-hint: "[--pool <pool-name-or-id>] [--agent <agent-name>] [--action list|diagnose|maintenance]"
allowed-tools:
  - Read
  - Write
  - Bash
  - AskUserQuestion
---

# Check Agent Status

List agent pools, check agent health and capabilities, diagnose offline agents, and manage pool maintenance.

## Prerequisites

- Authenticated to Azure DevOps (run `/ado-setup` first)
- `Manage agent pools` permission (organization-level)

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `--pool` | No | Agent pool name or ID (lists all pools if omitted) |
| `--agent` | No | Specific agent name to inspect |
| `--action` | No | `list` (default), `diagnose`, `maintenance` |
| `--include-capabilities` | No | Show system and user capabilities |

## Instructions

1. **List agent pools** — call `GET /_apis/distributedtask/pools?api-version=7.1`.
   Display: Pool ID, Name, Type (automation/deployment), Size, Is hosted.

2. **List agents in pool** — if `--pool` specified:
   `GET /_apis/distributedtask/pools/{poolId}/agents?includeCapabilities=true&api-version=7.1`
   Display: Agent ID, Name, Status (online/offline), Version, OS, Enabled.

3. **Agent details** — if `--agent` specified:
   - Show system capabilities (OS, .NET, Node, Java versions, available tools)
   - Show user capabilities (custom key-value pairs)
   - Show last completed and last started timestamps
   - Show assigned requests

4. **Diagnose offline agents** — if `--action diagnose`:
   - Filter agents with `status: "offline"`
   - Check `lastCompletedRequest` timestamp to determine when agent went offline
   - Common causes: VM powered off, service stopped, network issues, agent update pending
   - Suggest: restart agent service, check `_diag` logs, verify connectivity to `dev.azure.com`

5. **Pool maintenance** — if `--action maintenance`:
   - List maintenance jobs: `GET /_apis/distributedtask/pools/{poolId}/maintenancedefinitions?api-version=7.1`
   - Configure maintenance window: set schedule, retention, working directory cleanup
   - Trigger maintenance: `POST /_apis/distributedtask/pools/{poolId}/maintenancejobs?api-version=7.1`

6. **Display summary** — show pool health overview: total agents, online count, offline count, busy count.

## Examples

```bash
/ado-agent-status
/ado-agent-status --pool "Default" --include-capabilities
/ado-agent-status --pool "Self-Hosted" --action diagnose
/ado-agent-status --pool "Build Pool" --agent "agent-01" --include-capabilities
```

## Error Handling

- **Pool not found**: List available pools and prompt user.
- **No agents in pool**: Pool exists but has no registered agents — provide agent setup instructions.
- **Permission denied**: User lacks pool admin rights — advise requesting access from organization admin.
