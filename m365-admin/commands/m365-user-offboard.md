---
name: m365-user-offboard
description: Offboard M365 user(s) — disable account, revoke licenses, remove from groups, set auto-reply, convert mailbox to shared, transfer OneDrive. Supports bulk from CSV.
argument-hint: "<userPrincipalName> or <csvPath> [--manager <upn>] [--auto-reply <message>] [--convert-mailbox] [--dry-run]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
---

# Offboard M365 User(s)

Perform a complete offboarding process for one or more users.

## Offboarding Steps (in order)

1. **Disable account** -- PATCH `/users/{id}` with `accountEnabled: false`
2. **Revoke sign-in sessions** -- POST `/users/{id}/revokeSignInSessions`
3. **Set auto-reply** -- PATCH `/users/{id}/mailboxSettings` with out-of-office message
4. **Remove from all groups** -- DELETE `/groups/{groupId}/members/{userId}/$ref` for each group
5. **Revoke all licenses** -- POST `/users/{id}/assignLicense` with removeLicenses
6. **Convert mailbox to shared** (optional) -- Requires Exchange Online PowerShell: `Set-Mailbox -Identity "{upn}" -Type Shared`
7. **Transfer OneDrive** -- Grant manager access to the user's OneDrive via SharePoint Admin
8. **Generate report** -- Markdown table with each step's status

## Arguments

- `userPrincipalName` or `csvPath`: User to offboard, or CSV with column `userPrincipalName`
- `--manager <upn>`: Manager UPN for OneDrive transfer and auto-reply contact
- `--auto-reply <message>`: Custom auto-reply message (HTML supported). Default: "This person is no longer with the organization."
- `--convert-mailbox`: Convert user mailbox to shared mailbox (requires Exchange Online PowerShell)
- `--dry-run`: Show what would happen without making changes
- `--skip-groups`: Skip group removal step
- `--skip-license`: Skip license revocation step

## CSV Format (Bulk)

| Column | Required | Description |
|---|---|---|
| `userPrincipalName` | Yes | User to offboard |
| `managerUpn` | No | Manager for OneDrive transfer |
| `autoReplyMessage` | No | Custom auto-reply (falls back to default) |

## Important Notes

- Disabling the account does NOT immediately terminate active sessions -- always call `revokeSignInSessions`
- After converting to shared mailbox, the license can be removed (shared mailboxes under 50 GB are free)
- OneDrive content is retained for 30 days after the account is deleted (configurable in SharePoint Admin)
- Group removal may fail for dynamic groups or groups synced from on-premises AD -- these are logged as warnings
- The user is NOT deleted -- only disabled. Deletion is a separate step (soft delete with 30-day recycle bin)
- Reference: `skills/m365-admin/examples/user-management.md` (offboard example)
- Reference: `skills/m365-admin/references/entra-id.md` for disable/license/group operations
- Reference: `skills/m365-admin/references/exchange-online.md` for mailbox conversion
