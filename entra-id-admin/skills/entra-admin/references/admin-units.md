# Administrative Units — Reference

## Overview

Administrative units (AUs) enable scoped delegation in Entra ID. An admin can be assigned
a directory role scoped to a specific AU — they can only manage users and groups within that AU.

**Requires**: Entra ID P1 (basic AUs) or Entra ID P2 (restricted management AUs).

## Create Administrative Unit

```
POST /administrativeUnits
{
  "displayName": "APAC Region",
  "description": "All users and groups in Asia Pacific region",
  "visibility": "HiddenMembership"
}
```

`visibility` options: `Public` (default) or `HiddenMembership` (members cannot see other members).

## Add Members to AU

Add individual user:
```
POST /administrativeUnits/{auId}/members/$ref
{ "@odata.id": "https://graph.microsoft.com/v1.0/users/{userId}" }
```

Add group:
```
POST /administrativeUnits/{auId}/members/$ref
{ "@odata.id": "https://graph.microsoft.com/v1.0/groups/{groupId}" }
```

Add device:
```
POST /administrativeUnits/{auId}/members/$ref
{ "@odata.id": "https://graph.microsoft.com/v1.0/devices/{deviceId}" }
```

Bulk add members:
```
POST /$batch
→ batch of POST /administrativeUnits/{auId}/members/$ref requests
```

## List AU Members

```
# All members
GET /administrativeUnits/{auId}/members?$select=id,displayName,userPrincipalName

# Users only
GET /administrativeUnits/{auId}/members/microsoft.graph.user

# Groups only
GET /administrativeUnits/{auId}/members/microsoft.graph.group
```

## Remove Member from AU

```
DELETE /administrativeUnits/{auId}/members/{memberId}/$ref
```

## Assign Scoped Role to AU

Grant a user administrative rights scoped only to this AU:

```
POST /administrativeUnits/{auId}/scopedRoleMembers
{
  "roleId": "<directory-role-id>",
  "roleMemberInfo": {
    "id": "<admin-user-id>",
    "@odata.type": "#microsoft.graph.identity"
  }
}
```

Useful scoped roles:
- `fe930be7-5e62-47db-91af-98c3a49a38b1` — User Administrator (scoped to AU)
- `729827e3-9c14-49f7-bb1b-9608f156bbb8` — Helpdesk Administrator (scoped to AU)
- `fdd7a751-b60b-444a-984c-02652fe8fa1c` — Group Administrator (scoped to AU)

## List Scoped Role Members of AU

```
GET /administrativeUnits/{auId}/scopedRoleMembers
  ?$expand=roleMemberInfo($select=id,displayName,userPrincipalName)
```

## Dynamic Administrative Units (beta)

Configure an AU to auto-populate members based on a rule:

```
PATCH /beta/administrativeUnits/{auId}
{
  "membershipType": "Dynamic",
  "membershipRule": "(user.department -eq \"APAC\")",
  "membershipRuleProcessingState": "On"
}
```

Rule format is identical to dynamic group rules.

## Restricted Management Administrative Units

In a Restricted Management AU, only scoped admins can modify the AU's members — even Global Admins are locked out:

```
POST /beta/administrativeUnits
{
  "displayName": "Executive Leadership",
  "description": "C-suite accounts — high protection AU",
  "isMemberManagementRestricted": true
}
```

Only assign restricted management AUs to a small group of trusted admins.

## List AUs a User Belongs To

```
GET /users/{userId}/memberOf/microsoft.graph.administrativeUnit
  ?$select=id,displayName
```

## Delete Administrative Unit

```
DELETE /administrativeUnits/{auId}
```

Members are NOT deleted — only the AU container is removed. Scoped role assignments for this AU are automatically removed.
