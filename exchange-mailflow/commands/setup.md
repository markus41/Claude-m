---
name: mailflow-setup
description: Set up the Exchange Mail Flow plugin — install Exchange Online Management module and verify connectivity
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

# Exchange Mail Flow Setup

Guided setup for Exchange Online mail flow diagnostics.

## Step 1: Install Exchange Online Management

```bash
pwsh -Command "Install-Module -Name ExchangeOnlineManagement -Scope CurrentUser -Force -AllowClobber"
```

## Step 2: Verify Connectivity

```bash
pwsh -Command "Import-Module ExchangeOnlineManagement; Connect-ExchangeOnline -UserPrincipalName '<admin-upn>'; Get-OrganizationConfig | Select-Object DisplayName; Disconnect-ExchangeOnline -Confirm:\$false"
```

## Step 3: Check DNS Tools

Verify `nslookup` or `dig` is available for SPF/DKIM/DMARC checks:
```bash
which nslookup || which dig
```

## Step 4: Output Summary

```markdown
# Mail Flow Setup Report

| Setting | Value |
|---|---|
| Exchange Online module | [Installed / Missing] |
| Connectivity | [OK / Failed] |
| DNS tools | [Available / Missing] |
| Admin UPN | [admin@contoso.com] |
```
