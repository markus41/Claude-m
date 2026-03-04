---
name: Azure Service Bus
description: >
  Deep expertise in Azure Service Bus operations with deterministic runbooks,
  fail-fast context validation, and redacted output requirements.
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
triggers:
  - azure service bus
  - queue lag
  - dead letter
  - subscription cleanup
  - namespace quota
---

# Azure Service Bus

## Integration Context Contract
- Canonical contract: [`docs/integration-context.md`](../../../docs/integration-context.md)

| Workflow | tenantId | subscriptionId | environmentCloud | principalType | scopesOrRoles |
|---|---|---|---|---|---|
| Azure Service Bus operations | required | required | `AzureCloud`* | service-principal or delegated-user | `Azure Service Bus Data Owner`, `Reader` |

* Use sovereign cloud values from the canonical contract when applicable.

Fail fast before API calls when required context is missing or malformed. Redact tenant, subscription, and object identifiers.

## Command Surface

| Command | Purpose |
|---|---|
| `service-bus-setup` | Deterministic workflow for service bus setup. |
| `service-bus-lag-scan` | Deterministic workflow for service bus lag scan. |
| `service-bus-deadletter-replay-plan` | Deterministic workflow for service bus deadletter replay plan. |
| `service-bus-stale-subscription-cleanup` | Deterministic workflow for service bus stale subscription cleanup. |
| `service-bus-namespace-quota-check` | Deterministic workflow for service bus namespace quota check. |

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
