---
name: ado-wiki
description: Create and manage project wikis and code wikis
argument-hint: "--action create-wiki|create-page|update-page|list|stats [--wiki <name>] [--page <path>]"
allowed-tools:
  - Read
  - Write
  - Bash
  - AskUserQuestion
---

# Manage Wikis

Create project wikis or code wikis, manage page hierarchies, bulk-create pages from templates, and view page statistics.

## Prerequisites

- Authenticated to Azure DevOps (run `/ado-setup` first)
- `Create wiki` and `Edit wiki` permissions

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `--action` | Yes | `create-wiki`, `create-page`, `update-page`, `delete-page`, `list`, `stats`, `bulk-create` |
| `--wiki` | No | Wiki name or ID |
| `--type` | No | Wiki type: `projectWiki` (default) or `codeWiki` |
| `--page` | No | Page path (e.g., `/Architecture/Overview`) |
| `--content` | No | Page content in Markdown |
| `--content-file` | No | Path to a local Markdown file for page content |
| `--repo` | No | Repository name (required for code wiki) |
| `--branch` | No | Branch (for code wiki, default: `main`) |
| `--folder` | No | Root folder in repo (for code wiki, default: `/docs`) |
| `--template-dir` | No | Local directory of Markdown files for bulk creation |

## Instructions

1. **Create project wiki** — `POST /_apis/wiki/wikis?api-version=7.1`:
   ```json
   {
     "name": "<wiki-name>",
     "type": "projectWiki"
   }
   ```

2. **Create code wiki** — `POST /_apis/wiki/wikis?api-version=7.1`:
   ```json
   {
     "name": "<wiki-name>",
     "type": "codeWiki",
     "version": { "version": "main" },
     "mappedPath": "/docs",
     "projectId": "<project-id>",
     "repositoryId": "<repo-id>"
   }
   ```

3. **Create page** — `PUT /_apis/wiki/wikis/{wikiId}/pages?path={pagePath}&api-version=7.1`:
   - Body: `{ "content": "# Page Title\n\nContent here..." }`
   - Set `Content-Type: application/json`
   - Parent pages are auto-created from path hierarchy

4. **Update page** — same endpoint as create but include `If-Match` header with the page's current ETag (from GET response).

5. **Delete page** — `DELETE /_apis/wiki/wikis/{wikiId}/pages?path={pagePath}&api-version=7.1`.

6. **List pages** — `GET /_apis/wiki/wikis/{wikiId}/pages?recursionLevel=full&api-version=7.1`
   Display page tree with paths and last updated dates.

7. **Bulk-create** — if `--template-dir` is specified:
   - Scan the directory for `.md` files
   - Map file paths to wiki page paths (strip extension, use directory structure)
   - Create each page via the API
   - Report: pages created, skipped (already exist), failed

8. **Page statistics** — `GET /_apis/wiki/wikis/{wikiId}/pages/{pageId}/stats?pageViewsForDays=30&api-version=7.1`
   Display: Total views, unique viewers, view trend over last 30 days.

## Examples

```bash
/ado-wiki --action create-wiki --type projectWiki --wiki "Engineering Wiki"
/ado-wiki --action create-wiki --type codeWiki --wiki "API Docs" --repo my-api --branch main --folder /docs
/ado-wiki --action create-page --wiki "Engineering Wiki" --page "/Architecture/Overview" --content-file ./docs/arch.md
/ado-wiki --action bulk-create --wiki "Engineering Wiki" --template-dir ./wiki-templates
/ado-wiki --action stats --wiki "Engineering Wiki" --page "/Architecture/Overview"
```

## Error Handling

- **Wiki already exists**: Cannot create duplicate wiki names — use a different name or manage existing wiki.
- **Page not found**: Verify the page path. Paths are case-sensitive and use forward slashes.
- **ETag mismatch**: Page was modified since last read — re-fetch and retry update.
- **Code wiki repo not found**: Verify repository name and branch exist.
