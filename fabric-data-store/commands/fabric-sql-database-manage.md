---
name: fabric-sql-database-manage
description: Create, inspect, update, or retire Fabric SQL database assets with deterministic policy controls.
argument-hint: "<create|inspect|update|retire> [options]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

# fabric-sql-database-manage

Operate Fabric SQL database assets with explicit schema and governance controls.

## Prerequisites and Permissions

- Completed `/store-setup`.
- Target workspace and SQL database identity known.
- Workspace Contributor/Admin for write operations.

## Deterministic Steps

1. Resolve SQL database asset by immutable item ID.
2. Read current policy fields (collation, compatibility settings, ownership metadata).
3. Validate requested action (`create`, `inspect`, `update`, `retire`).
4. Apply minimal write with explicit governance fields.
5. Re-read state and return redacted governance diff.

## Fail-Fast Contract

- Fail if required policy fields are missing for create/update.
- Fail on ambiguous target identity.
- Fail on insufficient permissions.

## Redaction

- Redact tenant/workspace/database identifiers.
- Suppress secret-bearing connection or credential values.
