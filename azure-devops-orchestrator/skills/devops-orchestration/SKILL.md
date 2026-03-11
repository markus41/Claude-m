---
name: Azure DevOps Orchestration
description: >
  Intelligence-layer orchestrator for Azure DevOps — shipping work items end-to-end with
  Claude Code, triaging backlogs with WSJF scoring, planning sprints with capacity analysis,
  orchestrating pipelines and releases, monitoring DORA metrics, balancing workloads, and
  delegating to Teams/Outlook/PowerBI when those plugins are installed. Trigger on:
  "azure devops orchestrator", "devops orchestrator", "ship work item", "ship devops",
  "implement work item", "devops sprint planning", "devops backlog triage",
  "devops pipeline orchestration", "devops release coordination", "azure devops health",
  "devops workload balance", "devops retrospective", "DORA metrics", "sprint velocity",
  "work item triage", "pipeline failure analysis", "release gate validation",
  "devops portfolio".
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
  - Agent
  - AskUserQuestion
  - WebFetch
  - WebSearch
  - mcp__azure-devops__azure_devops_get_work_item
  - mcp__azure-devops__azure_devops_create_work_item
  - mcp__azure-devops__azure_devops_update_work_item
  - mcp__azure-devops__azure_devops_list_work_items
  - mcp__azure-devops__azure_devops_create_pull_request
  - mcp__azure-devops__azure_devops_get_pipeline
  - mcp__azure-devops__azure_devops_list_pipelines
  - mcp__azure-devops__azure_devops_run_pipeline
  - mcp__azure-devops__azure_devops_get_build
  - mcp__azure-devops__azure_devops_list_builds
  - mcp__azure-devops__azure_devops_get_release
  - mcp__azure-devops__azure_devops_list_releases
  - mcp__azure-devops__azure_devops_get_repository
  - mcp__azure-devops__azure_devops_list_repositories
  - mcp__azure-devops__azure_devops_run_wiql_query
  - mcp__powerbi-modeling__powerbi_get_datasets
  - mcp__powerbi-modeling__powerbi_execute_query
  - mcp__powerbi-modeling__powerbi_push_rows
  - mcp__playwright__browser_navigate
  - mcp__playwright__browser_snapshot
  - mcp__playwright__browser_click
  - mcp__playwright__browser_type
  - mcp__playwright__browser_screenshot
  - mcp__markitdown__markitdown_convert
  - mcp__markitdown__markitdown_convert_url
  - mcp__microsoft-learn__microsoft_learn_search
  - mcp__microsoft-learn__microsoft_learn_get_document
triggers:
  - "azure devops orchestrator"
  - "devops orchestrator"
  - "ship work item"
  - "ship devops"
  - "implement work item"
  - "devops sprint planning"
  - "devops backlog triage"
  - "devops pipeline orchestration"
  - "devops release coordination"
  - "azure devops health"
  - "devops workload balance"
  - "devops retrospective"
  - "DORA metrics"
  - "sprint velocity"
  - "work item triage"
  - "pipeline failure analysis"
  - "release gate validation"
  - "devops portfolio"
---

# Azure DevOps Orchestration

## MCP Servers

Eight Microsoft MCP servers are configured in `.mcp.json` and available to all agents:

| Server | Package | What it provides |
|--------|---------|-----------------|
| `azure` | `@azure/mcp` | Azure resource management — subscriptions, resource groups, resources |
| `azure-devops` | `@microsoft/azure-devops-mcp` | Work items, repos, pipelines, PRs, boards, sprints |
| `powerbi-modeling` | `@microsoft/powerbi-modeling-mcp` | DAX queries, dataset push, report operations |
| `playwright` | `@playwright/mcp` | Browser automation — E2E testing in ship workflow |
| `devbox` | `@microsoft/devbox-mcp` | Dev Box provisioning and management |
| `m365-toolkit` | `@microsoft/m365agentstoolkit-mcp` | Teams app validation, M365 resource provisioning |
| `markitdown` | `markitdown[mcp]` (uvx) | Convert PDFs, DOCX, XLSX attachments to Markdown |
| `microsoft-learn` | `https://learn.microsoft.com/api/mcp` | Official Microsoft documentation (no auth needed) |

**Auth**: The Azure DevOps MCP server supports PAT (`AZURE_DEVOPS_AUTH_METHOD=pat`) or DefaultAzureCredential. The Azure MCP server uses DefaultAzureCredential — `az login` is sufficient for local use. `markitdown` and `playwright` require no auth. `microsoft-learn` is public.

## Architecture

The azure-devops-orchestrator sits above the `azure-devops` plugin as an intelligent layer. It uses native MCP tools for Azure DevOps operations and composes them with `az devops` CLI commands and REST API calls for the full range of orchestration workflows.

**Dependency chain:**
```
azure-devops-orchestrator (intelligence layer)
    |
    |-- Workflow state management
    |-- Multi-step orchestration with checkpoints
    |-- Cross-plugin delegation (Teams, Outlook, Power BI)
    |-- DORA metrics and health scoring
    |
    +-- azure-devops (API / CLI toolkit layer)
    |       |
    |       +-- Azure DevOps REST API (https://dev.azure.com/{org}/{project}/_apis/...)
    |       +-- az devops CLI (az boards, az pipelines, az repos)
    |       +-- Azure DevOps MCP Server (@microsoft/azure-devops-mcp)
    |
    +-- Optional cross-plugin integrations
            +-- microsoft-teams-mcp     -> adaptive card notifications
            +-- microsoft-outlook-mcp   -> email digests and alerts
            +-- powerbi-fabric          -> DORA metrics dashboards
            +-- azure-monitor           -> pipeline infrastructure alerts
```

**Key distinction:**
- `azure-devops` = **toolkit** — raw CRUD operations on work items, pipelines, repos, boards
- `azure-devops-orchestrator` = **intelligence** — multi-step workflows, capacity analysis, WSJF scoring, DORA metrics, state management, cross-plugin integration

### Relationship to azure-devops Toolkit

The `azure-devops` plugin provides five skill areas: Boards, Repos, Pipelines, Testing, and Admin.
This orchestrator never duplicates those skills. Instead, it composes them into workflows:

| Orchestrator Workflow | azure-devops Skills Used |
|---|---|
| Ship Workflow | Boards (fetch/update work item) + Repos (branch, PR) + Pipelines (trigger CI) |
| Backlog Triage | Boards (WIQL query, bulk update, area paths) |
| Sprint Planning | Boards (iterations, capacity, work items) |
| Pipeline Orchestration | Pipelines (builds, runs, logs) + Testing (test results) |
| Release Coordination | Pipelines (environments, approvals) + Boards (release notes from work items) |
| Health/DORA Metrics | Pipelines (builds, deployments) + Boards (work item history) |

## Plugin Detection Pattern

Before calling another plugin, verify it is installed:

```
Check if microsoft-teams-mcp is available by attempting to list its tools.
If available, use it to post the summary card.
If not available, output the summary as plain text and note that installing
microsoft-teams-mcp would enable automatic Teams posting.
```

Never fail silently — always tell the user when a cross-plugin action was skipped and why.

## Azure DevOps Organization and Project Context

All commands require organization and project context. Resolve in this order:

1. **Explicit arguments** — `--org=https://dev.azure.com/myorg --project=MyProject`
2. **Environment variables** — `AZURE_DEVOPS_ORG_URL`, `AZURE_DEVOPS_DEFAULT_PROJECT`
3. **az devops configure** — `az devops configure --defaults organization=... project=...`
4. **Git remote** — parse `origin` remote URL for `dev.azure.com/{org}/{project}`
5. **Ask user** — if none of the above resolve, prompt for org and project

Cache resolved org/project in session state to avoid repeated lookups.

---

## Core Workflows

### 1. Ship Workflow

The `/azure-devops-orchestrator:ship` command transforms an Azure DevOps work item into shipped code:

```
PREFLIGHT -> FETCH -> BRANCH -> EXPLORE -> PLAN -> CODE -> TEST -> COMMIT+PR -> UPDATE
    |          |         |         |         |       |       |         |           |
    v          v         v         v         v       v       v         v           v
 Validate   Get WI    Create   Analyze   Design  Write   Run CI   Push +       Set state
 env +      details   branch   codebase  impl    code    tests   create PR    to Resolved
 auth       + AC      by type  context   plan    + tests + fix                + comment
```

**State tracking** — save progress to `sessions/ship/{workItemId}/state.json` so the workflow is resumable.

**Checkpoints** — the workflow pauses for user confirmation at:
- After PLAN: "Does this implementation plan look right?"
- After CODE: "Ready to run tests? Review the diff first."

#### Phase 0: Pre-Flight

Check before doing any work:
- `azure-devops` plugin is installed and accessible
- Azure DevOps org and project can be resolved
- Current directory is a git repository
- Working tree is clean (no uncommitted changes)
- Authenticated to Azure DevOps (test with a lightweight API call)
- Work item ID exists and is accessible

If any check fails, list all failures with remediation steps and abort.

```bash
# Pre-flight validation commands
az devops configure --list
git rev-parse --git-dir
git status --porcelain
az boards work-item show --id {workItemId} --org {org} --project {project}
```

#### Phase 1: Fetch Work Item

Retrieve work item details from Azure DevOps:

```bash
az boards work-item show --id {workItemId} --expand relations --org {org} --project {project} --output json
```

Extract:
- `System.Title` — becomes the implementation goal
- `System.Description` — requirements and context
- `Microsoft.VSTS.Common.AcceptanceCriteria` — acceptance criteria (User Stories)
- `Microsoft.VSTS.TCM.ReproSteps` — repro steps (Bugs)
- `System.WorkItemType` — Bug, User Story, Task, Feature, Epic
- `System.State` — current state (New, Active, Resolved, Closed)
- `System.AssignedTo` — who owns this (for PR assignees)
- `System.IterationPath` — sprint context
- `System.AreaPath` — team/area context
- `Microsoft.VSTS.Common.Priority` — priority (1=Critical, 2=High, 3=Medium, 4=Low)
- `Microsoft.VSTS.Scheduling.StoryPoints` — effort estimate
- `System.Tags` — classification tags
- Parent/child links — epic/feature hierarchy

Also fetch related work items (children, related, predecessor/successor) for full context.

#### Phase 2: Branch

Create a git branch based on work item type:

| Work Item Type | Priority | Branch Prefix | Example |
|---|---|---|---|
| Bug | 1 (Critical) | `hotfix/` | `hotfix/4524-critical-db-timeout` |
| Bug | 2-4 | `bugfix/` | `bugfix/4521-fix-null-ref-in-auth` |
| User Story | Any | `feature/` | `feature/4522-add-export-to-csv` |
| Task | Any | `feature/` | `feature/4523-add-logging-middleware` |
| Feature | Any | `feature/` | `feature/3456-user-authentication` |
| Epic | Any | `epic/` | `epic/100-platform-modernization` |

Branch naming: `{type}/{workItemId}-{slug}` where slug is the title in kebab-case (max 50 chars).

```bash
git checkout main
git pull origin main
git checkout -b feature/{workItemId}-{slug}
```

Check if a branch for this work item already exists; if so, check it out instead.

#### Phase 3: Explore

Analyze the codebase to understand the implementation context:
- Find files likely affected by the work item
- Identify existing patterns to follow
- Map dependencies and interfaces
- Note test conventions (jest, pytest, xunit, go test, etc.)
- Check for CI/CD pipeline definitions

Output: a context document saved to `sessions/ship/{workItemId}/context.md`

#### Phase 4: Plan

Produce a step-by-step implementation plan:
- Files to create or modify (with rationale)
- Key interfaces, data structures, and contracts
- Test strategy (unit, integration, E2E)
- Risk assessment (breaking changes, shared code, migration needs)
- Mapping of acceptance criteria to implementation steps

**Checkpoint**: Show plan to user. Wait for: "Proceed", "Modify", or "Abort".
Save plan to `sessions/ship/{workItemId}/plan.md`.

#### Phase 5: Code

Implement according to the approved plan:
- Follow existing code patterns discovered in Explore
- Write tests alongside implementation
- Keep changes minimal and focused on the work item scope
- Run `git diff` periodically to verify changes stay on track
- Match existing code style (indentation, naming, error handling)

**Checkpoint**: Show full diff. Ask: "Ready to run tests?"

#### Phase 6: Test

Run the project's test suite:
- Auto-detect test runner (`dotnet test`, `npm test`, `pytest`, `go test`, `mvn test`)
- Run relevant tests first (files changed), then full suite
- On failure: attempt one automated fix cycle, then surface to user
- Record test results for PR description

#### Phase 7: Commit + PR

Create a conventional commit:

```
{type}(#{workItemId}): {title}

{description of what changed and why}

Work Item: #{workItemId}
AB#{workItemId}
```

The `AB#{workItemId}` syntax auto-links the commit to the Azure DevOps work item.

Create PR:

```bash
# For Azure DevOps Git repos
az repos pr create \
  --title "{type}(#{workItemId}): {title}" \
  --description "{body with AB#{workItemId}}" \
  --source-branch "feature/{workItemId}-{slug}" \
  --target-branch "main" \
  --work-items {workItemId} \
  --reviewers "{assignedTo}" \
  --org {org} --project {project}

# For GitHub repos with ADO work item linking
gh pr create --title "{type}(#{workItemId}): {title}" --body "{body with AB#{workItemId}}"
```

PR body includes: summary, changes list, acceptance criteria mapping, test results, and `Resolves AB#{workItemId}`.

#### Phase 8: Update Azure DevOps

After PR is created:
1. Transition work item state: `New` -> `Active` -> `Resolved`
2. Add PR link as artifact relation
3. Add comment with PR URL and summary

```bash
az boards work-item update \
  --id {workItemId} \
  --state "Resolved" \
  --discussion "PR created: {prUrl}. Implementation complete, pending review." \
  --org {org} --project {project}
```

For bugs: set `Microsoft.VSTS.Common.ResolvedReason` to `"Fixed"`.

#### Phase 9: Cross-Plugin Notification

If `microsoft-teams-mcp` is installed, post ship notification adaptive card.
If `microsoft-outlook-mcp` is installed, email assignees with PR link.

Detailed ship workflow reference: [`references/ship-workflow.md`](./references/ship-workflow.md)

---

### 2. Backlog Triage

Inspect all unassigned / unprioritized work items and apply intelligent classification.

**Command patterns:**
```
"Triage the backlog for project MyProject"
"Work item triage for area path MyProject\Backend"
"Triage unassigned items in Sprint 12"
```

#### WSJF Scoring Formula

Weighted Shortest Job First (WSJF) scores each work item for prioritization:

```
WSJF = (Business_Value + Time_Criticality + Risk_Reduction) / Job_Size
```

| Factor | Source | Scale |
|---|---|---|
| Business_Value | Priority field mapping: P1=10, P2=8, P3=5, P4=2. Has stakeholder tag: +2 | 1-10 |
| Time_Criticality | Days until TargetDate. Overdue=10, this week=8, this sprint=5, no date=1. Blocking others: +3 | 1-10 |
| Risk_Reduction | Bug severity: Critical=10, High=8, Medium=5, Low=2. Security tag=5, compliance=5, tech-debt=4, default=1 | 1-10 |
| Job_Size | StoryPoints if set. Otherwise estimate from child task count: 0-1=1, 2-3=2, 4-6=3, 7-10=5, 11+=8. Or from Effort/RemainingWork fields | 1-13 |

#### Priority Classification Rules

```
WSJF >= 8.0  -->  Priority 1 (Critical)   -- tag: "P1-Critical"
WSJF >= 5.0  -->  Priority 2 (High)       -- tag: "P2-High"
WSJF >= 2.5  -->  Priority 3 (Medium)     -- tag: "P3-Medium"
WSJF <  2.5  -->  Priority 4 (Low)        -- tag: "P4-Low"
```

#### Label Classification

Analyze title, description, and tags to assign labels:

| Signal | Classification | Priority Boost |
|---|---|---|
| Title contains "bug", "fix", "broken", "error", "crash", "regression" | Bug | +0 |
| Title contains "security", "vulnerability", "CVE" | Bug | +2 (min P1) |
| Title contains "feature", "add", "implement", "build", "create" | User Story | +0 |
| Title contains "refactor", "cleanup", "tech debt", "improve", "optimize" | Task (Tech Debt) | +0 |
| Title contains "docs", "documentation", "readme" | Task | -1 |
| Title contains "blocked", "waiting", "dependency" | Blocked tag | +0 |
| Title contains "spike", "investigate", "research", "POC" | Spike tag | +0 |
| Has due date within 7 days | — | +1 |
| Overdue | — | +2 (min P1) |
| Has predecessor links with open items | Blocked tag | +0 |

#### Routing Logic (Area Path to Assignee)

Build an assignment pattern map from existing work items:

```
1. Query all resolved/closed items in the last 90 days
2. Group by AreaPath -> count assignments per team member
3. For each unassigned item, match AreaPath -> suggest the team member
   with the highest historical assignment count AND lowest current open item count
```

Routing rules:
- If area path has a single primary contributor (>60% of resolved items), suggest them
- If area path has balanced contributors, suggest the one with lowest current workload
- If area path has no historical data, leave unassigned and flag for manual routing

#### Bulk Update Execution

After showing the triage report, ask for confirmation, then execute:

```bash
# Update priority
az boards work-item update --id {id} \
  --fields "Microsoft.VSTS.Common.Priority={priority}" \
  --org {org} --project {project}

# Update tags (append, do not replace)
az boards work-item update --id {id} \
  --fields "System.Tags={existing_tags}; {new_tag}" \
  --org {org} --project {project}

# Assign
az boards work-item update --id {id} \
  --fields "System.AssignedTo={email}" \
  --org {org} --project {project}
```

#### Triage Report Format

```
## Backlog Triage Report -- {Project} / {Area Path}

**Scanned**: {total} items | **Needs Action**: {count} | **Auto-classified**: {count}

### Priority Assignments
| ID | Title | Type | WSJF | Priority | Assignee | Action |
|----|-------|------|------|----------|----------|--------|
| 1234 | Fix auth crash | Bug | 9.2 | P1-Critical | alice@ | Assign + prioritize |

### Blocked Items
| ID | Title | Blocked By | Days Blocked |
|----|-------|------------|--------------|

### Stale Items (no update > 14 days)
| ID | Title | Assignee | Last Updated | Suggested Action |
|----|-------|----------|--------------|------------------|

### Recommended Actions
1. Assign #1234 to @alice -- highest WSJF, matches area path expertise
2. Escalate #1235 -- blocked for 7 days, no resolution path
3. Close #1236 -- duplicate of #1100 (90% title similarity)

### Cross-Plugin Actions
- [ ] Teams: Posted triage summary to #{channel}
- [ ] Outlook: Digest skipped -- install microsoft-outlook-mcp to enable
```

---

### 3. Sprint Planning

Plan a sprint by calculating capacity, scoring the backlog, and distributing work.

**Command patterns:**
```
"Plan sprint 12 for team Frontend"
"Devops sprint planning for current iteration"
"Sprint velocity report for the last 5 sprints"
```

#### Capacity Calculation

```
Total_Capacity = team_size * sprint_days * hours_per_day * (1 - overhead_pct)
```

| Parameter | Source | Default |
|---|---|---|
| `team_size` | Count of team members from iteration capacity API | -- |
| `sprint_days` | `(finishDate - startDate)` from iteration attributes, minus weekends/holidays | -- |
| `hours_per_day` | Team setting or default | 6 |
| `overhead_pct` | Meetings, reviews, ceremonies | 0.20 (20%) |

Per-member capacity accounts for days off:

```
Member_Capacity = (sprint_days - days_off) * hours_per_day * (1 - overhead_pct)
```

Query capacity:
```bash
# Get team iteration capacities
az devops invoke \
  --area work \
  --resource capacities \
  --route-parameters team={team} iterationId={iterationId} \
  --org {org} --project {project}

# Or from iteration dates
az boards iteration list --team {team} --org {org} --project {project} --output json
```

#### Velocity Tracking

Calculate velocity from the last N sprints (default: 5):

```
For each past sprint:
  1. Query items in that iteration path with state = Closed/Resolved
  2. Sum StoryPoints (or count items if no points)
  3. Record: sprint_name, planned_points, completed_points, completion_rate
```

```
Average_Velocity = sum(completed_points) / N
Velocity_StdDev = stddev(completed_points)
Recommended_Commitment = Average_Velocity - (0.5 * Velocity_StdDev)  # conservative
```

#### WSJF Selection

From the product backlog (items not in any iteration):
1. Score all items using WSJF formula (see Backlog Triage)
2. Sort descending by WSJF
3. Pull items until `sum(StoryPoints) >= Recommended_Commitment`
4. Check for dependency chains — if an item has a predecessor not in the sprint, flag it

#### Workload Distribution

After selecting items for the sprint:
1. Group by area path to determine team/component affinity
2. Match items to team members based on:
   - Historical area path assignments (primary contributor pattern)
   - Current load balance (target equal distribution)
   - Skill tags if available
3. Verify no member exceeds their personal capacity
4. Flag items that cannot be assigned (no area path match, all members at capacity)

#### Sprint Plan Output

```
## Sprint Plan -- {Sprint Name} ({start} to {finish})

**Team**: {team_name} | **Members**: {count} | **Total Capacity**: {hours}h
**Velocity (5-sprint avg)**: {avg} pts | **Recommended Commitment**: {rec} pts

### Selected Items (by WSJF)
| # | ID | Title | Type | Points | WSJF | Assignee | Area |
|---|-----|-------|------|--------|------|----------|------|
| 1 | 1234 | Auth login | Story | 5 | 9.2 | alice@ | Frontend |

**Total Points**: {sum} | **Capacity Used**: {pct}%

### Workload Distribution
| Member | Assigned Points | Capacity (hrs) | Load % | Status |
|--------|----------------|----------------|--------|--------|
| alice@ | 13 | 38.4 | 85% | OK |
| bob@   | 8  | 38.4 | 52% | Under-loaded |

### Dependency Warnings
- #1234 depends on #1100 (not in sprint, State: Active)

### Carryover from Previous Sprint
| ID | Title | Points | Reason |
|----|-------|--------|--------|
```

On confirmation, update each work item's iteration path:

```bash
az boards work-item update \
  --id {id} \
  --iteration "{project}\\{iteration}" \
  --org {org} --project {project}
```

---

### 4. Pipeline Orchestration

Monitor, analyze, and remediate pipeline failures across the project.

**Command patterns:**
```
"Devops pipeline orchestration for project MyProject"
"Pipeline failure analysis for the last 7 days"
"Analyze flaky tests in pipeline 'CI-Main'"
"Pipeline health report"
```

#### Build Failure Taxonomy

Every failed build is classified into one of these categories:

| Category | Detection Pattern | Severity |
|---|---|---|
| Compilation | Log contains `error CS`, `error TS`, `BUILD FAILED`, `COMPILE ERROR`, MSBuild errors | High |
| Test Failure | Log contains `FAIL`, `Tests failed`, `Assert`, non-zero exit from test runner | Medium |
| Infrastructure | Log contains `Agent unavailable`, `Timeout`, `Container failed to start`, `Disk full` | High |
| Timeout | Build duration > 2x average, or `TimeoutExceeded` in result | Medium |
| Flaky Test | Same test passes/fails intermittently across recent runs | Low |
| Dependency | Log contains `Could not resolve`, `Package not found`, `Feed error`, NuGet/npm restore | Medium |
| Permission | Log contains `403 Forbidden`, `Access denied`, `Unauthorized` | High |
| Configuration | Log contains `Variable not found`, `File not found`, `Invalid YAML` | Medium |
| Security Scan | Vulnerability scanner found critical/high issues | High |
| Deployment | Target unavailable, slot swap failed, container crash | High |

#### Root Cause Analysis Flow

```
1. Fetch the failed build:
   az pipelines build show --id {buildId} --org {org} --project {project}

2. Get build timeline for stage/job/task breakdown:
   GET /_apis/build/builds/{buildId}/timeline?api-version=7.1

3. Get build logs for the failed task:
   GET /_apis/build/builds/{buildId}/logs/{logId}?api-version=7.1

4. Classify failure using taxonomy patterns

5. For test failures, fetch test run results:
   GET /{project}/_apis/test/runs?buildUri={buildUri}
   GET /{project}/_apis/test/runs/{runId}/results?outcomes=Failed

6. For flaky tests, fetch last 10 runs of the same pipeline:
   az pipelines build list --definition-ids {pipelineId} --top 10
   Compare test results across runs

7. Generate remediation recommendations
```

#### Remediation Actions

| Failure Category | Automated Action | Manual Escalation |
|---|---|---|
| Compilation | Show error + file + line. Suggest fix if pattern-matched. | "Review compilation error in {file}:{line}" |
| Test Failure | Show failing test + assertion. Link to test file. | "Fix failing test: {testName}" |
| Infrastructure | Check agent pool health. Suggest retry. | "Agent pool {pool} may be unhealthy" |
| Timeout | Compare duration to baseline. Suggest timeout increase or optimization. | "Pipeline exceeds {x}min baseline" |
| Flaky Test | Mark test with quarantine attribute. Create bug work item. | "Quarantine flaky test: {testName}" |
| Dependency | Check feed availability. Suggest version pin or cache clear. | "Package feed {feed} unreachable" |
| Permission | Check service connection. Verify token expiry. | "Service connection {name} needs re-auth" |
| Configuration | Validate YAML syntax, check variable groups. | "Fix pipeline YAML or variable config" |

#### Flaky Test Detection

Algorithm:
```
For each test in the pipeline's test results:
  1. Collect outcomes from the last 10 pipeline runs
  2. If test has >= 2 failures AND >= 2 passes in those 10 runs, it is flaky
  3. Calculate flakiness_rate = min(pass_count, fail_count) / total_runs
  4. If flakiness_rate > 0.10 (>10% flip rate), mark as flaky
  5. Rank flaky tests by flakiness_rate descending
```

Auto-create a Bug work item for each newly detected flaky test:
```bash
az boards work-item create --type Bug \
  --title "Flaky test: {testName}" \
  --description "Test {testName} failed {n}/10 recent runs. Flakiness rate: {pct}%." \
  --fields "System.Tags=flaky-test; auto-detected" "Microsoft.VSTS.Common.Priority=3" \
  --org {org} --project {project}
```

#### Pipeline Health Report

```
## Pipeline Health Report -- {Project}

**Period**: {start} to {end} | **Pipelines Monitored**: {count}

### Pipeline Summary
| Pipeline | Runs | Pass | Fail | Pass Rate | Avg Duration | Trend |
|----------|------|------|------|-----------|--------------|-------|
| CI-Main  | 45   | 40   | 5    | 88.9%     | 12m 30s      | UP    |

### Failure Breakdown
| Category | Count | % of Failures | Top Offender |
|----------|-------|---------------|--------------|
| Test     | 3     | 60%           | LoginTests   |
| Infra    | 2     | 40%           | Agent pool 3 |

### Flaky Tests
| Test Name | Pipeline | Flakiness Rate | Last Failure | Bug # |
|-----------|----------|----------------|--------------|-------|

### Performance Regression
| Pipeline | Baseline | Recent Avg | Change | Status |
|----------|----------|------------|--------|--------|

### Recommended Actions
1. Quarantine "LoginTests.TestTimeout" -- 40% flakiness rate
2. Investigate Agent Pool 3 -- 2 infra failures this week
```

Detailed pipeline patterns: [`references/pipeline-patterns.md`](./references/pipeline-patterns.md)

---

### 5. Release Coordination

Coordinate releases across environments with gate validation, approval management,
and automated release notes.

**Command patterns:**
```
"Devops release coordination for pipeline CI-Main"
"Release gate validation for staging environment"
"Generate release notes for Sprint 12"
"Promote build 456 to production"
```

#### Gate Types

| Gate Type | Purpose | Validation Check |
|---|---|---|
| Approval | Human sign-off before promotion | Check approval status via environment checks API |
| Quality | Minimum test pass rate / code coverage | Query test run results, compare to threshold |
| Deployment | Previous environment healthy | Health check endpoint returns 200 |
| Security Scan | No critical vulnerabilities | Query security scan results from pipeline artifacts |
| Change Window | Deploy only during allowed hours | Compare current time to business hours gate config |
| Work Items | All linked items resolved | Query linked work items for state |

#### Environment Promotion Flow

```
Dev (auto-deploy on PR merge)
  |
  +-- Quality Gate: >90% test pass rate
  |
  v
Staging (manual trigger or scheduled)
  |
  +-- Quality Gate: >95% test pass rate
  +-- Security Gate: No critical/high vulnerabilities
  +-- Approval Gate: QA lead sign-off
  |
  v
Production (manual trigger with approval)
  |
  +-- Approval Gate: Release manager + product owner
  +-- Change Window Gate: Business hours only (or exception approved)
  +-- Deployment Gate: Staging health check passing
  +-- Work Items Gate: All linked items in Resolved state
  |
  v
Post-Deployment Validation
  +-- Smoke tests pass
  +-- Error rate < baseline + 5%
  +-- Rollback if validation fails within 30 minutes
```

#### Rollback Triggers

Automatic rollback recommendation when:
- Post-deployment smoke tests fail
- Error rate exceeds baseline + 5% within 30 minutes
- Health check endpoint returns non-200 for > 3 minutes
- Deployment duration exceeds 3x average (likely stuck)

#### Release Notes Generation

Auto-generate release notes from work items linked to builds between the previous release
and the current one:

```
1. Get the last successful production deployment build number
2. Get the current build number
3. Query all work items linked to commits between those builds:
   GET /_apis/build/builds/{buildId}/workitems
4. Group by work item type (Features, Bug Fixes, Improvements)
5. Format release notes using template
```

#### Release Health Scoring

| Metric | Weight | Green | Yellow | Red |
|---|---|---|---|---|
| Gate pass rate | 30% | All gates passed | 1 gate required retry | Any gate failed |
| Deployment duration | 20% | <= baseline | <= 2x baseline | > 2x baseline |
| Post-deploy error rate | 30% | <= baseline | <= baseline + 3% | > baseline + 5% |
| Rollback count | 20% | 0 | 0 (but close call) | >= 1 |

Detailed release workflows: [`references/release-workflow.md`](./references/release-workflow.md)

---

### 6. Health Monitoring and DORA Metrics

Track engineering effectiveness using the four DORA (DevOps Research and Assessment) metrics.

**Command patterns:**
```
"DORA metrics for project MyProject"
"Azure devops health report"
"Sprint velocity trend"
"Deployment frequency for the last 30 days"
```

#### DORA Metrics Definitions

**Deployment Frequency (DF)** — How often code is deployed to production.

```
Computation:
  1. Query production environment deployment history
  2. Count successful deployments in the measurement period
  3. DF = count / days_in_period

Rating:
  Elite:        > 1 per day (on-demand)
  High:         1 per day to 1 per week
  Medium:       1 per week to 1 per month
  Low:          < 1 per month
```

```bash
az pipelines runs list \
  --pipeline-id {prodPipelineId} \
  --result succeeded \
  --top 100 \
  --org {org} --project {project} --output json
```

**Lead Time for Changes (LT)** — Time from commit to production deployment.

```
Computation:
  1. For each production deployment:
     a. Get the build and its source commit timestamp
     b. Get the deployment completion timestamp
     c. LT = deployment_completed - commit_timestamp
  2. Median LT across all deployments

Rating:
  Elite:        < 1 hour
  High:         1 hour to 1 day
  Medium:       1 day to 1 week
  Low:          > 1 week
```

**Mean Time to Recovery (MTTR)** — How long it takes to recover from a production failure.

```
Computation:
  1. Identify production incidents:
     - Failed production deployments followed by a successful deployment
     - Bug work items tagged "production" with Resolved state
  2. For each incident:
     MTTR = resolved_timestamp - incident_created_timestamp
  3. Mean across all incidents

Rating:
  Elite:        < 1 hour
  High:         1 hour to 1 day
  Medium:       1 day to 1 week
  Low:          > 1 week
```

**Change Failure Rate (CFR)** — Percentage of deployments causing a production failure.

```
Computation:
  1. Count total production deployments in the period
  2. Count deployments that resulted in:
     - Immediate rollback
     - Hotfix within 24 hours
     - Production bug filed within 48 hours
  3. CFR = failed_deployments / total_deployments * 100

Rating:
  Elite:        < 5%
  High:         5% to 10%
  Medium:       10% to 30%
  Low:          > 30%
```

#### Health Scoring Rubric

```
Overall Health Score = (DF_score + LT_score + MTTR_score + CFR_score) / 4

Where each metric score:
  Elite  = 100
  High   = 75
  Medium = 50
  Low    = 25
```

| Score Range | Rating | Color |
|---|---|---|
| 90-100 | Elite | Green |
| 70-89 | High | Blue |
| 40-69 | Medium | Yellow |
| 0-39 | Low | Red |

#### Health Report Format

```
## Engineering Health Report -- {Project}

**Period**: {start} to {end} | **Overall Score**: {score}/100 ({rating})

### DORA Metrics
| Metric | Value | Rating | Trend |
|--------|-------|--------|-------|
| Deployment Frequency | 3.2/week | High | UP from 2.1/week |
| Lead Time for Changes | 4.2 hours | High | DOWN from 6.1 hours |
| Mean Time to Recovery | 2.1 hours | High | STABLE |
| Change Failure Rate | 8.3% | High | UP from 6.1% (watch) |

### Sprint Velocity (last 5 sprints)
| Sprint | Planned | Completed | Rate | Scope Change |
|--------|---------|-----------|------|--------------|
| S12    | 34      | 31        | 91%  | +3 items     |

### Pipeline Health
| Pipeline | Pass Rate | Avg Duration | Flaky Tests |
|----------|-----------|--------------|-------------|

### Recommendations
1. CFR trending up -- review test coverage for recent deployments
2. Lead time improved -- continue current PR review practices
```

---

### 7. Workload Balancing

Analyze task distribution across team members and suggest rebalancing.

**Command patterns:**
```
"Devops workload balance for team Frontend"
"Balance workload for current sprint"
"Show overloaded team members"
```

#### Task Distribution Analysis

```
1. Query all active work items in the current iteration:
   WIQL: SELECT ... WHERE [System.IterationPath] = @currentIteration
         AND [System.State] IN ('New', 'Active')

2. Group by System.AssignedTo:
   - Count of items per assignee
   - Sum of StoryPoints per assignee
   - Sum of RemainingWork (hours) per assignee

3. Calculate load percentage:
   Load_Pct = assigned_hours / member_capacity * 100
```

#### Overload Thresholds

| Condition | Threshold | Severity |
|---|---|---|
| Load percentage | > 100% of capacity | Critical -- OVERLOADED |
| Load percentage | > 85% of capacity | Warning -- High Load |
| Open item count | > 8 active items | Warning |
| High-priority items | > 3 P1/P2 items simultaneously | Warning |
| Blocked items | > 2 blocked items (wasted capacity) | Info |
| Load percentage | < 40% of capacity | Info -- Under-loaded |
| Active items | 0 items in current iteration | Info -- Idle |

#### Reassignment Suggestions

Algorithm:
```
1. Identify overloaded members (load > 85%)
2. Identify under-loaded members (load < 40%)
3. For each overloaded member's items, starting with lowest priority:
   a. Skip if item is Active state (work in progress)
   b. Skip if item is P1/P2 (reassignment creates disruption)
   c. Skip if item has blocking dependencies
   d. Check if an under-loaded member has area path affinity for the item
   e. If yes, suggest reassignment
   f. Estimate new load for both members after reassignment
   g. Stop when overloaded member drops below 85% or no valid reassignments remain
```

#### Workload Report Format

```
## Workload Balance -- {Team} / {Sprint}

### Team Distribution
| Member | Items | Points | Hours | Capacity | Load % | Status |
|--------|-------|--------|-------|----------|--------|--------|
| alice@ | 6     | 18     | 32    | 38.4     | 83%    | OK |
| bob@   | 9     | 28     | 48    | 38.4     | 125%   | OVERLOADED |
| carol@ | 2     | 5      | 10    | 38.4     | 26%    | Under-loaded |

### Suggested Reassignments
| Item | From | To | Points | Rationale |
|------|------|----|--------|-----------|
| #1240 | bob@ | carol@ | 5 | Area match, carol@ has capacity |

### After Rebalancing
| Member | Current Load | Projected Load | Delta |
|--------|-------------|----------------|-------|
| bob@   | 125%        | 92%            | -33%  |
| carol@ | 26%         | 39%            | +13%  |
```

---

### 8. Retrospective Analysis

Generate data-driven retrospective insights from sprint metrics.

**Command patterns:**
```
"Devops retrospective for Sprint 12"
"Sprint retrospective analysis"
"Sprint velocity trend analysis"
```

#### Sprint Metrics

For each sprint in the analysis window (default: current + 4 previous):

| Metric | Computation |
|---|---|
| Velocity (planned) | Sum of StoryPoints for items in the iteration at sprint start |
| Velocity (completed) | Sum of StoryPoints for items resolved/closed during the sprint |
| Completion Rate | completed / planned * 100 |
| Scope Change | Items added after sprint start (delta between start and end item count) |
| Escaped Defects | Bugs created with `FoundIn` build from this sprint's releases |
| Cycle Time | Average time from Active to Resolved for items completed in the sprint |
| Blocked Time | Total days items spent in Blocked state during the sprint |
| PR Turnaround | Average time from PR created to PR completed |

#### Data Collection

```bash
# Get iteration dates
az boards iteration team show --team {team} --id {iterationId} \
  --org {org} --project {project}

# Items completed in iteration (WIQL)
# SELECT ... WHERE IterationPath = sprint AND State IN (Resolved, Closed)
#   AND ChangedDate >= sprintStart AND ChangedDate <= sprintEnd

# Scope change detection: compare work item revisions
# GET /_apis/wit/workitems/{id}/revisions
# Check if IterationPath was set to this sprint after startDate

# Escaped defects
# WIQL: Bugs WHERE CreatedDate > sprintEnd AND Tags CONTAINS 'production'
```

#### Trend Analysis

Compare metrics across sprints to identify patterns:

```
Velocity Trend:
  - Increasing: Team is growing capacity or estimation is improving
  - Decreasing: Team may be overcommitting or losing capacity
  - Stable: Mature team with consistent delivery

Scope Change Trend:
  - Increasing: Sprint planning discipline is degrading
  - > 20% scope change: Flag as unhealthy

Completion Rate Trend:
  - < 70% for 3+ sprints: Systemic overcommitment
  - > 95% for 3+ sprints: Possible sandbagging (not stretching enough)

Escaped Defects Trend:
  - Increasing: Quality practices need review
  - Correlate with test coverage changes
```

#### Burndown Patterns

Detect burndown anti-patterns:

| Pattern | Detection | Implication |
|---|---|---|
| Cliff | > 50% of points completed in last 2 days | Late integration, insufficient testing time |
| Plateau | No progress for > 3 consecutive days mid-sprint | Blocked items or context switching |
| Scope Creep | Total points increasing after day 2 | Mid-sprint scope additions |
| Ideal | Roughly linear decline from planned to 0 | Healthy delivery cadence |
| Front-loaded | > 50% of points completed in first 3 days | Possible carry-over from previous sprint |

#### Retrospective Report Format

```
## Sprint Retrospective -- {Sprint Name} ({start} to {finish})

### Key Metrics
| Metric | This Sprint | Previous | Trend |
|--------|-------------|----------|-------|
| Velocity (completed) | 31 pts | 28 pts | +10.7% |
| Completion Rate | 91% | 85% | +6% |
| Scope Change | +3 items | +5 items | Improving |
| Escaped Defects | 1 | 3 | Improving |
| Avg Cycle Time | 3.2 days | 4.1 days | -22% |
| Avg PR Turnaround | 4.5 hours | 6.2 hours | -27% |

### Burndown Analysis
Pattern: Near-ideal with minor cliff on day 9
Recommendation: Break large items into smaller deliverables

### Velocity Trend (5 sprints)
| Sprint | Planned | Completed | Rate |
|--------|---------|-----------|------|
| S8     | 30      | 24        | 80%  |
| S9     | 28      | 25        | 89%  |
| S10    | 32      | 27        | 84%  |
| S11    | 34      | 28        | 82%  |
| S12    | 34      | 31        | 91%  |

### What Went Well
- Velocity increased 10.7% over previous sprint
- PR turnaround improved significantly (-27%)
- Escaped defects trending down

### Areas for Improvement
- 3 items added mid-sprint (scope discipline)
- 2 items blocked for > 2 days (dependency management)

### Action Items
1. [ ] Introduce WIP limits on Active column (max 3 per person)
2. [ ] Schedule dependency review at sprint start
3. [ ] Pair on large items to avoid late-sprint cliffs
```

---

### 9. Cross-Plugin Integration

The orchestrator can delegate to other installed plugins for notifications, emails, and dashboards.

#### Plugin Detection Pattern

Before calling any external plugin, verify it is installed:

```
1. Attempt a lightweight tool call (e.g., list Teams channels or get inbox count)
2. If it succeeds, the plugin is available -- proceed
3. If it fails with "tool not found" or similar, skip gracefully
4. Always note skipped actions in the output:
   "Teams notification skipped -- install microsoft-teams-mcp to enable"
```

Never fail on a missing optional plugin. Degrade gracefully and tell the user what they are missing.

#### Integration Matrix

| Plugin | Used For | Trigger Events |
|---|---|---|
| `microsoft-teams-mcp` | Adaptive card notifications | Ship complete, triage done, sprint planned, deadline alert, release promoted |
| `microsoft-outlook-mcp` | Email digests and alerts | Weekly health digest, overdue item alerts, release notes distribution |
| `powerbi-fabric` | Dashboard export | DORA metrics dataset, velocity trends, workload distribution |
| `azure-monitor` | Infrastructure correlation | Pipeline infra failures linked to Azure resource health |

#### Graceful Degradation

```
For each cross-plugin action:
  1. CHECK: Is the plugin available? (lightweight probe)
  2. ATTEMPT: Call the plugin with the prepared payload
  3. SKIP: If unavailable, log: "[Plugin] action skipped -- install {plugin} to enable"
  4. REPORT: In the output, show all cross-plugin actions with status (done/skipped)
```

Detailed integration patterns: [`references/cross-plugin-patterns.md`](./references/cross-plugin-patterns.md)

---

### 10. State Management

All orchestration workflows persist state for resume capability.

#### Session File Paths

```
sessions/
  ship/{workItemId}/
    state.json          # Current workflow state
    context.md          # Codebase exploration results
    plan.md             # Implementation plan
  triage/{project}/
    state.json          # Triage session state
    report.json         # Generated triage report
  sprint/{iterationId}/
    plan.json           # Sprint plan with assignments
    retrospective.json  # Retrospective metrics
  health/{timestamp}/
    dora.json           # DORA metrics snapshot
    pipeline-report.json # Pipeline health data
  release/{version}/
    state.json          # Release coordination state
    notes.md            # Generated release notes
    rollback.md         # Rollback plan
    gates.json          # Gate validation results
```

#### State Transitions

```
Ship:     PREFLIGHT -> FETCH -> BRANCH -> EXPLORE -> PLAN -> CODE -> TEST -> COMMIT_PR -> UPDATE -> SHIPPED
Triage:   SCAN -> CLASSIFY -> SCORE -> REPORT -> EXECUTE -> COMPLETE
Sprint:   CAPACITY -> VELOCITY -> SCORE -> SELECT -> DISTRIBUTE -> REPORT -> EXECUTE -> COMPLETE
Pipeline: FETCH_BUILDS -> CLASSIFY -> ANALYZE -> REPORT -> REMEDIATE -> COMPLETE
Release:  VALIDATE_GATES -> PROMOTE -> VERIFY -> NOTES -> COMPLETE
Health:   COLLECT -> COMPUTE -> SCORE -> REPORT -> COMPLETE
```

#### Checkpoint/Resume Protocol

1. After each state transition, write the updated state file
2. On resume, read the state file and determine the next phase
3. If a phase failed, show the error and ask the user:
   - "Retry this phase"
   - "Skip to next phase"
   - "Abort workflow"
4. State files are retained for 30 days, then eligible for cleanup

#### State File Schema

```json
{
  "workflow": "ship",
  "id": "4521",
  "state": "PLAN_COMPLETE",
  "org": "https://dev.azure.com/myorg",
  "project": "MyProject",
  "startedAt": "2026-03-11T10:00:00Z",
  "updatedAt": "2026-03-11T10:15:00Z",
  "checkpoints": [
    { "state": "PREFLIGHT_PASSED", "at": "2026-03-11T10:00:30Z" },
    { "state": "WORK_ITEM_FETCHED", "at": "2026-03-11T10:01:00Z" },
    { "state": "BRANCH_CREATED", "at": "2026-03-11T10:01:15Z" },
    { "state": "EXPLORE_COMPLETE", "at": "2026-03-11T10:05:00Z" },
    { "state": "PLAN_COMPLETE", "at": "2026-03-11T10:15:00Z" }
  ],
  "data": {
    "workItemTitle": "Add CSV export to reports",
    "workItemType": "User Story",
    "branchName": "feature/4521-add-csv-export-to-reports",
    "prUrl": null
  },
  "errors": []
}
```

#### Resume Patterns

```
"Ship work item 4521 --resume"        # Resume from last completed phase
"Ship work item 4521 --status"        # Show current state without resuming
"Ship work item 4521 --from=CODE"     # Restart from a specific phase
"Ship work item 4521 --abort"         # Abort and clean up
```

#### Cleanup

```bash
# Remove sessions older than 30 days
find sessions/ -name "state.json" -mtime +30 -delete
find sessions/ -type d -empty -delete
```

---

### 11. WIQL Quick Reference

Common queries used by the orchestrator. Full reference in
[`references/wiql-patterns.md`](./references/wiql-patterns.md).

#### Triage -- Unassigned Items

```sql
SELECT [System.Id], [System.Title], [System.WorkItemType],
       [Microsoft.VSTS.Common.Priority], [System.CreatedDate]
FROM WorkItems
WHERE [System.TeamProject] = @Project
  AND [System.State] NOT IN ('Closed', 'Resolved', 'Removed')
  AND [System.AssignedTo] = ''
ORDER BY [System.CreatedDate] ASC
```

#### Sprint -- Current Iteration Items

```sql
SELECT [System.Id], [System.Title], [System.State],
       [System.AssignedTo], [Microsoft.VSTS.Scheduling.StoryPoints]
FROM WorkItems
WHERE [System.TeamProject] = @Project
  AND [System.IterationPath] = @CurrentIteration
  AND [System.State] NOT IN ('Closed', 'Removed')
ORDER BY [Microsoft.VSTS.Common.Priority] ASC
```

#### Overdue Items

```sql
SELECT [System.Id], [System.Title], [System.AssignedTo],
       [Microsoft.VSTS.Scheduling.TargetDate]
FROM WorkItems
WHERE [System.TeamProject] = @Project
  AND [System.State] NOT IN ('Closed', 'Resolved', 'Removed')
  AND [Microsoft.VSTS.Scheduling.TargetDate] < @Today
ORDER BY [Microsoft.VSTS.Scheduling.TargetDate] ASC
```

#### Stalled Items (No Update in 7+ Days)

```sql
SELECT [System.Id], [System.Title], [System.AssignedTo],
       [System.ChangedDate], [System.State]
FROM WorkItems
WHERE [System.TeamProject] = @Project
  AND [System.State] = 'Active'
  AND [System.ChangedDate] < @Today - 7
ORDER BY [System.ChangedDate] ASC
```

#### Blocked Items

```sql
SELECT [System.Id], [System.Title], [System.AssignedTo], [System.Tags]
FROM WorkItems
WHERE [System.TeamProject] = @Project
  AND [System.State] NOT IN ('Closed', 'Resolved', 'Removed')
  AND ([System.Tags] CONTAINS 'Blocked' OR [System.BoardColumn] = 'Blocked')
ORDER BY [Microsoft.VSTS.Common.Priority] ASC
```

#### Backlog Items Available for Sprint

```sql
SELECT [System.Id], [System.Title], [System.WorkItemType],
       [Microsoft.VSTS.Scheduling.StoryPoints],
       [Microsoft.VSTS.Common.Priority], [System.Tags]
FROM WorkItems
WHERE [System.TeamProject] = @Project
  AND [System.State] IN ('New', 'Approved', 'Proposed')
  AND [System.IterationPath] = @Project
  AND [System.WorkItemType] IN ('User Story', 'Bug', 'Task')
ORDER BY [Microsoft.VSTS.Common.BacklogPriority] ASC
```

---

### 12. Common Patterns

#### Pattern: Ship a Bug Fix

```
User: "Ship work item #4567"

1. PREFLIGHT: Clean repo, authenticated
2. FETCH: Bug #4567 -- "Null reference in PaymentService.Process()"
   - Repro steps: "Submit payment with empty card number"
   - Severity: 2 - High
   - Area: MyProject\Backend\Payments
3. BRANCH: bugfix/4567-null-reference-payment-service
4. EXPLORE: Find PaymentService.cs, PaymentServiceTests.cs
5. PLAN: Add null check + unit test + integration test
6. CODE: Implement fix + tests
7. TEST: All tests pass (24/24)
8. COMMIT+PR: "fix(#4567): handle null payment reference"
   PR links AB#4567
9. UPDATE: State -> Resolved, ResolvedReason -> Fixed
10. NOTIFY: Teams card to #payments channel, email to assignee
```

#### Pattern: Triage After Sprint Review

```
User: "Triage the backlog for MyProject"

1. SCAN: Query all items not in any iteration, state = New
   Found 23 unassigned items, 8 unprioritized items
2. CLASSIFY: Apply label rules (5 bugs, 12 features, 4 tech debt, 2 spikes)
3. SCORE: WSJF scoring -- 3 items score > 8.0 (P1)
4. REPORT: Show triage table with recommended actions
5. User confirms: "Apply all"
6. EXECUTE: Bulk update priorities, tags, assignments
7. NOTIFY: Post triage summary to Teams
```

#### Pattern: Monday Morning Health Check

```
User: "Azure devops health report"

1. COLLECT: Fetch builds, deployments, work items for last 7 days
2. COMPUTE: Calculate DORA metrics
   - DF: 4.2/week (High)
   - LT: 3.8 hours (High)
   - MTTR: 1.2 hours (Elite)
   - CFR: 12% (Medium -- watch)
3. SCORE: Overall 68/100 (Medium)
4. REPORT: Show health dashboard with trends
5. Cross-plugin: Post summary to Teams #engineering channel
6. Cross-plugin: Email digest to engineering manager
```

#### Pattern: Release to Production

```
User: "Promote build 789 to production"

1. VALIDATE_GATES:
   - Quality: 97% test pass rate (> 95% threshold) -- PASS
   - Security: No critical vulnerabilities -- PASS
   - Staging health: 200 OK -- PASS
   - Work Items: 12/12 resolved -- PASS
   - Approval: Pending (notify approvers via Teams)
2. Wait for approval...
3. PROMOTE: Trigger production deployment
4. VERIFY: Post-deploy smoke tests -- PASS
5. NOTES: Generate release notes from work items
6. Cross-plugin: Post release announcement to Teams
7. Cross-plugin: Email release notes to stakeholders
```

#### Pattern: Mid-Sprint Workload Rebalance

```
User: "Balance workload for current sprint"

1. Query all active items in current iteration
2. Calculate load per member:
   - alice@: 92% (OK but high)
   - bob@: 135% (OVERLOADED)
   - carol@: 28% (Under-loaded)
3. Suggest: Move #1240 (3 pts, P3, Backend area) from bob@ to carol@
   - bob@: 135% -> 97%
   - carol@: 28% -> 48%
4. User confirms
5. Execute reassignment
6. Cross-plugin: Notify carol@ via Teams about new assignment
```

#### Pattern: Sprint Retrospective

```
User: "Devops retrospective for Sprint 12"

1. COLLECT: Sprint 12 metrics + last 4 sprints for comparison
2. COMPUTE: Velocity, completion rate, scope change, escaped defects
3. ANALYZE: Burndown pattern, cycle time, PR turnaround
4. REPORT: Retrospective report with trends
5. RECOMMEND: Data-driven action items
6. Cross-plugin: Post summary to Teams, email to team
```

---

## Azure DevOps API Quick Reference

### Common CLI Commands

```bash
# Configure defaults
az devops configure --defaults organization=https://dev.azure.com/myorg project=MyProject

# Work items
az boards work-item show --id {id}
az boards work-item create --type "User Story" --title "{title}" --fields "System.Description={desc}"
az boards work-item update --id {id} --state "Active" --assigned-to "{email}"
az boards query --wiql "{wiql}"

# Sprints and iterations
az boards iteration list --team {team}
az boards iteration team show --team {team} --id {iterationId}

# Pipelines
az pipelines list
az pipelines run --id {pipelineId}
az pipelines runs list --pipeline-id {id} --top 10
az pipelines runs show --id {runId}
az pipelines build show --id {buildId}
az pipelines build list --result failed --top 20

# Repos and PRs
az repos list
az repos pr list --status active
az repos pr create --source-branch {branch} --target-branch main --title "{title}" --work-items {id}
```

### REST API Endpoints

```
Base: https://dev.azure.com/{organization}/{project}/_apis

Work Items:
  GET    /_apis/wit/workitems/{id}?api-version=7.1
  PATCH  /_apis/wit/workitems/{id}?api-version=7.1
  POST   /_apis/wit/workitems/$User%20Story?api-version=7.1
  POST   /_apis/wit/wiql?api-version=7.1

Iterations:
  GET    /{team}/_apis/work/teamsettings/iterations?api-version=7.1
  GET    /{team}/_apis/work/teamsettings/iterations/{iterationId}/capacities?api-version=7.1

Build/Pipelines:
  GET    /_apis/build/builds?api-version=7.1
  GET    /_apis/build/builds/{buildId}?api-version=7.1
  GET    /_apis/build/builds/{buildId}/timeline?api-version=7.1
  GET    /_apis/build/builds/{buildId}/workitems?api-version=7.1
  POST   /_apis/pipelines/{pipelineId}/runs?api-version=7.1

Test:
  GET    /_apis/test/runs?api-version=7.1
  GET    /_apis/test/runs/{runId}/results?api-version=7.1
  GET    /_apis/test/codecoverage?buildId={buildId}&api-version=7.1

Git:
  GET    /_apis/git/repositories?api-version=7.1
  POST   /_apis/git/repositories/{repoId}/pullrequests?api-version=7.1

Environments:
  GET    /_apis/distributedtask/environments?api-version=7.1
  GET    /_apis/pipelines/checks/configurations?api-version=7.1-preview
  GET    /_apis/pipelines/approvals?api-version=7.1-preview
```

---

## Output Standards

All workflows produce structured output following this template:

```
## [{Workflow Name}] -- {Project} / {Context}

**Summary**: {1-2 sentence overview of results}

### {Main Data Section}
| Column | Column | Column |
|--------|--------|--------|
| data   | data   | data   |

### Recommended Actions
1. {Action with rationale}
2. {Action with rationale}

### Cross-Plugin Actions
- [x] Teams: Posted summary to #{channel}
- [ ] Outlook: Skipped -- install microsoft-outlook-mcp to enable
- [x] Power BI: Dataset updated with latest metrics
```

Always show what cross-plugin actions were taken or skipped (with reason).

---

## Error Handling

| Error | Recovery |
|---|---|
| `azure-devops` plugin not installed | Abort with install instructions |
| Work item not found (404) | Verify ID, check project access, suggest WIQL search |
| Branch already exists | Checkout existing branch, ask user to continue or reset |
| Pipeline run fails | Classify failure, suggest fix, offer retry |
| Tests fail after 1 retry | Surface failures, ask user: fix manually or skip |
| PR creation fails | Show error, provide manual `az repos pr create` command |
| Gate validation fails | Show which gate failed, provide remediation steps |
| WIQL query timeout | Break query by area/iteration path, reduce scope |
| Rate limiting (429) | Exponential backoff: 1s, 2s, 4s, max 3 retries |
| Auth failure | Check `az login` status, verify PAT scopes if applicable |
| State transition invalid | Check valid states for the work item type via API |
| Cross-plugin unavailable | Skip with message, never fail the main workflow |
| Work item already Resolved/Closed | Warn user, ask to proceed or abort |
