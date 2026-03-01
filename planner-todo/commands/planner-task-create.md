---
name: planner-task-create
description: Create a task in a Planner plan with optional assignment and due date
argument-hint: "<task-title> --plan <plan-id> --bucket <bucket-id> [--assign <user-id>] [--due <date>] [--priority urgent|important|medium|low]"
allowed-tools:
  - Read
  - Write
  - Bash
---

# Create Planner Task

Create a new task in a Planner plan bucket.

## Instructions

1. Build the task body with `planId`, `bucketId`, `title`.
2. If `--assign` is provided, add to `assignments` with proper `@odata.type`.
3. Map `--priority` to numeric value: urgent=0, important=1, medium=3, low=5.
4. If `--due` is provided, set `dueDateTime` (ISO-8601).
5. Create the task via `POST /planner/tasks`.
6. Display the task ID and web URL.
