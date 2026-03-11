---
name: azure-devops-orchestrator:triage
description: >
  Triage an Azure DevOps backlog: auto-prioritize work items, classify by type (Bug/Feature/Tech Debt),
  assign tags, suggest assignees based on area paths, and route to appropriate iterations. Supports
  --project and --team filters.
argument-hint: "<project> [--team <team>] [--area-path <path>] [--max <n>] [--dry-run]"
allowed-tools:
  - Read
  - Glob
  - Grep
  - Bash
  - Task
---

# azure-devops-orchestrator:triage

Intelligent triage for Azure DevOps backlogs. Prioritizes, classifies, tags, assigns, and routes work items.

## Arguments

- `<project>` — Azure DevOps project name (required)
- `--team <team>` — Restrict triage to a specific team's backlog
- `--area-path <path>` — Restrict triage to items under a specific area path (e.g., `MyProject\Backend`)
- `--max <n>` — Maximum number of items to triage (default: 50)
- `--dry-run` — Show proposed changes without updating Azure DevOps

## Workflow

Invoke the **backlog-triage** agent to:

1. **Query** — Run WIQL to find untriaged work items (New state, missing priority/tags/assignment)
2. **Classify** — Categorize each item as Bug, Feature, User Story, or Tech Debt based on title and description
3. **Prioritize** — Set priority (1-4) based on severity signals, business impact, and time sensitivity
4. **Tag** — Apply standardized tags based on area (e.g., `api`, `frontend`, `infra`, `security`)
5. **Assign** — Suggest assignees by matching area path ownership patterns from recent history
6. **Route** — Recommend iteration path based on priority and team capacity

## Scope

Only work items matching ALL of the following are triaged:
- State is `New` or `Proposed`
- Missing priority, tags, or assignee (or all three)

Already-triaged items are reported as "skipped — already has priority and tags".

## Dry Run

When `--dry-run` is passed, show a triage report table with proposed changes per item:
- Work item ID, title, current state
- Proposed priority, tags, assignee, iteration path
- Reason for each recommendation

No Azure DevOps updates are made.

## Output

A triage report table is shown before any changes are applied. The user must confirm
before any Azure DevOps updates are made.

## Examples

```bash
# Triage an entire project backlog
/azure-devops-orchestrator:triage MyProject

# Triage only Platform Team items
/azure-devops-orchestrator:triage MyProject --team "Platform Team"

# Triage Backend area path, limit to 30 items
/azure-devops-orchestrator:triage MyProject --area-path "MyProject\Backend" --max 30

# Preview without changes
/azure-devops-orchestrator:triage MyProject --dry-run
```

## Tips

- Run triage after importing work items in bulk or at the start of sprint planning
- Pair with `/azure-devops-orchestrator:sprint` to triage then plan the sprint
- Use `--area-path` to restrict to a single team's intake queue
- The agent learns assignee patterns from the last 90 days of resolved items in the same area path
