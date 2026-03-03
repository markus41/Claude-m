# Microsoft Official Documentation References

Curated Microsoft Learn URLs with annotations for process and task mining from Microsoft log sources. All links verified as of 2026-03.

---

## Process Mining in Power Automate

### PA Process Mining Overview
**URL:** https://learn.microsoft.com/en-us/power-automate/process-mining-overview

What it covers:
- Native Process Mining feature inside Power Automate (Power Platform)
- Importing event logs via CSV, Azure Data Lake, or direct Dataverse connection
- AI-powered process map generation
- Throughput time and variant analysis in the UI
- Licensing: Process Mining is included with Power Automate Premium

Key fact: PA Process Mining operates on a fixed ingestion schema — `CaseId`, `ActivityName`, `StartTimestamp`. The `log-extract` command outputs a CSV superset of this schema that can be directly imported into the PA Process Mining UI for native visualization.

---

### PA Process Mining Data Format
**URL:** https://learn.microsoft.com/en-us/power-automate/process-mining-processes-and-data

What it covers:
- Official CSV column specification: `CaseId` (required), `ActivityName` (required), `StartTimestamp` (required), `EndTimestamp` (optional), `Resource` (optional)
- Data type requirements and timestamp format (ISO 8601)
- Custom attribute columns (allowed — preserved in PA Process Mining as additional dimensions)
- Maximum file size for CSV import

Key fact: Additional columns beyond the required three are allowed and appear as filterable attributes in the process map. The plugin's `sourceSystem` and `rawEventId` extension columns pass through without issue.

---

### PA Task Mining Overview
**URL:** https://learn.microsoft.com/en-us/power-automate/task-mining-overview

What it covers:
- Desktop recording-based task capture (Power Automate desktop recorder)
- Automatic process map generation from screen recordings
- Identifying automation opportunities in repetitive UI tasks
- No programmatic API for task mining data — recordings only

Key fact: **Task Mining has no log API.** The log-based approach in this plugin uses M365 Unified Audit Log to approximate task-level activities for knowledge-worker processes. True task mining (sub-application keystroke level) requires desktop recordings via the Task Mining feature.

---

## M365 Unified Audit Log

### Audit Solutions Overview (Purview)
**URL:** https://learn.microsoft.com/en-us/purview/audit-solutions-overview

What it covers:
- Audit (Standard) vs Audit (Premium) feature comparison
- Retention periods: Standard = 180 days, Premium (E5/E5 Compliance) = 1 year, 10-Year Add-on available
- Supported workloads: Exchange, SharePoint, OneDrive, Teams, Entra ID, Power Platform
- How to search audit logs in the Microsoft Purview compliance portal
- Audit log record types and schema

Key fact: Retention starts from the event date, not from when audit was enabled. If audit was disabled and re-enabled, there is a gap. Always check `az rest --url "https://graph.microsoft.com/v1.0/subscribedSkus"` to confirm E5 licensing before assuming 1-year retention.

---

### Graph Audit Log Query API (Beta)
**URL:** https://graph.microsoft.com/beta/security/auditLog/queries

What it covers:
- Async query pattern: POST to create job → GET to poll status → GET `/records` to retrieve results
- Supported filter parameters: `filterStartDateTime`, `filterEndDateTime`, `recordTypeFilters`, `operationFilters`, `userPrincipalNameFilters`, `ipAddressFilters`, `objectIdFilters`
- Pagination via `@odata.nextLink` / `$skiptoken`
- Rate limits: max 10 concurrent jobs; max 1 unfiltered query at a time
- Results available for 30 days after job completion

Key fact: This endpoint is in `/beta` and has remained there. Do not use `/v1.0/security/auditLog/queries` — it does not exist in GA. The beta endpoint is stable and used by Microsoft's own compliance portal.

Microsoft Learn reference: https://learn.microsoft.com/en-us/graph/api/security-auditcoreroot-list-auditlogqueries

---

## Office 365 Management Activity API

### API Reference
**URL:** https://learn.microsoft.com/en-us/office/office-365-management-api/office-365-management-activity-api-reference

What it covers:
- Subscription-based pull model: subscribe to content types, then list/fetch content blobs
- Content types: `Audit.AzureActiveDirectory`, `Audit.Exchange`, `Audit.SharePoint`, `Audit.General`, `DLP.All`
- `Audit.General` includes Power Platform, Power Automate, and Dynamics 365 events
- Push via webhook (optional): register a webhook URL to receive notifications
- 7-day rolling availability window for content blobs (different from UAL retention)
- Base URL: `https://manage.office.com/api/v1.0/{tenantId}/activity/feed`

Key fact: Power Platform and Power Automate activity logs surface through `Audit.General` — not through a dedicated Power Automate API. The `Workload` field in each record identifies the source (`PowerPlatform`, `PowerAutomate`, `MicrosoftFlow`).

---

## Power Platform Admin

### Power Platform Activity Logs Overview
**URL:** https://learn.microsoft.com/en-us/power-platform/admin/activity-logging-auditing/activity-logs-overview

What it covers:
- Which Power Platform operations are logged (environment changes, connector usage, DLP events, app launches)
- How to access logs: via Purview compliance portal, Office 365 Management Activity API, or Microsoft Sentinel connector
- Enabling Power Platform audit in the Power Platform Admin Center
- Supported record types in the audit log

Key fact: Power Platform connector-level activity (which connector was called, when, by whom) requires the **Power Platform connector activity** feature, which must be explicitly enabled per environment in the PPAC. Standard flow run history does not appear in the UAL — it is available via the Power Platform API (`/powerautomate/environments/{envId}/flowRuns`).

---

### Dataverse Auditing
**URL:** https://learn.microsoft.com/en-us/power-platform/admin/manage-dataverse-auditing

What it covers:
- Enabling audit at organization, entity (table), and field level
- Audit log retention: configurable from 30 days to unlimited (premium)
- Accessing audit log programmatically via the `audits` entity in Dataverse Web API
- Audit log schema: `auditid`, `operation`, `createdon`, `_userid_value`, `_regardingobjectid_value`, `objecttypecode`, `changedata`
- Bulk delete audit log via bulk delete jobs
- System/admin audit vs user-level audit distinction

Key fact: Dataverse audit must be enabled at **three levels** to capture data: organization-level audit must be ON, entity-level audit must be ON for each table, and field-level audit must be ON for each field. If any level is disabled, those events are not logged. Always verify all three levels during `/mining-setup`.

---

## Quick Reference Card

| Need | URL |
|---|---|
| PA Process Mining UI + import format | https://learn.microsoft.com/en-us/power-automate/process-mining-overview |
| CSV column spec (CaseId/ActivityName/StartTimestamp) | https://learn.microsoft.com/en-us/power-automate/process-mining-processes-and-data |
| Task mining (desktop recordings) | https://learn.microsoft.com/en-us/power-automate/task-mining-overview |
| UAL retention & coverage | https://learn.microsoft.com/en-us/purview/audit-solutions-overview |
| Graph audit query API (async pattern) | https://learn.microsoft.com/en-us/graph/api/security-auditcoreroot-list-auditlogqueries |
| O365 Management Activity API | https://learn.microsoft.com/en-us/office/office-365-management-api/office-365-management-activity-api-reference |
| Power Platform activity log setup | https://learn.microsoft.com/en-us/power-platform/admin/activity-logging-auditing/activity-logs-overview |
| Dataverse audit enable + access | https://learn.microsoft.com/en-us/power-platform/admin/manage-dataverse-auditing |
