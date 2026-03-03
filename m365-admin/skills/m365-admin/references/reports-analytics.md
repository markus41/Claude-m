# M365 Usage Reports and Adoption Analytics

This reference covers Microsoft 365 usage reports and adoption analytics via Microsoft Graph API.

## Required Scopes

| Operation | Scope | Notes |
|---|---|---|
| All usage reports | `Reports.Read.All` | Delegated only — no application permission for privacy |
| Adoption Score | `Reports.Read.All` | Global Admin or Reports Reader role required |

**Privacy note**: Usage report data may be anonymized in tenants with privacy settings enabled. Admins can disable anonymization via M365 Admin Center > Settings > Org Settings > Services > Reports.

## Period Values

All reports support: `D7`, `D30`, `D90`, `D180` (days).

## Output Formats

- Default: JSON (when using Graph SDK)
- CSV: append `?$format=text/csv` to the URL
- For download via HTTP: response is a redirect to a blob URL — follow the redirect

## Email Activity Reports

### User-Level Email Activity

```
GET https://graph.microsoft.com/v1.0/reports/getEmailActivityUserDetail(period='D30')
```

Returns per-user: send count, receive count, read count, meeting created, meeting interacted.

### Email Activity Summary (aggregate counts)

```
GET https://graph.microsoft.com/v1.0/reports/getEmailActivityCounts(period='D30')
```

### App Usage (which clients users connect with)

```
GET https://graph.microsoft.com/v1.0/reports/getEmailAppUsageUserDetail(period='D30')
```

## Microsoft Teams Activity Reports

### Teams User Activity

```
GET https://graph.microsoft.com/v1.0/reports/getTeamsUserActivityUserDetail(period='D30')
```

Columns: UPN, last activity date, team chat message count, private chat message count, calls, meetings, meetings organized, meetings attended, audio/video minutes.

### Teams Activity Summary

```
GET https://graph.microsoft.com/v1.0/reports/getTeamsUserActivityCounts(period='D30')
```

### Teams Device Usage

```
GET https://graph.microsoft.com/v1.0/reports/getTeamsDeviceUsageUserDetail(period='D30')
```

Identifies which devices (Windows, Mac, iOS, Android, Web) each user accesses Teams from.

## OneDrive Usage Reports

### OneDrive Usage per User

```
GET https://graph.microsoft.com/v1.0/reports/getOneDriveUsageAccountDetail(period='D30')
```

Columns: UPN, storage used (bytes), storage allocated, file count, active file count, last activity date.

### Storage Summary

```
GET https://graph.microsoft.com/v1.0/reports/getOneDriveUsageStorage(period='D30')
```

## SharePoint Usage Reports

### SharePoint Site Usage

```
GET https://graph.microsoft.com/v1.0/reports/getSharePointSiteUsageDetail(period='D30')
```

Columns: site URL, storage used, file count, active file count, page view count, visited page count, last activity date.

### SharePoint Activity per User

```
GET https://graph.microsoft.com/v1.0/reports/getSharePointActivityUserDetail(period='D30')
```

## Microsoft 365 Active Users

### Active Users Summary

```
GET https://graph.microsoft.com/v1.0/reports/getM365AppUserDetail(period='D30')
```

Shows which M365 apps each user has been active in: Teams, Exchange, OneDrive, SharePoint, Yammer, Skype.

### Active User Counts by Product

```
GET https://graph.microsoft.com/v1.0/reports/getOffice365ActiveUserCounts(period='D30')
```

## Mailbox Usage Reports

### Mailbox Storage Usage per User

```
GET https://graph.microsoft.com/v1.0/reports/getMailboxUsageDetail(period='D30')
```

Columns: UPN, display name, mailbox type, storage used (bytes), quota, deleted item count, deleted item size.

### Mailbox Usage Summary

```
GET https://graph.microsoft.com/v1.0/reports/getMailboxUsageMailboxCounts(period='D30')
```

Returns: total mailboxes, active mailboxes.

## Yammer Activity

```
GET https://graph.microsoft.com/v1.0/reports/getYammerActivityUserDetail(period='D30')
```

## Microsoft Forms Activity

```
GET https://graph.microsoft.com/v1.0/reports/getFormsUserActivityUserDetail(period='D30')
```

## Adoption Score

### Get Adoption Score Details

The Adoption Score API provides organizational-level scores across People Experiences and Technology Experiences dimensions.

```
GET https://graph.microsoft.com/v1.0/reports/getM365AppUserDetail(period='D30')
```

For full Adoption Score (requires separate endpoint):

```
GET https://graph.microsoft.com/beta/reports/userInsights/monthly/activeUsers
```

## Parsing CSV Reports

CSV reports have a header row with column names. Example TypeScript pattern:

```typescript
async function getReportCsv(graphClient: Client, endpoint: string): Promise<Record<string, string>[]> {
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/${endpoint}?$format=text/csv`,
    { headers: { Authorization: `Bearer ${accessToken}` }, redirect: "follow" }
  );
  const csv = await response.text();
  const lines = csv.trim().split("\n");
  const headers = lines[0].split(",").map(h => h.replace(/^"|"$/g, "").trim());
  return lines.slice(2).map(line => { // skip header and empty line
    const values = line.split(",").map(v => v.replace(/^"|"$/g, "").trim());
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ""]));
  });
}
```

## Common Admin Scenarios

### Find Inactive M365 Users (no activity in 30 days)

```typescript
// Get active users from M365 App Usage report
const report = await getReportCsv(graphClient, "reports/getM365AppUserDetail(period='D30')");
const inactive = report.filter(u => !u["Has Exchange License"] && !u["Has Teams License"]);
```

### License Optimization: Licensed but Inactive

1. `GET /reports/getOffice365ActiveUserDetail(period='D90')` — find users inactive for 90 days
2. `GET /users?$filter=assignedLicenses/$count ne 0` — get all licensed users
3. Cross-reference to find licensed-but-inactive users
4. Review before removing licenses (user may be on leave)

### Teams Adoption Dashboard

Combine:
- `getTeamsUserActivityCounts` for aggregate trend
- `getTeamsUserActivityUserDetail` for per-user breakdown
- `getTeamsDeviceUsageUserDetail` for platform breakdown

Export as CSV and import into Excel or Power BI for visualization.
