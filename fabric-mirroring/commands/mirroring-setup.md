---
name: mirroring-setup
description: Prepare Fabric Mirroring by validating source readiness, connectivity, identity, and target workspace controls.
argument-hint: "[--source <type>] [--workspace <name>] [--minimal]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
---

# Mirroring Setup

Create a controlled setup for mirrored data onboarding before enabling replication.

## Prerequisites

- Supported source systems configured for Fabric Mirroring.
- Network and identity access from Fabric to source databases.
- Ownership for source schema changes and downstream consumers.
- Defined freshness targets and reconciliation tolerances.

## Steps

1. Confirm source compatibility, change capture requirements, and retention settings.
2. Validate network path, credentials, and least-privilege source access.
3. Define target workspace naming and monitoring responsibilities.
4. Document initial replication window and recovery expectations.

## Output

- Mirroring readiness checklist with blocked and ready items.
- Clear onboarding sequence for first mirrored source.
