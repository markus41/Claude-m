---
name: diagnostic-settings
description: "Configure diagnostic settings to send Azure resource logs and metrics to Log Analytics, Storage, or Event Hubs"
argument-hint: "<resource-id-or-name> [--workspace <name>] [--storage <account>] [--categories <list>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

# Configure Diagnostic Settings

Set up diagnostic settings for Azure resources to route platform logs and metrics to Log Analytics, Storage accounts, or Event Hubs.

## Instructions

### 1. Parse Inputs

- `<resource>` — Azure resource ID or name. If a name is provided, resolve the full resource ID. Ask if not provided.
- `--workspace` — Log Analytics workspace name to send data to. Ask if not provided.
- `--storage` — Storage account name for archival (optional).
- `--categories` — Comma-separated list of log categories to enable (optional; defaults to all logs).

### 2. Identify the Resource Type

Determine the resource type and available log categories:

```bash
# List available log categories for a resource
az monitor diagnostic-settings categories list \
  --resource "<resource-id>" \
  --query "value[].{Category:name, Type:categoryType}" -o table
```

Show the user the available categories and let them select which to enable. If `--categories` was not specified, recommend enabling all logs (`categoryGroup: allLogs`).

### 3. Check Existing Diagnostic Settings

```bash
az monitor diagnostic-settings list \
  --resource "<resource-id>" \
  --query "value[].{Name:name, Workspace:workspaceId, Storage:storageAccountId}" -o table
```

If settings already exist, warn the user. A resource can have up to 5 diagnostic settings (allowing different destinations), but duplicate category configurations will conflict.

### 4. Resolve Destination IDs

```bash
# Get Log Analytics workspace resource ID
az monitor log-analytics workspace show \
  --resource-group <rg> \
  --workspace-name <workspace-name> \
  --query "id" -o tsv

# Get Storage account resource ID (if archiving)
az storage account show \
  --resource-group <rg> \
  --name <storage-name> \
  --query "id" -o tsv
```

### 5. Create the Diagnostic Setting

**Send all logs and metrics to Log Analytics**:
```bash
az monitor diagnostic-settings create \
  --name "send-to-loganalytics" \
  --resource "<resource-id>" \
  --workspace "<workspace-resource-id>" \
  --logs '[{"categoryGroup":"allLogs","enabled":true}]' \
  --metrics '[{"category":"AllMetrics","enabled":true}]'
```

**Send specific categories**:
```bash
az monitor diagnostic-settings create \
  --name "selected-logs" \
  --resource "<resource-id>" \
  --workspace "<workspace-resource-id>" \
  --logs '[{"category":"<category1>","enabled":true},{"category":"<category2>","enabled":true}]' \
  --metrics '[{"category":"AllMetrics","enabled":true}]'
```

**Send to multiple destinations** (Log Analytics + Storage):
```bash
az monitor diagnostic-settings create \
  --name "logs-and-archive" \
  --resource "<resource-id>" \
  --workspace "<workspace-resource-id>" \
  --storage-account "<storage-resource-id>" \
  --logs '[{"categoryGroup":"allLogs","enabled":true}]' \
  --metrics '[{"category":"AllMetrics","enabled":true}]'
```

### 6. Generate Bicep Template (Optional)

If the user wants infrastructure-as-code, generate a Bicep template:

```bicep
resource diagnosticSettings 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = {
  name: '<setting-name>'
  scope: targetResource
  properties: {
    workspaceId: logAnalyticsWorkspace.id
    logs: [
      {
        categoryGroup: 'allLogs'
        enabled: true
      }
    ]
    metrics: [
      {
        category: 'AllMetrics'
        enabled: true
      }
    ]
  }
}
```

Write to `infra/diagnostic-settings.bicep` or similar.

### 7. Verify Data Flow

After creating the diagnostic setting, verify data is flowing:

```bash
# Wait 5-10 minutes, then query the workspace
az monitor log-analytics query \
  --workspace "<workspace-id>" \
  --analytics-query "AzureDiagnostics | where ResourceId contains '<resource-name>' | take 5"
```

### 8. Bulk Configuration (Optional)

If the user wants to enable diagnostic settings for all resources in a resource group or subscription:

```bash
# List all resources in a resource group
az resource list --resource-group <rg> --query "[].id" -o tsv

# For each resource, create diagnostic settings
# (Show the user the loop and confirm before executing)
```

### 9. Display Summary

Show the user:
- Resource name and type
- Log categories enabled
- Destination(s) configured (workspace, storage, event hub)
- Diagnostic setting name
- How to verify: Azure Portal > Resource > Diagnostic settings
- Expected data latency: 5-10 minutes for first data to appear
- Next steps: write KQL queries (`/kql-query`), create alerts (`/alert-create`)
