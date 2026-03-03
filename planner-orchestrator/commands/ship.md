---
name: planner-orchestrator:ship
description: >
  Ship a Microsoft Planner task end-to-end: fetch task details, create a git branch, explore
  the codebase, plan and implement the solution, run tests, open a PR, and mark the task Done
  in Planner. Supports --resume to continue an interrupted workflow.
argument-hint: "<taskId> [--resume] [--status] [--dry-run] [--from=<STATE>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
  - Task
---

# planner-orchestrator:ship

End-to-end command: implement a Planner task with Claude Code, open a PR, and mark it Done.

## Arguments

- `<taskId>` — Planner task ID (required unless `--status` is used on a previous session)
- `--resume` — Resume from last saved checkpoint
- `--status` — Show the current state of an in-progress ship for this task
- `--dry-run` — Preview what would happen without making any changes
- `--from=<STATE>` — Resume from a specific state (e.g., `--from=CODE_COMPLETE`)

## Workflow

Invoke the **ship-orchestrator** agent to execute the full workflow:

```
PREFLIGHT → FETCH TASK → BRANCH → EXPLORE → PLAN (checkpoint) → CODE (checkpoint) → TEST → DOCUMENT → COMMIT → PR → UPDATE PLANNER → SHIPPED
```

## Dry Run

When `--dry-run` is passed, output what WOULD happen:
- Pre-flight check results
- Task title and checklist items to implement
- Proposed branch name
- Files likely to change (from explore phase)
- Estimated effort
- PR title that would be created
- Planner field updates that would be applied

Do not create any branches, write any files, or modify Planner.

## Status

When `--status` is passed, read `sessions/ship/{taskId}/state.json` and report:
- Current state
- Completed phases
- Branch name (if created)
- PR URL (if created)
- Next action needed

## Resume

When `--resume` is passed, read `sessions/ship/{taskId}/state.json` and continue from the last saved checkpoint.

## Examples

```bash
# Ship a task
/planner-orchestrator:ship AAMkAGE...

# Preview without changes
/planner-orchestrator:ship AAMkAGE... --dry-run

# Check progress
/planner-orchestrator:ship AAMkAGE... --status

# Resume after interruption
/planner-orchestrator:ship AAMkAGE... --resume

# Resume from a specific state
/planner-orchestrator:ship AAMkAGE... --resume --from=CODE_COMPLETE
```

## Tips

- Task ID can be found in the Planner task URL or via `/planner-task-list`
- The workflow has two confirmation checkpoints: after planning, and after coding
- Sessions are saved in `sessions/ship/{taskId}/` — safe to resume anytime
- If `microsoft-teams-mcp` is installed, a ship notification is posted automatically
