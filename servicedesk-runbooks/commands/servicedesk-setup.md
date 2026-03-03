---
name: servicedesk-setup
description: Set up the Service Desk Runbooks plugin — configure Graph and Exchange access for common ticket workflows
argument-hint: "[--minimal]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

# Service Desk Runbooks Setup

Guided setup for service desk automation.

## Step 1: Check Prerequisites

- Graph API access with `User.ReadWrite.All`, `UserAuthenticationMethod.ReadWrite.All`
- Exchange Online Management module for mailbox operations
- SharePoint access for file recovery runbooks

## Step 2: Verify Graph Access

```
GET https://graph.microsoft.com/v1.0/users?$top=1&$select=displayName
```

## Step 3: Verify Exchange Access

```bash
pwsh -Command "Import-Module ExchangeOnlineManagement; Connect-ExchangeOnline -UserPrincipalName '<admin-upn>'; Get-Mailbox -ResultSize 1 | Select-Object DisplayName; Disconnect-ExchangeOnline -Confirm:\$false"
```

## Step 4: Configure Approval Workflow

Ask the user:
- "Which operations require manager approval?" (MFA reset, password reset, mailbox access)
- "Who is the fallback approver for after-hours requests?"
- "Should approval be via email, Teams, or manual confirmation?"

## Step 5: Output Summary

```markdown
# Service Desk Setup Report

| Setting | Value |
|---|---|
| Graph access | [OK / Failed] |
| Exchange module | [Installed / Missing] |
| SharePoint access | [OK / Failed] |
| Approval workflow | [Configured / Manual] |
| Available runbooks | Shared Mailbox, MFA Reset, File Recovery, Password Reset |
```
