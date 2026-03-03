---
name: planner-orchestrator:triage
description: >
  Triage a Microsoft Planner backlog: auto-prioritize tasks, apply labels (Bug/Feature/Tech Debt),
  suggest assignees, and route tasks to the right bucket. Shows a report and asks for confirmation
  before applying any changes.
argument-hint: "<planId> [--apply] [--bucket=<name>] [--dry-run]"
allowed-tools:
  - Read
  - Glob
  - Grep
  - Bash
  - Task
---

# planner-orchestrator:triage

Intelligent triage for Planner backlogs. Prioritizes, labels, assigns, and routes tasks.

## Arguments

- `<planId>` — Planner plan ID to triage (required). Use `/planner-task-list` to find plan IDs.
- `--apply` — Apply all recommended changes immediately without asking for confirmation (use with care)
- `--bucket=<name>` — Restrict triage to tasks in a specific bucket (e.g., `--bucket=Backlog`)
- `--dry-run` — Show what changes would be made without applying any

## What Triage Does

Invoke the **task-triage** agent to:

1. **Prioritize** — Set `priority` field based on due date, type, and urgency signals
2. **Label** — Apply `appliedCategories` based on title/description keyword patterns
3. **Assign** — Suggest assignees based on domain patterns from existing assignments
4. **Route** — Move tasks to the appropriate bucket based on readiness

## Scope

Only tasks with ALL of the following are triaged:
- `percentComplete: 0` (not started)
- Missing priority, labels, or assignee (or all three)

Already-triaged tasks are reported as "skipped — already has priority and labels".

## Output

A triage report table is shown before any changes are applied. The user must confirm
(or pass `--apply`) before any Planner updates are made.

## Examples

```bash
# Triage a plan (shows report, asks for confirmation)
/planner-orchestrator:triage AbCdEfGhIj...

# Triage only the Backlog bucket
/planner-orchestrator:triage AbCdEfGhIj... --bucket=Backlog

# Preview without changes
/planner-orchestrator:triage AbCdEfGhIj... --dry-run

# Apply immediately
/planner-orchestrator:triage AbCdEfGhIj... --apply
```

## Tips

- Run triage after importing tasks in bulk or at the start of a sprint planning session
- Pair with `/planner-orchestrator:sprint` to triage then plan the sprint
- Use `--bucket=Backlog` to restrict to just the intake queue
