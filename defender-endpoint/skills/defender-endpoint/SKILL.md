---
name: Defender Endpoint
description: >
  Deep expertise in Defender Endpoint operations with deterministic runbooks,
  fail-fast context validation, and redacted output requirements.
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
triggers:
  - defender endpoint
  - endpoint triage
  - isolate machine
  - live response
  - endpoint evidence
---

# Defender Endpoint

## Integration Context Contract
- Canonical contract: [`docs/integration-context.md`](../../../docs/integration-context.md)

| Workflow | tenantId | subscriptionId | environmentCloud | principalType | scopesOrRoles |
|---|---|---|---|---|---|
| Defender Endpoint operations | required | optional | `AzureCloud`* | service-principal or delegated-user | `SecurityAlert.Read.All`, `SecurityIncident.Read.All`, `ThreatHunting.Read.All`, `Machine.Isolate` |

* Use sovereign cloud values from the canonical contract when applicable.

Fail fast before API calls when required context is missing or malformed. Redact tenant, subscription, and object identifiers.

## Command Surface

| Command | Purpose |
|---|---|
| `defender-endpoint-setup` | Deterministic workflow for defender endpoint setup. |
| `defender-endpoint-triage` | Deterministic workflow for defender endpoint triage. |
| `defender-endpoint-isolate-machine` | Deterministic workflow for defender endpoint isolate machine. |
| `defender-endpoint-live-response-metadata` | Deterministic workflow for defender endpoint live response metadata. |
| `defender-endpoint-evidence-summary` | Deterministic workflow for defender endpoint evidence summary. |

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
