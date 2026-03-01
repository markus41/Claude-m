---
name: pbi-query
description: Generate Power Query M code for data transformation or source connection. Supports multiple data source types and common transformation patterns.
argument-hint: "<description of data transformation> [--source sql|dataverse|rest|excel|csv|sharepoint|odata]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
---

# Generate Power Query M Code

Generate complete Power Query M code based on the user's description.

## Instructions

1. Parse the user's description to determine the data source and transformation requirements.
2. If `--source` flag is provided, use the specified source connector. Otherwise, infer from the description.
3. Read the reference at `skills/powerbi-analytics/references/power-query-m.md` for syntax and patterns.
4. Read examples at `skills/powerbi-analytics/examples/power-query-transformations.md` for code templates.

## Source Flag Options

| Flag | Connector | M Function |
|------|-----------|------------|
| `sql` | SQL Server / Azure SQL | `Sql.Database()` |
| `dataverse` | Dataverse / Dynamics 365 | `CommonDataService.Database()` |
| `rest` | REST API | `Web.Contents()` + `Json.Document()` |
| `excel` | Excel workbook | `Excel.Workbook()` |
| `csv` | CSV/Text file | `Csv.Document()` |
| `sharepoint` | SharePoint files | `SharePoint.Files()` |
| `odata` | OData feed | `OData.Feed()` |

## Output Format

```m
// ============================================
// Query: [Query Name]
// Description: [What this query does]
// Source: [Data source type]
// ============================================
let
    // Step 1: Connect to source
    Source = ...,

    // Step 2: Transform
    ...

    // Final: Type columns
    TypedResult = Table.TransformColumnTypes(...)
in
    TypedResult
```

## Guidelines

- Always include descriptive comments for each step.
- Always set column types explicitly using `Table.TransformColumnTypes` as the final step.
- Use parameters (e.g., `ServerName`, `DatabaseName`) for connection strings instead of hard-coded values.
- For `Web.Contents`, always use `RelativePath` and `Query` parameters for proper credential handling.
- For REST API sources with pagination, use `List.Generate` to fetch all pages.
- Prefer operations that support query folding (push computation to the source).
- Include error handling (`try/otherwise`) for operations that might fail on individual rows.
- For SharePoint file combinations, filter out temporary files (`~$` prefix).
- When generating a date dimension, include fiscal year columns if the user mentions fiscal years.
