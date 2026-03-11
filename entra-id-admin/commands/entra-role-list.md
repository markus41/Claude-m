---
name: entra-role-list
description: List all role assignments, show who has which roles, or list all roles available in the tenant
argument-hint: "[--roles] [--assignments] [--principal <upn-or-id>] [--role <role-name-or-id>] [--pim] [--scope <scope>]"
allowed-tools:
  - Read
  - Write
  - Bash
---

# List Entra ID Role Assignments

Audit who holds which directory roles, including PIM eligible assignments.
Use to discover over-privileged accounts or review before access reviews.

## Steps

### Mode 1: List Available Roles (--roles)

```
GET https://graph.microsoft.com/v1.0/roleManagement/directory/roleDefinitions
  ?$filter=isEnabled eq true
  &$select=id,displayName,isBuiltIn,description
  &$orderby=displayName asc
```

Output role catalog.

### Mode 2: List All Active Assignments (default or --assignments)

```
GET https://graph.microsoft.com/v1.0/roleManagement/directory/roleAssignments
  ?$expand=principal($select=id,displayName,userPrincipalName,servicePrincipalType),
           roleDefinition($select=displayName)
  &$filter=directoryScopeId eq '/'
```

Also get PIM active (--pim):
```
GET https://graph.microsoft.com/beta/roleManagement/directory/roleAssignmentSchedules
  ?$filter=assignmentType eq 'Activated'
  &$expand=principal($select=id,displayName,userPrincipalName),roleDefinition($select=displayName)
```

### Mode 3: Filter by Principal (--principal)

All roles for a specific user:
```
GET /roleManagement/directory/roleAssignments
  ?$filter=principalId eq '{userId}'
  &$expand=roleDefinition($select=displayName)
```

PIM eligible roles for user:
```
GET /beta/roleManagement/directory/roleEligibilitySchedules
  ?$filter=principalId eq '{userId}'
  &$expand=roleDefinition($select=displayName)
```

### Mode 4: Filter by Role (--role)

All principals with a specific role:
```
GET /roleManagement/directory/roleAssignments
  ?$filter=roleDefinitionId eq '{roleDefId}'
  &$expand=principal($select=id,displayName,userPrincipalName)
```

### Display Output

```
Entra ID Role Assignments
─────────────────────────────────────────────────────────────────
Tenant:  contoso.onmicrosoft.com  |  Total active assignments: 24
─────────────────────────────────────────────────────────────────
 Role                         Principal               Type      PIM
 ─────────────────────────────────────────────────────────────────
 Global Administrator         Alice Admin             User      No
 Global Administrator         Break-Glass-01          User      No
 User Administrator           Jane Smith              User      Yes (active)
 Security Administrator       sec-sp@contoso.com      SP        No
 License Administrator        Bob Ops                 User      No
 Helpdesk Administrator       APAC Region (AU)        AU Scope  No
─────────────────────────────────────────────────────────────────
⚠ 2 permanent Global Administrators — consider moving to PIM eligible assignments
```

## Azure CLI Alternative

For **Azure RBAC** assignments:

```bash
# List all role assignments for a user
az role assignment list --assignee jane.smith@contoso.com --output table

# List assignments at a scope
az role assignment list --scope /subscriptions/<sub-id> --output table

# List all role definitions (built-in + custom)
az role definition list \
  --query "[?contains(roleName,'Contributor')]" --output table

# List custom roles only
az role definition list --custom-role-only true --output table
```

For **Entra ID directory roles**:

```bash
# List activated directory roles and their members
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/directoryRoles" \
  --query "value[].{Role:displayName, ID:id}" --output table

# List members of a specific directory role
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/directoryRoles/<role-id>/members" \
  --query "value[].{Name:displayName, UPN:userPrincipalName}" --output table
```

## Error Handling

| Code | Fix |
|------|-----|
| `403` | Add `RoleManagement.Read.Directory` scope |
| `403` on PIM | Add `PrivilegedAccess.Read.AzureResources` scope |
