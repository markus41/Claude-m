# Power Automate Integration

Complete guide for integrating Office Scripts with Power Automate flows.

## Connector: Excel Online (Business)

Power Automate uses the **Excel Online (Business)** connector to run Office Scripts. Two actions are available:

### "Run script" Action

- Runs a script stored in your OneDrive `/Documents/Office Scripts/` folder
- Select: Location → Document Library → File → Script → Parameters
- The workbook must be in OneDrive for Business or SharePoint

### "Run script from SharePoint library" Action

- Runs a script stored in a SharePoint document library
- The script `.osts` file lives alongside the workbook or in a shared `Office Scripts` folder

## Parameter Passing

### Supported Parameter Types

Office Scripts called from Power Automate can accept parameters after the `workbook` argument:

```typescript
function main(
  workbook: ExcelScript.Workbook,
  name: string,           // Text input in Power Automate
  count: number,          // Number input
  isActive: boolean,      // Yes/No toggle
  config: Config,         // Object — shown as JSON input
  items: string[]         // Array — shown as JSON input
) {
  // ...
}
```

**Supported types:**
- `string`
- `number`
- `boolean`
- Interfaces / object types (passed as JSON)
- Arrays of the above types
- Union types for string literals (shown as dropdown in Power Automate)

**NOT supported as parameters:**
- `any`
- `ExcelScript.Range` or other Excel objects
- `undefined` or `null` as types
- Functions

### Optional Parameters with Defaults

```typescript
function main(
  workbook: ExcelScript.Workbook,
  sheetName: string = "Sheet1",
  startRow: number = 1
) {
  let sheet = workbook.getWorksheet(sheetName) || workbook.getActiveWorksheet();
  // ...
}
```

Optional parameters appear in Power Automate but are not required to be filled in.

### Union Type Dropdowns

String literal union types render as dropdowns in the Power Automate UI:

```typescript
function main(
  workbook: ExcelScript.Workbook,
  status: "Active" | "Inactive" | "Pending",
  priority: "High" | "Medium" | "Low"
) {
  // Power Automate shows dropdown selectors for status and priority
}
```

### JSDoc Comments in Power Automate

JSDoc `@param` descriptions appear as helper text in the Power Automate parameter UI:

```typescript
/**
 * Updates the sales report with new data.
 * @param sheetName The name of the worksheet to update
 * @param salesData Array of sales records to add
 * @param overwrite If true, replaces existing data; if false, appends
 */
function main(
  workbook: ExcelScript.Workbook,
  sheetName: string,
  salesData: SalesRecord[],
  overwrite: boolean = false
) {
  // ...
}

interface SalesRecord {
  product: string;
  quantity: number;
  revenue: number;
  date: string;
}
```

### Passing Objects and Arrays

When passing complex types, Power Automate shows a JSON text box:

```typescript
interface OrderData {
  orderId: string;
  customer: string;
  items: OrderItem[];
  total: number;
}

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

function main(workbook: ExcelScript.Workbook, order: OrderData) {
  let sheet = workbook.getActiveWorksheet();
  // Process the order...
}
```

In Power Automate, pass:
```json
{
  "orderId": "ORD-123",
  "customer": "Acme Corp",
  "items": [{"name": "Widget", "quantity": 5, "price": 10.00}],
  "total": 50.00
}
```

## Return Values

Scripts return data to Power Automate via the `return` statement. The returned value is available as **"result"** dynamic content.

```typescript
function main(workbook: ExcelScript.Workbook): ReportSummary {
  let sheet = workbook.getActiveWorksheet();
  let data = sheet.getUsedRange().getValues();

  let totalRows = data.length - 1; // Exclude header
  let totalRevenue = 0;
  for (let i = 1; i < data.length; i++) {
    totalRevenue += data[i][2] as number;
  }

  return {
    rowCount: totalRows,
    totalRevenue: totalRevenue,
    generatedAt: new Date().toISOString()
  };
}

interface ReportSummary {
  rowCount: number;
  totalRevenue: number;
  generatedAt: string;
}
```

**Supported return types:**
- `string`, `number`, `boolean`
- Interfaces / objects
- Arrays
- `void` (no return)

**NOT supported as return types:**
- `any`
- Excel objects (`Range`, `Table`, etc.)
- `Promise` (even for async functions — return the resolved value)

### Returning Table Data

A common pattern: read table data and return it for use in subsequent flow steps:

```typescript
function main(workbook: ExcelScript.Workbook): TableRow[] {
  let table = workbook.getTable("SalesData");
  if (!table) return [];

  let headers = table.getHeaderRowRange().getValues()[0] as string[];
  let data = table.getRangeBetweenHeaderAndTotal().getValues();

  let results: TableRow[] = [];
  for (let row of data) {
    results.push({
      product: row[0] as string,
      quantity: row[1] as number,
      revenue: row[2] as number,
      region: row[3] as string
    });
  }

  return results;
}

interface TableRow {
  product: string;
  quantity: number;
  revenue: number;
  region: string;
}
```

## `fetch` Is NOT Available in Power Automate

When a script is run from Power Automate, the `fetch` API is disabled. This is a hard platform restriction.

**Wrong approach:**
```typescript
// This FAILS when called from Power Automate
async function main(workbook: ExcelScript.Workbook) {
  let response = await fetch("https://api.example.com/data"); // ERROR
}
```

**Correct approach — use the HTTP connector in Power Automate:**

1. Add an **HTTP** action before the "Run script" action in your flow
2. Make the API call from Power Automate
3. Pass the response data to the script as a parameter

```typescript
// Script receives data from Power Automate instead of fetching it
function main(workbook: ExcelScript.Workbook, apiData: ApiResponse[]) {
  let sheet = workbook.getActiveWorksheet();
  let headers = [["ID", "Name", "Value"]];
  let rows = apiData.map(item => [item.id, item.name, item.value]);
  let allData = headers.concat(rows);

  let range = sheet.getRangeByIndexes(0, 0, allData.length, 3);
  range.setValues(allData);
}

interface ApiResponse {
  id: string;
  name: string;
  value: number;
}
```

## Error Handling in Power Automate

### `throw` Stops the Flow

A `throw` statement in a script causes the Power Automate flow step to fail. The flow's error handling (Configure Run After, Scope with try/catch) determines what happens next.

```typescript
function main(workbook: ExcelScript.Workbook, sheetName: string) {
  let sheet = workbook.getWorksheet(sheetName);
  if (!sheet) {
    // This stops the flow with an error
    throw new Error(`Worksheet "${sheetName}" not found`);
  }
  // Continue processing...
}
```

### `return` Does NOT Stop the Flow

A `return` statement (even with a falsy value) counts as a successful execution. Use return values to signal conditions without failing the flow:

```typescript
function main(workbook: ExcelScript.Workbook): ProcessResult {
  let sheet = workbook.getWorksheet("Data");
  if (!sheet) {
    return { success: false, message: "Worksheet not found", rowsProcessed: 0 };
  }
  // Process data...
  return { success: true, message: "Done", rowsProcessed: 100 };
}

interface ProcessResult {
  success: boolean;
  message: string;
  rowsProcessed: number;
}
```

Then in Power Automate, use a **Condition** action to check `result.success`.

## Limits

| Limit | Value |
|-------|-------|
| API calls per day | 1,600 (per user per tenant) |
| Script execution timeout | 120 seconds |
| Parameter size limit | 30 MB |
| Request/response payload | 5 MB (API layer) |
| Concurrent executions | No explicit limit, but throttled |

### Large Dataset Batching Pattern

For datasets that exceed the 30MB parameter limit or 120-second timeout:

```typescript
/**
 * Processes a batch of records. Call multiple times from Power Automate.
 * @param batchData Array of records for this batch
 * @param batchNumber Which batch this is (for row offset calculation)
 * @param batchSize Number of records per batch
 */
function main(
  workbook: ExcelScript.Workbook,
  batchData: Record[],
  batchNumber: number,
  batchSize: number
): BatchResult {
  let sheet = workbook.getWorksheet("Data");
  if (!sheet) {
    throw new Error("Data worksheet not found");
  }

  let startRow = 1 + (batchNumber * batchSize); // Row 0 is header
  let values = batchData.map(r => [r.id, r.name, r.value, r.date]);
  let range = sheet.getRangeByIndexes(startRow, 0, values.length, 4);
  range.setValues(values);

  return {
    batchNumber: batchNumber,
    rowsWritten: values.length,
    startRow: startRow
  };
}

interface Record {
  id: string;
  name: string;
  value: number;
  date: string;
}

interface BatchResult {
  batchNumber: number;
  rowsWritten: number;
  startRow: number;
}
```

In Power Automate, use an **Apply to each** or **Do Until** loop to call the script for each batch.

## Power Automate Flow Patterns

### Pattern 1: Scheduled Report Generation

```
Recurrence (every Monday 8am)
  → Run script "GenerateWeeklyReport"
  → Condition: result.hasData = true
    → Yes: Send email with result.summary
    → No: Do nothing
```

### Pattern 2: Form Submission to Excel

```
When a new response is submitted (Forms)
  → Run script "AddFormResponse"
    Parameters: name, email, department, response
  → Condition: result.isDuplicate = true
    → Yes: Send notification "Duplicate entry"
    → No: Continue
```

### Pattern 3: External Data Import

```
Recurrence (daily)
  → HTTP GET https://api.example.com/data
  → Parse JSON (response body)
  → Run script "ImportApiData"
    Parameters: parsedData
  → Send notification with result.rowsImported
```

### Pattern 4: Multi-Workbook Processing

```
When a file is created (SharePoint)
  → Condition: File name ends with .xlsx
    → Run script "ProcessNewWorkbook" on the new file
    → Run script "UpdateMasterSheet" on master workbook
      Parameters: result from previous script
```
