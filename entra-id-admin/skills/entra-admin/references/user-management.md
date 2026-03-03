# User Management — Reference

## Full User Create Body

All supported properties:

```json
{
  "displayName": "Jane Smith",
  "givenName": "Jane",
  "surname": "Smith",
  "userPrincipalName": "jane.smith@contoso.com",
  "mailNickname": "jane.smith",
  "mail": "jane.smith@contoso.com",
  "accountEnabled": true,
  "passwordProfile": {
    "password": "<strong-generated-password>",
    "forceChangePasswordNextSignIn": true,
    "forceChangePasswordNextSignInWithMfa": false
  },
  "department": "Engineering",
  "jobTitle": "Software Engineer",
  "companyName": "Contoso",
  "officeLocation": "Seattle HQ",
  "usageLocation": "US",
  "preferredLanguage": "en-US",
  "mobilePhone": "+1-206-555-0100",
  "businessPhones": ["+1-206-555-0200"],
  "streetAddress": "1 Microsoft Way",
  "city": "Redmond",
  "state": "WA",
  "postalCode": "98052",
  "country": "United States",
  "employeeId": "EMP12345",
  "employeeType": "Employee",
  "employeeHireDate": "2026-03-01T00:00:00Z",
  "ageGroup": "adult",
  "onPremisesExtensionAttributes": {
    "extensionAttribute1": "CostCenter-9901",
    "extensionAttribute2": "Region-WEST"
  }
}
```

## Get User — All Properties

```
GET /users/{userIdOrUPN}?$select=id,displayName,userPrincipalName,accountEnabled,
  signInActivity,department,jobTitle,usageLocation,licenses,assignedPlans,
  createdDateTime,lastPasswordChangeDateTime,passwordPolicies,onPremisesSyncEnabled,
  onPremisesLastSyncDateTime,identities,assignedLicenses
```

Key read-only fields:
- `signInActivity.lastSignInDateTime` — last interactive sign-in (requires `AuditLog.Read.All`)
- `onPremisesSyncEnabled` — whether user is synced from on-prem AD
- `createdDateTime` — when the account was created

## Delta Queries — Sync User Changes

Track incremental user changes without full re-sync:

```
GET /users/delta?$select=displayName,userPrincipalName,accountEnabled,department

→ Returns page of users + @odata.deltaLink
→ Next sync: GET {deltaLink}
→ Deleted users appear with @removed: { reason: "deleted" }
```

Cache and reuse `@odata.deltaLink` between syncs.

## Assign Manager

```
PUT /users/{userId}/manager/$ref
{ "@odata.id": "https://graph.microsoft.com/v1.0/users/{managerId}" }

GET /users/{userId}/manager        → direct manager
GET /users/{userId}/directReports  → direct reports list
GET /users/{userId}/transitiveMemberOf  → all groups (incl. nested)
```

## User Photo

```
PUT /users/{userId}/photo/$value
Content-Type: image/jpeg
<binary-jpeg-data>

GET /users/{userId}/photo/$value  → download photo
```

Max size: 100 KB for Exchange Online. Recommended dimensions: 96x96 px.

## Extension Attributes (Directory Extensions)

Two types:
1. **On-prem extension attributes** (`extensionAttribute1`–`extensionAttribute15`): Set directly on user, synced from on-prem AD.
2. **Custom extension properties**: Registered on an app registration, then set on users.

Register extension:
```
POST /applications/{appId}/extensionProperties
{ "name": "employeeRegion", "dataType": "String", "targetObjects": ["User"] }
```

Set value on user:
```
PATCH /users/{userId}
{ "extension_<appId-no-hyphens>_employeeRegion": "EMEA" }
```

## Password Operations

Reset password (admin):
```
PATCH /users/{userId}
{
  "passwordProfile": {
    "password": "<new-password>",
    "forceChangePasswordNextSignIn": true
  }
}
```

Revoke all refresh tokens (force re-authentication):
```
POST /users/{userId}/revokeSignInSessions
```

Remove password expiry policy (service accounts):
```
PATCH /users/{userId}
{ "passwordPolicies": "DisablePasswordExpiration" }
```

## Deleted Users

```
GET /directory/deletedItems/microsoft.graph.user
  ?$filter=deletedDateTime ge 2026-01-01T00:00:00Z
  &$select=id,displayName,userPrincipalName,deletedDateTime

POST /directory/deletedItems/{userId}/restore

DELETE /directory/deletedItems/{userId}   → permanent, irreversible
```

Recovery window: 30 days from soft delete.

## List Users — Useful Filters

```
# All enabled users in Engineering
GET /users?$filter=accountEnabled eq true and department eq 'Engineering'&$select=id,displayName,userPrincipalName

# Users not synced from on-prem (cloud-only)
GET /users?$filter=onPremisesSyncEnabled eq null&$select=id,displayName,userPrincipalName

# Guest users only
GET /users?$filter=userType eq 'Guest'&$select=id,displayName,mail,externalUserState

# Users with no sign-in in 90+ days (requires signInActivity read)
GET /users?$select=id,displayName,signInActivity&$filter=signInActivity/lastSignInDateTime le 2025-12-01T00:00:00Z
```

## $batch — Bulk User Create

```
POST /$batch
{
  "requests": [
    {
      "id": "user-1",
      "method": "POST",
      "url": "/users",
      "headers": { "Content-Type": "application/json" },
      "body": { "displayName": "Alice", "userPrincipalName": "alice@contoso.com", ... }
    },
    {
      "id": "user-2",
      "method": "POST",
      "url": "/users",
      "headers": { "Content-Type": "application/json" },
      "body": { "displayName": "Bob", "userPrincipalName": "bob@contoso.com", ... }
    }
  ]
}
```

Limits: 20 requests per batch. Each sub-request can independently succeed or fail. Check each response's `status` field (201 = created, 4xx = error).

## Error Codes — User Operations

| Code | innerError | Fix |
|------|-----------|-----|
| `Request_BadRequest` | `ObjectConflict` | UPN already exists; change mailNickname/UPN |
| `Request_BadRequest` | `PropertyConflict` | mailNickname conflict with another user/group |
| `Authorization_RequestDenied` | — | Add `User.ReadWrite.All` scope |
| `Request_BadRequest` | `DirectorySyncEnabled` | User is synced from on-prem; edit attributes in AD |
