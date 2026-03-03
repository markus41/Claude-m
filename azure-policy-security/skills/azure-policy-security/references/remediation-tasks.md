# Azure Policy — Remediation Tasks

## Overview

Remediation tasks automatically bring non-compliant resources into compliance by executing the deployment or modification defined in the policy's `DeployIfNotExists` or `Modify` effect. Remediation tasks are ARM resources that you create, monitor, and manage independently from the policy assignment. Each task remediates a batch of non-compliant resources using the managed identity assigned to the policy assignment. Remediation tasks run asynchronously and can be monitored via the ARM API.

---

## REST API Endpoints

Base URL: `https://management.azure.com`
API Version: `2021-10-01`

### Remediation Tasks

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|----------------------|----------------|-------|
| PUT | `/{scope}/providers/Microsoft.PolicyInsights/remediations/{remediationName}` | Resource Policy Contributor | Body: remediation definition | Create remediation task |
| GET | `/{scope}/providers/Microsoft.PolicyInsights/remediations/{remediationName}` | Reader | — | Get task status and details |
| GET | `/{scope}/providers/Microsoft.PolicyInsights/remediations` | Reader | `$filter` | List remediation tasks |
| DELETE | `/{scope}/providers/Microsoft.PolicyInsights/remediations/{remediationName}` | Resource Policy Contributor | — | Cancel and delete task |
| POST | `/{scope}/providers/Microsoft.PolicyInsights/remediations/{remediationName}/cancel` | Resource Policy Contributor | — | Cancel a running task |
| GET | `/{scope}/providers/Microsoft.PolicyInsights/remediations/{remediationName}/listDeployments` | Reader | `$filter`, `$top` | List individual resource deployments |

**`{scope}` for remediation tasks**:
- Subscription: `/subscriptions/{id}`
- Resource group: `/subscriptions/{id}/resourceGroups/{rg}`
- Management group: `/providers/Microsoft.Management/managementGroups/{mg}`

---

## Remediation Task Creation

```json
PUT /subscriptions/{id}/providers/Microsoft.PolicyInsights/remediations/remediate-kv-diagnostics?api-version=2021-10-01
{
  "properties": {
    "policyAssignmentId": "/subscriptions/{id}/providers/Microsoft.Authorization/policyAssignments/org-security-assign",
    "policyDefinitionReferenceId": "KeyVaultDiagnostics",
    "resourceDiscoveryMode": "ReEvaluateCompliance",
    "filters": {
      "locations": ["eastus", "eastus2"]
    },
    "parallelDeployments": 10,
    "resourceCount": 500,
    "failureThreshold": {
      "percentage": 0.1
    }
  }
}
```

**Properties Reference**:
| Property | Type | Description |
|----------|------|-------------|
| `policyAssignmentId` | string | ARM ID of the policy assignment driving the remediation |
| `policyDefinitionReferenceId` | string | Specific definition within an initiative (omit for single-definition assignments) |
| `resourceDiscoveryMode` | enum | `ExistingNonCompliant` (from compliance cache) or `ReEvaluateCompliance` (fresh scan) |
| `filters.locations` | string[] | Restrict remediation to specific Azure regions |
| `parallelDeployments` | int | Number of simultaneous resource remediations (1-30, default 10) |
| `resourceCount` | int | Maximum resources to remediate in this task (default 500) |
| `failureThreshold.percentage` | float | Task fails if this percentage of deployments fail (0.0-1.0, default 0.1 = 10%) |

---

## Remediation Task Status

**`provisioningState`** values during task execution:
| State | Description |
|-------|-------------|
| `Accepted` | Task created, waiting to start |
| `Running` | Actively remediating resources |
| `Succeeded` | All targeted resources remediated successfully |
| `Failed` | Task failed (failure threshold exceeded) |
| `Canceled` | Task was manually canceled |

**Check task status**:
```
GET /subscriptions/{id}/providers/Microsoft.PolicyInsights/remediations/remediate-kv-diagnostics?api-version=2021-10-01
```

**Response**:
```json
{
  "id": "/subscriptions/{id}/providers/Microsoft.PolicyInsights/remediations/remediate-kv-diagnostics",
  "name": "remediate-kv-diagnostics",
  "properties": {
    "policyAssignmentId": "...",
    "provisioningState": "Running",
    "createdOn": "2026-03-01T10:00:00Z",
    "lastUpdatedOn": "2026-03-01T10:05:23Z",
    "resourceDiscoveryMode": "ReEvaluateCompliance",
    "deploymentStatus": {
      "totalDeployments": 45,
      "successfulDeployments": 38,
      "failedDeployments": 2
    }
  }
}
```

---

## List Individual Deployment Status

Each remediated resource gets its own deployment tracked under the remediation task.

```
GET /subscriptions/{id}/providers/Microsoft.PolicyInsights/remediations/remediate-kv-diagnostics/listDeployments
  ?api-version=2021-10-01
  &$filter=deploymentStatus eq 'Failed'
  &$top=50
```

**Response**:
```json
{
  "value": [
    {
      "deploymentId": "/subscriptions/{id}/resourceGroups/rg-prod/providers/Microsoft.Resources/deployments/remediation-abc123",
      "remediatedResourceId": "/subscriptions/{id}/resourceGroups/rg-prod/providers/Microsoft.KeyVault/vaults/my-vault",
      "resourceLocation": "eastus",
      "status": "Failed",
      "error": {
        "code": "AuthorizationFailed",
        "message": "The client does not have authorization to perform action 'microsoft.insights/diagnosticSettings/write'..."
      },
      "deploymentSummary": {
        "totalResources": 1,
        "successfulResources": 0,
        "failedResources": 1,
        "conflictedResources": 0
      }
    }
  ]
}
```

---

## Azure CLI: Remediation Management

```bash
# Create remediation task
az policy remediation create \
  --name remediate-kv-diagnostics \
  --policy-assignment /subscriptions/{id}/providers/Microsoft.Authorization/policyAssignments/org-security-assign \
  --definition-reference-id KeyVaultDiagnostics \
  --resource-discovery-mode ReEvaluateCompliance \
  --resource-count 100 \
  --parallel-deployments 5

# Check remediation status
az policy remediation show \
  --name remediate-kv-diagnostics \
  --subscription {id}

# List all remediations
az policy remediation list \
  --subscription {id}

# List failed deployments in a remediation
az policy remediation deployment list \
  --name remediate-kv-diagnostics \
  --subscription {id} \
  --query "[?status=='Failed']" \
  -o table

# Cancel a running remediation
az policy remediation cancel \
  --name remediate-kv-diagnostics \
  --subscription {id}

# Delete (and cancel if running) a remediation
az policy remediation delete \
  --name remediate-kv-diagnostics \
  --subscription {id}

# Create remediation at resource group scope
az policy remediation create \
  --name remediate-rg-tags \
  --policy-assignment /subscriptions/{id}/providers/Microsoft.Authorization/policyAssignments/require-tags \
  --resource-group rg-prod \
  --resource-discovery-mode ExistingNonCompliant \
  --resource-count 200
```

---

## PowerShell: Remediation Management

```powershell
# Create remediation task
$remediation = Start-AzPolicyRemediation `
  -Name "remediate-kv-diagnostics" `
  -PolicyAssignmentId "/subscriptions/{id}/providers/Microsoft.Authorization/policyAssignments/org-security-assign" `
  -PolicyDefinitionReferenceId "KeyVaultDiagnostics" `
  -ResourceDiscoveryMode "ReEvaluateCompliance" `
  -ResourceCount 500 `
  -ParallelDeployments 10 `
  -SubscriptionId "{id}"

Write-Host "Remediation created: $($remediation.Name)"
Write-Host "Initial status: $($remediation.ProvisioningState)"

# Monitor until complete
do {
  Start-Sleep -Seconds 30
  $status = Get-AzPolicyRemediation -Name "remediate-kv-diagnostics" -SubscriptionId "{id}"
  Write-Host "Status: $($status.ProvisioningState) | Success: $($status.DeploymentStatus.SuccessfulDeployments) | Failed: $($status.DeploymentStatus.FailedDeployments)"
} while ($status.ProvisioningState -in @("Accepted", "Running"))

Write-Host "Final status: $($status.ProvisioningState)"

# List failed deployments
$deployments = Get-AzPolicyRemediationDeployment `
  -RemediationName "remediate-kv-diagnostics" `
  -SubscriptionId "{id}" |
  Where-Object { $_.Status -eq "Failed" }

foreach ($d in $deployments) {
  Write-Warning "Failed: $($d.RemediatedResourceId) - $($d.Error.Message)"
}

# Stop running remediation
Stop-AzPolicyRemediation -Name "remediate-kv-diagnostics" -SubscriptionId "{id}"

# List all remediations
Get-AzPolicyRemediation -SubscriptionId "{id}" |
  Select-Object Name, ProvisioningState, @{N='Success';E={$_.DeploymentStatus.SuccessfulDeployments}}, @{N='Failed';E={$_.DeploymentStatus.FailedDeployments}} |
  Format-Table
```

---

## Managed Identity for Remediation

DeployIfNotExists and Modify effects require the policy assignment to have a managed identity with sufficient permissions. The identity performs the ARM deployments or modifications on behalf of the policy engine.

### Assign System-Assigned Identity on Policy Assignment

```json
PUT /{scope}/providers/Microsoft.Authorization/policyAssignments/{name}?api-version=2023-04-01
{
  "identity": {
    "type": "SystemAssigned"
  },
  "location": "eastus",
  "properties": {
    "policyDefinitionId": "...",
    "enforcementMode": "Default"
  }
}
```

**`location`** is required when `identity.type` is `SystemAssigned`.

### Grant Required RBAC Role to Assignment Identity

```bash
# Get the managed identity principal ID from the assignment
PRINCIPAL_ID=$(az policy assignment show \
  --name org-security-assign \
  --scope /subscriptions/{id} \
  --query identity.principalId -o tsv)

# Grant Contributor role on subscription (required for DeployIfNotExists)
az role assignment create \
  --assignee $PRINCIPAL_ID \
  --role Contributor \
  --scope /subscriptions/{id}

# Or grant more specific role (e.g., Monitoring Contributor for diagnostics)
az role assignment create \
  --assignee $PRINCIPAL_ID \
  --role "Monitoring Contributor" \
  --scope /subscriptions/{id}
```

**Minimum required roles by effect**:
| Effect | Minimum Role | Notes |
|--------|-------------|-------|
| `Modify` (tags) | Tag Contributor | Or Contributor for broader modifications |
| `Modify` (properties) | Contributor | Resource-type specific contributor roles preferred |
| `DeployIfNotExists` (diagnostics) | Monitoring Contributor | For `Microsoft.Insights/diagnosticSettings/write` |
| `DeployIfNotExists` (extensions) | Contributor | VM extensions, policy extensions |
| `DeployIfNotExists` (general) | Contributor | Broad; scope to resource group when possible |

---

## Common Remediation Patterns

### Pattern 1: Remediate Missing Diagnostic Settings

```bash
# 1. Verify the assignment has managed identity
az policy assignment show --name org-security-assign --scope /subscriptions/{id} \
  --query identity

# 2. Verify identity has required role
PRINCIPAL_ID=$(az policy assignment show --name org-security-assign \
  --scope /subscriptions/{id} --query identity.principalId -o tsv)
az role assignment list --assignee $PRINCIPAL_ID --query "[].roleDefinitionName"

# 3. Get count of non-compliant resources
az policy state list \
  --filter "ComplianceState eq 'NonCompliant' and PolicyDefinitionReferenceId eq 'KeyVaultDiagnostics'" \
  --query "length(@)"

# 4. Create remediation task
az policy remediation create \
  --name remediate-kv-diag-$(date +%Y%m%d) \
  --policy-assignment org-security-assign \
  --definition-reference-id KeyVaultDiagnostics \
  --resource-discovery-mode ReEvaluateCompliance \
  --resource-count 500 \
  --parallel-deployments 10

# 5. Monitor progress
watch -n 30 "az policy remediation show --name remediate-kv-diag-$(date +%Y%m%d) \
  --query '{State:properties.provisioningState, Success:properties.deploymentStatus.successfulDeployments, Failed:properties.deploymentStatus.failedDeployments}'"
```

### Pattern 2: Remediate Missing Tags (Modify Effect)

```bash
# Create tag remediation for all non-compliant resources
az policy remediation create \
  --name add-environment-tag-$(date +%Y%m%d) \
  --policy-assignment /subscriptions/{id}/providers/Microsoft.Authorization/policyAssignments/add-environment-tag \
  --resource-discovery-mode ReEvaluateCompliance \
  --resource-count 1000 \
  --parallel-deployments 30 \
  --subscription {id}
```

### Pattern 3: Phased Wave Remediation

For large environments, remediate in waves by location or resource group:

```powershell
$locations = @("eastus", "eastus2", "westus2")
$wave = 1

foreach ($location in $locations) {
  $taskName = "remediate-wave$wave-$location-$(Get-Date -Format 'yyyyMMdd')"

  $task = Start-AzPolicyRemediation `
    -Name $taskName `
    -PolicyAssignmentId "/subscriptions/{id}/providers/Microsoft.Authorization/policyAssignments/org-security-assign" `
    -PolicyDefinitionReferenceId "KeyVaultDiagnostics" `
    -ResourceDiscoveryMode "ReEvaluateCompliance" `
    -ResourceCount 200 `
    -ParallelDeployments 5 `
    -LocationFilter $location `
    -SubscriptionId "{id}"

  Write-Host "Wave $wave ($location): Created remediation $taskName"

  # Wait for current wave to finish before starting next
  do {
    Start-Sleep -Seconds 60
    $status = Get-AzPolicyRemediation -Name $taskName -SubscriptionId "{id}"
  } while ($status.ProvisioningState -in @("Accepted", "Running"))

  Write-Host "Wave $wave ($location): $($status.ProvisioningState)"
  $wave++
}
```

---

## Monitoring Remediation Progress (KQL)

When diagnostic settings are enabled for policy resources, track remediation via Log Analytics:

```kql
// Remediation task status changes
AzureActivity
| where TimeGenerated > ago(24h)
| where OperationNameValue contains "policyInsights/remediations"
| project TimeGenerated, Caller, OperationNameValue, ActivityStatusValue, ResourceGroup
| order by TimeGenerated desc

// Deployment failures from remediation
AzureActivity
| where TimeGenerated > ago(24h)
| where OperationNameValue == "Microsoft.Resources/deployments/write"
| where ActivityStatusValue == "Failure"
| extend correlationId = tostring(parse_json(Properties).correlationId)
| where Properties contains "remediation"
| project TimeGenerated, ResourceGroup, Resource, Properties
| order by TimeGenerated desc

// Policy evaluation errors
AzureActivity
| where TimeGenerated > ago(24h)
| where OperationNameValue contains "policyAssignments"
| where ActivityStatusValue in ("Failed", "Failure")
| project TimeGenerated, Caller, OperationNameValue, ResourceGroup, Properties
```

---

## Error Codes Table

| Code | Meaning | Remediation |
|------|---------|-------------|
| `AuthorizationFailed` | Managed identity lacks required role | Grant appropriate RBAC role to identity; verify role at correct scope |
| `RemediationNotFound` | Remediation task name/scope incorrect | Verify scope and task name; use `GET .../remediations` to list |
| `PolicyAssignmentNotFound` | Assignment ID incorrect | Verify full ARM ID including subscription, scope, and name |
| `InvalidPolicyDefinitionReferenceId` | Reference ID not in initiative | Check initiative definition for correct `policyDefinitionReferenceId` values |
| `ResourceDiscoveryFailed` | Cannot query non-compliant resources | Verify Policy Insights resource provider is registered; check permissions |
| `FailureThresholdExceeded` | More than `failureThreshold` % of deployments failed | Review individual deployment errors; fix root cause; create new task |
| `RemediationAlreadyRunning` | Cannot create new task while one is running for same assignment | Cancel current task or wait for completion |
| `ManagedIdentityNotSet` | Assignment has no managed identity | Update assignment to add `identity: { type: "SystemAssigned" }` |

---

## Throttling Limits Table

| Resource | Limit | Retry Strategy |
|----------|-------|---------------|
| Concurrent remediation deployments | 30 per task (set via `parallelDeployments`) | Reduce parallelism if ARM throttling occurs |
| Resources per remediation task | 500 default (configurable up to 50,000 with API) | Use `resourceCount` parameter; create multiple tasks for large scopes |
| Concurrent remediation tasks per subscription | ~20 (practical limit varies) | Sequence tasks by policy or location; monitor completion before starting next |
| ARM deployment concurrency | 800 concurrent operations per subscription | Reduce `parallelDeployments` during high-activity periods |
| Policy Insights API read operations | 1,200/min per subscription | Cache compliance data; avoid polling status more frequently than every 30 seconds |

---

## Common Patterns and Gotchas

**1. Managed identity role assignment timing**
After creating a policy assignment with `SystemAssigned` identity, wait 1-2 minutes before creating a remediation task. The identity needs time to propagate through AAD before role assignments take effect. Creating a remediation task immediately after assignment creation often results in `AuthorizationFailed` errors.

**2. `ExistingNonCompliant` vs `ReEvaluateCompliance`**
`ExistingNonCompliant` uses the cached compliance state (up to 24 hours old). `ReEvaluateCompliance` triggers a fresh evaluation scan first, then remediates — this takes longer but ensures the task targets the current state. Use `ReEvaluateCompliance` after new assignments; `ExistingNonCompliant` for ongoing scheduled remediations.

**3. Remediation tasks are not idempotent**
Running the same remediation task twice (or creating two tasks for the same assignment) can result in duplicate deployments. The policy engine has some deduplication, but always check if a non-compliant resource has already been targeted before creating a new task.

**4. Failure threshold and partial success**
The `failureThreshold.percentage` (default 10%) causes the task to fail if more than 10% of deployments fail. For large-scale remediations with expected partial failures, set a higher threshold (e.g., 0.5 = 50%) and review individual deployment failures after the task completes. The task failing does NOT roll back successfully completed remediations.

**5. Resource count vs pagination**
The default `resourceCount` is 500. For subscriptions with thousands of non-compliant resources, create multiple sequential tasks or increase `resourceCount`. The API supports up to 50,000 via direct API call (CLI default is 500). Each task starts a fresh discovery scan if using `ReEvaluateCompliance`.

**6. Management group scope remediations**
Creating a remediation at management group scope requires the managed identity to have roles across all child subscriptions. This is a powerful but potentially risky operation. Prefer subscription-level remediations with management group-level assignments for better blast radius control.
