---
name: org-app-setup
description: Validate Fabric org app preview readiness, context, permissions, and release guardrails before distribution actions.
argument-hint: "[--workspace <id>] [--channel <pilot|broad>] [--principal <delegated-user|service-principal>]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
  - AskUserQuestion
---

# org-app-setup

## Preview Caveat

Fabric organizational app distribution is preview. Validate tenant feature flags, endpoint versions, and role behavior before executing rollout actions.

## Prerequisites and Permissions

- Integration context is valid per [`docs/integration-context.md`](../../docs/integration-context.md).
- Caller has `Fabric Tenant Admin` or delegated org app publisher permissions.
- Target rollout scope (workspace, audience baseline, and channel) is explicitly defined.

## Deterministic Steps

1. Validate `tenantId`, `environmentCloud`, `principalType`, and minimum org app role grants; fail fast on missing fields.
2. Verify preview feature availability for org app distribution in the target tenant.
3. Collect read-only baseline for package versions, audience mappings, and current channel state.
4. Define rollout guardrails: pilot audience, broad audience criteria, approval owner, and rollback owner.
5. Confirm release evidence checklist (package checksum, permission review, communication plan).
6. Return a redacted setup report with blockers and next command sequence.

## Fail-Fast and Redaction

- Stop before network mutations when context, preview readiness, or permissions are invalid.
- Return contract-style errors for context failures.
- Redact tenant, app, and audience identifiers; never include secrets or raw tokens.
