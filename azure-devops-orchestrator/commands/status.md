---
name: azure-devops-orchestrator:status
description: >
  Project health dashboard: velocity, cycle time, DORA metrics, overdue items, and pipeline health
  across one or all projects. Optionally posts results to Teams or emails via Outlook.
argument-hint: "[projectName] [--all] [--dora] [--format table|json]"
allowed-tools:
  - Read
  - Glob
  - Grep
  - Bash
  - Task
---

# azure-devops-orchestrator:status

Real-time health dashboard for Azure DevOps projects — velocity, DORA metrics, overdue items, and pipeline status.

## Arguments

- `[projectName]` — Check a specific project (omit for all accessible projects)
- `--all` — Explicitly scan all accessible projects (same as omitting projectName)
- `--dora` — Include full DORA metrics analysis (deployment frequency, lead time, MTTR, change failure rate)
- `--format table` — Output as formatted tables (default)
- `--format json` — Output as structured JSON (useful for Power BI export)
- `--teams` — Post summary card to a Teams channel (requires `microsoft-teams-mcp`)
- `--email` — Send digest via Outlook (requires `microsoft-outlook-mcp`)
- `--scope overdue` — Show only overdue items (fast scan)
- `--scope sprint` — Focus on current sprint health
- `--scope pipelines` — Focus on pipeline health only

## Workflow

Invoke the **health-monitor** agent to scan projects and produce a health scorecard.

### Single Project Mode

When `projectName` is provided:
1. Query work item metrics (velocity, overdue, cycle time)
2. Query pipeline runs and calculate pass rates
3. If `--dora`: calculate all four DORA metrics
4. Produce a detailed health report for that project

### All Projects Mode

When `--all` or no project specified:
1. List all accessible projects: `az devops project list`
2. For each project, collect summary metrics
3. Rank by health score
4. Produce a portfolio-level scorecard

### Scope Filters

- `--scope overdue`: Skip pipeline and DORA analysis, only report overdue items
- `--scope sprint`: Focus on current iteration — committed vs. completed, burndown status
- `--scope pipelines`: Skip work item analysis, only report pipeline health

## Output

```
## Azure DevOps Health Dashboard — {date}

### Portfolio Summary (if --all)
{n} projects | {total_items} active work items | {avg_health}/100 avg health

### Project: {projectName}

**Health Score**: {score}/100 — {Green/Amber/Red}

#### Work Items
| Metric | Value |
|--------|-------|
| Active items | {n} |
| Overdue | {n} |
| Velocity (30d) | {pts}/sprint |
| Avg cycle time | {days} days |
| Stalled (> 5d no update) | {n} |
| Unassigned | {n} |

#### Current Sprint — {iterationName}
| Metric | Value |
|--------|-------|
| Committed | {pts} pts ({n} items) |
| Completed | {pts} pts ({n} items) |
| Remaining | {pts} pts ({n} items) |
| Days left | {n} |
| On track | {Yes/At risk/Behind} |

#### Pipelines
| Pipeline | Last 10 Runs | Pass Rate | Last Run | Status |
|----------|-------------|-----------|----------|--------|
| ...      |             |           |          | OK/Failing |

#### DORA Metrics (if --dora)
| Metric | Value | Level |
|--------|-------|-------|
| Deployment Frequency | {value} | Elite/High/Med/Low |
| Lead Time for Changes | {value} | ... |
| MTTR | {value} | ... |
| Change Failure Rate | {value} | ... |

---

### Top Risks
1. {risk + recommended action}
2. {risk + recommended action}

### Cross-Plugin Actions
- Teams: {posted / skipped}
- Outlook: {sent / skipped}
```

## Cross-Plugin

When `--teams` is passed:
- Check if `microsoft-teams-mcp` is installed
- If yes: post adaptive card to project's Teams channel via **teams-notifier** agent
- If no: report unavailable with install instructions

When `--email` is passed:
- Check if `microsoft-outlook-mcp` is installed
- If yes: send digest email to project leads
- If no: report unavailable with install instructions

## Examples

```bash
# Check all projects
/azure-devops-orchestrator:status

# Check specific project
/azure-devops-orchestrator:status platform-api

# Full DORA metrics for a project
/azure-devops-orchestrator:status platform-api --dora

# Quick overdue scan
/azure-devops-orchestrator:status --all --scope overdue

# Pipeline health only
/azure-devops-orchestrator:status platform-api --scope pipelines

# Post results to Teams
/azure-devops-orchestrator:status --all --teams

# Export as JSON for Power BI
/azure-devops-orchestrator:status --all --dora --format json
```

## Tips

- Run daily or weekly as a health check across all projects
- Use `--scope overdue` for a fast morning standup scan
- `--dora` requires pipeline history — best for projects with CI/CD pipelines
- Combine `--teams` + `--email` for full stakeholder notifications
- For deep single-project analysis, use `/azure-devops-orchestrator:orchestrate --health`
