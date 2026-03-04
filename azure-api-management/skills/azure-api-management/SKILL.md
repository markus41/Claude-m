---
name: Azure API Management
description: >
  Deep expertise in Azure API Management operations with deterministic runbooks,
  fail-fast context validation, and redacted output requirements.
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
triggers:
  - apim
  - azure api management
  - api policy
  - api revision
  - api contract diff
---

# Azure API Management

## Integration Context Contract
- Canonical contract: [`docs/integration-context.md`](../../../docs/integration-context.md)

| Workflow | tenantId | subscriptionId | environmentCloud | principalType | scopesOrRoles |
|---|---|---|---|---|---|
| Azure API Management operations | required | required | `AzureCloud`* | service-principal or delegated-user | `API Management Service Contributor`, `Reader` |

* Use sovereign cloud values from the canonical contract when applicable.

Fail fast before API calls when required context is missing or malformed. Redact tenant, subscription, and object identifiers.

## Command Surface

| Command | Purpose |
|---|---|
| `apim-setup` | Deterministic workflow for apim setup. |
| `apim-api-inventory` | Deterministic workflow for apim api inventory. |
| `apim-policy-drift` | Deterministic workflow for apim policy drift. |
| `apim-secret-rotation` | Deterministic workflow for apim secret rotation. |
| `apim-contract-diff` | Deterministic workflow for apim contract diff. |

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
