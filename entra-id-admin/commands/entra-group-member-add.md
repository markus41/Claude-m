---
name: entra-group-member-add
description: Add one or more users (or groups/service principals) to an Entra ID group
argument-hint: "<group-id-or-name> --members <upn1,upn2,...> [--as-owner]"
allowed-tools:
  - Read
  - Write
  - Bash
---

# Add Members to Entra ID Group

Add users, service principals, or nested groups to an existing Entra ID group.
Supports batch adding up to 20 members at once.

## Steps

### 1. Resolve Group

- Accept group display name or object ID
- `GET /groups?$filter=displayName eq '<name>'&$select=id,displayName,groupTypes`
- Check `groupTypes` — if `DynamicMembership`, error: "Cannot manually add members to a dynamic group. Modify the membership rule instead."

### 2. Resolve Member Object IDs

For each comma-separated value in `--members`:
- If looks like UPN: `GET /users/{upn}?$select=id,displayName`
- If looks like GUID: use directly
- Collect all object IDs; fail fast with clear message for any not found

### 3. Add Members (batch of 20)

For each group of up to 20:
```
PATCH https://graph.microsoft.com/v1.0/groups/{groupId}
{
  "members@odata.bind": [
    "https://graph.microsoft.com/v1.0/directoryObjects/{id1}",
    "https://graph.microsoft.com/v1.0/directoryObjects/{id2}"
  ]
}
```

### 4. Add as Owners (if --as-owner)

For each member, also add as group owner:
```
POST https://graph.microsoft.com/v1.0/groups/{groupId}/owners/$ref
{ "@odata.id": "https://graph.microsoft.com/v1.0/users/{userId}" }
```

### 5. Display Output

```
Members added to group
─────────────────────────────────────────────────────────────────
Group:    Project Phoenix Team (<group-id>)
─────────────────────────────────────────────────────────────────
Added:
  ✓ jane.smith@contoso.com (Jane Smith)
  ✓ bob.jones@contoso.com (Bob Jones)
  ✓ alice.wu@contoso.com (Alice Wu)
  ✗ notfound@contoso.com — User not found
─────────────────────────────────────────────────────────────────
3 members added, 1 error
```

## Error Handling

| Code | Fix |
|------|-----|
| `400 DynamicGroup` | Cannot add to dynamic group — update rule instead |
| `400 One or more users already members` | Member already in group — safe to ignore |
| `403` | Add `GroupMember.ReadWrite.All` or `Group.ReadWrite.All` scope |
| `404` on user | User not found — verify UPN |
