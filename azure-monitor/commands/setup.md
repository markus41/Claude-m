---
name: setup
description: Set up the Azure Monitor plugin — install Azure CLI, create a Log Analytics workspace, and enable diagnostic settings
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

# Azure Monitor Setup

Guide the user through setting up Azure Monitor infrastructure for their environment.

## Step 1: Check Prerequisites

Verify the following are installed:

- **Azure CLI 2.50+**: Required for all Azure Monitor operations.
- **Node.js 18+**: Required if instrumenting a Node.js application with Application Insights.

```bash
az version        # Must be >= 2.50
az account show   # Verify logged in
node --version    # Optional, for App Insights SDK
```

If Azure CLI is not installed:
```bash
# Windows (winget)
winget install -e --id Microsoft.AzureCLI

# macOS
brew install azure-cli

# Linux (Ubuntu/Debian)
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
```

## Step 2: Log In to Azure

```bash
az login
az account set --subscription "<subscription-id>"
```

Ask the user for their target subscription if not already set.

## Step 3: Create a Resource Group

```bash
az group create --name monitoring-rg --location eastus
```

Ask the user for their preferred resource group name and region.

## Step 4: Create a Log Analytics Workspace

```bash
az monitor log-analytics workspace create \
  --resource-group monitoring-rg \
  --workspace-name prod-logs \
  --location eastus \
  --retention-time 90 \
  --sku PerGB2018
```

Ask the user for:
- **Workspace name** (e.g., `prod-logs`, `dev-logs`)
- **Retention days** (30-730, default 90)
- **Pricing tier** (`PerGB2018` for pay-as-you-go, or commitment tiers for 100+ GB/day)

## Step 5: Create Application Insights (Optional)

If the user has a web application to monitor:

```bash
az monitor app-insights component create \
  --app my-web-app-insights \
  --location eastus \
  --resource-group monitoring-rg \
  --workspace "/subscriptions/<sub>/resourceGroups/monitoring-rg/providers/Microsoft.OperationalInsights/workspaces/prod-logs" \
  --kind web \
  --application-type web
```

Note the connection string from the output — it will be needed for the Application Insights SDK.

## Step 6: Create an Action Group

```bash
az monitor action-group create \
  --name ops-team \
  --resource-group monitoring-rg \
  --short-name OpsTeam \
  --email-receiver name=Lead email=ops-lead@contoso.com
```

Ask the user for notification recipients (email addresses, webhook URLs, etc.).

## Step 7: Enable Diagnostic Settings

For each production Azure resource, enable diagnostic settings to send logs and metrics to the workspace:

```bash
az monitor diagnostic-settings create \
  --name "send-to-loganalytics" \
  --resource "<resource-id>" \
  --workspace "/subscriptions/<sub>/resourceGroups/monitoring-rg/providers/Microsoft.OperationalInsights/workspaces/prod-logs" \
  --logs '[{"categoryGroup":"allLogs","enabled":true}]' \
  --metrics '[{"category":"AllMetrics","enabled":true}]'
```

Ask the user which resources to configure. Common resources:
- App Services / Function Apps
- SQL Databases
- Storage Accounts
- Key Vaults
- AKS Clusters

## Step 8: Verify Data Flow

After a few minutes, verify data is flowing into the workspace:

```bash
az monitor log-analytics query \
  --workspace "<workspace-id>" \
  --analytics-query "Heartbeat | take 5"
```

Or in the Azure Portal: Log Analytics workspace > Logs > run `search * | take 10`.

If `--minimal` is passed, stop after Step 4 (workspace creation only).
