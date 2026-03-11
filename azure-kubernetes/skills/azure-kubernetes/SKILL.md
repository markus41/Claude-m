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

## Azure CLI Reference

All commands below require Azure CLI (`az`) with an authenticated session (`az login`).
Replace `<cluster>`, `<rg>`, and other placeholders with actual values.

### Cluster Lifecycle

```bash
# Create AKS cluster
az aks create --name <cluster> --resource-group <rg> --location <region> \
  --node-count 3 --node-vm-size Standard_DS2_v2 --generate-ssh-keys \
  --network-plugin azure --enable-managed-identity

# Create with advanced options (availability zones, CNI policy, monitoring)
az aks create --name <cluster> --resource-group <rg> \
  --node-count 3 --node-vm-size Standard_DS3_v2 --generate-ssh-keys \
  --network-plugin azure --network-policy calico \
  --vnet-subnet-id <subnet-id> --service-cidr 10.0.0.0/16 --dns-service-ip 10.0.0.10 \
  --enable-managed-identity --enable-addons monitoring \
  --workspace-resource-id <workspace-id> --zones 1 2 3 --tier standard

# Get credentials (kubeconfig)
az aks get-credentials --name <cluster> --resource-group <rg>
az aks get-credentials --name <cluster> --resource-group <rg> --admin
az aks get-credentials --name <cluster> --resource-group <rg> --overwrite-existing

# Show / list / delete
az aks show --name <cluster> --resource-group <rg>
az aks list --resource-group <rg> --output table
az aks list --output table
az aks delete --name <cluster> --resource-group <rg> --yes --no-wait

# Update cluster
az aks update --name <cluster> --resource-group <rg> --enable-cluster-autoscaler --min-count 1 --max-count 10
az aks update --name <cluster> --resource-group <rg> --attach-acr <acr-name>
az aks update --name <cluster> --resource-group <rg> --enable-azure-rbac
az aks update --name <cluster> --resource-group <rg> --api-server-authorized-ip-ranges "1.2.3.4/32,5.6.7.8/32"

# Install kubectl via Azure CLI
az aks install-cli

# Run command on cluster without local kubeconfig
az aks command invoke --name <cluster> --resource-group <rg> --command "kubectl get pods -A"
az aks command invoke --name <cluster> --resource-group <rg> --command "kubectl apply -f deployment.yaml" --file deployment.yaml
```

### Node Pool Management

```bash
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

# Scale node pool
az aks nodepool scale --cluster-name <cluster> --resource-group <rg> --name <pool-name> --node-count 5

# Update node pool autoscaler
az aks nodepool update --cluster-name <cluster> --resource-group <rg> --name <pool-name> \
  --enable-cluster-autoscaler --min-count 1 --max-count 10

# Update labels and taints
az aks nodepool update --cluster-name <cluster> --resource-group <rg> --name <pool-name> --labels env=prod tier=backend
az aks nodepool update --cluster-name <cluster> --resource-group <rg> --name <pool-name> --node-taints "dedicated=special:NoSchedule"

# Show / list / delete
az aks nodepool show --cluster-name <cluster> --resource-group <rg> --name <pool-name>
az aks nodepool list --cluster-name <cluster> --resource-group <rg> --output table
az aks nodepool delete --cluster-name <cluster> --resource-group <rg> --name <pool-name> --yes
```

### Upgrades

```bash
# Check available upgrades
az aks get-upgrades --name <cluster> --resource-group <rg> --output table

# Upgrade cluster control plane + node pools
az aks upgrade --name <cluster> --resource-group <rg> --kubernetes-version <version> --yes

# Upgrade a single node pool
az aks nodepool upgrade --cluster-name <cluster> --resource-group <rg> --name <pool-name> --kubernetes-version <version>

# Upgrade node image only (no Kubernetes version change)
az aks nodepool upgrade --cluster-name <cluster> --resource-group <rg> --name <pool-name> --node-image-only

# Get available node image versions
az aks nodepool get-upgrades --cluster-name <cluster> --resource-group <rg> --nodepool-name <pool-name>
```

### ACR Integration

```bash
# Attach ACR to AKS
az aks update --name <cluster> --resource-group <rg> --attach-acr <acr-name>

# Detach ACR
az aks update --name <cluster> --resource-group <rg> --detach-acr <acr-name>

# Check ACR access
az aks check-acr --name <cluster> --resource-group <rg> --acr <acr-name>.azurecr.io
```

### Addons

```bash
# Enable monitoring
az aks enable-addons --name <cluster> --resource-group <rg> --addons monitoring --workspace-resource-id <workspace-id>

# Enable Azure Policy
az aks enable-addons --name <cluster> --resource-group <rg> --addons azure-policy

# Enable Azure Key Vault Secrets Provider
az aks enable-addons --name <cluster> --resource-group <rg> --addons azure-keyvault-secrets-provider

# Enable HTTP application routing (dev only)
az aks enable-addons --name <cluster> --resource-group <rg> --addons http_application_routing

# Enable KEDA
az aks enable-addons --name <cluster> --resource-group <rg> --addons keda

# Disable addon
az aks disable-addons --name <cluster> --resource-group <rg> --addons monitoring

# Show addon status
az aks show --name <cluster> --resource-group <rg> --query "addonProfiles"
```

### Identity & RBAC

```bash
# Enable managed identity
az aks update --name <cluster> --resource-group <rg> --enable-managed-identity

# Get managed identity details
az aks show --name <cluster> --resource-group <rg> --query "identity"
az aks show --name <cluster> --resource-group <rg> --query "identityProfile.kubeletidentity.objectId" -o tsv

# Enable Azure RBAC for Kubernetes authorization
az aks update --name <cluster> --resource-group <rg> --enable-azure-rbac

# Assign RBAC roles
az role assignment create --assignee <user-or-sp-id> \
  --role "Azure Kubernetes Service Cluster User Role" --scope <cluster-resource-id>
az role assignment create --assignee <user-or-sp-id> \
  --role "Azure Kubernetes Service RBAC Writer" --scope <cluster-resource-id>/namespaces/<ns>

# Enable workload identity + OIDC issuer
az aks update --name <cluster> --resource-group <rg> --enable-oidc-issuer --enable-workload-identity

# Get OIDC issuer URL
az aks show --name <cluster> --resource-group <rg> --query "oidcIssuerProfile.issuerUrl" -o tsv
```

### Networking

```bash
# Show network profile
az aks show --name <cluster> --resource-group <rg> --query "networkProfile"

# Update authorized IP ranges
az aks update --name <cluster> --resource-group <rg> --api-server-authorized-ip-ranges "1.2.3.4/32"

# Create private cluster
az aks create --name <cluster> --resource-group <rg> --enable-private-cluster \
  --node-count 3 --generate-ssh-keys

# Show FQDN
az aks show --name <cluster> --resource-group <rg> --query "fqdn" -o tsv
az aks show --name <cluster> --resource-group <rg> --query "privateFqdn" -o tsv
```

### Maintenance Windows

```bash
# Add maintenance window
az aks maintenanceconfiguration add --cluster-name <cluster> --resource-group <rg> \
  --name default --weekday Monday --start-hour 1

# List maintenance configurations
az aks maintenanceconfiguration list --cluster-name <cluster> --resource-group <rg>

# Delete maintenance configuration
az aks maintenanceconfiguration delete --cluster-name <cluster> --resource-group <rg> --name default
```

### Diagnostics & Monitoring

```bash
# Collect cluster diagnostics
az aks kollect --name <cluster> --resource-group <rg> --storage-account <sa-name>

# Container Insights - pod inventory
az monitor log-analytics query --workspace <workspace-id> --analytics-query \
  "KubePodInventory | where ClusterName == '<cluster>' | where Namespace != 'kube-system' | summarize count() by Name, PodStatus | order by count_ desc" --output table

# Pod failure logs
az monitor log-analytics query --workspace <workspace-id> --analytics-query \
  "ContainerLog | where LogEntry contains 'error' or LogEntry contains 'fatal' | where TimeGenerated > ago(1h) | project TimeGenerated, ContainerID, LogEntry | order by TimeGenerated desc | take 50" --output table

# Node diagnostics
az monitor log-analytics query --workspace <workspace-id> --analytics-query \
  "KubeNodeInventory | where ClusterName == '<cluster>' | project Computer, Status, KubeletVersion, LastTransitionTimeReady | order by Status" --output table

# Create metric alert for pod restart spikes
az monitor metrics alert create --resource-group <rg> --name "aks-pod-failures" \
  --scopes <cluster-resource-id> --condition "total restartingContainerCount > 5" \
  --window-size PT15M --evaluation-frequency PT5M --severity 2 --action <action-group-id>

# Diagnostic settings (send all logs and metrics to Log Analytics)
az monitor diagnostic-settings create --resource <cluster-resource-id> --name "aks-diag" \
  --workspace <workspace-id> \
  --logs '[{"categoryGroup":"allLogs","enabled":true}]' \
  --metrics '[{"category":"AllMetrics","enabled":true}]'

# Quick cluster health check
az aks show --name <cluster> --resource-group <rg> \
  --query "{PowerState:powerState.code, ProvisioningState:provisioningState, KubernetesVersion:kubernetesVersion, NodeCount:agentPoolProfiles[].count}"
```

### Start / Stop Cluster

```bash
# Stop cluster (save costs in non-production)
az aks stop --name <cluster> --resource-group <rg>

# Start cluster
az aks start --name <cluster> --resource-group <rg>

# Check power state
az aks show --name <cluster> --resource-group <rg> --query "powerState" -o tsv
```
