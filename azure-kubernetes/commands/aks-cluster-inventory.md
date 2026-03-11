---
name: aks-cluster-inventory
description: Execute the aks cluster inventory workflow with deterministic validation and redacted output.
argument-hint: "[options]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
---

# Aks Cluster Inventory

Run the aks cluster inventory workflow for azure-kubernetes.

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
| Primary workflow query | GET | `/aks-cluster-inventory` |
| Follow-up verification | GET | `/azure-kubernetes/verification` |

## Azure CLI Commands

```bash
# List all clusters in subscription
az aks list --output table

# List clusters in a resource group
az aks list --resource-group <rg> --output table

# Show cluster details
az aks show --name <cluster> --resource-group <rg>

# Quick cluster health summary
az aks show --name <cluster> --resource-group <rg> \
  --query "{PowerState:powerState.code, ProvisioningState:provisioningState, KubernetesVersion:kubernetesVersion, NodeCount:agentPoolProfiles[].count}"

# Show network profile
az aks show --name <cluster> --resource-group <rg> --query "networkProfile"

# Show addon status
az aks show --name <cluster> --resource-group <rg> --query "addonProfiles"

# Show managed identity
az aks show --name <cluster> --resource-group <rg> --query "identity"

# Show FQDN
az aks show --name <cluster> --resource-group <rg> --query "fqdn" -o tsv
az aks show --name <cluster> --resource-group <rg> --query "privateFqdn" -o tsv

# Get OIDC issuer URL
az aks show --name <cluster> --resource-group <rg> --query "oidcIssuerProfile.issuerUrl" -o tsv

# List node pools
az aks nodepool list --cluster-name <cluster> --resource-group <rg> --output table

# Show node pool details
az aks nodepool show --cluster-name <cluster> --resource-group <rg> --name <pool-name>

# Check available upgrades
az aks get-upgrades --name <cluster> --resource-group <rg> --output table

# Get available node image versions
az aks nodepool get-upgrades --cluster-name <cluster> --resource-group <rg> --nodepool-name <pool-name>

# Check ACR access
az aks check-acr --name <cluster> --resource-group <rg> --acr <acr-name>.azurecr.io

# List maintenance configurations
az aks maintenanceconfiguration list --cluster-name <cluster> --resource-group <rg>

# Run kubectl command without local kubeconfig
az aks command invoke --name <cluster> --resource-group <rg> --command "kubectl get pods -A"
```

## Output

- Markdown summary with findings, actions, and unresolved risks.
- Redacted identifiers and no secret or token material.

