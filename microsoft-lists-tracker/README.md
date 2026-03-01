# Microsoft Lists Tracker Plugin

A Claude Code knowledge plugin for creating and managing Microsoft Lists via Graph API -- structured data tracking for issue logs, hiring pipelines, inventory, and project trackers. Fills the gap between Planner (tasks) and SharePoint (documents) for small teams (20 people or fewer).

## What This Plugin Provides

This is a **knowledge plugin** -- it gives Claude deep expertise in Microsoft Lists (SharePoint Lists) APIs so it can generate correct Graph API code for list creation, column definitions, item management, views, and OData filtering. It does not contain runtime code, MCP servers, or executable scripts.

## Setup

Run `/setup` to configure authentication and verify SharePoint Lists access:

```
/setup              # Full guided setup
/setup --minimal    # Node.js dependencies only
```

## Graph API Permissions Required

| Permission | Type | Purpose |
|------------|------|---------|
| `Sites.Read.All` | Delegated | Read lists, items, and columns |
| `Sites.ReadWrite.All` | Delegated | Create and update lists and items |
| `Sites.Manage.All` | Delegated | Manage list schemas, columns, and content types |

## Commands

| Command | Description |
|---------|-------------|
| `/lists-create` | Create a new Microsoft List with custom columns and optional templates |
| `/lists-add-item` | Add an item to a Microsoft List with field mapping |
| `/lists-view-filter` | View and filter list items with OData queries |
| `/lists-coverage-audit` | Compare plugin coverage against Microsoft Lists and SharePoint REST docs |
| `/setup` | Configure Azure auth and verify SharePoint access |

## Agent

| Agent | Description |
|-------|-------------|
| **Lists Tracker Reviewer** | Reviews list configurations, column definitions, views, and field mappings |

## Trigger Keywords

The skill activates automatically when conversations mention: `lists`, `microsoft lists`, `sharepoint lists`, `tracker`, `issue log`, `project tracker`, `inventory list`, `list items`, `list columns`.

## Author

Markus Ahling


## Coverage against Microsoft documentation

| Feature domain | Coverage status | Evidence source |
|---|---|---|
| List lifecycle, columns, and items | Covered | SKILL endpoint tables + command set |
| OData filtering and tracker workflows | Covered | `/lists-view-filter` examples and deterministic checks |
| Advanced view management | Partial | Graph limitation documented; SharePoint REST fallback required |

Run `/lists-coverage-audit <site-id> <list-id>` to identify gaps before creating new list automation patterns.
