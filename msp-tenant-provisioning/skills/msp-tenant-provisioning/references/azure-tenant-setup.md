# Azure Tenant Setup — Management Groups, Subscriptions, Policy, RBAC

## Management Group Hierarchy

Management Groups provide a governance scope above subscriptions. All subscriptions in an
Azure AD tenant can be organized under management groups.

### Recommended MSP Hierarchy

```
Root Management Group (Tenant Root)
├── Platform
│   ├── Management (Log Analytics, Key Vault, automation)
│   └── Connectivity (Hub VNet, DNS, ExpressRoute)
└── LandingZones
    ├── Corp (internal workloads)
    │   └── {customer-subscription-1}
    └── Online (internet-facing workloads)
        └── {customer-subscription-2}
```

### Create Management Group

```
PUT https://management.azure.com/providers/Microsoft.Management/managementGroups/{group-id}?api-version=2021-04-01
Authorization: Bearer {management-token}
Content-Type: application/json

{
  "properties": {
    "displayName": "Customer Corp Workloads",
    "parent": {
      "id": "/providers/Microsoft.Management/managementGroups/{parent-group-id}"
    }
  }
}
```

```bash
az account management-group create \
  --name "customer-corp" \
  --display-name "Customer Corp Workloads" \
  --parent "LandingZones"
```

### Move Subscription to Management Group

```bash
az account management-group subscription add \
  --name "customer-corp" \
  --subscription "<customer-subscription-id>"
```

---

## Azure Subscription Creation

### Via Azure CLI (EA / MCA)

For Enterprise Agreement or Microsoft Customer Agreement billing accounts:

```bash
# Get billing account and enrollment info
az billing account list --output table

# List billing profiles (MCA)
az billing profile list --account-name "<billing-account-name>" --output table

# List invoice sections
az billing invoice-section list \
  --account-name "<billing-account-name>" \
  --profile-name "<profile-name>" --output table

# Create subscription under EA
az account subscription create \
  --enrollment-account-name "<enrollment-account-id>" \
  --offer-type MS-AZR-0017P \
  --display-name "Customer Corp Production" \
  --output json
```

### Via ARM REST API (MCA)

```
POST https://management.azure.com/providers/Microsoft.Billing/billingAccounts/{billingAccountName}/billingProfiles/{billingProfileName}/invoiceSections/{invoiceSectionName}/providers/Microsoft.Subscription/createSubscription?api-version=2021-10-01

{
  "displayName": "Customer Corp Production",
  "skuId": "0001",
  "costCenter": "CUSTOMER-CORP-001",
  "managementGroupId": "/providers/Microsoft.Management/managementGroups/customer-corp",
  "owner": {
    "objectId": "<owner-object-id>"
  },
  "additionalParameters": {
    "subscriptionTenantId": "<customer-tenant-id>"
  }
}
```

---

## Initial RBAC Setup

### Assign Owner Role to Customer Admin

```bash
az role assignment create \
  --assignee "<customer-admin-object-id>" \
  --role "Owner" \
  --scope "/subscriptions/<subscription-id>"
```

### Assign MSP Access via Azure Lighthouse (see lighthouse-operations)

For MSP delegated access, use Azure Lighthouse (creates Registration Definition + Assignment)
rather than direct RBAC assignments, to maintain clean separation.

### Standard MSP RBAC Pattern (Non-Lighthouse Alternative)

```bash
# Add MSP group as Contributor
az role assignment create \
  --assignee-object-id "<msp-group-object-id>" \
  --assignee-principal-type "Group" \
  --role "Contributor" \
  --scope "/subscriptions/<subscription-id>"

# Add MSP group as Security Reader
az role assignment create \
  --assignee-object-id "<msp-security-group-object-id>" \
  --assignee-principal-type "Group" \
  --role "Security Reader" \
  --scope "/subscriptions/<subscription-id>"
```

---

## Azure Policy Baseline

### Assign Azure Security Benchmark

```bash
az policy assignment create \
  --name "azure-security-benchmark" \
  --display-name "Azure Security Benchmark" \
  --policy-set-definition "1f3afdf9-d0c9-4c3d-847f-89da613e70a8" \
  --scope "/subscriptions/<subscription-id>"
```

### Assign Require Tags Policy

```bash
az policy assignment create \
  --name "require-tags-rg" \
  --display-name "Require tags on resource groups" \
  --policy "96670d01-0a4d-4649-9c89-2d3abc0a5025" \
  --scope "/subscriptions/<subscription-id>" \
  --params '{"tagName": {"value": "Environment"}}'
```

### Common Policy Initiative IDs

| Initiative | ID |
|-----------|-----|
| Azure Security Benchmark | `1f3afdf9-d0c9-4c3d-847f-89da613e70a8` |
| CIS Microsoft Azure Foundations | `06f19060-9e68-4070-92ca-f15cc126059e` |
| NIST SP 800-53 Rev. 5 | `179d1daa-458f-4e47-8086-2a68d0d6c38f` |
| ISO 27001:2013 | `89c6cddc-1c73-4ac1-b19c-54d1a15a42f2` |

---

## Budget and Cost Controls

```bash
# Create monthly budget with 80% alert
az consumption budget create \
  --budget-name "customer-monthly-budget" \
  --amount 5000 \
  --time-grain Monthly \
  --start-date "2026-03-01" \
  --end-date "2027-03-01" \
  --subscription "<subscription-id>" \
  --notifications '[{"enabled": true, "operator": "GreaterThan", "threshold": 80, "contactEmails": ["alerts@msp.com"]}]'
```

---

## Defender for Cloud (Azure Security Center)

Enable Defender for Cloud on a new subscription:

```bash
# Enable Defender for Cloud (basic — free)
az security auto-provisioning-setting update \
  --name "mma" \
  --auto-provision "On" \
  --subscription "<subscription-id>"

# Enable Defender for Servers Plan 2 (paid)
az security pricing create \
  --name "VirtualMachines" \
  --tier "Standard" \
  --subscription "<subscription-id>"
```

### Enable All Defender Plans

```bash
PLANS=("VirtualMachines" "SqlServers" "AppServices" "StorageAccounts" "KeyVaults" "Dns" "Arm" "ContainerRegistry" "KubernetesService" "OpenSourceRelationalDatabases" "SqlServerVirtualMachines")

for PLAN in "${PLANS[@]}"; do
  az security pricing create \
    --name "$PLAN" \
    --tier "Standard" \
    --subscription "<subscription-id>"
done
```

---

## Setup Checklist

```
Azure Tenant Setup Checklist — {Customer}

Management Groups:
[ ] LandingZone management group created
[ ] Subscription moved to correct management group

Subscriptions:
[ ] Production subscription created
[ ] Development subscription created (if required)

RBAC:
[ ] Customer admin assigned Owner role
[ ] MSP access configured (Lighthouse delegation preferred)

Policy:
[ ] Azure Security Benchmark initiative assigned
[ ] Required tags policy assigned
[ ] Allowed regions policy assigned (if required)

Security:
[ ] Defender for Cloud enabled
[ ] Budget alert configured at 80% of monthly estimate
[ ] Diagnostic settings → Log Analytics workspace connected
```
