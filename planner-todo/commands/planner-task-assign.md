---
name: planner-task-assign
description: Assign or reassign a Planner task to one or more users
argument-hint: "<task-id> --users <user-id-1>,<user-id-2>"
allowed-tools:
  - Read
  - Write
  - Bash
---

# Assign Planner Task

Assign or reassign a Microsoft Planner task to one or more users. Supports adding new
assignees, replacing existing ones, or removing specific assignees. The Planner API
requires an ETag for all PATCH operations to prevent concurrent modification conflicts.

## Authentication

Requires a **delegated** token (user context). App-only tokens are not supported.

Required OAuth scope:
- `Tasks.ReadWrite` — read and modify Planner task assignments

## Arguments

| Argument | Required | Description |
|---|---|---|
| `<task-id>` | Yes | ID of the Planner task to update |
| `--users <list>` | Yes | Comma-separated list of user object IDs to assign |
| `--remove <list>` | No | Comma-separated list of user object IDs to remove from assignments |
| `--replace` | No | Replace all existing assignees with the --users list |

## Step 1: GET the Task to Retrieve ETag

All PATCH operations on Planner tasks require a current ETag. Fetch the task first:

```
GET https://graph.microsoft.com/v1.0/planner/tasks/{taskId}
Authorization: Bearer <token>
```

The ETag is returned in the response headers:
```
HTTP/1.1 200 OK
ETag: W/"JzEtVGFzayAgQEBAQEBAQEBAQEBAQEBAWCc="
```

Save the full ETag value including the `W/"..."` wrapper — it must be sent verbatim in
the `If-Match` header of the PATCH request.

Also inspect the current `assignments` object in the response body to understand the
existing assignment state before modifying it.

## Step 2: Build the Assignments Object

Planner assignments are a dictionary keyed by user object ID. To add a user:
```json
{
  "<user-id>": {
    "@odata.type": "#microsoft.graph.plannerAssignment",
    "orderHint": " !"
  }
}
```

To remove a specific user, set their value to `null`:
```json
{
  "<user-id-to-remove>": null
}
```

Build the PATCH assignments object:
- If `--replace` is set: start from an empty object and add all `--users` entries.
  For each user currently assigned but not in `--users`, set their value to `null`
  to explicitly remove them.
- If only `--users` is set: add those users to the existing assignments (existing
  assignees remain unless listed in `--remove`).
- If `--remove` is set: set each listed user ID to `null`.

## Step 3: PATCH the Task

```
PATCH https://graph.microsoft.com/v1.0/planner/tasks/{taskId}
Authorization: Bearer <token>
If-Match: W/"JzEtVGFzayAgQEBAQEBAQEBAQEBAQEBAWCc="
Content-Type: application/json
```

Request body (example — assigning two users, removing one):
```json
{
  "assignments": {
    "8a7d5f3b-1234-5678-abcd-ef1234567890": {
      "@odata.type": "#microsoft.graph.plannerAssignment",
      "orderHint": " !"
    },
    "b2c3d4e5-2345-6789-bcde-f23456789012": {
      "@odata.type": "#microsoft.graph.plannerAssignment",
      "orderHint": " !"
    },
    "f9e8d7c6-9876-5432-fedc-ba9876543210": null
  }
}
```

Expected successful response: `HTTP 204 No Content` (no body).

## Step 4: Handle ETag Conflicts (412)

If the PATCH returns `HTTP 412 Precondition Failed`, the ETag has become stale because
another client modified the task between your GET and PATCH. Automatically retry:

1. Re-issue `GET /planner/tasks/{taskId}` to obtain the fresh ETag and current assignments.
2. Rebuild the assignments delta against the fresh state.
3. Re-issue the PATCH with the new ETag.
4. If the retry also returns 412, report the conflict to the user and do not retry further.

## Error Handling

| HTTP Status | Cause | Resolution |
|---|---|---|
| 403 Forbidden | Signed-in user lacks task write permission | User must be a member of the plan's owning group |
| 404 Not Found | Task ID does not exist | Verify the task ID with `GET /planner/tasks/{taskId}` |
| 409 Conflict | Task is in a state that prevents modification | Check if the plan or group has been deleted |
| 412 Precondition Failed | ETag is stale | Re-GET the task, rebuild assignments, retry once |
| 429 Too Many Requests | Graph API throttle | Wait `Retry-After` seconds before retrying |

## Step 5: Resolve Display Names (Optional)

After a successful PATCH, resolve each assigned user's display name for output:

```
GET https://graph.microsoft.com/v1.0/users/{userId}?$select=displayName,userPrincipalName
```

## Success Output

Display the updated assignee list:

```
Task assignment updated successfully
─────────────────────────────────────────────────
Task ID:    oAtmh1OGz0i-hdvvnZbfGmQAF7sk
Task:       Implement login page

Current Assignees (2):
  • Jane Smith       jane.smith@contoso.com
  • Bob Johnson      bob.johnson@contoso.com

Removed (1):
  • Alice Lee        alice.lee@contoso.com
─────────────────────────────────────────────────
```
