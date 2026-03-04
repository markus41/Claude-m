# Nested Information Architecture Playbook

## Objective

Create scalable OneNote hierarchies that are easy to browse, search, and maintain.

## Hierarchy Pattern

1. Notebook = business domain.
2. Section group = program or capability.
3. Section = workflow slice.
4. Page = single bounded topic.

## Parent-Child Page Modeling

Use deterministic naming:

1. Parent: `Domain :: Topic`
2. Child: `Domain :: Topic :: Child`

Every child should include:

1. backlink to parent page
2. ownership tag (`#owner/<name>`)
3. freshness marker (`#review/<yyyy-mm-dd>`)

## Navigation Index Requirements

1. Root index page per section group.
2. Parent-to-child link table.
3. Orphan page detector section.
4. Last modified timestamp summary.

## Anti-Patterns

1. More than two nested section-group levels.
2. Pages without clear ownership or tags.
3. Massive pages that mix unrelated workflows.
