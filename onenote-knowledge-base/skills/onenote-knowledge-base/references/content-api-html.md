# OneNote Content API & HTML Format — Graph API Reference

## Overview

This reference covers OneNote's HTML content format (ONML — OneNote Markup Language), creating
pages with images and tables, embedded content, updating page content via PATCH operations, and
handling ink/handwriting data.

Base URL: `https://graph.microsoft.com/v1.0`

---

## API Endpoint Table

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|---------------------|----------------|-------|
| POST | `/me/onenote/sections/{sectionId}/pages` | `Notes.ReadWrite` | HTML body, Content-Type | Create page with content |
| GET | `/me/onenote/pages/{pageId}/content` | `Notes.Read` | `Accept: text/html` | Get page XHTML |
| PATCH | `/me/onenote/pages/{pageId}/content` | `Notes.ReadWrite` | JSON array of patch actions | Update page content |
| GET | `/me/onenote/resources/{resourceId}/$value` | `Notes.Read` | — | Fetch embedded image/file binary |
| POST (multipart) | `/me/onenote/sections/{sectionId}/pages` | `Notes.ReadWrite` | multipart/form-data | Create page with embedded images |

### Patch Actions

| Action | Description | Target |
|--------|-------------|--------|
| `append` | Add content after target element | `body`, `#data-id`, `#title` |
| `insert` | Add content before target element | `#data-id` |
| `prepend` | Add content as first child of target | `body`, `#data-id` |
| `replace` | Replace target element entirely | `#data-id`, `#title` |

---

## Supported HTML Elements

### Block Elements

| Element | Usage | Notes |
|---------|-------|-------|
| `<h1>` | Page title only | Appears in page header |
| `<h2>` – `<h6>` | Content headings | Use for section structure |
| `<p>` | Paragraph | Basic text block |
| `<ul>`, `<ol>`, `<li>` | Lists | Nested up to 3 levels |
| `<table>`, `<tr>`, `<td>`, `<th>` | Tables | No colspan/rowspan support |
| `<pre>`, `<code>` | Code blocks | No syntax highlighting |
| `<hr />` | Horizontal rule | Self-closing |
| `<br />` | Line break | Must be self-closing in XHTML |
| `<blockquote>` | Quotation block | Indented block |

### Inline Elements

| Element | Usage | Notes |
|---------|-------|-------|
| `<b>`, `<strong>` | Bold | Both supported |
| `<i>`, `<em>` | Italic | Both supported |
| `<u>` | Underline | — |
| `<strike>`, `<s>` | Strikethrough | Both supported |
| `<sup>`, `<sub>` | Superscript/subscript | — |
| `<span>` | Inline styling | Supports `color`, `background-color`, `font-size`, `font-family` |
| `<a href="...">` | Hyperlink | External URLs |
| `<cite>` | Citation/attribution | Italicized |

### Media Elements

| Element | Usage | Notes |
|---------|-------|-------|
| `<img src="...">` | Image | URL, base64, or `name:partName` (multipart) |
| `<object data="name:...">` | File attachment | Multipart only |

---

## Code Snippets

### TypeScript — Create a Rich Page with Table and Lists

```typescript
import { Client } from "@microsoft/microsoft-graph-client";

function buildSopPage(
  title: string,
  purpose: string,
  scope: string,
  steps: string[],
  author: string,
  date: string
): string {
  const stepsList = steps
    .map((step, i) => `<li data-id="step-${i}">${step}</li>`)
    .join("");

  return `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>${title}</title>
  <meta name="created" content="${date}" />
</head>
<body>
  <h1>${title}</h1>
  <h2>Purpose</h2>
  <p data-id="purpose">${purpose}</p>
  <h2>Scope</h2>
  <p data-id="scope">${scope}</p>
  <h2>Procedure</h2>
  <ol data-id="procedure-list">${stepsList}</ol>
  <h2>Revision History</h2>
  <table data-id="revision-table">
    <tr><th>Date</th><th>Author</th><th>Changes</th></tr>
    <tr><td>${date}</td><td>${author}</td><td>Initial version</td></tr>
  </table>
</body>
</html>`;
}

async function createSopPage(
  client: Client,
  sectionId: string,
  title: string,
  purpose: string,
  scope: string,
  steps: string[],
  author: string
): Promise<string> {
  const html = buildSopPage(
    title,
    purpose,
    scope,
    steps,
    author,
    new Date().toISOString().split("T")[0]
  );

  const page = await client
    .api(`/me/onenote/sections/${sectionId}/pages`)
    .header("Content-Type", "application/xhtml+xml")
    .post(html);

  return page.id;
}
```

### TypeScript — Page with Embedded Image (URL-Based)

```typescript
async function createPageWithImage(
  client: Client,
  sectionId: string,
  title: string,
  imageUrl: string,
  imageAlt: string,
  caption: string
): Promise<string> {
  const html = `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>${title}</title></head>
<body>
  <h1>${title}</h1>
  <p>${caption}</p>
  <img src="${imageUrl}" alt="${imageAlt}" width="800" />
</body>
</html>`;

  const page = await client
    .api(`/me/onenote/sections/${sectionId}/pages`)
    .header("Content-Type", "application/xhtml+xml")
    .post(html);

  return page.id;
}
```

### TypeScript — Multipart Page with Embedded Image Binary

```typescript
import * as fs from "fs";

async function createPageWithBinaryImage(
  client: Client,
  sectionId: string,
  title: string,
  imagePath: string,
  imageAlt: string
): Promise<string> {
  const imageBuffer = fs.readFileSync(imagePath);
  const imageMimeType = imagePath.endsWith(".png") ? "image/png" : "image/jpeg";
  const boundary = "MyBoundary" + Date.now();

  const presentationHtml = `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>${title}</title></head>
<body>
  <h1>${title}</h1>
  <img src="name:image1" alt="${imageAlt}" width="800" />
</body>
</html>`;

  // Build multipart body
  const parts = [
    `--${boundary}\r\nContent-Disposition: form-data; name="Presentation"\r\nContent-Type: application/xhtml+xml\r\n\r\n${presentationHtml}\r\n`,
    `--${boundary}\r\nContent-Disposition: form-data; name="image1"\r\nContent-Type: ${imageMimeType}\r\n\r\n`,
  ];

  const textPart1 = Buffer.from(parts[0], "utf8");
  const textPart2 = Buffer.from(parts[1], "utf8");
  const closeDelimiter = Buffer.from(`\r\n--${boundary}--\r\n`, "utf8");

  const body = Buffer.concat([textPart1, textPart2, imageBuffer, closeDelimiter]);

  const response = await fetch(
    `https://graph.microsoft.com/v1.0/me/onenote/sections/${sectionId}/pages`,
    {
      method: "POST",
      headers: {
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
        Authorization: `Bearer {your_token}`,
      },
      body,
    }
  );

  const page = await response.json();
  return page.id;
}
```

### TypeScript — Patch Page: Append Paragraph

```typescript
async function appendParagraphToPage(
  client: Client,
  pageId: string,
  text: string
): Promise<void> {
  const patchContent = [
    {
      target: "body",
      action: "append",
      position: "after",
      content: `<p>${text}</p>`,
    },
  ];

  await client
    .api(`/me/onenote/pages/${pageId}/content`)
    .header("Content-Type", "application/json")
    .patch(patchContent);
}
```

### TypeScript — Patch Page: Add Row to Specific Table

```typescript
async function addTableRow(
  client: Client,
  pageId: string,
  tableDataId: string,
  cells: string[]
): Promise<void> {
  const rowHtml = `<tr>${cells.map((c) => `<td>${c}</td>`).join("")}</tr>`;

  await client
    .api(`/me/onenote/pages/${pageId}/content`)
    .header("Content-Type", "application/json")
    .patch([
      {
        target: `#${tableDataId}`,
        action: "append",
        content: rowHtml,
      },
    ]);
}
```

### TypeScript — Patch Page: Replace Content in Section

```typescript
async function updatePageSection(
  client: Client,
  pageId: string,
  dataId: string,
  newContent: string
): Promise<void> {
  await client
    .api(`/me/onenote/pages/${pageId}/content`)
    .header("Content-Type", "application/json")
    .patch([
      {
        target: `#${dataId}`,
        action: "replace",
        content: newContent,
      },
    ]);
}

// Example: Update the "next-steps" paragraph
await updatePageSection(
  client,
  pageId,
  "next-steps",
  "<p>Deploy to staging by Friday. QA sign-off required before production.</p>"
);
```

### TypeScript — Retrieve and Fetch Embedded Images

```typescript
async function getPageImages(
  client: Client,
  pageId: string
): Promise<Array<{ resourceId: string; mimeType: string }>> {
  const htmlContent = await client
    .api(`/me/onenote/pages/${pageId}/content`)
    .get();

  const images: Array<{ resourceId: string; mimeType: string }> = [];

  // Extract resource IDs from img src attributes
  const imgRegex = /src="https:\/\/graph\.microsoft\.com\/[^"]+\/resources\/([^/]+)\/\$value"/g;
  const mimeRegex = /data-src-type="([^"]+)"/g;

  let imgMatch;
  let mimeMatch;
  while ((imgMatch = imgRegex.exec(htmlContent)) !== null) {
    mimeMatch = mimeRegex.exec(htmlContent);
    images.push({
      resourceId: imgMatch[1],
      mimeType: mimeMatch?.[1] ?? "image/png",
    });
  }

  return images;
}

async function fetchImageBinary(
  client: Client,
  resourceId: string
): Promise<Buffer> {
  const binary = await client
    .api(`/me/onenote/resources/${resourceId}/$value`)
    .getStream();

  const chunks: Buffer[] = [];
  for await (const chunk of binary) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}
```

### PowerShell — Create Page with Inline Styles

```powershell
Connect-MgGraph -Scopes "Notes.ReadWrite"

$sectionId = "YOUR_SECTION_ID"

$pageHtml = @"
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>Status Report — $(Get-Date -Format 'yyyy-MM-dd')</title></head>
<body>
  <h1>Status Report — $(Get-Date -Format 'MMMM d, yyyy')</h1>
  <h2>Summary</h2>
  <p><span style="color: green;">On track.</span> All milestones met this week.</p>
  <h2>Highlights</h2>
  <ul>
    <li><b>Feature A</b> deployed to production</li>
    <li><b>Bug B</b> resolved (P1)</li>
    <li>Team offsite scheduled for next Friday</li>
  </ul>
  <h2>Risks</h2>
  <table>
    <tr><th>Risk</th><th>Impact</th><th>Mitigation</th></tr>
    <tr><td>Vendor delay</td><td><span style="color:orange;">Medium</span></td><td>Escalated to procurement</td></tr>
  </table>
</body>
</html>
"@

Invoke-MgGraphRequest -Method POST `
    -Uri "https://graph.microsoft.com/v1.0/me/onenote/sections/$sectionId/pages" `
    -Body ([System.Text.Encoding]::UTF8.GetBytes($pageHtml)) `
    -ContentType "application/xhtml+xml"
```

---

## Error Codes Table

| HTTP Status / Code | Meaning | Remediation |
|--------------------|---------|-------------|
| 400 BadRequest | Invalid XHTML / unsupported element | Validate XML; remove non-XHTML elements |
| 400 invalidXml | Malformed XML in page content | Check unclosed tags, unescaped `&`, `<`, `>` |
| 400 patchActionNotSupported | Unsupported patch action for target | Only `append`/`prepend`/`replace`/`insert` are valid |
| 400 targetElementNotFound | `data-id` not found on page | Verify `data-id` was set at page creation |
| 403 Forbidden | No write permission to section | Ensure `Notes.ReadWrite` scope; verify notebook access |
| 404 NotFound | Page or resource not found | Verify pageId; page may be deleted |
| 413 RequestEntityTooLarge | Page content exceeds 25 MB | Compress images; use multipart with linked resources |
| 429 TooManyRequests | Rate limited | Respect `Retry-After` header |
| 500 InternalServerError | Server error | Retry with backoff |

---

## Throttling Limits Table

| Resource | Limit | Retry Strategy |
|----------|-------|----------------|
| Page creates | ~30 per minute per user | Queue page creation |
| Page PATCH operations | ~30 per minute per user | Batch patch actions into single PATCH call |
| Resource (image) fetches | Counted against general limit | Cache downloaded images locally |
| Page size | 25 MB maximum | Split large pages; reference external images by URL |
| Images per page | No hard limit; performance degrades above ~50 | Paginate image-heavy content |

---

## Common Patterns and Gotchas

### 1. Multiple Patch Actions in a Single PATCH Call

Bundle all updates into a single `PATCH /content` call by sending an array with multiple action
objects. Each action targets a different `data-id`. This is dramatically more efficient than
multiple separate PATCH requests.

### 2. HTML Entities Must Be Properly Escaped

In XHTML, `&`, `<`, and `>` in text content must be escaped as `&amp;`, `&lt;`, `&gt;`.
In attribute values, `"` must be `&quot;`. Unescaped entities cause 400 invalidXml errors.

### 3. Tables Cannot Use `colspan` or `rowspan`

OneNote's table rendering does not support cell merging. All tables must use a flat grid structure.
Attempting to use `colspan` or `rowspan` may silently produce incorrect table layouts.

### 4. Ink/Handwriting Data Is Read-Only via API

OneNote ink (handwriting) content can be read but not created via the API. Retrieved pages
with ink show it as a static image in the HTML. You cannot add ink programmatically.

### 5. Style Properties Are Limited

Only `color`, `background-color`, `font-size`, and `font-family` are supported in inline
`style` attributes. CSS layout properties (`margin`, `padding`, `display`, `float`) are
silently stripped.

### 6. `<h1>` is Reserved for the Page Title

In the OneNote data model, `<h1>` is used for the page's main title. Using `<h1>` in the
page body beyond the first occurrence produces unexpected styling. Use `<h2>` and below for
all content headings.
