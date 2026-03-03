---
name: m365-pim-roles
description: PIM role management — make users eligible for directory roles, activate/deactivate roles JIT, manage access reviews, and report privileged access.
argument-hint: "<action> [--principalId <id>] [--roleId <id>] [--duration <ISO8601>] [--justification <text>] [--reviewId <id>]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
---

# Privileged Identity Management (PIM) and Access Reviews

Manage PIM role eligibility, just-in-time activation, access reviews, and entitlement management via Microsoft Graph API.

## Actions

- `list-eligible` — List all eligible role assignments (who is eligible for what)
- `list-active` — List currently active (JIT-activated) role assignments
- `list-permanent` — List permanent role assignments (outside PIM)
- `make-eligible` — Grant role eligibility to a user (AdminAssign)
- `remove-eligible` — Remove role eligibility from a user (AdminRemove)
- `activate-role` — Self-activate an eligible role for a limited time
- `deactivate-role` — Self-deactivate an active role assignment
- `list-reviews` — List access review definitions
- `create-review` — Create an access review for a group or role
- `list-access-packages` — List entitlement management access packages
- `privileged-report` — Generate a full privileged access report

## Workflow

1. **Validate context** — Confirm `tenantId` is set; verify scope `RoleManagement.ReadWrite.Directory`
2. **Parse arguments** — Determine action, principal, role, duration, justification
3. **Resolve IDs** — If role name is provided instead of ID, look up via `/directoryRoleTemplates`
4. **Execute** — Call appropriate Graph API endpoint
5. **Report** — Output structured markdown with principal, role, scope, expiry

## Common Role Definition IDs

| Role | ID |
|---|---|
| Global Administrator | `62e90394-69f5-4237-9190-012177145e10` |
| Security Administrator | `194ae4cb-b126-40b2-bd5b-6091b380977d` |
| User Administrator | `fe930be7-5e62-47db-91af-98c3a49a38b1` |
| Global Reader | `f2ef992c-3afb-46b9-b7cf-a126ee74c451` |
| Exchange Administrator | `29232cdf-9323-42fd-ade2-1d097af3e4de` |
| SharePoint Administrator | `f28a1f50-f6e7-4571-818b-6a12f2af6b6c` |
| Teams Administrator | `69091246-20e8-4a56-aa4d-066075b2a7a8` |

Resolve all roles: `GET /directoryRoleTemplates`

## Key Endpoints

| Action | Method | Endpoint |
|---|---|---|
| List eligible schedules | GET | `/roleManagement/directory/roleEligibilitySchedules` |
| List active instances | GET | `/roleManagement/directory/roleAssignmentScheduleInstances` |
| Create eligibility | POST | `/roleManagement/directory/roleEligibilityScheduleRequests` |
| JIT activate | POST | `/roleManagement/directory/roleAssignmentScheduleRequests` |
| List access reviews | GET | `/identityGovernance/accessReviews/definitions` |
| Create access review | POST | `/identityGovernance/accessReviews/definitions` |
| List access packages | GET | `/identityGovernance/entitlementManagement/accessPackages` |

## Duration Examples

- 4 hours: `PT4H`
- 8 hours: `PT8H`
- 30 days: `P30D`
- 1 year: `P365D`

## Important Notes

- JIT activation requires the user to already have role eligibility
- Justification is required for all activation and eligibility requests
- Access reviews can be set to auto-apply decisions (deny by default) — confirm settings before creating
- Privileged report should cross-reference eligible + active + permanent assignments
- Users with Global Administrator role can make themselves eligible for any role
- Reference: `skills/m365-admin/references/pim-access.md`
