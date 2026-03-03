---
name: source-onboarding
description: Onboard a new source to Fabric Mirroring with controlled table scope and replication guardrails.
argument-hint: "<source-system> [--tables <pattern>] [--exclude <pattern>]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
---

# Source Onboarding

Add mirrored sources without overwhelming capacity or introducing unmanaged scope.

## Prerequisites

- Supported source systems configured for Fabric Mirroring.
- Network and identity access from Fabric to source databases.
- Ownership for source schema changes and downstream consumers.
- Defined freshness targets and reconciliation tolerances.

## Steps

1. Select source objects by business priority and criticality.
2. Apply inclusion and exclusion rules for schemas and tables.
3. Set replication expectations, acceptable lag, and alert thresholds.
4. Validate initial sync completeness before downstream consumption.

## Output

- Onboarded source scope with replication policy.
- Validation results for initial sync and data availability.
