# Azure DevOps — Wiki Management Reference

## Overview

Azure DevOps provides two wiki types: **Project wikis** (one per project, stored in a hidden Git repo managed by the service) and **Code wikis** (published from any folder in any Git repo). Both use Markdown for content and support page hierarchies, attachments, and page analytics. The REST API provides full CRUD for wikis and pages, including ETag-based concurrency control for concurrent edits. This reference covers wiki creation, page management, attachments, analytics, and the CLI commands for wiki operations.

---

## Wiki REST API

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|---------------------|----------------|-------|
| GET | `/_apis/wiki/wikis?api-version=7.1` | Wiki (Read) | — | List all wikis in the project |
| POST | `/_apis/wiki/wikis?api-version=7.1` | Wiki (Create) | Body: `name`, `type`, `projectId` (+ `repositoryId`, `mappedPath`, `version` for code wiki) | Create a wiki |
| GET | `/_apis/wiki/wikis/{wikiId}?api-version=7.1` | Wiki (Read) | — | Get wiki details |
| DELETE | `/_apis/wiki/wikis/{wikiId}?api-version=7.1` | Wiki (Create) | — | Delete wiki (code wiki only; project wiki cannot be deleted) |
| GET | `/_apis/wiki/wikis/{wikiId}/pages?path={path}&api-version=7.1` | Wiki (Read) | `path`, `recursionLevel` (`oneLevel`, `full`), `includeContent` | Get page metadata (and optionally content) |
| PUT | `/_apis/wiki/wikis/{wikiId}/pages?path={path}&api-version=7.1` | Wiki (Read & Write) | Body: `{ content }`, Header: `If-Match` (ETag) or `If-None-Match: *` | Create or update a page |
| DELETE | `/_apis/wiki/wikis/{wikiId}/pages?path={path}&api-version=7.1` | Wiki (Read & Write) | `path`, `comment` | Delete a page and its sub-pages |
| POST | `/_apis/wiki/wikis/{wikiId}/pages/{pageId}/moves?api-version=7.1` | Wiki (Read & Write) | Body: `path` (new), `order` | Move or reorder a page |
| GET | `/_apis/wiki/wikis/{wikiId}/pages/{pageId}/stats?api-version=7.1` | Wiki (Read) | `pageViewsForDays` (1-30) | Page view statistics |

---

## Wiki Types

### Project Wiki

- **One per project**, automatically backed by a hidden Git repo.
- Created through the UI or API. Cannot be deleted via API (only the project admin can remove it from settings).
- URL format: `https://dev.azure.com/{org}/{project}/_wiki/wikis/{project}.wiki`

```json
POST https://dev.azure.com/myorg/myproject/_apis/wiki/wikis?api-version=7.1
Content-Type: application/json

{
  "name": "MyProject.wiki",
  "type": "projectWiki",
  "projectId": "<project-guid>"
}
```

### Code Wiki

- Published from a specific folder in a Git repo. Multiple code wikis per project are supported.
- Content is managed through normal Git operations (commits, PRs) in the source repo.

```json
POST https://dev.azure.com/myorg/myproject/_apis/wiki/wikis?api-version=7.1
Content-Type: application/json

{
  "name": "API Documentation",
  "type": "codeWiki",
  "projectId": "<project-guid>",
  "repositoryId": "<repo-guid>",
  "mappedPath": "/docs/wiki",
  "version": {
    "version": "main",
    "versionType": "branch"
  }
}
```

**Gotcha**: The `mappedPath` folder must exist in the repo and contain at least one `.md` file, or the wiki will appear empty.

---

## Page CRUD Operations

### Creating a Page

```bash
curl -u ":$PAT" \
  -H "Content-Type: application/json" \
  -H "If-None-Match: *" \
  -X PUT "https://dev.azure.com/myorg/myproject/_apis/wiki/wikis/MyProject.wiki/pages?path=/Architecture/Overview&api-version=7.1" \
  -d '{
    "content": "# Architecture Overview\n\nThis document describes the system architecture.\n\n## Components\n\n- **API Gateway**: Routes requests to backend services\n- **Auth Service**: Handles OAuth 2.0 / OIDC\n- **Data Layer**: PostgreSQL + Redis cache\n"
  }'
```

The `If-None-Match: *` header ensures the page does not already exist. The API returns `409 Conflict` if the page exists.

### Updating a Page (ETag Concurrency)

```bash
# 1. Get current page with ETag
RESPONSE=$(curl -s -D - -u ":$PAT" \
  "https://dev.azure.com/myorg/myproject/_apis/wiki/wikis/MyProject.wiki/pages?path=/Architecture/Overview&includeContent=true&api-version=7.1")

ETAG=$(echo "$RESPONSE" | grep -i "ETag:" | tr -d '\r' | awk '{print $2}')

# 2. Update with the ETag
curl -u ":$PAT" \
  -H "Content-Type: application/json" \
  -H "If-Match: $ETAG" \
  -X PUT "https://dev.azure.com/myorg/myproject/_apis/wiki/wikis/MyProject.wiki/pages?path=/Architecture/Overview&api-version=7.1" \
  -d '{
    "content": "# Architecture Overview\n\nUpdated architecture documentation.\n\n## Components\n\n- **API Gateway**: Kong with rate limiting\n- **Auth Service**: Entra ID integration\n- **Data Layer**: Cosmos DB + Redis\n- **Message Bus**: Azure Service Bus\n"
  }'
```

The `If-Match` header prevents overwriting concurrent edits. If the ETag does not match, the API returns `412 Precondition Failed`.

### Reading a Page

```bash
# Get page content
curl -u ":$PAT" \
  "https://dev.azure.com/myorg/myproject/_apis/wiki/wikis/MyProject.wiki/pages?path=/Architecture/Overview&includeContent=true&api-version=7.1"

# List sub-pages (one level)
curl -u ":$PAT" \
  "https://dev.azure.com/myorg/myproject/_apis/wiki/wikis/MyProject.wiki/pages?path=/Architecture&recursionLevel=oneLevel&api-version=7.1"

# List all pages (full tree)
curl -u ":$PAT" \
  "https://dev.azure.com/myorg/myproject/_apis/wiki/wikis/MyProject.wiki/pages?path=/&recursionLevel=full&api-version=7.1"
```

### Deleting a Page

```bash
curl -u ":$PAT" \
  -X DELETE \
  "https://dev.azure.com/myorg/myproject/_apis/wiki/wikis/MyProject.wiki/pages?path=/Architecture/Legacy&comment=Removed%20legacy%20docs&api-version=7.1"
```

Deleting a page also deletes all sub-pages beneath it.

---

## Page Ordering and Sub-Pages

### Page Hierarchy

Wiki pages use path-based hierarchy:
- `/` — root
- `/Architecture` — top-level page
- `/Architecture/Overview` — sub-page
- `/Architecture/Overview/Diagrams` — nested sub-page

### Reordering Pages

```json
POST https://dev.azure.com/myorg/myproject/_apis/wiki/wikis/MyProject.wiki/pages/{pageId}/moves?api-version=7.1
Content-Type: application/json

{
  "path": "/Architecture/Overview",
  "order": 1
}
```

Order is zero-based within the parent. Set `order: 0` to make a page the first child.

### Moving Pages

```json
{
  "path": "/Design/Architecture-Overview",
  "order": 0
}
```

This moves the page from its current location to `/Design/Architecture-Overview`.

---

## Wiki Attachments

Wiki attachments are stored as files within the wiki's backing Git repo. They are referenced from page content using relative paths.

### Adding an Image

Upload the image to the wiki's Git repo (for project wikis, the hidden wiki repo):

```bash
# For project wikis, attachments are embedded inline via the page content
# Reference format in Markdown:
# ![alt text](/.attachments/image-name.png)

# Upload via page update — include the image in the .attachments folder
curl -u ":$PAT" \
  -H "Content-Type: application/octet-stream" \
  -H "If-None-Match: *" \
  -X PUT "https://dev.azure.com/myorg/myproject/_apis/wiki/wikis/MyProject.wiki/pages?path=/.attachments/architecture-diagram.png&api-version=7.1" \
  --data-binary @architecture-diagram.png
```

Then reference in your page:

```markdown
## Architecture Diagram

![System Architecture](/.attachments/architecture-diagram.png)
```

For code wikis, commit image files to the repo's mapped path and reference them with relative paths.

---

## Page Statistics

```bash
# Get page view stats for the last 7 days
curl -u ":$PAT" \
  "https://dev.azure.com/myorg/myproject/_apis/wiki/wikis/MyProject.wiki/pages/{pageId}/stats?pageViewsForDays=7&api-version=7.1"
```

Response:

```json
{
  "path": "/Architecture/Overview",
  "viewCount": 42,
  "viewsByDay": [
    { "date": "2026-02-26T00:00:00Z", "count": 8 },
    { "date": "2026-02-27T00:00:00Z", "count": 5 },
    { "date": "2026-02-28T00:00:00Z", "count": 12 },
    { "date": "2026-03-01T00:00:00Z", "count": 6 },
    { "date": "2026-03-02T00:00:00Z", "count": 3 },
    { "date": "2026-03-03T00:00:00Z", "count": 4 },
    { "date": "2026-03-04T00:00:00Z", "count": 4 }
  ]
}
```

---

## Markdown Rendering Differences

Azure DevOps wiki Markdown has several extensions and differences from standard CommonMark:

| Feature | Syntax | Notes |
|---------|--------|-------|
| Table of Contents | `[[_TOC_]]` | Auto-generates from headings |
| Sub-pages | `[[_TOSP_]]` | Lists sub-pages of current page |
| Mermaid diagrams | ` ```mermaid ` | Inline Mermaid chart rendering |
| Math (LaTeX) | `$inline$` or `$$block$$` | KaTeX rendering |
| Work item mentions | `#123` | Links to work item 123 |
| PR mentions | `!456` | Links to pull request 456 |
| Person mentions | `@<user@company.com>` | Generates notification |
| Wiki page links | `[text](/Page-Name)` | Spaces become hyphens in URLs |
| Query results | `[text](/_queries/query-id)` | Embeds WIQL query results (read-only) |

**Gotcha**: Wiki page URL paths use hyphens for spaces. A page named "Getting Started" has the path `/Getting-Started`. However, the API `path` parameter uses the display name with spaces.

---

## CLI Reference

```bash
# List wikis
az devops wiki list --project MyProject --org https://dev.azure.com/myorg

# Create a project wiki
az devops wiki create --name "MyProject Wiki" --type projectWiki \
  --project MyProject --org https://dev.azure.com/myorg

# Create a code wiki
az devops wiki create --name "API Docs" --type codeWiki \
  --repository MyRepo --mapped-path /docs --version main \
  --project MyProject --org https://dev.azure.com/myorg

# Create a page
az devops wiki page create --wiki MyProject.wiki \
  --path "/Architecture/Overview" \
  --content "# Architecture Overview" \
  --project MyProject --org https://dev.azure.com/myorg

# Update a page
az devops wiki page update --wiki MyProject.wiki \
  --path "/Architecture/Overview" \
  --content "# Updated Architecture Overview" \
  --version <etag-version> \
  --project MyProject --org https://dev.azure.com/myorg

# Show a page
az devops wiki page show --wiki MyProject.wiki \
  --path "/Architecture/Overview" --include-content \
  --project MyProject --org https://dev.azure.com/myorg

# Delete a page
az devops wiki page delete --wiki MyProject.wiki \
  --path "/Architecture/Legacy" \
  --project MyProject --org https://dev.azure.com/myorg
```

---

## Limits and Gotchas

- **One project wiki per project**: attempting to create a second project wiki returns an error.
- **Project wiki deletion**: project wikis cannot be deleted via the REST API. Only org admins can remove them from project settings.
- **ETag required for updates**: updating a page without the `If-Match` header returns `400 Bad Request`. Always read the page first to get the current ETag.
- **Page path encoding**: paths with special characters must be URL-encoded. Spaces in display names become hyphens in URL paths but remain as spaces in the API `path` parameter.
- **Code wiki branch lock**: code wikis are tied to a specific branch. Deleting or renaming that branch breaks the wiki.
- **Attachment size limit**: max 100 MB per attachment file.
- **Page content size**: no documented hard limit, but pages over 1 MB render slowly and may timeout in the UI.
- **Concurrent edits**: without ETag checks, the last write wins. Always use `If-Match` for production automation.
- **Wiki search**: wiki content is indexed for Azure DevOps search. New or updated pages may take up to 10 minutes to appear in search results.
