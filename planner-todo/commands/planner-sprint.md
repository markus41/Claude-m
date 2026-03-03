---
name: planner-sprint
description: Create, list, and manage sprints/iterations in a Planner Premium project via Dataverse
argument-hint: "<action: create|list|close> [--project <project-id>] [--name <sprint-name>] [--start <date>] [--end <date>]"
allowed-tools:
  - Read
  - Write
  - Bash
---

# Manage Planner Premium Sprints

Create and manage sprint iterations in a **Planner Premium** project. Sprints group
tasks into time-boxed iterations and enable velocity tracking and burndown charts.

> **Premium feature**: Requires Dataverse access and Microsoft Project license.
> Classic Planner plans do not have sprint functionality.

## Authentication

Dataverse delegated scope: `https://<org>.crm.dynamics.com/.default`

## Actions

| Action | Description |
|--------|-------------|
| `create` | Create a new sprint for a project |
| `list` | List all sprints in a project |
| `close` | Close/complete a sprint |

## Arguments

| Argument | Required | Description |
|---|---|---|
| `<action>` | Yes | `create`, `list`, or `close` |
| `--project <id>` | Yes | `msdyn_project` GUID |
| `--name <name>` | create only | Sprint name (e.g., "Sprint 14") |
| `--start <date>` | create only | Sprint start date `YYYY-MM-DD` |
| `--end <date>` | create only | Sprint end date `YYYY-MM-DD` |
| `--sprint <id>` | close only | Sprint GUID to close |
| `--dataverse-url <url>` | No | Dataverse org URL |

## Create Sprint

```
POST <dataverse-url>/api/data/v9.2/msdyn_projectsprints
Content-Type: application/json
Authorization: Bearer <token>
```

```json
{
  "msdyn_project@odata.bind": "/msdyn_projects(<project-id>)",
  "msdyn_subject": "Sprint 14",
  "msdyn_scheduledstart": "2026-03-02T00:00:00Z",
  "msdyn_scheduledend": "2026-03-15T23:59:59Z"
}
```

Expected response: `HTTP 201 Created` with the sprint ID.

## List Sprints

```
GET <dataverse-url>/api/data/v9.2/msdyn_projectsprints?
  $filter=_msdyn_project_value eq '<project-id>'&
  $select=msdyn_projectsprintid,msdyn_subject,msdyn_scheduledstart,msdyn_scheduledend,statuscode&
  $orderby=msdyn_scheduledstart asc
Authorization: Bearer <token>
```

**Sprint status codes**: `1` = Active, `2` = Completed, `3` = Cancelled

## Assign Tasks to Sprint

After creating the sprint, assign tasks to it using the OperationSet pattern:

```
POST <dataverse-url>/api/data/v9.2/msdyn_PssUpdateV1
```
```json
{
  "OperationSetId": "<operation-set-id>",
  "Entity": {
    "@odata.type": "Microsoft.Dynamics.CRM.msdyn_projecttask",
    "msdyn_projecttaskid": "<task-id>",
    "msdyn_sprint@odata.bind": "/msdyn_projectsprints(<sprint-id>)"
  }
}
```

## Close Sprint

Close a sprint by updating its status to Completed:

```
PATCH <dataverse-url>/api/data/v9.2/msdyn_projectsprints(<sprint-id>)
Content-Type: application/json
Authorization: Bearer <token>
```
```json
{
  "statuscode": 2
}
```

## Success Output — Create

```
Sprint created
─────────────────────────────────────────────────
Sprint ID:   <sprintId>
Name:        Sprint 14
Project:     <project-id>
Start:       2026-03-02
End:         2026-03-15
Duration:    10 working days
Status:      Active
─────────────────────────────────────────────────
Assign tasks to this sprint using:
  /planner-task-update --sprint <sprintId>
```

## Success Output — List

```
Sprints in project <project-id>
─────────────────────────────────────────────────
 #  Name          Start       End         Status
 1  Sprint 12     2026-02-02  2026-02-15  Completed
 2  Sprint 13     2026-02-16  2026-03-01  Completed
 3  Sprint 14     2026-03-02  2026-03-15  Active
─────────────────────────────────────────────────
```

## Success Output — Close

```
Sprint closed
─────────────────────────────────────────────────
Sprint ID:   <sprintId>
Name:        Sprint 14
Project:     <project-id>
Status:      Completed
─────────────────────────────────────────────────
Incomplete tasks remain unassigned from this sprint.
Move them to the next sprint:
  /planner-task-update --sprint <nextSprintId> --task <taskId>
```

## Error Handling

| HTTP Status | Cause | Resolution |
|---|---|---|
| 403 | Missing Microsoft Project license or Dataverse access | Assign Project Plan license; verify Dataverse org URL |
| 400 | Missing required field (`msdyn_project`, dates) | Ensure `--project`, `--start`, and `--end` are provided for `create` |
| 400 `InvalidSchedule` | `msdyn_scheduledstart` is after `msdyn_scheduledend` | Swap start and end dates |
| 404 | Sprint GUID not found | Verify `--sprint` GUID from a `list` action |
| 409 | Sprint already in Completed status | Sprint is already closed; no action needed |
| 429 | Dataverse throttled | Retry after `Retry-After` header value |
