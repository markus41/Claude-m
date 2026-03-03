# OneNote Notebooks, Sections & Pages — Graph API Reference

## Overview

This reference covers the full OneNote hierarchy management via Microsoft Graph API. Topics
include notebook, section group, section, and page CRUD; hierarchy navigation; copy operations;
sharing; permissions; and exporting pages.

Base URL: `https://graph.microsoft.com/v1.0`

---

## API Endpoint Table

### Notebooks

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|---------------------|----------------|-------|
| GET | `/me/onenote/notebooks` | `Notes.Read` | `$select`, `$orderby`, `$top` | List user notebooks |
| GET | `/me/onenote/notebooks/{notebookId}` | `Notes.Read` | `$select` | Get notebook |
| POST | `/me/onenote/notebooks` | `Notes.ReadWrite` | `displayName` | Create notebook |
| GET | `/groups/{groupId}/onenote/notebooks` | `Notes.Read`, `Group.Read.All` | — | Group notebooks |
| POST | `/groups/{groupId}/onenote/notebooks` | `Notes.ReadWrite`, `Group.ReadWrite.All` | `displayName` | Create group notebook |
| GET | `/users/{userId}/onenote/notebooks` | `Notes.Read.All` | — | Another user's notebooks |
| GET | `/me/onenote/notebooks/getRecentNotebooks(includePersonalNotebooks=true)` | `Notes.Read` | — | Recently opened notebooks |

### Section Groups

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|---------------------|----------------|-------|
| GET | `/me/onenote/notebooks/{notebookId}/sectionGroups` | `Notes.Read` | `$select` | List section groups |
| POST | `/me/onenote/notebooks/{notebookId}/sectionGroups` | `Notes.ReadWrite` | `displayName` | Create section group |
| GET | `/me/onenote/sectionGroups/{sectionGroupId}` | `Notes.Read` | — | Get section group |
| GET | `/me/onenote/sectionGroups/{sectionGroupId}/sectionGroups` | `Notes.Read` | — | Nested section groups |

### Sections

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|---------------------|----------------|-------|
| GET | `/me/onenote/notebooks/{notebookId}/sections` | `Notes.Read` | `$select`, `$orderby` | Sections in notebook |
| GET | `/me/onenote/sectionGroups/{groupId}/sections` | `Notes.Read` | — | Sections in section group |
| GET | `/me/onenote/sections/{sectionId}` | `Notes.Read` | — | Get section |
| POST | `/me/onenote/notebooks/{notebookId}/sections` | `Notes.ReadWrite` | `displayName` | Create section |
| POST | `/me/onenote/sections/{sectionId}/copyToNotebook` | `Notes.ReadWrite` | `id` (target notebook) | Copy section |
| POST | `/me/onenote/sections/{sectionId}/copyToSectionGroup` | `Notes.ReadWrite` | `id` (target group) | Copy to section group |

### Pages

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|---------------------|----------------|-------|
| GET | `/me/onenote/sections/{sectionId}/pages` | `Notes.Read` | `$select`, `$orderby`, `$top` | List pages |
| GET | `/me/onenote/pages/{pageId}` | `Notes.Read` | `$select` | Page metadata |
| GET | `/me/onenote/pages/{pageId}/content` | `Notes.Read` | — | Page HTML content |
| POST | `/me/onenote/sections/{sectionId}/pages` | `Notes.ReadWrite` | HTML body | Create page |
| PATCH | `/me/onenote/pages/{pageId}/content` | `Notes.ReadWrite` | JSON patch array | Update page content |
| DELETE | `/me/onenote/pages/{pageId}` | `Notes.ReadWrite` | — | Delete page |
| POST | `/me/onenote/pages/{pageId}/copyToSection` | `Notes.ReadWrite` | `id` (target section) | Copy page |
| GET | `/me/onenote/pages?$search={query}` | `Notes.Read` | `$search`, `$select`, `$top` | Search pages |

---

## Code Snippets

### TypeScript — Create a Notebook and Full Wiki Structure

```typescript
import { Client } from "@microsoft/microsoft-graph-client";

interface WikiStructure {
  notebookId: string;
  sectionIds: Record<string, string>; // sectionName -> sectionId
}

async function createWikiNotebook(
  client: Client,
  notebookName: string,
  sectionNames: string[]
): Promise<WikiStructure> {
  // Create notebook
  const notebook = await client.api("/me/onenote/notebooks").post({
    displayName: notebookName,
  });

  console.log(`Created notebook: ${notebook.id} — "${notebook.displayName}"`);

  // Create sections in parallel
  const sectionPromises = sectionNames.map((name) =>
    client
      .api(`/me/onenote/notebooks/${notebook.id}/sections`)
      .post({ displayName: name })
      .then((s) => ({ name, id: s.id }))
  );

  const sections = await Promise.all(sectionPromises);
  const sectionIds: Record<string, string> = {};
  for (const s of sections) {
    sectionIds[s.name] = s.id;
    console.log(`Created section: "${s.name}" (${s.id})`);
  }

  return { notebookId: notebook.id, sectionIds };
}
```

### TypeScript — Create a Group Notebook (Shared)

```typescript
async function createGroupNotebook(
  client: Client,
  groupId: string,
  notebookName: string
): Promise<string> {
  const notebook = await client
    .api(`/groups/${groupId}/onenote/notebooks`)
    .post({ displayName: notebookName });

  return notebook.id;
}
```

### TypeScript — Create a Page with Structured Content

```typescript
function buildMeetingNotesPage(
  title: string,
  date: string,
  attendees: string[],
  agendaItems: string[]
): string {
  const attendeeList = attendees
    .map((a) => `<li>${a}</li>`)
    .join("");
  const agendaList = agendaItems
    .map((item, i) => `<li data-id="agenda-${i}">${item}</li>`)
    .join("");

  return `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>${title}</title>
  <meta name="created" content="${date}" />
</head>
<body>
  <h1>${title}</h1>
  <h2>Meeting Info</h2>
  <table>
    <tr><th>Date</th><td>${date}</td></tr>
    <tr><th>Attendees</th><td><ul>${attendeeList}</ul></td></tr>
  </table>
  <h2>Agenda</h2>
  <ol data-id="agenda-list">${agendaList}</ol>
  <h2>Discussion Notes</h2>
  <p data-id="discussion-notes">Notes to be added during the meeting.</p>
  <h2>Action Items</h2>
  <table data-id="action-items">
    <tr><th>Action</th><th>Owner</th><th>Due Date</th><th>Status</th></tr>
  </table>
  <h2>Next Steps</h2>
  <p data-id="next-steps">TBD</p>
</body>
</html>`;
}

async function createMeetingNotesPage(
  client: Client,
  sectionId: string,
  title: string,
  date: string,
  attendees: string[],
  agendaItems: string[]
): Promise<string> {
  const html = buildMeetingNotesPage(title, date, attendees, agendaItems);

  const page = await client
    .api(`/me/onenote/sections/${sectionId}/pages`)
    .header("Content-Type", "application/xhtml+xml")
    .post(html);

  console.log(`Created page: ${page.id} — "${page.title}"`);
  return page.id;
}
```

### TypeScript — Append Row to Action Items Table

```typescript
async function appendActionItem(
  client: Client,
  pageId: string,
  action: string,
  owner: string,
  dueDate: string
): Promise<void> {
  const patchContent = [
    {
      target: "#action-items",
      action: "append",
      content: `<tr><td>${action}</td><td>${owner}</td><td>${dueDate}</td><td>Open</td></tr>`,
    },
  ];

  await client
    .api(`/me/onenote/pages/${pageId}/content`)
    .header("Content-Type", "application/json")
    .patch(patchContent);
}
```

### TypeScript — Copy a Section to Another Notebook

```typescript
async function copySection(
  client: Client,
  sourceSectionId: string,
  targetNotebookId: string,
  newSectionName?: string
): Promise<void> {
  const body: Record<string, unknown> = {
    id: targetNotebookId,
  };
  if (newSectionName) {
    body.renameAs = newSectionName;
  }

  await client
    .api(`/me/onenote/sections/${sourceSectionId}/copyToNotebook`)
    .post(body);

  // Copy is async — the operation completes in the background
  console.log(`Section copy initiated to notebook ${targetNotebookId}`);
}
```

### TypeScript — List All Notebooks and Sections (Hierarchy)

```typescript
async function getNotebookHierarchy(client: Client): Promise<void> {
  const notebooks = await client
    .api("/me/onenote/notebooks")
    .select("id,displayName,createdDateTime")
    .orderby("displayName")
    .get();

  for (const nb of notebooks.value) {
    console.log(`\nNotebook: ${nb.displayName} (${nb.id})`);

    const sections = await client
      .api(`/me/onenote/notebooks/${nb.id}/sections`)
      .select("id,displayName,pagesCount")
      .get();

    for (const sec of sections.value) {
      console.log(`  Section: ${sec.displayName} (${sec.pagesCount || 0} pages)`);
    }
  }
}
```

### TypeScript — Get Page and Parse Data-ID Elements

```typescript
async function getPageContent(
  client: Client,
  pageId: string
): Promise<string> {
  const content = await client
    .api(`/me/onenote/pages/${pageId}/content`)
    .header("Accept", "text/html")
    .get();

  return content; // Full XHTML string
}

// Extract action items from a meeting notes page
function extractActionItems(
  html: string
): Array<{ action: string; owner: string; due: string; status: string }> {
  // Use a DOM parser in browser context or node-html-parser in Node.js
  // This is a simplified example
  const rows: Array<{ action: string; owner: string; due: string; status: string }> = [];
  const rowMatches = html.matchAll(/<tr><td>(.*?)<\/td><td>(.*?)<\/td><td>(.*?)<\/td><td>(.*?)<\/td><\/tr>/g);
  for (const [, action, owner, due, status] of rowMatches) {
    rows.push({ action, owner, due, status });
  }
  return rows;
}
```

### PowerShell — Notebook and Section Management

```powershell
Connect-MgGraph -Scopes "Notes.ReadWrite"

# Create a notebook
$nbBody = @{ displayName = "Team Wiki" } | ConvertTo-Json
$notebook = Invoke-MgGraphRequest -Method POST `
    -Uri "https://graph.microsoft.com/v1.0/me/onenote/notebooks" `
    -Body $nbBody -ContentType "application/json"
$notebookId = $notebook.id

# Create sections
$sectionNames = @("Engineering", "SOPs", "Meeting Notes", "Templates")
$sectionIds = @{}
foreach ($name in $sectionNames) {
    $secBody = @{ displayName = $name } | ConvertTo-Json
    $section = Invoke-MgGraphRequest -Method POST `
        -Uri "https://graph.microsoft.com/v1.0/me/onenote/notebooks/$notebookId/sections" `
        -Body $secBody -ContentType "application/json"
    $sectionIds[$name] = $section.id
    Write-Host "Created section: $name ($($section.id))"
}

# Create a page
$pageHtml = @"
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>Architecture Overview</title></head>
<body>
  <h1>Architecture Overview</h1>
  <p>This page describes our system architecture.</p>
  <h2>Components</h2>
  <ul><li>API Gateway</li><li>Auth Service</li><li>Data Store</li></ul>
</body>
</html>
"@

Invoke-MgGraphRequest -Method POST `
    -Uri "https://graph.microsoft.com/v1.0/me/onenote/sections/$($sectionIds['Engineering'])/pages" `
    -Body ([System.Text.Encoding]::UTF8.GetBytes($pageHtml)) `
    -ContentType "application/xhtml+xml"

# List all pages in a section
$pages = Invoke-MgGraphRequest -Method GET `
    -Uri "https://graph.microsoft.com/v1.0/me/onenote/sections/$($sectionIds['Engineering'])/pages?`$select=title,createdDateTime,lastModifiedDateTime&`$orderby=lastModifiedDateTime desc"
$pages.value | Select-Object title, createdDateTime, lastModifiedDateTime
```

---

## Error Codes Table

| HTTP Status / Code | Meaning | Remediation |
|--------------------|---------|-------------|
| 400 BadRequest | Invalid XHTML in page body | Validate HTML before posting; use strict XHTML |
| 400 InvalidRequest | Unsupported HTML elements stripped | Remove `<div>`, `<section>`, `<script>` etc. |
| 401 Unauthorized | Token expired | Re-acquire token |
| 403 Forbidden | Insufficient permissions or notebook not shared | Add `Notes.ReadWrite`; verify notebook access |
| 404 NotFound | Notebook, section, or page not found | Verify IDs; resource may have been deleted |
| 405 MethodNotAllowed | Wrong HTTP method | Check endpoint supports the method |
| 409 Conflict | Duplicate notebook name | Use a unique displayName |
| 413 RequestEntityTooLarge | Page content exceeds size limit | Reduce page size; split into multiple pages |
| 429 TooManyRequests | Rate limited | Respect `Retry-After` header |
| 500 InternalServerError | Server error | Retry with backoff |
| EntityNotFound | Notebook entity not accessible | Verify user has access to the notebook |
| invalidXml | Page XHTML is malformed | Check XML well-formedness: all tags closed, attributes quoted |

---

## Throttling Limits Table

| Resource | Limit | Retry Strategy |
|----------|-------|----------------|
| Per-app, per-tenant | ~100 requests per 20 seconds | Use `$select` to reduce payload; batch wisely |
| Per-user write ops | ~30 requests per 60 seconds | Queue page creates; don't burst |
| Page size limit | 25 MB per page | Compress images; avoid embedding large files inline |
| Notebook name length | 128 characters | Keep names concise |
| Section nesting | Maximum 2 levels of section groups | Flat structure recommended for clarity |

---

## Common Patterns and Gotchas

### 1. Page Content Requires Strict XHTML — Not HTML5

OneNote page creation uses `application/xhtml+xml` content type. The document must be
well-formed XML: all tags must be closed (`<br />` not `<br>`), all attributes must be quoted,
and the document must have the proper XML declaration. Invalid XML returns 400.

### 2. `data-id` Attributes Enable Targeted Patching

Add `data-id` attributes to elements at page creation time if you plan to update them later.
For example: `<table data-id="action-items">`. This lets you use `#action-items` as the patch
target. Without `data-id`, you can only target the `body` or `#title`.

### 3. Copy Operations Are Asynchronous

`copyToNotebook` and `copyToSection` return immediately without waiting for completion.
The copy operation runs asynchronously in the background. If you need to reference the copied
section's ID, poll `GET /me/onenote/sections` until the new section appears.

### 4. Shared Group Notebooks Use `/groups/{id}/onenote/` Prefix

Notebooks created under a Microsoft 365 Group are accessible to all group members. Use
`/groups/{groupId}/onenote/notebooks` endpoints. Personal notebooks under `/me/onenote/` are
not shareable via the API — use group notebooks for team wikis.

### 5. `pagesCount` Property Is Not Always Populated

The `pagesCount` property on sections is not always returned — it depends on whether the
section metadata has been fully indexed. Don't rely on it for accurate page counts; query
pages directly and count the results.

### 6. Image URLs in Retrieved Pages Require Authentication

When you GET a page's content, image `src` attributes point to Graph API URLs like
`/me/onenote/resources/{id}/$value`. These require an authenticated Bearer token to fetch.
You cannot load them directly in `<img>` tags in a browser without CORS-compliant auth.

### 7. Notebook Permissions Follow SharePoint / OneDrive Permissions

OneNote notebooks are stored in the user's OneDrive (`/me/drive`) or SharePoint. You cannot
set permissions directly via the OneNote API. To share a notebook, share the underlying file
via OneDrive permissions API (`/me/drive/items/{notebookId}/invite`).
