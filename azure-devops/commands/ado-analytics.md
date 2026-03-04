---
name: ado-analytics
description: Build OData analytics queries for work items, pipelines, and test results
argument-hint: "--entity WorkItems|PipelineRuns|TestResults [--filter <odata-filter>] [--aggregate count|sum|avg] [--date-range 7d|30d|90d] [--export powerbi|csv]"
allowed-tools:
  - Read
  - Write
  - Bash
  - AskUserQuestion
---

# Analytics OData Queries

Build and execute OData analytics queries against Azure DevOps Analytics views. Query work items, pipeline runs, and test results with aggregation, filtering, and export to Power BI.

## Prerequisites

- Authenticated to Azure DevOps (run `/ado-setup` first)
- Azure DevOps Services or Server 2019+ with Analytics extension
- `View analytics` permission

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `--entity` | Yes | Entity set: `WorkItems`, `WorkItemSnapshot`, `PipelineRuns`, `PipelineRunActivityResults`, `TestRuns`, `TestResultsDaily`, `TestPointHistorySnapshot` |
| `--filter` | No | OData $filter expression |
| `--select` | No | Comma-separated fields to return |
| `--aggregate` | No | Aggregation: `count`, `sum`, `avg`, `min`, `max` with field |
| `--group-by` | No | Comma-separated fields to group by |
| `--date-range` | No | Date filter: `7d`, `30d`, `90d`, or `YYYY-MM-DD..YYYY-MM-DD` |
| `--top` | No | Limit results (default: 100) |
| `--export` | No | Export format: `powerbi` (generate .odc file) or `csv` |

## Instructions

1. **Build OData URL** — base: `https://analytics.dev.azure.com/{org}/{project}/_odata/v4.0-preview/`

2. **Entity examples**:

   **Work item snapshot (burn-down, velocity)**:
   ```
   WorkItemSnapshot?
     $apply=
       filter(DateValue ge 2025-01-01Z and Iteration/IterationPath eq 'Project\Sprint 5')
       /groupby((DateValue,WorkItemType),aggregate($count as Count, StoryPoints with sum as TotalPoints))
     &$orderby=DateValue
   ```

   **Pipeline run summary**:
   ```
   PipelineRuns?
     $apply=
       filter(CompletedDate ge 2025-01-01Z)
       /groupby((PipelineName,RunOutcome),aggregate($count as RunCount))
   ```

   **Test results daily trend**:
   ```
   TestResultsDaily?
     $apply=
       filter(DateSK ge 20250101)
       /groupby((DateSK),aggregate(ResultPassCount with sum as Passed, ResultFailCount with sum as Failed, ResultCount with sum as Total))
     &$orderby=DateSK
   ```

3. **Common filter patterns**:
   - Date range: `DateValue ge {start}Z and DateValue le {end}Z`
   - Iteration: `Iteration/IterationPath eq '{path}'`
   - Area: `Area/AreaPath eq '{path}'`
   - State: `State eq 'Active'`
   - Pipeline: `PipelineName eq '{name}'`
   - Outcome: `RunOutcome eq 'Succeed'`

4. **Execute query** — `GET` the constructed OData URL with authorization header.

5. **Format results** — display as table with column headers from `$select` or aggregation aliases.

6. **Export to Power BI** — if `--export powerbi`:
   - Generate an `.odc` (Office Data Connection) file with the OData URL
   - User opens in Power BI Desktop via Get Data > OData Feed

7. **Export to CSV** — if `--export csv`:
   - Fetch all results (paginate with `@odata.nextLink` if present)
   - Write to CSV file

## Examples

```bash
/ado-analytics --entity WorkItemSnapshot --aggregate "sum StoryPoints" --group-by WorkItemType --date-range 30d
/ado-analytics --entity PipelineRuns --filter "PipelineName eq 'CI Build'" --aggregate count --group-by RunOutcome --date-range 90d
/ado-analytics --entity TestResultsDaily --aggregate "sum ResultPassCount,sum ResultFailCount" --group-by DateSK --date-range 30d
/ado-analytics --entity WorkItems --filter "State eq 'Active' and WorkItemType eq 'Bug'" --select "WorkItemId,Title,Priority,AssignedTo" --top 50
/ado-analytics --entity PipelineRuns --date-range 30d --export powerbi
```

## OData Quick Reference

```
$filter    = field eq 'value' and field2 ge 2025-01-01Z
$select    = Field1,Field2,Field3
$orderby   = Field1 desc
$top       = 100
$apply     = filter(...)/groupby((...),aggregate(...))
$expand    = NavigationProperty($select=Field)

Aggregation functions: $count, sum, avg, min, max
```

## Error Handling

- **Analytics not available**: Extension not installed or not supported on Server — install the Analytics Marketplace extension.
- **Entity not found**: Invalid entity set name — list available entities at the base OData URL.
- **OData syntax error**: Display the API error and suggest corrections to the filter/aggregate expression.
- **Too many results**: Add filters or use `$top` to limit. Maximum 10,000 rows per request.
