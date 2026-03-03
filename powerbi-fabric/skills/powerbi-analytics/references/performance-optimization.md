# Performance Optimization Reference

Comprehensive guide to diagnosing and resolving Power BI and Microsoft Fabric semantic model performance issues, covering VertiPaq internals, DAX engine mechanics, storage modes, incremental refresh, Direct Lake, and report-level optimization.

## VertiPaq Fundamentals

Power BI semantic models use the VertiPaq in-memory columnar engine. Understanding how VertiPaq stores and compresses data is the foundation of every optimization decision.

### Columnar Storage

VertiPaq stores each column independently, not row by row. This means a query that touches three columns out of fifty only reads those three columns from memory. Each column is compressed using two techniques in sequence:

1. **Dictionary encoding** — every unique value in the column is stored exactly once in a dictionary. The actual column data stores integer pointers (indexes) into that dictionary rather than the raw values. For a column with 10 million rows but only 500 unique values, the dictionary holds 500 entries and the column holds 10 million small integers.
2. **Run-length encoding (RLE)** — after dictionary encoding, consecutive identical pointer values are compressed into (value, count) pairs. A column sorted by its values compresses dramatically because identical pointers cluster together.

### Cardinality Is the Enemy

Cardinality — the number of unique values in a column — is the single biggest driver of memory consumption. High-cardinality columns resist compression:

- **GUIDs / uniqueidentifiers**: every value is unique, so the dictionary is as large as the column itself and RLE provides zero benefit.
- **Timestamps with seconds or milliseconds**: `2024-03-15 09:14:23` has far more unique values than `2024-03-15`. Truncate to date or hour granularity where possible.
- **Free-text columns**: descriptions, comments, and notes have near-unique values. Store these in a separate table or remove them from the model entirely.

Low-cardinality columns (Boolean flags, status codes, country names) compress to near-zero because the dictionary is tiny and RLE collapses long runs of identical values.

### Using DAX Studio VertiPaq Analyzer

DAX Studio provides a VertiPaq Analyzer view that shows exactly how much memory each table and column consumes:

1. Connect DAX Studio to the semantic model (local or remote).
2. Click **VertiPaq Analyzer** in the Advanced menu.
3. Sort by **Table Size MB** to find the largest tables.
4. Expand a table and sort columns by **Column Size KB**.
5. Focus on columns where **Dictionary Size KB** is large relative to **Data Size KB** — this indicates high cardinality that resists compression.

Columns that appear large but are never used in visuals, filters, or relationships are candidates for removal at the source.

### Surrogate Integer Keys

String-based relationship keys (e.g., ProductCode `"ABC-123-XL"`, CustomerID `"CUST-00042"`) consume far more memory than integer keys because each unique string value occupies bytes proportional to its length in the dictionary, and string comparisons during joins are slower than integer comparisons.

Replace string keys with integer surrogate keys in the ETL layer:

- Create an integer sequence column in the dimension table.
- Map the fact table foreign key to the same integer.
- Remove the original string key column from the model (or hide it if needed for display).

This change alone can cut dictionary size by 60-80% on key columns and measurably speed up cross-table filtering.

## Storage Engine vs Formula Engine

The VertiPaq query engine has two components that work together to evaluate every DAX query:

### Storage Engine (SE)

The Storage Engine is multi-threaded and cache-friendly. It handles:

- Simple aggregations: `SUM`, `COUNT`, `MIN`, `MAX`, `DISTINCTCOUNT`
- Column filters: equality, range, and IN-list predicates
- Group-by operations on low-to-moderate cardinality columns

SE queries run in parallel across CPU cores and results are cached. A query answered entirely by the SE is fast.

### Formula Engine (FE)

The Formula Engine is **single-threaded**. It orchestrates complex logic that the SE cannot handle:

- Row-by-row iterator evaluation
- Conditional branching within iterators
- Context transitions inside nested loops
- Cross-table calculations that require intermediate materialization

When the FE takes over, it becomes the bottleneck because it processes rows sequentially on a single core.

### Patterns That Stay in SE

These patterns generate SE-only queries and are fast:

```dax
-- Simple aggregation
SUM(Sales[Amount])

-- CALCULATE with Boolean filter arguments
CALCULATE(SUM(Sales[Amount]), Product[Color] = "Red")

-- CALCULATE with table filter on dimension
CALCULATE(SUM(Sales[Amount]), FILTER(ALL(Product[Color]), Product[Color] = "Red"))
```

Boolean filter arguments inside CALCULATE are translated by the engine into efficient SE predicates.

### Patterns That Spill to FE

These patterns force the Formula Engine to iterate row by row:

```dax
-- FILTER on a fact table with a computed condition
FILTER(FactSales, [Margin%] > 0.2)

-- SUMX with nested FILTER on a fact table
SUMX(FILTER(FactSales, FactSales[Discount] > 0), FactSales[Amount] * FactSales[Quantity])

-- Nested iterators
SUMX(Product, SUMX(RELATEDTABLE(Sales), Sales[Amount] * Product[Markup]))

-- CROSSJOIN materializing large tables
CROSSJOIN(VALUES(Date[Year]), VALUES(Product[Category]))
```

### Reading Server Timings in DAX Studio

To diagnose whether a query is SE-bound or FE-bound:

1. Open DAX Studio and connect to the model.
2. Write or paste the DAX query.
3. Click the **Server Timings** tab at the bottom before executing.
4. Run the query.
5. Examine the results:
   - **SE Duration**: time spent in the Storage Engine (parallel, fast).
   - **FE Duration**: time spent in the Formula Engine (single-threaded, slow).
   - If FE Duration dominates total duration, the measure has expensive row-level logic that needs rewriting.

### The Rewrite Rule

Replace `FILTER` on fact tables with Boolean arguments in `CALCULATE` wherever possible:

```dax
-- SLOW: FILTER materializes FactSales row by row in FE
CALCULATE(
    SUM(FactSales[Amount]),
    FILTER(FactSales, FactSales[Amount] > 1000)
)

-- FAST: Boolean predicate stays in SE
CALCULATE(
    SUM(FactSales[Amount]),
    FactSales[Amount] > 1000
)
```

This transformation keeps the filter predicate inside the Storage Engine where it executes in parallel.

## User-Defined Aggregations

User-defined aggregations let you pre-aggregate fact table data at a coarser grain so that common queries never touch the detail rows.

### Purpose

When 80% of queries hit a report at month/product grain but the fact table has hundreds of millions of rows at transaction grain, an aggregation table stores pre-computed totals at the coarser grain. Queries at that grain are answered in milliseconds from the small aggregation table; only drill-through to individual transactions hits the detail table.

### Pattern

The standard setup uses an Import-mode aggregation table sitting over a DirectQuery detail fact table:

1. Create a table in Import mode with the aggregated grain (e.g., `Sales_Agg` with columns `MonthKey`, `ProductKey`, `SumAmount`, `RowCount`).
2. Keep the detail fact table (`FactSales`) in DirectQuery mode.
3. In Power BI Desktop, right-click the aggregation table → **Manage Aggregations**.
4. Map each agg column to its detail table counterpart and set the summarization function (`Sum`, `Count Rows`, `Min`, `Max`, `GroupBy`).
5. Hide the aggregation table from report view — the engine routes queries automatically.

### When This Beats Direct Lake

User-defined aggregations are valuable when:

- The fact table exceeds 100 million rows.
- The majority of queries (80%+) operate at a summarized grain (month, week, product category).
- The agg table is small enough to refresh quickly on a schedule.

In a Direct Lake model, the engine reads Parquet files directly and VertiPaq handles compression, so aggregation tables are less commonly needed. But when fact tables are very large and capacity memory is limited, an aggregation table at a coarser grain can prevent Direct Lake fallback by reducing the data volume that needs to be framed into memory.

### Limitations

- The aggregation table must be in Import mode — it requires scheduled refresh.
- It gets stale between refreshes, so near-real-time scenarios need short refresh intervals.
- Aggregation routing only works for queries that match the aggregation grain exactly — partial matches fall through to the detail table.
- Only worthwhile when query patterns clearly justify the maintenance cost.

## Composite Models

Composite models mix Import and DirectQuery storage modes in a single semantic model, giving you the speed of VertiPaq for dimension tables and real-time access for fact tables.

### Mixing Import and DirectQuery

A typical composite model configuration:

- **Dimension tables** (Product, Customer, Date): Import mode — fast, compressed in VertiPaq, refreshed on a schedule.
- **Fact tables** (Sales, Transactions): DirectQuery mode — queries go to the source in real time; no scheduled refresh needed.

### Dual Mode Dimensions

Set a dimension table's storage mode to **Dual** so it can participate in both Import and DirectQuery relationship paths. The engine automatically chooses the most efficient path:

- When the query involves only Import tables, Dual tables behave as Import.
- When the query involves a DirectQuery fact table, Dual tables behave as DirectQuery to avoid a cross-source join.

### Relationship Limitations

Import-to-DirectQuery relationships have restrictions:

- Only **single-direction** cross-filtering is supported. Bidirectional cross-filtering on a relationship where one side is DirectQuery is not allowed.
- If you need the effect of bidirectional filtering, use explicit `CROSSFILTER()` in DAX measures instead of setting the relationship to bidirectional.

### Bidirectional Filter Cost

Each bidirectional relationship doubles the number of filter propagation paths the SE/FE must evaluate. Even in pure Import models, bidirectional relationships increase query complexity. Use them sparingly and prefer explicit `CROSSFILTER()` in DAX for cases where bidirectional filtering is needed only in specific measures.

### Diagnosing Composite Model Slowness

If a composite model is slow:

1. Check if a Dual-mode dimension is generating extra DirectQuery round-trips (visible in Server Timings as multiple SE queries to the external source).
2. Verify that the DirectQuery source supports the filter predicates being pushed down.
3. Consider switching frequently queried DirectQuery tables to Import if real-time data is not required.

## Incremental Refresh

Incremental refresh partitions a dataset by date range so that only recent data is refreshed, while historical partitions remain frozen.

### RangeStart and RangeEnd Parameters

Create exactly two DateTime parameters in Power Query named `RangeStart` and `RangeEnd`. Power BI uses these to define partition boundaries. The names must match exactly (case-sensitive).

### Power Query M Pattern

The filter must reference the date column with `>=` for RangeStart and `<` for RangeEnd:

```m
let
    Source = Sql.Database("server", "db"),
    FilteredRows = Table.SelectRows(Source, each
        [OrderDate] >= RangeStart and [OrderDate] < RangeEnd)
in
    FilteredRows
```

The filter on the datetime column **must fold to SQL**. Verify this by right-clicking the step in Power Query and selecting **View Native Query**. If the option is grayed out, the filter is not folding and incremental refresh will not work correctly.

### Rolling Window Configuration

In the dataset settings under **Incremental refresh policy**:

- **Store rows in the last N years/months/days**: defines the total retention window. Historical partitions outside this window are dropped.
- **Refresh rows in the last N days**: defines the recent window that gets refreshed every cycle. Only these partitions are processed.

Historical partitions (outside the refresh window) are frozen after initial processing. This dramatically reduces refresh time and API cost for large datasets.

### Detect Data Changes

An optional optimization: set a watermark column (e.g., `MAX(LastModifiedDate)`) so Power BI checks the watermark before processing each partition. If the watermark has not changed since the last refresh, that partition is skipped entirely. This reduces refresh cost for slowly changing historical data.

### Partition Management

Incremental refresh automatically creates date-range partitions. Each partition maps to a separate Analysis Services partition internally. Important rules:

- Do not manually edit partitions created by incremental refresh — this breaks the policy.
- Ensure the Power Query filter is foldable — a non-foldable filter prevents correct partitioning.
- The date column used for partitioning should be a proper `DateTime` or `Date` type, not a string.

## Direct Lake and Fallback

Direct Lake is a Fabric-native storage mode where the semantic model reads Delta/Parquet column files directly from OneLake into VertiPaq memory — a process called **framing**. There is no ETL, no scheduled import refresh, and no data copy.

### How Direct Lake Works

1. Spark or Data Factory writes data to a lakehouse table (Delta format with Parquet files).
2. The semantic model is configured with `mode: directLake` pointing to the lakehouse table.
3. When a query arrives, the engine frames the required Parquet column chunks directly into VertiPaq memory.
4. Subsequent queries hit the in-memory VertiPaq cache until the Delta table changes and reframing is needed.

### Why Fallback Occurs

Direct Lake falls back to DirectQuery (which is significantly slower) in these scenarios:

1. **Capacity memory pressure**: the model's total size exceeds the available RAM on the Fabric F-capacity SKU for framing. The engine cannot load all required columns into memory and falls back to querying the data source directly.
2. **Unsupported column types**: columns with `uniqueidentifier` (GUID), `binary`, or complex nested types cannot be framed into VertiPaq. Any table containing such columns triggers fallback for queries touching that table.
3. **Schema mismatch**: if the Delta table schema changes after the semantic model was created (column renamed, type changed, column removed), the framing operation fails and the engine falls back.
4. **Concurrent Spark writes during framing**: if a Spark job is actively writing to the Delta table while Power BI attempts to frame it, the engine may encounter an inconsistent state and fall back.

### Detecting Fallback

Open the **Fabric Capacity Metrics** app:

1. Navigate to **Timepoint Explorer**.
2. Filter for your semantic model.
3. Look for **DirectQuery** operations on a model that should be Direct Lake — this indicates fallback is occurring.

Alternatively, use DAX Studio Server Timings: a Direct Lake model in fallback shows SE queries going to a DirectQuery source rather than the VertiPaq cache.

### V-Order Optimization

V-Order is a write-time optimization applied to Delta Parquet files that pre-sorts and compresses data in a layout optimized for VertiPaq loading:

- Enabled by default in Fabric Spark notebooks.
- Verify with: `spark.conf.get("spark.sql.parquet.vorder.enabled")` — should return `true`.
- V-Order does not change the logical data; it reorganizes the physical byte layout for faster framing.

### OPTIMIZE and ZORDER

Before the next framing cycle, run `OPTIMIZE` with `ZORDER BY` in a Fabric notebook to compact small files and co-locate frequently filtered columns:

```sql
OPTIMIZE tableName ZORDER BY (DateKey, ProductKey)
```

This operation:

- Merges small Parquet files into larger, optimally sized files (reduces file-open overhead during framing).
- Co-locates rows with similar `DateKey` and `ProductKey` values, improving predicate pushdown and VertiPaq segment elimination.
- Should be run as a scheduled maintenance step (e.g., nightly after data loads complete).

### Schema Drift Fix

If a Direct Lake model shows errors after a Spark `ALTER TABLE` operation:

1. Open the semantic model in the Fabric portal.
2. Refresh the schema (the model will re-read the Delta table metadata).
3. If schema refresh fails, re-create the semantic model from the updated lakehouse table definition.

Prevent schema drift by treating the lakehouse table schema as an immutable contract: add new columns rather than renaming existing ones, and coordinate schema changes with the semantic model team.

## Model Size Reduction Checklist

Practical steps to reduce the memory footprint of a semantic model, ordered by typical impact.

### Disable Auto Date/Time Tables

In Power BI Desktop: **File → Options → Data Load → uncheck "Auto date/time"**.

When enabled, Power BI creates a hidden DateTime hierarchy table for every date column in the model. A model with 20 date columns gets 20 hidden tables, each with Year, Quarter, Month, Day columns. This silently multiplies model size. Disable it and create a single explicit Date dimension table instead.

### Remove Truly Unused Columns

Columns that are not used in any visual, measure, relationship, or RLS expression should be removed at the Power Query source level. Hidden columns still consume memory — hiding only affects the user interface, not storage. Audit column usage with VertiPaq Analyzer: if a column has zero references in DAX expressions and is not part of a relationship, it is a removal candidate.

### Set `summarizeBy: none` on Non-Aggregatable Columns

Columns that contain codes, IDs, names, or categorical text should have `summarizeBy: none` set in the model properties. This prevents Power BI from offering meaningless SUM or AVERAGE operations on these columns in visuals, reducing user confusion and accidental expensive queries.

### Use Integer Surrogate Keys

Replace string-based foreign key and primary key columns (ProductCode, CustomerID as text, OrderNumber) with integer surrogate keys. Integer keys consume 4 bytes per row versus 10-50+ bytes for strings, and integer comparisons in joins are faster than string comparisons. This is the single highest-impact change for most models.

### Replace Calculated Columns with Measures

Calculated columns are computed during refresh and stored physically in VertiPaq memory — they occupy space for every row. If the same logic can be expressed as a measure (computed on-demand at query time), the measure uses zero storage. Convert calculated columns to measures unless the value is needed for:

- Sorting another column
- Participating in a relationship
- Being used in a row-level security expression
- Requiring row context that cannot be replicated in a measure

## Report-Level Optimization

Even a perfectly tuned semantic model can deliver poor performance if the report design generates excessive queries.

### Visual Count and Query Fan-Out

Each visual on a Power BI report page generates one or more DAX queries when the page loads. All visuals on the page fire their queries simultaneously. A page with 25 visuals generates 25+ concurrent DAX queries, and the semantic model must answer all of them before the page feels responsive.

Reduce visual count to reduce query fan-out:

- Aim for 8-12 visuals per page maximum.
- Consolidate related metrics into a single matrix or table visual instead of multiple card visuals.
- Use drill-through pages for detail rather than displaying everything on one page.

### Using Performance Analyzer

In Power BI Desktop: **View → Performance Analyzer → Start Recording**.

Interact with the report (change a slicer, navigate to a page). Expand each visual in the Performance Analyzer pane to see:

- **DAX query time**: time the semantic model spent answering the query. High values indicate slow measures or model issues.
- **Visual display time**: time the visual took to render after receiving data. High values indicate too many data points or complex formatting.
- **Other time**: overhead from evaluation, security, and connection setup.

Focus optimization effort on visuals with the highest DAX query time.

### Bookmark Patterns Instead of Extra Pages

Use bookmarks to show/hide groups of visuals on a single page instead of creating multiple report pages. This reduces navigation overhead and avoids full page-load query bursts when users switch between views. Each bookmark state shows only the relevant visuals, keeping active query count low.

### Avoid Expensive Card Visuals

Card visuals displaying `DISTINCTCOUNT` measures on high-cardinality columns (e.g., distinct customer count across millions of rows) are expensive and block page render because they cannot be answered from VertiPaq aggregation caches. If such cards are necessary, consider pre-computing the value in a measure variable or using a calculated table at a summarized grain.

### Tooltip Page Best Practices

Tooltip report pages load on hover, meaning every mouse movement over a data point can trigger queries. Keep tooltip pages minimal:

- Use 1-2 visuals maximum on a tooltip page.
- Avoid measures with complex iterators on tooltip pages.
- Use simple aggregations (SUM, AVERAGE) rather than DISTINCTCOUNT or RANKX on tooltip visuals.
