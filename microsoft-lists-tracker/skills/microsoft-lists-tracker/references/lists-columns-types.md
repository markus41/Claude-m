# Lists, Columns & Column Types — Graph API Reference

## Overview

This reference covers Microsoft Lists (SharePoint Lists) via Graph API — list CRUD, all column
types (text, number, choice, dateTime, person, lookup, hyperlink, calculated, boolean), content
types, and item creation patterns.

Base URL: `https://graph.microsoft.com/v1.0`

---

## API Endpoint Table

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|---------------------|----------------|-------|
| GET | `/sites/{siteId}/lists` | `Sites.Read.All` | `$filter`, `$select`, `$top` | List all lists on site |
| GET | `/sites/{siteId}/lists/{listId}` | `Sites.Read.All` | `$select`, `$expand` | Get list metadata |
| POST | `/sites/{siteId}/lists` | `Sites.ReadWrite.All` | `displayName`, `list.template` | Create list |
| PATCH | `/sites/{siteId}/lists/{listId}` | `Sites.ReadWrite.All` | `displayName`, `description` | Update list |
| DELETE | `/sites/{siteId}/lists/{listId}` | `Sites.Manage.All` | — | Delete list |
| GET | `/sites/{siteId}/lists/{listId}/columns` | `Sites.Read.All` | `$select`, `$filter` | List columns |
| GET | `/sites/{siteId}/lists/{listId}/columns/{columnId}` | `Sites.Read.All` | — | Get column |
| POST | `/sites/{siteId}/lists/{listId}/columns` | `Sites.Manage.All` | Column definition body | Add column |
| PATCH | `/sites/{siteId}/lists/{listId}/columns/{columnId}` | `Sites.Manage.All` | Fields to update | Update column |
| DELETE | `/sites/{siteId}/lists/{listId}/columns/{columnId}` | `Sites.Manage.All` | — | Delete column |
| GET | `/sites/{siteId}/lists/{listId}/items` | `Sites.Read.All` | `$expand=fields`, `$select`, `$filter` | List items |
| POST | `/sites/{siteId}/lists/{listId}/items` | `Sites.ReadWrite.All` | `fields` object | Create item |
| PATCH | `/sites/{siteId}/lists/{listId}/items/{itemId}/fields` | `Sites.ReadWrite.All` | Field values | Update item fields |
| DELETE | `/sites/{siteId}/lists/{listId}/items/{itemId}` | `Sites.ReadWrite.All` | — | Delete item |

---

## Column Type Definitions

### Text Column

```typescript
const textColumn = {
  name: "ProjectCode",
  text: {
    allowMultipleLines: false,
    appendChangesToExistingText: false,
    linesForEditing: 1,
    maxLength: 50,
    textType: "plain",
  },
  indexed: true, // Enable for columns used in filters on large lists
};

// Multi-line text
const multiLineColumn = {
  name: "Description",
  text: {
    allowMultipleLines: true,
    appendChangesToExistingText: false,
    linesForEditing: 6,
    maxLength: 63999,
  },
};
```

### Number Column

```typescript
const numberColumn = {
  name: "Quantity",
  number: {
    decimalPlaces: "none",
    displayAs: "number",
    minimum: 0,
    maximum: 999999,
  },
};

// Percentage column
const percentColumn = {
  name: "PercentComplete",
  number: {
    decimalPlaces: "none",
    displayAs: "percentage",
    minimum: 0,
    maximum: 100,
  },
};
```

### Choice Column

```typescript
const choiceColumn = {
  name: "Status",
  choice: {
    allowTextEntry: false,
    choices: ["Not Started", "In Progress", "On Hold", "Completed", "Cancelled"],
    displayAs: "dropDownMenu",
  },
};

// Radio buttons (for smaller choice sets)
const priorityColumn = {
  name: "Priority",
  choice: {
    allowTextEntry: false,
    choices: ["Critical", "High", "Medium", "Low"],
    displayAs: "radioButtons",
  },
};
```

### DateTime Column

```typescript
const dateColumn = {
  name: "DueDate",
  dateTime: {
    displayAs: "default",
    format: "dateOnly",
  },
};

const dateTimeColumn = {
  name: "MeetingTime",
  dateTime: {
    displayAs: "default",
    format: "dateTime",
  },
};
```

### Boolean (Yes/No) Column

```typescript
const booleanColumn = {
  name: "IsUrgent",
  boolean: {},
};
```

### PersonOrGroup Column

```typescript
const personColumn = {
  name: "AssignedTo",
  personOrGroup: {
    allowMultipleSelection: false,
    chooseFromType: "peopleOnly",
    displayAs: "nameWithPresence",
  },
};

// Allow multiple people
const multiPersonColumn = {
  name: "Reviewers",
  personOrGroup: {
    allowMultipleSelection: true,
    chooseFromType: "peopleOnly",
    displayAs: "nameWithPresence",
  },
};
```

### HyperlinkOrPicture Column

```typescript
const hyperlinkColumn = {
  name: "DocumentLink",
  hyperlinkOrPicture: {
    isPicture: false,
  },
};

const pictureColumn = {
  name: "ThumbnailUrl",
  hyperlinkOrPicture: {
    isPicture: true,
  },
};
```

### Currency Column

```typescript
const currencyColumn = {
  name: "Budget",
  currency: {
    locale: "en-US",
  },
};
```

### Calculated Column

```typescript
const calculatedColumn = {
  name: "TotalValue",
  calculated: {
    formula: "=[Quantity]*[UnitPrice]",
    format: "currency",
    outputType: "number",
  },
};

// Text calculated column (concatenation)
const fullNameCalcColumn = {
  name: "FullName",
  calculated: {
    formula: "=[FirstName]&\" \"&[LastName]",
    format: "text",
    outputType: "text",
  },
};
```

### Lookup Column

```typescript
const lookupColumn = {
  name: "CustomerName",
  lookup: {
    allowMultipleValues: false,
    listId: "SOURCE_LIST_ID", // ID of the list to look up from
    columnName: "Title",      // Column in the source list
  },
};
```

---

## Code Snippets

### TypeScript — Resolve Site ID from URL

```typescript
import { Client } from "@microsoft/microsoft-graph-client";

async function resolveSiteId(
  client: Client,
  hostname: string,
  sitePath: string
): Promise<string> {
  const site = await client
    .api(`/sites/${hostname}:/${sitePath}`)
    .select("id,displayName,webUrl")
    .get();

  console.log(`Site: ${site.displayName} — ID: ${site.id}`);
  return site.id;
}

// Usage: Get site ID for https://contoso.sharepoint.com/sites/Operations
const siteId = await resolveSiteId(
  client,
  "contoso.sharepoint.com",
  "/sites/Operations"
);
```

### TypeScript — Create a Full Issue Tracker List

```typescript
async function createIssueTrackerList(
  client: Client,
  siteId: string
): Promise<string> {
  // 1. Create the list
  const list = await client
    .api(`/sites/${siteId}/lists`)
    .post({
      displayName: "Issue Tracker",
      list: { template: "genericList" },
    });

  const listId = list.id;
  console.log(`List created: ${listId}`);

  // 2. Add columns
  const columns = [
    {
      name: "Status",
      choice: {
        choices: ["Open", "In Progress", "Resolved", "Closed"],
        displayAs: "dropDownMenu",
        allowTextEntry: false,
      },
    },
    {
      name: "Priority",
      choice: {
        choices: ["Critical", "High", "Medium", "Low"],
        displayAs: "dropDownMenu",
        allowTextEntry: false,
      },
    },
    {
      name: "AssignedTo",
      personOrGroup: {
        allowMultipleSelection: false,
        chooseFromType: "peopleOnly",
        displayAs: "nameWithPresence",
      },
    },
    {
      name: "Category",
      choice: {
        choices: ["Bug", "Feature Request", "Improvement", "Question"],
        displayAs: "dropDownMenu",
        allowTextEntry: false,
      },
    },
    {
      name: "DueDate",
      dateTime: { displayAs: "default", format: "dateOnly" },
    },
    {
      name: "Description",
      text: { allowMultipleLines: true, linesForEditing: 6, maxLength: 63999 },
    },
    {
      name: "IsBlocking",
      boolean: {},
    },
  ];

  for (const col of columns) {
    await client
      .api(`/sites/${siteId}/lists/${listId}/columns`)
      .post(col);
  }

  console.log(`Added ${columns.length} columns to list`);
  return listId;
}
```

### TypeScript — Create a List Item

```typescript
async function createListItem(
  client: Client,
  siteId: string,
  listId: string,
  fields: Record<string, unknown>
): Promise<string> {
  const item = await client
    .api(`/sites/${siteId}/lists/${listId}/items`)
    .post({ fields });

  console.log(`Created item: ${item.id}`);
  return item.id;
}

// Usage: Create an issue
await createListItem(client, siteId, listId, {
  Title: "Login page crashes on Safari",
  Status: "Open",
  Priority: "High",
  Category: "Bug",
  DueDate: "2026-03-20",
  Description: "Users on Safari 17+ report the login page crashes on load.",
  IsBlocking: false,
});
```

### TypeScript — Update Item Fields (Partial Update)

```typescript
async function updateItemFields(
  client: Client,
  siteId: string,
  listId: string,
  itemId: string,
  fields: Record<string, unknown>
): Promise<void> {
  await client
    .api(`/sites/${siteId}/lists/${listId}/items/${itemId}/fields`)
    .patch(fields);
}

// Mark as resolved
await updateItemFields(client, siteId, listId, "42", {
  Status: "Resolved",
  DueDate: null,
});
```

### TypeScript — Query Items with Filters

```typescript
async function queryItems(
  client: Client,
  siteId: string,
  listId: string,
  filter: string,
  selectFields: string[] = ["Title", "Status", "Priority", "AssignedTo"]
): Promise<unknown[]> {
  const selectExpr = selectFields.join(",");
  const allItems: unknown[] = [];

  let url = `/sites/${siteId}/lists/${listId}/items?$expand=fields($select=${selectExpr})&$filter=${encodeURIComponent(filter)}&$top=100`;

  while (url) {
    const response = await client.api(url).get();
    allItems.push(...response.value);
    url = response["@odata.nextLink"] ?? null;
  }

  return allItems;
}

// Get all open high-priority items
const openHighPriority = await queryItems(
  client, siteId, listId,
  "fields/Status eq 'Open' and fields/Priority eq 'High'"
);
```

### TypeScript — Set Person Column Value (Lookup ID Required)

```typescript
async function resolveSharePointUserId(
  client: Client,
  siteId: string,
  userEmail: string
): Promise<number> {
  // Person columns in SharePoint use a numeric "SharePoint User ID"
  // not the Azure AD object ID
  const result = await client
    .api(`/sites/${siteId}/lists/User Information List/items`)
    .filter(`fields/EMail eq '${userEmail}'`)
    .expand("fields($select=Id)")
    .get();

  if (result.value.length === 0) {
    throw new Error(`User not found in site user list: ${userEmail}`);
  }

  return parseInt(result.value[0].fields.Id, 10);
}

// When setting a person field, use the LookupId suffix
const spUserId = await resolveSharePointUserId(client, siteId, "alex@contoso.com");
await updateItemFields(client, siteId, listId, itemId, {
  AssignedToLookupId: spUserId,
});
```

### PowerShell — List and Column Management

```powershell
Connect-MgGraph -Scopes "Sites.ReadWrite.All"

# Resolve site ID
$site = Invoke-MgGraphRequest -Method GET `
    -Uri "https://graph.microsoft.com/v1.0/sites/contoso.sharepoint.com:/sites/Operations" `
    -OutputType PSObject
$siteId = $site.id

# Create a list
$listBody = @{
    displayName = "Project Tracker"
    list = @{ template = "genericList" }
} | ConvertTo-Json

$list = Invoke-MgGraphRequest -Method POST `
    -Uri "https://graph.microsoft.com/v1.0/sites/$siteId/lists" `
    -Body $listBody -ContentType "application/json"
$listId = $list.id

# Add columns
$columns = @(
    @{ name = "Status"; choice = @{ choices = @("Not Started","In Progress","Completed"); displayAs = "dropDownMenu"; allowTextEntry = $false } }
    @{ name = "Owner"; personOrGroup = @{ allowMultipleSelection = $false; chooseFromType = "peopleOnly"; displayAs = "nameWithPresence" } }
    @{ name = "DueDate"; dateTime = @{ displayAs = "default"; format = "dateOnly" } }
    @{ name = "Budget"; currency = @{ locale = "en-US" } }
)

foreach ($col in $columns) {
    Invoke-MgGraphRequest -Method POST `
        -Uri "https://graph.microsoft.com/v1.0/sites/$siteId/lists/$listId/columns" `
        -Body ($col | ConvertTo-Json -Depth 5) -ContentType "application/json"
    Write-Host "Added column: $($col.name)"
}

# Create items
$itemBody = @{
    fields = @{
        Title = "Q2 Mobile App Launch"
        Status = "In Progress"
        DueDate = "2026-06-30"
        Budget = 45000
    }
} | ConvertTo-Json -Depth 5

Invoke-MgGraphRequest -Method POST `
    -Uri "https://graph.microsoft.com/v1.0/sites/$siteId/lists/$listId/items" `
    -Body $itemBody -ContentType "application/json"

# Query open items
$items = Invoke-MgGraphRequest -Method GET `
    -Uri "https://graph.microsoft.com/v1.0/sites/$siteId/lists/$listId/items?`$expand=fields(`$select=Title,Status,DueDate)&`$filter=fields/Status ne 'Completed'"
$items.value | ForEach-Object { $_.fields } | Select-Object Title, Status, DueDate | Format-Table
```

---

## Error Codes Table

| HTTP Status / Code | Meaning | Remediation |
|--------------------|---------|-------------|
| 400 BadRequest | Invalid column definition or item field value | Verify column type structure and value format |
| 400 invalidColumnName | Column name contains reserved characters or words | Avoid spaces and reserved names; use internal names |
| 403 Forbidden | Insufficient site permissions | Add `Sites.Manage.All` for column operations; `Sites.ReadWrite.All` for items |
| 404 NotFound | Site, list, or item not found | Resolve site ID correctly; verify list and item IDs |
| 409 Conflict | Column name already exists | Use a unique internal column name |
| 412 PreconditionFailed | ETag mismatch (item concurrency) | Re-fetch item and retry update |
| 429 TooManyRequests | Rate limited | Respect `Retry-After`; process items in batches |
| 503 ServiceUnavailable | SharePoint service temporarily down | Retry with backoff |
| SPListThresholdExceeded | Query returns more than 5000 items without an index | Add an indexed column; use narrow filter queries |

---

## Throttling Limits Table

| Resource | Limit | Retry Strategy |
|----------|-------|----------------|
| Item reads | Standard Graph limits (~10,000 req/10 min) | Use `$top=100` max per page; paginate |
| Item writes | ~300 per 10 minutes per user | Queue writes; use `$batch` for bulk operations |
| Columns per list | 574 maximum (SharePoint limit) | Keep to meaningful columns; avoid schema bloat |
| List items threshold | 5,000 items without indexed columns | Index columns used in filters for large lists |
| Maximum list items | No documented limit; performance degrades above 30M | Archive old items to separate list |

---

## Common Patterns and Gotchas

### 1. Person Column Values Require SharePoint User Lookup IDs

When setting or filtering on person columns, you must use the SharePoint user numeric ID (the
`LookupId`), not the Azure AD object ID or UPN. Retrieve it by querying the hidden "User
Information List" on the site. The field name when setting is `{ColumnName}LookupId`.

### 2. Always Use `$expand=fields` When Fetching Items

Without `$expand=fields`, the items endpoint returns only system metadata (id, createdDateTime,
modified, etc.) — not the custom field values. Always use `?$expand=fields` or `?$expand=fields($select=...)`.

### 3. Internal Column Names Are Set at Creation and Cannot Change

The `name` property in the column definition becomes the internal SharePoint column name. This
name does not change even when the display name is updated in the UI. Always use the original
`name` value in API calls and `$filter` expressions.

### 4. Calculated Column Output Types Must Match Formula Return

If your formula produces a text value (e.g., a concatenation), set `outputType: "text"`. Using
`outputType: "number"` with a text-returning formula produces errors or empty values.

### 5. The 5,000 Item View Threshold Is Real and Enforced

SharePoint enforces a 5,000-item limit on list queries without indexed columns. For lists
expected to grow beyond this limit, set `indexed: true` on columns used in `$filter` expressions.
Unindexed queries on large lists return a `SPListThresholdExceeded` error.

### 6. `$batch` Greatly Improves Bulk Item Creation Performance

When creating many items, use `POST /$batch` to group up to 20 requests per HTTP call.
This reduces the number of round trips from O(n) to O(n/20), dramatically improving throughput
for bulk imports.
