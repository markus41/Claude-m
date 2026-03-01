---
name: lists-view-filter
description: "View and filter items in a Microsoft List"
argument-hint: "<site-id> <list-id> [--filter <odata-filter>] [--select <fields>] [--top <count>]"
allowed-tools:
  - Read
  - Bash
  - Glob
---

# View and Filter Items in a Microsoft List

Retrieve and display items from a Microsoft List with optional OData filtering, field selection, sorting, and pagination.

## Instructions

### 1. Fetch List Items

```
GET https://graph.microsoft.com/v1.0/sites/{site-id}/lists/{list-id}/items?expand=fields
```

Add query parameters based on user input:

| Parameter | Flag | Example |
|-----------|------|---------|
| `$filter` | `--filter` | `fields/Status eq 'Open'` |
| `$select` | `--select` | `id,fields/Title,fields/Status` |
| `$top` | `--top` | `25` |
| `$orderby` | `--orderby` | `fields/DueDate asc` |

**Full example**:
```
GET /sites/{site-id}/lists/{list-id}/items?expand=fields($select=Title,Status,Priority,DueDate,AssignedTo)&$filter=fields/Status eq 'Open'&$top=20&$orderby=fields/DueDate asc
```

### 2. OData Filter Syntax Reference

#### Comparison operators
| Operator | Meaning | Example |
|----------|---------|---------|
| `eq` | Equals | `fields/Status eq 'Open'` |
| `ne` | Not equals | `fields/Priority ne 'Low'` |
| `gt` | Greater than | `fields/Quantity gt 100` |
| `ge` | Greater or equal | `fields/PercentComplete ge 50` |
| `lt` | Less than | `fields/UnitCost lt 25.00` |
| `le` | Less or equal | `fields/DueDate le '2026-03-31'` |

#### Logical operators
| Operator | Example |
|----------|---------|
| `and` | `fields/Status eq 'Open' and fields/Priority eq 'Critical'` |
| `or` | `fields/Status eq 'Open' or fields/Status eq 'In Progress'` |
| `not` | `not fields/IsBlocking eq true` |

#### String functions
| Function | Example |
|----------|---------|
| `startsWith` | `startsWith(fields/Title, 'Bug')` |
| `endsWith` | `endsWith(fields/SKU, '-XL')` |

#### Date filters
```
fields/DueDate lt '2026-04-01'
fields/DueDate ge '2026-03-01' and fields/DueDate le '2026-03-31'
```

### 3. Common Filter Recipes

**Open high-priority issues**:
```
$filter=fields/Status eq 'Open' and (fields/Priority eq 'Critical' or fields/Priority eq 'High')
```

**Overdue items** (due before today):
```
$filter=fields/DueDate lt '2026-03-01' and fields/Status ne 'Completed'
```

**Items assigned to a specific person** (by lookup ID):
```
$filter=fields/AssignedToLookupId eq 12
```

**Inventory below reorder level**:
```
$filter=fields/Quantity le fields/ReorderLevel
```

**Items created in the last 7 days**:
```
$filter=fields/Created ge '2026-02-22'
```

### 4. Pagination

The Graph API returns a maximum of 200 items per page by default. For lists with more items:

1. Check the response for `@odata.nextLink`.
2. If present, follow the URL to get the next page.
3. Continue until no `@odata.nextLink` is returned.

```javascript
let allItems = [];
let url = `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listId}/items?expand=fields&$top=100`;

while (url) {
  const response = await graphClient.api(url).get();
  allItems.push(...response.value);
  url = response["@odata.nextLink"] || null;
}
```

### 5. Display Results

Format results as a Markdown table with columns matching the `--select` fields (or all custom fields if no selection is specified).

Example output:
```
| # | Title                        | Status      | Priority | DueDate    | AssignedTo   |
|---|------------------------------|-------------|----------|------------|--------------|
| 1 | Server room AC failure       | Open        | Critical | 2026-03-05 | Jane Chen    |
| 2 | Replace lobby badge reader   | In Progress | High     | 2026-03-10 | Mark Rivera  |
| 3 | Update firewall rules        | Open        | Medium   | 2026-03-15 | Pat Nakamura |
```

Include a summary line: `Showing 3 of 3 items | Filter: Status eq 'Open' | Sorted by: DueDate asc`

If no items match the filter, display: `No items found matching the filter criteria.`
