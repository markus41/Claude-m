---
name: pa-model-driven-form
description: Generate a model-driven app form configuration for a Dataverse table
argument-hint: "<table-name> [--form-type main|quick-create|quick-view] [--columns <col1,col2,col3>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
---

# Generate Model-Driven Form

Generate a model-driven app form layout for a Dataverse table.

## Instructions

1. Determine the form type from `--form-type` (default: main).
2. If `--columns` is specified, include those columns. Otherwise, include all columns.
3. Generate the form XML with tabs, sections, and cell layouts.
4. For main forms: include Header, General tab, Details tab, and Timeline section.
5. For quick create: compact single-section layout with key fields.
6. For quick view: read-only display with key information fields.
7. Include business rule suggestions for common patterns (show/hide, required fields).
