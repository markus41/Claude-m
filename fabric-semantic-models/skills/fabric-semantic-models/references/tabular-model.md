# Tabular Model Design — Relationships, Date Tables, Calculated Tables, Star Schema

This reference covers tabular model design patterns for Microsoft Fabric Semantic Models: star schema implementation, relationship types, date table construction, calculated tables, and model metadata management via the Fabric REST API.

---

## Star Schema Design

### Structure

```
Fact Tables (large, numeric measures):
  FactSales, FactOrders, FactEvents, FactBudget

Dimension Tables (descriptive attributes):
  DimDate, DimProduct, DimCustomer, DimGeography, DimEmployee

Junk Dimensions (low-cardinality flags):
  DimOrderType, DimChannel, DimStatus

Bridge Tables (many-to-many resolution):
  BridgeCustomerCategory (resolves Customer ↔ Category M:M)
```

### Relationship Rules

| Rule | Description |
|------|-------------|
| Single active relationship | Only one active relationship per table pair |
| Many-to-one direction | Filters flow from dimension (1 side) to fact (many side) |
| No circular relationships | Model validation fails with circular dependency |
| Referential integrity | Every fact table key should exist in its dimension |

```
// Star schema example — relationship definitions
DimDate[DateKey]     → FactSales[OrderDateKey]    (active)
DimDate[DateKey]     → FactSales[ShipDateKey]      (inactive — use USERELATIONSHIP)
DimDate[DateKey]     → FactSales[DeliveryDateKey]  (inactive)
DimProduct[ProductKey] → FactSales[ProductKey]     (active)
DimCustomer[CustomerKey] → FactSales[CustomerKey]  (active)
DimGeography[GeoKey] → DimCustomer[GeoKey]         (active — chain relationship)
```

### Snowflake vs Star

Fabric semantic models work best with a flattened star schema. Avoid snowflake dimensions (dimension tables joining to other dimension tables more than 2 levels deep) because:
- Each join in a DAX query adds Storage Engine overhead.
- Context transitions across chains of relationships are expensive.
- Compression is less effective for highly normalized tables.

**Flatten a snowflake** using Power Query or a Lakehouse view:
```sql
-- In Lakehouse (SQL view to flatten product hierarchy)
CREATE VIEW vw_DimProduct AS
SELECT
    p.ProductKey,
    p.ProductName,
    p.UnitCost,
    sc.SubcategoryName,
    c.CategoryName,
    d.DivisionName
FROM DimProduct p
JOIN DimSubcategory sc ON p.SubcategoryKey = sc.SubcategoryKey
JOIN DimCategory c ON sc.CategoryKey = c.CategoryKey
JOIN DimDivision d ON c.DivisionKey = d.DivisionKey;
```

---

## Date Table Design

### Minimum Required Columns

| Column | Data Type | Example | Notes |
|--------|-----------|---------|-------|
| `Date` | Date | 2025-03-15 | Primary key; must be unique; no gaps |
| `Year` | Integer | 2025 | |
| `Month` | Integer | 3 | 1-12 |
| `MonthName` | String | March | Full or abbreviated |
| `Quarter` | String | Q1 | |
| `WeekOfYear` | Integer | 11 | ISO week or US week |
| `DayOfWeek` | Integer | 6 | 1=Monday or 1=Sunday depending on locale |
| `IsWeekend` | Boolean | false | |
| `DayOfMonth` | Integer | 15 | |

### Extended Columns for Business Intelligence

```dax
// Extended date table as a calculated table
DimDate =
VAR FirstDate = DATE(2020, 1, 1)
VAR LastDate = DATE(2030, 12, 31)
VAR FiscalYearStartMonth = 7  -- July fiscal year start
RETURN
ADDCOLUMNS(
    CALENDAR(FirstDate, LastDate),
    "Year",             YEAR([Date]),
    "YearLabel",        "CY" & YEAR([Date]),
    "MonthNum",         MONTH([Date]),
    "MonthName",        FORMAT([Date], "MMMM"),
    "MonthShort",       FORMAT([Date], "MMM"),
    "MonthYear",        FORMAT([Date], "MMM YYYY"),
    "Quarter",          "Q" & QUARTER([Date]),
    "QuarterYear",      "Q" & QUARTER([Date]) & " " & YEAR([Date]),
    "WeekNum",          WEEKNUM([Date], 2),          -- ISO week (Mon start)
    "WeekLabel",        "W" & FORMAT(WEEKNUM([Date], 2), "00"),
    "DayOfWeek",        WEEKDAY([Date], 2),           -- 1=Mon, 7=Sun
    "DayName",          FORMAT([Date], "dddd"),
    "DayShort",         FORMAT([Date], "ddd"),
    "IsWeekend",        IF(WEEKDAY([Date], 2) >= 6, TRUE, FALSE),
    "IsWorkday",        IF(WEEKDAY([Date], 2) <= 5, TRUE, FALSE),
    "DayOfMonth",       DAY([Date]),
    "DayOfYear",        DATEDIFF(DATE(YEAR([Date]), 1, 1), [Date], DAY) + 1,
    "IsLastDayOfMonth", [Date] = EOMONTH([Date], 0),
    "IsLastDayOfQuarter",
        [Date] = EOMONTH(DATE(YEAR([Date]), CEILING(MONTH([Date]) / 3, 1) * 3, 1), 0),

    // Fiscal year (July start)
    "FiscalYear",
        IF(MONTH([Date]) >= FiscalYearStartMonth,
           YEAR([Date]) + 1, YEAR([Date])),
    "FiscalYearLabel",
        "FY" & IF(MONTH([Date]) >= FiscalYearStartMonth,
                  YEAR([Date]) + 1, YEAR([Date])),
    "FiscalQuarter",
        "FQ" & IF(MONTH([Date]) >= FiscalYearStartMonth,
                  CEILING((MONTH([Date]) - FiscalYearStartMonth + 1) / 3, 1),
                  CEILING((MONTH([Date]) + 12 - FiscalYearStartMonth + 1) / 3, 1)),
    "FiscalMonth",
        MOD(MONTH([Date]) - FiscalYearStartMonth + 12, 12) + 1,

    // Relative period labels
    "RelativeYear",
        YEAR([Date]) - YEAR(TODAY()),
    "RelativeMonth",
        DATEDIFF(DATE(YEAR(TODAY()), MONTH(TODAY()), 1), DATE(YEAR([Date]), MONTH([Date]), 1), MONTH)
)
```

### Mark as Date Table

Required for time intelligence functions to work correctly:

```
In Power BI Desktop:
  Table tools > Mark as date table > Date column: [Date]

In Tabular Editor:
  Table > Set "Mark as date table" = true
  Table > Date column: [Date]

Via XMLA (TMSL):
{
  "alter": {
    "object": { "database": "MyModel", "table": "DimDate" },
    "table": {
      "dataCategory": "Time",
      "columns": [
        { "name": "Date", "annotations": [{ "name": "UniqueName", "value": "Date" }] }
      ]
    }
  }
}
```

---

## Relationship Types

### Cardinality

| Cardinality | Description | Use Case |
|-------------|-------------|----------|
| Many-to-one (*:1) | Multiple fact rows per dimension key | Standard fact-to-dimension |
| One-to-one (1:1) | Each row maps to exactly one row | Extended dimension attributes |
| Many-to-many (*:*) | Multiple matches on both sides | Budget vs actuals, tags, multiple categories |

### Many-to-Many Relationships

**Pattern A: Bridge table (explicit M:M resolution)**
```
Customer ─(1)─► BridgeCustomerCategory ◄─(*)─ Category

BridgeCustomerCategory:
  CustomerKey (FK to Customer)
  CategoryKey (FK to Category)

DAX: Use CROSSFILTER or configure the bridge table with bidirectional filtering
```

**Pattern B: Direct M:M relationship (Power BI native)**
```
// Configure via relationship dialog:
// Cardinality: Many-to-many
// Cross filter: Single or Both

// Warning: Many-to-many with bidirectional filtering can cause ambiguous filter
// propagation — test carefully with complex models
```

### Bidirectional vs Unidirectional Filtering

```dax
// With unidirectional (default, safer):
// Filters flow: Products → FactSales
// You can count products that have sales, but not vice versa

// To count orders per product category from a slicer on Products:
// Unidirectional + measure:
Orders per Category =
COUNTROWS(
    RELATEDTABLE(FactSales)  -- works because filter flows Product → Fact
)

// To filter Products based on FactSales criteria (e.g., "products with > 100 orders"):
// Option 1: Bidirectional relationship (performance risk for large tables)
// Option 2: Measure with CROSSFILTER:
Products with Many Orders =
CALCULATE(
    COUNTROWS(Products),
    CROSSFILTER(Products[ProductKey], FactSales[ProductKey], BOTH),
    FactSales[Quantity] > 100
)
```

---

## Calculated Tables

```dax
// Date dimension (already shown above)

// Disconnected table for parameter slicer
Scenario =
DATATABLE(
    "ScenarioId", INTEGER,
    "ScenarioName", STRING,
    {
        {1, "Optimistic"},
        {2, "Base Case"},
        {3, "Conservative"}
    }
)

// Virtual bridge table for M:M
ProductTagBridge =
SELECTCOLUMNS(
    FILTER(
        CROSSJOIN(Products, Tags),
        CONTAINS(Products[TagList], RELATED(Tags[TagName]))  -- requires list column
    ),
    "ProductKey", Products[ProductKey],
    "TagKey", Tags[TagKey]
)

// Rolling date window helper table
LastNDaysSelector =
DATATABLE(
    "Days", INTEGER,
    "Label", STRING,
    {
        {7, "Last 7 Days"},
        {30, "Last 30 Days"},
        {90, "Last 90 Days"},
        {365, "Last 365 Days"}
    }
)

// Use in measure:
Rolling Sales =
VAR SelectedDays = SELECTEDVALUE(LastNDaysSelector[Days], 30)
RETURN
CALCULATE(
    [Total Sales],
    DATESINPERIOD('Date'[Date], TODAY(), -SelectedDays, DAY)
)
```

---

## Fabric Semantic Models REST API

**Base URL**: `https://api.powerbi.com/v1.0/myorg`

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|---------------------|----------------|-------|
| GET | `/datasets` | Workspace Viewer | — | Lists all datasets in default workspace |
| GET | `/groups/{workspaceId}/datasets` | Workspace Viewer | — | Lists datasets in a specific workspace |
| GET | `/groups/{workspaceId}/datasets/{datasetId}` | Workspace Viewer | — | Returns dataset metadata |
| GET | `/groups/{workspaceId}/datasets/{datasetId}/tables` | Workspace Contributor | — | Returns table list |
| PATCH | `/groups/{workspaceId}/datasets/{datasetId}` | Workspace Contributor | `name` | Rename a dataset |
| DELETE | `/groups/{workspaceId}/datasets/{datasetId}` | Workspace Admin | — | Delete a dataset |
| POST | `/groups/{workspaceId}/datasets/{datasetId}/refreshes` | Workspace Contributor | `type`, `notifyOption` | Trigger refresh |
| GET | `/groups/{workspaceId}/datasets/{datasetId}/refreshes` | Workspace Viewer | — | Refresh history |
| GET | `/groups/{workspaceId}/datasets/{datasetId}/datasources` | Workspace Viewer | — | Returns connected data sources |
| POST | `/groups/{workspaceId}/datasets/{datasetId}/executeQueries` | Workspace Viewer | `queries` (DAX) | Execute DAX query |

```bash
# Execute a DAX query via REST API
curl -X POST "https://api.powerbi.com/v1.0/myorg/groups/${WORKSPACE_ID}/datasets/${DATASET_ID}/executeQueries" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "queries": [
      {
        "query": "EVALUATE SUMMARIZECOLUMNS(Products[Category], \"Sales\", [Total Sales])"
      }
    ],
    "serializerSettings": { "includeNulls": true }
  }'

# Get refresh history
curl "https://api.powerbi.com/v1.0/myorg/groups/${WORKSPACE_ID}/datasets/${DATASET_ID}/refreshes?$top=10" \
  -H "Authorization: Bearer ${TOKEN}"
```

---

## Error Codes and Remediation

| Error | Meaning | Fix |
|-------|---------|-----|
| `Circular dependency` | Calculated column or table references itself | Restructure calculation order; convert to measure |
| `The relationship is not valid` | Ambiguous or duplicate relationships | Remove duplicate; use USERELATIONSHIP for inactive |
| `Invalid column reference` | Column name typo or table not in model | Verify table/column names with `EVALUATE INFO.COLUMNS()` |
| `The data for the table could not be loaded` | Source Lakehouse table deleted/renamed | Update table binding in model |
| `VertiPaq: Not enough memory` | Model too large for capacity | Enable Direct Lake mode; archive old data; partition |
| `Cannot find relationship column` | Relationship column data type mismatch | Ensure FK and PK columns have the same data type |
| `DateTime vs Date column` | Time intelligence fails on DateTime column | Convert to Date using `DATEVALUE()` or in Power Query |

---

## Limits

| Resource | Limit | Notes |
|----------|-------|-------|
| Tables per model | 10,000 (practical < 500) | Performance degrades with many tables |
| Columns per model | 100,000 | Includes calculated columns |
| Rows per Import table | ~2 billion | VertiPaq compression determines actual size |
| Relationships per model | 1,000 | |
| Calculated tables | Unlimited (practical < 50) | Large calculated tables increase refresh time |
| Roles | 200 | |
| Model size (Import, Fabric Premium) | 100 GB | Compressed in-memory |
| Scheduled refresh per day | 48 | More with incremental refresh per-partition |
