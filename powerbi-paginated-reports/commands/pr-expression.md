---
name: pr-expression
description: Generate VB.NET expressions for paginated reports from natural language descriptions. Supports formatting, conditionals, aggregates, lookups, and custom code.
argument-hint: "<description of what the expression should do> [--context field|header|footer|group|code]"
allowed-tools:
  - Read
  - Glob
  - Grep
---

# Generate Paginated Report Expression

Convert a natural language description into a VB.NET expression for use in paginated reports.

## Instructions

1. Parse the user's description to understand:
   - What the expression should calculate or display
   - Where it will be used (detail row, group header, footer, page header, custom code)
   - What fields, parameters, or globals it needs to reference

2. Read expression reference material:
   - `${CLAUDE_PLUGIN_ROOT}/skills/paginated-reports/references/expressions-code.md`
   - `${CLAUDE_PLUGIN_ROOT}/skills/paginated-reports/examples/expression-patterns.md`

3. Determine the expression context (`--context` flag or infer):
   - `field` — Detail row in a data region (has access to Fields!, aggregate functions)
   - `header` — Group header (has access to group-scoped aggregates)
   - `footer` — Group footer or report footer (aggregates, totals)
   - `page` — Page header or page footer (limited: Globals!, User!, Parameters!, ReportItems! only — no Fields!)
   - `code` — Custom code block (VB.NET function)

4. Generate the expression with:
   - Proper `=` prefix
   - Null safety (IsNothing checks where appropriate)
   - Divide-by-zero protection where applicable
   - Correct scope parameters for aggregates
   - Appropriate formatting

## Output Format

```
Expression:
=IIF(Fields!Budget.Value = 0, 0,
  (Fields!Actual.Value - Fields!Budget.Value) / Fields!Budget.Value)

Context: Detail row in a data region
Format string: P1 (percentage with 1 decimal)

Usage:
- Place in a Textbox within your Tablix detail row
- Set the Style > Format property to "P1"
- For color coding, use this as the BackgroundColor:
  =IIF(Fields!Actual.Value >= Fields!Budget.Value, "LightGreen", "LightCoral")

Notes:
- Protected against divide-by-zero (returns 0 when Budget is 0)
- Returns a decimal — apply P1 format for percentage display
```

If the expression requires custom code, output both the code block and the calling expression:

```
Custom Code (add to Report Properties > Code):

Public Function CalculateGrowth(ByVal current As Decimal, ByVal previous As Decimal) As Decimal
    If previous = 0 Then Return 0
    Return (current - previous) / previous
End Function

Expression:
=Code.CalculateGrowth(Fields!CurrentYear.Value, Fields!PreviousYear.Value)
```

## Guidelines

- Always protect against null values and divide-by-zero
- Use Switch instead of deeply nested IIF (> 2 levels)
- Prefer Format() over manual string concatenation for number/date formatting
- For page headers/footers, only use Globals!, User!, Parameters!, ReportItems! — Fields! is NOT available
- For Lookup expressions, specify the target dataset name
- For running totals, specify the correct scope (Nothing for dataset, group name for group reset)
- Include the recommended Format string when the expression produces numbers or dates
- Mention if the expression needs to be in a specific location (data region, header, etc.)
