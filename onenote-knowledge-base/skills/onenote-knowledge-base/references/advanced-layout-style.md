# OneNote Advanced Layout, Style, Tags, and Task Patterns

## Purpose

This reference provides advanced, API-safe patterns for high-quality OneNote pages in headless automation workflows.

## Headless Pattern Baseline

1. Authenticate non-interactively whenever possible.
2. Resolve all IDs before mutation.
3. Create pages with explicit `data-id` anchors.
4. Apply style and content updates through batched PATCH calls.

## Visual Theme Token Sets

Use one of these token bundles with inline styles only.

### Clean Theme

- Font family: `Calibri, Segoe UI, Arial, sans-serif`
- Base text size: `12pt`
- H1 color: `#1f2937`
- H2 color: `#334155`
- Accent background: `#eef2ff`

### Executive Theme

- Font family: `Segoe UI, Calibri, Arial, sans-serif`
- Base text size: `12pt`
- H1 color: `#0f172a`
- H2 color: `#1e3a8a`
- Accent background: `#eff6ff`

### Contrast Theme

- Font family: `Arial, Segoe UI, sans-serif`
- Base text size: `12pt`
- H1 color: `#111827`
- H2 color: `#1f2937`
- Accent background: `#f3f4f6`

## Status Chip Patterns

Use text plus inline style for status chips:

- Open: light amber background
- InProgress: light blue background
- Blocked: light red background
- Done: light green background

## Tagging and Searchability

Recommended canonical tags:

1. `#todo`
2. `#decision`
3. `#risk`
4. `#owner/<name>`
5. `#deadline/<yyyy-mm-dd>`

Tag rules:

1. Keep tags lowercase.
2. Keep tags in dedicated list/table cells for parseability.
3. Use at least one operational tag on meeting and runbook pages.

## To-do and Action Patterns

Use both checklist markers and task table entries:

1. Checklist markers in narrative sections: `[ ]` and `[x]`
2. Task table schema: `Task | Owner | Due Date | Status | Priority | Tags`
3. Always populate owner and due date.

## Nested Information Architecture

Use this model:

1. Notebook level for domain.
2. Section group level for program/subdomain.
3. Section level for lifecycle slice.
4. Page naming convention for parent-child relationships.

Page hierarchy naming pattern:

1. `Parent :: Topic`
2. `Parent :: Topic :: Child`
3. Parent index page links to children and includes status summary.

## Column Layout Pattern (API-Safe)

Because advanced CSS layout is limited, use table-based columns:

1. One-row two-column table for narrative pages.
2. One-row three-column table for dashboards.
3. Avoid heavy nested tables inside columns.

## Patchability Pattern

Add these anchors when creating pages:

1. `summary`
2. `decisions`
3. `action-items`
4. `risks`
5. `references`
6. `next-steps`

Batch patch example strategy:

1. Replace summary.
2. Append decision bullet.
3. Append action row.
4. Update next-steps block.

## Limitations You Must Design Around

1. XHTML only; malformed XML fails.
2. Unsupported structural HTML/CSS may be stripped.
3. Treat page-subpage UI behavior as a client concern; model hierarchy explicitly.
4. Search index lag exists for recently created pages.
