---
name: aks-setup
description: Execute the aks setup workflow with deterministic validation and redacted output.
argument-hint: "[options]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
  - AskUserQuestion
---

# Aks Setup

Run the aks setup workflow for azure-kubernetes.

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
| Primary workflow query | GET | `/aks-setup` |
| Follow-up verification | GET | `/azure-kubernetes/verification` |

## Azure CLI Commands

```bash
# Install kubectl
az aks install-cli

# Create AKS cluster
az aks create --name <cluster> --resource-group <rg> --location <region> \
  --node-count 3 --node-vm-size Standard_DS2_v2 --generate-ssh-keys \
  --network-plugin azure --enable-managed-identity

# Create with advanced options (zones, CNI policy, monitoring)
az aks create --name <cluster> --resource-group <rg> \
  --node-count 3 --node-vm-size Standard_DS3_v2 --generate-ssh-keys \
  --network-plugin azure --network-policy calico \
  --vnet-subnet-id <subnet-id> --service-cidr 10.0.0.0/16 --dns-service-ip 10.0.0.10 \
  --enable-managed-identity --enable-addons monitoring \
  --workspace-resource-id <workspace-id> --zones 1 2 3 --tier standard

# Create private cluster
az aks create --name <cluster> --resource-group <rg> --enable-private-cluster \
  --node-count 3 --generate-ssh-keys

# Get credentials
az aks get-credentials --name <cluster> --resource-group <rg>
az aks get-credentials --name <cluster> --resource-group <rg> --admin
az aks get-credentials --name <cluster> --resource-group <rg> --overwrite-existing

# Enable managed identity
az aks update --name <cluster> --resource-group <rg> --enable-managed-identity

# Enable workload identity + OIDC issuer
az aks update --name <cluster> --resource-group <rg> --enable-oidc-issuer --enable-workload-identity

# Attach ACR
az aks update --name <cluster> --resource-group <rg> --attach-acr <acr-name>

# Enable addons
az aks enable-addons --name <cluster> --resource-group <rg> --addons monitoring --workspace-resource-id <workspace-id>
az aks enable-addons --name <cluster> --resource-group <rg> --addons azure-policy
az aks enable-addons --name <cluster> --resource-group <rg> --addons azure-keyvault-secrets-provider
az aks enable-addons --name <cluster> --resource-group <rg> --addons keda

# Diagnostic settings
az monitor diagnostic-settings create --resource <cluster-resource-id> --name "aks-diag" \
  --workspace <workspace-id> \
  --logs '[{"categoryGroup":"allLogs","enabled":true}]' \
  --metrics '[{"category":"AllMetrics","enabled":true}]'

# Maintenance window
az aks maintenanceconfiguration add --cluster-name <cluster> --resource-group <rg> \
  --name default --weekday Monday --start-hour 1
```

## Output

- Markdown summary with findings, actions, and unresolved risks.
- Redacted identifiers and no secret or token material.

