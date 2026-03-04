---
name: pr-datasource
description: Generate or update data source and dataset configuration for a paginated report. Supports Fabric Lakehouse, Warehouse, Semantic Model, Azure SQL, and Dataverse.
argument-hint: "<source-type> [--connection-string <string>] [--query <sql-or-dax>] [--params <param-list>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - AskUserQuestion
---

# Configure Paginated Report Data Source

Generate RDL XML fragments for data source and dataset configuration, or update an existing .rdl file's data source.

## Instructions

1. Parse the source type from the first argument:
   - `lakehouse` — Fabric Lakehouse SQL endpoint
   - `warehouse` — Fabric Warehouse
   - `semantic-model` — Power BI Semantic Model (DAX queries)
   - `sql` — Azure SQL Database
   - `dataverse` — Dataverse / Dynamics 365
   - `gateway` — On-premises via data gateway

2. Read data source reference:
   - `${CLAUDE_PLUGIN_ROOT}/skills/paginated-reports/references/data-sources-datasets.md`

3. If `--connection-string` is not provided, ask the user for connection details:
   - For Lakehouse/Warehouse: workspace GUID and lakehouse/warehouse name
   - For Semantic Model: workspace name and dataset name
   - For Azure SQL: server name and database name
   - For Dataverse: organization URL
   - For Gateway: original server name (will be mapped to gateway after upload)

4. If `--query` is not provided, ask the user to describe what data they need and generate an appropriate query.

5. Generate the RDL XML fragment(s):
   - DataSource element with correct DataProvider and connection string
   - DataSet element with query, parameters, and field definitions
   - ReportParameter elements for any query parameters

6. If a .rdl file path is provided, insert the data source and dataset into the file.
   Otherwise, output the XML fragments for manual insertion.

## Output Format

### Fabric Lakehouse Example

```xml
<!-- DataSource -->
<DataSource Name="SalesLakehouse">
  <ConnectionProperties>
    <DataProvider>SQL</DataProvider>
    <ConnectString>Data Source=abc123.datawarehouse.fabric.microsoft.com;Initial Catalog=SalesLakehouse</ConnectString>
    <IntegratedSecurity>true</IntegratedSecurity>
  </ConnectionProperties>
</DataSource>

<!-- DataSet -->
<DataSet Name="SalesData">
  <Query>
    <DataSourceName>SalesLakehouse</DataSourceName>
    <QueryParameters>
      <QueryParameter Name="@StartDate">
        <Value>=Parameters!StartDate.Value</Value>
      </QueryParameter>
    </QueryParameters>
    <CommandType>Text</CommandType>
    <CommandText>
      SELECT ... FROM ... WHERE OrderDate >= @StartDate
    </CommandText>
  </Query>
  <Fields>
    <Field Name="..."><DataField>...</DataField><rd:TypeName>...</rd:TypeName></Field>
  </Fields>
</DataSet>

<!-- ReportParameters -->
<ReportParameter Name="StartDate">
  <DataType>DateTime</DataType>
  <Prompt>Start Date</Prompt>
  <DefaultValue><Values><Value>=DateAdd(DateInterval.Month, -1, Today())</Value></Values></DefaultValue>
</ReportParameter>
```

## Guidelines

- Use IntegratedSecurity=true for all Fabric sources (Azure AD passthrough)
- For Semantic Model connections, use DAX (EVALUATE) not SQL
- Never embed credentials in connection strings
- Always parameterize date ranges and filter values
- Include rd:TypeName on all field definitions for proper type handling
- Generate sensible default parameter values (e.g., last month for dates)
- For multi-value parameters, add MultiValue=true and demonstrate IN clause usage
