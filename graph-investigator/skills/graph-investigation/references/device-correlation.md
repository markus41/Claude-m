# Device Correlation Reference

Multi-source device inventory and correlation methodology for Microsoft 365 user investigations. Covers Entra ID registered devices, Intune managed devices, sign-in log device details, and Defender for Endpoint correlation.

---

## 1. Device Sources Overview

Three primary device data sources must be correlated to build a complete picture of devices associated with an investigated user. Each source captures different properties and has different coverage.

### Source 1: Entra ID Registered and Joined Devices

**Endpoints**: `GET /users/{id}/registeredDevices`, `GET /users/{id}/ownedDevices`

**Coverage**: All devices that have been registered with Azure Active Directory — personal devices registered via BYOD (Registered), corporate devices domain-joined (Hybrid Joined), or Entra-joined (Azure AD Joined).

**Key Properties**:
- `displayName`: Device hostname
- `deviceId`: Entra device ID — **primary correlation key** with Intune and sign-in logs
- `operatingSystem`: Windows, iOS, Android, macOS
- `operatingSystemVersion`: OS build version
- `trustType`: `Workplace` (registered), `AzureAD` (joined), `ServerAd` (hybrid)
- `approximateLastSignInDateTime`: Last sign-in via this device
- `isManaged`: Whether device is managed (Intune or other MDM)
- `isCompliant`: Whether device meets compliance policies
- `registrationDateTime`: When device was registered to Entra

### Source 2: Intune Managed Devices

**Endpoint**: `GET /deviceManagement/managedDevices?$filter=userPrincipalName eq '{upn}'`

**Coverage**: Devices enrolled in Microsoft Intune MDM. This includes corporate-owned and BYOD devices enrolled via Company Portal or AutoPilot.

**Key Properties**:
- `deviceName`: Device hostname
- `azureADDeviceId`: **Correlation key** — matches Entra `deviceId` and sign-in log `deviceDetail.deviceId`
- `operatingSystem`: Full OS name
- `osVersion`: Detailed OS version
- `complianceState`: Current compliance state (compliant, noncompliant, unknown, etc.)
- `lastSyncDateTime`: Last Intune check-in — divergence from last sign-in indicates stale policy
- `enrolledDateTime`: When device was enrolled in Intune
- `serialNumber`: Hardware serial number for physical identification
- `manufacturer` / `model`: Hardware vendor and model
- `managedDeviceOwnerType`: `company` or `personal`
- `totalStorageSpaceInBytes` / `freeStorageSpaceInBytes`: Storage capacity

### Source 3: Sign-In Log Device Details

**Embedded in**: `deviceDetail` property of each sign-in event in `GET /auditLogs/signIns`

**Coverage**: Browser/OS fingerprint extracted from HTTP user-agent string at time of sign-in. Populated for EVERY sign-in, including from unmanaged devices.

**Key Properties**:
- `deviceId`: AAD Device ID (if device is registered/joined — blank for unmanaged)
- `displayName`: Device name as known to AAD
- `operatingSystem`: OS name from user-agent
- `browser`: Browser name and version
- `isCompliant`: Compliance state at time of sign-in (from CA policy evaluation)
- `isManaged`: Whether Intune or co-managed
- `trustType`: `AzureAD`, `Hybrid`, `Workplace`, or blank (unmanaged)

**Limitation**: For unmanaged devices, `deviceId` is absent or `00000000-0000-0000-0000-000000000000` and `isManaged = false`.

---

## 2. Complete Device Inventory Workflow

Run all three queries for a comprehensive device picture. Then correlate using `azureADDeviceId` as the join key.

```bash
# Step 1: Entra ID registered devices
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/users/{userId}/registeredDevices?\$select=id,displayName,deviceId,operatingSystem,operatingSystemVersion,trustType,approximateLastSignInDateTime,isManaged,isCompliant,registrationDateTime,accountEnabled" \
  --output json

# Step 2: Entra ID owned devices (may overlap with registered — check both)
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/users/{userId}/ownedDevices?\$select=id,displayName,deviceId,operatingSystem,operatingSystemVersion,trustType,approximateLastSignInDateTime,isManaged,isCompliant,registrationDateTime" \
  --output json

# Step 3: Intune managed devices
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/deviceManagement/managedDevices?\$filter=userPrincipalName eq '{upn}'&\$select=id,deviceName,operatingSystem,osVersion,complianceState,lastSyncDateTime,enrolledDateTime,serialNumber,manufacturer,model,azureADDeviceId,userPrincipalName,managedDeviceOwnerType,deviceEnrollmentType,totalStorageSpaceInBytes,freeStorageSpaceInBytes,isEncrypted,isSupervised,partnerReportedThreatState" \
  --output json

# Step 4: Extract unique device profiles from recent sign-in logs
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/auditLogs/signIns?\$filter=userPrincipalName eq '{upn}' and createdDateTime ge {startDate}T00:00:00Z&\$select=deviceDetail,createdDateTime,ipAddress,location,isInteractive&\$top=500&\$orderby=createdDateTime desc" \
  --output json
```

---

## 3. Compliance Status Mapping

| Intune Compliance State | Meaning | Investigation Significance |
|---|---|---|
| `compliant` | All assigned compliance policies pass | Normal — device meets security requirements |
| `noncompliant` | Fails one or more compliance policies | HIGH RISK — may have CA bypass; investigate which policies fail |
| `inGracePeriod` | Grace period active before marked noncompliant | Check expiry; monitor if sign-ins succeed |
| `configManager` | Co-managed via System Center Configuration Manager | Verify CM reports compliance separately |
| `unknown` | Device enrolled but not yet evaluated | New enrollment or sync issue — not necessarily risky |
| `notApplicable` | No compliance policy assigned to this device | Check why — may be a gap in policy coverage |
| `conflict` | Conflicting compliance policies | Check policy assignments for device |

### Conditional Access Compliance Evaluation

The sign-in log's `deviceDetail.isCompliant` reflects the compliance state **at the time of sign-in**, as evaluated by the CA engine. This may differ from Intune's current `complianceState` if Intune hasn't synced recently.

Divergence indicator: `deviceDetail.isCompliant = false` in sign-in log while Intune shows `compliant` → CA is seeing stale data. This can allow policy bypass if the CA policy relies on Intune compliance.

---

## 4. Device-to-Sign-In Correlation

### Correlation Key Mapping

```
Intune managedDevice.azureADDeviceId
    = Entra ID device.deviceId
    = Sign-in log signIn.deviceDetail.deviceId
```

### Step-by-Step Correlation

```bash
# Step 1: Get all Intune devices with their azureADDeviceId
INTUNE_DEVICES=$(az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/deviceManagement/managedDevices?\$filter=userPrincipalName eq '{upn}'&\$select=deviceName,azureADDeviceId,complianceState,lastSyncDateTime,osVersion" \
  --output json)

# Step 2: For each azureADDeviceId, find matching sign-ins
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/auditLogs/signIns?\$filter=userPrincipalName eq '{upn}' and deviceDetail/deviceId eq '{azureADDeviceId}'&\$select=createdDateTime,ipAddress,location,deviceDetail,status&\$top=50&\$orderby=createdDateTime desc" \
  --output json
```

### Sync Staleness Check

Compare `lastSyncDateTime` (Intune) to the most recent sign-in from that device (sign-in logs). A gap > 7 days suggests the device hasn't checked in with Intune, meaning compliance policies may not be current.

```bash
# Get device's Intune last sync
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/deviceManagement/managedDevices/{intuneDeviceId}?\$select=deviceName,lastSyncDateTime,complianceState" \
  --output json

# Compare to last sign-in from that device (using azureADDeviceId)
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/auditLogs/signIns?\$filter=deviceDetail/deviceId eq '{azureADDeviceId}'&\$top=1&\$orderby=createdDateTime desc&\$select=createdDateTime,deviceDetail" \
  --output json
```

---

## 5. Defender for Endpoint Device Timeline

If Microsoft Defender for Endpoint (MDE) is deployed, it provides the richest device-level telemetry including process execution, network connections, file operations, and registry changes.

### MDE Authentication

MDE uses a separate API endpoint from Graph. Acquire a token for `https://api.securitycenter.microsoft.com`.

```bash
# Get MDE token via device code or service principal
az rest --method POST \
  --uri "https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/token" \
  --headers "Content-Type=application/x-www-form-urlencoded" \
  --body "grant_type=client_credentials&client_id={appId}&client_secret={secret}&scope=https://api.securitycenter.microsoft.com/.default"
```

### Find MDE Machines for User

```bash
# List MDE-onboarded machines associated with this user's UPN
az rest --method GET \
  --uri "https://api.securitycenter.microsoft.com/api/machines?\$filter=lastLoggedInUser/upn eq '{upn}'" \
  --headers "Authorization=Bearer {mdeToken}" \
  --output json
```

### Device Timeline in MDE

```bash
# Get device timeline for investigation period
az rest --method GET \
  --uri "https://api.securitycenter.microsoft.com/api/machines/{mdeDeviceId}/timeline?\$filter=Timestamp gt {startDate}T00:00:00Z and Timestamp lt {endDate}T23:59:59Z" \
  --headers "Authorization=Bearer {mdeToken}" \
  --output json
```

### MDE Timeline Event Types for Investigation

| Event Type | Category | Investigative Value |
|---|---|---|
| ProcessCreated | Process | App execution — detect data staging tools (7-zip, WinRAR, xcopy) |
| FileCreated | File | Large file creation — archive staging |
| FileDeleted | File | Evidence destruction |
| NetworkConnectionEvents | Network | Data exfiltration — outbound connections |
| PrintJobEvents | Print | Physical document exfiltration |
| RemovableStorageRead | USB | USB data transfer |
| RemovableStorageWrite | USB | Data copied to removable media |
| RegistryValueSet | Registry | Persistence mechanisms |
| LogonEvents | Auth | Interactive logons on the device |

### MDE Threat Detection

```bash
# Check if device has active alerts
az rest --method GET \
  --uri "https://api.securitycenter.microsoft.com/api/machines/{mdeDeviceId}/alerts" \
  --headers "Authorization=Bearer {mdeToken}" \
  --output json
```

---

## 6. Unmanaged Device Detection

Unmanaged devices are a major risk vector — they are not enrolled in Intune, have no compliance policies enforced, and may bypass Conditional Access if CA is misconfigured.

### Detection Criteria

| Indicator | How to Detect | Risk |
|---|---|---|
| `deviceDetail.isManaged = false` | Sign-in log | Device has no MDM enrollment |
| `deviceDetail.trustType` absent or `"none"` | Sign-in log | Device not registered to Entra |
| `deviceDetail.deviceId` = `00000000-0000-0000-0000-000000000000` or absent | Sign-in log | Device has no AAD device object |
| OS/browser combination not in Intune inventory | Cross-reference | Different device than enrolled devices |
| IP geolocation mismatch | Sign-in vs device home region | Access from unusual location on personal device |
| `deviceDetail.isCompliant = false` in sign-in log | Sign-in log | CA policy saw non-compliant device |

### Investigation Query for Unmanaged Sign-Ins

```bash
# Find all sign-ins from unmanaged devices for the user
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/auditLogs/signIns?\$filter=userPrincipalName eq '{upn}' and deviceDetail/isManaged eq false and createdDateTime ge {startDate}T00:00:00Z&\$select=createdDateTime,ipAddress,location,deviceDetail,appDisplayName,status&\$orderby=createdDateTime desc&\$top=200" \
  --output json
```

### Detect Sign-Ins from OS Not in Device Inventory

1. Pull all Intune device OS types for the user: `[Windows 10, iOS]`
2. Extract unique OS values from sign-in log `deviceDetail.operatingSystem`
3. Flag any OS in sign-in log not represented in Intune inventory

Example: Intune shows Windows 10 and iOS devices, but sign-in log shows `Android` → unmanaged Android device accessed corporate resources.

---

## 7. Device Timeline Table

Standard output format for device inventory findings in an investigation report.

```markdown
## Device Inventory — user@contoso.com
**Generated**: {timestamp}

### Enrolled Devices (Intune + Entra)

| Device Name | Source | OS | Compliance | Last Sync | Last Sign-In | Owner Type | Serial | MDE Status |
|---|---|---|---|---|---|---|---|---|
| CORP-LAPTOP-01 | Intune + Entra | Windows 11 22H2 | Compliant | 2024-01-14 | 2024-01-15 14:32 | Company | SN12345 | Onboarded |
| iPhone-John | Intune + Entra | iOS 17.2 | Compliant | 2024-01-14 | 2024-01-14 09:15 | Personal | IMEI:xxx | N/A |
| MacBook-Personal | Entra only | macOS 14.2 | Unknown | N/A | 2024-01-12 11:30 | Personal | N/A | N/A |

### Sign-In Devices NOT in Inventory (Unmanaged)

| OS | Browser | IP Address | Location | First Seen | Last Seen | Sign-In Count | Risk |
|---|---|---|---|---|---|---|---|
| Windows 10 | Chrome 120 | 203.0.113.42 | Berlin, DE | 2024-01-15 14:32 | 2024-01-16 02:14 | 2 | HIGH — unmanaged, new geography |
| Android | Android Browser | 198.51.100.7 | Singapore | 2024-01-08 03:45 | 2024-01-08 03:45 | 1 | HIGH — unmanaged, off-hours |

### Key Findings
- 2 sign-ins from unmanaged Windows 10 device from Berlin — NOT in Intune or Entra device inventory
- Berlin device used during both the data exfiltration window (14:32) and evidence destruction window (02:14)
- All enrolled devices remain in compliant state — compromise occurred via unmanaged device
```

---

## 8. Device Compliance Deep Dive

For non-compliant or unknown compliance state devices, investigate which policies are failing.

```bash
# Get all compliance policy states for a specific Intune device
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/deviceManagement/managedDevices/{intuneDeviceId}/deviceCompliancePolicyStates?\$select=id,displayName,state,version,platformType" \
  --output json
```

```bash
# Get the specific settings that are non-compliant
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/deviceManagement/managedDevices/{intuneDeviceId}/deviceCompliancePolicyStates/{policyStateId}/settingStates?\$select=setting,state,errorCode,errorDescription" \
  --output json
```

### Common Non-Compliance Causes and Risk

| Policy Setting | Non-Compliance Cause | Security Risk |
|---|---|---|
| `BitLocker` | BitLocker not enabled | Data at rest unencrypted |
| `osMinimumVersion` | OS too old | Known CVEs unpatched |
| `passwordRequired` | No device PIN/password | Physical access risk |
| `deviceThreatProtectionRequiredSecurityLevel` | AV/EDR issue | Malware risk |
| `storageRequireEncryption` | Storage not encrypted | Data exfiltration risk |
| `activeFirewall` | Firewall disabled | Network exposure |
| `antivirusRequired` | AV not installed/running | Malware risk |
