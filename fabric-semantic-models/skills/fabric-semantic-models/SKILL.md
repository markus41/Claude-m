---
name: Fabric Semantic Models
description: >
  Advanced Microsoft Fabric semantic modeling with Direct Lake, DAX governance, calculation groups, XMLA deployment workflows, and semantic link integration patterns.
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
triggers:
  - fabric semantic model
  - direct lake
  - dax governance
  - calculation groups
  - xmla endpoint
  - semantic link
  - incremental refresh fabric
  - tabular model fabric
---

# Fabric Semantic Models

## 1. Overview

Microsoft Fabric Semantic Models (formerly Power BI datasets) are tabular analytical models that define the business logic layer on top of Fabric data sources. In Microsoft Fabric, semantic models benefit from Direct Lake mode — a new storage mode that reads Delta/Parquet files from OneLake directly, bypassing the need for data imports while achieving near-import query performance.

**Core capabilities**:
| Capability | Description |
|-----------|-------------|
| Direct Lake mode | Query Delta tables in OneLake without import; automatic framing ensures query consistency |
| DAX measures | Business logic layer: KPIs, time intelligence, ratios, conditional calculations |
| Calculation groups | Reusable time intelligence patterns applied across multiple measures |
| Row-level security (RLS) | Filter table rows per user or role; enforced at query time |
| Object-level security (OLS) | Hide entire tables or columns from specific roles |
| XMLA endpoint | Read/write access for third-party tools (Tabular Editor, DAX Studio, SSMS) |
| Semantic Link | Python library for querying semantic models from Fabric notebooks |
| Incremental refresh | Partition tables by date; refresh only recent partitions |

**When to use each storage mode**:
| Mode | Use Case | Freshness |
|------|----------|-----------|
| Direct Lake | Large tables in Fabric Lakehouse/Warehouse (>100M rows) | Near real-time (seconds after Delta commit) |
| Import | Smaller tables, external non-Fabric sources, complex transformations | Depends on refresh schedule |
| DirectQuery | External databases (Azure SQL, Synapse) with existing RLS or near-real-time requirements | Query-time |
| Composite | Mix of Direct Lake and Import/DQ tables | Per-table setting |

---

## 2. Quick Start

### Create a Semantic Model from a Lakehouse

```
1. Open a Fabric workspace.
2. Navigate to your Lakehouse.
3. Click "New semantic model" in the top toolbar.
4. Select the Delta tables to include.
5. Name the model and click Create.
6. The model opens in the web modeling experience.
7. Add measures, relationships, and security rules.
8. Publish and share with report authors.
```

### Create a Semantic Model from Scratch (PBIP / Tabular Editor)

```bash
# Using Tabular Editor 3 CLI for model deployment
TabularEditor.exe deploy \
  "MyModel.bim" \
  "powerbi://api.powerbi.com/v1.0/myorg/MyWorkspace" \
  "MySemanticModel" \
  -O -P

# Using Tabular Editor 2 for Open Source CI/CD
TabularEditor.exe deploy \
  "model/database.json" \
  "powerbi://api.powerbi.com/v1.0/myorg/MyWorkspace" \
  "MySemanticModel" \
  -D -O
```

### Connect via XMLA Endpoint

```
Server URL format:
  powerbi://api.powerbi.com/v1.0/myorg/<WorkspaceName>

Connection string (SSMS / Tabular Editor):
  Data Source=powerbi://api.powerbi.com/v1.0/myorg/MyWorkspace;
  Initial Catalog=MySemanticModel;
  User ID=app:<clientId>@<tenantId>;
  Password=<clientSecret>;
```

---

## 3. Core Concepts

### Direct Lake Mode

Direct Lake eliminates the copy-on-import cycle. The model reads Delta/Parquet files from OneLake directly at query time. Two key sub-features:

**Framing**: Before query execution, Fabric takes a consistent snapshot of the Delta table's current state (the transaction log). This ensures all tiles in a report see the same data version, even if the lakehouse is being updated during report load.

**Fallback to DirectQuery**: When a table cannot be served from the in-memory cache (e.g., too large for capacity), Direct Lake falls back to DirectQuery against the OneLake files. Fallback is automatic and transparent but slower. Monitor it in the Fabric Capacity Metrics app.

**Direct Lake requirements**:
- Source must be a Delta table in a Fabric Lakehouse or Warehouse.
- Tables must not use partitioning schemes incompatible with Delta (V-Order optimization recommended for best performance).
- The semantic model must be in a Fabric workspace (not a classic Power BI workspace).
- The semantic model's identity (service principal or user) must have read access to the Lakehouse.

### Tabular Model Fundamentals

A semantic model is a relational tabular model with:
- **Tables**: Imported from data sources or computed (calculated tables).
- **Columns**: Typed data columns. Can be hidden from report authors.
- **Measures**: DAX expressions that compute values dynamically at query time.
- **Relationships**: Define how tables join (active vs inactive; single vs bidirectional filtering).
- **Hierarchies**: Grouped columns for drill-down navigation.
- **Roles**: Named security roles with DAX filter expressions.

### The Evaluation Context

Every DAX expression evaluates within a context:
- **Row context**: Created by calculated columns and iterator functions (`SUMX`, `AVERAGEX`). Knows the current row.
- **Filter context**: Defined by report slicers, visual filters, page filters. Measures execute within the filter context.
- **Context transition**: `CALCULATE` converts row context to filter context.

---

## 4. DAX Measures

### Basic Aggregation Measures

```dax
// Simple sum
Total Sales = SUM(Sales[Amount])

// Count distinct customers
Customer Count = DISTINCTCOUNT(Sales[CustomerId])

// Average order value
Avg Order Value = DIVIDE(SUM(Sales[Amount]), COUNT(Sales[OrderId]))

// Ratio measure (with divide-by-zero protection)
Gross Margin % =
DIVIDE(
    SUM(Sales[GrossProfit]),
    SUM(Sales[Revenue]),
    0  -- return 0 if denominator is 0
)
```

### Time Intelligence

```dax
// Year-to-date (requires a date table marked as date table)
Sales YTD =
TOTALYTD(
    SUM(Sales[Amount]),
    'Date'[Date]
)

// Previous year same period
Sales PY =
CALCULATE(
    SUM(Sales[Amount]),
    SAMEPERIODLASTYEAR('Date'[Date])
)

// Year-over-year growth %
Sales YoY % =
VAR CurrentYear = SUM(Sales[Amount])
VAR PreviousYear = CALCULATE(SUM(Sales[Amount]), SAMEPERIODLASTYEAR('Date'[Date]))
RETURN
DIVIDE(CurrentYear - PreviousYear, PreviousYear)

// Rolling 12-month total
Sales R12M =
CALCULATE(
    SUM(Sales[Amount]),
    DATESINPERIOD('Date'[Date], LASTDATE('Date'[Date]), -12, MONTH)
)

// Month-to-date
Sales MTD = TOTALMTD(SUM(Sales[Amount]), 'Date'[Date])

// Quarter-to-date
Sales QTD = TOTALQTD(SUM(Sales[Amount]), 'Date'[Date])
```

### CALCULATE and Filter Modification

```dax
// Override a slicer filter
All Products Sales =
CALCULATE(
    SUM(Sales[Amount]),
    ALL(Products)  -- ignores any product filter
)

// Keep filters on everything except one column
Sales All Categories =
CALCULATE(
    SUM(Sales[Amount]),
    ALL(Products[Category])
)

// Add a filter to the existing context
Premium Sales =
CALCULATE(
    SUM(Sales[Amount]),
    Products[Tier] = "Premium"
)

// REMOVEFILTERS (equivalent to ALL but more explicit)
Total Market Size =
CALCULATE(
    SUM(Sales[Amount]),
    REMOVEFILTERS(Geography)
)
```

### Semi-Additive Measures (Snapshots / Balances)

```dax
// Last non-blank balance (for account balance snapshots)
Account Balance =
CALCULATE(
    LASTNONBLANK(AccountSnapshots[Balance], 1),
    DATESBETWEEN('Date'[Date], BLANK(), LASTDATE('Date'[Date]))
)

// Opening balance for a period
Opening Balance =
CALCULATE(
    [Account Balance],
    DATEADD('Date'[Date], -1, DAY)
)

// Closing balance for a period
Closing Balance = [Account Balance]
```

### Ranking and Top N

```dax
// Rank products by sales (dense rank within current filter context)
Product Sales Rank =
RANKX(
    ALLSELECTED(Products[ProductName]),
    [Total Sales],
    ,
    DESC,
    DENSE
)

// Top 10 products flag
Is Top 10 Product =
IF([Product Sales Rank] <= 10, 1, 0)

// Sales share of top 10
Top 10 Sales Share =
DIVIDE(
    CALCULATE([Total Sales], TOPN(10, ALL(Products), [Total Sales], DESC)),
    CALCULATE([Total Sales], ALL(Products))
)
```

### Context-Aware Patterns

```dax
// Detect if a specific filter is applied (for conditional formatting)
Is Single Product Selected =
ISFILTERED(Products[ProductId])
    && COUNTROWS(VALUES(Products[ProductId])) = 1

// Blank instead of 0 for chart aesthetics
Formatted Sales =
IF(ISBLANK(SUM(Sales[Amount])), BLANK(), SUM(Sales[Amount]))

// Percent of parent (handles all hierarchy levels)
Sales % of Parent =
VAR CurrentSales = [Total Sales]
VAR ParentSales =
    CALCULATE(
        [Total Sales],
        ALLEXCEPT(Products, Products[Category])  -- one level up
    )
RETURN DIVIDE(CurrentSales, ParentSales)
```

---

## 5. Tabular Model Design

### Relationship Best Practices

```
Star schema (recommended):
    Fact table (Sales, Orders, Events)
        ↑ Many-to-one relationships
    Dimension tables (Date, Product, Customer, Geography)

Rules:
1. One active relationship per pair of tables.
2. Prefer single-directional filtering (dimension → fact).
3. Use bidirectional only when required (e.g., many-to-many bridge tables).
4. Avoid circular relationships.
5. Mark the Date table as a date table (Model > Mark as date table).
```

### Date Table Requirements

```dax
// Minimum date table structure (must cover all dates in fact tables)
// Create as a calculated table or import from Lakehouse
DateTable =
CALENDAR(DATE(2020, 1, 1), DATE(2030, 12, 31))

// Add common columns
DateTable =
VAR BaseCalendar = CALENDAR(DATE(2020, 1, 1), DATE(2030, 12, 31))
RETURN
ADDCOLUMNS(
    BaseCalendar,
    "Year",           YEAR([Date]),
    "MonthNum",       MONTH([Date]),
    "MonthName",      FORMAT([Date], "MMMM"),
    "Quarter",        "Q" & QUARTER([Date]),
    "WeekNum",        WEEKNUM([Date]),
    "DayOfWeek",      WEEKDAY([Date], 2),  -- 1=Monday
    "IsWeekend",      IF(WEEKDAY([Date], 2) >= 6, TRUE, FALSE),
    "FiscalYear",     IF(MONTH([Date]) >= 7, YEAR([Date]) + 1, YEAR([Date])),  -- July fiscal start
    "FiscalQuarter",  "FQ" & IF(MONTH([Date]) >= 7, CEILING((MONTH([Date]) - 6) / 3, 1), CEILING((MONTH([Date]) + 6) / 3, 1))
)
```

### Calculated Columns vs Measures

| Aspect | Calculated Column | Measure |
|--------|------------------|---------|
| Evaluation time | At model refresh (row by row) | At query time (per visual context) |
| Storage | Stored in model; consumes memory | Not stored; always recomputed |
| Row context | Has row context (can reference current row) | No inherent row context |
| Use case | Categorization, bucketing, fixed attributes | Aggregations, KPIs, dynamic calculations |
| Performance impact | Increases model size; slows refresh | Slows query; no refresh impact |

```dax
// Calculated column — fixed categorization (computed at refresh)
Sales[PriceCategory] =
SWITCH(
    TRUE(),
    Sales[UnitPrice] < 10, "Budget",
    Sales[UnitPrice] < 50, "Standard",
    Sales[UnitPrice] < 200, "Premium",
    "Luxury"
)

// Equivalent measure — computed at query time
Price Category =
SWITCH(
    TRUE(),
    AVERAGE(Sales[UnitPrice]) < 10, "Budget",
    AVERAGE(Sales[UnitPrice]) < 50, "Standard",
    AVERAGE(Sales[UnitPrice]) < 200, "Premium",
    "Luxury"
)
```

---

## 6. Calculation Groups

Calculation groups are a tabular model feature that defines a set of calculation items (e.g., YTD, MTD, PY, PY YoY%) that can be applied to any measure in the model without writing the time intelligence logic into each individual measure.

### Why Use Calculation Groups

Without calculation groups: 50 measures × 8 time intelligence variants = 400 DAX measures.
With calculation groups: 50 base measures + 1 calculation group with 8 items = 58 objects.

### Create a Calculation Group (Tabular Editor)

In Tabular Editor 3:
1. Right-click the model > **Create** > **Calculation Group**.
2. Name the group (e.g., `Time Intelligence`).
3. Add calculation items.

```dax
// Calculation item: "Actual" (default — no modification)
SELECTEDMEASURE()

// Calculation item: "YTD"
CALCULATE(
    SELECTEDMEASURE(),
    DATESYTD('Date'[Date])
)

// Calculation item: "MTD"
CALCULATE(
    SELECTEDMEASURE(),
    DATESMTD('Date'[Date])
)

// Calculation item: "PY (Same Period Last Year)"
CALCULATE(
    SELECTEDMEASURE(),
    SAMEPERIODLASTYEAR('Date'[Date])
)

// Calculation item: "YoY Change"
VAR Current = SELECTEDMEASURE()
VAR PY = CALCULATE(SELECTEDMEASURE(), SAMEPERIODLASTYEAR('Date'[Date]))
RETURN Current - PY

// Calculation item: "YoY Change %"
VAR Current = SELECTEDMEASURE()
VAR PY = CALCULATE(SELECTEDMEASURE(), SAMEPERIODLASTYEAR('Date'[Date]))
RETURN DIVIDE(Current - PY, PY)

// Calculation item: "R12M (Rolling 12 Months)"
CALCULATE(
    SELECTEDMEASURE(),
    DATESINPERIOD('Date'[Date], LASTDATE('Date'[Date]), -12, MONTH)
)
```

### Calculation Group Precedence

When multiple calculation groups interact (e.g., a Currency conversion group and a Time Intelligence group), set **precedence** values:
- Higher precedence = evaluated last (outer context).
- Time Intelligence should have higher precedence than Currency conversion.

### Format String Expressions

Calculation items can include dynamic format string expressions:

```dax
// Format string for "YoY Change %" item
"#,##0.0%"

// Dynamic format string — use base measure format for most items, custom for % items
IF(
    ISSELECTEDMEASURE([Sales YoY %], [Margin YoY %]),
    "0.0%",
    SELECTEDMEASUREFORMATSTRING()
)
```

---

## 7. Row-Level Security (RLS) and Object-Level Security (OLS)

### RLS — Static Roles

```dax
// In Model > Security Roles > New Role: "Sales Region Manager"
// Table: Sales filter expression:
[SalesRegion] = USERNAME()
// or with email mapping:
[SalesRegion] IN PATHCONTAINS(LOOKUPVALUE(UserRegions[Region], UserRegions[UserEmail], USERNAME()))

// Table: Geography filter expression (restrict by region)
[Region] IN VALUES(
    CALCULATETABLE(
        VALUES(UserRegions[Region]),
        UserRegions[UserEmail] = USERNAME()
    )
)
```

### RLS — Dynamic Roles with Security Tables

Pattern: A `UserAccess` table maps user emails to accessible entities.

```dax
// UserAccess table columns: UserEmail, EntityId, EntityType
// RLS filter on Products table:
[ProductId] IN
    CALCULATETABLE(
        VALUES(UserAccess[EntityId]),
        UserAccess[UserEmail] = USERPRINCIPALNAME(),
        UserAccess[EntityType] = "Product"
    )
```

### RLS — Testing

```dax
// Test RLS as a specific user in Power BI Desktop:
// Modeling > View as > Select role + enter UPN
// All measures and visuals update to reflect the user's restricted view
```

```bash
# Test via REST API
curl -X POST "https://api.powerbi.com/v1.0/myorg/datasets/{datasetId}/GenerateToken" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "accessLevel": "View",
    "identities": [{"username": "testuser@contoso.com", "roles": ["Sales Region Manager"], "datasets": ["{datasetId}"]}]
  }'
```

### OLS — Object-Level Security

OLS hides entire tables or specific columns from roles. Users in an OLS-restricted role receive an error when querying the hidden object directly and see blank values in visuals.

Configure in Tabular Editor:
1. Select a table or column.
2. In the **Security** properties pane, set **Object-Level Security** per role.
3. Values: `None` (default), `Read`, `None` (hidden).

**Common OLS patterns**:
- Hide the `Salary` column from all roles except HR.
- Hide the `Cost` table from Sales roles (show only Revenue).
- Hide audit/system tables (`__Log`, `__Config`) from all report roles.

---

## 8. XMLA Endpoint

### Enable XMLA Read-Write

1. In the Power BI admin portal: **Tenant settings** > **Integration settings** > **Allow XMLA endpoints and Analyze in Excel with on-premises datasets** → Enable.
2. In Fabric workspace settings: **Premium** tab > **XMLA Endpoint** → Set to **Read Write**.

### Connect with Tabular Editor

```
Connection string:
  powerbi://api.powerbi.com/v1.0/myorg/<WorkspaceName>

Authentication:
  - Azure AD user account (interactive)
  - Service principal: app:<clientId>@<tenantId> / password: <clientSecret>
```

### XMLA Scripting — TMSL (Tabular Model Scripting Language)

```json
// Refresh a table via XMLA (TMSL)
{
  "refresh": {
    "type": "full",
    "objects": [
      {
        "database": "MySemanticModel",
        "table": "Sales"
      }
    ]
  }
}

// Refresh specific partitions
{
  "refresh": {
    "type": "full",
    "objects": [
      {
        "database": "MySemanticModel",
        "table": "Sales",
        "partition": "Sales_2025"
      }
    ]
  }
}
```

### Deploy via XMLA with PowerShell

```powershell
# Install module
Install-Module -Name MicrosoftPowerBIMgmt -Force

# Connect
Connect-PowerBIServiceAccount -ServicePrincipal `
  -Credential (New-Object PSCredential("app:<clientId>@<tenantId>", (ConvertTo-SecureString "<secret>" -AsPlainText -Force))) `
  -TenantId "<tenantId>"

# Get workspace ID
$workspace = Get-PowerBIWorkspace -Name "MyWorkspace"

# Deploy model using Tabular Editor
& "TabularEditor.exe" deploy `
  "model.bim" `
  "powerbi://api.powerbi.com/v1.0/myorg/$($workspace.Name)" `
  "MySemanticModel" `
  -O -P

# Trigger refresh via REST API
$datasetId = (Get-PowerBIDataset -WorkspaceId $workspace.Id -Name "MySemanticModel").Id
Invoke-PowerBIRestMethod -Url "datasets/$datasetId/refreshes" -Method Post `
  -Body '{"notifyOption": "MailOnFailure"}'
```

---

## 9. Deployment and Refresh via REST API

### Refresh API

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|---------------------|----------------|-------|
| POST | `/datasets/{datasetId}/refreshes` | Dataset Write | `notifyOption`, `type`, `objects` | Triggers an asynchronous refresh |
| GET | `/datasets/{datasetId}/refreshes` | Dataset Read | — | Returns refresh history (last 60 refreshes) |
| GET | `/datasets/{datasetId}/refreshes/{refreshId}` | Dataset Read | — | Returns status of a specific refresh |
| DELETE | `/datasets/{datasetId}/refreshes/{refreshId}` | Dataset Write | — | Cancels an in-progress refresh |

```bash
# Trigger a full refresh
curl -X POST "https://api.powerbi.com/v1.0/myorg/datasets/${DATASET_ID}/refreshes" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"notifyOption": "MailOnFailure", "type": "full"}'

# Enhanced refresh — partial table refresh (requires Premium/Fabric capacity)
curl -X POST "https://api.powerbi.com/v1.0/myorg/datasets/${DATASET_ID}/refreshes" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "full",
    "commitMode": "transactional",
    "maxParallelism": 4,
    "retryCount": 2,
    "objects": [
      { "table": "Sales", "partition": "Sales_202503" },
      { "table": "Date" }
    ]
  }'

# Check refresh status
curl "https://api.powerbi.com/v1.0/myorg/datasets/${DATASET_ID}/refreshes" \
  -H "Authorization: Bearer ${TOKEN}"
```

### Incremental Refresh Configuration

Incremental refresh partitions large fact tables by date, refreshing only recent data.

```
In Power BI Desktop / Tabular Editor:
1. Add two Power Query parameters:
   - RangeStart (DateTime type)
   - RangeEnd (DateTime type)
2. Filter the fact table: Date column >= RangeStart AND Date column < RangeEnd
3. Configure incremental refresh policy:
   - Store data from: last 5 years (historical partitions, refreshed rarely)
   - Refresh data from: last 3 days (rolling window, refreshed on schedule)
   - Detect data changes: optional — use a "Last Modified" column if available
4. Publish to Fabric workspace (applies policy and creates initial partitions)
```

---

## 10. Semantic Link — Python Integration

Semantic Link (`sempy`) is a Python library that enables reading semantic model data from Fabric notebooks.

### Installation and Setup

```python
# Install semantic link (pre-installed in Fabric notebooks)
%pip install semantic-link --quiet

import sempy.fabric as fabric
```

### Read Semantic Model Data

```python
import sempy.fabric as fabric

# List datasets in the workspace
datasets = fabric.list_datasets()
print(datasets)

# Read a table from a semantic model
df = fabric.read_table("MySemanticModel", "Sales")
df.head()

# Evaluate a DAX measure
result = fabric.evaluate_measure(
    "MySemanticModel",
    measure="[Total Sales]",
    groupby_columns=["Date[Year]", "Products[Category]"]
)
print(result)

# Execute a raw DAX query
dax_result = fabric.evaluate_dax(
    "MySemanticModel",
    """
    EVALUATE
    SUMMARIZECOLUMNS(
        'Date'[Year],
        'Products'[Category],
        "Total Sales", [Total Sales],
        "Margin %", [Gross Margin %]
    )
    """
)
print(dax_result)
```

### Write Back to Semantic Model (XMLA)

```python
# Use Tabular Editor or Analysis Services client library for write-back operations
# Semantic Link is read-only for model metadata and data queries

# Export semantic model metadata
model_info = fabric.get_model("MySemanticModel")
tables = fabric.list_tables("MySemanticModel")
measures = fabric.list_measures("MySemanticModel")
```

---

## 11. Common Workflows

### Workflow 1: Build a Direct Lake Model

```
1. Create a Lakehouse with V-Order optimized Delta tables.
2. In the workspace, click + New item > Semantic model.
3. Select the Lakehouse and the tables to include.
4. Open the model in the web editor or connect via XMLA.
5. Define relationships between fact and dimension tables.
6. Add DAX measures (start with base aggregations).
7. Add time intelligence measures or calculation group.
8. Configure RLS roles.
9. Publish the model.
10. Build a Power BI report on top of it.
```

### Workflow 2: CI/CD Deployment

```bash
# 1. Author model in PBIP format (Power BI Desktop)
# 2. Commit model/definition/database.tmdl to Git
# 3. In CI pipeline:
tabularEditor deploy "model/database.tmdl" \
  "powerbi://api.powerbi.com/v1.0/myorg/Dev-Workspace" \
  "MySemanticModel-Dev" -O -P

# 4. Run DAX tests (pbi-tools or Tabular Editor Best Practices)
tabularEditor "database.tmdl" -A BestPracticeRules.json -V

# 5. Deploy to prod after PR approval
tabularEditor deploy "model/database.tmdl" \
  "powerbi://api.powerbi.com/v1.0/myorg/Prod-Workspace" \
  "MySemanticModel" -O -P
```

### Workflow 3: Diagnose Slow Report

```
1. Open DAX Studio > Connect to semantic model via XMLA.
2. Run: EVALUATE SUMMARIZECOLUMNS(...) — measure being investigated.
3. Review Server Timings:
   - Formula Engine (FE) time: DAX evaluation time.
   - Storage Engine (SE) time: data scan time.
4. High SE time → optimize source table (V-Order, fewer columns, partitioning).
5. High FE time → simplify DAX (fewer iterators, avoid FILTER(ALL(...)), use variables).
6. Check Direct Lake fallback: Fabric Capacity Metrics app > Direct Lake fallback events.
```

---

## 12. Error Handling and Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| Direct Lake fallback to DQ | Table too large for capacity memory; V-Order not applied | Enable V-Order on Delta table; increase Fabric SKU; partition large tables |
| "Model is not available" in reports | Refresh failed; model in error state | Check refresh history in Power BI service; inspect error details |
| RLS returns wrong data | Filter expression references wrong column or uses USERNAME() instead of USERPRINCIPALNAME() | In Fabric, always use USERPRINCIPALNAME(); test with "View as role" |
| XMLA connection refused | Tenant setting disabled or workspace not on Fabric/Premium | Enable XMLA read-write in admin portal + workspace settings |
| Calculation group not applying | Precedence conflict; `ISSELECTEDMEASURE` guard needed | Review precedence values; use `SELECTEDMEASURE()` without conditions in default item |
| Incremental refresh drops partitions | RangeStart/RangeEnd not properly filtered or Date column type mismatch | Ensure Date column is DateTime type; verify Power Query filter uses correct parameter names |
| Semantic Link `evaluate_dax` returns empty | DAX syntax error or measure name typo | Test the DAX in DAX Studio first; check table/measure names match exactly |

---

## 13. Performance and Limits

| Resource | Limit | Notes |
|----------|-------|-------|
| Direct Lake tables per model | Unlimited (practical: < 500) | Each table adds framing overhead |
| Rows per table (Direct Lake) | Petabyte-scale | Falls back to DQ for in-memory cache misses |
| Measures per model | 10,000 (practical: < 1,000) | Organize into display folders |
| Roles per model | 200 | |
| Calculation groups per model | 50 | |
| Calculation items per group | 500 | |
| Relationships per model | 1,000 | |
| Concurrent XMLA connections | 10 (per user), 100 (per workspace) | |
| Refresh operations (scheduled) | 48 per day for Premium/Fabric | Incremental refresh does not count additional refreshes per partition |
| DAX query timeout | 4 minutes | For interactive visuals; increase for XMLA admin queries |
| Semantic Link `evaluate_dax` timeout | 4 minutes | Default REST API query timeout |

---

## Progressive Disclosure — Reference Files

| Topic | File |
|---|---|
| DAX measures — time intelligence, aggregations, CALCULATE patterns, and troubleshooting | [`references/dax-measures.md`](./references/dax-measures.md) |
| Tabular model design — relationships, date tables, calculated tables, star schema | [`references/tabular-model.md`](./references/tabular-model.md) |
| Row-level and object-level security — RLS patterns, dynamic roles, OLS, API testing | [`references/row-level-security.md`](./references/row-level-security.md) |
| Deployment and refresh — REST API, XMLA, incremental refresh, CI/CD pipelines | [`references/deployment-refresh.md`](./references/deployment-refresh.md) |
