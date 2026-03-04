# RDL Structure Reference

## XML Schema Overview

RDL files conform to the Report Definition Language schema. The root element declares the namespace:

```xml
<?xml version="1.0" encoding="utf-8"?>
<Report xmlns="http://schemas.microsoft.com/sqlserver/reporting/2016/01/reportdefinition"
        xmlns:rd="http://schemas.microsoft.com/SQLServer/reporting/reportdesigner">
```

### Schema Versions

| Version | Namespace Year | Tool Support |
|---------|---------------|--------------|
| RDL 2016 | `2016/01` | Report Builder 15.x, SSRS 2016+, Power BI Service |
| RDL 2010 | `2010/01` | SSRS 2012–2014, Report Builder 3.0 |
| RDL 2008 | `2008/01` | SSRS 2008/R2 |

Always use the 2016 namespace for new Fabric reports. Older schemas auto-upgrade on import.

## Top-Level Element Hierarchy

```xml
<Report>
  <Description>Report description</Description>
  <Author>Author name</Author>
  <AutoRefresh>0</AutoRefresh>
  <DataSources>...</DataSources>
  <DataSets>...</DataSets>
  <ReportParameters>...</ReportParameters>
  <ReportSections>
    <ReportSection>
      <Body>...</Body>
      <Width>6.5in</Width>
      <Page>
        <PageHeader>...</PageHeader>
        <PageFooter>...</PageFooter>
        <PageHeight>11in</PageHeight>
        <PageWidth>8.5in</PageWidth>
        <LeftMargin>1in</LeftMargin>
        <RightMargin>1in</RightMargin>
        <TopMargin>1in</TopMargin>
        <BottomMargin>1in</BottomMargin>
        <ColumnSpacing>0.13in</ColumnSpacing>
      </Page>
    </ReportSection>
  </ReportSections>
  <ReportParametersLayout>...</ReportParametersLayout>
  <rd:ReportUnitType>Inch</rd:ReportUnitType>
  <rd:ReportServerUrl>https://app.powerbi.com</rd:ReportServerUrl>
</Report>
```

## DataSources Element

```xml
<DataSources>
  <DataSource Name="FabricWarehouse">
    <ConnectionProperties>
      <DataProvider>SQL</DataProvider>
      <ConnectString>Data Source=xyz.datawarehouse.fabric.microsoft.com;Initial Catalog=MyWarehouse</ConnectString>
      <IntegratedSecurity>true</IntegratedSecurity>
    </ConnectionProperties>
    <rd:SecurityType>Integrated</rd:SecurityType>
    <rd:DataSourceID>a1b2c3d4-...</rd:DataSourceID>
  </DataSource>
</DataSources>
```

### DataProvider Values

| Provider | Use |
|----------|-----|
| `SQL` | SQL Server, Azure SQL, Fabric Warehouse, Lakehouse SQL endpoint |
| `OLEDB` | OLE DB connections (legacy) |
| `ODBC` | ODBC connections |
| `ORACLE` | Oracle databases |
| `ESSBASE` | Hyperion Essbase (rare) |
| `SAPBW` | SAP BW (rare) |
| `PBIDATASET` | Power BI semantic model (dataset) connection |

### Shared Data Source Reference

```xml
<DataSource Name="SharedDSRef">
  <DataSourceReference>SharedDataSourceName</DataSourceReference>
  <rd:DataSourceID>...</rd:DataSourceID>
</DataSource>
```

## DataSets Element

```xml
<DataSets>
  <DataSet Name="SalesData">
    <Query>
      <DataSourceName>FabricWarehouse</DataSourceName>
      <QueryParameters>
        <QueryParameter Name="@Region">
          <Value>=Parameters!Region.Value</Value>
        </QueryParameter>
      </QueryParameters>
      <CommandType>Text</CommandType>
      <CommandText>
        SELECT OrderID, CustomerName, Amount, OrderDate
        FROM dbo.Sales
        WHERE Region = @Region
      </CommandText>
      <rd:UseGenericDesigner>true</rd:UseGenericDesigner>
    </Query>
    <Fields>
      <Field Name="OrderID">
        <DataField>OrderID</DataField>
        <rd:TypeName>System.Int32</rd:TypeName>
      </Field>
      <Field Name="CustomerName">
        <DataField>CustomerName</DataField>
        <rd:TypeName>System.String</rd:TypeName>
      </Field>
      <Field Name="Amount">
        <DataField>Amount</DataField>
        <rd:TypeName>System.Decimal</rd:TypeName>
      </Field>
      <Field Name="OrderDate">
        <DataField>OrderDate</DataField>
        <rd:TypeName>System.DateTime</rd:TypeName>
      </Field>
    </Fields>
  </DataSet>
</DataSets>
```

### CommandType Values

- `Text` — SQL query text (default, most common)
- `StoredProcedure` — Stored procedure name (parameters passed automatically)
- `TableDirect` — Full table read (rare, used with OLE DB)

### Calculated Fields

```xml
<Field Name="TotalWithTax">
  <Value>=Fields!Amount.Value * 1.2</Value>
  <rd:TypeName>System.Decimal</rd:TypeName>
</Field>
```

## ReportParameters Element

```xml
<ReportParameters>
  <ReportParameter Name="Region">
    <DataType>String</DataType>
    <Prompt>Select Region</Prompt>
    <DefaultValue>
      <Values>
        <Value>North</Value>
      </Values>
    </DefaultValue>
    <ValidValues>
      <DataSetReference>
        <DataSetName>RegionList</DataSetName>
        <ValueField>RegionCode</ValueField>
        <LabelField>RegionName</LabelField>
      </DataSetReference>
    </ValidValues>
    <AllowBlank>false</AllowBlank>
    <MultiValue>false</MultiValue>
  </ReportParameter>
  <ReportParameter Name="StartDate">
    <DataType>DateTime</DataType>
    <Prompt>Start Date</Prompt>
    <DefaultValue>
      <Values>
        <Value>=DateAdd(DateInterval.Month, -1, Today())</Value>
      </Values>
    </DefaultValue>
  </ReportParameter>
</ReportParameters>
```

### Parameter DataType Values

`String`, `Boolean`, `DateTime`, `Integer`, `Float`

### Multi-Value Parameters

Set `<MultiValue>true</MultiValue>`. In queries, use `IN` with `=Join(Parameters!Region.Value, ",")` or use a table-valued parameter.

### Cascading Parameters

Parameter B depends on Parameter A when B's ValidValues dataset uses A as a query parameter. Order parameters in the XML so dependents come after their parents.

### Hidden Parameters

```xml
<ReportParameter Name="InternalFlag">
  <DataType>String</DataType>
  <DefaultValue><Values><Value>true</Value></Values></DefaultValue>
  <Hidden>true</Hidden>
</ReportParameter>
```

## Body Element

```xml
<Body>
  <ReportItems>
    <!-- Tables, matrices, charts, textboxes, etc. -->
  </ReportItems>
  <Height>7.5in</Height>
</Body>
```

### Tablix Element (Table/Matrix/List)

```xml
<Tablix Name="SalesTable">
  <TablixBody>
    <TablixColumns>
      <TablixColumn><Width>1.5in</Width></TablixColumn>
      <TablixColumn><Width>2in</Width></TablixColumn>
      <TablixColumn><Width>1.5in</Width></TablixColumn>
    </TablixColumns>
    <TablixRows>
      <TablixRow>
        <Height>0.25in</Height>
        <TablixCells>
          <TablixCell>
            <CellContents>
              <Textbox Name="HeaderOrderID">
                <Paragraphs><Paragraph><TextRuns><TextRun>
                  <Value>Order ID</Value>
                  <Style><FontWeight>Bold</FontWeight></Style>
                </TextRun></TextRuns></Paragraph></Paragraphs>
              </Textbox>
            </CellContents>
          </TablixCell>
          <!-- More header cells -->
        </TablixCells>
      </TablixRow>
      <TablixRow>
        <Height>0.25in</Height>
        <TablixCells>
          <TablixCell>
            <CellContents>
              <Textbox Name="OrderID">
                <Paragraphs><Paragraph><TextRuns><TextRun>
                  <Value>=Fields!OrderID.Value</Value>
                </TextRun></TextRuns></Paragraph></Paragraphs>
              </Textbox>
            </CellContents>
          </TablixCell>
          <!-- More detail cells -->
        </TablixCells>
      </TablixRow>
    </TablixRows>
  </TablixBody>
  <TablixColumnHierarchy>
    <TablixMembers>
      <TablixMember/>
      <TablixMember/>
      <TablixMember/>
    </TablixMembers>
  </TablixColumnHierarchy>
  <TablixRowHierarchy>
    <TablixMembers>
      <TablixMember>
        <KeepWithGroup>After</KeepWithGroup>
        <RepeatOnNewPage>true</RepeatOnNewPage>
      </TablixMember>
      <TablixMember>
        <Group Name="Details"/>
      </TablixMember>
    </TablixMembers>
  </TablixRowHierarchy>
  <DataSetName>SalesData</DataSetName>
</Tablix>
```

### Row Grouping (for Table)

```xml
<TablixRowHierarchy>
  <TablixMembers>
    <TablixMember><!-- Header row --></TablixMember>
    <TablixMember>
      <Group Name="RegionGroup">
        <GroupExpressions>
          <GroupExpression>=Fields!Region.Value</GroupExpression>
        </GroupExpressions>
        <PageBreak><BreakLocation>Between</BreakLocation></PageBreak>
      </Group>
      <SortExpressions>
        <SortExpression>
          <Value>=Fields!Region.Value</Value>
          <Direction>Ascending</Direction>
        </SortExpression>
      </SortExpressions>
      <TablixMembers>
        <TablixMember><!-- Group header row --></TablixMember>
        <TablixMember>
          <Group Name="Details"/>
        </TablixMember>
        <TablixMember><!-- Group footer row --></TablixMember>
      </TablixMembers>
    </TablixMember>
  </TablixMembers>
</TablixRowHierarchy>
```

### Column Grouping (for Matrix)

```xml
<TablixColumnHierarchy>
  <TablixMembers>
    <TablixMember><!-- Row label column --></TablixMember>
    <TablixMember>
      <Group Name="YearGroup">
        <GroupExpressions>
          <GroupExpression>=Fields!Year.Value</GroupExpression>
        </GroupExpressions>
      </Group>
    </TablixMember>
  </TablixMembers>
</TablixColumnHierarchy>
```

### Chart Element

```xml
<Chart Name="SalesChart">
  <ChartCategoryHierarchy>
    <ChartMembers>
      <ChartMember>
        <Group Name="CategoryGroup">
          <GroupExpressions>
            <GroupExpression>=Fields!Category.Value</GroupExpression>
          </GroupExpressions>
        </Group>
      </ChartMember>
    </ChartMembers>
  </ChartCategoryHierarchy>
  <ChartSeriesHierarchy>
    <ChartMembers>
      <ChartMember>
        <Group Name="SeriesGroup">
          <GroupExpressions>
            <GroupExpression>=Fields!Region.Value</GroupExpression>
          </GroupExpressions>
        </Group>
      </ChartMember>
    </ChartMembers>
  </ChartSeriesHierarchy>
  <ChartData>
    <ChartSeriesCollection>
      <ChartSeries Name="Amount">
        <ChartDataPoints>
          <ChartDataPoint>
            <ChartDataPointValues>
              <Y>=Sum(Fields!Amount.Value)</Y>
            </ChartDataPointValues>
          </ChartDataPoint>
        </ChartDataPoints>
        <Type>Column</Type>
      </ChartSeries>
    </ChartSeriesCollection>
  </ChartData>
  <ChartAreas>
    <ChartArea Name="Default">
      <ChartCategoryAxes>
        <ChartAxis Name="Primary">
          <Style><FontSize>8pt</FontSize></Style>
          <ChartAxisTitle><Caption>Category</Caption></ChartAxisTitle>
        </ChartAxis>
      </ChartCategoryAxes>
      <ChartValueAxes>
        <ChartAxis Name="Primary">
          <Style><Format>C0</Format></Style>
          <ChartAxisTitle><Caption>Sales Amount</Caption></ChartAxisTitle>
        </ChartAxis>
      </ChartValueAxes>
    </ChartArea>
  </ChartAreas>
  <DataSetName>SalesData</DataSetName>
</Chart>
```

### Subreport Element

```xml
<Subreport Name="OrderDetailSubreport">
  <ReportName>OrderDetail</ReportName>
  <Parameters>
    <Parameter Name="OrderID">
      <Value>=Fields!OrderID.Value</Value>
    </Parameter>
  </Parameters>
  <Top>0in</Top>
  <Left>0in</Left>
  <Height>3in</Height>
  <Width>6.5in</Width>
  <Style><Border><Style>None</Style></Border></Style>
</Subreport>
```

### Image Element

```xml
<Image Name="CompanyLogo">
  <Source>Embedded</Source>
  <Value>LogoImage</Value>
  <MIMEType>image/png</MIMEType>
  <Sizing>FitProportional</Sizing>
</Image>
```

Source values: `Embedded`, `External` (URL), `Database` (field containing bytes).

## Page Header / Footer

```xml
<PageHeader>
  <Height>1in</Height>
  <PrintOnFirstPage>true</PrintOnFirstPage>
  <PrintOnLastPage>true</PrintOnLastPage>
  <ReportItems>
    <Textbox Name="ReportTitle">
      <Paragraphs><Paragraph><TextRuns><TextRun>
        <Value>="Monthly Sales Report - " &amp; Format(Parameters!ReportMonth.Value, "MMMM yyyy")</Value>
        <Style><FontSize>14pt</FontSize><FontWeight>Bold</FontWeight></Style>
      </TextRun></TextRuns></Paragraph></Paragraphs>
      <Top>0.25in</Top><Left>0in</Left><Width>4in</Width><Height>0.4in</Height>
    </Textbox>
    <Textbox Name="PageNumber">
      <Paragraphs><Paragraph><TextRuns><TextRun>
        <Value>="Page " &amp; Globals!PageNumber &amp; " of " &amp; Globals!TotalPages</Value>
        <Style><TextAlign>Right</TextAlign></Style>
      </TextRun></TextRuns></Paragraph></Paragraphs>
      <Top>0.25in</Top><Left>4.5in</Left><Width>2in</Width><Height>0.25in</Height>
    </Textbox>
  </ReportItems>
</PageHeader>
```

## Style Element

Applied to any report item:

```xml
<Style>
  <Border>
    <Color>Black</Color>
    <Style>Solid</Style>
    <Width>1pt</Width>
  </Border>
  <TopBorder><Style>Solid</Style></TopBorder>
  <BottomBorder><Style>Solid</Style></BottomBorder>
  <BackgroundColor>=IIF(RowNumber(Nothing) Mod 2 = 0, "WhiteSmoke", "White")</BackgroundColor>
  <FontFamily>Segoe UI</FontFamily>
  <FontSize>9pt</FontSize>
  <FontWeight>Normal</FontWeight>
  <FontStyle>Normal</FontStyle>
  <Color>Black</Color>
  <TextAlign>Left</TextAlign>
  <VerticalAlign>Middle</VerticalAlign>
  <PaddingLeft>2pt</PaddingLeft>
  <PaddingRight>2pt</PaddingRight>
  <PaddingTop>2pt</PaddingTop>
  <PaddingBottom>2pt</PaddingBottom>
  <Format>C2</Format>
</Style>
```

### Common Format Strings

| Format | Output | Use |
|--------|--------|-----|
| `C2` | $1,234.56 | Currency |
| `N0` | 1,235 | Number no decimals |
| `N2` | 1,234.56 | Number with decimals |
| `P1` | 85.3% | Percentage |
| `d` | 3/15/2025 | Short date |
| `D` | March 15, 2025 | Long date |
| `yyyy-MM-dd` | 2025-03-15 | ISO date |
| `HH:mm:ss` | 14:30:00 | 24-hour time |

## Visibility and Toggle

```xml
<Visibility>
  <Hidden>=IIF(Parameters!ShowDetail.Value = "Yes", false, true)</Hidden>
  <ToggleItem>ToggleTextbox</ToggleItem>
</Visibility>
```

- `Hidden` — Expression or boolean. Evaluates at render time.
- `ToggleItem` — Name of a textbox that acts as expand/collapse control (shows +/- icon in interactive HTML).

## Bookmarks and Document Map

```xml
<Textbox Name="SectionHeader">
  <DocumentMapLabel>=Fields!Region.Value</DocumentMapLabel>
  <Bookmark>=Fields!Region.Value</Bookmark>
  ...
</Textbox>
```

- **DocumentMapLabel** — Creates a table-of-contents entry in the sidebar
- **Bookmark** — Creates a named anchor for cross-report navigation via `=Globals!ReportServerUrl & "/report?bookmarkId=" & ...`

## Actions (Drillthrough / URL / Bookmark)

```xml
<ActionInfo>
  <Actions>
    <Action>
      <Drillthrough>
        <ReportName>DetailReport</ReportName>
        <Parameters>
          <Parameter Name="OrderID">
            <Value>=Fields!OrderID.Value</Value>
          </Parameter>
        </Parameters>
      </Drillthrough>
    </Action>
  </Actions>
</ActionInfo>
```

### URL Action

```xml
<Action>
  <Hyperlink>="https://app.powerbi.com/groups/" &amp; Parameters!WorkspaceId.Value &amp; "/reports/" &amp; Fields!ReportId.Value</Hyperlink>
</Action>
```

### Bookmark Action

```xml
<Action>
  <BookmarkLink>=Fields!Region.Value</BookmarkLink>
</Action>
```

## EmbeddedImages Element

```xml
<EmbeddedImages>
  <EmbeddedImage Name="LogoImage">
    <MIMEType>image/png</MIMEType>
    <ImageData>iVBORw0KGgo...base64data...</ImageData>
  </EmbeddedImage>
</EmbeddedImages>
```

Place at the end of the Report element, after ReportSections.
