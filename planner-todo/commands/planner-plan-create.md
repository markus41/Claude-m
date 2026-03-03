---
name: planner-plan-create
description: Create a new Planner plan with buckets for a Microsoft 365 Group
argument-hint: "<plan-title> --group <group-id> [--buckets 'Backlog,In Progress,Review,Done']"
allowed-tools:
  - Read
  - Write
  - Bash
---

# Create Planner Plan

Create a new Microsoft Planner plan owned by a Microsoft 365 Group, then provision buckets
to structure the board. Planner plans must be owned by a group — they cannot be created
without an owner group ID.

## Authentication

Requires a **delegated** token (user context). App-only tokens are not supported for
Planner plan creation. The signed-in user must be a member of the target group.

Required OAuth scopes:
- `Tasks.ReadWrite` — create and manage Planner plans and buckets
- `Group.ReadWrite.All` — associate the plan with the specified M365 Group

## Arguments

| Argument | Required | Description |
|---|---|---|
| `<plan-title>` | Yes | Display name of the new plan |
| `--group <group-id>` | Yes | Object ID of the M365 Group that will own the plan |
| `--buckets <list>` | No | Comma-separated bucket names (default: Backlog,In Progress,Review,Done) |

## Step 1: Parse Arguments

Extract `plan-title`, `--group`, and `--buckets` from the command arguments.

If `--buckets` is not provided, use the default list:
```
Backlog, In Progress, Review, Done
```

Split the bucket list on commas and trim whitespace from each name.

## Step 2: Acquire Delegated Token

Use `InteractiveBrowserCredential` or `DeviceCodeCredential` from `@azure/identity`
with scope `https://graph.microsoft.com/.default`.

Do not use `ClientSecretCredential` — Planner requires delegated (user) context.

## Step 3: Create the Plan

```
POST https://graph.microsoft.com/v1.0/planner/plans
Content-Type: application/json
Authorization: Bearer <token>
```

Request body:
```json
{
  "owner": "<group-id>",
  "title": "<plan-title>"
}
```

The `owner` field must be a valid M365 Group object ID (a GUID). The plan title is the
display name shown in the Planner web interface and Teams tab.

Expected successful response: `HTTP 201 Created`
```json
{
  "id": "xqQg5sBW50SbCiiojQqDjGQAD1IN",
  "title": "Q2 Sprint Board",
  "owner": "0d539595-2b7b-43eb-a72a-b73c790a52b2",
  "createdDateTime": "2024-01-15T10:00:00Z",
  "createdBy": {
    "user": { "id": "8a7d5f3b-..." }
  }
}
```

Save the returned `id` as `planId` for use in bucket creation.

## Step 4: Create Buckets

For each bucket name in the list (iterate in order), POST a new bucket:

```
POST https://graph.microsoft.com/v1.0/planner/buckets
Content-Type: application/json
Authorization: Bearer <token>
```

Request body for the first bucket:
```json
{
  "name": "Backlog",
  "planId": "<planId>",
  "orderHint": " !"
}
```

For subsequent buckets, use `"orderHint": " !"` to append each at the bottom of the list
relative to the order they are created. Planner uses lexicographic order hints — `" !"`
places the bucket below any existing bucket.

Collect each bucket's returned `id` and `name` for the success output.

## Error Handling

| HTTP Status | Cause | Resolution |
|---|---|---|
| 400 Bad Request | Invalid group ID format or missing required fields | Verify the group ID is a valid GUID |
| 403 Forbidden | Signed-in user is not a member of the specified group | Add the user to the group, or use a different group |
| 404 Not Found | Group does not exist in the tenant | Confirm the group ID against Entra ID |
| 409 Conflict | A plan with identical properties already exists | Choose a different title or verify the existing plan |
| 429 Too Many Requests | Graph API throttle limit reached | Read the `Retry-After` response header (seconds) and wait before retrying |

For 429 responses, implement exponential backoff: wait `Retry-After` seconds (or 60s if
header is absent), then retry the failed request. Do not retry bucket creation requests
for a plan that failed to create.

## Success Output

Display the following after all steps complete:

```
Plan created successfully
─────────────────────────────────────────────────
Plan ID:   xqQg5sBW50SbCiiojQqDjGQAD1IN
Title:     Q2 Sprint Board
Owner:     0d539595-2b7b-43eb-a72a-b73c790a52b2
Web URL:   https://tasks.office.com/.../#/plantaskboard?groupId=<group-id>&planId=<plan-id>

Buckets created (4):
  1. Backlog       → bucket ID: abc123
  2. In Progress   → bucket ID: def456
  3. Review        → bucket ID: ghi789
  4. Done          → bucket ID: jkl012
─────────────────────────────────────────────────
Save the plan ID and bucket IDs for use with planner-task-create.
```

The web URL pattern for Planner is:
`https://tasks.office.com/<tenant-domain>/#/plantaskboard?groupId=<group-id>&planId=<plan-id>`
