# DAX Measures — Time Intelligence, Aggregations, CALCULATE Patterns

This reference provides production-ready DAX patterns for Microsoft Fabric Semantic Models. Covers time intelligence, CALCULATE filter manipulation, semi-additive measures, calculation groups, dynamic formatting, and common performance pitfalls.

---

## Time Intelligence Patterns

### Prerequisites

Time intelligence functions require a properly configured date table:
- Continuous date range (no gaps).
- Marked as a date table: **Table tools > Mark as date table > Select Date column**.
- Date column is of `Date` data type (not `DateTime`).
- Range covers all dates in fact tables (typically start of data to 2-3 years in the future).

### Standard Time Intelligence Measures

```dax
// Year-to-Date
Sales YTD =
TOTALYTD([Total Sales], 'Date'[Date])

// Year-to-Date with custom fiscal year end (June 30)
Sales Fiscal YTD =
TOTALYTD([Total Sales], 'Date'[Date], "06/30")

// Month-to-Date
Sales MTD = TOTALMTD([Total Sales], 'Date'[Date])

// Quarter-to-Date
Sales QTD = TOTALQTD([Total Sales], 'Date'[Date])

// Prior Year (same period)
Sales PY =
CALCULATE([Total Sales], SAMEPERIODLASTYEAR('Date'[Date]))

// Prior Quarter
Sales PQ =
CALCULATE([Total Sales], DATEADD('Date'[Date], -1, QUARTER))

// Prior Month
Sales PM =
CALCULATE([Total Sales], DATEADD('Date'[Date], -1, MONTH))

// Year-over-Year change (absolute)
Sales YoY Change =
VAR CurrentPeriod = [Total Sales]
VAR PriorYear = [Sales PY]
RETURN CurrentPeriod - PriorYear

// Year-over-Year change (percentage)
Sales YoY % =
VAR CurrentPeriod = [Total Sales]
VAR PriorYear = [Sales PY]
RETURN
DIVIDE(CurrentPeriod - PriorYear, PriorYear)

// Rolling 3-month total
Sales R3M =
CALCULATE(
    [Total Sales],
    DATESINPERIOD('Date'[Date], LASTDATE('Date'[Date]), -3, MONTH)
)

// Rolling 12-month total
Sales R12M =
CALCULATE(
    [Total Sales],
    DATESINPERIOD('Date'[Date], LASTDATE('Date'[Date]), -12, MONTH)
)
```

### DATESYTD vs TOTALYTD

```dax
// These are equivalent — TOTALYTD is shorthand:
Sales YTD (long form) =
CALCULATE(
    [Total Sales],
    DATESYTD('Date'[Date])
)

Sales YTD (shorthand) =
TOTALYTD([Total Sales], 'Date'[Date])

// Use the long form when you need to layer additional CALCULATE filters:
Sales YTD Completed Orders =
CALCULATE(
    [Total Sales],
    DATESYTD('Date'[Date]),
    Orders[Status] = "Completed"
)
```

### Parallel Period Patterns

```dax
// This day last year
Sales Same Day LY =
CALCULATE(
    [Total Sales],
    PARALLELPERIOD('Date'[Date], -1, YEAR)
)

// This week last year
Sales Same Week LY =
CALCULATE(
    [Total Sales],
    DATEADD('Date'[Date], -52, WEEK)
)

// Moving average — 4-week (removes day-of-week seasonality)
Sales 4W Avg =
AVERAGEX(
    DATESINPERIOD('Date'[Date], LASTDATE('Date'[Date]), -28, DAY),
    [Total Sales]
)
```

---

## CALCULATE and Filter Context Manipulation

### Filter Modification Patterns

```dax
// ALL — remove all filters on a table
Total Sales All Regions =
CALCULATE([Total Sales], ALL(Geography))

// ALL on specific column — remove filter on one column only
Total Sales All Categories =
CALCULATE([Total Sales], ALL(Products[Category]))

// ALLEXCEPT — keep filters on all columns except specified
Total Sales All Subcategories in Category =
CALCULATE(
    [Total Sales],
    ALLEXCEPT(Products, Products[Category])
)

// ALLSELECTED — respect slicer filters but ignore visual-level filters
Total Sales in Slicer Context =
CALCULATE([Total Sales], ALLSELECTED(Products))

// KEEPFILTERS — add filter without overriding existing
Sales Premium Only (additive) =
CALCULATE(
    [Total Sales],
    KEEPFILTERS(Products[Tier] = "Premium")
)
```

### REMOVEFILTERS (Preferred over ALL in newer DAX)

```dax
// Equivalent to ALL(table) but more explicit
Market Share =
DIVIDE(
    [Total Sales],
    CALCULATE([Total Sales], REMOVEFILTERS(Geography, Products))
)
```

### USERELATIONSHIP — Activate Inactive Relationships

```dax
// Use the inactive relationship between Orders and Date via ShipDate
Sales by Ship Date =
CALCULATE(
    [Total Sales],
    USERELATIONSHIP(Orders[ShipDate], 'Date'[Date])
)

// Year-to-date by ship date (combine USERELATIONSHIP with time intelligence)
Sales YTD by Ship Date =
CALCULATE(
    TOTALYTD([Total Sales], 'Date'[Date]),
    USERELATIONSHIP(Orders[ShipDate], 'Date'[Date])
)
```

### CROSSFILTER — Modify Relationship Direction

```dax
// Force bidirectional filtering for a specific measure
Active Customers =
CALCULATE(
    DISTINCTCOUNT(Orders[CustomerId]),
    CROSSFILTER(Customers[CustomerId], Orders[CustomerId], BOTH)
)
```

---

## Iterator (X) Functions

### SUMX, AVERAGEX, MAXX, MINX

```dax
// SUMX — sum over a table with a calculated expression per row
Sales with Discount =
SUMX(
    Orders,
    Orders[Quantity] * Orders[UnitPrice] * (1 - Orders[Discount])
)

// AVERAGEX — weighted average (average unit price weighted by quantity)
Avg Selling Price =
DIVIDE(
    SUMX(OrderLines, OrderLines[Quantity] * OrderLines[UnitPrice]),
    SUM(OrderLines[Quantity])
)

// MAXX — maximum expression value across table rows
Max Order Value by Customer =
MAXX(
    SUMMARIZE(Orders, Orders[CustomerId], "OrderValue", SUM(Orders[Amount])),
    [OrderValue]
)
```

### COUNTROWS and DISTINCTCOUNTX

```dax
// Count unique customer-product combinations
Unique Customer Product Pairs =
SUMX(
    VALUES(Customers[CustomerId]),
    DISTINCTCOUNT(Orders[ProductId])
)

// Count months with positive sales
Months with Sales =
COUNTROWS(
    FILTER(
        VALUES('Date'[MonthYear]),
        [Total Sales] > 0
    )
)
```

---

## Semi-Additive Measures

For balance-type data (bank balances, inventory levels, headcount) where summing across dates is incorrect.

```dax
// Last non-blank (for end-of-period balances)
Closing Balance =
CALCULATE(
    LASTNONBLANK(AccountBalance[Balance], NOT ISBLANK(AccountBalance[Balance])),
    DATESBETWEEN('Date'[Date], BLANK(), LASTDATE('Date'[Date]))
)

// Last value (for snapshot tables)
Inventory Level =
CALCULATE(
    MAX(InventorySnapshot[Quantity]),
    LASTDATE('Date'[Date])
)

// Headcount at end of period
Headcount =
CALCULATE(
    COUNTROWS(Employees),
    LASTDATE('Date'[Date])
)

// Average of period-end values (for multi-period average balance)
Avg Monthly Balance =
AVERAGEX(
    VALUES('Date'[YearMonth]),
    CALCULATE(
        LASTNONBLANK(AccountBalance[Balance], 1),
        DATESBETWEEN('Date'[Date], BLANK(), LASTDATE('Date'[Date]))
    )
)
```

---

## Ranking and Competitive Analysis

```dax
// Dense rank within current filter context
Sales Rank =
IF(
    ISBLANK([Total Sales]),
    BLANK(),
    RANKX(
        ALLSELECTED(Products[ProductName]),
        [Total Sales],
        ,
        DESC,
        DENSE
    )
)

// Percentile rank
Sales Percentile Rank =
DIVIDE(
    RANKX(ALLSELECTED(Products[ProductName]), [Total Sales], , ASC, DENSE) - 1,
    COUNTROWS(ALLSELECTED(Products[ProductName])) - 1
)

// Market share (% of grand total)
Market Share % =
DIVIDE(
    [Total Sales],
    CALCULATE([Total Sales], ALL(Products))
)

// Share within category
Category Share % =
DIVIDE(
    [Total Sales],
    CALCULATE([Total Sales], ALLEXCEPT(Products, Products[Category]))
)

// Cumulative sales (running total)
Cumulative Sales =
CALCULATE(
    [Total Sales],
    FILTER(
        ALLSELECTED('Date'[Date]),
        'Date'[Date] <= MAX('Date'[Date])
    )
)
```

---

## Conditional and Logical Patterns

```dax
// Show measure only when a specific slicer value is selected
Sales for Selected Product =
IF(
    ISFILTERED(Products[ProductName]) && COUNTROWS(VALUES(Products[ProductName])) = 1,
    [Total Sales],
    BLANK()
)

// Dynamic title measure for report card visuals
Report Period Label =
VAR SelectedYear = SELECTEDVALUE('Date'[Year], "All Years")
VAR SelectedMonth = SELECTEDVALUE('Date'[MonthName], "All Months")
RETURN
IF(
    SelectedYear = "All Years",
    "All Time",
    IF(SelectedMonth = "All Months", SelectedYear, SelectedMonth & " " & SelectedYear)
)

// Flag records meeting complex conditions
Is High Value Customer =
IF(
    [Total Sales] >= 10000 && [Order Count] >= 5,
    "High Value",
    IF([Total Sales] >= 1000, "Medium Value", "Low Value")
)
```

---

## Error Codes and Common DAX Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| `A circular dependency was detected` | Calculated column references itself or circular measure chain | Restructure to break the cycle; convert to measure |
| `The expression refers to multiple columns` | SUMX/CALCULATE operating on incompatible table | Verify table reference is correctly scoped |
| `MdxScript error` on publish | Invalid DAX syntax in a measure | Test in DAX Studio before publishing; check for reserved word conflicts |
| Measure returns wrong total | Missing `ALLSELECTED` / `ALL` in denominator | Verify denominator uses correct CALCULATE context |
| BLANK rows in visuals | Relationship null propagation; bidirectional filter creating phantom rows | Use `KEEPFILTERS` or `TREATAS` instead of bidirectional; add `ISBLANK` guard |
| `USERELATIONSHIP` returns same as active | Inactive relationship does not exist between specified tables | Verify relationship exists in model; check column names |
| Time intelligence returns null for all periods | Date table not marked as date table; date column type mismatch | Mark date table; ensure column type is `Date` not `DateTime` |
| `TOTALYTD` ignores custom fiscal year | `year_end_date` parameter format wrong | Use "MM/DD" string format, e.g., `"06/30"` |

---

## Performance Guidelines

| Pattern | Impact | Recommendation |
|---------|--------|----------------|
| `FILTER(ALL(T), condition)` | Slow — full table scan | Use `CALCULATETABLE(T, condition)` instead |
| Deeply nested `CALCULATE` inside `SUMX` | High FE time | Pre-compute into variables using `VAR` |
| `COUNTROWS(FILTER(...))` | Slow for large tables | Use `COUNTAX(FILTER(...), 1)` or `CALCULATE(COUNTROWS(T), condition)` |
| Multiple `VALUES()` in same expression | Multiple SE scans | Combine into single `SUMMARIZE` or `CROSSJOIN` |
| `HASONEVALUE()` check in every measure | Low overhead — acceptable | Use for conditional measures that should only show in specific contexts |
| `RELATED()` in SUMX over large fact | Can cause row-by-row lookup | Pre-compute relationship in a calculated column if used frequently |
| `SWITCH(TRUE(), ...)` | Efficient — short-circuit evaluation | Preferred over nested `IF` for multiple conditions |
