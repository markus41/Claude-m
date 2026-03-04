---
name: Entra Access Reviews
description: >
  Deep expertise in Entra Access Reviews operations with deterministic runbooks,
  fail-fast context validation, and redacted output requirements.
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
triggers:
  - access reviews
  - entra access review
  - stale privileged access
  - review cycle
  - access certification
---

# Entra Access Reviews

## Integration Context Contract
- Canonical contract: [`docs/integration-context.md`](../../../docs/integration-context.md)

| Workflow | tenantId | subscriptionId | environmentCloud | principalType | scopesOrRoles |
|---|---|---|---|---|---|
| Entra Access Reviews operations | required | optional | `AzureCloud`* | delegated-user or service-principal | `AccessReview.ReadWrite.All`, `RoleManagement.Read.All`, `Directory.Read.All` |

* Use sovereign cloud values from the canonical contract when applicable.

Fail fast before API calls when required context is missing or malformed. Redact tenant, subscription, and object identifiers.

## Command Surface

| Command | Purpose |
|---|---|
| `access-reviews-setup` | Deterministic workflow for access reviews setup. |
| `access-reviews-stale-privileged` | Deterministic workflow for access reviews stale privileged. |
| `access-reviews-cycle-draft` | Deterministic workflow for access reviews cycle draft. |
| `access-reviews-remediation-tickets` | Deterministic workflow for access reviews remediation tickets. |
| `access-reviews-status-report` | Deterministic workflow for access reviews status report. |

## Guardrails

1. Validate context schema and minimum grants before any API call.
2. Run read-only discovery first whenever possible.
3. Require explicit confirmation for destructive actions.
4. Re-query and verify post-action state.
5. Return structured, redacted output.

## Progressive Disclosure - Reference Files

| Topic | File |
|---|---|
| Endpoint and permission reference | [`references/api-reference.md`](./references/api-reference.md) |
