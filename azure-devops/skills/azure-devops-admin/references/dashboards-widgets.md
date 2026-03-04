# Azure DevOps — Dashboards and Widgets Reference

## Overview

Azure DevOps dashboards provide configurable visual displays of project health, build status, work item metrics, and test results. Dashboards can be **team-scoped** (visible to a specific team) or **project-scoped** (visible to all project members). Each dashboard contains widgets — configurable tiles that display specific data. Built-in widgets cover work item charts, build history, test results, pull requests, Markdown content, and more. Custom widgets can be developed via the Extension SDK. This reference covers the dashboard REST API, widget types and configuration, permissions, and custom widget development.

---

## Dashboard REST API

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|---------------------|----------------|-------|
| GET | `/{project}/{team}/_apis/dashboard/dashboards?api-version=7.1-preview.3` | Dashboard (Read) | — | List dashboards for a team |
| POST | `/{project}/{team}/_apis/dashboard/dashboards?api-version=7.1-preview.3` | Dashboard (Read & Write) | Body: `name`, `description`, `widgets[]` | Create dashboard |
| GET | `/{project}/{team}/_apis/dashboard/dashboards/{dashboardId}?api-version=7.1-preview.3` | Dashboard (Read) | — | Get dashboard details |
| PUT | `/{project}/{team}/_apis/dashboard/dashboards/{dashboardId}?api-version=7.1-preview.3` | Dashboard (Read & Write) | Body: full dashboard object | Update dashboard |
| DELETE | `/{project}/{team}/_apis/dashboard/dashboards/{dashboardId}?api-version=7.1-preview.3` | Dashboard (Read & Write) | — | Delete dashboard |
| POST | `/{project}/{team}/_apis/dashboard/dashboards/{dashboardId}/widgets?api-version=7.1-preview.2` | Dashboard (Read & Write) | Body: widget object | Add widget |
| GET | `/{project}/{team}/_apis/dashboard/dashboards/{dashboardId}/widgets/{widgetId}?api-version=7.1-preview.2` | Dashboard (Read) | — | Get widget details |
| PUT | `/{project}/{team}/_apis/dashboard/dashboards/{dashboardId}/widgets/{widgetId}?api-version=7.1-preview.2` | Dashboard (Read & Write) | Body: widget object | Update widget |
| DELETE | `/{project}/{team}/_apis/dashboard/dashboards/{dashboardId}/widgets/{widgetId}?api-version=7.1-preview.2` | Dashboard (Read & Write) | — | Remove widget |

---

## Creating a Dashboard

```json
POST https://dev.azure.com/myorg/myproject/My Team/_apis/dashboard/dashboards?api-version=7.1-preview.3
Content-Type: application/json

{
  "name": "Sprint 14 Overview",
  "description": "Key metrics for Sprint 14",
  "widgets": []
}
```

Response includes the `id` of the created dashboard for subsequent widget additions.

---

## Built-in Widget Types

### Work Item Widgets

| Widget Type | `contributionId` | Description | Key Settings |
|------------|-------------------|-------------|-------------|
| Query Tile | `ms.vss-dashboards-web.Microsoft.VisualStudioOnline.Dashboards.QueryScalarWidget` | Shows count from a query | `queryId`, `colorRules` |
| Chart for Work Items | `ms.vss-dashboards-web.Microsoft.VisualStudioOnline.Dashboards.ChartForWorkItemsWidget` | Pie/bar/trend from a query | `queryId`, `chartType`, `groupBy` |
| Assigned to Me | `ms.vss-dashboards-web.Microsoft.VisualStudioOnline.Dashboards.AssignedToMeWidget` | Current user's work items | — |
| Sprint Burndown | `ms.vss-dashboards-web.Microsoft.VisualStudioOnline.Dashboards.SprintBurndownWidget` | Sprint burndown chart | `team`, `iterationPath` |
| Sprint Capacity | `ms.vss-dashboards-web.Microsoft.VisualStudioOnline.Dashboards.SprintCapacityWidget` | Sprint capacity bars | `team` |
| Cumulative Flow | `ms.vss-dashboards-web.Microsoft.VisualStudioOnline.Dashboards.CumulativeFlowDiagramWidget` | CFD chart | `team`, `backlogLevel`, `timePeriod` |
| Velocity | `ms.vss-dashboards-web.Microsoft.VisualStudioOnline.Dashboards.VelocityWidget` | Velocity trend | `team`, `iterations` |
| Lead Time | `ms.vss-dashboards-web.Microsoft.VisualStudioOnline.Dashboards.LeadTimeWidget` | Lead time analytics | `team`, `timePeriod` |
| Cycle Time | `ms.vss-dashboards-web.Microsoft.VisualStudioOnline.Dashboards.CycleTimeWidget` | Cycle time analytics | `team`, `timePeriod` |

### Build and Pipeline Widgets

| Widget Type | `contributionId` | Description | Key Settings |
|------------|-------------------|-------------|-------------|
| Build History | `ms.vss-dashboards-web.Microsoft.VisualStudioOnline.Dashboards.BuildChartWidget` | Build result timeline | `definitionId` |
| Deployment Status | `ms.vss-dashboards-web.Microsoft.VisualStudioOnline.Dashboards.DeploymentStatusWidget` | Release stage status | `releaseDefinitionId` |

### Test Widgets

| Widget Type | `contributionId` | Description | Key Settings |
|------------|-------------------|-------------|-------------|
| Test Results Trend | `ms.vss-dashboards-web.Microsoft.VisualStudioOnline.Dashboards.TestResultsTrendWidget` | Pass/fail trend | `definitionId`, `timePeriod` |
| Test Results Trend (Advanced) | `ms.vss-test-web.Microsoft.VisualStudioOnline.Dashboards.TestResultsTrendAdvancedWidget` | Multi-pipeline test trends | `pipelineIds`, `timePeriod` |
| Code Coverage | `ms.vss-dashboards-web.Microsoft.VisualStudioOnline.Dashboards.CodeCoverageWidget` | Code coverage % | `definitionId` |

### Code Widgets

| Widget Type | `contributionId` | Description | Key Settings |
|------------|-------------------|-------------|-------------|
| Pull Request | `ms.vss-dashboards-web.Microsoft.VisualStudioOnline.Dashboards.PullRequestWidget` | Active PRs for current user | `repositoryId` |

### General Widgets

| Widget Type | `contributionId` | Description | Key Settings |
|------------|-------------------|-------------|-------------|
| Markdown | `ms.vss-dashboards-web.Microsoft.VisualStudioOnline.Dashboards.MarkdownWidget` | Custom Markdown content | `markdownContent` |
| Embedded Web Page | `ms.vss-dashboards-web.Microsoft.VisualStudioOnline.Dashboards.EmbeddedWebpageWidget` | External page iframe | `url` |
| Other Links | `ms.vss-dashboards-web.Microsoft.VisualStudioOnline.Dashboards.OtherLinksWidget` | Quick links to project resources | — |
| Team Members | `ms.vss-dashboards-web.Microsoft.VisualStudioOnline.Dashboards.TeamMembersWidget` | Team member avatars | — |
| Requirements Quality | `ms.vss-dashboards-web.Microsoft.VisualStudioOnline.Dashboards.RequirementQualityWidget` | Test coverage for requirements | `queryId` |

---

## Adding Widgets

### Markdown Widget

```json
POST https://dev.azure.com/myorg/myproject/My Team/_apis/dashboard/dashboards/{dashboardId}/widgets?api-version=7.1-preview.2
Content-Type: application/json

{
  "name": "Sprint Goals",
  "contributionId": "ms.vss-dashboards-web.Microsoft.VisualStudioOnline.Dashboards.MarkdownWidget",
  "size": {
    "columnSpan": 2,
    "rowSpan": 2
  },
  "position": {
    "column": 1,
    "row": 1
  },
  "settings": "{\"markdownContent\": \"## Sprint 14 Goals\\n\\n- [ ] Complete OAuth migration\\n- [ ] Deploy monitoring dashboard\\n- [ ] Fix P1 bugs from beta feedback\"}"
}
```

### Query Tile Widget

```json
{
  "name": "Open Bugs",
  "contributionId": "ms.vss-dashboards-web.Microsoft.VisualStudioOnline.Dashboards.QueryScalarWidget",
  "size": {
    "columnSpan": 1,
    "rowSpan": 1
  },
  "position": {
    "column": 3,
    "row": 1
  },
  "settings": "{\"queryId\": \"<shared-query-guid>\", \"colorRules\": [{\"operator\": \">\", \"value\": \"10\", \"backgroundColor\": \"#cc293d\"}, {\"operator\": \">\", \"value\": \"5\", \"backgroundColor\": \"#ff9d00\"}, {\"operator\": \">=\", \"value\": \"0\", \"backgroundColor\": \"#339933\"}]}"
}
```

### Build History Widget

```json
{
  "name": "CI Build Status",
  "contributionId": "ms.vss-dashboards-web.Microsoft.VisualStudioOnline.Dashboards.BuildChartWidget",
  "size": {
    "columnSpan": 3,
    "rowSpan": 2
  },
  "position": {
    "column": 1,
    "row": 3
  },
  "settings": "{\"definitionId\": 42}"
}
```

### Sprint Burndown Widget

```json
{
  "name": "Sprint Burndown",
  "contributionId": "ms.vss-dashboards-web.Microsoft.VisualStudioOnline.Dashboards.SprintBurndownWidget",
  "size": {
    "columnSpan": 3,
    "rowSpan": 2
  },
  "position": {
    "column": 4,
    "row": 1
  },
  "settings": "{}"
}
```

The Sprint Burndown widget auto-configures based on the team's current iteration.

---

## Widget Size and Positioning

Dashboards use a grid layout:

| Property | Description |
|----------|-------------|
| `size.columnSpan` | Width in grid columns (1-10) |
| `size.rowSpan` | Height in grid rows (1-10) |
| `position.column` | Starting column (1-based) |
| `position.row` | Starting row (1-based) |

Standard sizes:
- **Small tile**: 1x1 (Query Tile, links)
- **Medium tile**: 2x2 (Markdown, charts)
- **Large tile**: 3x2 or 4x2 (Burndown, build history, test trends)

---

## Dashboard Permissions

### Team Dashboards

- **Team members** can view dashboards.
- **Team admins** can edit dashboards by default.
- Individual dashboards can be restricted to "Edit by owner only."

### Project Dashboards

- Available to all project members.
- Edit permissions follow project-level dashboard security.

### Managing via REST

Dashboard permissions are managed through the security namespace `8adf73b7-389a-4276-b638-fe1653f7f0c1`:

```bash
# Read dashboard ACLs
curl -u ":$PAT" \
  "https://dev.azure.com/myorg/_apis/accesscontrollists/8adf73b7-389a-4276-b638-fe1653f7f0c1?token=$/myproject&includeExtendedInfo=true&api-version=7.1"
```

---

## Custom Widget Development

### Extension SDK

Custom widgets are built as Azure DevOps extensions using the [VSS Web Extension SDK](https://github.com/microsoft/azure-devops-extension-sdk):

```json
// vss-extension.json contribution
{
  "id": "custom-health-widget",
  "type": "ms.vss-dashboards-web.widget",
  "targets": ["ms.vss-dashboards-web.widget-catalog"],
  "properties": {
    "name": "Service Health",
    "description": "Displays service health status",
    "catalogIconUrl": "img/widget-icon.png",
    "previewImageUrl": "img/widget-preview.png",
    "uri": "widgets/health.html",
    "isNameConfigurable": true,
    "supportedSizes": [
      { "columnSpan": 2, "rowSpan": 1 },
      { "columnSpan": 2, "rowSpan": 2 }
    ],
    "supportedScopes": ["project_team"]
  }
}
```

### Widget Lifecycle

```typescript
import { WidgetStatusHelper } from "azure-devops-extension-api/Dashboard";

export class HealthWidget {
  async load(widgetSettings: any): Promise<any> {
    const settings = JSON.parse(widgetSettings.customSettings.data);
    // Render widget content
    document.getElementById("container").innerHTML = await this.fetchHealth(settings.serviceUrl);
    return WidgetStatusHelper.Success();
  }

  async reload(widgetSettings: any): Promise<any> {
    return this.load(widgetSettings);
  }
}
```

### Configuration Blade

Widgets can have a settings UI (configuration blade):

```json
{
  "id": "custom-health-widget-config",
  "type": "ms.vss-dashboards-web.widget-configuration",
  "targets": ["custom-health-widget"],
  "properties": {
    "name": "Health Widget Configuration",
    "uri": "widgets/health-config.html"
  }
}
```

---

## CLI Reference

The Azure DevOps CLI does not have dedicated dashboard commands. Use `az devops invoke` for REST API access:

```bash
# List dashboards
az devops invoke --area dashboard --resource dashboards \
  --route-parameters project=MyProject team="My Team" \
  --api-version 7.1-preview.3 \
  --org https://dev.azure.com/myorg

# Get a specific dashboard
az devops invoke --area dashboard --resource dashboards \
  --route-parameters project=MyProject team="My Team" dashboardId=<guid> \
  --api-version 7.1-preview.3 \
  --org https://dev.azure.com/myorg
```

---

## Limits and Gotchas

- **Max dashboards per team**: no hard limit, but more than 20 dashboards per team degrades navigation.
- **Max widgets per dashboard**: 200. Performance degrades significantly beyond 50 widgets.
- **Widget settings format**: the `settings` field is a **JSON string** (stringified JSON), not a JSON object. Always `JSON.stringify()` when setting and `JSON.parse()` when reading.
- **Preview API version**: dashboard APIs use preview versions (`7.1-preview.3` for dashboards, `7.1-preview.2` for widgets). Check the latest preview version in the API documentation.
- **Widget auto-refresh**: most built-in widgets refresh every 5 minutes. Custom widgets must implement their own refresh logic.
- **Embedded web page widget**: the target URL must allow iframe embedding (no `X-Frame-Options: DENY`). Many external services block iframes.
- **Team scope**: dashboards are team-scoped. A project with 10 teams has 10 separate dashboard collections. Cross-team dashboards require project-level dashboards.
- **Settings migration**: changing a widget's `contributionId` is not supported. Delete and re-create the widget instead.
- **Mobile rendering**: dashboards are not optimized for mobile browsers. Widgets may not render correctly on small screens.
