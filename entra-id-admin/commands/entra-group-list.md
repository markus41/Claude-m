---
name: entra-group-list
description: List and filter Entra ID groups by type, name pattern, owner, or member
argument-hint: "[--type m365|security|dynamic|all] [--search <name-pattern>] [--owner <upn>] [--member <upn>] [--no-owners] [--top <n>]"
allowed-tools:
  - Read
  - Write
  - Bash
---

# List Entra ID Groups

List groups with flexible filtering. Useful for auditing group sprawl, finding orphaned groups, and inventorying licensing groups.

## Steps

### 1. Build Filter Query

Construct `$filter` based on arguments:

- `--type m365`: `groupTypes/any(c:c eq 'Unified')`
- `--type security`: `securityEnabled eq true and mailEnabled eq false`
- `--type dynamic`: `groupTypes/any(c:c eq 'DynamicMembership')`
- `--search`: `startsWith(displayName,'<pattern>')` or use `$search="displayName:<pattern>"` with `ConsistencyLevel: eventual` header
- `--owner` + resolved userId: `GET /users/{upn}/ownedObjects/microsoft.graph.group`
- `--member` + resolved userId: `GET /users/{upn}/memberOf/microsoft.graph.group`
- `--no-owners`: requires advanced query — `NOT owners/$count eq 0` with `$count=true` and `ConsistencyLevel: eventual`

### 2. Execute Query

```
GET https://graph.microsoft.com/v1.0/groups
  ?$filter=<constructed-filter>
  &$select=id,displayName,groupTypes,mailEnabled,securityEnabled,membershipRule,
    visibility,createdDateTime,description,mail
  &$top=<--top or 100>
  &$orderby=displayName asc
```

For `--no-owners`:
```
GET https://graph.microsoft.com/v1.0/groups
  ?$filter=NOT owners/$count eq 0
  &$count=true
  &ConsistencyLevel=eventual
  &$select=id,displayName,groupTypes,createdDateTime
```

### 3. For --owner query

```
GET https://graph.microsoft.com/v1.0/users/{userId}/ownedObjects/microsoft.graph.group
  ?$select=id,displayName,groupTypes,createdDateTime
```

### 4. Display Output

```
Entra ID Groups
─────────────────────────────────────────────────────────────────
Filter: Security groups only | Total: 47
─────────────────────────────────────────────────────────────────
 #   Display Name                      Type       Created
 1   SG-DevTeam-Prod                   Security   2024-01-15
 2   SG-Dept-Engineering               Dynamic    2023-08-01
 3   SG-GlobalAdmins                   Security*  2022-03-10  ← role-assignable
 4   SG-Readers                        Security   2024-06-20
─────────────────────────────────────────────────────────────────
Showing 4 of 47 groups. Use --top 200 for more.
```

For orphaned groups (`--no-owners`):
```
⚠ Groups with no owners (orphaned): 12
  Action: Assign an owner or delete unused groups.
```

## Azure CLI Alternative

```bash
# List all groups
az ad group list \
  --query "[].{Name:displayName, ID:id, Type:groupTypes}" \
  --output table

# Filter by display name
az ad group list --display-name "SG-Dev" --output table

# Show a specific group
az ad group show --group "SG-DevTeam-Prod"

# List members of a group
az ad group member list --group "SG-DevTeam-Prod" \
  --query "[].{Name:displayName, UPN:userPrincipalName}" --output table

# Check if a user is a member
az ad group member check --group "SG-DevTeam-Prod" --member-id <user-object-id>

# List group owners
az ad group owner list --group "SG-DevTeam-Prod"
```

## Error Handling

| Code | Fix |
|------|-----|
| `400 ConsistencyLevel` | Advanced queries require `ConsistencyLevel: eventual` header |
| `403` | Add `Group.Read.All` scope |
