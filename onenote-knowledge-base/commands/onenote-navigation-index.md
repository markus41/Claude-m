---
name: onenote-navigation-index
description: Build and maintain parent-child navigation indexes, backlinks, and cross-page relationship maps
argument-hint: "<notebook-id-or-section-id> [--mode create|refresh|repair] [--root-page-title <title>] [--tag-filter <#tag>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
---

# OneNote Navigation Index

Create nested documentation navigation using index pages, backlinks, and relationship maps.

## Step 1: Discover Page Set

1. Resolve scope (section or notebook).
2. Enumerate pages with title, URL, last modified, and detected tags.
3. Cluster pages by naming convention and tag families.

## Step 2: Build Parent-Child Map

1. Detect parent nodes by prefix pattern (`Domain :: Topic`).
2. Attach children (`Domain :: Topic :: Child`).
3. Identify orphans without parent linkage.

## Step 3: Create or Refresh Index Page

Index page must include:

1. hierarchy table (Parent, Child, Status, Last Modified)
2. quick links list grouped by domain
3. orphan page section
4. `data-id` anchors for refresh patches

## Step 4: Backlink Repair

For each child page:

1. confirm backlink to parent exists
2. append backlink block if missing
3. normalize backlink text pattern

## Step 5: Return Navigation Health Report

Return:

1. parent count
2. child count
3. orphan count
4. backlinks added/fixed
5. recommended renames for ambiguous structures

## Safety Rules

- Fail fast on scope resolution errors.
- Skip destructive rename/delete operations in this command.
- Redact IDs and user identifiers in output.
