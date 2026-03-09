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

Guide the user through setting up a Teams app development environment using the current Microsoft 365 Agents Toolkit stack.

## Step 1: Check Prerequisites

Verify the following are installed:

- **Node.js 20+** (Node 22 recommended for `--env-file` support): Required for M365 Agents Toolkit and Teams SDK v2.
- **npm**: Comes with Node.js.

```bash
node --version   # Must be >= 20.0.0
npm --version
```

## Step 2: Install Microsoft 365 Agents Toolkit CLI

```bash
npm install -g @microsoft/m365agentstoolkit-cli
m365agents --version
```

Note: This replaces the deprecated `@microsoft/teamsapp-cli` (Teams Toolkit CLI).

## Step 3: Install Teams SDK v2 Dependencies

```bash
npm init -y && npm install @microsoft/teams-sdk @microsoft/teams-js @azure/identity @azure/msal-node express dotenv
npm install --save-dev typescript @types/express @types/node ts-node
```

For M365 Agents SDK projects (multi-channel), use instead:
```bash
npm install @microsoft/agents-core @microsoft/agents-hosting-express @azure/identity dotenv
```

## Step 4: Azure Bot Registration (Single-Tenant)

Ask the user to create (or provide) an Azure Bot resource. **All new bots must be single-tenant** (multi-tenant registration is retiring).

**Option A: Via Azure Portal**
1. Go to Azure Portal > Create a resource > Azure Bot.
2. Choose **Single Tenant** for bot type.
3. Enter the **Tenant ID** for the bot's home tenant.
4. Select **Create new Microsoft App ID** (or use existing).
5. Note the **Microsoft App ID** (this is `BOT_ID`) and create a **Client Secret** (this is `BOT_PASSWORD`).
6. Under Configuration, set the Messaging endpoint to `https://<your-domain>/api/messages`.

**Option B: Via M365 Agents Toolkit**
The toolkit can auto-create the bot registration during `m365agents provision`. Skip this step if using the toolkit for provisioning.

**Option C: Via Azure CLI**
```bash
az bot create --resource-group <rg-name> --name <bot-name> --kind registration \
  --endpoint "https://<your-domain>/api/messages" \
  --microsoft-app-type SingleTenant \
  --microsoft-app-id <app-id> \
  --microsoft-app-tenant-id <tenant-id>
```

## Step 5: Configure Environment

Create a `.env` file in the project root:

```
BOT_ID=<microsoft-app-id>
BOT_PASSWORD=<client-secret>
APP_TENANTID=<your-tenant-id>
MicrosoftAppType=SingleTenant
BOT_ENDPOINT=https://<your-domain>
```

Ensure `.env` is in `.gitignore`:
```bash
echo ".env" >> .gitignore
```

## Step 6: Set Up Local Debugging

For local development, the Agents Toolkit uses dev tunnels:

```bash
# Start local preview (creates tunnel + sideloads app)
m365agents preview --local
```

Alternatively, use the **Agents Playground** for bot testing without a dev tenant, tunneling, or app/bot registration.

For manual tunneling:
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
