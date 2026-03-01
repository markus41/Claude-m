---
name: azure-idle-resources
description: Detect likely idle Azure resources, rank optimization actions, and include confidence plus rollback considerations.
argument-hint: "<scope> [--lookback-days <30>] [--resource-types <vm,disk,appgw,...>] [--min-monthly-savings <amount>] [--include-rollback]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
  - AskUserQuestion
---

# Azure Idle Resources

## Purpose
Identify underutilized resources and recommend safe, reversible cost optimizations.

## When to use
- You need quick savings candidates without major architecture changes.
- Monthly FinOps review requires an idle-resource backlog.
- You need shutdown/deallocation candidates with risk notes.

## Required inputs/prereqs
- Scope (subscription/resource group) and lookback window.
- Activity signals (CPU, network, IOPS, request count, job history as applicable).
- Business criticality context (production vs non-production tags).
- Optional minimum savings threshold for prioritization.

## Step-by-step execution procedure
1. Resolve scope and resource-type filters.
2. Gather activity metrics for the lookback period.
3. Mark resources as idle candidates using explicit heuristics per type.
4. Assign confidence (`high|medium|low`) based on metric completeness and consistency.
5. Propose actions (`stop`, `deallocate`, `resize`, `delete`) with rollback guidance.
6. Rank by estimated monthly savings and operational risk.

**Concrete example invocation**
```text
/azure-idle-resources /subscriptions/00000000-0000-0000-0000-000000000000 --lookback-days 45 --resource-types vm,disk,appgw --min-monthly-savings 100 --include-rollback
```

**Failure-mode example**
```text
/azure-idle-resources /subscriptions/00000000-0000-0000-0000-000000000000 --lookback-days -7
```
Expected assistant behavior: reject invalid negative lookback values and request a positive integer.

## Output schema/format expected from the assistant
Return in this order:
1. `IdleCandidates` table: `ResourceId`, `Type`, `IdleSignalSummary`, `EstimatedMonthlySavings`, `Confidence`, `Risk`.
2. `RecommendedActions` table: `ResourceId`, `Action`, `RollbackPlan`, `ChangeWindowSuggestion`.
3. `TriageSummary` bullets: top savings opportunities and blockers.

## Validation checklist
- Command name is `azure-idle-resources` and matches file name.
- Lookback window is a positive integer.
- Confidence score is provided for each candidate.
- Rollback guidance is present for every destructive or disruptive action.
- Output includes candidate table, action table, and triage summary.
