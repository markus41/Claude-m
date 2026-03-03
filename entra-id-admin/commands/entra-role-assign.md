---
name: entra-role-assign
description: Assign a directory role to a user, group, or service principal — optionally scoped to an admin unit
argument-hint: "--role <role-name-or-id> --principal <upn-or-id> [--scope /|/administrativeUnits/<au-id>] [--permanent] [--duration <P30D>]"
allowed-tools:
  - Read
  - Write
  - Bash
---

# Assign Entra ID Directory Role

Assign a built-in or custom directory role to a user, group, or service principal. Supports tenant-wide and admin unit-scoped assignments.

## Steps

### 1. Resolve Role Definition

If `--role` is a display name (not a GUID):
```
GET https://graph.microsoft.com/v1.0/roleManagement/directory/roleDefinitions
  ?$filter=displayName eq '<role-name>'
  &$select=id,displayName,isBuiltIn
```

If multiple matches, show list and ask user to confirm which one.
If not found, show common role names from `references/role-assignments.md`.

### 2. Resolve Principal

- If UPN: `GET /users/{upn}?$select=id,displayName,userPrincipalName`
- If group name: `GET /groups?$filter=displayName eq '<name>'`
- If looks like app/SP: `GET /servicePrincipals?$filter=displayName eq '<name>'`

### 3. Validate Scope

- Default scope: `/` (tenant-wide)
- If `--scope /administrativeUnits/<au-id>` provided: validate AU exists
  - `GET /administrativeUnits/{auId}?$select=id,displayName`

### 4. Assign Role

```
POST https://graph.microsoft.com/v1.0/roleManagement/directory/roleAssignments
{
  "principalId": "<resolved-id>",
  "roleDefinitionId": "<resolved-role-id>",
  "directoryScopeId": "<scope>"
}
```

### 5. Handle PIM Preference

If PIM is available in the tenant and `--permanent` is NOT specified:
Ask: "Would you prefer to create a time-limited PIM eligible assignment instead of a permanent direct assignment? This is recommended for high-privilege roles."

If user wants PIM: redirect to `entra-pim-assign`.

### 6. Display Output

```
Role assigned
─────────────────────────────────────────────────────────────────
Principal:   Jane Smith (jane.smith@contoso.com)
Role:        User Administrator
Scope:       Tenant-wide (/)
Type:        Direct active assignment (permanent)
Assignment:  <assignment-id>
─────────────────────────────────────────────────────────────────
⚠ Recommendation: For privileged roles, use PIM eligible assignment
  instead of permanent direct assignment:
  /entra-id-admin:entra-pim-assign --role "User Administrator" --principal jane.smith@contoso.com
```

## Error Handling

| Code | Fix |
|------|-----|
| `400 DuplicateEntry` | Role already assigned to this principal at this scope |
| `403` | Add `RoleManagement.ReadWrite.Directory` scope |
| `400 PrivilegedRole` | Global Admin cannot be assigned via direct API in some tenants — use PIM |
