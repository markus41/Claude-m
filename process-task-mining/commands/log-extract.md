---
name: log-extract
description: Pull raw events from one or more Microsoft log sources and normalize to a unified event log CSV aligned with the PA Process Mining ingestion format.
argument-hint: "<case-dimension> --sources <pa,m365,azmon,dv> [--context <mining-context.json>] [--environment <env-id>] [--flow-id <id>] [--workspace <id>] [--org-url <url>] [--time-window <start/end>] [--output <file.csv>] [--max-events <n>]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
  - AskUserQuestion
---

# Log Extract

Extract events from Microsoft log sources and output a unified event log CSV that can be directly imported into PA Process Mining or analyzed with `/process-discover`, `/performance-analyze`, `/conformance-check`, and `/resource-analyze`.

## Step 1 — Load Configuration

If `--context mining-context.json` is provided, load the configuration. Otherwise, require explicit parameters: `--sources`, `--time-window`, and source-specific IDs.

Validate that all required parameters are present for each selected source:
- **Power Automate:** `--environment` (or `environmentId` from context)
- **M365 Audit:** time window within UAL retention period
- **Azure Monitor:** `--workspace` (or `workspaceId` from context)
- **Dataverse:** `--org-url` (or `orgUrl` from context)

Confirm output file path. Default: `{filePrefix}-event-log-{YYYYMMDD}.csv`.

## Step 2 — Authenticate per Source

For all sources using Azure CLI:
```bash
# Verify login
az account show --query "{tenant:tenantId, user:user.name}" -o table

# Power Platform token
TOKEN_PP=$(az account get-access-token \
  --resource "https://api.powerplatform.com" \
  --query accessToken -o tsv)

# Graph token (M365 Audit)
TOKEN_GRAPH=$(az account get-access-token \
  --resource "https://graph.microsoft.com" \
  --query accessToken -o tsv)

# Dataverse token (per org)
TOKEN_DV=$(az account get-access-token \
  --resource "https://{org}.{region}.dynamics.com" \
  --query accessToken -o tsv)
```

Azure Monitor uses the `az` CLI directly — no separate token needed.

## Step 3 — Extract per Source

Run extraction for each enabled source. Extract in parallel where possible.

### Power Automate Extraction

```bash
ENV_ID="<environment-id>"
FLOW_ID="<flow-id>"  # omit for all flows
START="2026-02-01T00:00:00Z"
END="2026-03-01T00:00:00Z"

# Flow runs
curl -s \
  "https://api.powerplatform.com/powerautomate/environments/${ENV_ID}/flowRuns\
?workflowId=${FLOW_ID}&api-version=2022-03-01-preview\
&\$filter=startTime ge ${START} and startTime le ${END}\
&\$top=1000" \
  -H "Authorization: Bearer ${TOKEN_PP}" > pa-runs-raw.json

# Handle pagination: check for nextLink and loop
```

For action-level granularity, loop over each run ID:
```bash
jq -r '.value[].name' pa-runs-raw.json | while read RUN_ID; do
  curl -s \
    "https://api.powerplatform.com/powerautomate/environments/${ENV_ID}/flowRuns/${RUN_ID}/actions\
?api-version=2022-03-01-preview" \
    -H "Authorization: Bearer ${TOKEN_PP}" >> pa-actions-raw.jsonl
done
```

### M365 Audit Extraction

Follow the three-step async pattern:
1. POST to create query job with configured `recordTypeFilters` and `operationFilters`
2. Poll GET every 15 seconds until `status = succeeded`
3. GET `/records?$top=1000` and follow `@odata.nextLink` until exhausted

Store all records as JSONL: `m365-audit-raw.jsonl`.

Log extraction progress: report count of records retrieved every 1000 records.

Handle error `429 TooManyRequests`: wait 60 seconds and retry. If `status = failed` on the query job, report the error details and suggest narrowing the time window or record type filters.

### Azure Monitor Extraction

```bash
az monitor log-analytics query \
  --workspace "${WORKSPACE_ID}" \
  --analytics-query "
    AzureActivity
    | where TimeGenerated between (datetime(${START}) .. datetime(${END}))
    | project TimeGenerated, CorrelationId, OperationNameValue, Caller, _ResourceId, ResultType
    | order by TimeGenerated asc
  " \
  --output json > azmon-raw.json
```

If query returns more than 30,000 rows, the CLI will truncate. Split into monthly sub-queries:
```bash
az monitor log-analytics query \
  --workspace "${WORKSPACE_ID}" \
  --analytics-query "
    AzureActivity
    | where TimeGenerated between (datetime(${START}) .. datetime(${END}))
    | count
  " \
  --output json
```

### Dataverse Extraction

Paginate through `audits` entity using `$skiptoken`:
```bash
URL="${ORG_URL}/api/data/v9.2/audits\
?\$filter=createdon ge ${START} and createdon le ${END} and objecttypecode eq '${ENTITY}'\
&\$select=auditid,createdon,operation,objecttypecode,_userid_value,_regardingobjectid_value\
&\$orderby=createdon asc\
&\$top=5000"

curl -s "${URL}" \
  -H "Authorization: Bearer ${TOKEN_DV}" \
  -H "Prefer: odata.maxpagesize=5000" > dv-raw.json
```

## Step 4 — Normalize to Unified Schema

For each source, apply the field mapping from SKILL.md §6 to produce rows with:
`caseId, activityName, timestamp, resource, lifecycle, duration_ms, sourceSystem, rawEventId`

Apply these normalization rules:
- **Timestamps:** normalize all to ISO 8601 UTC format (`2026-02-15T09:32:14.000Z`)
- **CaseId:** apply configured `caseIdField` strategy; log a warning for any rows where caseId is null/empty — assign placeholder `UNKNOWN-{index}`
- **ActivityName:** apply source-specific mappings (operation codes → friendly names, PA status → activity name)
- **Resource:** normalize to UPN where possible; fall back to display name or GUID with note
- **Duration_ms:** calculate for PA runs (endTime - startTime); leave empty for point-in-time events

## Step 5 — Merge and Sort

If multiple sources are enabled:
1. Concatenate all normalized rows
2. Sort by `caseId` ascending, then `timestamp` ascending

Report final row counts per source and total.

## Step 6 — Output

Write the merged, sorted CSV to the configured output file.

If `exportPAProcessMiningFormat = true` in context, also write a second CSV with only:
`CaseId, ActivityName, StartTimestamp, EndTimestamp, Resource`
mapped from the unified schema. File name: `{prefix}-pa-process-mining.csv`.

Print a summary:

```
## Extraction Summary

| Source | Events Extracted | Cases Found | Errors |
|---|---|---|---|
| power-automate | 2,341 | 456 | 0 |
| m365-audit | 8,102 | 1,234 | 0 |

Total events: 10,443
Output: mining-event-log-20260302.csv

## Data Quality Warnings
- 12 events had null caseId — assigned placeholder UNKNOWN-{n}
- 3 PA runs had no endTime — flow still Running or endTime not available

## Next Steps
Run: /process-discover mining-event-log-20260302.csv
```

## Error Handling

| Error | Diagnosis | Action |
|---|---|---|
| `401 Unauthorized` | Token expired or missing permission | Re-run `az login`; verify `AuditLog.Read.All` assigned |
| `403 Forbidden` | Insufficient RBAC / UAL not enabled | Enable UAL in Purview portal; check RBAC assignments |
| `429 Too Many Requests` | Graph API rate limit | Wait 60s, retry; reduce `$top` page size |
| Query job `failed` status | Invalid filters or empty result set | Check `recordTypeFilters` values; verify time window within retention |
| Zero events returned | UAL disabled or outside retention window | Verify UAL is enabled; check `ualRetentionDays` in context |
| PA 404 on flowRuns | Invalid environment or flow ID | Re-run `/mining-setup` to refresh environment list |
