# WIQL Query Patterns Reference

Work Item Query Language (WIQL) patterns for common Azure DevOps orchestration scenarios.

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
Use mcp__azure-devops__azure_devops_query_work_items with the WIQL string as the query parameter.
```

WIQL returns work item IDs. To get full field data, follow up with:

```bash
# Single item
az boards work-item show --id {id} --output json

# Batch (up to 200 IDs)
POST {org}/{project}/_apis/wit/workitems?ids={id1},{id2},...&api-version=7.1
```

## Work Item Field Reference

### Core System Fields

| Field | Reference Name | Type | Notes |
|-------|---------------|------|-------|
| ID | `System.Id` | Integer | Unique across the organization |
| Title | `System.Title` | String | Max 255 characters |
| Description | `System.Description` | HTML | Rich text body |
| State | `System.State` | String | New, Active, Resolved, Closed, Removed |
| Reason | `System.Reason` | String | Reason for state change |
| Work Item Type | `System.WorkItemType` | String | Bug, User Story, Task, Feature, Epic |
| Assigned To | `System.AssignedTo` | Identity | user@domain.com or display name |
| Created Date | `System.CreatedDate` | DateTime | UTC |
| Changed Date | `System.ChangedDate` | DateTime | UTC |
| Created By | `System.CreatedBy` | Identity | |
| Changed By | `System.ChangedBy` | Identity | |
| Area Path | `System.AreaPath` | TreePath | Project\Team\Component |
| Iteration Path | `System.IterationPath` | TreePath | Project\Sprint 14 |
| Tags | `System.Tags` | String | Semicolon-separated |
| Board Column | `System.BoardColumn` | String | Kanban board column |
| Board Lane | `System.BoardLane` | String | Kanban board swim lane |

### Common Extended Fields

| Field | Reference Name | Type | Notes |
|-------|---------------|------|-------|
| Priority | `Microsoft.VSTS.Common.Priority` | Integer | 1=Critical, 2=High, 3=Medium, 4=Low |
| Severity | `Microsoft.VSTS.Common.Severity` | String | 1-Critical, 2-High, 3-Medium, 4-Low |
| Value Area | `Microsoft.VSTS.Common.ValueArea` | String | Business, Architectural |
| Story Points | `Microsoft.VSTS.Scheduling.StoryPoints` | Double | Agile process |
| Effort | `Microsoft.VSTS.Scheduling.Effort` | Double | CMMI/Scrum process |
| Remaining Work | `Microsoft.VSTS.Scheduling.RemainingWork` | Double | Hours remaining |
| Original Estimate | `Microsoft.VSTS.Scheduling.OriginalEstimate` | Double | Hours estimated |
| Completed Work | `Microsoft.VSTS.Scheduling.CompletedWork` | Double | Hours completed |
| Target Date | `Microsoft.VSTS.Scheduling.TargetDate` | DateTime | Due date |
| Start Date | `Microsoft.VSTS.Scheduling.StartDate` | DateTime | |
| Acceptance Criteria | `Microsoft.VSTS.Common.AcceptanceCriteria` | HTML | User Story AC |
| Repro Steps | `Microsoft.VSTS.TCM.ReproSteps` | HTML | Bug reproduction |
| Closed Date | `Microsoft.VSTS.Common.ClosedDate` | DateTime | When item was closed |
| Resolved Date | `Microsoft.VSTS.Common.ResolvedDate` | DateTime | When item was resolved |
| Activated Date | `Microsoft.VSTS.Common.ActivatedDate` | DateTime | When item became Active |
| Backlog Priority | `Microsoft.VSTS.Common.BacklogPriority` | Double | Backlog ordering |

### WIQL Operators Reference

| Operator | Example | Notes |
|----------|---------|-------|
| `=` | `[System.State] = 'Active'` | Exact match |
| `<>` | `[System.State] <> 'Closed'` | Not equal |
| `>`, `<`, `>=`, `<=` | `[Microsoft.VSTS.Common.Priority] <= 2` | Numeric/date comparison |
| `IN` | `[System.State] IN ('New', 'Active')` | Set membership |
| `NOT IN` | `[System.State] NOT IN ('Closed', 'Removed')` | Set exclusion |
| `CONTAINS` | `[System.Tags] CONTAINS 'frontend'` | Substring match |
| `NOT CONTAINS` | `[System.Tags] NOT CONTAINS 'deferred'` | Substring exclusion |
| `UNDER` | `[System.AreaPath] UNDER '{project}\Web'` | Tree path hierarchy |
| `NOT UNDER` | `[System.IterationPath] NOT UNDER '{project}\Archive'` | Tree exclusion |
| `EVER` | `[System.AssignedTo] EVER 'user@co.com'` | Historical value |
| `WAS` | `[System.State] WAS 'Active'` | Previous value |
| `@Today` | `[System.CreatedDate] >= @Today - 7` | Current date macro |
| `@Me` | `[System.AssignedTo] = @Me` | Current user macro |
| `@Project` | `[System.TeamProject] = @Project` | Current project macro |
| `@CurrentIteration` | `[System.IterationPath] = @CurrentIteration` | Current team iteration |
| `@CurrentIteration + 1` | Next iteration | Offset macro |
| `@CurrentIteration - 1` | Previous iteration | Offset macro |
| `@TeamAreas` | Team area paths | Team-scoped macro |
| `''` (empty) | `[System.AssignedTo] = ''` | Unassigned |

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

Note: Priority defaults to 4 in Azure DevOps, so "priority = 4" often indicates untriaged items.

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

## Health Monitoring Queries

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

### Work Items Linked to Builds (Artifact Links)

```sql
SELECT [System.Id], [System.Title], [System.State]
FROM WorkItemLinks
WHERE [Source].[System.TeamProject] = @Project
  AND [Source].[System.State] = 'Active'
  AND [System.Links.LinkType] = 'ArtifactLink'
ORDER BY [System.Id] ASC
```

Note: Build-to-work-item links are `ArtifactLink` type. Query builds separately via REST API and correlate.

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
```

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

For velocity trending across multiple iterations:

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

### Epics/Features with Target Dates

```sql
SELECT [System.Id], [System.Title], [System.TeamProject],
       [System.State], [Microsoft.VSTS.Scheduling.TargetDate]
FROM WorkItems
WHERE [System.WorkItemType] IN ('Epic', 'Feature')
  AND [System.State] NOT IN ('Closed', 'Removed')
ORDER BY [Microsoft.VSTS.Scheduling.TargetDate] ASC
```

## Performance Tips

- Always include `[System.TeamProject] = @Project` to scope queries to a single project
- Use `UNDER` for area/iteration paths instead of `CONTAINS` (UNDER is indexed)
- Limit SELECT columns to only the fields you need
- Use `@Today` macros instead of hardcoded dates
- For large result sets, WIQL returns IDs only; batch the follow-up detail calls in groups of 200
- Use `@CurrentIteration` macro for team-scoped queries (avoids hardcoding iteration paths)
- Cache work item field data within a session to avoid redundant API calls
- The maximum WIQL result set is 20,000 work items; add filters to stay under this limit
