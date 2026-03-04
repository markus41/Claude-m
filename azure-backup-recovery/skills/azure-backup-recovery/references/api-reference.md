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

## Validation Checklist

1. Confirm integration context is complete before execution.
2. Confirm required scopes or roles are granted.
3. Confirm destructive actions include explicit approval.
4. Confirm all output is redacted.
