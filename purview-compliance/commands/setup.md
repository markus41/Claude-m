---
name: purview-setup
description: Set up the Purview Compliance plugin — confirm regulatory context, tenant scope, workload coverage, and install Security & Compliance PowerShell module
argument-hint: "[--minimal] [--regulatory-framework <name>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

# Purview Compliance Plugin Setup

Interactive guided setup for the Purview Compliance plugin. Establishes regulatory context, confirms tenant scope, and verifies connectivity.

## Step 1: Confirm Regulatory Context

Ask the user:
- Which regulatory frameworks apply (GDPR, HIPAA, SOX, PCI-DSS, internal policy, other)?
- Which data classifications are in scope (PII, PHI, financial, legal, HR, intellectual property)?
- Is there an existing compliance officer or legal counsel contact?

## Step 2: Confirm Tenant Scope

Ask the user:
- Which workloads are in scope (Exchange, SharePoint, OneDrive, Teams, Endpoints)?
- Single tenant or multi-tenant (MSP/CSP with Lighthouse)?
- Are there existing Purview policies already deployed?

## Step 3: Check Prerequisites

### PowerShell 7+
```bash
pwsh --version
```

### Security & Compliance PowerShell
```bash
pwsh -Command "Install-Module -Name ExchangeOnlineManagement -Scope CurrentUser -Force -AllowClobber"
pwsh -Command "Get-Module -ListAvailable ExchangeOnlineManagement | Select-Object Name, Version"
```

The Exchange Online Management module includes `Connect-IPPSSession` for Security & Compliance center access.

### Verify Connectivity
```bash
pwsh -Command "Import-Module ExchangeOnlineManagement; Connect-IPPSSession -UserPrincipalName '<admin-upn>'; Get-Label | Select-Object DisplayName, Priority | Format-Table; Disconnect-ExchangeOnline -Confirm:\$false"
```

## Step 4: Document Incident Response Constraints

Ask the user:
- Is there an active legal hold or preservation requirement?
- What is the escalation path for compliance incidents?
- Who approves policy changes (sign-off authority)?

## Step 5: Output Summary

```markdown
# Purview Compliance Setup Report

| Setting | Value |
|---|---|
| Regulatory framework | [GDPR / HIPAA / etc.] |
| Data classes in scope | [PII, PHI, etc.] |
| Workloads | [Exchange, SharePoint, etc.] |
| Tenant mode | [Single / Multi-tenant] |
| PowerShell module | [Installed / Missing] |
| Connectivity | [OK / Failed] |
| Compliance owner | [name / email] |
| Legal hold active | [Yes / No] |
```
