---
name: mirror-azure-databricks-catalog
description: Onboard Databricks Unity Catalog mirroring into Fabric with catalog-level scope controls.
argument-hint: "[workspace-url] [catalog] [schema-filter]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
  - AskUserQuestion
---

# Mirror Azure Databricks Catalog

## Prerequisites and Permissions

- Validate integration context using [`docs/integration-context.md`](../../docs/integration-context.md).
- Fabric workspace role: `Contributor` or higher.
- Databricks permissions for catalog/schema metadata and table read access.
- Approved catalog and schema allowlist from data owners.

## Deterministic Steps

1. Validate context and resolve target Databricks workspace URL and catalog.
2. Run read-only catalog discovery to confirm expected schemas and tables.
3. Validate least-privilege access for the mirroring identity in Unity Catalog.
4. Reject objects outside approved schema/table scope.
5. Create mirroring mapping in Fabric for approved objects only.
6. Start mirroring and poll initial table status until first successful checkpoint.
7. Emit redacted output including mirrored object count and excluded object list.

## Fail-Fast Rules

- Stop if catalog visibility is incomplete for selected scope.
- Stop if identity has broader-than-approved permissions without approval.
- Stop if object scope contains unsupported object types.

## Redaction Requirements

- Redact workspace IDs, catalog identifiers where sensitive, and principal IDs.
- Never output PAT tokens, OAuth secrets, or private endpoints in full.

## Example Redacted Output

```json
{
  "source": "databricks-catalog",
  "workspaceId": "dbx98b...4f11",
  "objectsMirrored": 57,
  "status": "SnapshotInProgress"
}
```
