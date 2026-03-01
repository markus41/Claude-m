---
name: ado-query-workitems
description: Query work items using WIQL (Work Item Query Language)
argument-hint: "<wiql-query-or-preset> [--preset my-bugs|my-tasks|sprint-backlog|unassigned]"
allowed-tools:
  - Read
  - Write
  - Bash
---

# Query Work Items

Run a WIQL query to find work items in Azure DevOps Boards.

## Instructions

1. If `--preset` is provided, use a predefined WIQL query:
   - `my-bugs`: Bugs assigned to current user, not closed.
   - `my-tasks`: Tasks assigned to current user in current sprint.
   - `sprint-backlog`: All items in current iteration.
   - `unassigned`: Work items with no assignee.
2. Otherwise, use the provided WIQL query string.
3. Call `POST /_apis/wit/wiql?api-version=7.1` with the query.
4. Fetch full work item details for the result IDs.
5. Display as a table: ID, Type, Title, State, Assigned To, Priority.
