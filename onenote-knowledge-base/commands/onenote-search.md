---
name: onenote-search
description: Advanced OneNote search across notebooks with scope control, tag slicing, and recency ranking
argument-hint: "<query> [--notebook <name>] [--section <name>] [--top <count>] [--since <YYYY-MM-DD>] [--tag <#tag>]"
allowed-tools:
  - Read
  - Bash
  - Glob
  - Grep
---

# Advanced OneNote Search

Search OneNote pages with structured scope, ranking, and tag-aware slicing for large knowledge bases.

## Step 1: Resolve Scope

1. If `--notebook` is provided, resolve notebook ID from display name.
2. If `--section` is provided, resolve section ID from display name.
3. If both are provided, verify section belongs to notebook before searching.

## Step 2: Build Query Strategy

Use one of these strategies:

1. Full-text search: `GET /me/onenote/pages?$search={query}`
2. Section-scoped search: `GET /me/onenote/sections/{section-id}/pages?$search={query}`
3. Recency filter only (no `$search`): `GET /me/onenote/pages?$filter=lastModifiedDateTime ge {isoDate}`

Do not combine `$search` with `$filter` in one request.

## Step 3: Fetch and Normalize Results

1. Request fields: `id,title,lastModifiedDateTime,createdDateTime,links,parentSection,parentNotebook`.
2. Sort by `lastModifiedDateTime desc`.
3. Apply `--top` limit (default 20).

## Step 4: Apply Tag and Recency Slicing

1. If `--tag` is provided, retain pages where title or snippet contains that tag (`#todo`, `#decision`, `#risk`, etc.).
2. If `--since` is provided, keep only pages modified on or after the given date.
3. Provide counts before and after slicing.

## Step 5: Return Result Table

Return table columns:

1. Rank
2. Title
3. Notebook
4. Section
5. Last Modified
6. Tags detected
7. Web URL

## Step 6: Provide Follow-up Actions

Based on the result set, recommend one next command:

1. `/onenote-page-patch` when pages need updates.
2. `/onenote-style-apply` when style consistency is weak.
3. `/onenote-task-tracker` when unresolved to-do density is high.

## Error Handling

- 401/403: missing auth or Notes read scopes.
- 404: notebook/section resolution failed.
- 429: honor `Retry-After`, then retry once.

## Safety Rules

- Fail fast on invalid scope resolution.
- Redact object IDs in logs and user-facing output.
