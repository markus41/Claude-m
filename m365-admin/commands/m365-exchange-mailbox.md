---
name: m365-exchange-mailbox
description: Exchange Online mailbox operations — create shared mailbox, set auto-reply, manage delegates, convert user mailbox to shared.
argument-hint: "<operation> <identity> [--delegate <upn>] [--permission <FullAccess|SendAs|SendOnBehalf>] [--auto-reply <message>]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
---

# Exchange Online Mailbox Operations

Manage Exchange Online mailboxes using Microsoft Graph API and Exchange Online PowerShell.

## Operations

### Create Shared Mailbox
Create a shared mailbox with optional delegate permissions.

**Requires**: Exchange Online PowerShell (`New-Mailbox -Shared`)

Arguments:
- `--name <displayName>`: Mailbox display name
- `--alias <alias>`: Mail alias
- `--email <address>`: Primary SMTP address
- `--delegate <upn>`: UPN(s) to grant access (comma-separated)
- `--permission <FullAccess|SendAs|SendOnBehalf>`: Permission type (default: FullAccess)

### Set Auto-Reply
Configure automatic replies (out-of-office) for a user.

**Uses**: Graph API -- PATCH `/users/{id}/mailboxSettings`

Arguments:
- `<identity>`: User UPN
- `--auto-reply <message>`: HTML message for auto-reply
- `--mode <always|scheduled>`: Enable always or on schedule
- `--start <dateTime>`: Schedule start (ISO 8601)
- `--end <dateTime>`: Schedule end (ISO 8601)
- `--external-audience <none|contactsOnly|all>`: Who receives external replies
- `--disable`: Disable auto-reply

### Manage Delegates
Add or remove mailbox delegates.

**Requires**: Exchange Online PowerShell

Arguments:
- `<identity>`: Mailbox UPN
- `--delegate <upn>`: Delegate UPN
- `--permission <FullAccess|SendAs|SendOnBehalf>`: Permission to grant/revoke
- `--action <grant|revoke>`: Grant or revoke (default: grant)
- `--auto-mapping <true|false>`: Auto-map in Outlook (FullAccess only, default: true)

### Convert Mailbox
Convert a user mailbox to shared or vice versa.

**Requires**: Exchange Online PowerShell (`Set-Mailbox -Type`)

Arguments:
- `<identity>`: Mailbox UPN
- `--to <Shared|Regular>`: Target mailbox type

## Important Notes

- Graph API covers: auto-reply, mail folders, calendar permissions, sending mail
- PowerShell required for: shared mailbox creation, delegation, conversion, transport rules
- Shared mailboxes under 50 GB do not require a license
- Shared mailboxes needing >50 GB or archive need Exchange Online Plan 2 license
- After converting user to shared, the user license can be removed
- Full Access with AutoMapping adds the mailbox to the delegate's Outlook automatically
- Send As allows sending as the mailbox address (recipient sees the shared mailbox as sender)
- Send on Behalf shows "sent by X on behalf of Y"
- Reference: `skills/m365-admin/references/exchange-online.md` for all Exchange operations
- Reference: `skills/m365-admin/examples/exchange-operations.md` for code examples
