---
name: todo-tasks-list
description: List Microsoft To Do tasks from one or all task lists, with optional filters
argument-hint: "[--list <list-id>] [--status notStarted|inProgress|completed] [--importance low|normal|high] [--all-lists]"
allowed-tools:
  - Read
  - Write
  - Bash
---

# List To Do Tasks

Retrieve and display Microsoft To Do tasks from a specific list or across all of the
signed-in user's lists. Supports server-side filtering by status and importance using
OData `$filter`. Handles pagination automatically to ensure all tasks are returned.

## Authentication

Requires a **delegated** token (user context). App-only tokens are not supported.

Required OAuth scope:
- `Tasks.Read` — read the signed-in user's To Do tasks and lists

## Arguments

| Argument | Required | Description |
|---|---|---|
| `--list <list-id>` | Conditional | ID of a specific To Do list. Required unless `--all-lists` is used |
| `--all-lists` | Conditional | Retrieve tasks from all of the user's lists |
| `--status <status>` | No | Filter by status: `notStarted`, `inProgress`, `completed`, `waitingOnOthers`, or `deferred` |
| `--importance <level>` | No | Filter by importance: `low`, `normal`, or `high` |
| `--due-before <date>` | No | Show only tasks due on or before this date (`YYYY-MM-DD`) — client-side filter |
| `--due-after <date>` | No | Show only tasks due on or after this date (`YYYY-MM-DD`) — client-side filter |

One of `--list` or `--all-lists` is required.

## Step 1: Acquire Delegated Token

Use `InteractiveBrowserCredential` or `DeviceCodeCredential` from `@azure/identity`
with scope `https://graph.microsoft.com/.default`.

## Step 2: Determine Target Lists

If `--all-lists` is specified, first fetch all the user's lists:

```
GET https://graph.microsoft.com/v1.0/me/todo/lists?$select=id,displayName,isOwner,isShared
Authorization: Bearer <token>
```

Build a list of `{ id, displayName }` pairs to iterate over. This includes the default
"Tasks" list and "Flagged Emails" list automatically.

If `--list` is specified, create a single-item array with that list ID. Optionally
resolve the list's display name for output headers:

```
GET https://graph.microsoft.com/v1.0/me/todo/lists/{listId}?$select=id,displayName
```

## Step 3: Build the $filter Query String

To Do tasks support OData `$filter` on `status` and `importance` fields:

| Filter | OData expression |
|---|---|
| `--status notStarted` | `status eq 'notStarted'` |
| `--status inProgress` | `status eq 'inProgress'` |
| `--status completed` | `status eq 'completed'` |
| `--status waitingOnOthers` | `status eq 'waitingOnOthers'` |
| `--status deferred` | `status eq 'deferred'` |
| `--importance low` | `importance eq 'low'` |
| `--importance normal` | `importance eq 'normal'` |
| `--importance high` | `importance eq 'high'` |

Combine multiple filters with `and`:
```
$filter=status eq 'notStarted' and importance eq 'high'
```

URL-encode the filter string before appending to the request URL.

## Step 4: Fetch Tasks for Each List

For each list in the target set, fetch tasks with the `$filter` and `$select` parameters:

```
GET https://graph.microsoft.com/v1.0/me/todo/lists/{listId}/tasks
    ?$filter=status eq 'notStarted' and importance eq 'high'
    &$select=id,title,status,importance,dueDateTime,reminderDateTime,isReminderOn,createdDateTime,lastModifiedDateTime
    &$orderby=dueDateTime asc
Authorization: Bearer <token>
```

`$select` fields:

| Field | Description |
|---|---|
| `id` | Unique task identifier |
| `title` | Task display name |
| `status` | notStarted, inProgress, completed, waitingOnOthers, deferred |
| `importance` | low, normal, high |
| `dueDateTime` | Object with `dateTime` and `timeZone` properties |
| `reminderDateTime` | Object with `dateTime` and `timeZone` |
| `isReminderOn` | Boolean |
| `createdDateTime` | ISO-8601 creation timestamp |
| `lastModifiedDateTime` | ISO-8601 last modified timestamp |

### Pagination

After processing each page, check for `@odata.nextLink`:

```json
{
  "value": [ ... ],
  "@odata.nextLink": "https://graph.microsoft.com/v1.0/me/todo/lists/{listId}/tasks?$skiptoken=..."
}
```

Follow `@odata.nextLink` until it is absent. Accumulate all tasks across pages.

## Step 5: Apply Client-Side Date Filters

`dueDateTime` filtering is not supported by `$filter` in all To Do API versions.
Apply `--due-before` and `--due-after` filters client-side after fetching all tasks:

- Extract the date portion from `task.dueDateTime.dateTime`.
- Compare as `YYYY-MM-DD` strings.
- Tasks with null `dueDateTime` are excluded when either date filter is active.

## Step 6: Format Output

For each list, display a section header and a markdown table:

```
═══════════════════════════════════════════════
List: Work Tasks  (4 tasks shown, 12 total)
═══════════════════════════════════════════════

| Title                      | Status      | Importance | Due Date   | Reminder   |
|----------------------------|-------------|------------|------------|------------|
| Review quarterly report    | notStarted  | High       | 2024-01-15 | 09:00 UTC  |
| Prepare board deck         | notStarted  | High       | 2024-01-20 | (none)     |
| Submit expense report      | notStarted  | Normal     | 2024-01-31 | (none)     |
| Call with vendor           | notStarted  | Low        | (no date)  | (none)     |

═══════════════════════════════════════════════
List: Personal  (1 task shown, 8 total)
═══════════════════════════════════════════════

| Title                      | Status      | Importance | Due Date   | Reminder   |
|----------------------------|-------------|------------|------------|------------|
| Dentist appointment prep   | notStarted  | High       | 2024-01-18 | 08:00 UTC  |
```

Status values display as-is from the API. Importance is capitalized for readability.

## Step 7: Display Summary

After all lists are shown, display an aggregate summary:

```
─────────────────────────────────────────────────
TOTAL SUMMARY
Lists scanned:   3
Tasks shown:     5 (filtered)
Tasks total:     20 (across all lists)

By status:       notStarted: 4  |  inProgress: 1
By importance:   High: 5
Overdue tasks:   2 (past due date, not completed)
─────────────────────────────────────────────────
```

## Error Handling

| HTTP Status | Cause | Resolution |
|---|---|---|
| 400 Bad Request | Invalid `$filter` syntax | Check the OData filter expression for typos |
| 401 Unauthorized | Token expired | Re-authenticate to obtain a fresh delegated token |
| 404 Not Found | List ID does not exist | Verify the list ID with `GET /me/todo/lists` |
| 429 Too Many Requests | Throttled (common when iterating many lists) | Implement per-request `Retry-After` delays |

When using `--all-lists`, add a small delay (100–200ms) between list requests to avoid
triggering throttling on tenants with many lists.
