# RDL Templates

Complete, production-ready RDL examples for common report types.

## 1. Invoice Report

Multi-page invoice with company header, line items, and totals. One invoice per page.

```xml
<?xml version="1.0" encoding="utf-8"?>
<Report xmlns="http://schemas.microsoft.com/sqlserver/reporting/2016/01/reportdefinition"
        xmlns:rd="http://schemas.microsoft.com/SQLServer/reporting/reportdesigner">
  <Description>Invoice report with page break per invoice</Description>
  <Author>Report Builder</Author>

  <DataSources>
    <DataSource Name="Warehouse">
      <ConnectionProperties>
        <DataProvider>SQL</DataProvider>
        <ConnectString>Data Source=myserver.datawarehouse.fabric.microsoft.com;Initial Catalog=SalesDB</ConnectString>
        <IntegratedSecurity>true</IntegratedSecurity>
      </ConnectionProperties>
    </DataSource>
  </DataSources>

  <DataSets>
    <DataSet Name="InvoiceData">
      <Query>
        <DataSourceName>Warehouse</DataSourceName>
        <QueryParameters>
          <QueryParameter Name="@InvoiceID">
            <Value>=Parameters!InvoiceID.Value</Value>
          </QueryParameter>
        </QueryParameters>
        <CommandType>Text</CommandType>
        <CommandText>
          SELECT
            i.InvoiceID, i.InvoiceDate, i.DueDate,
            c.CustomerName, c.Address, c.City, c.State, c.PostalCode,
            il.LineNumber, il.ProductName, il.Quantity, il.UnitPrice,
            il.Quantity * il.UnitPrice AS LineTotal,
            i.SubTotal, i.TaxAmount, i.TotalAmount
          FROM dbo.Invoices i
          INNER JOIN dbo.Customers c ON i.CustomerID = c.CustomerID
          INNER JOIN dbo.InvoiceLines il ON i.InvoiceID = il.InvoiceID
          WHERE i.InvoiceID = @InvoiceID
          ORDER BY il.LineNumber
        </CommandText>
      </Query>
      <Fields>
        <Field Name="InvoiceID"><DataField>InvoiceID</DataField><rd:TypeName>System.Int32</rd:TypeName></Field>
        <Field Name="InvoiceDate"><DataField>InvoiceDate</DataField><rd:TypeName>System.DateTime</rd:TypeName></Field>
        <Field Name="DueDate"><DataField>DueDate</DataField><rd:TypeName>System.DateTime</rd:TypeName></Field>
        <Field Name="CustomerName"><DataField>CustomerName</DataField><rd:TypeName>System.String</rd:TypeName></Field>
        <Field Name="Address"><DataField>Address</DataField><rd:TypeName>System.String</rd:TypeName></Field>
        <Field Name="City"><DataField>City</DataField><rd:TypeName>System.String</rd:TypeName></Field>
        <Field Name="State"><DataField>State</DataField><rd:TypeName>System.String</rd:TypeName></Field>
        <Field Name="PostalCode"><DataField>PostalCode</DataField><rd:TypeName>System.String</rd:TypeName></Field>
        <Field Name="LineNumber"><DataField>LineNumber</DataField><rd:TypeName>System.Int32</rd:TypeName></Field>
        <Field Name="ProductName"><DataField>ProductName</DataField><rd:TypeName>System.String</rd:TypeName></Field>
        <Field Name="Quantity"><DataField>Quantity</DataField><rd:TypeName>System.Int32</rd:TypeName></Field>
        <Field Name="UnitPrice"><DataField>UnitPrice</DataField><rd:TypeName>System.Decimal</rd:TypeName></Field>
        <Field Name="LineTotal"><DataField>LineTotal</DataField><rd:TypeName>System.Decimal</rd:TypeName></Field>
        <Field Name="SubTotal"><DataField>SubTotal</DataField><rd:TypeName>System.Decimal</rd:TypeName></Field>
        <Field Name="TaxAmount"><DataField>TaxAmount</DataField><rd:TypeName>System.Decimal</rd:TypeName></Field>
        <Field Name="TotalAmount"><DataField>TotalAmount</DataField><rd:TypeName>System.Decimal</rd:TypeName></Field>
      </Fields>
    </DataSet>
  </DataSets>

  <ReportParameters>
    <ReportParameter Name="InvoiceID">
      <DataType>Integer</DataType>
      <Prompt>Invoice Number</Prompt>
    </ReportParameter>
  </ReportParameters>

  <ReportSections>
    <ReportSection>
      <Body>
        <ReportItems>
          <!-- Company Name -->
          <Textbox Name="CompanyName">
            <Paragraphs><Paragraph><TextRuns><TextRun>
              <Value>Contoso Ltd.</Value>
              <Style><FontSize>16pt</FontSize><FontWeight>Bold</FontWeight></Style>
            </TextRun></TextRuns></Paragraph></Paragraphs>
            <Top>0in</Top><Left>0in</Left><Width>3in</Width><Height>0.4in</Height>
          </Textbox>

          <!-- Invoice Title -->
          <Textbox Name="InvoiceTitle">
            <Paragraphs><Paragraph><TextRuns><TextRun>
              <Value>INVOICE</Value>
              <Style><FontSize>20pt</FontSize><FontWeight>Bold</FontWeight><TextAlign>Right</TextAlign><Color>SteelBlue</Color></Style>
            </TextRun></TextRuns></Paragraph></Paragraphs>
            <Top>0in</Top><Left>4in</Left><Width>2.5in</Width><Height>0.5in</Height>
          </Textbox>

          <!-- Invoice Number and Date -->
          <Textbox Name="InvoiceInfo">
            <Paragraphs>
              <Paragraph><TextRuns><TextRun>
                <Value>="Invoice #: " &amp; Fields!InvoiceID.Value</Value>
                <Style><FontSize>9pt</FontSize><TextAlign>Right</TextAlign></Style>
              </TextRun></TextRuns></Paragraph>
              <Paragraph><TextRuns><TextRun>
                <Value>="Date: " &amp; Format(Fields!InvoiceDate.Value, "MMMM dd, yyyy")</Value>
                <Style><FontSize>9pt</FontSize><TextAlign>Right</TextAlign></Style>
              </TextRun></TextRuns></Paragraph>
              <Paragraph><TextRuns><TextRun>
                <Value>="Due: " &amp; Format(Fields!DueDate.Value, "MMMM dd, yyyy")</Value>
                <Style><FontSize>9pt</FontSize><TextAlign>Right</TextAlign></Style>
              </TextRun></TextRuns></Paragraph>
            </Paragraphs>
            <Top>0.6in</Top><Left>4in</Left><Width>2.5in</Width><Height>0.6in</Height>
          </Textbox>

          <!-- Bill To -->
          <Textbox Name="BillToLabel">
            <Paragraphs><Paragraph><TextRuns><TextRun>
              <Value>Bill To:</Value>
              <Style><FontSize>9pt</FontSize><FontWeight>Bold</FontWeight></Style>
            </TextRun></TextRuns></Paragraph></Paragraphs>
            <Top>0.6in</Top><Left>0in</Left><Width>1in</Width><Height>0.25in</Height>
          </Textbox>
          <Textbox Name="BillToAddress">
            <Paragraphs>
              <Paragraph><TextRuns><TextRun>
                <Value>=First(Fields!CustomerName.Value)</Value>
                <Style><FontSize>9pt</FontSize><FontWeight>Bold</FontWeight></Style>
              </TextRun></TextRuns></Paragraph>
              <Paragraph><TextRuns><TextRun>
                <Value>=First(Fields!Address.Value)</Value>
                <Style><FontSize>9pt</FontSize></Style>
              </TextRun></TextRuns></Paragraph>
              <Paragraph><TextRuns><TextRun>
                <Value>=First(Fields!City.Value) &amp; ", " &amp; First(Fields!State.Value) &amp; " " &amp; First(Fields!PostalCode.Value)</Value>
                <Style><FontSize>9pt</FontSize></Style>
              </TextRun></TextRuns></Paragraph>
            </Paragraphs>
            <Top>0.85in</Top><Left>0in</Left><Width>3in</Width><Height>0.6in</Height>
          </Textbox>

          <!-- Line Items Table -->
          <Tablix Name="LineItemsTable">
            <TablixBody>
              <TablixColumns>
                <TablixColumn><Width>0.5in</Width></TablixColumn>
                <TablixColumn><Width>3in</Width></TablixColumn>
                <TablixColumn><Width>1in</Width></TablixColumn>
                <TablixColumn><Width>1in</Width></TablixColumn>
                <TablixColumn><Width>1in</Width></TablixColumn>
              </TablixColumns>
              <TablixRows>
                <!-- Header Row -->
                <TablixRow>
                  <Height>0.3in</Height>
                  <TablixCells>
                    <TablixCell><CellContents><Textbox Name="H_Line"><Paragraphs><Paragraph><TextRuns><TextRun><Value>#</Value><Style><FontWeight>Bold</FontWeight><Color>White</Color></Style></TextRun></TextRuns></Paragraph></Paragraphs><Style><BackgroundColor>SteelBlue</BackgroundColor><PaddingLeft>4pt</PaddingLeft></Style></Textbox></CellContents></TablixCell>
                    <TablixCell><CellContents><Textbox Name="H_Product"><Paragraphs><Paragraph><TextRuns><TextRun><Value>Product</Value><Style><FontWeight>Bold</FontWeight><Color>White</Color></Style></TextRun></TextRuns></Paragraph></Paragraphs><Style><BackgroundColor>SteelBlue</BackgroundColor><PaddingLeft>4pt</PaddingLeft></Style></Textbox></CellContents></TablixCell>
                    <TablixCell><CellContents><Textbox Name="H_Qty"><Paragraphs><Paragraph><TextRuns><TextRun><Value>Qty</Value><Style><FontWeight>Bold</FontWeight><Color>White</Color><TextAlign>Right</TextAlign></Style></TextRun></TextRuns></Paragraph></Paragraphs><Style><BackgroundColor>SteelBlue</BackgroundColor><PaddingRight>4pt</PaddingRight></Style></Textbox></CellContents></TablixCell>
                    <TablixCell><CellContents><Textbox Name="H_Price"><Paragraphs><Paragraph><TextRuns><TextRun><Value>Unit Price</Value><Style><FontWeight>Bold</FontWeight><Color>White</Color><TextAlign>Right</TextAlign></Style></TextRun></TextRuns></Paragraph></Paragraphs><Style><BackgroundColor>SteelBlue</BackgroundColor><PaddingRight>4pt</PaddingRight></Style></Textbox></CellContents></TablixCell>
                    <TablixCell><CellContents><Textbox Name="H_Total"><Paragraphs><Paragraph><TextRuns><TextRun><Value>Total</Value><Style><FontWeight>Bold</FontWeight><Color>White</Color><TextAlign>Right</TextAlign></Style></TextRun></TextRuns></Paragraph></Paragraphs><Style><BackgroundColor>SteelBlue</BackgroundColor><PaddingRight>4pt</PaddingRight></Style></Textbox></CellContents></TablixCell>
                  </TablixCells>
                </TablixRow>
                <!-- Detail Row -->
                <TablixRow>
                  <Height>0.25in</Height>
                  <TablixCells>
                    <TablixCell><CellContents><Textbox Name="D_Line"><Paragraphs><Paragraph><TextRuns><TextRun><Value>=Fields!LineNumber.Value</Value></TextRun></TextRuns></Paragraph></Paragraphs><Style><PaddingLeft>4pt</PaddingLeft><BackgroundColor>=IIF(RowNumber(Nothing) Mod 2 = 0, "WhiteSmoke", "White")</BackgroundColor></Style></Textbox></CellContents></TablixCell>
                    <TablixCell><CellContents><Textbox Name="D_Product"><Paragraphs><Paragraph><TextRuns><TextRun><Value>=Fields!ProductName.Value</Value></TextRun></TextRuns></Paragraph></Paragraphs><Style><PaddingLeft>4pt</PaddingLeft><BackgroundColor>=IIF(RowNumber(Nothing) Mod 2 = 0, "WhiteSmoke", "White")</BackgroundColor></Style></Textbox></CellContents></TablixCell>
                    <TablixCell><CellContents><Textbox Name="D_Qty"><Paragraphs><Paragraph><TextRuns><TextRun><Value>=Fields!Quantity.Value</Value><Style><TextAlign>Right</TextAlign><Format>N0</Format></Style></TextRun></TextRuns></Paragraph></Paragraphs><Style><PaddingRight>4pt</PaddingRight><BackgroundColor>=IIF(RowNumber(Nothing) Mod 2 = 0, "WhiteSmoke", "White")</BackgroundColor></Style></Textbox></CellContents></TablixCell>
                    <TablixCell><CellContents><Textbox Name="D_Price"><Paragraphs><Paragraph><TextRuns><TextRun><Value>=Fields!UnitPrice.Value</Value><Style><TextAlign>Right</TextAlign><Format>C2</Format></Style></TextRun></TextRuns></Paragraph></Paragraphs><Style><PaddingRight>4pt</PaddingRight><BackgroundColor>=IIF(RowNumber(Nothing) Mod 2 = 0, "WhiteSmoke", "White")</BackgroundColor></Style></Textbox></CellContents></TablixCell>
                    <TablixCell><CellContents><Textbox Name="D_Total"><Paragraphs><Paragraph><TextRuns><TextRun><Value>=Fields!LineTotal.Value</Value><Style><TextAlign>Right</TextAlign><Format>C2</Format></Style></TextRun></TextRuns></Paragraph></Paragraphs><Style><PaddingRight>4pt</PaddingRight><BackgroundColor>=IIF(RowNumber(Nothing) Mod 2 = 0, "WhiteSmoke", "White")</BackgroundColor></Style></Textbox></CellContents></TablixCell>
                  </TablixCells>
                </TablixRow>
              </TablixRows>
            </TablixBody>
            <TablixColumnHierarchy><TablixMembers><TablixMember/><TablixMember/><TablixMember/><TablixMember/><TablixMember/></TablixMembers></TablixColumnHierarchy>
            <TablixRowHierarchy>
              <TablixMembers>
                <TablixMember><KeepWithGroup>After</KeepWithGroup><RepeatOnNewPage>true</RepeatOnNewPage></TablixMember>
                <TablixMember><Group Name="Details"/></TablixMember>
              </TablixMembers>
            </TablixRowHierarchy>
            <DataSetName>InvoiceData</DataSetName>
            <Top>1.7in</Top><Left>0in</Left><Height>0.55in</Height><Width>6.5in</Width>
          </Tablix>

          <!-- Totals -->
          <Textbox Name="SubTotalLabel">
            <Paragraphs><Paragraph><TextRuns><TextRun><Value>Subtotal:</Value><Style><FontWeight>Bold</FontWeight><TextAlign>Right</TextAlign></Style></TextRun></TextRuns></Paragraph></Paragraphs>
            <Top>2.4in</Top><Left>4in</Left><Width>1.5in</Width><Height>0.25in</Height>
          </Textbox>
          <Textbox Name="SubTotalValue">
            <Paragraphs><Paragraph><TextRuns><TextRun><Value>=First(Fields!SubTotal.Value)</Value><Style><TextAlign>Right</TextAlign><Format>C2</Format></Style></TextRun></TextRuns></Paragraph></Paragraphs>
            <Top>2.4in</Top><Left>5.5in</Left><Width>1in</Width><Height>0.25in</Height>
          </Textbox>
          <Textbox Name="TaxLabel">
            <Paragraphs><Paragraph><TextRuns><TextRun><Value>Tax:</Value><Style><TextAlign>Right</TextAlign></Style></TextRun></TextRuns></Paragraph></Paragraphs>
            <Top>2.65in</Top><Left>4in</Left><Width>1.5in</Width><Height>0.25in</Height>
          </Textbox>
          <Textbox Name="TaxValue">
            <Paragraphs><Paragraph><TextRuns><TextRun><Value>=First(Fields!TaxAmount.Value)</Value><Style><TextAlign>Right</TextAlign><Format>C2</Format></Style></TextRun></TextRuns></Paragraph></Paragraphs>
            <Top>2.65in</Top><Left>5.5in</Left><Width>1in</Width><Height>0.25in</Height>
          </Textbox>
          <Textbox Name="GrandTotalLabel">
            <Paragraphs><Paragraph><TextRuns><TextRun><Value>TOTAL:</Value><Style><FontSize>12pt</FontSize><FontWeight>Bold</FontWeight><TextAlign>Right</TextAlign></Style></TextRun></TextRuns></Paragraph></Paragraphs>
            <Top>2.95in</Top><Left>4in</Left><Width>1.5in</Width><Height>0.3in</Height>
            <Style><TopBorder><Style>Solid</Style><Width>2pt</Width></TopBorder></Style>
          </Textbox>
          <Textbox Name="GrandTotalValue">
            <Paragraphs><Paragraph><TextRuns><TextRun><Value>=First(Fields!TotalAmount.Value)</Value><Style><FontSize>12pt</FontSize><FontWeight>Bold</FontWeight><TextAlign>Right</TextAlign><Format>C2</Format></Style></TextRun></TextRuns></Paragraph></Paragraphs>
            <Top>2.95in</Top><Left>5.5in</Left><Width>1in</Width><Height>0.3in</Height>
            <Style><TopBorder><Style>Solid</Style><Width>2pt</Width></TopBorder></Style>
          </Textbox>
        </ReportItems>
        <Height>3.5in</Height>
      </Body>
      <Width>6.5in</Width>
      <Page>
        <PageHeader>
          <Height>0in</Height>
          <PrintOnFirstPage>false</PrintOnFirstPage>
          <PrintOnLastPage>false</PrintOnLastPage>
        </PageHeader>
        <PageFooter>
          <Height>0.5in</Height>
          <PrintOnFirstPage>true</PrintOnFirstPage>
          <PrintOnLastPage>true</PrintOnLastPage>
          <ReportItems>
            <Textbox Name="FooterText">
              <Paragraphs><Paragraph><TextRuns><TextRun>
                <Value>="Thank you for your business! | Page " &amp; Globals!PageNumber &amp; " of " &amp; Globals!TotalPages</Value>
                <Style><FontSize>8pt</FontSize><Color>Gray</Color><TextAlign>Center</TextAlign></Style>
              </TextRun></TextRuns></Paragraph></Paragraphs>
              <Top>0.1in</Top><Left>0in</Left><Width>6.5in</Width><Height>0.25in</Height>
            </Textbox>
          </ReportItems>
        </PageFooter>
        <PageHeight>11in</PageHeight>
        <PageWidth>8.5in</PageWidth>
        <LeftMargin>1in</LeftMargin>
        <RightMargin>1in</RightMargin>
        <TopMargin>0.75in</TopMargin>
        <BottomMargin>0.75in</BottomMargin>
      </Page>
    </ReportSection>
  </ReportSections>
  <rd:ReportUnitType>Inch</rd:ReportUnitType>
</Report>
```

## 2. Tabular List Report

Employee directory with department grouping, subtotals, and alternating row colors.

```xml
<?xml version="1.0" encoding="utf-8"?>
<Report xmlns="http://schemas.microsoft.com/sqlserver/reporting/2016/01/reportdefinition"
        xmlns:rd="http://schemas.microsoft.com/SQLServer/reporting/reportdesigner">
  <Description>Employee directory grouped by department</Description>

  <DataSources>
    <DataSource Name="HRDatabase">
      <ConnectionProperties>
        <DataProvider>SQL</DataProvider>
        <ConnectString>Data Source=hr.datawarehouse.fabric.microsoft.com;Initial Catalog=HRDB</ConnectString>
        <IntegratedSecurity>true</IntegratedSecurity>
      </ConnectionProperties>
    </DataSource>
  </DataSources>

  <DataSets>
    <DataSet Name="Employees">
      <Query>
        <DataSourceName>HRDatabase</DataSourceName>
        <QueryParameters>
          <QueryParameter Name="@Department"><Value>=Parameters!Department.Value</Value></QueryParameter>
        </QueryParameters>
        <CommandType>Text</CommandType>
        <CommandText>
          SELECT e.EmployeeID, e.FirstName, e.LastName, e.Title, e.Email,
                 e.HireDate, e.Salary, d.DepartmentName
          FROM dbo.Employees e
          INNER JOIN dbo.Departments d ON e.DepartmentID = d.DepartmentID
          WHERE (@Department = 'All' OR d.DepartmentName = @Department)
          ORDER BY d.DepartmentName, e.LastName, e.FirstName
        </CommandText>
      </Query>
      <Fields>
        <Field Name="EmployeeID"><DataField>EmployeeID</DataField><rd:TypeName>System.Int32</rd:TypeName></Field>
        <Field Name="FirstName"><DataField>FirstName</DataField><rd:TypeName>System.String</rd:TypeName></Field>
        <Field Name="LastName"><DataField>LastName</DataField><rd:TypeName>System.String</rd:TypeName></Field>
        <Field Name="Title"><DataField>Title</DataField><rd:TypeName>System.String</rd:TypeName></Field>
        <Field Name="Email"><DataField>Email</DataField><rd:TypeName>System.String</rd:TypeName></Field>
        <Field Name="HireDate"><DataField>HireDate</DataField><rd:TypeName>System.DateTime</rd:TypeName></Field>
        <Field Name="Salary"><DataField>Salary</DataField><rd:TypeName>System.Decimal</rd:TypeName></Field>
        <Field Name="DepartmentName"><DataField>DepartmentName</DataField><rd:TypeName>System.String</rd:TypeName></Field>
      </Fields>
    </DataSet>
  </DataSets>

  <ReportParameters>
    <ReportParameter Name="Department">
      <DataType>String</DataType>
      <Prompt>Department</Prompt>
      <DefaultValue><Values><Value>All</Value></Values></DefaultValue>
      <ValidValues>
        <ParameterValues>
          <ParameterValue><Value>All</Value><Label>All Departments</Label></ParameterValue>
          <ParameterValue><Value>Engineering</Value><Label>Engineering</Label></ParameterValue>
          <ParameterValue><Value>Sales</Value><Label>Sales</Label></ParameterValue>
          <ParameterValue><Value>Marketing</Value><Label>Marketing</Label></ParameterValue>
          <ParameterValue><Value>Finance</Value><Label>Finance</Label></ParameterValue>
          <ParameterValue><Value>HR</Value><Label>Human Resources</Label></ParameterValue>
        </ParameterValues>
      </ValidValues>
    </ReportParameter>
  </ReportParameters>

  <!-- Body with Tablix containing department groups -->
  <!-- Pattern: Group header with department name + count -->
  <!-- Detail rows: Name, Title, Email, Hire Date, Salary -->
  <!-- Group footer: Average salary, headcount -->
  <!-- Grand total footer: Total headcount, average salary -->

  <ReportSections>
    <ReportSection>
      <Body>
        <ReportItems>
          <Textbox Name="ReportTitle">
            <Paragraphs><Paragraph><TextRuns><TextRun>
              <Value>Employee Directory</Value>
              <Style><FontSize>16pt</FontSize><FontWeight>Bold</FontWeight></Style>
            </TextRun></TextRuns></Paragraph></Paragraphs>
            <Top>0in</Top><Left>0in</Left><Width>6.5in</Width><Height>0.4in</Height>
          </Textbox>
          <Textbox Name="FilterInfo">
            <Paragraphs><Paragraph><TextRuns><TextRun>
              <Value>="Department: " &amp; Parameters!Department.Value &amp; " | Generated: " &amp; Format(Today(), "MMMM dd, yyyy")</Value>
              <Style><FontSize>9pt</FontSize><Color>Gray</Color></Style>
            </TextRun></TextRuns></Paragraph></Paragraphs>
            <Top>0.4in</Top><Left>0in</Left><Width>6.5in</Width><Height>0.25in</Height>
          </Textbox>
          <!-- Tablix omitted for brevity — follows same Tablix pattern as invoice -->
          <!-- with TablixRowHierarchy containing DepartmentGroup > Details -->
        </ReportItems>
        <Height>5in</Height>
      </Body>
      <Width>6.5in</Width>
      <Page>
        <PageHeader>
          <Height>0.5in</Height>
          <PrintOnFirstPage>true</PrintOnFirstPage>
          <PrintOnLastPage>true</PrintOnLastPage>
          <ReportItems>
            <Textbox Name="HeaderPageNum">
              <Paragraphs><Paragraph><TextRuns><TextRun>
                <Value>="Page " &amp; Globals!PageNumber &amp; " of " &amp; Globals!TotalPages</Value>
                <Style><FontSize>8pt</FontSize><TextAlign>Right</TextAlign><Color>Gray</Color></Style>
              </TextRun></TextRuns></Paragraph></Paragraphs>
              <Top>0.1in</Top><Left>4.5in</Left><Width>2in</Width><Height>0.25in</Height>
            </Textbox>
          </ReportItems>
        </PageHeader>
        <PageHeight>11in</PageHeight>
        <PageWidth>8.5in</PageWidth>
        <LeftMargin>1in</LeftMargin>
        <RightMargin>1in</RightMargin>
        <TopMargin>0.5in</TopMargin>
        <BottomMargin>0.5in</BottomMargin>
      </Page>
    </ReportSection>
  </ReportSections>
  <rd:ReportUnitType>Inch</rd:ReportUnitType>
</Report>
```

## 3. Matrix Cross-Tab Report

Sales by region (rows) and quarter (columns) with row/column totals.

Key RDL elements for a matrix:

```xml
<!-- Matrix-specific TablixRowHierarchy -->
<TablixRowHierarchy>
  <TablixMembers>
    <!-- Static corner cell -->
    <TablixMember/>
    <!-- Row group: Region -->
    <TablixMember>
      <Group Name="RegionGroup">
        <GroupExpressions>
          <GroupExpression>=Fields!Region.Value</GroupExpression>
        </GroupExpressions>
      </Group>
      <SortExpressions>
        <SortExpression>
          <Value>=Fields!Region.Value</Value>
          <Direction>Ascending</Direction>
        </SortExpression>
      </SortExpressions>
    </TablixMember>
    <!-- Total row -->
    <TablixMember>
      <KeepWithGroup>Before</KeepWithGroup>
    </TablixMember>
  </TablixMembers>
</TablixRowHierarchy>

<!-- Matrix-specific TablixColumnHierarchy -->
<TablixColumnHierarchy>
  <TablixMembers>
    <!-- Row header column (static) -->
    <TablixMember/>
    <!-- Column group: Quarter -->
    <TablixMember>
      <Group Name="QuarterGroup">
        <GroupExpressions>
          <GroupExpression>=Fields!Quarter.Value</GroupExpression>
        </GroupExpressions>
      </Group>
      <SortExpressions>
        <SortExpression>
          <Value>=Fields!Quarter.Value</Value>
          <Direction>Ascending</Direction>
        </SortExpression>
      </SortExpressions>
    </TablixMember>
    <!-- Total column -->
    <TablixMember/>
  </TablixMembers>
</TablixColumnHierarchy>
```

Data cells use expressions scoped to the intersection:
```vb
' Cell value (intersection of row and column groups)
=Sum(Fields!Amount.Value)

' Row total (all quarters for this region)
=Sum(Fields!Amount.Value, "RegionGroup")

' Column total (all regions for this quarter)
=Sum(Fields!Amount.Value, "QuarterGroup")

' Grand total (all data)
=Sum(Fields!Amount.Value)
```

## 4. Subreport Pattern

Parent report showing orders with an embedded subreport for order details.

### Parent Report Data Set

```sql
SELECT OrderID, OrderDate, CustomerName, TotalAmount
FROM dbo.Orders
WHERE OrderDate BETWEEN @StartDate AND @EndDate
ORDER BY OrderDate DESC
```

### Subreport Reference in Parent

```xml
<Subreport Name="OrderDetailsSubreport">
  <ReportName>OrderLineItems</ReportName>
  <Parameters>
    <Parameter Name="OrderID">
      <Value>=Fields!OrderID.Value</Value>
    </Parameter>
  </Parameters>
  <Top>0in</Top><Left>0.5in</Left><Height>2in</Height><Width>5.5in</Width>
  <Style><Border><Style>None</Style></Border></Style>
  <NoRowsMessage>No line items found.</NoRowsMessage>
</Subreport>
```

### Child Report (OrderLineItems.rdl)

Accepts `@OrderID` parameter and queries line items:

```sql
SELECT ProductName, Quantity, UnitPrice, Quantity * UnitPrice AS LineTotal
FROM dbo.OrderDetails
WHERE OrderID = @OrderID
ORDER BY ProductName
```

### Performance Note

For reports showing many orders, each subreport instance opens a separate connection and runs a separate query. If you have 100 orders, that's 100 subreport query executions. Consider using Lookup/LookupSet instead:

```vb
' Alternative to subreport — use LookupSet
=Join(
  LookupSet(
    Fields!OrderID.Value,
    Fields!OrderID.Value,
    Fields!ProductName.Value & " (x" & CStr(Fields!Quantity.Value) & ")",
    "AllOrderDetails"
  ),
  ", "
)
```

This requires a single dataset `AllOrderDetails` that fetches all line items for the date range, then uses LookupSet to match by OrderID.
