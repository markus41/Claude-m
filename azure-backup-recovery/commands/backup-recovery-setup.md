---
name: backup-recovery-setup
description: Execute the backup recovery setup workflow with deterministic validation and redacted output.
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

# Backup Recovery Setup

Run the backup recovery setup workflow for azure-backup-recovery.

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
| Primary workflow query | GET | `/backup-recovery-setup` |
| Follow-up verification | GET | `/azure-backup-recovery/verification` |

## Azure CLI Commands

### Recovery Services Vault

```bash
# Create vault
az backup vault create --name <vault-name> --resource-group <rg> --location <region>

# Show vault details
az backup vault show --name <vault> --resource-group <rg>

# List vaults in resource group
az backup vault list --resource-group <rg> --output table

# Set vault storage redundancy
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

# Show policy details
az backup policy show --vault-name <vault> --resource-group <rg> --name <policy-name>

# Get default VM policy
az backup policy get-default-for-vm --vault-name <vault> --resource-group <rg>

# Update policy
az backup policy set --vault-name <vault> --resource-group <rg> --policy @updated-policy.json --name <policy-name>

# Delete policy
az backup policy delete --vault-name <vault> --resource-group <rg> --name <policy-name>
```

### Enable Backup Protection

```bash
# Enable VM backup
az backup protection enable-for-vm --vault-name <vault> --resource-group <rg> --vm <vm-name> --policy-name <policy-name>

# Enable SQL database backup
az backup protection enable-for-azurewl --vault-name <vault> --resource-group <rg> --policy-name <policy> --protectable-item-name <db-name> --protectable-item-type SQLDataBase --server-name <server> --workload-type MSSQL

# Enable Azure File Share backup
az backup protection enable-for-azurefileshare --vault-name <vault> --resource-group <rg> --policy-name <policy> --storage-account <sa-name> --azure-file-share <share-name>

# Register container for SQL/HANA workloads
az backup container register --vault-name <vault> --resource-group <rg> --backup-management-type AzureWorkload --workload-type SAPHANA --resource-id <vm-resource-id>
```

### Backup Containers

```bash
# List containers
az backup container list --vault-name <vault> --resource-group <rg> --backup-management-type AzureIaasVM --output table

# Show container details
az backup container show --vault-name <vault> --resource-group <rg> --name <container-name> --backup-management-type AzureIaasVM
```

### Monitoring and Diagnostics

```bash
# Create diagnostic settings for vault
az monitor diagnostic-settings create \
  --resource "/subscriptions/<sub-id>/resourceGroups/<rg>/providers/Microsoft.RecoveryServices/vaults/<vault>" \
  --name "backup-diag" \
  --workspace <workspace-id> \
  --logs '[{"categoryGroup":"allLogs","enabled":true}]' \
  --metrics '[{"category":"AllMetrics","enabled":true}]'
```

## Output

- Markdown summary with findings, actions, and unresolved risks.
- Redacted identifiers and no secret or token material.

