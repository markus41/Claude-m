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

Create a new task in a Microsoft To Do list.

## Instructions

1. Build the task body with `title`.
2. If `--due` is provided, set `dueDateTime` with `timeZone: "UTC"`.
3. If `--reminder` is provided, set `reminderDateTime` and `isReminderOn: true`.
4. Set `importance` from `--importance` flag (default: `normal`).
5. Create the task: `POST /me/todo/lists/{listId}/tasks`.
6. Display the task ID and status.
