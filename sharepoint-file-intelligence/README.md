# sharepoint-file-intelligence

Scan, categorize, deduplicate, and organize SharePoint and OneDrive files at scale using
Microsoft Graph.

## What This Plugin Does

This plugin provides end-to-end file intelligence for SharePoint and OneDrive for Business:

1. **Inventory** — enumerate every file across a site or drive with full metadata
2. **Deduplicate** — find exact and near-duplicate files; estimate space savings
3. **Categorize** — apply metadata columns and content types via pattern rules
4. **Consolidate** — move files to target folders with dry-run preview and rollback support
5. **Analyze** — AI-powered analysis agent produces a ranked governance action plan

## Install

```bash
/plugin install sharepoint-file-intelligence@claude-m-microsoft-marketplace
```

## Quick Start

```bash
# 1. Inventory a SharePoint site
/sharepoint-file-intelligence:scan-inventory https://contoso.sharepoint.com/sites/finance

# 2. Find duplicates
/sharepoint-file-intelligence:find-duplicates

# 3. Analyze and get a governance plan
"analyze my SharePoint inventory and give me a cleanup plan"

# 4. Apply metadata categories
/sharepoint-file-intelligence:apply-categories --rules-file ./sp-categories.yaml --dry-run

# 5. Move files per a mapping
/sharepoint-file-intelligence:consolidate-files --mapping-file ./sp-move-mapping.yaml
```

## Commands

| Command | Description |
|---------|-------------|
| `scan-inventory` | Enumerate all files; produce CSV/JSON report |
| `find-duplicates` | Detect exact and near-duplicate files |
| `apply-categories` | Batch-apply metadata and content types via rules |
| `consolidate-files` | Move files to target folders with rollback |

## Agent

**`file-analyst`** — triggered by phrases like "analyze my SharePoint inventory" or "what files
can I delete?" Reads an inventory report and produces a structured markdown report with:
- Duplicate summary and space savings
- Stale file analysis
- Categorization recommendations with starter YAML
- Proposed folder structure
- Ranked P1/P2/P3 action plan

## Settings

Create `.claude/sharepoint-file-intelligence.local.md` to configure defaults:

```yaml
---
site_url: https://contoso.sharepoint.com/sites/finance
tenant_id: ""
client_id: ""
scan_scope: site          # site | drive | tenant
max_depth: 10
output_dir: ./sp-reports
naming_convention: kebab  # kebab | camel | original
stale_days: 180
---
```

## Authentication

All commands require a Microsoft Graph API access token with appropriate scopes:

| Operation | Required Scopes |
|-----------|----------------|
| Scan (read-only) | `Sites.Read.All`, `Files.Read.All` |
| Apply metadata | `Sites.ReadWrite.All` |
| Move / consolidate | `Sites.ReadWrite.All`, `Files.ReadWrite.All` |

Set via environment variable:
```bash
export MICROSOFT_ACCESS_TOKEN="eyJ0..."
```

Or use the MSAL device-code flow described in
`skills/sharepoint-file-intelligence/references/graph-api-patterns.md`.

## Related Plugins

- `microsoft-sharepoint-mcp` — basic SharePoint file browsing and transfer via MCP
- `sharing-auditor` — audit external sharing links and guest access
- `purview-compliance` — apply DLP policies, retention labels, and sensitivity labels
- `onedrive` — OneDrive personal drive management

## Plugin Structure

```
sharepoint-file-intelligence/
├── .claude-plugin/plugin.json
├── skills/sharepoint-file-intelligence/
│   ├── SKILL.md
│   └── references/
│       ├── graph-api-patterns.md
│       ├── duplicate-detection.md
│       ├── metadata-content-types.md
│       └── folder-governance.md
├── commands/
│   ├── scan-inventory.md
│   ├── find-duplicates.md
│   ├── apply-categories.md
│   └── consolidate-files.md
├── agents/
│   └── file-analyst.md
└── README.md
```
