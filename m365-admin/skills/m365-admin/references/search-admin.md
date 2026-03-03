# Microsoft Search Administration

This reference covers Microsoft Search administration — bookmarks, Q&As, and acronyms — via Microsoft Graph API.

## Required Scopes

| Operation | Scope |
|---|---|
| Read search configuration | `SearchConfiguration.Read.All` |
| Create/manage search items | `SearchConfiguration.ReadWrite.All` |

The signed-in user must have the Search Administrator or Global Administrator role.

## Bookmarks

Bookmarks are promoted search results that appear at the top when users search for specific keywords.

### List Bookmarks

```
GET https://graph.microsoft.com/v1.0/search/bookmarks
```

Supports `$filter`, `$select`, `$top`, `$skip` for pagination.

Filter by state:

```
GET https://graph.microsoft.com/v1.0/search/bookmarks?$filter=state eq 'published'
```

States: `published`, `draft`, `excluded`, `unknownFutureValue`.

### Get Single Bookmark

```
GET https://graph.microsoft.com/v1.0/search/bookmarks/{bookmarkId}
```

### Create Bookmark

```
POST https://graph.microsoft.com/v1.0/search/bookmarks
Content-Type: application/json

{
  "displayName": "IT Help Desk Portal",
  "webUrl": "https://helpdesk.contoso.com",
  "description": "Submit and track IT support tickets",
  "keywords": {
    "keywords": ["help desk", "IT support", "ticket", "support request"],
    "reservedKeywords": ["helpdesk"],
    "matchSimilarKeywords": true
  },
  "state": "published",
  "categories": ["IT Support"],
  "availabilityStartDateTime": null,
  "availabilityEndDateTime": null,
  "platforms": ["windows", "macOS", "mobile"],
  "targetedVariations": []
}
```

`reservedKeywords`: exact match only (not surfaced for other results).
`matchSimilarKeywords`: include stemmed/related terms.
`platforms`: `android`, `androidForWork`, `iOS`, `macOS`, `windows`.

### Update Bookmark

```
PATCH https://graph.microsoft.com/v1.0/search/bookmarks/{bookmarkId}
Content-Type: application/json

{
  "description": "Updated description",
  "state": "published"
}
```

### Delete Bookmark

```
DELETE https://graph.microsoft.com/v1.0/search/bookmarks/{bookmarkId}
```

## Q&As (Question and Answer)

Q&As appear when users search for specific questions, providing direct answers in the search results.

### List Q&As

```
GET https://graph.microsoft.com/v1.0/search/qnas
```

### Create Q&A

```
POST https://graph.microsoft.com/v1.0/search/qnas
Content-Type: application/json

{
  "displayName": "How do I request a new laptop?",
  "description": "Submit a request through the IT Self-Service Portal at https://itportal.contoso.com. Navigate to Hardware > New Equipment Request and fill out the form.",
  "webUrl": "https://itportal.contoso.com/hardware/new",
  "keywords": {
    "keywords": ["new laptop", "laptop request", "computer request", "hardware request"],
    "reservedKeywords": [],
    "matchSimilarKeywords": true
  },
  "state": "published"
}
```

### Update Q&A

```
PATCH https://graph.microsoft.com/v1.0/search/qnas/{qnaId}
Content-Type: application/json

{
  "description": "Updated answer text"
}
```

### Delete Q&A

```
DELETE https://graph.microsoft.com/v1.0/search/qnas/{qnaId}
```

## Acronyms

Acronyms define organization-specific abbreviations that appear when users hover over or search for the acronym.

### List Acronyms

```
GET https://graph.microsoft.com/v1.0/search/acronyms
```

### Create Acronym

```
POST https://graph.microsoft.com/v1.0/search/acronyms
Content-Type: application/json

{
  "displayName": "OKR",
  "standsFor": "Objectives and Key Results",
  "description": "A goal-setting framework used to define and track objectives and their outcomes.",
  "webUrl": "https://wiki.contoso.com/okr",
  "state": "published"
}
```

### Update Acronym

```
PATCH https://graph.microsoft.com/v1.0/search/acronyms/{acronymId}
Content-Type: application/json

{
  "description": "Updated definition"
}
```

### Delete Acronym

```
DELETE https://graph.microsoft.com/v1.0/search/acronyms/{acronymId}
```

## Bulk Import Pattern

Import search content from a structured source:

```typescript
interface BookmarkImport {
  title: string;
  url: string;
  description: string;
  keywords: string[];
}

async function importBookmarks(graphClient: Client, items: BookmarkImport[]): Promise<void> {
  const results: Array<{ title: string; status: string; error?: string }> = [];

  for (const item of items) {
    try {
      await graphClient.api("/search/bookmarks").post({
        displayName: item.title,
        webUrl: item.url,
        description: item.description,
        keywords: {
          keywords: item.keywords,
          matchSimilarKeywords: true,
        },
        state: "draft", // review before publishing
      });
      results.push({ title: item.title, status: "created" });
    } catch (err) {
      results.push({ title: item.title, status: "failed", error: String(err) });
    }
  }

  // Log results as markdown table
  console.log("| Title | Status | Error |");
  console.log("|---|---|---|");
  for (const r of results) {
    console.log(`| ${r.title} | ${r.status} | ${r.error ?? "-"} |`);
  }
}
```

## Audience Targeting

For bookmarks and Q&As, you can target specific Entra ID groups:

```
POST https://graph.microsoft.com/v1.0/search/bookmarks
Content-Type: application/json

{
  "displayName": "HR Benefits Portal",
  "webUrl": "https://hr.contoso.com/benefits",
  "keywords": {
    "keywords": ["benefits", "health insurance", "PTO", "vacation"]
  },
  "targetedVariations": [
    {
      "name": "US Employees",
      "description": "Variation targeting US-based employees",
      "webUrl": "https://hr.contoso.com/benefits/us",
      "languageTags": ["en-US"],
      "groupIds": ["us-employees-group-id"]
    }
  ],
  "state": "published"
}
```

## Availability Windows

Control when a bookmark or Q&A appears in search results:

```json
{
  "availabilityStartDateTime": "2024-01-01T00:00:00Z",
  "availabilityEndDateTime": "2024-12-31T23:59:59Z"
}
```

Useful for seasonal promotions, event announcements, or time-limited campaigns. After the end date, the item reverts to draft state.
