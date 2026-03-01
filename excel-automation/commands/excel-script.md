---
description: "Generate an Office Script for Excel formatting and automation"
argument-hint: "<description> [--format osts|typescript|both]"
allowed-tools:
  - Read
  - Write
  - Glob
  - Grep
  - Skill
---

# /excel-script — Generate an Office Script

## Purpose

Creates a complete, valid Excel Office Script from a natural language description. The generated script follows all TypeScript 4.0.3 restrictions and Office Scripts platform constraints. This is the primary command for generating scripts that format, transform, or automate Excel workbooks.

## Difference from /create-script

`/excel-script` is the recommended command for new usage. It supersedes `/create-script` with additional features:
- Supports `--format` flag for output format control (`.osts`, `.ts`, or both)
- Includes the verify-before-use defensive coding pattern by default
- Generates both the raw TypeScript and optionally the `.osts` wrapper
- Better integration with the pandas cleaning pipeline (scripts that format the output of `/excel-clean`)

## Instructions

When this command is invoked:

1. **Load the office-scripts skill** for reference on API patterns, constraints, examples, and Power Automate integration.

2. **Analyze the user's description** to determine:
   - What Excel objects are needed (worksheets, ranges, tables, charts, pivot-like summaries)
   - Whether external API calls are needed (requires `async main` and `fetch`)
   - Whether Power Automate parameters are needed (extra `main` parameters with JSDoc)
   - What error handling strategy is appropriate
   - Whether the script operates on existing data or creates new data

3. **Generate a complete Office Script** that:
   - Has the correct `function main(workbook: ExcelScript.Workbook)` entry point
   - Uses `async function main(...)` only if `fetch` is needed
   - Follows all TypeScript 4.0.3 restrictions:
     - No `any` type (explicit or implicit)
     - No `import`, `require`, or `export` statements
     - No class declarations
     - No generator functions (`function*`)
     - No `eval()` or `new Function()`
     - No custom `enum` declarations
     - Arrow functions only as callbacks, not top-level declarations
   - Includes verify-before-use pattern for all singular `get` methods:
     ```typescript
     let sheet = workbook.getWorksheet("Data");
     if (!sheet) {
       throw new Error("Worksheet 'Data' not found");
     }
     ```
   - Defines all interfaces and helper functions in the same file
   - Uses efficient patterns (read all data at once, process in memory, write all at once)
   - Uses batch operations (`setValues()` with 2D arrays) instead of cell-by-cell writes
   - Includes appropriate number formatting, date handling, and string typing
   - Adds `@param` JSDoc comments if the script has Power Automate parameters
   - Uses `(string | number | boolean)[][]` for range value arrays (never `any[][]`)

4. **Handle output format** based on `--format` flag:
   - `typescript` (default): Write a `.ts` file with the raw TypeScript
   - `osts`: Write an `.osts` file (Office Script format — same TypeScript content but with `.osts` extension for direct import into Excel)
   - `both`: Write both `.ts` and `.osts` files

5. **Write the script** to the current directory or user-specified location.

6. **Explain the script** briefly:
   - What it does (one paragraph)
   - Key design decisions
   - Any assumptions about the workbook structure
   - How to use it (manual run vs. Power Automate)

## Verify-Before-Use Pattern

All generated scripts MUST include null/undefined checks after these API calls:

```typescript
// Worksheet lookup
let sheet = workbook.getWorksheet("Name");
if (!sheet) { throw new Error("Worksheet 'Name' not found"); }

// Table lookup
let table = sheet.getTable("TableName");
if (!table) { throw new Error("Table 'TableName' not found"); }

// Column lookup
let col = table.getColumnByName("ColumnName");
if (!col) { throw new Error("Column 'ColumnName' not found in table"); }

// Named item lookup
let namedItem = workbook.getNamedItem("ItemName");
if (!namedItem) { throw new Error("Named item 'ItemName' not found"); }
```

## Checklist Before Output

- [ ] `main` function present with correct signature
- [ ] No `any` type anywhere (explicit or implicit)
- [ ] No `import`, `require`, or `export` statements
- [ ] No class declarations, generators, or `eval()`
- [ ] Arrow functions only used as callbacks (not as top-level declarations)
- [ ] All singular `get` methods have null/undefined checks
- [ ] No API calls inside loops (data read/write is batched)
- [ ] All interfaces and helpers defined in the same file
- [ ] If using `fetch`: `main` is `async` and CORS note is mentioned
- [ ] If Power Automate params: `@param` JSDoc comments included
- [ ] Return type explicitly declared if returning a value
- [ ] Correct file extension based on `--format` flag

## Example Usage

```bash
# Basic formatting
/excel-script Format Sheet1 as a professional table with alternating row colors and auto-fit columns

# Data transformation
/excel-script Read all rows, add a "Grade" column based on Score (>=90 A, >=80 B, >=70 C, else F), and color-code each grade

# Power Automate integration
/excel-script Accept a sheet name and employee records array from Power Automate, write them, return count and total salary

# Chart creation
/excel-script Create a bar chart from the monthly sales data in the "Summary" table

# Generate .osts for direct Excel import
/excel-script --format osts Create a pivot-style summary of quarterly revenue by region

# Both formats
/excel-script --format both Merge data from Sheet1 and Sheet2 into a consolidated report on Sheet3
```
