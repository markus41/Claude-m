---
name: azure-budget-check
description: Assess Azure budget health, forecast overrun risk, and recommend practical interventions with owner-ready output.
argument-hint: "<scope> [--budget-name <name>] [--timeframe <MTD|QTD|monthly>] [--alert-thresholds <50,80,100>] [--forecast-days <30>]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
  - AskUserQuestion
---

# Azure Budget Check

## Purpose
Review budget utilization and forecast breach likelihood for a target Azure scope.

## When to use
- Finance or platform teams need current budget status before month-end.
- You need proactive actions when burn rate exceeds plan.
- You need an auditable budget-health summary for stakeholders.

## Required inputs/prereqs
- Budget scope and budget name (or confirmation to use default budget at scope).
- Current period spend and configured thresholds (50/80/100% default if omitted).
- Forecast horizon (default 30 days).
- Access to cost and budget data at the target scope.

## Step-by-step execution procedure
1. Confirm scope and locate budget(s) in that scope.
2. Resolve thresholds and period window.
3. Compute:
   - actual spend to date,
   - remaining budget,
   - burn rate,
   - projected end-of-period spend.
4. Classify risk (`low`, `medium`, `high`, `critical`) using threshold proximity and forecast trend.
5. Produce intervention options (for example: rightsizing, schedule-based shutdown, commitment review) with expected impact range.

**Concrete example invocation**
```text
/azure-budget-check /subscriptions/00000000-0000-0000-0000-000000000000 --budget-name prod-monthly --timeframe monthly --alert-thresholds 60,85,100 --forecast-days 21
```

**Failure-mode example**
```text
/azure-budget-check /subscriptions/00000000-0000-0000-0000-000000000000 --alert-thresholds abc
```
Expected assistant behavior: reject non-numeric thresholds, explain valid format, and provide a corrected sample.

## Output schema/format expected from the assistant
Return in this order:
1. `BudgetStatus` table with columns: `BudgetName`, `Scope`, `Actual`, `Budget`, `UtilizationPct`, `Forecast`, `ForecastPct`, `Risk`.
2. `Interventions` list with `Action`, `EstimatedSavingsRange`, `Owner`, `Urgency`.
3. `AssumptionsAndGaps` bullets for any missing telemetry or uncertain estimates.

## Validation checklist
- Command name is `azure-budget-check` and matches file name.
- Thresholds are numeric percentages and sorted ascending.
- Forecast and utilization percentages are present.
- Risk tier is explicitly assigned with rationale.
- Output includes status table, interventions, and assumptions/gaps.
