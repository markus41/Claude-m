# Entra Access Reviews API Reference

## Required Permissions

- `AccessReview.ReadWrite.All`
- `RoleManagement.Read.All`
- `Directory.Read.All`

## Workflow Entry Points

- `access-reviews-setup`
- `access-reviews-stale-privileged`
- `access-reviews-cycle-draft`
- `access-reviews-remediation-tickets`
- `access-reviews-status-report`

## Validation Checklist

1. Confirm integration context is complete before execution.
2. Confirm required scopes or roles are granted.
3. Confirm destructive actions include explicit approval.
4. Confirm all output is redacted.
