# Azure DevOps — Analytics OData Reference

## Overview

The Azure DevOps Analytics service provides an OData v4.0 endpoint for querying project data across work items, pipelines, test results, and boards. Analytics data is pre-computed and optimized for reporting, enabling fast aggregations, trend analysis, and Power BI integration. This reference covers the OData endpoint structure, all major entity sets, query patterns (filtering, aggregation, expansion), Power BI connectivity, permissions, and performance optimization.

---

## OData Endpoint

```
https://analytics.dev.azure.com/{org}/{project}/_odata/v4.0-preview/
```

**Organization-level** (cross-project queries):

```
https://analytics.dev.azure.com/{org}/_odata/v4.0-preview/
```

### Authentication

- **PAT**: Basic auth with empty username and PAT as password. Requires **Analytics (Read)** permission.
- **Azure AD token**: OAuth with `499b84ac-1321-427f-aa17-267ca6975798/.default` scope.

```bash
# PAT-based access
curl -u ":$PAT" \
  "https://analytics.dev.azure.com/myorg/myproject/_odata/v4.0-preview/WorkItems?\$top=10"
```

---

## Entity Sets

### Work Item Entities

| Entity Set | Description | Key Fields |
|-----------|-------------|------------|
| `WorkItems` | Current state of all work items | `WorkItemId`, `Title`, `State`, `WorkItemType`, `AssignedTo`, `AreaSK`, `IterationSK`, `Priority`, `CreatedDate`, `ChangedDate`, `ClosedDate`, `StoryPoints`, `RemainingWork` |
| `WorkItemRevisions` | All historical revisions of work items | Same as WorkItems + `RevisedDate`, `Revision`, `Watermark` |
| `WorkItemLinks` | Links between work items | `SourceWorkItemId`, `TargetWorkItemId`, `LinkTypeName` |
| `WorkItemBoardSnapshot` | Daily board column snapshots | `DateSK`, `WorkItemId`, `BoardColumnName`, `BoardColumnDone`, `IsCurrent` |

### Pipeline Entities

| Entity Set | Description | Key Fields |
|-----------|-------------|------------|
| `PipelineRuns` | Pipeline run executions | `PipelineRunId`, `PipelineName`, `RunResult`, `RunReason`, `StartedDate`, `CompletedDate`, `QueueDurationSeconds`, `RunDurationSeconds` |
| `PipelineRunActivityResults` | Stage/job/task results within a run | `PipelineRunId`, `StageName`, `JobName`, `TaskName`, `Result`, `DurationSeconds` |

### Test Entities

| Entity Set | Description | Key Fields |
|-----------|-------------|------------|
| `TestRuns` | Test run executions | `TestRunId`, `Title`, `State`, `TotalTests`, `PassedTests`, `FailedTests`, `StartedDate`, `CompletedDate` |
| `TestResults` | Individual test case results | `TestResultId`, `TestCaseTitle`, `Outcome`, `DurationSeconds`, `ErrorMessage`, `StackTrace` |
| `TestResultsDaily` | Pre-aggregated daily test snapshots | `DateSK`, `TestSK`, `Outcome`, `ResultCount`, `ResultPassCount`, `ResultFailCount`, `ResultDurationSeconds` |
| `TestPointHistorySnapshot` | Historical test point outcomes | `DateSK`, `TestPointId`, `Outcome`, `TestCaseId`, `ConfigurationId` |

### Dimensional Entities

| Entity Set | Description | Key Fields |
|-----------|-------------|------------|
| `Areas` | Area path hierarchy | `AreaSK`, `AreaPath`, `AreaName`, `AreaLevel1`...`AreaLevel7` |
| `Iterations` | Iteration path hierarchy with dates | `IterationSK`, `IterationPath`, `IterationName`, `StartDate`, `EndDate`, `IsEnded` |
| `Projects` | Project metadata | `ProjectSK`, `ProjectName`, `ProjectId` |
| `Teams` | Team metadata | `TeamSK`, `TeamName`, `TeamId` |
| `Users` | User identities | `UserSK`, `UserName`, `UserEmail` |
| `Tags` | Work item tags | `TagSK`, `TagName` |
| `Processes` | Process templates | `ProcessSK`, `ProcessName` |
| `BoardLocations` | Board column definitions | `BoardLocationSK`, `ColumnName`, `ColumnOrder`, `IsDone` |

---

## Query Patterns

### Basic Filtering (`$filter`)

```
WorkItems?$filter=WorkItemType eq 'Bug' and State ne 'Closed' and Priority le 2
```

**Operators**: `eq`, `ne`, `gt`, `ge`, `lt`, `le`, `and`, `or`, `not`

**Functions**: `contains()`, `startswith()`, `endswith()`, `date()`, `year()`, `month()`, `day()`

```
WorkItems?$filter=contains(Title, 'login') and CreatedDate ge 2026-01-01Z
```

### Selecting Fields (`$select`)

```
WorkItems?$select=WorkItemId,Title,State,AssignedTo,Priority&$top=100
```

### Expanding Navigation Properties (`$expand`)

```
WorkItems?$select=WorkItemId,Title&$expand=Area($select=AreaPath),Iteration($select=IterationPath)&$top=50
```

### Ordering (`$orderby`)

```
WorkItems?$orderby=ChangedDate desc,Priority asc&$top=50
```

### Pagination (`$top`, `$skip`, `$count`)

```
WorkItems?$top=100&$skip=200&$count=true
```

The response includes `@odata.count` when `$count=true`.

### Date-Based Filtering

```
# Work items changed in the last 7 days
WorkItems?$filter=ChangedDate ge 2026-02-25Z

# Using DateSK (integer format YYYYMMDD) for snapshot entities
WorkItemBoardSnapshot?$filter=DateSK ge 20260225

# Closed in a specific month
WorkItems?$filter=ClosedDate ge 2026-02-01Z and ClosedDate lt 2026-03-01Z
```

---

## Aggregation with `$apply`

The `$apply` parameter enables server-side aggregation using the OData `groupby` and `aggregate` transformations.

### Bug Count by State

```
WorkItems?$apply=
  filter(WorkItemType eq 'Bug')
  /groupby(
    (State),
    aggregate($count as Count)
  )
```

### Average Story Points by Team

```
WorkItems?$apply=
  filter(WorkItemType eq 'User Story' and StoryPoints ne null)
  /groupby(
    (Teams/TeamName),
    aggregate(StoryPoints with sum as TotalPoints, $count as StoryCount)
  )
```

### Bug Trend by Week

```
WorkItemRevisions?$apply=
  filter(WorkItemType eq 'Bug' and State eq 'Active')
  /groupby(
    (RevisedDate),
    aggregate($count as ActiveBugs)
  )
  &$orderby=RevisedDate asc
```

### Average Cycle Time (Closed Items)

```
WorkItems?$apply=
  filter(WorkItemType eq 'User Story' and State eq 'Closed' and ClosedDate ge 2026-01-01Z)
  /groupby(
    (Iteration/IterationPath),
    aggregate(CycleTimeDays with average as AvgCycleTime, $count as ClosedCount)
  )
  &$orderby=AvgCycleTime desc
```

### Velocity per Sprint

```
WorkItems?$apply=
  filter(WorkItemType eq 'User Story' and State eq 'Closed' and StoryPoints ne null)
  /groupby(
    (Iteration/IterationName),
    aggregate(StoryPoints with sum as Velocity)
  )
  &$orderby=Iteration/IterationName desc
  &$top=10
```

### Pipeline Success Rate by Pipeline

```
PipelineRuns?$apply=
  filter(CompletedDate ge 2026-02-01Z)
  /groupby(
    (PipelineName),
    aggregate(
      $count as TotalRuns,
      SucceededCount with sum as Succeeded,
      FailedCount with sum as Failed
    )
  )
  &$orderby=TotalRuns desc
```

### Board Column Time (Average Days in Each Column)

```
WorkItemBoardSnapshot?$apply=
  filter(DateSK ge 20260201 and IsCurrent eq true)
  /groupby(
    (BoardColumnName),
    aggregate($count as DaysInColumn)
  )
```

---

## Power BI Integration

### OData Feed Connection

1. **Power BI Desktop** > Get Data > OData Feed
2. Enter URL: `https://analytics.dev.azure.com/{org}/{project}/_odata/v4.0-preview/WorkItems`
3. Authenticate with **Organizational account** (Azure AD) or **Basic** (PAT)
4. Select tables and build reports

### Direct Query with Filters

For large datasets, append OData filters to the URL in Power BI to reduce data transfer:

```
https://analytics.dev.azure.com/myorg/myproject/_odata/v4.0-preview/WorkItems?
  $filter=ChangedDate ge 2026-01-01Z and WorkItemType ne 'Test Case'
  &$select=WorkItemId,Title,State,WorkItemType,Priority,StoryPoints,CreatedDate,ClosedDate,CycleTimeDays
```

### Analytics Views (Pre-configured Data Sets)

Analytics Views are pre-defined filtered datasets created in Azure DevOps UI:

1. Navigate to **Project > Overview > Analytics Views**
2. Create a new view with desired filters (work item type, area path, date range)
3. Connect Power BI to the Analytics View URL

Analytics Views are recommended for large organizations because they cache and pre-filter data, improving Power BI refresh times.

### Sample DAX Measures

```dax
// Bug Trend
Open Bugs =
CALCULATE(
    COUNTROWS(WorkItems),
    WorkItems[WorkItemType] = "Bug",
    WorkItems[State] <> "Closed"
)

// Sprint Velocity
Velocity =
CALCULATE(
    SUM(WorkItems[StoryPoints]),
    WorkItems[State] = "Closed"
)

// Average Cycle Time
Avg Cycle Time =
AVERAGE(WorkItems[CycleTimeDays])

// Pass Rate
Test Pass Rate =
DIVIDE(
    SUM(TestResultsDaily[ResultPassCount]),
    SUM(TestResultsDaily[ResultCount]),
    0
)
```

---

## Permissions

### Analytics (Read)

Required for all OData queries. Granted by default to Contributors and above.

### Analytics Views

Creating and managing Analytics Views requires **Analytics Views (Read)** and **Analytics Views (Manage)** permissions.

### Cross-Project Queries

Organization-level OData queries (`https://analytics.dev.azure.com/{org}/_odata/v4.0-preview/`) require **Analytics (Read)** on each project included in the results. Results are automatically filtered to projects the user has access to.

---

## Performance Tips

1. **Always filter by date**: unbounded date queries scan the entire history and are throttled.

   ```
   # Good
   WorkItems?$filter=ChangedDate ge 2026-01-01Z

   # Bad — scans all history
   WorkItems?$filter=WorkItemType eq 'Bug'
   ```

2. **Use `$select`**: requesting all fields returns 50+ columns per row. Select only what you need.

3. **Prefer pre-aggregated entities**: `TestResultsDaily` is faster than `TestResults` for trend queries. `WorkItemBoardSnapshot` is faster than computing board time from revisions.

4. **Limit `$expand` depth**: expanding navigation properties multiplies response size. Use `$select` inside `$expand`:

   ```
   $expand=Area($select=AreaPath),Iteration($select=IterationName)
   ```

5. **Batch pagination**: OData returns max 10,000 rows per response. For larger datasets, use `$top` and `$skip` or the `@odata.nextLink` continuation URL.

6. **Use `$apply` for aggregation**: server-side aggregation is orders of magnitude faster than fetching raw rows and aggregating client-side.

7. **Cache with Analytics Views**: for Power BI dashboards, create an Analytics View to avoid querying raw OData on every refresh.

---

## Limits and Gotchas

- **Row limit**: max 10,000 rows per response. Use continuation tokens or `$skip` for larger datasets.
- **Query timeout**: complex queries timeout after 30 seconds. Simplify filters or use server-side aggregation.
- **Data latency**: Analytics data lags behind real-time by 1-5 minutes for work items and up to 30 minutes for pipeline runs.
- **Deleted work items**: deleted work items are removed from Analytics and cannot be queried.
- **Preview API version**: `v4.0-preview` is the current stable version. Entity set schemas may change between preview versions.
- **`$apply` nesting**: `$apply` supports chaining (`filter/groupby/aggregate`) but does not support nested `$apply` within `$expand`.
- **DateTime format**: use ISO 8601 with `Z` suffix (e.g., `2026-01-01Z`). Bare dates without timezone cause parsing errors.
- **Case sensitivity**: entity set names are case-sensitive (`WorkItems` not `workitems`). Filter values for string fields are case-insensitive by default.
- **Custom fields**: custom fields appear with their reference name (e.g., `Custom_ApprovalStatus` — dots replaced with underscores). Check the `$metadata` endpoint for exact names.
- **Organization-level throttling**: high-volume queries across many projects may be rate-limited. The response includes `Retry-After` headers when throttled.
