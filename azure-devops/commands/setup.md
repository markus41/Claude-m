---
name: setup
description: Set up the Azure DevOps plugin — configure PAT or OAuth, verify organization and project access
argument-hint: "[--minimal] [--org <organization>] [--project <project>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

# Azure DevOps Setup

Guide the user through setting up Azure DevOps REST API access.

## Step 1: Check Prerequisites

Verify Node.js 18+ is installed.

## Step 2: Install Dependencies

```bash
npm init -y && npm install @azure/identity node-fetch
```

## Step 3: Configure Authentication

Ask the user which auth method they prefer:

**Option A: Personal Access Token (PAT)**
- Guide them to Azure DevOps > User Settings > Personal Access Tokens.
- Recommend scopes: `Code (Read & Write)`, `Build (Read & Execute)`, `Work Items (Read & Write)`.

**Option B: Azure AD OAuth**
- Register an app with scope `499b84ac-1321-427f-aa17-267ca6975798/.default`.
- Collect Tenant ID, Client ID, Client Secret.

## Step 4: Configure Environment

Create `.env`:
```
ADO_ORGANIZATION=<org-name>
ADO_PROJECT=<project-name>
ADO_PAT=<personal-access-token>
# OR for OAuth:
AZURE_TENANT_ID=<tenant-id>
AZURE_CLIENT_ID=<client-id>
AZURE_CLIENT_SECRET=<client-secret>
```

## Step 5: Verify Access

Call `GET https://dev.azure.com/{org}/_apis/projects?api-version=7.1` to list projects. Display results in a summary table.

If `--minimal` is passed, stop after Step 2.
