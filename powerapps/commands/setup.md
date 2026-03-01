---
name: setup
description: Set up the Power Apps plugin — configure Power Platform environment access and install development tools
argument-hint: "[--minimal] [--with-pcf]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

# Power Apps Setup

Guide the user through setting up Power Apps development tools and environment access.

## Step 1: Check Prerequisites

Verify Node.js 18+ is installed. If `--with-pcf` is passed, verify .NET 6+ SDK.

## Step 2: Install Dependencies

```bash
npm init -y && npm install @azure/identity node-fetch
```

If `--with-pcf`:
```bash
npm install -g pac
```

## Step 3: Configure Power Platform Access

Ask the user for:
- Power Platform environment URL (e.g., `https://org12345.crm.dynamics.com`)
- Azure AD app registration with Dataverse API permissions

Collect: Tenant ID, Client ID, Client Secret, Environment URL.

## Step 4: Configure Environment

Create `.env`:
```
AZURE_TENANT_ID=<tenant-id>
AZURE_CLIENT_ID=<client-id>
AZURE_CLIENT_SECRET=<client-secret>
DATAVERSE_URL=<environment-url>
```

## Step 5: Verify Access

Authenticate and call the Dataverse Web API to verify connectivity. List available solutions.

If `--minimal` is passed, stop after Step 2.
