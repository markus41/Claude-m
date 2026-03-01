# Complete Office Scripts Examples

Full, real-world scripts demonstrating end-to-end workflows.

## 1. Sales Report with Totals and Formatting

Reads raw sales data, creates a formatted table with totals, and adds a summary chart.

```typescript
function main(workbook: ExcelScript.Workbook) {
  let sheet = workbook.getWorksheet("Sales");
  if (!sheet) {
    console.log("Worksheet 'Sales' not found");
    return;
  }

  let usedRange = sheet.getUsedRange();
  if (!usedRange) {
    console.log("No data found");
    return;
  }

  // Create or replace table
  let existingTable = sheet.getTable("SalesReport");
  if (existingTable) {
    existingTable.delete();
  }

  let table = sheet.addTable(usedRange, true);
  table.setName("SalesReport");
  table.setPredefinedTableStyle("TableStyleMedium9");
  table.setShowBandedRows(true);

  // Add totals row
  table.setShowTotals(true);

  let headers = table.getHeaderRowRange().getValues()[0] as string[];

  // Set total functions for numeric columns
  for (let i = 0; i < headers.length; i++) {
    let col = table.getColumn(i);
    let colName = headers[i].toLowerCase();
    if (colName.includes("revenue") || colName.includes("amount") || colName.includes("total")) {
      col.setTotalRowFunction(ExcelScript.TotalRowFunction.sum);
    } else if (colName.includes("quantity") || colName.includes("units")) {
      col.setTotalRowFunction(ExcelScript.TotalRowFunction.sum);
    } else if (colName.includes("price") || colName.includes("rate")) {
      col.setTotalRowFunction(ExcelScript.TotalRowFunction.average);
    }
  }

  // Label the totals row
  table.getColumn(0).setTotalRowFunction(ExcelScript.TotalRowFunction.none);
  table.getColumn(0).getTotalRowRange().setValue("TOTALS");

  // Format currency columns
  for (let i = 0; i < headers.length; i++) {
    let colName = headers[i].toLowerCase();
    if (colName.includes("revenue") || colName.includes("amount") ||
        colName.includes("price") || colName.includes("total")) {
      table.getColumn(i).getRangeBetweenHeaderAndTotal().setNumberFormat("$#,##0.00");
    }
  }

  // Auto-fit columns
  table.getRange().getFormat().autofitColumns();

  // Create summary chart
  let existingChart = sheet.getChart("SalesChart");
  if (existingChart) existingChart.delete();

  // Find revenue column for chart
  let revenueIdx = headers.findIndex(h => h.toLowerCase().includes("revenue"));
  if (revenueIdx === -1) revenueIdx = 1; // Fallback to second column

  let chartData = table.getRange();
  let chart = sheet.addChart(ExcelScript.ChartType.columnClustered, chartData);
  chart.setName("SalesChart");
  chart.setPosition("A" + (usedRange.getRowCount() + 4).toString());
  chart.setWidth(600);
  chart.setHeight(350);
  chart.getTitle().setVisible(true);
  chart.getTitle().setText("Sales Report Summary");

  console.log(`Report created: ${table.getRows().length} rows`);
}
```

## 2. Data Cleanup Script

Cleans messy data: trims whitespace, fixes casing, removes duplicates, fills blanks, standardizes dates.

```typescript
function main(workbook: ExcelScript.Workbook) {
  let sheet = workbook.getActiveWorksheet();
  let usedRange = sheet.getUsedRange();
  if (!usedRange) {
    console.log("No data to clean");
    return;
  }

  let values = usedRange.getValues();
  let headers = values[0] as string[];
  let rowCount = values.length;
  let colCount = headers.length;
  let changes = 0;

  // Track seen rows for duplicate detection
  let seenRows = new Set<string>();
  let duplicateRows: number[] = [];

  for (let r = 1; r < rowCount; r++) {
    // Build row key for duplicate detection
    let rowKey = values[r].join("|");
    if (seenRows.has(rowKey)) {
      duplicateRows.push(r);
      continue;
    }
    seenRows.add(rowKey);

    for (let c = 0; c < colCount; c++) {
      let val = values[r][c];
      let header = headers[c].toLowerCase();

      // Trim whitespace from strings
      if (typeof val === "string") {
        let trimmed = val.trim();
        if (trimmed !== val) {
          values[r][c] = trimmed;
          changes++;
          val = trimmed;
        }

        // Title case for name columns
        if (header.includes("name") && typeof val === "string" && val.length > 0) {
          let titleCase = toTitleCase(val as string);
          if (titleCase !== val) {
            values[r][c] = titleCase;
            changes++;
          }
        }

        // Uppercase for code/ID columns
        if ((header.includes("code") || header.includes("id")) && typeof val === "string") {
          let upper = (val as string).toUpperCase();
          if (upper !== val) {
            values[r][c] = upper;
            changes++;
          }
        }

        // Replace common empty-ish values with empty string
        if (val === "N/A" || val === "n/a" || val === "NA" || val === "-" || val === "null") {
          values[r][c] = "";
          changes++;
        }
      }
    }
  }

  // Remove duplicate rows (process in reverse to preserve indices)
  for (let i = duplicateRows.length - 1; i >= 0; i--) {
    values.splice(duplicateRows[i], 1);
  }

  // Write cleaned data back
  let cleanedRange = sheet.getRangeByIndexes(0, 0, values.length, colCount);
  cleanedRange.setValues(values);

  // Clear any rows that were removed (old data beyond new range)
  if (values.length < rowCount) {
    let excessRange = sheet.getRangeByIndexes(values.length, 0, rowCount - values.length, colCount);
    excessRange.clear(ExcelScript.ClearApplyTo.all);
  }

  console.log(`Cleaned: ${changes} values fixed, ${duplicateRows.length} duplicates removed`);
}

function toTitleCase(str: string): string {
  return str.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}
```

## 3. External API Data Import

Fetches data from a public API and writes it to Excel. Only works when run manually (not from Power Automate).

```typescript
async function main(workbook: ExcelScript.Workbook) {
  // Fetch exchange rates from a public API
  let response = await fetch("https://api.exchangerate-api.com/v4/latest/USD");

  if (!response.ok) {
    console.log(`API request failed: ${response.status} ${response.statusText}`);
    return;
  }

  let data: ExchangeRateResponse = await response.json();

  // Create or get the target sheet
  let sheetName = "Exchange Rates";
  let sheet = workbook.getWorksheet(sheetName);
  if (sheet) {
    sheet.getUsedRange()?.clear(ExcelScript.ClearApplyTo.all);
  } else {
    sheet = workbook.addWorksheet(sheetName);
  }

  // Write header
  let headers: string[][] = [["Currency", "Rate", "Last Updated"]];
  sheet.getRange("A1:C1").setValues(headers);

  // Write data
  let currencies = Object.keys(data.rates);
  let rows: (string | number)[][] = currencies.map(currency => [
    currency,
    data.rates[currency],
    data.date
  ]);

  if (rows.length > 0) {
    let dataRange = sheet.getRangeByIndexes(1, 0, rows.length, 3);
    dataRange.setValues(rows);
  }

  // Format
  let usedRange = sheet.getUsedRange();
  if (!usedRange) return;

  // Header formatting
  let headerRange = usedRange.getRow(0);
  headerRange.getFormat().getFill().setColor("#4472C4");
  headerRange.getFormat().getFont().setColor("white");
  headerRange.getFormat().getFont().setBold(true);

  // Rate column format
  sheet.getRangeByIndexes(1, 1, rows.length, 1).setNumberFormat("#,##0.0000");

  // Create table
  let table = sheet.addTable(usedRange, true);
  table.setName("ExchangeRates");
  table.setPredefinedTableStyle("TableStyleMedium2");

  // Auto-fit
  usedRange.getFormat().autofitColumns();

  console.log(`Imported ${rows.length} exchange rates (base: ${data.base}, date: ${data.date})`);
}

interface ExchangeRateResponse {
  base: string;
  date: string;
  rates: { [currency: string]: number };
}
```

## 4. Power Automate Parameter Script

Designed to be called from Power Automate with parameters and return structured results.

```typescript
/**
 * Processes new order data received from Power Automate.
 * @param sheetName Target worksheet name
 * @param orders Array of order records to add
 * @param clearExisting If true, clears existing data before writing
 */
function main(
  workbook: ExcelScript.Workbook,
  sheetName: string,
  orders: OrderInput[],
  clearExisting: boolean = false
): ProcessResult {
  // Validate input
  if (!orders || orders.length === 0) {
    return {
      success: false,
      message: "No orders provided",
      ordersProcessed: 0,
      totalRevenue: 0
    };
  }

  // Get or create worksheet
  let sheet = workbook.getWorksheet(sheetName);
  if (!sheet) {
    sheet = workbook.addWorksheet(sheetName);
  }

  if (clearExisting) {
    let existing = sheet.getUsedRange();
    if (existing) {
      existing.clear(ExcelScript.ClearApplyTo.all);
    }
  }

  // Find starting row
  let startRow = 0;
  let usedRange = sheet.getUsedRange();
  if (usedRange && !clearExisting) {
    startRow = usedRange.getRowCount();
  }

  // Write headers if this is a fresh sheet
  if (startRow === 0) {
    let headers: string[][] = [["Order ID", "Customer", "Product", "Quantity", "Price", "Total", "Date", "Status"]];
    sheet.getRange("A1:H1").setValues(headers);

    // Format headers
    let headerRange = sheet.getRange("A1:H1");
    headerRange.getFormat().getFill().setColor("#4472C4");
    headerRange.getFormat().getFont().setColor("white");
    headerRange.getFormat().getFont().setBold(true);
    startRow = 1;
  }

  // Process and write orders
  let totalRevenue = 0;
  let rows: (string | number)[][] = orders.map(order => {
    let total = order.quantity * order.price;
    totalRevenue += total;
    return [
      order.orderId,
      order.customer,
      order.product,
      order.quantity,
      order.price,
      total,
      order.date,
      order.status
    ];
  });

  let dataRange = sheet.getRangeByIndexes(startRow, 0, rows.length, 8);
  dataRange.setValues(rows);

  // Format currency columns
  let priceCol = sheet.getRangeByIndexes(startRow, 4, rows.length, 1);
  priceCol.setNumberFormat("$#,##0.00");
  let totalCol = sheet.getRangeByIndexes(startRow, 5, rows.length, 1);
  totalCol.setNumberFormat("$#,##0.00");

  // Auto-fit
  sheet.getUsedRange()?.getFormat().autofitColumns();

  // Ensure table exists
  let table = sheet.getTable("Orders");
  if (!table && sheet.getUsedRange()) {
    table = sheet.addTable(sheet.getUsedRange(), true);
    table.setName("Orders");
    table.setPredefinedTableStyle("TableStyleMedium2");
  }

  return {
    success: true,
    message: `Processed ${orders.length} orders`,
    ordersProcessed: orders.length,
    totalRevenue: totalRevenue
  };
}

interface OrderInput {
  orderId: string;
  customer: string;
  product: string;
  quantity: number;
  price: number;
  date: string;
  status: "Pending" | "Shipped" | "Delivered" | "Cancelled";
}

interface ProcessResult {
  success: boolean;
  message: string;
  ordersProcessed: number;
  totalRevenue: number;
}
```

## 5. Cross-Worksheet Aggregation

Reads data from multiple worksheets and creates a summary on a new sheet.

```typescript
function main(workbook: ExcelScript.Workbook) {
  let sheets = workbook.getWorksheets();
  let summarySheetName = "Summary";

  // Collect data from all sheets except Summary
  let allData: RegionSummary[] = [];

  for (let sheet of sheets) {
    if (sheet.getName() === summarySheetName) continue;

    let usedRange = sheet.getUsedRange();
    if (!usedRange) continue;

    let values = usedRange.getValues();
    if (values.length < 2) continue; // Need at least header + 1 data row

    let headers = values[0] as string[];
    let revenueIdx = findColumnIndex(headers, "revenue");
    let unitsIdx = findColumnIndex(headers, "units");

    if (revenueIdx === -1) continue;

    let totalRevenue = 0;
    let totalUnits = 0;
    let rowCount = values.length - 1;

    for (let r = 1; r < values.length; r++) {
      totalRevenue += (values[r][revenueIdx] as number) || 0;
      if (unitsIdx !== -1) {
        totalUnits += (values[r][unitsIdx] as number) || 0;
      }
    }

    allData.push({
      sheetName: sheet.getName(),
      rowCount: rowCount,
      totalRevenue: totalRevenue,
      totalUnits: totalUnits,
      avgRevenue: rowCount > 0 ? totalRevenue / rowCount : 0
    });
  }

  if (allData.length === 0) {
    console.log("No data found in any worksheets");
    return;
  }

  // Create or clear summary sheet
  let summarySheet = workbook.getWorksheet(summarySheetName);
  if (summarySheet) {
    summarySheet.getUsedRange()?.clear(ExcelScript.ClearApplyTo.all);
  } else {
    summarySheet = workbook.addWorksheet(summarySheetName);
  }

  // Write summary
  let summaryHeaders: string[][] = [["Region/Sheet", "Records", "Total Revenue", "Total Units", "Avg Revenue"]];
  summarySheet.getRange("A1:E1").setValues(summaryHeaders);

  let summaryRows: (string | number)[][] = allData.map(d => [
    d.sheetName,
    d.rowCount,
    d.totalRevenue,
    d.totalUnits,
    d.avgRevenue
  ]);

  // Add grand total row
  let grandRevenue = allData.reduce((sum, d) => sum + d.totalRevenue, 0);
  let grandUnits = allData.reduce((sum, d) => sum + d.totalUnits, 0);
  let grandRecords = allData.reduce((sum, d) => sum + d.rowCount, 0);
  summaryRows.push(["GRAND TOTAL", grandRecords, grandRevenue, grandUnits, grandRecords > 0 ? grandRevenue / grandRecords : 0]);

  let dataRange = summarySheet.getRangeByIndexes(1, 0, summaryRows.length, 5);
  dataRange.setValues(summaryRows);

  // Format
  let headerRange = summarySheet.getRange("A1:E1");
  headerRange.getFormat().getFill().setColor("#4472C4");
  headerRange.getFormat().getFont().setColor("white");
  headerRange.getFormat().getFont().setBold(true);

  // Currency formatting
  let revenueRange = summarySheet.getRangeByIndexes(1, 2, summaryRows.length, 1);
  revenueRange.setNumberFormat("$#,##0.00");
  let avgRange = summarySheet.getRangeByIndexes(1, 4, summaryRows.length, 1);
  avgRange.setNumberFormat("$#,##0.00");

  // Bold the grand total row
  let totalRow = summarySheet.getRangeByIndexes(summaryRows.length, 0, 1, 5);
  totalRow.getFormat().getFont().setBold(true);
  totalRow.getFormat().getFill().setColor("#D9E2F3");

  // Create table
  let fullRange = summarySheet.getUsedRange();
  if (fullRange) {
    let table = summarySheet.addTable(fullRange, true);
    table.setName("SummaryTable");
    table.setPredefinedTableStyle("TableStyleMedium2");
  }

  // Auto-fit
  summarySheet.getUsedRange()?.getFormat().autofitColumns();

  // Create a chart
  let chartData = summarySheet.getRangeByIndexes(0, 0, summaryRows.length, 3); // Exclude grand total from chart
  let chart = summarySheet.addChart(ExcelScript.ChartType.barClustered, chartData);
  chart.setName("SummaryChart");
  chart.setPosition("G2");
  chart.setWidth(500);
  chart.setHeight(350);
  chart.getTitle().setVisible(true);
  chart.getTitle().setText("Revenue by Region");

  console.log(`Summary created: ${allData.length} sheets aggregated, Grand Total: $${grandRevenue.toFixed(2)}`);
}

function findColumnIndex(headers: string[], keyword: string): number {
  for (let i = 0; i < headers.length; i++) {
    if (headers[i].toLowerCase().includes(keyword)) {
      return i;
    }
  }
  return -1;
}

interface RegionSummary {
  sheetName: string;
  rowCount: number;
  totalRevenue: number;
  totalUnits: number;
  avgRevenue: number;
}
```

## 6. Conditional Formatting Report

Applies conditional formatting to highlight KPI thresholds.

```typescript
function main(workbook: ExcelScript.Workbook) {
  let sheet = workbook.getActiveWorksheet();
  let table = sheet.getTable("KPIData");
  if (!table) {
    console.log("Table 'KPIData' not found");
    return;
  }

  // Clear existing conditional formatting
  table.getRange().clearAllConditionalFormats();

  // Get column ranges
  let revenueCol = table.getColumnByName("Revenue");
  let marginCol = table.getColumnByName("Margin %");
  let statusCol = table.getColumnByName("Status");

  // Revenue: color scale (red → yellow → green)
  if (revenueCol) {
    let revenueRange = revenueCol.getRangeBetweenHeaderAndTotal();
    let colorScale = revenueRange.addConditionalFormat(ExcelScript.ConditionalFormatType.colorScale);
    colorScale.getColorScale().setCriteria({
      minimum: { color: "#F8696B", type: ExcelScript.ConditionalFormatColorCriterionType.lowestValue },
      midpoint: { color: "#FFEB84", type: ExcelScript.ConditionalFormatColorCriterionType.percentile, formula: "50" },
      maximum: { color: "#63BE7B", type: ExcelScript.ConditionalFormatColorCriterionType.highestValue }
    });
  }

  // Margin %: highlight below 10% in red
  if (marginCol) {
    let marginRange = marginCol.getRangeBetweenHeaderAndTotal();
    let lowMargin = marginRange.addConditionalFormat(ExcelScript.ConditionalFormatType.cellValue);
    lowMargin.getCellValue().setRule({
      formula1: "=0.1",
      operator: ExcelScript.ConditionalCellValueOperator.lessThan
    });
    lowMargin.getCellValue().getFormat().getFont().setColor("#9C0006");
    lowMargin.getCellValue().getFormat().getFill().setColor("#FFC7CE");
  }

  // Status: icon set or text-based highlighting
  if (statusCol) {
    let statusRange = statusCol.getRangeBetweenHeaderAndTotal();
    let statusValues = statusRange.getValues();

    // Read all data, apply cell-by-cell formatting based on text value
    for (let r = 0; r < statusValues.length; r++) {
      let cell = statusRange.getCell(r, 0);
      let status = statusValues[r][0] as string;
      if (status === "On Track") {
        cell.getFormat().getFill().setColor("#C6EFCE");
        cell.getFormat().getFont().setColor("#006100");
      } else if (status === "At Risk") {
        cell.getFormat().getFill().setColor("#FFEB9C");
        cell.getFormat().getFont().setColor("#9C6500");
      } else if (status === "Behind") {
        cell.getFormat().getFill().setColor("#FFC7CE");
        cell.getFormat().getFont().setColor("#9C0006");
      }
    }
  }

  console.log("Conditional formatting applied");
}
```
