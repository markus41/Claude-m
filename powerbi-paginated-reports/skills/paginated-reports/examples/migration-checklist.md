# SSRS-to-Fabric Migration Checklist

Step-by-step migration guide with before/after examples.

## Pre-Migration Inventory Template

```
Report Name: ____________________________
SSRS Path: /Reports/Finance/MonthlyPnL
Status: [ ] Active  [ ] Inactive  [ ] Archive
Last Executed: 2025-02-28
Data Source: SQL Server (on-prem FINDB01)
Subscriptions: 3 (email)
Data-Driven Subscriptions: 0
Custom Assemblies: [ ] Yes  [x] No
CRIs (Custom Report Items): [ ] Yes  [x] No
Map Report Items: [ ] Yes  [x] No
Subreports: 2 (PnLDetail, PnLFootnotes)
Linked Reports: 0
Priority: [ ] Critical  [x] High  [ ] Medium  [ ] Low
Migration Complexity: [ ] Simple  [x] Moderate  [ ] Complex
```

## Phase 1: Data Source Conversion

### Before (SSRS On-Prem SQL Server)

```xml
<DataSource Name="FinanceDB">
  <ConnectionProperties>
    <DataProvider>SQL</DataProvider>
    <ConnectString>Data Source=FINDB01\PROD;Initial Catalog=FinanceDB</ConnectString>
    <IntegratedSecurity>true</IntegratedSecurity>
  </ConnectionProperties>
</DataSource>
```

### After — Option A: Fabric Warehouse (Recommended if data migrated)

```xml
<DataSource Name="FinanceDB">
  <ConnectionProperties>
    <DataProvider>SQL</DataProvider>
    <ConnectString>Data Source=abc123.datawarehouse.fabric.microsoft.com;Initial Catalog=FinanceWarehouse</ConnectString>
    <IntegratedSecurity>true</IntegratedSecurity>
  </ConnectionProperties>
</DataSource>
```

### After — Option B: On-Premises via Gateway (Data stays on-prem)

```xml
<!-- Keep connection string the same — bind to gateway after upload -->
<DataSource Name="FinanceDB">
  <ConnectionProperties>
    <DataProvider>SQL</DataProvider>
    <ConnectString>Data Source=FINDB01\PROD;Initial Catalog=FinanceDB</ConnectString>
    <IntegratedSecurity>true</IntegratedSecurity>
  </ConnectionProperties>
</DataSource>
```

Then in Power BI service:
1. Go to workspace > Report settings > Data source credentials
2. Select the gateway and map to the gateway data source
3. Enter SQL or Windows credentials

### After — Option C: Azure SQL (Lift and shift)

```xml
<DataSource Name="FinanceDB">
  <ConnectionProperties>
    <DataProvider>SQL</DataProvider>
    <ConnectString>Data Source=contoso-finance.database.windows.net;Initial Catalog=FinanceDB</ConnectString>
  </ConnectionProperties>
</DataSource>
```

Credentials stored in Power BI service (not in RDL).

## Phase 2: Query Adjustments

### Windows Authentication to Azure AD

**Before**: Uses Windows integrated auth (NTLM/Kerberos):
```sql
-- Works because SSRS service account has SQL access
SELECT * FROM dbo.Sales WHERE Region = @Region
```

**After**: No change to SQL, but credential binding changes:
- Power BI service uses stored credentials or Azure AD SSO
- Service principal needs db_datareader role on the database
- Or configure gateway with stored Windows credentials

### SSRS-Specific SQL Features to Check

```sql
-- Check 1: Temporal tables (supported in Fabric Warehouse)
SELECT * FROM dbo.Sales FOR SYSTEM_TIME AS OF @AsOfDate

-- Check 2: OPENQUERY (NOT supported in Fabric Lakehouse)
SELECT * FROM OPENQUERY(LinkedServer, 'SELECT ...')
-- Fix: Replace with direct connection to source

-- Check 3: Linked servers (NOT supported)
SELECT * FROM LinkedServer.DatabaseName.dbo.TableName
-- Fix: Create separate data source for each server

-- Check 4: XML operations (limited in Fabric)
SELECT col.value('(/root/item)[1]', 'VARCHAR(100)')
FROM dbo.XmlData
CROSS APPLY XmlColumn.nodes('/root') AS T(col)
-- Fix: Pre-process XML in ETL pipeline
```

## Phase 3: Feature Compatibility Fixes

### Custom Assembly → Custom Code Block

**Before** (external assembly reference):
```xml
<CodeModules>
  <CodeModule>Contoso.ReportHelpers, Version=1.0.0.0</CodeModule>
</CodeModules>
```

```vb
' Usage in expression
=Contoso.ReportHelpers.FormatUtils.FormatAccountNumber(Fields!AccountNum.Value)
```

**After** (inline custom code):
```vb
' Add to Report Properties > Code
Public Function FormatAccountNumber(ByVal acctNum As String) As String
    If acctNum Is Nothing OrElse acctNum.Length < 4 Then Return acctNum
    Return Left(acctNum, 4) & "-" & Mid(acctNum, 5, 4) & "-" & Right(acctNum, 4)
End Function
```

```vb
' Usage in expression (same, just different prefix)
=Code.FormatAccountNumber(Fields!AccountNum.Value)
```

### Map Report Item → Static Image or Chart

**Before** (SSRS Map):
```xml
<MapDataRegion Name="SalesMap">
  <MapViewport>...</MapViewport>
  <MapLayers>...</MapLayers>
</MapDataRegion>
```

**After** (Replace with chart or pre-rendered image):

Option 1 — Use a chart with geographic-style visualization:
```xml
<Chart Name="RegionalChart">
  <!-- Bar chart by region as substitute -->
  <ChartData>
    <ChartSeriesCollection>
      <ChartSeries Name="Sales">
        <ChartDataPoints>
          <ChartDataPoint>
            <ChartDataPointValues><Y>=Sum(Fields!Amount.Value)</Y></ChartDataPointValues>
          </ChartDataPoint>
        </ChartDataPoints>
        <Type>Bar</Type>
      </ChartSeries>
    </ChartSeriesCollection>
  </ChartData>
</Chart>
```

Option 2 — Pre-render map as image in Power BI and embed:
- Create a Power BI interactive report with a map visual
- Export as image
- Embed the image in the paginated report

### Linked Report → Parameterized Single Report

**Before** (SSRS linked reports):
```
/Reports/Sales/SalesReport_North  → LinkedReport referencing SalesReport with Region=North
/Reports/Sales/SalesReport_South  → LinkedReport referencing SalesReport with Region=South
```

**After** (single report with parameter defaults):
- Upload one report: `SalesReport.rdl`
- Use REST API to set different default parameter values per use case
- Or create bookmarks/links with parameter values in URL:
  ```
  https://app.powerbi.com/groups/{workspace}/rdlreports/{reportId}?rp:Region=North
  https://app.powerbi.com/groups/{workspace}/rdlreports/{reportId}?rp:Region=South
  ```

### File Share Subscription → Power Automate

**Before** (SSRS file share delivery):
```
Delivery: File Share
Path: \\fileserver01\Reports\Monthly\
Filename: SalesReport_@timestamp.pdf
Schedule: Monthly, 1st at 6:00 AM
```

**After** (Power Automate flow):

1. **Trigger**: Recurrence — Monthly, Day 1, 6:00 AM
2. **Action**: HTTP — POST to Power BI Export API
   ```json
   {
     "format": "PDF",
     "paginatedReportConfiguration": {
       "parameterValues": [
         { "name": "ReportMonth", "value": "@{formatDateTime(utcNow(), 'yyyy-MM-01')}" }
       ]
     }
   }
   ```
3. **Action**: Wait until — Export status = Succeeded (with polling loop)
4. **Action**: HTTP — GET export file (binary)
5. **Action**: Create file — SharePoint/OneDrive
   - Site: `https://contoso.sharepoint.com/sites/Finance`
   - Folder: `/Shared Documents/Monthly Reports`
   - File name: `SalesReport_@{formatDateTime(utcNow(), 'yyyy-MM')}.pdf`

### Data-Driven Subscription → Power Automate + Loop

**Before** (SSRS data-driven subscription):
```sql
-- Subscription query returns one row per recipient
SELECT Email, Region, Format FROM dbo.ReportRecipients WHERE IsActive = 1
```

**After** (Power Automate flow):

1. **Trigger**: Recurrence
2. **Action**: Execute SQL query → Get recipients
3. **Action**: Apply to each (loop over recipients)
   - Export report with recipient's Region parameter
   - Send email with attachment to recipient's email address

## Phase 4: Upload Validation Checklist

| # | Check | Method | Pass? |
|---|-------|--------|-------|
| 1 | RDL uploads without error | Manual upload or REST API | |
| 2 | Data source binds correctly | Workspace settings | |
| 3 | Parameters display correctly | Browser parameter bar | |
| 4 | Default values populate | View report with no changes | |
| 5 | Multi-value parameters work | Select multiple, click View | |
| 6 | Cascading parameters cascade | Change parent, verify child updates | |
| 7 | Report renders in browser | Click View Report | |
| 8 | Page layout matches SSRS | Compare screenshot side-by-side | |
| 9 | Data values match SSRS | Compare totals, row counts | |
| 10 | Export to PDF works | Click Export > PDF | |
| 11 | Export to Excel works | Click Export > Excel | |
| 12 | Drillthrough links work | Click drillthrough item | |
| 13 | Subreports render | Verify embedded reports load | |
| 14 | Grouping/sorting correct | Compare group headers and sort order | |
| 15 | Page numbers correct | Check "Page X of Y" in footer | |
| 16 | Alternating row colors work | Visual inspection | |
| 17 | Conditional formatting works | Verify traffic lights, bold, colors | |
| 18 | Subscription delivers email | Create test subscription | |

## Phase 5: User Communication Template

```
Subject: Migration of [Report Name] to Power BI Service

Team,

The [Report Name] report has been migrated from SSRS to Power BI Service (Fabric).

What's changing:
- New URL: https://app.powerbi.com/groups/{workspace}/rdlreports/{reportId}
- Access via Power BI workspace: [Workspace Name]
- Same report content and parameters — no functional changes

What you need to do:
1. Update your bookmarks to the new URL
2. Verify you have access (you need Viewer role in the workspace)
3. Test the report with your usual parameters

Old SSRS URL will remain active until [date] for reference.

Subscriptions have been recreated — you should receive your next scheduled
delivery at the usual time. If you don't receive it, please contact [admin].

Questions? Reply to this email or contact [support].
```

## Rollback Procedure

If critical issues are found after migration:

1. **Immediate**: Revert users to SSRS URLs (keep SSRS running during transition)
2. **Fix**: Address the issue in the Fabric version
3. **Re-deploy**: Upload corrected RDL and re-validate
4. **Re-test**: Run full validation checklist
5. **Re-launch**: Switch users back to Fabric URLs

Never decommission SSRS until all reports pass validation AND users confirm functionality for at least 2 weeks.
