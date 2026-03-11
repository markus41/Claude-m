---
name: entra-user-get
description: Get comprehensive details for a user including licenses, group memberships, MFA status, and last sign-in
argument-hint: "<upn-or-id> [--groups] [--licenses] [--mfa] [--signin] [--roles] [--full]"
allowed-tools:
  - Read
  - Write
  - Bash
---

# Get Entra ID User Details

Retrieve comprehensive user information. By default shows core properties. Use flags to include group memberships, licenses, MFA status, roles, and sign-in activity.

## Steps

### 1. Resolve User

```
GET https://graph.microsoft.com/v1.0/users/{upnOrId}
  ?$select=id,displayName,givenName,surname,userPrincipalName,mail,
    accountEnabled,userType,department,jobTitle,companyName,officeLocation,
    usageLocation,mobilePhone,businessPhones,createdDateTime,
    lastPasswordChangeDateTime,passwordPolicies,onPremisesSyncEnabled,
    onPremisesLastSyncDateTime,employeeId,employeeType,employeeHireDate,
    externalUserState,externalUserStateChangeDateTime,assignedLicenses,licenseAssignmentStates
```

### 2. Get Sign-In Activity (if --signin or --full)

```
GET https://graph.microsoft.com/v1.0/users/{userId}
  ?$select=signInActivity
```

Requires `AuditLog.Read.All` scope.

### 3. Get Group Memberships (if --groups or --full)

```
GET https://graph.microsoft.com/v1.0/users/{userId}/transitiveMemberOf/microsoft.graph.group
  ?$select=id,displayName,groupTypes,mailEnabled,securityEnabled
  &$top=999
```

### 4. Get Assigned Roles (if --roles or --full)

```
GET https://graph.microsoft.com/v1.0/roleManagement/directory/roleAssignments
  ?$filter=principalId eq '{userId}'
  &$expand=roleDefinition($select=displayName)
```

Also check PIM eligible roles:
```
GET https://graph.microsoft.com/beta/roleManagement/directory/roleEligibilitySchedules
  ?$filter=principalId eq '{userId}'
  &$expand=roleDefinition($select=displayName)
```

### 5. Get MFA Status (if --mfa or --full)

```
GET https://graph.microsoft.com/v1.0/reports/credentialUserRegistrationDetails/{userId}
```

Also list registered auth methods:
```
GET https://graph.microsoft.com/v1.0/users/{userId}/authentication/methods
```

### 6. Display Output

```
User Details
─────────────────────────────────────────────────────────────────
Display Name:    Jane Smith
UPN:             jane.smith@contoso.com
Object ID:       <user-id>
User Type:       Member (cloud-only)
Account:         ENABLED
─────────────────────────────────────────────────────────────────
Profile
  First Name:    Jane
  Last Name:     Smith
  Department:    Engineering
  Job Title:     Software Engineer
  Company:       Contoso
  Office:        Seattle HQ
  Location:      US
  Employee ID:   EMP001
  Hire Date:     2024-01-15
  Mobile:        +1-206-555-0100
─────────────────────────────────────────────────────────────────
Account
  Created:         2024-01-14
  Last PW Change:  2026-01-01
  PW Policy:       (default)
  On-Prem Sync:    No (cloud-only)
─────────────────────────────────────────────────────────────────
Sign-In Activity  [--signin]
  Last Sign-In:   2026-03-01 14:32:01 UTC
  Last Non-Interactive: 2026-03-01 14:45:00 UTC
─────────────────────────────────────────────────────────────────
Licenses  [--licenses]
  Microsoft 365 E3    (directly assigned)
  Intune              (group-inherited: SG-DevTeam)
─────────────────────────────────────────────────────────────────
Group Memberships  [--groups]  (14 groups)
  SG-DevTeam-Prod        (Security Group)
  Project Phoenix         (M365 Group)
  SG-Dept-Engineering    (Dynamic Security Group)
  ... and 11 more
─────────────────────────────────────────────────────────────────
Directory Roles  [--roles]
  Active:   User Administrator (tenant scope)
  Eligible: Global Administrator (PIM, expires 2026-09-01)
─────────────────────────────────────────────────────────────────
MFA Status  [--mfa]
  MFA Registered:   Yes
  Methods:          Microsoft Authenticator, FIDO2 Security Key
─────────────────────────────────────────────────────────────────
```

## Azure CLI Alternative

Quick user lookup with `az ad`:

```bash
# Show user details
az ad user show --id jane.smith@contoso.com

# List all users (tabular)
az ad user list \
  --query "[].{UPN:userPrincipalName, DisplayName:displayName, ID:id}" \
  --output table

# Get groups and roles the user belongs to
az ad user get-member-objects --id jane.smith@contoso.com \
  --security-enabled-only false
```

For sign-in activity and MFA details (not available via `az ad`), use `az rest`:

```bash
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/users/jane.smith@contoso.com?\$select=signInActivity"
```

## Error Handling

| Code | Fix |
|------|-----|
| `404` | User not found — verify UPN or object ID |
| `403` on signInActivity | Add `AuditLog.Read.All` scope |
| `403` on roles | Add `RoleManagement.Read.Directory` scope |
