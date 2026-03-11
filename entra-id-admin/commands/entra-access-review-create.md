---
name: entra-access-review-create
description: Create a recurring access review for group membership, directory roles, or access package assignments
argument-hint: "<display-name> [--target group|role|package] [--id <group-or-role-or-package-id>] [--reviewers managers|group:<group-id>|self] [--frequency monthly|quarterly|biannual|annual] [--auto-remove]"
allowed-tools:
  - Read
  - Write
  - Bash
---

# Create Access Review

Create a recurring access review to periodically certify who should retain membership in groups, directory roles, or access packages.

Requires **Microsoft Entra ID P2** or **Microsoft Entra ID Governance** license.

## Steps

### 1. Parse Arguments

- `--target` — `group` (default), `role`, or `package`
- `--id` — object ID of the group, role definition, or access package
- `--reviewers` — `managers` (each user's direct manager), `group:<group-id>` (designated reviewers), or `self` (users review their own access)
- `--frequency` — `monthly` (1 month), `quarterly` (3 months), `biannual` (6 months, default), `annual` (12 months)
- `--auto-remove` — auto-apply "Deny" decision if reviewer doesn't respond (default: true)
- `--start` — review start date (default: 30 days from now)
- `--duration <days>` — review window in days (default: 14)

### 2. Build Scope Based on Target

**Group membership review:**
```json
{
  "@odata.type": "#microsoft.graph.accessReviewQueryScope",
  "query": "/groups/{groupId}/members",
  "queryType": "MicrosoftGraph"
}
```

**Directory role review:**
```json
{
  "@odata.type": "#microsoft.graph.principalResourceMembershipsScope",
  "principalScopes": [{ "@odata.type": "#microsoft.graph.accessReviewQueryScope", "query": "/users", "queryType": "MicrosoftGraph" }],
  "resourceScopes": [{ "@odata.type": "#microsoft.graph.accessReviewQueryScope", "query": "/roleManagement/directory/roleDefinitions/{roleId}", "queryType": "MicrosoftGraph" }]
}
```

### 3. Build Reviewers

**Managers:**
```json
[{ "@odata.type": "#microsoft.graph.requestorManager", "managerLevel": 1 }]
```

**Designated group:**
```json
[{ "@odata.type": "#microsoft.graph.groupMembers", "groupId": "<reviewer-group-id>" }]
```

**Self-review:**
```json
[]  (leave empty and set isSelfReview: true in settings)
```

### 4. POST Access Review Definition

```
POST https://graph.microsoft.com/v1.0/identityGovernance/accessReviews/definitions
{
  "displayName": "<display-name>",
  "scope": <built-above>,
  "reviewers": <built-above>,
  "settings": {
    "mailNotificationsEnabled": true,
    "reminderNotificationsEnabled": true,
    "justificationRequiredOnApproval": true,
    "defaultDecisionEnabled": <--auto-remove>,
    "defaultDecision": "Deny",
    "instanceDurationInDays": <--duration or 14>,
    "autoApplyDecisionsEnabled": <--auto-remove>,
    "recommendationsEnabled": true,
    "isSelfReview": <true if --reviewers self>,
    "recurrence": {
      "pattern": {
        "type": "absoluteMonthly",
        "interval": <months: 1|3|6|12>,
        "dayOfMonth": 1
      },
      "range": {
        "type": "startDate",
        "startDate": "<--start or 30-days-from-now>",
        "numberOfOccurrences": 0
      }
    }
  }
}
```

### 5. Display Output

```
Access review created
─────────────────────────────────────────────────────────────────
Name:         Quarterly Review — SG-DevTeam-Prod
ID:           <review-id>
Target:       Group: SG-DevTeam-Prod
Reviewers:    Each member's direct manager
─────────────────────────────────────────────────────────────────
Schedule:
  Frequency:  Every 3 months (quarterly)
  Duration:   14 days per review
  First run:  2026-04-01
  Auto-deny:  Yes (no response = access removed)
─────────────────────────────────────────────────────────────────
Reviewers will receive email notifications.
Members with no reviewer (no manager) will need fallback reviewer assignment.
```

## Azure CLI Alternative

Access review management requires `az rest` with Graph API:

```bash
# List existing access reviews
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/identityGovernance/accessReviews/definitions" \
  --query "value[].{Name:displayName, ID:id, Status:status}" --output table

# Create a group membership access review
az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/identityGovernance/accessReviews/definitions" \
  --body '{
    "displayName": "Quarterly Review - SG-DevTeam",
    "scope": {
      "@odata.type": "#microsoft.graph.accessReviewQueryScope",
      "query": "/groups/<group-id>/members",
      "queryType": "MicrosoftGraph"
    },
    "reviewers": [{"@odata.type": "#microsoft.graph.requestorManager", "managerLevel": 1}],
    "settings": {
      "mailNotificationsEnabled": true,
      "defaultDecision": "Deny",
      "autoApplyDecisionsEnabled": true,
      "instanceDurationInDays": 14,
      "recurrence": {
        "pattern": {"type": "absoluteMonthly", "interval": 3, "dayOfMonth": 1},
        "range": {"type": "noEnd", "startDate": "2026-04-01"}
      }
    }
  }'
```

## Error Handling

| Code | Fix |
|------|-----|
| `403` | Add `AccessReview.ReadWrite.All` scope |
| `400 FeatureNotAvailable` | Requires Entra ID P2 or Governance license |
| `400 InvalidScope` | Group, role, or package not found — verify the ID |
