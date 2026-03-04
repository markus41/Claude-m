---
name: OneNote Knowledge Base
description: >
  Deep expertise in headless-first OneNote automation via Microsoft Graph API. Covers advanced
  notebook architecture, rich page composition, styling, patch workflows, task boards,
  searchable tags, and high-quality documentation output.
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
triggers:
  - onenote
  - knowledge base
  - onenote headless
  - onenote styling
  - onenote columns
  - onenote table
  - onenote task board
  - onenote tags
  - onenote patch
  - onenote hierarchy
  - onenote template
  - onenote navigation index
  - onenote bulk style
---

# OneNote Knowledge Base

## Mission

Operate OneNote as a serious documentation platform using deterministic Graph API workflows.
Default to non-interactive headless execution whenever possible and produce pages that are both
searchable and visually consistent.

## Integration Context Contract

- Canonical contract: [`docs/integration-context.md`](../../../docs/integration-context.md)

| Workflow | tenantId | subscriptionId | environmentCloud | principalType | scopesOrRoles |
|---|---|---|---|---|---|
| Search and read | required | optional | required | delegated-user or service-principal | `Notes.Read` or `Notes.Read.All` |
| Create and patch | required | optional | required | delegated-user or service-principal | `Notes.ReadWrite` or `Notes.ReadWrite.All` |
| Sharing and governance | required | optional | required | delegated-user or service-principal | Notes scopes plus file sharing permissions |

Fail-fast statement: fail before network calls if context fields, auth mode, or permissions are insufficient.

Redaction statement: redact IDs, emails, and secrets in logs and outputs.

## Headless Execution Standard

1. Prefer Managed Identity when running in Azure automation contexts.
2. Otherwise use service principal credentials (certificate preferred, secret acceptable).
3. Use device code only when headless credentials are unavailable.
4. Never require browser login unless explicitly requested.

## Capability Model

| Area | Support Type | Guidance |
|---|---|---|
| Notebook, section group, section, page lifecycle | Native | Use Graph CRUD endpoints with deterministic ID resolution |
| Nested hierarchy | Native + Pattern | Use nested section groups; model page hierarchy with parent-child titles and backlinks |
| Tables and structured data | Native | Use strict `<table><tr><td>/<th>` grid patterns |
| Multi-column visual layout | Pattern | Use table-based columns; avoid unsupported CSS layout controls |
| Tags and to-do markers | Pattern | Use searchable textual tags and status chips (`#todo`, `#decision`, `#risk`) |
| Typography and color | Native | Restrict inline styles to supported properties only |
| Fine-grained updates | Native | Use PATCH arrays with `data-id` anchors |

## Command Map

| Command | Purpose |
|---|---|
| `onenote-setup` | Headless-first setup, auth checks, and baseline validation |
| `onenote-search` | Advanced search and filtering strategy for large knowledge bases |
| `onenote-create-page` | Build high-quality pages from deterministic templates |
| `onenote-meeting-notes` | Create polished meeting pages with decision and action structure |
| `onenote-hierarchy-manage` | Build and maintain notebook architecture and nested section groups |
| `onenote-page-patch` | Apply bulk incremental page updates safely |
| `onenote-task-tracker` | Manage task tables and checklist workflows |
| `onenote-style-apply` | Standardize page theme and visual consistency |
| `onenote-columns-layout` | Produce clean multi-column layouts using supported XHTML |
| `onenote-quality-audit` | Audit structure, accessibility, style, and stale work items |
| `onenote-template-library` | Manage reusable template definitions and instantiate standardized pages |
| `onenote-bulk-style-rollout` | Apply visual themes at section/notebook scale with drift reporting |
| `onenote-navigation-index` | Create and maintain parent-child navigation indexes and backlinks |

## Output Quality Standard

Every generated page should include:

1. One clear H1 and logical H2/H3 hierarchy.
2. A short summary block near the top.
3. Visually consistent table and list spacing.
4. Searchable tags and actionable to-dos where relevant.
5. `data-id` anchors for future patch operations.

## Progressive Disclosure - Reference Files

| Topic | File |
|---|---|
| Notebook and hierarchy operations | [`references/notebooks-sections-pages.md`](./references/notebooks-sections-pages.md) |
| XHTML content and patch operations | [`references/content-api-html.md`](./references/content-api-html.md) |
| Search, sharing, and indexing limits | [`references/search-sharing.md`](./references/search-sharing.md) |
| Advanced layout, theme, tags, and task patterns | [`references/advanced-layout-style.md`](./references/advanced-layout-style.md) |
| Nested architecture playbook | [`references/nested/architecture/nested-information-architecture.md`](./references/nested/architecture/nested-information-architecture.md) |
| Template catalog strategy | [`references/nested/templates/template-catalog.md`](./references/nested/templates/template-catalog.md) |
| Headless operations runbook | [`references/nested/operations/headless-operations-runbook.md`](./references/nested/operations/headless-operations-runbook.md) |
