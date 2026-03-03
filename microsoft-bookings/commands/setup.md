---
name: bookings-setup
description: Set up the Microsoft Bookings plugin — install dependencies, configure Azure Entra app registration, and verify Graph API access
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

# Microsoft Bookings Setup

Guide the user through setting up Microsoft Bookings API access via Microsoft Graph.

## Step 1: Check Prerequisites

Verify Node.js 18+ is installed:

```bash
node --version
```

If Node.js is not installed or below version 18, direct the user to install it from https://nodejs.org before continuing.

## Step 2: Install Dependencies

```bash
npm init -y && npm install @microsoft/microsoft-graph-client @azure/identity
```

These packages provide:
- `@microsoft/microsoft-graph-client` — Microsoft Graph SDK for calling Bookings endpoints
- `@azure/identity` — Azure authentication using client credentials or interactive browser flow

## Step 3: Configure Azure App Registration

Register an application in Microsoft Entra ID (Azure Active Directory) with the following Microsoft Graph API delegated permissions:

| Permission | Type | Purpose |
|---|---|---|
| `Bookings.Read.All` | Delegated | Read booking businesses, services, staff, and appointments |
| `Bookings.ReadWrite.All` | Delegated | Create and update services, appointments, staff assignments |
| `Bookings.Manage.All` | Delegated | Full management — delete operations, business settings, publishing |

**Registration steps**:
1. Go to [Azure Portal](https://portal.azure.com) > Microsoft Entra ID > App registrations > New registration
2. Set a name (e.g., `Bookings Plugin`) and choose "Accounts in this organizational directory only"
3. Under API permissions, add the three Microsoft Graph delegated permissions listed above
4. Grant admin consent for the organization
5. Under Certificates & secrets, create a new client secret and copy the value immediately

Collect these values:
- **Tenant ID** — from the app's Overview page
- **Client ID** (Application ID) — from the app's Overview page
- **Client Secret** — the secret value you just created

## Step 4: Configure Environment

Create a `.env` file in the project root:

```
AZURE_TENANT_ID=<your-tenant-id>
AZURE_CLIENT_ID=<your-client-id>
AZURE_CLIENT_SECRET=<your-client-secret>
```

Ask the user for each value and write the `.env` file. Remind the user to add `.env` to `.gitignore` to avoid committing secrets.

## Step 5: Verify Graph API Access

Test connectivity by listing the Bookings businesses accessible to the authenticated user:

```bash
curl -s -H "Authorization: Bearer $ACCESS_TOKEN" \
  "https://graph.microsoft.com/v1.0/solutions/bookingBusinesses" \
  | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8'); const j=JSON.parse(d); console.table((j.value||[]).map(b=>({id:b.id, name:b.displayName, phone:b.phone})))"
```

Alternatively, use the Graph SDK in a quick verification script:

```javascript
const { ClientSecretCredential } = require("@azure/identity");
const { Client } = require("@microsoft/microsoft-graph-client");
const { TokenCredentialAuthenticationProvider } = require("@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials");

const credential = new ClientSecretCredential(
  process.env.AZURE_TENANT_ID,
  process.env.AZURE_CLIENT_ID,
  process.env.AZURE_CLIENT_SECRET
);
const authProvider = new TokenCredentialAuthenticationProvider(credential, {
  scopes: ["https://graph.microsoft.com/.default"]
});
const client = Client.initWithMiddleware({ authProvider });

async function verify() {
  const result = await client.api("/solutions/bookingBusinesses").get();
  console.log("Bookings businesses found:", result.value.length);
  result.value.forEach(b => console.log(` - ${b.displayName} (${b.id})`));
}
verify().catch(console.error);
```

## Step 6: Output Summary

Display the setup results:

```markdown
# Bookings Plugin Setup Report

| Setting | Value |
|---|---|
| Node.js version | [version] |
| Graph SDK | [Installed / Missing] |
| Azure Identity | [Installed / Missing] |
| Tenant ID | [configured / missing] |
| Client ID | [configured / missing] |
| Client Secret | [configured / missing] |
| Graph API connectivity | [OK / Failed] |
| Bookings businesses found | [count] |
```

If `--minimal` is passed, stop after Step 2 (dependencies installed, skip Azure configuration and verification).
