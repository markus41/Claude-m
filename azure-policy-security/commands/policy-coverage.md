---
name: policy-coverage
description: Evaluate Azure Policy assignment coverage by scope and control category, then report actionable guardrail gaps.
argument-hint: "<scope> [--baseline <cis|nist|custom>] [--include-exemptions] [--group-by <scope|category|initiative>]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
  - AskUserQuestion
---

# Policy Coverage

## Purpose
Measure how completely required policies are assigned and enforced across target Azure scopes.

## When to use
- Security governance reviews need coverage metrics.
- New subscriptions/management groups must be checked for baseline adherence.
- Audit prep requires clear policy gap reporting.

## Required inputs/prereqs
- Target scope (management group, subscription, or resource group).
- Baseline/control framework (`cis`, `nist`, or documented custom baseline).
- Policy/initiative inventory and assignment visibility.
- Optional exemption visibility for adjusted coverage math.

## Step-by-step execution procedure
1. Resolve scope hierarchy and baseline controls.
2. Map each control to expected policy definition/initiative.
3. Evaluate assignment presence and enforcement mode.
4. Compute coverage percentages by category and scope.
5. Identify gaps, overlap, and risky exemption patterns.
6. Return prioritized remediation sequence.

**Concrete example invocation**
```text
/policy-coverage /providers/Microsoft.Management/managementGroups/contoso-root --baseline cis --include-exemptions --group-by category
```

**Failure-mode example**
```text
/policy-coverage --baseline nist
```
Expected assistant behavior: fail because scope is missing; return required argument list and a corrected command template.

## Output schema/format expected from the assistant
Return in this order:
1. `CoverageSummary` (`OverallCoveragePct`, `ScopesReviewed`, `Baseline`).
2. `CoverageByCategory` table: `Category`, `ExpectedControls`, `CoveredControls`, `CoveragePct`, `HighRiskGaps`.
3. `GapBacklog` table: `Gap`, `Scope`, `RecommendedPolicy`, `Priority`, `Owner`.
4. `Notes` bullets for exemptions and assumptions.

## Validation checklist
- Command name is `policy-coverage` and matches file name.
- Scope and baseline are explicit.
- Coverage percentages are computed and shown.
- High-risk gaps are prioritized.
- Output includes summary, category table, gap backlog, and notes.
