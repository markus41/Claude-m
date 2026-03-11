# Group Management — Reference

## Group Types Comparison

| Property | M365 Group | Security Group | Dynamic Security | Mail-Enabled Security |
|----------|-----------|---------------|-----------------|----------------------|
| `mailEnabled` | `true` | `false` | `false` | `true` |
| `securityEnabled` | `false` | `true` | `true` | `true` |
| `groupTypes` | `["Unified"]` | `[]` | `["DynamicMembership"]` | `[]` |
| Teams-capable | Yes | No | No | No |
| License assignment | Yes | Yes | Yes | No |
| CA policy target | Yes | Yes | Yes | Yes |

## Dynamic Membership Rules

Rules use OData-like expression syntax:

```
# Department equals Engineering
(user.department -eq "Engineering")

# Job title contains "Manager" and accountEnabled
(user.jobTitle -contains "Manager") -and (user.accountEnabled -eq true)

# Members of on-prem security group (synced)
(user.memberOf -any (group.objectId -in ["<group-id>"]))

# By extensionAttribute
(user.extensionAttribute1 -eq "CostCenter-9901")

# By city or country
(user.city -eq "Seattle") -or (user.country -eq "United States")

# Device rule (for device groups)
(device.deviceOSType -eq "Windows") -and (device.isCompliant -eq true)
```

Validate a rule before applying:
```
POST /groups/evaluateDynamicMembership
{
  "memberId": "<user-id>",
  "membershipRule": "(user.department -eq \"Engineering\")"
}
```

Force resync of dynamic group:
```
POST /groups/{groupId}/evaluateDynamicMembership
{ "memberId": "<user-id>" }
```

## Manage Group Owners

```
POST /groups/{groupId}/owners/$ref
{ "@odata.id": "https://graph.microsoft.com/v1.0/users/{ownerId}" }

GET /groups/{groupId}/owners
DELETE /groups/{groupId}/owners/{ownerId}/$ref
```

Groups must have at least 1 owner.

## Group-Based Licensing

Assign a license SKU to a group — all members receive the license:

```
POST /groups/{groupId}/assignLicense
{
  "addLicenses": [
    {
      "skuId": "05e9a617-0261-4cee-bb44-138d3ef5d965",
      "disabledPlans": ["1e7e1070-8ccb-4aca-b470-d7cb538cb07e"]
    }
  ],
  "removeLicenses": []
}
```

Check for licensing errors on the group:
```
GET /groups/{groupId}/membersWithLicenseErrors
```

Common error codes:
- `CountViolation` — no available licenses in SKU
- `MutuallyExclusiveViolation` — conflicting SKU already assigned
- `UserDisabled` — user account disabled, cannot receive license
- `InvalidCountryArea` — user missing or invalid `usageLocation`

## List Group Memberships

```
# Direct members (one hop)
GET /groups/{groupId}/members?$select=id,displayName,userPrincipalName,userType

# Transitive members (includes nested groups' members)
GET /groups/{groupId}/transitiveMembers?$select=id,displayName,userPrincipalName

# Groups a user belongs to (transitive)
GET /users/{userId}/transitiveMemberOf/microsoft.graph.group?$select=id,displayName,groupTypes

# Check if user is member (returns 204 if yes, 404 if no)
GET /groups/{groupId}/members/{userId}/$ref
```

## Batch Add Members

To add multiple members at once:
```
PATCH /groups/{groupId}
{
  "members@odata.bind": [
    "https://graph.microsoft.com/v1.0/directoryObjects/{userId1}",
    "https://graph.microsoft.com/v1.0/directoryObjects/{userId2}",
    "https://graph.microsoft.com/v1.0/directoryObjects/{userId3}"
  ]
}
```

Limit: 20 members per request.

## M365 Group — Teams & Mail Settings

```
# Get associated Teams team
GET /groups/{groupId}/team

# Enable Teams for existing M365 Group
PUT /groups/{groupId}/team
{ "memberSettings": { "allowCreateUpdateChannels": true } }

# Set group visibility (Public/Private/HiddenMembership)
PATCH /groups/{groupId}
{ "visibility": "Private" }
```

## Delete and Restore Group

```
DELETE /groups/{groupId}         → soft delete (30-day recovery)
GET /directory/deletedItems/microsoft.graph.group  → list deleted groups
POST /directory/deletedItems/{groupId}/restore
DELETE /directory/deletedItems/{groupId}           → permanent
```

## Azure CLI Quick Reference — Groups

```bash
# Create security group
az ad group create --display-name "SG-DevTeam" --mail-nickname "sg-devteam" \
  --description "Dev team security group"

# Create M365 group
az ad group create --display-name "Project Phoenix" --mail-nickname "project-phoenix" \
  --group-types Unified --mail-enabled true

# List / show / delete
az ad group list --query "[].{Name:displayName, ID:id, Type:groupTypes}" -o table
az ad group show --group "SG-DevTeam"
az ad group delete --group "SG-DevTeam"

# Member management
az ad group member add --group "SG-DevTeam" --member-id <user-object-id>
az ad group member remove --group "SG-DevTeam" --member-id <user-object-id>
az ad group member list --group "SG-DevTeam" \
  --query "[].{Name:displayName, UPN:userPrincipalName}" -o table
az ad group member check --group "SG-DevTeam" --member-id <user-object-id>

# Owner management
az ad group owner add --group "SG-DevTeam" --owner-object-id <owner-id>
az ad group owner list --group "SG-DevTeam"
```

## Useful Group Filters

```
# All M365 Groups
GET /groups?$filter=groupTypes/any(c:c eq 'Unified')&$select=id,displayName,mail

# Security groups only
GET /groups?$filter=securityEnabled eq true and mailEnabled eq false&$select=id,displayName

# Dynamic groups
GET /groups?$filter=groupTypes/any(c:c eq 'DynamicMembership')&$select=id,displayName,membershipRule

# Groups with no owners (orphaned)
GET /groups?$filter=NOT owners/$count eq 0&$count=true&ConsistencyLevel=eventual
```
