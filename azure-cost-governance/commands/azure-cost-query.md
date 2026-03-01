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

## Validation checklist
- Command name is `azure-cost-query` and matches file name.
- Scope is explicit and valid.
- Timeframe is complete (`preset` or full custom range).
- Grouping/filter keys are normalized and deterministic.
- Output includes `Summary`, `QueryPlan` JSON, and `ValidationNotes`.
