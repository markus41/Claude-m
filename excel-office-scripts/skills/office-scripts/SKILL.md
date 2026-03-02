---
name: office-scripts
description: >
  Expert knowledge of Excel Office Scripts — Microsoft's TypeScript automation platform
  for Excel on the web, including the full ExcelScript API surface, TypeScript 4.0.3
  restrictions, Graph API workbook integration, Power Automate connector limits,
  performance optimization, and common automation patterns.
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
dependencies: []
triggers:
  - office script
  - office scripts
  - excel script
  - excel automation
  - ExcelScript
  - .osts
  - workbook automation
  - Power Automate excel
  - automate excel
  - typescript excel
  - create-script
  - validate-script
  - excel graph api
  - workbook range
  - excel table
  - excel chart
---

# Excel Office Scripts

Office Scripts is Microsoft's TypeScript-based automation platform for Excel on the web. Scripts automate Excel tasks and can be triggered manually from the Automate tab or programmatically via Power Automate flows.

## When to Activate

- User asks to write, review, or fix an Office Script
- User mentions Excel automation, `.osts` files, or `ExcelScript`
- User wants TypeScript code that runs inside Excel
- User asks about Power Automate + Excel integration
- User needs to understand Office Script restrictions or best practices
- User asks about the Excel Graph REST API for workbook operations
- User wants to read/write Excel data from an external application

## Entry Point — The `main` Function

Every Office Script must have exactly one entry point:

```typescript
function main(workbook: ExcelScript.Workbook) {
  // Script logic here
}
```

For scripts that call external APIs with `fetch`, use async:

```typescript
async function main(workbook: ExcelScript.Workbook) {
  let response = await fetch("https://api.example.com/data");
  let data: ExternalData[] = await response.json();
}
```

For Power Automate integration, add parameters after `workbook`:

```typescript
function main(workbook: ExcelScript.Workbook, sheetName: string, startRow: number) {
  let sheet = workbook.getWorksheet(sheetName);
}
```

## Object Model Hierarchy

```
Workbook
├── Worksheet[]
│   ├── Range (cells, rows, columns)
│   ├── Table[]
│   │   ├── TableColumn[]
│   │   ├── TableRow[]
│   │   ├── TableSort
│   │   └── AutoFilter
│   ├── Chart[]
│   │   ├── ChartSeries[]
│   │   ├── ChartAxes
│   │   ├── ChartLegend
│   │   └── ChartTitle
│   ├── PivotTable[]
│   ├── Shape[]
│   ├── Comment[]
│   ├── ConditionalFormat[]
│   └── NamedItem[]
├── NamedItem[] (workbook-scoped)
└── Table[] (workbook-scoped)
```

## Collections Pattern

**Plural `get` methods** return arrays (never `undefined`):
```typescript
let sheets: ExcelScript.Worksheet[] = workbook.getWorksheets();
let tables: ExcelScript.Table[] = sheet.getTables();
```

**Singular `get` methods** return object or `undefined`:
```typescript
let sheet: ExcelScript.Worksheet | undefined = workbook.getWorksheet("Data");
let table: ExcelScript.Table | undefined = sheet?.getTable("SalesTable");
```

## Verify-Before-Use Pattern (Critical)

Always check that objects returned by singular `get` methods exist before using them:

```typescript
function main(workbook: ExcelScript.Workbook) {
  let sheet = workbook.getWorksheet("Data");
  if (!sheet) {
    console.log("Worksheet 'Data' not found");
    return;
  }

  let table = sheet.getTable("SalesTable");
  if (!table) {
    console.log("Table 'SalesTable' not found");
    return;
  }

  // Safe to use sheet and table here
  let range = table.getRangeBetweenHeaderAndTotal();
  let values = range.getValues();
}
```

## Excel Graph REST API

Office Scripts work inside Excel, but applications can also interact with workbooks via the Microsoft Graph REST API.

### Base URL

```
https://graph.microsoft.com/v1.0
```

### Workbook Access Paths

| Path Pattern | Use Case |
|-------------|----------|
| `/me/drive/items/{itemId}/workbook` | User's OneDrive file by item ID |
| `/me/drive/root:/{path}:/workbook` | User's OneDrive file by path |
| `/sites/{siteId}/drive/items/{itemId}/workbook` | SharePoint file by item ID |
| `/drives/{driveId}/items/{itemId}/workbook` | Any drive by drive ID |

### Graph API Endpoints

#### Session Management

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/workbook/createSession` | Create persistent or non-persistent session |
| POST | `/workbook/closeSession` | Close an active session |
| POST | `/workbook/refreshSession` | Keep session alive |

**Create session body:**
```json
{
  "persistChanges": true
}
```

Use the returned `id` in subsequent requests as header: `workbook-session-id: {sessionId}`.

**When to use sessions:**
- `persistChanges: true` — Batch multiple writes atomically; changes saved on close
- `persistChanges: false` — Temporary calculations without saving; changes discarded
- **Sessionless** — Simple one-off reads/writes; each request is independent

Session timeout: 5 minutes of inactivity. Refresh to extend.

#### Worksheet Operations

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/workbook/worksheets` | List all worksheets |
| GET | `/workbook/worksheets/{name\|id}` | Get worksheet |
| POST | `/workbook/worksheets/add` | Add worksheet |
| PATCH | `/workbook/worksheets/{id}` | Update worksheet (rename, visibility) |
| DELETE | `/workbook/worksheets/{id}` | Delete worksheet |

**Add worksheet body:**
```json
{
  "name": "NewSheet"
}
```

#### Range Operations

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/workbook/worksheets/{name}/range(address='A1:D10')` | Get range |
| PATCH | `/workbook/worksheets/{name}/range(address='A1:D10')` | Update range values/format |
| GET | `/workbook/worksheets/{name}/usedRange` | Get used range |
| POST | `/workbook/worksheets/{name}/range(address='A1:D10')/clear` | Clear range |
| POST | `/workbook/worksheets/{name}/range(address='A1:D10')/merge` | Merge cells |
| POST | `/workbook/worksheets/{name}/range(address='A1:D10')/unmerge` | Unmerge cells |
| POST | `/workbook/worksheets/{name}/range(address='A1:D10')/sort/apply` | Sort range |
| POST | `/workbook/worksheets/{name}/range(address='A1:D10')/insert` | Insert rows/columns |
| POST | `/workbook/worksheets/{name}/range(address='A1:D10')/delete` | Delete rows/columns |

**Update range values body:**
```json
{
  "values": [
    ["Name", "Age", "City"],
    ["Alice", 30, "Seattle"],
    ["Bob", 25, "Portland"]
  ]
}
```

**Update range format body:**
```json
{
  "format": {
    "font": {
      "bold": true,
      "color": "#FFFFFF",
      "size": 12
    },
    "fill": {
      "color": "#4472C4"
    },
    "horizontalAlignment": "Center",
    "columnWidth": 120
  },
  "numberFormat": [["$#,##0.00"]]
}
```

**Sort range body:**
```json
{
  "fields": [
    {
      "key": 0,
      "sortOn": "Value",
      "ascending": true
    }
  ],
  "matchCase": false,
  "hasHeaders": true
}
```

#### Table Operations

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/workbook/tables` | List workbook tables |
| GET | `/workbook/worksheets/{name}/tables` | List worksheet tables |
| POST | `/workbook/tables/add` | Create table from range |
| GET | `/workbook/tables/{name\|id}` | Get table |
| DELETE | `/workbook/tables/{name\|id}` | Delete table |
| POST | `/workbook/tables/{name}/rows/add` | Add table rows |
| GET | `/workbook/tables/{name}/rows` | Get all table rows |
| GET | `/workbook/tables/{name}/columns` | Get table columns |
| POST | `/workbook/tables/{name}/columns/add` | Add table column |
| GET | `/workbook/tables/{name}/dataBodyRange` | Get data body range |
| GET | `/workbook/tables/{name}/headerRowRange` | Get header row range |
| GET | `/workbook/tables/{name}/totalRowRange` | Get total row range |
| POST | `/workbook/tables/{name}/sort/apply` | Sort table |
| POST | `/workbook/tables/{name}/clearFilters` | Clear all filters |
| POST | `/workbook/tables/{name}/reapplyFilters` | Reapply filters |
| PATCH | `/workbook/tables/{name}/columns/{id}/filter` | Apply column filter |

**Create table body:**
```json
{
  "address": "Sheet1!A1:D5",
  "hasHeaders": true
}
```

**Add table rows body:**
```json
{
  "index": null,
  "values": [
    ["New Item", 100, "2026-03-01", "Active"],
    ["Another Item", 250, "2026-03-15", "Pending"]
  ]
}
```

**Add table column body:**
```json
{
  "index": null,
  "name": "Status",
  "values": [
    ["Active"],
    ["Inactive"],
    ["Pending"]
  ]
}
```

#### Chart Operations

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/workbook/worksheets/{name}/charts` | List charts |
| POST | `/workbook/worksheets/{name}/charts/add` | Create chart |
| GET | `/workbook/worksheets/{name}/charts/{name}` | Get chart |
| PATCH | `/workbook/worksheets/{name}/charts/{name}` | Update chart |
| DELETE | `/workbook/worksheets/{name}/charts/{name}` | Delete chart |
| GET | `/workbook/worksheets/{name}/charts/{name}/image` | Get chart as image |
| POST | `/workbook/worksheets/{name}/charts/{name}/setData` | Set chart data source |

**Create chart body:**
```json
{
  "type": "ColumnClustered",
  "sourceData": "Sheet1!A1:B5",
  "seriesBy": "Auto"
}
```

**Chart types:** `ColumnClustered`, `ColumnStacked`, `BarClustered`, `BarStacked`, `Line`, `LineMarkers`, `Pie`, `Doughnut`, `Area`, `AreaStacked`, `XYScatter`, `XYScatterLines`, `Radar`, `Surface`, `Histogram`, `Waterfall`, `Treemap`, `Sunburst`, `Funnel`.

#### Named Items (Named Ranges)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/workbook/names` | List workbook named items |
| POST | `/workbook/names/add` | Add named item |
| POST | `/workbook/names/addFormulaLocal` | Add named formula |
| GET | `/workbook/names/{name}/range` | Get range for named item |

#### Workbook Functions

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/workbook/functions/{functionName}` | Call an Excel function |

**Example — VLOOKUP:**
```json
POST /workbook/functions/vlookup
{
  "lookupValue": "Alice",
  "tableArray": {
    "address": "Sheet1!A1:D10"
  },
  "colIndexNum": 3,
  "rangeLookup": false
}
```

Supports 300+ Excel functions: `SUM`, `AVERAGE`, `COUNT`, `VLOOKUP`, `IF`, `CONCATENATE`, `TEXT`, `DATE`, `NOW`, etc.

## TypeScript 4.0.3 Restrictions (Summary)

Office Scripts uses a restricted TypeScript 4.0.3 environment. Key restrictions:

| Restriction | Details |
|------------|---------|
| No `any` type | Explicit or implicit `any` is forbidden; all variables must be typed |
| No imports/exports | No `import`, `require`, or `export` — scripts are self-contained |
| No external libraries | No npm packages, no DOM APIs, no Node.js APIs |
| No `eval()` | Dynamic code execution is not allowed |
| No generator functions | `function*` syntax is not supported |
| Arrow functions | Only allowed as callbacks (e.g., `Array.filter`, `Array.map`) |
| No classes | Class declarations are not supported; use interfaces and functions |
| No enums (custom) | You cannot declare your own enums; use `ExcelScript` enums only |
| No `any` casts | `as any` or `<any>` casts are not allowed |

See `references/constraints-and-best-practices.md` for the complete list with examples.

## Key API Patterns (Quick Reference)

### Reading and Writing Data

```typescript
// Single cell
let value = sheet.getRange("A1").getValue();
sheet.getRange("A1").setValue("Hello");

// Range of cells (2D array)
let values = sheet.getRange("A1:C3").getValues();
sheet.getRange("A1:C3").setValues([
  ["Name", "Age", "City"],
  ["Alice", 30, "NYC"],
  ["Bob", 25, "LA"]
]);

// Dynamic sizing — use getUsedRange()
let usedRange = sheet.getUsedRange();
let allData = usedRange.getValues();
```

### Tables

```typescript
// Create table from range
let table = sheet.addTable(sheet.getRange("A1:C10"), true /* hasHeaders */);
table.setName("SalesData");

// Add row
table.addRow(-1, ["New Item", 100, "2024-01-15"]);

// Filter
table.getColumnByName("Status").getFilter().applyValuesFilter(["Active"]);

// Sort
table.getSort().apply([{ key: 0, ascending: true }]);
```

### Formatting

```typescript
let range = sheet.getRange("A1:D1");
range.getFormat().getFill().setColor("#4472C4");
range.getFormat().getFont().setBold(true);
range.getFormat().getFont().setColor("white");
range.setNumberFormat("$#,##0.00");
```

### Conditional Formatting

```typescript
// Add cell value rule
let cf = sheet.getRange("B2:B100").addConditionalFormat(ExcelScript.ConditionalFormatType.cellValue);
cf.getCellValue().setRule({
  formula1: "=0",
  operator: ExcelScript.ConditionalCellValueOperator.greaterThan
});
cf.getCellValue().getFormat().getFont().setColor("#006100");
cf.getCellValue().getFormat().getFill().setColor("#C6EFCE");
```

### PivotTables

```typescript
// Create pivot table
let pivotTable = sheet.addPivotTable(
  "SalesPivot",
  sourceSheet.getRange("A1:E100"),
  sheet.getRange("A1")
);

// Add fields
pivotTable.addRowHierarchy(pivotTable.getHierarchy("Region"));
pivotTable.addColumnHierarchy(pivotTable.getHierarchy("Quarter"));
pivotTable.addDataHierarchy(pivotTable.getHierarchy("Revenue"));
```

## Power Automate Integration

- Use the **Excel Online (Business)** connector's "Run script" action
- Parameters: `string`, `number`, `boolean`, objects, arrays (no `any`, no `Range`)
- Return values via `return` statement with typed result
- `fetch` is NOT available when called from Power Automate
- `throw` stops the entire flow; `return` does not
- JSDoc `@param` comments appear in the Power Automate UI

### Connector Limits

| Limit | Value |
|-------|-------|
| API calls per day | 1,600 |
| Script execution timeout | 120 seconds |
| Maximum parameter size | 30 MB |
| Maximum return value size | 5 MB |
| Concurrent runs per workbook | 1 (queued) |

See `references/power-automate.md` for complete integration guide.

## Required Permissions

### Office Scripts (In-Browser)

| Requirement | Details |
|-------------|---------|
| License | Microsoft 365 Business Standard/Premium, E3, or E5 |
| Platform | Excel on the web (not desktop) |
| Admin setting | Office Scripts must be enabled in M365 admin center |
| Storage | OneDrive or SharePoint Online |

### Graph API (External Access)

| Permission | Type | Purpose |
|-----------|------|---------|
| `Files.ReadWrite` | Delegated | Read/write user's files |
| `Files.ReadWrite.All` | Application | Read/write all files (app-only) |
| `Sites.ReadWrite.All` | Delegated/Application | Access SharePoint-hosted workbooks |

## Error Handling

### Office Script Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `Object is undefined` | Singular `get` returned `undefined` | Always null-check before use |
| `Script exceeds size limit` | Script > 100KB | Split into smaller scripts |
| `Script timed out` | Execution > 120s (PA) or 5 min (manual) | Optimize reads/writes, reduce data volume |
| `Implicit any` | Untyped variable or destructuring | Add explicit type annotations |
| `Cannot use import` | `import` statement used | Remove — scripts are self-contained |

### Graph API Errors

| Status | Error Code | Cause |
|--------|-----------|-------|
| 400 | `InvalidArgument` | Invalid range address, bad parameter |
| 404 | `ItemNotFound` | Worksheet, table, or named item not found |
| 409 | `Conflict` | Session conflict — another session is active |
| 409 | `InvalidSessionAccessConflict` | Multiple concurrent sessions on same workbook |
| 429 | Too Many Requests | Throttled — honor `Retry-After` header |
| 504 | Gateway Timeout | Large workbook operation timeout — use sessions |

### Session Error Recovery

```javascript
// If session expires, create a new one and retry
try {
  await graphClient.api(url).header("workbook-session-id", sessionId).patch(body);
} catch (err) {
  if (err.code === "InvalidSessionAccessConflict" || err.code === "SessionNotFound") {
    const newSession = await graphClient.api(`${workbookUrl}/createSession`)
      .post({ persistChanges: true });
    sessionId = newSession.id;
    await graphClient.api(url).header("workbook-session-id", sessionId).patch(body);
  }
}
```

## Performance Best Practices

1. **Minimize read/write calls** — read all data at once, process in memory, write once
2. **Read outside loops** — never call `getValues()` inside a loop
3. **Remove `console.log`** in production — logging impacts performance
4. **Pause calculation** for bulk writes:
   ```typescript
   workbook.getApplication().setCalculationMode(ExcelScript.CalculationMode.manual);
   // ... bulk operations ...
   workbook.getApplication().setCalculationMode(ExcelScript.CalculationMode.automatic);
   ```
5. **Batch large datasets** — process in chunks of ~5,000 rows
6. **Avoid modifying table structure in loops** — delete and recreate instead
7. **Use sessions** for Graph API batch operations — reduces round trips
8. **Prefer `getUsedRange()`** over fixed ranges — adapts to data size dynamically

See `references/constraints-and-best-practices.md` for all performance tips.

## Common Patterns

### Pattern 1: Data Extraction and Report

1. `getWorksheet("RawData")` → `getUsedRange()` → `getValues()` — extract raw data
2. Process in memory: filter rows, aggregate totals, calculate percentages
3. `addWorksheet("Report")` — create report sheet
4. `getRange("A1:...")` → `setValues(reportData)` — write processed data
5. Apply formatting: headers, number formats, conditional formatting
6. Optional: create chart from report data

### Pattern 2: Data Validation and Cleanup

1. Read all data with `getUsedRange().getValues()`
2. Validate each row: check required fields, validate email/phone patterns
3. Build `errors[]` array with `[row, column, message]` for each issue
4. Write errors to a "Validation Results" sheet
5. Highlight invalid cells with red fill in the original data
6. Return summary: `{ totalRows, validRows, errorRows }`

### Pattern 3: Multi-Sheet Consolidation

1. `workbook.getWorksheets()` — get all sheets
2. For each sheet: `getUsedRange().getValues()` — read data (skip header for 2nd+ sheet)
3. Concatenate all rows into single 2D array
4. Write to a "Consolidated" worksheet
5. Convert consolidated range to a Table for sorting/filtering
6. Add PivotTable for summary analysis

### Pattern 4: Scheduled Data Refresh (via Power Automate)

1. Power Automate trigger: Recurrence (daily at 8 AM)
2. HTTP action: fetch data from external API
3. "Run script" action: pass API response as parameter
4. Script: parse response, clear old data, write new rows
5. Script: update "Last Updated" cell with timestamp
6. Script: return row count for flow logging

### Pattern 5: Template-Based Report Generation

1. Read template sheet with pre-built formatting and formulas
2. `worksheet.copy()` — duplicate template for each report instance
3. Populate data cells (leave formulas intact)
4. Update named ranges for dynamic chart data sources
5. Protect sheets to prevent accidental formula deletion
6. Return list of generated sheet names

## File Storage

- Scripts saved as `.osts` files in OneDrive: `/Documents/Office Scripts/`
- SharePoint-based scripts stored in document library's `Office Scripts` folder
- Scripts can be shared with a workbook or kept personal

## Common Gotchas

1. **`getRange()` vs `getRangeByIndexes()`**: `getRange("A1:C3")` uses A1 notation; `getRangeByIndexes(row, col, rowCount, colCount)` uses zero-based indices
2. **Values are 2D arrays**: Even a single cell returns `(string | number | boolean)[][]`
3. **Dates are serial numbers**: Excel stores dates as numbers; use `getNumberFormatLocal()` to distinguish
4. **Tables can't be resized**: Delete and recreate to change structure
5. **No implicit `any`**: Destructuring and untyped function parameters will fail
6. **`undefined` vs `null`**: Singular `get` methods return `undefined`, not `null`
7. **Graph API range address format**: Must include sheet name in cross-sheet references (`Sheet1!A1:D10`)
8. **Session concurrency**: Only one persistent session per workbook at a time

## Number Format Reference

| Format String | Example Output | Use Case |
|--------------|---------------|----------|
| `#,##0` | `1,234` | Integer with thousands separator |
| `#,##0.00` | `1,234.56` | Two decimal places |
| `$#,##0.00` | `$1,234.56` | Currency |
| `0%` | `75%` | Percentage (whole) |
| `0.00%` | `75.50%` | Percentage (decimal) |
| `yyyy-mm-dd` | `2026-03-01` | ISO date |
| `mm/dd/yyyy` | `03/01/2026` | US date |
| `hh:mm:ss` | `14:30:00` | Time |
| `@` | (text) | Force text format |

## Reference Files

| Resource | Path | Content |
|----------|------|---------|
| API Patterns | `references/api-patterns.md` | Full API surface: Workbook, Worksheet, Range, Table, Chart, etc. |
| Power Automate | `references/power-automate.md` | Parameters, returns, connector usage, limits |
| Constraints | `references/constraints-and-best-practices.md` | TS 4.0.3 restrictions, platform limits, performance |
| Range Examples | `examples/range-operations.md` | Read/write, formatting, formulas, iteration |
| Table Examples | `examples/table-operations.md` | Create, filter, sort, format, dynamic formulas |
| Chart Examples | `examples/chart-operations.md` | All chart types, customization, data labels |
| Complete Scripts | `examples/complete-scripts.md` | Full real-world scripts |
