---
name: onenote-hierarchy-manage
description: Manage notebook architecture, nested section groups, and parent-child page organization patterns
argument-hint: "[--notebook <name>] [--create-section-group <name>] [--parent-group <id-or-name>] [--create-section <name>] [--page-parent <title-prefix>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
---

# Manage OneNote Hierarchy

Build and maintain discoverable OneNote architecture with nested section groups and consistent page organization.

## Step 1: Snapshot Current Hierarchy

1. List notebooks.
2. For target notebook, list section groups recursively.
3. List sections and recent page counts.
4. Output current tree before mutation.

## Step 2: Apply Structural Changes

Possible operations:

1. Create section group under notebook.
2. Create nested section group under parent group.
3. Create section under notebook or section group.
4. Re-home content by copy operations where supported.

## Step 3: Enforce Depth and Naming Rules

1. Keep section group nesting shallow (target depth <= 2).
2. Enforce deterministic names (`Domain - Function - Scope`).
3. Reject duplicate sibling names.

## Step 4: Model Parent-Child Page Hierarchy

Because page-subpage API control is limited, emulate hierarchy by convention:

1. Parent title prefix (`Runbook :: Deployment`).
2. Child title prefix (`Runbook :: Deployment :: Rollback`).
3. Parent page index table linking children.
4. Child page backlink to parent.

## Step 5: Verify and Report

1. Re-read hierarchy after changes.
2. Show before/after tree diff.
3. List unresolved naming or depth violations.

## Safety Rules

- Fail fast on unresolved notebook/group/section IDs.
- Avoid destructive deletion in this command.
- Redact object IDs in summaries.
