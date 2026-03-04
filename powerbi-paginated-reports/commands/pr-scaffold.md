---
name: pr-scaffold
description: Generate a complete RDL report template from a natural language description. Supports invoice, tabular, matrix, and subreport layouts.
argument-hint: "<report description> [--type invoice|table|matrix|list|subreport] [--datasource lakehouse|warehouse|semantic-model|sql|dataverse] [--paper letter|a4|legal]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
---

# Scaffold Paginated Report

Generate a production-ready RDL file from the user's description.

## Instructions

1. Parse the user's description to determine:
   - Report purpose (what data it shows)
   - Report type (invoice, table, matrix, list) — use `--type` flag or infer from description
   - Data source type — use `--datasource` flag or ask
   - Paper size — use `--paper` flag or default to Letter (8.5x11in)

2. Read reference material:
   - `${CLAUDE_PLUGIN_ROOT}/skills/paginated-reports/references/rdl-structure.md` for XML schema
   - `${CLAUDE_PLUGIN_ROOT}/skills/paginated-reports/examples/rdl-templates.md` for complete examples

3. Read data source connection patterns:
   - `${CLAUDE_PLUGIN_ROOT}/skills/paginated-reports/references/data-sources-datasets.md`

4. Generate the RDL file with:
   - Proper XML namespace declaration (2016 schema)
   - Data source configured for the selected type
   - Dataset with parameterized query matching the report purpose
   - Report parameters with appropriate types and defaults
   - Page layout matching the paper size with standard margins
   - Data regions matching the report type
   - Page header with report title and date
   - Page footer with page numbering
   - Alternating row colors for readability
   - Proper field type declarations

5. Write the .rdl file to the current directory or user-specified path.

## Output Format

```xml
<?xml version="1.0" encoding="utf-8"?>
<Report xmlns="http://schemas.microsoft.com/sqlserver/reporting/2016/01/reportdefinition"
        xmlns:rd="http://schemas.microsoft.com/SQLServer/reporting/reportdesigner">
  <!-- Complete RDL matching user's requirements -->
</Report>
```

## Report Type Patterns

### Invoice (`--type invoice`)
- One invoice per page (page break between groups)
- Company header, bill-to address, line items table, totals
- Group by InvoiceID

### Table (`--type table`)
- Tabular list with optional grouping
- Column headers repeat on new pages
- Subtotals per group, grand total at bottom

### Matrix (`--type matrix`)
- Row groups and column groups (cross-tab)
- Row and column totals
- Conditional formatting on values

### List (`--type list`)
- Free-form repeating layout
- Card-style display per record
- Suitable for catalogs, mail merge

### Subreport (`--type subreport`)
- Parent report with embedded child
- Parameter passing from parent to child
- Generate both parent and child .rdl files

## Paper Sizes

| Size | Width | Height |
|------|-------|--------|
| Letter | 8.5in | 11in |
| A4 | 8.27in | 11.69in |
| Legal | 8.5in | 14in |

Default margins: 1in all sides. Usable width = Page Width - Left Margin - Right Margin.

## Guidelines

- Always use the 2016 RDL schema namespace
- Include SET NOCOUNT ON hint in SQL comments
- Parameterize all filter values — never hardcode
- Add alternating row colors (`=IIF(RowNumber(Nothing) Mod 2 = 0, "WhiteSmoke", "White")`)
- Set RepeatOnNewPage=true for column headers
- Use Format strings for currency (C2), dates (yyyy-MM-dd), percentages (P1)
- Include DocumentMapLabel on group headers for navigation
- Set KeepTogether on small groups to prevent page splits
- Name all textboxes descriptively (H_CustomerName, D_Amount, F_GrandTotal)
