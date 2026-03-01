---
name: office-scripts
description: "Expert knowledge of Excel Office Scripts — Microsoft's TypeScript automation platform for Excel on the web, including API patterns, TypeScript restrictions, and Power Automate integration"
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
---

# Excel Office Scripts

Office Scripts is Microsoft's TypeScript-based automation platform for Excel on the web. Scripts automate Excel tasks and can be triggered manually from the Automate tab or programmatically via Power Automate flows.

## When to Activate

- User asks to write, review, or fix an Office Script
- User mentions Excel automation, `.osts` files, or `ExcelScript`
- User wants TypeScript code that runs inside Excel
- User asks about Power Automate + Excel integration
- User needs to understand Office Script restrictions or best practices

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

## Power Automate Integration (Summary)

- Use the **Excel Online (Business)** connector's "Run script" action
- Parameters: `string`, `number`, `boolean`, objects, arrays (no `any`, no `Range`)
- Return values via `return` statement with typed result
- `fetch` is NOT available when called from Power Automate
- `throw` stops the entire flow; `return` does not
- JSDoc `@param` comments appear in the Power Automate UI
- Limits: 1,600 calls/day, 120s timeout, 30MB parameter size

See `references/power-automate.md` for complete integration guide.

## Performance Best Practices (Summary)

1. **Minimize read/write calls** — read all data at once, process in memory, write once
2. **Read outside loops** — never call `getValues()` inside a loop
3. **Remove `console.log`** in production — logging impacts performance
4. **Pause calculation** for bulk writes:
   ```typescript
   workbook.getApplication().setCalculationMode(ExcelScript.CalculationMode.manual);
   // ... bulk operations ...
   workbook.getApplication().setCalculationMode(ExcelScript.CalculationMode.automatic);
   ```
5. **Batch large datasets** — process in chunks of ~5000 rows
6. **Avoid modifying table structure in loops** — delete and recreate instead

See `references/constraints-and-best-practices.md` for all performance tips.

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
