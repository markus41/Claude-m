---
name: setup
description: Set up the Fabric Data Factory plugin — configure workspace access, authenticate with Azure, and verify Fabric API connectivity
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

# Fabric Data Factory Setup

Guide the user through setting up a Microsoft Fabric Data Factory development environment.

## Step 1: Check Prerequisites

Verify the following are installed:

- **Azure CLI**: Required for authentication and Fabric REST API access.
- **Node.js 18+**: Required for tooling and scripting.
- **Power Query SDK** (optional): For local Dataflow Gen2 M query development.

```bash
az --version       # Must be >= 2.50.0
node --version     # Must be >= 18.0.0
```

## Step 2: Authenticate with Azure

```bash
az login
az account show    # Verify correct tenant and subscription
```

For service principal authentication (CI/CD):
```bash
az login --service-principal -u <app-id> -p <client-secret> --tenant <tenant-id>
```

## Step 3: Verify Fabric Workspace Access

List available Fabric workspaces to confirm API access:

```bash
az rest --method GET --url "https://api.fabric.microsoft.com/v1/workspaces" --headers "Content-Type=application/json"
```

Ask the user for their target workspace ID. Save it for later use:

```
FABRIC_WORKSPACE_ID=<workspace-id>
```

## Step 4: Configure Environment

Create a `.env` file in the project root:

```
FABRIC_WORKSPACE_ID=<workspace-id>
AZURE_TENANT_ID=<tenant-id>
AZURE_CLIENT_ID=<client-id>
AZURE_CLIENT_SECRET=<client-secret>
FABRIC_API_BASE=https://api.fabric.microsoft.com/v1
```

Ensure `.env` is in `.gitignore`:
```bash
echo ".env" >> .gitignore
```

## Step 5: Install Helper Dependencies

```bash
npm init -y && npm install @azure/identity @azure/core-rest-pipeline dotenv
npm install --save-dev typescript @types/node ts-node
```

## Step 6: Verify API Connectivity

Test pipeline listing in the target workspace:

```bash
az rest --method GET \
  --url "https://api.fabric.microsoft.com/v1/workspaces/${FABRIC_WORKSPACE_ID}/items?type=DataPipeline" \
  --headers "Content-Type=application/json"
```

Test dataflow listing:

```bash
az rest --method GET \
  --url "https://api.fabric.microsoft.com/v1/workspaces/${FABRIC_WORKSPACE_ID}/items?type=Dataflow" \
  --headers "Content-Type=application/json"
```

If both return successfully (even with empty results), the setup is complete.

## Step 7: Verify Lakehouse Access (Optional)

If using lakehouse as a pipeline destination:

```bash
az rest --method GET \
  --url "https://api.fabric.microsoft.com/v1/workspaces/${FABRIC_WORKSPACE_ID}/items?type=Lakehouse" \
  --headers "Content-Type=application/json"
```

If `--minimal` is passed, stop after Step 3 (authentication and workspace verification only).
