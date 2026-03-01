# PBIP Scaffolding Examples

Complete examples for generating Power BI Project (PBIP) structures, TMDL files, and model definitions.

## 1. Minimal PBIP Project Structure

Generate the minimum set of files for a functional PBIP project with model.bim (JSON format).

### Entry Point: SalesAnalytics.pbip

```json
{
  "version": "1.0",
  "artifacts": [
    {
      "report": {
        "path": "SalesAnalytics.Report"
      }
    }
  ],
  "settings": {
    "enableAutoRecovery": true
  }
}
```

### Dataset Metadata: SalesAnalytics.Dataset/definition.pbidataset

```json
{
  "version": "1.0",
  "settings": {}
}
```

### Model Definition: SalesAnalytics.Dataset/definition/model.bim

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
        "lineageTag": "f8a1b2c3-d4e5-6789-abcd-ef0123456789",
        "columns": [
          {
            "name": "SalesId",
            "dataType": "int64",
            "isHidden": true,
            "sourceColumn": "SalesId",
            "summarizeBy": "none",
            "lineageTag": "a1000001-0000-0000-0000-000000000001"
          },
          {
            "name": "OrderDate",
            "dataType": "dateTime",
            "sourceColumn": "OrderDate",
            "formatString": "Long Date",
            "lineageTag": "a1000002-0000-0000-0000-000000000002"
          },
          {
            "name": "CustomerId",
            "dataType": "int64",
            "isHidden": true,
            "sourceColumn": "CustomerId",
            "summarizeBy": "none",
            "lineageTag": "a1000003-0000-0000-0000-000000000003"
          },
          {
            "name": "ProductId",
            "dataType": "int64",
            "isHidden": true,
            "sourceColumn": "ProductId",
            "summarizeBy": "none",
            "lineageTag": "a1000004-0000-0000-0000-000000000004"
          },
          {
            "name": "Quantity",
            "dataType": "int64",
            "sourceColumn": "Quantity",
            "lineageTag": "a1000005-0000-0000-0000-000000000005"
          },
          {
            "name": "UnitPrice",
            "dataType": "decimal",
            "sourceColumn": "UnitPrice",
            "formatString": "\\$#,0.00;(\\$#,0.00);\\$#,0.00",
            "lineageTag": "a1000006-0000-0000-0000-000000000006"
          },
          {
            "name": "Region",
            "dataType": "string",
            "sourceColumn": "Region",
            "lineageTag": "a1000007-0000-0000-0000-000000000007"
          }
        ],
        "measures": [
          {
            "name": "Total Revenue",
            "expression": "SUMX(Sales, Sales[Quantity] * Sales[UnitPrice])",
            "formatString": "\\$#,0.00;(\\$#,0.00);\\$#,0.00",
            "displayFolder": "Revenue",
            "lineageTag": "m1000001-0000-0000-0000-000000000001"
          },
          {
            "name": "Total Quantity",
            "expression": "SUM(Sales[Quantity])",
            "formatString": "#,0",
            "displayFolder": "Quantity",
            "lineageTag": "m1000002-0000-0000-0000-000000000002"
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
                "    Source = Sql.Database(#\"Server\", #\"Database\"),",
                "    dbo_Sales = Source{[Schema=\"dbo\", Item=\"Sales\"]}[Data]",
                "in",
                "    dbo_Sales"
              ]
            }
          }
        ]
      },
      {
        "name": "Date",
        "lineageTag": "f8a1b2c3-d4e5-6789-abcd-ef0123456790",
        "dataCategory": "Time",
        "columns": [
          {
            "name": "Date",
            "dataType": "dateTime",
            "isKey": true,
            "sourceColumn": "Date",
            "formatString": "Long Date",
            "lineageTag": "d1000001-0000-0000-0000-000000000001"
          },
          {
            "name": "Year",
            "dataType": "int64",
            "sourceColumn": "Year",
            "summarizeBy": "none",
            "lineageTag": "d1000002-0000-0000-0000-000000000002"
          },
          {
            "name": "Month",
            "dataType": "string",
            "sourceColumn": "Month",
            "sortByColumn": "MonthNumber",
            "lineageTag": "d1000003-0000-0000-0000-000000000003"
          },
          {
            "name": "MonthNumber",
            "dataType": "int64",
            "isHidden": true,
            "sourceColumn": "MonthNumber",
            "summarizeBy": "none",
            "lineageTag": "d1000004-0000-0000-0000-000000000004"
          },
          {
            "name": "Quarter",
            "dataType": "string",
            "sourceColumn": "Quarter",
            "lineageTag": "d1000005-0000-0000-0000-000000000005"
          }
        ],
        "partitions": [
          {
            "name": "Date",
            "mode": "import",
            "source": {
              "type": "m",
              "expression": [
                "let",
                "    StartDate = #date(2020, 1, 1),",
                "    EndDate = #date(2026, 12, 31),",
                "    DateList = List.Dates(StartDate, Duration.Days(EndDate - StartDate) + 1, #duration(1,0,0,0)),",
                "    ToTable = Table.FromList(DateList, Splitter.SplitByNothing(), {\"Date\"}),",
                "    Typed = Table.TransformColumnTypes(ToTable, {{\"Date\", type date}}),",
                "    AddYear = Table.AddColumn(Typed, \"Year\", each Date.Year([Date]), Int64.Type),",
                "    AddMonth = Table.AddColumn(AddYear, \"Month\", each Date.ToText([Date], \"MMM\"), type text),",
                "    AddMonthNum = Table.AddColumn(AddMonth, \"MonthNumber\", each Date.Month([Date]), Int64.Type),",
                "    AddQuarter = Table.AddColumn(AddMonthNum, \"Quarter\", each \"Q\" & Text.From(Date.QuarterOfYear([Date])), type text)",
                "in",
                "    AddQuarter"
              ]
            }
          }
        ]
      }
    ],
    "relationships": [
      {
        "name": "Sales_Date",
        "fromTable": "Sales",
        "fromColumn": "OrderDate",
        "toTable": "Date",
        "toColumn": "Date"
      }
    ],
    "expressions": [
      {
        "name": "Server",
        "kind": "m",
        "expression": "\"localhost\" meta [IsParameterQuery=true, Type=\"Text\", IsParameterQueryRequired=true]"
      },
      {
        "name": "Database",
        "kind": "m",
        "expression": "\"SalesDB\" meta [IsParameterQuery=true, Type=\"Text\", IsParameterQueryRequired=true]"
      }
    ]
  }
}
```

### Report Metadata: SalesAnalytics.Report/definition.pbireport

```json
{
  "version": "4.0",
  "datasetReference": {
    "byPath": {
      "path": "../SalesAnalytics.Dataset"
    },
    "byConnection": null
  }
}
```

### Report Layout: SalesAnalytics.Report/definition/report.json

```json
{
  "config": "{\"version\":\"5.55\",\"themeCollection\":{\"baseTheme\":{\"name\":\"CY24SU06\",\"version\":\"5.55\",\"type\":2}},\"activeSectionIndex\":0}",
  "layoutOptimization": 0,
  "pods": [
    {
      "config": "{\"name\":\"ReportSection1\",\"displayName\":\"Overview\",\"ordinal\":0,\"displayOption\":1,\"width\":1280,\"height\":720}",
      "filters": "[]",
      "visualContainers": [],
      "width": 1280,
      "height": 720
    }
  ],
  "publicCustomVisuals": []
}
```

### .gitignore

```gitignore
# Power BI local files (do not commit)
.pbi/
*.pbicache
localSettings.json
cache.abf
diagramLayout.json

# OS
.DS_Store
Thumbs.db
desktop.ini
```

## 2. TMDL Files for a Sales Model

Generate individual TMDL files for a complete sales analytics model with tables, measures, and relationships.

### tables/Sales.tmdl

```tmdl
table Sales
    lineageTag: f8a1b2c3-d4e5-6789-abcd-ef0123456789

    column SalesId
        dataType: int64
        isHidden
        formatString: 0
        lineageTag: a1000001-0000-0000-0000-000000000001
        summarizeBy: none
        sourceColumn: SalesId

    column OrderDate
        dataType: dateTime
        formatString: Long Date
        lineageTag: a1000002-0000-0000-0000-000000000002
        sourceColumn: OrderDate

    column CustomerId
        dataType: int64
        isHidden
        lineageTag: a1000003-0000-0000-0000-000000000003
        summarizeBy: none
        sourceColumn: CustomerId

    column ProductId
        dataType: int64
        isHidden
        lineageTag: a1000004-0000-0000-0000-000000000004
        summarizeBy: none
        sourceColumn: ProductId

    column Quantity
        dataType: int64
        formatString: #,0
        lineageTag: a1000005-0000-0000-0000-000000000005
        sourceColumn: Quantity

    column UnitPrice
        dataType: decimal
        formatString: \$#,0.00;(\$#,0.00);\$#,0.00
        lineageTag: a1000006-0000-0000-0000-000000000006
        sourceColumn: UnitPrice

    column Discount
        dataType: double
        formatString: 0.00%
        lineageTag: a1000008-0000-0000-0000-000000000008
        sourceColumn: Discount

    column Region
        dataType: string
        lineageTag: a1000007-0000-0000-0000-000000000007
        sourceColumn: Region

    partition Sales = m
        mode: import
        source
            let
                Source = Sql.Database(#"Server", #"Database"),
                dbo_Sales = Source{[Schema="dbo", Item="Sales"]}[Data]
            in
                dbo_Sales
```

### tables/Customers.tmdl

```tmdl
table Customers
    lineageTag: c1b2c3d4-e5f6-7890-abcd-ef1234567890

    column CustomerId
        dataType: int64
        isKey
        isHidden
        formatString: 0
        lineageTag: c2000001-0000-0000-0000-000000000001
        summarizeBy: none
        sourceColumn: CustomerId

    column CustomerName
        dataType: string
        lineageTag: c2000002-0000-0000-0000-000000000002
        sourceColumn: CustomerName

    column Segment
        dataType: string
        lineageTag: c2000003-0000-0000-0000-000000000003
        sourceColumn: Segment

    column City
        dataType: string
        lineageTag: c2000004-0000-0000-0000-000000000004
        sourceColumn: City

    column State
        dataType: string
        lineageTag: c2000005-0000-0000-0000-000000000005
        sourceColumn: State

    column Country
        dataType: string
        lineageTag: c2000006-0000-0000-0000-000000000006
        sourceColumn: Country

    partition Customers = m
        mode: import
        source
            let
                Source = Sql.Database(#"Server", #"Database"),
                dbo_Customers = Source{[Schema="dbo", Item="Customers"]}[Data]
            in
                dbo_Customers
```

### tables/Products.tmdl

```tmdl
table Products
    lineageTag: p1b2c3d4-e5f6-7890-abcd-ef1234567890

    column ProductId
        dataType: int64
        isKey
        isHidden
        formatString: 0
        lineageTag: p2000001-0000-0000-0000-000000000001
        summarizeBy: none
        sourceColumn: ProductId

    column ProductName
        dataType: string
        lineageTag: p2000002-0000-0000-0000-000000000002
        sourceColumn: ProductName

    column Category
        dataType: string
        lineageTag: p2000003-0000-0000-0000-000000000003
        sourceColumn: Category

    column SubCategory
        dataType: string
        lineageTag: p2000004-0000-0000-0000-000000000004
        sourceColumn: SubCategory

    column UnitCost
        dataType: decimal
        formatString: \$#,0.00;(\$#,0.00);\$#,0.00
        lineageTag: p2000005-0000-0000-0000-000000000005
        sourceColumn: UnitCost

    partition Products = m
        mode: import
        source
            let
                Source = Sql.Database(#"Server", #"Database"),
                dbo_Products = Source{[Schema="dbo", Item="Products"]}[Data]
            in
                dbo_Products
```

### measures/_Sales Measures.tmdl

```tmdl
table Sales

    measure 'Total Revenue' =
        SUMX(Sales, Sales[Quantity] * Sales[UnitPrice] * (1 - Sales[Discount]))
        formatString: \$#,0.00;(\$#,0.00);\$#,0.00
        displayFolder: Revenue
        lineageTag: m1000001-0000-0000-0000-000000000001
        description: Total net revenue after discounts

    measure 'Total Cost' =
        SUMX(Sales, Sales[Quantity] * RELATED(Products[UnitCost]))
        formatString: \$#,0.00;(\$#,0.00);\$#,0.00
        displayFolder: Cost
        lineageTag: m1000002-0000-0000-0000-000000000002
        description: Total cost of goods sold

    measure 'Gross Profit' =
        [Total Revenue] - [Total Cost]
        formatString: \$#,0.00;(\$#,0.00);\$#,0.00
        displayFolder: Profit
        lineageTag: m1000003-0000-0000-0000-000000000003
        description: Revenue minus cost of goods

    measure 'Gross Margin %' =
        DIVIDE([Gross Profit], [Total Revenue])
        formatString: 0.0%;-0.0%;0.0%
        displayFolder: Profit
        lineageTag: m1000004-0000-0000-0000-000000000004
        description: Gross profit as percentage of revenue

    measure 'Revenue YTD' =
        TOTALYTD([Total Revenue], 'Date'[Date])
        formatString: \$#,0.00;(\$#,0.00);\$#,0.00
        displayFolder: Revenue
        lineageTag: m1000005-0000-0000-0000-000000000005
        description: Year-to-date total revenue (calendar year)

    measure 'Revenue Prior Year' =
        CALCULATE([Total Revenue], SAMEPERIODLASTYEAR('Date'[Date]))
        formatString: \$#,0.00;(\$#,0.00);\$#,0.00
        displayFolder: Revenue
        lineageTag: m1000006-0000-0000-0000-000000000006
        description: Revenue from same period last year

    measure 'YoY Growth %' =
        VAR _current = [Total Revenue]
        VAR _prior = [Revenue Prior Year]
        RETURN DIVIDE(_current - _prior, _prior)
        formatString: 0.0%;-0.0%;0.0%
        displayFolder: Revenue
        lineageTag: m1000007-0000-0000-0000-000000000007
        description: Year-over-year revenue growth percentage

    measure 'Order Count' =
        DISTINCTCOUNT(Sales[SalesId])
        formatString: #,0
        displayFolder: Orders
        lineageTag: m1000008-0000-0000-0000-000000000008
        description: Distinct count of orders

    measure 'Customer Count' =
        DISTINCTCOUNT(Sales[CustomerId])
        formatString: #,0
        displayFolder: Customers
        lineageTag: m1000009-0000-0000-0000-000000000009
        description: Distinct count of active customers

    measure 'Avg Order Value' =
        DIVIDE([Total Revenue], [Order Count])
        formatString: \$#,0.00;(\$#,0.00);\$#,0.00
        displayFolder: Orders
        lineageTag: m1000010-0000-0000-0000-000000000010
        description: Average revenue per order
```

### relationships.tmdl

```tmdl
relationship r1000001-0000-0000-0000-000000000001
    fromColumn: Sales.OrderDate
    toColumn: 'Date'.Date

relationship r1000002-0000-0000-0000-000000000002
    fromColumn: Sales.CustomerId
    toColumn: Customers.CustomerId

relationship r1000003-0000-0000-0000-000000000003
    fromColumn: Sales.ProductId
    toColumn: Products.ProductId
```

### expressions.tmdl

```tmdl
expression Server =
    "localhost" meta [IsParameterQuery=true, Type="Text", IsParameterQueryRequired=true]
    lineageTag: e1000001-0000-0000-0000-000000000001
    queryGroup: Parameters

expression Database =
    "SalesDB" meta [IsParameterQuery=true, Type="Text", IsParameterQueryRequired=true]
    lineageTag: e1000002-0000-0000-0000-000000000002
    queryGroup: Parameters
```

### roles/Regional Manager.tmdl

```tmdl
role 'Regional Manager'
    modelPermission: read

    tablePermission Sales = [Region] = USERPRINCIPALNAME()
```

## 3. Date Dimension in TMDL and M Code

### tables/Date.tmdl

```tmdl
table Date
    lineageTag: d1a2b3c4-e5f6-7890-abcd-ef1234567890
    dataCategory: Time

    column Date
        dataType: dateTime
        isKey
        formatString: Short Date
        lineageTag: d2000001-0000-0000-0000-000000000001
        sourceColumn: Date

    column Year
        dataType: int64
        formatString: 0
        lineageTag: d2000002-0000-0000-0000-000000000002
        sourceColumn: Year
        summarizeBy: none

    column Quarter
        dataType: string
        lineageTag: d2000003-0000-0000-0000-000000000003
        sourceColumn: Quarter
        sortByColumn: QuarterNumber

    column QuarterNumber
        dataType: int64
        isHidden
        formatString: 0
        lineageTag: d2000004-0000-0000-0000-000000000004
        sourceColumn: QuarterNumber
        summarizeBy: none

    column Month
        dataType: string
        lineageTag: d2000005-0000-0000-0000-000000000005
        sourceColumn: Month
        sortByColumn: MonthNumber

    column MonthNumber
        dataType: int64
        isHidden
        formatString: 0
        lineageTag: d2000006-0000-0000-0000-000000000006
        sourceColumn: MonthNumber
        summarizeBy: none

    column MonthLong
        dataType: string
        lineageTag: d2000007-0000-0000-0000-000000000007
        sourceColumn: MonthLong
        sortByColumn: MonthNumber

    column YearMonth
        dataType: string
        lineageTag: d2000008-0000-0000-0000-000000000008
        sourceColumn: YearMonth
        sortByColumn: YearMonthSort

    column YearMonthSort
        dataType: int64
        isHidden
        formatString: 0
        lineageTag: d2000009-0000-0000-0000-000000000009
        sourceColumn: YearMonthSort
        summarizeBy: none

    column DayOfWeek
        dataType: int64
        isHidden
        formatString: 0
        lineageTag: d2000010-0000-0000-0000-000000000010
        sourceColumn: DayOfWeek
        summarizeBy: none

    column DayName
        dataType: string
        lineageTag: d2000011-0000-0000-0000-000000000011
        sourceColumn: DayName
        sortByColumn: DayOfWeek

    column IsWeekend
        dataType: boolean
        lineageTag: d2000012-0000-0000-0000-000000000012
        sourceColumn: IsWeekend

    column FiscalYear
        dataType: int64
        formatString: 0
        lineageTag: d2000013-0000-0000-0000-000000000013
        sourceColumn: FiscalYear
        summarizeBy: none

    column FiscalQuarter
        dataType: string
        lineageTag: d2000014-0000-0000-0000-000000000014
        sourceColumn: FiscalQuarter

    partition Date = m
        mode: import
        source
            let
                StartDate = #date(2020, 1, 1),
                EndDate = #date(2026, 12, 31),
                FYStartMonth = 4,
                DayCount = Duration.Days(EndDate - StartDate) + 1,
                DateList = List.Dates(StartDate, DayCount, #duration(1, 0, 0, 0)),
                ToTable = Table.FromList(DateList, Splitter.SplitByNothing(), {"Date"}, null, ExtraValues.Error),
                TypedDate = Table.TransformColumnTypes(ToTable, {{"Date", type date}}),
                AddYear = Table.AddColumn(TypedDate, "Year", each Date.Year([Date]), Int64.Type),
                AddQuarterNum = Table.AddColumn(AddYear, "QuarterNumber", each Date.QuarterOfYear([Date]), Int64.Type),
                AddQuarter = Table.AddColumn(AddQuarterNum, "Quarter", each "Q" & Text.From([QuarterNumber]), type text),
                AddMonthNum = Table.AddColumn(AddQuarter, "MonthNumber", each Date.Month([Date]), Int64.Type),
                AddMonth = Table.AddColumn(AddMonthNum, "Month", each Date.ToText([Date], "MMM"), type text),
                AddMonthLong = Table.AddColumn(AddMonth, "MonthLong", each Date.ToText([Date], "MMMM"), type text),
                AddYearMonth = Table.AddColumn(AddMonthLong, "YearMonth", each Date.ToText([Date], "yyyy-MM"), type text),
                AddYearMonthSort = Table.AddColumn(AddYearMonth, "YearMonthSort", each [Year] * 100 + [MonthNumber], Int64.Type),
                AddDayOfWeek = Table.AddColumn(AddYearMonthSort, "DayOfWeek", each Date.DayOfWeek([Date], Day.Monday) + 1, Int64.Type),
                AddDayName = Table.AddColumn(AddDayOfWeek, "DayName", each Date.ToText([Date], "ddd"), type text),
                AddIsWeekend = Table.AddColumn(AddDayName, "IsWeekend", each [DayOfWeek] >= 6, type logical),
                AddFiscalYear = Table.AddColumn(AddIsWeekend, "FiscalYear", each
                    if [MonthNumber] >= FYStartMonth then [Year] else [Year] - 1, Int64.Type),
                AddFiscalQuarter = Table.AddColumn(AddFiscalYear, "FiscalQuarter", each
                    let
                        fm = if [MonthNumber] >= FYStartMonth
                             then [MonthNumber] - FYStartMonth + 1
                             else [MonthNumber] + (12 - FYStartMonth + 1)
                    in
                        "FQ" & Text.From(Number.RoundUp(fm / 3)), type text)
            in
                AddFiscalQuarter

    hierarchy 'Calendar Hierarchy'
        level Year
            column: Year
        level Quarter
            column: Quarter
        level Month
            column: Month
        level Date
            column: Date

    hierarchy 'Fiscal Hierarchy'
        level FiscalYear
            column: FiscalYear
        level FiscalQuarter
            column: FiscalQuarter
        level Month
            column: Month
```

### Standalone M Code for Date Dimension

This M code can be used directly in Power Query (Get Data > Blank Query > Advanced Editor):

```m
let
    // ============================================
    // Date Dimension Generator
    // Configurable start/end dates and fiscal year
    // ============================================
    StartDate = #date(2020, 1, 1),
    EndDate = #date(2026, 12, 31),
    FiscalYearStartMonth = 4,    // April = 4

    DayCount = Duration.Days(EndDate - StartDate) + 1,
    DateList = List.Dates(StartDate, DayCount, #duration(1, 0, 0, 0)),
    ToTable = Table.FromList(DateList, Splitter.SplitByNothing(), {"Date"}, null, ExtraValues.Error),
    TypedDate = Table.TransformColumnTypes(ToTable, {{"Date", type date}}),

    // Calendar columns
    AddYear = Table.AddColumn(TypedDate, "Year", each Date.Year([Date]), Int64.Type),
    AddQuarterNum = Table.AddColumn(AddYear, "QuarterNumber", each Date.QuarterOfYear([Date]), Int64.Type),
    AddQuarter = Table.AddColumn(AddQuarterNum, "Quarter", each "Q" & Text.From([QuarterNumber]), type text),
    AddYearQuarter = Table.AddColumn(AddQuarter, "YearQuarter",
        each Text.From([Year]) & "-" & "Q" & Text.From([QuarterNumber]), type text),
    AddMonthNum = Table.AddColumn(AddYearQuarter, "MonthNumber", each Date.Month([Date]), Int64.Type),
    AddMonth = Table.AddColumn(AddMonthNum, "Month", each Date.ToText([Date], "MMM"), type text),
    AddMonthLong = Table.AddColumn(AddMonth, "MonthLong", each Date.ToText([Date], "MMMM"), type text),
    AddYearMonth = Table.AddColumn(AddMonthLong, "YearMonth", each Date.ToText([Date], "yyyy-MM"), type text),
    AddYearMonthSort = Table.AddColumn(AddYearMonth, "YearMonthSort",
        each Date.Year([Date]) * 100 + Date.Month([Date]), Int64.Type),
    AddDayOfMonth = Table.AddColumn(AddYearMonthSort, "DayOfMonth", each Date.Day([Date]), Int64.Type),
    AddDayOfWeek = Table.AddColumn(AddDayOfMonth, "DayOfWeek",
        each Date.DayOfWeek([Date], Day.Monday) + 1, Int64.Type),
    AddDayName = Table.AddColumn(AddDayOfWeek, "DayName", each Date.ToText([Date], "ddd"), type text),
    AddDayNameLong = Table.AddColumn(AddDayName, "DayNameLong", each Date.ToText([Date], "dddd"), type text),
    AddWeekNum = Table.AddColumn(AddDayNameLong, "WeekNumber",
        each Date.WeekOfYear([Date], Day.Monday), Int64.Type),

    // Fiscal year columns
    AddFiscalYear = Table.AddColumn(AddWeekNum, "FiscalYear", each
        if Date.Month([Date]) >= FiscalYearStartMonth then Date.Year([Date])
        else Date.Year([Date]) - 1, Int64.Type),
    AddFiscalQuarter = Table.AddColumn(AddFiscalYear, "FiscalQuarter", each
        let
            fm = if Date.Month([Date]) >= FiscalYearStartMonth
                 then Date.Month([Date]) - FiscalYearStartMonth + 1
                 else Date.Month([Date]) + (12 - FiscalYearStartMonth + 1)
        in "FQ" & Text.From(Number.RoundUp(fm / 3)), type text),
    AddFiscalMonth = Table.AddColumn(AddFiscalQuarter, "FiscalMonth", each
        if Date.Month([Date]) >= FiscalYearStartMonth
        then Date.Month([Date]) - FiscalYearStartMonth + 1
        else Date.Month([Date]) + (12 - FiscalYearStartMonth + 1), Int64.Type),

    // Flags
    AddIsWeekend = Table.AddColumn(AddFiscalMonth, "IsWeekend",
        each Date.DayOfWeek([Date], Day.Monday) >= 5, type logical),
    AddIsCurrentMonth = Table.AddColumn(AddIsWeekend, "IsCurrentMonth", each
        Date.Year([Date]) = Date.Year(DateTime.LocalNow()) and
        Date.Month([Date]) = Date.Month(DateTime.LocalNow()), type logical),
    AddIsCurrentYear = Table.AddColumn(AddIsCurrentMonth, "IsCurrentYear", each
        Date.Year([Date]) = Date.Year(DateTime.LocalNow()), type logical),

    // Final sort
    Sorted = Table.Sort(AddIsCurrentYear, {{"Date", Order.Ascending}})
in
    Sorted
```
