---
name: aks-nodepool-scale
description: Execute the aks nodepool scale workflow with deterministic validation and redacted output.
argument-hint: "[options]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
---

# Aks Nodepool Scale

Run the aks nodepool scale workflow for azure-kubernetes.

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
| Primary workflow query | GET | `/aks-nodepool-scale` |
| Follow-up verification | GET | `/azure-kubernetes/verification` |

## Azure CLI Commands

```bash
# List node pools
az aks nodepool list --cluster-name <cluster> --resource-group <rg> --output table

# Show node pool details
az aks nodepool show --cluster-name <cluster> --resource-group <rg> --name <pool-name>

# Scale node pool to a fixed count
az aks nodepool scale --cluster-name <cluster> --resource-group <rg> --name <pool-name> --node-count 5

# Enable cluster autoscaler on a node pool
az aks nodepool update --cluster-name <cluster> --resource-group <rg> --name <pool-name> \
  --enable-cluster-autoscaler --min-count 1 --max-count 10

# Enable cluster autoscaler at cluster level
az aks update --name <cluster> --resource-group <rg> --enable-cluster-autoscaler --min-count 1 --max-count 10

# Add user node pool
az aks nodepool add --cluster-name <cluster> --resource-group <rg> \
  --name <pool-name> --node-count 3 --node-vm-size Standard_DS3_v2 --mode User

# Add spot node pool
az aks nodepool add --cluster-name <cluster> --resource-group <rg> \
  --name spotpool --node-count 3 --node-vm-size Standard_DS3_v2 \
  --priority Spot --eviction-policy Delete --spot-max-price -1

# Add GPU node pool
az aks nodepool add --cluster-name <cluster> --resource-group <rg> \
  --name gpupool --node-count 1 --node-vm-size Standard_NC6s_v3 \
  --node-taints "sku=gpu:NoSchedule" --labels gpu=true

# Add Windows node pool
az aks nodepool add --cluster-name <cluster> --resource-group <rg> \
  --name winpool --node-count 2 --os-type Windows --node-vm-size Standard_D4s_v3

# Update labels and taints
az aks nodepool update --cluster-name <cluster> --resource-group <rg> --name <pool-name> --labels env=prod tier=backend
az aks nodepool update --cluster-name <cluster> --resource-group <rg> --name <pool-name> --node-taints "dedicated=special:NoSchedule"

# Delete node pool
az aks nodepool delete --cluster-name <cluster> --resource-group <rg> --name <pool-name> --yes

# Upgrade node pool Kubernetes version
az aks nodepool upgrade --cluster-name <cluster> --resource-group <rg> --name <pool-name> --kubernetes-version <version>

# Upgrade node image only
az aks nodepool upgrade --cluster-name <cluster> --resource-group <rg> --name <pool-name> --node-image-only
```

## Output

- Markdown summary with findings, actions, and unresolved risks.
- Redacted identifiers and no secret or token material.

