---
name: backup-cross-region-check
description: Execute the backup cross region check workflow with deterministic validation and redacted output.
argument-hint: "[options]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
---

# Backup Cross Region Check

Run the backup cross region check workflow for azure-backup-recovery.

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
| Primary workflow query | GET | `/backup-cross-region-check` |
| Follow-up verification | GET | `/azure-backup-recovery/verification` |

## Azure CLI Commands

### Vault Cross-Region Configuration

```bash
# Show vault backup properties (verify CRR / storage redundancy)
az backup vault backup-properties show --name <vault> --resource-group <rg>

# Set vault storage redundancy to GeoRedundant (required for CRR)
az backup vault backup-properties set --name <vault> --resource-group <rg> --backup-storage-redundancy GeoRedundant
```

### Cross-Region Restore

```bash
# List recovery points
az backup recoverypoint list --vault-name <vault> --resource-group <rg> --container-name <container> --item-name <vm-name> --backup-management-type AzureIaasVM --output table

# Cross-region restore (requires CRR enabled on vault)
az backup restore restore-disks --vault-name <vault> --resource-group <rg> --container-name <container> --item-name <vm-name> --rp-name <rp-name> --storage-account <sa-name> --target-resource-group <target-rg> --use-secondary-region
```

### Azure Site Recovery Replication

```bash
# Enable replication for VM (via REST)
az rest --method PUT \
  --url "https://management.azure.com/subscriptions/<sub-id>/resourceGroups/<rg>/providers/Microsoft.RecoveryServices/vaults/<vault>/replicationFabrics/<fabric>/replicationProtectionContainers/<container>/replicationProtectedItems/<item>?api-version=2023-08-01" \
  --body @enable-replication.json

# List replicated items and check replication health
az rest --method GET \
  --url "https://management.azure.com/subscriptions/<sub-id>/resourceGroups/<rg>/providers/Microsoft.RecoveryServices/vaults/<vault>/replicationProtectedItems?api-version=2023-08-01" \
  --query "value[].{Name:name, Status:properties.protectionState, Health:properties.replicationHealth}"
```

### Test Failover

```bash
# Test failover
az rest --method POST \
  --url "https://management.azure.com/subscriptions/<sub-id>/resourceGroups/<rg>/providers/Microsoft.RecoveryServices/vaults/<vault>/replicationFabrics/<fabric>/replicationProtectionContainers/<container>/replicationProtectedItems/<item>/testFailover?api-version=2023-08-01" \
  --body '{"properties":{"failoverDirection":"PrimaryToRecovery","networkId":"<vnet-resource-id>","networkType":"VmNetworkAsInput"}}'

# Cleanup test failover
az rest --method POST \
  --url "https://management.azure.com/subscriptions/<sub-id>/resourceGroups/<rg>/providers/Microsoft.RecoveryServices/vaults/<vault>/replicationFabrics/<fabric>/replicationProtectionContainers/<container>/replicationProtectedItems/<item>/testFailoverCleanup?api-version=2023-08-01" \
  --body '{"properties":{"comments":"Test complete"}}'

# Planned failover
az rest --method POST \
  --url "https://management.azure.com/subscriptions/<sub-id>/resourceGroups/<rg>/providers/Microsoft.RecoveryServices/vaults/<vault>/replicationFabrics/<fabric>/replicationProtectionContainers/<container>/replicationProtectedItems/<item>/plannedFailover?api-version=2023-08-01" \
  --body '{"properties":{"failoverDirection":"PrimaryToRecovery"}}'
```

### Recovery Plans

```bash
# List recovery plans
az rest --method GET \
  --url "https://management.azure.com/subscriptions/<sub-id>/resourceGroups/<rg>/providers/Microsoft.RecoveryServices/vaults/<vault>/replicationRecoveryPlans?api-version=2023-08-01"

# Create or update recovery plan
az rest --method PUT \
  --url "https://management.azure.com/subscriptions/<sub-id>/resourceGroups/<rg>/providers/Microsoft.RecoveryServices/vaults/<vault>/replicationRecoveryPlans/<plan-name>?api-version=2023-08-01" \
  --body @recovery-plan.json
```

## Output

- Markdown summary with findings, actions, and unresolved risks.
- Redacted identifiers and no secret or token material.

