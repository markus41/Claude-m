---
name: planner-orchestrator:sprint
description: >
  Sprint and bucket capacity planning for Microsoft Planner. Given a plan, team size, and sprint
  duration, scores backlog tasks by WSJF priority and recommends which tasks to pull into the
  active sprint bucket — respecting capacity and distributing load across assignees.
argument-hint: "<planId> [--team=<n>] [--days=<n>] [--backlog=<bucket>] [--sprint=<bucket>] [--apply]"
allowed-tools:
  - Read
  - Glob
  - Grep
  - Bash
  - Task
---

# planner-orchestrator:sprint

Capacity-aware sprint planning for Planner — select and move tasks from backlog to sprint bucket.

## Arguments

- `<planId>` — Planner plan ID (required)
- `--team=<n>` — Number of team members (default: count unique assignees in active tasks)
- `--days=<n>` — Sprint duration in working days (default: 10)
- `--backlog=<name>` — Source bucket name (default: "Backlog")
- `--sprint=<name>` — Target bucket name (default: "In Progress" or next available)
- `--apply` — Move tasks immediately after showing plan (skips confirmation prompt)

## Workflow

Invoke the **bucket-planner** agent to:

1. **Measure capacity** — team × days × 6h × 75% net (after overhead and buffer)
2. **Score tasks** — WSJF: (Business Value + Time Criticality + Risk Reduction) / Effort
3. **Select tasks** — greedy selection by score until capacity is filled
4. **Check balance** — flag if one assignee gets > 40% of selected tasks
5. **Propose plan** — show sprint table with scores, assignees, story points

Ask for confirmation before moving tasks to the sprint bucket.

On confirmation, PATCH each task's `bucketId` using the ETag pattern.

## Output Format

Shows a sprint plan table with:
- Task title, WSJF score, effort (pts), assignee
- Capacity summary (total pts available vs. committed)
- Assignee distribution table
- Tasks left in backlog with reason

## Examples

```bash
# Plan sprint for a team of 4 over 10 days
/planner-orchestrator:sprint AbCdEfGhIj... --team=4

# Custom sprint length
/planner-orchestrator:sprint AbCdEfGhIj... --team=3 --days=5

# Specific bucket names
/planner-orchestrator:sprint AbCdEfGhIj... --backlog="Ready for Dev" --sprint="Sprint 14"

# Auto-apply without confirmation
/planner-orchestrator:sprint AbCdEfGhIj... --team=4 --apply
```

## Tips

- Run `/planner-orchestrator:triage` first to ensure backlog tasks have priorities and estimates
- Use `--team=` when not all assignees are reflected in existing task assignments
- Pair with `/planner-orchestrator:status` afterwards to confirm the sprint board looks right
