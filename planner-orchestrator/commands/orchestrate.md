---
name: planner-orchestrator:orchestrate
description: >
  Master orchestration command for Microsoft Planner. Entry point for portfolio overview,
  workload balancing, full plan health analysis, and cross-plugin reporting. Routes to the
  appropriate specialist agent based on the requested operation.
argument-hint: "[--portfolio] [--balance=<planId>] [--health=<planId>] [--report]"
allowed-tools:
  - Read
  - Glob
  - Grep
  - Bash
  - Task
---

# planner-orchestrator:orchestrate

Master entry point for Planner orchestration. Routes to specialist agents based on what you need.

## Arguments

- `--portfolio` — Cross-plan portfolio overview (routes to **portfolio-manager** agent)
- `--balance=<planId>` — Workload balance analysis for a plan (routes to **workload-balancer** agent)
- `--health=<planId>` — Full health analysis: triage + status + balance for one plan
- `--report` — Full portfolio report with Teams + Outlook output (if installed)

When called with no arguments, shows an interactive menu to choose the operation.

## Interactive Mode (no arguments)

When the user runs `/planner-orchestrator:orchestrate` with no flags, present a menu:

```
What would you like to do?

1. Portfolio overview (all plans health summary)
2. Workload balance (analyze and rebalance task assignments)
3. Full plan health (triage + status + balance for one plan)
4. Run all reports and notify Teams/Outlook

Enter number or describe what you need:
```

Parse the user's response and route to the appropriate agent.

## --portfolio

Invokes the **portfolio-manager** agent to produce:
- Per-plan: completion %, overdue count, health score
- Team-level: tasks per assignee, overloaded members
- Cross-plan: competing priorities for shared assignees
- Executive summary bullet points

## --balance=<planId>

Invokes the **workload-balancer** agent to:
- Show current distribution (overloaded vs. underloaded)
- Recommend reassignments
- Apply changes after confirmation

## --health=<planId>

Runs a three-phase health analysis for a single plan:
1. **Triage** (task-triage agent) — classify unplanned tasks
2. **Status** (deadline-monitor agent) — flag overdue and at-risk
3. **Balance** (workload-balancer agent) — detect distribution issues

Outputs a combined report, then asks which fixes to apply.

## --report

Runs `--portfolio` then:
- Posts summary to Teams (if `microsoft-teams-mcp` installed)
- Emails digest to plan owners (if `microsoft-outlook-mcp` installed)
- Exports data for Power BI (if `powerbi-fabric` installed)

## Examples

```bash
# Interactive menu
/planner-orchestrator:orchestrate

# Portfolio overview
/planner-orchestrator:orchestrate --portfolio

# Workload balance for a plan
/planner-orchestrator:orchestrate --balance=AbCdEfGhIj...

# Full health analysis
/planner-orchestrator:orchestrate --health=AbCdEfGhIj...

# Full report with notifications
/planner-orchestrator:orchestrate --report
```

## Tips

- Use `--report` on a schedule (e.g., Monday morning) to kick off the week with full visibility
- `--health` is the most thorough single-plan analysis — runs all three agents
- For shipping tasks, use `/planner-orchestrator:ship` instead
