# Microsoft Search API

Reference for Microsoft Search Graph API (`POST /search/query`) — KQL query syntax, result types, refiners, pagination, managed properties, verticals, and the Graph Search vs SharePoint Search REST API comparison.

---

## Overview

The Microsoft Search API is the unified search surface for Microsoft 365 content. It provides:

- Full-text and property-scoped queries against SharePoint, OneDrive, Exchange, and external connectors
- KQL (Keyword Query Language) syntax for advanced filtering
- Aggregations/refiners for faceted search
- Bookmarks, Q&A, Acronyms, Floor Plans for editorial search answers

**Base URL**: `https://graph.microsoft.com/v1.0/search/query`

---

## Key Endpoints

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|---|---|---|---|---|
| POST | `/search/query` | `Sites.Read.All` (for file search) | `requests[]` body | Main search endpoint |
| GET | `/search/bookmarks` | `SearchConfiguration.ReadWrite.All` | `$filter`, `$select` | List editorial bookmarks |
| POST | `/search/bookmarks` | `SearchConfiguration.ReadWrite.All` | JSON body | Create bookmark |
| PATCH | `/search/bookmarks/{id}` | `SearchConfiguration.ReadWrite.All` | JSON body | Update bookmark |
| DELETE | `/search/bookmarks/{id}` | `SearchConfiguration.ReadWrite.All` | — | Delete bookmark |
| GET | `/search/qnas` | `SearchConfiguration.ReadWrite.All` | `$filter` | List Q&A answers |
| POST | `/search/qnas` | `SearchConfiguration.ReadWrite.All` | JSON body | Create Q&A |
| GET | `/search/acronyms` | `SearchConfiguration.ReadWrite.All` | `$filter` | List acronyms |
| POST | `/search/acronyms` | `SearchConfiguration.ReadWrite.All` | JSON body | Create acronym |

---

## POST /search/query — Request Structure

```http
POST https://graph.microsoft.com/v1.0/search/query
Content-Type: application/json
Authorization: Bearer {token}

{
  "requests": [
    {
      "entityTypes": ["driveItem"],
      "query": {
        "queryString": "project alpha filetype:docx"
      },
      "from": 0,
      "size": 25,
      "fields": ["id", "name", "webUrl", "createdDateTime", "lastModifiedDateTime", "size", "parentReference"],
      "sortProperties": [
        { "name": "lastModifiedDateTime", "isDescending": true }
      ]
    }
  ]
}
```

---

## Entity Types

| entityType | What it searches | Key fields available |
|---|---|---|
| `driveItem` | Files and folders in SharePoint and OneDrive | `id`, `name`, `webUrl`, `size`, `file`, `parentReference` |
| `listItem` | SharePoint list items (any list, not just document libraries) | `id`, `webUrl`, `fields` (custom columns) |
| `site` | SharePoint site collections | `id`, `displayName`, `webUrl`, `description` |
| `list` | SharePoint document libraries and lists | `id`, `displayName`, `webUrl` |
| `drive` | Drives (document libraries) | `id`, `name`, `webUrl` |
| `message` | Exchange email messages | `id`, `subject`, `from`, `receivedDateTime` |
| `event` | Calendar events | `id`, `subject`, `start`, `end` |
| `externalItem` | Content from connectors (external sources) | Varies by connector schema |
| `person` | People (Delve/people search) | `id`, `displayName`, `jobTitle`, `emailAddresses` |

---

## KQL Query Syntax for SharePoint

### Basic KQL Patterns

```
# Full-text search
project budget

# Exact phrase
"project budget 2025"

# Boolean operators
project AND budget
project OR estimate
project NOT draft

# Property filters
author:"Jane Doe"
filetype:xlsx
contenttype:Document

# Date ranges
lastmodifiedtime>=2025-01-01
lastmodifiedtime>=2025-01-01 AND lastmodifiedtime<=2025-12-31

# File size
size>1048576      # > 1 MB
size<10485760     # < 10 MB

# Site scope
site:https://contoso.sharepoint.com/sites/finance
path:https://contoso.sharepoint.com/sites/finance/Shared Documents

# Wildcards (prefix only, no suffix)
contract*

# Title property
title:"Q4 Report"
```

### Managed Properties in KQL

Managed properties exposed by SharePoint Search can be used in queries:

| Managed Property | Maps to | Example |
|---|---|---|
| `Title` | File title / display name | `Title:"Budget Report"` |
| `Author` | Created by | `Author:"John Smith"` |
| `ModifiedBy` | Last modified by | `ModifiedBy:"Jane Doe"` |
| `Created` | Created date | `Created>=2025-01-01` |
| `LastModifiedTime` | Last modified | `LastModifiedTime>=2025-01-01` |
| `FileExtension` | File extension (no dot) | `FileExtension:xlsx` |
| `ContentType` | SharePoint content type name | `ContentType:Contract` |
| `Path` | Full file URL | `Path:contoso.sharepoint.com/sites/legal` |
| `Department` | Custom managed property | `Department:Finance` |
| `Size` | File size in bytes | `Size>1048576` |

---

## Pagination: from/size

The Search API uses `from` and `size` (not `$skip`/`$top`):

```typescript
const pageSize = 25;
let from = 0;
let total = Infinity;
const allResults: unknown[] = [];

while (from < total) {
  const response = await client.api("/search/query").post({
    requests: [{
      entityTypes: ["driveItem"],
      query: { queryString: "contract filetype:pdf" },
      from,
      size: pageSize,
    }],
  });

  const hitContainer = response.value[0].hitsContainers[0];
  total = hitContainer.total;
  allResults.push(...(hitContainer.hits ?? []));
  from += pageSize;

  if (!hitContainer.moreResultsAvailable) break;
}

console.log(`Found ${total} total results, fetched ${allResults.length}`);
```

**Maximum `size` per request**: 500. Maximum total results retrievable: varies by entity type (typically 10,000 for driveItem).

---

## Search Refiners (Aggregations)

Refiners return facet counts for building UI filters:

```http
POST https://graph.microsoft.com/v1.0/search/query
Content-Type: application/json

{
  "requests": [
    {
      "entityTypes": ["driveItem"],
      "query": { "queryString": "contract" },
      "from": 0,
      "size": 10,
      "aggregations": [
        {
          "field": "FileExtension",
          "size": 10,
          "bucketDefinition": {
            "sortBy": "count",
            "isDescending": true,
            "minimumCount": 1
          }
        },
        {
          "field": "Author",
          "size": 5,
          "bucketDefinition": { "sortBy": "count", "isDescending": true, "minimumCount": 1 }
        }
      ]
    }
  ]
}
```

Response includes `aggregations` alongside `hits`:

```json
{
  "aggregations": [
    {
      "field": "FileExtension",
      "buckets": [
        { "key": "docx", "count": 142 },
        { "key": "pdf",  "count": 89  },
        { "key": "xlsx", "count": 34  }
      ]
    }
  ]
}
```

---

## Sort Options

```json
"sortProperties": [
  { "name": "lastModifiedDateTime", "isDescending": true },
  { "name": "name", "isDescending": false }
]
```

Note: Custom managed properties are sortable only if configured as sortable in the Search Schema. Not all properties support sorting.

---

## TypeScript Code Snippets

### Search Files with Typed Response

```typescript
import { Client } from "@microsoft/microsoft-graph-client";

interface SearchHit {
  hitId: string;
  rank: number;
  score: number;
  resource: {
    "@odata.type": string;
    id: string;
    name: string;
    webUrl: string;
    size?: number;
    createdDateTime?: string;
    lastModifiedDateTime?: string;
    parentReference?: { driveId: string; path: string };
  };
}

interface SearchResult {
  total: number;
  moreResultsAvailable: boolean;
  hits: SearchHit[];
}

export async function searchFiles(
  client: Client,
  queryString: string,
  options?: { from?: number; size?: number; entityTypes?: string[] }
): Promise<SearchResult> {
  const response = await client.api("/search/query").post({
    requests: [{
      entityTypes: options?.entityTypes ?? ["driveItem"],
      query: { queryString },
      from: options?.from ?? 0,
      size: options?.size ?? 25,
      fields: ["id", "name", "webUrl", "size", "createdDateTime", "lastModifiedDateTime", "parentReference"],
    }],
  });

  const container = response.value[0].hitsContainers[0];
  return {
    total: container.total,
    moreResultsAvailable: container.moreResultsAvailable ?? false,
    hits: container.hits ?? [],
  };
}
```

### PowerShell Search

```powershell
# Search via Graph API using PowerShell
$body = @{
  requests = @(
    @{
      entityTypes = @("driveItem")
      query = @{ queryString = "contract filetype:pdf" }
      from = 0
      size = 25
    }
  )
} | ConvertTo-Json -Depth 10

$response = Invoke-MgGraphRequest -Method POST -Uri "https://graph.microsoft.com/v1.0/search/query" -Body $body
$hits = $response.value[0].hitsContainers[0].hits
$hits | ForEach-Object { Write-Host $_.resource.name, $_.resource.webUrl }
```

---

## Bookmarks API

Bookmarks are editorial search answers that promote specific results for matching queries.

```http
POST https://graph.microsoft.com/v1.0/search/bookmarks
Content-Type: application/json

{
  "displayName": "IT Help Desk",
  "webUrl": "https://contoso.sharepoint.com/sites/helpdesk",
  "description": "Submit and track IT support tickets",
  "keywords": {
    "keywords": ["help desk", "IT support", "submit ticket"],
    "matchSimilarKeywords": true,
    "reservedKeywords": ["helpdesk"]
  },
  "state": "published",
  "categories": ["IT"],
  "availabilityStartDateTime": null,
  "availabilityEndDateTime": null
}
```

`state` values: `draft` (not visible in search), `published` (live).

---

## Graph Search vs SharePoint Search REST API

| Feature | Graph `/search/query` | SharePoint Search REST `/_api/search/query` |
|---|---|---|
| Scope | Cross-M365 (SharePoint, Exchange, Teams, connectors) | SharePoint and OneDrive only |
| Authentication | Bearer token (Graph permissions) | SharePoint session cookie or app-only token |
| KQL support | Yes (subset) | Yes (full SharePoint KQL) |
| Managed properties | Yes (configured ones) | Yes (all) |
| People search | Yes (`person` entity type) | Via people endpoint |
| External connector content | Yes | No |
| Result source override | No (use connectors instead) | Yes (custom result sources) |
| Spelling suggestions | Not exposed | Yes (`SpellingSuggestion` in response) |
| Best Bets / Promotions | Via Bookmarks API | Via promoted results |
| Pagination | `from`/`size` | `startrow`/`rowlimit` |
| Max results per page | 500 | 500 |
| Total result limit | ~10,000 | Configurable per result source |
| Aggregations/Refiners | Yes | Yes (`refiners` parameter) |
| Sort by managed property | Yes (if sortable) | Yes |

---

## Error Codes Table

| HTTP Status | Graph Code | Meaning | Remediation |
|---|---|---|---|
| 400 | `BadRequest` | Invalid entity type or malformed query | Check `entityTypes` spelling; validate KQL syntax |
| 400 | `InvalidRequest` | Invalid `from` or `size` values | Ensure `from >= 0` and `1 <= size <= 500` |
| 401 | `InvalidAuthenticationToken` | Token expired | Re-acquire token |
| 403 | `Authorization_RequestDenied` | Missing `Sites.Read.All` scope | Add permission and consent |
| 404 | `Request_ResourceNotFound` | Bookmark/Q&A/Acronym ID not found | Verify ID from list call |
| 429 | `TooManyRequests` | Search API rate limited | Honor `Retry-After`; reduce request frequency |
| 500 | `InternalServerError` | Search index transient issue | Retry after 5–10 seconds |

---

## Throttling Limits

| Resource | Limit | Notes |
|---|---|---|
| POST `/search/query` global | 10,000 req / 10 min per app per tenant | Shared with all Graph API throttle budget |
| Bookmarks per tenant | 3,000 | Hard limit |
| Q&A per tenant | 3,000 | Hard limit |
| Acronyms per tenant | 1,000 | Hard limit |
| `size` per request | 500 | Maximum items per search call |
| Total pages fetchable | ~10,000 items via `from`+`size` | Index depth limit varies by content type |

---

## Common Gotchas

- **`from` + `size` must not exceed 10,000**: The combination of `from + size` cannot exceed the search index depth. Attempting `from: 9990, size: 100` may return fewer results or an error.
- **`fields` array is case-sensitive**: The `fields` array in the request uses camelCase Graph property names, not SharePoint managed property names. Use `webUrl` not `WebUrl`, `lastModifiedDateTime` not `LastModifiedTime`.
- **driveItem vs listItem for custom columns**: SharePoint custom column values are only returned when querying `listItem` entity type, not `driveItem`. For files in a document library with custom columns, query `listItem` and expand fields.
- **External connector content requires `externalItem`**: Files from non-Microsoft sources indexed via Graph connectors must use `entityTypes: ["externalItem"]`. They do not appear in `driveItem` results.
- **Graph Search has no result source concept**: SharePoint Search REST supports custom result sources that scope queries to specific lists or content types. Graph Search does not. Use `path:` KQL operator or site-scoped queries as an equivalent.
- **Bookmarks reserved keywords are exclusive**: A `reservedKeyword` always shows the bookmark first, pre-empting organic results. Use sparingly to avoid poor search experience.
