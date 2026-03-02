---
name: setup
description: Set up the Teams App Dev plugin — install Teams Toolkit CLI, register Azure Bot, configure BOT_ID and BOT_PASSWORD
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

Guide the user through setting up a Teams app development environment.

## Step 1: Check Prerequisites

Verify the following are installed:

- **Node.js 18+**: Required for Teams Toolkit and Bot Framework.
- **npm**: Comes with Node.js.

```bash
node --version   # Must be >= 18.0.0
npm --version
```

## Step 2: Install Teams Toolkit CLI

```bash
npm install -g @microsoft/teamsapp-cli
teamsapp --version
```

## Step 3: Install Bot Framework Dependencies

```bash
npm init -y && npm install botbuilder botbuilder-dialogs @microsoft/teams-js @azure/identity @azure/msal-node express dotenv
npm install --save-dev typescript @types/express @types/node ts-node
```

## Step 4: Azure Bot Registration

Ask the user to create (or provide) an Azure Bot resource:

**Option A: Via Azure Portal**
1. Go to Azure Portal > Create a resource > Azure Bot.
2. Choose **Multi Tenant** for bot type.
3. Select **Create new Microsoft App ID** (or use existing).
4. Note the **Microsoft App ID** (this is `BOT_ID`) and create a **Client Secret** (this is `BOT_PASSWORD`).
5. Under Configuration, set the Messaging endpoint to `https://<your-domain>/api/messages`.

**Option B: Via Teams Toolkit**
Teams Toolkit can auto-create the bot registration during `teamsapp provision`. Skip this step if using Teams Toolkit for provisioning.

**Option C: Via Azure CLI**
```bash
az bot create --resource-group <rg-name> --name <bot-name> --kind registration \
  --endpoint "https://<your-domain>/api/messages" \
  --microsoft-app-type MultiTenant \
  --microsoft-app-id <app-id>
```

## Step 5: Configure Environment

Create a `.env` file in the project root:

```
BOT_ID=<microsoft-app-id>
BOT_PASSWORD=<client-secret>
BOT_ENDPOINT=https://<your-domain>
AZURE_TENANT_ID=<your-tenant-id>
AZURE_CLIENT_ID=<your-client-id>
AZURE_CLIENT_SECRET=<your-client-secret>
```

Ensure `.env` is in `.gitignore`:
```bash
echo ".env" >> .gitignore
```

## Step 6: Set Up Local Debugging

For local development, Teams Toolkit uses dev tunnels:

```bash
# Start local preview (creates tunnel + sideloads app)
teamsapp preview --local
```

Alternatively, use ngrok manually:
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

Then sideload the app in Teams (see `/teams-sideload` command) and send a message to verify the bot responds.

If `--minimal` is passed, stop after Step 3 (dependencies only).
