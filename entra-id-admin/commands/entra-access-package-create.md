---
name: entra-access-package-create
description: Create an entitlement management access package with resources, approval policy, and optional recurring access review
argument-hint: "<display-name> --catalog <catalog-id-or-name> [--description <text>] [--resources <group-id1,app-id2>] [--approval] [--review-months <6>] [--external]"
allowed-tools:
  - Read
  - Write
  - Bash
---

# Create Entitlement Management Access Package

Create an access package that bundles access to groups, apps, and SharePoint sites with an approval policy and optional recurring access review.

Requires **Microsoft Entra ID P2** or **Microsoft Entra ID Governance** license.

## Steps

### 1. Resolve or Create Catalog

If `--catalog` is a name:
```
GET /identityGovernance/entitlementManagement/catalogs
  ?$filter=displayName eq '<catalog-name>'&$select=id,displayName
```

If not found, offer to create:
```
POST /identityGovernance/entitlementManagement/catalogs
{ "displayName": "<catalog-name>", "isExternallyVisible": <--external flag> }
```

### 2. Create Access Package

```
POST https://graph.microsoft.com/v1.0/identityGovernance/entitlementManagement/accessPackages
{
  "displayName": "<display-name>",
  "description": "<--description>",
  "catalog": { "id": "<catalog-id>" },
  "isHidden": false
}
```

### 3. Add Resource Role Scopes (if --resources)

For each group ID in `--resources`:
- Get catalog resource ID: `GET /identityGovernance/entitlementManagement/catalogs/{id}/resources?$filter=originId eq '<group-id>'`
- If not in catalog, add it first (resource request)

Add resource role scope (adds user as Member of group):
```
POST /identityGovernance/entitlementManagement/accessPackages/{packageId}/resourceRoleScopes
{
  "role": {
    "originId": "Member_<group-id>",
    "originSystem": "AadGroup",
    "resource": { "id": "<catalog-resource-id>", "originId": "<group-id>", "originSystem": "AadGroup" }
  },
  "scope": { "originId": "<group-id>", "originSystem": "AadGroup" }
}
```

### 4. Create Assignment Policy

Build policy with manager approval (if --approval):
```
POST /identityGovernance/entitlementManagement/assignmentPolicies
{
  "accessPackage": { "id": "<package-id>" },
  "displayName": "Employee Self-Service",
  "allowedTargetScope": "allMemberUsers",
  "requestorSettings": { "enableTargetsToSelfAddAccess": true },
  "requestApprovalSettings": {
    "isApprovalRequiredForAdd": <--approval>,
    "stages": [{
      "durationBeforeAutomaticDenial": "P14D",
      "isApproverJustificationRequired": true,
      "primaryApprovers": [{ "@odata.type": "#microsoft.graph.requestorManager", "managerLevel": 1 }]
    }]
  },
  "expiration": { "type": "afterDuration", "duration": "P365D" },
  "reviewSettings": {
    "isEnabled": <true if --review-months>,
    "expirationBehavior": "removeAccess",
    "defaultDecision": "Deny",
    "defaultDecisionEnabled": true,
    "autoApplyDecisionsEnabled": true,
    "schedule": {
      "startDateTime": "<90-days-from-now>",
      "recurrence": {
        "pattern": { "type": "absoluteMonthly", "interval": <--review-months or 6>, "dayOfMonth": 1 },
        "range": { "type": "noEnd" }
      }
    },
    "primaryReviewers": [{ "@odata.type": "#microsoft.graph.requestorManager", "managerLevel": 1 }]
  }
}
```

### 5. Display Output

```
Access package created
─────────────────────────────────────────────────────────────────
Name:        Developer Tools Suite
ID:          <package-id>
Catalog:     IT Resources
Resources:   SG-DevTeam (group member), GitHub Enterprise (app)
─────────────────────────────────────────────────────────────────
Policy:      Employee Self-Service
Requestors:  All member users
Approval:    Manager approval required (14-day auto-deny)
Expiry:      365 days
Review:      Every 6 months (auto-remove on no response)
External:    Not visible to guests
─────────────────────────────────────────────────────────────────
Request URL: https://myaccess.microsoft.com/#/access-packages/<package-id>
```

## Azure CLI Alternative

Entitlement management requires `az rest` with Graph API:

```bash
# List catalogs
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/identityGovernance/entitlementManagement/catalogs" \
  --query "value[].{Name:displayName, ID:id}" --output table

# Create a catalog
az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/identityGovernance/entitlementManagement/catalogs" \
  --body '{"displayName":"IT Resources","isExternallyVisible":false}'

# Create an access package
az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/identityGovernance/entitlementManagement/accessPackages" \
  --body '{
    "displayName": "Developer Tools",
    "description": "GitHub, Dev Box, Azure Portal access",
    "catalog": {"id": "<catalog-id>"}
  }'
```

## Error Handling

| Code | Fix |
|------|-----|
| `403` | Add `EntitlementManagement.ReadWrite.All` scope |
| `400 FeatureNotAvailable` | Requires Entra ID P2 or Governance license |
| `400` resource | Resource not in catalog — add resource to catalog first |
