---
name: lists-coverage-audit
description: "Audit Microsoft Lists feature coverage against official Graph and SharePoint docs"
argument-hint: "<site-id> <list-id>"
allowed-tools:
  - Read
  - Bash
  - Glob
---

# Audit Lists Feature Coverage

Run a deterministic feature audit so Claude can report what this plugin covers for Microsoft Lists and what requires SharePoint REST or manual UI steps.

## Inputs

- `<site-id>` (required): SharePoint site ID.
- `<list-id>` (required): Target list ID.

## Prerequisites

- Graph token with `Sites.Read.All`.
- Review docs:
  - `https://learn.microsoft.com/graph/api/resources/list?view=graph-rest-1.0`
  - `https://learn.microsoft.com/graph/api/resources/listitem?view=graph-rest-1.0`
  - `https://learn.microsoft.com/graph/api/resources/columndefinition?view=graph-rest-1.0`
  - `https://learn.microsoft.com/sharepoint/dev/sp-add-ins/working-with-lists-and-list-items-with-rest`

## Step 1: Create feature matrix

| Domain | Required capability |
|---|---|
| List lifecycle | create/read/update/delete list |
| Schema management | column definitions, content types |
| Item operations | CRUD with `fields`, bulk read/filter |
| Query/filter model | OData `$filter`, `$expand=fields`, pagination |
| View management | list views and limitations in Graph |
| Security/governance | permissions expectations and safe writes |

Mark each domain as `covered`, `partial`, or `missing`.

## Step 2: Verify endpoints with live checks

```bash
curl -s "https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LIST_ID}" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq '{id, displayName, createdDateTime}'

curl -s "https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LIST_ID}/columns" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq '.value[] | {id, name, columnGroup}'

curl -s "https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LIST_ID}/items?expand=fields&$top=10" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq '.value[] | {id, fields}'
```

## Step 3: Required output format

```markdown
# Microsoft Lists Coverage Report

## Coverage Summary
| Domain | Status | Evidence | Action |
|---|---|---|---|
| Query/filter model | covered | `/lists-view-filter` + live `items?expand=fields` test | none |
| View management | partial | Graph limitations documented in SKILL | provide SharePoint REST fallback |

## Unsupported or partial areas
- [area]: [reason], [safe fallback]

## Recommended next commands
- `/lists-create`
- `/lists-add-item`
- `/lists-view-filter`
```

## Validation

- Any `partial` or `missing` row must include fallback guidance.
- Never claim Graph can fully manage list views unless API response proves it.
