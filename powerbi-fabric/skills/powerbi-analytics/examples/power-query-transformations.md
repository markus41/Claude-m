# Power Query M Transformation Examples

Complete Power Query M code examples for common data source connections and transformations.

## 1. Connect to Dataverse and Transform

```m
// Dataverse (CommonDataService.Database) connection
// Retrieves active accounts with selected columns and computed fields
let
    // Connect to Dataverse environment
    Source = CommonDataService.Database("https://orgname.crm.dynamics.com"),

    // Navigate to the account entity
    dbo_account = Source{[Schema = "dbo", Item = "account"]}[Data],

    // Select relevant columns to reduce memory footprint
    SelectedColumns = Table.SelectColumns(dbo_account, {
        "accountid", "name", "revenue", "numberofemployees",
        "industrycode", "address1_city", "address1_stateorprovince",
        "statecode", "createdon", "modifiedon"
    }),

    // Filter to active records only (statecode = 0)
    ActiveOnly = Table.SelectRows(SelectedColumns, each [statecode] = 0),

    // Map industry code to readable label
    IndustryMapping = #table(
        type table [IndustryCode = nullable number, IndustryName = text],
        {
            {1, "Accounting"}, {2, "Agriculture"}, {3, "Broadcasting"},
            {4, "Brokers"}, {5, "Construction"}, {6, "Consulting"},
            {7, "Education"}, {8, "Engineering"}, {9, "Finance"},
            {10, "Government"}, {11, "Healthcare"}, {12, "Hospitality"},
            {null, "Unknown"}
        }
    ),

    // Join with industry mapping
    JoinedIndustry = Table.NestedJoin(
        ActiveOnly, {"industrycode"},
        IndustryMapping, {"IndustryCode"},
        "IndustryLookup",
        JoinKind.LeftOuter
    ),

    // Expand the joined column
    ExpandedIndustry = Table.ExpandTableColumn(
        JoinedIndustry, "IndustryLookup", {"IndustryName"}, {"Industry"}
    ),

    // Replace null industry with "Unknown"
    CleanIndustry = Table.ReplaceValue(
        ExpandedIndustry, null, "Unknown",
        Replacer.ReplaceValue, {"Industry"}
    ),

    // Add revenue tier classification
    AddRevenueTier = Table.AddColumn(CleanIndustry, "RevenueTier", each
        if [revenue] = null or [revenue] = 0 then "No Revenue"
        else if [revenue] < 100000 then "Small"
        else if [revenue] < 1000000 then "Medium"
        else if [revenue] < 10000000 then "Large"
        else "Enterprise",
        type text
    ),

    // Rename columns to business-friendly names
    RenamedColumns = Table.RenameColumns(AddRevenueTier, {
        {"accountid", "AccountId"},
        {"name", "AccountName"},
        {"revenue", "AnnualRevenue"},
        {"numberofemployees", "Employees"},
        {"address1_city", "City"},
        {"address1_stateorprovince", "State"},
        {"createdon", "CreatedDate"},
        {"modifiedon", "LastModified"}
    }),

    // Set column types
    TypedColumns = Table.TransformColumnTypes(RenamedColumns, {
        {"AccountId", type text},
        {"AccountName", type text},
        {"AnnualRevenue", Currency.Type},
        {"Employees", Int64.Type},
        {"City", type text},
        {"State", type text},
        {"Industry", type text},
        {"RevenueTier", type text},
        {"CreatedDate", type datetime},
        {"LastModified", type datetime}
    }),

    // Remove the raw statecode and industrycode columns
    FinalOutput = Table.RemoveColumns(TypedColumns, {"statecode", "industrycode"})
in
    FinalOutput
```

## 2. SQL Server with Parameterized Query

```m
// SQL Server connection using parameters for environment switching
// Parameters: ServerName, DatabaseName, StartDate must be defined as PQ parameters
let
    // Connect using parameters (enables easy dev/test/prod switching)
    Source = Sql.Database(ServerName, DatabaseName),

    // Navigate to the Sales table (supports query folding)
    dbo_Sales = Source{[Schema = "dbo", Item = "Sales"]}[Data],

    // Filter by date (this folds to WHERE clause in SQL)
    FilteredByDate = Table.SelectRows(dbo_Sales, each
        [OrderDate] >= StartDate
    ),

    // Filter by status (folds to SQL)
    ActiveSales = Table.SelectRows(FilteredByDate, each
        [Status] <> "Cancelled"
    ),

    // Select columns (folds to SELECT clause)
    SelectedColumns = Table.SelectColumns(ActiveSales, {
        "SalesId", "OrderDate", "CustomerId", "ProductId",
        "Quantity", "UnitPrice", "Discount", "Region"
    }),

    // Add computed column (may break folding depending on connector)
    AddLineTotal = Table.AddColumn(SelectedColumns, "LineTotal", each
        [Quantity] * [UnitPrice] * (1 - [Discount]),
        Currency.Type
    ),

    // Add fiscal year (April start)
    AddFiscalYear = Table.AddColumn(AddLineTotal, "FiscalYear", each
        if Date.Month([OrderDate]) >= 4
        then Date.Year([OrderDate])
        else Date.Year([OrderDate]) - 1,
        Int64.Type
    ),

    // Type the columns
    TypedResult = Table.TransformColumnTypes(AddFiscalYear, {
        {"SalesId", Int64.Type},
        {"OrderDate", type date},
        {"CustomerId", Int64.Type},
        {"ProductId", Int64.Type},
        {"Quantity", Int64.Type},
        {"UnitPrice", Currency.Type},
        {"Discount", type number},
        {"Region", type text}
    })
in
    TypedResult
```

```m
// Alternative: Native SQL query for complex logic
// Note: Native queries support folding on top (additional PQ steps fold)
let
    Source = Sql.Database(ServerName, DatabaseName, [
        Query = "
            SELECT
                s.SalesId,
                s.OrderDate,
                c.CustomerName,
                p.ProductName,
                p.Category,
                s.Quantity,
                s.UnitPrice,
                s.Quantity * s.UnitPrice AS LineTotal
            FROM dbo.Sales s
            INNER JOIN dbo.Customers c ON s.CustomerId = c.CustomerId
            INNER JOIN dbo.Products p ON s.ProductId = p.ProductId
            WHERE s.Status = 'Completed'
              AND s.OrderDate >= '" & Date.ToText(StartDate, "yyyy-MM-dd") & "'
        ",
        CommandTimeout = #duration(0, 0, 5, 0)
    ])
in
    Source
```

## 3. REST API Pagination (Web.Contents + List.Generate)

```m
// Paginated REST API with Bearer token authentication
// Fetches all pages from an API that returns { data: [...], nextPage: "url" | null }
let
    // Configuration
    BaseUrl = "https://api.example.com",
    ApiPath = "/v2/orders",
    PageSize = 100,
    ApiToken = "your-bearer-token-or-parameter",

    // Function to fetch a single page
    GetPage = (pageNumber as number) as table =>
        let
            Response = Json.Document(
                Web.Contents(
                    BaseUrl,
                    [
                        RelativePath = ApiPath,
                        Headers = [
                            #"Authorization" = "Bearer " & ApiToken,
                            #"Accept" = "application/json"
                        ],
                        Query = [
                            #"page" = Text.From(pageNumber),
                            #"pageSize" = Text.From(PageSize)
                        ],
                        // Prevent caching issues with dynamic queries
                        ManualStatusHandling = {404, 429}
                    ]
                )
            ),
            Data = if Response[data]? <> null and List.Count(Response[data]) > 0
                   then Table.FromRecords(Response[data])
                   else #table({}, {})
        in
            Data,

    // Use List.Generate to paginate until an empty page is returned
    AllPages = List.Generate(
        // Initial state
        () => [PageNum = 1, PageData = GetPage(1)],
        // Condition: continue while page has rows
        each Table.RowCount([PageData]) > 0,
        // Next state
        each [PageNum = [PageNum] + 1, PageData = GetPage([PageNum] + 1)],
        // Selector: extract the table
        each [PageData]
    ),

    // Combine all pages into a single table
    CombinedData = Table.Combine(AllPages),

    // Type the columns
    TypedResult = Table.TransformColumnTypes(CombinedData, {
        {"id", Int64.Type},
        {"orderDate", type datetime},
        {"customerName", type text},
        {"amount", type number},
        {"status", type text}
    })
in
    TypedResult
```

```m
// Alternative: Offset-based pagination for APIs using skip/top
let
    BaseUrl = "https://api.example.com",
    PageSize = 500,

    GetPage = (offset as number) =>
        let
            Response = Json.Document(
                Web.Contents(
                    BaseUrl,
                    [
                        RelativePath = "/v1/records",
                        Query = [
                            #"$skip" = Text.From(offset),
                            #"$top" = Text.From(PageSize)
                        ]
                    ]
                )
            )
        in
            Response[value],

    // Accumulate pages
    AllRecords = List.Generate(
        () => [Offset = 0, Records = GetPage(0)],
        each List.Count([Records]) > 0,
        each [Offset = [Offset] + PageSize, Records = GetPage([Offset] + PageSize)],
        each [Records]
    ),

    Combined = Table.FromRecords(List.Combine(AllRecords))
in
    Combined
```

## 4. Merge Multiple Excel Files from SharePoint Folder

```m
// Combine all Excel files from a SharePoint document library folder
// Handles dynamic file discovery -- new files are automatically included
let
    // Connect to SharePoint site
    Source = SharePoint.Files(
        "https://contoso.sharepoint.com/sites/SalesTeam",
        [ApiVersion = 15]
    ),

    // Filter to the target folder and file type
    FilteredFiles = Table.SelectRows(Source, each
        Text.Contains([Folder Path], "/Shared Documents/Monthly Reports/") and
        Text.EndsWith([Name], ".xlsx") and
        not Text.StartsWith([Name], "~$")   // Exclude temp files
    ),

    // Extract the month/year from filename (e.g., "Sales_2024_01.xlsx")
    AddFileInfo = Table.AddColumn(FilteredFiles, "FileMonth", each
        let
            parts = Text.Split(Text.BeforeDelimiter([Name], ".xlsx"), "_"),
            yearPart = parts{1}?,
            monthPart = parts{2}?
        in
            if yearPart <> null and monthPart <> null
            then yearPart & "-" & monthPart
            else [Name],
        type text
    ),

    // Function to extract data from each Excel file
    ExtractSheetData = (fileContent as binary) as table =>
        let
            Workbook = Excel.Workbook(fileContent, true),
            // Get the first sheet (or a named sheet)
            Sheet = Workbook{[Item = "Data", Kind = "Sheet"]}[Data],
            Promoted = Table.PromoteHeaders(Sheet, [PromoteAllScalars = true])
        in
            Promoted,

    // Apply extraction to each file
    AddTableData = Table.AddColumn(AddFileInfo, "SheetData", each
        try ExtractSheetData([Content]) otherwise #table({}, {}),
        type table
    ),

    // Keep only file info and extracted data
    SelectedColumns = Table.SelectColumns(AddTableData, {"Name", "FileMonth", "SheetData"}),

    // Expand all sheet data
    ExpandedData = Table.ExpandTableColumn(
        SelectedColumns,
        "SheetData",
        {"Date", "Product", "Region", "Quantity", "Revenue"},
        {"Date", "Product", "Region", "Quantity", "Revenue"}
    ),

    // Add source file tracking
    AddSourceFile = Table.RenameColumns(ExpandedData, {{"Name", "SourceFile"}}),

    // Type columns
    TypedResult = Table.TransformColumnTypes(AddSourceFile, {
        {"Date", type date},
        {"Product", type text},
        {"Region", type text},
        {"Quantity", Int64.Type},
        {"Revenue", Currency.Type},
        {"FileMonth", type text},
        {"SourceFile", type text}
    })
in
    TypedResult
```

## 5. Custom Date Dimension Table

```m
// Generate a comprehensive date dimension table
// Covers calendar years, fiscal years (April start), week numbers, and holidays
let
    // Configuration
    StartDate = #date(2020, 1, 1),
    EndDate = #date(2026, 12, 31),
    FiscalYearStartMonth = 4,   // April

    // Generate date list
    DayCount = Duration.Days(EndDate - StartDate) + 1,
    DateList = List.Dates(StartDate, DayCount, #duration(1, 0, 0, 0)),
    ToTable = Table.FromList(DateList, Splitter.SplitByNothing(), {"Date"}, null, ExtraValues.Error),
    TypedDate = Table.TransformColumnTypes(ToTable, {{"Date", type date}}),

    // Calendar columns
    AddYear = Table.AddColumn(TypedDate, "Year", each Date.Year([Date]), Int64.Type),
    AddQuarterNum = Table.AddColumn(AddYear, "QuarterNumber", each Date.QuarterOfYear([Date]), Int64.Type),
    AddQuarter = Table.AddColumn(AddQuarterNum, "Quarter", each "Q" & Text.From([QuarterNumber]), type text),
    AddYearQuarter = Table.AddColumn(AddQuarter, "YearQuarter", each Text.From([Year]) & "-" & [Quarter], type text),
    AddMonthNum = Table.AddColumn(AddYearQuarter, "MonthNumber", each Date.Month([Date]), Int64.Type),
    AddMonthName = Table.AddColumn(AddMonthNum, "Month", each Date.ToText([Date], "MMM"), type text),
    AddMonthLong = Table.AddColumn(AddMonthName, "MonthLong", each Date.ToText([Date], "MMMM"), type text),
    AddYearMonth = Table.AddColumn(AddMonthLong, "YearMonth", each Date.ToText([Date], "yyyy-MM"), type text),
    AddDayOfWeek = Table.AddColumn(AddYearMonth, "DayOfWeek", each Date.DayOfWeek([Date], Day.Monday) + 1, Int64.Type),
    AddDayName = Table.AddColumn(AddDayOfWeek, "DayName", each Date.ToText([Date], "ddd"), type text),
    AddDayOfMonth = Table.AddColumn(AddDayName, "DayOfMonth", each Date.Day([Date]), Int64.Type),
    AddWeekNum = Table.AddColumn(AddDayOfMonth, "WeekNumber", each Date.WeekOfYear([Date], Day.Monday), Int64.Type),
    AddISOWeek = Table.AddColumn(AddWeekNum, "ISOWeek", each
        let
            // ISO 8601 week calculation
            thursdayOfWeek = Date.AddDays([Date], 3 - Date.DayOfWeek([Date], Day.Monday)),
            jan4 = #date(Date.Year(thursdayOfWeek), 1, 4),
            startOfISOYear = Date.AddDays(jan4, -(Date.DayOfWeek(jan4, Day.Monday))),
            weekNum = Duration.Days(thursdayOfWeek - startOfISOYear) / 7 + 1
        in
            Number.RoundDown(weekNum),
        Int64.Type
    ),

    // Fiscal year columns (April start)
    AddFiscalYear = Table.AddColumn(AddISOWeek, "FiscalYear", each
        if [MonthNumber] >= FiscalYearStartMonth
        then [Year]
        else [Year] - 1,
        Int64.Type
    ),
    AddFiscalQuarter = Table.AddColumn(AddFiscalYear, "FiscalQuarter", each
        let
            adjustedMonth = if [MonthNumber] >= FiscalYearStartMonth
                           then [MonthNumber] - FiscalYearStartMonth + 1
                           else [MonthNumber] + (12 - FiscalYearStartMonth + 1)
        in
            "FQ" & Text.From(Number.RoundUp(adjustedMonth / 3)),
        type text
    ),
    AddFiscalMonth = Table.AddColumn(AddFiscalQuarter, "FiscalMonth", each
        if [MonthNumber] >= FiscalYearStartMonth
        then [MonthNumber] - FiscalYearStartMonth + 1
        else [MonthNumber] + (12 - FiscalYearStartMonth + 1),
        Int64.Type
    ),

    // Flags
    AddIsWeekend = Table.AddColumn(AddFiscalMonth, "IsWeekend", each
        [DayOfWeek] >= 6,
        type logical
    ),
    AddIsCurrentMonth = Table.AddColumn(AddIsWeekend, "IsCurrentMonth", each
        Date.Year([Date]) = Date.Year(DateTime.LocalNow()) and
        Date.Month([Date]) = Date.Month(DateTime.LocalNow()),
        type logical
    ),
    AddIsCurrentYear = Table.AddColumn(AddIsCurrentMonth, "IsCurrentYear", each
        Date.Year([Date]) = Date.Year(DateTime.LocalNow()),
        type logical
    ),

    // Sort key for Month (ensures Jan-Dec sorting)
    FinalTable = Table.Sort(AddIsCurrentYear, {{"Date", Order.Ascending}})
in
    FinalTable
```

## 6. Pivot/Unpivot Transformation

```m
// Unpivot monthly columns into rows, then pivot by category
let
    // Source: table with columns like Product, Category, Jan, Feb, Mar, ...
    Source = Excel.Workbook(File.Contents("C:\Data\MonthlyReport.xlsx"), true){0}[Data],

    // Unpivot the month columns into rows
    Unpivoted = Table.UnpivotOtherColumns(
        Source,
        {"Product", "Category"},    // Columns to keep as-is
        "Month",                     // New attribute column name
        "Amount"                     // New value column name
    ),

    // Map month abbreviations to numbers for sorting
    MonthOrder = #table(
        type table [Month = text, MonthSort = number],
        {
            {"Jan", 1}, {"Feb", 2}, {"Mar", 3}, {"Apr", 4},
            {"May", 5}, {"Jun", 6}, {"Jul", 7}, {"Aug", 8},
            {"Sep", 9}, {"Oct", 10}, {"Nov", 11}, {"Dec", 12}
        }
    ),
    JoinedSort = Table.NestedJoin(Unpivoted, {"Month"}, MonthOrder, {"Month"}, "Sort", JoinKind.LeftOuter),
    ExpandedSort = Table.ExpandTableColumn(JoinedSort, "Sort", {"MonthSort"}),

    // Type the Amount column
    TypedAmount = Table.TransformColumnTypes(ExpandedSort, {
        {"Amount", Currency.Type},
        {"MonthSort", Int64.Type}
    }),

    // Optional: Pivot by Category to create columns per category
    Pivoted = Table.Pivot(
        TypedAmount,
        List.Distinct(TypedAmount[Category]),
        "Category",
        "Amount",
        List.Sum
    )
in
    Pivoted
```
