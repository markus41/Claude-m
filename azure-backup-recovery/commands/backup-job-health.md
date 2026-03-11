---
name: backup-job-health
description: Execute the backup job health workflow with deterministic validation and redacted output.
argument-hint: "[options]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
---

# Backup Job Health

Run the backup job health workflow for azure-backup-recovery.

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
| Primary workflow query | GET | `/backup-job-health` |
| Follow-up verification | GET | `/azure-backup-recovery/verification` |

## Azure CLI Commands

### Job Monitoring

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

### Protected Items Health

```bash
# List all protected items
az backup item list --vault-name <vault> --resource-group <rg> --output table

# List VM protected items
az backup item list --vault-name <vault> --resource-group <rg> --backup-management-type AzureIaasVM --output table

# Show protected item details
az backup item show --vault-name <vault> --resource-group <rg> --container-name <container> --name <vm-name> --backup-management-type AzureIaasVM
```

### Alerts and Diagnostics

```bash
# Show backup alerts
az backup alert show --vault-name <vault> --resource-group <rg>

# Show vault usage summary
az backup vault show --name <vault> --resource-group <rg> --query "{Name:name,ProtectedItems:properties.privateEndpointStateForBackup,StorageType:properties.storageModelType}"

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

