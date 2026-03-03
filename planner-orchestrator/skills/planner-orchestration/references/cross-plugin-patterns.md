# Cross-Plugin Integration Patterns

## Detection

Before calling any external plugin, check availability:

```
1. Attempt a lightweight tool call (e.g., list Teams channels or get inbox count)
2. If it succeeds, the plugin is available — proceed
3. If it fails with "tool not found" or permission error, skip gracefully
4. Always note skipped actions in the output: "Teams notification skipped — install microsoft-teams-mcp to enable"
```

Never throw an error when an optional plugin is missing. Degrade gracefully.

## microsoft-teams-mcp

### Post a Plan Summary Card

Use the Teams plugin to post an adaptive card summarizing plan status.

**When to use**: After triage, sprint planning, or deadline scan.

**Card structure**:
```json
{
  "type": "AdaptiveCard",
  "version": "1.4",
  "body": [
    {
      "type": "TextBlock",
      "text": "📋 Planner Update — {Plan Title}",
      "weight": "Bolder",
      "size": "Medium"
    },
    {
      "type": "FactSet",
      "facts": [
        { "title": "Total Tasks", "value": "{total}" },
        { "title": "Completed", "value": "{completed} ({pct}%)" },
        { "title": "Overdue", "value": "{overdue}" },
        { "title": "Due This Week", "value": "{dueThisWeek}" }
      ]
    },
    {
      "type": "TextBlock",
      "text": "**Action Required**",
      "weight": "Bolder"
    },
    {
      "type": "TextBlock",
      "text": "{actionItems}",
      "wrap": true
    }
  ],
  "actions": [
    {
      "type": "Action.OpenUrl",
      "title": "Open in Planner",
      "url": "https://tasks.office.com"
    }
  ]
}
```

**@mention pattern**: Include `<at>{displayName}</at>` in message text for overdue task owners.

### Post Ship Notification

After a `/planner-orchestrator:ship` completes:
```
Post to the plan's associated Teams channel:
"✅ Task '{title}' shipped by @{user}. PR: {prUrl}"
```

## microsoft-outlook-mcp

### Weekly Digest Email

**When to use**: After `deadline-monitor` runs in digest mode.

**Email format**:
```
Subject: Planner Weekly Digest — {Plan Title} — {date}

Hi {owner},

Here's your Planner health report for the week of {date}.

## Overdue ({count})
{task list with assignees and due dates}

## Due This Week ({count})
{task list}

## No Due Date ({count})
{task list}

## Top Assignees by Load
{assignee workload table}

Sent by Planner Orchestrator
```

**Recipients**: Plan owner + assignees with overdue tasks.

### Ship Completion Email

When `percentComplete: 100` is set after ship:
```
Subject: ✅ [{planTitle}] Task Shipped: {taskTitle}

{assignee},

The task "{taskTitle}" has been implemented and is ready for review.

PR: {prUrl}
Branch: {branchName}

Changes: {summary}
```

## powerbi-fabric

### Export Schema

When the user requests a Power BI report on plan data, export tasks as a structured dataset:

```json
{
  "dataset": "PlannerTasks",
  "tables": [
    {
      "name": "Tasks",
      "columns": [
        "TaskId", "Title", "PlanId", "PlanTitle",
        "BucketId", "BucketName",
        "PercentComplete", "Priority",
        "DueDateTime", "CreatedDateTime",
        "AssigneeId", "AssigneeName",
        "Labels", "HasChecklist", "ChecklistCompleted"
      ]
    }
  ]
}
```

Use the `powerbi-fabric` plugin to create a dataset and push rows, then suggest a default report layout.

## azure-devops

### Work Item Sync Mapping

Map Planner fields to Azure DevOps Work Items:

| Planner Field | ADO Field | Notes |
|---------------|-----------|-------|
| `title` | `System.Title` | Direct |
| `description` | `System.Description` | Direct |
| `priority 0-1` | `Microsoft.VSTS.Common.Priority: 1` | Urgent/Important |
| `priority 2-4` | `Microsoft.VSTS.Common.Priority: 2` | Medium |
| `priority 5-9` | `Microsoft.VSTS.Common.Priority: 3` | Low |
| `percentComplete: 0` | State: `New` | |
| `percentComplete: 50` | State: `Active` | |
| `percentComplete: 100` | State: `Resolved` | |
| `dueDateTime` | `Microsoft.VSTS.Scheduling.TargetDate` | |
| `assignments` | `System.AssignedTo` | First assignee |

**Sync direction**: Planner → ADO by default. Add a Planner task comment with the ADO work item URL after sync.
