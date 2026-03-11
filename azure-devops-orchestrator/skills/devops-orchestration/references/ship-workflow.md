# Ship Workflow Reference

The ship workflow takes an Azure DevOps work item and orchestrates Claude Code to implement it,
creating a git branch + PR, then transitioning the work item to Resolved.

---

## State Machine

```
INITIALIZED
  -> PREFLIGHT_PASSED
  -> WORK_ITEM_FETCHED
  -> BRANCH_CREATED
  -> EXPLORE_COMPLETE
  -> PLAN_COMPLETE       <- checkpoint: ask user approval
  -> CODE_COMPLETE       <- checkpoint: ask user to review diff
  -> TESTS_PASSING
  -> PR_CREATED
  -> DEVOPS_UPDATED
  -> SHIPPED
```

Save state to `sessions/ship/{workItemId}/state.json` after each transition.

### State Machine Diagram

```
  +-------------+
  | INITIALIZED |
  +------+------+
         |
         v
  +------+----------+     +-------------------+
  | PREFLIGHT       +---->| ABORT (env issues) |
  +------+----------+     +-------------------+
         |
         v
  +------+----------+     +---------------------+
  | FETCH           +---->| ABORT (WI not found) |
  +------+----------+     +---------------------+
         |
         v
  +------+----------+     +------------------------+
  | BRANCH          +---->| PROMPT (branch exists?) |
  +------+----------+     +------------------------+
         |
         v
  +------+----------+
  | EXPLORE         |
  +------+----------+
         |
         v
  +------+----------+     +-----------+
  | PLAN            +---->| USER GATE |----> modify / abort
  +------+----------+     +-----------+
         |  (approved)
         v
  +------+----------+     +-----------+
  | CODE            +---->| USER GATE |----> review diff
  +------+----------+     +-----------+
         |  (approved)
         v
  +------+----------+     +-----------------------+
  | TEST            +---->| AUTO-FIX (1 attempt)  |
  +------+----------+     +----------+------------+
         |                           |
         |  (tests pass)             v (still failing)
         |                 +---------+---------+
         |                 | USER GATE         |
         |                 | fix / skip / abort |
         |                 +-------------------+
         v
  +------+----------+
  | COMMIT + PR     |
  +------+----------+
         |
         v
  +------+----------+
  | UPDATE WI       |
  +------+----------+
         |
         v
  +------+----------+
  | SHIPPED         |
  +------+----------+
```

---

## State Transition Rules

| From | To | Condition | Rollback |
|------|----|-----------|----------|
| INITIALIZED | PREFLIGHT_PASSED | All checks pass | N/A |
| PREFLIGHT_PASSED | WORK_ITEM_FETCHED | Work item retrieved successfully | N/A |
| WORK_ITEM_FETCHED | BRANCH_CREATED | Git branch created/checked out | Delete branch |
| BRANCH_CREATED | EXPLORE_COMPLETE | Codebase analysis complete | N/A |
| EXPLORE_COMPLETE | PLAN_COMPLETE | User approves plan | N/A |
| PLAN_COMPLETE | CODE_COMPLETE | Implementation done, user reviews diff | Git reset |
| CODE_COMPLETE | TESTS_PASSING | All tests pass | N/A |
| TESTS_PASSING | PR_CREATED | PR created in remote | Close PR |
| PR_CREATED | DEVOPS_UPDATED | Work item state updated | Revert state |
| DEVOPS_UPDATED | SHIPPED | All notifications sent | N/A |

---

## State File JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["workflow", "workItemId", "state", "org", "project", "startedAt"],
  "properties": {
    "workflow": {
      "type": "string",
      "const": "ship"
    },
    "workItemId": {
      "type": "integer",
      "description": "Azure DevOps work item ID"
    },
    "state": {
      "type": "string",
      "enum": [
        "INITIALIZED", "PREFLIGHT_PASSED", "WORK_ITEM_FETCHED",
        "BRANCH_CREATED", "EXPLORE_COMPLETE", "PLAN_COMPLETE",
        "CODE_COMPLETE", "TESTS_PASSING", "PR_CREATED",
        "DEVOPS_UPDATED", "SHIPPED", "ABORTED"
      ]
    },
    "org": {
      "type": "string",
      "description": "Azure DevOps organization URL"
    },
    "project": {
      "type": "string",
      "description": "Azure DevOps project name"
    },
    "startedAt": {
      "type": "string",
      "format": "date-time"
    },
    "updatedAt": {
      "type": "string",
      "format": "date-time"
    },
    "checkpoints": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "state": { "type": "string" },
          "at": { "type": "string", "format": "date-time" },
          "metadata": { "type": "object" }
        }
      }
    },
    "data": {
      "type": "object",
      "properties": {
        "workItemTitle": { "type": "string" },
        "workItemType": {
          "type": "string",
          "enum": ["Bug", "User Story", "Task", "Feature", "Epic"]
        },
        "branchName": { "type": "string" },
        "branchType": { "type": "string" },
        "prUrl": { "type": ["string", "null"] },
        "prId": { "type": ["integer", "null"] },
        "doneBranchTarget": { "type": "string", "default": "main" },
        "originalState": { "type": "string" },
        "acceptanceCriteria": { "type": "array", "items": { "type": "string" } },
        "reproSteps": { "type": ["string", "null"] },
        "iterationPath": { "type": "string" },
        "areaPath": { "type": "string" },
        "assignedTo": { "type": ["string", "null"] },
        "storyPoints": { "type": ["number", "null"] },
        "priority": { "type": "integer" },
        "tags": { "type": "array", "items": { "type": "string" } },
        "parentWorkItemId": { "type": ["integer", "null"] },
        "childWorkItemIds": { "type": "array", "items": { "type": "integer" } },
        "relatedFiles": { "type": "array", "items": { "type": "string" } },
        "testResults": {
          "type": "object",
          "properties": {
            "total": { "type": "integer" },
            "passed": { "type": "integer" },
            "failed": { "type": "integer" },
            "skipped": { "type": "integer" },
            "duration": { "type": "string" }
          }
        },
        "filesChanged": {
          "type": "array",
          "items": { "type": "string" }
        },
        "crossPlugin": {
          "type": "object",
          "properties": {
            "teams": { "type": "object", "properties": { "status": { "type": "string" }, "messageId": { "type": ["string", "null"] } } },
            "outlook": { "type": "object", "properties": { "status": { "type": "string" }, "messageId": { "type": ["string", "null"] } } }
          }
        }
      }
    },
    "errors": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "phase": { "type": "string" },
          "message": { "type": "string" },
          "timestamp": { "type": "string", "format": "date-time" },
          "retryable": { "type": "boolean" }
        }
      }
    }
  }
}
```

---

## Branch Naming Conventions

### By Work Item Type

| Work Item Type | Priority | Branch Prefix | Example |
|---|---|---|---|
| Bug | 1 (Critical) | `hotfix/` | `hotfix/4524-critical-db-timeout` |
| Bug | 2-4 | `bugfix/` | `bugfix/4567-null-reference-payment` |
| User Story | Any | `feature/` | `feature/1234-implement-oauth-login` |
| Task | Any | `feature/` | `feature/2345-add-logging-middleware` |
| Feature | Any | `feature/` | `feature/3456-user-authentication` |
| Epic | Any | `epic/` | `epic/100-platform-modernization` |

### By Tag Override

| Tag | Prefix Override | Use Case |
|---|---|---|
| `hotfix` | `hotfix/` | Critical production fix, bypasses normal flow |
| `spike` | `spike/` | Research/investigation, no PR expected |
| `prototype` | `proto/` | Throwaway code, PR optional |

### Naming Rules

1. Format: `{prefix}{workItemId}-{slug}`
2. Slug: title in kebab-case, first 50 characters, no trailing hyphens
3. Allowed characters: `a-z`, `0-9`, `-`, `/`
4. Replace spaces with `-`, strip special characters
5. Max total length: 63 characters

```bash
# Generate slug from title
SLUG=$(echo "{title}" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | head -c 50)

# Check if branch already exists
git branch --list "{type}/{workItemId}-*"

# Create new branch from main
git checkout main && git pull origin main
git checkout -b {type}/{workItemId}-{slug}
```

---

## PR Template with Acceptance Criteria Mapping

### Standard PR Body

```markdown
## Summary

**Work Item**: [#{workItemId} -- {title}](https://dev.azure.com/{org}/{project}/_workitems/edit/{workItemId})
**Type**: {workItemType} | **Priority**: {priority} | **Points**: {storyPoints}

{description from work item, converted from HTML to Markdown}

## Changes

### Files Modified
| File | Change Type | Description |
|------|------------|-------------|
| `src/auth/login.ts` | Modified | Added PKCE flow implementation |
| `src/auth/login.test.ts` | Added | Unit tests for PKCE flow |

### Architecture Notes
{Any significant design decisions or trade-offs}

## Acceptance Criteria Verification

- [x] **AC1**: User can log in with email/password -> Implemented in `LoginService.authenticate()`
- [x] **AC2**: Invalid credentials show error message -> Error handling in `LoginController`
- [ ] **AC3**: Rate limiting after 5 failed attempts -> Deferred to #{nextWorkItemId}

## Test Results

| Suite | Total | Passed | Failed | Skipped | Duration |
|-------|-------|--------|--------|---------|----------|
| Unit  | 24    | 24     | 0      | 0       | 3.2s     |
| Integration | 8 | 8   | 0      | 0       | 12.1s    |

## Checklist

- [x] Code follows existing patterns and conventions
- [x] Tests added/updated for new functionality
- [x] No secrets or credentials in code
- [x] Breaking changes documented (if any)

---
Resolves AB#{workItemId}
```

### Bug-Specific PR Template Additions

```markdown
## Root Cause

{Analysis of why the bug occurred}

## Repro Steps Verification

1. [x] Step 1: {step} -> No longer reproduces
2. [x] Step 2: {step} -> Verified fixed

## Regression Risk

{Assessment of whether the fix could cause regressions}
```

---

## Commit Message Format

### Conventional Commits with ADO Linking

```
{type}(#{workItemId}): {short description}

{body -- what changed and why}

Work Item: #{workItemId}
AB#{workItemId}
```

### Type Mapping

| Work Item Type | Commit Type | Example |
|---|---|---|
| Bug | `fix` | `fix(#4567): handle null payment reference` |
| User Story | `feat` | `feat(#1234): implement OAuth 2.0 login` |
| Task (new code) | `feat` | `feat(#2345): add logging middleware` |
| Task (refactor) | `refactor` | `refactor(#2345): extract payment validation` |
| Task (tests) | `test` | `test(#2345): add integration tests for auth` |
| Task (docs) | `docs` | `docs(#2345): update API documentation` |
| Task (config) | `chore` | `chore(#2345): update CI pipeline config` |

### Commit Body Rules

1. First line (subject): max 72 characters
2. Blank line after subject
3. Body: wrap at 80 characters
4. Include `AB#{workItemId}` on its own line for auto-linking
5. If fixing a bug, include the root cause in the body

---

## Cross-Plugin Actions After PR Creation

### Teams Notification (if microsoft-teams-mcp installed)

Post an adaptive card to the team's channel with work item details, PR link, branch name,
test results, and action buttons to review the PR or view the work item.

### Outlook Notification (if microsoft-outlook-mcp installed)

Send email to the work item assignee and reviewer with PR URL, branch name, change summary,
and test results.

### Target Channel/Recipient Selection

1. If user specifies channel/recipient, use it
2. Look for a Teams channel matching the project or area path name
3. Use the work item's AssignedTo for email recipients
4. Fall back to asking the user

---

## Error Recovery for Each Phase

| Phase | Error | Recovery Action |
|---|---|---|
| PREFLIGHT | Git repo not clean | Show uncommitted changes, ask user to stash or commit |
| PREFLIGHT | Not authenticated | Run `az login` and `az devops configure` |
| PREFLIGHT | azure-devops plugin missing | Show install command |
| PREFLIGHT | az devops CLI not found | `az extension add --name azure-devops` |
| FETCH | Work item not found (404) | Verify ID, check project/org, suggest WIQL search |
| FETCH | Permission denied (403) | Check PAT scopes: Work Items (Read) required |
| FETCH | Work item already Resolved/Closed | Warn user, ask to proceed or abort |
| BRANCH | Branch name conflict | Check out existing branch, ask: continue or rename? |
| BRANCH | Protected branch push rejected | Verify branch policies, use correct prefix |
| EXPLORE | No matching files found | Broaden search, ask user for guidance |
| PLAN | User rejects plan | Ask for modifications, regenerate plan |
| CODE | Implementation blocked | Surface the issue, ask for guidance or skip |
| TEST | Tests fail (1st attempt) | Auto-analyze failure, attempt fix |
| TEST | Tests fail (2nd attempt) | Show failures, ask: fix manually / skip / abort |
| TEST | Test runner not detected | Ask user for test command |
| COMMIT_PR | Push rejected | Check remote, verify branch exists, force-push if user agrees |
| COMMIT_PR | PR creation fails | Show error, provide manual `az repos pr create` command |
| COMMIT_PR | PR requires reviewers | Use work item AssignedTo or ask user |
| UPDATE | Work item update fails | Show error, provide manual `az boards work-item update` command |
| UPDATE | State transition invalid | Check valid states for the work item type |
| NOTIFY | Cross-plugin not available | Skip with message, never fail |

---

## Dry-Run Behavior

When invoked with `--dry-run`:

1. Execute PREFLIGHT normally (validate environment)
2. Execute FETCH normally (retrieve work item)
3. Execute EXPLORE normally (analyze codebase)
4. Execute PLAN normally (create implementation plan)
5. **STOP** -- do not execute CODE, TEST, COMMIT_PR, or UPDATE
6. Output the complete plan with:
   - Branch name that would be created
   - Files that would be modified
   - Implementation approach
   - Estimated effort
   - Risk assessment
7. Save plan to `sessions/ship/{workItemId}/plan.md` for later use

Resume from dry-run:
```
"Ship work item 1234 --resume"
```
This will load the saved plan and continue from the CODE phase.

---

## Resume Examples

```
# Resume from last checkpoint
"Ship work item 1234 --resume"

# Check current status without executing
"Ship work item 1234 --status"

# Restart from a specific phase (discards later state)
"Ship work item 1234 --from=CODE"

# Abort and clean up (delete branch, remove session)
"Ship work item 1234 --abort"
```

### Resume Decision Logic

```
1. Read sessions/ship/{workItemId}/state.json
2. If file does not exist -> start from INITIALIZED
3. If state == SHIPPED -> "Already shipped. Start a new ship?"
4. If state == ABORTED -> "Previously aborted. Restart from beginning?"
5. Find the last checkpoint with a completed state
6. Set next phase = the one after the last completed state
7. If any checkpoint has an error:
   - Show error message
   - Ask: "Retry {phase}, skip to {next_phase}, or abort?"
8. Begin execution at next phase
```

---

## Phase-by-Phase Work Item Display

After FETCH, display a summary to the user before proceeding:

```
## Work Item #{workItemId}: {title}

**Type**: {type} | **Priority**: {priority} | **State**: {state}
**Sprint**: {iterationPath} | **Area**: {areaPath}
**Assigned**: {assignedTo} | **Story Points**: {storyPoints}

### Description
{description}

### Acceptance Criteria
{acceptanceCriteria}

### Child Tasks
- #{childId}: {childTitle} ({childState})

### Related Items
- #{relatedId}: {relatedTitle} ({relatedState})

Proceed with implementation?
```
