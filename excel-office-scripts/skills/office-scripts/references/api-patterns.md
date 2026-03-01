# Office Scripts API Patterns

Complete reference for the ExcelScript API surface organized by object type.

## Workbook

The `workbook` parameter is always available as the first argument to `main`.

```typescript
// Worksheets
let sheets: ExcelScript.Worksheet[] = workbook.getWorksheets();
let active: ExcelScript.Worksheet = workbook.getActiveWorksheet();
let sheet: ExcelScript.Worksheet | undefined = workbook.getWorksheet("Sheet1");
let newSheet: ExcelScript.Worksheet = workbook.addWorksheet("NewSheet");

// Tables (workbook-scoped access)
let tables: ExcelScript.Table[] = workbook.getTables();
let table: ExcelScript.Table | undefined = workbook.getTable("TableName");

// Named items
let names: ExcelScript.NamedItem[] = workbook.getNames();
let item: ExcelScript.NamedItem | undefined = workbook.getNamedItem("MyRange");
workbook.addNamedItem("TotalSales", sheet.getRange("B10"));

// Selected range
let selected: ExcelScript.Range = workbook.getSelectedRange();

// Application settings
let app: ExcelScript.Application = workbook.getApplication();
app.setCalculationMode(ExcelScript.CalculationMode.manual);
app.setCalculationMode(ExcelScript.CalculationMode.automatic);
app.calculate(ExcelScript.CalculationType.full);
```

## Worksheet

```typescript
// Identity
let name: string = sheet.getName();
sheet.setName("Renamed");
let id: string = sheet.getId();
let position: number = sheet.getPosition();
sheet.setPosition(0); // Move to first

// Visibility
sheet.setVisibility(ExcelScript.SheetVisibility.hidden);
sheet.setVisibility(ExcelScript.SheetVisibility.visible);

// Ranges
let range: ExcelScript.Range = sheet.getRange("A1:C10");
let cell: ExcelScript.Range = sheet.getRange("B5");
let usedRange: ExcelScript.Range = sheet.getUsedRange();
let usedRangeOrNull: ExcelScript.Range | undefined = sheet.getUsedRange();
let byIndex: ExcelScript.Range = sheet.getRangeByIndexes(0, 0, 10, 3); // row, col, rowCount, colCount

// Tables
let tables: ExcelScript.Table[] = sheet.getTables();
let table: ExcelScript.Table | undefined = sheet.getTable("SalesTable");
let newTable: ExcelScript.Table = sheet.addTable(sheet.getRange("A1:D10"), true);

// Charts
let charts: ExcelScript.Chart[] = sheet.getCharts();
let chart: ExcelScript.Chart | undefined = sheet.getChart("SalesChart");
let newChart: ExcelScript.Chart = sheet.addChart(
  ExcelScript.ChartType.columnClustered,
  sheet.getRange("A1:B10")
);

// Freeze panes
sheet.getFreezePanes().freezeRows(1);
sheet.getFreezePanes().freezeColumns(1);
sheet.getFreezePanes().unfreeze();

// Copy / Delete
sheet.copy(ExcelScript.WorksheetPositionType.after, sheet);
sheet.delete();

// Protection
sheet.getProtection().protect();
sheet.getProtection().unprotect("password");

// Auto filter
sheet.getAutoFilter().apply(sheet.getRange("A1:D10"), 0, {
  filterOn: ExcelScript.FilterOn.values,
  values: ["Active"]
});
sheet.getAutoFilter().clearCriteria();
sheet.getAutoFilter().remove();

// Page layout (for printing)
let layout = sheet.getPageLayout();
layout.setOrientation(ExcelScript.PageOrientation.landscape);
layout.setPrintGridlines(true);
```

## Range

### Reading Values

```typescript
// Single value
let val: string | number | boolean = range.getValue();
let text: string = range.getText(); // Formatted text representation

// 2D array of values
let values: (string | number | boolean)[][] = range.getValues();
let texts: string[][] = range.getTexts();

// Formulas
let formula: string = range.getFormula();
let formulas: string[][] = range.getFormulas();
let formulasLocal: string[][] = range.getFormulasLocal(); // Locale-specific

// Range properties
let address: string = range.getAddress(); // e.g., "Sheet1!A1:C10"
let rowCount: number = range.getRowCount();
let colCount: number = range.getColumnCount();
let rowIndex: number = range.getRowIndex();
let colIndex: number = range.getColumnIndex();
let isEmpty: boolean = range.getIsEntireRow(); // Check if entire row/column
```

### Writing Values

```typescript
// Single value
range.setValue("Hello");
range.setValue(42);
range.setValue(true);

// 2D array — dimensions must match range exactly
range.setValues([
  ["Name", "Score", "Grade"],
  ["Alice", 95, "A"],
  ["Bob", 82, "B"]
]);

// Formulas
range.setFormula("=SUM(A1:A10)");
range.setFormulas([
  ["=SUM(B2:B10)", "=AVERAGE(B2:B10)"],
  ["=MAX(B2:B10)", "=MIN(B2:B10)"]
]);

// Clear contents
range.clear(ExcelScript.ClearApplyTo.contents);
range.clear(ExcelScript.ClearApplyTo.formats);
range.clear(ExcelScript.ClearApplyTo.all);
```

### Navigation and Resizing

```typescript
// Offset
let below: ExcelScript.Range = range.getOffsetRange(1, 0);  // 1 row down
let right: ExcelScript.Range = range.getOffsetRange(0, 2);  // 2 cols right

// Resize
let bigger: ExcelScript.Range = range.getResizedRange(5, 2); // Add 5 rows, 2 cols
let smaller: ExcelScript.Range = range.getResizedRange(-2, 0); // Remove 2 rows

// Specific sub-ranges
let row: ExcelScript.Range = range.getRow(0);         // First row
let col: ExcelScript.Range = range.getColumn(0);       // First column
let cell: ExcelScript.Range = range.getCell(2, 3);     // Row 2, Col 3
let lastCell: ExcelScript.Range = range.getLastCell();
let lastCol: ExcelScript.Range = range.getLastColumn();
let lastRow: ExcelScript.Range = range.getLastRow();

// Entire row / column
let entireRow: ExcelScript.Range = range.getEntireRow();
let entireCol: ExcelScript.Range = range.getEntireColumn();

// Surrounding region (contiguous non-empty cells)
let region: ExcelScript.Range = range.getSurroundingRegion();

// Intersection / bounding
let used: ExcelScript.Range = sheet.getUsedRange();

// Copy to another range
range.copyFrom(sourceRange, ExcelScript.RangeCopyType.all);
range.copyFrom(sourceRange, ExcelScript.RangeCopyType.values);
range.copyFrom(sourceRange, ExcelScript.RangeCopyType.formats);
range.copyFrom(sourceRange, ExcelScript.RangeCopyType.formulas);
```

### Special Cells

```typescript
// Find cells by type
let blanks: ExcelScript.RangeAreas = range.getSpecialCells(
  ExcelScript.SpecialCellType.blanks
);
let constants: ExcelScript.RangeAreas = range.getSpecialCells(
  ExcelScript.SpecialCellType.constants
);
let formulas: ExcelScript.RangeAreas = range.getSpecialCells(
  ExcelScript.SpecialCellType.formulas
);
let visible: ExcelScript.RangeAreas = range.getSpecialCells(
  ExcelScript.SpecialCellType.visible
);

// Iterate areas
let areas: ExcelScript.Range[] = blanks.getAreas();
for (let area of areas) {
  console.log(area.getAddress());
}
```

### Formatting

```typescript
let format: ExcelScript.RangeFormat = range.getFormat();

// Fill
format.getFill().setColor("#4472C4");
format.getFill().setPattern(ExcelScript.FillPattern.solid);
format.getFill().clear();

// Font
let font: ExcelScript.RangeFont = format.getFont();
font.setBold(true);
font.setItalic(true);
font.setColor("#FF0000");
font.setSize(14);
font.setName("Calibri");
font.setUnderline(ExcelScript.RangeUnderlineStyle.single);
font.setStrikethrough(true);

// Borders
let border: ExcelScript.RangeBorder = format.getRangeBorder(ExcelScript.BorderIndex.edgeBottom);
border.setStyle(ExcelScript.BorderLineStyle.continuous);
border.setWeight(ExcelScript.BorderWeight.medium);
border.setColor("#000000");

// All borders at once
let borders = [
  ExcelScript.BorderIndex.edgeTop,
  ExcelScript.BorderIndex.edgeBottom,
  ExcelScript.BorderIndex.edgeLeft,
  ExcelScript.BorderIndex.edgeRight
];
for (let b of borders) {
  let edge = format.getRangeBorder(b);
  edge.setStyle(ExcelScript.BorderLineStyle.continuous);
  edge.setWeight(ExcelScript.BorderWeight.thin);
}

// Number formatting
range.setNumberFormat("#,##0.00");         // 1,234.56
range.setNumberFormat("$#,##0.00");        // $1,234.56
range.setNumberFormat("0%");               // 85%
range.setNumberFormat("yyyy-mm-dd");       // 2024-01-15
range.setNumberFormat("@");                // Force text
range.setNumberFormatLocal("dd/mm/yyyy");  // Locale-specific

// Alignment
format.setHorizontalAlignment(ExcelScript.HorizontalAlignment.center);
format.setVerticalAlignment(ExcelScript.VerticalAlignment.center);
format.setWrapText(true);
format.setIndentLevel(2);
format.setTextOrientation(45); // Degrees

// Column/row sizing
format.setColumnWidth(120);
format.setRowHeight(30);
format.autofitColumns();
format.autofitRows();

// Merge
range.merge(false); // false = merge all cells
range.unmerge();
```

### Conditional Formatting

```typescript
// Add new conditional format
let cf = range.addConditionalFormat(ExcelScript.ConditionalFormatType.cellValue);
let cellValue = cf.getCellValue();

// Greater than
cellValue.setRule({
  formula1: "=100",
  operator: ExcelScript.ConditionalCellValueOperator.greaterThan
});
cellValue.getFormat().getFill().setColor("#C6EFCE");
cellValue.getFormat().getFont().setColor("#006100");

// Color scale
let colorCf = range.addConditionalFormat(ExcelScript.ConditionalFormatType.colorScale);
let scale = colorCf.getColorScale();
scale.setCriteria({
  minimum: { color: "#F8696B", type: ExcelScript.ConditionalFormatColorCriterionType.lowestValue },
  midpoint: { color: "#FFEB84", type: ExcelScript.ConditionalFormatColorCriterionType.percentile, formula: "50" },
  maximum: { color: "#63BE7B", type: ExcelScript.ConditionalFormatColorCriterionType.highestValue }
});

// Data bars
let dataCf = range.addConditionalFormat(ExcelScript.ConditionalFormatType.dataBar);
let dataBar = dataCf.getDataBar();
dataBar.getBarAxis().setFormat(ExcelScript.ConditionalDataBarAxisFormat.automatic);

// Icon set
let iconCf = range.addConditionalFormat(ExcelScript.ConditionalFormatType.iconSet);

// Clear all conditional formatting
range.clearAllConditionalFormats();
```

### Data Validation

```typescript
let validation: ExcelScript.DataValidation = range.getDataValidation();

// Whole number between 1 and 100
validation.setRule({
  wholeNumber: {
    formula1: "1",
    formula2: "100",
    operator: ExcelScript.DataValidationOperator.between
  }
});

// List of values
validation.setRule({
  list: {
    source: "High,Medium,Low",
    inCellDropDown: true
  }
});

// Custom formula
validation.setRule({
  custom: {
    formula: "=LEN(A1)<=50"
  }
});

// Error alert
validation.setErrorAlert({
  showAlert: true,
  style: ExcelScript.DataValidationAlertStyle.stop,
  title: "Invalid Entry",
  message: "Please enter a value between 1 and 100."
});

// Prompt message
validation.setPrompt({
  showPrompt: true,
  title: "Enter Value",
  message: "Type a number between 1 and 100."
});

// Clear validation
validation.clear();
```

## Table

```typescript
// Create
let table = sheet.addTable(sheet.getRange("A1:D10"), true /* hasHeaders */);
table.setName("SalesData");
table.setShowTotals(true);

// Columns
let columns: ExcelScript.TableColumn[] = table.getColumns();
let col: ExcelScript.TableColumn | undefined = table.getColumnByName("Revenue");
let colById: ExcelScript.TableColumn = table.getColumnById(1);
let colByIndex: ExcelScript.TableColumn = table.getColumn(0); // 0-based index

// Column operations
col.getFilter().applyValuesFilter(["Active", "Pending"]);
col.getFilter().clear();
col.getTotalRowFunction(); // Get total function
col.setTotalRowFunction(ExcelScript.TotalRowFunction.sum);

// Rows
let rows: ExcelScript.TableRow[] = table.getRows();
table.addRow(-1, ["New Product", 100, "East", "Active"]); // -1 = append at end
table.addRow(0, ["First Row", 50, "West", "Active"]);      // Insert at top
table.addRows(-1, [                                          // Add multiple rows
  ["Product A", 200, "East", "Active"],
  ["Product B", 300, "West", "Pending"]
]);
table.getRowById(0).delete(); // Delete by row ID

// Key ranges
let headerRow: ExcelScript.Range = table.getHeaderRowRange();
let dataRange: ExcelScript.Range = table.getRangeBetweenHeaderAndTotal();
let totalRow: ExcelScript.Range = table.getTotalRowRange();
let fullRange: ExcelScript.Range = table.getRange();
let colRange: ExcelScript.Range = table.getColumnByName("Revenue").getRangeBetweenHeaderAndTotal();

// Sort
let sort: ExcelScript.TableSort = table.getSort();
sort.apply([
  { key: 0, ascending: true },                                     // First column ascending
  { key: 2, ascending: false }                                     // Third column descending
]);
sort.clear();

// Filter
let filter: ExcelScript.Filter = table.getColumnByName("Region").getFilter();

// Values filter (include specific values)
filter.applyValuesFilter(["East", "West"]);

// Custom filter
filter.applyCustomFilter(">100", undefined, ExcelScript.FilterOperator.and);

// Top items filter
filter.applyTopItemsFilter(10);

// Clear single column filter
filter.clear();

// Clear all table filters
table.clearFilters();

// AutoFilter
let autoFilter: ExcelScript.AutoFilter = table.getAutoFilter();

// Table style
table.setPredefinedTableStyle("TableStyleMedium2");
table.setShowBandedRows(true);
table.setShowBandedColumns(false);
table.setShowFilterButton(true);

// Convert to range (remove table structure, keep data)
table.convertToRange();

// Delete table
table.delete();
```

### Delete-and-Recreate Pattern

Tables cannot be resized or have columns added structurally. To modify table structure:

```typescript
function main(workbook: ExcelScript.Workbook) {
  let sheet = workbook.getWorksheet("Data");
  if (!sheet) return;

  let oldTable = sheet.getTable("SalesData");
  if (oldTable) {
    // Save data
    let data = oldTable.getRangeBetweenHeaderAndTotal().getValues();
    let headers = oldTable.getHeaderRowRange().getValues()[0];
    // Delete old table
    oldTable.delete();

    // Add new column to headers
    let newHeaders = [...headers, "NewColumn"];
    let newData = data.map(row => [...row, ""]);

    // Recreate
    let newRange = sheet.getRangeByIndexes(0, 0, newData.length + 1, newHeaders.length);
    newRange.getRow(0).setValues([newHeaders]);
    newRange.getOffsetRange(1, 0).getResizedRange(-(newRange.getRowCount() - newData.length), 0)
      .setValues(newData);
    let newTable = sheet.addTable(newRange, true);
    newTable.setName("SalesData");
  }
}
```

## Chart

### Creating Charts

```typescript
let chart = sheet.addChart(
  ExcelScript.ChartType.columnClustered,
  sheet.getRange("A1:B10")
);
chart.setName("SalesChart");
chart.setPosition("E2"); // Top-left corner at cell E2
```

### Chart Types (ExcelScript.ChartType enum)

| Category | Types |
|----------|-------|
| Column | `columnClustered`, `columnStacked`, `columnStacked100` |
| Bar | `barClustered`, `barStacked`, `barStacked100` |
| Line | `line`, `lineMarkers`, `lineStacked`, `lineStackedMarkers` |
| Pie | `pie`, `doughnut`, `pieExploded`, `doughnutExploded` |
| Area | `area`, `areaStacked`, `areaStacked100` |
| Scatter | `xyscatter`, `xyscatterLines`, `xyscatterSmooth` |
| Combo | `columnLineCombo` (use series type overrides) |
| Other | `radar`, `waterfall`, `funnel`, `treemap`, `sunburst`, `histogram`, `boxwhisker` |

### Chart Customization

```typescript
// Title
chart.getTitle().setVisible(true);
chart.getTitle().setText("Monthly Sales");
chart.getTitle().getFormat().getFont().setSize(16);
chart.getTitle().getFormat().getFont().setBold(true);

// Legend
chart.getLegend().setVisible(true);
chart.getLegend().setPosition(ExcelScript.ChartLegendPosition.bottom);

// Axes
let valueAxis = chart.getAxes().getValueAxis();
valueAxis.setMinimum(0);
valueAxis.setMaximum(1000);
valueAxis.getTitle().setText("Revenue ($)");
valueAxis.getTitle().setVisible(true);
valueAxis.setNumberFormat("$#,##0");

let categoryAxis = chart.getAxes().getCategoryAxis();
categoryAxis.getTitle().setText("Month");
categoryAxis.getTitle().setVisible(true);
categoryAxis.setTickLabelRotation(45);

// Series customization
let series: ExcelScript.ChartSeries[] = chart.getSeries();
let firstSeries = series[0];
firstSeries.setFormat(/* ... */);
firstSeries.getFormat().getFill().setSolidColor("#4472C4");
firstSeries.setHasDataLabels(true);

// Data labels
let labels = firstSeries.getDataLabels();
labels.setShowValue(true);
labels.setShowCategoryName(false);
labels.setShowSeriesName(false);
labels.setPosition(ExcelScript.ChartDataLabelPosition.outsideEnd);
labels.getFormat().getFont().setSize(10);

// Size
chart.setWidth(600);
chart.setHeight(400);

// Delete chart
chart.delete();
```

## Shape

```typescript
// Add shapes
let shapes: ExcelScript.Shape[] = sheet.getShapes();
let rect = sheet.addGeometricShape(ExcelScript.GeometricShapeType.rectangle);
rect.setLeft(100);
rect.setTop(50);
rect.setWidth(200);
rect.setHeight(100);

// Text in shape
let textFrame = rect.getTextFrame();
textFrame.getTextRange().setText("Hello World");
textFrame.setHorizontalAlignment(ExcelScript.ShapeTextHorizontalAlignment.center);
textFrame.setVerticalAlignment(ExcelScript.ShapeTextVerticalAlignment.middle);

// Shape fill
rect.getFill().setSolidColor("#4472C4");

// Line properties
rect.getLineFormat().setColor("#000000");
rect.getLineFormat().setWeight(2);

// Delete
rect.delete();
```

## PivotTable

```typescript
// Create
let pivotTable = sheet.addPivotTable(
  "SalesPivot",
  sourceSheet.getRange("A1:E100"),
  sheet.getRange("A1")
);

// Add fields
pivotTable.addRowHierarchy(pivotTable.getHierarchy("Region"));
pivotTable.addColumnHierarchy(pivotTable.getHierarchy("Product"));
let dataHierarchy = pivotTable.addDataHierarchy(pivotTable.getHierarchy("Revenue"));
dataHierarchy.setSummarizeBy(ExcelScript.AggregationFunction.sum);
dataHierarchy.setNumberFormat("$#,##0.00");

// Filter
pivotTable.addFilterHierarchy(pivotTable.getHierarchy("Year"));

// Refresh
pivotTable.refresh();

// Get pivot ranges
let body = pivotTable.getLayout().getBodyAndTotalRange();
let values = body.getValues();

// Delete
pivotTable.delete();
```

## Comment

```typescript
// Add comment
let comment = sheet.addComment(sheet.getRange("A1"), "Review this value", "Author");

// Reply
comment.addCommentReply("Looks correct to me");

// Get comments
let comments: ExcelScript.Comment[] = sheet.getComments();
for (let c of comments) {
  console.log(`${c.getAuthorName()}: ${c.getContent()}`);
  let replies: ExcelScript.CommentReply[] = c.getReplies();
}

// Resolve / delete
comment.setResolved(true);
comment.delete();
```
