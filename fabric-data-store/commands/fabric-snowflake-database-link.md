---
name: fabric-snowflake-database-link
description: Create, inspect, update, or remove Snowflake database links used by Fabric store workloads.
argument-hint: "<create|inspect|update|remove> [options]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

# fabric-snowflake-database-link

Manage Snowflake-to-Fabric database links with explicit governance and lineage tracking.

## Prerequisites and Permissions

- Completed `/store-setup`.
- Snowflake account locator, database mapping, and governance owner metadata.
- Workspace Contributor/Admin with link management permissions.

## Deterministic Steps

1. Resolve existing link by immutable ID or verify no existing link for create.
2. Read current link contract (account mapping, security mode, lineage metadata).
3. Validate requested create/update/remove action against governance policy.
4. Apply minimal patch with explicit mapping and ownership fields.
5. Re-read link state and return redacted before/after summary.

## Fail-Fast Contract

- Fail if account locator or database mapping is incomplete.
- Fail if requested operation would break required lineage metadata.
- Fail on ambiguous link identity or insufficient permission.

## Redaction

- Redact tenant/workspace/link identifiers and account IDs.
- Never print private keys, passwords, or token values.
