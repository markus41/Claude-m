---
name: Microsoft Intune
description: >
  Deep expertise in Microsoft Intune operations with deterministic runbooks,
  fail-fast context validation, and redacted output requirements.
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
triggers:
  - microsoft intune
  - intune
  - endpoint manager
  - non compliant device
  - lost device
  - compliance policy
  - app protection policy
---

# Microsoft Intune

## Integration Context Contract
- Canonical contract: [`docs/integration-context.md`](../../../docs/integration-context.md)

| Workflow | tenantId | subscriptionId | environmentCloud | principalType | scopesOrRoles |
|---|---|---|---|---|---|
| Microsoft Intune operations | required | optional | `AzureCloud`* | delegated-user or service-principal | `DeviceManagementManagedDevices.ReadWrite.All`, `DeviceManagementConfiguration.ReadWrite.All`, `DeviceManagementApps.Read.All` |

* Use sovereign cloud values from the canonical contract when applicable.

Fail fast before API calls when required context is missing or malformed. Redact tenant, subscription, and object identifiers.

## Command Surface

| Command | Purpose |
|---|---|
| `intune-setup` | Deterministic workflow for intune setup. |
| `intune-noncompliant-devices` | Deterministic workflow for intune noncompliant devices. |
| `intune-lost-device-action` | Deterministic workflow for intune lost device action. |
| `intune-compliance-policy-deploy` | Deterministic workflow for intune compliance policy deploy. |
| `intune-app-protection-review` | Deterministic workflow for intune app protection review. |

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
