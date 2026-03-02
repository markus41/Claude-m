---
name: setup
description: Set up the Fabric Real-Time Analytics plugin — install SDKs, configure workspace access, verify Eventhouse connectivity
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

# Fabric Real-Time Analytics Setup

Guide the user through setting up a Fabric Real-Time Analytics development environment.

## Step 1: Check Prerequisites

Verify the following are installed:

- **Node.js 18+**: Required for Kusto SDK and Eventstream custom app ingestion.
- **npm**: Comes with Node.js.
- **Azure CLI**: Required for authentication and Fabric REST API calls.

```bash
node --version   # Must be >= 18.0.0
npm --version
az --version     # Must be >= 2.50.0
```

## Step 2: Install Kusto SDKs

```bash
npm init -y && npm install azure-kusto-data azure-kusto-ingest @azure/identity @azure/event-hubs dotenv
npm install --save-dev typescript @types/node ts-node
```

**Package purposes**:
- `azure-kusto-data`: Execute KQL queries against Eventhouse KQL databases.
- `azure-kusto-ingest`: Ingest data programmatically (queued and streaming).
- `@azure/identity`: Authenticate with Azure AD / Entra ID (DefaultAzureCredential).
- `@azure/event-hubs`: Send events to Eventstream Custom App sources.

## Step 3: Authenticate to Fabric

```bash
# Login to Azure (interactive)
az login

# Set the subscription (if multiple)
az account set --subscription <subscription-id>

# Get an access token for Fabric APIs
az account get-access-token --resource https://api.fabric.microsoft.com
```

For non-interactive scenarios (CI/CD, service accounts), register an Entra ID app registration:
1. Go to Azure Portal > Entra ID > App registrations > New registration.
2. Grant API permissions: `https://api.fabric.microsoft.com/.default`.
3. Create a client secret.
4. Note the Application (client) ID and tenant ID.

## Step 4: Configure Environment

Create a `.env` file in the project root:

```
FABRIC_WORKSPACE_ID=<your-workspace-id>
EVENTHOUSE_URI=https://<eventhouse-query-uri>.fabric.microsoft.com
KQL_DATABASE_NAME=<your-kql-database-name>
AZURE_TENANT_ID=<your-tenant-id>
AZURE_CLIENT_ID=<your-client-id>
AZURE_CLIENT_SECRET=<your-client-secret>
EVENTSTREAM_CONNECTION_STRING=Endpoint=sb://<namespace>.servicebus.windows.net/;SharedAccessKeyName=...
EVENTSTREAM_HUB_NAME=<eventstream-name>
```

Ensure `.env` is in `.gitignore`:
```bash
echo ".env" >> .gitignore
```

## Step 5: Find Workspace and Eventhouse IDs

```bash
# List Fabric workspaces
az rest --method GET --url "https://api.fabric.microsoft.com/v1/workspaces" --headers "Content-Type=application/json"

# List items in a workspace (find Eventhouse and KQL Database IDs)
az rest --method GET --url "https://api.fabric.microsoft.com/v1/workspaces/<workspace-id>/items" --headers "Content-Type=application/json"
```

The Eventhouse query URI can be found in the Fabric portal:
1. Open the KQL Database item.
2. Click **Copy URI** in the toolbar.
3. The query URI looks like: `https://<guid>.z<region>.kusto.fabric.microsoft.com`.

## Step 6: Verify Connectivity

Test the connection by running a simple KQL query:

```typescript
import { Client, KustoConnectionStringBuilder } from "azure-kusto-data";
import { DefaultAzureCredential } from "@azure/identity";

const clusterUri = process.env.EVENTHOUSE_URI!;
const database = process.env.KQL_DATABASE_NAME!;

const kcsb = KustoConnectionStringBuilder.withTokenCredential(
  clusterUri,
  new DefaultAzureCredential()
);

const client = new Client(kcsb);
const result = await client.execute(database, ".show tables");
console.log(result.primaryResults[0].toJSON());
```

Save as `src/test-connection.ts` and run:
```bash
npx ts-node src/test-connection.ts
```

## Step 7: Verify Event Ingestion (Optional)

If using Eventstream with a Custom App source, test sending an event:

```bash
npx ts-node -e "
const { EventHubProducerClient } = require('@azure/event-hubs');
const producer = new EventHubProducerClient(
  process.env.EVENTSTREAM_CONNECTION_STRING,
  process.env.EVENTSTREAM_HUB_NAME
);
(async () => {
  const batch = await producer.createBatch();
  batch.tryAdd({ body: { ts: new Date().toISOString(), test: true } });
  await producer.sendBatch(batch);
  console.log('Event sent successfully');
  await producer.close();
})();
"
```

If `--minimal` is passed, stop after Step 2 (SDKs only).
