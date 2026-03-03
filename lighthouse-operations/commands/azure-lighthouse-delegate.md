---
name: lighthouse-operations:azure-lighthouse-delegate
description: Generate ARM/Bicep templates for Azure Lighthouse delegation, configure authorization tiers (permanent + JIT eligible), deploy to customer subscriptions or resource groups, verify delegation, and optionally set up cross-tenant Azure Policy assignments.
argument-hint: "[--scope subscription|resource-group] [--customer-sub-id <id>] [--with-jit]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - AskUserQuestion
---

# Azure Lighthouse Delegation

Generate and deploy Azure Lighthouse ARM/Bicep delegation templates for customer subscriptions.

## Delegation Flow

### Step 1: Collect Delegation Details

Ask for:
1. **Partner (managing) tenant ID** (from config or prompt)
2. **Customer subscription ID** — the subscription to delegate
3. **Delegation scope**: Full subscription or specific resource group
4. **Offer name**: `{MSP Name} — Managed Services` (default)
5. **Authorization tiers**:
   - **Standard** — Reader (all), Contributor (engineers), Security Admin (security team), Monitoring Contributor (NOC)
   - **Read-Only** — Reader only
   - **Full** — Contributor + Security Admin + all monitoring roles
   - **Custom** — select roles interactively
6. **Include JIT eligible authorizations?** (requires additional setup) [yes/no]

If custom, present role selection from the standard role list:

```
Available roles for delegation:
[ ] Reader (acdd72a7-...)
[ ] Contributor (b24988ac-...)
[x] Security Administrator (fb1c8493-...)
[x] Security Reader (39bc4728-...)
[ ] Monitoring Contributor (749f88d5-...)
[x] Monitoring Reader (43d0d8ad-...)
[ ] Network Contributor (4d97b98b-...)
[ ] Storage Account Contributor (17d1049b-...)
[ ] Key Vault Administrator (00482a5a-...)
[x] Managed Services Registration Delete (91c1777a-...) [REQUIRED for cleanup]
```

Note: Always include `Managed Services Registration Delete` to allow the partner to
remove their own delegation.

### Step 2: Collect Partner Group Object IDs

For each selected authorization role, ask for the partner security group object ID.
If using Standard tier, use predefined groups from config.

### Step 3: Generate Bicep Template

Write `lighthouse-delegation-{customer-sub-id-prefix}.bicep`:

```bicep
targetScope = 'subscription'

@description('Partner tenant ID')
param managedByTenantId string = '{partner-tenant-id}'

@description('Offer display name')
param offerName string = '{offer-name}'

var definitionId = guid(subscription().subscriptionId, managedByTenantId)

resource registrationDef 'Microsoft.ManagedServices/registrationDefinitions@2022-10-01' = {
  name: definitionId
  properties: {
    registrationDefinitionName: offerName
    description: 'Delegated management by {MSP name}'
    managedByTenantId: managedByTenantId
    authorizations: [
      // Generated from selected roles and group IDs
    ]
    eligibleAuthorizations: [
      // Only if JIT was selected
    ]
  }
}

resource registrationAssign 'Microsoft.ManagedServices/registrationAssignments@2022-10-01' = {
  name: guid(subscription().subscriptionId, managedByTenantId, 'assign')
  dependsOn: [ registrationDef ]
  properties: {
    registrationDefinitionId: registrationDef.id
  }
}

output definitionId string = registrationDef.id
output assignmentId string = registrationAssign.id
```

Also write `lighthouse-delegation-{prefix}.bicepparam` with collected values.

### Step 4: What-If Preview

```bash
# Login to customer subscription context (partner can do this via Lighthouse delegation or direct)
az account set --subscription "{customer-sub-id}"

# What-if preview
az deployment sub what-if \
  --location eastus \
  --template-file lighthouse-delegation-{prefix}.bicep \
  --parameters lighthouse-delegation-{prefix}.bicepparam
```

Show the what-if output. Ask: "Proceed with deployment?"

### Step 5: Deploy

```bash
az deployment sub create \
  --name "lighthouse-$(date +%Y%m%d-%H%M%S)" \
  --location eastus \
  --template-file lighthouse-delegation-{prefix}.bicep \
  --parameters lighthouse-delegation-{prefix}.bicepparam \
  --query "properties.outputs"
```

### Step 6: Verify Delegation

```bash
# From partner tenant — verify subscription is now accessible
az account list --query "[?managedByTenants[0].tenantId=='{partner-tenant-id}'].{id:id,name:name}" --output table

# List registration assignments in the delegated subscription
az rest --method GET \
  --url "https://management.azure.com/subscriptions/{customer-sub-id}/providers/Microsoft.ManagedServices/registrationAssignments?api-version=2022-10-01&\$expand=registrationDefinition"

# Verify by listing resources via partner tenant
az resource list --subscription "{customer-sub-id}" --output table
```

If delegation is working, resources will be visible from the partner tenant.

### Step 7: Optional — Apply Azure Policy

If the user wants to apply governance policies immediately:

```bash
# Assign Azure Security Benchmark to delegated subscription
az policy assignment create \
  --name "azure-security-benchmark" \
  --display-name "Azure Security Benchmark" \
  --policy-set-definition "1f3afdf9-d0c9-4c3d-847f-89da613e70a8" \
  --scope "/subscriptions/{customer-sub-id}" \
  --subscription "{customer-sub-id}"
```

### Step 8: Summary

```
## Azure Lighthouse Delegation Complete

Customer subscription: {name} ({id})
Registration Definition: {definition-id}
Registration Assignment: {assignment-id}
Delegated roles: Reader, Contributor (engineers), Security Admin, Monitoring Contributor

JIT Eligible: ✅ Configured (Contributor, max 8 hours, requires approval from MSP Leads)

Verification: ✅ Subscription visible from partner tenant
Policy: ✅ Azure Security Benchmark assigned

Generated files:
  lighthouse-delegation-{prefix}.bicep
  lighthouse-delegation-{prefix}.bicepparam

To remove delegation:
  Delete the registration assignment via Azure Portal → {customer-subscription} → Service Providers
  Or: az rest --method DELETE --url "https://management.azure.com/subscriptions/{sub-id}/providers/Microsoft.ManagedServices/registrationAssignments/{assignment-id}?api-version=2022-10-01"
```

## Arguments

- `--scope subscription|resource-group`: Delegation scope (default: subscription)
- `--customer-sub-id <id>`: Skip customer subscription ID question
- `--with-jit`: Include JIT eligible authorizations
