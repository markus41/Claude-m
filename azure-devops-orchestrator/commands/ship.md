---
name: azure-devops-orchestrator:ship
description: >
  Ship an Azure DevOps work item end-to-end: fetch work item details, create a git branch,
  explore the codebase, plan and implement the solution, run tests, open a PR linked to the
  work item, and update the item to Resolved. Supports --resume to continue an interrupted workflow.
argument-hint: "<workItemId> [--resume] [--status] [--dry-run] [--from=<STATE>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
  - Task
---

# azure-devops-orchestrator:ship

End-to-end command: implement an Azure DevOps work item with Claude Code, open a PR, and resolve the item.

## Arguments

- `<workItemId>` — Azure DevOps work item ID (required unless `--status` is used on a previous session)
- `--resume` — Resume from last saved checkpoint
- `--status` — Show the current state of an in-progress ship for this work item
- `--dry-run` — Preview what would happen without making any changes
- `--from=<STATE>` — Resume from a specific state (e.g., `--from=CODE`)

## Workflow

Invoke the **ship-orchestrator** agent to execute the full workflow:

```
PREFLIGHT → FETCH → BRANCH → EXPLORE → PLAN (checkpoint) → CODE (checkpoint) → TEST → COMMIT → PR → UPDATE → DONE
```

Each state performs one step:
1. **PREFLIGHT** — Validate Azure DevOps PAT, project access, and git status
2. **FETCH** — Retrieve work item title, description, acceptance criteria, and linked items
3. **BRANCH** — Create `feature/{workItemId}-{slug}` branch from default branch
4. **EXPLORE** — Analyze codebase structure, identify files likely to change
5. **PLAN** — Produce an implementation plan (checkpoint — user confirms before proceeding)
6. **CODE** — Implement the solution (checkpoint — user reviews before proceeding)
7. **TEST** — Run existing tests, add new tests if needed, verify all pass
8. **COMMIT** — Stage and commit changes with `AB#{workItemId}` in the message
9. **PR** — Open a pull request linked to the work item via `AB#{workItemId}`
10. **UPDATE** — Move work item state to Resolved and add PR link
11. **DONE** — Report summary

## Dry Run

When `--dry-run` is passed, output what WOULD happen:
- Pre-flight check results
- Work item title, type, and acceptance criteria to implement
- Proposed branch name
- Files likely to change (from explore phase)
- Estimated effort
- PR title that would be created
- Work item field updates that would be applied

Do not create any branches, write any files, or modify Azure DevOps.

## Status

When `--status` is passed, read `sessions/ship/{workItemId}/state.json` and report:
- Current state
- Completed phases
- Branch name (if created)
- PR URL (if created)
- Next action needed

## Resume

When `--resume` is passed, read `sessions/ship/{workItemId}/state.json` and continue from the last saved checkpoint.

## Examples

```bash
# Ship a work item
/azure-devops-orchestrator:ship 4527

# Preview without changes
/azure-devops-orchestrator:ship 4527 --dry-run

# Check progress
/azure-devops-orchestrator:ship 4527 --status

# Resume after interruption
/azure-devops-orchestrator:ship 4527 --resume

# Resume from a specific state
/azure-devops-orchestrator:ship 4527 --resume --from=CODE
```

## Tips

- Work item ID is the integer shown in the Azure DevOps URL or board card
- The workflow has two confirmation checkpoints: after planning, and after coding
- Sessions are saved in `sessions/ship/{workItemId}/` — safe to resume anytime
- Commit messages include `AB#{workItemId}` so Azure DevOps auto-links the PR
- If `microsoft-teams-mcp` is installed, a ship notification is posted automatically
