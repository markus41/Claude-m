---
name: ado-sprint-plan
description: Manage sprints, iterations, capacity, and sprint backlog
argument-hint: "--action list|create|assign|capacity|burndown [--sprint <name>] [--team <team>]"
allowed-tools:
  - Read
  - Write
  - Bash
  - AskUserQuestion
---

# Manage Sprint Planning

List and create iterations (sprints), assign team iterations, move work items to sprints, view capacity, and analyze sprint burndown.

## Prerequisites

- Authenticated to Azure DevOps (run `/ado-setup` first)
- `Edit project-level information` for creating iterations
- Team membership for capacity management

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `--action` | Yes | `list`, `create`, `assign`, `capacity`, `burndown`, `move-items` |
| `--sprint` | No | Sprint/iteration name |
| `--team` | No | Team name (default: project default team) |
| `--start-date` | No | Sprint start date (YYYY-MM-DD) |
| `--end-date` | No | Sprint end date (YYYY-MM-DD) |
| `--path` | No | Iteration path (e.g., `Project\\Release 1\\Sprint 1`) |
| `--work-items` | No | Comma-separated work item IDs to move |

## Instructions

1. **List iterations** — `GET /_apis/work/teamsettings/iterations?api-version=7.1`
   Display: Iteration ID, Name, Path, Start Date, End Date, Time Frame (past/current/future).

2. **Create iteration** — call `POST /_apis/wit/classificationnodes/iterations?api-version=7.1`:
   ```json
   {
     "name": "<sprint-name>",
     "attributes": {
       "startDate": "2025-01-01T00:00:00Z",
       "finishDate": "2025-01-14T00:00:00Z"
     }
   }
   ```

3. **Assign team iteration** — `POST /_apis/work/teamsettings/iterations?api-version=7.1`:
   ```json
   { "id": "<iteration-id>" }
   ```

4. **View capacity** — `GET /_apis/work/teamsettings/iterations/{iterationId}/capacities?api-version=7.1`
   Display: Team member, Activity, Capacity per day, Days off.

5. **Sprint burndown** — `GET /_apis/work/teamsettings/iterations/{iterationId}/workitemsclassification?api-version=7.1`
   Calculate: Total story points, completed points, remaining work, ideal burndown line.

6. **Move work items** — if `--action move-items`:
   - For each work item ID, patch the iteration path:
     `PATCH /_apis/wit/workitems/{id}?api-version=7.1` with `[{ "op": "replace", "path": "/fields/System.IterationPath", "value": "<path>" }]`

## Examples

```bash
/ado-sprint-plan --action list --team "Backend Team"
/ado-sprint-plan --action create --sprint "Sprint 5" --start-date 2025-03-01 --end-date 2025-03-14
/ado-sprint-plan --action capacity --sprint "Sprint 5" --team "Backend Team"
/ado-sprint-plan --action move-items --sprint "Sprint 5" --work-items 101,102,103
/ado-sprint-plan --action burndown --sprint "Sprint 5"
```

## Error Handling

- **Iteration already exists**: Suggest using a different name or updating dates on existing iteration.
- **Team not found**: List available teams with `GET /_apis/teams?api-version=7.1`.
- **No capacity data**: Team members have not set capacity — guide through setting it.
