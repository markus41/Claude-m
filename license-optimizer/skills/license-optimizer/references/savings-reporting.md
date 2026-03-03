# Savings Reporting — M365 License Optimizer Reference

Savings reports translate license usage analysis into business value — quantifying cost reduction opportunities, modeling right-sizing scenarios, and presenting executive-ready summaries for customer conversations.

---

## M365 License Cost Reference Table (USD List Price, 2026)

| License Name | SKU Part Number | Monthly/User (USD) | Annual/User (USD) |
|-------------|----------------|-------------------|------------------|
| Microsoft 365 F1 | `M365_F1` | $2.25 | $27.00 |
| Microsoft 365 F3 | `SPE_F1` | $8.00 | $96.00 |
| Microsoft 365 Business Basic | `O365_BUSINESS_ESSENTIALS` | $6.00 | $72.00 |
| Microsoft 365 Business Standard | `O365_BUSINESS_PREMIUM` | $12.50 | $150.00 |
| Microsoft 365 Business Premium | `SPB` | $22.00 | $264.00 |
| Microsoft 365 E1 | `STANDARDPACK` | $10.00 | $120.00 |
| Microsoft 365 E3 | `ENTERPRISEPACK` | $36.00 | $432.00 |
| Microsoft 365 E5 | `ENTERPRISEPREMIUM` | $57.00 | $684.00 |
| Microsoft 365 E5 Security | `M365_E5_SUITE_COMPONENTS` | $12.00 | $144.00 |
| Exchange Online Plan 1 | `EXCHANGESTANDARD` | $4.00 | $48.00 |
| Exchange Online Plan 2 | `EXCHANGEENTERPRISE` | $8.00 | $96.00 |
| Teams Essentials | `TEAMS_ESSENTIALS` | $4.00 | $48.00 |
| Power BI Pro | `POWER_BI_PRO` | $10.00 | $120.00 |
| Project Plan 3 | `PROJECTPROFESSIONAL` | $30.00 | $360.00 |
| Project Plan 5 | `PROJECTPREMIUM` | $55.00 | $660.00 |
| Visio Plan 1 | `VISIOCLIENT` | $5.00 | $60.00 |
| Visio Plan 2 | `VISIO_PLAN2` | $15.00 | $180.00 |
| Microsoft Intune Plan 1 | `INTUNE_A` | $8.00 | $96.00 |
| Entra ID P1 | `AAD_PREMIUM` | $6.00 | $72.00 |
| Entra ID P2 | `AAD_PREMIUM_P2` | $9.00 | $108.00 |

*Prices are approximate US list prices. CSP/EA discounts typically 15-40% below list. Always confirm current pricing with Microsoft or partner portal.*

---

## Downgrade Scenarios and Savings

| Current License | Downgrade To | Monthly Savings/User | When to Downgrade |
|----------------|-------------|---------------------|------------------|
| E5 ($57) | E3 ($36) | $21 | Not using Defender P2, Audio Conf, Phone System, AIP P2, Power BI Pro |
| E5 ($57) | E1 + Security add-on ($22) | $35 | No desktop Office, uses security only |
| E3 ($36) | E1 ($10) | $26 | Not using desktop Office apps, Intune, or AIP P1 |
| E3 ($36) | Business Basic ($6) | $30 | SMB, no desktop apps, <300 users |
| E3 ($36) | F3 ($8) | $28 | Frontline worker — no desktop apps, limited storage OK |
| Business Premium ($22) | Business Standard ($12.50) | $9.50 | Not using Defender for Business or Intune |
| Business Standard ($12.50) | Business Basic ($6) | $6.50 | Not using desktop Office apps |
| Business Premium ($22) | E1 ($10) | $12 | Needs Exchange + Teams, no security features |
| E3 ($36) | Exchange P1 + Teams Ess ($8) | $28 | Needs only email and Teams, no files/Office |

---

## Savings Calculation Formula

```typescript
interface SavingsScenario {
  scenarioName: string;
  affectedUsers: number;
  currentLicenseCostPerUser: number;    // Monthly USD
  proposedLicenseCostPerUser: number;   // Monthly USD
  monthlySavings: number;
  annualSavings: number;
  implementationRisk: 'low' | 'medium' | 'high';
  prerequisiteChecks: string[];
}

function calculateSavings(
  affectedUsers: number,
  currentCostPerUser: number,
  proposedCostPerUser: number,
  scenarioName: string,
  prerequisiteChecks: string[],
  implementationRisk: 'low' | 'medium' | 'high' = 'medium'
): SavingsScenario {
  const monthlySavings =
    affectedUsers * (currentCostPerUser - proposedCostPerUser);

  return {
    scenarioName,
    affectedUsers,
    currentLicenseCostPerUser: currentCostPerUser,
    proposedLicenseCostPerUser: proposedCostPerUser,
    monthlySavings,
    annualSavings: monthlySavings * 12,
    implementationRisk,
    prerequisiteChecks
  };
}

// Example usage
const inactiveLicenseScenario = calculateSavings(
  47,    // inactive users
  36,    // E3 monthly cost
  0,     // remove license entirely
  'Remove licenses from 90+ day inactive users',
  [
    'Confirm users are not service accounts',
    'Notify department heads',
    'Wait 5 business days for objections'
  ],
  'low'
);

// annualSavings = 47 * 36 * 12 = $20,304
```

---

## Group-Based Licensing Efficiency Analysis

```typescript
// Identify direct assignments that could be consolidated into group-based licensing
async function analyzeGroupBasedLicenseOpportunity(
  client: Client,
  skuId: string
): Promise<{
  directAssignments: number;
  groupAssignments: number;
  recommendation: string;
}> {
  // Count users with this SKU assigned directly vs via group
  const directUsers: any[] = [];
  let url =
    `/users?$select=id,userPrincipalName,assignedLicenses&$filter=assignedLicenses/any(l:l/skuId eq ${skuId})` +
    `&$count=true&$top=500`;

  while (url) {
    const page = await client
      .api(url)
      .header('ConsistencyLevel', 'eventual')
      .get();
    directUsers.push(...page.value);
    url = page['@odata.nextLink'] || null;
  }

  // Check how many have direct vs group assignments
  let directCount = 0;
  let groupCount = 0;

  for (const user of directUsers) {
    const details = await client
      .api(`/users/${user.id}/licenseDetails`)
      .filter(`skuId eq ${skuId}`)
      .get();

    const hasGroupAssignment = details.value.some(
      (d: any) => d.assignedByGroup !== null
    );

    if (hasGroupAssignment) groupCount++;
    else directCount++;
  }

  return {
    directAssignments: directCount,
    groupAssignments: groupCount,
    recommendation:
      directCount > 50
        ? `High opportunity: ${directCount} direct assignments. Consolidate into group-based licensing to simplify management.`
        : `Manageable: ${directCount} direct assignments.`
  };
}
```

---

## License Reclamation Workflow

```typescript
interface ReclamationWorkflowStep {
  step: number;
  name: string;
  description: string;
  apiCall: string;
  waitPeriodDays: number;
  approvalRequired: boolean;
}

const reclamationWorkflow: ReclamationWorkflowStep[] = [
  {
    step: 1,
    name: 'Identify candidates',
    description: 'Find users with 90+ day inactivity or disabled accounts with licenses',
    apiCall: 'GET /users?$filter=signInActivity/lastSignInDateTime le {cutoffDate}',
    waitPeriodDays: 0,
    approvalRequired: false
  },
  {
    step: 2,
    name: 'Validate candidates',
    description: 'Exclude service accounts, shared mailboxes, seasonal staff',
    apiCall: 'GET /users/{id}/licenseDetails + GET /reports/*',
    waitPeriodDays: 0,
    approvalRequired: false
  },
  {
    step: 3,
    name: 'Manager notification',
    description: 'Email manager listing affected users and proposed action',
    apiCall: 'POST /users/{reportingManagerId}/sendMail',
    waitPeriodDays: 5,
    approvalRequired: true
  },
  {
    step: 4,
    name: 'Disable account',
    description: 'Disable user account before license removal (safer intermediate step)',
    apiCall: 'PATCH /users/{id} { "accountEnabled": false }',
    waitPeriodDays: 3,
    approvalRequired: false
  },
  {
    step: 5,
    name: 'Remove license',
    description: 'Remove license from disabled/inactive user',
    apiCall: 'POST /users/{id}/assignLicense { addLicenses: [], removeLicenses: [skuId] }',
    waitPeriodDays: 0,
    approvalRequired: false
  },
  {
    step: 6,
    name: 'Document reclamation',
    description: 'Log action in audit trail for compliance reporting',
    apiCall: 'Internal audit log write',
    waitPeriodDays: 0,
    approvalRequired: false
  }
];
```

---

## Executive Summary Report Format (PowerShell)

```powershell
function New-LicenseSavingsReport {
    param(
        [Parameter(Mandatory)] [array]$InactiveUsers,
        [Parameter(Mandatory)] [array]$DowngradeCandidates,
        [Parameter(Mandatory)] [string]$TenantName,
        [Parameter(Mandatory)] [string]$OutputPath
    )

    $reportDate = Get-Date -Format "MMMM d, yyyy"
    $inactiveSavings = ($InactiveUsers | Measure-Object -Property MonthlyCost -Sum).Sum
    $downgradeSavings = ($DowngradeCandidates | Measure-Object -Property MonthlySavings -Sum).Sum
    $totalMonthly = $inactiveSavings + $downgradeSavings
    $totalAnnual = $totalMonthly * 12

    $html = @"
<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: 'Segoe UI', sans-serif; margin: 40px; color: #333; }
  h1 { color: #0078d4; }
  .summary-box { background: #f0f8ff; border-left: 4px solid #0078d4; padding: 20px; margin: 20px 0; }
  .savings-total { font-size: 28px; color: #107c10; font-weight: bold; }
  table { border-collapse: collapse; width: 100%; margin: 20px 0; }
  th { background: #0078d4; color: white; padding: 10px; text-align: left; }
  td { padding: 8px 10px; border-bottom: 1px solid #ddd; }
  tr:nth-child(even) { background: #f9f9f9; }
  .risk-high { color: #c50f1f; font-weight: bold; }
  .risk-low { color: #107c10; }
</style>
</head>
<body>
<h1>Microsoft 365 License Optimization Report</h1>
<p><strong>Tenant:</strong> $TenantName &nbsp; <strong>Report Date:</strong> $reportDate</p>

<div class="summary-box">
  <h2>Executive Summary</h2>
  <p class="savings-total">Estimated Annual Savings: $`$`$([math]::Round($totalAnnual).ToString('N0'))</p>
  <p><strong>Inactive Licenses to Remove:</strong> $($InactiveUsers.Count) users ($`$`$([math]::Round($inactiveSavings, 0))/month)</p>
  <p><strong>Downgrade Opportunities:</strong> $($DowngradeCandidates.Count) users ($`$`$([math]::Round($downgradeSavings, 0))/month)</p>
</div>

<h2>Inactive Users (Quick Wins)</h2>
<table>
  <tr><th>User</th><th>License</th><th>Last Sign-In</th><th>Monthly Cost</th><th>Risk</th></tr>
  $(
    $InactiveUsers | Select-Object -First 20 | ForEach-Object {
        "<tr><td>$($_.DisplayName)</td><td>$($_.LicenseName)</td><td>$($_.LastSignIn)</td><td>$`$`$$($_.MonthlyCost)</td><td class='risk-low'>Low</td></tr>"
    }
  )
</table>

<h2>Downgrade Candidates</h2>
<table>
  <tr><th>User</th><th>Current</th><th>Proposed</th><th>Monthly Savings</th><th>Prerequisite</th></tr>
  $(
    $DowngradeCandidates | Select-Object -First 20 | ForEach-Object {
        "<tr><td>$($_.DisplayName)</td><td>$($_.CurrentLicense)</td><td>$($_.ProposedLicense)</td><td>$`$`$$($_.MonthlySavings)</td><td>$($_.Prerequisite)</td></tr>"
    }
  )
</table>

<p style='font-size:12px;color:#666;'>
  Prices are based on Microsoft list prices. Actual savings depend on CSP/EA agreement pricing.
  Implementation requires validation of service usage and manager approval before changes are applied.
</p>
</body>
</html>
"@

    $html | Out-File -FilePath $OutputPath -Encoding UTF8
    Write-Host "Report saved to: $OutputPath"
}
```

---

## Savings Report via Graph sendMail (TypeScript)

```typescript
// Send HTML savings report via Microsoft Graph
async function sendSavingsReport(
  client: Client,
  senderUpn: string,
  recipientEmails: string[],
  tenantName: string,
  htmlReport: string
): Promise<void> {
  await client.api(`/users/${senderUpn}/sendMail`).post({
    message: {
      subject: `M365 License Optimization Report — ${tenantName} — ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
      body: {
        contentType: 'HTML',
        content: htmlReport
      },
      toRecipients: recipientEmails.map(email => ({
        emailAddress: { address: email }
      })),
      importance: 'normal'
    },
    saveToSentItems: true
  });
}
```

---

## Tenant Comparison Matrix (Multi-Tenant MSP)

```typescript
interface TenantLicenseSummary {
  tenantId: string;
  tenantName: string;
  totalLicenses: number;
  unusedLicenses: number;
  utilizationPct: number;
  inactiveUsers: number;
  estimatedMonthlySavings: number;
  estimatedAnnualSavings: number;
  topOpportunity: string;
}

// Build comparison matrix across all managed tenants
function buildTenantComparisonMatrix(
  tenants: TenantLicenseSummary[]
): string {
  const sorted = tenants.sort(
    (a, b) => b.estimatedAnnualSavings - a.estimatedAnnualSavings
  );

  const rows = sorted.map(t =>
    `| ${t.tenantName} | ${t.totalLicenses} | ${t.unusedLicenses} | ${t.utilizationPct}% | ${t.inactiveUsers} | $${t.estimatedAnnualSavings.toLocaleString()} | ${t.topOpportunity} |`
  ).join('\n');

  const totalSavings = sorted.reduce((sum, t) => sum + t.estimatedAnnualSavings, 0);

  return `
## License Optimization — Multi-Tenant Summary

| Tenant | Total Licenses | Unused | Utilization | Inactive Users | Est. Annual Savings | Top Opportunity |
|--------|---------------|--------|-------------|----------------|---------------------|-----------------|
${rows}
| **TOTAL** | | | | | **$${totalSavings.toLocaleString()}** | |

*Report generated: ${new Date().toLocaleDateString()}*
`;
}
```

---

## Error Codes

| Code | Meaning | Remediation |
|------|---------|-------------|
| 400 `InvalidBody` | Malformed sendMail body | Ensure HTML is valid and body ContentType is 'HTML' |
| 403 `Forbidden` | Missing Mail.Send permission for send | Grant `Mail.Send` or `Mail.Send.Shared` |
| 429 `TooManyRequests` | Graph throttled during bulk ops | Add delays between license assignment calls |
| `PricingDataUnavailable` (logical) | CSP pricing differs from list | Use CSP portal API or manual price file for accurate pricing |

---

## Limits

| Resource | Limit | Notes |
|----------|-------|-------|
| sendMail recipients | 500 per call | Split large distribution lists |
| sendMail body size | 4 MB | Large HTML reports may need file attachment instead |
| Graph report download size | Unlimited | Stream CSV for large tenants |
| License assignment batch | 1 per call | Use parallel execution with retry for bulk changes |

---

## Common Patterns and Gotchas

1. **List price vs actual price** — The pricing table above shows Microsoft list prices. CSP/MPSA/EA agreements typically provide 15-40% discounts. Always confirm actual pricing with the billing portal before presenting savings to customers.

2. **CSP billing cycle alignment** — License changes in CSP take effect at the next billing cycle (1st of month). A change made on March 15 is effective April 1. Calculate savings projections based on the next billing cycle, not the current month.

3. **Right-sizing risk assessment** — Always quantify implementation risk alongside savings. A 1,000-user E5→E3 downgrade has high savings but also high risk if E5 security features are actively used. Present both numbers to customers.

4. **Power BI Pro in E5** — Microsoft 365 E5 includes Power BI Pro. If a user has both an E5 license and a standalone Power BI Pro license, the standalone is redundant. Remove the standalone to avoid double-paying.

5. **Add-on licenses vs suite licenses** — Some customers have E3 + Defender P2 add-on instead of E5. At similar cost, E5 is usually preferred. Model the "consolidate to E5" scenario as part of savings reporting.

6. **Reclamation timeline** — For budgeting purposes, assume a 60-day implementation timeline from recommendation to realized savings: 2 weeks for customer approval, 2 weeks for change management, 2 weeks for billing cycle alignment.

7. **Shared mailbox licenses** — Shared mailboxes under 50 GB do not require licenses. Finding Exchange Online licenses assigned to shared mailboxes is often a quick win with zero business impact.

8. **License reclamation vs termination** — When removing a license from an active account (not deleting the account), the user loses access immediately. Plan with the customer to minimize disruption (e.g., run changes on Friday evening).

9. **Report localization** — When generating HTML reports for customers in non-English markets, format currency with the appropriate symbol and locale. Use `Intl.NumberFormat` in TypeScript for locale-aware formatting.

10. **Savings estimates are projections** — Always present savings as "estimated" with appropriate caveats. Actual savings depend on pricing agreements, change approval timelines, and whether proposed downgrades are implemented.
