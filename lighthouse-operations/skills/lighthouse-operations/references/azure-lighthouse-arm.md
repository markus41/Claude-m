# Azure Lighthouse — ARM/Bicep Templates, Eligible Authorizations, Marketplace Offers

## Full Bicep Module — With Eligible Authorizations

```bicep
// lighthouse-delegation.bicep
targetScope = 'subscription'

@description('Partner (managing) tenant ID')
param managedByTenantId string

@description('Offer display name')
param offerName string = 'MSP Managed Services'

@description('Offer description')
param offerDescription string = 'Delegated management by MSP partner'

@description('Permanent authorizations array')
param authorizations array = []

@description('JIT eligible authorizations array')
param eligibleAuthorizations array = []

var definitionName = guid(subscription().subscriptionId, managedByTenantId)
var assignmentName = guid(subscription().subscriptionId, managedByTenantId, 'assignment')

resource registrationDef 'Microsoft.ManagedServices/registrationDefinitions@2022-10-01' = {
  name: definitionName
  properties: {
    registrationDefinitionName: offerName
    description: offerDescription
    managedByTenantId: managedByTenantId
    authorizations: authorizations
    eligibleAuthorizations: eligibleAuthorizations
  }
}

resource registrationAssign 'Microsoft.ManagedServices/registrationAssignments@2022-10-01' = {
  name: assignmentName
  dependsOn: [ registrationDef ]
  properties: {
    registrationDefinitionId: registrationDef.id
  }
}

output definitionId string = registrationDef.id
output assignmentId string = registrationAssign.id
output definitionName string = definitionName
```

### Parameters File — MSP Standard Setup

```bicep
// lighthouse-delegation.bicepparam
using './lighthouse-delegation.bicep'

param managedByTenantId = '<partner-tenant-id>'
param offerName = 'Contoso MSP — Full Management'
param offerDescription = 'Delegated administration by Contoso MSP'

param authorizations = [
  {
    principalId: '<msp-tier1-group-object-id>'
    principalIdDisplayName: 'MSP Tier 1 Support'
    roleDefinitionId: 'acdd72a7-3385-48ef-bd42-f606fba81ae7' // Reader
  }
  {
    principalId: '<msp-engineers-group-object-id>'
    principalIdDisplayName: 'MSP Engineers'
    roleDefinitionId: 'b24988ac-6180-42a0-ab88-20f7382dd24c' // Contributor
  }
  {
    principalId: '<msp-security-group-object-id>'
    principalIdDisplayName: 'MSP Security Team'
    roleDefinitionId: 'fb1c8493-542b-48eb-b624-b4c8fea62acd' // Security Admin
  }
  {
    principalId: '<msp-monitoring-group-object-id>'
    principalIdDisplayName: 'MSP Monitoring'
    roleDefinitionId: '749f88d5-cbae-40b8-bcfc-e573ddc772fa' // Monitoring Contributor
  }
  {
    principalId: '<msp-automation-sp-object-id>'
    principalIdDisplayName: 'MSP Automation SP'
    roleDefinitionId: '91c1777a-f3dc-4fae-b103-61d183457e46' // Managed Services Registration Delete
  }
]

param eligibleAuthorizations = [
  {
    principalId: '<msp-privileged-group-object-id>'
    principalIdDisplayName: 'MSP Privileged Access (JIT)'
    roleDefinitionId: 'b24988ac-6180-42a0-ab88-20f7382dd24c' // Contributor
    justInTimeAccessPolicy: {
      multiFactorAuthProvider: 'Azure'
      maximumActivationDuration: 'PT8H'
      managedByTenantApprovers: [
        {
          principalId: '<msp-leads-group-object-id>'
          principalIdDisplayName: 'MSP Leads (approvers)'
        }
      ]
    }
  }
]
```

---

## Multi-Resource-Group Delegation

Deploy delegation to a specific resource group instead of the full subscription:

```bash
# Subscription-scope deployment
az deployment sub create \
  --name "lighthouse-$(date +%Y%m%d)" \
  --location eastus \
  --template-file lighthouse-delegation.bicep \
  --parameters lighthouse-delegation.bicepparam

# Resource-group-scope deployment (change targetScope in .bicep to 'resourceGroup')
az deployment group create \
  --resource-group <customer-rg-name> \
  --template-file lighthouse-delegation-rg.bicep \
  --parameters managedByTenantId=<partner-tenant-id>
```

---

## ARM REST API — Query Delegations

```bash
# List all registration assignments in a subscription
az rest --method GET \
  --url "https://management.azure.com/subscriptions/{sub-id}/providers/Microsoft.ManagedServices/registrationAssignments?api-version=2022-10-01&$expand=registrationDefinition"

# List registration definitions
az rest --method GET \
  --url "https://management.azure.com/subscriptions/{sub-id}/providers/Microsoft.ManagedServices/registrationDefinitions?api-version=2022-10-01"

# Delete a registration assignment (remove delegation)
az rest --method DELETE \
  --url "https://management.azure.com/subscriptions/{sub-id}/providers/Microsoft.ManagedServices/registrationAssignments/{assignment-id}?api-version=2022-10-01"
```

---

## Azure Lighthouse Marketplace Offer (Managed Service Offer)

For publishing a Managed Service offer to the Azure Marketplace, the offer definition is
created in Partner Center (commercial marketplace). The offer contains the authorization
plan with the same ARM structure.

### Offer Plan Structure (Partner Center UI / API)

```json
{
  "publisherId": "contoso-msp",
  "offerId": "contoso-managed-services",
  "plans": [
    {
      "planId": "standard-management",
      "planName": "Standard Management",
      "authorizations": [
        {
          "principalId": "<group-id>",
          "principalIdDisplayName": "MSP Team",
          "roleDefinitionId": "b24988ac-6180-42a0-ab88-20f7382dd24c"
        }
      ]
    }
  ]
}
```

### Customer Deploy Published Offer

When a customer deploys your marketplace offer, Azure automatically creates the
Registration Definition + Assignment using the plan's authorization list.

The deployment URL follows:
```
https://portal.azure.com/#create/Microsoft.ManagedServicesDefinition
```

---

## Cross-Tenant Operations — Verify Access

After delegation, verify the partner can access customer resources:

```bash
# From partner tenant — list VMs in customer subscription
az vm list --subscription <customer-sub-id> --output table

# List resource groups visible via Lighthouse
az group list --subscription <customer-sub-id> --output table

# Verify which subscriptions are delegated to partner
az account list --output table
# Look for subscriptions with tenantId = customer-tenant-id and managedByTenants containing partner-tenant-id
```

---

## Lighthouse + Azure Policy Cross-Tenant

Once delegated, deploy Azure Policy from the partner tenant to the customer subscription:

```bash
# Assign a built-in policy to customer subscription
az policy assignment create \
  --name "require-tags" \
  --display-name "Require required tags" \
  --policy "/providers/Microsoft.Authorization/policyDefinitions/<policy-def-id>" \
  --scope "/subscriptions/<customer-sub-id>" \
  --subscription <customer-sub-id>

# Check compliance across all delegated subscriptions
az policy state list \
  --subscription <customer-sub-id> \
  --filter "complianceState eq 'NonCompliant'" \
  --select "resourceId,policyDefinitionName,complianceState"
```

---

## Troubleshooting Delegation Issues

| Problem | Cause | Fix |
|---------|-------|-----|
| 403 on customer resource | Assignment not deployed | Re-run ARM deployment or check assignment status |
| Can't create eligible authorization | Role not eligible | Only some roles support JIT; check eligibility |
| Assignment stuck "creating" | Race condition | Wait 15 min; delete and recreate |
| Missing in partner portal | Cross-tenant cache | Wait up to 1 hour; force refresh |
| Can't delete assignment | Protected by locks | Remove resource lock on subscription first |
