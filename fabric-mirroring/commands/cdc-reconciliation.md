---
name: cdc-reconciliation
description: Reconcile mirrored datasets with source-of-truth systems to validate CDC completeness and integrity.
argument-hint: "<dataset> [--sample <size>] [--strict]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
---

# CDC Reconciliation

Run reconciliation checks to prove CDC correctness after incidents or schema changes.

## Prerequisites

- Supported source systems configured for Fabric Mirroring.
- Network and identity access from Fabric to source databases.
- Ownership for source schema changes and downstream consumers.
- Defined freshness targets and reconciliation tolerances.

## Steps

1. Define reconciliation keys, windows, and tolerated variance.
2. Compare source and mirrored row counts, checksums, and key coverage.
3. Investigate missing, duplicated, and out-of-order changes.
4. Produce remediation actions for replay, resync, or schema correction.

## Output

- Reconciliation report with mismatch classification.
- Remediation runbook for CDC integrity recovery.
