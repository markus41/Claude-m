---
name: entra-pim-activate
description: Activate an eligible PIM role for the signed-in user with justification and optional ticket
argument-hint: "--role <role-name-or-id> [--duration <PT4H>] [--justification <text>] [--ticket <number>] [--ticket-system <ServiceNow>]"
allowed-tools:
  - Read
  - Write
  - Bash
---

# Activate PIM Eligible Role (Self-Service)

Activate an eligible PIM role for the currently signed-in user. The role becomes active for the specified duration or until manually deactivated.

Requires an existing **eligible** assignment for the current user + role.

## Steps

### 1. Get Current User

```
GET https://graph.microsoft.com/v1.0/me?$select=id,displayName,userPrincipalName
```

### 2. Resolve Role

Resolve `--role` display name to `roleDefinitionId`.

### 3. Verify Eligible Assignment Exists

```
GET https://graph.microsoft.com/beta/roleManagement/directory/roleEligibilitySchedules
  ?$filter=principalId eq '{myUserId}' and roleDefinitionId eq '{roleDefId}'
  &$select=id,scheduleInfo,status
```

If no eligible assignment: error with message showing available eligible roles.

### 4. Check Role Policy for Approval Requirement

```
GET https://graph.microsoft.com/beta/policies/roleManagementPolicies
  ?$filter=scopeId eq '/' and scopeType eq 'DirectoryRole'
```

If approval is required, warn user before submitting.

### 5. Submit Activation Request

```
POST https://graph.microsoft.com/beta/roleManagement/directory/roleAssignmentScheduleRequests
{
  "action": "selfActivate",
  "principalId": "<my-user-id>",
  "roleDefinitionId": "<resolved-role-id>",
  "directoryScopeId": "/",
  "justification": "<--justification>",
  "scheduleInfo": {
    "startDateTime": "<now>",
    "expiration": {
      "type": "afterDuration",
      "duration": "<--duration or PT1H>"
    }
  },
  "ticketInfo": {
    "ticketNumber": "<--ticket if provided>",
    "ticketSystem": "<--ticket-system if provided>"
  }
}
```

### 6. Handle Approval Required

If response status is `PendingApproval`:
```
PIM activation pending approval
─────────────────────────────────────────────────────────────────
Role:       Global Administrator
Status:     PENDING APPROVAL
Request ID: <request-id>
Approvers:  Your manager (john.doe@contoso.com)
─────────────────────────────────────────────────────────────────
Approval will be sent by email. You'll be notified when approved.
```

### 7. Display Output (Immediate Approval)

```
PIM role activated
─────────────────────────────────────────────────────────────────
User:         Jane Smith (jane.smith@contoso.com)
Role:         User Administrator
Scope:        Tenant-wide (/)
Active for:   4 hours (expires: 2026-03-01 18:00:00 UTC)
Justification: Deploying emergency hotfix for P0 incident
─────────────────────────────────────────────────────────────────
Deactivate early with:
  /entra-id-admin:entra-pim-activate --deactivate --role "User Administrator"
```

If `--deactivate` flag is passed:
```
POST /beta/roleManagement/directory/roleAssignmentScheduleRequests
{ "action": "selfDeactivate", "principalId": "<myId>", "roleDefinitionId": "<roleId>", "directoryScopeId": "/" }
```

## Azure CLI Alternative

```bash
# Get your own user ID
MY_ID=$(az ad signed-in-user show --query id -o tsv)

# Activate an eligible role
az rest --method POST \
  --url "https://graph.microsoft.com/beta/roleManagement/directory/roleAssignmentScheduleRequests" \
  --body "{
    \"action\": \"selfActivate\",
    \"principalId\": \"$MY_ID\",
    \"roleDefinitionId\": \"<role-definition-id>\",
    \"directoryScopeId\": \"/\",
    \"justification\": \"Emergency patch deployment\",
    \"scheduleInfo\": {
      \"startDateTime\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
      \"expiration\": {\"type\": \"afterDuration\", \"duration\": \"PT4H\"}
    }
  }"

# Deactivate a role
az rest --method POST \
  --url "https://graph.microsoft.com/beta/roleManagement/directory/roleAssignmentScheduleRequests" \
  --body "{
    \"action\": \"selfDeactivate\",
    \"principalId\": \"$MY_ID\",
    \"roleDefinitionId\": \"<role-definition-id>\",
    \"directoryScopeId\": \"/\"
  }"
```

## Error Handling

| Code | Fix |
|------|-----|
| `400 EligibilityNotFound` | No eligible assignment for this role |
| `400 ActivationDurationExceedsMaxAllowed` | Reduce `--duration` to within policy maximum |
| `400 MfaRequired` | Role policy requires MFA — complete MFA challenge and retry |
| `403` | Add `RoleManagement.ReadWrite.Directory` scope |
