# Lists Views & Formatting — Graph API Reference

## Overview

This reference covers list view creation and updates, filtering/sorting/grouping, column
formatting JSON, view formatting JSON, conditional formatting, gallery view, and calendar view
via Microsoft Graph and SharePoint REST APIs.

Base URL for Graph: `https://graph.microsoft.com/v1.0`
Base URL for SharePoint REST: `https://{tenant}.sharepoint.com/sites/{site}/_api`

**Note**: Graph API v1.0 support for list views is limited (read-only). Creating and managing
views with full filter/sort/group configuration requires the SharePoint REST API or PnP.

---

## API Endpoint Table

### Graph API (Read-Only View Operations)

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|---------------------|----------------|-------|
| GET | `/sites/{siteId}/lists/{listId}/views` | `Sites.Read.All` | `$select` | List all views |
| GET | `/sites/{siteId}/lists/{listId}/views/{viewId}` | `Sites.Read.All` | — | Get view metadata |

### SharePoint REST API (Full View Management)

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|---------------------|----------------|-------|
| GET | `/_api/web/lists('{listId}')/views` | `Sites.ReadWrite.All` | `$select`, `$expand` | List views with details |
| POST | `/_api/web/lists('{listId}')/views` | `Sites.Manage.All` | View definition body | Create view |
| PATCH | `/_api/web/lists('{listId}')/views('{viewId}')` | `Sites.Manage.All` | View properties | Update view |
| DELETE | `/_api/web/lists('{listId}')/views('{viewId}')` | `Sites.Manage.All` | — | Delete view |
| PATCH | `/_api/web/lists('{listId}')/views('{viewId}')/ViewFields/SetViewXml` | `Sites.Manage.All` | View XML | Update view XML schema |

---

## Code Snippets

### TypeScript — List Views via Graph

```typescript
import { Client } from "@microsoft/microsoft-graph-client";

async function listViews(
  client: Client,
  siteId: string,
  listId: string
): Promise<Array<{ id: string; name: string; viewType: string }>> {
  const result = await client
    .api(`/sites/${siteId}/lists/${listId}/views`)
    .select("id,name,viewType,serverRelativeUrl")
    .get();

  for (const view of result.value) {
    console.log(`View: ${view.name} (${view.viewType}) — ${view.id}`);
  }

  return result.value;
}
```

### TypeScript — Create a View via SharePoint REST

```typescript
async function createListView(
  tenantUrl: string,
  siteRelativePath: string,
  listGuid: string,
  accessToken: string,
  viewDefinition: {
    title: string;
    viewFields: string[];
    query?: string; // CAML query for filter/sort
    rowLimit?: number;
    viewType?: "HTML" | "CALENDAR" | "GANTT";
    paged?: boolean;
  }
): Promise<void> {
  const body = {
    __metadata: { type: "SP.View" },
    Title: viewDefinition.title,
    ViewType: viewDefinition.viewType ?? "HTML",
    Paged: viewDefinition.paged ?? true,
    RowLimit: viewDefinition.rowLimit ?? 50,
    ViewQuery: viewDefinition.query ?? "",
    ViewFields: {
      __metadata: { type: "SP.ViewFieldCollection" },
      FieldRef: viewDefinition.viewFields.map((f) => ({ Name: f })),
    },
  };

  const url = `${tenantUrl}${siteRelativePath}/_api/web/lists(guid'${listGuid}')/views`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json;odata=verbose",
      Accept: "application/json;odata=verbose",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create view: ${error}`);
  }

  const result = await response.json();
  console.log(`View created: ${result.d.Id}`);
}
```

### TypeScript — Filter Items Without Creating a View (OData)

```typescript
// Preferred approach for dynamic filtering without view management
async function getFilteredItems(
  client: Client,
  siteId: string,
  listId: string,
  options: {
    filter?: string;
    orderBy?: string;
    selectFields?: string[];
    top?: number;
  }
): Promise<unknown[]> {
  let apiUrl = `/sites/${siteId}/lists/${listId}/items`;
  const params: string[] = [];

  // Build field selection
  const fields = options.selectFields?.length
    ? options.selectFields.join(",")
    : "Title,Status,Priority,DueDate";

  params.push(`$expand=fields($select=${fields})`);

  if (options.filter) params.push(`$filter=${encodeURIComponent(options.filter)}`);
  if (options.orderBy) params.push(`$orderby=${encodeURIComponent(options.orderBy)}`);
  if (options.top) params.push(`$top=${options.top}`);

  apiUrl += "?" + params.join("&");

  const allItems: unknown[] = [];
  let url: string | null = apiUrl;

  while (url) {
    const response = await client.api(url).get();
    allItems.push(...response.value);
    url = response["@odata.nextLink"] ?? null;
  }

  return allItems;
}

// Examples:
// All open items sorted by due date
const openItems = await getFilteredItems(client, siteId, listId, {
  filter: "fields/Status ne 'Completed'",
  orderBy: "fields/DueDate asc",
  selectFields: ["Title", "Status", "Priority", "DueDate"],
});

// High priority items due this week
const today = new Date().toISOString().split("T")[0];
const weekEnd = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
const urgentItems = await getFilteredItems(client, siteId, listId, {
  filter: `fields/Priority eq 'High' and fields/DueDate ge '${today}' and fields/DueDate le '${weekEnd}'`,
  orderBy: "fields/DueDate asc",
});
```

### TypeScript — Column Formatting JSON (Applied to Column)

```typescript
// Column formatting JSON is stored in the column's columnFormatting property
// via SharePoint REST API. This example shows the JSON format.

// Example: Status column with color-coded background
const statusColumnFormatting = JSON.stringify({
  "$schema": "https://developer.microsoft.com/json-schemas/sp/v2/column-formatting.schema.json",
  "elmType": "div",
  "style": {
    "padding": "4px 8px",
    "border-radius": "4px",
    "font-weight": "600",
    "color": "white",
    "background-color": {
      "operator": "?",
      "operands": [
        {
          "operator": "==",
          "operands": ["[$Status]", "Open"]
        },
        "#D13438",
        {
          "operator": "?",
          "operands": [
            {
              "operator": "==",
              "operands": ["[$Status]", "In Progress"]
            },
            "#0078D4",
            {
              "operator": "==",
              "operands": ["[$Status]", "Completed"]
            },
            "#107C10",
            "#8A8886"
          ]
        }
      ]
    }
  },
  "txtContent": "[$Status]"
});
```

### TypeScript — Apply Column Formatting via PnP REST

```typescript
async function applyColumnFormatting(
  tenantUrl: string,
  siteRelativePath: string,
  listGuid: string,
  columnInternalName: string,
  formattingJson: string,
  accessToken: string
): Promise<void> {
  // Get column ID first
  const columnsUrl = `${tenantUrl}${siteRelativePath}/_api/web/lists(guid'${listGuid}')/fields?$filter=InternalName eq '${columnInternalName}'`;

  const columnsResp = await fetch(columnsUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json;odata=nometadata",
    },
  });

  const columns = await columnsResp.json();
  const columnId = columns.value[0]?.Id;

  if (!columnId) throw new Error(`Column "${columnInternalName}" not found`);

  // Apply formatting
  const url = `${tenantUrl}${siteRelativePath}/_api/web/lists(guid'${listGuid}')/fields(guid'${columnId}')`;

  await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json;odata=verbose",
      Accept: "application/json;odata=verbose",
      "IF-MATCH": "*",
      "X-HTTP-Method": "MERGE",
    },
    body: JSON.stringify({
      __metadata: { type: "SP.FieldText" },
      CustomFormatter: formattingJson,
    }),
  });

  console.log(`Column formatting applied to "${columnInternalName}"`);
}
```

### PowerShell — View and Formatting Management

```powershell
Connect-MgGraph -Scopes "Sites.ReadWrite.All"

$siteId = "YOUR_SITE_ID"
$listId = "YOUR_LIST_ID"

# List views via Graph (read-only)
$views = Invoke-MgGraphRequest -Method GET `
    -Uri "https://graph.microsoft.com/v1.0/sites/$siteId/lists/$listId/views?`$select=id,name,viewType"
$views.value | Format-Table id, name, viewType

# Create a view via SharePoint REST
$siteUrl = "https://contoso.sharepoint.com/sites/Operations"
$headers = @{
    "Accept" = "application/json;odata=nometadata"
    "Content-Type" = "application/json;odata=verbose"
    "X-RequestDigest" = "" # Get digest from /_api/contextinfo
}

$viewBody = @{
    "__metadata" = @{ "type" = "SP.View" }
    "Title" = "Open High Priority"
    "ViewType" = "HTML"
    "Paged" = $true
    "RowLimit" = 50
    "ViewQuery" = "<Where><And><Eq><FieldRef Name='Status'/><Value Type='Choice'>Open</Value></Eq><Eq><FieldRef Name='Priority'/><Value Type='Choice'>High</Value></Eq></And></Where><OrderBy><FieldRef Name='DueDate'/></OrderBy>"
    "ViewFields" = @{
        "__metadata" = @{ "type" = "SP.ViewFieldCollection" }
        "FieldRef" = @(
            @{ "Name" = "LinkTitle" }
            @{ "Name" = "Status" }
            @{ "Name" = "Priority" }
            @{ "Name" = "AssignedTo" }
            @{ "Name" = "DueDate" }
        )
    }
} | ConvertTo-Json -Depth 10

# Note: Use PnP PowerShell for easier view management:
# Connect-PnPOnline -Url $siteUrl -Interactive
# Add-PnPView -List $listId -Title "Open High Priority" -Fields "Title","Status","Priority","DueDate" -Query "<Where>...</Where>"
```

---

## View Query (CAML) Quick Reference

### Common CAML Filter Patterns

```xml
<!-- Filter by single field value -->
<Where>
  <Eq>
    <FieldRef Name="Status"/>
    <Value Type="Choice">Open</Value>
  </Eq>
</Where>

<!-- Filter by date range -->
<Where>
  <And>
    <Geq>
      <FieldRef Name="DueDate"/>
      <Value Type="DateTime"><Today/></Value>
    </Geq>
    <Leq>
      <FieldRef Name="DueDate"/>
      <Value Type="DateTime"><Today OffsetDays="7"/></Value>
    </Leq>
  </And>
</Where>

<!-- Filter by current user assignment -->
<Where>
  <Eq>
    <FieldRef Name="AssignedTo"/>
    <Value Type="Integer"><UserID/></Value>
  </Eq>
</Where>

<!-- Sort by multiple columns -->
<OrderBy>
  <FieldRef Name="Priority"/>
  <FieldRef Name="DueDate" Ascending="TRUE"/>
</OrderBy>

<!-- Group by status -->
<GroupBy Collapse="FALSE">
  <FieldRef Name="Status"/>
</GroupBy>
```

---

## Error Codes Table

| HTTP Status / Code | Meaning | Remediation |
|--------------------|---------|-------------|
| 400 BadRequest | Malformed view body or invalid CAML | Validate CAML XML; check field internal names |
| 403 Forbidden | Insufficient permissions for view management | Use `Sites.Manage.All` for view create/update |
| 404 NotFound | List or view ID not found | Verify GUIDs; list view IDs use GUID format |
| 409 Conflict | View name already exists | Use unique view title |
| 429 TooManyRequests | Rate limited | Respect `Retry-After` |
| 503 ServiceUnavailable | SharePoint service down | Retry with backoff |
| InvalidViewXml | Malformed view XML schema | Validate against SharePoint view XML schema |

---

## Throttling Limits Table

| Resource | Limit | Retry Strategy |
|----------|-------|----------------|
| View reads | Standard SharePoint REST limits | Cache view configurations |
| View creates per list | Maximum 20 public views (SharePoint UI limit) | Consolidate views; use OData filters instead |
| Column formatting JSON | ~8 KB per column | Keep formatting JSON concise |
| View row limit | Maximum 5,000 rows per page | Use `Paged="TRUE"` with reasonable row limits |

---

## Common Patterns and Gotchas

### 1. Graph API View Management Is Read-Only

Graph API v1.0 `/sites/{id}/lists/{id}/views` only supports GET operations. Creating, updating,
or deleting views requires the SharePoint REST API or PnP PowerShell. Use `/_api/web/lists(guid'{id}')/views`.

### 2. Column Formatting JSON Uses `[$FieldName]` for Field Values

In column formatting JSON, reference field values as `"[$FieldInternalName]"`. Use the
internal column name (not the display name). For the Title field, use `[$Title]`.

### 3. Conditional Formatting Uses the `?` Ternary Operator

The column formatting JSON schema supports a `?` operator for conditional logic:
```json
{"operator": "?", "operands": [condition, trueValue, falseValue]}
```
Nest these for multiple conditions (if-elseif-else chains).

### 4. View Row Limit Interacts with the 5,000 Item Threshold

For lists approaching the 5,000-item threshold, ensure views have filters that narrow results
below 5,000. An unfiltered view on a 10,000-item list without an indexed column returns an error.

### 5. Calendar View Requires `EventDate` and `EndDate` Fields

To create a calendar view, the list must have columns named `EventDate` (start) and `EndDate`
(end) of DateTime type. The SharePoint calendar view binds to these specific internal names.

### 6. OData Filters on Items Are Preferable to Views for Dynamic Filtering

For programmatic access, use `$filter` on the items endpoint rather than creating dedicated views.
Views are primarily for end-user consumption in the SharePoint/Lists UI. Use OData for
dynamic, query-time filtering in automation.
