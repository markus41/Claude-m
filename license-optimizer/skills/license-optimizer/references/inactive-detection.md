# Inactive License Detection — M365 License Optimizer Reference

Inactive license detection identifies users who have a Microsoft 365 license but have not been actively using the associated services. Key signals include last sign-in date, mailbox last access, Teams activity, and Office app activation status.

---

## REST API Endpoints (Microsoft Graph)

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|----------------------|----------------|-------|
| GET | `/users?$select=signInActivity` | `AuditLog.Read.All` + `User.Read.All` | `$filter`, `$top` | Last interactive + non-interactive sign-in |
| GET | `/reports/getOffice365ActiveUserDetail(period='D90')` | `Reports.Read.All` | `period` | Per-user activity across all services |
| GET | `/reports/getMailboxUsageDetail(period='D90')` | `Reports.Read.All` | `period` | Last mailbox activity, size, item count |
| GET | `/reports/getSharePointActivityUserDetail(period='D90')` | `Reports.Read.All` | `period` | SharePoint file/sync/site activity |
| GET | `/reports/getTeamsUserActivityUserDetail(period='D90')` | `Reports.Read.All` | `period` | Teams messages, calls, meetings |
| GET | `/reports/getOneDriveActivityUserDetail(period='D90')` | `Reports.Read.All` | `period` | OneDrive file activity |
| GET | `/reports/getOffice365ActivationsUserDetail` | `Reports.Read.All` | — | Office app installation/activation status |
| GET | `/reports/getSkypeForBusinessActivityUserDetail(period='D90')` | `Reports.Read.All` | `period` | Skype activity (legacy) |
| GET | `/users?$filter=accountEnabled eq false and assignedLicenses/$count ne 0` | `User.Read.All` | `$count=true` + `ConsistencyLevel: eventual` | Disabled accounts with licenses |

---

## Inactivity Threshold Reference

| Signal | Threshold | Confidence | Action |
|--------|-----------|------------|--------|
| Disabled account with license | Any | Very High | Remove license immediately |
| Never signed in | Account created > 14 days ago | High | Investigate and remove if stale |
| No sign-in > 90 days | `lastSignInDateTime < 90 days ago` | High | Candidate for license removal |
| No sign-in > 60 days | `lastSignInDateTime < 60 days ago` | Medium | Flag for review |
| No mailbox activity 90 days | No email sent/received | Medium | Confirm not a shared/service mailbox |
| No Teams activity 90 days | No message/call/meeting | Low | Teams not primary workload |
| Office apps not activated | No activation on any device | Medium | Candidate for F1/F3 downgrade |

---

## Detect Disabled Accounts with Licenses (TypeScript)

```typescript
import { Client } from '@microsoft/microsoft-graph-client';

// Quick win: disabled accounts with licenses
async function findDisabledWithLicenses(client: Client): Promise<any[]> {
  const users: any[] = [];
  let url =
    '/users' +
    '?$filter=accountEnabled eq false and assignedLicenses/$count ne 0' +
    '&$select=id,displayName,userPrincipalName,accountEnabled,assignedLicenses,signInActivity' +
    '&$count=true&$top=500';

  while (url) {
    const page = await client
      .api(url)
      .header('ConsistencyLevel', 'eventual')
      .get();
    users.push(...page.value);
    url = page['@odata.nextLink'] || null;
  }

  return users;
}
```

---

## Inactive User Detection (90-Day Threshold)

```typescript
interface InactiveUser {
  id: string;
  displayName: string;
  userPrincipalName: string;
  accountEnabled: boolean;
  lastSignInDateTime: string | null;
  lastNonInteractiveSignInDateTime: string | null;
  daysSinceActivity: number;
  assignedLicenses: Array<{ skuId: string; disabledPlans: string[] }>;
  estimatedMonthlyCost: number;
  recommendedAction: 'remove-license' | 'review' | 'downgrade';
}

async function detectInactiveUsers(
  client: Client,
  inactiveDaysThreshold: number = 90,
  licenseCostMap: Record<string, number>
): Promise<InactiveUser[]> {
  const cutoff = new Date(Date.now() - inactiveDaysThreshold * 24 * 60 * 60 * 1000);

  const allUsers: any[] = [];
  let url =
    '/users?$select=id,displayName,userPrincipalName,accountEnabled,assignedLicenses,signInActivity' +
    '&$filter=assignedLicenses/$count ne 0' +
    '&$count=true&$top=500';

  while (url) {
    const page = await client
      .api(url)
      .header('ConsistencyLevel', 'eventual')
      .get();
    allUsers.push(...page.value);
    url = page['@odata.nextLink'] || null;
  }

  const inactiveUsers: InactiveUser[] = [];

  for (const user of allUsers) {
    const lastInteractive = user.signInActivity?.lastSignInDateTime;
    const lastNonInteractive = user.signInActivity?.lastNonInteractiveSignInDateTime;

    // Use the most recent of both signals
    const latestActivity = [lastInteractive, lastNonInteractive]
      .filter(Boolean)
      .map(d => new Date(d))
      .sort((a, b) => b.getTime() - a.getTime())[0] || null;

    const isInactive = !latestActivity || latestActivity < cutoff;

    if (!isInactive && user.accountEnabled) continue;

    const daysSince = latestActivity
      ? Math.floor((Date.now() - latestActivity.getTime()) / (24 * 60 * 60 * 1000))
      : 999; // Never signed in

    // Calculate total license cost for this user
    const monthlyCost = (user.assignedLicenses || []).reduce(
      (total: number, lic: any) =>
        total + (licenseCostMap[lic.skuId] || 0),
      0
    );

    inactiveUsers.push({
      id: user.id,
      displayName: user.displayName,
      userPrincipalName: user.userPrincipalName,
      accountEnabled: user.accountEnabled,
      lastSignInDateTime: lastInteractive || null,
      lastNonInteractiveSignInDateTime: lastNonInteractive || null,
      daysSinceActivity: daysSince,
      assignedLicenses: user.assignedLicenses || [],
      estimatedMonthlyCost: monthlyCost,
      recommendedAction: !user.accountEnabled
        ? 'remove-license'
        : daysSince >= 180 ? 'remove-license'
        : daysSince >= 90 ? 'review'
        : 'downgrade'
    });
  }

  return inactiveUsers.sort(
    (a, b) => b.estimatedMonthlyCost - a.estimatedMonthlyCost
  );
}
```

---

## Activity Reports (CSV Download Pattern)

```typescript
// Download and parse the Office 365 active user detail report
async function getActiveUserReport(
  client: Client,
  period: 'D7' | 'D30' | 'D90' | 'D180' = 'D90'
): Promise<any[]> {
  const csvContent = await client
    .api(`/reports/getOffice365ActiveUserDetail(period='${period}')`)
    .header('Accept', 'text/csv')
    .get();

  // Parse CSV (skip first 2 header rows)
  const lines = csvContent.split('\n');
  const headers = lines[2].split(',').map((h: string) => h.replace(/"/g, '').trim());

  const rows: any[] = [];
  for (let i = 3; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = lines[i].split(',').map((v: string) => v.replace(/"/g, '').trim());
    const row: Record<string, string> = {};
    headers.forEach((h: string, idx: number) => {
      row[h] = values[idx] || '';
    });
    rows.push(row);
  }

  return rows;
}

// Key CSV columns in getOffice365ActiveUserDetail:
// "User Principal Name", "Display Name", "Is Deleted"
// "Has Exchange License", "Has SharePoint License", "Has OneDrive License"
// "Has Skype For Business License", "Has Yammer License", "Has Teams License"
// "Exchange Last Activity Date", "SharePoint Last Activity Date"
// "OneDrive Last Activity Date", "Teams Last Activity Date"
// "Exchange License Assign Date", "SharePoint License Assign Date"
// "Assigned Products"
```

---

## Exchange Online Mailbox Activity (PowerShell)

```powershell
Connect-ExchangeOnline -UserPrincipalName "admin@contoso.com"

# Get mailbox last user action (bypasses Graph 48h lag for EXO data)
$mailboxStats = Get-Mailbox -ResultSize Unlimited |
    Get-MailboxStatistics |
    Select-Object DisplayName, LastUserActionTime, ItemCount,
        @{ N='TotalSizeMB'; E={ [math]::Round($_.TotalItemSize.ToString().Split('(')[1].Split(' ')[0].Replace(',','') / 1MB, 2) } }

# Find mailboxes with no activity in 90 days
$cutoff = (Get-Date).AddDays(-90)
$inactiveMailboxes = $mailboxStats |
    Where-Object { $null -eq $_.LastUserActionTime -or $_.LastUserActionTime -lt $cutoff } |
    Sort-Object LastUserActionTime

$inactiveMailboxes | Format-Table DisplayName, LastUserActionTime, ItemCount, TotalSizeMB -AutoSize
Write-Host "Inactive mailboxes: $($inactiveMailboxes.Count)"
```

---

## Teams Activity Check (PowerShell via Graph)

```powershell
Connect-MgGraph -Scopes "Reports.Read.All"

# Get Teams activity — users with no Teams activity in 90 days
$csvContent = Invoke-MgGraphRequest -Method GET `
    -Uri "https://graph.microsoft.com/v1.0/reports/getTeamsUserActivityUserDetail(period='D90')" `
    -Headers @{ Accept = "text/csv" } `
    -OutputType HttpResponseMessage

$csv = $csvContent.Content.ReadAsStringAsync().Result
$lines = $csv -split "`n"
$headers = ($lines[2] -split ',') | ForEach-Object { $_.Trim('"') }

$teamsInactive = $lines[3..($lines.Count-1)] |
    Where-Object { $_ } |
    ForEach-Object {
        $values = $_ -split ','
        $row = @{}
        for ($i = 0; $i -lt $headers.Count; $i++) {
            $row[$headers[$i]] = $values[$i].Trim('"')
        }
        [PSCustomObject]$row
    } |
    Where-Object {
        $_.'Has Team Chat' -ne 'Yes' -and
        $_.'Has Private Chat' -ne 'Yes' -and
        $_.'Has Calls' -ne 'Yes' -and
        $_.'Has Meetings' -ne 'Yes'
    }

Write-Host "Users with no Teams activity in 90 days: $($teamsInactive.Count)"
```

---

## Office Activation Status

```typescript
// Find E3/E5 users who have never activated Office apps
// (candidates for Business Basic or F3 downgrade)
async function findUnactivatedOfficeUsers(client: Client): Promise<any[]> {
  const csvContent = await client
    .api("/reports/getOffice365ActivationsUserDetail")
    .header('Accept', 'text/csv')
    .get();

  const lines = csvContent.split('\n');
  const headers = lines[2].split(',').map((h: string) => h.replace(/"/g, '').trim());

  const unactivated: any[] = [];
  for (let i = 3; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = lines[i].split(',').map((v: string) => v.replace(/"/g, '').trim());
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = values[idx] || ''; });

    // Check if user has any Office app activations
    const hasActivations = [
      row['Windows'],
      row['Mac'],
      row['iOS'],
      row['Android'],
      row['Windows 10 Mobile']
    ].some(v => parseInt(v || '0') > 0);

    if (!hasActivations && row['Product Type'] !== '') {
      unactivated.push({
        upn: row['User Principal Name'],
        displayName: row['Display Name'],
        productType: row['Product Type'],
        lastActivatedDate: row['Last Activated Date'] || 'Never'
      });
    }
  }

  return unactivated;
}
```

---

## Error Codes

| Code | Meaning | Remediation |
|------|---------|-------------|
| 400 `ConsistencyLevelRequired` | Missing header for `$count` + `$filter` | Add `ConsistencyLevel: eventual` header |
| 403 `Forbidden` | Missing `AuditLog.Read.All` for signInActivity | Consent `AuditLog.Read.All` application permission |
| 403 `InsufficientLicense` | Tenant lacks Entra ID P1 | `signInActivity` requires P1+ license |
| 403 `Reports` | Missing `Reports.Read.All` | Grant Reports permission in app registration |
| 429 `TooManyRequests` | Graph throttled | Back off 5-10 seconds between report API calls |
| `EmptyResponse` (CSV) | No data for selected period | Period may extend beyond tenant data history |

---

## Limits

| Resource | Limit | Notes |
|----------|-------|-------|
| `signInActivity` data retention | 30 days (P1) | Older sign-ins are not queryable |
| Report API data lag | 48 hours | Reports reflect T-2 days |
| Report API periods | D7, D30, D90, D180 | No custom date range |
| Users per page | 999 (`$top`) | Always paginate |
| CSV report size | Unlimited | Parse line-by-line for large tenants |
| Mailbox activity (EXO) | 90 days | `LastUserActionTime` oldest recorded |

---

## Common Patterns and Gotchas

1. **Non-interactive sign-ins must be checked** — A user running Power Automate flows or background sync processes generates non-interactive sign-ins. If you only check `lastSignInDateTime`, you will incorrectly flag these active users as inactive.

2. **Service accounts vs human accounts** — Service accounts often have `signInActivity` of never-signed-in because they use certificates or client secrets (non-interactive). Always cross-reference with account naming conventions and team ownership before flagging service accounts.

3. **Report API is not real-time** — Reports reflect activity from T-2 days (48-hour lag). For current-state decisions, use `signInActivity` from the users endpoint. For trend analysis, use reports.

4. **Shared mailboxes don't need licenses** — Shared mailboxes (up to 50 GB) do not require Exchange Online licenses. Check if "inactive" mailboxes are actually shared mailboxes accessed by others. Use `Get-Mailbox -Filter "RecipientTypeDetails -eq 'SharedMailbox'"`.

5. **Seasonal inactive users** — Some users (teachers, seasonal workers, contract staff) may be genuinely inactive for 90+ days but still require licenses for when they return. Always verify with HR or department heads before bulk removal.

6. **P1 requirement for signInActivity** — If the tenant does not have any Entra ID P1 or P2 licenses, `signInActivity` returns null for all users. In this case, fall back to Exchange last logon time and report API data.

7. **Never-signed-in filtering** — Users who have never signed in since account creation may be recently provisioned accounts, not stale ones. Filter with `createdDateTime` to exclude accounts less than 14 days old.

8. **Licensed guest users** — Guest users can be assigned M365 licenses in some scenarios. Ensure your inactive scan includes guest users (`userType eq 'Guest'`) — they are often overlooked.

9. **EXO `Get-MailboxStatistics` performance** — Running `Get-MailboxStatistics` on all mailboxes in large tenants (10,000+) can take hours. Run during off-peak hours and use `-Filter` to limit scope.

10. **Report anonymization** — Some tenants have anonymization enabled for usage reports (Entra ID → Usage reports settings). In this case, UPNs in reports are replaced with GUIDs. Disable anonymization or use the Graph API `signInActivity` endpoint instead.
