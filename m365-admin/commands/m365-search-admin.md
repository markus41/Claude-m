---
name: m365-search-admin
description: Manage Microsoft Search — create and update bookmarks, Q&As, and acronyms for organizational search results.
argument-hint: "<action> [--type <bookmark|qna|acronym>] [--id <id>] [--title <text>] [--url <url>] [--keywords <k1,k2>] [--state <published|draft>] [--csvPath <path>]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
---

# Microsoft Search Administration

Manage Microsoft Search promoted results, Q&As, and acronyms via Microsoft Graph API.

## Actions

- `list` — List bookmarks, Q&As, or acronyms (specify `--type`)
- `create` — Create a single bookmark, Q&A, or acronym
- `update` — Update an existing search item
- `publish` — Change state from `draft` to `published`
- `delete` — Delete a search item
- `bulk-import` — Import from CSV (title, url, description, keywords)
- `bulk-export` — Export all items of a type to CSV
- `audit` — Report all published items with keyword coverage

## Workflow

1. **Validate context** — Confirm `tenantId` is set; verify scope `SearchConfiguration.ReadWrite.All`
2. **Parse arguments** — Determine type (bookmark/qna/acronym) and action
3. **Execute** — Call appropriate Graph endpoint
4. **Report** — Output markdown table with item ID, title, state, keywords

## Key Endpoints

| Item Type | List | Create | Update | Delete |
|---|---|---|---|---|
| Bookmarks | `GET /search/bookmarks` | `POST /search/bookmarks` | `PATCH /search/bookmarks/{id}` | `DELETE /search/bookmarks/{id}` |
| Q&As | `GET /search/qnas` | `POST /search/qnas` | `PATCH /search/qnas/{id}` | `DELETE /search/qnas/{id}` |
| Acronyms | `GET /search/acronyms` | `POST /search/acronyms` | `PATCH /search/acronyms/{id}` | `DELETE /search/acronyms/{id}` |

## CSV Format for Bulk Import (Bookmarks)

```
title,url,description,keywords,reservedKeywords,state
IT Help Desk,https://helpdesk.contoso.com,Submit IT tickets,help desk;IT support;ticket,,published
HR Portal,https://hr.contoso.com,HR information and forms,HR;benefits;PTO;vacation,,published
```

## CSV Format for Bulk Import (Q&As)

```
question,answer,url,keywords,state
How do I reset my password?,Go to https://aka.ms/sspr to reset your password,https://aka.ms/sspr,password reset;forgot password;locked out,published
```

## CSV Format for Bulk Import (Acronyms)

```
acronym,standsFor,description,url,state
OKR,Objectives and Key Results,Goal-setting framework used company-wide,https://wiki.contoso.com/okr,published
PTO,Paid Time Off,Vacation and personal leave,https://hr.contoso.com/pto,published
```

## State Values

- `published` — Visible in search results
- `draft` — Saved but not visible to users

**Best practice**: Always create as `draft`, review, then `publish`.

## Important Notes

- Requires the Search Administrator or Global Administrator role
- Keywords are case-insensitive; `matchSimilarKeywords: true` includes stemmed variants
- `reservedKeywords` are exclusive — the item always appears and prevents other results for those exact terms
- Bookmarks support audience targeting via `groupIds` in `targetedVariations`
- Availability windows (`availabilityStartDateTime`/`availabilityEndDateTime`) auto-revert to draft after end date
- Reference: `skills/m365-admin/references/search-admin.md`
