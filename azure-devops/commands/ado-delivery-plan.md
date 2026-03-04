---
name: ado-delivery-plan
description: Create and manage delivery plans for cross-team timeline views
argument-hint: "<plan-name> --action create|view|update|delete [--teams team1,team2] [--markers milestone1:date,...]"
allowed-tools:
  - Read
  - Write
  - Bash
  - AskUserQuestion
---

# Manage Delivery Plans

Create delivery plans to visualize work across multiple teams and iterations in a timeline view. Configure markers, milestones, and cross-team dependencies.

## Prerequisites

- Authenticated to Azure DevOps (run `/ado-setup` first)
- Delivery Plans extension installed (built-in for Azure DevOps Services)

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `<plan-name>` | Yes | Delivery plan name |
| `--action` | No | `create` (default), `view`, `update`, `delete` |
| `--teams` | No | Comma-separated team names to include |
| `--backlogs` | No | Backlog levels: `epics`, `features`, `stories` (default: `features`) |
| `--markers` | No | Milestone markers as `name:YYYY-MM-DD` pairs |
| `--criteria` | No | Filter criteria as field-value pairs |

## Instructions

1. **Create delivery plan** — call `POST /_apis/work/plans?api-version=7.1`:
   ```json
   {
     "name": "<plan-name>",
     "type": "deliveryTimelineView",
     "properties": {
       "teamBacklogMappings": [
         { "teamId": "{teamId}", "categoryReferenceName": "Microsoft.FeatureCategory" }
       ],
       "markers": [
         { "date": "2025-06-01T00:00:00Z", "label": "GA Release", "color": "#FF0000" }
       ],
       "criteria": []
     }
   }
   ```

2. **Resolve teams** — for each team name, get team ID via `GET /_apis/teams?api-version=7.1`.

3. **Configure backlog levels**:
   - Epics: `Microsoft.EpicCategory`
   - Features: `Microsoft.FeatureCategory`
   - Stories: `Microsoft.RequirementCategory`

4. **View plan** — `GET /_apis/work/plans/{planId}?api-version=7.1` and `GET /_apis/work/plans/{planId}/deliverytimeline?api-version=7.1`
   Display: Teams, iterations, work items per iteration, milestones, dependencies.

5. **View dependencies** — show cross-team predecessor/successor links between work items in the plan.

6. **Update plan** — `PUT /_apis/work/plans/{planId}?api-version=7.1` with updated properties.

7. **Delete plan** — `DELETE /_apis/work/plans/{planId}?api-version=7.1`.

## Examples

```bash
/ado-delivery-plan "Q2 Roadmap" --teams "Frontend,Backend,QA" --backlogs features --markers "Beta:2025-04-15,GA:2025-06-01"
/ado-delivery-plan "Q2 Roadmap" --action view
/ado-delivery-plan "Q2 Roadmap" --action update --markers "GA:2025-06-15"
```

## Error Handling

- **Team not found**: List available teams and prompt user to select.
- **Plan already exists**: Offer to update or delete/recreate.
- **No iterations configured**: Teams need iterations assigned — run `/ado-sprint-plan` first.
