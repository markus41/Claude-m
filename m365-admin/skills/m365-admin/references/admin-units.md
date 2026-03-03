# Administrative Units

Administrative units (AUs) allow you to scope administrative roles to a subset of users, groups, or devices — enabling delegated administration without granting tenant-wide permissions.

## Required Scopes

| Operation | Scope |
|---|---|
| Read administrative units | `AdministrativeUnit.Read.All` |
| Create/manage AUs and membership | `AdministrativeUnit.ReadWrite.All` |
| Scoped role assignments | `RoleManagement.ReadWrite.Directory` |

## Administrative Unit CRUD

### List Administrative Units

```
GET https://graph.microsoft.com/v1.0/administrativeUnits
```

### Create Administrative Unit

Static membership (manually managed):

```
POST https://graph.microsoft.com/v1.0/administrativeUnits
Content-Type: application/json

{
  "displayName": "APAC Region Users",
  "description": "Users and groups in the Asia-Pacific region",
  "visibility": "HiddenMembership"
}
```

`visibility` values: `"Public"` (default) or `"HiddenMembership"` (members can't see each other).

Dynamic membership (rule-based, requires Azure AD Premium P1):

```
POST https://graph.microsoft.com/v1.0/administrativeUnits
Content-Type: application/json

{
  "displayName": "Engineering Department AU",
  "description": "Automatically populated from department attribute",
  "membershipType": "Dynamic",
  "membershipRule": "(user.department -eq \"Engineering\")",
  "membershipRuleProcessingState": "On"
}
```

### Update Administrative Unit

```
PATCH https://graph.microsoft.com/v1.0/administrativeUnits/{auId}
Content-Type: application/json

{
  "description": "Updated description",
  "displayName": "APAC Users and Devices"
}
```

### Delete Administrative Unit

```
DELETE https://graph.microsoft.com/v1.0/administrativeUnits/{auId}
```

Removing an AU does not delete its members — it only removes the AU container.

## AU Membership Management

### List AU Members

```
GET https://graph.microsoft.com/v1.0/administrativeUnits/{auId}/members
```

Returns users, groups, or devices depending on what was added.

Filter to specific type:

```
GET https://graph.microsoft.com/v1.0/administrativeUnits/{auId}/members/microsoft.graph.user
GET https://graph.microsoft.com/v1.0/administrativeUnits/{auId}/members/microsoft.graph.group
GET https://graph.microsoft.com/v1.0/administrativeUnits/{auId}/members/microsoft.graph.device
```

### Add Member to AU

```
POST https://graph.microsoft.com/v1.0/administrativeUnits/{auId}/members/$ref
Content-Type: application/json

{
  "@odata.id": "https://graph.microsoft.com/v1.0/users/{userId}"
}
```

For groups:

```
{
  "@odata.id": "https://graph.microsoft.com/v1.0/groups/{groupId}"
}
```

For devices:

```
{
  "@odata.id": "https://graph.microsoft.com/v1.0/devices/{deviceId}"
}
```

### Remove Member from AU

```
DELETE https://graph.microsoft.com/v1.0/administrativeUnits/{auId}/members/{memberId}/$ref
```

### Check AU Membership for a User

```
GET https://graph.microsoft.com/v1.0/users/{userId}/memberOf/microsoft.graph.administrativeUnit
```

## Scoped Role Assignments

Assign admin roles scoped to the AU — the assigned admin can only manage objects within the AU.

### List Scoped Role Members for an AU

```
GET https://graph.microsoft.com/v1.0/administrativeUnits/{auId}/scopedRoleMembers
```

### Assign Scoped Role

```
POST https://graph.microsoft.com/v1.0/administrativeUnits/{auId}/scopedRoleMembers
Content-Type: application/json

{
  "roleId": "user-admin-role-template-id",
  "administrativeUnitId": "{auId}",
  "roleMemberInfo": {
    "id": "user-object-id"
  }
}
```

Roles that support AU scoping:
- User Administrator (`fe930be7-5e62-47db-91af-98c3a49a38b1`)
- Helpdesk Administrator (`729827e3-9c14-49f7-bb1b-9608f156bbb8`)
- Password Administrator (`966707d0-3269-4727-9be2-8c3a10f19b9d`)
- Authentication Administrator (`c4e39bd9-1100-46d3-8c65-fb160da0071f`)
- Groups Administrator (`fdd7a751-b60b-444a-984c-02652fe8fa1c`)
- License Administrator (`4d6ac14f-3453-41d0-bef9-a3e0c569773a`)

Get role template IDs:

```
GET https://graph.microsoft.com/v1.0/directoryRoleTemplates
```

### Remove Scoped Role Member

```
DELETE https://graph.microsoft.com/v1.0/administrativeUnits/{auId}/scopedRoleMembers/{scopedRoleMemberId}
```

## Bulk Population Pattern

For large-scale AU population from a CSV or group query:

```typescript
// Get all users in a department
const users = await getAllPages(graphClient,
  "/users?$filter=department eq 'Engineering'&$select=id,displayName,userPrincipalName"
);

// Add to AU in batches of 20 using $batch
const batchSize = 20;
for (let i = 0; i < users.length; i += batchSize) {
  const batch = users.slice(i, i + batchSize);
  const requests = batch.map((user, idx) => ({
    id: String(idx + 1),
    method: "POST",
    url: `/administrativeUnits/${auId}/members/$ref`,
    headers: { "Content-Type": "application/json" },
    body: { "@odata.id": `https://graph.microsoft.com/v1.0/users/${user.id}` },
  }));
  await graphClient.api("/$batch").post({ requests });
}
```

## Dynamic AU Rules Reference

AU dynamic membership rules follow the same syntax as dynamic group rules:

| Rule | Description |
|---|---|
| `(user.department -eq "Sales")` | All users in Sales department |
| `(user.country -eq "US")` | All users in the US |
| `(user.jobTitle -contains "Manager")` | All users with Manager in title |
| `(user.userType -eq "Guest")` | All guest users |
| `(device.deviceOSType -eq "Windows")` | All Windows devices |
| `(device.managementType -eq "MDM")` | All MDM-managed devices |

Test rule syntax:

```
POST https://graph.microsoft.com/v1.0/groups/validateProperties
Content-Type: application/json

{
  "displayName": "TestRule",
  "mailNickname": "test",
  "onBehalfOfUserId": "user-id"
}
```
