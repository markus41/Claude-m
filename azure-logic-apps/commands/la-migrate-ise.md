---
name: la-migrate-ise
description: "Migrate Logic Apps from ISE to Standard — inventory, assess, export, convert, validate"
argument-hint: "[--ise-name <name>] [--resource-group <rg>] [--dry-run]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

# Migrate Logic Apps from ISE to Standard

Guide the user through migrating Integration Service Environment (ISE) Logic Apps to the Standard (single-tenant) hosting model. ISE is being retired, and Standard Logic Apps provide equivalent isolation, VNET integration, and performance.

## Instructions

### 1. Inventory All Logic Apps in ISE

Ask for `--ise-name` and `--resource-group` if not provided.

List all Logic Apps running in the ISE:
```bash
az logic workflow list \
  --resource-group <rg-name> \
  --query "[?properties.integrationServiceEnvironment.id != null]" \
  --output table
```

Or query by ISE directly:
```bash
az rest --method GET \
  --url "https://management.azure.com/subscriptions/<sub-id>/resourceGroups/<rg-name>/providers/Microsoft.Logic/integrationServiceEnvironments/<ise-name>?api-version=2019-05-01" \
  --query "properties"
```

Produce an inventory summary:
- Total number of Logic Apps
- List of workflow names
- Triggers used per workflow
- Connectors referenced (ISE-versioned vs standard)
- Integration account linkages
- Current run frequency and status

### 2. Assess Compatibility

Evaluate each Logic App for Standard compatibility:

**Connector mapping** (ISE to built-in/managed):
| ISE Connector | Standard Equivalent | Notes |
|---------------|-------------------|-------|
| ISE - Azure Service Bus | Built-in Service Bus | Direct replacement, update connection config |
| ISE - Azure Blob Storage | Built-in Azure Blob | Direct replacement |
| ISE - Azure Event Hubs | Built-in Event Hubs | Direct replacement |
| ISE - SQL Server | Built-in SQL | Direct replacement |
| ISE - HTTP | Built-in HTTP | Direct replacement |
| ISE - Azure Functions | Built-in Azure Functions | Direct replacement |
| ISE - Office 365 | Managed connector | Requires API connection resource |
| ISE - SharePoint | Managed connector | Requires API connection resource |
| ISE - Flat File Encoding | Built-in Flat File | Requires integration account |

**Feature parity check**:
- Batching: Supported in Standard (stateful workflows only).
- ISE connectors with VNET access: Standard supports VNET integration natively.
- Integration account: Supported, must be linked via app settings.
- Custom connectors: Must be recreated as custom built-in connectors or managed API connections.
- Inline code (JavaScript): Supported in Standard via inline code action.
- Concurrency control: Supported with different configuration syntax.

Flag any Logic Apps with unsupported patterns and suggest workarounds.

### 3. Export Workflow Definitions

Export each Logic App's ARM template:

```bash
az logic workflow show \
  --resource-group <rg-name> \
  --name <workflow-name> \
  --output json > <workflow-name>-export.json
```

Or export via REST API for full fidelity:
```bash
az rest --method POST \
  --url "https://management.azure.com/subscriptions/<sub-id>/resourceGroups/<rg-name>/providers/Microsoft.Logic/workflows/<workflow-name>/listCallbackUrl?api-version=2016-06-01"
```

Extract the `properties.definition` from each export — this is the workflow definition that will be converted.

### 4. Convert WDL for Standard

Transform the exported Consumption/ISE workflow definitions to Standard format:

1. **Extract the definition**: Pull the `definition` object from the ARM template's `properties`.
2. **Create workflow.json**: Wrap the definition in Standard format:
   ```json
   {
     "definition": { /* extracted definition */ },
     "kind": "Stateful"
   }
   ```
3. **Update connection references**:
   - Replace ISE connector references with built-in service provider references.
   - Move managed API connection references to `connections.json`.
   - Update `@parameters('$connections')` references to use the new connection names.
4. **Adjust ISE-specific actions**:
   - Replace `"type": "ApiConnection"` with `"type": "ServiceProvider"` for built-in connectors.
   - Update `inputs.host` from managed API format to service provider format.
   - Remove ISE-specific properties (`integrationServiceEnvironment` references).
5. **Handle parameters**: Move ARM parameters to Logic App application settings and reference via `@appsetting()`.

Example connection reference conversion:

**ISE/Consumption format** (in workflow definition):
```json
"Send_message": {
  "type": "ApiConnection",
  "inputs": {
    "host": {
      "connection": {
        "name": "@parameters('$connections')['servicebus']['connectionId']"
      }
    },
    "method": "post",
    "path": "/@{encodeURIComponent('myqueue')}/messages"
  }
}
```

**Standard format** (in workflow.json):
```json
"Send_message": {
  "type": "ServiceProvider",
  "inputs": {
    "parameters": {
      "entityName": "myqueue"
    },
    "serviceProviderConfiguration": {
      "connectionName": "serviceBus",
      "operationId": "sendMessage",
      "serviceProviderId": "/serviceProviders/serviceBus"
    }
  }
}
```

### 5. Create Standard Logic App Infrastructure

```bash
# Create App Service plan (WS1 minimum for production)
az appservice plan create \
  --name <plan-name> \
  --resource-group <rg-name> \
  --location <region> \
  --sku WS1

# Verify plan creation
az appservice plan show \
  --name <plan-name> --resource-group <rg-name> --output table

# Create storage account
az storage account create \
  --name <storage-name> \
  --resource-group <rg-name> \
  --location <region> \
  --sku Standard_LRS

# Create Standard Logic App
az logicapp create \
  --name <app-name> \
  --resource-group <rg-name> \
  --plan <plan-name> \
  --storage-account <storage-name>

# Verify Logic App creation
az logicapp show \
  --name <app-name> --resource-group <rg-name> --output table

# Enable managed identity
az logicapp identity assign \
  --name <app-name> --resource-group <rg-name>

# Enable VNET integration (to match ISE network isolation)
az logicapp vnet-integration add \
  --name <app-name> \
  --resource-group <rg-name> \
  --vnet <vnet-name> \
  --subnet <subnet-name>

# Verify VNet integration
az logicapp vnet-integration list \
  --name <app-name> --resource-group <rg-name> --output table
```

### 6. Deploy Converted Workflows

Organize the converted workflows into a Standard Logic App project structure:

```
<project>/
  host.json
  connections.json
  local.settings.json
  <workflow-1>/workflow.json
  <workflow-2>/workflow.json
  ...
  Artifacts/
    Maps/
    Schemas/
```

Deploy using zip deployment:
```bash
cd <project-dir>
zip -r ../deploy.zip . -x ".git/*" ".vscode/*" "local.settings.json"
az logicapp deployment source config-zip \
  --name <app-name> --resource-group <rg-name> \
  --src ../deploy.zip
```

Configure app settings for connections:
```bash
az logicapp config appsettings set \
  --name <app-name> --resource-group <rg-name> \
  --settings "ServiceBusConnectionString=<connection-string>" \
              "StorageConnectionString=<connection-string>"
```

### 7. Validate: Run Test Cases and Compare Outputs

For each migrated workflow:

1. **Trigger a test run**: Send test data to the workflow trigger.
2. **Compare outputs**: Verify the Standard workflow produces the same output as the ISE workflow.
3. **Check run history**: Confirm all actions completed successfully.
4. **Validate connectors**: Ensure all connector calls reach their targets.
5. **Performance comparison**: Compare execution times between ISE and Standard.

```bash
# Check workflow run status
az rest --method GET \
  --url "https://management.azure.com/subscriptions/<sub-id>/resourceGroups/<rg-name>/providers/Microsoft.Web/sites/<app-name>/hostruntime/runtime/webhooks/workflow/api/management/workflows?api-version=2022-03-01"
```

Document any discrepancies and fix before cutover.

### 8. Cutover Plan

Prepare a cutover checklist:

1. **Freeze ISE workflows**: Disable triggers on ISE Logic Apps to stop new runs.
   ```bash
   # Disable each ISE Logic App
   az logic workflow update \
     --resource-group <rg-name> --name <ise-workflow-name> \
     --state Disabled
   ```
2. **Drain in-flight runs**: Wait for all active ISE runs to complete.
   ```bash
   # Check for running executions
   az logic workflow run list \
     --resource-group <rg-name> --workflow-name <ise-workflow-name> \
     --filter "status eq 'Running'" --output table
   ```
3. **DNS / endpoint updates**: Update any callers referencing ISE Logic App callback URLs to use Standard Logic App URLs.
   ```bash
   # Get Standard workflow callback URL
   az rest --method POST \
     --url "https://management.azure.com/subscriptions/<sub-id>/resourceGroups/<rg-name>/providers/Microsoft.Web/sites/<app-name>/hostruntime/runtime/webhooks/workflow/api/management/workflows/<workflow-name>/triggers/manual/listCallbackUrl?api-version=2022-03-01" \
     --body '{}'
   ```
4. **Traffic routing**: If using API Management or Front Door, update backend references.
5. **Monitoring**: Enable Application Insights on Standard Logic App and set up alerts.
   ```bash
   az logicapp config appsettings set \
     --resource-group <rg-name> --name <app-name> \
     --settings "APPINSIGHTS_INSTRUMENTATIONKEY=<key>"
   ```
6. **Validation**: Run smoke tests against Standard endpoints.
7. **Decommission ISE**: After a stabilization period, delete ISE Logic Apps.
   ```bash
   # Delete each ISE Logic App
   az logic workflow delete \
     --resource-group <rg-name> --name <ise-workflow-name> --yes
   ```

If `--dry-run` is specified, stop after Step 4 and output an assessment report including:
- Total Logic Apps inventoried
- Compatibility status per workflow (compatible, needs changes, unsupported)
- Required infrastructure (App Service plan, storage, VNET)
- Estimated effort for migration
- Connector mapping table
- Risk assessment
