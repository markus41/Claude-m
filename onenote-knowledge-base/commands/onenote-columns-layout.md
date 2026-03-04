---
name: onenote-columns-layout
description: Build and maintain polished multi-column OneNote layouts using supported table-based XHTML patterns
argument-hint: "<page-id-or-section-id> [--columns 2|3] [--mode create|convert|rebalance]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
---

# OneNote Columns Layout

Create clean two-column or three-column content structures using API-safe table layouts.

## Step 1: Choose Mode

1. `create`: create a new page with column scaffold.
2. `convert`: transform an existing linear section into column layout blocks.
3. `rebalance`: redistribute content between columns for readability.

## Step 2: Build Supported Column Scaffold

Use a table scaffold with one row and N columns:

1. `2` columns for overview + details.
2. `3` columns for dashboard-style summaries.

Each column receives a patch anchor:

1. `data-id="col-1"`
2. `data-id="col-2"`
3. `data-id="col-3"` (optional)

## Step 3: Populate Column Semantics

Recommended layout:

1. Left column: summary, KPIs, key tags.
2. Center column: narrative details and decisions.
3. Right column: actions, risks, references.

## Step 4: Enforce Readability Rules

1. Limit each column section to short blocks.
2. Keep heading hierarchy consistent inside each column.
3. Ensure tables nested in columns remain simple grids.

## Step 5: Verify and Return

1. Re-fetch page content.
2. Confirm anchors exist and content is distributed.
3. Return column utilization summary and styling suggestions.

## Safety Rules

- Fail fast on unsupported layout constructs.
- Avoid nested complex tables that degrade readability.
- Redact IDs in output.
