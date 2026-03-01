---
name: drift-analysis
description: Compare current Azure Policy state to baseline and surface high-priority drift, exception aging, and enforcement regressions.
argument-hint: "<scope> [--baseline <name>] [--since <YYYY-MM-DD>] [--severity <high|medium|low>] [--include-exemptions]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
  - AskUserQuestion
---

# Drift Analysis

## Purpose
Detect compliance drift from expected policy baseline and rank what to fix first.

## When to use
- Continuous compliance monitoring catches regressions.
- Change windows introduced new non-compliant resources.
- Exception lists may be aging beyond accepted policy.

## Required inputs/prereqs
- Target scope and baseline reference.
- Time boundary for drift detection (`--since` recommended).
- Access to policy compliance snapshots/events.
- Exemption data with creation dates and expiry metadata.

## Step-by-step execution procedure
1. Load baseline policy expectations for target scope.
2. Compare current assignments/compliance states to baseline snapshot.
3. Identify new drifts: missing assignment, effect downgrade, non-compliant growth.
4. Analyze exemptions by age, owner, and expiry status.
5. Rank findings by severity and blast radius.
6. Produce remediation queue with measurable closure criteria.

**Concrete example invocation**
```text
/drift-analysis /subscriptions/00000000-0000-0000-0000-000000000000 --baseline cis-azure-1.5 --since 2026-01-01 --severity high --include-exemptions
```

**Failure-mode example**
```text
/drift-analysis /subscriptions/00000000-0000-0000-0000-000000000000 --since 01-01-2026
```
Expected assistant behavior: reject invalid date format and request ISO `YYYY-MM-DD`.

## Output schema/format expected from the assistant
Return in this order:
1. `DriftSummary` (`TotalFindings`, `HighSeverity`, `AffectedScopes`, `PeriodStart`).
2. `DriftFindings` table: `FindingType`, `Scope`, `Severity`, `Evidence`, `RecommendedFix`.
3. `ExceptionAging` table: `ExemptionId`, `Scope`, `AgeDays`, `ExpiresOn`, `Owner`, `Risk`.
4. `RemediationQueue` ordered list with `Priority`, `Action`, `SuccessMetric`.

## Validation checklist
- Command name is `drift-analysis` and matches file name.
- Baseline and period start are explicit.
- Severity ranking and evidence are included.
- Exception aging is quantified in days.
- Output includes summary, findings, aging, and remediation queue.
