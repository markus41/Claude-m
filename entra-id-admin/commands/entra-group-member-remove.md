---
name: entra-group-member-remove
description: Remove one or more members from an Entra ID group
argument-hint: "<group-id-or-name> --members <upn1,upn2,...> [--as-owner]"
allowed-tools:
  - Read
  - Write
  - Bash
---

# Remove Members from Entra ID Group

Remove users (or service principals/groups) from an existing Entra ID group.

## Steps

### 1. Resolve Group

- Accept display name or object ID
- Check for dynamic group: error if `groupTypes` contains `DynamicMembership`

### 2. Resolve Member Object IDs

For each `--members` value, resolve UPN → object ID via `GET /users/{upn}?$select=id`.

### 3. Remove Members

For each member:
```
DELETE https://graph.microsoft.com/v1.0/groups/{groupId}/members/{memberId}/$ref
```

Send these sequentially — the endpoint doesn't support batch member removal.
Honor 429 throttling between requests.

### 4. Remove as Owners (if --as-owner)

```
DELETE https://graph.microsoft.com/v1.0/groups/{groupId}/owners/{memberId}/$ref
```

Warn if this would leave the group with 0 owners.

### 5. Display Output

```
Members removed from group
─────────────────────────────────────────────────────────────────
Group:    Project Phoenix Team (<group-id>)
─────────────────────────────────────────────────────────────────
Removed:
  ✓ jane.smith@contoso.com (Jane Smith)
  ✓ bob.jones@contoso.com (Bob Jones)
  ✗ notfound@contoso.com — User not found
─────────────────────────────────────────────────────────────────
2 members removed, 1 error
```

## Error Handling

| Code | Fix |
|------|-----|
| `404` on DELETE | Member not in group — safe to skip |
| `400 DynamicGroup` | Cannot remove from dynamic group |
| `403` | Add `GroupMember.ReadWrite.All` scope |
