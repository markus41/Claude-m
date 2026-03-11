---
name: backup-restore-drill
description: Execute the backup restore drill workflow with deterministic validation and redacted output.
argument-hint: "[options]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
---

# Backup Restore Drill

Run the backup restore drill workflow for azure-backup-recovery.

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
| Primary workflow query | GET | `/backup-restore-drill` |
| Follow-up verification | GET | `/azure-backup-recovery/verification` |

## Azure CLI Commands

### Trigger On-Demand Backup

```bash
# Trigger on-demand backup before drill
az backup protection backup-now --vault-name <vault> --resource-group <rg> --container-name <container> --item-name <vm-name> --backup-management-type AzureIaasVM --retain-until 2026-04-10
```

### Recovery Points

```bash
# List recovery points
az backup recoverypoint list --vault-name <vault> --resource-group <rg> --container-name <container> --item-name <vm-name> --backup-management-type AzureIaasVM --output table

# Show recovery point details
az backup recoverypoint show --vault-name <vault> --resource-group <rg> --container-name <container> --item-name <vm-name> --backup-management-type AzureIaasVM --name <rp-name>
```

### Restore Operations

```bash
# Restore VM disks to storage account
az backup restore restore-disks --vault-name <vault> --resource-group <rg> --container-name <container> --item-name <vm-name> --rp-name <rp-name> --storage-account <sa-name> --target-resource-group <target-rg>

# Restore disks to staging storage account
az backup restore restore-disks --vault-name <vault> --resource-group <rg> --container-name <container> --item-name <vm-name> --rp-name <rp-name> --storage-account <sa-name> --restore-to-staging-storage-account true --target-resource-group <target-rg>

# Mount recovery point for file-level restore
az backup restore files mount-rp --vault-name <vault> --resource-group <rg> --container-name <container> --item-name <vm-name> --rp-name <rp-name>

# Unmount recovery point after file restore
az backup restore files unmount-rp --vault-name <vault> --resource-group <rg> --container-name <container> --item-name <vm-name> --rp-name <rp-name>

# Restore file share
az backup restore restore-azurefileshare --vault-name <vault> --resource-group <rg> --container-name <container> --item-name <share-name> --rp-name <rp-name> --resolve-conflict Overwrite --restore-mode OriginalLocation
```

### Job Tracking

```bash
# List recent restore jobs
az backup job list --vault-name <vault> --resource-group <rg> --output table

# Wait for restore job completion
az backup job wait --vault-name <vault> --resource-group <rg> --name <job-id>

# Show restore job details
az backup job show --vault-name <vault> --resource-group <rg> --name <job-id>
```

## Output

- Markdown summary with findings, actions, and unresolved risks.
- Redacted identifiers and no secret or token material.

