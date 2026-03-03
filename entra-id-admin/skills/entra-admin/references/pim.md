# Privileged Identity Management (PIM) — Reference

## PIM License Requirement

PIM requires **Microsoft Entra ID P2** or **Microsoft Entra ID Governance** license.
Feature is tenant-wide — applies to all users once enabled.

## API Base

All PIM operations use the **beta** endpoint:
```
https://graph.microsoft.com/beta/roleManagement/directory/
```

## PIM Role Assignment Types

| Type | Endpoint | Description |
|------|----------|-------------|
| Eligible (time-bound) | `roleEligibilityScheduleRequests` | User can activate the role on demand |
| Active (direct assignment) | `roleAssignmentScheduleRequests` | User is always active in the role |
| Activation (self-service) | `roleAssignmentScheduleRequests` (selfActivate) | User activates their eligible assignment |

## Create Eligible Assignment

```
POST /beta/roleManagement/directory/roleEligibilityScheduleRequests
```

```json
{
  "action": "adminAssign",
  "principalId": "<user-id>",
  "roleDefinitionId": "<role-definition-id>",
  "directoryScopeId": "/",
  "scheduleInfo": {
    "startDateTime": "2026-03-01T00:00:00Z",
    "expiration": {
      "type": "afterDuration",
      "duration": "P180D"
    }
  },
  "justification": "Developer requires temporary admin access for project deployment"
}
```

**Expiration types**:
- `noExpiration` — permanent eligible (not recommended for high privilege)
- `afterDuration` — relative to start, ISO 8601 duration (P180D = 180 days, PT8H = 8 hours)
- `afterDateTime` — absolute end date: `"endDateTime": "2026-09-01T00:00:00Z"`

## Create Active (Always-On) Assignment

```
POST /beta/roleManagement/directory/roleAssignmentScheduleRequests
```

```json
{
  "action": "adminAssign",
  "principalId": "<user-id>",
  "roleDefinitionId": "<role-definition-id>",
  "directoryScopeId": "/",
  "scheduleInfo": {
    "startDateTime": "2026-03-01T00:00:00Z",
    "expiration": { "type": "afterDuration", "duration": "P30D" }
  },
  "justification": "Emergency standing access for incident response team"
}
```

## Self-Activate Eligible Role

```
POST /beta/roleManagement/directory/roleAssignmentScheduleRequests
```

```json
{
  "action": "selfActivate",
  "principalId": "<my-user-id>",
  "roleDefinitionId": "<role-definition-id>",
  "directoryScopeId": "/",
  "justification": "Deploying production hotfix for critical bug P0-2026-0301",
  "scheduleInfo": {
    "startDateTime": "2026-03-01T10:00:00Z",
    "expiration": {
      "type": "afterDuration",
      "duration": "PT4H"
    }
  },
  "ticketInfo": {
    "ticketNumber": "INC0042",
    "ticketSystem": "ServiceNow"
  }
}
```

## Self-Deactivate Active Role

```
POST /beta/roleManagement/directory/roleAssignmentScheduleRequests
{
  "action": "selfDeactivate",
  "principalId": "<my-user-id>",
  "roleDefinitionId": "<role-definition-id>",
  "directoryScopeId": "/"
}
```

## List Eligible Assignments

```
# All eligible assignments in tenant
GET /beta/roleManagement/directory/roleEligibilitySchedules
  ?$expand=principal($select=id,displayName,userPrincipalName)
  &$expand=roleDefinition($select=displayName)

# Eligible assignments for a specific user
GET /beta/roleManagement/directory/roleEligibilitySchedules
  ?$filter=principalId eq '<user-id>'
  &$expand=roleDefinition($select=displayName)
```

## List Active Assignments (incl. Activated)

```
GET /beta/roleManagement/directory/roleAssignmentSchedules
  ?$filter=assignmentType eq 'Activated'
  &$expand=principal($select=id,displayName,userPrincipalName)
  &$expand=roleDefinition($select=displayName)
```

## Remove Eligible Assignment

```
POST /beta/roleManagement/directory/roleEligibilityScheduleRequests
{
  "action": "adminRemove",
  "principalId": "<user-id>",
  "roleDefinitionId": "<role-definition-id>",
  "directoryScopeId": "/"
}
```

## PIM Role Settings (Policy)

Configure per-role approval requirements, MFA requirement, justification, max duration:

```
GET /beta/policies/roleManagementPolicies?$filter=scopeId eq '/' and scopeType eq 'DirectoryRole'

# Get policy for a specific role
GET /beta/policies/roleManagementPolicies?$filter=scopeId eq '/' and scopeType eq 'DirectoryRole'
  &$expand=rules

PATCH /beta/policies/roleManagementPolicies/{policyId}/rules/{ruleId}
```

Common rule IDs:
- `Approval_EndUser_Assignment` — require approval for activation
- `AuthenticationContext_EndUser_Assignment` — require MFA on activation
- `Expiration_Admin_Assignment` — max duration for active assignments
- `Expiration_EndUser_Assignment` — max duration for eligible activations

## PIM for Groups

PIM can also manage group membership (requires configuring the group):

```
POST /beta/identityGovernance/privilegedAccess/group/eligibilityScheduleRequests
{
  "action": "adminAssign",
  "principalId": "<user-id>",
  "groupId": "<group-id>",
  "accessId": "member",
  "scheduleInfo": {
    "startDateTime": "2026-03-01T00:00:00Z",
    "expiration": { "type": "afterDuration", "duration": "P90D" }
  }
}
```

## Approval Workflows

Check pending approvals:
```
GET /beta/roleManagement/directory/roleAssignmentApprovals
  ?$filter=status eq 'Pending'
```

Approve or deny:
```
PATCH /beta/roleManagement/directory/roleAssignmentApprovals/{approvalId}/steps/{stepId}
{
  "reviewResult": "Approve",
  "justification": "Verified with manager — legitimate deployment need"
}
```
