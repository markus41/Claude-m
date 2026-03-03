---
name: planner-task-completion
description: Set task completion requirements — require all checklist items checked, a form submitted, or approval before marking complete
argument-hint: "<task-id> --require checklist|form|approval|none"
allowed-tools:
  - Read
  - Write
  - Bash
---

# Set Planner Task Completion Requirements

Configure what must happen before a task can be marked 100% complete.
Planner supports four completion requirement modes that enforce process compliance.

## Authentication

Required OAuth scope: `Tasks.ReadWrite`

## Completion Requirement Types

| Type | Value | What it enforces |
|------|-------|-----------------|
| None | `none` | Task can be completed freely (default) |
| Checklist | `checklistCompletion` | All checklist items must be checked before 100% |
| Form | `formCompletion` | A linked Microsoft Form must be submitted |
| Approval | `approvalCompletion` | An approval workflow must be completed |

## Arguments

| Argument | Required | Description |
|---|---|---|
| `<task-id>` | Yes | Planner task ID |
| `--require <type>` | Yes | One of: `checklist`, `form`, `approval`, `none` |

## Step 1: Map Requirement Type

| Flag value | API value |
|---|---|
| `checklist` | `checklistCompletion` |
| `form` | `formCompletion` |
| `approval` | `approvalCompletion` |
| `none` | `none` |

## Step 2: Fetch Task ETag

```
GET https://graph.microsoft.com/v1.0/planner/tasks/{taskId}
Authorization: Bearer <token>
```

Extract `@odata.etag` from the response.

## Step 3: Set Completion Requirements

```
PATCH https://graph.microsoft.com/v1.0/planner/tasks/{taskId}
Content-Type: application/json
Authorization: Bearer <token>
If-Match: <etag>
```

```json
{
  "completionRequirements": "checklistCompletion"
}
```

Expected response: `HTTP 204 No Content`

## Behavior Notes

**`checklistCompletion`**: The Planner UI prevents marking the task as complete
(percentComplete = 100) until all checklist items have `isChecked: true`.
Any attempt to PATCH `percentComplete: 100` before all items are checked
returns a 400 error with code `ChecklistNotComplete`.

**`formCompletion`**: A Microsoft Form must be attached to the task and
a submission must be recorded. Managed via the Forms integration in Planner UI.

**`approvalCompletion`**: Requires an approval created in Power Automate or
the Planner approval flow to be completed before the task can close.

## Error Handling

| HTTP Status | Cause | Resolution |
|---|---|---|
| 400 `ChecklistNotComplete` | Tried to set 100% complete with checklistCompletion and incomplete items | Check all checklist items first |
| 400 `InvalidCompletionRequirements` | Invalid requirement value | Use exact API values listed above |
| 412 | Stale ETag | Re-GET task and retry |

## Success Output

```
Completion requirement set
─────────────────────────────────────────────────
Task ID:      <taskId>
Requirement:  checklistCompletion
Effect:       Task cannot be marked complete until all checklist
              items are checked.
─────────────────────────────────────────────────
```
