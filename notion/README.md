# Notion Plugin for Claude Code

Comprehensive Notion mastery — page design and styling, every block type, databases and formulas, AI features, MCP integration, REST API automation, and professional page templates.

## Capabilities

| Area | What It Covers |
|------|---------------|
| **Page Design** | Professional layouts with callouts, columns, toggle headings, color schemes, and non-obtrusive TOC |
| **Block Types** | Every Notion block — tables, synced blocks, code, equations, mermaid diagrams, meeting notes, embeds |
| **Databases** | Schema design, views, relations, rollups, linked databases, templates, automations |
| **Formulas** | Complete Notion formula language — logic, math, text, date, list functions with patterns |
| **AI Features** | AI autofill properties, AI blocks, meeting notes with AI summaries, connected sources |
| **MCP Tools** | All 12 Notion MCP tools — search, fetch, create, update, move, duplicate, comments, teams |
| **REST API** | Full endpoint reference, authentication, JavaScript/Python SDK patterns |

## Commands

| Command | Description |
|---------|-------------|
| `/notion-page` | Create a professionally designed Notion page |
| `/notion-db` | Create or modify a database with schema and relations |
| `/notion-style` | Restyle an existing page with professional design patterns |
| `/notion-search` | Search the workspace for pages, databases, and users |
| `/notion-template` | Generate a page from a template (dashboard, wiki, meeting, PRD) |
| `/notion-formula` | Generate or debug a Notion formula from natural language |

## Agents

| Agent | Triggers On |
|-------|-------------|
| **Notion Page Designer** | Creating new pages, restyling existing pages, layout questions |
| **Notion Database Architect** | Database creation, schema design, relations, formulas |

## Skill Triggers

The Notion Mastery skill activates automatically on keywords like: `notion`, `notion page`, `notion database`, `notion formula`, `notion template`, `notion style`, `notion design`, `notion layout`, `notion columns`, `notion callout`, `notion block`, `create notion page`, `beautiful notion page`, `professional notion page`, `notion dashboard`, `notion wiki`, and many more.

## Plugin Structure

```
notion/
├── .claude-plugin/
│   └── plugin.json
├── skills/
│   └── notion-mastery/
│       ├── SKILL.md
│       ├── references/
│       │   ├── notion-markdown-spec.md
│       │   ├── page-design-patterns.md
│       │   ├── block-catalog.md
│       │   ├── database-mastery.md
│       │   ├── formula-language.md
│       │   ├── mcp-tools-guide.md
│       │   ├── api-reference.md
│       │   ├── ai-features.md
│       │   └── troubleshooting.md
│       └── examples/
│           ├── page-templates.md
│           ├── database-schemas.md
│           ├── design-showcase.md
│           └── api-automation.md
├── commands/
│   ├── notion-page.md
│   ├── notion-db.md
│   ├── notion-style.md
│   ├── notion-search.md
│   ├── notion-template.md
│   └── notion-formula.md
├── agents/
│   ├── notion-page-designer.md
│   └── notion-database-architect.md
└── README.md
```

## Prerequisites

- Notion MCP integration connected in Claude Code (provides the 12 Notion tools)
- For REST API automation: Notion integration token from https://www.notion.so/my-integrations
