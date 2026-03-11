# Azure Kubernetes API Reference

## Required Permissions

- `Azure Kubernetes Service RBAC Cluster Admin`
- `Reader`

## Workflow Entry Points

- `aks-setup`
- `aks-cluster-inventory`
- `aks-pod-failure-scan`
- `aks-nodepool-scale`
- `aks-policy-status`

## Azure CLI Command Groups

| Command group | Purpose |
|---|---|
| `az aks create / show / list / delete` | Cluster lifecycle |
| `az aks update` | Cluster configuration (autoscaler, ACR, RBAC, IP ranges) |
| `az aks get-credentials` | Fetch kubeconfig |
| `az aks upgrade` | Cluster Kubernetes version upgrade |
| `az aks start / stop` | Start or stop cluster (cost savings) |
| `az aks command invoke` | Run kubectl without local kubeconfig |
| `az aks install-cli` | Install kubectl |
| `az aks get-upgrades` | List available upgrade versions |
| `az aks check-acr` | Validate ACR pull access |
| `az aks kollect` | Collect diagnostics |
| `az aks nodepool add / show / list / delete` | Node pool lifecycle |
| `az aks nodepool scale` | Fixed-count node pool scaling |
| `az aks nodepool update` | Autoscaler, labels, taints |
| `az aks nodepool upgrade` | Node pool version or image upgrade |
| `az aks nodepool get-upgrades` | Available node image versions |
| `az aks enable-addons / disable-addons` | Addon management |
| `az aks maintenanceconfiguration add / list / delete` | Maintenance windows |
| `az monitor log-analytics query` | KQL queries for Container Insights |
| `az monitor metrics alert create` | Metric-based alerting |
| `az monitor diagnostic-settings create` | Log and metric routing |
| `az role assignment create` | RBAC role assignment |

## Validation Checklist

1. Confirm integration context is complete before execution.
2. Confirm required scopes or roles are granted.
3. Confirm destructive actions include explicit approval.
4. Confirm all output is redacted.
