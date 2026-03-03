# Intune / Device Management Administration

This reference covers Microsoft Intune device management via the Microsoft Graph API (`/deviceManagement` namespace).

## Required Scopes

| Operation | Scope |
|---|---|
| Read managed devices | `DeviceManagementManagedDevices.Read.All` |
| Device actions (wipe, retire, sync) | `DeviceManagementManagedDevices.ReadWrite.All` |
| Compliance policies | `DeviceManagementConfiguration.ReadWrite.All` |
| Configuration profiles | `DeviceManagementConfiguration.ReadWrite.All` |
| Apps | `DeviceManagementApps.ReadWrite.All` |
| Enrollment | `DeviceManagementServiceConfig.ReadWrite.All` |

## Managed Devices

### List Devices

```
GET https://graph.microsoft.com/v1.0/deviceManagement/managedDevices
```

Useful OData filters:

```
# Windows devices only
?$filter=operatingSystem eq 'Windows'

# Non-compliant devices
?$filter=complianceState eq 'noncompliant'

# Corporate-owned devices
?$filter=managedDeviceOwnerType eq 'company'

# Devices not checked in for 30+ days
?$filter=lastSyncDateTime le 2024-01-01T00:00:00Z

# Specific user's devices
?$filter=userPrincipalName eq 'user@contoso.com'
```

Select specific fields for reporting:

```
?$select=id,deviceName,operatingSystem,osVersion,complianceState,lastSyncDateTime,userPrincipalName,managedDeviceOwnerType,enrolledDateTime
```

### Get Single Device

```
GET https://graph.microsoft.com/v1.0/deviceManagement/managedDevices/{deviceId}
```

### Device Actions

All actions use POST to the device resource:

```
# Sync device (trigger MDM check-in)
POST https://graph.microsoft.com/v1.0/deviceManagement/managedDevices/{deviceId}/syncDevice

# Remote lock (requires PIN reset on unlock for Android/iOS)
POST https://graph.microsoft.com/v1.0/deviceManagement/managedDevices/{deviceId}/remoteLock

# Reboot device (Windows only)
POST https://graph.microsoft.com/v1.0/deviceManagement/managedDevices/{deviceId}/rebootNow

# Retire (remove MDM management, leaves personal data)
POST https://graph.microsoft.com/v1.0/deviceManagement/managedDevices/{deviceId}/retire

# Wipe (factory reset — complete data wipe)
POST https://graph.microsoft.com/v1.0/deviceManagement/managedDevices/{deviceId}/wipe
Content-Type: application/json

{
  "keepEnrollmentData": false,
  "keepUserData": false
}

# Windows: Reset passcode
POST https://graph.microsoft.com/v1.0/deviceManagement/managedDevices/{deviceId}/resetPasscode

# Collect diagnostics logs (Windows 10/11)
POST https://graph.microsoft.com/v1.0/deviceManagement/managedDevices/{deviceId}/createDeviceLogCollectionRequest
Content-Type: application/json

{
  "templateType": "predefined"
}
```

**Safety notes:**
- `wipe` is irreversible — always confirm intent before executing
- `retire` removes corporate data but leaves personal data on BYOD devices
- `remoteLock` on Windows requires a BitLocker PIN reset

## Compliance Policies

### List Compliance Policies

```
GET https://graph.microsoft.com/v1.0/deviceManagement/deviceCompliancePolicies
```

### Get Policy with Assignments

```
GET https://graph.microsoft.com/v1.0/deviceManagement/deviceCompliancePolicies/{policyId}?$expand=assignments
```

### Create Windows 10 Compliance Policy

```
POST https://graph.microsoft.com/v1.0/deviceManagement/deviceCompliancePolicies
Content-Type: application/json

{
  "@odata.type": "#microsoft.graph.windows10CompliancePolicy",
  "displayName": "Windows 10 Baseline Compliance",
  "description": "Requires BitLocker, secure boot, and minimum OS version",
  "bitLockerEnabled": true,
  "secureBootEnabled": true,
  "codeIntegrityEnabled": true,
  "osMinimumVersion": "10.0.19041",
  "passwordRequired": true,
  "passwordMinimumLength": 8,
  "passwordRequiredType": "alphanumeric"
}
```

### Assign Compliance Policy to Group

```
POST https://graph.microsoft.com/v1.0/deviceManagement/deviceCompliancePolicies/{policyId}/assign
Content-Type: application/json

{
  "assignments": [
    {
      "target": {
        "@odata.type": "#microsoft.graph.groupAssignmentTarget",
        "groupId": "group-object-id"
      }
    }
  ]
}
```

### List Non-Compliant Devices for a Policy

```
GET https://graph.microsoft.com/v1.0/deviceManagement/deviceCompliancePolicies/{policyId}/deviceStatuses?$filter=status eq 'nonCompliant'
```

## Configuration Profiles

### List Configuration Profiles

```
GET https://graph.microsoft.com/v1.0/deviceManagement/deviceConfigurations
```

### Create Windows Configuration Profile (example: disable USB)

```
POST https://graph.microsoft.com/v1.0/deviceManagement/deviceConfigurations
Content-Type: application/json

{
  "@odata.type": "#microsoft.graph.windows10GeneralConfiguration",
  "displayName": "Disable USB Storage",
  "usbBlocked": true
}
```

## Mobile Apps

### List Apps

```
GET https://graph.microsoft.com/v1.0/deviceManagement/mobileApps?$filter=isAssigned eq true
```

### Get App with Assignments

```
GET https://graph.microsoft.com/v1.0/deviceManagement/mobileApps/{appId}?$expand=assignments
```

### Assign App to Group

```
POST https://graph.microsoft.com/v1.0/deviceManagement/mobileApps/{appId}/assign
Content-Type: application/json

{
  "mobileAppAssignments": [
    {
      "intent": "required",
      "target": {
        "@odata.type": "#microsoft.graph.groupAssignmentTarget",
        "groupId": "group-object-id"
      }
    }
  ]
}
```

Intents: `required` (force install), `available` (user-initiated), `uninstall`.

## Enrollment Configurations

### List Enrollment Configurations

```
GET https://graph.microsoft.com/v1.0/deviceManagement/deviceEnrollmentConfigurations
```

Includes Windows Autopilot profile assignments, enrollment restrictions, etc.

## Windows Autopilot

### List Autopilot Devices

```
GET https://graph.microsoft.com/v1.0/deviceManagement/windowsAutopilotDeviceIdentities
```

### Get Autopilot Deployment Profile

```
GET https://graph.microsoft.com/v1.0/deviceManagement/windowsAutopilotDeploymentProfiles
```

## Device Categories

```
GET https://graph.microsoft.com/v1.0/deviceManagement/deviceCategories
```

Assign a device to a category (used for dynamic group rules):

```
PATCH https://graph.microsoft.com/v1.0/deviceManagement/managedDevices/{deviceId}
Content-Type: application/json

{
  "deviceCategoryDisplayName": "Corporate Laptops"
}
```

## Reporting Patterns

### Non-Compliant Devices Report

```typescript
// Get all non-compliant Windows devices with user info
const devices = await graphClient
  .api("/deviceManagement/managedDevices")
  .filter("complianceState eq 'noncompliant' and operatingSystem eq 'Windows'")
  .select("deviceName,userPrincipalName,complianceState,lastSyncDateTime,osVersion")
  .get();
```

### Stale Device Report (no check-in for N days)

```typescript
const cutoff = new Date();
cutoff.setDate(cutoff.getDate() - 30);
const isoDate = cutoff.toISOString();

const stale = await graphClient
  .api("/deviceManagement/managedDevices")
  .filter(`lastSyncDateTime le ${isoDate}`)
  .select("deviceName,userPrincipalName,lastSyncDateTime,managedDeviceOwnerType")
  .orderby("lastSyncDateTime")
  .get();
```

## Windows Update for Business — Deployment Rings

Windows Update for Business (WUfB) deployment rings are managed as `windowsUpdateForBusinessConfiguration` resources under `deviceConfigurations`. Each ring is a configuration profile that controls update deferral, branch readiness, and pause settings.

### List All Update Rings

```
GET https://graph.microsoft.com/v1.0/deviceManagement/deviceConfigurations?$filter=isof('microsoft.graph.windowsUpdateForBusinessConfiguration')
```

### Create a Deployment Ring (e.g., "Pilot Ring")

```
POST https://graph.microsoft.com/v1.0/deviceManagement/deviceConfigurations
Content-Type: application/json

{
  "@odata.type": "#microsoft.graph.windowsUpdateForBusinessConfiguration",
  "displayName": "WUfB - Pilot Ring",
  "description": "First ring: receives updates 0 days after release",
  "businessReadyUpdatesOnly": "businessReadyOnly",
  "automaticUpdateMode": "autoInstallAndRebootAtMaintenanceTime",
  "microsoftUpdateServiceAllowed": true,
  "driversExcluded": false,
  "qualityUpdatesDeferralPeriodInDays": 0,
  "featureUpdatesDeferralPeriodInDays": 0,
  "deadlineForQualityUpdatesInDays": 2,
  "deadlineForFeatureUpdatesInDays": 7,
  "deadlineGracePeriodInDays": 2,
  "allowWindows11Upgrade": false,
  "updateNotificationLevel": "defaultNotifications",
  "userPauseAccess": "disabled"
}
```

### Create a "Broad Ring" with Deferrals

```
POST https://graph.microsoft.com/v1.0/deviceManagement/deviceConfigurations
Content-Type: application/json

{
  "@odata.type": "#microsoft.graph.windowsUpdateForBusinessConfiguration",
  "displayName": "WUfB - Broad Ring",
  "description": "Production ring: quality updates deferred 14 days, feature updates deferred 30 days",
  "businessReadyUpdatesOnly": "businessReadyOnly",
  "automaticUpdateMode": "autoInstallAndRebootAtMaintenanceTime",
  "qualityUpdatesDeferralPeriodInDays": 14,
  "featureUpdatesDeferralPeriodInDays": 30,
  "deadlineForQualityUpdatesInDays": 5,
  "deadlineForFeatureUpdatesInDays": 14,
  "deadlineGracePeriodInDays": 3,
  "allowWindows11Upgrade": false
}
```

### Assign a Ring to a Group

```
POST https://graph.microsoft.com/v1.0/deviceManagement/deviceConfigurations/{ringId}/assign
Content-Type: application/json

{
  "assignments": [
    {
      "target": {
        "@odata.type": "#microsoft.graph.groupAssignmentTarget",
        "groupId": "pilot-group-object-id"
      }
    }
  ]
}
```

### Pause Quality Updates for a Ring

```
PATCH https://graph.microsoft.com/v1.0/deviceManagement/deviceConfigurations/{ringId}
Content-Type: application/json

{
  "@odata.type": "#microsoft.graph.windowsUpdateForBusinessConfiguration",
  "qualityUpdatesPaused": true
}
```

Pausing lasts up to 35 days. The `qualityUpdatesPauseExpiryDateTime` property (read-only) shows when the pause expires automatically.

### Key Property Reference

| Property | Description | Valid Range |
|---|---|---|
| `qualityUpdatesDeferralPeriodInDays` | Days to defer quality (security) updates | 0–30 |
| `featureUpdatesDeferralPeriodInDays` | Days to defer feature updates | 0–30 |
| `deadlineForQualityUpdatesInDays` | Days before quality updates auto-install | 0–30 |
| `deadlineForFeatureUpdatesInDays` | Days before feature updates auto-install | 0–30 |
| `deadlineGracePeriodInDays` | Grace period after deadline before forced restart | 0–7 |
| `featureUpdatesRollbackWindowInDays` | Days within which feature update rollback is valid | 2–60 |
| `businessReadyUpdatesOnly` | Branch: `businessReadyOnly` (GA), `all` (Insider) | — |

## Endpoint Security Policies

Endpoint security policies are purpose-built security profiles (antivirus, firewall, attack surface reduction) managed via the `/beta` endpoint at `deviceManagement/intents`. They differ from regular configuration profiles in that they are template-based.

### List Endpoint Security Intents (Policies)

```
GET https://graph.microsoft.com/beta/deviceManagement/intents
```

### List Available Security Templates

```
GET https://graph.microsoft.com/beta/deviceManagement/templates?$filter=templateType eq 'endpointSecurityAntivirus'
```

Common `templateType` values:
- `endpointSecurityAntivirus` — Microsoft Defender Antivirus settings
- `endpointSecurityDiskEncryption` — BitLocker / FileVault
- `endpointSecurityFirewall` — Windows Firewall rules
- `endpointSecurityEndpointDetectionAndResponse` — Defender for Endpoint (EDR) onboarding
- `endpointSecurityAttackSurfaceReduction` — ASR rules, exploit protection

### Create an Antivirus Policy from a Template

First, retrieve the template ID:

```
GET https://graph.microsoft.com/beta/deviceManagement/templates?$filter=displayName eq 'Microsoft Defender Antivirus'&$select=id,displayName,templateType
```

Then create an intent (policy instance) from the template:

```
POST https://graph.microsoft.com/beta/deviceManagement/templates/{templateId}/createInstance
Content-Type: application/json

{
  "displayName": "Defender AV - Baseline",
  "description": "Baseline antivirus settings for all Windows devices",
  "settingsDelta": [
    {
      "@odata.type": "#microsoft.graph.deviceManagementStringSetting",
      "definitionId": "deviceConfiguration--windows10EndpointProtectionConfiguration_defenderCloudBlockLevel",
      "value": "high"
    },
    {
      "@odata.type": "#microsoft.graph.deviceManagementBooleanSetting",
      "definitionId": "deviceConfiguration--windows10EndpointProtectionConfiguration_defenderCloudExtendedTimeoutInSeconds",
      "value": true
    }
  ]
}
```

### List Settings for an Existing Security Policy

```
GET https://graph.microsoft.com/beta/deviceManagement/intents/{intentId}/settings
```

### Update a Setting Within an Endpoint Security Policy

```
POST https://graph.microsoft.com/beta/deviceManagement/intents/{intentId}/updateSettings
Content-Type: application/json

{
  "settings": [
    {
      "@odata.type": "#microsoft.graph.deviceManagementBooleanSetting",
      "id": "setting-definition-id",
      "value": true
    }
  ]
}
```

### Assign an Endpoint Security Policy to a Group

```
POST https://graph.microsoft.com/beta/deviceManagement/intents/{intentId}/assign
Content-Type: application/json

{
  "assignments": [
    {
      "target": {
        "@odata.type": "#microsoft.graph.groupAssignmentTarget",
        "groupId": "group-object-id"
      }
    }
  ]
}
```

**Note**: Endpoint security policies created in the Intune portal use the Settings Catalog in newer tenants (v2 policy model), accessible at `deviceManagement/configurationPolicies`. The `/intents` endpoint is the older model. Both remain active.

## PowerShell Script Deployment via Intune

Intune can deploy PowerShell scripts to Windows devices via the `deviceManagementScripts` resource (beta API only).

### List Deployed Scripts

```
GET https://graph.microsoft.com/beta/deviceManagement/deviceManagementScripts
```

### Upload and Deploy a PowerShell Script

The script content must be base64-encoded:

```
POST https://graph.microsoft.com/beta/deviceManagement/deviceManagementScripts
Content-Type: application/json

{
  "displayName": "Configure WinRM for Remote Management",
  "description": "Enables WinRM HTTPS listener with a self-signed certificate",
  "scriptContent": "RW5hYmxlLVBTUmVtb3RpbmcgLUZvcmNl",
  "runAsAccount": "system",
  "enforceSignatureCheck": true,
  "fileName": "configure-winrm.ps1",
  "runAs32Bit": false
}
```

`runAsAccount` values: `"user"` (runs as logged-in user) or `"system"` (runs as SYSTEM account).

`scriptContent` is the base64-encoded `.ps1` file content. Example encoding in PowerShell:

```powershell
$scriptPath = ".\configure-winrm.ps1"
$encoded = [Convert]::ToBase64String([System.IO.File]::ReadAllBytes($scriptPath))
```

### Assign a Script to a Group

```
POST https://graph.microsoft.com/beta/deviceManagement/deviceManagementScripts/{scriptId}/assign
Content-Type: application/json

{
  "deviceManagementScriptAssignments": [
    {
      "target": {
        "@odata.type": "#microsoft.graph.groupAssignmentTarget",
        "groupId": "group-object-id"
      }
    }
  ]
}
```

### Get Script Run Status per Device

```
GET https://graph.microsoft.com/beta/deviceManagement/deviceManagementScripts/{scriptId}/deviceRunStates
```

Response includes `runState` (`success`, `fail`, `pending`, `notApplicable`), `resultMessage`, `lastStateUpdateDateTime`, and `managedDevice` details.

### Key Constraints

- Scripts are limited to **1 MB** in size when encoded
- Execution timeout is **30 minutes** per script
- Scripts run at the next Intune check-in after assignment (typically within 8 hours)
- `enforceSignatureCheck: true` requires the script to be signed with a trusted certificate on the device
- Scripts do not support parameters — embed all configuration within the script body
- Output and error streams are captured and visible in `resultMessage` (up to 2048 characters)

## Intune RBAC — Built-in Roles

Intune has its own RBAC system separate from Entra ID roles. Role definitions are at `/deviceManagement/roleDefinitions`.

### List All Role Definitions (Built-in and Custom)

```
GET https://graph.microsoft.com/v1.0/deviceManagement/roleDefinitions
```

Filter to show only built-in roles:

```
GET https://graph.microsoft.com/v1.0/deviceManagement/roleDefinitions?$filter=isBuiltIn eq true
```

### Get a Specific Role Definition

```
GET https://graph.microsoft.com/v1.0/deviceManagement/roleDefinitions/{roleDefinitionId}
```

### Built-in Intune Role Reference

| Role Name | Typical Scope | Key Permissions |
|---|---|---|
| Intune Service Administrator | Full Intune admin | All read/write permissions |
| Policy and Profile Manager | Configuration profiles, compliance policies | Read/write device configs, read devices |
| Application Manager | Mobile apps, app protection policies | CRUD on apps and app assignments |
| Endpoint Security Manager | Security policies, antivirus, firewall, BitLocker | Manage endpoint security policies |
| Read Only Operator | Reporting and monitoring | Read all Intune resources, no write |
| Help Desk Operator | Device actions for support | Remote lock, retire, wipe, sync; read devices and users |
| School Administrator | Intune for Education tenant | Manage classroom devices and apps |

### List Role Assignments

```
GET https://graph.microsoft.com/v1.0/deviceManagement/roleAssignments
```

### Create a Role Assignment (Scoping a Role to a Scope Group)

```
POST https://graph.microsoft.com/v1.0/deviceManagement/roleAssignments
Content-Type: application/json

{
  "displayName": "Policy Manager - EMEA Devices",
  "description": "Policy and Profile Manager scoped to EMEA device group",
  "members": [
    "admin-user-object-id"
  ],
  "scopeMembers": [
    "emea-device-group-object-id"
  ],
  "roleDefinition@odata.bind": "https://graph.microsoft.com/v1.0/deviceManagement/roleDefinitions/{roleDefinitionId}"
}
```

`members` are the users/groups who receive the role. `scopeMembers` are the groups of devices/users they can manage.

### Create a Custom Role

```
POST https://graph.microsoft.com/v1.0/deviceManagement/roleDefinitions
Content-Type: application/json

{
  "displayName": "Compliance Auditor",
  "description": "Read-only access to compliance policies and device compliance state",
  "isBuiltIn": false,
  "rolePermissions": [
    {
      "resourceActions": [
        {
          "allowedResourceActions": [
            "Microsoft.Intune/DeviceCompliancePolicies/Read",
            "Microsoft.Intune/ManagedDevices/Read"
          ],
          "notAllowedResourceActions": []
        }
      ]
    }
  ]
}
```

## Common Error Codes and Throttling

### DeviceManagement API Throttling Limits

| Endpoint | Limit | Window |
|---|---|---|
| General `deviceManagement` endpoints | 200 requests | 20 seconds per app per tenant |
| Device action endpoints (wipe, retire, sync) | 25 requests | 20 seconds per app per tenant |
| Bulk operations (batch requests) | 20 requests per batch | — |

When throttled, the API returns `429 Too Many Requests` with a `Retry-After` header indicating the number of seconds to wait.

### Common Error Codes

| HTTP Status | Error Code | Cause | Resolution |
|---|---|---|---|
| `400 Bad Request` | `BadRequest` | Invalid OData query, malformed filter, or unsupported property for `$filter` | Use `$filter` only on indexed properties; check the resource docs for filterable properties |
| `403 Forbidden` | `Forbidden` | Missing Intune license on the tenant, or missing Graph permission scope | Ensure the tenant has an active Intune license; confirm `DeviceManagementConfiguration.ReadWrite.All` is consented |
| `404 Not Found` | `ResourceNotFound` | Device ID, policy ID, or script ID does not exist | Verify the resource exists; IDs are GUIDs — check for copy-paste errors |
| `409 Conflict` | `Conflict` | Duplicate display name on a configuration profile or compliance policy | Use a unique `displayName` for each resource |
| `422 Unprocessable Entity` | `UnprocessableEntity` | The device action is not supported for the device platform (e.g., `resetPasscode` on a Windows device) | Check platform-specific action support in the device management docs |
| `429 Too Many Requests` | `TooManyRequests` | API throttling limit exceeded | Implement exponential backoff; use batch requests to reduce call count; cache device list queries |
| `500 Internal Server Error` | — | Transient service error | Retry with exponential backoff up to 3 times before escalating |

### Recommended Throttling Handling Pattern

```typescript
async function callWithRetry(fn: () => Promise<any>, maxRetries = 3): Promise<any> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (error.statusCode === 429) {
        const retryAfter = parseInt(error.headers?.["retry-after"] ?? "5", 10);
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
      } else {
        throw error;
      }
    }
  }
  throw new Error("Max retries exceeded");
}
```
