# OneNote Knowledge Base Plugin

A Claude Code knowledge plugin for managing OneNote notebooks as a lightweight team wiki and knowledge base via Microsoft Graph API. Designed for small teams (up to 20 people) that need structured documentation -- meeting notes, SOPs, onboarding docs -- without the overhead of Confluence or Notion.

## Setup

Run `/setup` to configure authentication and verify OneNote access:

```
/setup              # Full guided setup
/setup --minimal    # Node.js dependencies only
```

## Commands

| Command | Description |
|---------|-------------|
| `/onenote-search` | Search OneNote pages by keyword across notebooks and sections |
| `/onenote-create-page` | Create a new page with HTML or Markdown content in a section |
| `/onenote-meeting-notes` | Generate a structured meeting notes page from a template |
| `/setup` | Configure Azure Entra app, install dependencies, verify Graph access |

## Graph API Permissions Required

| Permission | Type | Purpose |
|------------|------|---------|
| `Notes.Read` | Delegated | Read user's notebooks and pages |
| `Notes.ReadWrite` | Delegated | Create and update pages in user's notebooks |
| `Notes.Read.All` | Application | Read shared/team notebooks |
| `Notes.ReadWrite.All` | Application | Write to shared/team notebooks |

## Agent

| Agent | Description |
|-------|-------------|
| **OneNote Knowledge Base Reviewer** | Reviews notebook structure, page formatting, heading hierarchy, and content quality for searchability |

## Trigger Keywords

The skill activates when conversations mention: `onenote`, `notebook`, `knowledge base`, `meeting notes`, `wiki`, `team notes`, `documentation`, `sections`, `pages`, `onenote search`.

## Author

Markus Ahling
