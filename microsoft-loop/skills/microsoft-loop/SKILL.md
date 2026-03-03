---
name: Microsoft Loop
description: >
  Deep expertise in Microsoft Loop — collaborative workspaces, pages, and portable Loop
  components embeddable across Teams, Outlook, and OneNote. Covers Graph API workspace
  management (fileStorage containers), Loop component types (tables, task lists, voting,
  progress trackers), page design patterns, Power Automate integration, and tenant-level
  admin governance via Teams admin center and Microsoft 365 admin center.
  Triggers on: "microsoft loop", "loop workspace", "loop page", "loop component",
  "embed loop component", "loop table", "loop task list", "create loop workspace",
  "loop in teams", "loop in outlook", "loop admin", "loop governance", ".loop file",
  ".fluid file", "fluid framework", "portable content", "loop sharing", "loop export",
  "loop component link", "loop collaboration", "loop template", "loop content component",
  "set up loop workspace", "loop for project", "loop pages api", "loop container".
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
triggers:
  - microsoft loop
  - loop workspace
  - loop page
  - loop component
  - embed loop component
  - loop table
  - loop task list
  - create loop workspace
  - loop in teams
  - loop in outlook
  - loop admin
  - loop governance
  - .loop file
  - .fluid file
  - fluid framework
  - portable content
  - loop sharing
  - loop export
  - loop component link
  - loop collaboration
  - loop template
  - loop content component
  - set up loop workspace
  - loop for project
  - loop pages api
  - loop container
---

# Microsoft Loop

## What Is Loop?

Microsoft Loop is a collaborative productivity app that combines flexible pages, workspaces,
and portable components that stay in sync across Microsoft 365 apps.

**Three core concepts:**

| Concept | What it is | Where it lives |
|---|---|---|
| **Workspace** | Project-scoped shared space for a team | Loop app, Teams |
| **Page** | Rich collaborative document within a workspace | Inside a workspace |
| **Component** | Portable live content block (table, task list, etc.) | Embeds in Teams, Outlook, OneNote, Word |

Loop is built on the **Fluid Framework** — a distributed data structure that syncs changes
in real time across all surfaces where a component is embedded. When someone edits a Loop
component in an Outlook email, that change is instantly visible in Teams and in the Loop app.

---

## Workspaces

A Loop **workspace** is the top-level container for collaborative work. Each workspace holds:
- Pages (rich text documents)
- Sections (page groups)
- Shared components
- Access control (members, guests, links)

Workspaces map to **Fluid containers** in the Microsoft Graph storage API.
The container type ID for Loop workspaces is defined at the tenant level.

### Creating a Workspace (Graph API)

```http
POST https://graph.microsoft.com/v1.0/storage/fileStorage/containers
Content-Type: application/json

{
  "displayName": "Q2 Product Launch",
  "description": "Loop workspace for Q2 product launch planning",
  "containerTypeId": "{{loopContainerTypeId}}"
}
```

Response: returns `id` (the container ID) and `webUrl` (direct link to workspace in Loop app).

### Listing Workspaces

```http
GET https://graph.microsoft.com/v1.0/storage/fileStorage/containers
    ?$filter=containerTypeId eq '{{loopContainerTypeId}}'
    &$select=id,displayName,description,webUrl,status,createdDateTime
```

### Required Permissions

| Scenario | Permission |
|---|---|
| Read workspaces | `FileStorageContainer.Selected` (delegated) |
| Create / manage workspaces | `FileStorageContainer.Selected` (delegated or app) |
| Admin: list all workspaces | `Sites.ReadWrite.All` or `Files.ReadWrite.All` (app) |

---

## Pages

A Loop **page** is a document within a workspace. Pages are stored as `.loop` files
in the workspace's OneDrive-backed drive.

### Listing Pages in a Workspace

```http
GET https://graph.microsoft.com/v1.0/storage/fileStorage/containers/{containerId}/drive/root/children
    ?$filter=file/mimeType eq 'application/fluid'
    &$select=id,name,webUrl,createdDateTime,lastModifiedDateTime,createdBy
```

### Page Design Principles

- **One page per topic** — avoid mega-pages; use links between pages
- **Sections at the top** — use headings (H1/H2) to structure content visually
- **Embed components early** — place task lists and tables above the fold
- **Use templates** for recurring content (standups, retrospectives, planning)

Standard page structures are in [`references/workspaces-pages.md`](./references/workspaces-pages.md).

---

## Loop Components

A **Loop component** is a portable, live content block. Components created in the Loop app
can be embedded in Teams messages, Outlook emails, OneNote pages, and Word documents via
a **Loop component link** (`https://loop.microsoft.com/r/...`).

### Built-in Component Types

| Component | Use Case |
|---|---|
| Task list | Action items with assignees + due dates |
| Table | Structured data with columns (text, date, person, choice) |
| Q&A | Questions with threaded answers |
| Voting table | Prioritize options by team vote |
| Bulleted / numbered list | Shared notes or lists |
| Progress tracker | Track status across multiple items |
| Paragraph | Rich text block |

### Embedding in Teams

When sending a Loop component link in a Teams message, Teams auto-renders it as a live,
editable card. Anyone in the conversation can edit inline.

```
# In Teams chat or channel message:
Paste the Loop component link → Teams expands it to live card
```

### Embedding in Outlook

```
# In Outlook compose:
Insert → Loop component → select existing or create new
```

Full component type reference, API creation patterns, and embedding flows are in
[`references/loop-components.md`](./references/loop-components.md).

---

## Graph API — Key Operations

Loop uses the **fileStorage containers** Graph API for workspaces and the **drive** API
for pages. Both use standard Graph authentication (delegated or app-only).

### Quick Reference

| Operation | Method | Endpoint |
|---|---|---|
| List workspaces | GET | `/v1.0/storage/fileStorage/containers?$filter=...` |
| Create workspace | POST | `/v1.0/storage/fileStorage/containers` |
| Get workspace | GET | `/v1.0/storage/fileStorage/containers/{id}` |
| List pages | GET | `/v1.0/storage/fileStorage/containers/{id}/drive/root/children` |
| Get page content | GET | `/v1.0/drives/{driveId}/items/{itemId}/content` |
| Share workspace | POST | `/v1.0/storage/fileStorage/containers/{id}/permissions` |

Full API endpoint tables, request/response schemas, and TypeScript SDK patterns are in
[`references/graph-api.md`](./references/graph-api.md).

---

## Admin & Governance

Loop tenant settings are managed in:
- **Microsoft 365 admin center** (`admin.microsoft.com`) → Settings → Org settings → Loop
- **Teams admin center** → Apps → Microsoft Loop (app permission policies)
- **Microsoft Purview** — sensitivity labels, DLP policies, eDiscovery for Loop content

### Key Admin Controls

| Setting | Location | What it controls |
|---|---|---|
| Loop enabled/disabled | M365 admin center | Whether users can create workspaces |
| Guest access | M365 admin center | External user collaboration in workspaces |
| Loop components in Teams | Teams admin center | Embedding components in Teams messages |
| Loop components in Outlook | M365 admin center | Embedding in Outlook compose |
| Sensitivity labels | Purview | Apply labels to workspace content |
| Retention policies | Purview | How long Loop content is retained |
| eDiscovery | Purview | Search and hold Loop content |

Full admin PowerShell commands, policy configurations, and compliance patterns are in
[`references/admin-governance.md`](./references/admin-governance.md).

---

## Power Automate Integration

Loop triggers in Power Automate use the **Microsoft Loop** connector (preview):

| Trigger / Action | Description |
|---|---|
| When a page is created | Trigger when a new Loop page is added to a workspace |
| When a page is modified | Trigger on any change to a Loop page |
| Get workspace | Retrieve workspace metadata |
| List pages | Enumerate pages in a workspace |
| Create page | Programmatically create a new page |

Common automation patterns:
- Create a Loop workspace when a new Azure DevOps project is created
- Post Loop component link to Teams channel when a planning page is created
- Archive Loop workspace content to SharePoint when a project closes
- Sync task list updates to Planner or Azure DevOps work items

---

## Decision Tree

**Choosing what to do:**

```
User wants to collaborate on a project?
  → Create a Loop workspace (Graph API POST /containers)

User wants to structure a document?
  → Design a Loop page with sections + components

User wants to share live content in Teams/Outlook?
  → Create a Loop component → copy link → paste in message

User needs to manage Loop at scale?
  → Use admin controls (M365 admin center + Purview)

User wants to automate Loop workflows?
  → Use Power Automate Loop connector or Graph API
```

**Commands available:**

| Command | When to use |
|---|---|
| `/loop-workspace-setup` | Configure a new Loop workspace for a project |
| `/loop-page-structure` | Design the page layout and component placement |

---

## Progressive Disclosure — Reference Files

| Topic | File |
|---|---|
| Workspace lifecycle, page management, drive API patterns | [`references/workspaces-pages.md`](./references/workspaces-pages.md) |
| Loop component types, creation, embedding, Adaptive Cards integration | [`references/loop-components.md`](./references/loop-components.md) |
| Full Graph API endpoint tables, permissions, TypeScript SDK snippets | [`references/graph-api.md`](./references/graph-api.md) |
| Admin governance, tenant settings, Purview compliance, retention | [`references/admin-governance.md`](./references/admin-governance.md) |
