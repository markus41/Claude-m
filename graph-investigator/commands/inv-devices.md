---
name: inv-devices
description: Device inventory and activity for a user — Intune managed devices, Entra registered devices, compliance status, last sync
argument-hint: "<upn> [--include-defender] [--compliance-only] [--format <markdown|json>]"
allowed-tools:
  - Bash
  - Read
  - Write
---

# Graph Investigator — Device Inventory

Enumerates all devices associated with a user across Intune (managed) and Entra ID (registered). Cross-references sign-in device details to detect unmanaged devices. Surfaces compliance status, encryption, and last sync information.

## Arguments

| Argument | Description |
|---|---|
| `<upn>` | **Required.** User Principal Name to investigate |
| `--include-defender` | Fetch Microsoft Defender for Endpoint device state for each Intune device (requires WindowsDefenderATP.Read.All) |
| `--compliance-only` | Only show non-compliant and unknown-compliance devices |
| `--format <markdown\|json>` | Output format — defaults to `markdown` |

## Integration Context Check

Required scopes:
- `DeviceManagementManagedDevices.Read.All` — Intune managed device list
- `Device.Read.All` — Entra registered devices
- `AuditLog.Read.All` — sign-in device details for cross-reference
- `User.Read.All` — resolve UPN to object ID

Optional scopes:
- `WindowsDefenderATP.Read.All` — required for `--include-defender`

Run `inv-setup` to verify scope availability before proceeding. If `DeviceManagementManagedDevices.Read.All` is unavailable, only Entra registered devices will be returned.

## Step 1: Resolve User Object ID

```bash
UPN="<upn>"

USER_ID=$(az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/users/${UPN}?\$select=id" \
  --output json | jq -r '.id')
```

## Step 2: Intune Managed Devices

```bash
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/deviceManagement/managedDevices?\$filter=userPrincipalName eq '${UPN}'&\$select=id,deviceName,operatingSystem,osVersion,complianceState,lastSyncDateTime,enrolledDateTime,serialNumber,manufacturer,model,azureADDeviceId,managedDeviceOwnerType,deviceEnrollmentType,isEncrypted,isSupervisedDevice,freeStorageSpaceInBytes,totalStorageSpaceInBytes,enrolledByUser,managementAgent,managementState,activationLockBypassCode,jailBroken,easActivated,easDeviceId,easActivationDateTime,exchangeLastSuccessfulSyncDateTime,configurationManagerClientHealthState&\$orderby=lastSyncDateTime desc" \
  --output json
```

Key fields to surface:
- `complianceState` — `compliant`, `noncompliant`, `unknown`, `notApplicable`, `inGracePeriod`, `error`
- `isEncrypted` — device disk encryption status
- `jailBroken` — `Unknown` or `Yes` for iOS/Android jailbreak detection
- `lastSyncDateTime` — when device last checked in to Intune
- `managementState` — `managed`, `retirePending`, `retired`, `deletePending`, `unhealthy`, `deleteFailed`
- `freeStorageSpaceInBytes` / `totalStorageSpaceInBytes` — for storage capacity reporting

Flag devices where:
- `complianceState` is `noncompliant` or `error`
- `lastSyncDateTime` is more than 7 days ago (stale device)
- `isEncrypted` is `false`
- `jailBroken` is not `Unknown` (i.e. jailbreak detected)

## Step 3: Entra Registered Devices

```bash
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/users/${USER_ID}/registeredDevices?\$select=id,displayName,deviceId,operatingSystem,operatingSystemVersion,trustType,approximateLastSignInDateTime,isManaged,isCompliant,profileType,onPremisesSyncEnabled,onPremisesLastSyncDateTime,accountEnabled" \
  --output json
```

Key fields:
- `trustType` — `Workplace` (Entra registered), `AzureAd` (Entra joined), `ServerAd` (Hybrid Entra joined)
- `approximateLastSignInDateTime` — last device sign-in to Entra (approximately accurate)
- `isManaged` — whether the device has an Intune management profile
- `isCompliant` — Entra-side compliance state (mirrors Intune)

Cross-reference Entra devices with Intune devices using `deviceId` (Entra) matching `azureADDeviceId` (Intune). Entra devices without a matching Intune record are registered but not fully managed.

## Step 4: Cross-Reference Sign-In Device Details

Fetch recent sign-ins and extract unique device detail objects to identify devices that have authenticated but are not in the Intune or Entra inventory:

```bash
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/auditLogs/signIns?\$filter=userPrincipalName eq '${UPN}'&\$select=deviceDetail,createdDateTime,ipAddress,appDisplayName&\$top=100&\$orderby=createdDateTime desc" \
  --output json | jq '[.value[].deviceDetail] | unique_by(.deviceId)'
```

Extract: `deviceId`, `displayName`, `operatingSystem`, `browser`, `isCompliant`, `isManaged` from sign-in device details.

## Step 5: Compliance Analysis

For non-compliant Intune devices, retrieve the compliance policy state to understand which specific policy failed:

```bash
DEVICE_ID="<intune-device-id>"

az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/deviceManagement/managedDevices/${DEVICE_ID}/deviceCompliancePolicyStates?\$select=id,displayName,state,version,settingCount,platformType" \
  --output json
```

This shows which policy (e.g. "Windows 10 Baseline Compliance") is causing the non-compliant state and whether the device is in a grace period.

## Step 6: Unmanaged Device Detection

Compare device sets:
1. Devices from sign-in `deviceDetail` records
2. Entra registered devices (`registeredDevices`)
3. Intune managed devices (`managedDevices`)

A device appearing in sign-in logs but not in Entra or Intune is **unmanaged** — it authenticated with user credentials from a device the organization does not control.

```markdown
### Unmanaged Device Detection

Comparing 8 unique sign-in device IDs against 5 Entra devices and 4 Intune devices...

⚠️ 2 unmanaged devices detected (sign-in activity but no Entra/Intune record):
- Device: "UNKNOWN-MACBOOK" | OS: Mac OS X 14.2 | Browser: Chrome | Last seen: 2024-01-14
- Device: "" (no device ID reported) | OS: iOS | Browser: Mobile Safari | Last seen: 2024-01-12
```

## Step 7: Defender for Endpoint Enrichment (--include-defender)

If `--include-defender` is specified, look up each Intune device's `azureADDeviceId` in the Defender for Endpoint API:

```bash
AZURE_DEVICE_ID="<azure-ad-device-id>"

az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/deviceManagement/managedDevices?\$filter=azureADDeviceId eq '${AZURE_DEVICE_ID}'&\$select=id,deviceName" \
  --output json

# Then query MDE API (via az rest with MDE base URL)
az rest --method GET \
  --uri "https://api.securitycenter.microsoft.com/api/machines?\$filter=aadDeviceId eq '${AZURE_DEVICE_ID}'&\$select=id,computerDnsName,riskScore,exposureLevel,healthStatus,lastSeen,osPlatform,onboardingStatus" \
  --resource "https://api.securitycenter.microsoft.com" \
  --output json
```

Surface: `riskScore` (none/low/medium/high), `exposureLevel`, `healthStatus`, `onboardingStatus` (onboarded/not onboarded).

## Output Format

```markdown
## Device Inventory — jsmith@contoso.com

### Intune Managed Devices (3)

| Device Name | OS | Compliance | Encrypted | Last Sync | Enrolled | Risk |
|---|---|---|---|---|---|---|
| JSMITH-LAPTOP | Windows 11 22H2 | ✅ Compliant | ✅ Yes | 2024-01-15 | 2023-06-01 | — |
| JSMITH-IPHONE | iOS 17.2 | ⚠️ Grace Period | N/A | 2024-01-14 | 2023-09-15 | 🟡 Grace period expires Jan 20 |
| JSMITH-IPAD | iPadOS 17.1 | ❌ Non-compliant | N/A | 2024-01-08 | 2023-09-15 | 🔴 Stale (7+ days) |

### Entra Registered Devices (4)

| Display Name | Trust Type | OS | Is Managed | Is Compliant | Last Sign-In |
|---|---|---|---|---|---|
| JSMITH-LAPTOP | AzureAd (Joined) | Windows | ✅ Yes | ✅ Yes | 2024-01-15 |
| JSMITH-IPHONE | AzureAd (Joined) | iOS | ✅ Yes | ⚠️ | 2024-01-14 |
| John's MacBook | Workplace (Registered) | macOS | ❌ No | ❌ No | 2024-01-13 |
| Unknown Android | Workplace (Registered) | Android | ❌ No | Unknown | 2024-01-01 |

### Unmanaged Devices Detected from Sign-Ins (1)
| Device Name | OS | Browser | Last Sign-In |
|---|---|---|---|
| UNKNOWN-PC | Windows 10 | Firefox | 2024-01-12 |

⚠️ This device has no Entra or Intune record. Review with user or block access via Conditional Access requiring compliant/joined device.

### Compliance Summary
- 1 of 3 Intune devices: Non-compliant (JSMITH-IPAD — failed Windows encryption policy)
- 1 of 3 Intune devices: In grace period (expires 2024-01-20)
- 2 of 4 Entra devices: Not managed by Intune
```

If `--format json` is specified, emit a single JSON object with keys: `intuneDevices`, `entraDevices`, `unmanagedSignInDevices`, `complianceSummary`.
