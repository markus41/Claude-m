---
name: entra-admin-unit-create
description: Create an administrative unit for scoped delegation in Entra ID
argument-hint: "<display-name> [--description <text>] [--dynamic-rule <rule>] [--restricted] [--hidden]"
allowed-tools:
  - Read
  - Write
  - Bash
---

# Create Administrative Unit

Create an administrative unit (AU) to scope administrator permissions. Admins assigned roles scoped to an AU can only manage the users and groups within it.

Requires `Directory.ReadWrite.All` scope.

## Steps

### 1. Parse Arguments

- `<display-name>` — required
- `--description` — optional description
- `--dynamic-rule` — dynamic membership rule (e.g., `(user.department -eq "APAC")`)
- `--restricted` — create a Restricted Management AU (`isMemberManagementRestricted: true`)
- `--hidden` — set `visibility: HiddenMembership`

### 2. Create AU

**Static AU:**
```
POST https://graph.microsoft.com/v1.0/administrativeUnits
{
  "displayName": "<name>",
  "description": "<description>",
  "visibility": "Public"
}
```

**Dynamic AU (beta):**
```
POST https://graph.microsoft.com/beta/administrativeUnits
{
  "displayName": "<name>",
  "description": "<description>",
  "membershipType": "Dynamic",
  "membershipRule": "<--dynamic-rule>",
  "membershipRuleProcessingState": "On"
}
```

**Restricted Management AU:**
```json
{
  "displayName": "<name>",
  "isMemberManagementRestricted": true
}
```

### 3. Display Output

```
Administrative unit created
─────────────────────────────────────────────────────────────────
Display Name:     APAC Region
Object ID:        <au-id>
Type:             Dynamic
Visibility:       Public
Restricted:       No
─────────────────────────────────────────────────────────────────
Membership Rule:  (user.department -eq "APAC")
Processing:       On (members will populate within minutes)
─────────────────────────────────────────────────────────────────
Next steps:
  Add members:    /entra-id-admin:entra-admin-unit-add --au <au-id> --member <upn>
  Assign scoped role: /entra-id-admin:entra-admin-unit-add --au <au-id> --admin <upn> --role "User Administrator"
```

## Azure CLI Alternative

Administrative unit management requires `az rest` with Graph API:

```bash
# Create a static admin unit
az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/administrativeUnits" \
  --body '{"displayName":"APAC Region","description":"All users and groups in APAC"}'

# List admin units
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/administrativeUnits?\$select=id,displayName" \
  --query "value[].{Name:displayName, ID:id}" --output table
```

## Error Handling

| Code | Fix |
|------|-----|
| `403` | Add `Directory.ReadWrite.All` scope |
| `400` | Dynamic rule syntax error — validate rule expression |
