---
name: devops-orchestration
description: "Intelligence layer for Azure DevOps — orchestrates work item implementation, backlog triage, sprint planning, release coordination, pipeline monitoring, and cross-project health analysis"
triggers:
  - devops orchestrator
  - ship work item
  - ship devops
  - azure devops ship
  - triage devops backlog
  - devops sprint planning
  - devops release
  - pipeline orchestration
  - devops health
  - work item implementation
  - devops workload
  - devops retro
  - sprint capacity devops
  - devops portfolio
  - release coordination
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
---

# Azure DevOps Orchestration

## MCP Servers

Two Microsoft MCP servers are configured in `.mcp.json` and available to all agents:

| Server | Package | What it provides |
|--------|---------|-----------------|
| `azure-devops` | `@microsoft/azure-devops-mcp` | Work items, repos, pipelines, PRs, boards, sprints |
| `azure` | `@azure/mcp` | Azure resource management — subscriptions, resource groups, resources |

**Auth**: The Azure DevOps MCP server supports PAT (`AZURE_DEVOPS_AUTH_METHOD=pat`) or DefaultAzureCredential. The Azure MCP server uses DefaultAzureCredential — `az login` is sufficient for local use.

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
    └── azure-devops (API / CLI toolkit layer)
            |
            ├── Azure DevOps REST API (https://dev.azure.com/{org}/{project}/_apis/...)
            ├── az devops CLI (az boards, az pipelines, az repos)
            └── Azure DevOps MCP Server (@microsoft/azure-devops-mcp)
```

**Key distinction:**
- `azure-devops` = **toolkit** — raw CRUD operations on work items, pipelines, repos, boards
- `azure-devops-orchestrator` = **intelligence** — multi-step workflows, capacity analysis, WSJF scoring, DORA metrics, state management, cross-plugin integration

**Optional integrations** — check for installed plugins before delegating:
- `microsoft-teams-mcp` → post adaptive card summaries, @mention assignees, pipeline alerts
- `microsoft-outlook-mcp` → email digests to project stakeholders, release notifications
- `powerbi-fabric` → DAX report generation from sprint and pipeline data

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

## Core Workflows

### 1. Ship Workflow (ship-orchestrator agent)

The `/azure-devops-orchestrator:ship` command transforms an Azure DevOps work item into shipped code:

```
PREFLIGHT → FETCH WORK ITEM → BRANCH → EXPLORE → PLAN → CODE → TEST → COMMIT+PR → UPDATE DEVOPS
```

**State tracking** — save progress to `sessions/ship/{workItemId}/state.json` so the workflow is resumable.

Detailed protocol in [`references/ship-workflow.md`](./references/ship-workflow.md).

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
az boards work-item show --id {workItemId} --org {org} --project {project} --output json
```

Extract:
- `System.Title` → becomes the implementation goal
- `System.Description` → requirements and context
- `Microsoft.VSTS.Common.AcceptanceCriteria` → acceptance criteria (User Stories)
- `System.WorkItemType` → Bug, User Story, Task, Feature, Epic
- `System.State` → current state (New, Active, Resolved, Closed)
- `System.AssignedTo` → who owns this (for PR assignees)
- `System.IterationPath` → sprint context
- `System.AreaPath` → team/area context
- `Microsoft.VSTS.Common.Priority` → priority (1=Critical, 2=High, 3=Medium, 4=Low)
- `System.Tags` → classification tags
- Parent/child links → epic/feature hierarchy

Also fetch related work items (children, related, predecessor/successor) for full context.

#### Phase 2: Branch

Create a git branch based on work item type:

| Work Item Type | Branch Prefix | Example |
|---------------|---------------|---------|
| Bug | `bugfix/` | `bugfix/4521-fix-null-ref-in-auth` |
| User Story | `feature/` | `feature/4522-add-export-to-csv` |
| Task | `feature/` | `feature/4523-add-logging-middleware` |
| Hotfix (Priority 1) | `hotfix/` | `hotfix/4524-critical-db-timeout` |

Branch naming: `{type}/{workItemId}-{slug}` where slug is the title in kebab-case (max 50 chars).

```bash
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
- Files to create or modify
- Key interfaces and data structures
- Test strategy
- Risk notes (breaking changes, shared code)
- Estimated effort

**Checkpoint**: Show plan to user. Ask: "Does this plan look right? Should I proceed?"
Save plan to `sessions/ship/{workItemId}/plan.md`.

#### Phase 5: Code

Implement according to the plan:
- Follow existing code patterns found in Explore
- Write tests alongside implementation
- Keep changes minimal and focused
- Run `git diff` after each file to stay on track

**Checkpoint**: Show full diff. Ask: "Ready to run tests?"

#### Phase 6: Test

Run the project's test suite:
- Detect test runner (jest, pytest, go test, dotnet test, mvn test, etc.)
- Run relevant tests (not full suite if slow)
- Target: all tests pass, no new failures
- On failure: attempt one fix cycle, then surface to user

#### Phase 7: Commit + PR

Create a commit with conventional format:

```
{type}(#{workItemId}): {work item title}

{short description of what changed}

Work Item: #{workItemId}
AB#{workItemId}
```

The `AB#{workItemId}` tag auto-links the commit to the Azure DevOps work item.

Create PR with:
- Title: same as commit subject
- Body: work item description, changes made, test results, linked work item
- Reviewers: assigned team members
- Work item linking via `AB#{workItemId}` in the PR description

```bash
# For Azure DevOps Git repos
az repos pr create \
  --title "{type}(#{workItemId}): {title}" \
  --description "{body}" \
  --source-branch "feature/{workItemId}-{slug}" \
  --target-branch "main" \
  --work-items {workItemId} \
  --org {org} --project {project}

# For GitHub repos with ADO work item linking
gh pr create --title "{type}(#{workItemId}): {title}" --body "{body with AB#{workItemId}}"
```

#### Phase 8: Update Azure DevOps

After PR is created:
1. Transition work item state: `New` → `Active` → `Resolved`
2. Add PR link to work item
3. Add comment with PR URL and summary

```bash
# Update work item state
az boards work-item update \
  --id {workItemId} \
  --state "Resolved" \
  --org {org} --project {project}

# Add relation (PR link)
az boards work-item relation add \
  --id {workItemId} \
  --relation-type "ArtifactLink" \
  --target-url "{prUrl}" \
  --org {org} --project {project}
```

#### Phase 9: Cross-Plugin Notification

If `microsoft-teams-mcp` is installed, post ship notification.
If `microsoft-outlook-mcp` is installed, email assignees with PR link.

### 2. Backlog Triage Protocol (backlog-triage agent)

Inspect all unassigned / unprioritized work items in a project backlog and apply:

#### Classification Rules

| Signal | Classification | Priority |
|--------|---------------|----------|
| Title contains "bug", "fix", "broken", "error", "crash", "regression" | Bug | 2 (High) |
| Title contains "feature", "add", "implement", "build", "create" | User Story | 3 (Medium) |
| Title contains "refactor", "cleanup", "tech debt", "improve", "optimize" | Task (Tech Debt) | 3 (Medium) |
| Title contains "security", "vulnerability", "CVE" | Bug | 1 (Critical) |
| Title contains "docs", "documentation", "readme" | Task | 4 (Low) |
| Has due date within 7 days | +1 priority boost | |
| Overdue | +2 priority boost (min 1) | |
| Blocked by another item | Tag as "Blocked" | |

#### Priority Mapping

| Azure DevOps Priority | Meaning | Triage Signal |
|-----------------------|---------|---------------|
| 1 | Critical | Security, data loss, production down |
| 2 | High | Bugs, due within 7 days, blocking others |
| 3 | Medium | Features, tasks with due dates |
| 4 | Low | Tech debt, docs, no due date |

#### Assignee Suggestion

Look at existing work item assignments in the project:
- Build a map of `assignee → area paths and tags` from already-assigned items
- Match new work item's area path and tags against that domain map
- Suggest the assignee with the most relevant experience AND available capacity
- Check capacity: count open items per assignee in the current iteration

#### Area Path Routing

Route work items to area paths based on classification:
- Match keywords in title/description to existing area path names
- Use parent work item's area path if the item is a child task
- Default to the project's root area path if no match

#### Output

A triage report table is shown before any changes are applied:

```
## Triage Report — {Project Name}

**Inspected**: {n} work items
**Needs Changes**: {m} work items

### Changes to Apply

| ID | Title | Type | Current Priority | New Priority | Suggested Assignee | Area Path |
|----|-------|------|-----------------|-------------|-------------------|-----------|
| ...| ...   | ...  | ...             | ...         | ...               | ...       |

### Already Triaged (no changes needed)
{count} work items

### Cannot Triage (insufficient context)
{list with reason}
```

The user must confirm before any updates are applied. Use `--apply` to skip confirmation.

```bash
# Batch update via WIQL query + REST API
az boards work-item update \
  --id {id} \
  --fields "Microsoft.VSTS.Common.Priority={priority}" "System.AssignedTo={email}" \
  --org {org} --project {project}
```

### 3. Sprint Planning Protocol (sprint-planner agent)

Given a project, team, and iteration, calculate capacity and fill the sprint.

#### Capacity Calculation

```
Team capacity = SUM(member_capacity_hours) across the iteration
  where member_capacity = days_in_sprint × hours_per_day × (1 - day_off_ratio)

Net capacity = Team capacity × 0.75 (reserve 25% for:
  - 15% bug fixes and unplanned work
  - 10% meetings, reviews, overhead)

Story point capacity = Net capacity / velocity_avg_hours_per_point
  (if velocity unknown, estimate 1 story point = 6 hours)
```

Fetch team capacity from Azure DevOps:
```bash
# Get team iteration capacities
az devops invoke \
  --area work \
  --resource capacities \
  --route-parameters team={team} iterationId={iterationId} \
  --org {org} --project {project}
```

Or calculate from team members and sprint dates:
```bash
# Get iteration dates
az boards iteration list --team {team} --org {org} --project {project} --output json

# Get team members
az devops team list-member --team {team} --org {org} --project {project} --output json
```

#### WSJF Scoring

For each backlog item, calculate Weighted Shortest Job First:

```
WSJF = (Business Value + Time Criticality + Risk Reduction) / Job Size

Business Value (1-10):
  - Priority 1 → 10
  - Priority 2 → 8
  - Priority 3 → 5
  - Priority 4 → 2
  - Has business stakeholder tag → +2

Time Criticality (1-10):
  - Overdue → 10
  - Due within 7 days → 8
  - Due within 30 days → 5
  - No due date → 1
  - Blocking other items → +3

Risk Reduction (1-5):
  - Security/compliance tag → 5
  - Tech debt reduction → 4
  - Test coverage improvement → 3
  - Default → 1

Job Size (story points):
  - Use Story Points field if set
  - Otherwise estimate from child task count: 0-1=1pt, 2-3=2pt, 4-6=3pt, 7-10=5pt, 11+=8pt
  - Or from Effort/Remaining Work fields
```

Sort by WSJF descending. Select greedily until net capacity is filled.

#### Overcommitment Detection

After selecting items:
- Compare total story points to net capacity
- If committed > capacity × 1.1, flag overcommitment
- Per-assignee: if any member has > 40% of total points, flag imbalance
- Check for dependency chains that could cause blocking

#### Output

```
## Sprint Plan — {Project} / {Iteration}

**Team**: {team name} ({n} members)
**Capacity**: {hours}h net → {pts} story points
**Sprint dates**: {start} to {end}

### Recommended for Sprint ({selected_pts} / {capacity_pts} pts)

| ID | Title | Type | WSJF | Points | Assignee | Dependencies |
|----|-------|------|------|--------|----------|-------------|
| ...| ...   | ...  | ...  | ...    | ...      | ...         |

### Left in Backlog ({remaining} items)
{list with reason why not selected}

### Workload Distribution

| Member | Assigned Points | Tasks | Load % |
|--------|----------------|-------|--------|
| ...    | ...            | ...   | ...    |

### Warnings
- {overcommitment alerts}
- {dependency risks}
- {unassigned items in selection}
```

Ask: "Shall I move these items to iteration {iteration}?"

On confirmation, update each work item's iteration path:

```bash
az boards work-item update \
  --id {id} \
  --iteration "{project}\\{iteration}" \
  --org {org} --project {project}
```

### 4. Release Coordination Protocol (release-coordinator agent)

Orchestrate a release from build through production deployment.

Detailed protocol in [`references/release-workflow.md`](./references/release-workflow.md).

#### Release Pipeline Stages

```
Build → Dev → QA → Staging → Production
```

Each stage has gates that must pass before promotion:

| Gate | Check | Command |
|------|-------|---------|
| Build Success | Latest build passed | `az pipelines runs list --pipeline-id {id} --top 1` |
| Test Pass Rate | ≥ 95% tests passing | Query test results from build |
| Code Coverage | ≥ 80% coverage (or no regression) | Extract from build artifacts |
| Security Scan | No critical/high vulnerabilities | Check security scan results |
| Change Approval | Required approvers signed off | Check environment approvals |
| Work Items | All linked items in Resolved state | Query linked work items |

#### Release Notes Generation

Automatically generate release notes from work items included in the release:

```bash
# Get commits between tags/builds
git log {previousTag}..{currentTag} --oneline

# Extract work item IDs from commits (AB#1234 or #1234 patterns)
# Fetch each work item for title and type
az boards work-item show --id {id} --output json
```

Group by work item type:
```
## Release v{version} — {date}

### New Features
- #{id}: {title}

### Bug Fixes
- #{id}: {title}

### Improvements
- #{id}: {title}

### Breaking Changes
- {description}
```

#### Rollback Planning

Before promoting to production, prepare rollback:
- Identify the last known good deployment
- Document rollback steps (redeploy previous build, database migration rollback)
- Verify rollback pipeline exists
- Estimate rollback time

### 5. Pipeline Monitoring Protocol (pipeline-orchestrator agent)

Monitor pipeline health, detect failures, and suggest remediation.

Detailed patterns in [`references/pipeline-patterns.md`](./references/pipeline-patterns.md).

#### Failure Detection

```bash
# List recent pipeline runs with failures
az pipelines runs list \
  --pipeline-id {id} \
  --result failed \
  --top 10 \
  --org {org} --project {project} --output json

# Get build timeline for failure details
az pipelines runs show \
  --id {runId} \
  --org {org} --project {project} --output json
```

#### Failure Classification

| Pattern | Classification | Severity |
|---------|---------------|----------|
| Same test fails 3+ times in a row | Flaky test | Medium |
| Build fails on compile/link | Code error | High |
| Test timeout | Infrastructure/performance | Medium |
| Agent offline / capacity exhausted | Infrastructure | High |
| Security scan blocks | Security gate | High |
| Approval timeout | Process | Low |
| Artifact download failure | Infrastructure | Medium |

#### Flaky Test Detection

Query test results across recent builds:

```
GET {org}/{project}/_apis/test/runs?minLastUpdatedDate={date}&api-version=7.1

For each test run, identify tests that:
- Passed and failed in the same pipeline within 7 days
- Have pass rate < 95% over last 20 runs
- Consistently fail on retry but pass on re-run
```

Output a flaky test report with:
- Test name and class
- Pass rate over window
- Failure pattern (timeout, assertion, infrastructure)
- Suggested action (quarantine, fix, add retry)

#### Auto-Remediation Suggestions

| Failure Type | Suggested Action |
|-------------|-----------------|
| Flaky test | Quarantine with `[Trait("Category", "Flaky")]` or skip annotation |
| Build timeout | Increase timeout, check for infinite loops, parallelize |
| Agent offline | Check agent pool, scale out, verify agent health |
| NuGet/npm restore failure | Clear cache, check feed permissions, pin versions |
| Out of disk | Clean build artifacts, increase agent disk, add cleanup task |
| Permission denied | Check service connection, verify PAT scope |

### 6. Health Dashboard Protocol (health-monitor agent)

Cross-project metrics and DORA metrics analysis.

#### DORA Metrics

| Metric | Calculation | Elite | High | Medium | Low |
|--------|-------------|-------|------|--------|-----|
| **Deployment Frequency** | Successful deploys to prod / time | On-demand (daily+) | Weekly-monthly | Monthly-6mo | < once/6mo |
| **Lead Time for Changes** | Commit → production deploy | < 1 hour | 1 day-1 week | 1-6 months | > 6 months |
| **Mean Time to Recovery** | Incident open → resolved | < 1 hour | < 1 day | 1 day-1 week | > 1 week |
| **Change Failure Rate** | Failed deploys / total deploys | 0-15% | 16-30% | 31-45% | > 45% |

Gather data:

```bash
# Deployment frequency — count successful production pipeline runs
az pipelines runs list \
  --pipeline-id {prodPipelineId} \
  --result succeeded \
  --top 100 \
  --org {org} --project {project} --output json

# Lead time — diff between first commit and deployment timestamp
# Use git log dates + pipeline completion timestamps

# MTTR — query resolved bugs with production tag
# Calculate time between creation and state change to Resolved

# Change failure rate — count failed production deployments / total
az pipelines runs list \
  --pipeline-id {prodPipelineId} \
  --top 100 \
  --org {org} --project {project} --output json
# Count result=failed / total
```

#### Health Scoring

Per project, calculate:

| Metric | Formula | Weight |
|--------|---------|--------|
| Sprint Completion | (completed story points / committed story points) × 100 | 20% |
| Overdue % | (overdue items / total active items) × 100 (inverse) | 20% |
| Pipeline Health | (successful builds / total builds) × 100 | 15% |
| Deployment Frequency | Score based on DORA band (25/20/10/5) | 15% |
| Lead Time | Score based on DORA band (25/20/10/5) | 10% |
| MTTR | Score based on DORA band (25/20/10/5) | 10% |
| Change Failure Rate | Score based on DORA band (inverse) | 10% |

**Health Score = weighted sum. 80-100 = Green, 60-79 = Yellow, < 60 = Red.**

#### Output

```
## Azure DevOps Health Dashboard — {date}

### Portfolio Overview
{n} projects · {total_items} work items · {active_sprints} active sprints

### Project Health

| Project | Sprint Completion | Overdue | Pipeline Health | DORA Score | Overall | Status |
|---------|------------------|---------|----------------|------------|---------|--------|
| ...     | ...              | ...     | ...            | ...        | ...     | G/Y/R  |

### DORA Metrics

| Metric | Value | Band | Trend |
|--------|-------|------|-------|
| Deployment Frequency | {value} | {band} | {up/down/stable} |
| Lead Time for Changes | {value} | {band} | {up/down/stable} |
| MTTR | {value} | {band} | {up/down/stable} |
| Change Failure Rate | {value} | {band} | {up/down/stable} |

### Projects Needing Attention

**{Project Name}** — Health: {score}/100
- {n} overdue work items
- Pipeline failure rate: {pct}%
- Sprint completion: {pct}% (below target)
- Top blocker: "{work item title}" — blocked for {n} days

### Recommended Actions
1. {highest impact action}
2. {second action}
...
```

### 7. Workload Balancing Protocol (workload-balancer agent)

Detect overloaded and underloaded team members, suggest reassignments.

#### Data Collection

```bash
# Get all active work items assigned to team members in current iteration
az boards query \
  --wiql "SELECT [System.Id], [System.Title], [System.AssignedTo], [System.State], [Microsoft.VSTS.Scheduling.StoryPoints], [Microsoft.VSTS.Common.Priority] FROM WorkItems WHERE [System.IterationPath] UNDER '{iteration}' AND [System.State] NOT IN ('Closed', 'Removed') ORDER BY [System.AssignedTo]" \
  --org {org} --project {project} --output json
```

#### Thresholds

| Status | Condition |
|--------|-----------|
| **Overloaded** | > 15 story points OR > 8 work items OR > 3 priority-1/2 items |
| **High Load** | 10-15 story points OR 5-8 work items |
| **Balanced** | 5-10 story points AND 3-5 work items |
| **Underloaded** | < 5 story points AND < 3 work items |
| **Idle** | 0 assigned items in current iteration |

#### Rebalancing Logic

For each overloaded member:
1. Identify their lowest-priority, not-yet-started items
2. Find underloaded team members with matching area path / skill tags
3. Prefer moving items that:
   - State = "New" (not started)
   - Priority 3-4 (medium/low)
   - No blocking dependencies
   - Due date > 7 days out or no due date

Never reassign:
- Items in "Active" state (work already in progress)
- Priority 1-2 items (reassignment creates disruption)
- Items with blocking relationships (predecessor not done)

#### Output

```
## Workload Balance Report — {Project} / {Iteration}

### Current Distribution

| Member | Items | Story Points | Priority 1-2 | Status |
|--------|-------|-------------|-------------|--------|
| ...    | ...   | ...         | ...         | Status |

### Recommended Reassignments

| ID | Title | From | To | Reason |
|----|-------|------|----|--------|
| ...| ...   | ...  | ...| ...    |

### Unassigned Items to Assign

| ID | Title | Priority | Suggested Assignee | Reason |
|----|-------|----------|--------------------|--------|
| ...| ...   | ...      | ...                | ...    |

### After Rebalancing (Projected)

| Member | Items | Story Points | Status |
|--------|-------|-------------|--------|
| ...    | ...   | ...         | ...    |
```

### 8. Retrospective Analysis Protocol (retrospective-analyzer agent)

Analyze sprint/iteration data for retrospective insights.

#### Data Collection

For a given iteration:

```bash
# Sprint work items with final state
az boards query \
  --wiql "SELECT [System.Id], [System.Title], [System.State], [System.WorkItemType], [Microsoft.VSTS.Scheduling.StoryPoints], [Microsoft.VSTS.Common.Priority], [System.CreatedDate], [System.ChangedDate], [Microsoft.VSTS.Common.ClosedDate] FROM WorkItems WHERE [System.IterationPath] = '{iteration}'" \
  --org {org} --project {project} --output json

# Pipeline runs during sprint period
az pipelines runs list \
  --top 100 \
  --org {org} --project {project} --output json
# Filter by date range
```

#### Metrics Calculated

| Metric | Formula |
|--------|---------|
| **Velocity** | Sum of story points in Closed/Resolved state |
| **Commitment** | Sum of story points assigned at sprint start |
| **Completion Rate** | Velocity / Commitment × 100% |
| **Scope Change** | Items added after sprint start / initial items × 100% |
| **Carry-over** | Items not completed, carried to next sprint |
| **Escaped Defects** | Bugs created in production after sprint items deployed |
| **Cycle Time** | Avg time from Active → Closed per item |
| **Work in Progress** | Avg concurrent items in Active state |
| **Deployment Count** | Number of successful production deployments |
| **Build Success Rate** | Successful builds / total builds × 100% |

#### Velocity Trend

Calculate velocity for the last 6 iterations and show trend:

```
## Velocity Trend

| Sprint | Committed | Delivered | Completion | Scope Change |
|--------|-----------|-----------|------------|-------------|
| Sprint 13 | 34 | 28 | 82% | +3 items |
| Sprint 12 | 30 | 31 | 103% | +1 item |
| Sprint 11 | 28 | 22 | 79% | +5 items |
| Sprint 10 | 32 | 30 | 94% | +2 items |
| Sprint 9  | 26 | 25 | 96% | +0 items |
| Sprint 8  | 30 | 27 | 90% | +4 items |

Average velocity: 27.2 pts
Trend: Stable (within 1 std dev)
Recommended next sprint commitment: 28 pts
```

#### Escaped Defect Analysis

Query bugs created after sprint end that reference sprint work items:

```bash
az boards query \
  --wiql "SELECT [System.Id], [System.Title], [System.CreatedDate] FROM WorkItems WHERE [System.WorkItemType] = 'Bug' AND [System.CreatedDate] >= '{sprintEndDate}' AND [System.Tags] CONTAINS 'production'" \
  --org {org} --project {project}
```

Map escaped defects back to the sprint's work items via related links or area paths.

#### Output

```
## Sprint Retrospective Analysis — {Iteration}

### Sprint Summary
| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Velocity | {pts} | {avg} | {above/below} |
| Completion Rate | {pct}% | 85% | {met/missed} |
| Scope Change | {pct}% | < 10% | {met/missed} |
| Carry-over | {n} items | 0 | |
| Cycle Time (avg) | {days} days | < {target} | |
| Build Success Rate | {pct}% | > 95% | |
| Deployment Count | {n} | | |
| Escaped Defects | {n} | 0 | |

### Velocity Trend (Last 6 Sprints)
{table}

### What Went Well
{auto-detected positive signals: high completion, fast cycle time, zero defects}

### Areas for Improvement
{auto-detected issues: scope creep, low completion, high carry-over, escaped defects}

### Actionable Recommendations
1. {specific recommendation based on data}
2. {specific recommendation}
...
```

### 9. PR Review Protocol (pr-reviewer agent)

Automated code review during the ship workflow or on-demand.

The PR reviewer analyzes:
- Code changes for potential issues (null checks, error handling, resource leaks)
- Test coverage of changed code paths
- Adherence to project coding conventions
- Work item acceptance criteria coverage
- Breaking changes or API contract violations

Output review comments as suggestions linked to specific file/line locations.

### 10. Teams Notification Protocol (teams-notifier agent)

Posts Azure DevOps updates to Microsoft Teams channels when `microsoft-teams-mcp` is installed.

#### Notification Types

| Type | Trigger | Card Content |
|------|---------|-------------|
| Ship Complete | After `/ship` finishes | Work item title, PR link, branch, assignee |
| Sprint Summary | After `/sprint` finishes | Sprint plan table, capacity, team distribution |
| Pipeline Failure | After `/pipeline` detects failures | Failed build, error summary, suggested fix |
| Release Ready | After `/release` gate validation | Release version, change summary, approval status |
| Health Alert | After `/status` finds critical issues | Overdue count, blocked items, DORA regression |
| Retro Summary | After `/retro` finishes | Velocity, completion rate, key findings |

Templates in [`references/cross-plugin-patterns.md`](./references/cross-plugin-patterns.md).

## Cross-Plugin Delegation Recipes

See [`references/cross-plugin-patterns.md`](./references/cross-plugin-patterns.md) for:
- Teams adaptive card templates for work item summaries
- Outlook digest email format for sprint and release notifications
- Power BI export schema for DORA metrics dashboards
- Detection patterns for plugin availability

## State Management

All orchestration workflows persist state for resume capability.

### Session Directory Structure

```
sessions/
  ship/{workItemId}/
    state.json          # Current workflow state
    context.md          # Codebase analysis from Explore phase
    plan.md             # Implementation plan
  triage/{project}/
    state.json          # Triage session state
    report.json         # Generated triage report
  sprint/{iteration}/
    state.json          # Sprint planning state
    plan.json           # Sprint plan with WSJF scores
  release/{version}/
    state.json          # Release coordination state
    notes.md            # Generated release notes
    rollback.md         # Rollback plan
  retro/{iteration}/
    state.json          # Retrospective analysis state
    report.json         # Retrospective data
```

### State File Schema

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
  }
}
```

### Resume Patterns

```bash
# Resume from last checkpoint
/azure-devops-orchestrator:ship 4521 --resume

# Check status of in-progress ship
/azure-devops-orchestrator:ship 4521 --status

# Resume from a specific state
/azure-devops-orchestrator:ship 4521 --from=CODE_COMPLETE
```

Read `sessions/ship/{workItemId}/state.json` to determine where to resume. Re-execute from the saved state without repeating completed phases.

## Azure DevOps API Patterns

See [`references/wiql-patterns.md`](./references/wiql-patterns.md) for comprehensive WIQL query patterns.
See [`references/pipeline-patterns.md`](./references/pipeline-patterns.md) for pipeline API patterns.

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
az boards iteration show --id {iterationId}

# Pipelines
az pipelines list
az pipelines run --id {pipelineId}
az pipelines runs list --pipeline-id {id} --top 10
az pipelines runs show --id {runId}

# Repos and PRs
az repos list
az repos pr list --status active
az repos pr create --source-branch {branch} --target-branch main --title "{title}" --work-items {id}

# Git
az repos ref list --repository {repoId}
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
  POST   /_apis/pipelines/{pipelineId}/runs?api-version=7.1

Test:
  GET    /_apis/test/runs?api-version=7.1
  GET    /_apis/test/runs/{runId}/results?api-version=7.1

Git:
  GET    /_apis/git/repositories?api-version=7.1
  GET    /_apis/git/repositories/{repoId}/pullrequests?api-version=7.1
  POST   /_apis/git/repositories/{repoId}/pullrequests?api-version=7.1
```

## Output Standards

All agents produce structured output:

```
## [Workflow Name] — [Project / Context]

**Summary**: 3 items overdue, 5 due this sprint, 2 unassigned

### Details
| ... | ... |

### Recommended Actions
1. ...
2. ...

### Cross-Plugin Actions
- [ ] Teams: Posted summary to #dev channel
- [ ] Outlook: Digest sent to project stakeholders
- [ ] Power BI: DORA metrics exported
```

Always show what cross-plugin actions were taken or skipped (with reason).

## Error Handling

| Error | Recovery |
|-------|----------|
| Pre-flight fails | List issues + remediation, abort |
| Work item not found | Verify ID, check project access, check org URL |
| Branch conflict | Fetch existing branch, ask user to resolve |
| Tests fail after 1 retry | Surface failures, ask user: fix manually or skip |
| PR creation fails | Show error, provide manual command to run |
| Pipeline query fails | Check PAT scope, verify pipeline permissions |
| WIQL syntax error | Validate query, show corrected version |
| Rate limit (429) | Back off exponentially, retry after Retry-After header |
| Auth expired | Prompt to re-run `az login` or refresh PAT |
