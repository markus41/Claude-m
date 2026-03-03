---
name: mining-setup
description: Interactive multi-stage setup wizard — capture log source configuration, environment IDs, time window, auth requirements, and produce a mining-context.json for all subsequent commands.
argument-hint: "[--sources <pa,m365,azmon,dv>] [--environment <env-id>] [--workspace <id>] [--time-window <ISO-start/ISO-end>]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
  - AskUserQuestion
---

# Mining Setup

Capture all configuration needed for a process mining engagement and produce a `mining-context.json` that downstream commands (`/log-extract`, `/process-discover`, etc.) can reference via `--context mining-context.json`.

## Stage 1 — Source Selection

Ask the user which log sources to include in the mining scope. Present as multi-select:

- **Power Automate flow runs** — run-level or action-level events from PA cloud flows via Power Platform API
- **M365 Unified Audit Log** — SharePoint, Teams, Exchange, Entra ID, Power Platform events via Graph Beta
- **Azure Monitor / Log Analytics** — ARM operations, Entra audit, custom app logs via KQL
- **Dataverse Audit Log** — Entity create/update/delete/access events via Dataverse Web API
- **Power Platform Activity (O365 Mgmt API)** — Connector-level PA activity via Office 365 Management Activity API

Record selected sources as `sources[]` in context.

## Stage 2 — Auth and Licensing Check

Run these checks automatically using Azure CLI:

**2a. Confirm signed-in tenant and subscription:**
```bash
az account show --query "{tenantId:tenantId, subscription:name, user:user.name}" -o table
```

If not logged in, prompt the user to run `az login` before continuing.

**2b. Check tenant licensing (affects UAL retention):**
```bash
az rest --url "https://graph.microsoft.com/v1.0/subscribedSkus" \
  --query "value[].{skuPartNumber:skuPartNumber, consumed:consumedUnits}" \
  -o table
```

Look for `ENTERPRISEPREMIUM` (E5) or `INFORMATION_PROTECTION_COMPLIANCE` (E5 Compliance). If neither found:
- Warn: "No E5 license detected. UAL retention is 180 days (not 1 year). Adjust time window accordingly."
- Flag this in `mining-context.json` as `"ualRetentionDays": 180`.

**2c. Check required permissions (based on selected sources):**

For M365 Audit (`AuditLog.Read.All`):
```bash
az rest --url "https://graph.microsoft.com/v1.0/me/appRoleAssignments" \
  --query "value[?contains(principalDisplayName, 'AuditLog')].principalDisplayName" -o tsv
```
If permission check is inconclusive, note that permission errors will surface during `/log-extract` with specific error codes.

For Azure Monitor: `az monitor log-analytics workspace list --query "[].name" -o tsv` (if this succeeds, Reader role is confirmed).

**2d. For Power Automate — verify environment access:**
```bash
az rest \
  --url "https://api.powerplatform.com/appmanagement/environments?api-version=2022-03-01-preview" \
  --resource "https://api.powerplatform.com" \
  --query "value[].{name:name, displayName:properties.displayName}" -o table
```

## Stage 3 — Per-Source Configuration

For each selected source, ask targeted questions:

### Power Automate
- **Environment ID** — which PA environment? (present list from Stage 2d)
- **Scope** — specific flow ID(s) or all flows in the environment?
- **Granularity** — flow-level only (one event per run status), or action-level (one event per action)?
- **CaseId dimension** — use `correlation.clientTrackingId` (recommended for correlated flows), or raw run GUID, or extract trigger output field (specify field name)?

### M365 Unified Audit Log
- **Record types** — which workloads? (SharePoint file ops / Teams / Exchange / Power Platform / Entra ID)
- **Operation filters** — specific operations (e.g., `FileAccessed`, `FileModified`) or all operations in selected record types?
- **Object filter** — all objects, or filter by specific SharePoint site URL, mailbox, or object ID pattern?
- **CaseId dimension** — which field identifies the business process instance? (e.g., SharePoint item ID from `objectId`, or a custom field in `auditData`)

Check if UAL is enabled:
```bash
# PowerShell check (if available)
Get-AdminAuditLogConfig | Select-Object UnifiedAuditLogIngestionEnabled
```
If PowerShell not available, proceed and note that disabled UAL will return zero results.

### Azure Monitor
- **Subscription** — which Azure subscription?
- **Workspace** — which Log Analytics workspace? (present list from Stage 2)
- **KQL tables** — `AzureActivity` / `AuditLogs` / `SigninLogs` / custom table name?
- **Resource filter** — all resources, or filter by resource group or resource ID pattern?
- **CaseId dimension** — `CorrelationId` (recommended for ARM operations) or a custom field?

### Dataverse
- **Org URL** — e.g., `https://contoso.crm.dynamics.com`
- **Entity/table** — which Dataverse table to audit? (e.g., `opportunity`, `incident`, `cr123_customtable`)
- **Operation types** — Create / Update / Delete / Access / All?
- **CaseId dimension** — record GUID (`_regardingobjectid_value`, recommended) or a specific lookup field?

Verify Dataverse audit is enabled at all three levels:
```bash
az rest \
  --url "https://{org}.{region}.dynamics.com/api/data/v9.2/organizations?select=isauditenabled" \
  --resource "https://{org}.{region}.dynamics.com" | jq .value[0].isauditenabled
```

## Stage 4 — Time Window and Volume Estimate

**4a. Select time window:**
Ask for start and end date. Validate:
- Start date ≥ today minus UAL retention (180 or 365 days based on license)
- End date ≤ today
- Range ≤ 90 days recommended for first extraction (larger ranges can be split into batches)

**4b. Volume probe (per source):**

Run a small probe query returning only 10 records and extract total count from response headers or OData `@odata.count`. Estimate total records:

For M365 Audit — create a query with `$top=1` and check response for `@odata.count` header.
For Power Automate — `$top=10` and multiply by days/probe-days.
For Azure Monitor — add `| count` to KQL query before retrieving full results.
For Dataverse — add `$count=true` to OData query.

**Volume warnings:**
- < 10,000 events: proceed without warning
- 10,000 – 50,000 events: note estimated extraction time (~2-5 minutes)
- 50,000 – 200,000 events: warn — recommend narrowing scope or splitting time window; confirm proceed
- > 200,000 events: strong warning — recommend batching; confirm proceed

## Stage 5 — Output Configuration

Ask:
- **Output file prefix** — base name for output files (default: `mining`)
- **PA Process Mining export** — also export in native PA Process Mining CSV format (CaseId/ActivityName/StartTimestamp) for direct import into Power Automate Process Mining UI?
- **Power BI export** — include a `.pbix`-ready formatted version with date table and measures?

## Final: Produce mining-context.json

Write a `mining-context.json` file in the current directory:

```json
{
  "version": "1",
  "generatedAt": "2026-03-02T10:00:00Z",
  "tenantId": "<tenant-id>",
  "signedInAs": "<upn>",
  "ualRetentionDays": 365,
  "timeWindow": {
    "start": "2026-02-01T00:00:00Z",
    "end": "2026-03-01T00:00:00Z"
  },
  "sources": {
    "powerAutomate": {
      "enabled": true,
      "environmentId": "<env-id>",
      "flowIds": ["<flow-id-1>"],
      "granularity": "flow-level",
      "caseIdField": "clientTrackingId"
    },
    "m365Audit": {
      "enabled": true,
      "recordTypeFilters": ["SharePointFileOperation"],
      "operationFilters": ["FileModified", "FileUploaded"],
      "caseIdField": "objectId"
    },
    "azureMonitor": {
      "enabled": false
    },
    "dataverse": {
      "enabled": false
    }
  },
  "output": {
    "filePrefix": "mining",
    "exportPAProcessMiningFormat": true,
    "exportPowerBI": false
  },
  "estimatedEventVolume": 4500,
  "warnings": []
}
```

Print a setup summary and tell the user: "Setup complete. Run `/log-extract --context mining-context.json` to extract event logs."
