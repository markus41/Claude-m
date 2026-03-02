---
name: pbi-direct-lake-model
description: Generate TMDL for a Direct Lake semantic model over a Fabric Lakehouse
argument-hint: "<model-name> <lakehouse-name>"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - AskUserQuestion
---

# Generate Direct Lake Semantic Model

Scaffold a TMDL (Tabular Model Definition Language) project for a Direct Lake semantic model that reads directly from Lakehouse Delta tables.

## Step 1: Gather Requirements

Ask the user for:
1. Semantic model name
2. Target Lakehouse name and workspace
3. Fact table(s) and their key columns
4. Dimension table(s) and their key columns
5. Relationships between fact and dimension tables
6. Key measures to create (e.g., Total Sales, YoY Growth)

## Step 2: List Lakehouse Tables

Query the Lakehouse tables to discover the available schema:

```
GET https://api.fabric.microsoft.com/v1/workspaces/{workspaceId}/lakehouses/{lakehouseId}/tables
```

Use the response to validate the user's table selections and discover column metadata.

## Step 3: Generate TMDL Files

Create a TMDL project directory with individual files per table, measure group, and relationship.

### model.tmdl (Root Model Definition)

```tmdl
model Model
  culture: en-US
  defaultPowerBIDataSourceVersion: powerBI_V3
  discourageImplicitMeasures: true
  sourceQueryCulture: en-US
```

### Fact Table Definition (e.g., tables/FactSales.tmdl)

```tmdl
table FactSales
  lineageTag: <generate-guid>
  sourceLineageTag: <generate-guid>

  partition FactSales = entity
    mode: directLake
    source
      entityName: fact_sales
      schemaName: dbo
      expressionSource: DatabaseQuery

  column SalesId
    dataType: int64
    isKey: true
    isHidden: true
    sourceColumn: sales_id
    lineageTag: <generate-guid>

  column ProductKey
    dataType: int64
    isHidden: true
    sourceColumn: product_key
    lineageTag: <generate-guid>

  column DateKey
    dataType: int64
    isHidden: true
    sourceColumn: date_key
    lineageTag: <generate-guid>

  column CustomerKey
    dataType: int64
    isHidden: true
    sourceColumn: customer_key
    lineageTag: <generate-guid>

  column Amount
    dataType: decimal
    formatString: \$#,0.00;(\$#,0.00);\$#,0.00
    sourceColumn: amount
    lineageTag: <generate-guid>

  column Quantity
    dataType: int64
    sourceColumn: quantity
    lineageTag: <generate-guid>

  measure 'Total Sales' =
    SUM(FactSales[Amount])
    formatString: \$#,0.00
    displayFolder: Sales Metrics
    lineageTag: <generate-guid>

  measure 'Total Quantity' =
    SUM(FactSales[Quantity])
    formatString: #,0
    displayFolder: Sales Metrics
    lineageTag: <generate-guid>

  measure 'YoY Sales Growth' =
    VAR _currentYear = [Total Sales]
    VAR _previousYear = CALCULATE([Total Sales], SAMEPERIODLASTYEAR('DimDate'[Date]))
    RETURN
      DIVIDE(_currentYear - _previousYear, _previousYear)
    formatString: 0.0%;-0.0%;0.0%
    displayFolder: Sales Metrics
    lineageTag: <generate-guid>
```

### Dimension Table Definition (e.g., tables/DimDate.tmdl)

```tmdl
table DimDate
  lineageTag: <generate-guid>
  dataCategory: Time

  partition DimDate = entity
    mode: directLake
    source
      entityName: dim_date
      schemaName: dbo
      expressionSource: DatabaseQuery

  column Date
    dataType: dateTime
    isKey: true
    sourceColumn: date
    lineageTag: <generate-guid>

  column Year
    dataType: int64
    sourceColumn: year
    lineageTag: <generate-guid>

  column Quarter
    dataType: string
    sourceColumn: quarter
    lineageTag: <generate-guid>

  column Month
    dataType: string
    sourceColumn: month_name
    sortByColumn: MonthNumber
    lineageTag: <generate-guid>

  column MonthNumber
    dataType: int64
    isHidden: true
    sourceColumn: month_number
    lineageTag: <generate-guid>

  hierarchy 'Calendar Hierarchy'
    lineageTag: <generate-guid>

    level Year
      lineageTag: <generate-guid>
      column: Year

    level Quarter
      lineageTag: <generate-guid>
      column: Quarter

    level Month
      lineageTag: <generate-guid>
      column: Month
```

### Relationships Definition (relationships.tmdl)

```tmdl
relationship <generate-guid>
  fromColumn: FactSales.DateKey
  toColumn: DimDate.DateKey
  crossFilteringBehavior: oneDirection

relationship <generate-guid>
  fromColumn: FactSales.ProductKey
  toColumn: DimProduct.ProductKey
  crossFilteringBehavior: oneDirection

relationship <generate-guid>
  fromColumn: FactSales.CustomerKey
  toColumn: DimCustomer.CustomerKey
  crossFilteringBehavior: oneDirection
```

### Expressions Definition (expressions.tmdl)

```tmdl
expression DatabaseQuery =
  let
    database = Sql.Database("<lakehouse-sql-endpoint>", "<lakehouse-name>")
  in
    database
  lineageTag: <generate-guid>
```

## Step 4: Direct Lake Considerations

Remind the user of Direct Lake constraints:
- **No calculated columns** in the semantic model (use Lakehouse views or notebook transforms instead)
- **No Power Query M transforms** — data must be clean in the Lakehouse tables
- **Fallback to DirectQuery** if data exceeds memory or unsupported features are used
- **Supported column types**: string, int64, decimal, double, dateTime, boolean
- **RLS is supported** via DAX filter expressions on tables
- **Max columns per table**: 1,000 (VertiPaq limit)

## Step 5: Write TMDL Files

Write the generated `.tmdl` files to a project directory:

```
<model-name>.SemanticModel/
  definition/
    model.tmdl
    tables/
      FactSales.tmdl
      DimDate.tmdl
      DimProduct.tmdl
      DimCustomer.tmdl
    relationships.tmdl
    expressions.tmdl
  definition.pbism
```

## Step 6: Output Summary

Display:
- Model name and Lakehouse connection
- Table list with column counts
- Relationship diagram (text-based star schema)
- Measures with their display folders
- Direct Lake constraints checklist
