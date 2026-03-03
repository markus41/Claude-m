---
name: msp-tenant-provisioning:tenant-lighthouse-onboard
description: Complete the final onboarding of a new customer tenant into the MSP management plane — enroll the M365 tenant in Microsoft 365 Lighthouse, deploy the initial management template baseline, set up Azure Lighthouse delegation for Azure subscriptions, configure GDAP role assignments, verify all access paths, and generate a handover checklist for the customer.
argument-hint: "[--tenant-id <id>] [--subscription-id <id>] [--skip-azure] [--skip-m365]"
allowed-tools:
  - Read
  - Write
  - Bash
  - AskUserQuestion
---

# Lighthouse Onboarding

Complete customer onboarding into the MSP management plane: M365 Lighthouse enrollment, management template deployment, Azure delegation, and GDAP role assignments.

## Onboarding Flow

### Step 1: Verify Prerequisites

Confirm the following are complete before onboarding:

```
Pre-onboarding Checklist:
[ ] Tenant provisioned (tenant-provision)
[ ] Security baseline applied (tenant-configure)
[ ] Custom domain verified (tenant-domain-setup) [optional]
[ ] Azure subscription set up (tenant-azure-setup) [optional — skip with --skip-azure]
[ ] GDAP relationship created and approved by customer
[ ] Partner tenant has M365 Lighthouse access
```

Ask user to confirm or run checks:

```bash
TENANT_ID="{customer-tenant-id}"
GRAPH_TOKEN=$(az account get-access-token \
  --resource https://graph.microsoft.com \
  --query accessToken -o tsv)

# Check GDAP relationship status
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/tenantRelationships/delegatedAdminRelationships?$filter=customer/tenantId eq '${TENANT_ID}'&$select=id,status,displayName,endDateTime" \
  --headers "Authorization=Bearer ${GRAPH_TOKEN}"
```

If no active GDAP relationship exists, instruct user to create one first:
```
No active GDAP relationship found for tenant {tenant-id}.
Run: /lighthouse-operations:gdap-manage --action create --customer-tenant-id {tenant-id}
```

### Step 2: Assign GDAP Security Groups

Assign the MSP partner security groups to the active GDAP relationship:

```bash
RELATIONSHIP_ID="{gdap-relationship-id}"

# Standard MSP group assignments
declare -A ROLE_GROUPS=(
  ["194ae4cb-b126-40b2-bd5b-6091b380977d"]="${MSP_SECURITY_OPS_GROUP_ID}"  # Security Admin
  ["5d6b6bb7-de71-4623-b4af-96380a352509"]="${MSP_SECURITY_OPS_GROUP_ID}"  # Security Reader
  ["f2ef992c-3afb-46b9-b7cf-a126ee74c451"]="${MSP_GLOBAL_READER_GROUP_ID}" # Global Reader
  ["fe930be7-5e62-47db-91af-98c3a49a38b1"]="${MSP_HELPDESK_GROUP_ID}"      # Helpdesk Admin
  ["729827e3-9c14-49f7-bb1b-9608f156bbb8"]="${MSP_HELPDESK_GROUP_ID}"      # User Admin
  ["29232cdf-9323-42fd-ade2-1d097af3e4de"]="${MSP_EXCHANGE_GROUP_ID}"      # Exchange Admin
)

# Create access assignment for each group
az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/tenantRelationships/delegatedAdminRelationships/${RELATIONSHIP_ID}/accessAssignments" \
  --headers "Authorization=Bearer ${GRAPH_TOKEN}" \
  --body '{
    "accessContainer": {
      "accessContainerId": "'${MSP_SECURITY_OPS_GROUP_ID}'",
      "accessContainerType": "securityGroup"
    },
    "accessDetails": {
      "unifiedRoles": [
        {"roleDefinitionId": "194ae4cb-b126-40b2-bd5b-6091b380977d"},
        {"roleDefinitionId": "5d6b6bb7-de71-4623-b4af-96380a352509"}
      ]
    }
  }'
```

Repeat for each group/role combination. Verify all assignments are created:

```bash
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/tenantRelationships/delegatedAdminRelationships/${RELATIONSHIP_ID}/accessAssignments" \
  --headers "Authorization=Bearer ${GRAPH_TOKEN}"
```

### Step 3: Verify M365 Lighthouse Enrollment

```bash
BETA_BASE="https://graph.microsoft.com/beta/tenantRelationships/managedTenants"

# Check if tenant appears in Lighthouse
az rest --method GET \
  --url "${BETA_BASE}/tenants?$filter=tenantId eq '${TENANT_ID}'&$select=tenantId,displayName,tenantStatusInformation" \
  --headers "Authorization=Bearer ${GRAPH_TOKEN}"
```

If the tenant doesn't appear yet, it may need up to 24 hours after GDAP assignment for Lighthouse enrollment. Provide the check command to re-run.

If the tenant appears, check its management status:

```bash
# Verify managed tenant status
az rest --method GET \
  --url "${BETA_BASE}/managedTenantOperationErrors?$filter=tenantId eq '${TENANT_ID}'" \
  --headers "Authorization=Bearer ${GRAPH_TOKEN}"
```

### Step 4: Deploy Initial Management Templates (skip if --skip-m365)

List and deploy the critical baseline templates:

```bash
# Get list of available management templates
az rest --method GET \
  --url "${BETA_BASE}/managementTemplates?$select=id,displayName,category" \
  --headers "Authorization=Bearer ${GRAPH_TOKEN}"
```

Deploy priority templates to the new tenant:

```bash
# MFA for Admins template
MFA_ADMIN_TEMPLATE_ID="{mfa-admin-template-id}"
az rest --method POST \
  --url "${BETA_BASE}/managementActions/{action-id}/apply" \
  --headers "Authorization=Bearer ${GRAPH_TOKEN}" \
  --body "{
    \"tenantId\": \"${TENANT_ID}\",
    \"tenantGroupId\": \"all-tenants\",
    \"managementTemplateId\": \"${MFA_ADMIN_TEMPLATE_ID}\"
  }"
```

Track deployment status:
```bash
az rest --method GET \
  --url "${BETA_BASE}/managementActionTenantDeploymentStatuses?$filter=tenantId eq '${TENANT_ID}'" \
  --headers "Authorization=Bearer ${GRAPH_TOKEN}"
```

### Step 5: Deploy Azure Lighthouse Delegation (skip if --skip-azure)

If `--subscription-id` is provided, delegate it now:

```bash
SUBSCRIPTION_ID="{customer-subscription-id}"
az account set --subscription "${SUBSCRIPTION_ID}"

# Generate and deploy Lighthouse delegation
# (delegates to the template generated by azure-lighthouse-delegate)
```

Instruct user to run the delegation command:
```
Run the Azure Lighthouse delegation for this subscription:
/lighthouse-operations:azure-lighthouse-delegate \
  --customer-sub-id {subscription-id} \
  --scope subscription
```

After delegation, verify from partner tenant:
```bash
# From partner tenant — verify subscription visible
az account list \
  --query "[?managedByTenants[0].tenantId=='{partner-tenant-id}'].{id:id,name:name}" \
  --output table
```

### Step 6: Configure Alert Notifications

Set up MSP alert contact for the new tenant in Lighthouse:

```bash
# Add MSP alert contact for the new tenant
az rest --method POST \
  --url "${BETA_BASE}/managedTenants/{tenant-id}/alertContacts" \
  --headers "Authorization=Bearer ${GRAPH_TOKEN}" \
  --body '{
    "email": "{msp-alerts-email}",
    "phone": "{msp-phone}",
    "alertNotifications": "all"
  }' 2>/dev/null || echo "Alert contact API not available — configure in Lighthouse portal"
```

### Step 7: Run Lighthouse Health Check

After all setup steps, run a baseline health check:

```bash
# MFA coverage
az rest --method GET \
  --url "${BETA_BASE}/credentialUserRegistrationsSummaries?$filter=tenantId eq '${TENANT_ID}'" \
  --headers "Authorization=Bearer ${GRAPH_TOKEN}"

# Active alerts
az rest --method GET \
  --url "${BETA_BASE}/managedTenantAlerts?$filter=tenantId eq '${TENANT_ID}' and status eq 'active'" \
  --headers "Authorization=Bearer ${GRAPH_TOKEN}"

# Device compliance
az rest --method GET \
  --url "${BETA_BASE}/managedDeviceCompliances?$filter=tenantId eq '${TENANT_ID}'" \
  --headers "Authorization=Bearer ${GRAPH_TOKEN}"
```

### Step 8: Generate Customer Handover Checklist

Write `tenant-{domain}-handover.md`:

```
## Customer Onboarding Complete — {Company Name}

Tenant: {domain}.onmicrosoft.com
Tenant ID: {tenant-id}
Onboarded: {timestamp}
Managed by: {MSP Name}

### ✅ What Was Configured

**Microsoft 365 Tenant**
- [x] M365 tenant created (CSP — Business Premium × {n})
- [x] Custom domain added and verified: {custom-domain}
- [x] Security baseline applied:
      - Break-glass accounts (2 accounts, credentials in vault)
      - Security defaults disabled
      - CA001: MFA for all users [Report-Only — enable {date + 7 days}]
      - CA002: MFA + Compliant Device for admins [Report-Only]
      - CA003: Block legacy authentication [Enforced]
      - CA004: Block high-risk sign-ins [Report-Only]
      - PIM: Admin roles set to eligible-only
- [x] DKIM enabled for {custom-domain}
- [x] DMARC set to p=none (monitoring phase)

**Azure Infrastructure** [if applicable]
- [x] Subscription: {subscription-name} ({subscription-id})
- [x] Management Group: {customer-mg}
- [x] Defender for Cloud: All Standard plans enabled
- [x] Budget: ${budget-amount}/month with 80% alert
- [x] Azure Policy: Security Benchmark + tag governance

**MSP Management Access**
- [x] GDAP Relationship: {relationship-name}
      Expires: {expiry-date} | Auto-extend: {duration}
      Roles: Security Admin, Security Reader, Global Reader, Helpdesk Admin, User Admin, Exchange Admin
- [x] Azure Lighthouse delegation deployed to {subscription-name}
- [x] M365 Lighthouse: Tenant enrolled and visible
- [x] Management templates: MFA for Admins, Block Legacy Auth deployed

### ⚠️ Actions Required by Customer (within 7 days)

1. **Reset break-glass passwords** via secure channel (receive from MSP)
2. **Register FIDO2 security keys** for break-glass accounts (no phone MFA)
3. **Review CA001 report-only sign-in logs** — confirm no legitimate apps broken
4. **Enable CA001 (MFA for all users)** after review: {link-to-ca-portal}
5. **Enable CA002 (MFA + compliant device for admins)** after review
6. **Set up DMARC reporting mailbox**: dmarc@{custom-domain}

### ⚠️ Actions Required by MSP (within 30 days)

1. Promote CA001 and CA002 from Report-Only to Enabled
2. Promote DMARC from p=none to p=quarantine after reviewing reports
3. Remove temporary MSP Owner RBAC from Azure subscription (Lighthouse delegation replaces it)
4. Add tenant to monthly Lighthouse health report: /lighthouse-operations:lighthouse-report

### MSP Support Contacts

Your managed IT services: {MSP Name}
Email: {msp-support-email}
Phone: {msp-support-phone}
Portal: {msp-portal-url}

Service desk ticketing: {ticketing-system-url}
```

### Step 9: Final Verification Output

```
## Onboarding Complete — {Company Name}

M365 Tenant:     ✅ Provisioned and secured
Custom Domain:   ✅ {custom-domain} (DKIM + DMARC configured)
GDAP:            ✅ Active — expires {date} (auto-extend {n} days)
Azure:           ✅ Subscription delegated via Lighthouse
Lighthouse:      ✅ Tenant visible in MSP Lighthouse portal
Management:      ✅ Baseline templates deployed

Handover document: tenant-{domain}-handover.md

This customer is ready for steady-state MSP management.
Add to monthly report scope: /lighthouse-operations:lighthouse-report
```

## Arguments

- `--tenant-id <id>`: Customer tenant ID
- `--subscription-id <id>`: Azure subscription to delegate (optional)
- `--skip-azure`: Skip Azure Lighthouse delegation step
- `--skip-m365`: Skip M365 Lighthouse template deployment
