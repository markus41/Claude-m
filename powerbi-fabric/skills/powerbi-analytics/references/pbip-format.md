# PBIP (Power BI Project) Format Reference

Comprehensive reference for the PBIP text-based project format, TMDL (Tabular Model Definition Language), model.bim JSON structure, and Git workflow for Power BI projects.

## PBIP Overview

PBIP (Power BI Project) is the Git-friendly, text-based serialization format for Power BI content. Introduced as a replacement for the binary `.pbix` format in version-control scenarios, PBIP breaks a Power BI project into individual text files that can be diffed, merged, and reviewed using standard Git workflows.

To create a PBIP project: In Power BI Desktop, choose File > Save As > select "Power BI Project (*.pbip)".

## Folder Structure

```
MyProject.pbip                          # Project entry point (JSON pointer)
MyProject.Dataset/
    definition/
        model.bim                       # Full model definition (JSON format)
        -- OR with TMDL format --
        tables/
            Sales.tmdl                  # Table definition with columns
            Date.tmdl
            Products.tmdl
        measures/
            _Sales Measures.tmdl        # Measure definitions
        relationships.tmdl              # Relationship definitions
        expressions.tmdl                # Power Query M source expressions
        cultures/
            en-US.tmdl                  # Localization
        perspectives/                   # Optional: perspective definitions
        roles/                          # Optional: RLS role definitions
            Regional Manager.tmdl
    definition.pbidataset               # Dataset metadata (JSON)
    .pbi/
        localSettings.json              # Local-only settings (gitignore this)
        cache.abf                       # Local cache (gitignore this)
MyProject.Report/
    definition/
        report.json                     # Report layout: pages, visuals, filters
        pages/
            ReportSection1/
                page.json               # Page configuration
                visuals/
                    Visual1/
                        visual.json     # Individual visual definition
            ReportSection2/
                page.json
                visuals/
        StaticResources/
            SharedResources/
                BaseThemes/
                    CY24SU06.json       # Theme definition
    definition.pbireport                # Report metadata (JSON)
    .pbi/
        localSettings.json
```

## .pbip Entry Point File

The `.pbip` file is a simple JSON pointer to the project components:

```json
{
  "version": "1.0",
  "artifacts": [
    {
      "report": {
        "path": "MyProject.Report"
      }
    }
  ],
  "settings": {
    "enableAutoRecovery": true
  }
}
```

## definition.pbidataset

```json
{
  "version": "1.0",
  "settings": {}
}
```

## definition.pbireport

```json
{
  "version": "4.0",
  "datasetReference": {
    "byPath": {
      "path": "../MyProject.Dataset"
    },
    "byConnection": null
  }
}
```

## TMDL (Tabular Model Definition Language)

TMDL is a human-readable text format for defining semantic model objects. Each object type can be in its own file, making merges and code reviews straightforward.

### Table Definition

```tmdl
table Sales
    lineageTag: a1b2c3d4-e5f6-7890-abcd-ef1234567890

    column SalesId
        dataType: int64
        isHidden
        formatString: 0
        lineageTag: 11111111-2222-3333-4444-555555555555
        summarizeBy: none
        sourceColumn: SalesId

        annotation SummarizationSetBy = Automatic

    column OrderDate
        dataType: dateTime
        formatString: Long Date
        lineageTag: 22222222-3333-4444-5555-666666666666
        sourceColumn: OrderDate

    column Amount
        dataType: decimal
        formatString: \$#,0.00;(\$#,0.00);\$#,0.00
        lineageTag: 33333333-4444-5555-6666-777777777777
        sourceColumn: Amount

        annotation SummarizationSetBy = Automatic

    column ProductId
        dataType: int64
        isHidden
        lineageTag: 44444444-5555-6666-7777-888888888888
        summarizeBy: none
        sourceColumn: ProductId

    partition Sales = m
        mode: import
        source
            let
                Source = Sql.Database("server", "db"),
                dbo_Sales = Source{[Schema="dbo", Item="Sales"]}[Data]
            in
                dbo_Sales
```

### Measure Definition

```tmdl
table Sales

    measure 'Total Revenue' =
        SUM(Sales[Amount])
        formatString: \$#,0.00;(\$#,0.00);\$#,0.00
        displayFolder: Revenue
        lineageTag: aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee
        description: Total revenue across all sales transactions

    measure 'Revenue YTD' =
        TOTALYTD(
            [Total Revenue],
            'Date'[Date]
        )
        formatString: \$#,0.00;(\$#,0.00);\$#,0.00
        displayFolder: Revenue
        lineageTag: bbbbbbbb-cccc-dddd-eeee-ffffffffffff

    measure 'YoY Growth %' =
        VAR _current = [Total Revenue]
        VAR _prior =
            CALCULATE(
                [Total Revenue],
                SAMEPERIODLASTYEAR('Date'[Date])
            )
        RETURN
            DIVIDE(_current - _prior, _prior)
        formatString: 0.00%;-0.00%;0.00%
        displayFolder: Revenue
        lineageTag: cccccccc-dddd-eeee-ffff-aaaaaaaaaaaa
```

### Relationship Definition

```tmdl
relationship xxxxxxxx-yyyy-zzzz-aaaa-bbbbbbbbbbbb
    fromColumn: Sales.ProductId
    toColumn: Products.ProductId

relationship yyyyyyyy-zzzz-aaaa-bbbb-cccccccccccc
    fromColumn: Sales.OrderDate
    toColumn: 'Date'.Date

relationship zzzzzzzz-aaaa-bbbb-cccc-dddddddddddd
    fromColumn: Sales.CustomerId
    toColumn: Customers.CustomerId
    isActive: false
    crossFilteringBehavior: bothDirections
```

### Expressions (Power Query M Sources)

```tmdl
expression Server =
    "myserver.database.windows.net"
    lineageTag: 11111111-aaaa-bbbb-cccc-dddddddddddd
    queryGroup: Parameters

expression Database =
    "SalesDB"
    lineageTag: 22222222-aaaa-bbbb-cccc-dddddddddddd
    queryGroup: Parameters
```

### Role Definition (RLS)

```tmdl
role 'Regional Manager'
    modelPermission: read

    tablePermission Sales = [Region] = USERPRINCIPALNAME()
```

### Date Table

```tmdl
table Date
    lineageTag: dddddddd-eeee-ffff-0000-111111111111
    dataCategory: Time

    column Date
        dataType: dateTime
        isKey
        formatString: Long Date
        lineageTag: eeeeeeee-ffff-0000-1111-222222222222
        sourceColumn: Date

    column Year
        dataType: int64
        formatString: 0
        lineageTag: ffffffff-0000-1111-2222-333333333333
        sourceColumn: Year
        summarizeBy: none

    column Quarter
        dataType: text
        lineageTag: 00000000-1111-2222-3333-444444444444
        sourceColumn: Quarter
        sortByColumn: QuarterNumber

    column Month
        dataType: text
        lineageTag: 11111111-2222-3333-4444-555555555555
        sourceColumn: Month
        sortByColumn: MonthNumber

    column MonthNumber
        dataType: int64
        isHidden
        formatString: 0
        lineageTag: 22222222-3333-4444-5555-666666666666
        sourceColumn: MonthNumber
        summarizeBy: none

    column QuarterNumber
        dataType: int64
        isHidden
        formatString: 0
        lineageTag: 33333333-4444-5555-6666-777777777777
        sourceColumn: QuarterNumber
        summarizeBy: none

    partition Date = m
        mode: import
        source
            let
                StartDate = #date(2020, 1, 1),
                EndDate = #date(2026, 12, 31),
                DateList = List.Dates(StartDate, Duration.Days(EndDate - StartDate) + 1, #duration(1,0,0,0)),
                ToTable = Table.FromList(DateList, Splitter.SplitByNothing(), {"Date"}, null, ExtraValues.Error),
                Typed = Table.TransformColumnTypes(ToTable, {{"Date", type date}}),
                AddYear = Table.AddColumn(Typed, "Year", each Date.Year([Date]), Int64.Type),
                AddMonth = Table.AddColumn(AddYear, "Month", each Date.ToText([Date], "MMM"), type text),
                AddMonthNumber = Table.AddColumn(AddMonth, "MonthNumber", each Date.Month([Date]), Int64.Type),
                AddQuarter = Table.AddColumn(AddMonthNumber, "Quarter", each "Q" & Text.From(Date.QuarterOfYear([Date])), type text),
                AddQuarterNumber = Table.AddColumn(AddQuarter, "QuarterNumber", each Date.QuarterOfYear([Date]), Int64.Type)
            in
                AddQuarterNumber
```

## model.bim JSON Format

The `model.bim` file uses the TOM (Tabular Object Model) JSON schema. This is the non-TMDL alternative where the entire model is in a single JSON file.

```json
{
  "name": "SemanticModel",
  "compatibilityLevel": 1604,
  "model": {
    "culture": "en-US",
    "dataAccessOptions": {
      "legacyRedirects": true,
      "returnErrorValuesAsNull": true
    },
    "defaultPowerBIDataSourceVersion": "powerBI_V3",
    "tables": [
      {
        "name": "Sales",
        "lineageTag": "a1b2c3d4-...",
        "columns": [
          {
            "name": "SalesId",
            "dataType": "int64",
            "isHidden": true,
            "sourceColumn": "SalesId",
            "lineageTag": "..."
          },
          {
            "name": "Amount",
            "dataType": "decimal",
            "sourceColumn": "Amount",
            "formatString": "\\$#,0.00",
            "lineageTag": "..."
          }
        ],
        "measures": [
          {
            "name": "Total Revenue",
            "expression": "SUM(Sales[Amount])",
            "formatString": "\\$#,0.00",
            "displayFolder": "Revenue",
            "lineageTag": "..."
          }
        ],
        "partitions": [
          {
            "name": "Sales",
            "mode": "import",
            "source": {
              "type": "m",
              "expression": [
                "let",
                "    Source = Sql.Database(\"server\", \"db\"),",
                "    dbo_Sales = Source{[Schema=\"dbo\", Item=\"Sales\"]}[Data]",
                "in",
                "    dbo_Sales"
              ]
            }
          }
        ]
      }
    ],
    "relationships": [
      {
        "name": "...",
        "fromTable": "Sales",
        "fromColumn": "ProductId",
        "toTable": "Products",
        "toColumn": "ProductId",
        "crossFilteringBehavior": "oneDirection"
      }
    ],
    "roles": [
      {
        "name": "Regional Manager",
        "modelPermission": "read",
        "tablePermissions": [
          {
            "name": "Sales",
            "filterExpression": "[Region] = USERPRINCIPALNAME()"
          }
        ]
      }
    ],
    "expressions": [
      {
        "name": "Server",
        "kind": "m",
        "expression": "\"myserver.database.windows.net\""
      }
    ]
  }
}
```

## Git Workflow for PBIP

### .gitignore

```gitignore
# Power BI local files
.pbi/
*.pbicache
localSettings.json
cache.abf
diagramLayout.json

# OS files
.DS_Store
Thumbs.db
```

### Branching Strategy

1. `main` branch contains the production model
2. Feature branches for individual changes (new measures, table modifications)
3. Use pull requests for code review of DAX measures and M queries

### Merge Conflict Resolution

- **TMDL files**: Conflicts are typically straightforward because each object is in a separate file
- **model.bim**: Single-file conflicts can be complex; prefer TMDL format for team projects
- **report.json**: Visual layout conflicts -- resolve by choosing one version (usually the feature branch)
- **lineageTag**: These GUIDs should never conflict if each developer generates their own

### Converting Between .pbix and PBIP

1. **pbix to PBIP**: Open the .pbix in Power BI Desktop, File > Save As > Power BI Project (.pbip)
2. **PBIP to pbix**: Open the .pbip file in Power BI Desktop, File > Save As > Power BI Desktop (.pbix)
3. The conversion is lossless in both directions

### CI/CD Considerations

- Use Tabular Editor CLI or the Power BI deployment pipelines API for automated deployments
- Validate TMDL syntax using Tabular Editor's command-line validation
- Run Best Practice Analyzer rules as part of CI pipeline
- Use deployment pipelines API: `POST /pipelines/{pipelineId}/stages/{stageOrder}/deploy`

## report.json Structure

The `report.json` file defines the report layout, including pages, visuals, and their configurations.

```json
{
  "config": "{\"version\":\"5.55\",\"themeCollection\":{\"baseTheme\":{...}}}",
  "layoutOptimization": 0,
  "pods": [
    {
      "config": "{\"name\":\"ReportSection1\",\"displayName\":\"Overview\",\"ordinal\":0,...}",
      "filters": "[]",
      "visualContainers": [
        {
          "config": "{\"name\":\"visual1\",\"layouts\":[{\"id\":0,\"position\":{\"x\":0,\"y\":0,\"z\":0,\"width\":600,\"height\":400}}],\"singleVisual\":{\"visualType\":\"barChart\",...}}",
          "filters": "[]"
        }
      ],
      "width": 1280,
      "height": 720
    }
  ],
  "publicCustomVisuals": []
}
```

Note: The newer page-based structure uses separate `page.json` and `visual.json` files under `pages/` subdirectories, which is the preferred format for better diff granularity.

## TMDL Syntax Details

### Property Values

TMDL uses indentation-based nesting. Properties are set with `propertyName: value` syntax.

Common data types for columns:

| TMDL dataType | Description | Typical Use |
|---------------|-------------|-------------|
| `string` | Text values | Names, categories, codes |
| `int64` | 64-bit integer | IDs, counts, year numbers |
| `double` | Double-precision float | Ratios, percentages |
| `decimal` | Fixed-precision decimal | Currency, prices |
| `dateTime` | Date and time | Dates, timestamps |
| `boolean` | True/false | Flags |

### Common Column Properties

```tmdl
column ColumnName
    dataType: string            # Required: data type
    isHidden                    # Optional: hide from report Fields pane
    isKey                       # Optional: mark as primary key
    formatString: 0.00%         # Optional: display format
    lineageTag: guid-here       # Required: unique identifier for change tracking
    sourceColumn: SourceName    # Required for non-calculated columns
    summarizeBy: none           # Optional: default aggregation (none, sum, count, etc.)
    sortByColumn: SortCol       # Optional: sort this column by another column
    description: Description    # Optional: column description
    displayFolder: FolderName   # Optional: organize in Fields pane
    dataCategory: WebURL        # Optional: semantic category (WebURL, ImageURL, City, etc.)
```

### Common Measure Properties

```tmdl
measure 'Measure Name' =
    DAX_EXPRESSION_HERE
    formatString: \$#,0.00     # Display format
    lineageTag: guid-here       # Unique identifier
    displayFolder: FolderName   # Organize in Fields pane
    description: What it does   # Documentation
    isHidden                    # Optional: hide from Fields pane
```

### Partition Modes

```tmdl
partition PartitionName = m         # M (Power Query) source
    mode: import                    # import, directQuery, dualm directLake
    source
        let ... in ...

partition PartitionName = entity    # Direct Lake entity source
    mode: directLake
    source
        entityName: table_name
        schemaName: dbo
        expressionSource: DatabaseQuery
```

### Hierarchy Definition

```tmdl
hierarchy 'Hierarchy Name'
    level LevelName1
        column: ColumnForLevel1
    level LevelName2
        column: ColumnForLevel2
    level LevelName3
        column: ColumnForLevel3
```

### Annotation and Extended Properties

```tmdl
column Amount
    dataType: decimal
    sourceColumn: Amount
    lineageTag: ...

    annotation SummarizationSetBy = Automatic
    annotation PBI_FormatHint = {"isGeneralNumber":true}
```

### Calculated Column Syntax

```tmdl
table Sales

    calculatedColumn 'Revenue' =
        Sales[Quantity] * Sales[UnitPrice]
        dataType: decimal
        formatString: \$#,0.00
        lineageTag: guid-here
```

### Calculated Table Syntax

```tmdl
calculatedTable 'Date' =
    CALENDAR(DATE(2020, 1, 1), DATE(2026, 12, 31))
    lineageTag: guid-here

    column [Date]
        dataType: dateTime
        isKey
        lineageTag: guid-here
```

## Comparison: TMDL vs model.bim

| Aspect | TMDL | model.bim (JSON) |
|--------|------|-------------------|
| File format | Indentation-based text | JSON |
| File count | Multiple files (one per object type) | Single file |
| Merge conflicts | Rare, localized | Frequent, complex |
| Readability | High (human-friendly) | Medium (verbose JSON) |
| Tooling | Power BI Desktop, Tabular Editor 3 | Power BI Desktop, Tabular Editor 2/3, TOM API |
| Schema validation | Tabular Editor CLI | JSON Schema validation |
| Default in Desktop | Yes (recent versions) | Legacy default |
| Compatibility | Power BI Desktop 2023+ | All versions |

### When to Use Which

- **TMDL**: Preferred for team projects with Git version control. Each developer can modify different tables/measures without merge conflicts.
- **model.bim**: Use when compatibility with older tools is needed, or for programmatic model generation where a single JSON file is easier to construct.

## Tabular Editor Integration

Tabular Editor (free CLI or paid GUI) is the primary external tool for working with PBIP/TMDL:

- **Validation**: `TabularEditor.exe model.bim -S` validates the model schema.
- **Best Practice Analyzer**: Run rules to check for naming conventions, unused measures, missing descriptions, and performance anti-patterns.
- **Scripting**: C# scripts can modify the model programmatically (add measures, rename columns, apply rules).
- **Deployment**: Deploy model changes to Power BI Service without going through Desktop.
- **TMDL support**: Tabular Editor 3 fully supports reading and writing TMDL format.
