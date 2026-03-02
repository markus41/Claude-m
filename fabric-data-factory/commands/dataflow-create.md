---
name: dataflow-create
description: "Create a Dataflow Gen2 with Power Query M transformations and lakehouse staging"
argument-hint: "<dataflow-name> --source <source-type> --sink <lakehouse|warehouse>"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - AskUserQuestion
---

# Create a Dataflow Gen2

Generate a Dataflow Gen2 definition with Power Query M transformations and output configuration.

## Instructions

### 1. Validate Inputs

- `<dataflow-name>` — Name for the dataflow (e.g., `CleanCustomerData`, `TransformSales`). Ask if not provided.
- `--source` — Source data type. Common options:
  - `sql` — Azure SQL Database or SQL Server
  - `csv` — CSV files from lakehouse or Blob storage
  - `excel` — Excel workbooks
  - `rest` — REST API endpoint
  - `sharepoint` — SharePoint list
  - `dataverse` — Dataverse table
- `--sink` — Output destination: `lakehouse` (default) or `warehouse`.

Ask for source and sink if not provided.

### 2. Gather Transformation Requirements

Ask the user what transformations are needed:

- **Filter rows**: Remove nulls, filter by condition
- **Select/remove columns**: Keep only needed columns
- **Rename columns**: Clean up column names
- **Change types**: Set correct data types
- **Merge queries**: Join with another table (inner, left outer, full outer)
- **Append queries**: Union multiple tables
- **Group by**: Aggregate rows (sum, count, average, min, max)
- **Pivot/unpivot**: Reshape data
- **Add columns**: Computed columns, conditional columns, index columns
- **Custom M**: Any custom Power Query M expressions

### 3. Generate M Query

Build the Power Query M code with proper `let`/`in` structure:

```m
let
    // Step 1: Connect to source
    Source = <source-connection>,

    // Step 2: Navigate to data
    Navigation = <navigate-to-table-or-file>,

    // Step 3: Apply transformations
    FilteredRows = Table.SelectRows(Navigation, each [Status] <> null),
    RenamedColumns = Table.RenameColumns(FilteredRows, {{"OldName", "NewName"}}),
    ChangedTypes = Table.TransformColumnTypes(RenamedColumns, {{"Amount", type number}, {"Date", type date}}),

    // Step 4: Final output
    Result = ChangedTypes
in
    Result
```

**Source connection patterns**:

- SQL: `Sql.Database("server.database.windows.net", "dbname")`
- CSV: `Csv.Document(File.Contents("path/file.csv"), [Delimiter=",", Encoding=65001, QuoteStyle=QuoteStyle.Csv])`
- Excel: `Excel.Workbook(File.Contents("path/file.xlsx"), null, true)`
- REST: `Json.Document(Web.Contents("https://api.example.com/data"))`
- SharePoint: `SharePoint.Tables("https://tenant.sharepoint.com/sites/site")`
- Dataverse: `CommonDataService.Database("https://org.crm.dynamics.com")`

### 4. Configure Output Staging

For lakehouse output, include staging configuration:

```json
{
  "staging": {
    "enabled": true,
    "lakehouse": {
      "workspaceId": "<workspace-id>",
      "lakehouseId": "<lakehouse-id>",
      "tableName": "<output-table-name>",
      "loadMode": "Overwrite"
    }
  }
}
```

Load modes:
- `Overwrite` — Replace the entire table on each refresh
- `Append` — Add new rows to the existing table

### 5. Save the Dataflow

Write the M query to `dataflows/<dataflow-name>.pq` (Power Query file).
Write the configuration to `dataflows/<dataflow-name>.config.json`.

### 6. Deploy (Optional)

If the user wants to deploy immediately:

```bash
az rest --method POST \
  --url "https://api.fabric.microsoft.com/v1/workspaces/${FABRIC_WORKSPACE_ID}/items" \
  --headers "Content-Type=application/json" \
  --body '{"displayName": "<dataflow-name>", "type": "Dataflow", "definition": {...}}'
```

### 7. Display Summary

Show the user:
- Created dataflow file(s) and M query structure
- Transformation steps applied
- Output configuration (staging lakehouse, table name, load mode)
- Next steps: test the dataflow, add to a pipeline with `/pipeline-create`, monitor with `/pipeline-monitor`
