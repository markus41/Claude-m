---
name: ado-dashboard
description: Create dashboards and configure widgets
argument-hint: "<dashboard-name> --action create|add-widget|list [--scope team|project] [--widget markdown|chart|query-tile|build-history]"
allowed-tools:
  - Read
  - Write
  - Bash
  - AskUserQuestion
---

# Manage Dashboards

Create team or project dashboards, add and configure widgets, and manage dashboard layout.

## Prerequisites

- Authenticated to Azure DevOps (run `/ado-setup` first)
- `Manage dashboards` permission

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `<dashboard-name>` | Yes | Dashboard name |
| `--action` | No | `create` (default), `add-widget`, `list`, `delete`, `reorder` |
| `--scope` | No | `team` (default) or `project` |
| `--team` | No | Team name (for team-scoped dashboards) |
| `--widget` | No | Widget type to add |
| `--widget-settings` | No | JSON settings for the widget |
| `--dashboard-id` | No | Dashboard ID (for add-widget, delete) |

### Widget Types

| Widget | Description |
|--------|-------------|
| `markdown` | Custom Markdown content |
| `query-tile` | Single-number query result |
| `chart` | Work item chart (pie, bar, trend) |
| `build-history` | Build/pipeline success history |
| `test-results-trend` | Test pass/fail trend |
| `burndown` | Sprint burndown chart |
| `velocity` | Team velocity chart |
| `lead-time` | Cycle time / lead time |
| `cfd` | Cumulative flow diagram |

## Instructions

1. **Create dashboard** — `POST /_apis/dashboard/dashboards?api-version=7.1-preview.3`:
   ```json
   {
     "name": "<dashboard-name>",
     "description": "Team overview dashboard",
     "dashboardScope": "project_Team"
   }
   ```
   For project scope: `"dashboardScope": "project"`.

2. **Add widget** — `POST /_apis/dashboard/dashboards/{dashboardId}/widgets?api-version=7.1-preview.2`:
   ```json
   {
     "name": "Active Bugs",
     "contributionId": "ms.vss-dashboards-web.Microsoft.VisualStudioOnline.Dashboards.QueryScalarWidget",
     "size": { "rowSpan": 1, "columnSpan": 2 },
     "position": { "row": 1, "column": 1 },
     "settings": "{\"queryId\":\"{savedQueryId}\",\"colorRules\":{}}"
   }
   ```

   Common contribution IDs:
   - Markdown: `ms.vss-dashboards-web.Microsoft.VisualStudioOnline.Dashboards.MarkdownWidget`
   - Query Tile: `ms.vss-dashboards-web.Microsoft.VisualStudioOnline.Dashboards.QueryScalarWidget`
   - Chart: `ms.vss-dashboards-web.Microsoft.VisualStudioOnline.Dashboards.ChartForWorkItemsWidget`
   - Build History: `ms.vss-build-web.build-definition-widget`
   - Test Results: `ms.vss-test-web.Microsoft.VisualStudioTeamServices.Dashboards.TestResultsTrendWidget`

3. **Configure widget settings** — each widget type has specific settings JSON. Pass via `--widget-settings` or build interactively.

4. **List dashboards** — `GET /_apis/dashboard/dashboards?api-version=7.1-preview.3`
   Display: Dashboard ID, Name, Scope, Widget count, Owner.

5. **Reorder widgets** — `PATCH /_apis/dashboard/dashboards/{dashboardId}/widgets/{widgetId}?api-version=7.1-preview.2` with updated `position` and `size`.

6. **Delete dashboard** — `DELETE /_apis/dashboard/dashboards/{dashboardId}?api-version=7.1-preview.3`.

## Examples

```bash
/ado-dashboard "Sprint Board" --action create --scope team --team "Backend Team"
/ado-dashboard "Sprint Board" --action add-widget --widget markdown --widget-settings '{"content":"# Sprint 5 Goals\n- Ship auth\n- Fix bugs"}'
/ado-dashboard "Sprint Board" --action add-widget --widget query-tile --widget-settings '{"queryId":"abc-123"}'
/ado-dashboard --action list
```

## Error Handling

- **Widget contribution not found**: Extension providing the widget may not be installed — check installed extensions.
- **Dashboard limit reached**: Max dashboards per team — delete unused dashboards.
- **Invalid widget settings**: Settings JSON structure varies by widget type — validate format.
