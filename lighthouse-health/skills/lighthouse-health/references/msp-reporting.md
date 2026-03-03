# MSP Reporting — Microsoft 365 Lighthouse Reference

This reference covers multi-tenant report aggregation patterns, PowerShell runbook automation, HTML executive report generation, Power BI integration for cross-tenant data, customer-ready PDF export, and scheduled report delivery via Microsoft Graph for MSP/CSP monthly operations reviews.

---

## REST API Endpoints (Microsoft Graph)

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|----------------------|----------------|-------|
| POST | `https://graph.microsoft.com/v1.0/users/{userId}/sendMail` | `Mail.Send` | JSON body with message | Send HTML report via email |
| POST | `https://graph.microsoft.com/v1.0/me/sendMail` | `Mail.Send` (delegated) | JSON body with message | Delegated send from service account |
| POST | `https://graph.microsoft.com/v1.0/users/{userId}/messages/{messageId}/attachments` | `Mail.ReadWrite` | multipart | Add PDF attachment to draft |
| GET | `https://graph.microsoft.com/beta/tenantRelationships/managedTenants/tenants` | `ManagedTenants.Read.All` | `$filter`, `$top` | List all managed tenants for iteration |
| GET | `https://graph.microsoft.com/beta/tenantRelationships/managedTenants/credentialUserRegistrationsSummaries` | `ManagedTenants.Read.All` | `$filter=tenantId eq '{id}'` | Per-tenant MFA data |
| GET | `https://graph.microsoft.com/beta/tenantRelationships/managedTenants/managedDeviceCompliances` | `ManagedTenants.Read.All` | `$filter=tenantId eq '{id}'` | Per-tenant device compliance |
| GET | `https://graph.microsoft.com/beta/tenantRelationships/managedTenants/riskyUsers` | `ManagedTenants.Read.All` | `$filter=tenantId eq '{id}'` | Per-tenant risky users |
| GET | `https://graph.microsoft.com/v1.0/security/secureScores?$top=1` | `SecurityEvents.Read.All` | — | Per-tenant Secure Score (via GDAP) |
| POST | `https://graph.microsoft.com/v1.0/drives/{driveId}/items/{itemId}/content` | `Files.ReadWrite.All` | PUT body | Upload report to SharePoint/OneDrive |
| GET | `https://graph.microsoft.com/v1.0/sites/{siteId}/drive/root:/Reports:/children` | `Files.Read.All` | — | List existing reports in SharePoint folder |

---

## Multi-Tenant Report Aggregation Pattern

### Report Data Model (TypeScript)

```typescript
interface TenantReportEntry {
  tenantId: string;
  tenantName: string;
  industry: string | null;
  tier: 'gold' | 'silver' | 'bronze' | null;    // Partner-assigned tier tag

  // Health score dimensions
  overallScore: number;
  overallRating: 'critical' | 'poor' | 'fair' | 'good' | 'excellent';
  securityScore: number;
  identityScore: number;
  complianceScore: number;
  collaborationScore: number;
  costScore: number;

  // Trend
  previousScore: number | null;
  scoreDelta: number | null;
  trendDirection: 'up' | 'down' | 'flat' | null;

  // Key metrics
  totalUsers: number;
  mfaRegisteredPct: number;
  adminMfaRegisteredPct: number;
  activeRiskyUsers: number;
  deviceCompliancePct: number;
  licenseUtilizationPct: number;
  unusedLicenseSeats: number;
  estimatedMonthlyWaste: number;

  // Top issues for remediation
  topIssues: Array<{
    dimension: string;
    issue: string;
    severity: 'critical' | 'high' | 'medium';
    estimatedScoreGain: number;
  }>;

  // GDAP status
  gdapStatus: 'active' | 'expiring-soon' | 'expired';
  gdapExpiresAt: string | null;

  reportDate: string;
}

interface MSPReport {
  generatedAt: string;
  reportingPeriod: string;          // e.g., "February 2026"
  partnerTenantId: string;
  partnerName: string;
  totalManagedTenants: number;
  tenantsScored: number;
  tenantsWithErrors: string[];      // tenantIds that failed collection

  // Aggregate stats
  avgOverallScore: number;
  scoreDistribution: {
    excellent: number;
    good: number;
    fair: number;
    poor: number;
    critical: number;
  };
  totalUnusedSeats: number;
  totalEstimatedMonthlyWaste: number;

  tenants: TenantReportEntry[];
}
```

---

## PowerShell Runbook for Cross-Tenant Data Collection

The following runbook is designed to run as an Azure Automation runbook on a monthly schedule. It collects health data for all managed tenants and stores results in Azure Table Storage.

```powershell
<#
.SYNOPSIS
    Monthly M365 Lighthouse tenant health report collection runbook.
.DESCRIPTION
    Collects health metrics for all Lighthouse-managed tenants and stores
    results in Azure Table Storage for trend tracking and reporting.
.NOTES
    Required Azure Automation Variables:
      - PARTNER_TENANT_ID
      - CLIENT_ID
      - REPORT_STORAGE_ACCOUNT
      - REPORT_TABLE_NAME
    Required Azure Automation Certificates or Key Vault secrets:
      - CLIENT_SECRET or certificate thumbprint
#>

# Connect using Managed Identity (preferred for Azure Automation)
Connect-MgGraph -Identity -Scopes "https://graph.microsoft.com/.default"

$partnerTenantId = Get-AutomationVariable -Name "PARTNER_TENANT_ID"
$storageAccount  = Get-AutomationVariable -Name "REPORT_STORAGE_ACCOUNT"
$tableName       = Get-AutomationVariable -Name "REPORT_TABLE_NAME"
$reportDate      = (Get-Date).ToString("yyyy-MM-01")   # First of current month

Write-Output "Starting tenant health collection for $reportDate"

# Step 1: Get all managed tenants
$tenantsResponse = Invoke-MgGraphRequest -Method GET `
    -Uri "https://graph.microsoft.com/beta/tenantRelationships/managedTenants/tenants" `
    -OutputType PSObject

$tenants = $tenantsResponse.value
Write-Output "Found $($tenants.Count) managed tenants"

$results = @()
$errors  = @()

foreach ($tenant in $tenants) {
    $tenantId = $tenant.tenantId
    $tenantName = $tenant.displayName

    try {
        # MFA coverage
        $mfaUri = "https://graph.microsoft.com/beta/tenantRelationships/managedTenants/" +
                  "credentialUserRegistrationsSummaries?`$filter=tenantId eq '$tenantId'"
        $mfaData = (Invoke-MgGraphRequest -Method GET -Uri $mfaUri -OutputType PSObject).value[0]

        # Device compliance
        $devUri = "https://graph.microsoft.com/beta/tenantRelationships/managedTenants/" +
                  "managedDeviceCompliances?`$filter=tenantId eq '$tenantId'&`$top=1000"
        $devData = (Invoke-MgGraphRequest -Method GET -Uri $devUri -OutputType PSObject).value

        # Risky users
        $riskUri = "https://graph.microsoft.com/beta/tenantRelationships/managedTenants/" +
                   "riskyUsers?`$filter=tenantId eq '$tenantId'"
        $riskData = (Invoke-MgGraphRequest -Method GET -Uri $riskUri -OutputType PSObject).value

        # Calculate metrics
        $totalUsers    = [int]($mfaData.totalUserCount ?? 0)
        $mfaPct        = if ($totalUsers -gt 0) { [math]::Round($mfaData.mfaRegisteredUserCount / $totalUsers * 100, 1) } else { 0 }
        $adminMfaPct   = if ($mfaData.adminsCount -gt 0) { [math]::Round($mfaData.adminsMfaRegisteredCount / $mfaData.adminsCount * 100, 1) } else { 100 }

        $compliantDevices = ($devData | Where-Object { $_.complianceStatus -eq 'compliant' }).Count
        $totalDevices     = $devData.Count
        $devCompliancePct = if ($totalDevices -gt 0) { [math]::Round($compliantDevices / $totalDevices * 100, 1) } else { 100 }

        $activeRiskyUsers = ($riskData | Where-Object { $_.riskState -eq 'atRisk' }).Count

        # Simple composite score calculation
        $secScore = [math]::Round(
            (($mfaPct / 100 * 100 * 0.35) +
             ($adminMfaPct / 100 * 100 * 0.20) +
             ($(if ($activeRiskyUsers -eq 0) { 100 } elseif ($activeRiskyUsers -le 3) { 60 } else { 0 }) * 0.15) +
             ($devCompliancePct / 100 * 100 * 0.30))
        )

        $results += [PSCustomObject]@{
            TenantId          = $tenantId
            TenantName        = $tenantName
            ReportDate        = $reportDate
            MFACoveragePct    = $mfaPct
            AdminMFAPct       = $adminMfaPct
            DeviceCompPct     = $devCompliancePct
            ActiveRiskyUsers  = $activeRiskyUsers
            SecurityScore     = $secScore
            TotalUsers        = $totalUsers
            TotalDevices      = $totalDevices
            CollectedAt       = (Get-Date -Format "o")
        }

        Write-Output "Collected: $tenantName — Score: $secScore"
        Start-Sleep -Seconds 1   # Rate limiting
    }
    catch {
        Write-Warning "Failed to collect data for $tenantName ($tenantId): $_"
        $errors += $tenantId
    }
}

# Store results in Azure Table Storage
$storageContext = New-AzStorageContext -StorageAccountName $storageAccount -UseConnectedAccount

foreach ($result in $results) {
    $entity = @{
        PartitionKey     = $result.TenantId
        RowKey           = $result.ReportDate
        TenantName       = $result.TenantName
        MFACoveragePct   = $result.MFACoveragePct
        AdminMFAPct      = $result.AdminMFAPct
        DeviceCompPct    = $result.DeviceCompPct
        ActiveRiskyUsers = $result.ActiveRiskyUsers
        SecurityScore    = $result.SecurityScore
        TotalUsers       = $result.TotalUsers
        TotalDevices     = $result.TotalDevices
        CollectedAt      = $result.CollectedAt
    }

    Add-AzTableRow -Table (Get-AzTableTable -resourceGroup "rg-msp-reports" `
        -storageAccountName $storageAccount -tableName $tableName) `
        -partitionKey $entity.PartitionKey -rowKey $entity.RowKey `
        -property ($entity | Select-Object -ExcludeProperty PartitionKey, RowKey) | Out-Null
}

Write-Output "Stored $($results.Count) tenant records. Errors: $($errors.Count)"
if ($errors.Count -gt 0) {
    Write-Warning "Failed tenants: $($errors -join ', ')"
}
```

---

## HTML Report Generation (TypeScript)

```typescript
function generateHTMLReport(report: MSPReport): string {
  const ratingColor = (rating: string): string => ({
    excellent: '#1a7f37',
    good: '#2da44e',
    fair: '#d29922',
    poor: '#d1242f',
    critical: '#cf222e'
  })[rating] || '#6e7781';

  const trendIcon = (delta: number | null): string => {
    if (delta === null) return '—';
    if (delta > 2) return '&#x2191;';   // Up arrow
    if (delta < -2) return '&#x2193;';  // Down arrow
    return '&#x2192;';                  // Right arrow (flat)
  };

  const tenantRows = report.tenants
    .sort((a, b) => a.overallScore - b.overallScore)  // Worst first
    .map(t => `
      <tr>
        <td>${t.tenantName}</td>
        <td style="text-align:center;">
          <span style="background:${ratingColor(t.overallRating)};color:#fff;
                       padding:2px 8px;border-radius:12px;font-size:12px;">
            ${t.overallScore} — ${t.overallRating}
          </span>
        </td>
        <td style="text-align:center;">${trendIcon(t.scoreDelta)} ${t.scoreDelta !== null ? (t.scoreDelta > 0 ? '+' : '') + t.scoreDelta : '—'}</td>
        <td style="text-align:center;">${t.mfaRegisteredPct}%</td>
        <td style="text-align:center;">${t.deviceCompliancePct}%</td>
        <td style="text-align:center;">${t.activeRiskyUsers}</td>
        <td style="text-align:center;">$${t.estimatedMonthlyWaste.toFixed(0)}/mo</td>
        <td>${t.topIssues?.[0]?.issue ?? '—'}</td>
      </tr>
    `).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>M365 Tenant Health Report — ${report.reportingPeriod}</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #24292f; margin: 0; padding: 32px; background: #f6f8fa; }
    h1 { font-size: 24px; color: #0f3460; }
    h2 { font-size: 18px; color: #0f3460; margin-top: 32px; }
    .summary-cards { display: flex; gap: 16px; flex-wrap: wrap; margin: 24px 0; }
    .card { background: #fff; border: 1px solid #d0d7de; border-radius: 8px; padding: 16px 24px; min-width: 160px; }
    .card .value { font-size: 32px; font-weight: 700; color: #0f3460; }
    .card .label { font-size: 13px; color: #57606a; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,.1); }
    th { background: #0f3460; color: #fff; padding: 10px 12px; text-align: left; font-size: 13px; }
    td { padding: 10px 12px; font-size: 13px; border-bottom: 1px solid #d0d7de; }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: #f6f8fa; }
    .footer { margin-top: 32px; font-size: 12px; color: #57606a; }
  </style>
</head>
<body>
  <h1>Microsoft 365 Tenant Health Report</h1>
  <p style="color:#57606a;">${report.reportingPeriod} &bull; Generated ${new Date(report.generatedAt).toLocaleDateString()} &bull; ${report.tenantsScored} tenants scored</p>

  <div class="summary-cards">
    <div class="card"><div class="value">${report.avgOverallScore}</div><div class="label">Avg Health Score</div></div>
    <div class="card"><div class="value">${report.scoreDistribution.excellent + report.scoreDistribution.good}</div><div class="label">Tenants Good+</div></div>
    <div class="card"><div class="value">${report.scoreDistribution.poor + report.scoreDistribution.critical}</div><div class="label">Tenants Need Attention</div></div>
    <div class="card"><div class="value">$${report.totalEstimatedMonthlyWaste.toFixed(0)}</div><div class="label">Est. Monthly License Waste</div></div>
    <div class="card"><div class="value">${report.totalUnusedSeats}</div><div class="label">Unused License Seats</div></div>
  </div>

  <h2>Tenant Health Summary</h2>
  <table>
    <thead>
      <tr>
        <th>Tenant</th>
        <th>Health Score</th>
        <th>Trend</th>
        <th>MFA Coverage</th>
        <th>Device Compliance</th>
        <th>Risky Users</th>
        <th>License Waste</th>
        <th>Top Issue</th>
      </tr>
    </thead>
    <tbody>${tenantRows}</tbody>
  </table>

  <div class="footer">
    <p>Report generated by Microsoft 365 Lighthouse Health Monitor &bull; ${report.partnerName}<br>
    Scores reflect data collected from the Microsoft 365 Lighthouse API and Microsoft Graph as of ${report.reportingPeriod}.<br>
    Contact your account manager for remediation assistance.</p>
  </div>
</body>
</html>`;
}
```

---

## Send Report via Graph sendMail (TypeScript)

```typescript
import { Client } from '@microsoft/microsoft-graph-client';

interface SendReportOptions {
  fromUserId: string;           // User ID or UPN of the sender
  toAddresses: string[];        // Recipient email addresses
  ccAddresses?: string[];
  subject: string;
  htmlBody: string;
  pdfAttachmentBase64?: string; // Optional PDF attachment
  pdfFilename?: string;
}

async function sendHealthReport(
  partnerClient: Client,
  options: SendReportOptions
): Promise<void> {
  const toRecipients = options.toAddresses.map(addr => ({
    emailAddress: { address: addr }
  }));

  const ccRecipients = (options.ccAddresses || []).map(addr => ({
    emailAddress: { address: addr }
  }));

  const attachments = options.pdfAttachmentBase64 ? [
    {
      '@odata.type': '#microsoft.graph.fileAttachment',
      name: options.pdfFilename || 'tenant-health-report.pdf',
      contentType: 'application/pdf',
      contentBytes: options.pdfAttachmentBase64
    }
  ] : [];

  const message = {
    subject: options.subject,
    importance: 'normal',
    body: {
      contentType: 'HTML',
      content: options.htmlBody
    },
    toRecipients,
    ccRecipients,
    attachments
  };

  await partnerClient
    .api(`/users/${options.fromUserId}/sendMail`)
    .post({ message, saveToSentItems: true });
}

// Example usage: send monthly report
async function sendMonthlyReports(
  partnerClient: Client,
  report: MSPReport,
  customerContacts: Array<{ tenantId: string; email: string }>
): Promise<void> {
  const SENDER_ID = 'reports@msp-partner.com';

  for (const tenant of report.tenants) {
    const contact = customerContacts.find(c => c.tenantId === tenant.tenantId);
    if (!contact) continue;

    // Generate tenant-specific one-page summary
    const singleTenantReport: MSPReport = {
      ...report,
      tenants: [tenant],
      totalManagedTenants: 1,
      tenantsScored: 1
    };

    const htmlContent = generateHTMLReport(singleTenantReport);

    await sendHealthReport(partnerClient, {
      fromUserId: SENDER_ID,
      toAddresses: [contact.email],
      ccAddresses: ['partner-team@msp-partner.com'],
      subject: `M365 Tenant Health Report — ${tenant.tenantName} — ${report.reportingPeriod}`,
      htmlBody: htmlContent
    });

    // Throttle email sending
    await new Promise(r => setTimeout(r, 500));
  }
}
```

---

## Upload Report to SharePoint (TypeScript)

```typescript
async function uploadReportToSharePoint(
  partnerClient: Client,
  siteId: string,
  folderId: string,           // Drive item ID of the Reports folder
  filename: string,
  htmlContent: string
): Promise<string> {           // Returns the file's web URL
  const encoder = new TextEncoder();
  const contentBytes = encoder.encode(htmlContent);

  const response = await partnerClient
    .api(`/sites/${siteId}/drive/items/${folderId}:/${filename}:/content`)
    .header('Content-Type', 'text/html')
    .put(contentBytes.buffer);

  return response.webUrl;
}
```

---

## Tenant Comparison Matrix (TypeScript)

The comparison matrix enables MSPs to benchmark tenants against each other or against industry averages.

```typescript
interface TenantComparisonMatrix {
  reportingPeriod: string;
  metrics: string[];
  tenants: Array<{
    tenantId: string;
    tenantName: string;
    tier: string | null;
    values: number[];             // Index matches metrics array
    overallScore: number;
    rank: number;                 // 1 = best
  }>;
  peerAverages: {
    byTier: Record<string, number[]>;    // tier -> metric averages
    overall: number[];                   // Global averages
  };
}

function buildTenantComparisonMatrix(
  report: MSPReport
): TenantComparisonMatrix {
  const metrics = [
    'Overall Score',
    'Security Score',
    'Identity Score',
    'Compliance Score',
    'MFA Coverage %',
    'Admin MFA %',
    'Device Compliance %',
    'License Utilization %',
    'Active Risky Users'
  ];

  const tenantRows = report.tenants.map(t => ({
    tenantId: t.tenantId,
    tenantName: t.tenantName,
    tier: t.tier,
    values: [
      t.overallScore,
      t.securityScore,
      t.identityScore,
      t.complianceScore,
      t.mfaRegisteredPct,
      t.adminMfaRegisteredPct,
      t.deviceCompliancePct,
      t.licenseUtilizationPct,
      t.activeRiskyUsers
    ],
    overallScore: t.overallScore,
    rank: 0   // Will be filled below
  }));

  // Rank by overall score (higher = better rank)
  const sorted = [...tenantRows].sort((a, b) => b.overallScore - a.overallScore);
  sorted.forEach((t, i) => {
    const original = tenantRows.find(r => r.tenantId === t.tenantId);
    if (original) original.rank = i + 1;
  });

  // Compute peer averages by tier
  const tiers = [...new Set(report.tenants.map(t => t.tier).filter(Boolean))] as string[];
  const byTier: Record<string, number[]> = {};

  for (const tier of tiers) {
    const tierTenants = tenantRows.filter(t => t.tier === tier);
    byTier[tier] = metrics.map((_, idx) =>
      Math.round(tierTenants.reduce((sum, t) => sum + t.values[idx], 0) / tierTenants.length)
    );
  }

  // Overall averages
  const overall = metrics.map((_, idx) =>
    Math.round(tenantRows.reduce((sum, t) => sum + t.values[idx], 0) / tenantRows.length)
  );

  return {
    reportingPeriod: report.reportingPeriod,
    metrics,
    tenants: tenantRows,
    peerAverages: { byTier, overall }
  };
}
```

---

## Power BI Integration Pattern

For MSPs managing 20+ tenants, loading data into Power BI via the Azure Table Storage data source enables interactive dashboards with drill-down and cross-filtering.

```typescript
// Power BI REST API endpoints for embedding and dataset refresh
// (Requires Power BI Pro or Premium Per User license on the reporting user)

interface PowerBIDatasetRefresh {
  datasetId: string;
  workspaceId: string;
}

// Trigger Power BI dataset refresh after runbook completes
async function triggerPowerBIRefresh(
  pbiAccessToken: string,
  workspaceId: string,
  datasetId: string
): Promise<void> {
  const response = await fetch(
    `https://api.powerbi.com/v1.0/myorg/groups/${workspaceId}/datasets/${datasetId}/refreshes`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${pbiAccessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ notifyOption: 'NoNotification' })
    }
  );

  if (!response.ok) {
    throw new Error(`Power BI refresh failed: ${response.status} ${await response.text()}`);
  }
}
```

**Power BI data source setup (Azure Table Storage):**
1. In Power BI Desktop: Get Data > Azure > Azure Table Storage
2. Enter storage account URL: `https://{account}.table.core.windows.net`
3. Enter storage account key (from Azure Portal > Access keys)
4. Select the score history table
5. Transform: expand the `Value` record column, promote first row as headers
6. Load and create visuals: tenant scorecard matrix, trend line chart, heat map by dimension

---

## Azure Automation Runbook Scheduling

```powershell
# Create monthly schedule for the health report runbook
# Run on the 1st of each month at 02:00 UTC

$automationAccount = "aa-msp-reports"
$resourceGroup     = "rg-msp-reports"
$runbookName       = "Collect-TenantHealthMetrics"
$scheduleName      = "Monthly-1st-2AM"

# Create schedule
New-AzAutomationSchedule `
    -AutomationAccountName $automationAccount `
    -ResourceGroupName $resourceGroup `
    -Name $scheduleName `
    -StartTime (Get-Date "01:00 AM").AddMonths(1).Replace(Day=1) `
    -MonthInterval 1 `
    -TimeZone "UTC"

# Link runbook to schedule
Register-AzAutomationScheduledRunbook `
    -AutomationAccountName $automationAccount `
    -ResourceGroupName $resourceGroup `
    -RunbookName $runbookName `
    -ScheduleName $scheduleName

Write-Output "Runbook '$runbookName' scheduled to run monthly on the 1st at 02:00 UTC"
```

---

## Report Delivery Schedule

| Report | Frequency | Audience | Format | Trigger |
|--------|-----------|----------|--------|---------|
| Tenant Health Summary | Monthly | MSP internal team | HTML email + SharePoint | Azure Automation runbook |
| Customer Health Report | Monthly | Customer admin contacts | HTML email (per tenant) | After internal report |
| Critical Alert Digest | Weekly | MSP security team | HTML email | Scheduled Logic App |
| GDAP Expiry Warnings | Weekly | MSP account managers | Plain text email | Logic App + Graph API |
| License Waste Summary | Quarterly | MSP billing team | Excel attachment | Power Automate flow |
| Executive Scorecard (PDF) | Quarterly | Customer executives | PDF via sendMail | Manual trigger or Logic App |

---

## Error Codes

| Code | Meaning | Remediation |
|------|---------|-------------|
| 403 `Mail.Send Missing` | Cannot send email via Graph | Consent `Mail.Send` on partner app; ensure sender mailbox exists |
| 403 `SendAs Not Authorized` | Sending as shared mailbox not permitted | Grant Send As permission on shared mailbox to the service principal |
| 400 `InvalidRecipients` | One or more recipient addresses invalid | Validate addresses before calling sendMail; catch per-recipient errors |
| 429 `TooManyRequests` (Mail) | sendMail throttled | Space email sends by 500ms minimum; use batch send for large lists |
| 403 `Files.ReadWrite.All Missing` | Cannot upload to SharePoint | Consent `Files.ReadWrite.All` on partner app or use Sites.ReadWrite.All |
| 404 `Drive Item Not Found` | Report destination folder not found | Pre-create the Reports folder in SharePoint before first runbook run |
| 401 `Power BI Unauthorized` | Invalid Power BI token | Use MSAL to acquire Power BI-scoped token: `https://analysis.windows.net/powerbi/api/.default` |
| 500 `Azure Automation Runtime Error` | Runbook execution failed | Check runbook output stream and Az module version compatibility |
| 403 `ManagedTenants.Read.All` | Lighthouse data inaccessible | Verify partner app consent and that `ManagedTenants.Read.All` is granted |
| 404 `Table Not Found` | Azure Table Storage table missing | Create table before first write: `New-AzTableTable` or ARM template |

---

## Limits

| Resource | Limit | Notes |
|----------|-------|-------|
| Graph `sendMail` rate limit | 10,000 requests/10 min | Space sends to avoid throttle for large tenant portfolios |
| Email attachment size via Graph | 3 MB inline attachment | For larger PDFs, upload to SharePoint and send a link instead |
| SharePoint single file upload (PUT) | 250 MB | Use chunked session upload for files > 4 MB |
| Power BI dataset refresh | 8 refreshes/day (Pro) | 48 refreshes/day with Premium capacity |
| Azure Table Storage row size | 1 MB per entity | Store full JSON snapshot in Blob Storage; use Table for indexed metrics |
| Azure Automation runbook execution | 3 hours max wall time | Process tenants in batches across multiple runbook invocations for 200+ tenants |
| Lighthouse managed tenants per partner | 1,000 tenants | Above this, consider custom cross-tenant management solution |
| Graph email `toRecipients` per message | 500 recipients | For bulk reporting, send individually per tenant contact |

---

## Common Patterns and Gotchas

1. **One report per customer, not one report per partner** — Customers should receive a report scoped only to their own tenant with comparative benchmarks (anonymized peer data). Never include other customers' data in customer-facing reports. Use the single-tenant report generation pattern with peer averages computed from the full dataset.

2. **HTML email rendering differs by client** — Outlook, Gmail, and Apple Mail all render HTML differently. Use inline CSS only (no `<style>` blocks in some clients). Avoid CSS Grid and Flexbox. Test with Litmus or Email on Acid. Tables with inline styles are the most compatible layout approach.

3. **PDF generation requires a headless browser or library** — Microsoft Graph's sendMail does not convert HTML to PDF. To send PDFs, generate them in your runbook using Puppeteer (Node.js), chromium-headless, or WeasyPrint (Python) before attaching. Azure Container Instances or Azure Functions Premium provide headless browser support.

4. **Azure Table Storage is not queryable by score range** — Azure Table Storage is a key-value store with limited query capabilities (partition key + row key only). For ad-hoc queries like "all tenants with score < 50," export data to Azure SQL or use Azure Data Explorer for richer querying without the cost of Cosmos DB.

5. **Report runbook timing vs Lighthouse data refresh** — Schedule the reporting runbook to run 6+ hours after midnight to ensure Lighthouse data (4-24 hour refresh cycle) is as current as possible. Running immediately at 00:00 UTC will often capture stale data from the previous day.

6. **GDAP expiry affects data collection** — If a GDAP relationship expires before the runbook runs, the tenant's data will fail silently (403 errors). Always check GDAP expiry dates before each collection cycle and alert account managers of relationships expiring within 30 days.

7. **Score trend requires consistent collection dates** — To calculate month-over-month trend, store scores with a consistent `rowKey` format (e.g., `YYYY-MM-01` for first of month). Running the runbook on different days each month will produce misleading deltas.

8. **Customer contacts must be maintained externally** — The Lighthouse API (`tenantsDetailedInformation`) includes some contact fields, but MSP-specific customer contacts (e.g., IT admin email) must be maintained in your PSA or CRM system and joined with tenant IDs at report generation time.

9. **Power BI workspace sharing model** — To share the Power BI dashboard with customer contacts directly, you need a Power BI workspace in a Premium capacity or use the Power BI Embedded API for non-Power BI Pro users. For internal MSP use only, Power BI Pro shared workspace is sufficient.

10. **Executive vs technical report format** — Generate two report variants: a detailed technical version (all metrics, API call suggestions, error codes) for internal MSP staff, and a simplified business scorecard (overall score, top 3 issues, projected savings) for customer executive distribution. The technical format can include the comparison matrix; the customer version should only show their own data.
