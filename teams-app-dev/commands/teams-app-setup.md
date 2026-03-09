---
name: teams-app-setup
description: Set up the Teams App Dev plugin — install M365 Agents Toolkit CLI, register Azure Bot (single-tenant), configure BOT_ID, BOT_PASSWORD, and APP_TENANTID
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

# Teams App Dev Setup

Guide the user through setting up a Teams app development environment with the M365 Agents Toolkit.

## Step 1: Check Prerequisites

Verify the following are installed:

- **Node.js 18+**: Required for M365 Agents Toolkit and Bot Framework.
- **npm**: Comes with Node.js.

```bash
node --version   # Must be >= 18.0.0
npm --version
```

## Step 2: Install M365 Agents Toolkit CLI

The M365 Agents Toolkit CLI (`m365agents`) replaces the legacy Teams Toolkit CLI (`teamsapp`).

```bash
npm install -g @microsoft/m365agentstoolkit-cli
m365agents --version
```

If the user has the legacy `@microsoft/teamsapp-cli` installed, recommend removing it:
```bash
npm uninstall -g @microsoft/teamsapp-cli
```

## Step 3: Install Bot Framework Dependencies

```bash
npm init -y && npm install botbuilder botbuilder-dialogs @microsoft/teams-js @azure/identity @azure/msal-node express dotenv
npm install --save-dev typescript @types/express @types/node ts-node
```

## Step 4: Azure Bot Registration (Single-Tenant)

All v1.25 bot registrations enforce **single-tenant** authentication with `APP_TENANTID`.

Ask the user to create (or provide) an Azure Bot resource:

**Option A: Via Azure Portal**
1. Go to Azure Portal > Create a resource > Azure Bot.
2. Choose **Single Tenant** for bot type.
3. Set the **Tenant ID** to the organization's Entra ID tenant.
4. Select **Create new Microsoft App ID** (or use existing).
5. Note the **Microsoft App ID** (this is `BOT_ID`) and create a **Client Secret** (this is `BOT_PASSWORD`).
6. Under Configuration, set the Messaging endpoint to `https://<your-domain>/api/messages`.

**Option B: Via M365 Agents Toolkit**
M365 Agents Toolkit can auto-create the bot registration during `m365agents provision`. Skip this step if using the toolkit for provisioning.

**Option C: Via Azure CLI**
```bash
az bot create --resource-group <rg-name> --name <bot-name> --kind registration \
  --endpoint "https://<your-domain>/api/messages" \
  --microsoft-app-type SingleTenant \
  --microsoft-app-tenant-id <tenant-id> \
  --microsoft-app-id <app-id>
```

## Step 5: Configure Environment

Create a `.env` file in the project root:

```
BOT_ID=<microsoft-app-id>
BOT_PASSWORD=<client-secret>
BOT_ENDPOINT=https://<your-domain>
APP_TENANTID=<your-tenant-id>
AZURE_CLIENT_ID=<your-client-id>
AZURE_CLIENT_SECRET=<your-client-secret>
```

Ensure `.env` is in `.gitignore`:
```bash
echo ".env" >> .gitignore
```

## Step 6: Set Up Local Debugging

M365 Agents Toolkit includes the **Agents Playground** for local testing without bot registration:

```bash
# Start local preview with Agents Playground (no registration needed)
m365agents preview --local
```

For manual tunneling (full Teams client testing):
```bash
npm install -g ngrok
ngrok http 3978
# Update BOT_ENDPOINT in .env with the ngrok HTTPS URL
# Update messaging endpoint in Azure Bot Configuration
```

## Step 7: Verify Access

Test the bot registration by sending a test message:

```bash
# Start the bot locally
npx ts-node src/index.ts
```

Then either:
- Use Agents Playground (opened by `m365agents preview --local`)
- Sideload the app in Teams (see `/teams-sideload` command) and send a message

If `--minimal` is passed, stop after Step 3 (dependencies only).
