# microsoft-loop

Microsoft Loop plugin for Claude Code — workspaces, pages, Loop components, Graph API integration, and tenant governance.

## Features

- **Workspace management** via Microsoft Graph `fileStorage/containers` API
- **Page design patterns** for planning, standups, retrospectives, decision logs
- **Loop component guidance** — task lists, tables, voting, Q&A, progress trackers
- **Embedding patterns** — Teams, Outlook, OneNote, Word
- **Admin governance** — tenant settings, sensitivity labels, DLP, retention, eDiscovery
- **TypeScript SDK examples** for all Graph API operations

## Commands

| Command | Description |
|---|---|
| `/loop-workspace-setup` | Create and configure a Loop workspace for a project |
| `/loop-page-structure` | Design a page layout with optimal component placement |

## Installation

```bash
/plugin install microsoft-loop@claude-m-microsoft-marketplace
```

## Prerequisites

- Microsoft 365 tenant with Loop enabled
- App registration with `FileStorageContainer.Selected` permission (admin-consented)
- For admin operations: Global Admin or SharePoint Admin role

## Environment Variables

```bash
AZURE_TENANT_ID=          # AAD tenant ID
AZURE_CLIENT_ID=          # App registration client ID
AZURE_CLIENT_SECRET=      # Client secret (use Key Vault in production)
LOOP_CONTAINER_TYPE_ID=   # Loop workspace container type ID for your tenant
```

## Reference Files

| Topic | File |
|---|---|
| Workspace lifecycle, page management, drive API | `skills/microsoft-loop/references/workspaces-pages.md` |
| Component types, creation, embedding patterns | `skills/microsoft-loop/references/loop-components.md` |
| Full Graph API reference, TypeScript SDK snippets | `skills/microsoft-loop/references/graph-api.md` |
| Admin settings, Purview compliance, governance | `skills/microsoft-loop/references/admin-governance.md` |
