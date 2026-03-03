---
name: m365-admin-units
description: Manage Administrative Units — create AUs, add members, assign scoped admin roles for delegated administration without tenant-wide permissions.
argument-hint: "<action> [--auId <id>] [--name <name>] [--userId <id>] [--groupId <id>] [--roleId <id>] [--adminId <id>] [--membershipRule <rule>] [--dry-run]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
---

# Administrative Units Management

Create and manage Administrative Units for scoped admin delegation via Microsoft Graph API.

## Actions

- `list-aus` — List all Administrative Units in the tenant
- `get-au` — Get details of a specific AU with member count
- `create-au` — Create a new Administrative Unit (static or dynamic)
- `update-au` — Update AU name, description, or membership rule
- `delete-au` — Delete an AU (members are not deleted)
- `list-members` — List members of an AU (users, groups, devices)
- `add-member` — Add a user, group, or device to an AU
- `remove-member` — Remove a member from an AU
- `list-scoped-roles` — List scoped admin role assignments for an AU
- `assign-scoped-role` — Grant a scoped admin role to a user for this AU
- `remove-scoped-role` — Remove a scoped admin role assignment
- `bulk-populate` — Add AU members in bulk from CSV or department filter

## Workflow

1. **Validate context** — Confirm `tenantId` is set; verify scopes (`AdministrativeUnit.ReadWrite.All`, `RoleManagement.ReadWrite.Directory`)
2. **Parse arguments** — Determine action and IDs
3. **Resolve names** — Resolve AU name to ID, user UPN to object ID, role name to template ID
4. **Execute** — Call appropriate Graph API endpoint
5. **Report** — Output markdown with AU details, member counts, scoped role assignments

## Key Endpoints

| Action | Method | Endpoint |
|---|---|---|
| List AUs | GET | `/administrativeUnits` |
| Create AU | POST | `/administrativeUnits` |
| Get AU | GET | `/administrativeUnits/{auId}` |
| Update AU | PATCH | `/administrativeUnits/{auId}` |
| Delete AU | DELETE | `/administrativeUnits/{auId}` |
| List members | GET | `/administrativeUnits/{auId}/members` |
| Add member | POST | `/administrativeUnits/{auId}/members/$ref` |
| Remove member | DELETE | `/administrativeUnits/{auId}/members/{memberId}/$ref` |
| List scoped roles | GET | `/administrativeUnits/{auId}/scopedRoleMembers` |
| Assign scoped role | POST | `/administrativeUnits/{auId}/scopedRoleMembers` |
| Remove scoped role | DELETE | `/administrativeUnits/{auId}/scopedRoleMembers/{id}` |

## Roles Supported for AU Scoping

| Role | ID |
|---|---|
| User Administrator | `fe930be7-5e62-47db-91af-98c3a49a38b1` |
| Helpdesk Administrator | `729827e3-9c14-49f7-bb1b-9608f156bbb8` |
| Password Administrator | `966707d0-3269-4727-9be2-8c3a10f19b9d` |
| Authentication Administrator | `c4e39bd9-1100-46d3-8c65-fb160da0071f` |
| Groups Administrator | `fdd7a751-b60b-444a-984c-02652fe8fa1c` |
| License Administrator | `4d6ac14f-3453-41d0-bef9-a3e0c569773a` |

Get all role template IDs: `GET /directoryRoleTemplates`

## Dynamic Membership Rules

For `--membershipRule`, use Entra ID dynamic group rule syntax:

```
(user.department -eq "Engineering")
(user.country -eq "US")
(user.jobTitle -contains "Manager")
(device.deviceOSType -eq "Windows")
```

Set `membershipRuleProcessingState: "On"` to activate dynamic population.

## Bulk Population

For `bulk-populate`:
1. Accept CSV with UPNs or a `--department` filter
2. Resolve each UPN to object ID via `GET /users/{upn}?$select=id`
3. Add in batches of 20 using `/$batch` endpoint
4. Report: total attempted, added, skipped (already member), failed

## Important Notes

- AU deletion does not delete members — only the AU container is removed
- Dynamic AUs require Azure AD Premium P1 license
- Scoped role members can only manage objects within their assigned AU
- A user can be a member of multiple AUs
- Reference: `skills/m365-admin/references/admin-units.md`
