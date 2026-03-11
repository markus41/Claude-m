# Cross-Plugin Integration Patterns

## Detection

Before calling any external plugin, check availability:

```
1. Attempt a lightweight tool call (e.g., list Teams channels or get inbox count)
2. If it succeeds, the plugin is available — proceed
3. If it fails with "tool not found" or permission error, skip gracefully
4. Always note skipped actions in the output:
   "Teams notification skipped — install microsoft-teams-mcp to enable"
```

Never throw an error when an optional plugin is missing. Degrade gracefully.

## microsoft-teams-mcp

### Ship Notification Card

After `/azure-devops-orchestrator:ship` completes, post an adaptive card:

```json
{
  "type": "AdaptiveCard",
  "version": "1.4",
  "body": [
    {
      "type": "TextBlock",
      "text": "Work Item Shipped: #{workItemId}",
      "weight": "Bolder",
      "size": "Medium"
    },
    {
      "type": "FactSet",
      "facts": [
        { "title": "Title", "value": "{title}" },
        { "title": "Type", "value": "{workItemType}" },
        { "title": "Branch", "value": "{branchName}" },
        { "title": "PR", "value": "{prUrl}" },
        { "title": "Implemented by", "value": "Claude Code" }
      ]
    },
    {
      "type": "TextBlock",
      "text": "**Changes**: {filesChanged} files changed",
      "wrap": true
    },
    {
      "type": "TextBlock",
      "text": "**Tests**: {passed}/{total} passed",
      "wrap": true
    }
  ],
  "actions": [
    {
      "type": "Action.OpenUrl",
      "title": "View PR",
      "url": "{prUrl}"
    },
    {
      "type": "Action.OpenUrl",
      "title": "View Work Item",
      "url": "{org}/{project}/_workitems/edit/{workItemId}"
    }
  ]
}
```

### Sprint Summary Card

After `/azure-devops-orchestrator:sprint` completes:

```json
{
  "type": "AdaptiveCard",
  "version": "1.4",
  "body": [
    {
      "type": "TextBlock",
      "text": "Sprint Plan — {iteration}",
      "weight": "Bolder",
      "size": "Medium"
    },
    {
      "type": "FactSet",
      "facts": [
        { "title": "Team", "value": "{teamName}" },
        { "title": "Capacity", "value": "{capacityPts} story points" },
        { "title": "Committed", "value": "{committedPts} story points ({pct}%)" },
        { "title": "Items", "value": "{itemCount} work items" }
      ]
    },
    {
      "type": "TextBlock",
      "text": "**Top Items**:",
      "weight": "Bolder"
    },
    {
      "type": "TextBlock",
      "text": "{top5ItemsList}",
      "wrap": true
    }
  ],
  "actions": [
    {
      "type": "Action.OpenUrl",
      "title": "Open Sprint Board",
      "url": "{org}/{project}/_sprints/taskboard/{team}/{iteration}"
    }
  ]
}
```

### Pipeline Failure Alert

After `/azure-devops-orchestrator:pipeline` detects failures:

```json
{
  "type": "AdaptiveCard",
  "version": "1.4",
  "body": [
    {
      "type": "TextBlock",
      "text": "Pipeline Failure Alert",
      "weight": "Bolder",
      "size": "Medium",
      "color": "Attention"
    },
    {
      "type": "FactSet",
      "facts": [
        { "title": "Pipeline", "value": "{pipelineName}" },
        { "title": "Build", "value": "#{buildNumber}" },
        { "title": "Branch", "value": "{branch}" },
        { "title": "Failed Stage", "value": "{stageName}" },
        { "title": "Triggered by", "value": "{requestedFor}" }
      ]
    },
    {
      "type": "TextBlock",
      "text": "**Error**: {errorSummary}",
      "wrap": true,
      "color": "Attention"
    },
    {
      "type": "TextBlock",
      "text": "**Suggested Fix**: {remediationSuggestion}",
      "wrap": true
    }
  ],
  "actions": [
    {
      "type": "Action.OpenUrl",
      "title": "View Build",
      "url": "{org}/{project}/_build/results?buildId={buildId}"
    }
  ]
}
```

### Release Notification Card

After `/azure-devops-orchestrator:release` gate validation:

```json
{
  "type": "AdaptiveCard",
  "version": "1.4",
  "body": [
    {
      "type": "TextBlock",
      "text": "Release v{version} — {status}",
      "weight": "Bolder",
      "size": "Medium",
      "color": "{green if ready, yellow if pending, red if blocked}"
    },
    {
      "type": "FactSet",
      "facts": [
        { "title": "Target", "value": "{targetStage}" },
        { "title": "Work Items", "value": "{itemCount} items" },
        { "title": "Test Pass Rate", "value": "{passRate}%" },
        { "title": "Gates", "value": "{passed}/{total} passed" }
      ]
    },
    {
      "type": "TextBlock",
      "text": "**Change Summary**:\n{releaseHighlights}",
      "wrap": true
    }
  ],
  "actions": [
    {
      "type": "Action.OpenUrl",
      "title": "View Release Notes",
      "url": "{releaseNotesUrl}"
    },
    {
      "type": "Action.OpenUrl",
      "title": "Approve Release",
      "url": "{approvalUrl}"
    }
  ]
}
```

### Health Dashboard Card

After `/azure-devops-orchestrator:status` runs:

```json
{
  "type": "AdaptiveCard",
  "version": "1.4",
  "body": [
    {
      "type": "TextBlock",
      "text": "DevOps Health Dashboard — {date}",
      "weight": "Bolder",
      "size": "Medium"
    },
    {
      "type": "FactSet",
      "facts": [
        { "title": "Projects", "value": "{projectCount}" },
        { "title": "Overdue Items", "value": "{overdueCount}" },
        { "title": "Blocked Items", "value": "{blockedCount}" },
        { "title": "Pipeline Success", "value": "{pipelineSuccessRate}%" }
      ]
    },
    {
      "type": "TextBlock",
      "text": "**DORA Metrics**: Deploy Freq: {deployFreq} | Lead Time: {leadTime} | MTTR: {mttr} | CFR: {cfr}",
      "wrap": true
    },
    {
      "type": "TextBlock",
      "text": "**Actions Needed**: {actionSummary}",
      "wrap": true,
      "color": "Attention"
    }
  ],
  "actions": [
    {
      "type": "Action.OpenUrl",
      "title": "Open Azure DevOps",
      "url": "{org}/{project}"
    }
  ]
}
```

**@mention pattern**: Include `<at>{displayName}</at>` for assignees with overdue items or failed builds.

**Target channel selection**:
1. If user specifies channel, use it
2. Look for a channel matching the project name
3. Fall back to General channel
4. Ask user if no channel found

## microsoft-outlook-mcp

### Sprint Digest Email

**When to use**: After sprint planning or status check in digest mode.

```
Subject: Azure DevOps Sprint Digest — {Project} / {Iteration} — {date}

Hi {stakeholder},

Here's the sprint health report for {iteration} in {project}.

## Sprint Status
- Committed: {committedPts} story points
- Completed: {completedPts} story points ({completionPct}%)
- Remaining: {remainingPts} story points
- Days left: {daysRemaining}

## Overdue ({overdueCount})
{table of overdue items with assignees and due dates}

## At Risk ({atRiskCount})
{items likely to miss sprint deadline}

## Blocked ({blockedCount})
{blocked items with blocking reason}

## Team Load
{assignee workload distribution table}

---
Sent by Azure DevOps Orchestrator
```

**Recipients**: Project stakeholders, team lead, scrum master.

### Release Notification Email

After release gates are validated:

```
Subject: Release v{version} — {Ready for Production / Blocked}

Hi {approvers},

Release v{version} for {project} has completed gate validation.

## Gate Results
| Gate | Status |
|------|--------|
| Build | {pass/fail} |
| Tests ({passRate}%) | {pass/fail} |
| Code Coverage ({coverage}%) | {pass/fail} |
| Security Scan | {pass/fail} |
| Work Items ({resolved}/{total}) | {pass/fail} |

## Changes in this Release
### Features
{feature list}

### Bug Fixes
{bugfix list}

## Action Required
{If pending approval: Please approve at {approvalUrl}}
{If blocked: See blocking issues above}

---
Sent by Azure DevOps Orchestrator
```

### Ship Completion Email

```
Subject: Work Item #{workItemId} Shipped — {title}

{assignee},

Work item #{workItemId} "{title}" has been implemented and a PR is ready for review.

PR: {prUrl}
Branch: {branchName}
Files changed: {count}
Tests: {passed}/{total} passed

Changes: {summary}

---
Sent by Azure DevOps Orchestrator
```

## powerbi-fabric

### DORA Metrics Export Schema

When the user requests Power BI dashboards for DORA metrics:

```json
{
  "dataset": "AzureDevOpsDORA",
  "tables": [
    {
      "name": "Deployments",
      "columns": [
        "DeploymentId", "PipelineName", "Environment",
        "StartTime", "EndTime", "Status", "Version",
        "TriggeredBy", "Branch", "CommitCount", "WorkItemCount"
      ]
    },
    {
      "name": "WorkItems",
      "columns": [
        "WorkItemId", "Title", "Type", "State", "Priority",
        "StoryPoints", "AssignedTo", "IterationPath", "AreaPath",
        "CreatedDate", "ActivatedDate", "ResolvedDate", "ClosedDate",
        "CycleTimeDays", "LeadTimeDays"
      ]
    },
    {
      "name": "PipelineRuns",
      "columns": [
        "RunId", "PipelineName", "Result", "StartTime", "FinishTime",
        "DurationMinutes", "Branch", "RequestedFor",
        "TestsPassed", "TestsFailed", "CodeCoverage"
      ]
    },
    {
      "name": "SprintMetrics",
      "columns": [
        "IterationPath", "TeamName", "StartDate", "EndDate",
        "CommittedPoints", "CompletedPoints", "CompletionRate",
        "ScopeChange", "CarryOver", "EscapedDefects", "Velocity"
      ]
    }
  ]
}
```

### DAX Queries for DORA Metrics

```dax
// Deployment Frequency (last 30 days)
Deployment Frequency =
CALCULATE(
    COUNTROWS(Deployments),
    Deployments[Environment] = "Production",
    Deployments[Status] = "Succeeded",
    DATESINPERIOD(Deployments[EndTime], TODAY(), -30, DAY)
) / 30

// Change Failure Rate
Change Failure Rate =
VAR TotalDeploys = CALCULATE(COUNTROWS(Deployments), Deployments[Environment] = "Production")
VAR FailedDeploys = CALCULATE(COUNTROWS(Deployments), Deployments[Environment] = "Production", Deployments[Status] = "Failed")
RETURN DIVIDE(FailedDeploys, TotalDeploys, 0)

// Mean Lead Time for Changes (days)
Mean Lead Time =
AVERAGEX(
    FILTER(WorkItems, WorkItems[State] = "Closed"),
    WorkItems[LeadTimeDays]
)
```

Use the `powerbi-fabric` plugin to create datasets and push rows, then suggest default report layouts.
