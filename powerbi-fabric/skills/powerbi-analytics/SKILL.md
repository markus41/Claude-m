---
name: Power BI & Fabric Analytics
description: >
  Deep expertise in Power BI development including DAX measures, Power Query M transformations,
  semantic model design, PBIP project scaffolding, REST API workspace management, and
  Microsoft Fabric integration with Lakehouse and Direct Lake.
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
triggers:
  - dax
  - DAX measure
  - power query
  - M code
  - power bi
  - pbip
  - pbix
  - semantic model
  - fabric
  - lakehouse
  - pbi workspace
  - dataset refresh
  - power query M
  - calculated column
  - measure
  - power bi rest api
  - fabric rest api
  - workspace management
  - dataset refresh
  - embed token
  - report export
  - direct lake
---

# Power BI & Fabric Analytics

## Power BI Ecosystem Overview

Microsoft Power BI is a business intelligence platform spanning three primary tiers:

**Power BI Desktop** is the free Windows authoring tool where analysts build data models, create DAX measures, write Power Query M transformations, and design report pages. Desktop produces `.pbix` files (binary packages) or `.pbip` files (Git-friendly text-based projects).

**Power BI Service** (app.powerbi.com) is the cloud platform where content is published, shared, and consumed. Workspaces organize content (datasets, reports, dashboards, dataflows). The REST API at `api.powerbi.com/v1.0/myorg/` provides programmatic management of all service resources. Key operations include creating workspaces, uploading .pbix files, triggering dataset refreshes, managing user access, and exporting reports.

**Power BI Embedded** enables embedding Power BI reports into custom applications using embed tokens generated via the REST API. Two embedding scenarios exist: "App Owns Data" (service principal authentication) and "User Owns Data" (delegated user token).

**Microsoft Fabric** is the unified analytics platform that extends Power BI with Lakehouse storage (OneLake backed by Delta/Parquet), PySpark notebooks, data pipelines, Dataflow Gen2, and Direct Lake mode (a semantic model that reads directly from Lakehouse Delta tables without data import).

## DAX Quick Reference

DAX (Data Analysis Expressions) is the formula language for measures, calculated columns, and calculated tables in Power BI semantic models. Key concepts:

**Filter Context** is the set of active filters on a query. CALCULATE modifies filter context. Every measure evaluates within its filter context.

**Row Context** exists inside iterators (SUMX, AVERAGEX, FILTER, ADDCOLUMNS) where each row is evaluated individually.

### Core Functions

- `CALCULATE(expression, filter1, filter2, ...)` — Evaluates expression in a modified filter context. The most important DAX function.
- `FILTER(table, condition)` — Returns a table filtered row by row. Use sparingly on large tables; prefer CALCULATE with direct column filters.
- `ALL(table_or_column)` — Removes filters from the specified table or column. Used inside CALCULATE to ignore slicer selections.
- `ALLEXCEPT(table, column1, column2)` — Removes all filters on the table except the specified columns.
- `VALUES(column)` — Returns distinct values of a column respecting current filter context.
- `RELATED(column)` — Follows a many-to-one relationship to retrieve a value from the related table.
- `RELATEDTABLE(table)` — Follows a one-to-many relationship to return filtered rows from the related table.

### Aggregation

`SUM`, `AVERAGE`, `COUNT`, `COUNTROWS`, `MIN`, `MAX` for simple aggregation. Iterator variants `SUMX`, `AVERAGEX`, `COUNTX`, `MINX`, `MAXX` evaluate an expression row-by-row then aggregate.

### Time Intelligence

Time intelligence requires a contiguous date table marked as a date table in the model.

- `TOTALYTD(expression, dates_column [, fiscal_year_end])` — Year-to-date total. Fiscal year offset: `"3/31"` for April fiscal year start.
- `TOTALQTD`, `TOTALMTD` — Quarter-to-date and month-to-date equivalents.
- `SAMEPERIODLASTYEAR(dates_column)` — Shifts dates back one year.
- `DATEADD(dates_column, number_of_intervals, interval)` — Shifts dates by N days/months/quarters/years.
- `DATESYTD(dates_column [, fiscal_year_end])` — Returns year-to-date dates.
- `PARALLELPERIOD(dates_column, number_of_intervals, interval)` — Returns a full period shifted by the specified interval.
- `PREVIOUSMONTH/PREVIOUSQUARTER/PREVIOUSYEAR(dates_column)` — Returns dates for the previous period.

### Logical and Utility

- `IF(condition, true_value, false_value)`, `SWITCH(expression, value1, result1, ..., else_result)`
- `ISINSCOPE(column)` — TRUE if the column is in the current grouping level (for matrix visuals).
- `HASONEVALUE(column)` — TRUE if the column is filtered to exactly one value.
- `ISBLANK(value)` — Tests for BLANK.
- `VAR/RETURN` — Define variables for readability and performance. Variables are evaluated once.

### DAX Output Convention

When generating DAX measures, use this header comment format:

```dax
-- Measure: [Measure Name]
-- Description: [What it calculates]
-- Dependencies: [Required tables/columns/other measures]
-- ============================================
[Measure Name] =
VAR _result = ...
RETURN
    _result
```

### Table Functions

- `SUMMARIZECOLUMNS(group_col1, group_col2, filter_table, name, expression)` — Most efficient grouping function. Automatically removes blank rows.
- `ADDCOLUMNS(table, name, expression)` — Adds calculated columns to a table.
- `SELECTCOLUMNS(table, name, expression)` — Projects specific columns from a table.
- `CROSSJOIN(table1, table2)` — Cartesian product of two tables.
- `UNION(table1, table2)` — Combines rows from multiple tables.
- `EXCEPT(table1, table2)` — Rows in table1 not in table2.
- `INTERSECT(table1, table2)` — Rows common to both tables.
- `TOPN(n, table, expression, order)` — Returns top N rows by an expression.
- `RANKX(table, expression, value, order, ties)` — Ranks items by an expression.

### Statistical Functions

- `PERCENTILE.INC(column, percentile)` — Inclusive percentile (0 to 1).
- `MEDIAN(column)` — Middle value.
- `STDEV.S(column)` — Sample standard deviation.
- `RANKX(table, expression)` — Rank values within a table.

### Common KPI Patterns

- **YoY Growth**: Compare current period to same period last year using `SAMEPERIODLASTYEAR`.
- **Rolling Average**: Use `DATESINPERIOD` with `AVERAGEX` over distinct months.
- **Running Total**: Use `FILTER(ALL(Date), Date <= MAX(Date))` inside `CALCULATE`.
- **Percent of Total**: Divide current selection by `CALCULATE(SUM(), ALL())`.
- **ABC Analysis**: Combine `RANKX` with cumulative percentage and `SWITCH(TRUE())`.
- **Budget Variance**: Subtract budget from actual; use `DIVIDE` for percentage.
- **Dynamic Top N**: Use a What-If parameter with `RANKX` and `IF` to show/hide items.

## Power Query M Overview

Power Query M is the data transformation language used in Power BI (Get Data / Transform Data) and Dataflow Gen2.

**Structure**: Every query is a `let/in` expression with named steps:

```m
let
    Source = Sql.Database("server", "database"),
    FilteredRows = Table.SelectRows(Source, each [Status] = "Active"),
    RenamedColumns = Table.RenameColumns(FilteredRows, {{"OldName", "NewName"}})
in
    RenamedColumns
```

**Source Connections**: `Sql.Database`, `OData.Feed`, `Web.Contents`, `Excel.Workbook`, `Csv.Document`, `CommonDataService.Database` (Dataverse), `SharePoint.Files`, `Json.Document`, `AzureStorage.Blobs`.

**Key Transforms**: `Table.TransformColumns`, `Table.AddColumn`, `Table.SelectRows`, `Table.SelectColumns`, `Table.RemoveColumns`, `Table.Pivot`, `Table.Unpivot`, `Table.NestedJoin`, `Table.Combine`.

**Custom Functions**: Define reusable functions with the `(param as type) => expression` syntax. Use `List.Generate` for pagination loops when fetching data from REST APIs.

**Type System**: Power Query has a rich type system including `type text`, `type number`, `Int64.Type`, `type date`, `type datetime`, `type logical`, `Currency.Type`, `type binary`, and composite types like `type table` and `type record`. Always set column types explicitly using `Table.TransformColumnTypes` as the final step in a query.

**Error Handling**: Use `try/otherwise` expressions for operations that may fail on individual rows. The `try` expression returns a record with `HasError`, `Value`, and `Error` fields.

**Query Folding**: When transformations translate to native SQL queries sent to the source, this is "folding." Folding is critical for performance because it pushes computation to the data source rather than pulling all data into memory. Operations that fold include `Table.SelectRows`, `Table.SelectColumns`, `Table.Sort`, and `Table.Group` (with simple conditions). Operations that break folding include custom M functions, `Table.Buffer`, most `Text.*` functions, complex conditional logic in `Table.AddColumn`, and `Table.Pivot`/`Table.Unpivot`. To check fold status, right-click a step in Power Query Editor and look for "View Native Query."

**Parameters**: Create query parameters (Home > Manage Parameters) for connection strings, date ranges, and configuration values. Parameters enable easy switching between development, test, and production environments without modifying query logic.

## Semantic Model Concepts

A Power BI semantic model (formerly "dataset") is the analytical data model that sits between raw data sources and report visuals. It defines the schema, relationships, and business logic.

### Storage Modes

- **Import**: Data is cached in the VertiPaq columnar engine in memory. Fastest query performance but requires scheduled refresh to stay current. Best for most scenarios.
- **DirectQuery**: Queries are sent to the underlying source in real time. No data cached. Best for real-time requirements or very large datasets that exceed memory.
- **Dual**: Table can operate in either Import or DirectQuery mode depending on the query. Useful for dimension tables connected to both Import and DirectQuery fact tables.
- **Direct Lake**: Fabric-specific mode that reads Delta/Parquet files directly from OneLake into the VertiPaq engine on demand. Combines Import performance with near-real-time freshness. No scheduled refresh needed.

### Core Components

- **Tables**: The fundamental data containers. Each table has columns, an optional partition source (Power Query M expression), and may contain measures and calculated columns.
- **Relationships**: Define how tables connect. Standard pattern is star schema: one-to-many from dimension to fact tables, single-direction cross-filter. Bi-directional relationships should be used sparingly as they can cause ambiguity. Only one active relationship can exist between any two tables; additional relationships must be marked inactive and activated via `USERELATIONSHIP()` in DAX.
- **Measures**: DAX formulas that calculate aggregations dynamically based on the current filter context. Measures are not stored as data; they are computed at query time. This makes them flexible and memory-efficient.
- **Calculated Columns**: DAX formulas evaluated row-by-row during data refresh and stored in the model as physical columns. They consume memory and increase refresh time. Prefer measures over calculated columns when possible. Use calculated columns only when you need the value in a slicer, filter, relationship, or sort-by-column.
- **Calculated Tables**: Entire tables defined by a DAX expression. Useful for date dimension tables, parameter tables, or disconnected slicers. Refreshed during model processing.
- **Row-Level Security (RLS)**: DAX filter expressions on tables that restrict which rows a user can see. Static RLS assigns users to roles with fixed filters. Dynamic RLS uses `USERNAME()` or `USERPRINCIPALNAME()` to filter based on the logged-in user's identity. RLS is enforced in Power BI Service and when using embed tokens with identities.
- **Display Folders**: Organize measures into logical groups in the Fields pane. Set via the `displayFolder` property on measures.
- **Hierarchies**: Define drill-down paths (e.g., Year > Quarter > Month > Date) on dimension tables.

## PBIP Format Overview

PBIP (Power BI Project) is the Git-friendly text-based format introduced to replace the binary `.pbix` for version control scenarios.

```
project-name.pbip                     # Project entry point
project-name.Dataset/
  definition/
    model.bim                          # TMDL or JSON model definition
    tables/                            # Individual table definitions (.tmdl)
    expressions.tmdl                   # Power Query M source expressions
  definition.pbidataset
project-name.Report/
  definition/
    report.json                        # Report layout, visuals, pages
    pages/                             # Per-page definitions
  definition.pbireport
```

**TMDL (Tabular Model Definition Language)** is the text-based format for model metadata. Each table, measure, column, and relationship can be defined in separate `.tmdl` files, making diffs and merge conflict resolution straightforward.

**model.bim** (JSON format) is the alternative to TMDL. It contains the entire model definition in a single JSON file following the TOM (Tabular Object Model) schema. Includes `model.tables[]`, `model.relationships[]`, and `model.dataSources[]`.

## Power BI REST API

The REST API base URL is `https://api.powerbi.com/v1.0/myorg/`. Authentication uses Azure AD tokens with the scope `https://analysis.windows.net/powerbi/api/.default`.

### Workspaces (Groups)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/groups` | List workspaces the user has access to |
| POST | `/groups` | Create a new workspace |
| GET | `/groups/{groupId}` | Get workspace details |
| DELETE | `/groups/{groupId}` | Delete a workspace |
| POST | `/groups/{groupId}/users` | Add user/service principal to workspace |
| PUT | `/groups/{groupId}/users` | Update user role in workspace |
| DELETE | `/groups/{groupId}/users/{userEmail}` | Remove user from workspace |

**Create workspace body**:
```json
{
  "name": "Finance Analytics - Prod"
}
```

**Add user body**:
```json
{
  "emailAddress": "analyst@contoso.com",
  "groupUserAccessRight": "Member"
}
```

Access rights: `Admin`, `Member`, `Contributor`, `Viewer`.

### Datasets / Semantic Models

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/groups/{groupId}/datasets` | List datasets in workspace |
| GET | `/groups/{groupId}/datasets/{datasetId}` | Get dataset details |
| DELETE | `/groups/{groupId}/datasets/{datasetId}` | Delete a dataset |
| POST | `/groups/{groupId}/datasets/{datasetId}/refreshes` | Trigger dataset refresh |
| GET | `/groups/{groupId}/datasets/{datasetId}/refreshes` | Get refresh history |
| PATCH | `/groups/{groupId}/datasets/{datasetId}/datasources` | Update data source credentials |
| POST | `/groups/{groupId}/datasets/{datasetId}/executeQueries` | Execute DAX query against dataset |

**Trigger refresh body** (enhanced with options):
```json
{
  "type": "Full",
  "commitMode": "transactional",
  "applyRefreshPolicy": false,
  "objects": [
    { "table": "FactSales", "partition": "FactSales-2026" }
  ],
  "notifyOption": "MailOnCompletion"
}
```

Omit `objects` for a full refresh of all tables. The `notifyOption` values are: `NoNotification`, `MailOnFailure`, `MailOnCompletion`.

### Reports

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/groups/{groupId}/reports` | List reports in workspace |
| GET | `/groups/{groupId}/reports/{reportId}` | Get report details |
| POST | `/groups/{groupId}/reports/{reportId}/Clone` | Clone report to same or different workspace |
| POST | `/groups/{groupId}/reports/{reportId}/Rebind` | Rebind report to a different dataset |
| POST | `/groups/{groupId}/reports/{reportId}/ExportTo` | Export report to PDF, PNG, or PPTX |

**Export report body** (PDF):
```json
{
  "format": "PDF",
  "powerBIReportConfiguration": {
    "pages": [
      { "pageName": "ReportSection1" }
    ],
    "defaultBookmark": {
      "name": "BookmarkForExport"
    }
  }
}
```

Export is async — the response returns a 202 with an export ID. Poll `GET /groups/{groupId}/reports/{reportId}/exports/{exportId}` until `status` is `Succeeded`, then download via `GET .../exports/{exportId}/file`.

### Imports

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/groups/{groupId}/imports?datasetDisplayName={name}` | Upload .pbix file |
| GET | `/groups/{groupId}/imports/{importId}` | Check import status |

Upload uses `multipart/form-data` with the .pbix file as the body. Add `nameConflict=CreateOrOverwrite` to replace existing datasets.

### Embedding

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/groups/{groupId}/reports/{reportId}/GenerateToken` | Generate embed token for a report |
| POST | `/groups/{groupId}/datasets/{datasetId}/GenerateToken` | Generate embed token for a dataset |
| POST | `/GenerateToken` | Generate multi-resource embed token |

**Generate embed token body**:
```json
{
  "accessLevel": "View",
  "identities": [
    {
      "username": "user@contoso.com",
      "roles": ["SalesRegion"],
      "datasets": ["<datasetId>"]
    }
  ]
}
```

Access levels: `View`, `Edit`, `Create`. The `identities` array is required only when the dataset uses Row-Level Security (RLS).

### JSON Request Body Examples

**Execute DAX query**:
```json
POST /groups/{groupId}/datasets/{datasetId}/executeQueries
{
  "queries": [
    {
      "query": "EVALUATE SUMMARIZECOLUMNS('Date'[Year], 'Date'[Month], \"Total Sales\", [Total Sales])"
    }
  ],
  "serializerSettings": {
    "includeNulls": true
  }
}
```

## Permissions / Scopes

| Scope | Purpose |
|-------|---------|
| `https://analysis.windows.net/powerbi/api/Dataset.ReadWrite.All` | Read and write datasets (semantic models) |
| `https://analysis.windows.net/powerbi/api/Report.ReadWrite.All` | Read and write reports |
| `https://analysis.windows.net/powerbi/api/Workspace.ReadWrite.All` | Create and manage workspaces |
| `https://analysis.windows.net/powerbi/api/Content.Create` | Create content in workspaces |
| `https://analysis.windows.net/powerbi/api/Tenant.ReadWrite.All` | Admin API — tenant-wide management |
| `https://analysis.windows.net/powerbi/api/.default` | Shorthand for all assigned permissions |

For service principal authentication, register the app in Azure AD > Power BI Service > Admin Portal > Tenant Settings > Enable "Allow service principals to use Power BI APIs".

## REST API Error Handling

| Status | Meaning | Action |
|--------|---------|--------|
| 400 | Bad Request — invalid JSON, malformed DAX query, or missing required field | Check request body schema; validate DAX syntax |
| 401 | Unauthorized — expired or missing token | Re-acquire token with correct scope |
| 403 | Forbidden — user lacks workspace role or admin permission | Verify workspace membership and access level |
| 404 | Not Found — workspace, dataset, or report does not exist | Confirm resource IDs; resource may have been deleted |
| 409 | Conflict — dataset refresh already in progress | Wait for current refresh to complete before starting another |
| 429 | Too Many Requests — API throttled | Retry after `Retry-After` header; implement exponential backoff |
| 202 | Accepted — async operation started (export, refresh) | Poll the status endpoint until completion |

Error response structure:
```json
{
  "error": {
    "code": "InvalidRequest",
    "message": "The provided dataset ID is not valid.",
    "details": [
      { "code": "DatasetNotFound", "message": "..." }
    ]
  }
}
```

## Fabric REST API

Microsoft Fabric provides its own REST API at `https://api.fabric.microsoft.com/v1/`. Authentication uses Azure AD tokens with the scope `https://api.fabric.microsoft.com/.default`.

### Workspaces

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/workspaces` | List Fabric workspaces |
| POST | `/workspaces` | Create a Fabric workspace |
| GET | `/workspaces/{workspaceId}` | Get workspace details |
| DELETE | `/workspaces/{workspaceId}` | Delete a workspace |
| POST | `/workspaces/{workspaceId}/assignToCapacity` | Assign workspace to a Fabric capacity |

### Lakehouses

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/workspaces/{workspaceId}/lakehouses` | List lakehouses in workspace |
| POST | `/workspaces/{workspaceId}/lakehouses` | Create a new lakehouse |
| GET | `/workspaces/{workspaceId}/lakehouses/{lakehouseId}` | Get lakehouse details |
| DELETE | `/workspaces/{workspaceId}/lakehouses/{lakehouseId}` | Delete a lakehouse |
| GET | `/workspaces/{workspaceId}/lakehouses/{lakehouseId}/tables` | List Delta tables in lakehouse |

**Create lakehouse body**:
```json
{
  "displayName": "sales_lakehouse",
  "description": "Gold-layer Lakehouse for sales analytics"
}
```

### Notebooks

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/workspaces/{workspaceId}/notebooks` | List notebooks in workspace |
| POST | `/workspaces/{workspaceId}/notebooks` | Create a notebook |
| GET | `/workspaces/{workspaceId}/notebooks/{notebookId}` | Get notebook details |
| DELETE | `/workspaces/{workspaceId}/notebooks/{notebookId}` | Delete a notebook |

### Data Pipelines

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/workspaces/{workspaceId}/dataPipelines` | List pipelines |
| POST | `/workspaces/{workspaceId}/dataPipelines` | Create a pipeline |
| GET | `/workspaces/{workspaceId}/dataPipelines/{pipelineId}` | Get pipeline details |
| DELETE | `/workspaces/{workspaceId}/dataPipelines/{pipelineId}` | Delete a pipeline |
| POST | `/workspaces/{workspaceId}/dataPipelines/{pipelineId}/jobs/instances?jobType=Pipeline` | Run a pipeline |

### Semantic Models (Fabric)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/workspaces/{workspaceId}/semanticModels` | List semantic models |
| POST | `/workspaces/{workspaceId}/semanticModels` | Create a semantic model |
| GET | `/workspaces/{workspaceId}/semanticModels/{modelId}` | Get model details |
| DELETE | `/workspaces/{workspaceId}/semanticModels/{modelId}` | Delete a semantic model |

## Fabric Integration Summary

Microsoft Fabric unifies data engineering, data science, and BI under a single SaaS capacity model. All Fabric workloads store data in OneLake, a unified multi-cloud data lake.

- **Lakehouse**: OneLake storage with managed Delta tables under `Tables/` and unstructured files under `Files/`. Supports shortcuts to external storage (ADLS Gen2, S3, Google Cloud Storage) without copying data. Every Lakehouse automatically gets a SQL analytics endpoint for T-SQL read access.
- **Notebooks**: PySpark environment (default runtime) for data engineering. Read/write Lakehouse tables via `spark.read.format("delta").load("Tables/tablename")` and `df.write.format("delta").saveAsTable("tablename")`. Supports Delta merge/upsert operations via `DeltaTable.forPath().merge()`.
- **Direct Lake**: Semantic model mode that queries Delta tables directly from OneLake. Data is loaded from Parquet files into the VertiPaq engine on demand. No import refresh needed. Falls back to DirectQuery if data exceeds memory or unsupported features are used. Limitations: no calculated columns in the model and no Power Query M transforms.
- **Pipelines**: Orchestrate data movement and transformation. Key activities include Copy Data, Notebook execution, Dataflow Gen2, Stored Procedure, ForEach loops, and If Condition branching. Support pipeline parameters and expression-based configuration.
- **Dataflow Gen2**: Power Query Online with staging enabled by default. Output directly to Lakehouse Delta tables for Direct Lake consumption. Replaces the original Dataflow with improved Fabric integration.
- **Semantic Link**: Python library (`sempy.fabric`) that enables reading Power BI semantic model data and evaluating DAX queries from within Fabric notebooks. Useful for data validation and model testing.

### Medallion Architecture Pattern

The recommended data architecture in Fabric follows the medallion (Bronze/Silver/Gold) pattern:
1. **Bronze** (Raw): Ingest raw data into a Lakehouse via Copy Data activities or Dataflow Gen2.
2. **Silver** (Cleaned): Transform and clean data using notebooks (PySpark). Apply data quality rules, deduplication, and schema standardization.
3. **Gold** (Business): Aggregate into star schema fact and dimension tables in a curated Lakehouse.
4. **Serve**: Create a Direct Lake semantic model over the Gold Lakehouse tables. Build Power BI reports on top.

## Reference Files

| Reference | Path | Content |
|-----------|------|---------|
| DAX Patterns | `references/dax-patterns.md` | Core functions, time intelligence, KPI patterns, best practices |
| Power Query M | `references/power-query-m.md` | M language syntax, source connections, transforms, folding |
| PBI REST API | `references/pbi-rest-api.md` | Workspace, dataset, report, import, admin, and embed endpoints |
| PBIP Format | `references/pbip-format.md` | Project structure, TMDL, model.bim, Git workflow |
| Fabric Integration | `references/fabric-integration.md` | Lakehouse, notebooks, Direct Lake, pipelines |

## Example Files

| Example | Path | Content |
|---------|------|---------|
| DAX Measures | `examples/dax-measures.md` | YTD, YoY, rolling average, percent of total, ABC, Top N, variance |
| Power Query Transforms | `examples/power-query-transformations.md` | Dataverse, SQL, REST API pagination, SharePoint, date dimension |
| Workspace Management | `examples/workspace-management.md` | TypeScript REST API operations |
| PBIP Scaffolding | `examples/pbip-scaffolding.md` | Complete PBIP project generation examples |
