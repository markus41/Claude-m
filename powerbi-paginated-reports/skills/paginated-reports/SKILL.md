---
name: Power BI Paginated Reports
description: >
  This skill should be used when the user asks about Power BI paginated reports,
  Report Builder, RDL authoring, or SSRS migration to Fabric. Covers creating
  pixel-perfect, print-ready reports with tables, matrices, charts, VB.NET expressions,
  custom code, data source configuration (Fabric Lakehouse, Warehouse, Semantic Model,
  Dataverse), parameters, subreports, drillthrough, rendering and export (PDF, Excel,
  Word, CSV), REST API automation, subscriptions, performance tuning, and troubleshooting.
  Example user requests: "create a paginated invoice report", "write an RDL expression
  for running totals", "migrate SSRS reports to Fabric", "export a paginated report
  to PDF via REST API", "fix blank pages in my paginated report".
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
triggers:
  - paginated report
  - paginated reports
  - rdl
  - report definition language
  - report builder
  - power bi report builder
  - ssrs
  - sql server reporting services
  - rdl expression
  - vb.net expression
  - report expression
  - tablix
  - data region
  - report parameter
  - subreport
  - drillthrough report
  - report rendering
  - report export
  - report subscription
  - paginated deploy
  - rdl xml
  - report data source
  - shared data source
  - report dataset
  - report matrix
  - report table
  - report chart
  - report list
  - pixel-perfect report
  - print-ready report
  - ssrs migration
  - ssrs to fabric
  - paginated performance
  - report builder expression
  - custom code report
  - report group
  - page break
  - report header
  - report footer
  - report body
  - rdl template
  - .rdl file
  - export report to pdf
  - export report to excel
  - paginated report api
  - paginated report subscription
  - paginated report troubleshooting
  - blank pages report
  - report error
  - fabric paginated
  - paginated report embed
  - rdl expression error
  - invoice report
  - matrix report
  - cross-tab report
  - running total report
  - report conditional formatting
  - report alternating rows
  - lookup expression
  - report builder install
  - report builder download
  - report page break
---

# Power BI Paginated Reports through Fabric

Paginated reports are pixel-perfect, print-ready documents optimized for printing and PDF generation. They run in the Power BI service (Fabric) and use the Report Definition Language (RDL) XML format. Build them with Power BI Report Builder (free desktop tool) and deploy to Fabric workspaces.

## RDL Authoring

For the complete XML schema reference, read `${CLAUDE_PLUGIN_ROOT}/skills/paginated-reports/references/rdl-structure.md`.

RDL is an XML schema defining report layout, data retrieval, and rendering behavior.

### Core Report Structure

Every RDL file contains these top-level elements:
- **DataSources** — Connection strings and credential definitions
- **DataSets** — Queries bound to data sources, with field mappings
- **Body** — Report items: tables, matrices, lists, charts, images, textboxes, subreports
- **ReportParameters** — User-facing input parameters with defaults and available values
- **Page** — Page size, margins, header, footer configuration

### Data Regions

- **Table (Tablix)** — Row-based tabular data with optional grouping and totals. Use for invoices, transaction lists, line-item details.
- **Matrix (Tablix)** — Pivot-style with row groups and column groups. Use for cross-tabulation, period comparisons, multi-dimensional summaries.
- **List (Tablix)** — Free-form repeating container. Use for mail merge, cards, catalog layouts.
- **Chart** — Bar, line, pie, scatter, area, funnel, gauge. Use for visual summaries within paginated layout.

All three tabular regions are actually Tablix elements in RDL — the designer presents them differently based on row/column group configuration.

### Report Items

- **Textbox** — Static or expression-driven text. Supports rich formatting, conditional visibility.
- **Image** — Embedded, external URL, or database field. Use for logos, signatures, barcodes.
- **Line / Rectangle** — Layout and visual grouping. Rectangle acts as a container for other items.
- **Subreport** — Embedded child report with its own data source. Pass parameters from parent.
- **Gauge / Indicator** — KPI visualization (radial, linear, state indicators).

### Grouping and Aggregation

Group on any expression. Nest groups for drill-down hierarchies. Add:
- **Group header/footer** rows for subtotals
- **Page breaks** between groups (per-invoice, per-department)
- **Toggle visibility** for expandable/collapsible sections
- **Recursive hierarchy** groups for org charts, BOM structures

### Page Layout

- Set paper size (A4, Letter, Legal, custom) and margins
- Headers repeat on every page — use for company logos, report titles, page numbers
- Footers repeat on every page — use for page X of Y, print date, confidential disclaimers
- **KeepTogether** property prevents data regions from splitting across pages
- **RepeatOnNewPage** repeats column headers when a table spans pages

## VB.NET Expressions

For the complete expression catalog, read `${CLAUDE_PLUGIN_ROOT}/skills/paginated-reports/references/expressions-code.md`. For production patterns, see `${CLAUDE_PLUGIN_ROOT}/skills/paginated-reports/examples/expression-patterns.md`.

Expressions in paginated reports use VB.NET syntax prefixed with `=`.

### Expression Context

- **Fields** — `=Fields!FieldName.Value` references dataset fields
- **Parameters** — `=Parameters!ParamName.Value` references report parameters
- **Globals** — `=Globals!ReportName`, `=Globals!PageNumber`, `=Globals!TotalPages`, `=Globals!ExecutionTime`
- **User** — `=User!UserID`, `=User!Language`
- **ReportItems** — `=ReportItems!TextboxName.Value` references other textbox values

### Common Functions

- **Aggregate** — `=Sum(Fields!Amount.Value)`, `=Avg()`, `=Count()`, `=Max()`, `=Min()`, `=CountDistinct()`, `=First()`, `=Last()`
- **Scoped aggregates** — `=Sum(Fields!Amount.Value, "GroupName")` aggregates within a specific group scope
- **RunningValue** — `=RunningValue(Fields!Amount.Value, Sum, Nothing)` for running totals
- **RowNumber** — `=RowNumber(Nothing)` for sequential row numbering
- **Conditional** — `=IIF(Fields!Status.Value = "Active", "Green", "Red")`
- **Switch** — `=Switch(Fields!Rating.Value >= 90, "A", Fields!Rating.Value >= 80, "B", True, "C")`
- **Format** — `=Format(Fields!Date.Value, "yyyy-MM-dd")`, `=Format(Fields!Amount.Value, "C2")`
- **Text** — `=Left()`, `=Right()`, `=Mid()`, `=Len()`, `=Trim()`, `=Replace()`, `=InStr()`
- **Conversion** — `=CInt()`, `=CDec()`, `=CStr()`, `=CDate()`, `=Val()`
- **Lookup** — `=Lookup(Fields!ID.Value, Fields!ID.Value, Fields!Name.Value, "OtherDataset")` cross-dataset lookups
- **MultiLookup** — Returns array of matches across datasets
- **LookupSet** — Returns all matches (use with `=Join(LookupSet(...), ", ")`)

### Custom Code

Add VB.NET functions in Report Properties > Code tab:

```vb
Public Function FormatCurrency(ByVal amount As Decimal, ByVal culture As String) As String
    Dim ci As New System.Globalization.CultureInfo(culture)
    Return amount.ToString("C2", ci)
End Function
```

Call with `=Code.FormatCurrency(Fields!Amount.Value, Parameters!Culture.Value)`.

### Custom Assemblies

Reference external .NET assemblies for complex logic. Register in Report Properties > References. Call static methods with `=Namespace.ClassName.MethodName()`.

## Data Sources in Fabric

For connection strings and query patterns for all source types, read `${CLAUDE_PLUGIN_ROOT}/skills/paginated-reports/references/data-sources-datasets.md`.

### Supported Connection Types

- **Fabric Semantic Model** — Connect to a published Power BI dataset. Uses DAX queries. Best for reusing existing business logic and security (RLS).
- **Fabric Lakehouse SQL Endpoint** — T-SQL queries against Delta tables. Best for large datasets, complex joins.
- **Fabric Warehouse** — T-SQL queries against Synapse warehouse tables. Best for enterprise DW scenarios.
- **Azure SQL Database** — Direct T-SQL via connection string. Use for existing Azure SQL workloads.
- **Dataverse** — OData connection to Dynamics 365 / Power Platform tables. Use for CRM/ERP reports.
- **Oracle / ODBC / OLE DB** — Via on-premises data gateway for on-prem databases.

### Shared vs Embedded Data Sources

- **Shared data source (.rds)** — Stored on the server, reusable across reports. Change connection once, all reports update. Preferred for production.
- **Embedded data source** — Defined inside the .rdl file. Easier for development but harder to maintain at scale.

### Parameterized Queries

Use `@ParameterName` in SQL queries linked to report parameters:
```sql
SELECT * FROM Sales WHERE Region = @Region AND OrderDate BETWEEN @StartDate AND @EndDate
```

Map dataset query parameters to report parameters in the dataset properties.

## Rendering and Export

For format details and device info settings, read `${CLAUDE_PLUGIN_ROOT}/skills/paginated-reports/references/rendering-export.md`.

### Output Formats

| Format | Use Case | Notes |
|--------|----------|-------|
| PDF | Print, archive, email | Pixel-perfect, page breaks respected |
| Excel (XLSX) | Data extraction, pivot tables | Data regions map to worksheets |
| Word (DOCX) | Editable documents | Maintains layout for letter templates |
| CSV | Data feeds, imports | Flat data only, no formatting |
| XML | System integration | Schema-based export |
| MHTML | Web archive, email body | Single-file HTML with images |
| PowerPoint (PPTX) | Presentations | Each page becomes a slide |
| TIFF | Image archive | Multi-page image |

### Rendering Considerations

- **Interactive HTML** — Default in browser. Supports drill-down, sorting, search.
- **Hard page breaks** — Respected in PDF, Word, TIFF. Ignored in CSV, XML.
- **Soft page breaks** — Renderer decides based on page size. Control with KeepTogether, KeepWithGroup.
- **Page numbering** — `=Globals!PageNumber` and `=Globals!TotalPages` only resolve in page-oriented renderers (PDF, TIFF, Print).

## REST API Automation

For full endpoint reference and TypeScript examples, read `${CLAUDE_PLUGIN_ROOT}/skills/paginated-reports/references/rest-api.md` and `${CLAUDE_PLUGIN_ROOT}/skills/paginated-reports/examples/api-automation.md`.

### Key Endpoints

Power BI REST API for paginated reports:
- **Import** — `POST /groups/{workspaceId}/imports` with .rdl file
- **Get Reports** — `GET /groups/{workspaceId}/reports`
- **Export** — `POST /groups/{workspaceId}/reports/{reportId}/ExportTo` with format and parameter values
- **Data Sources** — `GET/PATCH /groups/{workspaceId}/reports/{reportId}/datasources`
- **Parameters** — `GET/POST /groups/{workspaceId}/reports/{reportId}/parameters` (read/update default values)
- **Subscriptions** — `POST /groups/{workspaceId}/reports/{reportId}/subscriptions`

### Authentication

All REST calls require Azure AD bearer token with scope `https://analysis.windows.net/powerbi/api/.default`. Use MSAL (Microsoft Authentication Library) for token acquisition with either:
- **Service principal** — For automated pipelines (app registration + client secret/certificate)
- **Delegated user** — For interactive tools (device code flow or auth code flow)

### Export API Flow

1. POST ExportTo with format + parameter values → returns export ID
2. Poll GET export status until `Succeeded`
3. GET export file (binary stream) → save as PDF/Excel/etc.

## SSRS-to-Fabric Migration

For the full migration guide and compatibility matrix, read `${CLAUDE_PLUGIN_ROOT}/skills/paginated-reports/references/ssrs-migration.md`. For step-by-step examples, see `${CLAUDE_PLUGIN_ROOT}/skills/paginated-reports/examples/migration-checklist.md`.

### Migration Path

1. **Inventory** — Catalog all .rdl files, shared data sources, shared datasets, subscriptions
2. **Compatibility scan** — Check for unsupported features (custom assemblies with restricted types, certain ActiveX controls, CRI custom report items)
3. **Data source conversion** — Convert on-prem SQL connection strings to Fabric Lakehouse/Warehouse endpoints or configure on-premises data gateway
4. **Upload** — Use Power BI REST API or manual upload via workspace portal
5. **Validate** — Render each report, compare output to SSRS baseline
6. **Subscription migration** — Recreate email subscriptions in Power BI service
7. **Redirect users** — Update bookmarks, portal links, embedded URLs

### Unsupported Features in Fabric

- Custom Report Items (CRI) — third-party controls
- Certain custom assemblies — restricted sandboxing in Fabric
- Map report items — not supported in Power BI service
- Linked reports — use parameterized single reports instead
- Report server folder ACLs — replace with workspace RBAC

### Gateway Requirements

Reports connecting to on-premises data sources require an on-premises data gateway. Install in standard mode (not personal). Configure data source credentials in the Power BI service gateway settings.

## Performance Tuning

For the complete optimization checklist, read `${CLAUDE_PLUGIN_ROOT}/skills/paginated-reports/references/performance-tuning.md`. For error diagnosis, see `${CLAUDE_PLUGIN_ROOT}/skills/paginated-reports/references/troubleshooting.md`.

### Query Optimization

- Push filtering to the data source — use parameterized queries, not report-side filters
- Limit dataset result rows — users rarely need millions of rows in a paginated report
- Use stored procedures for complex logic — reduces query parsing overhead
- Avoid correlated subqueries in dataset queries — use JOINs instead
- Index data source tables on filter/sort columns

### Rendering Performance

- Minimize subreport nesting — each subreport opens a separate data source connection
- Use Lookup/LookupSet instead of subreports for small cross-references
- Reduce image sizes — embed compressed images, avoid external URLs that require HTTP calls
- Limit expression complexity — heavy VB.NET in every cell slows rendering
- Use visibility toggling instead of separate detail reports when possible

### Caching and Snapshots

- **Cached reports** — Power BI service caches rendered output for a configurable duration
- **Report snapshots** — Scheduled rendering with stored output — users see pre-rendered results
- **On-demand** — Default. Each view triggers fresh query + render

## Reference Files

| File | Path | Content |
|------|------|---------|
| RDL Structure | `${CLAUDE_PLUGIN_ROOT}/skills/paginated-reports/references/rdl-structure.md` | RDL XML schema reference, element hierarchy, attribute details |
| Expressions & Code | `${CLAUDE_PLUGIN_ROOT}/skills/paginated-reports/references/expressions-code.md` | VB.NET expression catalog, custom code patterns, assembly references |
| Data Sources & Datasets | `${CLAUDE_PLUGIN_ROOT}/skills/paginated-reports/references/data-sources-datasets.md` | Connection strings, credential types, query patterns for all Fabric sources |
| Rendering & Export | `${CLAUDE_PLUGIN_ROOT}/skills/paginated-reports/references/rendering-export.md` | Output format details, device info settings, export API parameters |
| REST API | `${CLAUDE_PLUGIN_ROOT}/skills/paginated-reports/references/rest-api.md` | Paginated report REST endpoints, TypeScript examples, authentication |
| Performance Tuning | `${CLAUDE_PLUGIN_ROOT}/skills/paginated-reports/references/performance-tuning.md` | Query optimization, rendering tips, caching configuration |
| SSRS Migration | `${CLAUDE_PLUGIN_ROOT}/skills/paginated-reports/references/ssrs-migration.md` | Migration checklist, compatibility matrix, gateway setup |
| Troubleshooting | `${CLAUDE_PLUGIN_ROOT}/skills/paginated-reports/references/troubleshooting.md` | Common errors, rendering issues, data source problems, resolution steps |

## Example Files

| File | Path | Content |
|------|------|---------|
| RDL Templates | `${CLAUDE_PLUGIN_ROOT}/skills/paginated-reports/examples/rdl-templates.md` | Complete RDL examples: invoice, tabular list, matrix cross-tab, subreport |
| Expression Patterns | `${CLAUDE_PLUGIN_ROOT}/skills/paginated-reports/examples/expression-patterns.md` | VB.NET expression cookbook: formatting, conditionals, lookups, aggregates |
| API Automation | `${CLAUDE_PLUGIN_ROOT}/skills/paginated-reports/examples/api-automation.md` | TypeScript REST API examples: import, export, parameter update, subscriptions |
| Migration Checklist | `${CLAUDE_PLUGIN_ROOT}/skills/paginated-reports/examples/migration-checklist.md` | Step-by-step SSRS-to-Fabric migration with before/after examples |
