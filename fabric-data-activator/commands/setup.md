---
name: reflex-setup
description: Set up the Fabric Data Activator plugin — verify Fabric workspace access, configure Azure identity, and prepare eventstream connectivity
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

# Fabric Data Activator Setup

Guide the user through setting up a Fabric Data Activator development and monitoring environment.

## Step 1: Check Prerequisites

Verify the following:

- **Azure CLI**: Required for authentication and API access.
- **Fabric workspace**: The user must have access to a Fabric-enabled workspace with at least Contributor role.

```bash
az --version       # Must be >= 2.50.0
az account show    # Verify logged in
```

## Step 2: Authenticate to Fabric

Ensure the user is authenticated to Azure with access to the Fabric API:

```bash
az login
az account set --subscription <subscription-id>
```

Verify Fabric API access:
```bash
az account get-access-token --resource https://api.fabric.microsoft.com --query accessToken -o tsv
```

## Step 3: Verify Workspace Access

Ask the user for their Fabric workspace ID or name. Verify they have Contributor or Admin access:

```bash
curl -s -H "Authorization: Bearer $(az account get-access-token --resource https://api.fabric.microsoft.com --query accessToken -o tsv)" \
  "https://api.fabric.microsoft.com/v1/workspaces" | jq '.value[] | {id, displayName}'
```

## Step 4: Configure Environment Variables

Create a `.env` file for Data Activator API access:

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

## Step 5: Verify Eventstream Connectivity (Optional)

If the user plans to use eventstreams as a data source, verify the eventstream exists:

```bash
curl -s -H "Authorization: Bearer $(az account get-access-token --resource https://api.fabric.microsoft.com --query accessToken -o tsv)" \
  "https://api.fabric.microsoft.com/v1/workspaces/{workspaceId}/eventstreams" | jq '.value[] | {id, displayName}'
```

## Step 6: Install Optional Tools

For advanced scenarios:

```bash
# Power BI CLI (for Power BI integration scenarios)
npm install -g powerbi-cli

# jq for JSON processing
# Windows: winget install jqlang.jq
# macOS: brew install jq
# Linux: apt-get install jq
```

## Step 7: Verify Access

Test that you can list Reflex items in the workspace:

```bash
curl -s -H "Authorization: Bearer $(az account get-access-token --resource https://api.fabric.microsoft.com --query accessToken -o tsv)" \
  "https://api.fabric.microsoft.com/v1/workspaces/{workspaceId}/reflexes" | jq '.value[] | {id, displayName}'
```

If the response is empty or returns an empty array, the workspace is accessible and ready for Reflex item creation.

If `--minimal` is passed, stop after Step 3 (authentication and workspace verification only).
