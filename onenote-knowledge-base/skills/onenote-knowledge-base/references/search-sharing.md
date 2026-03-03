# OneNote Search & Sharing — Graph API Reference

## Overview

This reference covers OneNote's search API capabilities, sharing notebooks with specific users,
embedding pages in Teams, exporting content, and cross-tenant sharing limitations.

Base URL: `https://graph.microsoft.com/v1.0`

---

## API Endpoint Table

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|---------------------|----------------|-------|
| GET | `/me/onenote/pages?$search={query}` | `Notes.Read` | `$search`, `$select`, `$top`, `$orderby` | Full-text search across all user pages |
| GET | `/me/onenote/sections/{sectionId}/pages?$search={query}` | `Notes.Read` | `$search`, `$top` | Scoped search within a section |
| GET | `/me/onenote/notebooks/{notebookId}/sections?$search={query}` | `Notes.Read` | `$search` | Search sections by name |
| GET | `/me/onenote/pages?$filter={filter}` | `Notes.Read` | `$filter`, `$orderby`, `$select`, `$top` | Structured filter (no full-text) |
| GET | `/me/onenote/pages?$orderby=lastModifiedDateTime desc` | `Notes.Read` | `$orderby`, `$top` | Recently modified pages |
| GET | `/me/onenote/pages/{pageId}` | `Notes.Read` | `$select=links` | Get shareable page links |

### Sharing Operations (via OneDrive/SharePoint)

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|---------------------|----------------|-------|
| POST | `/me/drive/items/{notebookItemId}/invite` | `Files.ReadWrite`, `Notes.Read` | `roles`, `recipients` | Grant notebook access |
| POST | `/me/drive/items/{notebookItemId}/createLink` | `Files.ReadWrite` | `type`, `scope` | Create shareable link |
| GET | `/me/drive/items/{notebookItemId}/permissions` | `Files.Read` | — | List notebook permissions |

---

## Code Snippets

### TypeScript — Full-Text Page Search

```typescript
import { Client } from "@microsoft/microsoft-graph-client";

interface PageSearchResult {
  id: string;
  title: string;
  createdDateTime: string;
  lastModifiedDateTime: string;
  links: { oneNoteWebUrl: { href: string } };
  parentSection?: { displayName: string };
  parentNotebook?: { displayName: string };
}

async function searchPages(
  client: Client,
  query: string,
  maxResults: number = 25
): Promise<PageSearchResult[]> {
  const result = await client
    .api("/me/onenote/pages")
    .search(query)
    .select("id,title,createdDateTime,lastModifiedDateTime,links,parentSection,parentNotebook")
    .top(maxResults)
    .orderby("lastModifiedDateTime desc")
    .expand("parentSection,parentNotebook")
    .get();

  return result.value;
}

// Usage
const results = await searchPages(client, "deployment runbook");
for (const page of results) {
  console.log(`${page.title} — in ${page.parentNotebook?.displayName}/${page.parentSection?.displayName}`);
  console.log(`  URL: ${page.links?.oneNoteWebUrl?.href}`);
}
```

### TypeScript — Scoped Search Within a Section

```typescript
async function searchInSection(
  client: Client,
  sectionId: string,
  query: string
): Promise<PageSearchResult[]> {
  const result = await client
    .api(`/me/onenote/sections/${sectionId}/pages`)
    .search(query)
    .select("id,title,lastModifiedDateTime,links")
    .top(20)
    .get();

  return result.value;
}
```

### TypeScript — Search with Filters (Date Range)

```typescript
async function getRecentlyModifiedPages(
  client: Client,
  sinceDate: Date,
  maxResults: number = 50
): Promise<PageSearchResult[]> {
  const dateStr = sinceDate.toISOString();

  const result = await client
    .api("/me/onenote/pages")
    .filter(`lastModifiedDateTime ge ${dateStr}`)
    .select("id,title,lastModifiedDateTime,links,parentSection,parentNotebook")
    .orderby("lastModifiedDateTime desc")
    .top(maxResults)
    .expand("parentSection,parentNotebook")
    .get();

  return result.value;
}
```

### TypeScript — Find Notebook's OneDrive Item ID (for Sharing)

```typescript
async function findNotebookDriveItemId(
  client: Client,
  notebookId: string
): Promise<string | null> {
  // Notebooks are stored in OneDrive; get the notebook to find its self link
  const notebook = await client
    .api(`/me/onenote/notebooks/${notebookId}`)
    .select("id,displayName,links,self")
    .get();

  // The notebook's self link contains the resource path
  // We need to search OneDrive for the notebook file
  const result = await client
    .api("/me/drive/root/search(q='.one')")
    .filter(`name eq '${notebook.displayName}.onetoc2'`)
    .select("id,name,parentReference")
    .top(5)
    .get();

  if (result.value.length > 0) {
    return result.value[0].id;
  }

  return null;
}
```

### TypeScript — Share Notebook with Specific Users

```typescript
async function shareNotebookWithUsers(
  client: Client,
  notebookDriveItemId: string,
  userEmails: string[],
  role: "read" | "write" = "read",
  message: string = "I've shared a OneNote notebook with you."
): Promise<void> {
  const recipients = userEmails.map((email) => ({ email }));

  await client
    .api(`/me/drive/items/${notebookDriveItemId}/invite`)
    .post({
      requireSignIn: true,
      sendInvitation: true,
      roles: [role],
      recipients,
      message,
    });

  console.log(`Notebook shared with ${userEmails.join(", ")} (${role})`);
}
```

### TypeScript — Create Shareable Link for a Notebook

```typescript
async function createNotebookShareLink(
  client: Client,
  notebookDriveItemId: string,
  linkType: "view" | "edit" = "view",
  scope: "anonymous" | "organization" = "organization"
): Promise<string> {
  const result = await client
    .api(`/me/drive/items/${notebookDriveItemId}/createLink`)
    .post({ type: linkType, scope });

  return result.link.webUrl;
}
```

### TypeScript — Get Page Link for Teams Embedding

```typescript
async function getPageLinks(
  client: Client,
  pageId: string
): Promise<{ webUrl: string; oneNoteClientUrl: string }> {
  const page = await client
    .api(`/me/onenote/pages/${pageId}`)
    .select("links")
    .get();

  return {
    webUrl: page.links?.oneNoteWebUrl?.href ?? "",
    oneNoteClientUrl: page.links?.oneNoteClientUrl?.href ?? "",
  };
}
```

### TypeScript — Export All Pages in a Section as Text Summaries

```typescript
async function exportSectionSummary(
  client: Client,
  sectionId: string,
  outputPath: string
): Promise<void> {
  const pages = await client
    .api(`/me/onenote/sections/${sectionId}/pages`)
    .select("id,title,createdDateTime,lastModifiedDateTime")
    .orderby("lastModifiedDateTime desc")
    .get();

  const summaries: string[] = [];

  for (const page of pages.value) {
    const content = await client
      .api(`/me/onenote/pages/${page.id}/content`)
      .get();

    // Strip HTML tags for plain text export
    const plainText = (content as string)
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .substring(0, 500);

    summaries.push(`# ${page.title}\n${plainText}\n`);
  }

  require("fs").writeFileSync(outputPath, summaries.join("\n---\n"));
  console.log(`Exported ${summaries.length} pages to ${outputPath}`);
}
```

### TypeScript — Paginate Search Results

```typescript
async function getAllSearchResults(
  client: Client,
  query: string
): Promise<PageSearchResult[]> {
  const allResults: PageSearchResult[] = [];
  let url = `/me/onenote/pages?$search=${encodeURIComponent(query)}&$top=100&$select=id,title,lastModifiedDateTime`;

  while (url) {
    const response = await client.api(url).get();
    allResults.push(...response.value);
    url = response["@odata.nextLink"] ?? null;
  }

  return allResults;
}
```

### PowerShell — Search and Export

```powershell
Connect-MgGraph -Scopes "Notes.Read", "Files.ReadWrite"

# Search for pages containing a keyword
$searchQuery = "incident response"
$results = Invoke-MgGraphRequest -Method GET `
    -Uri "https://graph.microsoft.com/v1.0/me/onenote/pages?`$search=$([Uri]::EscapeDataString($searchQuery))&`$select=title,lastModifiedDateTime,links&`$top=25"

Write-Host "Found $($results.'@odata.count') pages for '$searchQuery'"
$results.value | Select-Object title, lastModifiedDateTime, @{N="URL";E={$_.links.oneNoteWebUrl.href}}

# Get recently modified pages (last 7 days)
$since = (Get-Date).AddDays(-7).ToString("o")
$recentPages = Invoke-MgGraphRequest -Method GET `
    -Uri "https://graph.microsoft.com/v1.0/me/onenote/pages?`$filter=lastModifiedDateTime ge $since&`$orderby=lastModifiedDateTime desc&`$select=title,lastModifiedDateTime"
$recentPages.value | Format-Table title, lastModifiedDateTime

# List all pages in all sections with their notebook names
$notebooks = Invoke-MgGraphRequest -Method GET `
    -Uri "https://graph.microsoft.com/v1.0/me/onenote/notebooks?`$select=id,displayName"

foreach ($nb in $notebooks.value) {
    $sections = Invoke-MgGraphRequest -Method GET `
        -Uri "https://graph.microsoft.com/v1.0/me/onenote/notebooks/$($nb.id)/sections?`$select=id,displayName"
    foreach ($sec in $sections.value) {
        $pages = Invoke-MgGraphRequest -Method GET `
            -Uri "https://graph.microsoft.com/v1.0/me/onenote/sections/$($sec.id)/pages?`$select=title,lastModifiedDateTime&`$top=50"
        foreach ($page in $pages.value) {
            Write-Host "$($nb.displayName) / $($sec.displayName) / $($page.title)"
        }
    }
}
```

---

## Error Codes Table

| HTTP Status / Code | Meaning | Remediation |
|--------------------|---------|-------------|
| 400 BadRequest | Malformed search query or invalid filter | Check `$search` and `$filter` syntax |
| 400 searchQueryRequired | Empty search query | Provide a non-empty `$search` value |
| 403 Forbidden | User lacks access to searched notebook | Verify notebook sharing; check permission scope |
| 404 NotFound | Page or notebook resource not found | Verify IDs |
| 422 UnprocessableEntity | Search and filter cannot be combined | Use either `$search` OR `$filter`, not both |
| 429 TooManyRequests | Rate limited | Back off per `Retry-After` |
| 500 InternalServerError | Search index temporarily unavailable | Retry; search index may lag new content by minutes |
| searchNotSupported | Search not supported on this endpoint | Use `/me/onenote/pages` for search, not section endpoint |

---

## Throttling Limits Table

| Resource | Limit | Retry Strategy |
|----------|-------|----------------|
| Search requests | Counted against ~100 req/20s per app | Cache search results; avoid re-searching same query |
| Search result pages | Max 100 per page; follow `@odata.nextLink` | Always paginate |
| Search index freshness | New pages indexed within ~5-10 minutes | Retry search after delay for newly created pages |
| Filter result pages | Default 100 items; max 1000 via `$top` | Use `$top=1000` and paginate |

---

## Common Patterns and Gotchas

### 1. Search and `$filter` Cannot Be Combined

The OneNote API does not allow `$search` and `$filter` in the same request. To filter search
results, scope the search to a specific section or notebook endpoint, then apply `$filter` to
the section/notebook listing first.

### 2. OCR Content Is Not Searchable via API

Images embedded in pages (including handwritten ink and photos) are NOT indexed for text search
via the Graph API. Only typed text content in the page body is searchable. If you need OCR
search, use Azure Cognitive Search with the OneNote connector.

### 3. Search Results May Not Include Newly Created Pages

The OneNote search index has a delay (typically 5-15 minutes) before newly created pages appear
in search results. For content created programmatically in the same session, use the direct page
listing (`GET /sections/{id}/pages`) rather than search.

### 4. Sharing Notebooks Requires OneDrive Operations

The OneNote API has no native sharing endpoints. Sharing is done via OneDrive file sharing on
the underlying notebook file (`.onetoc2`). The notebook's DriveItem ID must be found first.
Use `GET /me/drive/root/search(q='.onetoc2')` filtered by notebook name to locate it.

### 5. Cross-Tenant Sharing Has Strict Limitations

OneNote notebooks stored in personal OneDrive cannot be shared with users from external tenants
unless your organization has enabled B2B collaboration. SharePoint-hosted notebooks (group
notebooks) follow the SharePoint site's external sharing policy.

### 6. `oneNoteWebUrl` Requires Sign-In

The `links.oneNoteWebUrl` from a page's GET response opens the page in OneNote Online. It
requires the recipient to sign in with an account that has access to the notebook. There is no
way to generate a "one-click open" link without authentication.

### 7. Teams Integration Uses the `oneNoteWebUrl` in a Tab

To embed a OneNote page in a Teams tab, use the Teams tab API with the OneNote app ID and the
`oneNoteWebUrl` as the content URL. The tab will load OneNote Online within Teams.

### 8. Export Limitations — No Native PDF Export via Graph

The Graph API does not offer a PDF export endpoint for OneNote. To export a page as PDF, use
the OneNote desktop client or a third-party conversion service. The `GET /content` endpoint
returns XHTML only. For print-quality export, consider rendering the XHTML with a headless
browser (Puppeteer) to PDF.
