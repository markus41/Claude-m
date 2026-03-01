# Power Query M Language Reference

Comprehensive reference for the Power Query M formula language used in Power BI Desktop (Get Data / Transform Data), Dataflow Gen2, and Fabric data pipelines.

## Language Structure

### let/in Expressions

Every Power Query query is a `let/in` expression. Steps are evaluated lazily -- only the steps needed to produce the final result (the `in` clause) are executed.

```m
let
    Source = Sql.Database("myserver.database.windows.net", "mydb"),
    FilteredRows = Table.SelectRows(Source, each [Status] = "Active"),
    SelectedCols = Table.SelectColumns(FilteredRows, {"Id", "Name", "Amount", "Date"}),
    TypedCols = Table.TransformColumnTypes(SelectedCols, {
        {"Id", Int64.Type},
        {"Name", type text},
        {"Amount", Currency.Type},
        {"Date", type date}
    })
in
    TypedCols
```

### Step References

Each step name can reference any previous step. Step names with spaces or special characters must be surrounded by `#"step name"`.

```m
let
    Source = ...,
    #"Filtered Rows" = Table.SelectRows(Source, each [Column] > 10),
    #"Renamed Columns" = Table.RenameColumns(#"Filtered Rows", {{"Old", "New"}})
in
    #"Renamed Columns"
```

### #table for Inline Tables

```m
#table(
    type table [Name = text, Value = number],
    {
        {"Alpha", 1},
        {"Beta", 2},
        {"Gamma", 3}
    }
)
```

### Comments

```m
// Single line comment
/* Multi-line
   comment */
```

## Source Connections

### SQL Server / Azure SQL

```m
let
    Source = Sql.Database("server.database.windows.net", "DatabaseName", [
        Query = "SELECT * FROM dbo.Sales WHERE Year >= 2024",
        CommandTimeout = #duration(0, 0, 10, 0)
    ])
in
    Source
```

With native query (supports folding on top):

```m
let
    Source = Sql.Database("server.database.windows.net", "DatabaseName"),
    dbo_Sales = Source{[Schema="dbo", Item="Sales"]}[Data],
    FilteredRows = Table.SelectRows(dbo_Sales, each [Year] >= 2024)
in
    FilteredRows
```

### OData Feed

```m
let
    Source = OData.Feed(
        "https://api.example.com/odata/v4/",
        null,
        [Implementation = "2.0", ODataVersion = 4]
    ),
    Entities = Source{[Name="Entities", Signature="table"]}[Data]
in
    Entities
```

### Web.Contents (REST API)

```m
let
    Source = Json.Document(
        Web.Contents(
            "https://api.example.com",
            [
                RelativePath = "/v1/data",
                Headers = [
                    #"Authorization" = "Bearer " & token,
                    #"Content-Type" = "application/json"
                ],
                Query = [
                    #"$top" = "100",
                    #"$skip" = "0"
                ]
            ]
        )
    ),
    ToTable = Table.FromRecords(Source[value])
in
    ToTable
```

**Important**: Always use `RelativePath` and `Query` parameters instead of concatenating URLs. This enables Power BI to correctly identify the base URL for data source credentials and privacy settings.

### Excel Workbook

```m
let
    Source = Excel.Workbook(
        File.Contents("C:\Data\Report.xlsx"),
        null,
        true  // use first row as headers
    ),
    Sheet1 = Source{[Item="Sheet1", Kind="Sheet"]}[Data],
    PromotedHeaders = Table.PromoteHeaders(Sheet1, [PromoteAllScalars=true])
in
    PromotedHeaders
```

### CSV / Text File

```m
let
    Source = Csv.Document(
        File.Contents("C:\Data\export.csv"),
        [
            Delimiter = ",",
            Columns = 5,
            Encoding = TextEncoding.Utf8,
            QuoteStyle = QuoteStyle.Csv
        ]
    ),
    PromotedHeaders = Table.PromoteHeaders(Source, [PromoteAllScalars=true])
in
    PromotedHeaders
```

### Dataverse (CommonDataService.Database)

```m
let
    Source = CommonDataService.Database("https://orgname.crm.dynamics.com"),
    accounts = Source{[Schema="dbo", Item="account"]}[Data],
    SelectedColumns = Table.SelectColumns(accounts, {
        "accountid", "name", "revenue", "industrycode", "statecode"
    }),
    ActiveOnly = Table.SelectRows(SelectedColumns, each [statecode] = 0)
in
    ActiveOnly
```

### SharePoint Files

```m
let
    Source = SharePoint.Files(
        "https://tenant.sharepoint.com/sites/MySite",
        [ApiVersion = 15]
    ),
    FilteredFiles = Table.SelectRows(Source, each
        Text.Contains([Folder Path], "/Shared Documents/Data/") and
        Text.EndsWith([Name], ".xlsx")
    ),
    AddContent = Table.AddColumn(FilteredFiles, "Tables", each
        Excel.Workbook([Content], true){0}[Data]
    ),
    Combined = Table.Combine(AddContent[Tables])
in
    Combined
```

### JSON Document

```m
let
    Source = Json.Document(File.Contents("C:\Data\config.json")),
    ToTable = Table.FromRecords(Source[items]),
    Typed = Table.TransformColumnTypes(ToTable, {
        {"id", Int64.Type},
        {"name", type text},
        {"value", type number}
    })
in
    Typed
```

## Table Transforms

### Select, Remove, Rename Columns

```m
Table.SelectColumns(table, {"Col1", "Col2", "Col3"})
Table.RemoveColumns(table, {"UnwantedCol"})
Table.RenameColumns(table, {{"OldName1", "NewName1"}, {"OldName2", "NewName2"}})
Table.ReorderColumns(table, {"Col3", "Col1", "Col2"})
```

### Filter Rows

```m
Table.SelectRows(table, each [Amount] > 100 and [Status] = "Active")
Table.SelectRows(table, each [Date] >= #date(2024, 1, 1))
Table.SelectRows(table, each List.Contains({"A", "B", "C"}, [Category]))
Table.Distinct(table)                          // Remove duplicate rows
Table.Distinct(table, {"KeyColumn"})           // Remove duplicates by key
Table.FirstN(table, 100)                       // Top N rows
Table.Skip(table, 10)                          // Skip first N rows
Table.Range(table, 10, 20)                     // Rows 10-29
```

### Add Columns

```m
Table.AddColumn(table, "NewCol", each [Price] * [Quantity], Currency.Type)
Table.AddColumn(table, "FullName", each [FirstName] & " " & [LastName], type text)
Table.AddColumn(table, "Year", each Date.Year([OrderDate]), Int64.Type)
Table.AddIndexColumn(table, "RowIndex", 1, 1, Int64.Type)  // 1-based index
```

### Transform Columns

```m
Table.TransformColumns(table, {
    {"Name", Text.Upper, type text},
    {"Amount", each _ * 1.1, type number},
    {"Date", Date.Year, Int64.Type}
})

Table.TransformColumnTypes(table, {
    {"Id", Int64.Type},
    {"Name", type text},
    {"Amount", type number},
    {"Date", type date},
    {"IsActive", type logical}
})

Table.ReplaceValue(table, null, 0, Replacer.ReplaceValue, {"Amount"})
Table.ReplaceValue(table, "old", "new", Replacer.ReplaceText, {"TextColumn"})
```

### Sort and Group

```m
Table.Sort(table, {{"Amount", Order.Descending}, {"Name", Order.Ascending}})

Table.Group(table, {"Category"}, {
    {"TotalAmount", each List.Sum([Amount]), type number},
    {"Count", each Table.RowCount(_), Int64.Type},
    {"AvgAmount", each List.Average([Amount]), type number}
})
```

### Pivot and Unpivot

```m
// Pivot: rows to columns
Table.Pivot(table, List.Distinct(table[Attribute]), "Attribute", "Value", List.Sum)

// Unpivot: columns to rows
Table.Unpivot(table, {"Jan", "Feb", "Mar"}, "Month", "Value")

// Unpivot other columns (more resilient to schema changes)
Table.UnpivotOtherColumns(table, {"Id", "Name"}, "Attribute", "Value")
```

### Merge and Append

```m
// Merge (Join)
Table.NestedJoin(
    leftTable, {"KeyCol"},
    rightTable, {"KeyCol"},
    "Joined",
    JoinKind.LeftOuter    // LeftOuter, Inner, RightOuter, FullOuter, LeftAnti, RightAnti
)

// Expand joined columns
Table.ExpandTableColumn(mergedTable, "Joined", {"Col1", "Col2"}, {"Right.Col1", "Right.Col2"})

// Append (Union)
Table.Combine({table1, table2, table3})
```

## Type System

### Primitive Types

```m
type text
type number
Int64.Type          // 64-bit integer
type date
type datetime
type datetimezone
type time
type duration
type logical
Currency.Type       // Fixed decimal (4 decimal places)
Percentage.Type
type binary
type null
type any
```

### Table Types

```m
type table [Id = Int64.Type, Name = text, Amount = number, Date = date]
```

### Record Types

```m
type [Name = text, Age = number]
```

## Custom Functions

### Basic Function

```m
(serverName as text, databaseName as text) =>
let
    Source = Sql.Database(serverName, databaseName),
    Tables = Source{[Schema="dbo", Item="Sales"]}[Data]
in
    Tables
```

### Function with Optional Parameters

```m
(required as text, optional optionalParam as nullable text) =>
let
    _param = if optionalParam = null then "default" else optionalParam,
    Result = required & " - " & _param
in
    Result
```

### List.Generate for Loops / Pagination

```m
// List.Generate(initial, condition, next, transform)
let
    Pages = List.Generate(
        () => [Page = 0, Data = GetPage(0)],
        each Table.RowCount([Data]) > 0,
        each [Page = [Page] + 1, Data = GetPage([Page] + 1)],
        each [Data]
    ),
    Combined = Table.Combine(Pages)
in
    Combined
```

### List.Accumulate for Iteration

```m
// Fold over a list, accumulating a result
List.Accumulate(
    {1, 2, 3, 4, 5},
    0,
    (state, current) => state + current
)
// Returns 15
```

## Error Handling

### try/otherwise

```m
let
    SafeConvert = (value) =>
        let
            result = try Number.FromText(value) otherwise null
        in
            result,

    Source = ...,
    AddSafe = Table.AddColumn(Source, "SafeAmount", each SafeConvert([AmountText]), type nullable number)
in
    AddSafe
```

### try with Record Result

```m
let
    result = try SomeRiskyOperation(),
    output = if result[HasError] then result[Error][Message] else result[Value]
in
    output
```

## Parameters

Query parameters allow dynamic configuration of data sources and filter values.

To create a parameter in Power BI Desktop: Home > Manage Parameters > New Parameter.

In M code, parameters are referenced by their name:

```m
let
    Source = Sql.Database(ServerParameter, DatabaseParameter),
    Filtered = Table.SelectRows(Source{[Schema="dbo", Item="Sales"]}[Data],
        each [Date] >= StartDateParameter)
in
    Filtered
```

## Query Folding

Query folding is when Power Query translates M transformations into native queries (SQL, OData filters) sent to the source system. Folding is critical for performance because it pushes computation to the source rather than downloading all data.

### Operations That Typically Fold

- `Table.SelectRows` (simple conditions)
- `Table.SelectColumns` / `Table.RemoveColumns`
- `Table.Sort`
- `Table.Group` (simple aggregations)
- `Table.NestedJoin` (when both tables are from the same source)
- `Table.FirstN` (translates to TOP)
- `Table.TransformColumnTypes` (type casting)
- `Table.RenameColumns`

### Operations That Break Folding

- `Table.AddColumn` with custom M logic
- `Table.TransformColumns` with custom M functions
- `Table.Buffer` (forces materialization)
- Custom M functions applied per-row
- `Text.Upper` / `Text.Lower` and similar (in some connectors)
- `Table.Pivot` / `Table.Unpivot`
- Combining tables from different data sources
- `List.Generate` and complex iterations
- References to other queries

### Checking Fold Status

In Power Query Editor, right-click a step and select "View Native Query." If the option is available and shows a query, that step folds. If grayed out, the step or a previous step has broken folding.

### Performance Tips

1. Apply filtering and column selection as early as possible (before folding breaks)
2. Use `Value.NativeQuery` for complex SQL that M cannot generate
3. Avoid `Table.Buffer` unless explicitly needed for performance with multiple downstream references
4. Use `Table.StopFolding` only when you intentionally want to prevent folding
5. When using `Web.Contents`, use `Query` and `RelativePath` parameters for proper credential resolution
6. For large datasets, use incremental refresh policies with `RangeStart`/`RangeEnd` parameters

## Value.NativeQuery

When Power Query M cannot generate the desired SQL, use `Value.NativeQuery` to pass raw SQL directly while still enabling folding on subsequent M steps.

```m
let
    Source = Sql.Database("server.database.windows.net", "mydb"),
    NativeResult = Value.NativeQuery(
        Source,
        "SELECT s.*, c.CustomerName
         FROM dbo.Sales s
         INNER JOIN dbo.Customers c ON s.CustomerId = c.CustomerId
         WHERE s.OrderDate >= @startDate",
        [startDate = #date(2024, 1, 1)],
        [EnableFolding = true]
    )
in
    NativeResult
```

## Record and List Operations

### Record Functions

```m
Record.Field(record, "fieldName")              // Access a field by name
Record.FieldValues(record)                     // Get all values as a list
Record.FieldNames(record)                      // Get all field names as a list
Record.HasFields(record, {"field1", "field2"}) // Check if fields exist
Record.Combine({record1, record2})             // Merge records (later wins)
Record.TransformFields(record, {{"Amount", each _ * 1.1}})  // Transform specific fields
```

### List Functions

```m
List.Count(list)                              // Number of items
List.Sum(list)                                // Sum of numeric items
List.Average(list)                            // Average of numeric items
List.Max(list)                                // Maximum value
List.Min(list)                                // Minimum value
List.Distinct(list)                           // Unique items
List.Contains(list, value)                    // Check membership
List.Transform(list, each _ * 2)              // Transform each item
List.Select(list, each _ > 10)               // Filter items
List.Combine({list1, list2})                 // Concatenate lists
List.Zip({list1, list2})                     // Pair items from two lists
List.Generate(initial, condition, next, selector)  // Loop/iterate
List.Accumulate(list, seed, accumulator)     // Fold/reduce
List.Dates(start, count, step)               // Generate date list
List.Numbers(start, count, step)             // Generate number list
```

## Data Privacy and Firewall Settings

Power Query enforces data privacy levels that can affect how queries combine data from different sources. Privacy levels:

- **None**: No privacy restrictions.
- **Public**: Data can be combined with any other source.
- **Organizational**: Data can only be combined with other Organizational sources.
- **Private**: Data is isolated; cannot be combined with other sources.

When combining data from sources with different privacy levels, Power Query may buffer data or block the combination entirely. To handle this:

1. Set privacy levels appropriately in the data source settings.
2. In Power BI Desktop, you can disable privacy checks via File > Options > Current File > Privacy > "Ignore the Privacy levels."
3. In production, properly configure privacy levels rather than disabling them.

## Incremental Refresh

Incremental refresh reduces refresh time by only refreshing new/changed data. Requires two DateTime parameters:

- `RangeStart` — The beginning of the refresh window.
- `RangeEnd` — The end of the refresh window.

```m
let
    Source = Sql.Database("server", "db"),
    Sales = Source{[Schema="dbo", Item="Sales"]}[Data],
    // These filters must use the exact parameter names for incremental refresh
    Filtered = Table.SelectRows(Sales, each
        [OrderDate] >= RangeStart and [OrderDate] < RangeEnd
    )
in
    Filtered
```

Power BI automatically manages these parameters during scheduled refresh. In the model settings, define:
- How many years/months/days of historical data to keep (stored partition)
- How many days/hours to refresh (refresh partition)
- Whether to detect data changes (optional, via a last-modified column)

## Common Patterns

### Conditional Column with Multiple Conditions

```m
Table.AddColumn(table, "Category", each
    if [Amount] >= 10000 then "High"
    else if [Amount] >= 1000 then "Medium"
    else if [Amount] > 0 then "Low"
    else "Zero",
    type text
)
```

### Dynamic Column Selection

```m
// Select columns matching a pattern
let
    Source = ...,
    AllColumns = Table.ColumnNames(Source),
    KeepColumns = List.Select(AllColumns, each
        Text.StartsWith(_, "Sales_") or _ = "Id"
    ),
    Selected = Table.SelectColumns(Source, KeepColumns)
in
    Selected
```

### Transpose and Cross-Apply Pattern

```m
// Convert a record to a key-value table
let
    Source = [Name = "Acme", Revenue = 1000, Country = "US"],
    Fields = Record.FieldNames(Source),
    Values = Record.FieldValues(Source),
    Zipped = List.Zip({Fields, Values}),
    ToTable = Table.FromRows(Zipped, {"Key", "Value"})
in
    ToTable
```
