# planner-orchestrator

Intelligent orchestration layer for Microsoft Planner — ship tasks with Claude Code, triage backlogs, plan sprint buckets, monitor deadlines, balance workloads, and optionally push updates to Teams and Outlook.

## Prerequisites

- `planner-todo` plugin installed (provides the Graph API layer)
- Microsoft Graph delegated permissions: `Tasks.ReadWrite`, `Group.Read.All`
- Git repository (required for `/planner-orchestrator:ship`)

## Install

```bash
/plugin install planner-orchestrator@claude-m-microsoft-marketplace
```

## Commands

| Command | Description |
|---------|-------------|
| `/planner-orchestrator:ship <taskId>` | Implement a Planner task end-to-end with Claude Code — branch, code, test, PR, mark Done |
| `/planner-orchestrator:triage <planId>` | Auto-prioritize, label, assign, and route backlog tasks |
| `/planner-orchestrator:sprint <planId>` | Capacity-aware sprint bucket planning with WSJF scoring |
| `/planner-orchestrator:status [planId]` | Deadline report — overdue, at-risk, stalled, unassigned |
| `/planner-orchestrator:orchestrate` | Portfolio overview, workload balance, full health analysis |

## Agents

| Agent | Triggered by |
|-------|-------------|
| `ship-orchestrator` | `/ship` command — implements a Planner task as code |
| `bucket-planner` | `/sprint` command — capacity-aware sprint planning |
| `task-triage` | `/triage` command — backlog classification |
| `deadline-monitor` | `/status` command — at-risk task scanning |
| `portfolio-manager` | `/orchestrate --portfolio` — cross-plan health dashboard |
| `workload-balancer` | `/orchestrate --balance` — assignment distribution analysis |
| `teams-notifier` | Any command with `--teams` or after ship completes |

## Built-in MCP Servers

These Microsoft MCP servers are bundled directly in `.mcp.json` and activate automatically:

| Server | Package | Purpose |
|--------|---------|---------|
| `azure` | `@azure/mcp` | Azure resource context for deployment tasks |
| `azure-devops` | `@microsoft/azure-devops-mcp` | Work item sync, PR creation in ADO repos |
| `powerbi-modeling` | `@microsoft/powerbi-modeling-mcp` | Power BI DAX queries, push datasets for plan reporting |
| `playwright` | `@playwright/mcp` | E2E browser testing during `/ship` workflow |
| `devbox` | `@microsoft/devbox-mcp` | Dev Box provisioning for isolated feature testing |
| `m365-toolkit` | `@microsoft/m365agentstoolkit-mcp` | Teams app validation and M365 resource provisioning |
| `markitdown` | `markitdown[mcp]` (uvx) | Convert PDF/DOCX task attachments to readable Markdown |
| `microsoft-learn` | `https://learn.microsoft.com/api/mcp` | Official Microsoft docs (no auth needed) |

**Prerequisites**: Node.js + npx (for npm packages), `az login` (for Azure/ADO/Power BI auth),
Python + uv (for markitdown). The `microsoft-learn` server requires no setup.

## Optional Cross-Plugin Integration

When these plugins are also installed, the orchestrator delegates to them automatically:

| Plugin | What it enables |
|--------|----------------|
| `microsoft-teams-mcp` | Post adaptive card summaries and ship notifications |
| `microsoft-outlook-mcp` | Send deadline digest emails to plan owners |
| `powerbi-fabric` | Export plan data for Power BI dashboards |
| `azure-devops` | Sync Planner tasks with ADO work items |

All integrations degrade gracefully — if a plugin isn't installed, the action is skipped and noted in the output.

## Ship Workflow

```
/planner-orchestrator:ship <taskId>
```

1. Fetches task + checklist from Planner
2. Creates a git branch (`feature/{taskId}-{slug}`)
3. Explores codebase for context
4. Plans implementation — **asks for your approval**
5. Writes code + tests — **shows diff for review**
6. Runs test suite
7. Creates commit + PR
8. Marks Planner task 100% Done, moves to Done bucket
9. Posts Teams notification (if available)

Supports `--dry-run`, `--resume`, `--status`, and `--from=<STATE>`.

## Example Prompts

```
"Ship the planner task AAMkAGE..."
"Triage the backlog in plan AbCdEf..."
"Plan what goes into our Sprint 14 bucket"
"What's overdue across all our Planner boards?"
"Show me a portfolio view of all our plans"
"Who's overloaded in the dev team's Planner?"
"Post our Planner status to Teams"
```
