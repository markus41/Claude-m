---
name: planner-goals
description: Create and manage goals and OKRs in a Planner Premium project via Dataverse
argument-hint: "<action: create|list|link|update-progress> [--project <project-id>] [--name <goal-name>] [--target <value>] [--task <task-id>]"
allowed-tools:
  - Read
  - Write
  - Bash
---

# Manage Planner Premium Goals (OKRs)

Create and track goals and key results in **Planner Premium** projects. Goals link
high-level objectives to specific tasks, providing alignment between strategy and execution.

> **Premium feature**: Requires Dataverse access and Microsoft Project license.

## Authentication

Dataverse delegated scope: `https://<org>.crm.dynamics.com/.default`

## Actions

| Action | Description |
|--------|-------------|
| `create` | Create a new goal for the project |
| `list` | List all goals in a project |
| `link` | Link a task to a goal (contributes to goal progress) |
| `update-progress` | Update a goal's current progress value |

## Arguments

| Argument | Required | Description |
|---|---|---|
| `<action>` | Yes | `create`, `list`, `link`, or `update-progress` |
| `--project <id>` | Yes | `msdyn_project` GUID |
| `--name <name>` | create | Goal name / key result title |
| `--target <n>` | create | Target value (numeric, e.g., 100 for 100% or 50 tasks) |
| `--unit <unit>` | create | Unit of measure (e.g., `percent`, `count`, `score`) |
| `--goal <id>` | link/update | Goal GUID |
| `--task <id>` | link | Task GUID to link to the goal |
| `--progress <n>` | update-progress | Current progress value |
| `--dataverse-url <url>` | No | Dataverse org URL |

## Create Goal

```
POST <dataverse-url>/api/data/v9.2/msdyn_projectgoals
Content-Type: application/json
Authorization: Bearer <token>
```

```json
{
  "msdyn_project@odata.bind": "/msdyn_projects(<project-id>)",
  "msdyn_subject": "Reach 80% test coverage",
  "msdyn_targetvalue": 80,
  "msdyn_unitofmeasure": "percent"
}
```

Available `msdyn_unitofmeasure` values: `percent`, `count`, `currency`, `score`

**Note on "reduce to zero" goals**: For goals where success means reaching zero (e.g., "zero open bugs"), set `msdyn_targetvalue` to `0` and use `update-progress` to track the current count as `msdyn_actualvalue`. Dataverse tracks directionality via the start and target values — do not compute progress percentages inline; the PSS handles that automatically using the baseline stored at goal creation.

## List Goals

```
GET <dataverse-url>/api/data/v9.2/msdyn_projectgoals?
  $filter=_msdyn_project_value eq '<project-id>'&
  $select=msdyn_projectgoalid,msdyn_subject,msdyn_targetvalue,msdyn_actualvalue,msdyn_unitofmeasure,statuscode
Authorization: Bearer <token>
```

## Link Task to Goal

Create a relationship between a task and a goal to track contribution:

```
PATCH <dataverse-url>/api/data/v9.2/msdyn_projecttasks(<task-id>)
Content-Type: application/json
Authorization: Bearer <token>
```

```json
{
  "msdyn_goal@odata.bind": "/msdyn_projectgoals(<goal-id>)"
}
```

Note: Use the OperationSet pattern (msdyn_PssUpdateV1) for schedule-linked task updates.
For metadata-only updates like goal linking, direct PATCH is acceptable.

## Update Progress

```
PATCH <dataverse-url>/api/data/v9.2/msdyn_projectgoals(<goal-id>)
Content-Type: application/json
Authorization: Bearer <token>
```

```json
{
  "msdyn_actualvalue": 75
}
```

Progress percentage (for positive-direction goals): `(msdyn_actualvalue / msdyn_targetvalue) * 100`

For goals targeting zero (e.g., "reduce bugs to 0"), Dataverse calculates progress from a stored baseline — do not compute the percentage inline. Use `update-progress` to set the current count; the system derives completion automatically.

## Success Output — Create

```
Goal created
─────────────────────────────────────────────────
Goal ID:    <goalId>
Name:       Reach 80% test coverage
Target:     80 percent
Current:    0 percent (0% complete)
Project:    <project-id>
─────────────────────────────────────────────────
Link tasks to this goal:
  /planner-goals link --goal <goalId> --task <taskId>
Update progress:
  /planner-goals update-progress --goal <goalId> --progress 65
```

## Success Output — List

```
Goals in project <project-id>
─────────────────────────────────────────────────
 #  Name                           Progress   Status
 1  Ship v2.0 features             75%        Active
 2  Reduce bug count to zero       67%        Active
 3  Improve test coverage to 80%   80%        Active
─────────────────────────────────────────────────
```

## Error Handling

| HTTP Status | Cause | Resolution |
|---|---|---|
| 403 | Missing Microsoft Project license or Dataverse access | Assign Project Plan license; verify Dataverse org URL |
| 400 | Missing required field | Ensure `--project` and `--name` / `--target` are provided for `create` |
| 404 | Goal or task GUID not found | Verify `--goal` and `--task` GUIDs from a `list` action |
| 429 | Dataverse throttled | Retry after `Retry-After` header value |
