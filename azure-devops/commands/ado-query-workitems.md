---
name: ado-query-workitems
description: Query work items using WIQL with presets, pagination, tree queries, and export options
argument-hint: "<wiql-query-or-preset> [--preset my-bugs|my-tasks|sprint-backlog|unassigned] [--format table|json|csv] [--top <count>]"
allowed-tools:
  - Read
  - Write
  - Bash
  - AskUserQuestion
---

# Query Work Items

Run WIQL queries to find work items in Azure DevOps Boards with pagination, hierarchical results, saved query management, and export options.

## Prerequisites

- Authenticated to Azure DevOps (run `/ado-setup` first)
- `View work items in this node` permission

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `<wiql-query>` | No | Free-form WIQL query string (if no `--preset`) |
| `--preset` | No | Predefined query: `my-bugs`, `my-tasks`, `sprint-backlog`, `unassigned`, `recent-closed`, `high-priority` |
| `--format` | No | Output format: `table` (default), `json`, `csv` |
| `--top` | No | Max results to return (default: 50, max: 200) |
| `--tree` | No | Execute as a tree (hierarchical) query |
| `--one-hop` | No | Execute as a one-hop link query |
| `--saved-query` | No | Run a saved query by name or GUID |
| `--count-only` | No | Return only the count of matching items |
| `--fields` | No | Comma-separated field names to return (default: ID, Type, Title, State, AssignedTo, Priority) |

## Instructions

1. **Resolve query** — determine the WIQL query to execute:
   - If `--preset` is provided, use a predefined query:
     - `my-bugs`: `SELECT [System.Id] FROM WorkItems WHERE [System.WorkItemType] = 'Bug' AND [System.AssignedTo] = @Me AND [System.State] <> 'Closed' ORDER BY [Microsoft.VSTS.Common.Priority]`
     - `my-tasks`: `SELECT [System.Id] FROM WorkItems WHERE [System.WorkItemType] = 'Task' AND [System.AssignedTo] = @Me AND [System.IterationPath] = @CurrentIteration ORDER BY [System.State]`
     - `sprint-backlog`: `SELECT [System.Id] FROM WorkItems WHERE [System.IterationPath] = @CurrentIteration AND [System.State] <> 'Removed' ORDER BY [Microsoft.VSTS.Common.BacklogPriority]`
     - `unassigned`: `SELECT [System.Id] FROM WorkItems WHERE [System.AssignedTo] = '' AND [System.State] NOT IN ('Closed','Removed') ORDER BY [System.CreatedDate] DESC`
     - `recent-closed`: `SELECT [System.Id] FROM WorkItems WHERE [System.State] = 'Closed' AND [System.ChangedDate] >= @Today - 7 ORDER BY [System.ChangedDate] DESC`
     - `high-priority`: `SELECT [System.Id] FROM WorkItems WHERE [Microsoft.VSTS.Common.Priority] <= 2 AND [System.State] NOT IN ('Closed','Removed') ORDER BY [Microsoft.VSTS.Common.Priority]`
   - If `--saved-query` is provided, fetch via `GET /_apis/wit/queries/{nameOrId}?api-version=7.1` and use its WIQL.
   - Otherwise, use the provided WIQL query string.

2. **Execute query** — call `POST /_apis/wit/wiql?api-version=7.1&$top={top}` with body `{ "query": "<wiql>" }`.
   - For `--tree` queries, set query type to `tree` and parse `workItemRelations` in response.
   - For `--one-hop` queries, set query type to `oneHop`.

3. **Handle pagination** — the WIQL endpoint returns up to 20,000 IDs. Batch-fetch details in groups of 200:
   - `GET /_apis/wit/workitems?ids={id1},{id2},...&fields={fields}&api-version=7.1`
   - Use `$top` and continuation to paginate if needed.

4. **Count-only mode** — if `--count-only`, return only the count of work item IDs without fetching details.

5. **Format output**:
   - **table**: Display as formatted table with columns matching `--fields`
   - **json**: Output raw JSON array of work items
   - **csv**: Output CSV with headers matching field names

6. **Saved query management** — useful sub-operations:
   - List shared queries: `GET /_apis/wit/queries/Shared Queries?$depth=2&api-version=7.1`
   - Create saved query: `POST /_apis/wit/queries/{folderId}?api-version=7.1` with `{ "name": "...", "wiql": "..." }`

## WIQL Quick Reference

```sql
-- Basic flat query
SELECT [System.Id], [System.Title] FROM WorkItems
WHERE [System.TeamProject] = @project
  AND [System.WorkItemType] = 'Bug'
  AND [System.State] IN ('Active','New')
ORDER BY [System.CreatedDate] DESC

-- Tree query (parent-child)
SELECT [System.Id] FROM WorkItemLinks
WHERE ([Source].[System.WorkItemType] = 'Feature')
  AND ([Target].[System.WorkItemType] = 'User Story')
  AND ([System.Links.LinkType] = 'System.LinkTypes.Hierarchy-Forward')
MODE (Recursive)
```

## Examples

```bash
/ado-query-workitems --preset my-bugs --format table
/ado-query-workitems "SELECT [System.Id] FROM WorkItems WHERE [System.Tags] CONTAINS 'release-v2'" --top 20
/ado-query-workitems --saved-query "Sprint Review Items" --format csv
/ado-query-workitems --preset sprint-backlog --tree --count-only
```

## Error Handling

- **Invalid WIQL syntax**: Display the API error message and suggest corrections based on common mistakes (missing brackets, wrong field names).
- **Query returns 0 results**: Suggest broadening filters or checking project/iteration scope.
- **Saved query not found**: List available shared queries to help user find the correct name.
- **Too many results (>20,000)**: Add more WHERE filters or use `--top` to limit.
