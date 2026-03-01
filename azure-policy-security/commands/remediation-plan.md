---
name: remediation-plan
description: Build a sequenced Azure policy/security remediation plan with owner mapping, risk notes, and measurable completion criteria.
argument-hint: "<scope> [--input <coverage|drift-report>] [--window <days>] [--owners <team:aad-group,...>] [--max-parallel <n>]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
  - AskUserQuestion
---

# Remediation Plan

## Purpose
Convert policy/compliance findings into an execution-ready remediation roadmap.

## When to use
- After policy coverage or drift analysis identifies actionable gaps.
- Program teams need ownership and sequencing for closure.
- Leadership needs timeline and measurable risk reduction targets.

## Required inputs/prereqs
- Target scope and trusted findings source (`coverage` or `drift` report).
- Available remediation window and parallel execution capacity.
- Owner/team mapping for each remediation domain.
- Change-management constraints (maintenance windows, approval gates).

## Step-by-step execution procedure
1. Ingest findings and normalize by severity, dependency, and blast radius.
2. Group work into remediation waves (quick wins, medium effort, structural fixes).
3. Assign owners and due dates using workload and team capability.
4. Add risk notes and rollback/contingency requirements per task.
5. Define completion criteria and verification command/check for each task.
6. Produce a delivery plan with milestones and status tracking format.

**Concrete example invocation**
```text
/remediation-plan /providers/Microsoft.Management/managementGroups/contoso-root --input drift-report --window 45 --owners platform:sg-platform,security:sg-secops --max-parallel 6
```

**Failure-mode example**
```text
/remediation-plan /providers/Microsoft.Management/managementGroups/contoso-root --window 0
```
Expected assistant behavior: reject non-positive remediation window and request a valid day range.

## Output schema/format expected from the assistant
Return in this order:
1. `PlanSummary` (`Scope`, `TotalTasks`, `WindowDays`, `TargetRiskReductionPct`).
2. `ExecutionPlan` table: `Wave`, `Task`, `Owner`, `DueDate`, `Dependency`, `RiskNote`, `SuccessCriteria`.
3. `Milestones` list with date and measurable outcome.
4. `TrackingTemplate` markdown snippet for weekly status.

## Validation checklist
- Command name is `remediation-plan` and matches file name.
- Input findings source is explicit.
- Every task has owner, due date, and success criteria.
- Dependencies and risk notes are present.
- Output includes summary, execution plan, milestones, and tracking template.
