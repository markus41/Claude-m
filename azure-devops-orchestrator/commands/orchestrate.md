---
name: azure-devops-orchestrator:orchestrate
description: >
  Master orchestration: portfolio overview, cross-project health, workload balancing, and fleet-wide
  pipeline status. Routes to the appropriate specialist agents based on the requested operation.
argument-hint: "[--portfolio] [--workload] [--pipelines] [--all]"
allowed-tools:
  - Read
  - Glob
  - Grep
  - Bash
  - Task
---

# azure-devops-orchestrator:orchestrate

Master entry point for Azure DevOps orchestration. Routes to specialist agents based on what you need.

## Arguments

- `--portfolio` — Cross-project health overview (routes to **health-monitor** agent)
- `--workload [projectName]` — Workload balance analysis (routes to **workload-balancer** agent)
- `--pipelines` — Fleet-wide pipeline status (routes to **pipeline-orchestrator** agent)
- `--health <projectName>` — Full health analysis for one project: triage + status + balance
- `--all` — Run portfolio + workload + pipelines together (comprehensive report)
- `--report` — Full portfolio report with Teams + Outlook output (if installed)

When called with no arguments, shows an interactive menu.

## Interactive Mode (no arguments)

When the user runs `/azure-devops-orchestrator:orchestrate` with no flags, present a menu:

```
What would you like to do?

1. Portfolio overview (all projects health scorecard)
2. Workload balance (analyze and rebalance work item assignments)
3. Pipeline fleet status (all pipelines across projects)
4. Full project health (triage + status + balance for one project)
5. Run all reports and notify Teams/Outlook
6. DORA metrics across all projects

Enter number or describe what you need:
```

Parse the user's response and route to the appropriate agent(s).

## --portfolio

Invokes the **health-monitor** agent to produce:
- Per-project: health score, velocity, overdue count, pipeline pass rate
- Cross-project: comparative ranking by health score
- Team-level: shared assignees across projects, competing priorities
- Executive summary bullet points with top risks

## --workload [projectName]

Invokes the **workload-balancer** agent to:
- Show current distribution (overloaded vs. underloaded) for one or all projects
- Recommend reassignments
- Apply changes after confirmation

If `projectName` is omitted, analyzes all projects and shows cross-project workload.

## --pipelines

Invokes the **pipeline-orchestrator** agent to:
- List all pipelines across all projects
- Show pass rate and last run status for each
- Flag pipelines with consecutive failures or declining pass rates
- Identify flaky tests across the fleet

## --health <projectName>

Runs a three-phase deep health analysis for a single project:

1. **Triage** (backlog-triage agent) — classify unplanned work items, suggest priorities and area paths
2. **Status** (health-monitor agent) — velocity, overdue, DORA metrics, pipeline health
3. **Balance** (workload-balancer agent) — detect distribution issues, suggest reassignments

Outputs a combined report, then asks which fixes to apply.

## --all

Runs all three analyses in sequence:
1. Portfolio overview (health-monitor)
2. Cross-project workload (workload-balancer)
3. Pipeline fleet status (pipeline-orchestrator)

Produces a unified executive report.

## --report

Runs `--all` then:
- Posts summary to Teams (if `microsoft-teams-mcp` installed)
- Emails digest to project leads (if `microsoft-outlook-mcp` installed)
- Exports data for Power BI (if `powerbi-fabric` installed)

## Output

### Combined Report (--all or --report)

```
## Azure DevOps Executive Report — {date}

### Portfolio Health
| Project | Health | Velocity | Overdue | Pipeline % | Status |
|---------|--------|----------|---------|-----------|--------|
| ...     | /100   | pts      | n       | %         | R/A/G  |

### Workload Overview
| Assignee | Projects | Open Items | Points | Status |
|----------|----------|-----------|--------|--------|
| ...      |          |           |        | Over/OK/Under |

### Pipeline Fleet
| Pipeline | Project | Pass Rate | Streak | Status |
|----------|---------|-----------|--------|--------|
| ...      |         | %         | n      | OK/Alert |

### Top 5 Risks
1. {risk + mitigation}
2. ...

### Recommended Actions
1. {action — impacted project + assignee}
2. ...

### Cross-Plugin Actions
- Teams: {posted / skipped}
- Outlook: {sent / skipped}
- Power BI: {exported / skipped}
```

## Examples

```bash
# Interactive menu
/azure-devops-orchestrator:orchestrate

# Portfolio overview
/azure-devops-orchestrator:orchestrate --portfolio

# Workload balance for one project
/azure-devops-orchestrator:orchestrate --workload platform-api

# Cross-project workload
/azure-devops-orchestrator:orchestrate --workload

# Pipeline fleet status
/azure-devops-orchestrator:orchestrate --pipelines

# Full single-project health
/azure-devops-orchestrator:orchestrate --health platform-api

# Everything
/azure-devops-orchestrator:orchestrate --all

# Everything + notifications
/azure-devops-orchestrator:orchestrate --report
```

## Tips

- Use `--report` on a schedule (e.g., Monday morning) to kick off the week with full visibility
- `--health` is the most thorough single-project analysis — runs three agents
- `--all` is the broadest cross-project analysis — use for executive reporting
- For shipping work items, use `/azure-devops-orchestrator:ship` instead
- For sprint planning, use `/azure-devops-orchestrator:sprint` instead
