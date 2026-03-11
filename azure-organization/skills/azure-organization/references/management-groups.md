# Azure Management Groups — Reference

## Overview

Management groups are containers above subscriptions in the Azure resource hierarchy. They enable governance at scale by applying RBAC, Azure Policy, and cost management across multiple subscriptions. Management groups can be nested up to six levels deep (excluding the root management group and the subscription level). Every Azure AD tenant has a single root management group that cannot be deleted.

---

## REST API Endpoints

Base URL: `https://management.azure.com`
API Version: `2021-04-01`

### Management Group Operations

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|----------------------|----------------|-------|
| PUT | `/providers/Microsoft.Management/managementGroups/{groupId}` | Management Group Contributor | Body: group definition | Create or update management group |
| GET | `/providers/Microsoft.Management/managementGroups/{groupId}` | Reader | `$expand=children`, `$recurse=true` | Get group with optional children |
| GET | `/providers/Microsoft.Management/managementGroups` | Reader | `$skiptoken` | List all management groups |
| DELETE | `/providers/Microsoft.Management/managementGroups/{groupId}` | Management Group Contributor | — | Delete group (must be empty) |
| PATCH | `/providers/Microsoft.Management/managementGroups/{groupId}` | Management Group Contributor | Body: patch object | Update display name or parent |

### Subscription Operations Under Management Groups

| Method | Endpoint | Required Permissions | Notes |
|--------|----------|----------------------|-------|
| PUT | `/providers/Microsoft.Management/managementGroups/{groupId}/subscriptions/{subscriptionId}` | Management Group Contributor + Contributor on sub | Move subscription to group |
| DELETE | `/providers/Microsoft.Management/managementGroups/{groupId}/subscriptions/{subscriptionId}` | Management Group Contributor | Remove subscription from group |
| GET | `/providers/Microsoft.Management/managementGroups/{groupId}/subscriptions` | Reader | List subscriptions in group |

---

## Azure CLI — Full CRUD Commands

### Create Management Groups

```bash
# Create top-level management group under root
az account management-group create \
  --name "mg-contoso" \
  --display-name "Contoso"

# Create child management group
az account management-group create \
  --name "mg-platform" \
  --display-name "Platform" \
  --parent-id "/providers/Microsoft.Management/managementGroups/mg-contoso"

# Create full CAF hierarchy
az account management-group create --name "mg-platform" --display-name "Platform" \
  --parent-id "/providers/Microsoft.Management/managementGroups/mg-contoso"
az account management-group create --name "mg-identity" --display-name "Identity" \
  --parent-id "/providers/Microsoft.Management/managementGroups/mg-platform"
az account management-group create --name "mg-connectivity" --display-name "Connectivity" \
  --parent-id "/providers/Microsoft.Management/managementGroups/mg-platform"
az account management-group create --name "mg-management" --display-name "Management" \
  --parent-id "/providers/Microsoft.Management/managementGroups/mg-platform"
az account management-group create --name "mg-landing-zones" --display-name "Landing Zones" \
  --parent-id "/providers/Microsoft.Management/managementGroups/mg-contoso"
az account management-group create --name "mg-corp" --display-name "Corp" \
  --parent-id "/providers/Microsoft.Management/managementGroups/mg-landing-zones"
az account management-group create --name "mg-online" --display-name "Online" \
  --parent-id "/providers/Microsoft.Management/managementGroups/mg-landing-zones"
az account management-group create --name "mg-sandbox" --display-name "Sandbox" \
  --parent-id "/providers/Microsoft.Management/managementGroups/mg-contoso"
az account management-group create --name "mg-decommissioned" --display-name "Decommissioned" \
  --parent-id "/providers/Microsoft.Management/managementGroups/mg-contoso"
```

### List and Show Management Groups

```bash
# List all management groups
az account management-group list -o table

# Show a specific group with children (one level)
az account management-group show \
  --name "mg-contoso" \
  --expand children

# Show full hierarchy recursively
az account management-group show \
  --name "mg-contoso" \
  --expand children \
  --recurse \
  -o json

# Show management group entities (flat list of all groups and subscriptions)
az account management-group entities list -o table
```

### Update Management Groups

```bash
# Update display name
az account management-group update \
  --name "mg-platform" \
  --display-name "Platform Services"

# Move management group to new parent
az account management-group update \
  --name "mg-sandbox" \
  --parent-id "/providers/Microsoft.Management/managementGroups/mg-contoso"
```

### Delete Management Groups

```bash
# Delete management group (must have no children or subscriptions)
az account management-group delete --name "mg-old-group"
```

**Deletion requirements**:
- No child management groups
- No subscriptions assigned
- No policy assignments at the group scope (assignments are auto-deleted)
- No role assignments at the group scope (assignments are auto-deleted)

### Subscription Operations

```bash
# Add subscription to management group
az account management-group subscription add \
  --name "mg-production" \
  --subscription "00000000-0000-0000-0000-000000000000"

# Remove subscription from management group (returns to root)
az account management-group subscription remove \
  --name "mg-production" \
  --subscription "00000000-0000-0000-0000-000000000000"

# List subscriptions in management group
az account management-group subscription show-sub-under-mg \
  --name "mg-production"

# Move subscription between management groups
# (add to new group — automatically removes from old group)
az account management-group subscription add \
  --name "mg-target-group" \
  --subscription "00000000-0000-0000-0000-000000000000"
```

---

## PowerShell — Management Group Operations

```powershell
# Create management group
New-AzManagementGroup -GroupName "mg-contoso" -DisplayName "Contoso"

# Create with parent
New-AzManagementGroup -GroupName "mg-platform" -DisplayName "Platform" `
  -ParentId "/providers/Microsoft.Management/managementGroups/mg-contoso"

# List all management groups
Get-AzManagementGroup | Format-Table Name, DisplayName, Id

# Show hierarchy recursively
Get-AzManagementGroup -GroupName "mg-contoso" -Expand -Recurse

# Update display name
Update-AzManagementGroup -GroupName "mg-platform" -DisplayName "Platform Services"

# Move management group
Update-AzManagementGroup -GroupName "mg-sandbox" `
  -ParentId "/providers/Microsoft.Management/managementGroups/mg-contoso"

# Move subscription
New-AzManagementGroupSubscription -GroupName "mg-production" `
  -SubscriptionId "00000000-0000-0000-0000-000000000000"

# Remove subscription
Remove-AzManagementGroupSubscription -GroupName "mg-production" `
  -SubscriptionId "00000000-0000-0000-0000-000000000000"

# Delete management group
Remove-AzManagementGroup -GroupName "mg-old-group"
```

---

## Hierarchy Visualization Script

```bash
#!/bin/bash
# Visualize management group hierarchy as a tree

ROOT_MG="${1:-$(az account show --query 'tenantId' -o tsv)}"

function print_mg_tree() {
  local mg_name="$1"
  local indent="$2"

  local display_name
  display_name=$(az account management-group show --name "$mg_name" \
    --query "displayName" -o tsv 2>/dev/null)

  echo "${indent}├── ${display_name} (${mg_name})"

  # List child management groups
  local children
  children=$(az account management-group show --name "$mg_name" --expand children \
    --query "children[?type=='Microsoft.Management/managementGroups'].name" -o tsv 2>/dev/null)

  for child in $children; do
    print_mg_tree "$child" "${indent}│   "
  done

  # List child subscriptions
  local subs
  subs=$(az account management-group show --name "$mg_name" --expand children \
    --query "children[?type=='/subscriptions'].displayName" -o tsv 2>/dev/null)

  while IFS= read -r sub; do
    [ -n "$sub" ] && echo "${indent}│   └── [Sub] ${sub}"
  done <<< "$subs"
}

echo "Tenant Root"
print_mg_tree "$ROOT_MG" ""
```

---

## RBAC Inheritance Rules

| Principle | Behavior |
|---|---|
| Roles assigned at management group scope apply to all children | Yes — applies to child management groups, subscriptions, resource groups, and resources |
| Child scopes can add additional roles | Yes — additive only; child scope cannot remove parent-level roles |
| Deny assignments override role assignments | Yes — deny assignments at any scope take precedence |
| Classic administrators are not inherited | Correct — only ARM RBAC roles are inherited |
| Condition-based access is inherited | Yes — ABAC conditions on role assignments flow down |

### Common RBAC Patterns at Management Group Scope

```bash
# Global Reader for security team
az role assignment create \
  --assignee "sg-security@contoso.com" \
  --role "Reader" \
  --scope "/providers/Microsoft.Management/managementGroups/mg-contoso"

# Policy Contributor for governance team
az role assignment create \
  --assignee "sg-governance@contoso.com" \
  --role "Resource Policy Contributor" \
  --scope "/providers/Microsoft.Management/managementGroups/mg-contoso"

# Cost Management Reader for finance
az role assignment create \
  --assignee "sg-finance@contoso.com" \
  --role "Cost Management Reader" \
  --scope "/providers/Microsoft.Management/managementGroups/mg-contoso"

# Contributor for platform team on platform management group only
az role assignment create \
  --assignee "sg-platform-ops@contoso.com" \
  --role "Contributor" \
  --scope "/providers/Microsoft.Management/managementGroups/mg-platform"

# List all role assignments at management group scope
az role assignment list \
  --scope "/providers/Microsoft.Management/managementGroups/mg-contoso" \
  --include-inherited \
  -o table
```

---

## Limits and Quotas

| Resource | Limit | Notes |
|---|---|---|
| Management groups per directory | 10,000 | Includes root management group |
| Hierarchy depth | 6 levels | Excluding root and subscription level |
| Direct children per group | No hard limit | Practical limit ~1,000 for performance |
| Subscriptions per management group | No hard limit | Direct children only |
| Policy assignments per management group | 200 | Same limit as subscription scope |
| Role assignments per management group | 2,000 | Includes inherited |
| Custom policy definitions per management group | 500 | Shared with child scopes |
| Management group name | 90 characters max | Alphanumeric, hyphens, underscores, periods |

---

## Error Codes

| Code | Meaning | Remediation |
|------|---------|-------------|
| `ManagementGroupNotFound` | Group name or ID incorrect | Verify group name; list groups with `az account management-group list` |
| `ManagementGroupAlreadyExists` | Name collision | Choose a different unique name |
| `ManagementGroupHasChildren` | Cannot delete group with children | Move all subscriptions and child groups first |
| `MaxManagementGroupDepthExceeded` | Hierarchy exceeds 6 levels | Flatten hierarchy; consolidate management groups |
| `SubscriptionNotFound` | Subscription ID incorrect or inaccessible | Verify subscription ID; check RBAC on subscription |
| `AuthorizationFailed` | Insufficient permissions | Requires Management Group Contributor + Contributor on subscription for moves |
| `ConcurrentOperationConflict` | Another operation is modifying the same group | Retry after a brief delay |

---

## Common Patterns and Gotchas

**1. Root management group requires elevated access**
Global Administrators must explicitly enable "Access management for Azure resources" in Azure AD properties before they can manage the root management group. This is a one-time toggle that grants User Access Administrator at the root scope.

**2. Moving subscriptions is not instant**
Moving a subscription between management groups is asynchronous. Policy evaluation and RBAC inheritance may take up to 30 minutes to propagate after a move. Plan subscription moves during maintenance windows.

**3. Policy assignments are NOT inherited when listing**
`az policy assignment list --scope <mg>` shows only assignments directly at that scope. To see effective assignments (including inherited), query at the subscription or resource group scope and use `--include-inherited`.

**4. Deleting a management group does not delete subscriptions**
Subscriptions in a deleted management group are automatically moved to the parent group. Always verify where subscriptions will land before deleting a group.

**5. Management group names are globally unique within a tenant**
Once a management group name is used, it cannot be reused even after deletion (for a retention period). Use a clear naming convention with an organizational prefix to avoid collisions.

**6. Avoid deep hierarchies**
Although 6 levels are supported, best practice is to keep hierarchies at 3-4 levels. Deeper hierarchies complicate policy evaluation, RBAC debugging, and cognitive load for operators.
