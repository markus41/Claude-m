# azure-kubernetes

Azure Kubernetes Service operations - cluster inventory, pod failure diagnostics, node pool scaling, and policy posture checks.

## Purpose

This plugin is a knowledge plugin for Azure Kubernetes workflows. It provides deterministic command guidance and review patterns, and does not include runtime MCP servers.

## Prerequisites

- Microsoft tenant access for the target workload.
- Required scopes or roles: `Azure Kubernetes Service RBAC Cluster Admin`, `Reader`
- Redaction and fail-fast behavior must follow the shared integration contract.

## Install

```bash
/plugin install azure-kubernetes@claude-m-microsoft-marketplace
```

## Integration Context Contract
- Canonical contract: [`docs/integration-context.md`](../docs/integration-context.md)

| Command family | tenantId | subscriptionId | environmentCloud | principalType | scopesOrRoles |
|---|---|---|---|---|---|
| Azure Kubernetes operations | required | required | `AzureCloud`* | service-principal or delegated-user | `Azure Kubernetes Service RBAC Cluster Admin`, `Reader` |

* Use sovereign cloud values from the canonical contract when applicable.

Commands must fail fast before network calls when required context is missing or invalid. All outputs must redact sensitive IDs and secrets.

## Commands

| Command | Description |
|---|---|
| `/aks-setup` | Run aks setup workflow. |
| `/aks-cluster-inventory` | Run aks cluster inventory workflow. |
| `/aks-pod-failure-scan` | Run aks pod failure scan workflow. |
| `/aks-nodepool-scale` | Run aks nodepool scale workflow. |
| `/aks-policy-status` | Run aks policy status workflow. |

## Agent

| Agent | Description |
|---|---|
| `azure-kubernetes-reviewer` | Reviews command and skill docs for API correctness, permissions, and safety checks. |

## Trigger Keywords

- `aks`
- `azure kubernetes`
- `pod crashloop`
- `node pool scale`
- `azure policy for aks`
