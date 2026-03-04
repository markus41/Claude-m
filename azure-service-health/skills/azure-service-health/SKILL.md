---
name: Azure Service Health
description: >
  Deep expertise in Azure Service Health operations with deterministic runbooks,
  fail-fast context validation, and redacted output requirements.
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
triggers:
  - azure service health
  - service advisory
  - incident watchlist
  - impact score
  - outage summary
---

# Azure Service Health

## Integration Context Contract
- Canonical contract: [`docs/integration-context.md`](../../../docs/integration-context.md)

| Workflow | tenantId | subscriptionId | environmentCloud | principalType | scopesOrRoles |
|---|---|---|---|---|---|
| Azure Service Health operations | required | required | `AzureCloud`* | service-principal or delegated-user | `Reader`, `Monitoring Reader` |

* Use sovereign cloud values from the canonical contract when applicable.

Fail fast before API calls when required context is missing or malformed. Redact tenant, subscription, and object identifiers.

## Command Surface

| Command | Purpose |
|---|---|
| `service-health-setup` | Deterministic workflow for service health setup. |
| `service-health-watchlist` | Deterministic workflow for service health watchlist. |
| `service-health-runbook-map` | Deterministic workflow for service health runbook map. |
| `service-health-impact-score` | Deterministic workflow for service health impact score. |
| `service-health-comms-summary` | Deterministic workflow for service health comms summary. |

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
