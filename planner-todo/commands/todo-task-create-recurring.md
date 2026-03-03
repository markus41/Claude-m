---
name: todo-task-create-recurring
description: Create a recurring Microsoft To Do task with a daily, weekly, monthly, or yearly recurrence pattern
argument-hint: "<task-title> --list <list-id> --pattern daily|weekly|monthly|yearly [--interval <n>] [--days Mon,Tue,Wed] [--due <start-date>]"
allowed-tools:
  - Read
  - Write
  - Bash
---

# Create Recurring To Do Task

Create a Microsoft To Do task with a recurrence pattern. When a recurring task is
completed, To Do automatically generates the next occurrence based on the configured
pattern. The `dueDateTime` sets the first occurrence date and must be provided when
using recurrence.

## Authentication

Requires a **delegated** token (user context). App-only tokens are not supported.

Required OAuth scope:
- `Tasks.ReadWrite` — create and manage To Do tasks including recurring ones

## Arguments

| Argument | Required | Description |
|---|---|---|
| `<task-title>` | Yes | Display name of the recurring task |
| `--list <list-id>` | Yes | ID of the To Do list to create the task in |
| `--pattern <type>` | Yes | Recurrence type: `daily`, `weekly`, `monthly`, or `yearly` |
| `--interval <n>` | No | Repeat every N units (e.g., every 2 weeks). Default: 1 |
| `--days <list>` | No | Days of week for weekly pattern: `Mon,Tue,Wed,Thu,Fri,Sat,Sun` |
| `--due <date>` | No (but recommended) | Start date in `YYYY-MM-DD` format. Defaults to today |
| `--end-date <date>` | No | Stop recurrence after this date |
| `--occurrences <n>` | No | Stop after N occurrences |

## Understanding the Recurrence Object

The To Do API uses the same recurrence structure as Microsoft Calendar events. The
recurrence object has two sub-objects: `pattern` (how often) and `range` (when to stop).

### Full Recurrence Structure

```json
{
  "recurrence": {
    "pattern": {
      "type": "daily",
      "interval": 1,
      "daysOfWeek": ["monday", "tuesday", "wednesday", "thursday", "friday"],
      "dayOfMonth": 15,
      "month": 3,
      "firstDayOfWeek": "sunday"
    },
    "range": {
      "type": "noEnd",
      "startDate": "2024-01-15",
      "endDate": "2024-12-31",
      "numberOfOccurrences": 0
    }
  }
}
```

## Pattern Configuration by Type

### Daily Pattern

Repeats every N days. If `--days` is not provided, recurs every day.

```json
{
  "pattern": {
    "type": "daily",
    "interval": 1
  }
}
```

Example — every 3 days:
```json
{ "type": "daily", "interval": 3 }
```

### Weekly Pattern

Repeats on specific days of the week every N weeks. `daysOfWeek` is required.

```json
{
  "pattern": {
    "type": "weekly",
    "interval": 1,
    "daysOfWeek": ["monday", "wednesday", "friday"],
    "firstDayOfWeek": "sunday"
  }
}
```

Day name mapping for `--days` argument:

| Short form | API value |
|---|---|
| `Mon` | `"monday"` |
| `Tue` | `"tuesday"` |
| `Wed` | `"wednesday"` |
| `Thu` | `"thursday"` |
| `Fri` | `"friday"` |
| `Sat` | `"saturday"` |
| `Sun` | `"sunday"` |

Example — every Monday and Thursday, bi-weekly:
```json
{ "type": "weekly", "interval": 2, "daysOfWeek": ["monday", "thursday"], "firstDayOfWeek": "sunday" }
```

### Monthly Pattern

Repeats on the same day of the month every N months (`absoluteMonthly`).
`dayOfMonth` defaults to the day of the `--due` date if not specified separately.

```json
{
  "pattern": {
    "type": "absoluteMonthly",
    "interval": 1,
    "dayOfMonth": 15
  }
}
```

Example — on the 1st of every month:
```json
{ "type": "absoluteMonthly", "interval": 1, "dayOfMonth": 1 }
```

### Yearly Pattern

Repeats on the same day and month each year (`absoluteYearly`).

```json
{
  "pattern": {
    "type": "absoluteYearly",
    "interval": 1,
    "dayOfMonth": 15,
    "month": 3
  }
}
```

Month values are 1-indexed (1 = January, 12 = December).

## Range Configuration

Control when the recurrence ends using `range`:

| `--end-date` | `--occurrences` | range.type | Notes |
|---|---|---|---|
| not set | not set | `"noEnd"` | Recurs forever |
| set | not set | `"endDate"` | Set `endDate` to the specified date |
| not set | set | `"numbered"` | Set `numberOfOccurrences` to the count |

```json
{
  "range": {
    "type": "noEnd",
    "startDate": "2024-01-15"
  }
}
```

## Full Request

```
POST https://graph.microsoft.com/v1.0/me/todo/lists/{listId}/tasks
Content-Type: application/json
Authorization: Bearer <token>
```

Example body — weekly task every Monday, starting 2024-01-15, no end:
```json
{
  "title": "Weekly team standup prep",
  "importance": "normal",
  "status": "notStarted",
  "dueDateTime": {
    "dateTime": "2024-01-15T23:59:59.0000000",
    "timeZone": "UTC"
  },
  "recurrence": {
    "pattern": {
      "type": "weekly",
      "interval": 1,
      "daysOfWeek": ["monday"],
      "firstDayOfWeek": "sunday"
    },
    "range": {
      "type": "noEnd",
      "startDate": "2024-01-15"
    }
  }
}
```

## Error Handling

| HTTP Status | Cause | Resolution |
|---|---|---|
| 400 Bad Request | Invalid recurrence pattern (e.g., `daysOfWeek` missing for weekly) | Check that required pattern fields are present for the chosen type |
| 400 Bad Request | `dueDateTime` missing when recurrence is set | Always provide `--due` when creating recurring tasks |
| 404 Not Found | List does not exist | Verify the list ID with `GET /me/todo/lists` |
| 429 Too Many Requests | Throttled | Wait `Retry-After` seconds |

## Pattern Examples Summary

| Goal | Command |
|---|---|
| Every day | `--pattern daily` |
| Every weekday | `--pattern daily --days Mon,Tue,Wed,Thu,Fri` (use weekly type for this) |
| Every Monday | `--pattern weekly --days Mon` |
| Every other Friday | `--pattern weekly --days Fri --interval 2` |
| 1st of each month | `--pattern monthly --due 2024-02-01` |
| Every March 15 | `--pattern yearly --due 2024-03-15` |

## Success Output

```
Recurring task created successfully
─────────────────────────────────────────────────
Task ID:         AAMkAGVmMDEzMTM4LTZmYWUtNDdkNC...
Title:           Weekly team standup prep
List:            Work Tasks
Pattern:         Weekly, every Monday
First occurrence: 2024-01-15
End:             No end date (recurs indefinitely)
Status:          Not Started

Next 3 occurrences:
  1. Monday, 2024-01-15
  2. Monday, 2024-01-22
  3. Monday, 2024-01-29
─────────────────────────────────────────────────
```
