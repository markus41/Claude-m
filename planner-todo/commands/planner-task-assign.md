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

Assign a Planner task to one or more users.

## Instructions

1. GET the task to obtain the current `@odata.etag`.
2. Build the `assignments` object with each user ID.
3. PATCH the task with `If-Match` header set to the ETag.
4. Confirm the assignment and display updated task details.
