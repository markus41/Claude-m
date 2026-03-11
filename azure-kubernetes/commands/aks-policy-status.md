---
name: aks-policy-status
description: Execute the aks policy status workflow with deterministic validation and redacted output.
argument-hint: "[options]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
---

# Aks Policy Status

Run the aks policy status workflow for azure-kubernetes.

## Preconditions

- Validate integration context using [`docs/integration-context.md`](../../docs/integration-context.md).
- Confirm required scopes or roles are granted.
- Define safety gates before any mutating API call.

## Steps

1. Validate required context fields and fail fast on missing values.
2. Collect read-only baseline data for targets.
3. Execute the requested workflow with explicit safety checks.
4. Verify final state with post-action read operations.
5. Produce a redacted summary and next actions.

## Key Endpoints

| Operation | Method | Endpoint |
|---|---|---|
| Primary workflow query | GET | `/aks-policy-status` |
| Follow-up verification | GET | `/azure-kubernetes/verification` |

## Azure CLI Commands

```bash
# Enable Azure Policy addon
az aks enable-addons --name <cluster> --resource-group <rg> --addons azure-policy

# Disable Azure Policy addon
az aks disable-addons --name <cluster> --resource-group <rg> --addons azure-policy

# Show addon status (check if Azure Policy is active)
az aks show --name <cluster> --resource-group <rg> --query "addonProfiles"

# Enable Azure RBAC for Kubernetes authorization
az aks update --name <cluster> --resource-group <rg> --enable-azure-rbac

# Update authorized API server IP ranges
az aks update --name <cluster> --resource-group <rg> --api-server-authorized-ip-ranges "1.2.3.4/32,5.6.7.8/32"

# Assign RBAC roles
az role assignment create --assignee <user-or-sp-id> \
  --role "Azure Kubernetes Service Cluster User Role" --scope <cluster-resource-id>
az role assignment create --assignee <user-or-sp-id> \
  --role "Azure Kubernetes Service RBAC Writer" --scope <cluster-resource-id>/namespaces/<ns>

# Run policy audit via kubectl without local kubeconfig
az aks command invoke --name <cluster> --resource-group <rg> \
  --command "kubectl get constrainttemplates"
az aks command invoke --name <cluster> --resource-group <rg> \
  --command "kubectl get constraints"
```

## Output

- Markdown summary with findings, actions, and unresolved risks.
- Redacted identifiers and no secret or token material.

