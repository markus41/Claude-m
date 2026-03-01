# Table Operations Examples

Complete code examples for creating, filtering, sorting, and managing Excel tables in Office Scripts.

## 1. Create a Table from Data

```typescript
function main(workbook: ExcelScript.Workbook) {
  let sheet = workbook.getActiveWorksheet();

  // Write data
  let data: (string | number)[][] = [
    ["Product", "Region", "Revenue", "Units", "Status"],
    ["Widget A", "East", 15000, 120, "Active"],
    ["Widget B", "West", 22000, 180, "Active"],
    ["Widget C", "East", 8000, 65, "Inactive"],
    ["Widget D", "North", 31000, 250, "Active"],
    ["Widget E", "South", 12000, 95, "Pending"]
  ];

  let range = sheet.getRangeByIndexes(0, 0, data.length, data[0].length);
  range.setValues(data);

  // Create table
  let table = sheet.addTable(range, true);
  table.setName("SalesData");
  table.setPredefinedTableStyle("TableStyleMedium9");
  table.setShowBandedRows(true);
}
```

## 2. Sort a Table

```typescript
function main(workbook: ExcelScript.Workbook) {
  let sheet = workbook.getActiveWorksheet();
  let table = sheet.getTable("SalesData");
  if (!table) {
    console.log("Table 'SalesData' not found");
    return;
  }

  // Sort by Revenue descending, then by Product ascending
  table.getSort().apply([
    { key: 2, ascending: false },  // Revenue (column index 2) descending
    { key: 0, ascending: true }    // Product (column index 0) ascending
  ]);
}
```

## 3. Filter a Table — Include Specific Values

```typescript
function main(workbook: ExcelScript.Workbook) {
  let sheet = workbook.getActiveWorksheet();
  let table = sheet.getTable("SalesData");
  if (!table) return;

  // Filter Region column to only show "East" and "West"
  let regionCol = table.getColumnByName("Region");
  if (!regionCol) {
    console.log("Column 'Region' not found");
    return;
  }

  regionCol.getFilter().applyValuesFilter(["East", "West"]);
}
```

## 4. Filter a Table — Exclude Specific Values

```typescript
function main(workbook: ExcelScript.Workbook) {
  let sheet = workbook.getActiveWorksheet();
  let table = sheet.getTable("SalesData");
  if (!table) return;

  // To exclude values, get all unique values and filter to everything except excluded
  let statusCol = table.getColumnByName("Status");
  if (!statusCol) return;

  let dataRange = statusCol.getRangeBetweenHeaderAndTotal();
  let values = dataRange.getValues();

  // Get unique values
  let uniqueValues = new Set<string>();
  for (let row of values) {
    uniqueValues.add(row[0] as string);
  }

  // Remove the values we want to exclude
  uniqueValues.delete("Inactive");

  // Apply filter with remaining values
  let includeValues: string[] = [];
  uniqueValues.forEach(v => includeValues.push(v));
  statusCol.getFilter().applyValuesFilter(includeValues);
}
```

## 5. Clear All Table Filters

```typescript
function main(workbook: ExcelScript.Workbook) {
  let sheet = workbook.getActiveWorksheet();
  let table = sheet.getTable("SalesData");
  if (!table) return;

  // Clear all filters
  table.clearFilters();
  console.log("All filters cleared");
}
```

## 6. Add Rows to a Table

```typescript
function main(workbook: ExcelScript.Workbook) {
  let sheet = workbook.getActiveWorksheet();
  let table = sheet.getTable("SalesData");
  if (!table) return;

  // Add a single row at the end
  table.addRow(-1, ["Widget F", "West", 18500, 140, "Active"]);

  // Add multiple rows at once (more efficient)
  table.addRows(-1, [
    ["Widget G", "North", 9200, 70, "Active"],
    ["Widget H", "South", 27000, 210, "Pending"],
    ["Widget I", "East", 14300, 115, "Active"]
  ]);

  console.log(`Table now has ${table.getRows().length} data rows`);
}
```

## 7. Read Table Data with Column Names

```typescript
function main(workbook: ExcelScript.Workbook) {
  let sheet = workbook.getActiveWorksheet();
  let table = sheet.getTable("SalesData");
  if (!table) return;

  // Get headers for column mapping
  let headers = table.getHeaderRowRange().getValues()[0] as string[];
  let data = table.getRangeBetweenHeaderAndTotal().getValues();

  // Build column index map
  let colMap = new Map<string, number>();
  for (let i = 0; i < headers.length; i++) {
    colMap.set(headers[i], i);
  }

  // Access data by column name
  let revenueCol = colMap.get("Revenue");
  let regionCol = colMap.get("Region");
  if (revenueCol === undefined || regionCol === undefined) return;

  let totalRevenue = 0;
  let regionTotals = new Map<string, number>();

  for (let row of data) {
    let revenue = row[revenueCol] as number;
    let region = row[regionCol] as string;

    totalRevenue += revenue;
    let current = regionTotals.get(region) ?? 0;
    regionTotals.set(region, current + revenue);
  }

  console.log(`Total revenue: ${totalRevenue}`);
  regionTotals.forEach((total, region) => {
    console.log(`${region}: ${total}`);
  });
}
```

## 8. Add Totals Row with Functions

```typescript
function main(workbook: ExcelScript.Workbook) {
  let sheet = workbook.getActiveWorksheet();
  let table = sheet.getTable("SalesData");
  if (!table) return;

  // Show totals row
  table.setShowTotals(true);

  // Set total functions for specific columns
  let revenueCol = table.getColumnByName("Revenue");
  if (revenueCol) {
    revenueCol.setTotalRowFunction(ExcelScript.TotalRowFunction.sum);
  }

  let unitsCol = table.getColumnByName("Units");
  if (unitsCol) {
    unitsCol.setTotalRowFunction(ExcelScript.TotalRowFunction.average);
  }

  // Available functions: sum, average, count, countNumbers, max, min, standardDeviation, variance
  // Set label in the first column
  let firstCol = table.getColumn(0);
  if (firstCol) {
    firstCol.setTotalRowFunction(ExcelScript.TotalRowFunction.none);
    let totalCell = firstCol.getTotalRowRange();
    totalCell.setValue("Totals");
  }
}
```

## 9. Format All Tables on a Sheet

```typescript
function main(workbook: ExcelScript.Workbook) {
  let sheet = workbook.getActiveWorksheet();
  let tables = sheet.getTables();

  for (let table of tables) {
    // Apply consistent style
    table.setPredefinedTableStyle("TableStyleMedium2");
    table.setShowBandedRows(true);
    table.setShowBandedColumns(false);
    table.setShowFilterButton(true);

    // Format header row
    let headerRange = table.getHeaderRowRange();
    headerRange.getFormat().getFont().setBold(true);
    headerRange.getFormat().getFont().setColor("white");
    headerRange.getFormat().getFill().setColor("#4472C4");

    // Auto-fit columns
    table.getRange().getFormat().autofitColumns();

    console.log(`Formatted table: ${table.getName()}`);
  }
}
```

## 10. Delete and Recreate Table (Structure Change)

```typescript
function main(workbook: ExcelScript.Workbook) {
  let sheet = workbook.getActiveWorksheet();
  let table = sheet.getTable("SalesData");
  if (!table) return;

  // Save existing data
  let headers = table.getHeaderRowRange().getValues()[0];
  let data = table.getRangeBetweenHeaderAndTotal().getValues();
  let tableName = table.getName();
  let tableStyle = "TableStyleMedium9";

  // Delete old table
  let tableRange = table.getRange();
  table.delete();
  tableRange.clear(ExcelScript.ClearApplyTo.all);

  // Add new column
  let newHeaders: (string | number | boolean)[] = [...headers, "Margin %"];
  let revenueIdx = (headers as string[]).indexOf("Revenue");

  let newData: (string | number | boolean)[][] = data.map(row => {
    let revenue = row[revenueIdx] as number;
    let margin = revenue > 0 ? (revenue * 0.15 / revenue) : 0;
    return [...row, margin];
  });

  // Write new data
  let allRows: (string | number | boolean)[][] = [newHeaders, ...newData];
  let newRange = sheet.getRangeByIndexes(0, 0, allRows.length, newHeaders.length);
  newRange.setValues(allRows);

  // Recreate table
  let newTable = sheet.addTable(newRange, true);
  newTable.setName(tableName);
  newTable.setPredefinedTableStyle(tableStyle);

  // Format new column as percentage
  let marginCol = newTable.getColumnByName("Margin %");
  if (marginCol) {
    marginCol.getRangeBetweenHeaderAndTotal().setNumberFormat("0.0%");
  }
}
```

## 11. Custom Filter — Numeric Conditions

```typescript
function main(workbook: ExcelScript.Workbook) {
  let sheet = workbook.getActiveWorksheet();
  let table = sheet.getTable("SalesData");
  if (!table) return;

  let revenueCol = table.getColumnByName("Revenue");
  if (!revenueCol) return;

  // Filter: Revenue > 10000
  revenueCol.getFilter().applyCustomFilter(">10000");

  // Filter: Revenue between 5000 and 20000
  // revenueCol.getFilter().applyCustomFilter(
  //   ">=5000",
  //   "<=20000",
  //   ExcelScript.FilterOperator.and
  // );
}
```

## 12. Process Filtered (Visible) Rows Only

```typescript
function main(workbook: ExcelScript.Workbook) {
  let sheet = workbook.getActiveWorksheet();
  let table = sheet.getTable("SalesData");
  if (!table) return;

  // Get only visible cells after filtering
  let dataRange = table.getRangeBetweenHeaderAndTotal();
  let visibleCells = dataRange.getSpecialCells(ExcelScript.SpecialCellType.visible);

  if (visibleCells) {
    let areas = visibleCells.getAreas();
    let visibleCount = 0;

    for (let area of areas) {
      let values = area.getValues();
      visibleCount += values.length;
    }

    console.log(`${visibleCount} visible rows out of ${table.getRows().length} total`);
  }
}
```
