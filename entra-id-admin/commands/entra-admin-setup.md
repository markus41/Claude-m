---
name: entra-admin-setup
description: Configure authentication and verify permissions for Entra ID administration
argument-hint: "[--tenant <tenant-id>] [--check-only] [--app-id <app-id>]"
allowed-tools:
  - Read
  - Write
  - Bash
---

# Entra ID Admin Setup

Verify the environment is correctly configured for Entra ID administration via Microsoft Graph.
This command checks authentication, validates required scopes, and confirms the calling principal has the permissions needed to use all plugin commands.

## Steps

### 1. Resolve Tenant

If `--tenant` is provided, use it. Otherwise:
- Check for `AZURE_TENANT_ID` environment variable
- Check `~/.azure/tenantId` from `az account show`
- Run `az account show --query tenantId -o tsv` via Bash
- If still not found, prompt: "Enter your Microsoft Entra tenant ID or domain (e.g., contoso.onmicrosoft.com):"

### 2. Verify Authentication

Run: `az account show --query "{tenantId: tenantId, user: user.name, cloudName: environmentName}" -o json`

If this fails (not logged in), show:
```
Not authenticated. Sign in with:
  az login --tenant <tenant-id>

For app-only (service principal):
  az login --service-principal -u <app-id> -p <cert-or-secret> --tenant <tenant-id>
```

### 3. Test Graph API Access

Run a lightweight test call:
```
GET https://graph.microsoft.com/v1.0/organization?$select=id,displayName,verifiedDomains
Authorization: Bearer $(az account get-access-token --resource https://graph.microsoft.com --query accessToken -o tsv)
```

### 4. Check Required Scopes

For delegated access, check `me/memberOf` for required Entra roles.
For app-only, check the service principal's app role assignments.

Report each scope/role status:
```
Required Permissions Check
─────────────────────────────────────────────────────────────────
 Capability                  Permission                    Status
 ─────────────────────────────────────────────────────────────────
 User management             User.ReadWrite.All            ✓ Granted
 Group management            Group.ReadWrite.All           ✓ Granted
 Role assignments            RoleManagement.ReadWrite      ✓ Granted
 PIM                         PrivilegedAccess.ReadWrite    ✗ Missing
 Auth methods                UserAuthMethod.ReadWrite.All  ✓ Granted
 Entitlement management      EntitlementMgmt.ReadWrite.All ✗ Missing
 Licenses                    LicenseAssignment.ReadWrite   ✓ Granted
─────────────────────────────────────────────────────────────────
```

### 5. Detect PIM and Entitlement License

Test if PIM is available:
```
GET https://graph.microsoft.com/beta/roleManagement/directory/roleEligibilitySchedules?$top=1
```
- 403 → PIM not licensed or insufficient scope
- 200/empty → PIM available

Test if Entitlement Management is available:
```
GET https://graph.microsoft.com/v1.0/identityGovernance/entitlementManagement/catalogs?$top=1
```

### 6. Display Summary

```
Entra ID Admin Setup Complete
─────────────────────────────────────────────────────────────────
Tenant:         contoso.onmicrosoft.com (<tenant-id>)
Principal:      admin@contoso.com (delegated)
Cloud:          AzureCloud
Graph API:      ✓ Reachable

Features Available
  Core admin (users/groups/roles/licenses): ✓ Ready
  PIM (eligible assignments/activation):    ✓ Ready
  Entitlement Management (access packages): ✗ Requires P2 license

Missing permissions (if any):
  Add scope 'PrivilegedAccess.ReadWrite.AzureResources' to your app registration
─────────────────────────────────────────────────────────────────
```

## Azure CLI Quick Verification

```bash
# Check current login context
az account show --query "{tenantId:tenantId, user:user.name, cloud:environmentName}" -o json

# Get a Graph token to verify access
az account get-access-token --resource https://graph.microsoft.com --query accessToken -o tsv

# Quick test: list tenant organization details
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/organization?\$select=id,displayName,verifiedDomains" \
  --query "value[0].{Name:displayName, Domains:verifiedDomains[].name}"

# List all app registrations (verifies Entra read access)
az ad app list --query "[].{Name:displayName, AppId:appId}" --output table --all

# List all service principals
az ad sp list --query "[].{Name:displayName, AppId:appId}" --output table --all
```

## Error Handling

| Error | Resolution |
|-------|-----------|
| `az: command not found` | Install Azure CLI: https://learn.microsoft.com/cli/azure/install-azure-cli |
| `AADSTS700082` | Refresh token expired — run `az login` again |
| Graph returns 401 | Token expired or wrong resource scope; re-acquire token |
| `403` on Graph | Principal missing required role or app permission not consented |
