# Microsoft Intune API Reference

## Required Permissions

- `DeviceManagementManagedDevices.ReadWrite.All`
- `DeviceManagementConfiguration.ReadWrite.All`
- `DeviceManagementApps.Read.All`

## Workflow Entry Points

- `intune-setup`
- `intune-noncompliant-devices`
- `intune-lost-device-action`
- `intune-compliance-policy-deploy`
- `intune-app-protection-review`

## Validation Checklist

1. Confirm integration context is complete before execution.
2. Confirm required scopes or roles are granted.
3. Confirm destructive actions include explicit approval.
4. Confirm all output is redacted.
