---
name: lighthouse-operations:lighthouse-setup
description: Configure partner tenant app registration for M365 Lighthouse access, verify GDAP connectivity, test Lighthouse API endpoints, and generate a readiness report showing which managed tenants are onboarded and accessible.
argument-hint: "[--partner-tenant-id <id>] [--check-only]"
allowed-tools:
  - Read
  - Write
  - Bash
  - AskUserQuestion
---

# Lighthouse Operations Setup

Configure and validate the partner tenant environment for Azure Lighthouse and M365 Lighthouse operations.

## Setup Flow

### Step 1: Collect Configuration

Ask for:
1. **Partner (managing) tenant ID**
2. **App registration client ID** (for Graph/ARM API calls)
3. **Auth method**: client secret, certificate, or interactive (`az login`)
4. **Scope**: Azure Lighthouse only, M365 Lighthouse only, or both

If `--check-only`, skip auth setup and go directly to Step 4.

### Step 2: Check Prerequisites

```bash
az --version                 # Required: 2.50+
az account show              # Verify logged in to partner tenant

# Check bicep
az bicep version             # Optional: auto-installs if missing

# Verify Graph API access
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/organization" \
  --headers "Authorization=Bearer $(az account get-access-token --resource https://graph.microsoft.com --query accessToken -o tsv)"
```

Report: ✅ Logged in as `{upn}` on tenant `{tenant-id}`, or ❌ with fix instructions.

### Step 3: Verify App Registration Permissions

If an app registration client ID is provided, check its configured API permissions:

```bash
# List app's current permissions
az ad app permission list --id {app-id} --output table

# Check for required permissions:
# Microsoft Graph:
#   ManagedTenants.Read.All
#   DelegatedAdminRelationship.ReadWrite.All
#   Directory.Read.All
# Azure Service Management:
#   user_impersonation (for ARM/Lighthouse)
```

Report missing permissions and provide the Graph API calls to add them:
```
POST https://graph.microsoft.com/v1.0/servicePrincipals/{sp-id}/appRoleAssignments
```

### Step 4: Enumerate Managed Tenants (M365 Lighthouse)

```bash
TOKEN=$(az account get-access-token --resource https://graph.microsoft.com --query accessToken -o tsv)

az rest --method GET \
  --url "https://graph.microsoft.com/beta/tenantRelationships/managedTenants/tenants?\$select=tenantId,displayName,tenantStatusInformation&\$orderby=displayName asc" \
  --headers "Authorization=Bearer ${TOKEN}"
```

Display table:
```
Tenant                       | Status        | Onboarded
-----------------------------|---------------|----------
Contoso Customer Inc.        | onBoarded     | 2026-01-15
Fabrikam Ltd.                | notOnBoarded  | —
Woodgrove Bank               | onBoardingFailed | 2026-02-01
```

### Step 5: Enumerate Azure Lighthouse Delegations

```bash
# List all delegated subscriptions visible from partner tenant
az account list --query "[?managedByTenants[0].tenantId=='${PARTNER_TENANT_ID}'].{id:id,name:name,state:state}" --output table
```

If results are empty, show how to deploy delegation:
```
No Azure Lighthouse delegations found.
To delegate a customer subscription, run:
  /lighthouse-operations:azure-lighthouse-delegate
```

### Step 6: Test GDAP Relationships

```bash
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/tenantRelationships/delegatedAdminRelationships?\$filter=status eq 'active'&\$select=id,displayName,customer,status,endDateTime&\$orderby=endDateTime asc" \
  --headers "Authorization=Bearer ${TOKEN}"
```

Flag:
- `status = expiring` → Renewal needed within 30 days
- `endDateTime < {today+30days}` → EXPIRING SOON
- `status = expired` → Already expired — access revoked

### Step 7: Write Configuration File

If configuration was collected in Step 1, write `.claude/lighthouse-operations.local.md`:

```yaml
---
partner_tenant_id: <tenant-id>
app_client_id: <client-id>
auth_method: azure-cli
azure_lighthouse_enabled: true
m365_lighthouse_enabled: true
---
```

### Step 8: Readiness Report

```
## Lighthouse Operations — Readiness Report

| Check | Status | Details |
|-------|--------|---------|
| Azure CLI login | ✅ | partner@contoso.com on tenant abc-123 |
| Graph API access | ✅ | Token acquired |
| M365 Managed Tenants | ✅ | 42 tenants (38 onboarded, 4 not onboarded) |
| Active GDAP Relationships | ✅ | 42 active (3 expiring in < 30 days) |
| Azure Lighthouse Delegations | ✅ | 15 subscriptions delegated |
| App Permissions | ⚠️ | Missing: DelegatedAdminRelationship.ReadWrite.All |

### Action Items:
1. Grant DelegatedAdminRelationship.ReadWrite.All to app registration
2. Review 3 expiring GDAP relationships: run /lighthouse-operations:gdap-manage
3. Onboard 4 remaining tenants: run /lighthouse-operations:lighthouse-onboard
```

## Arguments

- `--partner-tenant-id <id>`: Skip tenant ID question
- `--check-only`: Skip config writing; only run checks and report
