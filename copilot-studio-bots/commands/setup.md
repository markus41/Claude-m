---
name: setup
description: Set up the Copilot Studio Bots plugin — configure Power Platform environment access, Dataverse credentials, and Direct Line token
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

# Copilot Studio Bots Setup

Guide the user through setting up Copilot Studio development access and Dataverse connectivity.

## Step 1: Check Prerequisites

Verify the following are installed:

- **Node.js 18+**: Required for scripting and API interactions.
- **npm**: Comes with Node.js.
- **Azure CLI** (optional): Useful for managing app registrations.

```bash
node --version   # Must be >= 18.0.0
npm --version
```

## Step 2: Install Dependencies

```bash
npm init -y && npm install @azure/identity @azure/ms-rest-nodeauth node-fetch dotenv
```

## Step 3: Azure Entra App Registration

Ask the user to create (or provide) an Azure Entra ID (formerly Azure AD) app registration with the following API permissions:

**Power Platform API**:
- `Environment.Read` — Read Power Platform environment metadata.

**Dataverse (Dynamics CRM)**:
- `user_impersonation` — Access Dataverse as the signed-in user.
- Alternatively, for daemon/service access, grant the application **Chatbots.ReadWrite** application permission in the Dataverse environment.

**Steps to register**:
1. Go to Azure Portal > Azure Active Directory > App registrations > New registration.
2. Set redirect URI to `http://localhost` (for development).
3. Under API permissions, add:
   - `Dynamics CRM` > `user_impersonation` (delegated) or configure application permissions in Power Platform admin center.
4. Create a client secret under Certificates & secrets.
5. Note the **Tenant ID**, **Client ID**, and **Client Secret**.

Grant admin consent for the permissions if required by the organization.

## Step 4: Identify Dataverse Environment URL

Ask the user for their Power Platform environment URL. This is the Dataverse endpoint:

- Format: `https://orgXXXXX.crm.dynamics.com`
- Find it: Power Platform admin center > Environments > select environment > Environment URL.

Common regional variants:
- `crm.dynamics.com` (North America)
- `crm4.dynamics.com` (EMEA)
- `crm5.dynamics.com` (APAC)

## Step 5: Configure Environment

Create a `.env` file in the project root:

```
AZURE_TENANT_ID=<your-tenant-id>
AZURE_CLIENT_ID=<your-client-id>
AZURE_CLIENT_SECRET=<your-client-secret>
DATAVERSE_URL=https://orgXXXXX.crm.dynamics.com
```

Ensure `.env` is in `.gitignore`:
```bash
echo ".env" >> .gitignore
```

## Step 6: Verify Access

Authenticate and call the Dataverse Web API to verify connectivity by listing bots:

```bash
# Obtain a token
TOKEN=$(curl -s -X POST "https://login.microsoftonline.com/${AZURE_TENANT_ID}/oauth2/v2.0/token" \
  -d "client_id=${AZURE_CLIENT_ID}" \
  -d "client_secret=${AZURE_CLIENT_SECRET}" \
  -d "scope=${DATAVERSE_URL}/.default" \
  -d "grant_type=client_credentials" | jq -r '.access_token')

# List bots in the environment
curl -s -H "Authorization: Bearer ${TOKEN}" \
  -H "OData-MaxVersion: 4.0" \
  -H "OData-Version: 4.0" \
  -H "Accept: application/json" \
  "${DATAVERSE_URL}/api/data/v9.2/bots" | jq '.value[] | {botid, name, description}'
```

If the response returns bot records (or an empty array with no error), access is configured correctly.

If `--minimal` is passed, stop after Step 2 (dependencies only).
