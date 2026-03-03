---
name: entra-pim-list
description: List PIM role assignments — eligible, active, and pending activations across the tenant or for a specific user
argument-hint: "[--principal <upn-or-id>] [--role <role-name-or-id>] [--type eligible|active|pending] [--expiring-soon] [--mine]"
allowed-tools:
  - Read
  - Write
  - Bash
---

# List PIM Role Assignments

Audit PIM assignments across the tenant. Shows eligible assignments, currently active (activated) assignments, and pending approval requests.

## Steps

### 1. Determine Filter

- `--mine`: use `GET /me?$select=id` → filter by current user's ID
- `--principal`: resolve to object ID
- `--role`: resolve to role definition ID
- `--type eligible|active|pending`
- `--expiring-soon`: filter assignments expiring within 30 days

### 2. Get Eligible Assignments

```
GET https://graph.microsoft.com/beta/roleManagement/directory/roleEligibilitySchedules
  ?$filter=<principal-filter if any>
  &$expand=principal($select=id,displayName,userPrincipalName),
           roleDefinition($select=displayName)
  &$select=id,scheduleInfo,status,directoryScopeId
```

### 3. Get Active (Activated) Assignments

```
GET https://graph.microsoft.com/beta/roleManagement/directory/roleAssignmentSchedules
  ?$filter=assignmentType eq 'Activated' <and principal-filter if any>
  &$expand=principal($select=id,displayName,userPrincipalName),
           roleDefinition($select=displayName)
  &$select=id,scheduleInfo,assignmentType,activatedUsing
```

### 4. Get Pending Requests

```
GET https://graph.microsoft.com/beta/roleManagement/directory/roleAssignmentScheduleRequests
  ?$filter=status eq 'PendingApproval'
  &$expand=principal($select=id,displayName,userPrincipalName),
           roleDefinition($select=displayName)
```

### 5. Filter Expiring Soon

For `--expiring-soon`, filter results where `scheduleInfo.expiration.endDateTime` is within 30 days of today.

### 6. Display Output

```
PIM Role Assignments
─────────────────────────────────────────────────────────────────
Tenant: contoso.onmicrosoft.com
─────────────────────────────────────────────────────────────────
ELIGIBLE ASSIGNMENTS (8)
 Principal               Role                          Expires
 Jane Smith              User Administrator            2026-08-28
 Bob Ops                 License Administrator         2026-09-01
 Alice Admin             Global Administrator          Never ⚠
─────────────────────────────────────────────────────────────────
ACTIVE (CURRENTLY ACTIVATED) (1)
 Principal               Role                          Until
 Jane Smith              User Administrator            Today 18:00 UTC
─────────────────────────────────────────────────────────────────
PENDING APPROVAL (1)
 Principal               Role                          Requested
 Charlie Dev             Global Administrator          2026-03-01 14:00
─────────────────────────────────────────────────────────────────
⚠ 1 assignment has no expiration (Alice Admin - Global Admin).
  Recommendation: Apply time-bound eligible assignment instead.
```

## Error Handling

| Code | Fix |
|------|-----|
| `403` | Add `PrivilegedAccess.Read.AzureResources` or `RoleManagement.Read.Directory` scope |
| `404 FeatureNotAvailable` | PIM not available — requires Entra ID P2 license |
