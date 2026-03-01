# DAX Patterns Reference

Comprehensive DAX function reference with patterns, best practices, and complete code examples for Power BI semantic model development.

## Core Functions

### CALCULATE

The most important DAX function. Evaluates an expression in a modified filter context.

```dax
CALCULATE(
    <expression>,
    <filter1>,
    <filter2>,
    ...
)
```

**Filter arguments** can be:
- Boolean expressions: `Sales[Region] = "West"` (translated to a FILTER behind the scenes)
- Table expressions: `FILTER(ALL(Sales[Region]), Sales[Region] = "West")`
- Filter modifiers: `ALL()`, `ALLEXCEPT()`, `KEEPFILTERS()`, `REMOVEFILTERS()`, `USERELATIONSHIP()`

**Context Transition**: When CALCULATE wraps a row-context expression (inside an iterator), it converts the current row context into an equivalent filter context. This is how measures work inside iterators.

```dax
-- Context transition example
Revenue Per Customer =
AVERAGEX(
    Customer,
    CALCULATE(SUM(Sales[Amount]))  -- row context on Customer becomes filter context
)
```

### FILTER

Returns a filtered copy of a table by evaluating a condition row by row.

```dax
FILTER(<table>, <condition>)
```

**Performance warning**: FILTER materializes the table in memory row by row. Avoid using FILTER on large fact tables when a simple Boolean expression inside CALCULATE would suffice.

```dax
-- AVOID: Slow on large tables
CALCULATE(SUM(Sales[Amount]), FILTER(Sales, Sales[Quantity] > 10))

-- PREFER: Uses storage engine filter
CALCULATE(SUM(Sales[Amount]), Sales[Quantity] > 10)
```

Use FILTER only when you need complex multi-column conditions or need to filter by a measure value.

### ALL / ALLEXCEPT / ALLSELECTED

```dax
ALL(<table_or_column>)           -- Removes ALL filters from table or column
ALLEXCEPT(<table>, <col1>, ...)  -- Removes all filters EXCEPT specified columns
ALLSELECTED(<table_or_column>)   -- Removes filters added by the visual but keeps slicer/page filters
REMOVEFILTERS(<table_or_column>) -- Alias for ALL in filter arguments of CALCULATE
```

### VALUES / DISTINCT / HASONEVALUE

```dax
VALUES(<column>)      -- Distinct values respecting filter context (includes blank if filtered-out rows exist)
DISTINCT(<column>)    -- Distinct values respecting filter context (no extra blank row)
HASONEVALUE(<column>) -- TRUE if exactly one value in filter context
SELECTEDVALUE(<column>, <alternate>) -- Returns the single value if HASONEVALUE, else alternate
```

### RELATED / RELATEDTABLE

```dax
RELATED(<column>)       -- Follows many-to-one relationship (requires row context on many side)
RELATEDTABLE(<table>)   -- Follows one-to-many relationship, returns filtered table
```

## Aggregation Functions

### Simple Aggregators

```dax
SUM(<column>)
AVERAGE(<column>)
COUNT(<column>)         -- Counts non-blank values
COUNTA(<column>)        -- Counts non-blank values (any type)
COUNTBLANK(<column>)    -- Counts blank values
COUNTROWS(<table>)      -- Counts rows in a table
MIN(<column>)
MAX(<column>)
```

### Iterator (X) Aggregators

Iterators evaluate an expression for each row, then aggregate the results.

```dax
SUMX(<table>, <expression>)
AVERAGEX(<table>, <expression>)
COUNTX(<table>, <expression>)
MINX(<table>, <expression>)
MAXX(<table>, <expression>)
```

```dax
-- Line-level calculation then sum
Total Revenue =
SUMX(
    Sales,
    Sales[Quantity] * Sales[UnitPrice]
)
```

### DIVIDE

Safe division that returns an alternate result (default BLANK) on division by zero.

```dax
DIVIDE(<numerator>, <denominator> [, <alternate_result>])
```

Always prefer `DIVIDE()` over the `/` operator to handle division by zero gracefully.

## Time Intelligence Functions

All time intelligence functions require a date table marked as a date table with a contiguous range of dates.

### Year-To-Date / Quarter-To-Date / Month-To-Date

```dax
TOTALYTD(<expression>, <dates_column> [, <filter>] [, <year_end_date>])
TOTALQTD(<expression>, <dates_column> [, <filter>])
TOTALMTD(<expression>, <dates_column> [, <filter>])
DATESYTD(<dates_column> [, <year_end_date>])
DATESQTD(<dates_column>)
DATESMTD(<dates_column>)
```

For fiscal year starting April 1, use `"3/31"` as the year_end_date parameter:

```dax
Revenue YTD (Fiscal) =
TOTALYTD(
    SUM(Sales[Amount]),
    'Date'[Date],
    "3/31"
)
```

### Period Comparison

```dax
SAMEPERIODLASTYEAR(<dates_column>)                       -- Same period shifted back 1 year
DATEADD(<dates_column>, <number>, <interval>)            -- Shift by N DAY/MONTH/QUARTER/YEAR
PARALLELPERIOD(<dates_column>, <number>, <interval>)     -- Full period shifted
PREVIOUSMONTH(<dates_column>)                            -- Full previous month
PREVIOUSQUARTER(<dates_column>)                          -- Full previous quarter
PREVIOUSYEAR(<dates_column>)                             -- Full previous year
NEXTMONTH/NEXTQUARTER/NEXTYEAR(<dates_column>)           -- Full next period
```

```dax
Revenue Prior Year =
CALCULATE(
    SUM(Sales[Amount]),
    SAMEPERIODLASTYEAR('Date'[Date])
)

Revenue 3 Months Ago =
CALCULATE(
    SUM(Sales[Amount]),
    DATEADD('Date'[Date], -3, MONTH)
)
```

### Date Range Functions

```dax
DATESBETWEEN(<dates_column>, <start_date>, <end_date>)
DATESINPERIOD(<dates_column>, <end_date>, <number>, <interval>)
FIRSTDATE(<dates_column>)
LASTDATE(<dates_column>)
```

```dax
-- Rolling 12-month total
Rolling 12M Revenue =
CALCULATE(
    SUM(Sales[Amount]),
    DATESINPERIOD('Date'[Date], MAX('Date'[Date]), -12, MONTH)
)
```

## Table Functions

### SUMMARIZE / SUMMARIZECOLUMNS

```dax
-- SUMMARIZE: Group by columns, optionally add extension columns
SUMMARIZE(<table>, <group_col1>, <group_col2>, ..., <name>, <expression>, ...)

-- SUMMARIZECOLUMNS: Preferred for grouping with measures (more efficient)
SUMMARIZECOLUMNS(
    <group_col1>,
    <group_col2>,
    <filter_table>,
    <name1>, <expression1>,
    <name2>, <expression2>
)
```

**Best practice**: Use `SUMMARIZECOLUMNS` for calculated tables and queries. Use `ADDCOLUMNS(SUMMARIZE(...))` pattern when adding calculated columns to grouped data in measures.

### ADDCOLUMNS / SELECTCOLUMNS

```dax
-- Add calculated columns to a table
ADDCOLUMNS(<table>, <name1>, <expression1>, <name2>, <expression2>, ...)

-- Project specific columns (like SQL SELECT)
SELECTCOLUMNS(<table>, <name1>, <expression1>, ...)
```

### Set Operations

```dax
UNION(<table1>, <table2>, ...)       -- Combine rows (keeps duplicates)
INTERSECT(<table1>, <table2>)        -- Rows in both tables
EXCEPT(<table1>, <table2>)           -- Rows in table1 not in table2
CROSSJOIN(<table1>, <table2>)        -- Cartesian product
```

### GENERATE / GENERATEALL

```dax
GENERATE(<table1>, <table2_expression>)    -- For each row in table1, evaluate table2
GENERATEALL(<table1>, <table2_expression>) -- Same, but keeps rows where table2 is empty
```

## Text Functions

```dax
CONCATENATEX(<table>, <expression>, <delimiter> [, <order_by>])
FORMAT(<value>, <format_string>)
LEFT(<text>, <num_chars>)
RIGHT(<text>, <num_chars>)
MID(<text>, <start>, <num_chars>)
FIND(<find_text>, <within_text> [, <start>] [, <not_found_value>])
SEARCH(<find_text>, <within_text> [, <start>] [, <not_found_value>])  -- case-insensitive
SUBSTITUTE(<text>, <old_text>, <new_text> [, <instance>])
UPPER(<text>), LOWER(<text>), TRIM(<text>), LEN(<text>)
```

```dax
-- Comma-separated list of product names
Product List =
CONCATENATEX(
    VALUES(Products[ProductName]),
    Products[ProductName],
    ", ",
    Products[ProductName], ASC
)
```

## Logical Functions

```dax
IF(<condition>, <true_value> [, <false_value>])
SWITCH(<expression>, <value1>, <result1>, ..., <else_result>)
SWITCH(TRUE(), <condition1>, <result1>, ..., <else_result>)  -- Multi-condition pattern
AND(<cond1>, <cond2>)  -- or use &&
OR(<cond1>, <cond2>)   -- or use ||
NOT(<condition>)
IN                      -- e.g., [Column] IN {"A", "B", "C"}
ISINSCOPE(<column>)     -- TRUE if column is a grouping column in current query
ISBLANK(<value>)
ISEMPTY(<table>)
COALESCE(<value1>, <value2>, ...)  -- First non-blank value
```

```dax
-- SWITCH TRUE pattern for complex conditions
Size Category =
SWITCH(
    TRUE(),
    [Revenue] >= 1000000, "Large",
    [Revenue] >= 100000, "Medium",
    [Revenue] >= 10000, "Small",
    "Micro"
)
```

## Statistical Functions

```dax
PERCENTILE.INC(<column>, <percentile>)   -- Inclusive percentile (0 to 1)
PERCENTILE.EXC(<column>, <percentile>)   -- Exclusive percentile
MEDIAN(<column>)
STDEV.S(<column>)                        -- Sample standard deviation
STDEV.P(<column>)                        -- Population standard deviation
VAR.S(<column>)                          -- Sample variance
VAR.P(<column>)                          -- Population variance
RANKX(<table>, <expression> [, <value>] [, <order>] [, <ties>])
NORM.DIST, NORM.INV, BETA.DIST, etc.    -- Distribution functions
```

```dax
-- RANKX with ALLSELECTED to respect slicer but rank within visible data
Product Rank =
RANKX(
    ALLSELECTED(Products[ProductName]),
    [Total Revenue],
    ,
    DESC,
    Dense
)
```

## KPI Patterns

### Year-over-Year Growth

```dax
-- Measure: YoY Growth %
-- Description: Percentage change from same period last year
-- Dependencies: Sales[Amount], 'Date'[Date]
YoY Growth % =
VAR _currentPeriod = SUM(Sales[Amount])
VAR _priorYear =
    CALCULATE(
        SUM(Sales[Amount]),
        SAMEPERIODLASTYEAR('Date'[Date])
    )
RETURN
    DIVIDE(_currentPeriod - _priorYear, _priorYear)
```

### Rolling Average

```dax
-- Measure: Rolling 3-Month Average
-- Description: Average of the last 3 complete months
-- Dependencies: Sales[Amount], 'Date'[Date]
Rolling 3M Avg =
CALCULATE(
    AVERAGEX(
        VALUES('Date'[YearMonth]),
        CALCULATE(SUM(Sales[Amount]))
    ),
    DATESINPERIOD('Date'[Date], MAX('Date'[Date]), -3, MONTH)
)
```

### Running Total

```dax
-- Measure: Running Total
-- Description: Cumulative total from start of data to current date
-- Dependencies: Sales[Amount], 'Date'[Date]
Running Total =
CALCULATE(
    SUM(Sales[Amount]),
    FILTER(
        ALL('Date'[Date]),
        'Date'[Date] <= MAX('Date'[Date])
    )
)
```

### Percent of Grand Total

```dax
-- Measure: % of Total
-- Description: Current selection as percentage of grand total
-- Dependencies: Sales[Amount]
% of Total =
DIVIDE(
    SUM(Sales[Amount]),
    CALCULATE(SUM(Sales[Amount]), ALL(Sales))
)
```

### ABC Analysis

```dax
-- Measure: ABC Classification
-- Description: Classifies items into A (top 70%), B (next 20%), C (bottom 10%) by revenue
-- Dependencies: [Total Revenue], Products[ProductName]
ABC Class =
VAR _totalRevenue =
    CALCULATE([Total Revenue], ALL(Products[ProductName]))
VAR _rank =
    RANKX(ALL(Products[ProductName]), [Total Revenue], , DESC, Dense)
VAR _runningPct =
    DIVIDE(
        SUMX(
            FILTER(
                ALL(Products[ProductName]),
                RANKX(ALL(Products[ProductName]), [Total Revenue], , DESC, Dense) <= _rank
            ),
            [Total Revenue]
        ),
        _totalRevenue
    )
RETURN
    SWITCH(
        TRUE(),
        _runningPct <= 0.7, "A",
        _runningPct <= 0.9, "B",
        "C"
    )
```

## Best Practices

### Use Variables (VAR/RETURN)

Variables improve readability, prevent repeated evaluation, and make debugging easier. A VAR is evaluated once in the filter context where it is defined.

```dax
-- Good: Using variables
Profit Margin =
VAR _revenue = SUM(Sales[Revenue])
VAR _cost = SUM(Sales[Cost])
VAR _profit = _revenue - _cost
RETURN
    DIVIDE(_profit, _revenue)
```

### Avoid Calculated Columns When Measures Work

Calculated columns consume memory and are computed during refresh. Prefer measures for dynamic calculations. Use calculated columns only when:
- You need to use the value in a slicer, filter, or relationship
- The value depends on row context that cannot be replicated in a measure
- You need to sort by the calculated value

### Prefer Boolean Filters Over FILTER in CALCULATE

```dax
-- Prefer this (uses storage engine):
CALCULATE(SUM(Sales[Amount]), Sales[Region] = "West")

-- Over this (materializes table):
CALCULATE(SUM(Sales[Amount]), FILTER(Sales, Sales[Region] = "West"))
```

### Use KEEPFILTERS When Adding Filters

By default, filter arguments in CALCULATE override existing filters on the same column. Use KEEPFILTERS to intersect with existing filters instead.

```dax
-- Without KEEPFILTERS: Overrides any slicer on Category
CALCULATE(SUM(Sales[Amount]), Products[Category] = "Electronics")

-- With KEEPFILTERS: Intersects with slicer (returns blank if slicer excludes Electronics)
CALCULATE(SUM(Sales[Amount]), KEEPFILTERS(Products[Category] = "Electronics"))
```

### Avoid Circular Dependencies

Measures should not reference calculated columns that reference other measures. Keep the dependency chain clean: Power Query M (source) -> Calculated Columns (if needed) -> Measures.

### Format Strings

Use `FORMAT` sparingly in measures (returns text, not numbers). Instead, apply formatting in the model metadata (format string property on measures) so that numbers remain sortable and aggregatable.

### Date Table Requirements

For time intelligence to work:
1. The date table must have a contiguous range of dates (no gaps)
2. The date column must be of Date or DateTime type
3. Mark the table as a date table in the model (or create a relationship to the date column)
4. The date table should cover the full range of fact table dates

### Common Format Strings

| Format | Example Output | Use For |
|--------|---------------|---------|
| `\$#,0.00;(\$#,0.00);\$#,0.00` | $1,234.56 | Currency |
| `#,0` | 1,234 | Integer counts |
| `#,0.00` | 1,234.56 | Decimal numbers |
| `0.0%` | 45.6% | Percentages |
| `0.00%` | 45.67% | Precise percentages |
| `#,0.0` | 1,234.5 | One decimal |

## Advanced Patterns

### Dynamic Measure Selection

Use SWITCH with a disconnected slicer table to let users choose which measure to display.

```dax
-- Measure: Selected Metric
-- Description: Dynamically switches between metrics based on slicer selection
-- Dependencies: 'Metric Selector'[Metric], [Total Revenue], [Total Quantity], [Order Count]
Selected Metric =
VAR _selectedMetric = SELECTEDVALUE('Metric Selector'[Metric], "Revenue")
RETURN
    SWITCH(
        _selectedMetric,
        "Revenue", [Total Revenue],
        "Quantity", [Total Quantity],
        "Orders", [Order Count],
        "Avg Order Value", [Avg Order Value],
        [Total Revenue]
    )
```

### Semi-Additive Measures (Snapshots/Balances)

For measures like inventory levels or account balances that should not be summed across time.

```dax
-- Measure: Ending Balance
-- Description: Returns the balance as of the last date in the current filter context.
--              Uses LASTDATE to get snapshot value rather than summing across dates.
-- Dependencies: Balances[Amount], 'Date'[Date]
Ending Balance =
CALCULATE(
    SUM(Balances[Amount]),
    LASTDATE('Date'[Date])
)
```

```dax
-- Measure: Average Daily Balance
-- Description: Average balance across all dates in the filter context.
-- Dependencies: Balances[Amount], 'Date'[Date]
Average Daily Balance =
AVERAGEX(
    VALUES('Date'[Date]),
    CALCULATE(SUM(Balances[Amount]))
)
```

### Many-to-Many Relationships

When a direct relationship does not exist (e.g., customers to products through a bridge table).

```dax
-- Measure: Revenue via Bridge
-- Description: Calculates revenue through a many-to-many bridge table.
-- Dependencies: Sales[Amount], Bridge[CustomerId], Bridge[ProductGroupId]
Revenue via Bridge =
CALCULATE(
    SUM(Sales[Amount]),
    TREATAS(
        VALUES(ProductGroups[ProductGroupId]),
        Bridge[ProductGroupId]
    )
)
```

### Disconnected Slicer Pattern

Use a calculated table (disconnected from the model) to drive measure behavior.

```dax
-- Create the slicer table (calculated table)
Top N Values = GENERATESERIES(1, 50, 1)

-- Measure using the disconnected slicer
Show Top N =
VAR _topN = SELECTEDVALUE('Top N Values'[Value], 10)
VAR _currentRank =
    RANKX(
        ALLSELECTED(Products[ProductName]),
        [Total Revenue],
        ,
        DESC,
        Dense
    )
RETURN
    IF(_currentRank <= _topN, [Total Revenue])
```

### Parent-Child Hierarchy Flattening

For organizational hierarchies (e.g., manager-employee trees).

```dax
-- Use PATH functions to flatten parent-child hierarchy
Employee Path = PATH(Employee[EmployeeId], Employee[ManagerId])
Level 1 = LOOKUPVALUE(
    Employee[EmployeeName],
    Employee[EmployeeId],
    INT(PATHITEM(Employee[Employee Path], 1))
)
Level 2 = LOOKUPVALUE(
    Employee[EmployeeName],
    Employee[EmployeeId],
    INT(PATHITEM(Employee[Employee Path], 2))
)
Depth = PATHLENGTH(Employee[Employee Path])
```

### Performance Optimization Checklist

1. **Use variables**: Evaluate complex expressions once with VAR; reference with RETURN.
2. **Minimize iterator nesting**: SUMX inside SUMX creates O(n*m) complexity.
3. **Use SUMMARIZECOLUMNS over SUMMARIZE**: More efficient query plan.
4. **Avoid FILTER on large tables**: Prefer Boolean expressions in CALCULATE arguments.
5. **Pre-aggregate where possible**: If a calculation is always over the same grain, consider a calculated table.
6. **Test with DAX Studio**: Use Server Timings to identify Formula Engine (FE) vs Storage Engine (SE) bottlenecks.
7. **Reduce cardinality**: Fewer distinct values in a column means less memory and faster queries.
8. **Use REMOVEFILTERS instead of ALL in CALCULATE**: More explicit about intent; same behavior as ALL when used in filter arguments.
9. **Avoid EARLIER**: This legacy function is confusing. Use VAR to capture values in an outer context.
10. **Batch related measures**: Group measures that share the same base calculation using variables in a single measure, or factor out shared logic into intermediate measures.

## Information Functions

```dax
ISBLANK(<value>)                    -- TRUE if blank/null
ISERROR(<value>)                    -- TRUE if any error
ISLOGICAL(<value>)                  -- TRUE if boolean
ISNUMBER(<value>)                   -- TRUE if numeric
ISTEXT(<value>)                     -- TRUE if text
ISEMPTY(<table>)                    -- TRUE if table has no rows
ISFILTERED(<column>)                -- TRUE if column has direct filters
ISCROSSFILTERED(<column>)           -- TRUE if column has direct or cross-filters
ISINSCOPE(<column>)                 -- TRUE if column is grouped in current query
HASONEVALUE(<column>)               -- TRUE if exactly one value in filter context
HASONEFILTER(<column>)              -- TRUE if exactly one direct filter
SELECTEDVALUE(<column>, <alt>)      -- Single value or alternate if multiple
USERCULTURE()                       -- Returns the user's locale string
USERNAME()                          -- Returns the user identity (for RLS)
USERPRINCIPALNAME()                 -- Returns the UPN (email) of the current user
CUSTOMDATA()                        -- Returns the custom data string from embed token
```

## Conversion Functions

```dax
INT(<value>)                        -- Convert to integer
CURRENCY(<value>)                   -- Convert to currency (fixed decimal)
VALUE(<text>)                       -- Convert text to number
DATEVALUE(<text>)                   -- Convert text to date
TIMEVALUE(<text>)                   -- Convert text to time
FIXED(<number>, <decimals>)         -- Number to text with fixed decimals
TEXT(<value>, <format>)             -- Value to formatted text
CONVERT(<value>, <type>)            -- Convert between data types
```

## Date and Time Functions (Non-Intelligence)

```dax
DATE(<year>, <month>, <day>)        -- Create a date
TIME(<hour>, <minute>, <second>)    -- Create a time
NOW()                               -- Current datetime
TODAY()                             -- Current date
YEAR(<date>), MONTH(<date>), DAY(<date>)  -- Extract parts
HOUR(<datetime>), MINUTE(<datetime>), SECOND(<datetime>)
WEEKNUM(<date> [, <return_type>])   -- Week number of the year
WEEKDAY(<date> [, <return_type>])   -- Day of the week (1-7)
EOMONTH(<start_date>, <months>)     -- End of month, offset by N months
EDATE(<start_date>, <months>)       -- Date offset by N months
DATEDIFF(<start>, <end>, <interval>) -- Difference in days/months/years
CALENDAR(<start_date>, <end_date>)  -- Generate date table
CALENDARAUTO([<fiscal_year_end>])   -- Auto-generate date table from model dates
```

## Error Handling in DAX

```dax
IFERROR(<expression>, <alternate>)  -- If expression errors, return alternate
-- Example: safely handle division with potential errors
Safe Ratio =
IFERROR(
    DIVIDE([Metric A], [Metric B]),
    0
)
```

Note: `IFERROR` catches ALL errors, which can mask bugs. Prefer `DIVIDE` for division-by-zero and validate inputs with `ISBLANK` for other cases.

## TREATAS (Virtual Relationship)

`TREATAS` applies the values of one column as a filter on another column, even without a physical relationship. Useful for applying filters across tables that are not directly related.

```dax
-- Measure: Filtered by External Table
-- Description: Apply a filter from DisconnectedTable to Sales via TREATAS
Filtered Revenue =
CALCULATE(
    SUM(Sales[Amount]),
    TREATAS(
        VALUES(DisconnectedTable[ProductId]),
        Products[ProductId]
    )
)
```

## USERELATIONSHIP

Activates an inactive relationship for a specific calculation. Only one relationship between two tables can be active at a time; `USERELATIONSHIP` lets you use the inactive one in a measure.

```dax
-- Measure: Revenue by Ship Date
-- Description: Uses the inactive relationship between Sales[ShipDate] and Date[Date]
--              instead of the active Sales[OrderDate] relationship
Revenue by Ship Date =
CALCULATE(
    SUM(Sales[Amount]),
    USERELATIONSHIP(Sales[ShipDate], 'Date'[Date])
)
```

## SELECTEDVALUE and Dynamic Formatting

```dax
-- Dynamic format string using SELECTEDVALUE
-- Set as the Format String expression on a measure in the model properties
Format String Expression =
SWITCH(
    SELECTEDVALUE('Metric Selector'[Metric]),
    "Revenue", "$#,0.00",
    "Quantity", "#,0",
    "Growth", "0.0%",
    "#,0.00"
)
```

## Calculation Groups

Calculation groups (available in models with compatibility level 1600+) allow defining a set of calculation items that modify how measures are evaluated. Common use cases: time intelligence variations (YTD, MoM, YoY) applied to any measure without creating separate measures.

```dax
-- Calculation item: YTD
-- Applies TOTALYTD to any measure placed in a visual
TOTALYTD(SELECTEDMEASURE(), 'Date'[Date])

-- Calculation item: Prior Year
CALCULATE(SELECTEDMEASURE(), SAMEPERIODLASTYEAR('Date'[Date]))

-- Calculation item: YoY Change %
VAR _current = SELECTEDMEASURE()
VAR _prior = CALCULATE(SELECTEDMEASURE(), SAMEPERIODLASTYEAR('Date'[Date]))
RETURN DIVIDE(_current - _prior, _prior)
```

Calculation groups are defined in the model metadata (TMDL or model.bim), not as regular measures.
