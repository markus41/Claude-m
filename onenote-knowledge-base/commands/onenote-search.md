---
name: onenote-search
description: "Search OneNote pages by keyword across notebooks"
argument-hint: "<query> [--notebook <notebook-name>] [--section <section-name>] [--top <count>]"
allowed-tools:
  - Read
  - Bash
  - Glob
---

# Search OneNote Pages

Search for pages across the user's OneNote notebooks by keyword. Optionally filter by notebook or section name.

## Instructions

### 1. Build the Search Request

Base endpoint:

```
GET https://graph.microsoft.com/v1.0/me/onenote/pages?$search={query}&$select=title,createdDateTime,lastModifiedDateTime,links,parentSection&$expand=parentSection($select=displayName,parentNotebook)&$top={count}&$orderby=lastModifiedDateTime desc
```

- Replace `{query}` with the user's search term, URL-encoded.
- Replace `{count}` with the `--top` value (default: 10).

### 2. Filter by Notebook or Section

If `--notebook` is specified, first resolve the notebook ID:

```
GET /me/onenote/notebooks?$filter=displayName eq '{notebook-name}'
```

Then scope the page search to that notebook:

```
GET /me/onenote/notebooks/{notebook-id}/pages?$search={query}&$select=title,createdDateTime,lastModifiedDateTime,links&$top={count}
```

If `--section` is specified, first resolve the section ID:

```
GET /me/onenote/sections?$filter=displayName eq '{section-name}'
```

Then scope the search to that section:

```
GET /me/onenote/sections/{section-id}/pages?$search={query}&$select=title,createdDateTime,lastModifiedDateTime,links&$top={count}
```

### 3. Display Results

Present results as a table sorted by last modified date (most recent first):

| # | Title | Notebook | Section | Last Modified | Link |
|---|-------|----------|---------|---------------|------|
| 1 | Deployment Runbook | Engineering | SOPs | 2025-12-15 | [Open](https://...) |
| 2 | Sprint Planning Notes | Engineering | Meetings | 2025-12-10 | [Open](https://...) |

- The **Link** column should use the `links.oneNoteWebUrl.href` value from the response.
- If no results are found, suggest broadening the search or checking the notebook/section filter spelling.

### 4. Pagination

If more results exist beyond `$top`, inform the user:

```
Showing 10 of 47 results. Use --top 25 to see more.
```

### 5. Error Handling

- **401/403**: Authentication failed or missing `Notes.Read` permission. Suggest running `/setup`.
- **404**: Notebook or section name not found. List available notebooks/sections to help the user.
- **429**: Throttled. Report the `Retry-After` header value and suggest waiting.
