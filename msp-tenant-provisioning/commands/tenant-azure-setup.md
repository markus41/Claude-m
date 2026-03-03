---
name: msp-tenant-provisioning:tenant-azure-setup
description: Set up Azure infrastructure for a new customer — create or link an Azure subscription, place it in the management group hierarchy, assign initial RBAC (MSP team + customer owner), apply Azure Policy baseline (Security Benchmark, tag governance), create a budget with alerts, enable Defender for Cloud across all plans, and prepare for Lighthouse delegation.
argument-hint: "[--tenant-id <id>] [--subscription-id <id>] [--mg-parent <id>] [--budget <amount>]"
allowed-tools:
  - Read
  - Write
  - Bash
  - AskUserQuestion
---

# Azure Tenant and Subscription Setup

Set up Azure infrastructure for a new customer: management groups, subscription, RBAC, policy, budget, and Defender.

## Setup Flow

### Step 1: Collect Setup Details

Ask for if not provided:
1. **Customer tenant ID** — the Microsoft Entra tenant ID
2. **Subscription approach**:
   - **Existing subscription** — provide subscription ID
   - **New EA subscription** — Enterprise Agreement enrollment ID
   - **New MCA subscription** — billing profile and invoice section IDs
3. **Subscription name** — e.g., `Contoso — Production`
4. **Management group hierarchy**: where to place the subscription
   - Create new landing zone under `Landing Zones` (default)
   - Place under existing management group (provide ID)
5. **Monthly budget** — in USD (default: ask customer)
6. **Regions** — primary Azure region (default: `eastus`)
7. **Defender for Cloud** — enable all plans? (default: yes)

### Step 2: Authenticate to Customer Tenant

```bash
CUSTOMER_TENANT_ID="{customer-tenant-id}"
PARTNER_TENANT_ID="{partner-tenant-id}"

# Authenticate to customer tenant
az login --tenant "${CUSTOMER_TENANT_ID}"

# Or use Lighthouse delegation if already set up
az account set --subscription "{subscription-id}"
```

### Step 3: Create Management Group Hierarchy

```bash
# Create top-level management group for customer (under Landing Zones)
CUSTOMER_SHORT="{customer-short-name}"  # e.g., "contoso"
MG_NAME="${CUSTOMER_SHORT}-mg"

az account management-group create \
  --name "${MG_NAME}" \
  --display-name "{Customer Name} — Landing Zone" \
  --parent "Landing-Zones"

# Create child management groups for environment separation
for ENV in prod nonprod; do
  az account management-group create \
    --name "${CUSTOMER_SHORT}-${ENV}" \
    --display-name "{Customer Name} — ${ENV^}" \
    --parent "${MG_NAME}"
done
```

### Step 4: Create or Link Subscription

**If using existing subscription:**
```bash
SUB_ID="{existing-subscription-id}"

# Move subscription to customer management group
az account management-group subscription add \
  --name "${CUSTOMER_SHORT}-prod" \
  --subscription "${SUB_ID}"
```

**If creating new EA subscription:**
```bash
EA_ENROLLMENT_ID="{enrollment-id}"
BILLING_ACCOUNT=$(az billing account list --query "[0].name" -o tsv)

az deployment tenant create \
  --location eastus \
  --template-uri "https://raw.githubusercontent.com/Azure/Enterprise-Scale/main/eslzArm/managementGroupTemplates/subscriptionTemplates/subscriptionAlias.json" \
  --parameters \
    billingScope="/providers/Microsoft.Billing/billingAccounts/${BILLING_ACCOUNT}/enrollmentAccounts/${EA_ENROLLMENT_ID}" \
    subscriptionAliasName="{Customer Name} — Production" \
    subscriptionDisplayName="{Customer Name} — Production" \
    subscriptionWorkload="Production"
```

**If creating new MCA subscription:**
```bash
az rest --method PUT \
  --url "https://management.azure.com/providers/Microsoft.Subscription/aliases/{alias-name}?api-version=2021-10-01" \
  --body '{
    "properties": {
      "displayName": "{Customer Name} — Production",
      "workload": "Production",
      "billingScope": "/providers/Microsoft.Billing/billingAccounts/{billing-account}/billingProfiles/{billing-profile}/invoiceSections/{invoice-section}"
    }
  }'
```

### Step 5: Assign Initial RBAC

```bash
SUB_SCOPE="/subscriptions/${SUB_ID}"

# MSP team — Owner (temporary, for setup only — remove after Lighthouse delegation)
MSP_ADMIN_GROUP_ID="{msp-platform-admins-group-id}"
az role assignment create \
  --role "Owner" \
  --assignee-object-id "${MSP_ADMIN_GROUP_ID}" \
  --assignee-principal-type "Group" \
  --scope "${SUB_SCOPE}"

# Customer Owner — designated customer admin
CUSTOMER_OWNER_ID="{customer-owner-object-id}"
az role assignment create \
  --role "Owner" \
  --assignee "${CUSTOMER_OWNER_ID}" \
  --scope "${SUB_SCOPE}"

# Customer Reader group — for stakeholder visibility
if [ -n "${CUSTOMER_READER_GROUP_ID}" ]; then
  az role assignment create \
    --role "Reader" \
    --assignee-object-id "${CUSTOMER_READER_GROUP_ID}" \
    --assignee-principal-type "Group" \
    --scope "${SUB_SCOPE}"
fi
```

### Step 6: Apply Azure Policy Baseline

```bash
# Assign Microsoft Cloud Security Benchmark (formerly Azure Security Benchmark)
az policy assignment create \
  --name "mcsb-${CUSTOMER_SHORT}" \
  --display-name "Microsoft Cloud Security Benchmark — ${CUSTOMER_SHORT}" \
  --policy-set-definition "1f3afdf9-d0c9-4c3d-847f-89da613e70a8" \
  --scope "${SUB_SCOPE}" \
  --identity-type SystemAssigned \
  --location eastus

# Require resource tags (cost center, environment, owner)
az policy assignment create \
  --name "require-tags-${CUSTOMER_SHORT}" \
  --display-name "Require Tags — ${CUSTOMER_SHORT}" \
  --policy-set-definition "89c14ad5-fa32-4a58-a2c4-5e6debbf6225" \
  --scope "${SUB_SCOPE}" \
  --params '{
    "tagNames": {
      "value": ["CostCenter", "Environment", "Owner", "ManagedBy"]
    }
  }'

# Allowed locations (restrict to primary region)
az policy assignment create \
  --name "allowed-locations-${CUSTOMER_SHORT}" \
  --display-name "Allowed Locations — ${CUSTOMER_SHORT}" \
  --policy "e56962a6-4747-49cd-b67b-bf8b01975c4c" \
  --scope "${SUB_SCOPE}" \
  --params "{\"listOfAllowedLocations\": {\"value\": [\"{primary-region}\", \"{primary-region}2\"]}}"
```

### Step 7: Create Budget with Alert

```bash
# Create monthly budget with 80% alert
BUDGET_AMOUNT="{monthly-budget-usd}"
ALERT_EMAIL="{customer-finance-email}"

az consumption budget create \
  --budget-name "${CUSTOMER_SHORT}-monthly-budget" \
  --amount "${BUDGET_AMOUNT}" \
  --time-grain Monthly \
  --category Cost \
  --scope "${SUB_SCOPE}" \
  --notification \
    notificationKey=actual80 \
    threshold=80 \
    contactEmails="${ALERT_EMAIL}" \
    operator=GreaterThan \
    thresholdType=Actual \
  --notification \
    notificationKey=forecast100 \
    threshold=100 \
    contactEmails="${ALERT_EMAIL}" \
    operator=GreaterThan \
    thresholdType=Forecasted
```

### Step 8: Enable Defender for Cloud

```bash
# Enable Defender plans across all supported resource types
DEFENDER_PLANS=(
  "VirtualMachines"
  "SqlServers"
  "AppServices"
  "StorageAccounts"
  "Containers"
  "KeyVaults"
  "Arm"
  "Dns"
  "SqlServerVirtualMachines"
  "OpenSourceRelationalDatabases"
  "CosmosDbs"
  "DefenderForDevOps"
  "DefenderCspm"
)

for PLAN in "${DEFENDER_PLANS[@]}"; do
  az security pricing create \
    --name "${PLAN}" \
    --tier "Standard" \
    --subscription "${SUB_ID}" 2>/dev/null || echo "Skip: ${PLAN} (not available)"
done

# Set Defender for Cloud security contacts
az security contact create \
  --email "${ALERT_EMAIL}" \
  --phone "{customer-phone}" \
  --alert-notifications On \
  --alerts-to-admins On \
  --name "default"
```

### Step 9: Verify Setup

```bash
# Verify management group placement
az account management-group show \
  --name "${MG_NAME}" \
  --expand --recurse

# Verify RBAC assignments
az role assignment list \
  --scope "${SUB_SCOPE}" \
  --output table

# Verify Defender plans
az security pricing list \
  --subscription "${SUB_ID}" \
  --query "[?pricingTier=='Standard'].{name:name}" \
  --output table

# Verify policy assignments
az policy assignment list \
  --scope "${SUB_SCOPE}" \
  --output table

# Verify budget
az consumption budget list \
  --scope "${SUB_SCOPE}" \
  --output table
```

### Step 10: Summary

```
## Azure Setup Complete

Customer Tenant: {tenant-id}
Subscription: {subscription-name} ({subscription-id})

Management Groups:
  ✅ {customer-mg} — Landing Zone
  ✅ {customer-short}-prod — Production
  ✅ {customer-short}-nonprod — Non-Production

RBAC:
  ✅ MSP Platform Admins — Owner (temporary)
  ✅ Customer Owner — Owner
  ⚠️  Remove MSP Owner role after Lighthouse delegation is deployed

Policy Baseline:
  ✅ Microsoft Cloud Security Benchmark
  ✅ Require resource tags (CostCenter, Environment, Owner, ManagedBy)
  ✅ Allowed locations: {regions}

Budget:
  ✅ ${budget-amount}/month budget configured
  ✅ 80% actual and 100% forecast alerts → {email}

Defender for Cloud:
  ✅ All Standard plans enabled

Next steps:
  → Deploy Azure Lighthouse delegation to replace temporary MSP Owner RBAC:
    /lighthouse-operations:azure-lighthouse-delegate --customer-sub-id {subscription-id}
  → Set up Lighthouse onboarding:
    /msp-tenant-provisioning:tenant-lighthouse-onboard --tenant-id {tenant-id}
```

## Arguments

- `--tenant-id <id>`: Customer Entra tenant ID
- `--subscription-id <id>`: Existing subscription to configure
- `--mg-parent <id>`: Parent management group ID (default: `Landing-Zones`)
- `--budget <amount>`: Monthly budget in USD
