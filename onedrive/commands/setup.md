---
name: onedrive-setup
description: Set up the OneDrive plugin — configure Azure auth, verify drive access, and test file operations
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

# OneDrive Setup

Guide the user through setting up OneDrive API access via Microsoft Graph.

## Step 1: Check Prerequisites

Verify Node.js 18+ is installed. Report the detected version.

## Step 2: Install Dependencies

```bash
npm init -y && npm install @azure/identity @azure/msal-node node-fetch
```

## Step 3: Configure Azure App Registration

Walk the user through registering an app in Microsoft Entra ID with these Graph API permissions:
- `Files.ReadWrite` (delegated) — read/write user's OneDrive files
- `Files.ReadWrite.All` (delegated) — read/write all accessible files
- `Sites.ReadWrite.All` (delegated) — for OneDrive for Business backed by SharePoint
- `offline_access` (delegated) — refresh tokens

Collect: Tenant ID, Client ID, Client Secret.

## Step 4: Configure Environment

Create `.env` file:
```
AZURE_TENANT_ID=<tenant-id>
AZURE_CLIENT_ID=<client-id>
AZURE_CLIENT_SECRET=<client-secret>
```

Verify `.gitignore` includes `.env`.

## Step 5: Verify OneDrive Access

Authenticate and call `GET https://graph.microsoft.com/v1.0/me/drive` to verify access. Display the drive owner, quota used, and quota remaining.

If `--minimal` is passed, stop after Step 2.

## Step 6: Output Summary

Display a summary table with setup status and next-step suggestions.
