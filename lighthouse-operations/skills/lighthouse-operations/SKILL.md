---
name: lighthouse-operations
description: >
  Deep expertise in Azure Lighthouse (ARM/Bicep delegation templates, managed services
  marketplace offers, cross-tenant ARM policy and governance) and Microsoft 365 Lighthouse
  operations (GDAP full lifecycle, baseline template deployment, Partner Center integration,
  cross-tenant workbooks, alert rule management, tenant tagging). Covers the full MSP/CSP
  technical stack for delegated administration across Azure subscriptions and M365 tenants.
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
triggers:
  - azure lighthouse
  - arm delegation template
  - managed services template
  - lighthouse delegation
  - lighthouse offer
  - managed services marketplace
  - registration definition
  - registration assignment
  - eligible authorization
  - lighthouse jit access
  - gdap lifecycle
  - gdap renew
  - gdap create relationship
  - gdap role assignment
  - baseline deployment lighthouse
  - management template deployment
  - lighthouse workbook
  - partner center lighthouse
  - cross-tenant governance
  - lighthouse onboarding
  - lighthouse alerts management
  - tenant tagging lighthouse
  - azure lighthouse bicep
  - lighthouse eligible authorization
  - azure delegated resource management
---

# Lighthouse Operations

This skill covers the full technical depth of **Azure Lighthouse** (ARM-level cross-tenant
delegation, managed services marketplace offers, eligible authorizations) and **Microsoft 365
Lighthouse** operations (GDAP lifecycle automation, baseline deployment tracking, Partner Center
integration, cross-tenant workbooks, alert management). It is the operations complement to the
`lighthouse-health` plugin's health-scoring capabilities.

## Azure Lighthouse vs. M365 Lighthouse — Disambiguation

| | Azure Lighthouse | M365 Lighthouse |
|--|--|--|
| **Scope** | Azure subscriptions and resource groups | Microsoft 365 tenants |
| **Access model** | ARM registration definitions + assignments | GDAP delegated admin relationships |
| **Portal** | Azure Portal → Service Providers | M365 Lighthouse (lighthouse.microsoft.com) |
| **API** | Azure Resource Manager (management.azure.com) | Microsoft Graph beta (managedTenants) |
| **Typical use** | Cross-subscription IaC, policy, monitoring | MSP security posture, baselines, alerts |

Both are frequently used together: Azure Lighthouse manages Azure resources; M365 Lighthouse manages Microsoft 365 configuration and security.

---

## Part 1: Azure Lighthouse — ARM Delegation

### Core Resources

| Resource Type | API Version | Purpose |
|--------------|-------------|---------|
| `Microsoft.ManagedServices/registrationDefinitions` | 2022-10-01 | Define the managed services offer |
| `Microsoft.ManagedServices/registrationAssignments` | 2022-10-01 | Apply the definition to a scope |

A **Registration Definition** describes *who* gets access (authorizations from the managing tenant) and *what* access (Azure RBAC roles). A **Registration Assignment** applies the definition to a subscription or resource group in the customer tenant.

### Minimal ARM Template

```json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "managedByTenantId": {
      "type": "string",
      "metadata": { "description": "Partner (managing) tenant ID" }
    },
    "authorizations": {
      "type": "array",
      "metadata": { "description": "Array of authorization objects" }
    },
    "offerName": {
      "type": "string",
      "defaultValue": "MSP Managed Services"
    }
  },
  "variables": {
    "definitionId": "[guid(subscription().subscriptionId, parameters('managedByTenantId'))]"
  },
  "resources": [
    {
      "type": "Microsoft.ManagedServices/registrationDefinitions",
      "apiVersion": "2022-10-01",
      "name": "[variables('definitionId')]",
      "properties": {
        "registrationDefinitionName": "[parameters('offerName')]",
        "description": "MSP delegated management access",
        "managedByTenantId": "[parameters('managedByTenantId')]",
        "authorizations": "[parameters('authorizations')]"
      }
    },
    {
      "type": "Microsoft.ManagedServices/registrationAssignments",
      "apiVersion": "2022-10-01",
      "name": "[guid(subscription().subscriptionId)]",
      "dependsOn": [
        "[resourceId('Microsoft.ManagedServices/registrationDefinitions', variables('definitionId'))]"
      ],
      "properties": {
        "registrationDefinitionId": "[resourceId('Microsoft.ManagedServices/registrationDefinitions', variables('definitionId'))]"
      }
    }
  ]
}
```

### Parameters File — Standard MSP Authorizations

```json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "managedByTenantId": { "value": "<partner-tenant-id>" },
    "offerName": { "value": "Contoso MSP — Full Management" },
    "authorizations": {
      "value": [
        {
          "principalId": "<partner-admin-group-object-id>",
          "principalIdDisplayName": "MSP Tier 1 Support",
          "roleDefinitionId": "acdd72a7-3385-48ef-bd42-f606fba81ae7"
        },
        {
          "principalId": "<partner-engineer-group-object-id>",
          "principalIdDisplayName": "MSP Engineers",
          "roleDefinitionId": "b24988ac-6180-42a0-ab88-20f7382dd24c"
        },
        {
          "principalId": "<partner-security-group-object-id>",
          "principalIdDisplayName": "MSP Security Team",
          "roleDefinitionId": "fb1c8493-542b-48eb-b624-b4c8fea62acd"
        },
        {
          "principalId": "<automation-sp-object-id>",
          "principalIdDisplayName": "MSP Automation (SP)",
          "roleDefinitionId": "91c1777a-f3dc-4fae-b103-61d183457e46"
        }
      ]
    }
  }
}
```

### Common Azure Built-in Role IDs for Lighthouse

| Role | Role Definition ID |
|------|-------------------|
| Owner | `8e3af657-a8ff-443c-a75c-2fe8c4bcb635` |
| Contributor | `b24988ac-6180-42a0-ab88-20f7382dd24c` |
| Reader | `acdd72a7-3385-48ef-bd42-f606fba81ae7` |
| Security Admin | `fb1c8493-542b-48eb-b624-b4c8fea62acd` |
| Security Reader | `39bc4728-0917-49c7-9d2c-d95423bc2eb4` |
| Monitoring Contributor | `749f88d5-cbae-40b8-bcfc-e573ddc772fa` |
| Monitoring Reader | `43d0d8ad-25c7-4714-9337-8ba259a9fe05` |
| Virtual Machine Contributor | `9980e02c-c2be-4d73-94e8-173b1dc7cf3c` |
| Network Contributor | `4d97b98b-1d4f-4787-a291-c67834d212e7` |
| Storage Account Contributor | `17d1049b-9a84-46fb-8f53-869881c3d3ab` |
| Key Vault Administrator | `00482a5a-887f-4fb3-b363-3b7fe8e74483` |
| Managed Services Registration Delete | `91c1777a-f3dc-4fae-b103-61d183457e46` |

**Note**: Owner and User Access Administrator roles **cannot** be delegated via Lighthouse. Contributor is the highest general-purpose role you can delegate.

### Eligible Authorizations (JIT Access)

Eligible authorizations let partner staff request time-limited elevated access with MFA enforcement — useful for privileged operations like Owner-equivalent tasks.

```json
{
  "type": "Microsoft.ManagedServices/registrationDefinitions",
  "apiVersion": "2022-10-01",
  "name": "[variables('definitionId')]",
  "properties": {
    "registrationDefinitionName": "MSP JIT Privileged Access",
    "managedByTenantId": "[parameters('managedByTenantId')]",
    "authorizations": [
      {
        "principalId": "<partner-base-group>",
        "principalIdDisplayName": "MSP Base Access (permanent)",
        "roleDefinitionId": "acdd72a7-3385-48ef-bd42-f606fba81ae7"
      }
    ],
    "eligibleAuthorizations": [
      {
        "principalId": "<partner-admin-group>",
        "principalIdDisplayName": "MSP Admins (eligible for Contributor)",
        "roleDefinitionId": "b24988ac-6180-42a0-ab88-20f7382dd24c",
        "justInTimeAccessPolicy": {
          "multiFactorAuthProvider": "Azure",
          "maximumActivationDuration": "PT8H",
          "managedByTenantApprovers": [
            {
              "principalId": "<approver-group-object-id>",
              "principalIdDisplayName": "MSP Leads"
            }
          ]
        }
      }
    ]
  }
}
```

---

## Part 2: Azure Lighthouse — Bicep

See deep-dive: [`references/azure-lighthouse-arm.md`](./references/azure-lighthouse-arm.md)

```bicep
// lighthouse-delegation.bicep
targetScope = 'subscription'

@description('Partner (managing) tenant ID')
param managedByTenantId string

@description('Display name for the managed services offer')
param offerName string = 'MSP Managed Services'

@description('Array of authorization objects')
param authorizations array

var definitionId = guid(subscription().subscriptionId, managedByTenantId)

resource registrationDef 'Microsoft.ManagedServices/registrationDefinitions@2022-10-01' = {
  name: definitionId
  properties: {
    registrationDefinitionName: offerName
    description: 'MSP delegated management'
    managedByTenantId: managedByTenantId
    authorizations: authorizations
  }
}

resource registrationAssign 'Microsoft.ManagedServices/registrationAssignments@2022-10-01' = {
  name: guid(subscription().subscriptionId)
  properties: {
    registrationDefinitionId: registrationDef.id
  }
}

output definitionId string = registrationDef.id
output assignmentId string = registrationAssign.id
```

### Deploy

```bash
# Deploy to customer subscription
az deployment sub create \
  --location eastus \
  --template-file lighthouse-delegation.bicep \
  --parameters managedByTenantId=<partner-tenant-id> \
               offerName="MSP Services" \
               authorizations=@authorizations.json

# Verify delegation
az managedservices assignment list --subscription <customer-sub-id>
```

---

## Part 3: M365 Lighthouse GDAP Lifecycle

See deep-dive: [`references/gdap-lifecycle.md`](./references/gdap-lifecycle.md)

### GDAP Relationship States

```
draft → approvalPending → active → (expiring) → expired
                                 ↘ terminated
```

| Status | Description |
|--------|-------------|
| `approvalPending` | Created by partner; customer must approve in admin portal |
| `active` | Operational; roles can be exercised |
| `expiring` | Within expiry window; auto-extend not configured |
| `expired` | Past end date; access revoked |
| `terminated` | Manually ended by either party |

### Create + Activate GDAP

```
POST https://graph.microsoft.com/v1.0/tenantRelationships/delegatedAdminRelationships

{
  "displayName": "Contoso MSP — Security Management",
  "duration": "P730D",
  "autoExtendDuration": "P180D",
  "customer": { "tenantId": "<customer-tenant-id>" },
  "accessDetails": {
    "unifiedRoles": [
      { "roleDefinitionId": "5d6b6bb7-de71-4623-b4af-96380a352509" },
      { "roleDefinitionId": "f2ef992c-3afb-46b9-b7cf-a126ee74c451" },
      { "roleDefinitionId": "194ae4cb-b126-40b2-bd5b-6091b380977d" }
    ]
  }
}
```

After customer approves, assign partner security groups:

```
POST .../delegatedAdminRelationships/{id}/accessAssignments

{
  "accessContainer": {
    "accessContainerId": "<partner-security-group-object-id>",
    "accessContainerType": "securityGroup"
  },
  "accessDetails": {
    "unifiedRoles": [
      { "roleDefinitionId": "5d6b6bb7-de71-4623-b4af-96380a352509" }
    ]
  }
}
```

---

## Part 4: M365 Lighthouse — Baseline Deployment

See deep-dive: [`references/baseline-deployment.md`](./references/baseline-deployment.md)

### List Available Management Templates

```
GET https://graph.microsoft.com/beta/tenantRelationships/managedTenants/managementTemplates
```

Key template categories: MFA enforcement, legacy auth blocking, CA baseline, device compliance, Defender AV.

### Check Deployment Status Across Tenants

```
GET https://graph.microsoft.com/beta/tenantRelationships/managedTenants/managementTemplateStepTenantSummaries
  ?$filter=managementTemplateStepId eq '{stepId}'
  &$select=tenantId,tenantDisplayName,assignedToTenantCount,deployedToTenantCount,notDeployedToTenantCount
```

### Deployment Status Values

| Status | Description |
|--------|-------------|
| `compliant` | Template fully deployed and compliant |
| `notCompliant` | Template assigned but not deployed |
| `error` | Deployment encountered an error |
| `excluded` | Tenant excluded from this template |
| `notLicensed` | Tenant lacks required license |

---

## Part 5: Progressive Disclosure — Reference Files

| Topic | File |
|-------|------|
| Azure Lighthouse ARM/Bicep templates, eligible authorizations, marketplace offers | [`references/azure-lighthouse-arm.md`](./references/azure-lighthouse-arm.md) |
| GDAP lifecycle: create, approve, assign roles, renew, monitor | [`references/gdap-lifecycle.md`](./references/gdap-lifecycle.md) |
| Baseline deployment, management templates, deployment tracking | [`references/baseline-deployment.md`](./references/baseline-deployment.md) |
| Partner Center API, tenant onboarding to Lighthouse, service plans | [`references/partner-center-api.md`](./references/partner-center-api.md) |
| Cross-tenant Azure Policy, workbooks, Monitor, governance | [`references/cross-tenant-governance.md`](./references/cross-tenant-governance.md) |
| Lighthouse alert rules, alert triage, notification routing | [`references/alert-management.md`](./references/alert-management.md) |
