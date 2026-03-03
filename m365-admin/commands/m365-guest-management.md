---
name: m365-guest-management
description: Manage B2B guest users — invite guests, list stale guests, review cross-tenant access policies, and clean up inactive guest accounts.
argument-hint: "<action> [--email <email>] [--redirectUrl <url>] [--stale-days <N>] [--partnerTenantId <id>] [--dry-run]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
---

# External Identities and Guest User Management

Manage B2B guest users, invitations, and cross-tenant access policies via Microsoft Graph API.

## Actions

- `invite` — Invite one or more guest users via email
- `list-guests` — List all guest users in the tenant
- `stale-report` — Report guests who haven't signed in for N days (default 90)
- `remove-guest` — Disable and optionally delete a guest user
- `bulk-invite` — Invite multiple guests from a CSV file
- `bulk-cleanup` — Remove stale guests in bulk (with approval gate)
- `list-xtap` — List cross-tenant access policy (default + partner configs)
- `update-xtap` — Update inbound/outbound B2B collaboration settings
- `check-invitations-policy` — Show who can invite guests (`allowInvitesFrom`)

## Workflow

1. **Validate context** — Confirm `tenantId` is set; verify scopes (`User.Invite.All`, `User.ReadWrite.All`)
2. **Parse arguments** — Determine action and parameters
3. **Execute**:
   - For `invite`: POST to `/invitations`; capture `inviteRedeemUrl`
   - For `stale-report`: GET guests, filter by `signInActivity.lastSignInDateTime`
   - For `remove-guest`: Disable account, revoke sessions, then optionally delete
   - For `bulk-cleanup`: Always dry-run first, require explicit approval for deletion
4. **Report** — Output markdown table with guest details, status, group memberships

## Key Endpoints

| Action | Method | Endpoint |
|---|---|---|
| Invite guest | POST | `/invitations` |
| List guests | GET | `/users?$filter=userType eq 'Guest'` |
| Get guest groups | GET | `/users/{id}/memberOf` |
| Revoke sessions | POST | `/users/{id}/revokeSignInSessions` |
| Disable guest | PATCH | `/users/{id}` (`accountEnabled: false`) |
| Delete guest | DELETE | `/users/{id}` |
| Get XTAP default | GET | `/policies/crossTenantAccessPolicy/default` |
| Update XTAP default | PATCH | `/policies/crossTenantAccessPolicy/default` |
| List partners | GET | `/policies/crossTenantAccessPolicy/partners` |
| Update invitations policy | PATCH | `/policies/authorizationPolicy` |

## CSV Format for Bulk Invite

```
email,displayName,message
partner@company.com,Jane Partner,Welcome to our collaboration portal
vendor@supplier.com,Bob Vendor,You've been invited to review shared documents
```

## Stale Guest Detection

For `stale-report` with `--stale-days 90`:

1. `GET /users?$filter=userType eq 'Guest'&$select=id,displayName,mail,signInActivity,createdDateTime`
2. Filter: `signInActivity.lastSignInDateTime < (today - 90 days)` OR `signInActivity == null`
3. Exclude guests created within the last 30 days (new invitations)
4. For each stale guest: retrieve group memberships
5. Output table: email, last sign-in, days stale, groups, recommended action

## Safety Rules for Guest Removal

- Always check group memberships before removing — guest may be a key member of active groups
- Use disable (`accountEnabled: false`) first, then delete after 30-day grace period
- For bulk cleanup: always require dry-run review and explicit approval before executing
- Revoke sign-in sessions immediately on disable for security incidents

## Important Notes

- Guest invitations expire after 30 days if not redeemed — re-invite if needed
- Cross-tenant access policy changes affect all B2B collaboration for the tenant
- `allowInvitesFrom: "adminsAndGuestInviters"` restricts invitations to admins and the Guest Inviter role
- `signInActivity` requires Azure AD Premium P1 or P2 license
- Reference: `skills/m365-admin/references/external-identities.md`
