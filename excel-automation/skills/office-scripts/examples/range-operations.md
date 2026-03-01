# Range Operations Examples

Complete code examples for common range operations in Office Scripts.

## 1. Read a Single Cell

```typescript
function main(workbook: ExcelScript.Workbook) {
  let sheet = workbook.getActiveWorksheet();
  let value = sheet.getRange("A1").getValue();
  let text = sheet.getRange("A1").getText();
  console.log(`Value: ${value}, Text: ${text}`);
}
```

## 2. Read and Write a Range

```typescript
function main(workbook: ExcelScript.Workbook) {
  let sheet = workbook.getActiveWorksheet();

  // Write header and data
  let data: (string | number)[][] = [
    ["Product", "Q1", "Q2", "Q3", "Q4"],
    ["Widget A", 1200, 1500, 1800, 2100],
    ["Widget B", 800, 950, 1100, 1300],
    ["Widget C", 2000, 2200, 2500, 2800]
  ];

  let range = sheet.getRangeByIndexes(0, 0, data.length, data[0].length);
  range.setValues(data);
}
```

## 3. Dynamic Sizing with getUsedRange

```typescript
function main(workbook: ExcelScript.Workbook) {
  let sheet = workbook.getActiveWorksheet();
  let usedRange = sheet.getUsedRange();

  if (!usedRange) {
    console.log("Sheet is empty");
    return;
  }

  let values = usedRange.getValues();
  let rowCount = usedRange.getRowCount();
  let colCount = usedRange.getColumnCount();
  console.log(`Data: ${rowCount} rows x ${colCount} columns`);

  // Process each row (skip header)
  for (let i = 1; i < values.length; i++) {
    let name = values[i][0] as string;
    let amount = values[i][1] as number;
    console.log(`${name}: ${amount}`);
  }
}
```

## 4. Set Formulas

```typescript
function main(workbook: ExcelScript.Workbook) {
  let sheet = workbook.getActiveWorksheet();

  // Assume data in A1:D10 with header row
  // Add SUM formulas in row 11
  sheet.getRange("A11").setValue("Totals");
  sheet.getRange("B11").setFormula("=SUM(B2:B10)");
  sheet.getRange("C11").setFormula("=SUM(C2:C10)");
  sheet.getRange("D11").setFormula("=SUM(D2:D10)");

  // Add calculated column (E) with AVERAGE per row
  let usedRange = sheet.getUsedRange();
  if (!usedRange) return;

  let rowCount = usedRange.getRowCount();
  sheet.getRange("E1").setValue("Average");

  let formulas: string[][] = [];
  for (let i = 2; i <= rowCount; i++) {
    formulas.push([`=AVERAGE(B${i}:D${i})`]);
  }

  let formulaRange = sheet.getRangeByIndexes(1, 4, formulas.length, 1);
  formulaRange.setFormulas(formulas);
}
```

## 5. Format a Header Row

```typescript
function main(workbook: ExcelScript.Workbook) {
  let sheet = workbook.getActiveWorksheet();
  let usedRange = sheet.getUsedRange();
  if (!usedRange) return;

  let headerRange = usedRange.getRow(0);

  // Background color
  headerRange.getFormat().getFill().setColor("#4472C4");

  // Font
  let font = headerRange.getFormat().getFont();
  font.setColor("white");
  font.setBold(true);
  font.setSize(12);
  font.setName("Calibri");

  // Alignment
  headerRange.getFormat().setHorizontalAlignment(ExcelScript.HorizontalAlignment.center);

  // Auto-fit columns
  usedRange.getFormat().autofitColumns();

  // Freeze the header row
  sheet.getFreezePanes().freezeRows(1);
}
```

## 6. Apply Number Formatting

```typescript
function main(workbook: ExcelScript.Workbook) {
  let sheet = workbook.getActiveWorksheet();

  // Currency column (B)
  sheet.getRange("B2:B100").setNumberFormat("$#,##0.00");

  // Percentage column (C)
  sheet.getRange("C2:C100").setNumberFormat("0.0%");

  // Date column (D)
  sheet.getRange("D2:D100").setNumberFormat("yyyy-mm-dd");

  // Accounting format (E)
  sheet.getRange("E2:E100").setNumberFormat('_($* #,##0.00_);_($* (#,##0.00);_($* "-"??_);_(@_)');

  // Phone number (F) — force text
  sheet.getRange("F2:F100").setNumberFormat("@");
}
```

## 7. Iterate Over Rows and Process Data

```typescript
function main(workbook: ExcelScript.Workbook) {
  let sheet = workbook.getActiveWorksheet();
  let usedRange = sheet.getUsedRange();
  if (!usedRange) return;

  let values = usedRange.getValues();

  // Find column indices from header
  let headers = values[0] as string[];
  let nameCol = headers.indexOf("Name");
  let scoreCol = headers.indexOf("Score");
  let gradeCol = headers.indexOf("Grade");

  if (nameCol === -1 || scoreCol === -1) {
    console.log("Required columns not found");
    return;
  }

  // Calculate grades based on score
  let updatedValues: (string | number | boolean)[][] = [];
  for (let i = 1; i < values.length; i++) {
    let score = values[i][scoreCol] as number;
    let grade: string;
    if (score >= 90) grade = "A";
    else if (score >= 80) grade = "B";
    else if (score >= 70) grade = "C";
    else if (score >= 60) grade = "D";
    else grade = "F";

    updatedValues.push([grade]);
  }

  // Write grades to the Grade column
  if (gradeCol === -1) {
    // Add new column
    gradeCol = headers.length;
    sheet.getRange(`${getColumnLetter(gradeCol)}1`).setValue("Grade");
  }

  let gradeRange = sheet.getRangeByIndexes(1, gradeCol, updatedValues.length, 1);
  gradeRange.setValues(updatedValues);
}

function getColumnLetter(index: number): string {
  let letter = "";
  while (index >= 0) {
    letter = String.fromCharCode((index % 26) + 65) + letter;
    index = Math.floor(index / 26) - 1;
  }
  return letter;
}
```

## 8. Find and Replace

```typescript
function main(workbook: ExcelScript.Workbook) {
  let sheet = workbook.getActiveWorksheet();
  let usedRange = sheet.getUsedRange();
  if (!usedRange) return;

  let values = usedRange.getValues();
  let changed = 0;

  // Replace "N/A" with 0 in all cells
  for (let r = 0; r < values.length; r++) {
    for (let c = 0; c < values[r].length; c++) {
      if (values[r][c] === "N/A" || values[r][c] === "#N/A") {
        values[r][c] = 0;
        changed++;
      }
    }
  }

  if (changed > 0) {
    usedRange.setValues(values);
    console.log(`Replaced ${changed} cells`);
  }
}
```

## 9. Work with Special Cells (Blanks)

```typescript
function main(workbook: ExcelScript.Workbook) {
  let sheet = workbook.getActiveWorksheet();
  let dataRange = sheet.getRange("A1:D100");

  // Highlight blank cells
  let blanks = dataRange.getSpecialCells(ExcelScript.SpecialCellType.blanks);
  if (blanks) {
    let areas = blanks.getAreas();
    for (let area of areas) {
      area.getFormat().getFill().setColor("#FFC7CE"); // Light red
    }
    console.log(`Found ${areas.length} blank areas`);
  }
}
```

## 10. Handle SPILL Ranges (Dynamic Arrays)

```typescript
function main(workbook: ExcelScript.Workbook) {
  let sheet = workbook.getActiveWorksheet();

  // Set a dynamic array formula (UNIQUE, SORT, FILTER, etc.)
  sheet.getRange("E1").setFormula("=UNIQUE(A2:A100)");

  // To read the spill range, use getSpillingToRange()
  let spillAnchor = sheet.getRange("E1");
  let spillRange = spillAnchor.getSpillingToRange();

  if (spillRange) {
    let uniqueValues = spillRange.getValues();
    console.log(`Found ${uniqueValues.length} unique values`);
  }
}
```

## 11. Copy Formatting Between Ranges

```typescript
function main(workbook: ExcelScript.Workbook) {
  let sheet = workbook.getActiveWorksheet();

  let sourceRange = sheet.getRange("A1:D1"); // Formatted header
  let targetRange = sheet.getRange("A10:D10"); // Target header

  // Copy formats only (not values)
  targetRange.copyFrom(sourceRange, ExcelScript.RangeCopyType.formats);
}
```

## 12. Add Borders to a Data Range

```typescript
function main(workbook: ExcelScript.Workbook) {
  let sheet = workbook.getActiveWorksheet();
  let usedRange = sheet.getUsedRange();
  if (!usedRange) return;

  // Outer border (thick)
  let outerBorders = [
    ExcelScript.BorderIndex.edgeTop,
    ExcelScript.BorderIndex.edgeBottom,
    ExcelScript.BorderIndex.edgeLeft,
    ExcelScript.BorderIndex.edgeRight
  ];
  for (let b of outerBorders) {
    let border = usedRange.getFormat().getRangeBorder(b);
    border.setStyle(ExcelScript.BorderLineStyle.continuous);
    border.setWeight(ExcelScript.BorderWeight.medium);
    border.setColor("#000000");
  }

  // Inner borders (thin)
  let innerBorders = [
    ExcelScript.BorderIndex.insideHorizontal,
    ExcelScript.BorderIndex.insideVertical
  ];
  for (let b of innerBorders) {
    let border = usedRange.getFormat().getRangeBorder(b);
    border.setStyle(ExcelScript.BorderLineStyle.continuous);
    border.setWeight(ExcelScript.BorderWeight.thin);
    border.setColor("#BFBFBF");
  }
}
```
