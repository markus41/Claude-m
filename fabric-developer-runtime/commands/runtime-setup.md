---
name: runtime-setup
description: Baseline Fabric developer runtime context, permissions, and deterministic safety gates.
argument-hint: "[--workspace <id>] [--environment <name>] [--principal <delegated-user|service-principal>]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
  - AskUserQuestion
---

# runtime-setup

## Prerequisites and Permissions

- Integration context is present and valid per [`docs/integration-context.md`](../../docs/integration-context.md).
- Caller has `Fabric Workspace Admin` (or equivalent runtime governance role).
- Target workspace and environment scope are explicitly identified before execution.

## Deterministic Steps

1. Validate `tenantId`, `environmentCloud`, `principalType`, and runtime role grants; fail fast on missing or invalid values.
2. Resolve and confirm target workspace scope and environment identifier.
3. Collect read-only baseline for runtime assets: GraphQL APIs, environments, user data functions, and variable libraries.
4. Produce a setup plan with explicit owners, approval gate, and rollback owner.
5. Record execution-safe defaults (read-first, one-change-unit, verify-after-write).
6. Return a redacted setup report with blocking gaps and next actions.

## Fail-Fast and Redaction

- Stop before API calls when context or required permissions are missing.
- Return contract-style errors for invalid context.
- Redact tenant, workspace, and object IDs; never output secret values.
