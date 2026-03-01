---
name: planner-plan-create
description: Create a new Planner plan with buckets for a Microsoft 365 Group
argument-hint: "<plan-title> --group <group-id> [--buckets 'Backlog,In Progress,Review,Done']"
allowed-tools:
  - Read
  - Write
  - Bash
---

# Create Planner Plan

Create a new plan in Microsoft Planner with optional pre-configured buckets.

## Instructions

1. Create the plan: `POST /planner/plans` with `owner` (group ID) and `title`.
2. If `--buckets` is provided, create each bucket in order via `POST /planner/buckets`.
3. If no buckets specified, create defaults: Backlog, In Progress, Review, Done.
4. Display the plan ID, URL, and bucket names.
