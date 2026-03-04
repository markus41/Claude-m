# OneNote Knowledge Base Plugin

A headless-first Claude Code knowledge plugin for advanced OneNote automation through Microsoft Graph.
It is designed to produce polished, consistent, and maintainable OneNote pages at scale: nested information architecture, rich tables, column layouts, searchable tags, task boards, and deterministic patch workflows.

## Headless-First Execution Policy

Default operating mode is non-interactive automation:

1. Managed Identity (preferred in Azure-hosted runtimes)
2. Service principal with certificate or secret
3. Device code fallback only when headless credentials are unavailable

Interactive browser auth should be treated as a last resort.

## What This Plugin Maximizes

| Capability | Status | How It Is Handled |
|---|---|---|
| Notebook/section/section group lifecycle | Native | Full Graph API CRUD and hierarchy orchestration |
| Nested hierarchy | Native + Pattern | Nested section groups are native; page-level nesting is modeled with parent-child naming and backlinks |
| Rich page formatting | Native | Headings, lists, tables, links, code blocks, inline font/color/background styling |
| Multi-column layouts | Pattern | Implemented with stable table-based layout instead of unsupported CSS layout constructs |
| Tags and to-do tracking | Pattern | Searchable textual tags (`#todo`, `#decision`, `#risk`) plus deterministic task tables/checklists |
| Consistent visual style | Native + Pattern | Theme command applies reusable font, color, header, and status-chip standards |
| Large updates to existing pages | Native | Single-call PATCH arrays targeting `data-id` anchors |

## Constraints You Must Respect

- OneNote Graph page content is XHTML; invalid or unsupported HTML is rejected or stripped.
- Advanced CSS layout primitives are not supported. Use table-based structure.
- Treat "client-only" visual behaviors as non-API guarantees.

## Integration Context Contract

- Canonical contract: [`docs/integration-context.md`](../docs/integration-context.md)

| Command family | tenantId | subscriptionId | environmentCloud | principalType | scopesOrRoles |
|---|---|---|---|---|---|
| Read/search operations | required | optional | required | delegated-user or service-principal | `Notes.Read` or `Notes.Read.All` |
| Create/update/delete operations | required | optional | required | delegated-user or service-principal | `Notes.ReadWrite` or `Notes.ReadWrite.All` |
| Shared notebook governance | required | optional | required | delegated-user or service-principal | OneDrive/SharePoint sharing permissions plus Notes scopes |

Fail-fast statement: stop immediately when integration context, identity mode, or API permissions are incomplete.

Redaction statement: redact tenant IDs, object IDs, secrets, and tokens from all outputs.

## Commands

| Command | Description |
|---|---|
| `/onenote-setup` | Headless-first setup and authentication validation |
| `/onenote-search` | Advanced page search with scope, recency, and tag slicing |
| `/onenote-create-page` | Rich page creation with templates, style tokens, and patch anchors |
| `/onenote-meeting-notes` | High-quality meeting notes with decisions, action tracking, and follow-up structure |
| `/onenote-hierarchy-manage` | Notebook and section group architecture with nested hierarchy patterns |
| `/onenote-page-patch` | Deterministic bulk PATCH workflows against `data-id` targets |
| `/onenote-task-tracker` | To-do and action board workflows with owner/due/status governance |
| `/onenote-style-apply` | Enforce consistent typography, colors, headers, and status chips |
| `/onenote-columns-layout` | Build polished 2-3 column page layouts using supported XHTML patterns |
| `/onenote-quality-audit` | Lint page quality: structure, accessibility, styling consistency, and stale task risk |
| `/onenote-template-library` | Create, version, and instantiate reusable high-quality page templates |
| `/onenote-bulk-style-rollout` | Roll out visual themes across sections/notebooks with dry-run and drift reporting |
| `/onenote-navigation-index` | Build parent-child indexes, backlinks, and nested documentation navigation maps |

## Reviewer Agent

| Agent | Description |
|---|---|
| `onenote-reviewer` | Reviews architecture, formatting, styling consistency, task hygiene, and automation safety |

## Trigger Keywords

`onenote`, `knowledge base`, `headless onenote`, `onenote styling`, `onenote table`, `onenote columns`, `onenote tasks`, `onenote tags`, `onenote hierarchy`, `onenote patch`

## Nested Documentation Map

The plugin now includes nested reference docs for deeper operations and architecture guidance:

1. `skills/onenote-knowledge-base/references/nested/architecture/nested-information-architecture.md`
2. `skills/onenote-knowledge-base/references/nested/templates/template-catalog.md`
3. `skills/onenote-knowledge-base/references/nested/operations/headless-operations-runbook.md`
