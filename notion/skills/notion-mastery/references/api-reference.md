# Notion REST API Reference

Complete reference for the Notion API — endpoints, authentication, SDK patterns, and when to use the API vs MCP tools.

## When to Use the API vs MCP Tools

### Use MCP Tools When

- Creating or updating pages with content (Notion-flavored Markdown)
- Searching for pages and databases
- Standard CRUD operations on pages and databases
- Working interactively in Claude Code

### Use the API When

- **Bulk operations** — Creating/updating hundreds of pages programmatically
- **Block-level manipulation** — Appending, moving, and deleting individual blocks
- **Database querying** — Complex filters and sorts via the query endpoint
- **Webhooks** — Listening for workspace changes
- **Automation scripts** — Scheduled or event-driven workflows
- **Custom integrations** — Building applications that interact with Notion

## Authentication

### Integration Token

Create an internal integration at https://www.notion.so/my-integrations.

```
Authorization: Bearer <your-integration-token>
Notion-Version: 2022-06-28
```

### OAuth 2.0

For public integrations that access multiple workspaces:

1. Register OAuth app at https://www.notion.so/my-integrations
2. Redirect user to authorization URL
3. Exchange code for access token
4. Use token for API calls

### Required Headers

Every API request must include:

```
Authorization: Bearer {token}
Notion-Version: 2022-06-28
Content-Type: application/json
```

## Base URL

```
https://api.notion.com/v1/
```

## Pages

### Create a Page

```
POST /v1/pages
```

```json
{
  "parent": {
    "type": "page_id",
    "page_id": "parent-page-id"
  },
  "properties": {
    "title": [
      {
        "text": { "content": "Page Title" }
      }
    ]
  },
  "children": [
    {
      "object": "block",
      "type": "heading_2",
      "heading_2": {
        "rich_text": [{ "text": { "content": "Section Heading" } }]
      }
    },
    {
      "object": "block",
      "type": "paragraph",
      "paragraph": {
        "rich_text": [{ "text": { "content": "Paragraph content." } }]
      }
    }
  ]
}
```

### Create a Database Entry

```
POST /v1/pages
```

```json
{
  "parent": {
    "type": "database_id",
    "database_id": "database-id"
  },
  "properties": {
    "Name": {
      "title": [{ "text": { "content": "Task Name" } }]
    },
    "Status": {
      "status": { "name": "In Progress" }
    },
    "Priority": {
      "select": { "name": "High" }
    },
    "Due Date": {
      "date": { "start": "2024-03-31" }
    },
    "Assignee": {
      "people": [{ "id": "user-id" }]
    },
    "Tags": {
      "multi_select": [
        { "name": "Frontend" },
        { "name": "Bug" }
      ]
    }
  }
}
```

### Retrieve a Page

```
GET /v1/pages/{page_id}
```

Returns page properties and metadata (not content blocks).

### Update Page Properties

```
PATCH /v1/pages/{page_id}
```

```json
{
  "properties": {
    "Status": {
      "status": { "name": "Done" }
    }
  }
}
```

### Archive (Delete) a Page

```
PATCH /v1/pages/{page_id}
```

```json
{
  "archived": true
}
```

## Blocks

### Retrieve Block Children

```
GET /v1/blocks/{block_id}/children?start_cursor={cursor}&page_size=100
```

Returns paginated list of child blocks. Use `start_cursor` from response for pagination.

### Append Block Children

```
PATCH /v1/blocks/{block_id}/children
```

```json
{
  "children": [
    {
      "object": "block",
      "type": "callout",
      "callout": {
        "rich_text": [{ "text": { "content": "Important note" } }],
        "icon": { "type": "emoji", "emoji": "💡" },
        "color": "yellow_background"
      }
    },
    {
      "object": "block",
      "type": "divider",
      "divider": {}
    }
  ]
}
```

### Update a Block

```
PATCH /v1/blocks/{block_id}
```

```json
{
  "paragraph": {
    "rich_text": [
      {
        "text": { "content": "Updated text" },
        "annotations": { "bold": true }
      }
    ]
  }
}
```

### Delete a Block

```
DELETE /v1/blocks/{block_id}
```

## Databases

### Create a Database

```
POST /v1/databases
```

```json
{
  "parent": {
    "type": "page_id",
    "page_id": "parent-page-id"
  },
  "title": [{ "text": { "content": "Task Tracker" } }],
  "properties": {
    "Name": { "title": {} },
    "Status": {
      "status": {
        "options": [
          { "name": "Not Started", "color": "default" },
          { "name": "In Progress", "color": "blue" },
          { "name": "Done", "color": "green" }
        ]
      }
    },
    "Priority": {
      "select": {
        "options": [
          { "name": "High", "color": "red" },
          { "name": "Medium", "color": "yellow" },
          { "name": "Low", "color": "green" }
        ]
      }
    },
    "Due Date": { "date": {} },
    "Assignee": { "people": {} }
  }
}
```

### Query a Database

```
POST /v1/databases/{database_id}/query
```

```json
{
  "filter": {
    "and": [
      {
        "property": "Status",
        "status": { "does_not_equal": "Done" }
      },
      {
        "property": "Assignee",
        "people": { "contains": "user-id" }
      }
    ]
  },
  "sorts": [
    { "property": "Priority", "direction": "ascending" },
    { "property": "Due Date", "direction": "ascending" }
  ],
  "page_size": 50
}
```

### Retrieve a Database

```
GET /v1/databases/{database_id}
```

Returns database schema (properties) and metadata.

### Update a Database

```
PATCH /v1/databases/{database_id}
```

```json
{
  "properties": {
    "New Property": {
      "rich_text": {}
    },
    "Renamed Property": {
      "name": "Better Name"
    }
  }
}
```

## Search

```
POST /v1/search
```

```json
{
  "query": "search term",
  "filter": {
    "value": "page",
    "property": "object"
  },
  "sort": {
    "direction": "descending",
    "timestamp": "last_edited_time"
  },
  "page_size": 10
}
```

**Filter values**: `page`, `database`

## Users

### List All Users

```
GET /v1/users?start_cursor={cursor}&page_size=100
```

### Retrieve a User

```
GET /v1/users/{user_id}
```

### Get Bot User

```
GET /v1/users/me
```

## Comments

### Create a Comment

```
POST /v1/comments
```

```json
{
  "parent": { "page_id": "page-id" },
  "rich_text": [
    { "text": { "content": "This is a comment." } }
  ]
}
```

### List Comments

```
GET /v1/comments?block_id={page_or_block_id}&start_cursor={cursor}
```

## Rich Text Object

Rich text appears throughout the API:

```json
{
  "type": "text",
  "text": {
    "content": "Hello World",
    "link": { "url": "https://example.com" }
  },
  "annotations": {
    "bold": false,
    "italic": false,
    "strikethrough": false,
    "underline": false,
    "code": false,
    "color": "default"
  },
  "plain_text": "Hello World",
  "href": "https://example.com"
}
```

### Annotation Colors

Text colors: `default`, `gray`, `brown`, `orange`, `yellow`, `green`, `blue`, `purple`, `pink`, `red`

Background colors: `gray_background`, `brown_background`, `orange_background`, `yellow_background`, `green_background`, `blue_background`, `purple_background`, `pink_background`, `red_background`

**Note**: API uses `_background` suffix while Notion-flavored Markdown uses `_bg` suffix.

## Block Types Reference

| Block Type | API type string | Key Properties |
|------------|----------------|----------------|
| Paragraph | `paragraph` | `rich_text`, `color` |
| Heading 1 | `heading_1` | `rich_text`, `color`, `is_toggleable` |
| Heading 2 | `heading_2` | `rich_text`, `color`, `is_toggleable` |
| Heading 3 | `heading_3` | `rich_text`, `color`, `is_toggleable` |
| Bulleted List | `bulleted_list_item` | `rich_text`, `color` |
| Numbered List | `numbered_list_item` | `rich_text`, `color` |
| To Do | `to_do` | `rich_text`, `checked`, `color` |
| Toggle | `toggle` | `rich_text`, `color` |
| Quote | `quote` | `rich_text`, `color` |
| Callout | `callout` | `rich_text`, `icon`, `color` |
| Divider | `divider` | (none) |
| Table of Contents | `table_of_contents` | `color` |
| Code | `code` | `rich_text`, `language` |
| Equation | `equation` | `expression` |
| Image | `image` | `type`, `external.url` or `file.url` |
| Video | `video` | `type`, `external.url` |
| File | `file` | `type`, `external.url` |
| PDF | `pdf` | `type`, `external.url` |
| Bookmark | `bookmark` | `url` |
| Embed | `embed` | `url` |
| Column List | `column_list` | (children are columns) |
| Column | `column` | (children are blocks) |
| Synced Block | `synced_block` | `synced_from` |
| Table | `table` | `table_width`, `has_column_header`, `has_row_header` |
| Table Row | `table_row` | `cells` (array of rich text arrays) |

## Pagination

All list endpoints use cursor-based pagination:

```json
{
  "results": [...],
  "has_more": true,
  "next_cursor": "abc123...",
  "type": "page_or_database"
}
```

Pass `start_cursor` in subsequent requests to get the next page.

## Rate Limits

- **3 requests per second** per integration
- Rate limit headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- On 429 response, respect `Retry-After` header

### Rate Limit Strategy

```typescript
async function notionRequest(url: string, options: RequestInit, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    const response = await fetch(url, options);
    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get('Retry-After') || '1');
      await new Promise(r => setTimeout(r, retryAfter * 1000));
      continue;
    }
    return response;
  }
  throw new Error('Rate limit exceeded after retries');
}
```

## SDK Options

### Official JavaScript SDK

```bash
npm install @notionhq/client
```

```typescript
import { Client } from '@notionhq/client';

const notion = new Client({ auth: process.env.NOTION_TOKEN });

// Search
const results = await notion.search({ query: 'Meeting Notes' });

// Create page
const page = await notion.pages.create({
  parent: { page_id: 'parent-id' },
  properties: {
    title: [{ text: { content: 'New Page' } }]
  }
});

// Query database
const entries = await notion.databases.query({
  database_id: 'db-id',
  filter: {
    property: 'Status',
    status: { equals: 'In Progress' }
  }
});
```

### Python SDK

```bash
pip install notion-client
```

```python
from notion_client import Client

notion = Client(auth=os.environ["NOTION_TOKEN"])

# Search
results = notion.search(query="Meeting Notes")

# Create page
page = notion.pages.create(
    parent={"page_id": "parent-id"},
    properties={"title": [{"text": {"content": "New Page"}}]}
)

# Query database
entries = notion.databases.query(
    database_id="db-id",
    filter={"property": "Status", "status": {"equals": "In Progress"}}
)
```

## Error Codes

| Code | Meaning | Action |
|------|---------|--------|
| 400 | Bad request | Check request body format |
| 401 | Unauthorized | Verify API token |
| 403 | Forbidden | Check integration permissions and page sharing |
| 404 | Not found | Verify page/database ID |
| 409 | Conflict | Concurrent edit — retry |
| 429 | Rate limited | Wait and retry with backoff |
| 500 | Server error | Retry after delay |
| 502 | Bad gateway | Retry after delay |
| 503 | Service unavailable | Retry after delay |

## Integration Permissions

Integrations must be explicitly shared with pages/databases they need to access:

1. Create integration at https://www.notion.so/my-integrations
2. Go to the page/database in Notion
3. Click "..." → "Connections" → Add the integration
4. The integration can now access that page and its children

**Capabilities** (set during integration creation):
- Read content
- Update content
- Insert content
- Read comments
- Create comments
- Read user information (with or without email)
