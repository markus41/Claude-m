---
name: Notion Mastery
description: >
  This skill should be used when the user asks about Notion — creating pages, designing layouts,
  building databases, writing formulas, using AI features, or automating with the Notion API.
  Covers page design and styling (columns, callouts, toggle headings, wrapped images, non-obtrusive TOC),
  every block type (tables, synced blocks, code, equations, embeds, mermaid diagrams),
  database architecture (views, relations, rollups, filters, templates, linked databases),
  Notion formula language, AI blocks and meeting notes, MCP tool usage, and REST API automation.
  Example user requests: "create a beautiful project dashboard in Notion", "style this Notion page
  with columns and callouts", "build a Notion database for tracking tasks", "write a Notion formula
  for days until deadline", "search my Notion workspace", "make this page look professional".
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
  - mcp__claude_ai_Notion__notion-search
  - mcp__claude_ai_Notion__notion-fetch
  - mcp__claude_ai_Notion__notion-create-pages
  - mcp__claude_ai_Notion__notion-update-page
  - mcp__claude_ai_Notion__notion-move-pages
  - mcp__claude_ai_Notion__notion-duplicate-page
  - mcp__claude_ai_Notion__notion-create-database
  - mcp__claude_ai_Notion__notion-update-data-source
  - mcp__claude_ai_Notion__notion-create-comment
  - mcp__claude_ai_Notion__notion-get-comments
  - mcp__claude_ai_Notion__notion-get-teams
  - mcp__claude_ai_Notion__notion-get-users
triggers:
  - notion
  - notion page
  - notion database
  - notion formula
  - notion template
  - notion style
  - notion design
  - notion layout
  - notion columns
  - notion callout
  - notion block
  - notion table
  - notion toggle
  - notion heading
  - notion synced block
  - notion ai
  - notion api
  - notion mcp
  - notion workspace
  - notion search
  - create notion page
  - style notion page
  - notion page design
  - notion page layout
  - beautiful notion page
  - professional notion page
  - notion dashboard
  - notion wiki
  - notion project tracker
  - notion meeting notes
  - notion table of contents
  - notion image
  - notion embed
  - notion code block
  - notion equation
  - notion mermaid
  - notion divider
  - notion color
  - notion relation
  - notion rollup
  - notion view
  - notion filter
  - notion sort
  - notion linked database
  - notion automation
  - notion button
  - notion formula function
  - notion property
  - notion template button
  - notion comment
  - notion permission
  - notion teamspace
  - notion verification
  - notion duplicate page
  - notion move page
  - notion export
  - notion troubleshooting
  - notion error
  - notion fix
  - notion debug
  - notion knowledge base
  - notion crm
  - notion progress bar
  - notion icon
  - notion cover
  - notion calendar view
  - notion gallery view
  - notion board view
  - notion timeline view
  - notion list view
---

# Notion Mastery

Create, design, and automate in Notion using MCP tools and the REST API. Build professional-looking pages with proper visual design patterns.

## Page Design Principles

For complete design patterns and page templates, read `${CLAUDE_PLUGIN_ROOT}/skills/notion-mastery/references/page-design-patterns.md`.

### Making Pages Look Professional

Notion pages look best when they follow these principles:

- **Lead with a callout** — Use a callout block at the top with an emoji icon and brief description. Sets the tone and provides immediate context.
- **Use toggle headings** — `## Heading {toggle="true"}` keeps pages scannable. Users expand sections they care about.
- **Columns for side-by-side content** — Two or three columns using `<columns>` for dashboards, comparison views, or separating related content.
- **Non-obtrusive TOC** — Place `<table_of_contents/>` inside a toggle or callout, not at the very top. Or place it in a column beside content.
- **Callouts for emphasis** — Color-coded callouts for tips, warnings, notes, prerequisites. Use sparingly.
- **Dividers between sections** — `---` creates visual breathing room between major sections.
- **Alternating block types** — Mix headings, text, callouts, tables, and images. Avoid walls of text.
- **Consistent color scheme** — Pick 2-3 colors and use them throughout. Blue for info, yellow for warnings, green for success.

### Layout Patterns

**Hero pattern** — Callout with icon + brief intro, then divider, then content:
```
::: callout {icon="🚀" color="blue_bg"}
**Project Dashboard** — Track progress, milestones, and blockers at a glance.
:::
---
```

**Two-column dashboard** — Key metrics on left, action items on right:
```
<columns>
  <column>
    ## 📊 Metrics {toggle="true"}
      Content...
  </column>
  <column>
    ## ✅ Actions {toggle="true"}
      Content...
  </column>
</columns>
```

**Toggle sections** — Clean, expandable page:
```
## 📋 Overview {toggle="true"}
  Content here...
## 🎯 Goals {toggle="true"}
  Content here...
## 📝 Notes {toggle="true"}
  Content here...
```

## Notion-Flavored Markdown

For the complete block catalog and syntax, read `${CLAUDE_PLUGIN_ROOT}/skills/notion-mastery/references/notion-markdown-spec.md` and `${CLAUDE_PLUGIN_ROOT}/skills/notion-mastery/references/block-catalog.md`.

Notion uses a custom Markdown dialect for page content. Key syntax:

### Block Colors

Any block accepts `{color="Color"}` at the end of its first line:
- Text colors: `gray`, `brown`, `orange`, `yellow`, `green`, `blue`, `purple`, `pink`, `red`
- Background colors: `gray_bg`, `brown_bg`, `orange_bg`, `yellow_bg`, `green_bg`, `blue_bg`, `purple_bg`, `pink_bg`, `red_bg`

### Key Block Types

- **Callout**: `::: callout {icon="💡" color="yellow_bg"}\nContent\n:::`
- **Columns**: `<columns><column>Left</column><column>Right</column></columns>`
- **Toggle**: `<details><summary>Label</summary>\n\tContent\n</details>`
- **Toggle heading**: `## Heading {toggle="true"}`
- **Table**: `<table header-row="true"><tr><td>A</td><td>B</td></tr></table>`
- **Table of contents**: `<table_of_contents/>`
- **Synced block**: `<synced_block>\n\tContent\n</synced_block>`
- **Code block**: ` ```language\nCode\n``` `
- **Equation**: `$$\nLaTeX\n$$`
- **Image**: `![Caption](URL)`
- **Divider**: `---`
- **Meeting notes**: `<meeting-notes>\n\tTitle\n\t<notes>\n\t\tContent\n\t</notes>\n</meeting-notes>`

### Rich Text Formatting

- Bold: `**text**`, Italic: `*text*`, Strikethrough: `~~text~~`
- Underline: `<span underline="true">text</span>`
- Color: `<span color="blue">text</span>` or `<span color="red_bg">text</span>`
- Inline code: `` `code` ``, Inline math: `$equation$`
- Link: `[text](url)`, Mention: `<mention-page url="...">Title</mention-page>`

## Databases

For complete database reference, read `${CLAUDE_PLUGIN_ROOT}/skills/notion-mastery/references/database-mastery.md`.

### Core Concepts

- **Properties** — Columns defining data schema: Title, Text, Number, Select, Multi-select, Date, Person, Files, Checkbox, URL, Email, Phone, Formula, Relation, Rollup, Created time, Last edited time, Created by, Last edited by, Status, AI autofill
- **Views** — Different ways to visualize the same data: Table, Board, Calendar, Timeline, Gallery, List
- **Filters** — Narrow visible rows by property conditions
- **Sorts** — Order rows by property values
- **Templates** — Pre-built page content for new database entries
- **Relations** — Link entries across databases (one-to-many, many-to-many)
- **Rollups** — Aggregate related data (count, sum, average, date range, etc.)
- **Linked databases** — Show a filtered view of another database on any page

### Database via MCP

Use `notion-create-database` to create databases. Use `notion-fetch` to read schema. Use `notion-update-data-source` to modify schema.

## Notion Formulas

For the complete formula reference, read `${CLAUDE_PLUGIN_ROOT}/skills/notion-mastery/references/formula-language.md`.

Notion formulas use a functional syntax (not VB.NET, not Excel):

```
// Days until deadline
dateBetween(prop("Due Date"), now(), "days")

// Status emoji
if(prop("Status") == "Done", "✅",
  if(prop("Status") == "In Progress", "🔄", "⏳"))

// Progress percentage
round(prop("Completed Tasks") / prop("Total Tasks") * 100)
```

### Key Formula Functions

- **Logic**: `if()`, `and()`, `or()`, `not()`, `empty()`
- **Math**: `add()`, `subtract()`, `multiply()`, `divide()`, `mod()`, `pow()`, `round()`, `ceil()`, `floor()`, `abs()`, `min()`, `max()`
- **Text**: `concat()`, `join()`, `slice()`, `length()`, `contains()`, `replace()`, `replaceAll()`, `test()`, `upper()`, `lower()`, `repeat()`, `padStart()`, `padEnd()`, `trim()`
- **Date**: `now()`, `today()`, `dateAdd()`, `dateSubtract()`, `dateBetween()`, `formatDate()`, `minute()`, `hour()`, `day()`, `date()`, `month()`, `year()`
- **Lists**: `at()`, `first()`, `last()`, `slice()`, `concat()`, `sort()`, `reverse()`, `map()`, `filter()`, `every()`, `some()`, `find()`, `findIndex()`, `flat()`, `length()`, `includes()`

## AI Features

For complete AI feature reference, read `${CLAUDE_PLUGIN_ROOT}/skills/notion-mastery/references/ai-features.md`.

- **AI Autofill property** — Database property that uses AI to fill values based on page content
- **AI blocks** — Inline AI-generated content within pages
- **Meeting notes** — `<meeting-notes>` blocks with AI summaries and transcripts
- **AI search** — Semantic search across workspace and connected sources via MCP search tool

## MCP Tools

For detailed MCP usage patterns, read `${CLAUDE_PLUGIN_ROOT}/skills/notion-mastery/references/mcp-tools-guide.md`.

Available Notion MCP tools:
- `notion-search` — Search pages, databases, users across workspace
- `notion-fetch` — Read full page content, database schema, data source details
- `notion-create-pages` — Create one or more pages with content and properties
- `notion-update-page` — Update properties, replace/insert content, apply templates, verify pages
- `notion-move-pages` — Move pages or databases to new parents
- `notion-duplicate-page` — Duplicate existing pages
- `notion-create-database` — Create new databases with schema
- `notion-update-data-source` — Modify database schema and properties
- `notion-create-comment` — Add comments to pages or specific blocks
- `notion-get-comments` — Read comments and discussions
- `notion-get-teams` — List teamspaces
- `notion-get-users` — List workspace members

### MCP Workflow Pattern

1. **Search** to find existing content: `notion-search`
2. **Fetch** to read full details: `notion-fetch`
3. **Create or update** to make changes: `notion-create-pages` or `notion-update-page`
4. **Verify** the result by fetching again

## REST API

For API endpoints and patterns, read `${CLAUDE_PLUGIN_ROOT}/skills/notion-mastery/references/api-reference.md`.

The Notion API (api.notion.com) is useful when MCP tools don't cover a scenario:
- **Bulk operations** — Creating hundreds of pages in batches
- **Webhooks** — Listening for changes
- **Programmatic database queries** — Complex filtering with the API's filter object
- **Block-level manipulation** — Appending, moving, and deleting individual blocks
- **User management** — Bot user info, workspace member details

Authentication: Bearer token (integration token or OAuth). Base URL: `https://api.notion.com/v1/`.

## Troubleshooting

For common errors and diagnostic steps, read `${CLAUDE_PLUGIN_ROOT}/skills/notion-mastery/references/troubleshooting.md`.

Covers MCP tool errors (page not found, rate limits, invalid content), page design issues (toggle content not nesting, callouts not rendering), database problems (formula errors, relation issues), API-specific issues, and performance diagnostics.

## Reference Files

| File | Path | Content |
|------|------|---------|
| Notion Markdown Spec | `${CLAUDE_PLUGIN_ROOT}/skills/notion-mastery/references/notion-markdown-spec.md` | Complete Notion-flavored Markdown syntax reference |
| Page Design Patterns | `${CLAUDE_PLUGIN_ROOT}/skills/notion-mastery/references/page-design-patterns.md` | Visual design principles, layouts, color schemes, professional page patterns |
| Block Catalog | `${CLAUDE_PLUGIN_ROOT}/skills/notion-mastery/references/block-catalog.md` | Every block type with syntax, use cases, and styling tips |
| Database Mastery | `${CLAUDE_PLUGIN_ROOT}/skills/notion-mastery/references/database-mastery.md` | Views, relations, rollups, linked DBs, templates, automations |
| Formula Language | `${CLAUDE_PLUGIN_ROOT}/skills/notion-mastery/references/formula-language.md` | Complete Notion formula syntax, functions, and patterns |
| MCP Tools Guide | `${CLAUDE_PLUGIN_ROOT}/skills/notion-mastery/references/mcp-tools-guide.md` | How to use each Notion MCP tool effectively |
| API Reference | `${CLAUDE_PLUGIN_ROOT}/skills/notion-mastery/references/api-reference.md` | REST API endpoints, authentication, SDK patterns |
| AI Features | `${CLAUDE_PLUGIN_ROOT}/skills/notion-mastery/references/ai-features.md` | AI blocks, meeting notes, autofill, AI search, connected sources |
| Troubleshooting | `${CLAUDE_PLUGIN_ROOT}/skills/notion-mastery/references/troubleshooting.md` | Common errors, diagnostic steps, and performance issues |

## Example Files

| File | Path | Content |
|------|------|---------|
| Page Templates | `${CLAUDE_PLUGIN_ROOT}/skills/notion-mastery/examples/page-templates.md` | Complete page templates: dashboard, wiki, meeting notes, project tracker |
| Database Schemas | `${CLAUDE_PLUGIN_ROOT}/skills/notion-mastery/examples/database-schemas.md` | Production database designs for common use cases |
| Design Showcase | `${CLAUDE_PLUGIN_ROOT}/skills/notion-mastery/examples/design-showcase.md` | Beautiful page layouts with full Notion Markdown source |
| API Automation | `${CLAUDE_PLUGIN_ROOT}/skills/notion-mastery/examples/api-automation.md` | TypeScript examples for common automation patterns |
