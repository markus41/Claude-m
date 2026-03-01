# Constraints and Best Practices

Complete reference for TypeScript restrictions, platform limits, and performance optimization in Office Scripts.

## TypeScript 4.0.3 Restrictions

Office Scripts runs a restricted subset of TypeScript 4.0.3. These restrictions are enforced at save time in the Code Editor and at runtime.

### No `any` Type

The `any` type is completely forbidden — both explicit and implicit.

```typescript
// WRONG — explicit any
let data: any = range.getValues();

// WRONG — implicit any (untyped parameter)
function process(items) { /* ... */ }

// WRONG — any cast
let value = someObj as any;

// CORRECT — explicit types
let data: (string | number | boolean)[][] = range.getValues();
function process(items: string[]) { /* ... */ }
let value = someObj as string;
```

Variables must always have a determinable type. If TypeScript cannot infer the type, you must annotate it.

### No Imports or Exports

Scripts are entirely self-contained. No module system is available.

```typescript
// WRONG
import { format } from "date-fns";
const fs = require("fs");
export function helper() { }

// CORRECT — define everything inline
function formatDate(serial: number): string {
  let date = new Date(Math.round((serial - 25569) * 86400 * 1000));
  return date.toISOString().split("T")[0];
}
```

### No External Libraries

No npm packages, no DOM APIs, no Node.js APIs. The only available APIs are:
- `ExcelScript` namespace (Excel object model)
- `console.log()` (logging)
- `fetch()` (HTTP calls — only when run manually, not from Power Automate)
- Standard JavaScript built-ins (`Math`, `Date`, `JSON`, `Array`, `String`, `RegExp`, etc.)
- `Map`, `Set` (ES6 collections)

### No Generator Functions

```typescript
// WRONG
function* generateIds() {
  let id = 0;
  while (true) yield id++;
}

// CORRECT
function generateIds(count: number): number[] {
  let ids: number[] = [];
  for (let i = 0; i < count; i++) {
    ids.push(i);
  }
  return ids;
}
```

### No `eval()`

Dynamic code execution is not supported.

```typescript
// WRONG
eval("console.log('hello')");
let fn = new Function("return 42");

// CORRECT — use explicit logic
console.log("hello");
let value = 42;
```

### Arrow Functions — Only as Callbacks

Arrow functions can only be used as inline callbacks to array methods and similar. They cannot be used as standalone function declarations.

```typescript
// WRONG — arrow function as declaration
const processData = (values: string[]): string[] => {
  return values.filter(v => v !== "");
};

// CORRECT — regular function declaration
function processData(values: string[]): string[] {
  return values.filter(v => v !== "");  // Arrow OK here as callback
}

// CORRECT — arrow as callback
let filtered = data.filter(row => row[0] !== "");
let mapped = data.map(row => row[0] as string);
let sorted = data.sort((a, b) => (a[0] as number) - (b[0] as number));
```

### No Class Declarations

```typescript
// WRONG
class SalesReport {
  constructor(private data: number[][]) {}
  getTotal(): number { return 0; }
}

// CORRECT — use interfaces and functions
interface SalesReport {
  data: number[][];
  total: number;
}

function createReport(data: number[][]): SalesReport {
  let total = 0;
  for (let row of data) {
    total += row[0];
  }
  return { data, total };
}
```

### No Custom Enum Declarations

You can use the built-in `ExcelScript` enums but cannot declare your own.

```typescript
// WRONG
enum Status {
  Active = "Active",
  Inactive = "Inactive"
}

// CORRECT — use string literal union type
type Status = "Active" | "Inactive";

// CORRECT — use ExcelScript enums
let chartType = ExcelScript.ChartType.columnClustered;
```

### No Optional Chaining on Methods (TS 4.0.3 limitation)

Optional chaining (`?.`) works on properties but can be unreliable in this TS version. Prefer explicit null checks.

```typescript
// RISKY — may not work in all cases
let value = sheet?.getRange("A1")?.getValue();

// SAFER — explicit checks
let sheet = workbook.getWorksheet("Data");
if (!sheet) return;
let value = sheet.getRange("A1").getValue();
```

### No Nullish Coalescing Assignment (??=)

```typescript
// WRONG — ??= not supported in TS 4.0.3
value ??= "default";

// CORRECT
if (value === null || value === undefined) {
  value = "default";
}
// or
value = value ?? "default";
```

### Reserved Identifier Conflicts

Avoid naming variables or parameters with names that conflict with Office Script globals. Common conflicts:
- `workbook` (already the first parameter)
- `console` (built-in)
- `fetch` (built-in)

### No Destructuring with Implicit `any`

```typescript
// WRONG — destructured values are implicitly any
let { name, value } = getConfig();

// CORRECT — type the source or annotate
interface Config { name: string; value: number; }
function getConfig(): Config { return { name: "test", value: 42 }; }
let config: Config = getConfig();
let name: string = config.name;
let value: number = config.value;
```

## Platform Limits

| Limit | Value | Notes |
|-------|-------|-------|
| Script execution timeout | 120 seconds | Hard limit; script is killed |
| Request/response payload | 5 MB | API calls to Excel |
| Maximum cells | 5 million | In a single workbook |
| Parameter size (Power Automate) | 30 MB | JSON payload |
| API calls/day (Power Automate) | 1,600 | Per user per tenant |
| Script file size | No documented limit | Keep reasonable |
| `fetch` response | 5 MB | For external HTTP calls |

## Performance Best Practices

### 1. Minimize Read/Write Calls

Every `getValues()`, `setValues()`, `getFormat()`, etc. is a round-trip to Excel. Minimize these calls.

```typescript
// WRONG — reads inside loop
function main(workbook: ExcelScript.Workbook) {
  let sheet = workbook.getActiveWorksheet();
  for (let i = 1; i <= 1000; i++) {
    let val = sheet.getRange(`A${i}`).getValue(); // 1000 reads!
    sheet.getRange(`B${i}`).setValue(val);         // 1000 writes!
  }
}

// CORRECT — single read, single write
function main(workbook: ExcelScript.Workbook) {
  let sheet = workbook.getActiveWorksheet();
  let values = sheet.getRange("A1:A1000").getValues(); // 1 read
  sheet.getRange("B1:B1000").setValues(values);        // 1 write
}
```

### 2. Read Data Outside Loops

```typescript
// WRONG
function main(workbook: ExcelScript.Workbook) {
  let sheet = workbook.getActiveWorksheet();
  let table = sheet.getTable("Data");
  if (!table) return;

  let rows = table.getRows();
  for (let row of rows) {
    let values = row.getRange().getValues(); // N reads
    // Process...
  }
}

// CORRECT
function main(workbook: ExcelScript.Workbook) {
  let sheet = workbook.getActiveWorksheet();
  let table = sheet.getTable("Data");
  if (!table) return;

  let allValues = table.getRangeBetweenHeaderAndTotal().getValues(); // 1 read
  for (let row of allValues) {
    // Process row as array
    let name = row[0] as string;
    let amount = row[1] as number;
  }
}
```

### 3. Remove `console.log` in Production

`console.log` calls add overhead. Remove them from production scripts, especially inside loops.

```typescript
// WRONG — logging in loop
for (let row of data) {
  console.log(`Processing row: ${row[0]}`);
  // Process...
}

// CORRECT — log only summary
// Process all rows...
console.log(`Processed ${data.length} rows`);
```

### 4. Pause Calculations for Bulk Writes

When writing large amounts of data or formulas, pause automatic calculation:

```typescript
function main(workbook: ExcelScript.Workbook) {
  let app = workbook.getApplication();

  // Pause calculation
  app.setCalculationMode(ExcelScript.CalculationMode.manual);

  try {
    let sheet = workbook.getActiveWorksheet();
    // ... write thousands of formulas ...

    // Single recalculation when done
    app.calculate(ExcelScript.CalculationType.full);
  } finally {
    // Always restore automatic calculation
    app.setCalculationMode(ExcelScript.CalculationMode.automatic);
  }
}
```

### 5. Batch Large Datasets

For very large datasets (>5000 rows), process in chunks to avoid timeout:

```typescript
function main(workbook: ExcelScript.Workbook) {
  let sheet = workbook.getActiveWorksheet();
  let usedRange = sheet.getUsedRange();
  let allValues = usedRange.getValues();

  let batchSize = 5000;
  let results: (string | number | boolean)[][] = [];

  for (let i = 0; i < allValues.length; i += batchSize) {
    let batch = allValues.slice(i, i + batchSize);
    let processed = processBatch(batch);
    results = results.concat(processed);
  }

  // Write results
  let outputRange = sheet.getRangeByIndexes(0, 5, results.length, results[0].length);
  outputRange.setValues(results);
}

function processBatch(batch: (string | number | boolean)[][]): (string | number | boolean)[][] {
  return batch.map(row => {
    let value = row[0] as number;
    return [value, value * 1.1, value > 100 ? "High" : "Low"];
  });
}
```

### 6. Avoid Modifying Table Structure in Loops

Adding/removing rows one at a time in a loop is extremely slow. Build arrays and write at once.

```typescript
// WRONG — adding rows one by one
for (let item of items) {
  table.addRow(-1, [item.name, item.value]);  // N API calls
}

// CORRECT — add all rows at once
let rows = items.map(item => [item.name, item.value]);
table.addRows(-1, rows);  // 1 API call
```

## External Calls with `fetch`

### Requirements

- The `main` function must be `async`
- The server must return CORS headers with wildcard origin (`Access-Control-Allow-Origin: *`)
- No OAuth or token-based authentication (only anonymous or API key in URL/headers)
- NOT available when run from Power Automate
- NOT available when run from SharePoint (only OneDrive-stored scripts)

### Pattern

```typescript
async function main(workbook: ExcelScript.Workbook) {
  // Make the API call
  let response = await fetch("https://api.example.com/data", {
    method: "GET",
    headers: {
      "Content-Type": "application/json"
    }
  });

  if (!response.ok) {
    console.log(`API call failed: ${response.status}`);
    return;
  }

  let data: ApiResponse[] = await response.json();

  // Process and write to Excel
  let sheet = workbook.getActiveWorksheet();
  let rows: (string | number)[][] = data.map(item => [item.id, item.name, item.value]);

  if (rows.length > 0) {
    let headerRange = sheet.getRange("A1:C1");
    headerRange.setValues([["ID", "Name", "Value"]]);

    let dataRange = sheet.getRangeByIndexes(1, 0, rows.length, 3);
    dataRange.setValues(rows);
  }
}

interface ApiResponse {
  id: string;
  name: string;
  value: number;
}
```

### POST Example

```typescript
async function main(workbook: ExcelScript.Workbook) {
  let sheet = workbook.getActiveWorksheet();
  let data = sheet.getUsedRange().getValues();

  let payload = {
    records: data.slice(1).map(row => ({
      name: row[0],
      value: row[1]
    }))
  };

  let response = await fetch("https://api.example.com/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  let result: { status: string; count: number } = await response.json();
  console.log(`Submitted ${result.count} records: ${result.status}`);
}
```

## Error Handling Best Practices

### Always Verify Objects Exist

```typescript
function main(workbook: ExcelScript.Workbook) {
  let sheet = workbook.getWorksheet("Data");
  if (!sheet) {
    console.log("Error: 'Data' worksheet not found");
    return;
  }

  let table = sheet.getTable("SalesData");
  if (!table) {
    console.log("Error: 'SalesData' table not found");
    return;
  }

  let col = table.getColumnByName("Revenue");
  if (!col) {
    console.log("Error: 'Revenue' column not found");
    return;
  }
}
```

### Try/Catch for API Calls (Not in Loops)

```typescript
async function main(workbook: ExcelScript.Workbook) {
  try {
    let response = await fetch("https://api.example.com/data");
    if (!response.ok) {
      console.log(`HTTP error: ${response.status}`);
      return;
    }
    let data: MyData[] = await response.json();
    // Process data...
  } catch (error) {
    console.log(`Fetch failed: ${error}`);
  }
}
```

Do NOT wrap try/catch around individual operations inside a loop — it hides bugs and slows execution.

### `return` vs `throw` (Power Automate Context)

- Use `return` with a result object for expected conditions (no data found, validation failed)
- Use `throw` for unexpected errors that should stop the flow

```typescript
function main(workbook: ExcelScript.Workbook, sheetName: string): ProcessResult {
  let sheet = workbook.getWorksheet(sheetName);

  // Expected condition — return with status
  if (!sheet) {
    return { success: false, error: `Sheet "${sheetName}" not found`, count: 0 };
  }

  let data = sheet.getUsedRange()?.getValues();
  if (!data || data.length <= 1) {
    return { success: false, error: "No data found", count: 0 };
  }

  // Unexpected error — throw to stop the flow
  if (data[0].length < 3) {
    throw new Error("Data format error: expected at least 3 columns");
  }

  return { success: true, error: "", count: data.length - 1 };
}

interface ProcessResult {
  success: boolean;
  error: string;
  count: number;
}
```

## Scripts Are Self-Contained

Every Office Script must be a single, self-contained file:
- No modules, no imports, no npm packages
- All helper functions defined in the same file
- All interfaces and types defined in the same file
- All constants defined in the same file
- The `main` function is the only entry point

```typescript
// Everything in one file
interface SalesRecord {
  product: string;
  revenue: number;
  region: string;
}

function main(workbook: ExcelScript.Workbook) {
  let sheet = workbook.getActiveWorksheet();
  let data = sheet.getUsedRange().getValues();
  let records = parseRecords(data);
  let summary = summarize(records);
  writeResults(sheet, summary);
}

function parseRecords(data: (string | number | boolean)[][]): SalesRecord[] {
  return data.slice(1).map(row => ({
    product: row[0] as string,
    revenue: row[1] as number,
    region: row[2] as string
  }));
}

function summarize(records: SalesRecord[]): Map<string, number> {
  let totals = new Map<string, number>();
  for (let r of records) {
    let current = totals.get(r.region) ?? 0;
    totals.set(r.region, current + r.revenue);
  }
  return totals;
}

function writeResults(sheet: ExcelScript.Worksheet, summary: Map<string, number>) {
  let row = 0;
  summary.forEach((total, region) => {
    sheet.getRange(`E${row + 1}`).setValue(region);
    sheet.getRange(`F${row + 1}`).setValue(total);
    row++;
  });
}
```
