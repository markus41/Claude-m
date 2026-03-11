# Azure Backup Recovery API Reference

## Required Permissions

- `Backup Reader`
- `Site Recovery Contributor`
- `Reader`

## Workflow Entry Points

- `backup-recovery-setup`
- `backup-job-health`
- `backup-restore-drill`
- `backup-recovery-plan-audit`
- `backup-cross-region-check`

## Azure CLI Command Groups

| Command Group | Purpose |
|---|---|
| `az backup vault` | Create, list, show, delete Recovery Services vaults and manage backup properties |
| `az backup policy` | Create, list, show, update, delete backup policies |
| `az backup protection` | Enable, disable, trigger on-demand backup for VMs, SQL, File Shares |
| `az backup item` | List and show protected backup items |
| `az backup job` | List, show, wait, stop backup jobs |
| `az backup recoverypoint` | List and show available recovery points |
| `az backup restore` | Restore disks, mount/unmount files, restore file shares |
| `az backup container` | List, show, register, unregister backup containers |
| `az backup alert` | Show backup alerts |
| `az rest` | Azure Site Recovery operations (replication, failover, recovery plans) via REST API |
| `az monitor diagnostic-settings` | Configure vault diagnostics to Log Analytics |

## Key Azure Site Recovery REST Endpoints

| Operation | Method | URL Path |
|---|---|---|
| Enable replication | PUT | `.../replicationProtectedItems/<item>?api-version=2023-08-01` |
| List replicated items | GET | `.../replicationProtectedItems?api-version=2023-08-01` |
| Test failover | POST | `.../replicationProtectedItems/<item>/testFailover?api-version=2023-08-01` |
| Cleanup test failover | POST | `.../replicationProtectedItems/<item>/testFailoverCleanup?api-version=2023-08-01` |
| Planned failover | POST | `.../replicationProtectedItems/<item>/plannedFailover?api-version=2023-08-01` |
| List recovery plans | GET | `.../replicationRecoveryPlans?api-version=2023-08-01` |
| Create/update recovery plan | PUT | `.../replicationRecoveryPlans/<plan>?api-version=2023-08-01` |

Base URL pattern: `https://management.azure.com/subscriptions/<sub-id>/resourceGroups/<rg>/providers/Microsoft.RecoveryServices/vaults/<vault>/replicationFabrics/<fabric>/replicationProtectionContainers/<container>/`

## Validation Checklist

1. Confirm integration context is complete before execution.
2. Confirm required scopes or roles are granted.
3. Confirm destructive actions include explicit approval.
4. Confirm all output is redacted.
