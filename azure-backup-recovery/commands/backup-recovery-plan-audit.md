---
name: backup-recovery-plan-audit
description: Execute the backup recovery plan audit workflow with deterministic validation and redacted output.
argument-hint: "[options]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
---

# Backup Recovery Plan Audit

Run the backup recovery plan audit workflow for azure-backup-recovery.

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
| Primary workflow query | GET | `/backup-recovery-plan-audit` |
| Follow-up verification | GET | `/azure-backup-recovery/verification` |

## Azure CLI Commands

### Vault and Policy Audit

```bash
# List vaults
az backup vault list --resource-group <rg> --output table

# Show vault backup properties (check redundancy)
az backup vault backup-properties show --name <vault> --resource-group <rg>

# List all policies
az backup policy list --vault-name <vault> --resource-group <rg> --output table

# Show policy details
az backup policy show --vault-name <vault> --resource-group <rg> --name <policy-name>

# Get default VM policy
az backup policy get-default-for-vm --vault-name <vault> --resource-group <rg>
```

### Protected Items Audit

```bash
# List all protected items
az backup item list --vault-name <vault> --resource-group <rg> --output table

# List VM protected items
az backup item list --vault-name <vault> --resource-group <rg> --backup-management-type AzureIaasVM --output table

# Show protected item details
az backup item show --vault-name <vault> --resource-group <rg> --container-name <container> --name <vm-name> --backup-management-type AzureIaasVM
```

### Containers Audit

```bash
# List containers
az backup container list --vault-name <vault> --resource-group <rg> --backup-management-type AzureIaasVM --output table

# Show container details
az backup container show --vault-name <vault> --resource-group <rg> --name <container-name> --backup-management-type AzureIaasVM
```

### Azure Site Recovery Plan Audit

```bash
# List recovery plans
az rest --method GET \
  --url "https://management.azure.com/subscriptions/<sub-id>/resourceGroups/<rg>/providers/Microsoft.RecoveryServices/vaults/<vault>/replicationRecoveryPlans?api-version=2023-08-01"

# List replicated items
az rest --method GET \
  --url "https://management.azure.com/subscriptions/<sub-id>/resourceGroups/<rg>/providers/Microsoft.RecoveryServices/vaults/<vault>/replicationProtectedItems?api-version=2023-08-01" \
  --query "value[].{Name:name, Status:properties.protectionState, Health:properties.replicationHealth}"

# Create or update recovery plan
az rest --method PUT \
  --url "https://management.azure.com/subscriptions/<sub-id>/resourceGroups/<rg>/providers/Microsoft.RecoveryServices/vaults/<vault>/replicationRecoveryPlans/<plan-name>?api-version=2023-08-01" \
  --body @recovery-plan.json
```

### Job History Review

```bash
# List all backup jobs
az backup job list --vault-name <vault> --resource-group <rg> --output table

# List failed jobs
az backup job list --vault-name <vault> --resource-group <rg> --status Failed --output table

# List jobs in date range
az backup job list --vault-name <vault> --resource-group <rg> --start-date 2026-03-01 --end-date 2026-03-10 --output table
```

## Output

- Markdown summary with findings, actions, and unresolved risks.
- Redacted identifiers and no secret or token material.

