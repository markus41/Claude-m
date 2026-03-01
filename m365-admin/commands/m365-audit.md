---
name: m365-audit
description: Generate M365 audit reports — sign-in logs, directory changes, license usage, permission audits. Export as markdown tables or CSV.
argument-hint: "<report-type> [--user <upn>] [--days <number>] [--format <markdown|csv>] [--output <path>]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
---

# M365 Audit Reports

Generate audit and compliance reports from Microsoft 365 via Microsoft Graph API and PnP PowerShell.

## Report Types

### Sign-In Logs (`sign-ins`)
Query user sign-in activity from Entra ID.

**Endpoint**: GET `/auditLogs/signIns`
**Scope**: `AuditLog.Read.All`

Arguments:
- `--user <upn>`: Filter by specific user
- `--days <number>`: Number of days to look back (default: 7)
- `--status <success|failure|all>`: Filter by sign-in status
- `--app <appName>`: Filter by application name
- `--top <number>`: Maximum results (default: 100)

Output columns: DateTime, User, Application, IPAddress, Location, Status, FailureReason

### Directory Changes (`directory`)
Audit all directory changes (user creates, updates, deletes, role changes, group changes).

**Endpoint**: GET `/auditLogs/directoryAudits`
**Scope**: `AuditLog.Read.All`

Arguments:
- `--days <number>`: Number of days to look back (default: 7)
- `--activity <activityName>`: Filter by activity (e.g., "Add user", "Update user", "Add member to group")
- `--category <category>`: Filter by category (e.g., "UserManagement", "GroupManagement", "RoleManagement")
- `--user <upn>`: Filter by target user

Output columns: DateTime, Activity, Category, InitiatedBy, Target, Result, Details

### License Usage (`license-usage`)
Report on license inventory and utilization.

**Endpoint**: GET `/subscribedSkus`, GET `/users` with `assignedLicenses` and `signInActivity`

Arguments:
- `--inactive-days <number>`: Threshold for marking users as inactive (default: 30)
- `--detail`: Include per-user license detail

Output: SKU inventory table, utilization percentages, inactive/disabled accounts with licenses, savings recommendations

### Permission Audit (`permissions`)
Audit permissions across SharePoint sites or directory roles.

**Uses**: Graph API for roles, PnP PowerShell for SharePoint

Arguments:
- `--scope <directory|sharepoint|all>`: What to audit
- `--site <siteUrl>`: Specific SharePoint site to audit (for sharepoint scope)
- `--include-external`: Include external sharing details

Output:
- Directory: Users with admin roles, role assignments
- SharePoint: Site permissions, external sharing links, guest access

## Common Options

- `--format <markdown|csv>`: Output format (default: markdown)
- `--output <path>`: Save report to file (default: print to stdout)
- `--days <number>`: Time range in days (applies to time-based reports)

## Important Notes

- Sign-in logs require Azure AD Premium P1 or P2 license
- `AuditLog.Read.All` scope requires the signed-in user to have Reports Reader, Security Reader, or Global Administrator role
- Sign-in logs are retained for 30 days (P1) or 30 days (P2) by default
- Directory audit logs are retained for 30 days
- Use `$filter`, `$select`, `$top`, and `$orderby` for efficient queries
- Pagination: follow `@odata.nextLink` for complete results
- For large datasets, consider streaming results to file rather than holding all in memory
- The `$search` query on users requires `ConsistencyLevel: eventual` header
- Reference: `skills/m365-admin/references/entra-id.md` for audit log endpoints and shapes
- Reference: `skills/m365-admin/examples/license-management.md` for license usage report example
