---
name: entra-role-remove
description: Remove a directory role assignment from a user, group, or service principal
argument-hint: "--role <role-name-or-id> --principal <upn-or-id> [--scope /|/administrativeUnits/<au-id>]"
allowed-tools:
  - Read
  - Write
  - Bash
---

# Remove Entra ID Directory Role Assignment

Remove an active (non-PIM) directory role assignment from a principal.

## Steps

### 1. Resolve Role and Principal (same as entra-role-assign)

Resolve role definition ID and principal object ID.

### 2. Find Assignment ID

```
GET https://graph.microsoft.com/v1.0/roleManagement/directory/roleAssignments
  ?$filter=principalId eq '{principalId}'
    and roleDefinitionId eq '{roleDefId}'
    and directoryScopeId eq '{scope}'
  &$select=id
```

If no matching assignment found: inform user the role is not actively assigned.
If only a PIM eligible assignment exists: redirect to `entra-pim-assign` for removal.

### 3. Delete Assignment

```
DELETE https://graph.microsoft.com/v1.0/roleManagement/directory/roleAssignments/{assignmentId}
```

### 4. Display Output

```
Role removed
─────────────────────────────────────────────────────────────────
Principal:   Jane Smith (jane.smith@contoso.com)
Role:        User Administrator
Scope:       Tenant-wide (/)
Status:      Removed ✓
─────────────────────────────────────────────────────────────────
```

## Error Handling

| Code | Fix |
|------|-----|
| `404` | Assignment not found — may already be removed, or is a PIM eligible assignment |
| `403` | Add `RoleManagement.ReadWrite.Directory` scope |
