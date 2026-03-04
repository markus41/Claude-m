# m365-meeting-intelligence

Meeting transcript intelligence for Teams and Outlook - transcript fetch, commitment extraction, task handoff, and owner reminder workflows.

## Purpose

This plugin is a knowledge plugin for M365 Meeting Intelligence workflows. It provides deterministic command guidance and review patterns, and does not include runtime MCP servers.

## Prerequisites

- Microsoft tenant access for the target workload.
- Required scopes or roles: `OnlineMeetings.Read.All`, `Calendars.Read`, `Tasks.ReadWrite`
- Redaction and fail-fast behavior must follow the shared integration contract.

## Install

```bash
/plugin install m365-meeting-intelligence@claude-m-microsoft-marketplace
```

## Integration Context Contract
- Canonical contract: [`docs/integration-context.md`](../docs/integration-context.md)

| Command family | tenantId | subscriptionId | environmentCloud | principalType | scopesOrRoles |
|---|---|---|---|---|---|
| M365 Meeting Intelligence operations | required | optional | `AzureCloud`* | delegated-user | `OnlineMeetings.Read.All`, `Calendars.Read`, `Tasks.ReadWrite` |

* Use sovereign cloud values from the canonical contract when applicable.

Commands must fail fast before network calls when required context is missing or invalid. All outputs must redact sensitive IDs and secrets.

## Commands

| Command | Description |
|---|---|
| `/meeting-intelligence-setup` | Run meeting intelligence setup workflow. |
| `/meeting-transcript-fetch` | Run meeting transcript fetch workflow. |
| `/meeting-commitments-extract` | Run meeting commitments extract workflow. |
| `/meeting-tasks-sync` | Run meeting tasks sync workflow. |
| `/meeting-owner-reminders` | Run meeting owner reminders workflow. |

## Agent

| Agent | Description |
|---|---|
| `m365-meeting-intelligence-reviewer` | Reviews command and skill docs for API correctness, permissions, and safety checks. |

## Trigger Keywords

- `meeting transcript`
- `teams transcript`
- `meeting commitments`
- `meeting tasks`
- `owner reminder`
