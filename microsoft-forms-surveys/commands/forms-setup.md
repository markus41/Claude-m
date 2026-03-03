---
name: forms-setup
description: Set up the Microsoft Forms Surveys plugin — configure Azure auth and verify Graph API access for forms management
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

# Microsoft Forms Surveys Setup

Guide the user through setting up Microsoft Forms API access via Microsoft Graph (beta).

## Step 1: Check Prerequisites

Verify Node.js 18+ is installed:

```bash
node --version   # Must be v18.0.0 or later
```

## Step 2: Install Dependencies

```bash
npm init -y && npm install @microsoft/microsoft-graph-client @azure/identity
```

The `@microsoft/microsoft-graph-client` package provides the official Graph SDK with support for beta endpoints. The `@azure/identity` package handles Azure Entra token acquisition.

## Step 3: Configure Azure App Registration

Register an app in the [Azure Entra admin center](https://entra.microsoft.com):

1. Go to **App registrations** > **New registration**.
2. Set a name (e.g., "Forms Survey Bot") and choose **Single tenant**.
3. Under **Authentication**, add a redirect URI for your flow (e.g., `http://localhost:3000/auth/callback` for local dev).
4. Under **API permissions**, add these Microsoft Graph **delegated** permissions:
   - `Forms.Read` — read forms, questions, and responses
   - `Forms.ReadWrite` — create and modify forms and questions
5. Click **Grant admin consent** (or ask a tenant admin).
6. Under **Certificates & secrets**, create a new client secret and copy the value immediately.
7. Record the following from the **Overview** page:
   - **Application (client) ID**
   - **Directory (tenant) ID**

## Step 4: Configure Environment

Create a `.env` file in the project root:

```
AZURE_TENANT_ID=<your-tenant-id>
AZURE_CLIENT_ID=<your-client-id>
AZURE_CLIENT_SECRET=<your-client-secret>
```

Add `.env` to `.gitignore` if not already present:

```bash
echo ".env" >> .gitignore
```

## Step 5: Verify Access

Since the Forms API uses the Graph **beta** endpoint, first verify basic Graph access works by calling a stable v1.0 endpoint:

```bash
# Verify basic Graph connectivity
curl -s -H "Authorization: Bearer $TOKEN" \
  https://graph.microsoft.com/v1.0/me/drive | jq '.id'
```

Then verify Forms beta access:

```bash
# List existing forms (may return empty array for new accounts)
curl -s -H "Authorization: Bearer $TOKEN" \
  https://graph.microsoft.com/beta/me/forms | jq '.value | length'
```

Display results in a summary:
- Graph API connectivity: OK / FAIL
- Forms API access: OK / FAIL
- Number of existing forms found

If `--minimal` is passed, stop after Step 2 (dependencies only).
