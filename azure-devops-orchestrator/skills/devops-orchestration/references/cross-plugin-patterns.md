# Cross-Plugin Integration Patterns

Integration recipes for the azure-devops-orchestrator with optional plugins:
microsoft-teams-mcp, microsoft-outlook-mcp, powerbi-fabric, and azure-monitor.

---

## Plugin Availability Detection

### Detection Pattern

Before calling any external plugin, verify it is installed:

```
1. Attempt a lightweight probe call:
   - Teams: list channels for a known team
   - Outlook: get inbox count
   - Power BI: list datasets
   - Azure Monitor: list alert rules
2. If the call succeeds, the plugin is available -- proceed
3. If it fails with "tool not found" or permission error, skip gracefully
4. Always note skipped actions in the output
```

### Graceful Degradation Rules

1. Never throw an error when an optional plugin is missing
2. Never block the main workflow for a failed cross-plugin action
3. Always report what was attempted, what succeeded, and what was skipped
4. Provide the install command for any skipped plugin
5. If a cross-plugin action fails after the plugin was detected as available,
   log the error but continue the main workflow

### Detection Code Pattern

```
For each cross-plugin action in any workflow:

  CHECK:
    result = attempt_lightweight_call(plugin)
    if result.success:
      plugin_available = true
    else:
      plugin_available = false

  ATTEMPT (if available):
    try:
      execute_cross_plugin_action(plugin, payload)
      report: "[Plugin] {action} -- done"
    catch error:
      report: "[Plugin] {action} -- failed: {error.message}"

  SKIP (if not available):
    report: "[Plugin] {action} -- skipped (install {plugin-name} to enable)"
```

---

## microsoft-teams-mcp

### Ship Notification Card

Posted after `/azure-devops-orchestrator:ship` completes (PR created and work item updated).

```json
{
  "type": "AdaptiveCard",
  "version": "1.4",
  "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
  "body": [
    {
      "type": "ColumnSet",
      "columns": [
        {
          "type": "Column",
          "width": "auto",
          "items": [
            {
              "type": "TextBlock",
              "text": "Work Item Shipped",
              "weight": "Bolder",
              "color": "Good",
              "size": "Medium"
            }
          ]
        },
        {
          "type": "Column",
          "width": "stretch",
          "items": [
            {
              "type": "TextBlock",
              "text": "#{workItemId}: {title}",
              "weight": "Bolder",
              "wrap": true
            }
          ]
        }
      ]
    },
    {
      "type": "FactSet",
      "facts": [
        { "title": "Type", "value": "{workItemType}" },
        { "title": "Branch", "value": "{branchName}" },
        { "title": "Files Changed", "value": "{fileCount}" },
        { "title": "Tests", "value": "{passedTests}/{totalTests} passed" },
        { "title": "Implemented by", "value": "Claude Code" }
      ]
    }
  ],
  "actions": [
    {
      "type": "Action.OpenUrl",
      "title": "Review PR",
      "url": "{prUrl}"
    },
    {
      "type": "Action.OpenUrl",
      "title": "View Work Item",
      "url": "https://dev.azure.com/{org}/{project}/_workitems/edit/{workItemId}"
    }
  ]
}
```

### Triage Summary Card

Posted after backlog triage is complete.

```json
{
  "type": "AdaptiveCard",
  "version": "1.4",
  "body": [
    {
      "type": "TextBlock",
      "text": "Backlog Triage Complete -- {project}",
      "weight": "Bolder",
      "size": "Medium"
    },
    {
      "type": "FactSet",
      "facts": [
        { "title": "Items Scanned", "value": "{totalScanned}" },
        { "title": "Prioritized", "value": "{prioritizedCount}" },
        { "title": "Assigned", "value": "{assignedCount}" },
        { "title": "Blocked", "value": "{blockedCount}" },
        { "title": "P1 (Critical)", "value": "{p1Count}" }
      ]
    },
    {
      "type": "TextBlock",
      "text": "**Top Priority Items:**",
      "weight": "Bolder"
    },
    {
      "type": "TextBlock",
      "text": "{topItemsList}",
      "wrap": true
    }
  ],
  "actions": [
    {
      "type": "Action.OpenUrl",
      "title": "Open Backlog",
      "url": "https://dev.azure.com/{org}/{project}/_backlogs"
    }
  ]
}
```

### Sprint Plan Card

Posted after sprint planning is complete.

```json
{
  "type": "AdaptiveCard",
  "version": "1.4",
  "body": [
    {
      "type": "TextBlock",
      "text": "Sprint Plan -- {sprintName}",
      "weight": "Bolder",
      "size": "Medium"
    },
    {
      "type": "FactSet",
      "facts": [
        { "title": "Team", "value": "{teamName}" },
        { "title": "Duration", "value": "{startDate} to {endDate}" },
        { "title": "Capacity", "value": "{totalCapacity}h" },
        { "title": "Committed", "value": "{committedPoints} pts ({capacityPct}%)" },
        { "title": "Items", "value": "{itemCount}" }
      ]
    },
    {
      "type": "TextBlock",
      "text": "**Top Items:**",
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
      "url": "https://dev.azure.com/{org}/{project}/_sprints/taskboard/{team}/{sprintName}"
    }
  ]
}
```

### Deadline Alert Card

Posted when overdue or at-risk items are detected.

```json
{
  "type": "AdaptiveCard",
  "version": "1.4",
  "body": [
    {
      "type": "TextBlock",
      "text": "Deadline Alert -- {project}",
      "weight": "Bolder",
      "size": "Medium",
      "color": "Attention"
    },
    {
      "type": "FactSet",
      "facts": [
        { "title": "Overdue", "value": "{overdueCount} items" },
        { "title": "Due This Week", "value": "{dueThisWeekCount} items" },
        { "title": "Stalled", "value": "{stalledCount} items" }
      ]
    },
    {
      "type": "TextBlock",
      "text": "**Overdue Items:**\n{overdueItemsList}",
      "wrap": true
    },
    {
      "type": "TextBlock",
      "text": "<at>{assigneeName}</at> -- please review your overdue items.",
      "wrap": true
    }
  ],
  "actions": [
    {
      "type": "Action.OpenUrl",
      "title": "View Board",
      "url": "https://dev.azure.com/{org}/{project}/_boards"
    }
  ]
}
```

### Pipeline Failure Alert Card

Posted when pipeline failures are detected.

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
      "url": "https://dev.azure.com/{org}/{project}/_build/results?buildId={buildId}"
    }
  ]
}
```

### Release Notification Card

Posted after a release is promoted or validated.

```json
{
  "type": "AdaptiveCard",
  "version": "1.4",
  "body": [
    {
      "type": "TextBlock",
      "text": "Release v{version} -- {status}",
      "weight": "Bolder",
      "size": "Medium",
      "color": "Good"
    },
    {
      "type": "FactSet",
      "facts": [
        { "title": "Target", "value": "{targetStage}" },
        { "title": "Features", "value": "{featureCount}" },
        { "title": "Bug Fixes", "value": "{bugFixCount}" },
        { "title": "Pipeline", "value": "{pipelineName} #{runId}" },
        { "title": "Approved By", "value": "{approverNames}" },
        { "title": "Deployed At", "value": "{timestamp}" }
      ]
    },
    {
      "type": "TextBlock",
      "text": "**Release Highlights:**\n{highlights}",
      "wrap": true
    }
  ],
  "actions": [
    {
      "type": "Action.OpenUrl",
      "title": "Release Notes",
      "url": "{releaseNotesUrl}"
    },
    {
      "type": "Action.OpenUrl",
      "title": "Pipeline Run",
      "url": "https://dev.azure.com/{org}/{project}/_build/results?buildId={buildId}"
    }
  ]
}
```

### Health Dashboard Card

Posted after health monitoring completes.

```json
{
  "type": "AdaptiveCard",
  "version": "1.4",
  "body": [
    {
      "type": "TextBlock",
      "text": "DevOps Health Dashboard -- {date}",
      "weight": "Bolder",
      "size": "Medium"
    },
    {
      "type": "FactSet",
      "facts": [
        { "title": "Overall Score", "value": "{score}/100 ({rating})" },
        { "title": "Overdue Items", "value": "{overdueCount}" },
        { "title": "Blocked Items", "value": "{blockedCount}" },
        { "title": "Pipeline Success", "value": "{pipelineSuccessRate}%" }
      ]
    },
    {
      "type": "TextBlock",
      "text": "**DORA**: DF: {deployFreq} | LT: {leadTime} | MTTR: {mttr} | CFR: {cfr}",
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
      "url": "https://dev.azure.com/{org}/{project}"
    }
  ]
}
```

### @Mention Pattern

When notifying specific team members (overdue items, assignments), use Teams @mention syntax:

```
Message text: "<at>{displayName}</at> -- you have {count} overdue work items."

Mention entity in message payload:
{
  "mentioned": {
    "id": "{userAadId}",
    "displayName": "{displayName}",
    "userIdentityType": "aadUser"
  },
  "text": "<at>{displayName}</at>"
}
```

### Target Channel Selection

1. If user specifies channel, use it
2. Look for a channel matching the project name
3. Look for a channel matching the area path (e.g., "Frontend")
4. Fall back to General channel
5. Ask user if no channel found

---

## microsoft-outlook-mcp

### Weekly Health Digest Email

Sent after the health monitoring workflow completes in digest mode.

```
To: {engineeringManager}, {teamLeads}
Subject: Engineering Health Digest -- {project} -- Week of {date}

Hi {recipientName},

Here is your weekly engineering health report for {project}.

## Overall Score: {score}/100 ({rating})

## DORA Metrics
| Metric | Value | Rating | Trend |
|--------|-------|--------|-------|
| Deployment Frequency | {value} | {rating} | {trend} |
| Lead Time for Changes | {value} | {rating} | {trend} |
| Mean Time to Recovery | {value} | {rating} | {trend} |
| Change Failure Rate | {value} | {rating} | {trend} |

## Sprint Status -- {currentSprint}
- Velocity: {completed}/{planned} pts ({completionRate}%)
- Overdue items: {overdueCount}
- Blocked items: {blockedCount}

## Pipeline Health
- Pass rate: {passRate}%
- Flaky tests: {flakyTestCount}
- Avg build time: {avgBuildTime}

## Action Items
1. {action1}
2. {action2}

---
Sent by Azure DevOps Orchestrator
```

### Overdue Item Alert Email

Sent to individual team members with overdue work items.

```
To: {assigneeEmail}
Subject: [Action Required] {overdueCount} Overdue Work Items -- {project}

Hi {assigneeName},

You have {overdueCount} work items past their target date:

| # | ID | Title | Due Date | Days Overdue |
|---|-----|-------|----------|-------------|
| 1 | #{id} | {title} | {dueDate} | {daysOverdue} |

Please update these items or reach out if you need help.

View your board: https://dev.azure.com/{org}/{project}/_boards

---
Sent by Azure DevOps Orchestrator
```

### Release Notes Distribution Email

Sent after release notes are generated.

```
To: {stakeholderDistributionList}
Subject: Release v{version} -- {project} -- {date}

Hi team,

Release v{version} has been deployed to {environment}.

{Full release notes content from release-workflow.md template}

---
Sent by Azure DevOps Orchestrator
```

### Sprint Planning Summary Email

Sent to team members after sprint planning.

```
To: {teamMembers}
Subject: Sprint Plan -- {sprintName} -- {project}

Hi team,

Sprint planning for {sprintName} ({startDate} to {endDate}) is complete.

## Your Assignments
{personalized list for each recipient}

## Sprint Summary
- Total capacity: {totalCapacity}h
- Committed: {committedPoints} pts
- Items: {itemCount}

View the sprint board: {sprintBoardUrl}

---
Sent by Azure DevOps Orchestrator
```

### Ship Completion Email

Sent after a work item is shipped.

```
To: {assigneeEmail}, {reviewerEmail}
Subject: PR Ready for Review -- #{workItemId}: {title}

Hi {reviewer},

Work item #{workItemId} "{title}" has been implemented and a PR is ready for review.

PR: {prUrl}
Branch: {branchName}
Files changed: {count}
Tests: {passed}/{total} passed

Changes: {summary}

---
Sent by Azure DevOps Orchestrator
```

---

## powerbi-fabric

### DORA Metrics Dataset Structure

Export DORA metrics to Power BI for dashboard visualization.

```json
{
  "dataset": "AzureDevOps_DORA",
  "tables": [
    {
      "name": "Deployments",
      "columns": [
        { "name": "DeploymentId", "type": "String" },
        { "name": "PipelineName", "type": "String" },
        { "name": "Environment", "type": "String" },
        { "name": "StartTime", "type": "DateTime" },
        { "name": "EndTime", "type": "DateTime" },
        { "name": "Status", "type": "String" },
        { "name": "Version", "type": "String" },
        { "name": "TriggeredBy", "type": "String" },
        { "name": "Branch", "type": "String" },
        { "name": "CommitCount", "type": "Int64" },
        { "name": "WorkItemCount", "type": "Int64" }
      ]
    },
    {
      "name": "WorkItems",
      "columns": [
        { "name": "WorkItemId", "type": "Int64" },
        { "name": "Title", "type": "String" },
        { "name": "Type", "type": "String" },
        { "name": "State", "type": "String" },
        { "name": "Priority", "type": "Int64" },
        { "name": "StoryPoints", "type": "Double" },
        { "name": "AssignedTo", "type": "String" },
        { "name": "IterationPath", "type": "String" },
        { "name": "AreaPath", "type": "String" },
        { "name": "CreatedDate", "type": "DateTime" },
        { "name": "ActivatedDate", "type": "DateTime" },
        { "name": "ResolvedDate", "type": "DateTime" },
        { "name": "ClosedDate", "type": "DateTime" },
        { "name": "CycleTimeDays", "type": "Double" },
        { "name": "LeadTimeDays", "type": "Double" }
      ]
    },
    {
      "name": "PipelineRuns",
      "columns": [
        { "name": "RunId", "type": "Int64" },
        { "name": "PipelineName", "type": "String" },
        { "name": "Result", "type": "String" },
        { "name": "StartTime", "type": "DateTime" },
        { "name": "FinishTime", "type": "DateTime" },
        { "name": "DurationMinutes", "type": "Double" },
        { "name": "Branch", "type": "String" },
        { "name": "RequestedFor", "type": "String" },
        { "name": "TestsPassed", "type": "Int64" },
        { "name": "TestsFailed", "type": "Int64" },
        { "name": "CodeCoverage", "type": "Double" }
      ]
    },
    {
      "name": "SprintVelocity",
      "columns": [
        { "name": "SprintName", "type": "String" },
        { "name": "Project", "type": "String" },
        { "name": "Team", "type": "String" },
        { "name": "StartDate", "type": "DateTime" },
        { "name": "EndDate", "type": "DateTime" },
        { "name": "PlannedPoints", "type": "Double" },
        { "name": "CompletedPoints", "type": "Double" },
        { "name": "CompletionRate", "type": "Double" },
        { "name": "ScopeChange", "type": "Int64" },
        { "name": "EscapedDefects", "type": "Int64" }
      ]
    },
    {
      "name": "WorkloadDistribution",
      "columns": [
        { "name": "Date", "type": "DateTime" },
        { "name": "Project", "type": "String" },
        { "name": "Team", "type": "String" },
        { "name": "Member", "type": "String" },
        { "name": "AssignedItems", "type": "Int64" },
        { "name": "AssignedPoints", "type": "Double" },
        { "name": "CapacityHours", "type": "Double" },
        { "name": "LoadPercent", "type": "Double" },
        { "name": "Status", "type": "String" }
      ]
    }
  ]
}
```

### Dataset Push Pattern

```
1. Check if dataset "AzureDevOps_DORA" exists:
   Use powerbi-fabric plugin to list datasets

2. If not exists, create dataset with the schema above

3. Push rows to each table:
   Use powerbi-fabric plugin to push rows

4. Suggest default report layout:
   - Page 1: DORA Metrics dashboard (4 KPI cards + trend line chart)
   - Page 2: Sprint Velocity (bar chart + completion rate line)
   - Page 3: Pipeline Health (pass rate gauge + failure category pie)
   - Page 4: Workload Distribution (stacked bar by member)
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

// Sprint Completion Rate
Sprint Completion =
AVERAGEX(
    SprintVelocity,
    SprintVelocity[CompletionRate]
)
```

---

## azure-monitor (Infrastructure Correlation)

### Pipeline Failure Correlation

When a pipeline fails with infrastructure category, check Azure Monitor for correlated issues:

```
1. Check if azure-monitor plugin is available
2. Query Azure Monitor for active alerts in the pipeline's resource group
3. Check for recent Azure Service Health incidents
4. Correlate:
   - Agent pool failure -> check VM availability alerts
   - Timeout -> check network/CPU alerts
   - Container failure -> check ACI/AKS alerts
5. Include correlated Azure alerts in the pipeline health report
```

### Integration Query Pattern

```
If azure-monitor is available:
  1. Get active alerts: az monitor alert list --resource-group {rg}
  2. Get service health: az rest --uri ".../providers/Microsoft.ResourceHealth/events"
  3. Correlate by timestamp: alert.firedDateTime within 30min of build.startTime
  4. Include in report: "Correlated Azure alert: {alertName} ({severity})"

If azure-monitor is NOT available:
  report: "Azure Monitor correlation skipped -- install azure-monitor to enable"
```

---

## Cross-Plugin Action Summary Template

Every workflow output includes a cross-plugin section at the bottom:

```
### Cross-Plugin Actions
- [x] Teams: Posted {card type} to #{channelName}
- [x] Outlook: Sent {email type} to {recipientCount} recipients
- [ ] Power BI: Skipped -- install powerbi-fabric to enable DORA dashboard
- [ ] Azure Monitor: Skipped -- install azure-monitor to enable infra correlation
```

Status indicators:
- `[x]` -- action completed successfully
- `[ ]` -- action skipped (plugin not installed)
- `[!]` -- action attempted but failed (include error reason)
