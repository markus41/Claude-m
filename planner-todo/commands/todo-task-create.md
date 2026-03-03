---
name: todo-task-create
description: Create a task in a Microsoft To Do list with optional due date and reminder
argument-hint: "<task-title> --list <list-id> [--due <date>] [--reminder <datetime>] [--importance low|normal|high]"
allowed-tools:
  - Read
  - Write
  - Bash
---

# Create To Do Task

Create a new task in a Microsoft To Do list. Supports due dates, reminders, importance
levels, and optional body notes. To Do tasks belong to a specific list owned by the
signed-in user.

## Authentication

Requires a **delegated** token (user context). App-only tokens are not supported for
To Do task creation.

Required OAuth scope:
- `Tasks.ReadWrite` — create and manage the signed-in user's To Do tasks

## Arguments

| Argument | Required | Description |
|---|---|---|
| `<task-title>` | Yes | Display name of the task |
| `--list <list-id>` | Yes | ID of the To Do list to create the task in |
| `--due <date>` | No | Due date in `YYYY-MM-DD` format |
| `--reminder <datetime>` | No | Reminder datetime in `YYYY-MM-DDTHH:MM:SS` format |
| `--importance <level>` | No | `low`, `normal` (default), or `high` |
| `--notes <text>` | No | Optional body text for the task |

## Step 1: Parse Arguments

Extract all arguments. Apply these defaults if not specified:
- `importance`: `normal`
- `status`: `notStarted` (always set this on creation)

If `--due` is provided as `YYYY-MM-DD`, convert to the datetime format required by the
API: append `T23:59:59.0000000` and use `timeZone: "UTC"`.

If `--reminder` is provided, `isReminderOn` must be set to `true`.

## Step 2: Acquire Delegated Token

Use `InteractiveBrowserCredential` or `DeviceCodeCredential` from `@azure/identity`
with scope `https://graph.microsoft.com/.default`.

## Step 3: Build the Request Body

```
POST https://graph.microsoft.com/v1.0/me/todo/lists/{listId}/tasks
Content-Type: application/json
Authorization: Bearer <token>
```

Full request body with all fields:
```json
{
  "title": "<task-title>",
  "importance": "normal",
  "status": "notStarted",
  "dueDateTime": {
    "dateTime": "2024-01-15T23:59:59.0000000",
    "timeZone": "UTC"
  },
  "reminderDateTime": {
    "dateTime": "2024-01-15T09:00:00.0000000",
    "timeZone": "UTC"
  },
  "isReminderOn": true,
  "body": {
    "content": "<optional notes>",
    "contentType": "text"
  }
}
```

Field notes:
- Omit `dueDateTime` entirely if `--due` was not provided (do not set it to null).
- Omit `reminderDateTime` and `isReminderOn` if `--reminder` was not provided.
- Omit `body` if `--notes` was not provided.
- `contentType` can be `"text"` or `"html"`. Use `"text"` unless you are providing
  HTML markup in `content`.

### Importance Values

| Flag | API value |
|---|---|
| `--importance low` | `"low"` |
| `--importance normal` | `"normal"` |
| `--importance high` | `"high"` |

### Status Values (for reference)

| Status | Description |
|---|---|
| `notStarted` | Default for new tasks |
| `inProgress` | Task has been started |
| `completed` | Task is done |
| `waitingOnOthers` | Blocked on someone else |
| `deferred` | Postponed |

## Step 4: Handle the Response

Expected successful response: `HTTP 201 Created`
```json
{
  "id": "AAMkAGVmMDEzMTM4LTZmYWUtNDdkNC1hNTZmLTUwNzI3Y2NkNjczNAAuAAAAAAAiQ8W...",
  "title": "Review quarterly report",
  "importance": "high",
  "status": "notStarted",
  "isReminderOn": true,
  "createdDateTime": "2024-01-10T08:00:00Z",
  "lastModifiedDateTime": "2024-01-10T08:00:00Z",
  "dueDateTime": {
    "dateTime": "2024-01-15T23:59:59.0000000",
    "timeZone": "UTC"
  },
  "reminderDateTime": {
    "dateTime": "2024-01-15T09:00:00.0000000",
    "timeZone": "UTC"
  },
  "body": {
    "content": "Check slides and financial summary",
    "contentType": "text"
  }
}
```

## Error Handling

| HTTP Status | Cause | Resolution |
|---|---|---|
| 400 Bad Request | Invalid `listId` format, missing `title`, or malformed datetime | Verify the list ID is correct and datetime strings are properly formatted |
| 401 Unauthorized | Token expired | Re-authenticate and obtain a fresh delegated token |
| 404 Not Found | The specified list does not exist or belongs to a different user | Confirm the list ID with `GET /me/todo/lists` |
| 429 Too Many Requests | Throttled | Wait the number of seconds in the `Retry-After` response header |

## Success Output

Display the following after the task is created:

```
To Do task created successfully
─────────────────────────────────────────────────
Task ID:    AAMkAGVmMDEzMTM4LTZmYWUtNDdkNC1...
Title:      Review quarterly report
List:       Work Tasks
Status:     Not Started
Importance: High
Due Date:   2024-01-15 (23:59 UTC)
Reminder:   2024-01-15 at 09:00 UTC
─────────────────────────────────────────────────
Open in To Do app: https://to-do.microsoft.com/tasks/id/<task-id>
```
