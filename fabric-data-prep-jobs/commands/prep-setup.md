---
name: prep-setup
description: Configure and validate baseline context for deterministic Fabric data preparation job operations.
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

# prep-setup

Establish the minimum safe baseline before running prep job commands.

## Prerequisites and Permissions

- Azure CLI 2.50+ authenticated to the correct tenant.
- Fabric workspace access with at least read permissions.
- For write paths, workspace Contributor or Admin plus `Fabric.ReadWrite.All`.

## Deterministic Steps

1. Validate CLI and identity context (`tenantId`, cloud, principal type).
2. Confirm target workspace ID and readable item inventory.
3. Validate required scopes/roles for requested mode (`--minimal` read-only, default read/write).
4. Capture redacted baseline (`tenantId`, workspace ID, principal type, granted scopes/roles).
5. Return explicit go/no-go status for follow-up prep commands.

## Fail-Fast Contract

- Stop immediately if required context fields are missing or malformed.
- Stop if cloud endpoint does not match `environmentCloud`.
- Stop if required roles/scopes are absent.

## Redaction

- Show only redacted IDs in output (example: `72f988...db47`).
- Never print tokens, client secrets, or certificates.
