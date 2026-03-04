---
name: datamart-manage
description: Create, inspect, refresh, update, or retire Fabric datamarts with deterministic governance controls.
argument-hint: "<create|inspect|refresh|update|retire> [options]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

# datamart-manage

Manage datamarts while preserving semantic governance and refresh determinism.

## Preview Caveat

Datamart APIs and behavior may be preview in some tenants/regions. Verify feature availability before create/update/refresh actions.

## Prerequisites and Permissions

- Completed `/store-setup`.
- Workspace Contributor/Admin.
- Semantic model write permission for governance updates.

## Deterministic Steps

1. Resolve datamart identity by immutable item ID.
2. Verify preview feature availability for the tenant/workspace.
3. Read current semantic contract (refresh schedule, ownership, dependencies).
4. Apply minimal create/update/refresh/retire action with explicit policy fields.
5. Re-read datamart state and return redacted change summary.

## Fail-Fast Contract

- Fail when preview capability is unavailable.
- Fail when refresh cadence or ownership metadata is missing in writes.
- Fail when operation target is ambiguous or unauthorized.

## Redaction

- Redact tenant/workspace/datamart identifiers.
- Never expose credentials, tokens, or embedded connection secrets.
