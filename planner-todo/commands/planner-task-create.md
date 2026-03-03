---
name: planner-task-create
description: Create a task in a Planner plan with optional assignment and due date
argument-hint: "<task-title> --plan <plan-id> --bucket <bucket-id> [--assign <user-id>] [--due <date>] [--priority urgent|important|medium|low]"
allowed-tools:
  - Read
  - Write
  - Bash
---

# Create Planner Task

Create a new task in a Microsoft Planner plan and assign it to a bucket. Optionally assign
the task to a user, set a due date, and configure its priority level.

## Authentication

Requires a **delegated** token (user context). App-only tokens are not supported by
Planner task endpoints.

Required OAuth scope:
- `Tasks.ReadWrite` — create and manage Planner tasks

## Arguments

| Argument | Required | Description |
|---|---|---|
| `<task-title>` | Yes | Display name of the task |
| `--plan <plan-id>` | Yes | ID of the Planner plan |
| `--bucket <bucket-id>` | Yes | ID of the bucket to place the task in |
| `--assign <user-id>` | No | Object ID of the user to assign the task to |
| `--due <date>` | No | Due date in `YYYY-MM-DD` format |
| `--priority <level>` | No | Priority level: `urgent`, `important`, `medium` (default), `low` |

## Step 1: Parse Arguments and Build Request Body

Parse all arguments. Map `--priority` to its numeric value:

| Flag value | Numeric value |
|---|---|
| urgent | 0 |
| important | 1 |
| medium | 3 (default) |
| low | 5 |

If `--due` is provided as `YYYY-MM-DD`, convert to ISO-8601 datetime by appending
`T23:59:59Z` (end of day UTC). Example: `2024-03-15` → `2024-03-15T23:59:59Z`.

## Step 2: Acquire Delegated Token

Use `InteractiveBrowserCredential` or `DeviceCodeCredential` from `@azure/identity`
with scope `https://graph.microsoft.com/.default`.

## Step 3: Create the Task

```
POST https://graph.microsoft.com/v1.0/planner/tasks
Content-Type: application/json
Authorization: Bearer <token>
```

Full request body with all optional fields included:
```json
{
  "planId": "<plan-id>",
  "bucketId": "<bucket-id>",
  "title": "<task-title>",
  "priority": 3,
  "dueDateTime": "2024-03-15T23:59:59Z",
  "assignments": {
    "<user-id>": {
      "@odata.type": "#microsoft.graph.plannerAssignment",
      "orderHint": " !"
    }
  }
}
```

Field notes:
- `assignments` is a dictionary keyed by user object ID. Omit the entire field if
  `--assign` was not provided.
- `dueDateTime` must be in ISO-8601 format with a timezone designator. Omit if `--due`
  was not provided.
- `priority` defaults to `3` (medium) if `--priority` is not specified.
- `orderHint` within each assignment controls display order among assignees; `" !"` is
  the standard value for a new assignment.

Expected successful response: `HTTP 201 Created`
```json
{
  "id": "oAtmh1OGz0i-hdvvnZbfGmQAF7sk",
  "title": "Implement login page",
  "planId": "xqQg5sBW50SbCiiojQqDjGQAD1IN",
  "bucketId": "FtzysDykv0-ds9-U4v-MEmQAJvkJ",
  "priority": 1,
  "percentComplete": 0,
  "dueDateTime": "2024-03-15T23:59:59Z",
  "createdDateTime": "2024-01-15T10:00:00Z",
  "assignments": {
    "8a7d5f3b-1234-5678-abcd-ef1234567890": {
      "@odata.type": "#microsoft.graph.plannerAssignment",
      "assignedDateTime": "2024-01-15T10:00:00Z",
      "orderHint": "8585506702189421664P^"
    }
  }
}
```

## Error Handling

| HTTP Status | Cause | Resolution |
|---|---|---|
| 400 Bad Request | Missing `planId` or `bucketId`, or malformed request body | Verify both IDs are present and are valid non-empty strings |
| 403 Forbidden | Signed-in user is not a member of the plan's group | Ensure the user has access to the plan's owning M365 Group |
| 404 Not Found | Plan or bucket does not exist | Verify the plan ID with `GET /planner/plans/{planId}` and bucket ID with `GET /planner/buckets/{bucketId}` |
| 429 Too Many Requests | Throttled | Wait the number of seconds in the `Retry-After` response header before retrying |

## Success Output

Display the following after the task is created:

```
Task created successfully
─────────────────────────────────────────────────
Task ID:    oAtmh1OGz0i-hdvvnZbfGmQAF7sk
Title:      Implement login page
Plan ID:    xqQg5sBW50SbCiiojQqDjGQAD1IN
Bucket:     In Progress
Priority:   Important (1)
Due Date:   2024-03-15
Assignees:  Jane Smith (8a7d5f3b-...)
Progress:   0%

Deep link: https://tasks.office.com/.../#/taskdetailsv2/<task-id>
─────────────────────────────────────────────────
```

To fetch the bucket name for display, call `GET /planner/buckets/{bucketId}` using the
`bucketId` from the response. To resolve the assignee's display name, call
`GET /users/{userId}?$select=displayName`.
