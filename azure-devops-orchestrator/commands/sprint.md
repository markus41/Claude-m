---
name: azure-devops-orchestrator:sprint
description: >
  Sprint capacity planning: score backlog items by WSJF, calculate team capacity, and recommend
  sprint contents. Analyzes the backlog, estimates effort, and produces a capacity-aware sprint
  plan with workload distribution.
argument-hint: "<projectName> [--team <team>] [--iteration <path>] [--velocity <points>]"
allowed-tools:
  - Read
  - Glob
  - Grep
  - Bash
  - Task
---

# azure-devops-orchestrator:sprint

Capacity-aware sprint planning for Azure DevOps — score, select, and assign work items for the next sprint.

## Arguments

- `<projectName>` — Azure DevOps project name (required)
- `--team <team>` — Team name (default: auto-detect from project's default team)
- `--iteration <path>` — Target iteration path (default: current or next iteration)
- `--velocity <points>` — Override velocity in story points (default: average of last 3 sprints)
- `--backlog-query <wiql>` — Custom WIQL query for source items (default: New items in backlog)
- `--apply` — Move items to the sprint iteration immediately (skips confirmation)
- `--dry-run` — Show the sprint plan without making changes

## Workflow

Invoke the **sprint-planner** agent to:

1. **Measure capacity** — Query team members, calculate available hours, convert to story points
2. **Calculate velocity** — Average completed points from last 3 iterations (or use `--velocity`)
3. **Score items** — WSJF: (Business Value + Time Criticality + Risk Reduction) / Effort
4. **Select items** — Greedy selection by WSJF score until velocity is filled
5. **Check balance** — Flag if one assignee gets > 40% of committed points
6. **Propose plan** — Show sprint table with scores, assignees, story points

Ask for confirmation before assigning items to the sprint iteration.

## Capacity Calculation

```
Team members from iteration capacities or unique assignees
Available hours = members x sprint_days x daily_hours x (1 - overhead)
Velocity cap = min(calculated_capacity, historical_velocity)
Reserve 15% for bug fixes, 10% for unplanned work
Net capacity = Velocity cap x 0.75
```

## WSJF Scoring

For each backlog item:
- **Business Value** (1-10): Priority 1=10, 2=8, 3=5, 4=2 + value area bonus
- **Time Criticality** (1-10): Days to target date (overdue=10, <7d=8, <30d=5, none=1)
- **Risk Reduction** (1-5): Bugs get +3, blocked items get +2, tech debt gets +1
- **Effort** (story points): From StoryPoints field, or estimate from task count

```
WSJF = (Business Value + Time Criticality + Risk Reduction) / Effort
```

## Output

```
## Sprint Plan — {Project} / {Iteration}

**Team**: {teamName} ({n} members)
**Velocity**: {pts} pts (avg last 3: {avg})
**Net Capacity**: {pts} pts (after 25% reserve)

### Recommended Sprint Contents ({selected_pts} / {capacity} pts)

| # | Work Item | Type | WSJF | Points | Assignee | Due |
|---|-----------|------|------|--------|----------|-----|
| 1 | #{id} ... | Story | 8.5 | 3 | Alice | Mar 15 |

### Left in Backlog ({n} items, {pts} pts)
| # | Work Item | WSJF | Points | Reason |
|---|-----------|------|--------|--------|
| 1 | #{id} ... | 2.1 | 5 | Exceeds remaining capacity |

### Workload Distribution
| Assignee | Items | Points | % of Sprint |
|----------|-------|--------|-------------|
| Alice    | 3     | 8      | 40%         |
| Bob      | 3     | 7      | 35%         |
| Carol    | 2     | 5      | 25%         |

### Warnings
- {any overloaded assignees (> 40% of sprint)}
- {any unassigned items in selection}
- {carry-over items from last sprint}
```

On confirmation, update each selected item's iteration path:
```bash
az boards work-item update --id {id} --iteration "{iterationPath}" --output json
```

## Examples

```bash
# Plan sprint for project
/azure-devops-orchestrator:sprint platform-api

# Specify team and velocity
/azure-devops-orchestrator:sprint platform-api --team "Backend Team" --velocity 30

# Plan for a specific iteration
/azure-devops-orchestrator:sprint platform-api --iteration "platform-api\Sprint 15"

# Preview only
/azure-devops-orchestrator:sprint platform-api --dry-run

# Auto-apply
/azure-devops-orchestrator:sprint platform-api --apply
```

## Tips

- Run `/azure-devops-orchestrator:triage` first to ensure backlog items have priorities and estimates
- Historical velocity is more accurate — only override with `--velocity` when the team size changed
- Pair with `/azure-devops-orchestrator:retro` after the sprint to close the feedback loop
- Use `--backlog-query` for custom item selection (e.g., only Bugs, only a specific area path)
