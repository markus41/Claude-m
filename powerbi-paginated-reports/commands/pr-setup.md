---
name: pr-setup
description: Interactive setup for paginated report development — install Report Builder, configure Fabric workspace connection, verify prerequisites.
argument-hint: "[--minimal] [--skip-desktop]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
  - AskUserQuestion
---

# Paginated Report Setup

Walk the user through configuring their environment for Power BI paginated report development and deployment.

## Step 1: Check Prerequisites

Verify the user's environment:
- Windows OS (Report Builder is Windows-only)
- .NET Framework 4.7.2+ installed
- Internet connectivity to Fabric/Power BI service

If `--skip-desktop` flag is provided, skip Report Builder installation and focus on API/deployment setup only.

## Step 2: Report Builder Installation

Ask the user if they have Power BI Report Builder installed:

Use AskUserQuestion:
- "Do you have Power BI Report Builder installed?"
  - "Yes, already installed"
  - "No, help me install it"
  - "I'm using Visual Studio with SSDT"

If not installed, provide the download link:
- Download: https://aka.ms/pbireportbuilder
- Install with default settings
- No license required (free tool)

## Step 3: Fabric Workspace Configuration

Ask the user:
- "Which Fabric workspace will you deploy paginated reports to?"
  - Provide workspace name or ID

Verify the workspace has:
- A Fabric or Premium capacity assigned (required for paginated reports)
- The user has at least Contributor role

## Step 4: Data Source Setup

Ask the user which data source types they'll use:
- Fabric Semantic Model (Power BI dataset)
- Fabric Lakehouse SQL endpoint
- Fabric Warehouse
- Azure SQL Database
- On-premises database (requires gateway)
- Dataverse

Based on selection, read and reference the appropriate section from:
`${CLAUDE_PLUGIN_ROOT}/skills/paginated-reports/references/data-sources-datasets.md`

## Step 5: Authentication Configuration

For REST API automation (optional, skip if `--minimal`):

Ask the user:
- "Will you automate report deployment and export via REST API?"
  - "Yes, set up service principal"
  - "Yes, using delegated user auth"
  - "No, manual only"

If yes, guide them through:
1. Azure AD app registration (if service principal)
2. API permissions: `Report.ReadWrite.All`, `Workspace.ReadWrite.All`
3. Add service principal to workspace as Member
4. Store credentials securely

## Step 6: Gateway Setup (If On-Prem)

If the user selected on-premises data sources:
1. Download on-premises data gateway: https://aka.ms/gateway
2. Install in standard mode (not personal)
3. Register gateway with Power BI service account
4. Add data source to gateway
5. Test connectivity

## Step 7: Generate Summary

Output a configuration summary:

```
Paginated Report Setup Summary
═══════════════════════════════
Report Builder: [Installed / Skipped]
Workspace: [name] ([id])
Capacity: [Fabric SKU]
Data Sources: [list]
Authentication: [SP / Delegated / Manual]
Gateway: [Configured / Not needed]

Next Steps:
- Use /pr-scaffold to generate your first report
- Use /pr-datasource to configure data source connections
- Use /pr-deploy to publish reports to your workspace
```

## Guidelines

- Always verify workspace has Premium/Fabric capacity before proceeding
- Never store credentials in RDL files or source code
- Recommend service principal authentication for CI/CD pipelines
- Recommend delegated auth for interactive development
- If `--minimal` flag: skip steps 5 and 6, output minimal summary
