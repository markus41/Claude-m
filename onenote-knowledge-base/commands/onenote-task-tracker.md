---
name: onenote-task-tracker
description: Create and maintain OneNote task and action boards with tags, owner routing, and due-date governance
argument-hint: "<page-id-or-section-id> [--mode bootstrap|update|report] [--owner <name>] [--status Open|InProgress|Blocked|Done] [--tag <#tag>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
---

# OneNote Task and Action Tracker

Run to-do and action workflows in OneNote using deterministic table structures and searchable tags.

## Step 1: Choose Mode

1. `bootstrap`: create a new task board page.
2. `update`: patch existing task table rows.
3. `report`: summarize by owner, status, and overdue risk.

## Step 2: Use Canonical Task Schema

Task table columns:

1. Task
2. Owner
3. Due Date
4. Status
5. Priority
6. Tags

Status values are fixed:

1. Open
2. InProgress
3. Blocked
4. Done

## Step 3: Apply Tag and Checklist Conventions

1. Add searchable tags in `Tags` column (`#todo`, `#decision`, `#risk`, `#owner/alice`).
2. Include `[ ]` and `[x]` markers in task text when checklists are needed.
3. Use one owner per row for accountability.

## Step 4: Execute Mode Workflow

1. `bootstrap`: create page with schema and `data-id="task-board"`.
2. `update`: patch target rows via `onenote-page-patch` patterns.
3. `report`: compute counts by status and overdue items.

## Step 5: Return Operational Summary

Return:

1. Total tasks
2. Open vs done ratio
3. Overdue count
4. Owners with highest load
5. Top risk tags

## Safety Rules

- Fail fast if required columns/anchors are missing.
- Reject unknown status values.
- Redact personal identifiers where required.
