---
name: store-setup
description: Configure and validate baseline context for Fabric data store operations.
argument-hint: "[--minimal]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

# store-setup

Establish the minimum safe baseline for data store commands.

## Prerequisites and Permissions

- Azure CLI 2.50+ authenticated to the intended tenant.
- Access to the target Fabric workspace.
- Contributor/Admin role required for write-mode validations.

## Deterministic Steps

1. Validate runtime context (`tenantId`, cloud, principal type, scope/role grants).
2. Resolve target workspace and list store-related items.
3. Validate required grants for read-only or write mode.
4. Capture a redacted baseline for subsequent commands.
5. Return explicit readiness status with any blocking gaps.

## Fail-Fast Contract

- Stop if required integration context fields are missing.
- Stop if cloud boundary is mismatched.
- Stop if required roles/scopes for requested mode are missing.

## Redaction

- Redact tenant and workspace identifiers in output.
- Never print tokens, keys, passwords, or secrets.
