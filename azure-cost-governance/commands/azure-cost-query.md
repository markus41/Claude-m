---
name: azure-cost-query
description: Build a deterministic Azure Cost Management query plan with scope, filters, granularity, anomaly thresholds, and a report-ready response schema.
argument-hint: "<scope> [--timeframe <MTD|QTD|last-30-days|custom>] [--start <YYYY-MM-DD>] [--end <YYYY-MM-DD>] [--group-by <dimension,...>] [--filter <key=value,...>] [--granularity <daily|monthly>]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
  - AskUserQuestion
---

# Azure Cost Query

## Purpose
Create an Azure Cost Management query definition the assistant can execute or hand off without ambiguity.

## When to use
- You need spend analysis by subscription, resource group, service, or tag.
- You need a baseline for anomaly detection or chargeback reporting.
- You want a reproducible query before dashboarding or automation.

## Required inputs/prereqs
- Azure billing access to the target scope (`subscription`, `resourceGroup`, or billing scope).
- Time range (`--timeframe` or `--start` + `--end`).
- At least one grouping dimension (for example: `ResourceGroup`, `ServiceName`, `Tag:CostCenter`).
- Optional filter set and anomaly threshold (percentage or absolute delta).

## Step-by-step execution procedure
1. Resolve scope and validate the caller has read permissions.
2. Normalize timeframe:
   - Use preset timeframe when provided.
   - Otherwise require both `--start` and `--end`.
3. Parse grouping list and filters into deterministic key/value pairs.
4. Set granularity (`daily` for short windows, `monthly` for trend windows unless overridden).
5. Build query plan with:
   - metric (`PreTaxCost` unless user states otherwise),
   - aggregation (`sum`),
   - grouping,
   - filters,
   - anomaly rule.
6. Return both human summary and machine-consumable schema.

**Concrete example invocation**
```text
/azure-cost-query /subscriptions/00000000-0000-0000-0000-000000000000 --timeframe last-30-days --group-by ResourceGroup,ServiceName --filter Tag:Environment=Prod --granularity daily
```

**Failure-mode example**
```text
/azure-cost-query /subscriptions/00000000-0000-0000-0000-000000000000 --start 2026-02-01 --group-by ResourceGroup
```
Expected assistant behavior: fail fast because `--end` is missing, then return a short remediation prompt listing required fields.

## Output schema/format expected from the assistant
Return in this order:
1. `Summary` (3-6 bullets).
2. `QueryPlan` JSON block:
   ```json
   {
     "scope": "string",
     "timeframe": {"mode": "preset|custom", "preset": "string|null", "start": "YYYY-MM-DD|null", "end": "YYYY-MM-DD|null"},
     "metric": "PreTaxCost",
     "aggregation": "sum",
     "granularity": "daily|monthly",
     "groupBy": ["dimension"],
     "filters": [{"key": "string", "operator": "Equals", "value": "string"}],
     "anomalyRule": {"type": "percent|absolute", "threshold": "number", "lookbackDays": "number"}
   }
   ```
3. `ValidationNotes` (permissions, missing inputs, and confidence).

## Azure CLI Quick Reference

Use these commands as an alternative to building REST query JSON manually.

### Cost Management queries

```bash
# Costs grouped by resource group — current month
az costmanagement query --type ActualCost --timeframe MonthToDate \
  --scope "subscriptions/<sub-id>" \
  --dataset-grouping name=ResourceGroup type=Dimension --output table

# Costs grouped by service — custom date range
az costmanagement query --type ActualCost --timeframe Custom \
  --time-period from=2026-02-01 to=2026-03-01 \
  --scope "subscriptions/<sub-id>" \
  --dataset-grouping name=ServiceName type=Dimension --output table

# Amortized cost by resource (reservation spread)
az costmanagement query --type AmortizedCost --timeframe MonthToDate \
  --scope "subscriptions/<sub-id>" \
  --dataset-grouping name=ResourceId type=Dimension --output table
```

### Usage details (consumption)

```bash
# Current billing period usage
az consumption usage list --top 50 --output table

# Usage for a specific date range
az consumption usage list --start-date 2026-01-01 --end-date 2026-01-31 --output table

# Usage by resource group with projection
az consumption usage list --resource-group <rg> --top 100 \
  --query "[].{Resource:instanceName, Cost:pretaxCost, Currency:currency}" --output table
```

### Cost exports

```bash
# Create a daily scheduled export
az costmanagement export create --name "<export-name>" \
  --scope "subscriptions/<sub-id>" \
  --storage-account-id "/subscriptions/<sub-id>/resourceGroups/<rg>/providers/Microsoft.Storage/storageAccounts/<sa>" \
  --storage-container exports --timeframe MonthToDate --type ActualCost \
  --schedule-recurrence Daily --schedule-status Active \
  --storage-directory "cost-reports"

# List / show / run / delete exports
az costmanagement export list --scope "subscriptions/<sub-id>" --output table
az costmanagement export show --name "<export-name>" --scope "subscriptions/<sub-id>"
az costmanagement export execute --name "<export-name>" --scope "subscriptions/<sub-id>"
az costmanagement export delete --name "<export-name>" --scope "subscriptions/<sub-id>" --yes
```

## Validation checklist
- Command name is `azure-cost-query` and matches file name.
- Scope is explicit and valid.
- Timeframe is complete (`preset` or full custom range).
- Grouping/filter keys are normalized and deterministic.
- Output includes `Summary`, `QueryPlan` JSON, and `ValidationNotes`.
