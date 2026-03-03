# Ship Workflow Reference

The ship workflow takes a Microsoft Planner task and orchestrates Claude Code to implement it,
creating a git branch + PR, then marking the task Done in Planner.

## State Machine

```
INITIALIZED
  → PREFLIGHT_PASSED
  → TASK_FETCHED
  → BRANCH_CREATED
  → EXPLORE_COMPLETE
  → PLAN_COMPLETE       ← checkpoint: ask user approval
  → CODE_COMPLETE       ← checkpoint: ask user to review diff
  → TESTS_PASSING
  → PR_CREATED
  → PLANNER_UPDATED
  → SHIPPED
```

Save state to `sessions/ship/{taskId}/state.json` after each transition.

## Phase 0: Pre-Flight

Check before doing any work:
- `planner-todo` plugin is installed and accessible
- Current directory is a git repository
- Working tree is clean (no uncommitted changes)
- Authenticated to Microsoft Graph (test with a lightweight call)

If any check fails, list all failures with remediation steps and abort.

## Phase 1: Fetch Task

Use planner-todo to fetch the task and its details:
```
GET /planner/tasks/{taskId}
GET /planner/tasks/{taskId}/details
```

Extract:
- `title` → becomes the implementation goal
- `description` → acceptance criteria / requirements
- `checklist` items → implementation sub-tasks
- `dueDateTime` → deadline context
- `assignments` → who owns this (for PR assignees)
- `appliedCategories` → labels (Bug / Feature / Tech Debt)
- `bucketId` → which stage it's in (to know the Done bucket)
- `planId` → to look up the Done bucket

Also fetch the plan's buckets to identify the Done bucket (usually named "Done" or the rightmost bucket).

## Phase 2: Branch

Create a git branch: `feature/{taskId}-{slug}` where slug is the task title in kebab-case.

- Bug label → `bugfix/{taskId}-{slug}`
- Hotfix label → `hotfix/{taskId}-{slug}`
- Default → `feature/{taskId}-{slug}`

Check if a branch for this task already exists; if so, check it out.

## Phase 3: Explore

Analyze the codebase to understand the implementation context:
- Find files likely affected by the task
- Identify existing patterns to follow
- Map dependencies and interfaces
- Note test conventions

Output: a context document saved to `sessions/ship/{taskId}/context.md`

## Phase 4: Plan

Produce a step-by-step implementation plan:
- Files to create or modify
- Key interfaces and data structures
- Test strategy
- Risk notes (breaking changes, shared code)

**Checkpoint**: Show plan to user. Ask: "Does this plan look right? Should I proceed?"
Save plan to `sessions/ship/{taskId}/plan.md`.

## Phase 5: Code

Implement according to the plan:
- Follow existing code patterns found in Explore
- Write tests alongside implementation
- Keep changes minimal and focused
- Run `git diff` after each file to stay on track

**Checkpoint**: Show full diff. Ask: "Ready to run tests?"

## Phase 6: Test

Run the project's test suite:
- Detect test runner (jest, pytest, go test, dotnet test, etc.)
- Run relevant tests (not full suite if slow)
- Target: all tests pass, no new failures
- On failure: attempt one fix cycle, then surface to user

## Phase 7: Document

Update documentation affected by the change:
- README sections if functionality changed
- Inline comments for non-obvious logic
- API docs if endpoints changed

## Phase 8: Commit + PR

Create a commit:
```
{type}({taskId}): {task title}

{short description of what changed}

Planner task: {planId}/{taskId}
```

Create PR with:
- Title: same as commit subject
- Body: task description, changes made, test results, link to Planner task
- Assignees: task assignees (map email → GitHub username if possible)

## Phase 9: Update Planner

After PR is created:
1. GET the task to get current ETag
2. PATCH `percentComplete: 100` and move to Done bucket:
   ```json
   {
     "percentComplete": 100,
     "bucketId": "{doneBucketId}"
   }
   ```
3. Add a comment to the task (if supported by plan settings) with the PR link

## Resume

```bash
/planner-orchestrator:ship {taskId} --resume
/planner-orchestrator:ship {taskId} --status
/planner-orchestrator:ship {taskId} --from=CODE_COMPLETE
```

Read `sessions/ship/{taskId}/state.json` to determine where to resume.

## Error Handling

| Error | Recovery |
|-------|----------|
| Pre-flight fails | List issues + remediation, abort |
| Task not found | Verify task ID, check plan access |
| Branch conflict | Fetch existing branch, ask user to resolve |
| Tests fail after 1 retry | Surface failures, ask user: fix manually or skip |
| PR creation fails | Show error, provide git push command to run manually |
| ETag conflict on Planner update | Re-GET task, retry once |
