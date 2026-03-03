---
name: Entra ID Administration
description: >
  Deep expertise in Microsoft Entra ID (Azure AD) tenant administration via Microsoft Graph
  API v1.0 and beta — user lifecycle (create, update, disable, bulk import, restore),
  group management (M365/Security/Dynamic), directory role assignments, Privileged Identity
  Management (PIM eligible and active assignments, role activation, approval workflows),
  authentication methods admin (MFA, FIDO2, passwordless, SSPR), admin unit scoped
  delegation, B2B guest invitations and external collaboration settings, license assignment
  (direct and group-based), named locations, entitlement management (access packages and
  catalogs), and access reviews.
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
triggers:
  - entra id admin
  - azure ad admin
  - create user
  - disable user
  - bulk import users
  - user provisioning
  - user deprovisioning
  - group management
  - create group
  - dynamic group
  - add group member
  - directory role
  - assign role
  - PIM
  - privileged identity management
  - eligible role assignment
  - activate role
  - role activation
  - authentication methods
  - MFA admin
  - FIDO2 key
  - passwordless auth
  - SSPR configuration
  - admin unit
  - scoped delegation
  - guest invite
  - B2B invitation
  - external collaboration
  - license assign
  - group-based licensing
  - named location
  - IP range
  - access package
  - entitlement management
  - access review
  - recertification
---

# Entra ID Administration

## Authentication & Scopes

All operations target the Microsoft Graph API. Authentication uses delegated or application credentials via Azure Identity (`DefaultAzureCredential` or `InteractiveBrowserCredential`).

**Common required scopes:**

| Scope | Purpose |
|-------|---------|
| `User.ReadWrite.All` | Create, update, delete users |
| `Group.ReadWrite.All` | Create, update, manage groups and membership |
| `Directory.ReadWrite.All` | Directory role assignments, admin units |
| `RoleManagement.ReadWrite.Directory` | Assign Entra directory roles, PIM |
| `UserAuthenticationMethod.ReadWrite.All` | Manage authentication methods |
| `EntitlementManagement.ReadWrite.All` | Access packages, catalogs, reviews |
| `Organization.ReadWrite.All` | Tenant settings, external collab |
| `LicenseAssignment.ReadWrite.All` | Assign and remove licenses |

**Base URL**: `https://graph.microsoft.com/v1.0`
**Beta URL**: `https://graph.microsoft.com/beta` (PIM v2, some auth method operations)

---

## User Management

### Create User

```
POST /users
Content-Type: application/json
```

```json
{
  "displayName": "Jane Smith",
  "userPrincipalName": "jane.smith@contoso.com",
  "mailNickname": "jane.smith",
  "accountEnabled": true,
  "passwordProfile": {
    "password": "<generated-strong-password>",
    "forceChangePasswordNextSignIn": true
  },
  "department": "Engineering",
  "jobTitle": "Software Engineer",
  "officeLocation": "Seattle",
  "usageLocation": "US",
  "mobilePhone": "+1-206-555-0100",
  "businessPhones": ["+1-206-555-0200"],
  "preferredLanguage": "en-US"
}
```

**Required fields**: `displayName`, `userPrincipalName`, `mailNickname`, `accountEnabled`, `passwordProfile`.
**`usageLocation`** is required before assigning licenses (ISO 3166-1 alpha-2 country code).

### Update User

```
PATCH /users/{userIdOrUPN}
```

Only include fields being changed. All fields are optional for PATCH.

### Disable / Enable User

```
PATCH /users/{userId}
{ "accountEnabled": false }
```

Re-enable: `{ "accountEnabled": true }`.

### Soft Delete and Restore

```
DELETE /users/{userId}        → soft delete (30-day recovery window)
GET    /directory/deletedItems/microsoft.graph.user   → list deleted users
POST   /directory/deletedItems/{userId}/restore       → restore within 30 days
DELETE /directory/deletedItems/{userId}               → permanent delete
```

### Bulk Import

Use `$batch` endpoint for up to 20 requests per batch:

```
POST /$batch
Content-Type: application/json
```

```json
{
  "requests": [
    { "id": "1", "method": "POST", "url": "/users", "headers": {"Content-Type": "application/json"}, "body": { ... } },
    { "id": "2", "method": "POST", "url": "/users", "headers": {"Content-Type": "application/json"}, "body": { ... } }
  ]
}
```

For large imports (>20 users), split into batches and honor 429 throttling.

See [`references/user-management.md`](./references/user-management.md) for delta queries, manager assignment, photo upload, and extension attributes.

---

## Group Management

### Create Group

**Microsoft 365 Group** (has mailbox, Teams-capable):
```json
{
  "displayName": "Project Phoenix",
  "mailEnabled": true,
  "mailNickname": "project-phoenix",
  "securityEnabled": false,
  "groupTypes": ["Unified"],
  "description": "Cross-functional project team"
}
```

**Security Group** (no mailbox, for RBAC/CA):
```json
{
  "displayName": "SG-DevTeam-Prod",
  "mailEnabled": false,
  "mailNickname": "sg-devteam-prod",
  "securityEnabled": true,
  "groupTypes": []
}
```

**Dynamic Security Group** (membership auto-computed from user attributes):
```json
{
  "displayName": "SG-Dept-Engineering",
  "mailEnabled": false,
  "mailNickname": "sg-dept-engineering",
  "securityEnabled": true,
  "groupTypes": ["DynamicMembership"],
  "membershipRule": "(user.department -eq \"Engineering\")",
  "membershipRuleProcessingState": "On"
}
```

### Manage Membership

```
POST /groups/{groupId}/members/$ref
{ "@odata.id": "https://graph.microsoft.com/v1.0/directoryObjects/{userId}" }

DELETE /groups/{groupId}/members/{userId}/$ref
```

See [`references/group-management.md`](./references/group-management.md) for group-based licensing, transitive membership, and owner management.

---

## Directory Roles

List all built-in and custom roles:
```
GET /directoryRoles          → currently activated roles in tenant
GET /roleManagement/directory/roleDefinitions   → all role definitions
```

Assign a role:
```
POST /roleManagement/directory/roleAssignments
{
  "principalId": "<user-or-sp-id>",
  "roleDefinitionId": "<role-definition-id>",
  "directoryScopeId": "/"
}
```

Use `directoryScopeId` of `/administrativeUnits/<id>` to scope to an admin unit.

See [`references/role-assignments.md`](./references/role-assignments.md) for role definition IDs, custom roles, and scoped assignments.

---

## Privileged Identity Management (PIM)

PIM requires **Azure AD P2** or **Microsoft Entra ID Governance** license.

PIM operations use `roleManagement/directory/roleEligibilityScheduleRequests` (beta).

### Create Eligible Assignment

```
POST /beta/roleManagement/directory/roleEligibilityScheduleRequests
{
  "action": "adminAssign",
  "principalId": "<user-id>",
  "roleDefinitionId": "<role-definition-id>",
  "directoryScopeId": "/",
  "scheduleInfo": {
    "startDateTime": "2026-03-01T00:00:00Z",
    "expiration": { "type": "afterDuration", "duration": "P180D" }
  },
  "justification": "Project lead requires temporary admin access"
}
```

### Activate Eligible Role (Self-Service)

```
POST /beta/roleManagement/directory/roleAssignmentScheduleRequests
{
  "action": "selfActivate",
  "principalId": "<my-user-id>",
  "roleDefinitionId": "<role-definition-id>",
  "directoryScopeId": "/",
  "justification": "Performing emergency patch deployment",
  "scheduleInfo": {
    "startDateTime": "2026-03-01T10:00:00Z",
    "expiration": { "type": "afterDuration", "duration": "PT4H" }
  }
}
```

See [`references/pim.md`](./references/pim.md) for approval workflows, PIM for groups, and role settings management.

---

## Authentication Methods

Authentication methods are managed per-user via:

```
GET  /users/{userId}/authentication/methods
GET  /users/{userId}/authentication/microsoftAuthenticatorMethods
GET  /users/{userId}/authentication/fido2Methods
POST /users/{userId}/authentication/fido2Methods
DELETE /users/{userId}/authentication/fido2Methods/{methodId}
```

Require re-registration of MFA:
```
POST /users/{userId}/authentication/requireMfaRegistration
```

List users with MFA registered:
```
GET /reports/credentialUserRegistrationDetails
```

See [`references/auth-methods.md`](./references/auth-methods.md) for SSPR configuration, authentication strength policies, and temporary access passes.

---

## Admin Units

Admin units enable scoped delegation — an admin role scoped to a subset of users/groups.

```
POST /administrativeUnits
{ "displayName": "APAC Region", "description": "All users and groups in APAC" }

POST /administrativeUnits/{auId}/members/$ref
{ "@odata.id": "https://graph.microsoft.com/v1.0/users/{userId}" }

POST /administrativeUnits/{auId}/scopedRoleMembers
{
  "roleId": "<directory-role-id>",
  "roleMemberInfo": { "id": "<admin-user-id>" }
}
```

See [`references/admin-units.md`](./references/admin-units.md) for restricted management AUs and dynamic membership rules.

---

## External Identities / B2B

### Invite Guest User

```
POST /invitations
{
  "invitedUserEmailAddress": "partner@fabrikam.com",
  "inviteRedirectUrl": "https://myapps.microsoft.com",
  "invitedUserDisplayName": "Alice Fabrikam",
  "sendInvitationMessage": true,
  "invitedUserMessageInfo": {
    "customizedMessageBody": "Welcome to Contoso! Click below to access your resources."
  }
}
```

Response includes `inviteRedeemUrl` for manual sharing.

### Configure External Collaboration

```
GET  /policies/authorizationPolicy
PATCH /policies/authorizationPolicy
{
  "allowInvitesFrom": "adminsAndGuestInviters",
  "guestUserRoleId": "10dae51f-b6af-4016-8d66-8c2a99b929b3"
}
```

See [`references/external-identities.md`](./references/external-identities.md) for cross-tenant access policies, B2B direct connect, and guest lifecycle management.

---

## License Assignment

Licenses require `usageLocation` to be set on the user first.

```
POST /users/{userId}/assignLicense
{
  "addLicenses": [
    {
      "skuId": "<sku-guid>",
      "disabledPlans": []
    }
  ],
  "removeLicenses": []
}
```

Common SKU GUIDs:
| Product | SKU GUID |
|---------|----------|
| Microsoft 365 E3 | `05e9a617-0261-4cee-bb44-138d3ef5d965` |
| Microsoft 365 E5 | `06ebc4ee-1bb5-47dd-8120-11324bc54e06` |
| Microsoft Entra ID P2 | `eec0eb4f-6444-4f95-aba0-50c24d67f998` |
| Microsoft 365 Business Premium | `cbdc14ab-d96c-4c30-b9f4-6ada7cdc1d46` |

Get available SKUs: `GET /subscribedSkus`

See [`references/licenses.md`](./references/licenses.md) for group-based licensing, license error resolution, and SKU service plan IDs.

---

## Entitlement Management

Entitlement management requires **Azure AD P2** or **Microsoft Entra ID Governance**.

```
POST /identityGovernance/entitlementManagement/catalogs
{ "displayName": "IT Resources", "description": "Standard IT software and tools", "isExternallyVisible": false }

POST /identityGovernance/entitlementManagement/accessPackages
{
  "displayName": "Developer Tools",
  "description": "GitHub, Dev Box, Azure Portal access",
  "catalog": { "id": "<catalog-id>" }
}
```

See [`references/entitlement-management.md`](./references/entitlement-management.md) for assignment policies, approval flows, access reviews, and auto-assignment policies.

---

## Error Reference

| Code | Meaning | Resolution |
|------|---------|-----------|
| `400 BadRequest` | Missing required field or invalid value | Check field requirements; verify `usageLocation` is set before license |
| `403 Forbidden` | Missing scope or insufficient role | Add required Graph scope; check role assignment |
| `404 NotFound` | Resource not found | Verify GUID; resource may be soft-deleted |
| `409 Conflict` | Resource already exists (e.g., duplicate UPN) | Use a different UPN or update the existing resource |
| `429 TooManyRequests` | Graph throttled | Back off per `Retry-After` header; use batch API for bulk operations |
| `502/503` | Graph service transient | Retry with exponential backoff (max 3 retries) |

## Progressive Disclosure — Reference Files

| Topic | File |
|-------|------|
| User CRUD, delta queries, manager chain, photo, extension attributes | [`references/user-management.md`](./references/user-management.md) |
| Group types, dynamic membership rules, group owners, group-based licensing | [`references/group-management.md`](./references/group-management.md) |
| Role definitions, role assignment, custom roles, scoped assignments | [`references/role-assignments.md`](./references/role-assignments.md) |
| PIM eligible/active assignments, approval policies, PIM for Groups, role settings | [`references/pim.md`](./references/pim.md) |
| Auth methods per user, SSPR, auth strength policies, TAP | [`references/auth-methods.md`](./references/auth-methods.md) |
| Admin units, restricted management AUs, dynamic AU membership | [`references/admin-units.md`](./references/admin-units.md) |
| B2B invitations, cross-tenant access, guest lifecycle, XTAP per-org settings | [`references/external-identities.md`](./references/external-identities.md) |
| License SKUs, plan IDs, group-based licensing, error resolution | [`references/licenses.md`](./references/licenses.md) |
| Named locations (IP ranges, countries), trusted IPs, GPS location | [`references/named-locations.md`](./references/named-locations.md) |
| Access packages, catalogs, assignment policies, access reviews | [`references/entitlement-management.md`](./references/entitlement-management.md) |
