---
name: onenote-setup
description: Set up the OneNote Knowledge Base plugin — configure Azure auth, install dependencies, and verify notebook access
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

# OneNote Knowledge Base Setup

Guide the user through setting up OneNote API access via Microsoft Graph for knowledge base operations.

## Step 1: Check Prerequisites

Verify Node.js 18+ is installed:

```bash
node --version
```

Report the detected version. If below 18, instruct the user to upgrade before continuing.

## Step 2: Install Dependencies

```bash
npm init -y && npm install @microsoft/microsoft-graph-client @azure/identity
```

If `--minimal` is passed, stop after this step.

## Step 3: Configure Azure App Registration

Walk the user through registering an app in Microsoft Entra ID (portal.azure.com > App registrations > New registration).

**Required Graph API permissions:**

| Permission | Type | Purpose |
|------------|------|---------|
| `Notes.Read` | Delegated | Read the user's notebooks, sections, and pages |
| `Notes.ReadWrite` | Delegated | Create and update pages in the user's notebooks |
| `Notes.Read.All` | Application | Read shared/team notebooks across the organization |
| `Notes.ReadWrite.All` | Application | Write to shared/team notebooks across the organization |

Application permissions require admin consent. For small teams where one person manages the knowledge base, delegated permissions (`Notes.Read` + `Notes.ReadWrite`) are sufficient.

Collect from the user:
- **Tenant ID** — from Azure Entra > App registrations > Overview
- **Client ID** — from the same page
- **Client Secret** — from Certificates & Secrets > New client secret

## Step 4: Configure Environment

Create a `.env` file in the project root:

```
AZURE_TENANT_ID=<tenant-id>
AZURE_CLIENT_ID=<client-id>
AZURE_CLIENT_SECRET=<client-secret>
```

Verify `.gitignore` includes `.env` to prevent accidental credential commits. If `.gitignore` does not exist or does not contain `.env`, add it.

## Step 5: Verify OneNote Access

Authenticate using the configured credentials and call:

```
GET https://graph.microsoft.com/v1.0/me/onenote/notebooks
```

Display the response as a table:

| Notebook Name | Created | Last Modified | Sections Count |
|---------------|---------|---------------|----------------|
| ... | ... | ... | ... |

If the response is empty, confirm the user has at least one OneNote notebook. If the call fails with 403, the permissions have not been granted or admin consent is missing.

## Step 6: Output Summary

Display a summary:

```
Setup Status
--------------------------------------------
Node.js:          v20.x.x (OK)
Dependencies:     @microsoft/microsoft-graph-client, @azure/identity (OK)
Azure App:        Configured (Tenant: xxxx...xxxx)
Permissions:      Notes.Read, Notes.ReadWrite (Delegated)
Notebook Access:  3 notebooks found
--------------------------------------------
Next steps:
  /onenote-search <query>         — Search pages across notebooks
  /onenote-create-page <id> ...   — Create a new page
  /onenote-meeting-notes <id> ... — Create meeting notes from template
```
