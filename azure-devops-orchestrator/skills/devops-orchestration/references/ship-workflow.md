# Ship Workflow Reference

The ship workflow takes an Azure DevOps work item and orchestrates Claude Code to implement it,
creating a git branch + PR, then transitioning the work item to Resolved.

## State Machine

```
INITIALIZED
  → PREFLIGHT_PASSED
  → WORK_ITEM_FETCHED
  → BRANCH_CREATED
  → EXPLORE_COMPLETE
  → PLAN_COMPLETE       ← checkpoint: ask user approval
  → CODE_COMPLETE       ← checkpoint: ask user to review diff
  → TESTS_PASSING
  → PR_CREATED
  → DEVOPS_UPDATED
  → SHIPPED
```

Save state to `sessions/ship/{workItemId}/state.json` after each transition.

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

## State File Schema

```json
{
  "workflow": "ship",
  "workItemId": 4521,
  "state": "INITIALIZED",
  "org": "https://dev.azure.com/myorg",
  "project": "MyProject",
  "startedAt": "2026-03-11T10:00:00Z",
  "updatedAt": "2026-03-11T10:00:00Z",
  "checkpoints": [],
  "data": {
    "workItemTitle": "",
    "workItemType": "",
    "branchName": "",
    "branchType": "",
    "prUrl": "",
    "prId": null,
    "doneBranchTarget": "main",
    "originalState": "",
    "testResults": {
      "total": 0,
      "passed": 0,
      "failed": 0,
      "skipped": 0
    },
    "filesChanged": [],
    "crossPlugin": {
      "teams": { "status": "pending", "messageId": null },
      "outlook": { "status": "pending", "messageId": null }
    }
  }
}
```

## Phase 0: Pre-Flight

Check before doing any work:

```bash
# 1. Check Azure DevOps CLI is available
az devops --help > /dev/null 2>&1

# 2. Check org/project configuration
az devops configure --list

# 3. Verify current directory is a git repo
git rev-parse --git-dir

# 4. Verify working tree is clean
git status --porcelain
# Must return empty output

# 5. Verify Azure DevOps authentication
az account show --output json

# 6. Verify work item exists and is accessible
az boards work-item show --id {workItemId} --output json
```

If any check fails, list all failures with remediation steps and abort:

| Check | Failure | Remediation |
|-------|---------|-------------|
| CLI missing | `az devops` not found | `az extension add --name azure-devops` |
| No defaults | Org/project not configured | `az devops configure --defaults organization=... project=...` |
| Not a repo | `.git` not found | Navigate to a git repository |
| Dirty tree | Uncommitted changes | Commit or stash changes first |
| Auth failed | Not logged in | `az login` or set `AZURE_DEVOPS_EXT_PAT` |
| Work item 404 | ID not found or no access | Verify ID and project permissions |

## Phase 1: Fetch Work Item

```bash
az boards work-item show --id {workItemId} --expand relations --output json
```

Extract and store these fields:

| Field | JSON Path | Purpose |
|-------|-----------|---------|
| Title | `fields.System.Title` | Branch name, PR title |
| Description | `fields.System.Description` | Requirements context |
| Acceptance Criteria | `fields.Microsoft.VSTS.Common.AcceptanceCriteria` | Test validation |
| Work Item Type | `fields.System.WorkItemType` | Branch prefix |
| State | `fields.System.State` | Validate not already done |
| Assigned To | `fields.System.AssignedTo.uniqueName` | PR reviewer |
| Priority | `fields.Microsoft.VSTS.Common.Priority` | Urgency context |
| Iteration Path | `fields.System.IterationPath` | Sprint context |
| Area Path | `fields.System.AreaPath` | Team context |
| Story Points | `fields.Microsoft.VSTS.Scheduling.StoryPoints` | Effort context |
| Tags | `fields.System.Tags` | Classification |
| Relations | `relations` | Parent/child hierarchy |

Also resolve:
- **Parent work item** — for epic/feature context
- **Child tasks** — for implementation sub-steps
- **Related items** — for dependency awareness

If work item is already in Resolved or Closed state, warn and ask whether to proceed.

Display a summary to the user:

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

Proceed with implementation?
```

## Phase 2: Branch

### Branch Naming Convention

```
{type}/{workItemId}-{slug}
```

Where:
- `type` = branch prefix based on work item type and priority
- `workItemId` = the Azure DevOps work item ID
- `slug` = title in kebab-case, truncated to 50 characters

| Work Item Type | Priority | Branch Prefix |
|---------------|----------|---------------|
| Bug | 1 (Critical) | `hotfix/` |
| Bug | 2-4 | `bugfix/` |
| User Story | Any | `feature/` |
| Task | Any | `feature/` |
| Feature | Any | `feature/` |

### Branch Creation

```bash
# Generate slug from title
SLUG=$(echo "{title}" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | head -c 50)

# Check if branch already exists
git branch --list "{type}/{workItemId}-*"

# If exists, check it out
git checkout {existing_branch}

# If not, create new branch from main
git checkout main
git pull origin main
git checkout -b {type}/{workItemId}-{slug}
```

## Phase 3: Explore

Analyze the codebase to understand the implementation context.

Steps:
1. Parse work item title + description for domain keywords
2. Search codebase for related files using keywords
3. Identify the project structure (language, framework, test setup)
4. Find existing patterns that the implementation should follow
5. Map which files will likely need changes

```bash
# Identify project type
ls -la  # Check for package.json, *.csproj, go.mod, requirements.txt, etc.

# Search for related code
grep -rl "{keyword}" --include="*.{ext}" .

# Check test structure
find . -name "*test*" -o -name "*spec*" | head -20

# Check CI/CD pipeline definitions
find . -name "azure-pipelines.yml" -o -name ".azure-pipelines" -o -name "pipeline*.yml"
```

Save output to `sessions/ship/{workItemId}/context.md`.

## Phase 4: Plan

Create an implementation plan covering:

1. **Files to modify** — existing files that need changes
2. **Files to create** — new files for the feature
3. **Interfaces** — key data structures and API contracts
4. **Test strategy** — what tests to add and which existing tests to update
5. **Risks** — breaking changes, shared code, migration needs
6. **Estimated effort** — based on file count and complexity

**Checkpoint**: Present plan to user. Ask: "Does this plan look right? Should I proceed with implementation?"

Save to `sessions/ship/{workItemId}/plan.md`.

## Phase 5: Code

Implement according to the plan:

- Follow existing code patterns found in Explore
- Write tests alongside implementation
- Keep changes minimal and focused on the work item
- Match existing code style (indentation, naming, error handling)
- Add inline comments for non-obvious logic only

After implementation, show the diff:

```bash
git diff --stat
git diff
```

**Checkpoint**: Ask: "Here's the diff. Ready to run tests?"

## Phase 6: Test

Detect and run the test suite:

| Framework | Detection | Run Command |
|-----------|-----------|-------------|
| Jest | `package.json` has jest | `npx jest --ci` |
| Mocha | `package.json` has mocha | `npx mocha` |
| pytest | `pytest.ini` or `conftest.py` | `python -m pytest` |
| .NET xUnit/NUnit | `*.csproj` with test references | `dotnet test` |
| Go | `*_test.go` files | `go test ./...` |
| Maven | `pom.xml` | `mvn test` |
| Gradle | `build.gradle` | `./gradlew test` |

Execution:
1. Run relevant tests (tests in changed directories first)
2. If all pass → proceed
3. If tests fail → attempt one fix cycle
4. If still failing after fix → surface failures to user with details

```
Test Results: {passed}/{total} passed, {failed} failed, {skipped} skipped
```

## Phase 7: Commit + PR

### Commit Message Format

```
{type}(#{workItemId}): {title}

{description of what changed and why}

Work Item: #{workItemId}
AB#{workItemId}
```

Where `type` is:
- `feat` — new feature (User Story)
- `fix` — bug fix (Bug)
- `refactor` — refactoring (Task / Tech Debt)
- `docs` — documentation only
- `test` — test only changes
- `chore` — build/CI changes

The `AB#{workItemId}` tag auto-links the commit to Azure DevOps.

### PR Creation

For Azure DevOps repos:
```bash
az repos pr create \
  --title "{type}(#{workItemId}): {title}" \
  --description "## Summary\n{description}\n\n## Work Item\nAB#{workItemId}\n\n## Changes\n{file list}\n\n## Test Results\n{test summary}" \
  --source-branch "{branchName}" \
  --target-branch "main" \
  --work-items {workItemId} \
  --reviewers "{assignedTo}" \
  --org {org} --project {project} \
  --output json
```

For GitHub repos (with ADO integration):
```bash
git push -u origin {branchName}
gh pr create \
  --title "{type}(#{workItemId}): {title}" \
  --body "## Summary\n{description}\n\n## Work Item\nAB#{workItemId}\n\n## Changes\n{file list}\n\n## Test Results\n{test summary}"
```

### PR Body Template

```markdown
## Summary
{Brief description of what this PR does}

## Work Item
AB#{workItemId}: {title}

## Changes
{List of files changed with brief descriptions}

## Test Results
- Total: {total}
- Passed: {passed}
- Failed: {failed}
- Skipped: {skipped}

## Acceptance Criteria Validation
{Map each acceptance criterion to how it's addressed}

## Screenshots / Evidence
{If applicable}
```

## Phase 8: Update Azure DevOps

### Work Item State Transitions

```
New → Active → Resolved → Closed
```

After PR creation, transition to Resolved:

```bash
# Update state
az boards work-item update \
  --id {workItemId} \
  --state "Resolved" \
  --org {org} --project {project}

# Add PR link as artifact relation
az boards work-item relation add \
  --id {workItemId} \
  --relation-type "ArtifactLink" \
  --target-url "vstfs:///Git/PullRequestId/{projectId}/{repoId}/{prId}" \
  --org {org} --project {project}
```

Add a comment to the work item:

```bash
az boards work-item update \
  --id {workItemId} \
  --discussion "Implemented by Claude Code. PR: {prUrl}\nBranch: {branchName}" \
  --org {org} --project {project}
```

## Resume

```bash
# Resume from last checkpoint
/azure-devops-orchestrator:ship {workItemId} --resume

# Check current state
/azure-devops-orchestrator:ship {workItemId} --status

# Resume from specific state
/azure-devops-orchestrator:ship {workItemId} --from=CODE_COMPLETE
```

Read `sessions/ship/{workItemId}/state.json` to determine where to resume.

## Dry Run

When `--dry-run` is passed:
- Run all pre-flight checks
- Fetch and display work item details
- Propose branch name
- Run explore phase and show affected files
- Estimate effort
- Show proposed PR title
- Show what DevOps updates would be applied
- Do NOT create branches, write files, create PRs, or update work items

## Error Handling

| Error | Recovery |
|-------|----------|
| Pre-flight fails | List issues + remediation, abort |
| Work item not found | Verify ID, check project access |
| Work item already Resolved/Closed | Warn user, ask to proceed or abort |
| Branch conflict | Check out existing branch, ask user |
| Tests fail after 1 retry | Surface failures, ask: fix manually or skip |
| PR creation fails | Show error, provide manual command |
| Work item update fails | Show error, provide manual az command |
| Rate limit (429) | Wait for Retry-After, retry once |
