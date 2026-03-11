# WIQL Query Patterns Reference

Work Item Query Language (WIQL) patterns for common Azure DevOps orchestration scenarios.

---

## Query Execution

```bash
# Via az CLI
az boards query \
  --wiql "{wiql_query}" \
  --org {org} --project {project} --output json

# Via REST API
POST {org}/{project}/_apis/wit/wiql?api-version=7.1
Content-Type: application/json
{
  "query": "{wiql_query}"
}

# Via MCP
Use mcp__azure-devops__azure_devops_run_wiql_query with the WIQL string as the query parameter.
```

WIQL returns work item IDs only. To get full field data, follow up with:

```bash
# Single item
az boards work-item show --id {id} --output json

# Batch (up to 200 IDs)
GET {org}/{project}/_apis/wit/workitems?ids={id1},{id2},...&fields={field1},{field2}&api-version=7.1
```

---

## WIQL Syntax Reference

### SELECT, FROM, WHERE, ORDER BY

```sql
SELECT [field1], [field2], ...
FROM WorkItems                    -- flat query
-- or FROM WorkItemLinks          -- link query (tree, one-hop)
WHERE [condition1]
  AND [condition2]
  OR  [condition3]
ORDER BY [field] ASC|DESC
```

### Operators

| Operator | Example | Notes |
|----------|---------|-------|
| `=` | `[System.State] = 'Active'` | Exact match |
| `<>` | `[System.State] <> 'Closed'` | Not equal |
| `>`, `<`, `>=`, `<=` | `[Microsoft.VSTS.Common.Priority] <= 2` | Numeric/date comparison |
| `IN` | `[System.State] IN ('New', 'Active')` | Set membership |
| `NOT IN` | `[System.State] NOT IN ('Closed', 'Removed')` | Set exclusion |
| `CONTAINS` | `[System.Tags] CONTAINS 'frontend'` | Substring match |
| `NOT CONTAINS` | `[System.Tags] NOT CONTAINS 'deferred'` | Substring exclusion |
| `UNDER` | `[System.AreaPath] UNDER '{project}\Web'` | Tree path hierarchy (indexed) |
| `NOT UNDER` | `[System.IterationPath] NOT UNDER '{project}\Archive'` | Tree exclusion |
| `EVER` | `[System.AssignedTo] EVER 'user@co.com'` | Historical value (any revision) |
| `WAS` | `[System.State] WAS 'Active'` | Previous value |
| `''` (empty string) | `[System.AssignedTo] = ''` | Unassigned |

### Macros

| Macro | Meaning | Notes |
|-------|---------|-------|
| `@Project` | Current project context | Always use for scoping |
| `@Me` | Current authenticated user | |
| `@Today` | Current date (UTC) | |
| `@Today - N` | N days ago | e.g., `@Today - 7` |
| `@Today + N` | N days from now | e.g., `@Today + 14` |
| `@CurrentIteration` | Current sprint for the team | Requires team context |
| `@CurrentIteration + 1` | Next sprint | Offset macro |
| `@CurrentIteration - 1` | Previous sprint | Offset macro |
| `@StartOfYear` | January 1 of current year | |
| `@StartOfMonth` | First day of current month | |
| `@StartOfWeek` | Monday of current week | |
| `@TeamAreas` | Team area paths | Team-scoped macro |

### Link Query Modes

```sql
-- Tree query (parent-child hierarchy)
SELECT [System.Id], [System.Title]
FROM WorkItemLinks
WHERE [Source].[System.TeamProject] = @Project
  AND [System.Links.LinkType] = 'System.LinkTypes.Hierarchy-Forward'
MODE (Recursive)

-- One-hop query
SELECT [System.Id], [System.Title]
FROM WorkItemLinks
WHERE [Source].[System.TeamProject] = @Project
  AND [System.Links.LinkType] = 'System.LinkTypes.Related'
MODE (MustContain)     -- links must exist
-- or MODE (MayContain) -- links optional
-- or MODE (DoesNotContain) -- no matching links
```

---

## Work Item Field Reference

### Core System Fields

| Field | Reference Name | Type |
|-------|---------------|------|
| ID | `System.Id` | Integer |
| Title | `System.Title` | String |
| State | `System.State` | String |
| Work Item Type | `System.WorkItemType` | String |
| Assigned To | `System.AssignedTo` | Identity |
| Created Date | `System.CreatedDate` | DateTime |
| Changed Date | `System.ChangedDate` | DateTime |
| Area Path | `System.AreaPath` | TreePath |
| Iteration Path | `System.IterationPath` | TreePath |
| Tags | `System.Tags` | String |
| Board Column | `System.BoardColumn` | String |

### Common Extended Fields

| Field | Reference Name | Type |
|-------|---------------|------|
| Priority | `Microsoft.VSTS.Common.Priority` | Integer |
| Severity | `Microsoft.VSTS.Common.Severity` | String |
| Story Points | `Microsoft.VSTS.Scheduling.StoryPoints` | Double |
| Remaining Work | `Microsoft.VSTS.Scheduling.RemainingWork` | Double |
| Original Estimate | `Microsoft.VSTS.Scheduling.OriginalEstimate` | Double |
| Target Date | `Microsoft.VSTS.Scheduling.TargetDate` | DateTime |
| Acceptance Criteria | `Microsoft.VSTS.Common.AcceptanceCriteria` | HTML |
| Repro Steps | `Microsoft.VSTS.TCM.ReproSteps` | HTML |
| Closed Date | `Microsoft.VSTS.Common.ClosedDate` | DateTime |
| Resolved Date | `Microsoft.VSTS.Common.ResolvedDate` | DateTime |
| Activated Date | `Microsoft.VSTS.Common.ActivatedDate` | DateTime |
| Backlog Priority | `Microsoft.VSTS.Common.BacklogPriority` | Double |

---

## Backlog Triage Queries

### Untriaged Items (no priority, no assignment)

```sql
SELECT [System.Id], [System.Title], [System.WorkItemType],
       [System.CreatedDate], [System.State], [System.Tags], [System.AreaPath]
FROM WorkItems
WHERE [System.TeamProject] = @Project
  AND [System.State] IN ('New', 'Proposed')
  AND [Microsoft.VSTS.Common.Priority] = 4
  AND [System.AssignedTo] = ''
  AND [System.WorkItemType] IN ('User Story', 'Bug', 'Task')
ORDER BY [System.CreatedDate] DESC
```

Note: Priority defaults to 4 in Azure DevOps, so `priority = 4` often indicates untriaged items.

### Unassigned Active Items

```sql
SELECT [System.Id], [System.Title], [System.WorkItemType],
       [Microsoft.VSTS.Common.Priority], [System.State],
       [System.IterationPath]
FROM WorkItems
WHERE [System.TeamProject] = @Project
  AND [System.State] IN ('Active', 'New')
  AND [System.AssignedTo] = ''
  AND [System.WorkItemType] IN ('User Story', 'Bug', 'Task')
ORDER BY [Microsoft.VSTS.Common.Priority] ASC, [System.CreatedDate] ASC
```

### Items Without Tags

```sql
SELECT [System.Id], [System.Title], [System.WorkItemType], [System.State]
FROM WorkItems
WHERE [System.TeamProject] = @Project
  AND [System.State] NOT IN ('Closed', 'Removed', 'Done')
  AND [System.Tags] = ''
  AND [System.WorkItemType] IN ('User Story', 'Bug', 'Task')
ORDER BY [System.CreatedDate] DESC
```

### Recently Created Items (Triage Candidates)

Items created in the last 7 days with default priority:

```sql
SELECT [System.Id], [System.Title], [System.WorkItemType],
       [System.CreatedDate], [System.CreatedBy]
FROM WorkItems
WHERE [System.TeamProject] = @Project
  AND [System.CreatedDate] >= @Today - 7
  AND [Microsoft.VSTS.Common.Priority] = 4
  AND [System.State] = 'New'
ORDER BY [System.CreatedDate] DESC
```

### Stale Items (no updates in 30+ days)

```sql
SELECT [System.Id], [System.Title], [System.State],
       [System.ChangedDate], [System.AssignedTo]
FROM WorkItems
WHERE [System.TeamProject] = @Project
  AND [System.State] IN ('Active', 'New')
  AND [System.ChangedDate] < @Today - 30
ORDER BY [System.ChangedDate] ASC
```

### Blocked Items

```sql
SELECT [System.Id], [System.Title], [System.State],
       [System.AssignedTo], [System.Tags]
FROM WorkItems
WHERE [System.TeamProject] = @Project
  AND [System.State] = 'Active'
  AND ([System.Tags] CONTAINS 'Blocked'
       OR [System.BoardColumn] = 'Blocked')
ORDER BY [Microsoft.VSTS.Common.Priority] ASC
```

---

## Sprint Planning Queries

### Backlog Items Available for Sprint

Items not assigned to any iteration, ready for sprint selection:

```sql
SELECT [System.Id], [System.Title], [System.WorkItemType],
       [Microsoft.VSTS.Scheduling.StoryPoints],
       [Microsoft.VSTS.Common.Priority],
       [System.Tags], [System.AssignedTo]
FROM WorkItems
WHERE [System.TeamProject] = @Project
  AND [System.State] IN ('New', 'Approved', 'Proposed')
  AND [System.IterationPath] = @Project
  AND [System.WorkItemType] IN ('User Story', 'Bug', 'Task')
ORDER BY [Microsoft.VSTS.Common.BacklogPriority] ASC
```

### Current Iteration Items

```sql
SELECT [System.Id], [System.Title], [System.WorkItemType],
       [System.State], [System.AssignedTo],
       [Microsoft.VSTS.Scheduling.StoryPoints],
       [Microsoft.VSTS.Common.Priority]
FROM WorkItems
WHERE [System.TeamProject] = @Project
  AND [System.IterationPath] = @CurrentIteration
  AND [System.State] NOT IN ('Removed')
ORDER BY [Microsoft.VSTS.Common.Priority] ASC
```

### Items by Assignee in Iteration (Workload Query)

```sql
SELECT [System.Id], [System.Title], [System.State],
       [Microsoft.VSTS.Scheduling.StoryPoints],
       [System.AssignedTo], [Microsoft.VSTS.Common.Priority]
FROM WorkItems
WHERE [System.TeamProject] = @Project
  AND [System.IterationPath] = @CurrentIteration
  AND [System.State] NOT IN ('Closed', 'Removed')
  AND [System.AssignedTo] <> ''
ORDER BY [System.AssignedTo] ASC, [Microsoft.VSTS.Common.Priority] ASC
```

### Capacity Planning -- Incomplete Items

```sql
SELECT [System.Id], [System.Title], [System.AssignedTo],
       [Microsoft.VSTS.Scheduling.RemainingWork],
       [Microsoft.VSTS.Scheduling.StoryPoints]
FROM WorkItems
WHERE [System.TeamProject] = @Project
  AND [System.IterationPath] = @CurrentIteration
  AND [System.State] NOT IN ('Closed', 'Removed', 'Resolved')
ORDER BY [System.AssignedTo] ASC
```

---

## Overdue and At-Risk Queries

### Overdue Items (past target date)

```sql
SELECT [System.Id], [System.Title], [System.State],
       [System.AssignedTo], [Microsoft.VSTS.Scheduling.TargetDate],
       [Microsoft.VSTS.Common.Priority]
FROM WorkItems
WHERE [System.TeamProject] = @Project
  AND [System.State] NOT IN ('Closed', 'Removed', 'Done', 'Resolved')
  AND [Microsoft.VSTS.Scheduling.TargetDate] < @Today
ORDER BY [Microsoft.VSTS.Scheduling.TargetDate] ASC
```

### Due This Week

```sql
SELECT [System.Id], [System.Title], [System.State],
       [System.AssignedTo], [Microsoft.VSTS.Scheduling.TargetDate]
FROM WorkItems
WHERE [System.TeamProject] = @Project
  AND [System.State] NOT IN ('Closed', 'Removed', 'Done', 'Resolved')
  AND [Microsoft.VSTS.Scheduling.TargetDate] >= @Today
  AND [Microsoft.VSTS.Scheduling.TargetDate] <= @Today + 7
ORDER BY [Microsoft.VSTS.Scheduling.TargetDate] ASC
```

### Items In Progress Too Long (>14 days active)

```sql
SELECT [System.Id], [System.Title], [System.AssignedTo],
       [Microsoft.VSTS.Common.ActivatedDate]
FROM WorkItems
WHERE [System.TeamProject] = @Project
  AND [System.State] = 'Active'
  AND [Microsoft.VSTS.Common.ActivatedDate] < @Today - 14
ORDER BY [Microsoft.VSTS.Common.ActivatedDate] ASC
```

### Stalled Items (5+ days without update)

```sql
SELECT [System.Id], [System.Title], [System.AssignedTo],
       [System.State], [System.ChangedDate]
FROM WorkItems
WHERE [System.TeamProject] = @Project
  AND [System.State] = 'Active'
  AND [System.ChangedDate] < @Today - 5
ORDER BY [System.ChangedDate] ASC
```

### Active Bugs by Severity

```sql
SELECT [System.Id], [System.Title], [Microsoft.VSTS.Common.Severity],
       [Microsoft.VSTS.Common.Priority], [System.AssignedTo],
       [System.CreatedDate]
FROM WorkItems
WHERE [System.TeamProject] = @Project
  AND [System.WorkItemType] = 'Bug'
  AND [Microsoft.VSTS.Common.Priority] <= 2
  AND [System.State] IN ('New', 'Active')
ORDER BY [Microsoft.VSTS.Common.Severity] ASC,
         [Microsoft.VSTS.Common.Priority] ASC
```

---

## Linked Work Item Queries

### Parent-Child Hierarchy

Find all child items of a feature or epic:

```sql
SELECT [System.Id], [System.Title], [System.WorkItemType],
       [System.State], [System.AssignedTo]
FROM WorkItemLinks
WHERE [Source].[System.Id] = {parentId}
  AND [System.Links.LinkType] = 'System.LinkTypes.Hierarchy-Forward'
  AND [Target].[System.State] <> 'Removed'
MODE (Recursive)
```

### Related Items

Find all items related to a specific work item:

```sql
SELECT [System.Id], [System.Title], [System.WorkItemType],
       [System.State]
FROM WorkItemLinks
WHERE [Source].[System.Id] = {workItemId}
  AND [System.Links.LinkType] = 'System.LinkTypes.Related'
MODE (MayContain)
```

### Predecessor/Successor (Dependencies)

Find items that this work item depends on (predecessors):

```sql
SELECT [System.Id], [System.Title], [System.State],
       [System.AssignedTo]
FROM WorkItemLinks
WHERE [Source].[System.Id] = {workItemId}
  AND [System.Links.LinkType] = 'System.LinkTypes.Dependency-Reverse'
MODE (MustContain)
```

Find items blocked by this work item (successors):

```sql
SELECT [System.Id], [System.Title], [System.State],
       [System.AssignedTo]
FROM WorkItemLinks
WHERE [Source].[System.Id] = {workItemId}
  AND [System.Links.LinkType] = 'System.LinkTypes.Dependency-Forward'
MODE (MustContain)
```

---

## Cross-Project Portfolio Queries

### All Active Epics/Features Across Projects

```sql
SELECT [System.Id], [System.Title], [System.TeamProject],
       [System.WorkItemType], [System.State], [System.AssignedTo],
       [Microsoft.VSTS.Common.Priority]
FROM WorkItems
WHERE [System.State] IN ('Active', 'New')
  AND [System.WorkItemType] IN ('Epic', 'Feature')
ORDER BY [System.TeamProject] ASC, [Microsoft.VSTS.Common.Priority] ASC
```

Note: Cross-project queries omit `[System.TeamProject] = @Project` filter.

### Epics/Features with Target Dates

```sql
SELECT [System.Id], [System.Title], [System.TeamProject],
       [System.State], [Microsoft.VSTS.Scheduling.TargetDate]
FROM WorkItems
WHERE [System.WorkItemType] IN ('Epic', 'Feature')
  AND [System.State] NOT IN ('Closed', 'Removed')
ORDER BY [Microsoft.VSTS.Scheduling.TargetDate] ASC
```

---

## Area Path and Iteration Path Patterns

### Area Path Queries

```sql
-- Items under a specific area (includes sub-areas)
WHERE [System.AreaPath] UNDER '{project}\{area}'

-- Items in an exact area (no sub-areas)
WHERE [System.AreaPath] = '{project}\{area}\{subarea}'
```

### Iteration Path Queries

```sql
-- Items in a specific sprint
WHERE [System.IterationPath] = '{project}\{iteration}'

-- Items in current sprint or sub-iterations
WHERE [System.IterationPath] UNDER '{project}\{iteration}'

-- Items with no iteration (root backlog)
WHERE [System.IterationPath] = '{project}'

-- Current iteration macro (team-scoped)
WHERE [System.IterationPath] = @CurrentIteration

-- Next iteration
WHERE [System.IterationPath] = @CurrentIteration + 1
```

---

## Retrospective Queries

### Sprint Completion Query

All items in a specific iteration with their final state:

```sql
SELECT [System.Id], [System.Title], [System.WorkItemType],
       [System.State], [Microsoft.VSTS.Scheduling.StoryPoints],
       [System.AssignedTo], [Microsoft.VSTS.Common.ClosedDate],
       [Microsoft.VSTS.Common.ActivatedDate]
FROM WorkItems
WHERE [System.TeamProject] = @Project
  AND [System.IterationPath] = '{project}\{iteration}'
  AND [System.WorkItemType] IN ('User Story', 'Bug')
ORDER BY [System.State] ASC
```

### Escaped Defects (Post-Sprint Bugs)

```sql
SELECT [System.Id], [System.Title], [System.CreatedDate],
       [Microsoft.VSTS.Common.Severity], [System.AreaPath]
FROM WorkItems
WHERE [System.TeamProject] = @Project
  AND [System.WorkItemType] = 'Bug'
  AND [System.CreatedDate] >= '{sprintEndDate}'
  AND [System.Tags] CONTAINS 'production'
ORDER BY [Microsoft.VSTS.Common.Severity] ASC
```

### Cross-Iteration Velocity Trend

```sql
SELECT [System.Id], [System.IterationPath],
       [Microsoft.VSTS.Scheduling.StoryPoints], [System.State]
FROM WorkItems
WHERE [System.TeamProject] = @Project
  AND [System.IterationPath] UNDER '{project}\Release 2'
  AND [System.WorkItemType] IN ('User Story', 'Bug')
  AND [System.State] IN ('Closed', 'Done', 'Resolved')
ORDER BY [System.IterationPath] ASC
```

---

## Performance Tips

1. Always include `[System.TeamProject] = @Project` to scope queries to a single project
2. Use `UNDER` for area/iteration paths instead of `CONTAINS` (UNDER is indexed)
3. Limit SELECT columns to only the fields you need
4. Use `@Today` macros instead of hardcoded dates
5. For large result sets, WIQL returns IDs only; batch the follow-up detail calls in groups of 200
6. Use `@CurrentIteration` macro for team-scoped queries (avoids hardcoding iteration paths)
7. Cache work item field data within a session to avoid redundant API calls
8. The maximum WIQL result set is 20,000 work items; add filters to stay under this limit
9. WIQL query timeout is 30 seconds; break large queries by area/iteration path
10. Use `NOT IN ('Closed', 'Removed')` rather than listing all active states (more future-proof)
