---
name: pbi-measure
description: Generate a DAX measure from a natural language description. Outputs in the standard header comment format with optional TMDL output for PBIP projects.
argument-hint: "<description of what the measure should calculate> [--tmdl] [--table <table-name>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
---

# Generate DAX Measure

Generate a DAX measure based on the user's natural language description.

## Instructions

1. Parse the user's description to understand what calculation is needed.
2. If `--tmdl` flag is present, output in TMDL format suitable for a `.tmdl` file in a PBIP project.
3. If `--table` is specified, associate the measure with that table; otherwise default to the most logical fact table.
4. Read the skill reference at `skills/powerbi-analytics/references/dax-patterns.md` for pattern guidance.
5. Read examples at `skills/powerbi-analytics/examples/dax-measures.md` for output format reference.

## Output Format (Standard DAX)

```dax
-- Measure: [Measure Name]
-- Description: [What it calculates, in plain language]
-- Dependencies: [Required tables, columns, and other measures]
-- ============================================
[Measure Name] =
VAR _variableName = ...
RETURN
    _variableName
```

## Output Format (TMDL, when --tmdl flag is used)

```tmdl
table [TableName]

    measure '[Measure Name]' =
        [DAX expression]
        formatString: [appropriate format string]
        displayFolder: [logical folder name]
        lineageTag: [generate a GUID]
        description: [description text]
```

## Guidelines

- Always use `VAR/RETURN` for readability when the expression has multiple parts.
- Use `DIVIDE()` instead of the `/` operator for safe division.
- Prefer simple Boolean filters in `CALCULATE` over `FILTER()` on large tables.
- Include appropriate format strings: `\$#,0.00` for currency, `0.0%` for percentages, `#,0` for integers.
- If the measure requires time intelligence, note that a date table marked as a date table is required.
- If the user mentions "fiscal year," ask for the fiscal year start month if not specified (default to April/month 4).
- If the user's model context is unclear, state assumptions clearly in the Description.
