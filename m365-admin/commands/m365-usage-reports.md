---
name: m365-usage-reports
description: Generate M365 usage and adoption reports — email, Teams, OneDrive, SharePoint, mailbox usage, and active user counts across configurable time periods.
argument-hint: "<report-type> [--period <D7|D30|D90|D180>] [--format <json|csv>] [--output <filePath>] [--inactive-days <N>]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
---

# M365 Usage Reports and Adoption Analytics

Generate Microsoft 365 usage and adoption reports via Microsoft Graph API.

## Report Types

- `email-activity` — Per-user email send/receive/read activity
- `teams-activity` — Per-user Teams chat, call, and meeting activity
- `teams-devices` — Teams device type usage per user
- `onedrive-usage` — OneDrive storage usage per user
- `sharepoint-usage` — SharePoint site usage and activity
- `mailbox-usage` — Mailbox storage and quota per user
- `active-users` — M365 app active user counts by product
- `inactive-users` — Users with no M365 activity (cross-reference with licensing)
- `adoption-summary` — Combined adoption dashboard across all products

## Workflow

1. **Validate context** — Confirm `tenantId` is set; verify scope `Reports.Read.All`
2. **Parse arguments** — Determine report type, period (default D30), output format
3. **Fetch report** — Call appropriate Graph reports endpoint
4. **Process data** — Parse CSV or JSON; apply filters (e.g., inactive users only)
5. **Output** — Write to file if `--output` specified; display markdown summary table
6. **License cross-reference** (for `inactive-users`) — Query `/users` to match licensed-but-inactive

## Key Endpoints

| Report | Endpoint |
|---|---|
| Email activity | `GET /reports/getEmailActivityUserDetail(period='D30')` |
| Teams activity | `GET /reports/getTeamsUserActivityUserDetail(period='D30')` |
| Teams device usage | `GET /reports/getTeamsDeviceUsageUserDetail(period='D30')` |
| OneDrive usage | `GET /reports/getOneDriveUsageAccountDetail(period='D30')` |
| SharePoint site usage | `GET /reports/getSharePointSiteUsageDetail(period='D30')` |
| Mailbox usage | `GET /reports/getMailboxUsageDetail(period='D30')` |
| M365 app usage | `GET /reports/getM365AppUserDetail(period='D30')` |
| Active user counts | `GET /reports/getOffice365ActiveUserCounts(period='D30')` |

## Period Values

`D7` (7 days), `D30` (30 days, default), `D90` (90 days), `D180` (180 days)

## Output Formats

- `json` — Parsed JSON array (default for programmatic use)
- `csv` — Raw CSV download (append `?$format=text/csv`)

## Inactive User Detection Logic

For `inactive-users` report:
1. Fetch `getM365AppUserDetail(period='D90')` — users active in any M365 app
2. Fetch `/users?$filter=assignedLicenses/$count ne 0` — all licensed users
3. Cross-reference: find licensed users not in the active-users report
4. Exclude users created within the period (recently onboarded)
5. Output table: UPN, display name, assigned SKUs, last sign-in, recommended action

## Adoption Summary Dashboard Columns

| Metric | Source |
|---|---|
| Email Active Users | `getEmailActivityCounts` |
| Teams Active Users | `getTeamsUserActivityCounts` |
| OneDrive Active Users | `getOneDriveUsageStorage` |
| SharePoint Active Users | `getSharePointActivityUserCounts` |
| Total Licensed Users | `GET /subscribedSkus` |

## Important Notes

- Requires `Reports.Read.All` delegated scope — not available as application permission
- Report data may be anonymized — check tenant privacy settings if UPNs are hidden
- CSV reports require following a redirect to retrieve the actual data
- All usage data is aggregated — individual-level data requires the `*UserDetail` endpoints
- Reference: `skills/m365-admin/references/reports-analytics.md`
