# Audit Reporting — SharePoint Sharing Auditor Reference

Microsoft 365 audit reporting for sharing events uses the Office 365 Management Activity API, Microsoft Graph audit log queries, and SharePoint PowerShell. Sharing audit events capture who shared what with whom, when anonymous links were created, and when guest access was granted.

---

## REST API Endpoints

### Office 365 Management Activity API

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|----------------------|----------------|-------|
| POST | `https://manage.office.com/api/v1.0/{tenantId}/activity/feed/subscriptions/start?contentType=Audit.SharePoint` | `ActivityFeed.Read` | Body: `{}` | Start subscription |
| GET | `https://manage.office.com/api/v1.0/{tenantId}/activity/feed/subscriptions/content?contentType=Audit.SharePoint&startTime=...&endTime=...` | `ActivityFeed.Read` | `startTime`, `endTime` | List available content blobs |
| GET | `{contentUri}` | `ActivityFeed.Read` | — | Fetch events from blob URI |
| GET | `https://manage.office.com/api/v1.0/{tenantId}/activity/feed/subscriptions/list` | `ActivityFeed.Read` | — | List active subscriptions |

### Microsoft Graph Audit Log (Beta)

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|----------------------|----------------|-------|
| POST | `https://graph.microsoft.com/beta/security/auditLog/queries` | `AuditLog.Read.All` | Body: query config | Create audit query |
| GET | `https://graph.microsoft.com/beta/security/auditLog/queries/{id}` | `AuditLog.Read.All` | — | Poll query status |
| GET | `https://graph.microsoft.com/beta/security/auditLog/queries/{id}/records` | `AuditLog.Read.All` | `$top`, `$filter` | Fetch query records |

### Graph Reports API

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|----------------------|----------------|-------|
| GET | `https://graph.microsoft.com/v1.0/reports/getSharePointActivityUserDetail(period='D30')` | `Reports.Read.All` | `period='D7\|D30\|D90\|D180'` | Per-user SharePoint activity (CSV) |
| GET | `https://graph.microsoft.com/v1.0/reports/getSharePointSiteUsageDetail(period='D30')` | `Reports.Read.All` | `period` | Per-site usage metrics |
| GET | `https://graph.microsoft.com/v1.0/reports/getOneDriveActivityUserDetail(period='D30')` | `Reports.Read.All` | `period` | Per-user OneDrive activity |

---

## SharePoint Audit Events (Key Operations)

| Operation | Description | Risk Signal |
|-----------|-------------|-------------|
| `AnonymousLinkCreated` | "Anyone with link" link created | High — no sign-in required |
| `AnonymousLinkUpdated` | Anonymous link modified | Medium |
| `AnonymousLinkUsed` | Anonymous link accessed | Informational — track usage |
| `SharingSet` | Sharing invitation sent to external | Medium — external guest |
| `SharingInvitationCreated` | New external sharing invitation | Medium |
| `SharingInvitationAccepted` | External user accepted invitation | Informational |
| `AddedToGroup` | User added to SharePoint group | Depends on group |
| `SecureLinkCreated` | Organization-wide "People in org" link created | Low |
| `SiteCollectionAdminAdded` | Site collection admin granted | High — elevated privilege |
| `PermissionLevelAdded` | Custom permission level created | Medium |
| `FileAccessed` | File accessed (by any user) | Informational |
| `FileDownloaded` | File downloaded | Informational / flaggable if external |
| `FileSyncDownloadedFull` | Full sync to local client | Medium — data on endpoint |

---

## Query Sharing Audit Events (Graph)

```typescript
import { Client } from '@microsoft/microsoft-graph-client';

// Create audit log query for sharing events
async function querySharePointAuditEvents(
  client: Client,
  startDate: Date,
  endDate: Date
): Promise<string> {
  const query = await client
    .api('/beta/security/auditLog/queries')
    .post({
      displayName: `SharePoint Sharing Audit ${startDate.toISOString().split('T')[0]}`,
      filterStartDateTime: startDate.toISOString(),
      filterEndDateTime: endDate.toISOString(),
      operationFilters: [
        'AnonymousLinkCreated',
        'AnonymousLinkUpdated',
        'SharingSet',
        'SharingInvitationCreated',
        'SharingInvitationAccepted',
        'AddedToGroup',
        'SiteCollectionAdminAdded'
      ],
      recordTypeFilters: ['sharePoint', 'sharePointFileOperation']
    });

  return query.id;
}

// Poll until complete and collect results
async function collectAuditResults(
  client: Client,
  queryId: string
): Promise<any[]> {
  // Poll for status
  let status = 'notStarted';
  while (status !== 'succeeded' && status !== 'failed') {
    await new Promise(r => setTimeout(r, 5000));
    const poll = await client
      .api(`/beta/security/auditLog/queries/${queryId}`)
      .get();
    status = poll.status;
  }

  if (status === 'failed') throw new Error('Audit query failed');

  // Paginate through results
  const records: any[] = [];
  let url = `/beta/security/auditLog/queries/${queryId}/records?$top=500`;

  while (url) {
    const page = await client.api(url).get();
    records.push(...page.value);
    url = page['@odata.nextLink'] || null;
  }

  return records;
}
```

---

## Office 365 Management Activity API (Full Polling Pattern)

```typescript
// Start SharePoint subscription
async function startActivitySubscription(
  tenantId: string,
  accessToken: string
): Promise<void> {
  await fetch(
    `https://manage.office.com/api/v1.0/${tenantId}/activity/feed/subscriptions/start?contentType=Audit.SharePoint`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    }
  );
}

// Fetch available content blobs (24-hour window max)
async function fetchContentBlobs(
  tenantId: string,
  accessToken: string,
  startTime: Date,
  endTime: Date
): Promise<string[]> {
  const start = startTime.toISOString().replace('Z', '');
  const end = endTime.toISOString().replace('Z', '');

  const response = await fetch(
    `https://manage.office.com/api/v1.0/${tenantId}/activity/feed/subscriptions/content?contentType=Audit.SharePoint&startTime=${start}&endTime=${end}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  const blobs = await response.json();
  return blobs.map((b: any) => b.contentUri);
}

// Process each blob
async function processAuditBlob(
  contentUri: string,
  accessToken: string
): Promise<any[]> {
  const response = await fetch(contentUri, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  return response.json();
}
```

---

## SharePoint PowerShell Audit Export

```powershell
Connect-SPOService -Url "https://contoso-admin.sharepoint.com"

# Get all anonymous links across a specific site
$site = Get-SPOSite -Identity "https://contoso.sharepoint.com/sites/finance"
Get-SPOSiteGroup -Site $site.Url | ForEach-Object {
    $group = $_
    Get-SPOSiteGroupMember -Site $site.Url -Group $group.Title |
        Where-Object { $_.LoginName -like "*#ext#*" } |
        Select-Object @{N='Site';E={$site.Url}}, @{N='Group';E={$group.Title}},
            LoginName, Title, Email
}

# Export sharing report for all sites (batch)
$sites = Get-SPOSite -Limit All -IncludePersonalSite $false
$sharingReport = foreach ($site in $sites) {
    try {
        $externalUsers = Get-SPOExternalUser -SiteUrl $site.Url -PageSize 200 -ErrorAction SilentlyContinue
        foreach ($user in $externalUsers) {
            [PSCustomObject]@{
                Site          = $site.Url
                SiteTemplate  = $site.Template
                ExternalUser  = $user.Email
                DisplayName   = $user.DisplayName
                Accepted      = $user.Accepted
                WhenCreated   = $user.WhenCreated
            }
        }
    } catch { }
}
$sharingReport | Export-Csv -Path ".\external-users-$(Get-Date -Format 'yyyy-MM-dd').csv" -NoTypeInformation
```

---

## Microsoft Purview Audit Search via PowerShell

```powershell
Connect-IPPSSession -UserPrincipalName "admin@contoso.com"

# Search sharing events in last 30 days
$startDate = (Get-Date).AddDays(-30).ToString("MM/dd/yyyy HH:mm:ss")
$endDate = Get-Date -Format "MM/dd/yyyy HH:mm:ss"

Search-UnifiedAuditLog `
    -StartDate $startDate `
    -EndDate $endDate `
    -RecordType SharePoint `
    -Operations "AnonymousLinkCreated","SharingSet","SharingInvitationCreated" `
    -ResultSize 5000 |
    Select-Object CreationDate, UserIds, Operations, @{
        N='AuditData'; E={ $_.AuditData | ConvertFrom-Json }
    } |
    ForEach-Object {
        [PSCustomObject]@{
            Date        = $_.CreationDate
            User        = $_.UserIds
            Operation   = $_.Operations
            TargetUser  = $_.AuditData.TargetUserOrGroupName
            ItemType    = $_.AuditData.ItemType
            ObjectId    = $_.AuditData.ObjectId
            SiteUrl     = $_.AuditData.SiteUrl
            LinkType    = $_.AuditData.TargetUserOrGroupType
        }
    } |
    Export-Csv -Path ".\sharing-audit-$(Get-Date -Format 'yyyy-MM-dd').csv" -NoTypeInformation

# Schedule recurring audit report (example with Task Scheduler trigger)
# Save above as Invoke-SharingAudit.ps1 and schedule via Windows Task Scheduler or Azure Automation
```

---

## Report Scheduling with Azure Automation

```powershell
# Create a scheduled runbook in Azure Automation for weekly sharing reports
# The runbook authenticates via managed identity:

# Authenticate
Connect-MgGraph -Identity
$token = (Get-AzAccessToken -ResourceUrl "https://manage.office.com").Token

# Run audit query
$tenantId = (Get-MgContext).TenantId
$startTime = (Get-Date).AddDays(-7)
$endTime = Get-Date

# Collect events and email report via Graph
$reportHtml = Generate-SharingAuditReport -Events $allEvents  # Custom function
Send-MgUserMail -UserId "reports@contoso.com" -BodyParameter @{
    message = @{
        subject = "Weekly SharePoint Sharing Audit — $(Get-Date -Format 'yyyy-MM-dd')"
        body = @{
            contentType = "HTML"
            content = $reportHtml
        }
        toRecipients = @(@{
            emailAddress = @{ address = "compliance@contoso.com" }
        })
    }
}
```

---

## Error Codes

| Code | Meaning | Remediation |
|------|---------|-------------|
| 400 `InvalidRequest` | Malformed audit query | Check `operationFilters` values against known operations list |
| 401 `Unauthorized` | Invalid or expired token | Re-authenticate; Office Management API requires separate OAuth scope |
| 403 `Forbidden` | Missing `ActivityFeed.Read` consent | Grant OAuth consent for Management API app registration |
| 404 `SubscriptionNotFound` | Subscription not started | Call `subscriptions/start` before querying content |
| 429 `TooManyRequests` | Management API throttled | Retry after delay; max 60 requests/minute |
| `QueryExpired` | Audit query result expired | Re-run query; results expire after 24 hours |

---

## Limits

| Resource | Limit | Notes |
|----------|-------|-------|
| Management API date range | 24 hours per content request | Chain requests for longer ranges |
| Audit log retention (E3) | 90 days | — |
| Audit log retention (E5) | 1 year | Extended to 10 years with add-on |
| Graph audit query date range | 180 days | Per query |
| Unified Audit Log search results | 5,000 per `Search-UnifiedAuditLog` call | Use `SessionCommand` to paginate |
| Content blob expiry | 7 days | After available, fetch within 7 days |
| Graph audit query result pages | Paginate with `@odata.nextLink` | No explicit page limit |
| Audit log ingest delay | Up to 30 minutes | Events are not real-time |

---

## Common Patterns and Gotchas

1. **Audit log is not real-time** — SharePoint audit events typically appear in the unified audit log within 15-30 minutes. Do not rely on audit data for immediate incident detection — use Sentinel data connector with streaming ingestion instead.

2. **Management API vs Graph audit** — The Office 365 Management Activity API provides events in near-real-time via content blobs (push/pull model). The Graph `auditLog/queries` endpoint is simpler to use but has higher query latency. Choose based on use case.

3. **SharePoint audit requires E3+** — SharePoint audit events require an Office 365 or Microsoft 365 E3 or higher license. F1/F3 users do not generate SharePoint audit records.

4. **Audit record parsing** — The `AuditData` field from PowerShell and the `auditLogRecordContent` from Graph are JSON strings within the record. Always parse with `ConvertFrom-Json` or `JSON.parse()` before accessing fields.

5. **Anonymous link creation vs usage** — `AnonymousLinkCreated` tells you when a link was made. `AnonymousLinkUsed` tells you when it was actually accessed (and by what IP). Both events are needed for a complete anonymous access picture.

6. **Content type scopes** — The Management API has separate content types: `Audit.SharePoint`, `Audit.Exchange`, `Audit.AzureActiveDirectory`, `Audit.General`. Subscribe to each separately if needed.

7. **Report API data lag** — Graph report endpoints (`/reports/getSharePoint*`) have a 48-hour data lag. These reports are aggregated for usage analysis, not for real-time security auditing.

8. **Deleted item audit** — Audit events for files in the Recycle Bin continue to be generated. Filter `ObjectId` values containing `RecycleBin` if you want to exclude deleted items.

9. **Site collection admin adds** — `SiteCollectionAdminAdded` events indicate elevated privilege grants. These should be treated as high-priority findings and reviewed within 24 hours.

10. **Personal sites (OneDrive)** — OneDrive personal sites (`/personal/{upn}/`) generate the same audit operations as SharePoint sites. Include `Audit.SharePoint` content type to capture OneDrive sharing events.
