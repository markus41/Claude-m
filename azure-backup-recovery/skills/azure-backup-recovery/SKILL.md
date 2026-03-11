---
name: Azure Backup Recovery
description: >
  Deep expertise in Azure Backup Recovery operations with deterministic runbooks,
  fail-fast context validation, and redacted output requirements.
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
triggers:
  - azure backup
  - site recovery
  - backup health
  - restore drill
  - recovery plan
---

# Azure Backup Recovery

## Integration Context Contract
- Canonical contract: [`docs/integration-context.md`](../../../docs/integration-context.md)

| Workflow | tenantId | subscriptionId | environmentCloud | principalType | scopesOrRoles |
|---|---|---|---|---|---|
| Azure Backup Recovery operations | required | required | `AzureCloud`* | service-principal or delegated-user | `Backup Reader`, `Site Recovery Contributor`, `Reader` |

* Use sovereign cloud values from the canonical contract when applicable.

Fail fast before API calls when required context is missing or malformed. Redact tenant, subscription, and object identifiers.

## Command Surface

| Command | Purpose |
|---|---|
| `backup-recovery-setup` | Deterministic workflow for backup recovery setup. |
| `backup-job-health` | Deterministic workflow for backup job health. |
| `backup-restore-drill` | Deterministic workflow for backup restore drill. |
| `backup-recovery-plan-audit` | Deterministic workflow for backup recovery plan audit. |
| `backup-cross-region-check` | Deterministic workflow for backup cross region check. |

## Guardrails

1. Validate context schema and minimum grants before any API call.
2. Run read-only discovery first whenever possible.
3. Require explicit confirmation for destructive actions.
4. Re-query and verify post-action state.
5. Return structured, redacted output.

## Azure CLI Reference

### Recovery Services Vault

```bash
# Create vault
az backup vault create --name <vault-name> --resource-group <rg> --location <region>

# Show vault details
az backup vault show --name <vault> --resource-group <rg>

# List vaults in resource group
az backup vault list --resource-group <rg> --output table

# Delete vault
az backup vault delete --name <vault> --resource-group <rg> --yes --force

# Set vault storage redundancy (GeoRedundant | LocallyRedundant | ZoneRedundant)
az backup vault backup-properties set --name <vault> --resource-group <rg> --backup-storage-redundancy GeoRedundant

# Show vault backup properties
az backup vault backup-properties show --name <vault> --resource-group <rg>
```

### Backup Policies

```bash
# Create VM backup policy from JSON
az backup policy create --vault-name <vault> --resource-group <rg> --name <policy-name> --policy @vm-backup-policy.json --backup-management-type AzureIaasVM

# List all policies
az backup policy list --vault-name <vault> --resource-group <rg> --output table

# List policies by management type
az backup policy list --vault-name <vault> --resource-group <rg> --backup-management-type AzureIaasVM --output table

# Show policy details
az backup policy show --vault-name <vault> --resource-group <rg> --name <policy-name>

# Update policy from JSON
az backup policy set --vault-name <vault> --resource-group <rg> --policy @updated-policy.json --name <policy-name>

# Delete policy
az backup policy delete --vault-name <vault> --resource-group <rg> --name <policy-name>

# Get default VM policy
az backup policy get-default-for-vm --vault-name <vault> --resource-group <rg>
```

### VM Backup

```bash
# Enable backup for VM
az backup protection enable-for-vm --vault-name <vault> --resource-group <rg> --vm <vm-name> --policy-name <policy-name>

# Trigger on-demand backup
az backup protection backup-now --vault-name <vault> --resource-group <rg> --container-name <container> --item-name <vm-name> --backup-management-type AzureIaasVM --retain-until 2026-04-10

# List protected items
az backup item list --vault-name <vault> --resource-group <rg> --output table

# List VM protected items only
az backup item list --vault-name <vault> --resource-group <rg> --backup-management-type AzureIaasVM --output table

# Show protected item details
az backup item show --vault-name <vault> --resource-group <rg> --container-name <container> --name <vm-name> --backup-management-type AzureIaasVM

# Disable protection (keep data)
az backup protection disable --vault-name <vault> --resource-group <rg> --container-name <container> --item-name <vm-name> --backup-management-type AzureIaasVM

# Disable protection (delete data)
az backup protection disable --vault-name <vault> --resource-group <rg> --container-name <container> --item-name <vm-name> --backup-management-type AzureIaasVM --delete-backup-data true --yes
```

### Backup Jobs

```bash
# List all backup jobs
az backup job list --vault-name <vault> --resource-group <rg> --output table

# List failed jobs
az backup job list --vault-name <vault> --resource-group <rg> --status Failed --output table

# List jobs in date range
az backup job list --vault-name <vault> --resource-group <rg> --start-date 2026-03-01 --end-date 2026-03-10 --output table

# Show job details
az backup job show --vault-name <vault> --resource-group <rg> --name <job-id>

# Wait for job completion
az backup job wait --vault-name <vault> --resource-group <rg> --name <job-id>

# Stop a running job
az backup job stop --vault-name <vault> --resource-group <rg> --name <job-id>
```

### Restore Operations

```bash
# List recovery points
az backup recoverypoint list --vault-name <vault> --resource-group <rg> --container-name <container> --item-name <vm-name> --backup-management-type AzureIaasVM --output table

# Show recovery point details
az backup recoverypoint show --vault-name <vault> --resource-group <rg> --container-name <container> --item-name <vm-name> --backup-management-type AzureIaasVM --name <rp-name>

# Restore VM disks to storage account
az backup restore restore-disks --vault-name <vault> --resource-group <rg> --container-name <container> --item-name <vm-name> --rp-name <rp-name> --storage-account <sa-name> --target-resource-group <target-rg>

# Restore disks to staging storage account
az backup restore restore-disks --vault-name <vault> --resource-group <rg> --container-name <container> --item-name <vm-name> --rp-name <rp-name> --storage-account <sa-name> --restore-to-staging-storage-account true --target-resource-group <target-rg>

# Mount recovery point for file-level restore
az backup restore files mount-rp --vault-name <vault> --resource-group <rg> --container-name <container> --item-name <vm-name> --rp-name <rp-name>

# Unmount recovery point after file restore
az backup restore files unmount-rp --vault-name <vault> --resource-group <rg> --container-name <container> --item-name <vm-name> --rp-name <rp-name>

# Cross-region restore (requires CRR enabled on vault)
az backup restore restore-disks --vault-name <vault> --resource-group <rg> --container-name <container> --item-name <vm-name> --rp-name <rp-name> --storage-account <sa-name> --target-resource-group <target-rg> --use-secondary-region
```

### Backup Containers

```bash
# List containers
az backup container list --vault-name <vault> --resource-group <rg> --backup-management-type AzureIaasVM --output table

# Show container details
az backup container show --vault-name <vault> --resource-group <rg> --name <container-name> --backup-management-type AzureIaasVM

# Register container for SQL/HANA workloads
az backup container register --vault-name <vault> --resource-group <rg> --backup-management-type AzureWorkload --workload-type SAPHANA --resource-id <vm-resource-id>

# Unregister container
az backup container unregister --vault-name <vault> --resource-group <rg> --container-name <container> --backup-management-type AzureIaasVM --yes
```

### SQL and File Share Backup

```bash
# Enable SQL database backup
az backup protection enable-for-azurewl --vault-name <vault> --resource-group <rg> --policy-name <policy> --protectable-item-name <db-name> --protectable-item-type SQLDataBase --server-name <server> --workload-type MSSQL

# Enable Azure File Share backup
az backup protection enable-for-azurefileshare --vault-name <vault> --resource-group <rg> --policy-name <policy> --storage-account <sa-name> --azure-file-share <share-name>

# Restore file share
az backup restore restore-azurefileshare --vault-name <vault> --resource-group <rg> --container-name <container> --item-name <share-name> --rp-name <rp-name> --resolve-conflict Overwrite --restore-mode OriginalLocation
```

### Azure Site Recovery

```bash
# Create Recovery Services vault for ASR
az backup vault create --name <vault-name> --resource-group <rg> --location <region>

# Enable replication for VM (via REST)
az rest --method PUT \
  --url "https://management.azure.com/subscriptions/<sub-id>/resourceGroups/<rg>/providers/Microsoft.RecoveryServices/vaults/<vault>/replicationFabrics/<fabric>/replicationProtectionContainers/<container>/replicationProtectedItems/<item>?api-version=2023-08-01" \
  --body @enable-replication.json

# List replicated items
az rest --method GET \
  --url "https://management.azure.com/subscriptions/<sub-id>/resourceGroups/<rg>/providers/Microsoft.RecoveryServices/vaults/<vault>/replicationProtectedItems?api-version=2023-08-01" \
  --query "value[].{Name:name, Status:properties.protectionState, Health:properties.replicationHealth}"

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

# List recovery plans
az rest --method GET \
  --url "https://management.azure.com/subscriptions/<sub-id>/resourceGroups/<rg>/providers/Microsoft.RecoveryServices/vaults/<vault>/replicationRecoveryPlans?api-version=2023-08-01"

# Create or update recovery plan
az rest --method PUT \
  --url "https://management.azure.com/subscriptions/<sub-id>/resourceGroups/<rg>/providers/Microsoft.RecoveryServices/vaults/<vault>/replicationRecoveryPlans/<plan-name>?api-version=2023-08-01" \
  --body @recovery-plan.json
```

### Monitoring and Diagnostics

```bash
# Show backup alerts
az backup alert show --vault-name <vault> --resource-group <rg>

# Create diagnostic settings for vault
az monitor diagnostic-settings create \
  --resource "/subscriptions/<sub-id>/resourceGroups/<rg>/providers/Microsoft.RecoveryServices/vaults/<vault>" \
  --name "backup-diag" \
  --workspace <workspace-id> \
  --logs '[{"categoryGroup":"allLogs","enabled":true}]' \
  --metrics '[{"category":"AllMetrics","enabled":true}]'

# Show vault usage summary
az backup vault show --name <vault> --resource-group <rg> --query "{Name:name,ProtectedItems:properties.privateEndpointStateForBackup,StorageType:properties.storageModelType}"
```

## Progressive Disclosure - Reference Files

| Topic | File |
|---|---|
| Endpoint and permission reference | [`references/api-reference.md`](./references/api-reference.md) |
