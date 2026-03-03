# Dataflow Gen2 Examples

Dataflow Gen2 in Microsoft Fabric is Power Query Online with staging enabled by default. These examples show annotated M code for common Dataflow Gen2 patterns, with notes on query folding, output destinations, and incremental refresh configuration.

## Example 1: SQL Source to Lakehouse Table with Query Folding Preserved

This example loads sales data from Azure SQL Database, applies filters and column selection that fold to SQL, and outputs to a Fabric Lakehouse Delta table.

### M Code

```powerquery-m
let
    // Connect to Azure SQL Database
    // FOLDS: Connection is handled natively by the SQL connector
    Source = Sql.Database(
        "your-server.database.windows.net",
        "AdventureWorks"
    ),

    // Navigate to the Sales.SalesOrderHeader table
    // FOLDS: Table selection maps to FROM clause
    SalesOrderHeader = Source{[Schema = "Sales", Item = "SalesOrderHeader"]}[Data],

    // Filter to orders from 2024 onward
    // FOLDS: Translates to WHERE OrderDate >= '2024-01-01'
    FilteredRows = Table.SelectRows(
        SalesOrderHeader,
        each [OrderDate] >= #date(2024, 1, 1)
    ),

    // Select only needed columns
    // FOLDS: Translates to SELECT SalesOrderID, OrderDate, CustomerID, SubTotal, TaxAmt, TotalDue
    SelectedColumns = Table.SelectColumns(FilteredRows, {
        "SalesOrderID", "OrderDate", "CustomerID",
        "SubTotal", "TaxAmt", "TotalDue"
    }),

    // Add a calculated column for gross margin percentage
    // DOES NOT FOLD: Custom calculation breaks folding -- all subsequent steps run in PQ engine
    AddedGrossMargin = Table.AddColumn(
        SelectedColumns,
        "GrossMarginPct",
        each if [TotalDue] = 0 then 0 else [SubTotal] / [TotalDue],
        type number
    ),

    // Set all column types explicitly
    // DOES NOT FOLD: Runs in PQ engine (after folding was already broken above)
    TypedTable = Table.TransformColumnTypes(AddedGrossMargin, {
        {"SalesOrderID", Int64.Type},
        {"OrderDate", type date},
        {"CustomerID", Int64.Type},
        {"SubTotal", Currency.Type},
        {"TaxAmt", Currency.Type},
        {"TotalDue", Currency.Type},
        {"GrossMarginPct", type number}
    })
in
    TypedTable
```

### Annotations

**Query folding status by step:**

| Step | Folds? | Reason |
|---|---|---|
| `Source` (Sql.Database) | Yes | Native SQL connector |
| `SalesOrderHeader` (table navigation) | Yes | Maps to `FROM Sales.SalesOrderHeader` |
| `FilteredRows` (Table.SelectRows) | Yes | Maps to `WHERE OrderDate >= '2024-01-01'` |
| `SelectedColumns` (Table.SelectColumns) | Yes | Maps to `SELECT col1, col2, ...` |
| `AddedGrossMargin` (Table.AddColumn) | No | Custom M expression cannot translate to SQL |
| `TypedTable` (Table.TransformColumnTypes) | No | Runs after folding break |

**Optimization tip**: If you move the `Table.AddColumn` step to the very end (after type setting), the type-setting step could potentially fold. However, `Table.TransformColumnTypes` on already-typed SQL columns is typically a no-op in terms of performance impact.

**Output destination**: In Dataflow Gen2, the output destination is configured in the UI, not in M code. Right-click the query in the Queries pane > "Add data destination" > select "Lakehouse" > choose the target Lakehouse and table name (for example, `SalesOrderHeader`) > set the update method:
- **Replace**: Drops and recreates the target table on each run
- **Append**: Adds new rows to the existing table (use with incremental refresh or idempotent loads)

**Staging**: Staging is enabled by default in Dataflow Gen2. Intermediate results are written to a staging Lakehouse in OneLake before being copied to the final destination. This improves reliability for large datasets and enables compute isolation between the source query and the destination write.

---

## Example 2: REST API Pagination to Lakehouse

This example fetches data from a paginated REST API using cursor-based pagination and loads the results to a Lakehouse table.

### M Code

```powerquery-m
let
    // Base URL for the API
    BaseUrl = "https://api.example.com/v1/orders",

    // Function to fetch a single page given a cursor (null for first page)
    // DOES NOT FOLD: Web.Contents is never foldable
    FetchPage = (cursor as nullable text) as record =>
        let
            // Build query parameters -- include cursor only if non-null
            QueryParams = if cursor = null
                then [pageSize = "100"]
                else [pageSize = "100", cursor = cursor],

            // Fetch the page
            Response = Web.Contents(BaseUrl, [
                Query = QueryParams,
                Headers = [
                    #"Accept" = "application/json",
                    #"Authorization" = "Bearer " & #"API_ACCESS_TOKEN"
                ],
                // Set timeout to 30 seconds per request
                Timeout = #duration(0, 0, 30, 0)
            ]),

            // Parse JSON response
            JsonResponse = Json.Document(Response),

            // Extract the data array and next cursor
            DataArray = JsonResponse[data],
            NextCursor = try JsonResponse[nextCursor] otherwise null
        in
            [Data = DataArray, NextCursor = NextCursor],

    // Paginate using List.Generate
    // Starts with cursor = null, fetches pages until NextCursor is null or Data is empty
    AllPages = List.Generate(
        // Initial state: fetch the first page
        () => FetchPage(null),

        // Continue condition: stop when there is no next cursor or no data
        each [NextCursor] <> null and List.Count([Data]) > 0,

        // Next state: fetch the next page using the cursor
        each FetchPage([NextCursor]),

        // Selector: extract just the data array from each state
        each [Data]
    ),

    // Flatten all pages into a single list of records
    AllRecords = List.Combine(AllPages),

    // Convert list of records to a table
    RecordsTable = Table.FromRecords(AllRecords, null, MissingField.UseNull),

    // Expand nested "customer" record column (if present)
    ExpandedCustomer = Table.ExpandRecordColumn(
        RecordsTable,
        "customer",
        {"id", "name", "email"},
        {"CustomerId", "CustomerName", "CustomerEmail"}
    ),

    // Set column types
    TypedTable = Table.TransformColumnTypes(ExpandedCustomer, {
        {"orderId", type text},
        {"orderDate", type datetime},
        {"amount", Currency.Type},
        {"status", type text},
        {"CustomerId", type text},
        {"CustomerName", type text},
        {"CustomerEmail", type text}
    })
in
    TypedTable
```

### Annotations

**Query folding**: None of the steps fold. `Web.Contents` is a non-foldable source. All data is fetched into the Power Query Online engine, transformed in memory, and then written to the destination.

**Staging benefit**: In Dataflow Gen2, staging is especially valuable for API-sourced data. The paginated results are first cached in the staging Lakehouse (OneLake), isolating the API fetch from the destination write. If the destination write fails, the staging data is preserved and the write can be retried without re-fetching from the API.

**Page-number variant**: For APIs that use page numbers instead of cursors, replace the `List.Generate` pattern:

```powerquery-m
// Page-number pagination variant
AllPages = List.Generate(
    () => [PageNum = 1, Data = FetchPageByNumber(1)],
    each List.Count([Data]) > 0,
    each [PageNum = [PageNum] + 1, Data = FetchPageByNumber([PageNum] + 1)],
    each [Data]
),

// Where FetchPageByNumber is:
FetchPageByNumber = (pageNum as number) as list =>
    let
        Response = Web.Contents(BaseUrl, [
            Query = [page = Text.From(pageNum), pageSize = "100"]
        ]),
        JsonResponse = Json.Document(Response)
    in
        JsonResponse[data],
```

**Authentication**: The `#"API_ACCESS_TOKEN"` reference above assumes a Dataflow Gen2 parameter. In practice, configure authentication via the Dataflow Gen2 credentials UI:
- For OAuth2 APIs: Use the "Organizational account" credential type
- For API key/bearer token: Use the "Web" credential type with "Anonymous" authentication and pass the key in a header via M code

---

## Example 3: Incremental Refresh in Dataflow Gen2

This example demonstrates how to configure incremental refresh using `RangeStart` and `RangeEnd` parameters in Dataflow Gen2 to process only the changed date window on each run.

### Step 1: Create Parameters in Dataflow Gen2 UI

In the Dataflow Gen2 editor:

1. Go to **Home > Manage Parameters > New Parameter**.
2. Create parameter:
   - Name: `RangeStart`
   - Type: `Date/Time`
   - Current value: `1/1/2024 12:00:00 AM` (placeholder -- Fabric replaces this at runtime)
3. Create parameter:
   - Name: `RangeEnd`
   - Type: `Date/Time`
   - Current value: `1/1/2025 12:00:00 AM` (placeholder -- Fabric replaces this at runtime)

These exact parameter names (`RangeStart` and `RangeEnd`) are required. The Fabric incremental refresh engine detects them by name and injects the appropriate date range at runtime.

### Step 2: M Code Using RangeStart/RangeEnd

```powerquery-m
let
    // Connect to Azure SQL Database
    // FOLDS: Native SQL connector
    Source = Sql.Database(
        "your-server.database.windows.net",
        "AdventureWorks"
    ),

    // Navigate to the fact table
    // FOLDS: Maps to FROM dbo.FactInternetSales
    FactSales = Source{[Schema = "dbo", Item = "FactInternetSales"]}[Data],

    // Filter using RangeStart and RangeEnd parameters
    // FOLDS: Translates to WHERE OrderDate >= @RangeStart AND OrderDate < @RangeEnd
    // CRITICAL: This filter MUST fold for incremental refresh to work correctly
    FilteredByRange = Table.SelectRows(
        FactSales,
        each [OrderDate] >= RangeStart and [OrderDate] < RangeEnd
    ),

    // Select relevant columns
    // FOLDS: Translates to SELECT clause
    SelectedColumns = Table.SelectColumns(FilteredByRange, {
        "SalesOrderNumber",
        "OrderDate",
        "ProductKey",
        "CustomerKey",
        "OrderQuantity",
        "UnitPrice",
        "SalesAmount",
        "TaxAmt",
        "Freight",
        "TotalProductCost"
    }),

    // Set explicit column types
    // FOLDS: Type mapping is handled by the SQL connector natively
    TypedTable = Table.TransformColumnTypes(SelectedColumns, {
        {"SalesOrderNumber", type text},
        {"OrderDate", type datetime},
        {"ProductKey", Int64.Type},
        {"CustomerKey", Int64.Type},
        {"OrderQuantity", Int64.Type},
        {"UnitPrice", Currency.Type},
        {"SalesAmount", Currency.Type},
        {"TaxAmt", Currency.Type},
        {"Freight", Currency.Type},
        {"TotalProductCost", Currency.Type}
    })
in
    TypedTable
```

### Step 3: Configure Incremental Refresh in the UI

After publishing the Dataflow Gen2 to a Fabric workspace:

1. Open the Dataflow Gen2 in the workspace.
2. Right-click the query > **Incremental refresh settings**.
3. Configure the refresh window:
   - **Store rows in the last**: `3 Years` -- the total historical window to retain
   - **Refresh rows in the last**: `7 Days` -- only this window is reprocessed on each run
4. Save and apply.

**How it works at runtime**:
- Fabric creates date-range partitions automatically based on the configuration.
- On each dataflow run, only the "Refresh rows in the last 7 days" partition is re-queried from the source. The SQL query includes `WHERE OrderDate >= <7 days ago> AND OrderDate < <now>`.
- The historical 3-year window is frozen and not re-processed, saving compute and reducing source load.
- If data older than 3 years exists, it is dropped from the destination on the next run.

### Step 4: Verify Query Folding

Before enabling incremental refresh, verify that the `RangeStart`/`RangeEnd` filter folds to native SQL:

1. In the Power Query Online editor, right-click the `FilteredByRange` step.
2. Select **View native query**.
3. Confirm the generated SQL includes a `WHERE` clause with the date parameters:

```sql
SELECT [SalesOrderNumber], [OrderDate], ...
FROM [dbo].[FactInternetSales]
WHERE [OrderDate] >= @RangeStart AND [OrderDate] < @RangeEnd
```

If "View native query" is grayed out, folding is broken and incremental refresh will not function correctly.

### Annotations

**Folding requirement**: The `RangeStart`/`RangeEnd` filter MUST fold to native SQL. If the filter uses a calculated date expression in M (for example, `DateTime.LocalNow() - #duration(7,0,0,0)`), it will not fold and the entire table will be scanned on every run, defeating the purpose of incremental refresh.

**Date column type**: The filtered column must be a `datetime` or `date` type in both the source database and the M query. Using a surrogate integer key (like `DateKey = 20240101`) as the filter column requires conversion functions that may break folding.

**Dataflow Gen2 vs. semantic model incremental refresh**: Dataflow Gen2 incremental refresh creates Fabric item partitions and controls which date ranges are re-queried from the source. Semantic model incremental refresh (configured in Power BI Desktop or XMLA) creates dataset partitions and controls which date ranges are re-processed into the VertiPaq model. Both can be used independently or together -- the dataflow handles source-to-Lakehouse incremental load, and the semantic model handles Lakehouse-to-VertiPaq incremental processing.

**Append vs. Replace**: When using incremental refresh with a Lakehouse destination, set the update method to **Append**. The incremental refresh engine handles partition management; using "Replace" would overwrite the entire table and negate the incremental benefit.

**Monitoring**: After enabling incremental refresh, monitor the dataflow run history to verify that only the expected date range is being processed. Check the run duration -- it should be significantly shorter than a full refresh if incremental partitioning is working correctly.
