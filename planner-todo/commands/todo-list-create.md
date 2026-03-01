---
name: todo-list-create
description: Create a new Microsoft To Do task list
argument-hint: "<list-name>"
allowed-tools:
  - Read
  - Write
  - Bash
---

# Create To Do List

Create a new task list in Microsoft To Do.

## Instructions

1. Create the list: `POST /me/todo/lists` with `displayName`.
2. Display the list ID and name.
