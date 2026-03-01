---
description: "Create a new Excel Office Script from a description"
argument-hint: "Description of what the script should do"
allowed-tools:
  - Read
  - Write
  - Glob
  - Grep
  - Skill
---

# /create-script — Generate an Excel Office Script

## Purpose

Creates a complete, valid Excel Office Script from a natural language description. The generated script follows all TypeScript 4.0.3 restrictions and Office Scripts platform constraints.

## Instructions

When this command is invoked:

1. **Load the office-scripts skill** for reference on API patterns, constraints, and examples.

2. **Analyze the user's description** to determine:
   - What Excel objects are needed (worksheets, ranges, tables, charts, etc.)
   - Whether external API calls are needed (requires `async main`)
   - Whether Power Automate parameters are needed
   - What error handling is appropriate

3. **Generate a complete Office Script** that:
   - Has the correct `function main(workbook: ExcelScript.Workbook)` entry point
   - Uses `async function main(...)` only if `fetch` is needed
   - Follows all TypeScript 4.0.3 restrictions (no `any`, no imports, no classes, no generators, no arrow function declarations)
   - Includes verify-before-use checks (null checks on `getWorksheet`, `getTable`, etc.)
   - Defines all interfaces and helper functions in the same file
   - Uses efficient patterns (read all data at once, write all at once, avoid API calls in loops)
   - Includes appropriate number formatting, date handling, and string typing
   - Adds `@param` JSDoc comments if the script has Power Automate parameters

4. **Write the script** to a `.ts` file in the current directory or a user-specified location.

5. **Explain the script** briefly: what it does, key decisions made, and any assumptions.

## Checklist Before Output

Before writing the file, verify the script against these rules:

- [ ] `main` function is present with correct signature
- [ ] No `any` type (explicit or implicit)
- [ ] No `import`, `require`, or `export` statements
- [ ] No external library usage
- [ ] No class declarations
- [ ] No generator functions (`function*`)
- [ ] No `eval()`
- [ ] Arrow functions used only as callbacks (not as declarations)
- [ ] All singular `get` methods have null/undefined checks
- [ ] No API calls inside loops (read/write batched)
- [ ] All interfaces/helpers defined in the same file
- [ ] If using `fetch`: main is `async` and CORS note is mentioned
- [ ] If Power Automate params: JSDoc `@param` comments are included
- [ ] Return type is explicitly declared if returning a value

## Example Usage

```bash
# Simple table creation
/create-script Create a table from the data in Sheet1 with auto-formatting

# Data processing
/create-script Read all rows, calculate a "Status" column based on the Score column (>=90 = Excellent, >=70 = Good, else Needs Improvement), and highlight rows by status color

# Power Automate integration
/create-script Accept a sheet name and array of employee records from Power Automate, write them to the specified sheet, and return the count and total salary

# External API
/create-script Fetch the latest USD exchange rates from exchangerate-api.com and write them to a new "Rates" worksheet
```
