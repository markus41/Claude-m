---
name: sharing-setup
description: Set up the Sharing Auditor plugin — configure SharePoint admin access and Graph API permissions for sharing analysis
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

# Sharing Auditor Setup

Guided setup for SharePoint/OneDrive external sharing auditing.

## Integration Context Fail-Fast Check

Before any external API call, validate integration context from [`docs/integration-context.md`](../../docs/integration-context.md):
- `tenantId` (always required)
- `subscriptionId` (required for Azure-scope workflows)
- `environmentCloud`
- `principalType`
- `scopesOrRoles`

If validation fails, stop immediately and return a structured error using contract codes (`MissingIntegrationContext`, `InvalidIntegrationContext`, `ContextCloudMismatch`, `InsufficientScopesOrRoles`).
Redact tenant/subscription/object identifiers in setup output using contract redaction rules.

## Step 1: Check Prerequisites

- Graph API access with `Sites.Read.All`, `User.Read.All`
- SharePoint Administrator role for site-level setting changes
- PnP PowerShell module (optional, for detailed sharing reports)

## Step 2: Install PnP PowerShell (Optional)

```bash
pwsh -Command "Install-Module -Name PnP.PowerShell -Scope CurrentUser -Force -AllowClobber"
```

## Step 3: Verify Access

```
GET https://graph.microsoft.com/v1.0/sites/root
```

Should return the root SharePoint site.

## Step 4: Output Summary

```markdown
# Sharing Auditor Setup Report

| Setting | Value |
|---|---|
| Graph access | [OK / Failed] |
| SharePoint Admin | [OK / Missing] |
| PnP PowerShell | [Installed / Skipped] |
| Tenant sharing policy | [setting] |
```
