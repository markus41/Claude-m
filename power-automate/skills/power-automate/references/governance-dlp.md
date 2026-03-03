# Power Automate — Governance & DLP

## Overview
Power Platform governance covers DLP (Data Loss Prevention) policies, environment strategy,
admin center operations, the Center of Excellence (CoE) Toolkit, flow ownership management,
license compliance, and ALM guardrails. Proper governance prevents shadow IT, data exfiltration,
runaway automation, and license waste at scale.

---

## DLP Policy REST API Endpoints

| Method | Endpoint | Permissions | Key Parameters | Notes |
|---|---|---|---|---|
| GET | `/providers/Microsoft.BusinessAppPlatform/scopes/admin/apiPolicies?api-version=2016-11-01` | Power Platform Admin | — | List all DLP policies |
| GET | `/providers/Microsoft.BusinessAppPlatform/scopes/admin/apiPolicies/{policyId}?api-version=2016-11-01` | Power Platform Admin | — | Get policy details |
| POST | `/providers/Microsoft.BusinessAppPlatform/scopes/admin/apiPolicies?api-version=2016-11-01` | Power Platform Admin | `displayName`, `defaultConnectorsClassification`, `connectorGroups` | Create DLP policy |
| PATCH | `.../{policyId}?api-version=2016-11-01` | Power Platform Admin | — | Update DLP policy |
| DELETE | `.../{policyId}?api-version=2016-11-01` | Power Platform Admin | — | Delete DLP policy |

**Base URL:** `https://api.bap.microsoft.com`

---

## DLP Policy Structure

```json
{
  "displayName": "Production DLP Policy",
  "defaultConnectorsClassification": "Blocked",
  "environments": {
    "type": "ExceptEnvironments",
    "ids": ["Default", "/providers/Microsoft.BusinessAppPlatform/scopes/admin/environments/dev-env-id"]
  },
  "connectorGroups": [
    {
      "classification": "Business",
      "connectors": [
        { "id": "/providers/Microsoft.PowerApps/apis/shared_sharepointonline", "name": "SharePoint" },
        { "id": "/providers/Microsoft.PowerApps/apis/shared_office365", "name": "Office 365 Outlook" },
        { "id": "/providers/Microsoft.PowerApps/apis/shared_teams", "name": "Microsoft Teams" },
        { "id": "/providers/Microsoft.PowerApps/apis/shared_commondataservice", "name": "Dataverse" },
        { "id": "/providers/Microsoft.PowerApps/apis/shared_approvals", "name": "Approvals" }
      ]
    },
    {
      "classification": "NonBusiness",
      "connectors": [
        { "id": "/providers/Microsoft.PowerApps/apis/shared_twitter", "name": "Twitter" },
        { "id": "/providers/Microsoft.PowerApps/apis/shared_dropbox", "name": "Dropbox" }
      ]
    }
  ]
}
```

**`defaultConnectorsClassification` values:** `Business` | `NonBusiness` | `Blocked`

### DLP Groups Explained

| Group | Description | Can mix with |
|---|---|---|
| `Business` | Approved corporate connectors | Other Business connectors |
| `NonBusiness` | Personal/unapproved connectors | Other NonBusiness connectors |
| `Blocked` | Prohibited connectors | Cannot be used at all |

Flows that use connectors from BOTH Business AND NonBusiness groups are suspended with a DLP violation.

---

## PowerShell — DLP Management (Power Platform Admin Module)

```powershell
# Install module
Install-Module -Name Microsoft.PowerApps.Administration.PowerShell -Force

# Connect
Add-PowerAppsAccount -TenantID "your-tenant-id"

# List all DLP policies
$policies = Get-AdminDlpPolicy
$policies | Select-Object DisplayName, PolicyName, DefaultConnectorsClassification | Format-Table

# Get policy details
$policy = Get-AdminDlpPolicy -PolicyName "policy-guid"

# Create new DLP policy (environment-scoped)
New-AdminDlpPolicy `
  -DisplayName "Finance Department Policy" `
  -EnvironmentName "finance-env-id" `
  -DefaultConnectorsClassification "Blocked"

# Move connector to Business group
Set-AdminDlpPolicy `
  -PolicyName "policy-guid" `
  -BusinessConnectors @(
    @{ id = "/providers/Microsoft.PowerApps/apis/shared_servicebus"; name = "Azure Service Bus" }
  )

# Get flows suspended by DLP violations
$suspended = Get-AdminFlow -EnvironmentName "env-id" | Where-Object { $_.Internal.properties.state -eq "Suspended" }
$suspended | Select-Object DisplayName, CreatedTime | Format-Table

# Audit: flows using non-Business connectors
$allFlows = Get-AdminFlow -EnvironmentName "env-id"
foreach ($flow in $allFlows) {
  $connections = $flow.Internal.properties.connectionReferences.PSObject.Properties
  foreach ($conn in $connections) {
    $apiId = $conn.Value.api.id
    if ($apiId -notlike "*sharepointonline*" -and $apiId -notlike "*office365*") {
      Write-Host "Flow: $($flow.DisplayName) uses non-standard connector: $apiId"
    }
  }
}
```

---

## Environment Strategy

### Recommended Environment Types

| Environment | Purpose | DLP Policy | Who Creates Flows |
|---|---|---|---|
| Default | Personal productivity, citizen dev | Permissive DLP | All licensed users |
| Development | Pro-dev experimentation | Moderate DLP | Developers |
| Test/UAT | Pre-production validation | Same as Prod DLP | Dev team |
| Production | Business-critical flows | Strict DLP | IT-approved only |
| Sandbox | Isolated experimentation | No DLP (block external) | Training, POCs |

### Environment Naming Convention
```
{org}-{department}-{type}
Example: contoso-finance-prod
         contoso-hr-dev
         contoso-shared-sandbox
```

### Environment Creation via PowerShell
```powershell
# Create new environment
New-AdminPowerAppEnvironment `
  -DisplayName "contoso-finance-prod" `
  -LocationName "unitedstates" `
  -EnvironmentSku "Production" `
  -ProvisionDatabase $true `
  -WaitUntilFinished $true

# Set environment admin
Add-AdminPowerAppEnvironmentUser `
  -EnvironmentName "env-id" `
  -RoleName "EnvironmentAdmin" `
  -PrincipalType "User" `
  -PrincipalObjectId "user-object-id"
```

---

## CoE Toolkit

The [Power Platform CoE Starter Kit](https://learn.microsoft.com/power-platform/guidance/coe/starter-kit)
provides inventory, governance, and nurture components:

### CoE Core Components

| Component | Purpose |
|---|---|
| `DLP Editor v3` | Visual DLP policy editor |
| `Admin — App Usage` | Power Apps usage analytics |
| `Admin — Flow Usage` | Flow usage and run analytics |
| `Maker Compliance Email` | Automated compliance notifications to makers |
| `Inactivity Notification Process` | Alert on unused flows/apps |
| `Welcome Email` | Onboard new Power Platform makers |
| `App Quarantine Process` | Quarantine non-compliant apps |
| `Set New App Owner` | Transfer ownership when user leaves |

### CoE Inventory Tables (Dataverse)

| Table | Contents |
|---|---|
| `admin_flow` | All flows across all environments |
| `admin_flowrun` | Aggregated run metrics |
| `admin_app` | All Power Apps |
| `admin_connector` | Custom connectors |
| `admin_environment` | All environments |
| `admin_maker` | All makers |

### Query CoE Inventory

```powershell
$env = "https://coe-env.crm.dynamics.com"
$token = (Get-AzAccessToken -ResourceUrl $env).Token
$headers = @{ Authorization = "Bearer $token" }

# Inactive flows (no runs in 90 days)
$cutoff = [datetime]::UtcNow.AddDays(-90).ToString("o")
$inactive = Invoke-RestMethod "$env/api/data/v9.2/admin_flows?`$filter=admin_lastrun lt $cutoff and admin_state eq 'On'&`$select=admin_displayname,admin_lastrun,admin_createdby" -Headers $headers
Write-Host "Inactive active flows: $($inactive.value.Count)"

# Flows with orphaned owners (user left company)
$orphaned = Invoke-RestMethod "$env/api/data/v9.2/admin_flows?`$filter=admin_ownerdeleted eq true&`$select=admin_displayname,admin_owneruser" -Headers $headers
Write-Host "Orphaned flows: $($orphaned.value.Count)"

# Top 10 flow makers by flow count
$topMakers = Invoke-RestMethod "$env/api/data/v9.2/admin_flows?`$apply=groupby((admin_createdby),aggregate(`$count as flowCount))&`$orderby=flowCount desc&`$top=10" -Headers $headers
$topMakers.value | Format-Table admin_createdby, flowCount
```

---

## Flow Ownership Management

```powershell
# Change flow owner (when user leaves)
Set-AdminFlowOwnerRole `
  -EnvironmentName "env-id" `
  -FlowName "flow-id" `
  -RoleName "CanEdit" `
  -PrincipalType "User" `
  -PrincipalObjectId "new-owner-object-id"

# Bulk transfer flows from departing user
$userId = "departing-user-object-id"
$newOwnerId = "new-owner-object-id"
$userFlows = Get-AdminFlow -EnvironmentName "env-id" | Where-Object { $_.Internal.properties.creator.objectId -eq $userId }

foreach ($flow in $userFlows) {
  Set-AdminFlowOwnerRole `
    -EnvironmentName "env-id" `
    -FlowName $flow.FlowName `
    -RoleName "Owner" `
    -PrincipalType "User" `
    -PrincipalObjectId $newOwnerId
  Write-Host "Transferred: $($flow.DisplayName)"
}
```

---

## Admin Analytics API

```powershell
# Flow run analytics for environment (last 30 days)
$startDate = [datetime]::UtcNow.AddDays(-30).ToString("o")
$runs = Invoke-RestMethod "https://api.powerplatform.com/analytics/powerautomate/v1.0/environments/{envId}/flowruns?startTime=$startDate&api-version=2022-03-01" -Headers $headers

$summary = $runs.value | Group-Object status | Select-Object Name, Count
$summary | Format-Table
# Output: Succeeded 45231, Failed 123, Cancelled 45

# Connector usage audit
$connectors = Invoke-RestMethod "https://api.powerplatform.com/analytics/powerautomate/v1.0/environments/{envId}/connectorusage?api-version=2022-03-01" -Headers $headers
$connectors.value | Sort-Object usageCount -Descending | Select-Object -First 10 connectorDisplayName, usageCount | Format-Table
```

---

## License Compliance

```powershell
# Detect flows using premium connectors by unlicensed users
$premiumConnectors = @(
  "shared_sql", "shared_servicebus", "shared_eventhubs", "shared_azureeventgrid",
  "shared_salesforce", "shared_servicenow", "shared_sap"
)

$allFlows = Get-AdminFlow -EnvironmentName "env-id"
foreach ($flow in $allFlows) {
  $connRefApis = $flow.Internal.properties.connectionReferences.PSObject.Properties.Value | ForEach-Object { $_.api.id.Split("/")[-1] }
  $premiumUsed = $connRefApis | Where-Object { $premiumConnectors -contains $_ }
  if ($premiumUsed) {
    $owner = $flow.Internal.properties.creator.email
    Write-Host "Premium connector in flow '$($flow.DisplayName)' by $owner — connectors: $($premiumUsed -join ', ')"
  }
}
```

---

## Error Codes

| Error | Cause | Remediation |
|---|---|---|
| `DLPViolation` | Flow uses connectors from Business + NonBusiness groups | Move connectors to same DLP group or split flow |
| `FlowSuspended` | DLP violation or admin suspension | Check DLP policy; contact admin |
| `EnvironmentQuotaExceeded` | Too many flows in environment | Archive or delete unused flows |
| `AdminActionForbidden` | Caller lacks Power Platform Admin role | Assign Global Admin or Power Platform Admin role |
| `PolicyNotFound` | DLP policy GUID invalid | Verify policy exists in tenant |
| `ConnectorBlocked` | Connector is in the Blocked group | Request DLP policy exception from admin |

---

## Limits

| Resource | Limit | Notes |
|---|---|---|
| DLP policies per tenant | 1,000 | |
| Environments per policy | All or specific list | Use `ExceptEnvironments` for targeted exclusions |
| Connectors per DLP group | Unlimited | |
| Flows per environment | 1,000,000 | Practical limit; archiving recommended after ~100K |
| Admin API rate limit | 60 requests/min | Per calling identity |

---

## Production Gotchas

- **Default environment DLP affects ALL licensed users** — changes to the Default environment
  DLP policy can suspend hundreds of existing flows simultaneously; always test in non-default env first.
- **Blocking a connector suspends flows immediately** — moves to Blocked group trigger immediate
  suspension of all flows using that connector across all scoped environments; schedule changes
  during maintenance windows and notify makers in advance.
- **CoE Toolkit requires P2 licenses** — the CoE flows themselves use premium connectors (HTTP,
  Dataverse directly); ensure the service account running CoE flows has Power Automate Premium.
- **Environment variables don't survive managed solution upgrade** — if you accidentally put
  environment variable values in the managed layer, they'll be overwritten on upgrade;
  always set values in an unmanaged "configuration" solution layer.
- **Orphaned connections block environment deletion** — before deleting an environment, use
  `Remove-AdminPowerAppConnection` to clean all connections; otherwise environment deletion fails.
