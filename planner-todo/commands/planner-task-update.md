---
name: planner-task-update
description: Update a Planner task — change progress, move to different bucket, set priority, or mark complete
argument-hint: "<task-id> [--progress 0|50|100] [--bucket <bucket-id>] [--priority urgent|important|medium|low] [--complete]"
allowed-tools:
  - Read
  - Write
  - Bash
---

# Update Planner Task

Update an existing Microsoft Planner task. Supports changing progress percentage,
moving the task to a different bucket, adjusting priority, and marking tasks complete.
All PATCH operations on Planner tasks require an ETag to prevent concurrent modification
conflicts.

## Authentication

Requires a **delegated** token (user context). App-only tokens are not supported.

Required OAuth scope:
- `Tasks.ReadWrite` — read and update Planner tasks

## Arguments

| Argument | Required | Description |
|---|---|---|
| `<task-id>` | Yes | ID of the Planner task to update |
| `--progress <n>` | No | Progress percentage: `0`, `50`, or `100` (only these three values are valid) |
| `--complete` | No | Shorthand for `--progress 100`; marks the task as complete |
| `--bucket <bucket-id>` | No | Move the task to a different bucket |
| `--priority <level>` | No | `urgent`, `important`, `medium`, or `low` |
| `--title <text>` | No | Rename the task |

At least one update flag must be provided. If only `<task-id>` is given with no flags,
display the current task state and exit without making changes.

## Step 1: GET the Task to Retrieve ETag

Planner requires the current ETag for any PATCH operation. Fetch the task first:

```
GET https://graph.microsoft.com/v1.0/planner/tasks/{taskId}
Authorization: Bearer <token>
```

The ETag is returned in the response header:
```
HTTP/1.1 200 OK
ETag: W/"JzEtVGFzayAgQEBAQEBAQEBAQEBAQEBAWCc="
Content-Type: application/json
```

Save the complete ETag string (including `W/"..."`) for the `If-Match` header.

Also capture the current values of `percentComplete`, `bucketId`, `priority`, and
`title` from the response body — display these in the "before" state of the success output.

## Step 2: Build the PATCH Body

Only include fields that are being changed. Do not include unchanged fields in the PATCH
body — this reduces the risk of overwriting concurrent changes from other users.

### Progress Update

`percentComplete` accepts only three values in Planner:

| Flag | Value | Meaning |
|---|---|---|
| `--progress 0` | `0` | Not started |
| `--progress 50` | `50` | In progress |
| `--progress 100` | `100` | Completed |
| `--complete` | `100` | Same as `--progress 100` |

Any other value (e.g., 25, 75) will be rejected by the API with a `400` error.

### Priority Update

Map the string flag to the Planner numeric priority:

| Flag | Numeric value |
|---|---|
| `--priority urgent` | `0` |
| `--priority important` | `1` |
| `--priority medium` | `3` |
| `--priority low` | `5` |

### Bucket Move

Setting `bucketId` moves the task to a different column on the board. The new bucket
must exist within the same plan — cross-plan moves are not supported.

### Example PATCH Body (multiple updates)

```json
{
  "percentComplete": 100,
  "bucketId": "FtzysDykv0-ds9-U4v-MEmQAJvkJ",
  "priority": 1,
  "title": "Updated task title"
}
```

## Step 3: PATCH the Task

```
PATCH https://graph.microsoft.com/v1.0/planner/tasks/{taskId}
Authorization: Bearer <token>
If-Match: W/"JzEtVGFzayAgQEBAQEBAQEBAQEBAQEBAWCc="
Content-Type: application/json
```

Expected successful response: `HTTP 204 No Content` (empty body).

## Step 4: Handle ETag Conflicts (412)

If the PATCH returns `HTTP 412 Precondition Failed`, another process updated the task
between the GET and PATCH. Automatically retry once:

1. Re-issue `GET /planner/tasks/{taskId}` to obtain the fresh ETag.
2. Re-apply the same intended changes to the fresh state.
3. Re-issue the PATCH with the new ETag.
4. If the retry also returns 412, stop and report the conflict to the user.

```
Error: Task was modified by another user while updating.
Task ID: <task-id>
Please re-run the command to retry with the latest task state.
```

## Error Handling

| HTTP Status | Cause | Resolution |
|---|---|---|
| 400 Bad Request | Invalid `percentComplete` value or unknown field | Use only 0, 50, or 100 for progress |
| 404 Not Found | Task does not exist | Verify the task ID |
| 409 Conflict | Task state prevents modification (e.g., plan deleted) | Check if the owning plan or group still exists |
| 412 Precondition Failed | ETag is stale | Re-GET the task and retry (see Step 4) |
| 429 Too Many Requests | Graph throttle | Wait `Retry-After` seconds and retry |

## Success Output

Show the before/after state for all changed fields:

```
Task updated successfully
─────────────────────────────────────────────────
Task ID:  oAtmh1OGz0i-hdvvnZbfGmQAF7sk
Title:    Implement login page

Changes applied:
  Progress:  0% (Not Started) → 100% (Completed)
  Priority:  Medium (3)       → Important (1)
  Bucket:    Backlog          → Done

No changes: title, assignments, due date
─────────────────────────────────────────────────
```
