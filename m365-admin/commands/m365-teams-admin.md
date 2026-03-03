---
name: m365-teams-admin
description: Administer Microsoft Teams — create/update/archive teams, manage channels, membership, apps, and messaging/meeting policies.
argument-hint: "<action> [--teamId <id>] [--name <name>] [--template <template>] [--csvPath <path>] [--dry-run]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
---

# Microsoft Teams Administration

Manage Teams, channels, membership, and policies via Microsoft Graph API and Teams PowerShell.

## Actions

- `create-team` — Create a new team (from template or custom)
- `update-team` — Update team settings (messaging, fun, member, guest settings)
- `archive-team` — Archive a team (read-only)
- `delete-team` — Delete a team and its underlying M365 Group
- `list-teams` — List all teams in the tenant
- `add-member` — Add a user to a team
- `remove-member` — Remove a user from a team
- `set-owner` — Promote a member to owner
- `create-channel` — Create a channel in a team
- `install-app` — Install a Teams app in a team
- `list-policies` — List messaging and meeting policies (requires Teams PowerShell)
- `assign-policy` — Assign a policy to a user (requires Teams PowerShell)

## Workflow

1. **Validate context** — Confirm `tenantId` is set; check required scopes (`Team.ReadWrite.All`, `TeamMember.ReadWrite.All`)
2. **Parse arguments** — Determine action; parse `--teamId`, `--name`, `--template`, `--csvPath`
3. **Pre-flight checks** — For destructive actions (delete, archive), confirm intent with user
4. **Execute** — Call appropriate Graph API or Teams PowerShell command
5. **Poll provisioning** — For `create-team`, poll the `Location` header URL until `provisioningState: Succeeded`
6. **Report** — Output markdown table with results, team ID, and deep link URL

## Key Endpoints

| Action | Method | Endpoint |
|---|---|---|
| List joined teams | GET | `/me/joinedTeams` |
| List all teams | GET | `/groups?$filter=resourceProvisioningOptions/Any(x:x eq 'Team')` |
| Create team | POST | `/teams` |
| Get team | GET | `/teams/{teamId}` |
| Update team | PATCH | `/teams/{teamId}` |
| Archive team | POST | `/teams/{teamId}/archive` |
| Delete team | DELETE | `/groups/{teamId}` |
| List channels | GET | `/teams/{teamId}/channels` |
| Create channel | POST | `/teams/{teamId}/channels` |
| List members | GET | `/teams/{teamId}/members` |
| Add member | POST | `/teams/{teamId}/members` |
| Remove member | DELETE | `/teams/{teamId}/members/{membershipId}` |
| Update member role | PATCH | `/teams/{teamId}/members/{membershipId}` |
| Install app | POST | `/teams/{teamId}/installedApps` |

## Templates

Standard Graph templates:
- `standard` — General purpose
- `educationClass` — Classroom
- `retailStore` — Retail frontline
- `healthcareWard` — Healthcare

## Important Notes

- Team provisioning is async — always poll the `Location` header URL
- The General channel cannot be deleted
- Messaging/meeting policy management requires Teams PowerShell (`Connect-MicrosoftTeams`)
- Guest settings changes require the Teams admin role
- Reference: `skills/m365-admin/references/teams-admin.md`
