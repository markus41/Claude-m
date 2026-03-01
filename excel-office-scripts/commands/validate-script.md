---
description: "Validate an Office Script for compliance and best practices"
argument-hint: "[file-path]"
allowed-tools:
  - Read
  - Glob
  - Grep
  - Skill
---

# /validate-script — Validate an Excel Office Script

## Purpose

Checks an existing Office Script file against all TypeScript 4.0.3 restrictions, platform constraints, and performance best practices. Reports issues with severity levels and suggestions for fixes.

## Instructions

When this command is invoked:

1. **Read the specified file** (or prompt for a file path if not provided).

2. **Load the office-scripts skill** for reference on constraints and best practices.

3. **Run all validation checks** listed below and collect findings.

4. **Report results** organized by severity:
   - **Error**: Will prevent the script from running (must fix)
   - **Warning**: May cause issues or poor performance (should fix)
   - **Info**: Style suggestions and minor improvements (optional)

## Validation Checks

### Errors (Script Will Not Run)

| Check | What to Look For |
|-------|-----------------|
| Missing `main` | No `function main(workbook: ExcelScript.Workbook)` found |
| Wrong `main` signature | First parameter is not `workbook: ExcelScript.Workbook` |
| Explicit `any` type | Variables, parameters, or return types typed as `any` |
| `as any` cast | Any use of `as any` or `<any>` |
| Import statements | `import ... from`, `require(...)`, or `export` |
| External libraries | References to npm packages, DOM APIs, Node.js APIs |
| Class declarations | `class Foo { ... }` |
| Generator functions | `function* name()` or `function *name()` |
| `eval()` usage | `eval(...)` or `new Function(...)` |
| Custom enum declarations | `enum Name { ... }` |
| Arrow function declarations | `const fn = (...) => { ... }` at top level (not as callback) |

### Warnings (May Cause Issues)

| Check | What to Look For |
|-------|-----------------|
| Missing null checks | Calling methods on result of singular `get` without checking for `undefined` |
| `fetch` without `async` | Using `fetch` but `main` is not `async` |
| `fetch` with Power Automate params | Script uses both `fetch` and has extra `main` parameters (fetch won't work in PA) |
| API calls in loops | `getValues()`, `setValues()`, `getValue()`, `setValue()`, `getFormat()` etc. inside `for`/`while` loops |
| `console.log` in loops | Logging inside loops (performance impact) |
| Missing return type | Script returns a value but return type is not explicitly declared |
| Large range operations | Operations on hardcoded large ranges like `A1:Z10000` without dynamic sizing |
| No error handling for `fetch` | `fetch` call without try/catch or response status check |

### Info (Suggestions)

| Check | What to Look For |
|-------|-----------------|
| Unused variables | Variables declared but never referenced |
| Hardcoded sheet names | Sheet names as string literals (consider parameters) |
| Missing JSDoc | Power Automate parameters without `@param` JSDoc comments |
| Table style not set | Table created without `setPredefinedTableStyle` |
| No auto-fit | Data written without `autofitColumns()` |
| Calculation mode | Large writes without pausing calculation mode |

## Output Format

```
## Office Script Validation Report

**File:** `path/to/script.ts`
**Status:** X errors, Y warnings, Z info

### Errors
- **Line 15:** Explicit `any` type — `let data: any = ...`
  → Fix: Use `(string | number | boolean)[][]` for range values

### Warnings
- **Line 23:** `getValue()` called inside for loop (15 iterations)
  → Fix: Read all values at once before the loop with `getValues()`

### Info
- **Line 5:** Hardcoded sheet name "Sheet1" — consider making it a parameter
- **Line 30:** Table created without style — consider `setPredefinedTableStyle()`

### Summary
The script has 1 error that must be fixed before it will run.
After fixing the error, consider addressing the warnings for better performance.
```

## Example Usage

```bash
# Validate a specific file
/validate-script ./my-script.ts

# Validate with just a path
/validate-script C:\Users\me\Documents\Office Scripts\report-generator.ts
```
