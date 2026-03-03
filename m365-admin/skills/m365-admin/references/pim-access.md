# Privileged Identity Management (PIM) and Identity Governance

This reference covers PIM role management, access reviews, and entitlement management via Microsoft Graph API.

## Required Scopes

| Operation | Scope |
|---|---|
| PIM role eligibility / activation | `RoleManagement.ReadWrite.Directory` |
| PIM for Groups | `PrivilegedAccess.ReadWrite.AzureADGroup` |
| Access Reviews | `AccessReview.ReadWrite.All` |
| Entitlement Management | `EntitlementManagement.ReadWrite.All` |

**Note**: Most PIM operations require the user to have the Privileged Role Administrator or Global Administrator role.

## PIM — Directory Roles

### List Role Eligibility Schedules (who is eligible for which role)

```
GET https://graph.microsoft.com/v1.0/roleManagement/directory/roleEligibilitySchedules?$expand=principal,roleDefinition
```

Filter by principal:

```
?$filter=principalId eq 'user-object-id'
```

### List Active Role Assignment Instances

Currently active (JIT-activated) role assignments:

```
GET https://graph.microsoft.com/v1.0/roleManagement/directory/roleAssignmentScheduleInstances?$expand=principal,roleDefinition
```

### Make User Eligible for a Role (create eligibility schedule)

```
POST https://graph.microsoft.com/v1.0/roleManagement/directory/roleEligibilityScheduleRequests
Content-Type: application/json

{
  "action": "AdminAssign",
  "justification": "User requires eligibility for Global Reader for audit purposes",
  "roleDefinitionId": "f2ef992c-3afb-46b9-b7cf-a126ee74c451",
  "directoryScopeId": "/",
  "principalId": "user-object-id",
  "scheduleInfo": {
    "startDateTime": "2024-01-01T00:00:00Z",
    "expiration": {
      "type": "afterDuration",
      "duration": "P365D"
    }
  }
}
```

Common `roleDefinitionId` values:
- Global Administrator: `62e90394-69f5-4237-9190-012177145e10`
- Privileged Role Administrator: `e8611ab8-c189-46e8-94e1-60213ab1f814`
- Security Administrator: `194ae4cb-b126-40b2-bd5b-6091b380977d`
- Global Reader: `f2ef992c-3afb-46b9-b7cf-a126ee74c451`
- User Administrator: `fe930be7-5e62-47db-91af-98c3a49a38b1`
- Exchange Administrator: `29232cdf-9323-42fd-ade2-1d097af3e4de`
- SharePoint Administrator: `f28a1f50-f6e7-4571-818b-6a12f2af6b6c`
- Teams Administrator: `69091246-20e8-4a56-aa4d-066075b2a7a8`

### Activate an Eligible Role (JIT self-activation)

```
POST https://graph.microsoft.com/v1.0/roleManagement/directory/roleAssignmentScheduleRequests
Content-Type: application/json

{
  "action": "SelfActivate",
  "principalId": "user-object-id",
  "roleDefinitionId": "f2ef992c-3afb-46b9-b7cf-a126ee74c451",
  "directoryScopeId": "/",
  "justification": "Performing quarterly access review",
  "scheduleInfo": {
    "startDateTime": "2024-01-15T09:00:00Z",
    "expiration": {
      "type": "afterDuration",
      "duration": "PT4H"
    }
  }
}
```

### Deactivate an Active Role Assignment

```
POST https://graph.microsoft.com/v1.0/roleManagement/directory/roleAssignmentScheduleRequests
Content-Type: application/json

{
  "action": "SelfDeactivate",
  "principalId": "user-object-id",
  "roleDefinitionId": "f2ef992c-3afb-46b9-b7cf-a126ee74c451",
  "directoryScopeId": "/"
}
```

### Remove Role Eligibility (AdminRemove)

```
POST https://graph.microsoft.com/v1.0/roleManagement/directory/roleEligibilityScheduleRequests
Content-Type: application/json

{
  "action": "AdminRemove",
  "principalId": "user-object-id",
  "roleDefinitionId": "f2ef992c-3afb-46b9-b7cf-a126ee74c451",
  "directoryScopeId": "/"
}
```

## PIM for Groups

Manage privileged access to Microsoft 365 Groups and Security Groups.

### Assign Group Membership via PIM

```
POST https://graph.microsoft.com/v1.0/identityGovernance/privilegedAccess/group/assignmentScheduleRequests
Content-Type: application/json

{
  "action": "AdminAssign",
  "groupId": "group-object-id",
  "principalId": "user-object-id",
  "accessId": "member",
  "justification": "Granting time-limited access to the group",
  "scheduleInfo": {
    "startDateTime": "2024-01-01T00:00:00Z",
    "expiration": {
      "type": "afterDuration",
      "duration": "P30D"
    }
  }
}
```

`accessId` values: `"member"` or `"owner"`.

## Access Reviews

### List Access Review Definitions

```
GET https://graph.microsoft.com/v1.0/identityGovernance/accessReviews/definitions
```

### Create Access Review for Group Membership

```
POST https://graph.microsoft.com/v1.0/identityGovernance/accessReviews/definitions
Content-Type: application/json

{
  "displayName": "Quarterly Admin Group Review",
  "descriptionForAdmins": "Review membership of the privileged admin group",
  "scope": {
    "@odata.type": "#microsoft.graph.groupMembers",
    "groupId": "group-object-id"
  },
  "reviewers": [
    {
      "query": "/groups/{group-object-id}/owners",
      "queryType": "MicrosoftGraph"
    }
  ],
  "settings": {
    "mailNotificationsEnabled": true,
    "reminderNotificationsEnabled": true,
    "justificationRequiredOnApproval": true,
    "autoApplyDecisionsEnabled": true,
    "defaultDecision": "Deny",
    "instanceDurationInDays": 14,
    "recurrence": {
      "pattern": {
        "type": "absoluteMonthly",
        "interval": 3
      },
      "range": {
        "type": "noEnd",
        "startDate": "2024-01-01"
      }
    }
  }
}
```

### List Active Review Instances

```
GET https://graph.microsoft.com/v1.0/identityGovernance/accessReviews/definitions/{definitionId}/instances
```

### List Review Decisions for an Instance

```
GET https://graph.microsoft.com/v1.0/identityGovernance/accessReviews/definitions/{definitionId}/instances/{instanceId}/decisions
```

### Apply Review Decisions Manually

```
POST https://graph.microsoft.com/v1.0/identityGovernance/accessReviews/definitions/{definitionId}/instances/{instanceId}/applyDecisions
```

### Stop a Review Instance

```
POST https://graph.microsoft.com/v1.0/identityGovernance/accessReviews/definitions/{definitionId}/instances/{instanceId}/stop
```

## Entitlement Management

### List Access Packages

```
GET https://graph.microsoft.com/v1.0/identityGovernance/entitlementManagement/accessPackages
```

### Get Access Package with Resources

```
GET https://graph.microsoft.com/v1.0/identityGovernance/entitlementManagement/accessPackages/{packageId}?$expand=resourceRoleScopes($expand=role,scope)
```

### List Access Package Assignments

```
GET https://graph.microsoft.com/v1.0/identityGovernance/entitlementManagement/assignments?$filter=accessPackageId eq '{packageId}'&$expand=target
```

### Create Access Package Assignment Request (user self-service)

```
POST https://graph.microsoft.com/v1.0/identityGovernance/entitlementManagement/assignmentRequests
Content-Type: application/json

{
  "requestType": "UserAdd",
  "accessPackageAssignment": {
    "accessPackageId": "access-package-id"
  }
}
```

### List Catalogs

```
GET https://graph.microsoft.com/v1.0/identityGovernance/entitlementManagement/catalogs
```

## PIM Alerts and Insights

### List PIM Role Alerts

```
GET https://graph.microsoft.com/beta/identityGovernance/roleManagementAlerts/alerts?$filter=scopeType eq 'DirectoryRole'&$expand=alertDefinition,alertConfiguration
```

Common alert types:
- Too many global admins
- Roles assigned outside PIM
- Global admins who never activated

## Reporting: Privileged Access Summary

To generate a privileged access report, combine:

1. All currently eligible principals: `GET /roleManagement/directory/roleEligibilitySchedules?$expand=principal,roleDefinition`
2. All currently active assignments: `GET /roleManagement/directory/roleAssignmentScheduleInstances?$expand=principal,roleDefinition`
3. All permanent assignments (outside PIM): `GET /roleManagement/directory/roleAssignments?$expand=principal,roleDefinition`

Cross-reference with Entra sign-in logs to identify dormant privileged accounts.

## PIM Role Settings (Policy Rules)

PIM role behavior is controlled by a set of policy rules attached to each role via the `unifiedRoleManagementPolicy` resource. Every role has one policy, and each policy has multiple named rules. Use `PATCH` on individual rules to change behavior.

### Step 1: Find the Policy for a Role

```
GET https://graph.microsoft.com/v1.0/policies/roleManagementPolicyAssignments?$filter=scopeId eq '/' and scopeType eq 'DirectoryRole' and roleDefinitionId eq '{roleDefinitionId}'
```

The response contains a `policyId` field (e.g., `DirectoryRole_<tenantId>_<policyId>`). Use this in all subsequent rule updates.

### Step 2: List All Rules for the Policy

```
GET https://graph.microsoft.com/v1.0/policies/roleManagementPolicies/{policyId}/rules
```

### Key Rule IDs Reference

| Rule ID | Type | Controls |
|---|---|---|
| `Expiration_EndUser_Assignment` | `unifiedRoleManagementPolicyExpirationRule` | Maximum activation duration |
| `Enablement_EndUser_Assignment` | `unifiedRoleManagementPolicyEnablementRule` | MFA, justification, ticketing on activation |
| `Approval_EndUser_Assignment` | `unifiedRoleManagementPolicyApprovalRule` | Approval requirement and approvers |
| `Expiration_Admin_Eligibility` | `unifiedRoleManagementPolicyExpirationRule` | Maximum eligibility assignment duration |
| `Enablement_Admin_Assignment` | `unifiedRoleManagementPolicyEnablementRule` | MFA/justification for permanent assignments |
| `Notification_Admin_Admin_Eligibility` | `unifiedRoleManagementPolicyNotificationRule` | Email notifications for eligibility changes |
| `Notification_Admin_Admin_Assignment` | `unifiedRoleManagementPolicyNotificationRule` | Email notifications for active assignments |

### Set Maximum Activation Duration

Controls how long a JIT-activated assignment lasts (ISO 8601 duration format):

```
PATCH https://graph.microsoft.com/v1.0/policies/roleManagementPolicies/{policyId}/rules/Expiration_EndUser_Assignment
Content-Type: application/json

{
  "@odata.type": "#microsoft.graph.unifiedRoleManagementPolicyExpirationRule",
  "id": "Expiration_EndUser_Assignment",
  "isExpirationRequired": true,
  "maximumDuration": "PT8H",
  "target": {
    "@odata.type": "microsoft.graph.unifiedRoleManagementPolicyRuleTarget",
    "caller": "EndUser",
    "operations": ["All"],
    "level": "Assignment",
    "inheritableSettings": [],
    "enforcedSettings": []
  }
}
```

Common `maximumDuration` values:
- `PT1H` — 1 hour
- `PT4H` — 4 hours (recommended default)
- `PT8H` — 8 hours (full workday)
- `P1D` — 24 hours

### Require MFA and Justification on Activation

```
PATCH https://graph.microsoft.com/v1.0/policies/roleManagementPolicies/{policyId}/rules/Enablement_EndUser_Assignment
Content-Type: application/json

{
  "@odata.type": "#microsoft.graph.unifiedRoleManagementPolicyEnablementRule",
  "id": "Enablement_EndUser_Assignment",
  "enabledRules": [
    "MultiFactorAuthentication",
    "Justification"
  ],
  "target": {
    "@odata.type": "microsoft.graph.unifiedRoleManagementPolicyRuleTarget",
    "caller": "EndUser",
    "operations": ["All"],
    "level": "Assignment",
    "inheritableSettings": [],
    "enforcedSettings": []
  }
}
```

`enabledRules` values:
- `"MultiFactorAuthentication"` — requires MFA step-up at activation time
- `"Justification"` — requires the user to enter a business justification
- `"Ticketing"` — requires a ticket number (system and number)

To disable a requirement, remove it from the `enabledRules` array. An empty array disables all.

### Set Maximum Eligibility Duration

Controls how long an administrator can make a user eligible for a role (separate from the activation window):

```
PATCH https://graph.microsoft.com/v1.0/policies/roleManagementPolicies/{policyId}/rules/Expiration_Admin_Eligibility
Content-Type: application/json

{
  "@odata.type": "#microsoft.graph.unifiedRoleManagementPolicyExpirationRule",
  "id": "Expiration_Admin_Eligibility",
  "isExpirationRequired": true,
  "maximumDuration": "P365D",
  "target": {
    "@odata.type": "microsoft.graph.unifiedRoleManagementPolicyRuleTarget",
    "caller": "Admin",
    "operations": ["All"],
    "level": "Eligibility",
    "inheritableSettings": [],
    "enforcedSettings": []
  }
}
```

Set `isExpirationRequired: false` to allow permanent eligibility assignments (not recommended for privileged roles).

## PIM Approval Workflows

When approval is required (`isApprovalRequired: true`), activation requests are placed in a pending state until an approved approver acts on them.

### Require Approval and Set Approvers

Approvers can be individual users or group members. When a group is specified, any member of the group can approve:

```
PATCH https://graph.microsoft.com/v1.0/policies/roleManagementPolicies/{policyId}/rules/Approval_EndUser_Assignment
Content-Type: application/json

{
  "@odata.type": "#microsoft.graph.unifiedRoleManagementPolicyApprovalRule",
  "id": "Approval_EndUser_Assignment",
  "target": {
    "@odata.type": "microsoft.graph.unifiedRoleManagementPolicyRuleTarget",
    "caller": "EndUser",
    "operations": ["All"],
    "level": "Assignment",
    "inheritableSettings": [],
    "enforcedSettings": []
  },
  "setting": {
    "@odata.type": "microsoft.graph.approvalSettings",
    "isApprovalRequired": true,
    "isApprovalRequiredForExtension": false,
    "isRequestorJustificationRequired": true,
    "approvalMode": "SingleStage",
    "approvalStages": [
      {
        "approvalStageTimeOutInDays": 1,
        "isApproverJustificationRequired": true,
        "escalationTimeInMinutes": 0,
        "isEscalationEnabled": false,
        "primaryApprovers": [
          {
            "@odata.type": "#microsoft.graph.singleUser",
            "userId": "approver-user-object-id"
          },
          {
            "@odata.type": "#microsoft.graph.groupMembers",
            "groupId": "pim-approvers-group-object-id"
          }
        ],
        "escalationApprovers": []
      }
    ]
  }
}
```

**Key fields:**
- `approvalStageTimeOutInDays`: Request expires if not acted upon within this many days (1–14)
- `isApprovalRequiredForExtension`: Whether extending an active assignment also requires approval
- `isRequestorJustificationRequired`: Requestor must provide justification (separate from the Enablement rule)
- `primaryApprovers`: List of `singleUser` or `groupMembers` objects; if no approvers are set, Privileged Role Administrators become the default

### Disable Approval Requirement

```
PATCH https://graph.microsoft.com/v1.0/policies/roleManagementPolicies/{policyId}/rules/Approval_EndUser_Assignment
Content-Type: application/json

{
  "@odata.type": "#microsoft.graph.unifiedRoleManagementPolicyApprovalRule",
  "id": "Approval_EndUser_Assignment",
  "setting": {
    "@odata.type": "microsoft.graph.approvalSettings",
    "isApprovalRequired": false
  }
}
```

### View Pending Activation Requests

```
GET https://graph.microsoft.com/v1.0/roleManagement/directory/roleAssignmentScheduleRequests?$filter=status eq 'PendingApproval'&$expand=principal,roleDefinition,targetSchedule
```

### Approve or Deny a Request

Approvers use the same `/roleAssignmentScheduleRequests` endpoint with `action: "AdminApprove"` or `"AdminDeny"`:

```
POST https://graph.microsoft.com/v1.0/roleManagement/directory/roleAssignmentScheduleRequests
Content-Type: application/json

{
  "action": "AdminApprove",
  "justification": "Approved for emergency access — incident #INC-12345",
  "approvalId": "pending-request-object-id"
}
```

## PIM Alerts

PIM alerts detect configuration drift and security risks. The alerts API is on the `/beta` endpoint.

### List All PIM Role Alerts

```
GET https://graph.microsoft.com/beta/identityGovernance/roleManagementAlerts/alerts?$filter=scopeType eq 'DirectoryRole'&$expand=alertDefinition,alertConfiguration,alertIncidents
```

### Common Alert Types and Their Meanings

| Alert Definition ID | Description | Severity |
|---|---|---|
| `TooManyGlobalAdminsAssignedToTenantAlert` | More than 5 users hold Global Administrator | High |
| `RolesAssignedOutsidePimAlert` | One or more roles were assigned outside PIM (permanent, direct assignment) | High |
| `RedundantAssignmentAlert` | A user is permanently active in a role but also has an eligible assignment | Medium |
| `GlocalAdminShouldActivatePimAlert` | Global Admins who never activated their role in PIM in 180 days | Medium |
| `StaleSignInAlert` | Eligible users who have not signed in for 180+ days | Low |

### Get Alert Incidents (Affected Principals)

```
GET https://graph.microsoft.com/beta/identityGovernance/roleManagementAlerts/alerts/{alertId}/alertIncidents
```

Each incident identifies the specific user and role that triggered the alert.

### Remediate an Alert

```
POST https://graph.microsoft.com/beta/identityGovernance/roleManagementAlerts/alerts/{alertId}/remediate
```

Triggers the automated remediation action defined by the alert (e.g., converts permanent assignments to eligible).

### Dismiss an Alert

```
POST https://graph.microsoft.com/beta/identityGovernance/roleManagementAlerts/alerts/{alertId}/dismiss
```

Dismissing does not fix the underlying condition; the alert will reappear if the condition persists after a refresh.

### Refresh Alerts

```
POST https://graph.microsoft.com/beta/identityGovernance/roleManagementAlerts/operations/refresh
Content-Type: application/json

{
  "scopeType": "DirectoryRole",
  "scopeId": "/"
}
```

## PIM Audit Logs

PIM-related operations (role activations, assignments, approvals) are recorded in the Entra audit log under the `RoleManagement` category.

### Query Role Management Audit Events

```
GET https://graph.microsoft.com/v1.0/auditLogs/directoryAudits?$filter=category eq 'RoleManagement'&$orderby=activityDateTime desc&$top=50
```

### Filter for Role Activations Only

```
GET https://graph.microsoft.com/v1.0/auditLogs/directoryAudits?$filter=category eq 'RoleManagement' and activityDisplayName eq 'Add member to role completed (PIM activation)'&$orderby=activityDateTime desc
```

### Filter for Role Assignments by a Specific Admin

```
GET https://graph.microsoft.com/v1.0/auditLogs/directoryAudits?$filter=category eq 'RoleManagement' and initiatedBy/user/userPrincipalName eq 'admin@contoso.com'&$orderby=activityDateTime desc
```

### Common Audit Activity Display Names

| `activityDisplayName` | Meaning |
|---|---|
| `Add member to role completed (PIM activation)` | User successfully activated a role |
| `Add member to role requested (PIM activation)` | User submitted an activation request |
| `Remove member from role completed (PIM activation)` | User deactivated a role |
| `Add eligible member to role` | Admin created an eligibility schedule |
| `Remove eligible member from role` | Admin removed an eligibility |
| `Add member to role` | Permanent (non-PIM) role assignment |
| `Approve request to activate role (PIM approval)` | Approver approved a pending request |
| `Deny request to activate role (PIM approval)` | Approver denied a pending request |

### Audit Log Response Structure

```json
{
  "id": "audit-event-id",
  "category": "RoleManagement",
  "activityDisplayName": "Add member to role completed (PIM activation)",
  "activityDateTime": "2025-03-01T09:12:34Z",
  "loggedByService": "PIM",
  "result": "success",
  "initiatedBy": {
    "user": {
      "id": "user-object-id",
      "userPrincipalName": "jdoe@contoso.com",
      "displayName": "Jane Doe"
    }
  },
  "targetResources": [
    {
      "type": "Role",
      "displayName": "Global Reader",
      "modifiedProperties": [
        {
          "displayName": "RoleDefinitionOriginId",
          "newValue": "\"f2ef992c-3afb-46b9-b7cf-a126ee74c451\""
        }
      ]
    }
  ]
}
```

### Required Scope for Audit Logs

`AuditLog.Read.All` — read-only access to all audit log events.
