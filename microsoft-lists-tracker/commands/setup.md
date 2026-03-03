---
name: lists-setup
description: Set up the Microsoft Lists Tracker plugin — configure Azure auth and verify Graph API access to SharePoint Lists
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

# Microsoft Lists Tracker Setup

Guide the user through setting up Microsoft Lists access via Microsoft Graph API.

## Step 1: Check Prerequisites

Verify Node.js 18+ is installed:

```bash
node --version
```

If Node.js is not installed or below version 18, instruct the user to install it from https://nodejs.org.

## Step 2: Install Dependencies

```bash
npm init -y && npm install @microsoft/microsoft-graph-client @azure/identity
```

The `@microsoft/microsoft-graph-client` package provides the official Graph SDK with built-in request building, batching, and retry logic. The `@azure/identity` package provides `ClientSecretCredential` and `DeviceCodeCredential` for authentication.

## Step 3: Configure Azure App Registration

Register an app in Microsoft Entra ID (Azure AD) with the following Graph API permissions:

| Permission | Type | Purpose |
|------------|------|---------|
| `Sites.Read.All` | Delegated | Read site collections, lists, list items, and columns |
| `Sites.ReadWrite.All` | Delegated | Create and update lists, add and modify list items |
| `Sites.Manage.All` | Delegated | Manage list schemas — add/remove columns, configure content types and views |

Steps in the Azure portal:

1. Go to **Microsoft Entra ID** > **App registrations** > **New registration**.
2. Set a name (e.g., `Claude Lists Tracker`), choose **Single tenant**.
3. Under **API permissions** > **Add a permission** > **Microsoft Graph** > **Delegated permissions**, add the three permissions above.
4. Click **Grant admin consent** (requires Global Admin or Privileged Role Administrator).
5. Under **Certificates & secrets** > **New client secret**, create a secret and copy the value immediately.
6. Note the **Application (client) ID** and **Directory (tenant) ID** from the Overview page.

## Step 4: Configure Environment

Create a `.env` file in the project root:

```
AZURE_TENANT_ID=<your-tenant-id>
AZURE_CLIENT_ID=<your-client-id>
AZURE_CLIENT_SECRET=<your-client-secret>
SHAREPOINT_SITE_HOSTNAME=<your-tenant>.sharepoint.com
```

The `SHAREPOINT_SITE_HOSTNAME` is used to resolve site IDs. For example, if your SharePoint URL is `https://contoso.sharepoint.com`, set this to `contoso.sharepoint.com`.

## Step 5: Verify Access

Run a verification call to confirm SharePoint access is working:

```bash
# Resolve the root site
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://graph.microsoft.com/v1.0/sites/root" | jq '.displayName, .webUrl'
```

Expected: returns the root site display name and URL.

Then verify list access by listing all lists on the root site:

```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://graph.microsoft.com/v1.0/sites/root/lists?\$select=displayName,id,list" | jq '.value[] | {name: .displayName, id: .id}'
```

Display results in a summary table confirming:
- Authentication is working (no 401/403).
- SharePoint site is reachable.
- At least one list is visible.

If `--minimal` is passed, stop after Step 2 (dependencies only).
