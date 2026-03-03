---
name: Planner Orchestration
description: >
  Expert in Microsoft Planner orchestration workflows — shipping Planner tasks end-to-end with
  Claude Code, triaging backlogs, planning sprint buckets with capacity analysis, monitoring
  deadlines across plans, balancing workloads, and delegating to Teams/Outlook/PowerBI when
  those plugins are installed. Trigger on: "ship planner task", "orchestrate planner", "triage
  planner backlog", "plan sprint buckets", "planner health", "planner status", "balance planner
  workload", "planner deadline report", "planner portfolio".
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
  - mcp__azure__azure_management_list_subscriptions
  - mcp__azure__azure_management_list_resource_groups
  - mcp__azure__azure_management_list_resources
  - mcp__azure-devops__azure_devops_get_work_item
  - mcp__azure-devops__azure_devops_create_work_item
  - mcp__azure-devops__azure_devops_update_work_item
  - mcp__azure-devops__azure_devops_list_work_items
  - mcp__azure-devops__azure_devops_create_pull_request
  - mcp__powerbi-modeling__powerbi_get_datasets
  - mcp__powerbi-modeling__powerbi_execute_query
  - mcp__powerbi-modeling__powerbi_push_rows
  - mcp__playwright__browser_navigate
  - mcp__playwright__browser_snapshot
  - mcp__playwright__browser_click
  - mcp__playwright__browser_type
  - mcp__playwright__browser_screenshot
  - mcp__markitdown__markitdown_convert
  - mcp__markitdown__markitdown_convert_url
  - mcp__microsoft-learn__microsoft_learn_search
  - mcp__microsoft-learn__microsoft_learn_get_document
---

# Planner Orchestration

## MCP Servers

Eight Microsoft MCP servers are configured in `.mcp.json` and available to all agents:

| Server | Package | What it provides |
|--------|---------|-----------------|
| `azure` | `@azure/mcp` | Azure resource management — subscriptions, resource groups, resources |
| `azure-devops` | `@microsoft/azure-devops-mcp` | Work items, PRs, pipelines, repos |
| `powerbi-modeling` | `@microsoft/powerbi-modeling-mcp` | DAX queries, dataset push, report operations |
| `playwright` | `@playwright/mcp` | Browser automation — E2E testing in ship workflow |
| `devbox` | `@microsoft/devbox-mcp` | Dev Box provisioning and management |
| `m365-toolkit` | `@microsoft/m365agentstoolkit-mcp` | Teams app validation, M365 resource provisioning |
| `markitdown` | `markitdown[mcp]` (uvx) | Convert PDFs, DOCX, XLSX attachments to Markdown |
| `microsoft-learn` | `https://learn.microsoft.com/api/mcp` | Official Microsoft documentation (no auth needed) |

Full tool catalog: [`references/mcp-tools.md`](./references/mcp-tools.md)

**Auth**: All Azure/M365 servers use DefaultAzureCredential — `az login` is sufficient for local use. `markitdown` and `playwright` require no auth. `microsoft-learn` is public.

## Architecture

The planner-orchestrator sits above the `planner-todo` plugin as an intelligent layer. It uses native MCP tools for Azure DevOps, Power BI, browser testing, and documentation, and composes `planner-todo` commands and other installed plugins for the remaining M365 operations.

**Dependency chain:**
```
planner-orchestrator (intelligence layer)
    └── planner-todo (Graph API CRUD layer)
            └── Microsoft Graph API
```

**Optional integrations** — check for installed plugins before delegating:
- `microsoft-teams-mcp` → post adaptive card summaries, @mention assignees
- `microsoft-outlook-mcp` → email digests to plan owners
- `powerbi-fabric` → DAX report generation from task data
- `azure-devops` → work item sync for hybrid teams

## Plugin Detection Pattern

Before calling another plugin, verify it is installed:

```
Check if microsoft-teams-mcp is available by attempting to list its tools.
If available, use it to post the summary card.
If not available, output the summary as plain text and note that installing
microsoft-teams-mcp would enable automatic Teams posting.
```

Never fail silently — always tell the user when a cross-plugin action was skipped and why.

## Core Workflows

### 1. Ship Workflow (ship-orchestrator agent)

The `/planner-orchestrator:ship` command transforms a Planner task into shipped code:

```
FETCH → BRANCH → EXPLORE → PLAN → CODE → TEST → DOCUMENT → COMMIT → PR → UPDATE PLANNER
```

**State tracking** — save progress to `sessions/ship/{taskId}/state.json` so the workflow is resumable.

Detailed protocol in [`references/ship-workflow.md`](./references/ship-workflow.md).

### 2. Triage Workflow (task-triage agent)

Inspect all unassigned / unprioritized tasks in a plan and apply:
- Priority scoring (urgency + business value + effort estimate)
- Label assignment (Bug, Feature, Tech Debt, Blocked)
- Assignee suggestion based on existing assignment patterns
- Bucket routing (which bucket the task belongs in)

Output a triage report, then execute the changes after user confirmation.

### 3. Sprint/Bucket Planning (bucket-planner agent)

Given a plan and a target bucket:
1. List all tasks in the backlog bucket
2. Estimate team capacity (members × available days × hours/day)
3. Score each task by WSJF: `(Business Value + Time Criticality + Risk Reduction) / Effort`
4. Recommend tasks to pull in, respecting capacity ceiling
5. Detect overloaded assignees and suggest redistribution
6. Output a sprint plan table, then execute moves after user confirmation

### 4. Deadline Monitor (deadline-monitor agent)

Scan all accessible plans for:
- **Overdue**: `dueDateTime < today`, not 100% complete
- **Due this week**: `dueDateTime <= today + 7 days`
- **No due date**: assigned tasks with no deadline
- **Stalled**: `percentComplete == 50` but not updated in 5+ days

Group by plan → assignee → priority. Output a digest. Optionally email via Outlook or post to Teams.

### 5. Portfolio Overview (portfolio-manager agent)

Fetch all plans the user can access and produce:
- Per-plan: total tasks, completion %, overdue count, top blockers
- Team-level: tasks per assignee, average completion rate
- Cross-plan: tasks with same assignee competing for attention

### 6. Workload Balancer (workload-balancer agent)

Identify imbalances across assignees in a plan:
- Flag assignees with > 5 open tasks or > 2 urgent tasks
- Suggest reassignments to under-loaded members
- Respect skill labels when suggesting reassignments

## ETag Concurrency

All Planner PATCH and DELETE operations require the `If-Match` header. The orchestrator must:
1. Always GET the resource immediately before updating
2. Extract `@odata.etag` from the response
3. Include `If-Match: {etag}` in the PATCH/DELETE request
4. On 409/412: re-GET and retry once

See [`references/etag-patterns.md`](./references/etag-patterns.md) for patterns.

## Cross-Plugin Delegation Recipes

See [`references/cross-plugin-patterns.md`](./references/cross-plugin-patterns.md) for:
- Teams adaptive card templates for task summaries
- Outlook digest email format
- Power BI export schema
- Azure DevOps work item sync mapping

## Output Standards

All agents produce structured output:

```
## [Workflow Name] — [Plan Title]

**Summary**: 3 tasks overdue, 5 due this week, 2 unassigned

### Overdue Tasks
| Task | Assignee | Due | Priority |
|------|----------|-----|----------|
| ...  |          |     |          |

### Recommended Actions
1. Reassign "X" to @alice — she has capacity
2. Escalate "Y" — blocked for 3+ days

### Cross-Plugin Actions
- [ ] Teams: Posted summary to #dev channel
- [ ] Outlook: Digest sent to plan owners
```

Always show what cross-plugin actions were taken or skipped (with reason).
