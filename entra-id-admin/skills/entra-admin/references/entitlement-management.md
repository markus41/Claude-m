# Entitlement Management — Reference

## License Requirement

Entitlement Management requires **Microsoft Entra ID P2** or **Microsoft Entra ID Governance**.

## API Base

```
https://graph.microsoft.com/v1.0/identityGovernance/entitlementManagement/
```

## Catalogs

Catalogs are containers for access packages and their resources.

```
POST /identityGovernance/entitlementManagement/catalogs
{
  "displayName": "IT Resources",
  "description": "Standard IT software, tools, and portal access",
  "isExternallyVisible": false
}
```

`isExternallyVisible: true` allows external (B2B guest) users to request access packages from this catalog.

Add a resource (group, app, or SharePoint site) to a catalog:
```
POST /identityGovernance/entitlementManagement/catalogs/{catalogId}/resourceRequests
{
  "requestType": "adminAdd",
  "resource": {
    "originId": "<group-id-or-app-id>",
    "originSystem": "AadGroup"
  }
}
```

`originSystem` values: `AadGroup`, `AadApplication`, `SharePointOnline`.

## Access Packages

```
POST /identityGovernance/entitlementManagement/accessPackages
{
  "displayName": "Developer Tools Suite",
  "description": "Grants access to GitHub Enterprise, Azure Portal, Dev Box, and the Engineering SharePoint site",
  "catalog": { "id": "<catalog-id>" },
  "isHidden": false
}
```

Add a resource role to an access package (e.g., add user to a group):
```
POST /identityGovernance/entitlementManagement/accessPackages/{packageId}/resourceRoleScopes
{
  "role": {
    "originId": "Member_<group-id>",
    "originSystem": "AadGroup",
    "resource": { "id": "<catalog-resource-id>", "originId": "<group-id>", "originSystem": "AadGroup" }
  },
  "scope": {
    "originId": "<group-id>",
    "originSystem": "AadGroup"
  }
}
```

## Assignment Policies

Each access package needs at least one assignment policy defining who can request and for how long:

```
POST /identityGovernance/entitlementManagement/assignmentPolicies
{
  "accessPackage": { "id": "<package-id>" },
  "displayName": "Employee Self-Service Policy",
  "description": "Any employee can request, manager approval required",
  "allowedTargetScope": "allMemberUsers",
  "requestorSettings": {
    "enableTargetsToSelfAddAccess": true,
    "enableTargetsToSelfUpdateAccess": false,
    "enableTargetsToSelfRemoveAccess": true,
    "allowCustomAssignmentSchedule": false,
    "enableOnBehalfRequestorsToAddAccess": false
  },
  "requestApprovalSettings": {
    "isApprovalRequiredForAdd": true,
    "isApprovalRequiredForUpdate": false,
    "stages": [
      {
        "durationBeforeAutomaticDenial": "P14D",
        "isApproverJustificationRequired": true,
        "isEscalationEnabled": false,
        "fallbackPrimaryApprovers": [],
        "primaryApprovers": [
          {
            "@odata.type": "#microsoft.graph.requestorManager",
            "managerLevel": 1
          }
        ]
      }
    ]
  },
  "expiration": {
    "type": "afterDuration",
    "duration": "P365D"
  },
  "reviewSettings": {
    "isEnabled": true,
    "expirationBehavior": "removeAccess",
    "isRecommendationEnabled": true,
    "isReviewerJustificationRequired": true,
    "isSelfReview": false,
    "schedule": {
      "startDateTime": "2026-04-01T00:00:00Z",
      "recurrence": {
        "pattern": { "type": "absoluteMonthly", "interval": 6, "dayOfMonth": 1 },
        "range": { "type": "noEnd" }
      }
    },
    "primaryReviewers": [
      {
        "@odata.type": "#microsoft.graph.groupMembers",
        "groupId": "<reviewers-group-id>"
      }
    ]
  }
}
```

## Access Requests

User requests access:
```
POST /identityGovernance/entitlementManagement/accessPackageAssignmentRequests
{
  "requestType": "userAdd",
  "accessPackage": { "id": "<package-id>" },
  "assignment": {
    "targetId": "<requesting-user-id>",
    "assignmentPolicyId": "<policy-id>"
  },
  "justification": "I need access to GitHub Enterprise to contribute to the API project"
}
```

Admin direct assignment (bypass approval):
```
POST /identityGovernance/entitlementManagement/accessPackageAssignmentRequests
{
  "requestType": "adminAdd",
  "accessPackage": { "id": "<package-id>" },
  "assignment": {
    "targetId": "<user-id>",
    "assignmentPolicyId": "<policy-id>",
    "schedule": {
      "startDateTime": "2026-03-01T00:00:00Z",
      "expiration": { "endDateTime": "2026-09-01T00:00:00Z", "type": "afterDateTime" }
    }
  }
}
```

## Access Reviews

Standalone access review (not through entitlement management):

```
POST /identityGovernance/accessReviews/definitions
{
  "displayName": "Quarterly Review of Global Administrators",
  "descriptionForAdmins": "Review all Global Administrator role assignments",
  "descriptionForReviewers": "Please review each user's need for Global Administrator access.",
  "scope": {
    "@odata.type": "#microsoft.graph.principalResourceMembershipsScope",
    "principalScopes": [
      { "@odata.type": "#microsoft.graph.accessReviewQueryScope", "query": "/users", "queryType": "MicrosoftGraph" }
    ],
    "resourceScopes": [
      {
        "@odata.type": "#microsoft.graph.accessReviewQueryScope",
        "query": "/roleManagement/directory/roleDefinitions/62e90394-69f5-4237-9190-012177145e10",
        "queryType": "MicrosoftGraph"
      }
    ]
  },
  "reviewers": [
    {
      "query": "/users/<review-manager-id>",
      "queryType": "MicrosoftGraph",
      "queryRoot": null
    }
  ],
  "settings": {
    "mailNotificationsEnabled": true,
    "reminderNotificationsEnabled": true,
    "justificationRequiredOnApproval": true,
    "defaultDecisionEnabled": true,
    "defaultDecision": "Deny",
    "instanceDurationInDays": 14,
    "autoApplyDecisionsEnabled": true,
    "recommendationsEnabled": true,
    "recurrence": {
      "pattern": { "type": "absoluteMonthly", "interval": 3, "dayOfMonth": 1 },
      "range": { "type": "noEnd" }
    }
  }
}
```

`defaultDecision: "Deny"` — auto-removes access for reviewers who don't respond.

## List Active Assignments

```
GET /identityGovernance/entitlementManagement/accessPackageAssignments
  ?$filter=state eq 'Delivered'
  &$expand=target($select=id,displayName,email),accessPackage($select=displayName)
  &$select=id,schedule,state,createdDateTime
```
