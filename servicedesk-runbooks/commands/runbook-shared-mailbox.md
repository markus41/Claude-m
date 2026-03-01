---
name: runbook-shared-mailbox
description: Grant shared mailbox access — guided workflow with pre-checks, permission type selection, and end-user notification.
argument-hint: "<mailbox-address> <user-address> [--access <full|sendas|sendonbehalf>] [--dry-run]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
  - AskUserQuestion
---

# Runbook: Grant Shared Mailbox Access

Guided workflow for granting access to a shared mailbox.

## Workflow

### Pre-Checks
1. Verify the shared mailbox exists: `Get-Mailbox -Identity "{mailbox}" -RecipientTypeDetails SharedMailbox`
2. Verify the user exists and is active
3. Check if the user already has access: `Get-MailboxPermission -Identity "{mailbox}" | Where-Object {$_.User -like "*{user}*"}`
4. If the user already has the requested access, inform and stop

### Approval Gate
- Ask: "Has this request been approved by the mailbox owner or a manager?"
- For sensitive mailboxes (HR, Finance, Legal): require explicit written approval

### Permission Selection
Ask in plain language:
- "Can read all emails in the mailbox" → Full Access
- "Can send emails that appear to come from the mailbox" → Send As
- "Can send emails on behalf of the mailbox (shows 'on behalf of')" → Send on Behalf

### Execution
```powershell
# Full Access (with auto-mapping so it appears in Outlook automatically)
Add-MailboxPermission -Identity "{mailbox}" -User "{user}" -AccessRights FullAccess -AutoMapping $true

# Send As
Add-RecipientPermission -Identity "{mailbox}" -Trustee "{user}" -AccessRights SendAs -Confirm:$false

# Send on Behalf
Set-Mailbox -Identity "{mailbox}" -GrantSendOnBehalfTo @{Add="{user}"}
```

### Verification
```powershell
Get-MailboxPermission -Identity "{mailbox}" | Where-Object {$_.User -like "*{user}*"} | Format-Table User, AccessRights
Get-RecipientPermission -Identity "{mailbox}" | Where-Object {$_.Trustee -like "*{user}*"} | Format-Table Trustee, AccessRights
```

### End-User Notification

```markdown
Hi [User Name],

You now have access to the shared mailbox **[mailbox-name]** ([mailbox-address]).

**What to expect:**
- The mailbox will appear in your Outlook automatically within 30-60 minutes
- If it doesn't appear, restart Outlook or add it manually via File > Account Settings > Account Settings > Email > Change > More Settings > Advanced
- In Outlook on the web, the mailbox should appear in your folder list

**Your access:**
- [Full Access / Send As / Send on Behalf — description of what they can do]

If you have any issues, reply to this message.
```

### Completion Report

```markdown
| Field | Value |
|---|---|
| Mailbox | shared@contoso.com |
| User | user@contoso.com |
| Access type | Full Access + Send As |
| Auto-mapping | Enabled |
| Status | Granted |
| Ticket | [reference] |
```

## Arguments

- `<mailbox-address>`: Shared mailbox email address
- `<user-address>`: User to grant access to
- `--access <full|sendas|sendonbehalf>`: Permission type (or ask interactively)
- `--dry-run`: Show what would be granted without making changes

## Important Notes

- Auto-mapping only works with Full Access and may take up to 60 minutes
- Send As vs. Send on Behalf: Send As hides the sender's identity; Send on Behalf shows "on behalf of"
- Shared mailboxes under 50 GB do not require a license
- Reference: `skills/servicedesk-runbooks/SKILL.md` for additional patterns
