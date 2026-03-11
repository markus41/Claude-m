---
name: entra-group-create
description: Create a Microsoft 365 Group, Security Group, or Dynamic Security Group in Entra ID
argument-hint: "<display-name> [--type m365|security|dynamic] [--dynamic-rule <rule>] [--description <text>] [--owners <upn1,upn2>] [--members <upn1,upn2>] [--license <sku-id>]"
allowed-tools:
  - Read
  - Write
  - Bash
---

# Create Entra ID Group

Create a new group. Supports M365 Groups (Teams-capable), Security Groups (RBAC/CA), and Dynamic Security Groups (auto-membership via rules).

## Steps

### 1. Parse Arguments

- `<display-name>` — required
- `--type` — `m365` (default), `security`, or `dynamic`
- `--dynamic-rule` — required for `--type dynamic`, e.g., `(user.department -eq "Engineering")`
- `--description` — optional group description
- `--owners` — comma-separated UPNs to add as owners
- `--members` — comma-separated UPNs to add as initial members (not for dynamic groups)
- `--mail-nickname` — override auto-derived mailNickname
- `--hide` — set `visibility: HiddenMembership` (default: Public for M365, no visibility for Security)
- `--role-assignable` — mark as role-assignable (Security groups only; cannot be changed after creation)
- `--license` — SKU GUID to assign to the group (group-based licensing)

### 2. Derive mailNickname

From display name: lowercase, replace spaces and special chars with `-`, truncate to 64 chars.
Example: "Project Phoenix Team" → `project-phoenix-team`

### 3. Build Request Body

**M365 Group:**
```json
{
  "displayName": "<name>",
  "mailEnabled": true,
  "mailNickname": "<derived>",
  "securityEnabled": false,
  "groupTypes": ["Unified"],
  "description": "<description>",
  "visibility": "Private"
}
```

**Security Group:**
```json
{
  "displayName": "<name>",
  "mailEnabled": false,
  "mailNickname": "<derived>",
  "securityEnabled": true,
  "groupTypes": [],
  "description": "<description>",
  "isAssignableToRole": false
}
```

**Dynamic Security Group:**
```json
{
  "displayName": "<name>",
  "mailEnabled": false,
  "mailNickname": "<derived>",
  "securityEnabled": true,
  "groupTypes": ["DynamicMembership"],
  "membershipRule": "<--dynamic-rule>",
  "membershipRuleProcessingState": "On",
  "description": "<description>"
}
```

Set `isAssignableToRole: true` if `--role-assignable` is passed.

### 4. POST /groups

```
POST https://graph.microsoft.com/v1.0/groups
```

### 5. Add Owners (if --owners)

Resolve each UPN to object ID, then:
```
POST https://graph.microsoft.com/v1.0/groups/{groupId}/owners/$ref
{ "@odata.id": "https://graph.microsoft.com/v1.0/users/{ownerId}" }
```

### 6. Add Initial Members (if --members, not dynamic)

Batch up to 20 members:
```
PATCH https://graph.microsoft.com/v1.0/groups/{groupId}
{
  "members@odata.bind": [
    "https://graph.microsoft.com/v1.0/directoryObjects/{userId1}",
    ...
  ]
}
```

### 7. Assign License (if --license)

```
POST https://graph.microsoft.com/v1.0/groups/{groupId}/assignLicense
{ "addLicenses": [{ "skuId": "<sku-id>", "disabledPlans": [] }], "removeLicenses": [] }
```

### 8. Display Output

```
Group created
─────────────────────────────────────────────────────────────────
Display Name:    Project Phoenix Team
Object ID:       <group-id>
Type:            Microsoft 365 Group
Mail Nickname:   project-phoenix-team
Mail:            project-phoenix-team@contoso.com
Visibility:      Private
─────────────────────────────────────────────────────────────────
Owners:    alice@contoso.com, bob@contoso.com ✓ (2 added)
Members:   5 initial members added ✓
License:   Microsoft 365 E3 ✓ Assigned
─────────────────────────────────────────────────────────────────
```

For dynamic groups, add:
```
Dynamic Rule:  (user.department -eq "Engineering")
Processing:    On (membership will update within minutes)
```

## Azure CLI Alternative

```bash
# Create security group
az ad group create --display-name "SG-DevTeam-Prod" \
  --mail-nickname "sg-devteam-prod" \
  --description "Production dev team security group"

# Create M365 group (Teams-capable)
az ad group create --display-name "Project Phoenix" \
  --mail-nickname "project-phoenix" \
  --group-types Unified --mail-enabled true
```

After creation, add initial members:

```bash
az ad group member add --group "SG-DevTeam-Prod" --member-id <user-object-id>
```

Add owners:

```bash
az ad group owner add --group "SG-DevTeam-Prod" --owner-object-id <owner-id>
```

> **Note**: Dynamic group creation with `--membership-rule` is not supported by `az ad group create`. Use Graph API or `az rest` for dynamic groups.

## Error Handling

| Code | Fix |
|------|-----|
| `409 ObjectConflict` | mailNickname already used — pass `--mail-nickname` with a different value |
| `400 DynamicRule` | Syntax error in dynamic rule — validate with evaluateDynamicMembership |
| `403` | Add `Group.ReadWrite.All` scope |
