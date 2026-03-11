---
name: aks-pod-failure-scan
description: Execute the aks pod failure scan workflow with deterministic validation and redacted output.
argument-hint: "[options]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
---

# Aks Pod Failure Scan

Run the aks pod failure scan workflow for azure-kubernetes.

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
| Primary workflow query | GET | `/aks-pod-failure-scan` |
| Follow-up verification | GET | `/azure-kubernetes/verification` |

## Azure CLI Commands

```bash
# Quick cluster health check
az aks show --name <cluster> --resource-group <rg> \
  --query "{PowerState:powerState.code, ProvisioningState:provisioningState, KubernetesVersion:kubernetesVersion, NodeCount:agentPoolProfiles[].count}"

# Run kubectl diagnostics without local kubeconfig
az aks command invoke --name <cluster> --resource-group <rg> --command "kubectl get pods -A"
az aks command invoke --name <cluster> --resource-group <rg> --command "kubectl get events --sort-by=.lastTimestamp -A"

# Pod failure logs via Container Insights
az monitor log-analytics query --workspace <workspace-id> --analytics-query \
  "ContainerLog | where LogEntry contains 'error' or LogEntry contains 'fatal' | where TimeGenerated > ago(1h) | project TimeGenerated, ContainerID, LogEntry | order by TimeGenerated desc | take 50" --output table

# Pod inventory by status
az monitor log-analytics query --workspace <workspace-id> --analytics-query \
  "KubePodInventory | where ClusterName == '<cluster>' | where Namespace != 'kube-system' | summarize count() by Name, PodStatus | order by count_ desc" --output table

# Node diagnostics
az monitor log-analytics query --workspace <workspace-id> --analytics-query \
  "KubeNodeInventory | where ClusterName == '<cluster>' | project Computer, Status, KubeletVersion, LastTransitionTimeReady | order by Status" --output table

# Create metric alert for pod restart spikes
az monitor metrics alert create --resource-group <rg> --name "aks-pod-failures" \
  --scopes <cluster-resource-id> --condition "total restartingContainerCount > 5" \
  --window-size PT15M --evaluation-frequency PT5M --severity 2 --action <action-group-id>

# Collect cluster diagnostics to storage
az aks kollect --name <cluster> --resource-group <rg> --storage-account <sa-name>
```

## Output

- Markdown summary with findings, actions, and unresolved risks.
- Redacted identifiers and no secret or token material.

