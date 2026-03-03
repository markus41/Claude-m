---
name: m365-intune-devices
description: Intune device management — list devices, trigger device actions (wipe/retire/sync/lock), review compliance status, and manage compliance policies.
argument-hint: "<action> [--deviceId <id>] [--filter <odata>] [--os <Windows|iOS|Android>] [--compliance <compliant|noncompliant>] [--dry-run]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
---

# Intune Device Management

Manage Intune-enrolled devices, device compliance, and take remote actions via Microsoft Graph API.

## Actions

- `list-devices` — List managed devices with optional OS/compliance filters
- `get-device` — Get full details for a specific device
- `sync-device` — Trigger an MDM check-in
- `remote-lock` — Remotely lock a device
- `reboot` — Restart a Windows device
- `retire` — Remove MDM management (preserves personal data on BYOD)
- `wipe` — Factory reset (complete data wipe — use with caution)
- `compliance-report` — Generate non-compliant device report
- `stale-devices` — Report devices with no check-in in N days
- `list-compliance-policies` — List Intune compliance policies
- `list-apps` — List managed apps and assignment status

## Workflow

1. **Validate context** — Confirm `tenantId` is set; verify required scope (`DeviceManagementManagedDevices.ReadWrite.All`)
2. **Parse arguments** — Determine action; parse device filter options
3. **Safety check for destructive actions** — For `wipe` and `retire`, display device details and require explicit confirmation from the user
4. **Execute** — Call appropriate Graph API endpoint
5. **Report** — Output markdown table with device names, status, and action results

## Key Endpoints

| Action | Method | Endpoint |
|---|---|---|
| List devices | GET | `/deviceManagement/managedDevices` |
| Get device | GET | `/deviceManagement/managedDevices/{deviceId}` |
| Sync device | POST | `/deviceManagement/managedDevices/{deviceId}/syncDevice` |
| Remote lock | POST | `/deviceManagement/managedDevices/{deviceId}/remoteLock` |
| Reboot | POST | `/deviceManagement/managedDevices/{deviceId}/rebootNow` |
| Retire | POST | `/deviceManagement/managedDevices/{deviceId}/retire` |
| Wipe | POST | `/deviceManagement/managedDevices/{deviceId}/wipe` |
| List compliance policies | GET | `/deviceManagement/deviceCompliancePolicies` |
| Device compliance status | GET | `/deviceManagement/deviceCompliancePolicies/{id}/deviceStatuses` |
| List apps | GET | `/deviceManagement/mobileApps` |

## OData Filter Examples

```
# Windows non-compliant devices
operatingSystem eq 'Windows' and complianceState eq 'noncompliant'

# Devices not checked in for 30 days (use computed cutoff date)
lastSyncDateTime le 2024-01-01T00:00:00Z

# Corporate-owned devices only
managedDeviceOwnerType eq 'company'

# Specific user's devices
userPrincipalName eq 'user@contoso.com'
```

## Safety Rules for Destructive Actions

- **`wipe`**: Always display device name, owner UPN, and OS before executing. Require the user to confirm with the device name. This is irreversible.
- **`retire`**: Display what data will be removed vs. preserved. BYOD devices: corporate data only. Corporate devices: full wipe equivalent.
- **`reboot`**: Warn that the device will restart immediately without user warning.

## Important Notes

- Wipe is irreversible — always confirm intent explicitly before executing
- Device actions are asynchronous; the device must be online to receive the command
- `syncDevice` triggers an immediate MDM check-in if the device is online
- Compliance policies require assignment to a group to take effect
- Reference: `skills/m365-admin/references/intune-admin.md`
