---
name: OneNote Knowledge Base
description: >
  Deep expertise in OneNote notebook, section, and page management via Microsoft Graph API —
  read, create, search, and update pages for team knowledge bases, meeting notes, SOPs, and
  onboarding documentation. Designed for small teams using OneNote as a lightweight wiki.
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
triggers:
  - onenote
  - notebook
  - knowledge base
  - meeting notes
  - wiki
  - team notes
  - documentation
  - sections
  - pages
  - onenote search
---

# OneNote Knowledge Base

## Overview

Microsoft OneNote is a digital notebook application included in Microsoft 365. Via the Microsoft Graph API, you can programmatically manage notebooks, section groups, sections, and pages -- making OneNote a viable lightweight wiki and knowledge base for small teams (up to ~20 people) that do not need Confluence, Notion, or SharePoint wikis.

The OneNote API operates on a hierarchy:

```
Notebook
  └── Section Group (optional nesting)
        └── Section
              └── Page
```

Pages contain XHTML content. The API accepts and returns page content as HTML, making it straightforward to create structured documentation programmatically.

## Microsoft Graph API -- OneNote Endpoints

Base URL: `https://graph.microsoft.com/v1.0`

### Notebooks

| Operation | Method | Endpoint |
|-----------|--------|----------|
| List user's notebooks | GET | `/me/onenote/notebooks` |
| Get a notebook | GET | `/me/onenote/notebooks/{notebook-id}` |
| Create a notebook | POST | `/me/onenote/notebooks` |
| List notebooks in a group | GET | `/groups/{group-id}/onenote/notebooks` |
| Get recent notebooks | GET | `/me/onenote/notebooks/getRecentNotebooks(includePersonalNotebooks=true)` |

**Create notebook request body:**
```json
{
  "displayName": "Team Knowledge Base"
}
```

### Section Groups

| Operation | Method | Endpoint |
|-----------|--------|----------|
| List section groups in a notebook | GET | `/me/onenote/notebooks/{notebook-id}/sectionGroups` |
| Get a section group | GET | `/me/onenote/sectionGroups/{sectionGroup-id}` |
| Create a section group | POST | `/me/onenote/notebooks/{notebook-id}/sectionGroups` |
| Nested section groups | GET | `/me/onenote/sectionGroups/{sectionGroup-id}/sectionGroups` |

### Sections

| Operation | Method | Endpoint |
|-----------|--------|----------|
| List sections in a notebook | GET | `/me/onenote/notebooks/{notebook-id}/sections` |
| List sections in a section group | GET | `/me/onenote/sectionGroups/{sectionGroup-id}/sections` |
| Get a section | GET | `/me/onenote/sections/{section-id}` |
| Create a section | POST | `/me/onenote/notebooks/{notebook-id}/sections` |
| List all user's sections | GET | `/me/onenote/sections` |

**Create section request body:**
```json
{
  "displayName": "Meeting Notes"
}
```

### Pages

| Operation | Method | Endpoint |
|-----------|--------|----------|
| List pages in a section | GET | `/me/onenote/sections/{section-id}/pages` |
| Get a page's metadata | GET | `/me/onenote/pages/{page-id}` |
| Get a page's HTML content | GET | `/me/onenote/pages/{page-id}/content` |
| Create a page | POST | `/me/onenote/sections/{section-id}/pages` |
| Update a page (patch) | PATCH | `/me/onenote/pages/{page-id}/content` |
| Delete a page | DELETE | `/me/onenote/pages/{page-id}` |
| Copy a page to a section | POST | `/me/onenote/pages/{page-id}/copyToSection` |
| Search pages | GET | `/me/onenote/pages?$search={query}` |
| List all user's pages | GET | `/me/onenote/pages` |

### Page Content (GET)

Retrieving page content returns full XHTML:

```
GET /me/onenote/pages/{page-id}/content
Accept: text/html
```

The response includes the complete HTML document with `<head>` and `<body>`. Embedded images are returned as `<img>` tags with `data-fullres-src` and `data-src-type` attributes pointing to Graph API URLs that can be fetched separately.

### Page Content (POST -- Create)

Creating a page requires sending XHTML with `Content-Type: application/xhtml+xml`:

```html
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml"
      xmlns:oes="http://schemas.microsoft.com/office/onenote/2013/onenote">
<head>
  <title>Page Title</title>
  <meta name="created" content="2025-12-01T10:00:00Z" />
</head>
<body>
  <h1>Page Title</h1>
  <p>Page content goes here.</p>
</body>
</html>
```

## XHTML Content Format Reference

OneNote pages accept a specific subset of HTML. Using unsupported elements will cause the API to strip them or return a 400 error.

### Supported Elements

| Category | Elements | Notes |
|----------|----------|-------|
| Headings | `<h1>` through `<h6>` | `<h1>` is the page title; use `<h2>`+ for content headings |
| Paragraphs | `<p>`, `<br />` | Basic text blocks |
| Bold/Italic | `<b>`, `<i>`, `<u>`, `<strike>` | Inline formatting |
| Superscript | `<sup>`, `<sub>` | For footnotes, chemical formulas |
| Lists | `<ul>`, `<ol>`, `<li>` | Nested lists supported up to 3 levels |
| Tables | `<table>`, `<tr>`, `<td>`, `<th>` | No `<thead>`, `<tbody>`, `<tfoot>` -- use flat `<tr>` rows |
| Images | `<img>` | Requires `src` (URL or base64) and `alt`; supports `width`/`height` |
| Links | `<a href="...">` | External URLs and OneNote internal links |
| Code | `<pre>`, `<code>` | For code snippets; no syntax highlighting in OneNote |
| Inline style | `<span style="...">` | Limited: `color`, `background-color`, `font-size`, `font-family` |
| Citations | `<cite>` | For attributions |

### Unsupported Elements (Stripped or Rejected)

`<div>`, `<section>`, `<article>`, `<header>`, `<footer>`, `<nav>`, `<aside>`, `<script>`, `<style>`, `<iframe>`, `<form>`, `<input>`, `<button>`, `<select>`, `<textarea>`, `<video>`, `<audio>`, `<canvas>`, `<svg>`.

### Table Formatting

Tables in OneNote are simple. Do not use `colspan`, `rowspan`, `<caption>`, or CSS-based layouts. Example of a well-formed table:

```html
<table>
  <tr><th>Column A</th><th>Column B</th><th>Column C</th></tr>
  <tr><td>Value 1</td><td>Value 2</td><td>Value 3</td></tr>
  <tr><td>Value 4</td><td>Value 5</td><td>Value 6</td></tr>
</table>
```

## Page Content Patching (PATCH)

Update existing pages without recreating them. Send a JSON array of patch actions:

```
PATCH /me/onenote/pages/{page-id}/content
Content-Type: application/json

[
  {
    "target": "body",
    "action": "append",
    "position": "after",
    "content": "<p>New paragraph appended to the page.</p>"
  }
]
```

### Patch Actions

| Action | Description |
|--------|-------------|
| `append` | Add content after a target element |
| `insert` | Add content before a target element |
| `prepend` | Add content as the first child of a target element |
| `replace` | Replace the target element entirely |

### Patch Targets

- `body` -- the page body
- `#{data-id}` -- a specific element with a `data-id` attribute
- `#title` -- the page title

### Patch Example: Add an Action Item Row

```json
[
  {
    "target": "#action-items-table",
    "action": "append",
    "content": "<tr><td>Review PR #42</td><td>Alice</td><td>2025-12-20</td><td>Open</td></tr>"
  }
]
```

To use targeted patching, pages should include `data-id` attributes on key elements when created:

```html
<table data-id="action-items-table">
  <tr><th>Action</th><th>Owner</th><th>Due Date</th><th>Status</th></tr>
</table>
```

## Search Capabilities and Limitations

### Full-Text Search

```
GET /me/onenote/pages?$search=deployment runbook&$select=title,createdDateTime,lastModifiedDateTime,links&$top=25
```

Search indexes page titles and text content. It does **not** index:
- Image content (OCR text is not searchable via API)
- File attachments embedded in pages
- Ink/handwriting content

### Filtering

Use OData `$filter` for structured queries:

```
GET /me/onenote/pages?$filter=createdDateTime ge 2025-01-01T00:00:00Z&$select=title,createdDateTime
```

Common filter fields: `title`, `createdDateTime`, `lastModifiedDateTime`.

### Sorting

```
GET /me/onenote/pages?$orderby=lastModifiedDateTime desc&$top=10
```

### Combining Search and Filters

Search and `$filter` cannot be combined in a single request. To filter search results by notebook or section, scope the search to a specific section or notebook endpoint:

```
GET /me/onenote/sections/{section-id}/pages?$search=onboarding&$top=10
```

## Common Patterns for Small Teams

### Pattern 1: Team Wiki

Structure a single shared notebook as a team wiki:

```
Company Wiki (Notebook)
  ├── General (Section)
  │     ├── Company Values
  │     ├── Team Directory
  │     └── Communication Guidelines
  ├── Engineering (Section)
  │     ├── Architecture Overview
  │     ├── Deployment Runbook
  │     └── Code Review Checklist
  ├── SOPs (Section)
  │     ├── Incident Response
  │     ├── Customer Escalation
  │     └── New Hire Onboarding
  └── Templates (Section)
        ├── Meeting Notes Template
        ├── Decision Record Template
        └── Post-Mortem Template
```

Create the notebook and sections:

```
POST /me/onenote/notebooks
{ "displayName": "Company Wiki" }

POST /me/onenote/notebooks/{notebook-id}/sections
{ "displayName": "Engineering" }
```

### Pattern 2: Meeting Notes Archive

A dedicated notebook for all team meetings, organized by section per meeting type:

```
Team Meetings (Notebook)
  ├── Standups (Section)
  ├── Sprint Planning (Section)
  ├── Retrospectives (Section)
  └── All-Hands (Section)
```

Each page follows the standard meeting notes template with Meeting Info, Agenda, Discussion Notes, Action Items, and Next Steps.

### Pattern 3: Onboarding Documentation

A structured onboarding notebook that new hires work through:

```
Onboarding (Notebook)
  ├── Week 1 (Section)
  │     ├── Welcome and Accounts Setup
  │     ├── Tools and Access
  │     └── Team Introductions
  ├── Week 2 (Section)
  │     ├── Codebase Walkthrough
  │     ├── Development Environment
  │     └── First Task Assignment
  └── Reference (Section)
        ├── Benefits and HR Info
        ├── PTO Policy
        └── Expense Reporting
```

### Pattern 4: Standard Operating Procedures

SOPs live in a dedicated section with consistent page structure:

```html
<h1>SOP: Incident Response</h1>
<h2>Purpose</h2>
<p>Define the steps for handling production incidents.</p>
<h2>Scope</h2>
<p>All engineering team members on-call.</p>
<h2>Procedure</h2>
<ol>
  <li>Acknowledge the alert within 5 minutes.</li>
  <li>Open an incident channel in Teams.</li>
  <li>Assess severity (P1-P4).</li>
  <li>Begin mitigation following the runbook.</li>
  <li>Post status updates every 30 minutes.</li>
  <li>Conduct post-mortem within 48 hours.</li>
</ol>
<h2>Revision History</h2>
<table>
  <tr><th>Date</th><th>Author</th><th>Changes</th></tr>
  <tr><td>2025-12-01</td><td>Alice</td><td>Initial version</td></tr>
</table>
```

## Authentication Notes

### Delegated Flow (Interactive Users)

For small teams where individuals access their own notebooks or shared notebooks they have permission to, use delegated permissions with the authorization code flow:

1. Register an app in Microsoft Entra ID.
2. Add `Notes.Read` and `Notes.ReadWrite` delegated permissions.
3. Authenticate via `@azure/identity` using `InteractiveBrowserCredential` or `DeviceCodeCredential`.
4. Tokens are scoped to the signed-in user.

### Application Flow (Service/Daemon)

For automated documentation workflows (e.g., auto-creating meeting notes from a calendar feed), use application permissions:

1. Add `Notes.Read.All` and `Notes.ReadWrite.All` application permissions.
2. Grant admin consent in the Azure portal.
3. Authenticate with `ClientSecretCredential` or `ClientCertificateCredential`.
4. Access any user's notebooks via `/users/{user-id}/onenote/...`.

### Token Scopes

| Scope | Access Level |
|-------|-------------|
| `Notes.Read` | Read user's notebooks and pages |
| `Notes.ReadWrite` | Read and write user's notebooks and pages |
| `Notes.Create` | Create new notebooks (but not read existing) |
| `Notes.Read.All` | Read all notebooks in the org (application only) |
| `Notes.ReadWrite.All` | Read and write all notebooks in the org (application only) |

## Image and File Attachment Handling

### Adding Images to Pages

**From a URL:**
```html
<img src="https://example.com/diagram.png" alt="Architecture diagram" width="800" />
```

**From base64 data (inline):**
```html
<img src="data:image/png;base64,iVBORw0KGgo..." alt="Logo" width="200" />
```

**As a multipart request** (recommended for large images):

```
POST /me/onenote/sections/{section-id}/pages
Content-Type: multipart/form-data; boundary=MyBoundary

--MyBoundary
Content-Disposition: form-data; name="Presentation"
Content-Type: application/xhtml+xml

<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>Page with Image</title></head>
<body>
  <h1>Page with Image</h1>
  <p>See the diagram below:</p>
  <img src="name:diagram" alt="Architecture diagram" width="800" />
</body>
</html>

--MyBoundary
Content-Disposition: form-data; name="diagram"
Content-Type: image/png

<binary image data>
--MyBoundary--
```

### Retrieving Images from Pages

When you GET a page's content, images appear as:

```html
<img src="https://graph.microsoft.com/v1.0/me/onenote/resources/{resource-id}/$value"
     data-src-type="image/png"
     data-fullres-src="https://graph.microsoft.com/v1.0/me/onenote/resources/{resource-id}/$value" />
```

Fetch the image binary with a GET to the `src` URL using the same auth token.

### File Attachments

Attach files (PDFs, Office docs) to a page using multipart requests:

```html
<object data="name:attachment" data-attachment="report.pdf" type="application/pdf" />
```

Include the file binary as a named part in the multipart body, matching the `name:attachment` reference.

## Rate Limits and Throttling

OneNote API shares the Microsoft Graph throttling model:

- **Per-app, per-tenant**: ~100 requests per 20 seconds.
- **Per-user**: ~30 requests per 60 seconds for write operations.
- On HTTP 429, read the `Retry-After` header and wait before retrying.
- Use `$select` to reduce response payload size and avoid unnecessary data transfer.

## Query Parameters Reference

| Parameter | Example | Description |
|-----------|---------|-------------|
| `$select` | `$select=title,createdDateTime` | Return only specified fields |
| `$filter` | `$filter=createdDateTime ge 2025-01-01` | OData filter expression |
| `$orderby` | `$orderby=lastModifiedDateTime desc` | Sort results |
| `$top` | `$top=25` | Limit number of results |
| `$skip` | `$skip=25` | Skip first N results (for manual pagination) |
| `$search` | `$search=deployment` | Full-text search |
| `$expand` | `$expand=parentSection` | Include related entities |
| `$count` | `$count=true` | Include total count in response |

## Best Practices

- Use `<h1>` only for the page title. Use `<h2>` and below for content structure to maintain a clean heading hierarchy for search.
- Include `data-id` attributes on elements you plan to patch later (tables, sections).
- Keep pages focused on a single topic. Prefer many small pages over few large ones for better searchability.
- Use consistent naming for pages: prefix meeting notes with the date (`2025-12-01 Sprint Planning`), prefix SOPs with "SOP:".
- Store the notebook and section IDs in your environment or config file to avoid repeated lookups.
- For team wikis, prefer a shared notebook in a Microsoft 365 Group rather than sharing a personal notebook.
- Use `$select` on every request to minimize response size and improve performance.
- When creating pages programmatically, always validate the XHTML before posting to avoid 400 errors.
