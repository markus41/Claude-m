---
name: la-connector-config
description: "Configure Logic App connectors — built-in, managed, custom, and on-premises data gateway"
argument-hint: "<connector-type> [--gateway] [--custom-api <openapi-url>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

# Configure Logic App Connectors

Set up and configure connectors for Logic App workflows, including built-in, managed, custom, and on-premises data gateway connectors.

## Instructions

### 1. Identify Connector Type

Ask the user which connector type they need if not provided:

| Type | Description | Examples |
|------|-------------|----------|

| **Built-in** | Runs in-process with the Logic App runtime (Standard only) | HTTP, Schedule, Service Bus, Azure Functions, Blob Storage, Event Hubs, SQL Server |
| **Managed Standard** | Microsoft-hosted, included in Standard plan | Office 365, SharePoint, Dynamics 365, Azure AD |
| **Managed Premium** | Microsoft-hosted, requires additional licensing | SAP, IBM MQ, Salesforce |
| **Custom** | User-defined connector from OpenAPI specification | Any REST API |
| **On-premises** | Connects to on-premises systems via data gateway | SQL Server (on-prem), File System, Oracle DB |

### 2. Configure Built-in Connector (Standard)

Built-in connectors are configured directly in `workflow.json` and `connections.json`.

Add the service provider connection to `connections.json`:

```json
{
  "serviceProviderConnections": {
    "serviceBus": {
      "parameterValues": {
        "connectionString": "@appsetting('ServiceBusConnectionString')"
      },
      "serviceProvider": {
        "id": "/serviceProviders/serviceBus"
      },
      "displayName": "Service Bus"
    }
  }
}
```

Add the corresponding app setting to `local.settings.json`:

```json
{
  "Values": {
    "ServiceBusConnectionString": "<your-connection-string>"
  }
}
```

Common built-in connector service provider IDs:

| Connector | Service Provider ID |
|-----------|-------------------|
| Service Bus | `/serviceProviders/serviceBus` |
| Azure Blob Storage | `/serviceProviders/AzureBlob` |
| Azure Table Storage | `/serviceProviders/AzureTable` |
| Azure Queue Storage | `/serviceProviders/AzureQueues` |
| Event Hubs | `/serviceProviders/eventHub` |
| SQL Server | `/serviceProviders/sql` |
| Azure Cosmos DB | `/serviceProviders/AzureCosmosDB` |
| SMTP | `/serviceProviders/smtp` |

### 3. Configure Managed API Connection

Managed connections are Azure resources created alongside the Logic App.

**Create via CLI**:

```bash
az resource create \
  --resource-group <rg-name> \
  --resource-type "Microsoft.Web/connections" \
  --name <connection-name> \
  --location <region> \
  --properties '{
    "api": {
      "id": "/subscriptions/<sub-id>/providers/Microsoft.Web/locations/<region>/managedApis/<api-name>"
    },
    "displayName": "<display-name>",
    "parameterValues": {}
  }'
```

Common managed API names: `office365`, `sharepointonline`, `dynamicscrmonline`, `azuread`, `azureblob`, `outlook`.

Add the connection reference to `connections.json`:

```json
{
  "managedApiConnections": {
    "office365": {
      "api": {
        "id": "/subscriptions/<sub-id>/providers/Microsoft.Web/locations/<region>/managedApis/office365"
      },
      "connection": {
        "id": "/subscriptions/<sub-id>/resourceGroups/<rg-name>/providers/Microsoft.Web/connections/<connection-name>"
      },
      "connectionRuntimeUrl": "<runtime-url>",
      "authentication": {
        "type": "ManagedServiceIdentity"
      }
    }
  }
}
```

### 4. Configure Custom Connector

Import an OpenAPI definition to create a custom connector:

```bash
# Create custom connector from OpenAPI spec
az rest --method PUT \
  --url "https://management.azure.com/subscriptions/<sub-id>/resourceGroups/<rg-name>/providers/Microsoft.Web/customApis/<connector-name>?api-version=2016-06-01" \
  --body '{
    "location": "<region>",
    "properties": {
      "displayName": "<display-name>",
      "description": "<description>",
      "iconUri": "",
      "backendService": {
        "serviceUrl": "<base-url>"
      },
      "connectionParameters": {},
      "swagger": {}
    }
  }'
```

If `--custom-api <openapi-url>` is provided:

1. Download the OpenAPI spec from the URL.
2. Parse the spec and extract endpoints, schemas, and auth requirements.
3. Generate the custom connector definition.
4. Create the connector resource in Azure.

### 5. Configure On-Premises Data Gateway

If `--gateway` is specified:

1. **Install the gateway**: Download and install the on-premises data gateway on a machine with access to the target system.
2. **Register the gateway in Azure**:
   ```bash
   az resource list \
     --resource-type "Microsoft.Web/connectionGateways" \
     --resource-group <rg-name> --output table
   ```
3. **Create a connection using the gateway**:
   ```bash
   az resource create \
     --resource-group <rg-name> \
     --resource-type "Microsoft.Web/connections" \
     --name <connection-name> \
     --location <region> \
     --properties '{
       "api": {
         "id": "/subscriptions/<sub-id>/providers/Microsoft.Web/locations/<region>/managedApis/<api-name>"
       },
       "parameterValues": {
         "server": "<server>",
         "database": "<database>",
         "authType": "windows",
         "username": "<username>",
         "password": "<password>",
         "gateway": {
           "id": "/subscriptions/<sub-id>/resourceGroups/<rg-name>/providers/Microsoft.Web/connectionGateways/<gateway-name>"
         }
       }
     }'
   ```

### 6. Set Authentication

Configure the authentication method for the connection:

| Auth Type | Use Case | Configuration |
|-----------|----------|---------------|
| **OAuth 2.0** | Microsoft 365, Dynamics 365, Azure AD | Interactive consent flow or app registration |
| **API Key** | Third-party REST APIs | Add key as app setting, reference in connection |
| **Managed Identity** | Azure services (Storage, Key Vault, Service Bus) | Enable system-assigned or user-assigned MI |
| **Certificate** | B2B scenarios, mutual TLS | Upload certificate to Logic App or Key Vault |
| **Connection String** | Service Bus, Event Hubs, Storage | Store in app settings, reference with `@appsetting()` |

For Managed Identity:
```bash
# Enable system-assigned managed identity
az logicapp identity assign \
  --name <app-name> --resource-group <rg-name>

# Assign RBAC role
az role assignment create \
  --assignee <principal-id> \
  --role "<role-name>" \
  --scope "<resource-id>"
```

### 7. Manage Connection Access Policies

For Standard Logic Apps using managed identity, grant the Logic App access to the connection:

```bash
# Get Logic App managed identity principal ID
PRINCIPAL_ID=$(az logicapp identity show \
  --resource-group <rg-name> --name <app-name> \
  --query "principalId" -o tsv)

# Create access policy for the connection
az rest --method PUT \
  --url "https://management.azure.com/subscriptions/<sub-id>/resourceGroups/<rg-name>/providers/Microsoft.Web/connections/<connection-name>/accessPolicies/${PRINCIPAL_ID}?api-version=2016-06-01" \
  --body "{
    \"location\": \"<region>\",
    \"properties\": {
      \"principal\": {
        \"type\": \"ActiveDirectory\",
        \"identity\": {
          \"objectId\": \"${PRINCIPAL_ID}\",
          \"tenantId\": \"<tenant-id>\"
        }
      }
    }
  }"

# List access policies for a connection
az rest --method GET \
  --url "https://management.azure.com/subscriptions/<sub-id>/resourceGroups/<rg-name>/providers/Microsoft.Web/connections/<connection-name>/accessPolicies?api-version=2016-06-01"
```

### 8. Test and Manage Connections

```bash
# List connections and check status
az resource list \
  --resource-group <rg-name> \
  --resource-type "Microsoft.Web/connections" \
  --output table

# Show connection details
az resource show \
  --resource-group <rg-name> \
  --resource-type "Microsoft.Web/connections" \
  --name <connection-name> \
  --output json

# Test connection status
az rest --method POST \
  --url "https://management.azure.com/subscriptions/<sub-id>/resourceGroups/<rg-name>/providers/Microsoft.Web/connections/<connection-name>/confirmConsentCode?api-version=2016-06-01"

# Delete a connection
az resource delete \
  --resource-group <rg-name> \
  --resource-type "Microsoft.Web/connections" \
  --name <connection-name>
```

For local development, test by starting the runtime and triggering a workflow that uses the connector.

### 9. Managed Identity Full Lifecycle

```bash
# Enable system-assigned managed identity
az logicapp identity assign \
  --resource-group <rg-name> --name <app-name>

# Show managed identity details
az logicapp identity show \
  --resource-group <rg-name> --name <app-name>

# Assign user-assigned managed identity
az logicapp identity assign \
  --resource-group <rg-name> --name <app-name> \
  --identities <user-assigned-identity-resource-id>

# Remove user-assigned identity
az logicapp identity remove \
  --resource-group <rg-name> --name <app-name> \
  --identities <user-assigned-identity-resource-id>

# Verify RBAC role assignments for the identity
az role assignment list \
  --assignee <principal-id> \
  --output table

# Assign RBAC role to managed identity
az role assignment create \
  --assignee <principal-id> \
  --role "<role-name>" \
  --scope "<resource-id>"
```

### 10. Display Summary

Show the user:
- Connector type and name
- Authentication method configured
- Connection resource ID (if managed)
- App settings added or updated
- How to use the connector in a workflow action
- Next steps: create a workflow with `/la-create`, deploy with `/la-deploy`
