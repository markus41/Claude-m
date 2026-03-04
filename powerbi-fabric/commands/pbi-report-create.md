---
name: pbi-report-create
description: Create Power BI reports in Fabric with deterministic validation and dependency checks.
argument-hint: "[--workspace <id>] [--name <report-name>]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
---

# PBI Report Create

Create report assets in `powerbi-fabric`.

## Preconditions

- Validate integration context via [`docs/integration-context.md`](../../docs/integration-context.md).
- Confirm report creation permissions for the target workspace and dataset.
- Fail fast if PBIP artifacts, dataset IDs, or workspace IDs are missing.

## Steps

1. Validate workspace and dataset context with required access rights.
2. Inventory existing report names and deployment pipeline stage alignment.
3. Build deterministic report metadata and dataset binding configuration.
4. Execute report create/import operation with operation tracking.
5. Verify report renderability and binding correctness.
6. Return a redacted summary of report creation, warnings, and follow-ups.

## Endpoint Patterns

| Operation | Method | Endpoint |
|---|---|---|
| List reports | GET | `/v1.0/myorg/groups/{groupId}/reports` |
| Import/create report | POST | `/v1.0/myorg/groups/{groupId}/imports` |
| Validate report | GET | `/v1.0/myorg/groups/{groupId}/reports/{reportId}` |

## Output

- Deterministic report creation output with validation status and dependencies.
- Redacted identifiers and no sensitive data.
