---
name: Azure Backup Recovery
description: >
  Deep expertise in Azure Backup Recovery operations with deterministic runbooks,
  fail-fast context validation, and redacted output requirements.
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
triggers:
  - azure backup
  - site recovery
  - backup health
  - restore drill
  - recovery plan
---

# Azure Backup Recovery

## Integration Context Contract
- Canonical contract: [`docs/integration-context.md`](../../../docs/integration-context.md)

| Workflow | tenantId | subscriptionId | environmentCloud | principalType | scopesOrRoles |
|---|---|---|---|---|---|
| Azure Backup Recovery operations | required | required | `AzureCloud`* | service-principal or delegated-user | `Backup Reader`, `Site Recovery Contributor`, `Reader` |

* Use sovereign cloud values from the canonical contract when applicable.

Fail fast before API calls when required context is missing or malformed. Redact tenant, subscription, and object identifiers.

## Command Surface

| Command | Purpose |
|---|---|
| `backup-recovery-setup` | Deterministic workflow for backup recovery setup. |
| `backup-job-health` | Deterministic workflow for backup job health. |
| `backup-restore-drill` | Deterministic workflow for backup restore drill. |
| `backup-recovery-plan-audit` | Deterministic workflow for backup recovery plan audit. |
| `backup-cross-region-check` | Deterministic workflow for backup cross region check. |

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
