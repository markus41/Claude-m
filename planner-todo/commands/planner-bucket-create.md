---
name: planner-bucket-create
description: Create a new bucket in a Planner plan
argument-hint: "<bucket-name> --plan <plan-id>"
allowed-tools:
  - Read
  - Write
  - Bash
---

# Create Planner Bucket

Create a new bucket (column) in an existing Microsoft Planner plan. Buckets organize tasks
into groups on the Planner board — they correspond to the column headers in the kanban view.

## Authentication

Requires a **delegated** token (user context). App-only tokens are not supported by
Planner bucket endpoints.

Required OAuth scope:
- `Tasks.ReadWrite` — create and manage Planner buckets

## Arguments

| Argument | Required | Description |
|---|---|---|
| `<bucket-name>` | Yes | Display name of the new bucket |
| `--plan <plan-id>` | Yes | ID of the Planner plan to add the bucket to |
| `--position <hint>` | No | Ordering position: `top` (default) or `bottom` |

## Step 1: Parse Arguments

Extract `bucket-name` and `--plan` from the command arguments. The bucket name is
free-form text and can include spaces, emoji, and Unicode characters.

If `--position bottom` is specified, use `"!"` as the `orderHint`. Otherwise use `" !"`.

## Step 2: Acquire Delegated Token

Use `InteractiveBrowserCredential` or `DeviceCodeCredential` from `@azure/identity`
with scope `https://graph.microsoft.com/.default`.

## Step 3: Create the Bucket

```
POST https://graph.microsoft.com/v1.0/planner/buckets
Content-Type: application/json
Authorization: Bearer <token>
```

Request body:
```json
{
  "name": "<bucket-name>",
  "planId": "<plan-id>",
  "orderHint": " !"
}
```

### Understanding orderHint

The `orderHint` field controls the bucket's position on the board. Planner uses a
proprietary string-based ordering system:

| Desired position | orderHint value |
|---|---|
| At the top (leftmost) | `" !"` (space + exclamation) |
| At the bottom (rightmost) | `"!"` (exclamation only) |
| Between two existing buckets | `"<hintA> !<hintB>"` where hintA and hintB are the orderHints of the surrounding buckets |

To position a new bucket between two existing ones:
1. GET the plan's buckets: `GET /planner/plans/{planId}/buckets`
2. Find the orderHints of the bucket before (hintBefore) and after (hintAfter) the
   desired insertion point.
3. Construct: `orderHint = hintBefore + " !" + hintAfter`

Note: Planner normalizes the orderHint server-side — the value returned in the response
will differ from what you sent. Always use the server-returned orderHint value when
ordering relative to existing buckets.

Expected successful response: `HTTP 201 Created`
```json
{
  "id": "FtzysDykv0-ds9-U4v-MEmQAJvkJ",
  "name": "In Review",
  "planId": "xqQg5sBW50SbCiiojQqDjGQAD1IN",
  "orderHint": "8585506702189421664P^"
}
```

## Error Handling

| HTTP Status | Cause | Resolution |
|---|---|---|
| 400 Bad Request | Missing `planId` or empty bucket name | Verify both `name` and `planId` are present in the request body |
| 403 Forbidden | Signed-in user is not a member of the plan's owning group | Add the user to the M365 Group that owns the plan |
| 404 Not Found | The specified plan does not exist | Verify the plan ID with `GET /planner/plans/{planId}` |
| 429 Too Many Requests | Graph API throttle limit reached | Read the `Retry-After` header and wait that many seconds before retrying |

## Step 4: Verify the Bucket

After creation, confirm the bucket exists in the plan by calling:

```
GET https://graph.microsoft.com/v1.0/planner/plans/{planId}/buckets
```

Find the newly created bucket by its returned ID.

## Success Output

Display the following after the bucket is created:

```
Bucket created successfully
─────────────────────────────────────────────────
Bucket ID:  FtzysDykv0-ds9-U4v-MEmQAJvkJ
Name:       In Review
Plan ID:    xqQg5sBW50SbCiiojQqDjGQAD1IN
Position:   Top of board
─────────────────────────────────────────────────
Use this bucket ID with planner-task-create --bucket FtzysDykv0-ds9-U4v-MEmQAJvkJ
```
