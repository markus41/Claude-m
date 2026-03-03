---
name: planner-task-list
description: List and filter tasks in a Planner plan — by assignee, due date range, or completion status
argument-hint: "--plan <plan-id> [--assignee <user-id>] [--due-before <date>] [--due-after <date>] [--status notStarted|inProgress|completed]"
allowed-tools:
  - Read
  - Write
  - Bash
---

# List Planner Tasks

Retrieve and display tasks from a Microsoft Planner plan with support for filtering by
assignee, due date range, and completion status. The Graph API does not support server-side
`$filter` on Planner task collections, so all filtering is performed client-side after
fetching all tasks.

## Authentication

Requires a **delegated** token (user context). App-only tokens are not supported.

Required OAuth scope:
- `Tasks.Read` — read Planner tasks (use `Tasks.ReadWrite` if you also need to modify)

## Arguments

| Argument | Required | Description |
|---|---|---|
| `--plan <plan-id>` | Yes | ID of the Planner plan to list tasks from |
| `--assignee <user-id>` | No | Filter to tasks assigned to this user object ID |
| `--due-before <date>` | No | Show only tasks with due date on or before this date (`YYYY-MM-DD`) |
| `--due-after <date>` | No | Show only tasks with due date on or after this date (`YYYY-MM-DD`) |
| `--status <status>` | No | Filter by progress: `notStarted`, `inProgress`, or `completed` |
| `--bucket <bucket-id>` | No | Filter to tasks in a specific bucket |

## Step 1: Acquire Delegated Token

Use `InteractiveBrowserCredential` or `DeviceCodeCredential` from `@azure/identity`
with scope `https://graph.microsoft.com/.default`.

## Step 2: Fetch All Tasks from the Plan

```
GET https://graph.microsoft.com/v1.0/planner/plans/{planId}/tasks?$select=id,title,percentComplete,priority,dueDateTime,bucketId,assignments,createdDateTime
Authorization: Bearer <token>
```

The `$select` parameter limits the response to only the fields needed for display and
filtering, reducing payload size for large plans.

### Pagination

Planner task lists may be paginated. After processing the first page, check for an
`@odata.nextLink` property in the response:

```json
{
  "value": [ ... ],
  "@odata.nextLink": "https://graph.microsoft.com/v1.0/planner/plans/{planId}/tasks?$skiptoken=..."
}
```

If `@odata.nextLink` is present, follow it to retrieve the next page. Continue until
no `@odata.nextLink` is returned. Collect all tasks across all pages before applying
client-side filters.

## Step 3: Fetch Buckets for Display

To show bucket names instead of IDs in the output table, fetch the plan's buckets:

```
GET https://graph.microsoft.com/v1.0/planner/plans/{planId}/buckets?$select=id,name
Authorization: Bearer <token>
```

Build a lookup map: `{ bucketId: bucketName }`.

## Step 4: Apply Client-Side Filters

Graph does not support `$filter` on Planner task endpoints. Apply all filters after
fetching the complete task list.

### Status Filter

Map the `--status` flag to `percentComplete` values:

| Flag value | percentComplete |
|---|---|
| `notStarted` | `0` |
| `inProgress` | `50` |
| `completed` | `100` |

Keep only tasks where `percentComplete` equals the mapped value.

### Assignee Filter

Each task's `assignments` property is an object keyed by user ID:
```json
{
  "assignments": {
    "8a7d5f3b-1234-5678-abcd-ef1234567890": { ... }
  }
}
```

Keep only tasks where `Object.keys(task.assignments)` includes the specified `--assignee`
user ID.

### Due Date Filters

- `--due-before <date>`: keep tasks where `dueDateTime` is not null AND the date portion
  is ≤ the specified date.
- `--due-after <date>`: keep tasks where `dueDateTime` is not null AND the date portion
  is ≥ the specified date.
- Tasks with null `dueDateTime` are excluded when either due-date filter is active.

### Bucket Filter

Keep only tasks where `bucketId` equals the `--bucket` argument.

## Step 5: Resolve Assignee Display Names (Optional)

For each unique user ID found in the filtered tasks' assignments, resolve the display name:

```
GET https://graph.microsoft.com/v1.0/users/{userId}?$select=displayName
```

Cache results to avoid duplicate requests for the same user ID.

## Step 6: Format Output

Display a markdown table sorted by due date (nulls last), then by priority:

```
Plan: Q2 Sprint Board
Filters: status=notStarted, assignee=Jane Smith
Tasks found: 7 of 23 total

| Title                    | Priority  | Progress | Due Date   | Assignees      | Bucket      |
|--------------------------|-----------|----------|------------|----------------|-------------|
| Implement login page     | Important | 0%       | 2024-01-20 | Jane Smith     | In Progress |
| Write unit tests         | Medium    | 0%       | 2024-01-25 | Jane Smith     | Backlog     |
| Update API docs          | Low       | 0%       | 2024-02-01 | Jane Smith     | Backlog     |
| Fix navbar styling       | Urgent    | 0%       | (no date)  | Jane Smith     | In Progress |
...
```

### Priority Display Mapping

| Numeric value | Display string |
|---|---|
| 0 | Urgent |
| 1 | Important |
| 3 | Medium |
| 5 | Low |

### Progress Display Mapping

| percentComplete | Display |
|---|---|
| 0 | 0% (Not Started) |
| 50 | 50% (In Progress) |
| 100 | 100% (Completed) |

## Error Handling

| HTTP Status | Cause | Resolution |
|---|---|---|
| 403 Forbidden | User is not a member of the plan's group | Verify group membership for the signed-in user |
| 404 Not Found | Plan does not exist | Verify the plan ID |
| 429 Too Many Requests | Throttled during pagination | Respect the `Retry-After` header between paginated requests |

## Summary Output

After the table, display a summary line:

```
─────────────────────────────────────────────────
Showing 7 tasks (filtered from 23 total)
Urgent: 1  |  Important: 2  |  Medium: 3  |  Low: 1
Overdue (past due date): 2
─────────────────────────────────────────────────
```
