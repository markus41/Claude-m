---
name: Microsoft Lists Tracker
description: >
  Deep expertise in Microsoft Lists (SharePoint Lists) via Graph API — create lists with custom
  columns, add and update items, filter with OData queries, manage views and content types,
  and build lightweight process trackers for issue logs, hiring pipelines, inventory, and projects.
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
triggers:
  - lists
  - microsoft lists
  - sharepoint lists
  - tracker
  - issue log
  - project tracker
  - inventory list
  - list items
  - list columns
  - coverage audit
  - feature gap
  - documentation coverage
---

# Microsoft Lists Tracker

## Overview

Microsoft Lists is a structured data tracking app built on SharePoint Lists. It provides a flexible grid/form interface for managing tabular data — issue logs, hiring pipelines, inventory trackers, project status boards, and any other process that needs rows, columns, and views. Unlike Planner (which is task-focused) or SharePoint document libraries (which are file-focused), Lists is designed for **structured data records** with custom columns, validation, and filtering.

Under the hood, every Microsoft List is a SharePoint List. The Graph API endpoints are the same SharePoint Sites/Lists endpoints. Lists created in the Microsoft Lists app appear in the parent SharePoint site, and vice versa.

**Best fit**: Small teams (20 people or fewer) that need lightweight process tracking without a full database or project management tool.

## Documentation Coverage Audit

Use `/lists-coverage-audit <site-id> <list-id>` to validate feature coverage against Microsoft Graph and SharePoint REST documentation.

Coverage reports must separate Graph-supported operations from SharePoint REST/UI-only functionality, especially for advanced list view management.

## Base URL

```
https://graph.microsoft.com/v1.0
```

All endpoints below are relative to this base URL.

## API Endpoints

### Sites

| Operation | Method | Endpoint |
|-----------|--------|----------|
| Get root site | GET | `/sites/root` |
| Get site by hostname and path | GET | `/sites/{hostname}:/{path}` |
| Get site by ID | GET | `/sites/{site-id}` |
| Search sites | GET | `/sites?search={query}` |
| List subsites | GET | `/sites/{site-id}/sites` |

**Resolve a site ID from URL**: If the user has a SharePoint URL like `https://contoso.sharepoint.com/sites/Operations`, resolve it:
```
GET /sites/contoso.sharepoint.com:/sites/Operations
```

The response `id` field (format: `contoso.sharepoint.com,<guid>,<guid>`) is used in all subsequent list operations.

### Lists

| Operation | Method | Endpoint |
|-----------|--------|----------|
| List all lists on a site | GET | `/sites/{site-id}/lists` |
| Get list by ID | GET | `/sites/{site-id}/lists/{list-id}` |
| Get list by display name | GET | `/sites/{site-id}/lists/{display-name}` |
| Create list | POST | `/sites/{site-id}/lists` |
| Update list | PATCH | `/sites/{site-id}/lists/{list-id}` |
| Delete list | DELETE | `/sites/{site-id}/lists/{list-id}` |

**Create list body**:
```json
{
  "displayName": "Issue Tracker",
  "list": {
    "template": "genericList"
  }
}
```

Available `template` values for custom lists: `genericList`. Other values (`documentLibrary`, `survey`, etc.) create different list types.

### Columns

| Operation | Method | Endpoint |
|-----------|--------|----------|
| List columns | GET | `/sites/{site-id}/lists/{list-id}/columns` |
| Get column | GET | `/sites/{site-id}/lists/{list-id}/columns/{column-id}` |
| Create column | POST | `/sites/{site-id}/lists/{list-id}/columns` |
| Update column | PATCH | `/sites/{site-id}/lists/{list-id}/columns/{column-id}` |
| Delete column | DELETE | `/sites/{site-id}/lists/{list-id}/columns/{column-id}` |

### Items

| Operation | Method | Endpoint |
|-----------|--------|----------|
| List items | GET | `/sites/{site-id}/lists/{list-id}/items` |
| List items with fields | GET | `/sites/{site-id}/lists/{list-id}/items?expand=fields` |
| Get item | GET | `/sites/{site-id}/lists/{list-id}/items/{item-id}` |
| Get item with fields | GET | `/sites/{site-id}/lists/{list-id}/items/{item-id}?expand=fields` |
| Create item | POST | `/sites/{site-id}/lists/{list-id}/items` |
| Update item | PATCH | `/sites/{site-id}/lists/{list-id}/items/{item-id}` |
| Update item fields | PATCH | `/sites/{site-id}/lists/{list-id}/items/{item-id}/fields` |
| Delete item | DELETE | `/sites/{site-id}/lists/{list-id}/items/{item-id}` |

**Create item body**:
```json
{
  "fields": {
    "Title": "Onboard new developer",
    "Status": "Not Started",
    "Owner": "Alex Kim",
    "DueDate": "2026-03-20",
    "Priority": "High"
  }
}
```

**Update item fields** (partial update):
```json
{
  "Status": "In Progress",
  "PercentComplete": 25
}
```

### Content Types

| Operation | Method | Endpoint |
|-----------|--------|----------|
| List content types | GET | `/sites/{site-id}/lists/{list-id}/contentTypes` |
| Get content type | GET | `/sites/{site-id}/lists/{list-id}/contentTypes/{contentType-id}` |
| Add content type | POST | `/sites/{site-id}/lists/{list-id}/contentTypes/addCopy` |

**Add content type body**:
```json
{
  "contentType": {
    "@odata.id": "https://graph.microsoft.com/v1.0/sites/{site-id}/contentTypes/{contentType-id}"
  }
}
```

### Views (List Views)

List views are not fully manageable through Graph API v1.0, but you can read them:

| Operation | Method | Endpoint |
|-----------|--------|----------|
| List views | GET | `/sites/{site-id}/lists/{list-id}/columns` |

For advanced view management (custom views with filters and sorting), use the SharePoint REST API or configure views through the SharePoint/Lists UI. The Graph API supports item-level filtering via OData query parameters as an alternative.

## Column Type Reference

### Text
```json
{
  "name": "Description",
  "text": {
    "allowMultipleLines": false,
    "appendChangesToExistingText": false,
    "linesForEditing": 0,
    "maxLength": 255
  }
}
```

For multi-line text, set `allowMultipleLines: true` and increase `maxLength` up to 63999.

### Number
```json
{
  "name": "Quantity",
  "number": {
    "decimalPlaces": "none",
    "displayAs": "number",
    "minimum": 0,
    "maximum": 999999
  }
}
```

`decimalPlaces` options: `"automatic"`, `"none"`, `"one"`, `"two"`, `"three"`, `"four"`, `"five"`.

### Choice
```json
{
  "name": "Status",
  "choice": {
    "allowTextEntry": false,
    "choices": ["Open", "In Progress", "Resolved", "Closed"],
    "displayAs": "dropDownMenu"
  }
}
```

`displayAs` options: `"checkBoxes"`, `"dropDownMenu"`, `"radioButtons"`.

### DateTime
```json
{
  "name": "DueDate",
  "dateTime": {
    "displayAs": "default",
    "format": "dateOnly"
  }
}
```

`format` options: `"dateOnly"`, `"dateTime"`.

### Boolean
```json
{
  "name": "IsActive",
  "boolean": {}
}
```

Boolean columns have no additional configuration. Values are `true` or `false`.

### PersonOrGroup
```json
{
  "name": "AssignedTo",
  "personOrGroup": {
    "allowMultipleSelection": false,
    "chooseFromType": "peopleOnly",
    "displayAs": "nameWithPresence"
  }
}
```

`chooseFromType` options: `"peopleAndGroups"`, `"peopleOnly"`.

When setting person fields on items, use the `LookupId` suffix:
```json
{ "AssignedToLookupId": 12 }
```

### Currency
```json
{
  "name": "Budget",
  "currency": {
    "locale": "en-US"
  }
}
```

Common locale values: `"en-US"`, `"en-GB"`, `"de-DE"`, `"fr-FR"`, `"ja-JP"`.

### HyperlinkOrPicture
```json
{
  "name": "DocumentLink",
  "hyperlinkOrPicture": {
    "isPicture": false
  }
}
```

Values are stored as `"URL, Description"` format:
```json
{ "DocumentLink": "https://contoso.sharepoint.com/docs/spec.pdf, Requirements Spec" }
```

### Calculated
```json
{
  "name": "TotalCost",
  "calculated": {
    "formula": "=[Quantity]*[UnitCost]",
    "outputType": "number"
  }
}
```

`outputType` options: `"boolean"`, `"currency"`, `"dateTime"`, `"number"`, `"text"`.

## OData Filter Syntax

List items support OData query parameters for filtering, sorting, and selecting fields.

### Filter operators

| Operator | Description | Example |
|----------|-------------|---------|
| `eq` | Equals | `fields/Status eq 'Open'` |
| `ne` | Not equals | `fields/Priority ne 'Low'` |
| `gt` | Greater than | `fields/Quantity gt 50` |
| `ge` | Greater or equal | `fields/PercentComplete ge 75` |
| `lt` | Less than | `fields/DueDate lt '2026-04-01'` |
| `le` | Less or equal | `fields/Budget le 10000` |

### Logical operators

| Operator | Example |
|----------|---------|
| `and` | `fields/Status eq 'Open' and fields/Priority eq 'High'` |
| `or` | `fields/Status eq 'Open' or fields/Status eq 'In Progress'` |
| `not` | `not fields/IsActive eq false` |

### String functions

| Function | Example |
|----------|---------|
| `startsWith` | `startsWith(fields/Title, 'Bug:')` |
| `endsWith` | `endsWith(fields/SKU, '-v2')` |

### Sorting

```
$orderby=fields/DueDate asc
$orderby=fields/Priority desc,fields/DueDate asc
```

### Pagination

```
$top=50
```

Follow `@odata.nextLink` in the response for subsequent pages.

### Field selection

```
$expand=fields($select=Title,Status,Priority,DueDate)
```

## Common Templates for Small Teams

### Issue Tracker
Columns: Title (built-in), Status (choice: Open/In Progress/Resolved/Closed), Priority (choice: Critical/High/Medium/Low), AssignedTo (person), Category (choice: Bug/Feature Request/Improvement/Question), DueDate (dateOnly), Description (multi-line text), IsBlocking (boolean).

Use case: Bug tracking, support ticket triage, facility maintenance requests.

### Project Tracker
Columns: Title (built-in), Status (choice: Not Started/In Progress/On Hold/Completed), Owner (person), StartDate (dateOnly), DueDate (dateOnly), PercentComplete (number 0-100), Budget (currency), Notes (multi-line text).

Use case: Small project portfolio, initiative tracking, quarterly goal progress.

### Inventory Register
Columns: Title (built-in), SKU (text), Category (choice: Hardware/Software/Office Supplies/Equipment), Quantity (number), UnitCost (currency), Location (text), ReorderLevel (number), LastRestocked (dateOnly), InStock (boolean).

Use case: IT asset tracking, office supply management, equipment checkout.

### Hiring Pipeline
Columns: Title (built-in, used for candidate name), Position (text), Stage (choice: Applied/Phone Screen/Interview/Offer/Hired/Rejected), Recruiter (person), InterviewDate (dateTime), Source (choice: LinkedIn/Referral/Job Board/Direct), Notes (multi-line text), OfferAmount (currency).

Use case: Recruiting tracker for small teams without a full ATS.

### Event Log
Columns: Title (built-in, used for event summary), EventDate (dateTime), Severity (choice: Info/Warning/Error/Critical), System (text), ReportedBy (person), Resolution (multi-line text), Resolved (boolean).

Use case: Incident logs, change management records, audit trails.

## Authentication Notes

Microsoft Lists uses the SharePoint Sites permissions model. The following delegated permissions are required:

| Permission | Required For |
|------------|-------------|
| `Sites.Read.All` | Reading lists, items, columns, content types |
| `Sites.ReadWrite.All` | Creating/updating lists and items |
| `Sites.Manage.All` | Managing list schema — adding/removing columns, configuring content types |

Application permissions (`Sites.Read.All`, `Sites.ReadWrite.All` as application) can be used for daemon/background scenarios but grant access to all sites in the tenant. For least-privilege access, use delegated permissions with `Sites.Selected` and grant per-site access via the SharePoint admin center or PowerShell.

### Token acquisition

Using `@azure/identity` with client credentials:
```javascript
const { ClientSecretCredential } = require("@azure/identity");
const { Client } = require("@microsoft/microsoft-graph-client");
const { TokenCredentialAuthenticationProvider } = require("@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials");

const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
const authProvider = new TokenCredentialAuthenticationProvider(credential, {
  scopes: ["https://graph.microsoft.com/.default"]
});

const graphClient = Client.initWithMiddleware({ authProvider });
```

### Rate limiting

Graph API enforces per-app and per-tenant throttling. If a request returns HTTP 429:
- Read the `Retry-After` header (seconds).
- Wait that duration before retrying.
- Use exponential backoff for repeated 429s.

## Best Practices

- Use `genericList` as the template for all custom lists. Other templates create specialized list types that may not support custom columns.
- Always use internal column names (the `name` property) in API calls, not display names. Internal names are set at creation time and do not change when the column is renamed in the UI.
- For person columns, resolve the SharePoint user lookup ID from the "User Information List" hidden list, not the Azure AD object ID.
- Use `$expand=fields` when fetching items to get custom field values. Without this, only system metadata is returned.
- Use `$select` on the fields expand to reduce payload size: `?expand=fields($select=Title,Status,DueDate)`.
- Batch column creation requests when building a new list to reduce round trips. Graph API supports JSON batching via `POST /$batch`.
- Set `maxLength` on text columns to enforce data quality. SharePoint defaults to 255 characters for single-line text.
- Use calculated columns for derived values (totals, concatenations) instead of computing them client-side.
- For lists with more than 5000 items, be aware of the SharePoint list view threshold. Indexed columns and narrow filters are required to avoid throttled queries.

## Reference: SharePoint Reserved Column Names

These internal names are reserved and cannot be used for custom columns:

`ID`, `Title`, `Created`, `Modified`, `Author`, `Editor`, `_UIVersionString`, `Attachments`, `ContentType`, `FileSystemObjectType`, `ServerRedirectedEmbedUrl`.

The `Title` column is always created automatically and serves as the primary display column. It can be renamed in the UI but its internal name remains `Title`.

## Progressive Disclosure — Reference Files

| Topic | File |
|---|---|
| List CRUD, column types (text, number, choice, dateTime, person, lookup, hyperlink, calculated, boolean), content types | [`references/lists-columns-types.md`](./references/lists-columns-types.md) |
| View creation/update, filtering/sorting/grouping, column formatting JSON, view formatting, conditional formatting | [`references/views-formatting.md`](./references/views-formatting.md) |
| Power Automate triggers, create/update/get item actions, SharePoint vs Graph connector, approval flows, Teams notifications | [`references/power-automate-integration.md`](./references/power-automate-integration.md) |
