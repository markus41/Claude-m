# Azure Boards — Delivery Plans Reference

## Overview

Delivery Plans provide a cross-team timeline visualization in Azure Boards. They render multiple team backlogs on a shared calendar, enabling portfolio-level planning, dependency tracking between work items, and milestone management. Plans support field criteria filters, tag-based scoping, and configurable markers for releases and key dates. This reference covers the Delivery Plans REST API, team configuration, iteration management, dependency tracking, and best practices for multi-team planning.

---

## Delivery Plans REST API

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|---------------------|----------------|-------|
| GET | `/_apis/work/plans?api-version=7.1` | Boards (Read) | — | List all plans in the project |
| POST | `/_apis/work/plans?api-version=7.1` | Boards (Read & Write) | Body: `name`, `type`, `properties` | Create a new plan |
| GET | `/_apis/work/plans/{planId}?api-version=7.1` | Boards (Read) | — | Get plan details |
| PUT | `/_apis/work/plans/{planId}?api-version=7.1` | Boards (Read & Write) | Body: full plan object | Update a plan |
| DELETE | `/_apis/work/plans/{planId}?api-version=7.1` | Boards (Read & Write) | — | Delete a plan |
| GET | `/_apis/work/plans/{planId}/deliverytimeline?api-version=7.1` | Boards (Read) | `revision`, `startDate`, `endDate` | Get rendered timeline data |

### Supporting Endpoints

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|---------------------|----------------|-------|
| GET | `/_apis/teams?api-version=7.1` | Project (Read) | `$top`, `$skip` | List teams in the project |
| GET | `/_apis/work/teamsettings/iterations?api-version=7.1` | Boards (Read) | `$timeframe` (`current`, `past`, `future`) | List team iterations |
| GET | `/_apis/work/teamsettings?api-version=7.1` | Boards (Read) | — | Get team backlog settings (default iteration, working days) |
| GET | `/{project}/{team}/_apis/work/boards?api-version=7.1` | Boards (Read) | — | List boards for a team |

---

## Creating a Delivery Plan

```json
POST https://dev.azure.com/myorg/myproject/_apis/work/plans?api-version=7.1
Content-Type: application/json

{
  "name": "Q2 2026 Release Plan",
  "type": "deliveryTimelineView",
  "properties": {
    "teamBacklogMappings": [
      {
        "teamId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "categoryReferenceName": "Microsoft.EpicCategory"
      },
      {
        "teamId": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
        "categoryReferenceName": "Microsoft.RequirementCategory"
      }
    ],
    "criteria": [
      {
        "fieldName": "System.Tags",
        "operator": "contains",
        "value": "release-q2"
      }
    ],
    "markers": [
      {
        "date": "2026-06-15T00:00:00Z",
        "label": "GA Release",
        "color": "#339933"
      },
      {
        "date": "2026-05-15T00:00:00Z",
        "label": "Feature Freeze",
        "color": "#cc293d"
      }
    ]
  }
}
```

---

## Team Backlog Mappings

Each entry in `teamBacklogMappings` adds one team's backlog row to the plan:

| Property | Description |
|----------|-------------|
| `teamId` | GUID of the team (from `/_apis/teams`) |
| `categoryReferenceName` | Backlog level: `Microsoft.EpicCategory`, `Microsoft.FeatureCategory`, `Microsoft.RequirementCategory`, or a custom category |

### Listing Teams for Mapping

```bash
# List all teams in a project
az devops team list --project MyProject --org https://dev.azure.com/myorg -o table

# Get team ID for API calls
az devops team show --team "Backend Team" --project MyProject \
  --org https://dev.azure.com/myorg --query id -o tsv
```

### Multiple Backlog Levels

You can add the same team at different backlog levels to show both epics and stories:

```json
"teamBacklogMappings": [
  { "teamId": "<team-guid>", "categoryReferenceName": "Microsoft.EpicCategory" },
  { "teamId": "<team-guid>", "categoryReferenceName": "Microsoft.RequirementCategory" }
]
```

---

## Iteration and Sprint Management

Delivery Plans render work items against iteration timelines. Iterations must have start and finish dates.

### Creating Iterations with Dates

```bash
# Create sprint with date range
az boards iteration project create \
  --name "Sprint 14" \
  --project MyProject \
  --start-date 2026-03-09 \
  --finish-date 2026-03-22 \
  --org https://dev.azure.com/myorg

# Assign iteration to a team
az boards iteration team add \
  --id <iteration-guid> \
  --team "Frontend Team" \
  --project MyProject \
  --org https://dev.azure.com/myorg
```

### Listing Team Iterations

```json
GET https://dev.azure.com/myorg/myproject/Frontend Team/_apis/work/teamsettings/iterations?api-version=7.1

// Response:
{
  "count": 6,
  "value": [
    {
      "id": "abc-123",
      "name": "Sprint 14",
      "attributes": {
        "startDate": "2026-03-09T00:00:00Z",
        "finishDate": "2026-03-22T00:00:00Z",
        "timeFrame": "current"
      },
      "path": "MyProject\\Sprint 14",
      "url": "..."
    }
  ]
}
```

**Gotcha**: Iterations without `startDate` and `finishDate` will not appear on the Delivery Plan timeline. Always set date ranges.

---

## Dependency Tracking

Delivery Plans visualize **predecessor/successor** links between work items as dependency lines on the timeline.

### Creating Dependencies

Dependencies use the standard work item link types:

```json
PATCH https://dev.azure.com/myorg/myproject/_apis/wit/workitems/42?api-version=7.1
Content-Type: application/json-patch+json

[
  {
    "op": "add",
    "path": "/relations/-",
    "value": {
      "rel": "System.LinkTypes.Dependency-Forward",
      "url": "https://dev.azure.com/myorg/myproject/_apis/wit/workitems/99",
      "attributes": {
        "comment": "Blocked until API contract is finalized"
      }
    }
  }
]
```

| Link Type | Reference Name | Direction |
|-----------|---------------|-----------|
| Successor | `System.LinkTypes.Dependency-Forward` | This item is a predecessor of the target |
| Predecessor | `System.LinkTypes.Dependency-Reverse` | This item depends on the target |

On the Delivery Plan, red dependency lines indicate cross-team blocking relationships. Green lines indicate within-team dependencies.

---

## Markers and Milestones

Markers appear as vertical lines across all team rows on the plan:

```json
"markers": [
  {
    "date": "2026-06-15T00:00:00Z",
    "label": "GA Release",
    "color": "#339933"
  },
  {
    "date": "2026-05-15T00:00:00Z",
    "label": "Code Freeze",
    "color": "#cc293d"
  },
  {
    "date": "2026-04-30T00:00:00Z",
    "label": "Beta",
    "color": "#5688e0"
  }
]
```

---

## Field Criteria and Tag Filters

Filter which work items appear on the plan using field criteria:

```json
"criteria": [
  {
    "fieldName": "System.Tags",
    "operator": "contains",
    "value": "release-q2"
  },
  {
    "fieldName": "System.State",
    "operator": "<>",
    "value": "Removed"
  },
  {
    "fieldName": "Microsoft.VSTS.Common.Priority",
    "operator": "<=",
    "value": "2"
  }
]
```

Supported operators: `=`, `<>`, `>`, `<`, `>=`, `<=`, `contains`, `does not contain`, `in`, `not in`.

---

## Reading Timeline Data

Fetch the rendered timeline for integration or reporting:

```json
GET https://dev.azure.com/myorg/myproject/_apis/work/plans/{planId}/deliverytimeline?startDate=2026-03-01&endDate=2026-06-30&api-version=7.1

// Response includes teams → iterations → work items positioned on the timeline
{
  "id": "<plan-guid>",
  "revision": 5,
  "teams": [
    {
      "id": "<team-guid>",
      "name": "Frontend Team",
      "iterations": [
        {
          "name": "Sprint 14",
          "path": "MyProject\\Sprint 14",
          "startDate": "2026-03-09T00:00:00Z",
          "finishDate": "2026-03-22T00:00:00Z",
          "workItems": [
            [
              { "id": 42, "title": "Implement OAuth flow", "state": "Active" },
              { "id": 43, "title": "Add MFA support", "state": "New" }
            ]
          ]
        }
      ]
    }
  ]
}
```

---

## Best Practices for Multi-Team Planning

1. **Standardize iteration cadences**: Align sprint dates across teams so the timeline is coherent. Staggered sprints create visual noise.

2. **Use consistent backlog levels**: If comparing teams, map them to the same category reference (e.g., all at `RequirementCategory`). Mixing epics and stories on one plan makes sizing comparisons meaningless.

3. **Tag-based scoping**: Use tags like `release-q2` or `platform-v3` to filter large backlogs. This keeps plans focused without creating custom queries.

4. **Dependency hygiene**: Review dependency lines weekly. Red cross-team lines indicate blocking risks. Create a WIQL query for unresolved dependencies:

   ```sql
   SELECT [System.Id], [System.Title], [System.State]
   FROM WorkItemLinks
   WHERE ([Source].[System.State] <> 'Closed'
     AND [Target].[System.State] <> 'Closed')
     AND [System.Links.LinkType] = 'System.LinkTypes.Dependency-Forward'
   MODE (MayContain)
   ```

5. **Marker discipline**: Add markers for external deadlines (compliance dates, partner launches) so all teams see hard constraints.

6. **Plan access**: Delivery Plans are visible to anyone with project-level Board read permissions. Use separate plans for executive vs. team views to control detail levels.

---

## Limits and Gotchas

- **Max teams per plan**: 15 team backlog mappings.
- **Date range**: the timeline renders up to 12 months at a time.
- **Iteration dates required**: work items in iterations without dates are invisible on the plan.
- **Dependency rendering**: only predecessor/successor links render as lines. Parent/child and related links are not shown.
- **Performance**: plans with many teams and long date ranges can be slow to load. Use field criteria to reduce the work item count.
- **Plan type**: the only valid `type` is `deliveryTimelineView`. No other plan types are supported via the API.
- **Revision tracking**: plans have a `revision` number. Concurrent edits require the current revision to avoid conflicts.
