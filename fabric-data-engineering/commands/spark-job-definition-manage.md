---
name: spark-job-definition-manage
description: Manage Fabric Spark Job Definition items with deterministic validation and verification.
argument-hint: "[--workspace <id>] [--job <name>]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
---

# Spark Job Definition Manage

Manage Spark Job Definition assets for `fabric-data-engineering`.

## Preconditions

- Validate integration context with [`docs/integration-context.md`](../../docs/integration-context.md).
- Confirm Spark job author and execution permissions in the target workspace.
- Fail fast when job IDs, workspace IDs, or runtime environment are missing.

## Steps

1. Resolve workspace context and validate required roles and item permissions.
2. Inventory existing Spark Job Definition items and capture runtime settings.
3. Draft deterministic job definition updates, including parameters and schedule.
4. Apply create/update operations and capture operation identifiers.
5. Execute read-back validation for runtime, libraries, and job state.
6. Provide a redacted runbook summary with action results and follow-up checks.

## Endpoint Patterns

| Operation | Method | Endpoint |
|---|---|---|
| List Spark jobs | GET | `/v1/workspaces/{workspaceId}/items?type=SparkJobDefinition` |
| Create/update job | POST | `/v1/workspaces/{workspaceId}/items` |
| Check execution status | GET | `/v1/workspaces/{workspaceId}/items/{itemId}/jobs/instances` |

## Output

- Deterministic summary of Spark job definition state and validation outcomes.
- Redacted identifiers; no secrets or token output.
