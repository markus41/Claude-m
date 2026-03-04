# Data Sources & Datasets Reference

## Fabric Semantic Model Connection

Connect paginated reports to a published Power BI semantic model (dataset) to reuse DAX measures, relationships, and RLS.

### Connection String

```
Data Source=powerbi://api.powerbi.com/v1.0/myorg/WorkspaceName;Initial Catalog=SemanticModelName
```

Or use the XMLA endpoint:
```
Data Source=powerbi://api.powerbi.com/v1.0/myorg/WorkspaceName
```

### Dataset Query (DAX)

```dax
EVALUATE
SUMMARIZECOLUMNS(
    'Date'[Year],
    'Product'[Category],
    "TotalSales", [Total Sales],
    "OrderCount", [Order Count]
)
```

### RDL DataSource Element

```xml
<DataSource Name="SemanticModel">
  <ConnectionProperties>
    <DataProvider>PBIDATASET</DataProvider>
    <ConnectString>Data Source=powerbi://api.powerbi.com/v1.0/myorg/MyWorkspace;Initial Catalog=SalesModel</ConnectString>
    <IntegratedSecurity>true</IntegratedSecurity>
  </ConnectionProperties>
</DataSource>
```

### Key Considerations

- RLS applies automatically based on the viewing user's identity
- Use DAX queries (EVALUATE), not SQL
- Parameters must be passed via DAX FILTER expressions
- Calculated measures from the model are available as fields
- Aggregation happens server-side in the Analysis Services engine

## Fabric Lakehouse SQL Endpoint

### Connection String

```
Data Source=<workspace-guid>.datawarehouse.fabric.microsoft.com;Initial Catalog=<lakehouse-name>
```

Find the SQL endpoint in the Lakehouse settings in the Fabric portal.

### Dataset Query (T-SQL)

```sql
SELECT
    c.CustomerName,
    p.ProductCategory,
    SUM(s.Amount) AS TotalAmount,
    COUNT(s.OrderID) AS OrderCount
FROM dbo.Sales s
INNER JOIN dbo.Customers c ON s.CustomerID = c.CustomerID
INNER JOIN dbo.Products p ON s.ProductID = p.ProductID
WHERE s.OrderDate BETWEEN @StartDate AND @EndDate
    AND c.Region = @Region
GROUP BY c.CustomerName, p.ProductCategory
ORDER BY TotalAmount DESC
```

### RDL DataSource Element

```xml
<DataSource Name="Lakehouse">
  <ConnectionProperties>
    <DataProvider>SQL</DataProvider>
    <ConnectString>Data Source=abc123.datawarehouse.fabric.microsoft.com;Initial Catalog=SalesLakehouse</ConnectString>
    <IntegratedSecurity>true</IntegratedSecurity>
  </ConnectionProperties>
</DataSource>
```

### Key Considerations

- Uses T-SQL dialect (subset of full SQL Server)
- Delta Lake tables exposed as SQL tables in the `dbo` schema
- Read-only — no INSERT/UPDATE/DELETE from reports
- Supports JOINs, CTEs, window functions, aggregates
- Fabric identity passthrough or service principal for auth

## Fabric Warehouse

### Connection String

```
Data Source=<workspace-guid>.datawarehouse.fabric.microsoft.com;Initial Catalog=<warehouse-name>
```

### Dataset Query (T-SQL)

Same T-SQL syntax as Lakehouse SQL endpoint. Warehouse supports full DML but reports use SELECT only.

```sql
SELECT
    d.FiscalYear,
    d.FiscalQuarter,
    g.RegionName,
    SUM(f.Revenue) AS Revenue,
    SUM(f.Cost) AS Cost,
    SUM(f.Revenue) - SUM(f.Cost) AS Profit
FROM fact.Sales f
INNER JOIN dim.Date d ON f.DateKey = d.DateKey
INNER JOIN dim.Geography g ON f.GeographyKey = g.GeographyKey
WHERE d.FiscalYear = @FiscalYear
GROUP BY d.FiscalYear, d.FiscalQuarter, g.RegionName
ORDER BY d.FiscalQuarter, g.RegionName
```

### RDL DataSource Element

```xml
<DataSource Name="Warehouse">
  <ConnectionProperties>
    <DataProvider>SQL</DataProvider>
    <ConnectString>Data Source=abc123.datawarehouse.fabric.microsoft.com;Initial Catalog=SalesWarehouse</ConnectString>
    <IntegratedSecurity>true</IntegratedSecurity>
  </ConnectionProperties>
</DataSource>
```

## Azure SQL Database

### Connection String

```
Data Source=myserver.database.windows.net;Initial Catalog=MyDatabase
```

### RDL DataSource Element

```xml
<DataSource Name="AzureSQL">
  <ConnectionProperties>
    <DataProvider>SQL</DataProvider>
    <ConnectString>Data Source=myserver.database.windows.net;Initial Catalog=SalesDB</ConnectString>
  </ConnectionProperties>
  <rd:SecurityType>DataBase</rd:SecurityType>
</DataSource>
```

### Credential Options

- **Stored credentials** — Username/password stored in Power BI service data source settings
- **Azure AD SSO** — Viewer's identity passed through (requires Azure AD auth on the SQL server)
- **Service principal** — App registration credentials for automated scenarios

## Dataverse (Dynamics 365)

### Connection String

```
Data Source=https://orgname.crm.dynamics.com;Initial Catalog=orgname
```

### Dataset Query (FetchXML or OData)

FetchXML is the native Dataverse query language:

```xml
<fetch top="5000">
  <entity name="account">
    <attribute name="name" />
    <attribute name="revenue" />
    <attribute name="numberofemployees" />
    <filter>
      <condition attribute="statecode" operator="eq" value="0" />
      <condition attribute="createdon" operator="last-x-months" value="12" />
    </filter>
    <order attribute="revenue" descending="true" />
  </entity>
</fetch>
```

### RDL DataSource Element

```xml
<DataSource Name="Dataverse">
  <ConnectionProperties>
    <DataProvider>OLEDB</DataProvider>
    <ConnectString>Provider=Microsoft.Mashup.OleDb.1;Data Source=$Embedded$;...</ConnectString>
  </ConnectionProperties>
</DataSource>
```

Note: Dataverse connections in paginated reports often use the Power Query (M) data connector embedded within the RDL.

## On-Premises via Gateway

### Gateway Requirements

- Install on-premises data gateway (standard mode, not personal)
- Register gateway in Power BI service > Settings > Manage gateways
- Add data source to gateway with credentials
- Bind report data source to gateway data source

### Supported On-Prem Sources

| Source | Provider | Notes |
|--------|----------|-------|
| SQL Server | SQL | Full T-SQL support |
| Oracle | ORACLE | Requires Oracle client on gateway machine |
| SAP HANA | OLEDB | SAP .NET connector required |
| ODBC | ODBC | Any ODBC driver on gateway |
| File (CSV, Excel) | Power Query | Via M connector |

### Connection String (On-Prem SQL Server)

```
Data Source=server-name\instance;Initial Catalog=DatabaseName
```

After publishing, the Power BI service maps this to the gateway data source by matching server name and database.

## Stored Procedures

### CommandType StoredProcedure

```xml
<DataSet Name="SalesReport">
  <Query>
    <DataSourceName>Warehouse</DataSourceName>
    <QueryParameters>
      <QueryParameter Name="@StartDate">
        <Value>=Parameters!StartDate.Value</Value>
      </QueryParameter>
      <QueryParameter Name="@EndDate">
        <Value>=Parameters!EndDate.Value</Value>
      </QueryParameter>
      <QueryParameter Name="@Region">
        <Value>=Parameters!Region.Value</Value>
      </QueryParameter>
    </QueryParameters>
    <CommandType>StoredProcedure</CommandType>
    <CommandText>dbo.usp_GetSalesReport</CommandText>
  </Query>
  <Fields>
    <Field Name="CustomerName"><DataField>CustomerName</DataField></Field>
    <Field Name="TotalAmount"><DataField>TotalAmount</DataField></Field>
    <!-- Fields match stored procedure output columns -->
  </Fields>
</DataSet>
```

### Best Practices for Stored Procedures

- Define explicit output column names (not `SELECT *`)
- Include SET NOCOUNT ON at the top
- Avoid PRINT statements (they cause dataset errors)
- Use TRY/CATCH for error handling
- Return a consistent column set regardless of parameter values

## Multi-Value Parameters in Queries

### SQL Server / Fabric Warehouse

Multi-value parameters expand to comma-separated values. Use with IN:

```sql
-- In the dataset query
SELECT * FROM Sales
WHERE Region IN (@Region)
```

The report engine auto-expands `@Region` for multi-value parameters.

### Alternative: String Split

If auto-expansion doesn't work (some providers):

```sql
SELECT * FROM Sales
WHERE Region IN (SELECT value FROM STRING_SPLIT(@RegionList, ','))
```

With parameter expression: `=Join(Parameters!Region.Value, ",")`

### DAX (Semantic Model)

```dax
EVALUATE
FILTER(
    SUMMARIZECOLUMNS(
        'Geography'[Region],
        "Sales", [Total Sales]
    ),
    'Geography'[Region] IN { @Region }
)
```

## Shared Data Sources and Datasets

### Shared Data Source (.rds)

Managed on the server. Multiple reports reference the same connection.

Benefits:
- Change connection string once, all reports update
- Centralized credential management
- Consistent security policies

### Shared Dataset (.rsd)

Managed on the server. Multiple reports reference the same query/fields.

Benefits:
- Query logic maintained in one place
- Caching shared across reports
- Parameter definitions shared

### Referencing in RDL

```xml
<DataSource Name="SharedRef">
  <DataSourceReference>SharedSalesConnection</DataSourceReference>
</DataSource>

<DataSet Name="SharedDatasetRef">
  <SharedDataSetReference>
    <SharedDataSetReferenceName>SalesQueryShared</SharedDataSetReferenceName>
    <QueryParameters>
      <QueryParameter Name="@Region">
        <Value>=Parameters!Region.Value</Value>
      </QueryParameter>
    </QueryParameters>
  </SharedDataSetReference>
</DataSet>
```

## Dataset Properties

### Timeout

```xml
<Query>
  <Timeout>120</Timeout>  <!-- seconds -->
  ...
</Query>
```

Default is typically 0 (no timeout). Set appropriate timeout for large queries.

### Filters (Report-Side)

```xml
<Filters>
  <Filter>
    <FilterExpression>=Fields!Status.Value</FilterExpression>
    <Operator>Equal</Operator>
    <FilterValues>
      <FilterValue>=Parameters!StatusFilter.Value</FilterValue>
    </FilterValues>
  </Filter>
</Filters>
```

Report-side filters execute after query returns. Prefer query-side filtering (WHERE clause) for performance.

### Collation

```xml
<Collation>Latin1_General_CI_AS</Collation>
```

Affects sort order and string comparison for report-side operations.
