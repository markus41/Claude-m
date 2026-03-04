---
name: fabric-cosmos-db-database-manage
description: Create, inspect, update, or retire Fabric Cosmos DB database assets with deterministic governance controls.
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

# fabric-cosmos-db-database-manage

Operate Fabric Cosmos DB database assets with explicit policy enforcement.

## Prerequisites and Permissions

- Completed `/store-setup`.
- Known workspace and target database identity.
- Workspace Contributor/Admin for write operations.

## Deterministic Steps

1. Resolve target Cosmos DB database asset by immutable ID.
2. Read current settings (partitioning, throughput policy, retention metadata).
3. Validate requested operation and required deterministic fields.
4. Apply minimal create/update/retire change.
5. Re-read state and return redacted governance diff.

## Fail-Fast Contract

- Fail if partition strategy or throughput policy is omitted on create/update.
- Fail on ambiguous asset match.
- Fail on insufficient permissions.

## Redaction

- Redact tenant/workspace/database identifiers.
- Suppress all secret-bearing connection information.
