# SSRS-to-Fabric Migration Reference

## Migration Overview

Moving from SQL Server Reporting Services (SSRS) on-premises to Power BI paginated reports in Microsoft Fabric. The RDL format is compatible, but data sources, security, and delivery mechanisms differ.

## Migration Phases

### Phase 1: Inventory

Catalog all SSRS assets:

```sql
-- Query SSRS ReportServer database for full inventory
SELECT
    c.Name AS ReportName,
    c.Path AS FolderPath,
    c.Type AS ItemType,  -- 2=Report, 5=DataSource, 8=SharedDataset
    c.ModifiedDate,
    c.ModifiedByID,
    s.ScheduleID,
    s.LastRunTime,
    e.TimeStart AS LastExecution,
    e.TimeEnd,
    e.RowCount AS LastRowCount,
    e.ByteCount,
    e.Format AS LastFormat
FROM dbo.Catalog c
LEFT JOIN dbo.ReportSchedule rs ON c.ItemID = rs.ReportID
LEFT JOIN dbo.Schedule s ON rs.ScheduleID = s.ScheduleID
LEFT JOIN (
    SELECT ReportID, MAX(TimeStart) AS TimeStart, MAX(TimeEnd) AS TimeEnd,
           MAX(RowCount) AS RowCount, MAX(ByteCount) AS ByteCount, MAX(Format) AS Format
    FROM dbo.ExecutionLogStorage
    WHERE TimeStart > DATEADD(MONTH, -6, GETDATE())
    GROUP BY ReportID
) e ON c.ItemID = e.ReportID
WHERE c.Type IN (2, 5, 8)
ORDER BY c.Path, c.Name;
```

### Inventory Checklist

| Item | Count | Notes |
|------|-------|-------|
| .rdl reports | | Active + inactive |
| Shared data sources (.rds) | | Unique connections |
| Shared datasets (.rsd) | | Shared query definitions |
| Subscriptions | | Email + file share |
| Data-driven subscriptions | | Dynamic recipient lists |
| Linked reports | | Parameterized variants |
| Report snapshots | | Scheduled renders |
| Custom assemblies | | External .NET DLLs |
| Active reports (last 6 months) | | Prioritize these |
| Inactive reports (> 6 months) | | Candidate for retirement |

### Phase 2: Compatibility Assessment

#### Supported Features (No Changes Needed)

- Tables, matrices, lists (Tablix)
- Charts (bar, line, pie, scatter, area)
- Parameters (single-value, multi-value, cascading)
- Expressions (VB.NET, IIF, Switch, aggregates)
- Subreports
- Drillthrough actions
- Document map and bookmarks
- Page headers/footers
- Conditional formatting
- Visibility toggling
- Shared data sources and datasets
- Grouping and sorting
- Page breaks

#### Unsupported Features (Require Changes)

| Feature | SSRS | Fabric Paginated | Workaround |
|---------|------|-----------------|------------|
| Custom Report Items (CRI) | Supported | Not supported | Rebuild with native RDL elements |
| Map data region | Supported | Not supported | Use embedded image or chart |
| Linked reports | Supported | Not supported | Use parameterized single report |
| Report snapshots (server-managed) | Full control | Limited | Use Power BI subscriptions |
| File share delivery | Supported | Not supported | Use Power Automate + export API |
| Windows authentication passthrough | Supported | Not supported | Use stored credentials or SSO |
| Custom assemblies (unrestricted) | Full .NET | Sandboxed | Move logic to custom code block or query |
| Report Manager web portal | Full portal | Fabric workspace | Different UI, same concepts |
| Report caching (fine-grained) | Full control | Capacity-dependent | Configure at workspace level |
| Data-driven subscriptions | Full | Not supported natively | Use Power Automate + export API |

#### Compatibility Scan Script

```powershell
# PowerShell: Scan .rdl files for unsupported features
param(
    [string]$RdlFolder = "C:\Reports"
)

$issues = @()

Get-ChildItem -Path $RdlFolder -Filter "*.rdl" -Recurse | ForEach-Object {
    $rdl = [xml](Get-Content $_.FullName)
    $ns = @{ r = $rdl.Report.NamespaceURI }
    $name = $_.Name

    # Check for Custom Report Items
    $cris = $rdl.SelectNodes("//r:CustomReportItem", $ns)
    if ($cris.Count -gt 0) {
        $issues += [PSCustomObject]@{
            Report = $name
            Issue = "Custom Report Item"
            Severity = "Critical"
            Detail = "$($cris.Count) CRI element(s) found"
        }
    }

    # Check for Map data region
    $maps = $rdl.SelectNodes("//r:MapDataRegion", $ns)
    if ($maps.Count -gt 0) {
        $issues += [PSCustomObject]@{
            Report = $name
            Issue = "Map Data Region"
            Severity = "Critical"
            Detail = "Map report item not supported in Fabric"
        }
    }

    # Check for custom assemblies
    $refs = $rdl.SelectNodes("//r:CodeModules/r:CodeModule", $ns)
    if ($refs.Count -gt 0) {
        $issues += [PSCustomObject]@{
            Report = $name
            Issue = "Custom Assembly"
            Severity = "Warning"
            Detail = ($refs | ForEach-Object { $_.InnerText }) -join ", "
        }
    }

    # Check for Windows integrated auth
    $dataSources = $rdl.SelectNodes("//r:DataSource/r:ConnectionProperties", $ns)
    $dataSources | ForEach-Object {
        $intSec = $_.SelectSingleNode("r:IntegratedSecurity", $ns)
        if ($intSec -and $intSec.InnerText -eq "true") {
            $issues += [PSCustomObject]@{
                Report = $name
                Issue = "Windows Authentication"
                Severity = "Warning"
                Detail = "Data source uses integrated security — requires gateway or credential update"
            }
        }
    }
}

$issues | Format-Table -AutoSize
$issues | Export-Csv "compatibility-report.csv" -NoTypeInformation
```

### Phase 3: Data Source Conversion

#### Connection String Mapping

| SSRS Source | Fabric Equivalent | Connection String Change |
|-------------|-------------------|--------------------------|
| SQL Server on-prem | Gateway + Azure SQL or Fabric Warehouse | Server name → gateway-mapped endpoint |
| Analysis Services on-prem | Fabric Semantic Model or gateway | Server → powerbi://api.powerbi.com/... |
| Oracle on-prem | Gateway + Oracle | Same, routed through gateway |
| ODBC | Gateway + ODBC | Same, routed through gateway |
| SharePoint List | Power Query connector | Rebuild as M query |
| XML file | Power Query connector | Rebuild as M query |
| Embedded data | Keep as-is | No change |

#### Gateway Configuration

For on-premises data sources that cannot migrate to cloud:

1. **Install gateway**: Download from https://aka.ms/gateway
2. **Register**: Sign in with Fabric admin account
3. **Add data source**: In Power BI service > Settings > Manage gateways
4. **Map credentials**: Store SQL auth or Windows auth credentials
5. **Bind reports**: After upload, bind report data sources to gateway sources

### Phase 4: Upload and Deploy

#### Manual Upload

1. Open Fabric workspace in browser
2. Click **New** > **Paginated report**
3. Upload .rdl file
4. Configure data source bindings
5. Set parameter defaults

#### Bulk Upload via REST API

```typescript
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import FormData from 'form-data';

async function bulkUpload(
  token: string,
  workspaceId: string,
  rdlFolder: string
): Promise<{ name: string; status: string; error?: string }[]> {
  const results: { name: string; status: string; error?: string }[] = [];
  const files = fs.readdirSync(rdlFolder).filter(f => f.endsWith('.rdl'));

  for (const file of files) {
    const reportName = path.basename(file, '.rdl');
    try {
      const form = new FormData();
      form.append('file', fs.createReadStream(path.join(rdlFolder, file)), {
        filename: file,
        contentType: 'application/octet-stream',
      });

      const res = await axios.post(
        `https://api.powerbi.com/v1.0/myorg/groups/${workspaceId}/imports`,
        form,
        {
          params: { datasetDisplayName: reportName, nameConflict: 'CreateOrOverwrite' },
          headers: { Authorization: `Bearer ${token}`, ...form.getHeaders() },
        }
      );

      // Wait for import completion
      let status = 'Publishing';
      const importId = res.data.id;
      while (status === 'Publishing') {
        await new Promise(r => setTimeout(r, 3000));
        const check = await axios.get(
          `https://api.powerbi.com/v1.0/myorg/groups/${workspaceId}/imports/${importId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        status = check.data.importState;
      }

      results.push({ name: reportName, status });
    } catch (err: any) {
      results.push({
        name: reportName,
        status: 'Failed',
        error: err.response?.data?.error?.message || err.message,
      });
    }
  }

  return results;
}
```

### Phase 5: Validation

#### Visual Comparison

1. Render each report in SSRS and export as PDF
2. Render same report in Fabric and export as PDF
3. Compare side-by-side for layout differences

#### Data Validation

1. Run report with known parameter values in both environments
2. Compare row counts and totals
3. Check specific data points for accuracy

#### Validation Checklist

| Check | SSRS Result | Fabric Result | Match? |
|-------|-------------|---------------|--------|
| Page count | | | |
| Total row count | | | |
| Grand total (key metric) | | | |
| First page layout | | | |
| Last page layout | | | |
| Parameter defaults work | | | |
| Multi-value params work | | | |
| Drillthrough navigation | | | |
| Export to PDF | | | |
| Export to Excel | | | |
| Subscription delivery | | | |

### Phase 6: Subscription Migration

SSRS subscriptions must be recreated in Power BI:

#### SSRS Subscription Inventory

```sql
-- Get all subscriptions from SSRS
SELECT
    c.Name AS ReportName,
    c.Path AS ReportPath,
    s.Description AS SubscriptionDescription,
    s.DeliveryExtension,
    s.Parameters AS DeliveryParameters,
    s.LastStatus,
    s.LastRunTime,
    sch.Name AS ScheduleName,
    sch.RecurrenceType,
    sch.MinutesInterval,
    sch.DaysInterval,
    sch.WeeksInterval
FROM dbo.Subscriptions s
INNER JOIN dbo.Catalog c ON s.Report_OID = c.ItemID
LEFT JOIN dbo.ReportSchedule rs ON s.SubscriptionID = rs.SubscriptionID
LEFT JOIN dbo.Schedule sch ON rs.ScheduleID = sch.ScheduleID
ORDER BY c.Path, c.Name;
```

#### Fabric Subscription Creation

For email subscriptions: Use Power BI service UI or REST API (see rest-api.md).

For file share subscriptions (unsupported natively): Build a Power Automate flow:
1. Trigger: Recurrence (matching SSRS schedule)
2. Action: Call Power BI Export API
3. Action: Save file to SharePoint/OneDrive/Azure Blob

### Phase 7: User Redirect

- Update bookmarks and portal links
- Configure URL redirects from SSRS URLs to Fabric workspace URLs
- Communicate new access method to report consumers
- Provide training on new parameter UI and export options

## Migration Timeline Template

| Week | Activity |
|------|----------|
| 1 | Inventory and compatibility scan |
| 2 | Prioritize reports (active, critical, simple) |
| 3-4 | Convert data sources, install gateway if needed |
| 5-6 | Upload and validate high-priority reports |
| 7-8 | Upload remaining reports, recreate subscriptions |
| 9 | User acceptance testing |
| 10 | Go-live, redirect users, decommission SSRS (optional) |

## Rollback Plan

- Keep SSRS running in parallel for 2-4 weeks after migration
- Maintain read-only access to SSRS reports during validation
- Document any reports that cannot migrate (CRI, maps) for separate handling
- Version control all .rdl files in Git before and after modification
