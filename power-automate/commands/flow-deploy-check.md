---
name: flow-deploy-check
description: Run a deployment readiness review for a Power Automate flow, including connection references, variables, ownership, and rollback posture.
argument-hint: "<flow-name-or-id> [--source-env <name>] [--target-env <name>] [--solution <name>] [--strict]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
  - AskUserQuestion
---

# Flow Deploy Check

## Purpose
Validate that a flow is safe to promote between environments.

## When to use
- Before moving a flow from dev/test to production.
- During release gates where deployment blockers must be explicit.
- After connector or owner changes that may affect runtime behavior.

## Required inputs/prereqs
- Flow ID/name and source/target environments.
- Solution context (if solution-aware deployment is used).
- Connection references and environment variable mappings.
- Rollback strategy and release owner.

## Step-by-step execution procedure
1. Confirm source and target environment context.
2. Validate all connection references resolve in target.
3. Validate environment variables and secrets are mapped.
4. Check owner/service account model and least-privilege posture.
5. Review dependency list (child flows, custom connectors, Dataverse tables).
6. Score readiness and list blockers with remediation owners.

**Concrete example invocation**
```text
/flow-deploy-check purchase-approval-flow --source-env dev --target-env prod --solution ContosoProcurement --strict
```

**Failure-mode example**
```text
/flow-deploy-check purchase-approval-flow --source-env dev
```
Expected assistant behavior: report missing `--target-env`, mark check as incomplete, and provide exact rerun command.

## Output schema/format expected from the assistant
Return in this order:
1. `ReadinessScore` (`pass|conditional|fail`) with numeric score.
2. `Checks` table: `Check`, `Status`, `Evidence`, `Severity`.
3. `Blockers` table: `Blocker`, `Owner`, `Fix`, `ETA`.
4. `GoNoGoRecommendation` short paragraph.

## Validation checklist
- Command name is `flow-deploy-check` and matches file name.
- Source and target environments are both provided.
- Connection/environment variable checks are explicit.
- Output contains severity-based blockers.
- Recommendation aligns with readiness score.
