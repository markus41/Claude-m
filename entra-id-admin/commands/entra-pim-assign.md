---
name: entra-pim-assign
description: Create a PIM eligible or active role assignment with duration and justification
argument-hint: "--role <role-name-or-id> --principal <upn-or-id> [--type eligible|active] [--duration <P180D>] [--start <datetime>] [--justification <text>]"
allowed-tools:
  - Read
  - Write
  - Bash
---

# Create PIM Role Assignment

Create a Privileged Identity Management (PIM) role assignment — either eligible (user activates on demand) or time-limited active (always active for a period).

Requires **Microsoft Entra ID P2** or **Microsoft Entra ID Governance** license.

## Steps

### 1. Resolve Role and Principal

- Role: look up by display name via `GET /beta/roleManagement/directory/roleDefinitions?$filter=displayName eq '<name>'`
- Principal: resolve UPN to object ID

### 2. Parse Assignment Parameters

- `--type` — `eligible` (default) or `active`
- `--duration` — ISO 8601 duration (e.g., `P180D` = 180 days, `PT8H` = 8 hours, `P1Y` = 1 year); default `P180D`
- `--start` — start datetime (ISO 8601); default: now
- `--justification` — required justification text
- `--permanent` — set `expiration.type: noExpiration` (not recommended for high-privilege)
- `--ticket` / `--ticket-system` — optional ticket number and system for approval

### 3. POST Eligible Assignment

```
POST https://graph.microsoft.com/beta/roleManagement/directory/roleEligibilityScheduleRequests
{
  "action": "adminAssign",
  "principalId": "<resolved-id>",
  "roleDefinitionId": "<resolved-role-id>",
  "directoryScopeId": "/",
  "justification": "<--justification>",
  "scheduleInfo": {
    "startDateTime": "<--start or now>",
    "expiration": {
      "type": "afterDuration",
      "duration": "<--duration>"
    }
  }
}
```

For `--permanent`: use `"type": "noExpiration"` (warn user).

### 4. POST Active Assignment (--type active)

```
POST https://graph.microsoft.com/beta/roleManagement/directory/roleAssignmentScheduleRequests
{
  "action": "adminAssign",
  "principalId": "<resolved-id>",
  "roleDefinitionId": "<resolved-role-id>",
  "directoryScopeId": "/",
  "justification": "<--justification>",
  "scheduleInfo": {
    "startDateTime": "<--start or now>",
    "expiration": { "type": "afterDuration", "duration": "<--duration>" }
  }
}
```

### 5. Display Output

```
PIM assignment created
─────────────────────────────────────────────────────────────────
Principal:    Jane Smith (jane.smith@contoso.com)
Role:         User Administrator
Scope:        Tenant-wide (/)
Type:         ELIGIBLE (activate on demand)
Duration:     180 days (expires: 2026-08-28)
Justification: Project lead requires admin access for migration project
─────────────────────────────────────────────────────────────────
User can activate with:
  /entra-id-admin:entra-pim-activate --role "User Administrator" --duration PT4H
─────────────────────────────────────────────────────────────────
```

## Error Handling

| Code | Fix |
|------|-----|
| `403` | Add `RoleManagement.ReadWrite.Directory` and `PrivilegedAccess.ReadWrite.AzureResources` scope |
| `400 InvalidRequestBody` | Principal doesn't have P2 license; check license assignment |
| `400 DuplicateEntry` | Assignment already exists for this principal + role |
| `400` duration | Duration exceeds policy maximum — check role settings |
