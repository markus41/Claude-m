---
name: Azure Kubernetes
description: >
  Deep expertise in Azure Kubernetes operations with deterministic runbooks,
  fail-fast context validation, and redacted output requirements.
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
triggers:
  - aks
  - azure kubernetes
  - pod crashloop
  - node pool scale
  - azure policy for aks
---

# Azure Kubernetes

## Integration Context Contract
- Canonical contract: [`docs/integration-context.md`](../../../docs/integration-context.md)

| Workflow | tenantId | subscriptionId | environmentCloud | principalType | scopesOrRoles |
|---|---|---|---|---|---|
| Azure Kubernetes operations | required | required | `AzureCloud`* | service-principal or delegated-user | `Azure Kubernetes Service RBAC Cluster Admin`, `Reader` |

* Use sovereign cloud values from the canonical contract when applicable.

Fail fast before API calls when required context is missing or malformed. Redact tenant, subscription, and object identifiers.

## Command Surface

| Command | Purpose |
|---|---|
| `aks-setup` | Deterministic workflow for aks setup. |
| `aks-cluster-inventory` | Deterministic workflow for aks cluster inventory. |
| `aks-pod-failure-scan` | Deterministic workflow for aks pod failure scan. |
| `aks-nodepool-scale` | Deterministic workflow for aks nodepool scale. |
| `aks-policy-status` | Deterministic workflow for aks policy status. |

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
