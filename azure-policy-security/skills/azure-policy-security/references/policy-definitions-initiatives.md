# Azure Policy — Policy Definitions & Initiatives

## Overview

Azure Policy definitions describe the governance rules to enforce on Azure resources. A policy definition specifies the condition to evaluate and the effect to apply (Audit, Deny, Modify, DeployIfNotExists, etc.). Initiatives (policy set definitions) group multiple policies for coordinated assignment and compliance tracking. Custom policies extend built-in coverage for organization-specific requirements. Policy aliases expose resource properties that are not directly settable via ARM and allow policy rules to target specific settings.

---

## REST API Endpoints

Base URL: `https://management.azure.com`
API Version: `2023-04-01`

### Policy Definitions

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|----------------------|----------------|-------|
| GET | `/providers/Microsoft.Authorization/policyDefinitions` | Reader | `$filter`, `$top` | List all built-in definitions |
| GET | `/providers/Microsoft.Authorization/policyDefinitions/{name}` | Reader | — | Get specific built-in definition |
| GET | `/subscriptions/{id}/providers/Microsoft.Authorization/policyDefinitions` | Reader | — | List subscription-level definitions |
| PUT | `/subscriptions/{id}/providers/Microsoft.Authorization/policyDefinitions/{name}` | Resource Policy Contributor | Body: definition | Create or update custom definition |
| PUT | `/managementGroups/{mg}/providers/Microsoft.Authorization/policyDefinitions/{name}` | Resource Policy Contributor | Body: definition | Create definition at management group |
| DELETE | `/subscriptions/{id}/providers/Microsoft.Authorization/policyDefinitions/{name}` | Resource Policy Contributor | — | Delete custom definition |

### Policy Set Definitions (Initiatives)

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|----------------------|----------------|-------|
| GET | `/providers/Microsoft.Authorization/policySetDefinitions` | Reader | `$filter`, `$top` | List built-in initiatives |
| GET | `/providers/Microsoft.Authorization/policySetDefinitions/{name}` | Reader | — | Get specific built-in initiative |
| GET | `/subscriptions/{id}/providers/Microsoft.Authorization/policySetDefinitions` | Reader | — | List custom initiatives |
| PUT | `/subscriptions/{id}/providers/Microsoft.Authorization/policySetDefinitions/{name}` | Resource Policy Contributor | Body: initiative | Create or update custom initiative |
| PUT | `/managementGroups/{mg}/providers/Microsoft.Authorization/policySetDefinitions/{name}` | Resource Policy Contributor | Body: initiative | Create initiative at management group |
| DELETE | `/subscriptions/{id}/providers/Microsoft.Authorization/policySetDefinitions/{name}` | Resource Policy Contributor | — | Delete custom initiative |

---

## Policy Definition JSON Schema

```json
PUT /subscriptions/{id}/providers/Microsoft.Authorization/policyDefinitions/require-tag-costcenter?api-version=2023-04-01
{
  "properties": {
    "displayName": "Require CostCenter tag on resource groups",
    "description": "Enforces the presence of a CostCenter tag on all resource groups. Denies creation or update of resource groups without this tag.",
    "policyType": "Custom",
    "mode": "All",
    "metadata": {
      "version": "1.0.0",
      "category": "Tags",
      "createdBy": "Platform Team",
      "createdOn": "2026-01-01T00:00:00Z"
    },
    "parameters": {
      "tagName": {
        "type": "String",
        "metadata": {
          "displayName": "Tag Name",
          "description": "The name of the required tag"
        },
        "defaultValue": "CostCenter"
      },
      "effect": {
        "type": "String",
        "metadata": {
          "displayName": "Effect",
          "description": "Policy effect"
        },
        "allowedValues": ["Audit", "Deny", "Disabled"],
        "defaultValue": "Deny"
      }
    },
    "policyRule": {
      "if": {
        "allOf": [
          {
            "field": "type",
            "equals": "Microsoft.Resources/subscriptions/resourceGroups"
          },
          {
            "field": "[concat('tags[', parameters('tagName'), ']')]",
            "exists": "false"
          }
        ]
      },
      "then": {
        "effect": "[parameters('effect')]"
      }
    }
  }
}
```

---

## Policy Definition Properties Reference

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `displayName` | string | Yes | Human-readable name (max 128 chars) |
| `description` | string | No | Extended description (max 512 chars) |
| `policyType` | enum | — | `Custom` (user-created) or `BuiltIn` (Microsoft-managed) |
| `mode` | enum | Yes | `All` (resource groups + resources), `Indexed` (resources with location/tags only) |
| `metadata` | object | No | Category, version, custom fields |
| `parameters` | object | No | Input parameters for parameterized policies |
| `policyRule` | object | Yes | `if` condition + `then` effect |

**`mode` values**:
| Mode | Evaluates | Use For |
|------|-----------|---------|
| `All` | All resource types including resource groups | Tag policies, naming conventions, security settings |
| `Indexed` | Resources with `location` and `tags` properties only | Most infrastructure policies |
| `Microsoft.Kubernetes.Data` | AKS admission controller (OPA Gatekeeper) | Kubernetes pod/namespace policies |
| `Microsoft.KeyVault.Data` | Key Vault objects (keys, certificates, secrets) | Key Vault object policies |
| `Microsoft.Network.Data` | Network manager resources | Network policies |

---

## Effect Types

| Effect | Description | Identity Required | Use Case |
|--------|-------------|-------------------|---------|
| `Audit` | Creates compliance record; no blocking | No | Informational — measure scope before enforcing |
| `Deny` | Block create/update of non-compliant resources | No | Hard guardrails (required tags, approved locations) |
| `Modify` | Add/update/remove tags or properties on create/update | Yes | Auto-tagging, auto-configuration of resources |
| `DeployIfNotExists` | Deploy a template if a condition is not met | Yes | Auto-deploy diagnostics, extensions, companion resources |
| `AuditIfNotExists` | Audit when a related resource doesn't exist | No | Check if diagnostics settings exist on a resource |
| `Append` | Appends fields to the resource at create/update time | No | Add default IP rules to storage, add security contacts |
| `DenyAction` | Block specific management actions (e.g., delete) | No | Prevent accidental deletion of critical resources |
| `Disabled` | No evaluation or effect | No | Temporarily disable a policy without removing it |
| `Manual` | Requires manual attestation by operator | No | Compliance processes that cannot be automated |

---

## DeployIfNotExists Policy Example

```json
{
  "properties": {
    "displayName": "Deploy diagnostic settings for Key Vault to Log Analytics",
    "mode": "Indexed",
    "parameters": {
      "logAnalyticsWorkspaceId": {
        "type": "String",
        "metadata": { "displayName": "Log Analytics Workspace ID" }
      }
    },
    "policyRule": {
      "if": {
        "field": "type",
        "equals": "Microsoft.KeyVault/vaults"
      },
      "then": {
        "effect": "DeployIfNotExists",
        "details": {
          "type": "Microsoft.Insights/diagnosticSettings",
          "name": "setByPolicy",
          "existenceCondition": {
            "allOf": [
              {
                "field": "Microsoft.Insights/diagnosticSettings/logs[*].enabled",
                "equals": "true"
              },
              {
                "field": "Microsoft.Insights/diagnosticSettings/workspaceId",
                "equals": "[parameters('logAnalyticsWorkspaceId')]"
              }
            ]
          },
          "roleDefinitionIds": [
            "/providers/Microsoft.Authorization/roleDefinitions/b24988ac-6180-42a0-ab88-20f7382dd24c"
          ],
          "deployment": {
            "properties": {
              "mode": "incremental",
              "template": {
                "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
                "contentVersion": "1.0.0.0",
                "parameters": {
                  "resourceName": { "type": "string" },
                  "location": { "type": "string" },
                  "workspaceId": { "type": "string" }
                },
                "resources": [
                  {
                    "type": "Microsoft.KeyVault/vaults/providers/diagnosticSettings",
                    "apiVersion": "2021-05-01-preview",
                    "name": "[concat(parameters('resourceName'), '/microsoft.insights/setByPolicy')]",
                    "location": "[parameters('location')]",
                    "properties": {
                      "workspaceId": "[parameters('workspaceId')]",
                      "logs": [
                        { "category": "AuditEvent", "enabled": true },
                        { "category": "AzurePolicyEvaluationDetails", "enabled": true }
                      ]
                    }
                  }
                ]
              },
              "parameters": {
                "resourceName": { "value": "[field('name')]" },
                "location": { "value": "[field('location')]" },
                "workspaceId": { "value": "[parameters('logAnalyticsWorkspaceId')]" }
              }
            }
          }
        }
      }
    }
  }
}
```

---

## Modify Effect Policy Example

```json
{
  "properties": {
    "displayName": "Add environment tag to resources if missing",
    "mode": "Indexed",
    "parameters": {
      "environmentTagValue": {
        "type": "String",
        "defaultValue": "production"
      }
    },
    "policyRule": {
      "if": {
        "field": "tags['Environment']",
        "exists": "false"
      },
      "then": {
        "effect": "Modify",
        "details": {
          "roleDefinitionIds": [
            "/providers/Microsoft.Authorization/roleDefinitions/b24988ac-6180-42a0-ab88-20f7382dd24c"
          ],
          "operations": [
            {
              "operation": "addOrReplace",
              "field": "tags['Environment']",
              "value": "[parameters('environmentTagValue')]"
            }
          ]
        }
      }
    }
  }
}
```

---

## Initiative (Policy Set Definition) Structure

```json
PUT /subscriptions/{id}/providers/Microsoft.Authorization/policySetDefinitions/org-security-baseline?api-version=2023-04-01
{
  "properties": {
    "displayName": "Organization Security Baseline",
    "description": "Custom baseline initiative for organization security requirements",
    "policyType": "Custom",
    "metadata": {
      "version": "2.0.0",
      "category": "Security"
    },
    "parameters": {
      "logAnalyticsWorkspaceId": {
        "type": "String",
        "metadata": { "displayName": "Central Log Analytics Workspace" }
      },
      "allowedLocations": {
        "type": "Array",
        "metadata": { "displayName": "Allowed Azure Regions" },
        "defaultValue": ["eastus", "eastus2", "westus2"]
      }
    },
    "policyDefinitions": [
      {
        "policyDefinitionId": "/subscriptions/{id}/providers/Microsoft.Authorization/policyDefinitions/require-tag-costcenter",
        "policyDefinitionReferenceId": "RequireCostCenterTag",
        "parameters": {
          "tagName": { "value": "CostCenter" },
          "effect": { "value": "Deny" }
        }
      },
      {
        "policyDefinitionId": "/providers/Microsoft.Authorization/policyDefinitions/e56962a6-4747-49cd-b67b-bf8b01975c4c",
        "policyDefinitionReferenceId": "AllowedLocations",
        "parameters": {
          "listOfAllowedLocations": { "value": "[parameters('allowedLocations')]" }
        }
      },
      {
        "policyDefinitionId": "/subscriptions/{id}/providers/Microsoft.Authorization/policyDefinitions/deploy-kv-diagnostics",
        "policyDefinitionReferenceId": "KeyVaultDiagnostics",
        "parameters": {
          "logAnalyticsWorkspaceId": { "value": "[parameters('logAnalyticsWorkspaceId')]" }
        }
      }
    ],
    "policyDefinitionGroups": [
      {
        "name": "TagGovernance",
        "displayName": "Tag Governance Controls",
        "description": "Policies enforcing tag requirements for cost allocation"
      },
      {
        "name": "LocationRestrictions",
        "displayName": "Data Residency Controls",
        "description": "Policies restricting resource deployment locations"
      }
    ]
  }
}
```

---

## Policy Aliasing

Policy aliases allow rules to target specific properties deep within resource definitions. Use the `Get-AzPolicyAlias` PowerShell command or REST API to discover aliases.

```powershell
# List aliases for a resource type
Get-AzPolicyAlias -ResourceTypeMatch "virtualNetworks" | Select-Object -ExpandProperty Aliases

# Discover aliases for storage accounts
Get-AzPolicyAlias -NamespaceMatch "Microsoft.Storage" | Select-Object Namespace, ResourceType, Aliases
```

**Common aliases**:
| Alias | Resource Type | Property |
|-------|---------------|----------|
| `Microsoft.Storage/storageAccounts/networkAcls.defaultAction` | Storage | Default network rule (Allow/Deny) |
| `Microsoft.Compute/virtualMachines/storageProfile.osDisk.encryptionSettings.enabled` | VM | OS disk encryption |
| `Microsoft.Sql/servers/firewallRules[*].startIpAddress` | SQL | Firewall start IP |
| `Microsoft.Web/sites/httpsOnly` | App Service | HTTPS-only setting |
| `Microsoft.KeyVault/vaults/sku.name` | Key Vault | SKU (Standard/Premium) |
| `Microsoft.Network/virtualNetworks/subnets[*].serviceEndpoints[*].service` | VNet | Service endpoints |

---

## Azure CLI: Policy Management

```bash
# Create custom policy definition from file
az policy definition create \
  --name "require-tag-costcenter" \
  --display-name "Require CostCenter tag" \
  --description "Deny resource groups without CostCenter tag" \
  --rules ./policy-rule.json \
  --params ./policy-params.json \
  --mode All

# Get built-in policy definition
az policy definition show \
  --name "06a78e20-9358-41c9-923c-fb736d382a4d"

# List custom definitions
az policy definition list --query "[?policyType=='Custom']" -o table

# Create initiative from file
az policy set-definition create \
  --name "org-security-baseline" \
  --display-name "Organization Security Baseline" \
  --definitions ./initiative-policies.json \
  --params ./initiative-params.json

# Assign policy to subscription
az policy assignment create \
  --name "require-tag-prod" \
  --display-name "Require CostCenter tag - Production" \
  --policy "require-tag-costcenter" \
  --scope "/subscriptions/{id}" \
  --params '{"tagName":{"value":"CostCenter"},"effect":{"value":"Deny"}}' \
  --enforcement-mode Default

# Assign initiative
az policy assignment create \
  --name "org-security-baseline-assign" \
  --display-name "Org Security Baseline Assignment" \
  --policy-set-definition "org-security-baseline" \
  --scope "/subscriptions/{id}" \
  --mi-system-assigned \
  --location eastus \
  --params '{"logAnalyticsWorkspaceId":{"value":"/subscriptions/..."}}'
```

---

## PowerShell: Policy Management

```powershell
# Create policy definition
$rule = Get-Content ./policy-rule.json | ConvertFrom-Json
$params = Get-Content ./policy-params.json | ConvertFrom-Json

New-AzPolicyDefinition `
  -Name "require-tag-costcenter" `
  -DisplayName "Require CostCenter tag" `
  -Description "Deny resource groups without CostCenter tag" `
  -Policy (ConvertTo-Json $rule -Depth 20) `
  -Parameter (ConvertTo-Json $params -Depth 20) `
  -Mode All

# Create initiative
$policyDefs = Get-Content ./initiative-policies.json | ConvertFrom-Json

New-AzPolicySetDefinition `
  -Name "org-security-baseline" `
  -DisplayName "Org Security Baseline" `
  -PolicyDefinition (ConvertTo-Json $policyDefs -Depth 20)

# Assign initiative with managed identity
$assignment = New-AzPolicyAssignment `
  -Name "org-security-assign" `
  -DisplayName "Org Security Baseline Assignment" `
  -PolicySetDefinition (Get-AzPolicySetDefinition -Name "org-security-baseline") `
  -Scope "/subscriptions/{id}" `
  -EnforcementMode Default `
  -IdentityType SystemAssigned `
  -Location "eastus"

# Assign required role to managed identity for DeployIfNotExists/Modify effects
New-AzRoleAssignment `
  -ObjectId $assignment.Identity.PrincipalId `
  -RoleDefinitionName "Contributor" `
  -Scope "/subscriptions/{id}"
```

---

## Error Codes Table

| Code | Meaning | Remediation |
|------|---------|-------------|
| `PolicyDefinitionNotFound` | Definition name/GUID incorrect or wrong scope | Verify policy definition ID includes correct scope (subscription or management group) |
| `InvalidPolicyRule` | Policy rule JSON syntax error | Validate JSON; check that `if`/`then` structure is correct |
| `AliasNotFound` | Policy alias does not exist for resource type | Use `Get-AzPolicyAlias` to enumerate valid aliases |
| `MissingRequiredIdentity` | DeployIfNotExists/Modify assignment lacks managed identity | Add `identity: { type: "SystemAssigned" }` and `location` to assignment |
| `InvalidRoleDefinitionIds` | Role in `roleDefinitionIds` does not exist | Use full role definition ID (`/providers/Microsoft.Authorization/roleDefinitions/{guid}`) |
| `TooManyDefinitionsInInitiative` | Initiative exceeds 1,000 definitions | Split into multiple initiatives; use management group hierarchy |
| `PolicySetDefinitionAlreadyExists` | Creating initiative that already exists | Use PUT (idempotent update) instead of checking for existence first |

---

## Throttling Limits Table

| Resource | Limit | Retry Strategy |
|----------|-------|---------------|
| Custom policy definitions per subscription | 500 | Use management group scope to share definitions; consolidate similar policies |
| Custom initiatives per subscription | 200 | Group related definitions into fewer, well-organized initiatives |
| Policy assignments per subscription | 200 | Assign at management group scope to cover multiple subscriptions |
| Policy parameters per definition | 20 | Consolidate parameters; use object parameters for grouped settings |
| Policy rule size | 1 MB (JSON) | Simplify conditions; split complex policies |
| ARM API write operations | 1,200/min per subscription | Batch policy definition deployments; use deployment pipelines |
| Policy compliance evaluation | 30 minutes after assignment | Trigger immediate scan via `triggerEvaluation` endpoint |

---

## Common Patterns and Gotchas

**1. Parameterizing effect with `allowedValues`**
Always parameterize the `effect` with `allowedValues: ["Audit", "Deny", "Disabled"]` for custom policies. This allows governance teams to use `DoNotEnforce` mode during rollout without modifying the policy definition.

**2. Management group scope for enterprise**
Create policy definitions and initiatives at the management group scope — not subscription scope. Management group definitions can be assigned to any child scope (management groups, subscriptions, resource groups). Subscription-scoped definitions can only be assigned within that subscription.

**3. `mode: "All"` vs `mode: "Indexed"`**
Using `mode: "All"` on a policy that includes conditions for resource-type-specific fields (like `location`) causes errors for resource types that don't have those fields (like resource groups). Use `mode: "Indexed"` for most infrastructure policies; use `mode: "All"` only for tag policies that need to cover resource groups.

**4. Role assignment for remediation effects**
DeployIfNotExists and Modify effects require a system-assigned or user-assigned managed identity on the policy assignment. The identity must have sufficient RBAC roles on the target scope to perform the deployment or modification. A common minimum is `Contributor` on the subscription scope.

**5. `policyDefinitionReferenceId` must be unique within an initiative**
When adding the same policy definition multiple times in an initiative (e.g., for different resource types), each instance must have a unique `policyDefinitionReferenceId`. This ID is used in remediation tasks and compliance reports to identify which instance of the policy applied.

**6. Testing with `DoNotEnforce`**
When rolling out new Deny policies, assign them with `enforcementMode: "DoNotEnforce"` first. This generates compliance data without blocking deployments. Review non-compliant resources for 1-2 weeks, then switch to `Default` (enforced) after remediation is complete.
