# Entra ID (Azure AD) Administration via Microsoft Graph

This reference covers all user, group, license, and role management operations through Microsoft Graph API v1.0 for Entra ID administration.

## User Management

### Create User

Create a new user in the tenant directory.

**Endpoint**: `POST https://graph.microsoft.com/v1.0/users`

**Required scope**: `User.ReadWrite.All`

**Required fields**:

| Field | Type | Description |
|---|---|---|
| `accountEnabled` | boolean | Whether the account is active |
| `displayName` | string | Full display name |
| `mailNickname` | string | Mail alias (no spaces, no special chars) |
| `userPrincipalName` | string | UPN (user@domain.com) |
| `passwordProfile` | object | Password and change-on-login flag |

**Optional fields**:

| Field | Type | Description |
|---|---|---|
| `givenName` | string | First name |
| `surname` | string | Last name |
| `department` | string | Department |
| `jobTitle` | string | Job title |
| `usageLocation` | string | ISO 3166-1 alpha-2 (required before license assignment) |
| `companyName` | string | Company name |
| `officeLocation` | string | Office location |
| `mobilePhone` | string | Mobile phone number |
| `streetAddress` | string | Street address |
| `city` | string | City |
| `state` | string | State or province |
| `postalCode` | string | Postal code |
| `country` | string | Country/region |
| `employeeId` | string | Employee identifier |
| `employeeType` | string | Employee type (e.g., "Employee", "Contractor") |

**Request body**:

```typescript
interface CreateUserRequest {
  accountEnabled: boolean;
  displayName: string;
  mailNickname: string;
  userPrincipalName: string;
  passwordProfile: {
    forceChangePasswordNextSignIn: boolean;
    password: string;
  };
  givenName?: string;
  surname?: string;
  department?: string;
  jobTitle?: string;
  usageLocation?: string;
  companyName?: string;
  officeLocation?: string;
  mobilePhone?: string;
}
```

**Response** (201 Created):

```typescript
interface UserResponse {
  id: string;
  displayName: string;
  userPrincipalName: string;
  mail: string | null;
  mailNickname: string;
  accountEnabled: boolean;
  department: string | null;
  jobTitle: string | null;
  usageLocation: string | null;
  createdDateTime: string;
}
```

### Update User

Modify any writable property on a user object.

**Endpoint**: `PATCH https://graph.microsoft.com/v1.0/users/{id | userPrincipalName}`

**Required scope**: `User.ReadWrite.All`

Only include the fields you want to change in the request body. Omitted fields are not modified.

```typescript
interface UpdateUserRequest {
  displayName?: string;
  givenName?: string;
  surname?: string;
  department?: string;
  jobTitle?: string;
  usageLocation?: string;
  companyName?: string;
  officeLocation?: string;
  mobilePhone?: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  accountEnabled?: boolean;
  employeeId?: string;
  employeeType?: string;
}
```

**Response**: 204 No Content on success.

### Disable User

Disable a user account by setting `accountEnabled` to `false`.

**Endpoint**: `PATCH https://graph.microsoft.com/v1.0/users/{id}`

```json
{
  "accountEnabled": false
}
```

This blocks the user from signing in. Existing sessions are not immediately terminated — use `revokeSignInSessions` to force sign-out:

**Endpoint**: `POST https://graph.microsoft.com/v1.0/users/{id}/revokeSignInSessions`

### Delete User

Soft-delete a user. The user moves to the deleted items container and can be restored within 30 days.

**Endpoint**: `DELETE https://graph.microsoft.com/v1.0/users/{id}`

**Response**: 204 No Content.

**Restore deleted user**: `POST https://graph.microsoft.com/v1.0/directory/deletedItems/{id}/restore`

**Permanently delete**: `DELETE https://graph.microsoft.com/v1.0/directory/deletedItems/{id}`

### Password Reset

Reset a user's password by updating the `passwordProfile`.

**Endpoint**: `PATCH https://graph.microsoft.com/v1.0/users/{id}`

```json
{
  "passwordProfile": {
    "forceChangePasswordNextSignIn": true,
    "password": "NewTempP@ssw0rd!"
  }
}
```

Password requirements: minimum 8 characters, must meet tenant password complexity policy. The `forceChangePasswordNextSignIn` flag requires the user to set a new password at next login.

### Get User

**Endpoint**: `GET https://graph.microsoft.com/v1.0/users/{id | userPrincipalName}`

Use `$select` to retrieve only needed fields:

```
GET /users/user@contoso.com?$select=id,displayName,userPrincipalName,department,assignedLicenses,accountEnabled
```

### List Users

**Endpoint**: `GET https://graph.microsoft.com/v1.0/users`

Supports `$filter`, `$select`, `$top`, `$orderby`, `$count`, and `$search`:

```
GET /users?$filter=department eq 'Engineering'&$select=id,displayName,userPrincipalName&$top=100
GET /users?$filter=accountEnabled eq false&$select=id,displayName,userPrincipalName
GET /users?$search="displayName:John"&$count=true
```

The `$search` query requires the `ConsistencyLevel: eventual` header and `$count=true`.

## License Management

### Available SKUs

List all license SKUs in the tenant with available and consumed counts.

**Endpoint**: `GET https://graph.microsoft.com/v1.0/subscribedSkus`

**Required scope**: `Directory.Read.All`

**Response shape**:

```typescript
interface SubscribedSku {
  id: string;
  skuId: string;
  skuPartNumber: string;
  appliesTo: string;
  capabilityStatus: "Enabled" | "Suspended" | "Deleted";
  consumedUnits: number;
  prepaidUnits: {
    enabled: number;
    suspended: number;
    warning: number;
  };
  servicePlans: ServicePlan[];
}

interface ServicePlan {
  servicePlanId: string;
  servicePlanName: string;
  provisioningStatus: string;
  appliesTo: string;
}
```

**Available count** = `prepaidUnits.enabled - consumedUnits`

### Common SKU IDs

| License | skuPartNumber | skuId |
|---|---|---|
| Office 365 E1 | `STANDARDPACK` | `18181a46-0d4e-45cd-891e-60aabd171b4e` |
| Office 365 E3 | `ENTERPRISEPACK` | `6fd2c87f-b296-42f0-b197-1e91e994b900` |
| Office 365 E5 | `ENTERPRISEPREMIUM` | `c7df2760-2c81-4ef7-b578-5b5392b571df` |
| Microsoft 365 Business Basic | `O365_BUSINESS_ESSENTIALS` | `3b555118-da6a-4418-894f-7df1e2096870` |
| Microsoft 365 Business Standard | `O365_BUSINESS_PREMIUM` | `f245ecc8-75af-4f8e-b61f-27d8114de5f3` |
| Microsoft 365 Business Premium | `SPB` | `cbdc14ab-d96c-4c30-b9f4-6ada7cdc1d46` |
| Microsoft 365 E3 | `SPE_E3` | `05e9a617-0261-4cee-bb44-138d3ef5d965` |
| Microsoft 365 E5 | `SPE_E5` | `06ebc4ee-1bb5-47dd-8120-11324bc54e06` |
| Power BI Pro | `POWER_BI_PRO` | `f8a1db68-be16-40ed-86d5-cb42ce701560` |
| Power BI Premium Per User | `PBI_PREMIUM_PER_USER` | `c1d032e0-5619-4761-9b5c-7b1f0b8ac0d0` |
| Exchange Online Plan 1 | `EXCHANGESTANDARD` | `4b9405b0-7788-4568-add1-99614e613b69` |
| Exchange Online Plan 2 | `EXCHANGEENTERPRISE` | `19ec0d23-8335-4cbd-94ac-6050e30712fa` |
| Microsoft Teams Essentials | `TEAMS_ESSENTIALS_AAD` | `fce28c4e-0f42-4b9f-95a1-39a1d0281a63` |
| Azure AD Premium P1 | `AAD_PREMIUM` | `078d2b04-f1bd-4111-bbd4-b4b1b354cef4` |
| Azure AD Premium P2 | `AAD_PREMIUM_P2` | `84a661c4-e949-4bd2-a560-ed7766fcaf2b` |
| Visio Plan 2 | `VISIOCLIENT` | `c5928f49-12ba-48f7-ada3-0d743a3601d5` |
| Project Plan 3 | `PROJECTPROFESSIONAL` | `53818b1b-4a27-454b-8896-0dba576410e6` |

### Assign License

Assign one or more licenses to a user. The user must have `usageLocation` set before license assignment.

**Endpoint**: `POST https://graph.microsoft.com/v1.0/users/{id}/assignLicense`

**Required scope**: `User.ReadWrite.All`

```typescript
interface AssignLicenseRequest {
  addLicenses: Array<{
    skuId: string;
    disabledPlans?: string[];  // service plan IDs to exclude
  }>;
  removeLicenses: string[];  // skuIds to remove
}
```

To assign a license while disabling specific service plans (e.g., assign E3 but disable Yammer):

```json
{
  "addLicenses": [
    {
      "skuId": "6fd2c87f-b296-42f0-b197-1e91e994b900",
      "disabledPlans": ["7547a3fe-08ee-4ccb-b430-5077c5899571"]
    }
  ],
  "removeLicenses": []
}
```

To remove a license:

```json
{
  "addLicenses": [],
  "removeLicenses": ["6fd2c87f-b296-42f0-b197-1e91e994b900"]
}
```

### Get User Licenses

**Endpoint**: `GET https://graph.microsoft.com/v1.0/users/{id}?$select=assignedLicenses,licenseAssignmentStates`

```typescript
interface AssignedLicense {
  skuId: string;
  disabledPlans: string[];
}

interface LicenseAssignmentState {
  skuId: string;
  assignedByGroup: string | null;
  state: "Active" | "ActiveWithError" | "Disabled" | "Error";
  error: string | null;
}
```

### Bulk User Operations via $batch

For creating or updating multiple users efficiently, use the `$batch` endpoint. Each batch can contain up to 20 requests.

```typescript
interface BatchUserCreate {
  id: string;
  method: "POST";
  url: "/users";
  body: CreateUserRequest;
  headers: { "Content-Type": "application/json" };
}

async function batchCreateUsers(
  graphClient: Client,
  users: CreateUserRequest[],
): Promise<Map<string, { status: number; body: UserResponse | GraphErrorResponse }>> {
  const results = new Map();
  const batchSize = 20;

  for (let i = 0; i < users.length; i += batchSize) {
    const batch = users.slice(i, i + batchSize);
    const payload = {
      requests: batch.map((user, idx) => ({
        id: String(i + idx),
        method: "POST" as const,
        url: "/users",
        body: user,
        headers: { "Content-Type": "application/json" },
      })),
    };

    const response = await graphClient.api("/$batch").post(payload);
    for (const r of response.responses) {
      results.set(r.id, { status: r.status, body: r.body });
    }
  }

  return results;
}
```

### Checking User Existence

Before creating a user, verify the UPN is not already taken:

```
GET /users?$filter=userPrincipalName eq 'john.doe@contoso.com'&$count=true
```

Requires header `ConsistencyLevel: eventual`. If `@odata.count` is 0, the UPN is available.

### Manager Assignment

Set or get a user's manager:

**Set manager**:
```
PUT https://graph.microsoft.com/v1.0/users/{userId}/manager/$ref
Content-Type: application/json

{
  "@odata.id": "https://graph.microsoft.com/v1.0/users/{managerId}"
}
```

**Get manager**:
```
GET https://graph.microsoft.com/v1.0/users/{userId}/manager
```

**Get direct reports**:
```
GET https://graph.microsoft.com/v1.0/users/{userId}/directReports
```

### User Photo

Set or get a user's profile photo:

**Set photo**: `PUT /users/{id}/photo/$value` with `Content-Type: image/jpeg` body
**Get photo**: `GET /users/{id}/photo/$value`

Maximum photo size is 4 MB. Supported formats: JPEG, PNG, GIF, BMP.

## Group Management

### Security Groups

Create a security group (no mailbox, no Teams).

**Endpoint**: `POST https://graph.microsoft.com/v1.0/groups`

**Required scope**: `Group.ReadWrite.All`

```json
{
  "displayName": "IT Security Team",
  "description": "Security group for IT team access control",
  "mailEnabled": false,
  "mailNickname": "it-security-team",
  "securityEnabled": true
}
```

### Microsoft 365 Groups

Create an M365 group (includes mailbox, SharePoint site, Teams-ready).

```json
{
  "displayName": "Marketing Team",
  "description": "M365 group for the marketing department",
  "mailEnabled": true,
  "mailNickname": "marketing-team",
  "securityEnabled": false,
  "groupTypes": ["Unified"],
  "visibility": "Private"
}
```

`visibility` can be `"Private"` or `"Public"`. The `"Unified"` group type designates it as an M365 group.

### Distribution Lists

Distribution lists (distribution groups) cannot be created directly via Microsoft Graph. Use Exchange Online PowerShell:

```powershell
New-DistributionGroup -Name "All Staff" -Alias "all-staff" -PrimarySmtpAddress "all-staff@contoso.com" -Type "Distribution"
Add-DistributionGroupMember -Identity "All Staff" -Member "user@contoso.com"
```

### Group Membership

**Add member**:

```
POST https://graph.microsoft.com/v1.0/groups/{groupId}/members/$ref
Content-Type: application/json

{
  "@odata.id": "https://graph.microsoft.com/v1.0/directoryObjects/{userId}"
}
```

**Remove member**:

```
DELETE https://graph.microsoft.com/v1.0/groups/{groupId}/members/{userId}/$ref
```

**List members**:

```
GET https://graph.microsoft.com/v1.0/groups/{groupId}/members?$select=id,displayName,userPrincipalName
```

**Get user's groups**:

```
GET https://graph.microsoft.com/v1.0/users/{userId}/memberOf?$select=id,displayName,groupTypes,mailEnabled,securityEnabled
```

### Add Owner to Group

```
POST https://graph.microsoft.com/v1.0/groups/{groupId}/owners/$ref
Content-Type: application/json

{
  "@odata.id": "https://graph.microsoft.com/v1.0/users/{userId}"
}
```

## Role Assignments

Assign directory roles (e.g., User Administrator, Exchange Administrator) to users.

**Endpoint**: `POST https://graph.microsoft.com/v1.0/roleManagement/directory/roleAssignments`

**Required scope**: `RoleManagement.ReadWrite.Directory`

```typescript
interface RoleAssignment {
  principalId: string;          // user or group ID
  roleDefinitionId: string;     // role template ID
  directoryScopeId: string;     // "/" for tenant-wide
}
```

**Common role template IDs**:

| Role | roleDefinitionId |
|---|---|
| Global Administrator | `62e90394-69f5-4237-9190-012177145e10` |
| User Administrator | `fe930be7-5e62-47db-91af-98c3a49a38b1` |
| Exchange Administrator | `29232cdf-9323-42fd-ade2-1d097af3e4de` |
| SharePoint Administrator | `f28a1f50-f6e7-4571-818b-6a12f2af6b6c` |
| Teams Administrator | `69091246-20e8-4a56-aa4d-066075b2a7a8` |
| Helpdesk Administrator | `729827e3-9c14-49f7-bb1b-9608f156bbb8` |
| License Administrator | `4d6ac14f-3453-41d0-bef9-a3e0c569773a` |
| Security Administrator | `194ae4cb-b126-40b2-bd5b-6091b380977d` |
| Reports Reader | `4a5d8f65-41da-4de4-8968-e035b65339cf` |

**Example**:

```json
{
  "principalId": "a1b2c3d4-...",
  "roleDefinitionId": "fe930be7-5e62-47db-91af-98c3a49a38b1",
  "directoryScopeId": "/"
}
```

## Sign-In Logs

Query sign-in activity for users in the tenant.

**Endpoint**: `GET https://graph.microsoft.com/v1.0/auditLogs/signIns`

**Required scope**: `AuditLog.Read.All`

**Required role**: Reports Reader, Security Reader, Security Administrator, or Global Administrator

```typescript
interface SignInLog {
  id: string;
  createdDateTime: string;
  userDisplayName: string;
  userPrincipalName: string;
  userId: string;
  appDisplayName: string;
  appId: string;
  ipAddress: string;
  clientAppUsed: string;
  status: {
    errorCode: number;
    failureReason: string;
    additionalDetails: string;
  };
  location: {
    city: string;
    state: string;
    countryOrRegion: string;
  };
  deviceDetail: {
    browser: string;
    operatingSystem: string;
  };
  conditionalAccessStatus: "success" | "failure" | "notApplied";
  riskDetail: string;
  riskLevelAggregated: string;
  riskLevelDuringSignIn: string;
  riskState: string;
}
```

**Filtering examples**:

```
GET /auditLogs/signIns?$filter=userPrincipalName eq 'user@contoso.com'&$top=50
GET /auditLogs/signIns?$filter=status/errorCode ne 0&$top=50&$orderby=createdDateTime desc
GET /auditLogs/signIns?$filter=createdDateTime ge 2025-01-01T00:00:00Z and createdDateTime le 2025-01-31T23:59:59Z
```

## Directory Audit Logs

Track all changes made in the directory.

**Endpoint**: `GET https://graph.microsoft.com/v1.0/auditLogs/directoryAudits`

```typescript
interface DirectoryAudit {
  id: string;
  activityDateTime: string;
  activityDisplayName: string;
  category: string;
  result: "success" | "failure" | "timeout" | "unknownFutureValue";
  initiatedBy: {
    user: {
      id: string;
      displayName: string;
      userPrincipalName: string;
    } | null;
    app: {
      appId: string;
      displayName: string;
    } | null;
  };
  targetResources: Array<{
    id: string;
    displayName: string;
    type: string;
    modifiedProperties: Array<{
      displayName: string;
      oldValue: string;
      newValue: string;
    }>;
  }>;
}
```

**Filtering examples**:

```
GET /auditLogs/directoryAudits?$filter=activityDisplayName eq 'Add user'
GET /auditLogs/directoryAudits?$filter=activityDisplayName eq 'Update user' and targetResources/any(t: t/id eq '{userId}')
GET /auditLogs/directoryAudits?$filter=category eq 'GroupManagement'
```

## Named Locations

Named locations define trusted IP ranges or countries used in Conditional Access policies.

**Required scope**: `Policy.ReadWrite.ConditionalAccess`

### List Named Locations

```
GET https://graph.microsoft.com/v1.0/identity/conditionalAccess/namedLocations
```

### Create IP-Based Named Location

```
POST https://graph.microsoft.com/v1.0/identity/conditionalAccess/namedLocations
Content-Type: application/json

{
  "@odata.type": "#microsoft.graph.ipNamedLocation",
  "displayName": "Corporate Office IPs",
  "isTrusted": true,
  "ipRanges": [
    { "@odata.type": "#microsoft.graph.iPv4CidrRange", "cidrAddress": "198.51.100.0/24" },
    { "@odata.type": "#microsoft.graph.iPv4CidrRange", "cidrAddress": "203.0.113.0/28" }
  ]
}
```

### Create Country-Based Named Location

```
POST https://graph.microsoft.com/v1.0/identity/conditionalAccess/namedLocations
Content-Type: application/json

{
  "@odata.type": "#microsoft.graph.countryNamedLocation",
  "displayName": "Allowed Countries",
  "countriesAndRegions": ["US", "CA", "GB"],
  "includeUnknownCountriesAndRegions": false
}
```

### Update / Delete Named Location

```
PATCH https://graph.microsoft.com/v1.0/identity/conditionalAccess/namedLocations/{locationId}
DELETE https://graph.microsoft.com/v1.0/identity/conditionalAccess/namedLocations/{locationId}
```

## Authentication Strength Policies

Authentication strength defines which authentication method combinations satisfy Conditional Access requirements.

**Required scope**: `Policy.ReadWrite.ConditionalAccess`

### List Authentication Strengths

```
GET https://graph.microsoft.com/v1.0/policies/authenticationStrengthPolicies
```

Built-in policies: `00000000-0000-0000-0000-000000000002` (MFA), `00000000-0000-0000-0000-000000000003` (Passwordless MFA), `00000000-0000-0000-0000-000000000004` (Phishing-resistant MFA).

### Create Custom Authentication Strength

```
POST https://graph.microsoft.com/v1.0/policies/authenticationStrengthPolicies
Content-Type: application/json

{
  "displayName": "Hardware Key Required",
  "description": "Requires FIDO2 or Windows Hello for Business",
  "allowedCombinations": [
    "fido2",
    "windowsHelloForBusiness"
  ]
}
```

## Self-Service Password Reset (SSPR) Policy

**Required scope**: `Policy.ReadWrite.Authentication`

### Get SSPR Policy

```
GET https://graph.microsoft.com/v1.0/policies/authenticationMethodsPolicy
```

### Enable/Disable SSPR for All Users or Selected Groups

```
PATCH https://graph.microsoft.com/v1.0/policies/authenticationMethodsPolicy
Content-Type: application/json

{
  "registrationEnforcement": {
    "authenticationMethodsRegistrationCampaign": {
      "state": "enabled",
      "snoozeDurationInDays": 14,
      "includeTargets": [
        {
          "id": "all_users",
          "targetType": "group",
          "authenticationMethod": "microsoftAuthenticator"
        }
      ]
    }
  }
}
```

## MFA Methods Administration

**Required scope**: `UserAuthenticationMethod.ReadWrite.All`

### List User's Authentication Methods

```
GET https://graph.microsoft.com/v1.0/users/{userId}/authentication/methods
```

### List Phone Authentication Methods

```
GET https://graph.microsoft.com/v1.0/users/{userId}/authentication/phoneMethods
```

### Delete an Authentication Method (force re-registration)

```
DELETE https://graph.microsoft.com/v1.0/users/{userId}/authentication/phoneMethods/{phoneMethodId}
DELETE https://graph.microsoft.com/v1.0/users/{userId}/authentication/microsoftAuthenticatorMethods/{methodId}
DELETE https://graph.microsoft.com/v1.0/users/{userId}/authentication/fido2Methods/{methodId}
```

### Require Re-Registration at Next Sign-In

```
POST https://graph.microsoft.com/v1.0/users/{userId}/authentication/requirements
Content-Type: application/json

{
  "perUserMfaState": "enabled"
}
```

## Security Defaults

Security defaults enable baseline protection (MFA required, legacy auth blocked) for free/basic tenants. Mutually exclusive with Conditional Access policies.

**Required scope**: `Policy.ReadWrite.SecurityDefaults`

### Get Security Defaults Status

```
GET https://graph.microsoft.com/v1.0/policies/identitySecurityDefaultsEnforcementPolicy
```

### Enable Security Defaults

```
PATCH https://graph.microsoft.com/v1.0/policies/identitySecurityDefaultsEnforcementPolicy
Content-Type: application/json

{ "isEnabled": true }
```

### Disable Security Defaults (required before creating Conditional Access policies)

```
PATCH https://graph.microsoft.com/v1.0/policies/identitySecurityDefaultsEnforcementPolicy
Content-Type: application/json

{ "isEnabled": false }
```

**Warning**: Disabling security defaults removes baseline protection. Only do this if you have equivalent Conditional Access policies in place.
