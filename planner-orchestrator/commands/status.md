---
name: planner-orchestrator:status
description: >
  Plan health dashboard and deadline report for Microsoft Planner. Scans one or all accessible
  plans for overdue tasks, at-risk items, stalled work, and unassigned tasks. Optionally posts
  results to Teams or emails via Outlook.
argument-hint: "[<planId>] [--all] [--email] [--teams] [--scope=<overdue|week|all>]"
allowed-tools:
  - Read
  - Glob
  - Grep
  - Bash
  - Task
---

# planner-orchestrator:status

Real-time health dashboard for Planner plans — overdue, at-risk, stalled, and unassigned tasks.

## Arguments

- `<planId>` — Check a specific plan (omit to check all accessible plans)
- `--all` — Explicitly scan all accessible plans (same as omitting planId)
- `--email` — Send results via Outlook digest (requires `microsoft-outlook-mcp`)
- `--teams` — Post summary card to the plan's Teams channel (requires `microsoft-teams-mcp`)
- `--scope=overdue` — Show only overdue tasks (faster scan)
- `--scope=week` — Show overdue + due this week
- `--scope=all` — Full report including no-due-date and unassigned (default)

## Workflow

Invoke the **deadline-monitor** agent to scan plans and classify tasks into:
- Overdue
- Due today
- Due this week
- Stalled (50% complete, no update in 5+ days)
- No due date (assigned but unscheduled)
- Unassigned

Then optionally delegate to **teams-notifier** and/or Outlook based on flags.

## Cross-Plugin

When `--teams` is passed:
- Check if `microsoft-teams-mcp` is installed
- If yes: post adaptive card to plan's Teams channel
- If no: report that Teams posting is unavailable + install instructions

When `--email` is passed:
- Check if `microsoft-outlook-mcp` is installed
- If yes: send digest email to plan owners and assignees with overdue tasks
- If no: report that email is unavailable + install instructions

## Examples

```bash
# Check all plans
/planner-orchestrator:status

# Check specific plan
/planner-orchestrator:status AbCdEfGhIj...

# Check all plans + post to Teams
/planner-orchestrator:status --all --teams

# Check all plans + email + Teams
/planner-orchestrator:status --all --email --teams

# Quick overdue-only scan
/planner-orchestrator:status --scope=overdue
```

## Tips

- Run daily or weekly as a health check
- Use `--scope=overdue` for a fast morning check
- Combine `--email` + `--teams` for full stakeholder notifications
- For MSP/multi-tenant scenarios, use `/planner-orchestrator:orchestrate --portfolio` instead
