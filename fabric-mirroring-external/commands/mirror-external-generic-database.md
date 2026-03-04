---
name: mirror-external-generic-database
description: Onboard a generic external database mirroring source with strict object-scope controls.
argument-hint: "[source-name] [database] [schema-table-allowlist]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
  - AskUserQuestion
---

# Mirror External Generic Database

## Prerequisites and Permissions

- Validate integration context using [`docs/integration-context.md`](../../docs/integration-context.md).
- Fabric workspace role: `Contributor` or higher.
- Source principal with explicit metadata and table read access.
- Approved schema/table allowlist with owner sign-off.

## Deterministic Steps

1. Validate context and explicit source connection inputs.
2. Resolve and verify source database reachability in read-only mode.
3. Enumerate available schemas/tables and intersect with allowlist.
4. Validate source principal grants for every selected object.
5. Create mirrored mapping for selected objects only.
6. Start mirroring and capture snapshot status for each object.
7. Return a redacted summary including selected, skipped, and failed objects.

## Fail-Fast Rules

- Stop when no explicit object allowlist is provided.
- Stop when selected objects lack read permissions.
- Stop when schema or object compatibility checks fail.

## Redaction Requirements

- Redact source IDs, tenant IDs, and principal IDs.
- Never output full DSNs, passwords, or token material.

## Example Redacted Output

```json
{
  "source": "generic-database",
  "sourceHandle": "source-a...4d19",
  "objectsMirrored": 12,
  "status": "SnapshotInProgress"
}
```
