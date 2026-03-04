# MCP Tools Guide — Using Notion MCP Tools Effectively

Complete guide to using each Notion MCP tool with best practices, parameters, and workflow patterns.

## Available Tools

| Tool | Purpose |
|------|---------|
| `notion-search` | Search pages, databases, users across workspace |
| `notion-fetch` | Read full page content, database schema, data source details |
| `notion-create-pages` | Create one or more pages with Notion-flavored Markdown |
| `notion-update-page` | Update properties, replace/insert content, apply templates, verify pages |
| `notion-move-pages` | Move pages or databases to new parents |
| `notion-duplicate-page` | Duplicate existing pages |
| `notion-create-database` | Create new databases with schema |
| `notion-update-data-source` | Modify database schema and properties |
| `notion-create-comment` | Add comments to pages or specific blocks |
| `notion-get-comments` | Read comments and discussions |
| `notion-get-teams` | List teamspaces |
| `notion-get-users` | List workspace members |

## Tool Reference

### notion-search

Search for pages, databases, or users in the workspace.

**Parameters**:
- `query` — Search text
- `type` — Filter by type: `page`, `database`, `user`
- `limit` — Maximum results to return

**When to use**:
- Finding existing pages or databases before creating new ones
- Looking up user IDs for Person properties
- Discovering workspace structure

**Best practices**:
- Search before creating to avoid duplicates
- Use specific search terms for better results
- Combine with `notion-fetch` to get full content after finding a page

**Example workflow**:
1. Search for "Project Dashboard"
2. If found, fetch the page to see current content
3. If not found, create it

### notion-fetch

Read the full content of a page, database schema, or data source.

**Parameters**:
- `url` — Notion URL of the page, database, or data source

**Returns**:
- **For pages**: Full page content in Notion-flavored Markdown, properties, metadata
- **For databases**: Schema (property definitions), title, description
- **For data sources**: Detailed schema with views, filters, sorts

**When to use**:
- Reading page content before updating
- Understanding database schema before creating entries
- Checking current state of a page

**Best practices**:
- Always fetch before updating to understand current content
- Use for verification after create/update operations
- Parse returned Markdown to understand page structure

### notion-create-pages

Create one or more new pages with content and properties.

**Parameters**:
- `pages` — Array of page definitions, each with:
  - `parentUrl` — URL of the parent page or database
  - `title` — Page title
  - `content` — Notion-flavored Markdown content
  - `properties` — Database properties (if parent is a database)
  - `icon` — Page icon (emoji or URL)
  - `cover` — Cover image URL

**When to use**:
- Creating new pages with formatted content
- Adding entries to databases
- Building page structures (wiki, documentation)

**Best practices**:
- Use proper Notion-flavored Markdown syntax for content
- Set page icon and cover for professional appearance
- When creating database entries, include property values matching the schema
- Create multiple pages in a single call for efficiency

**Content format**:
Content uses Notion-flavored Markdown. Key syntax:
- Callouts: `::: callout {icon="💡" color="yellow_bg"}\nContent\n:::`
- Columns: `<columns><column>Left</column><column>Right</column></columns>`
- Toggle headings: `## Heading {toggle="true"}`
- Tables: `<table header-row="true"><tr><td>Cell</td></tr></table>`

### notion-update-page

Update an existing page's content, properties, or apply templates.

**Parameters**:
- `url` — Page URL to update
- `content` — New Notion-flavored Markdown content (replaces existing)
- `properties` — Property values to update
- `insertContent` — Content to append (instead of replace)
- `title` — New page title
- `icon` — New page icon
- `cover` — New cover image
- `verified` — Set verification status (true/false)

**When to use**:
- Modifying existing page content
- Updating database entry properties
- Appending content to a page
- Verifying pages

**Best practices**:
- Fetch the page first to understand current content
- Use `insertContent` to append without losing existing content
- Use `content` to completely replace page content
- Update properties separately from content when possible

### notion-move-pages

Move pages or databases to a new parent.

**Parameters**:
- `pageUrls` — Array of page URLs to move
- `targetParentUrl` — URL of the new parent page

**When to use**:
- Reorganizing workspace structure
- Moving pages to the correct location after creation
- Consolidating related pages

**Best practices**:
- Verify the target parent exists before moving
- Move pages in a single call for atomicity
- Be aware that moving a page changes its URL

### notion-duplicate-page

Create a copy of an existing page.

**Parameters**:
- `url` — URL of the page to duplicate
- `targetParentUrl` — Where to place the copy (optional, defaults to same parent)
- `title` — Title for the duplicate (optional)

**When to use**:
- Creating variations of existing pages
- Cloning templates
- Backing up a page before major changes

### notion-create-database

Create a new database with a defined schema.

**Parameters**:
- `parentUrl` — URL of the parent page
- `title` — Database title
- `description` — Database description
- `icon` — Database icon
- `properties` — Schema definition with property types and configurations
- `inline` — Whether to display inline (true) or as sub-page (false)

**Property type definitions**:
```json
{
  "Name": { "type": "title" },
  "Status": {
    "type": "status",
    "status": {
      "options": [
        { "name": "Not Started", "color": "default" },
        { "name": "In Progress", "color": "blue" },
        { "name": "Done", "color": "green" }
      ],
      "groups": [
        { "name": "To Do", "option_ids": ["not-started-id"] },
        { "name": "In Progress", "option_ids": ["in-progress-id"] },
        { "name": "Complete", "option_ids": ["done-id"] }
      ]
    }
  },
  "Priority": {
    "type": "select",
    "select": {
      "options": [
        { "name": "High", "color": "red" },
        { "name": "Medium", "color": "yellow" },
        { "name": "Low", "color": "green" }
      ]
    }
  },
  "Due Date": { "type": "date" },
  "Assignee": { "type": "people" },
  "Hours": { "type": "number", "number": { "format": "number" } }
}
```

**When to use**:
- Building new databases from scratch
- Setting up project tracking systems
- Creating data models

### notion-update-data-source

Modify database schema — add, rename, or configure properties.

**Parameters**:
- `url` — Database URL
- `properties` — Updated property definitions
- `title` — New database title
- `description` — New description

**When to use**:
- Adding new properties to existing databases
- Renaming properties
- Changing property configurations (select options, number formats)

**Best practices**:
- Fetch the database first to see current schema
- Only include properties you want to change
- Be cautious renaming properties — formulas referencing them will break

### notion-create-comment

Add a comment to a page or a specific block.

**Parameters**:
- `pageUrl` — Page URL to comment on
- `blockUrl` — Specific block URL for inline comment (optional)
- `content` — Comment text in rich text format

**When to use**:
- Adding feedback to pages
- Creating discussion threads
- Annotating specific content blocks

### notion-get-comments

Read comments on a page.

**Parameters**:
- `url` — Page URL

**Returns**: List of comments with author, content, timestamps, and thread structure.

### notion-get-teams

List teamspaces in the workspace.

**Returns**: Array of teamspace objects with IDs, names, and member counts.

**When to use**: Understanding workspace organization, finding correct teamspaces for page placement.

### notion-get-users

List workspace members.

**Returns**: Array of user objects with IDs, names, emails, and roles.

**When to use**: Looking up user IDs for Person properties, understanding team composition.

## Workflow Patterns

### Pattern 1: Search → Fetch → Update

The most common workflow for modifying existing content.

```
1. notion-search: Find the page by title or content
2. notion-fetch: Read current content and properties
3. notion-update-page: Apply changes
4. notion-fetch: Verify the update (optional)
```

### Pattern 2: Create Page with Full Design

Building a new professional page from scratch.

```
1. notion-search: Verify page doesn't already exist
2. notion-create-pages: Create with Notion-flavored Markdown content
   - Include hero callout, toggle sections, columns
   - Set icon and cover image
3. notion-fetch: Verify the page looks correct
```

### Pattern 3: Database Setup

Creating a complete database system.

```
1. notion-create-database: Create with full schema
2. notion-create-pages: Add initial entries with properties
3. notion-fetch: Verify schema and entries
```

### Pattern 4: Workspace Organization

Moving and reorganizing content.

```
1. notion-search: Find all relevant pages
2. notion-create-pages: Create new parent structure
3. notion-move-pages: Reorganize pages under new parents
4. notion-fetch: Verify structure
```

### Pattern 5: Content Migration

Migrating content into Notion.

```
1. notion-create-pages: Create pages with migrated content
   - Use batch creation for multiple pages
   - Apply consistent formatting with Notion Markdown
2. notion-update-page: Fix any formatting issues
3. notion-create-database: Create databases for structured data
```

## Error Handling

### Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| Page not found | Invalid URL or no access | Verify URL and permissions |
| Cannot update page | Read-only access | Check integration permissions |
| Invalid content | Malformed Notion Markdown | Validate syntax, check indentation |
| Rate limited | Too many requests | Add delays between calls |
| Property not found | Wrong property name | Fetch database to check schema |

### Retry Strategy

1. If a tool call fails, check the error message
2. For rate limits, wait and retry
3. For content errors, simplify the Markdown and retry
4. For permission errors, verify the integration has access
5. Always fetch after create/update to verify success

## Tips for Best Results

1. **Always search first** — Avoid creating duplicates
2. **Fetch before update** — Understand current state
3. **Use proper Markdown** — Follow Notion-flavored syntax exactly
4. **Batch operations** — Create multiple pages in one call when possible
5. **Verify after changes** — Fetch the page to confirm the update
6. **Handle errors gracefully** — Provide clear feedback on failures
7. **Use page icons** — Emojis make pages more scannable in navigation
8. **Set cover images** — Professional pages deserve cover images
