---
name: entra-guest-invite
description: Invite an external guest user to your Entra ID tenant via B2B invitation
argument-hint: "<email> [--name <display-name>] [--redirect <url>] [--message <custom-text>] [--group <group-name-or-id>] [--no-email]"
allowed-tools:
  - Read
  - Write
  - Bash
---

# Invite B2B Guest User

Send a B2B invitation to an external email address. The guest can sign in with their own identity (Microsoft Account, Google, any OIDC provider, or email OTP).

## Steps

### 1. Parse Arguments

- `<email>` — required; external email address
- `--name` — optional display name override
- `--redirect` — where to redirect after acceptance (default: `https://myapps.microsoft.com`)
- `--message` — optional customized invitation email body
- `--cc <email>` — CC the invitation email to a sponsor
- `--group` — group to add the guest to after acceptance
- `--no-email` — suppress invitation email (get `inviteRedeemUrl` instead)

### 2. POST /invitations

```
POST https://graph.microsoft.com/v1.0/invitations
{
  "invitedUserEmailAddress": "<email>",
  "inviteRedirectUrl": "<--redirect or 'https://myapps.microsoft.com'>",
  "invitedUserDisplayName": "<--name>",
  "sendInvitationMessage": <true unless --no-email>,
  "invitedUserMessageInfo": {
    "customizedMessageBody": "<--message if provided>",
    "ccRecipients": [{ "emailAddress": { "address": "<--cc if provided>" } }]
  }
}
```

### 3. Add Guest to Group (if --group)

After invitation, add the new guest user to the specified group:
```
POST /groups/{groupId}/members/$ref
{ "@odata.id": "https://graph.microsoft.com/v1.0/directoryObjects/{guestUserId}" }
```

### 4. Display Output

**With email sent:**
```
Guest invitation sent
─────────────────────────────────────────────────────────────────
Guest Email:     partner@fabrikam.com
Display Name:    Alice Chen (Fabrikam)
Invitation:      Sent to partner@fabrikam.com ✓
Status:          PendingAcceptance
Guest User ID:   <user-id>
─────────────────────────────────────────────────────────────────
Group:           Project Phoenix ✓ Added
─────────────────────────────────────────────────────────────────
```

**Without email (--no-email):**
```
Guest invitation created (no email sent)
─────────────────────────────────────────────────────────────────
Guest Email:     partner@fabrikam.com
Status:          PendingAcceptance
Redeem URL:      https://invitations.microsoft.com/redeem?...
─────────────────────────────────────────────────────────────────
Share this URL with the guest to let them accept the invitation.
The URL is valid for 90 days.
```

## Azure CLI Alternative

Guest invitation requires Graph API (no direct `az ad` command). Use `az rest`:

```bash
# Invite guest user
az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/invitations" \
  --body '{
    "invitedUserEmailAddress": "partner@fabrikam.com",
    "inviteRedirectUrl": "https://myapps.microsoft.com",
    "invitedUserDisplayName": "Alice Chen",
    "sendInvitationMessage": true
  }'
```

After invitation, add the guest to a group:

```bash
az ad group member add --group "Project Phoenix" --member-id <guest-user-object-id>
```

## Error Handling

| Code | Fix |
|------|-----|
| `403` | Add `User.Invite.All` scope |
| `400 GuestUsersNotAllowed` | External invitations are disabled in tenant — check `allowInvitesFrom` policy |
| `409` | Guest with this email already exists — find them with `/entra-id-admin:entra-user-get <email>` |
