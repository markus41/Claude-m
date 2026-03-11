---
name: entra-admin-unit-add
description: Add a member (user/group) to an admin unit, or assign a scoped admin role within an admin unit
argument-hint: "--au <au-id-or-name> [--member <upn-or-id>] [--admin <upn-or-id>] [--role <role-name-or-id>]"
allowed-tools:
  - Read
  - Write
  - Bash
---

# Add Member or Scoped Admin to Administrative Unit

Either add a user/group as a **member** of an admin unit, or assign a **scoped admin role** to a user for that admin unit.

## Steps

### 1. Resolve Admin Unit

Accept AU display name or object ID.
`GET /administrativeUnits?$filter=displayName eq '<name>'&$select=id,displayName,membershipType`

### 2. Resolve Member (if --member)

Resolve UPN/name to object ID:
- Users: `GET /users/{upn}?$select=id`
- Groups: `GET /groups?$filter=displayName eq '<name>'&$select=id`

### 3. Add as Member

```
POST https://graph.microsoft.com/v1.0/administrativeUnits/{auId}/members/$ref
{ "@odata.id": "https://graph.microsoft.com/v1.0/users/{userId}" }
```

For groups:
```
{ "@odata.id": "https://graph.microsoft.com/v1.0/groups/{groupId}" }
```

Note: Dynamic AUs manage membership automatically — manually adding a member to a dynamic AU is blocked.

### 4. Assign Scoped Role (if --admin + --role)

Resolve role definition ID. Then:
```
POST https://graph.microsoft.com/v1.0/administrativeUnits/{auId}/scopedRoleMembers
{
  "roleId": "<role-definition-id>",
  "roleMemberInfo": {
    "id": "<admin-user-id>",
    "@odata.type": "#microsoft.graph.identity"
  }
}
```

### 5. Display Output

**Add member:**
```
Member added to admin unit
─────────────────────────────────────────────────────────────────
Admin Unit:  APAC Region (<au-id>)
Member:      jane.smith@contoso.com (Jane Smith) ✓
─────────────────────────────────────────────────────────────────
```

**Assign scoped role:**
```
Scoped role assigned
─────────────────────────────────────────────────────────────────
Admin Unit:  APAC Region (<au-id>)
Admin:       bob.ops@contoso.com (Bob Ops)
Role:        User Administrator (scoped to APAC Region only)
─────────────────────────────────────────────────────────────────
Bob Ops can now manage users within the APAC Region AU only.
```

## Azure CLI Alternative

```bash
# Add user to admin unit
az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/administrativeUnits/<au-id>/members/\$ref" \
  --body '{"@odata.id":"https://graph.microsoft.com/v1.0/users/<user-id>"}'

# Assign scoped role within admin unit
az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/administrativeUnits/<au-id>/scopedRoleMembers" \
  --body '{
    "roleId": "<role-definition-id>",
    "roleMemberInfo": {"id": "<admin-user-id>"}
  }'

# List admin unit members
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/administrativeUnits/<au-id>/members" \
  --query "value[].{Name:displayName, ID:id}" --output table
```

## Error Handling

| Code | Fix |
|------|-----|
| `400 DynamicGroup` | Cannot manually add member to dynamic AU |
| `400 DuplicateEntry` | Member already in this AU |
| `403` | Add `Directory.ReadWrite.All` scope |
