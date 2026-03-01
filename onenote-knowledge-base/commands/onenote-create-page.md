---
name: onenote-create-page
description: "Create a new OneNote page with HTML content"
argument-hint: "<section-id> --title <title> --content <html-or-markdown> [--from-file <path>]"
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
---

# Create a OneNote Page

Create a new page in a specified OneNote section with HTML or Markdown content via the Graph API.

## Instructions

### 1. Resolve the Target Section

If the user provides a section name instead of an ID, resolve it first:

```
GET /me/onenote/sections?$filter=displayName eq '{section-name}'&$select=id,displayName,parentNotebook
```

Use the returned `id` as the `{section-id}`.

### 2. Prepare the Page Content

If `--from-file` is provided, read the local file. If the file is Markdown (`.md`), convert it to OneNote-compatible XHTML using these rules:

| Markdown | XHTML Output |
|----------|--------------|
| `# Heading` | `<h1>Heading</h1>` |
| `## Heading` | `<h2>Heading</h2>` |
| `**bold**` | `<b>bold</b>` |
| `*italic*` | `<i>italic</i>` |
| `- item` | `<ul><li>item</li></ul>` |
| `1. item` | `<ol><li>item</li></ol>` |
| `[text](url)` | `<a href="url">text</a>` |
| `![alt](url)` | `<img src="url" alt="alt" />` |
| Code blocks | `<pre><code>...</code></pre>` |
| Tables | `<table><tr><td>...</td></tr></table>` |

### 3. Build the XHTML Payload

Wrap the content in the required OneNote page structure:

```html
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml"
      xmlns:oes="http://schemas.microsoft.com/office/onenote/2013/onenote">
<head>
  <title>{title}</title>
  <meta name="created" content="{ISO-8601-datetime}" />
</head>
<body>
  <h1>{title}</h1>
  {content}
</body>
</html>
```

### 4. Supported XHTML Elements

OneNote pages accept a subset of HTML. Use only these elements:

| Category | Supported Elements |
|----------|--------------------|
| Headings | `<h1>`, `<h2>`, `<h3>`, `<h4>`, `<h5>`, `<h6>` |
| Text | `<p>`, `<br />`, `<b>`, `<i>`, `<u>`, `<strike>`, `<sup>`, `<sub>` |
| Lists | `<ul>`, `<ol>`, `<li>` |
| Tables | `<table>`, `<tr>`, `<td>`, `<th>` |
| Media | `<img>` (with `src`, `alt`, `width`, `height`) |
| Links | `<a>` (with `href`) |
| Code | `<pre>`, `<code>` |
| Semantic | `<cite>`, `<span>` (limited inline styling) |

**Unsupported elements** that will be stripped or rejected: `<div>`, `<section>`, `<article>`, `<script>`, `<style>`, `<iframe>`, `<form>`, `<input>`.

### 5. Send the Request

```
POST https://graph.microsoft.com/v1.0/me/onenote/sections/{section-id}/pages
Content-Type: application/xhtml+xml

{xhtml-payload}
```

### 6. Display the Result

On success (HTTP 201), display:

```
Page created successfully.
  Title:    {title}
  Section:  {section-name}
  ID:       {page-id}
  URL:      {links.oneNoteWebUrl.href}
  Created:  {createdDateTime}
```

### 7. Error Handling

- **400**: Malformed XHTML. Check for unclosed tags, unsupported elements, or missing required structure.
- **401/403**: Missing `Notes.ReadWrite` permission. Suggest running `/setup`.
- **404**: Section ID not found. List available sections with `GET /me/onenote/sections`.
- **413**: Content too large. OneNote pages have a ~25 MB size limit including images. Suggest splitting into multiple pages.
