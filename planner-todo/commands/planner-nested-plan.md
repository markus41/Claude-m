---
name: planner-nested-plan
description: Create a Planner plan nested inside a task, enabling hierarchical plan decomposition
argument-hint: "<plan-title> --parent-task <task-id> [--buckets 'Backlog,In Progress,Done']"
allowed-tools:
  - Read
  - Write
  - Bash
---

# Create Nested Planner Plan (Hierarchical)

Create a sub-plan nested inside an existing Planner task. This enables hierarchical
decomposition: a task can have its own full Planner board underneath it, with buckets
and sub-tasks, creating a two-level hierarchy.

**Container type**: `plannerTask` — the plan's lifecycle is tied to the parent task.
Deleting the parent task also deletes the nested plan and all its tasks.

## Authentication

Requires a **delegated** token. The signed-in user must have write access to the parent task's plan.

Required OAuth scopes:
- `Tasks.ReadWrite`

## Arguments

| Argument | Required | Description |
|---|---|---|
| `<plan-title>` | Yes | Display name of the nested plan |
| `--parent-task <task-id>` | Yes | ID of the Planner task that will contain this plan |
| `--buckets <list>` | No | Comma-separated bucket names (default: `To Do,In Progress,Done`) |

## Step 1: Verify Parent Task

Confirm the parent task exists and is accessible:

```
GET https://graph.microsoft.com/v1.0/planner/tasks/{task-id}
Authorization: Bearer <token>
```

If the task is not found (404), abort and display: "Parent task not found. Verify the task ID."

## Step 2: Create the Nested Plan

Use a `plannerTask` container referencing the parent task ID:

```
POST https://graph.microsoft.com/v1.0/planner/plans
Content-Type: application/json
Authorization: Bearer <token>
```

```json
{
  "container": {
    "@odata.type": "#microsoft.graph.plannerPlanContainer",
    "type": "plannerTask",
    "id": "<parent-task-id>"
  },
  "title": "<plan-title>"
}
```

Expected successful response: `HTTP 201 Created`
```json
{
  "id": "sub-plan-id",
  "title": "Feature Breakdown",
  "container": {
    "type": "plannerTask",
    "id": "parent-task-id",
    "url": "https://graph.microsoft.com/v1.0/planner/tasks/parent-task-id"
  }
}
```

Save the returned `id` as `subPlanId`.

## Step 3: Create Buckets

For each bucket in the list, POST a bucket to the new plan:

```
POST https://graph.microsoft.com/v1.0/planner/buckets
Content-Type: application/json
Authorization: Bearer <token>
```

```json
{
  "name": "To Do",
  "planId": "<subPlanId>",
  "orderHint": " !"
}
```

## Step 4: Update Parent Task Preview

Update the parent task's `previewType` to `noPreview` (prevents the task from trying to
show a preview of nested content that it can't render inline):

```
GET https://graph.microsoft.com/v1.0/planner/tasks/{task-id}
```
→ Extract ETag

```
PATCH https://graph.microsoft.com/v1.0/planner/tasks/{task-id}
If-Match: <etag>
Content-Type: application/json
```
```json
{ "previewType": "noPreview" }
```

## Error Handling

| HTTP Status | Cause | Resolution |
|---|---|---|
| 404 | Parent task not found | Verify task ID with `/planner/tasks/{id}` |
| 400 | Container type not supported (plan quota reached) | Each task supports one nested plan — check for existing nested plan first |
| 403 | No write access to parent task's plan | User must be a member of the plan's owning group |

## Success Output

```
Nested plan created
─────────────────────────────────────────────────
Sub-Plan ID:   <subPlanId>
Title:         <plan-title>
Parent Task:   <task-id>
Container:     plannerTask (lifecycle tied to parent)

Buckets created:
  1. To Do         → <bucketId1>
  2. In Progress   → <bucketId2>
  3. Done          → <bucketId3>

Hierarchy:
  Parent Plan → Task (<task-id>) → Sub-Plan (<subPlanId>)
─────────────────────────────────────────────────
Use the sub-plan ID with planner-task-create to add tasks to the nested plan.
```
