# Mainstream Connector Reference

Detailed configuration, authentication, and troubleshooting for the most commonly used Logic App connectors including Microsoft Teams, Office 365, SharePoint, Dataverse, SQL Server, Fabric/Power BI, Azure Services, and third-party integrations.

---

## Microsoft Teams Connector

### Overview
| Property | Value |
|----------|-------|
| Type | Managed (Standard tier) |
| Auth | OAuth 2.0 (delegated or application) |
| Standard pricing | ~$0.000125/call |
| Common triggers | When a new channel message is posted, When keywords are mentioned |
| Common actions | Post message, Post adaptive card, Create channel, List channels, Get @mentions |

### Connection Setup
```json
{
  "managedApiConnections": {
    "teams": {
      "api": {
        "id": "/subscriptions/{sub}/providers/Microsoft.Web/locations/{loc}/managedApis/teams"
      },
      "connection": {
        "id": "/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Web/connections/teams"
      },
      "authentication": {
        "type": "ManagedServiceIdentity"
      }
    }
  }
}
```

### Post Message Action (WDL)
```json
"Post_Message_To_Teams": {
  "type": "ApiConnection",
  "inputs": {
    "host": {
      "connection": {
        "name": "@parameters('$connections')['teams']['connectionId']"
      }
    },
    "method": "post",
    "path": "/v3/beta/teams/@{encodeURIComponent('team-id')}/channels/@{encodeURIComponent('channel-id')}/messages",
    "body": {
      "rootMessage": {
        "body": {
          "contentType": 1,
          "content": "<p>Order <b>@{triggerBody()?['orderId']}</b> has been processed.</p>"
        }
      }
    }
  },
  "runAfter": {}
}
```

### Post Adaptive Card
```json
"Post_Adaptive_Card": {
  "type": "ApiConnection",
  "inputs": {
    "host": {
      "connection": {
        "name": "@parameters('$connections')['teams']['connectionId']"
      }
    },
    "method": "post",
    "path": "/v1.0/teams/@{encodeURIComponent('team-id')}/channels/@{encodeURIComponent('channel-id')}/messages",
    "body": {
      "rootMessage": {
        "body": {
          "contentType": 2,
          "content": "{\"type\":\"AdaptiveCard\",\"$schema\":\"http://adaptivecards.io/schemas/adaptive-card.json\",\"version\":\"1.4\",\"body\":[{\"type\":\"TextBlock\",\"text\":\"Order Notification\",\"weight\":\"bolder\",\"size\":\"medium\"},{\"type\":\"FactSet\",\"facts\":[{\"title\":\"Order ID\",\"value\":\"@{triggerBody()?['orderId']}\"},{\"title\":\"Status\",\"value\":\"Processed\"},{\"title\":\"Amount\",\"value\":\"$@{triggerBody()?['amount']}\"}]}]}"
        }
      }
    }
  }
}
```

### CLI Deployment Issues for Teams Connector

**Common problem**: When deploying Logic Apps that use the Teams connector via CLI (`az logicapp deployment source config-zip`), the managed API connection is not automatically created. The connection object must exist before the workflow can run.

**Root cause**: ZIP deployment deploys workflow definitions and `connections.json`, but does NOT create the actual API connection resources in Azure. These are separate ARM resources (`Microsoft.Web/connections`).

**Solution — Create connections before deploying workflows**:

```bash
# Step 1: Create the Teams API connection resource
az resource create \
  --resource-group myRg \
  --resource-type "Microsoft.Web/connections" \
  --name "teams-connection" \
  --location eastus \
  --properties '{
    "api": {
      "id": "/subscriptions/{sub}/providers/Microsoft.Web/locations/eastus/managedApis/teams"
    },
    "parameterValueType": "Alternative",
    "alternativeParameterValues": {
      "token:TenantId": "{tenant-id}",
      "token:grantType": "client_credentials"
    }
  }'

# Step 2: Grant the Logic App managed identity access to the connection
az resource invoke-action \
  --resource-group myRg \
  --resource-type "Microsoft.Web/connections" \
  --name "teams-connection" \
  --action "listConsentLinks" \
  --api-version "2016-06-01" \
  --request-body '{"parameterName": "token", "redirectUrl": "https://logic-apis-eastus.consent.azure-apim.net/redirect"}'

# Step 3: Authorize via managed identity (Standard Logic App)
# Add access policy for the Logic App's managed identity to the connection
LOGIC_APP_IDENTITY=$(az logicapp show --resource-group myRg --name my-logic-app --query "identity.principalId" -o tsv)

az resource update \
  --resource-group myRg \
  --resource-type "Microsoft.Web/connections/accessPolicies" \
  --name "teams-connection/${LOGIC_APP_IDENTITY}" \
  --parent "" \
  --api-version "2016-06-01" \
  --set properties.principal.identity.objectId="${LOGIC_APP_IDENTITY}" \
        properties.principal.identity.tenantId="{tenant-id}"

# Step 4: THEN deploy the workflow ZIP
az logicapp deployment source config-zip \
  --resource-group myRg \
  --name my-logic-app \
  --src deploy.zip
```

**Bicep alternative** (recommended — deploys connection + Logic App together):
```bicep
resource teamsConnection 'Microsoft.Web/connections@2016-06-01' = {
  name: 'teams-connection'
  location: location
  properties: {
    api: {
      id: subscriptionResourceId('Microsoft.Web/locations/managedApis', location, 'teams')
    }
    parameterValueType: 'Alternative'
    alternativeParameterValues: {
      'token:TenantId': tenantId
      'token:grantType': 'client_credentials'
    }
  }
}

resource teamsAccessPolicy 'Microsoft.Web/connections/accessPolicies@2016-06-01' = {
  parent: teamsConnection
  name: logicApp.identity.principalId
  location: location
  properties: {
    principal: {
      type: 'ActiveDirectory'
      identity: {
        objectId: logicApp.identity.principalId
        tenantId: tenantId
      }
    }
  }
}
```

### Teams Connector Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| `AuthorizationFailed` after CLI deploy | Connection not authorized for Logic App identity | Create access policy for managed identity |
| `ConnectionNotFound` | API connection resource doesn't exist | Create `Microsoft.Web/connections` resource first |
| `Forbidden` posting to channel | App lacks Teams permissions | Grant `ChannelMessage.Send` or `Group.ReadWrite.All` to the managed identity |
| `InvalidTemplate` at deploy time | `connections.json` references non-existent connection | Ensure connection resource name matches `connections.json` |
| `Throttled` (429) | Too many Teams API calls | Add retry policy, reduce frequency, batch messages |

---

## Office 365 Outlook Connector

### Overview
| Property | Value |
|----------|-------|
| Type | Managed (Standard tier) |
| Auth | OAuth 2.0 (delegated) or Managed Identity with app permissions |
| Triggers | When a new email arrives (V3), When an event is created |
| Actions | Send email (V2), Create event, Get emails, Reply, Flag |

### Send Email Action
```json
"Send_Email": {
  "type": "ApiConnection",
  "inputs": {
    "host": {
      "connection": {
        "name": "@parameters('$connections')['office365']['connectionId']"
      }
    },
    "method": "post",
    "path": "/v2/Mail",
    "body": {
      "To": "@{triggerBody()?['recipientEmail']}",
      "Subject": "Order @{triggerBody()?['orderId']} Confirmation",
      "Body": "<p>Your order has been processed successfully.</p><p>Amount: $@{triggerBody()?['amount']}</p>",
      "Importance": "Normal",
      "IsHtml": true
    }
  },
  "runAfter": {}
}
```

### Send Email with Attachment
```json
"Send_With_Attachment": {
  "type": "ApiConnection",
  "inputs": {
    "host": {
      "connection": {
        "name": "@parameters('$connections')['office365']['connectionId']"
      }
    },
    "method": "post",
    "path": "/v2/Mail",
    "body": {
      "To": "recipient@contoso.com",
      "Subject": "Report attached",
      "Body": "<p>Please find the report attached.</p>",
      "IsHtml": true,
      "Attachments": [
        {
          "Name": "report.pdf",
          "ContentBytes": "@{base64(body('Get_Report_File'))}"
        }
      ]
    }
  }
}
```

---

## SharePoint Connector

### Overview
| Property | Value |
|----------|-------|
| Type | Managed (Standard tier) |
| Auth | OAuth 2.0 or Managed Identity |
| Triggers | When an item is created, When an item is created or modified, When a file is created in a folder |
| Actions | Create item, Update item, Get items, Get file content, Create file, Copy file |

### When Item Created Trigger
```json
"When_item_created": {
  "type": "ApiConnection",
  "inputs": {
    "host": {
      "connection": {
        "name": "@parameters('$connections')['sharepointonline']['connectionId']"
      }
    },
    "method": "get",
    "path": "/datasets/@{encodeURIComponent('https://contoso.sharepoint.com/sites/operations')}/tables/@{encodeURIComponent('Orders')}/onnewitems"
  },
  "recurrence": {
    "frequency": "Minute",
    "interval": 3
  },
  "splitOn": "@triggerBody()?['value']"
}
```

### Get Items with OData Filter
```json
"Get_Active_Orders": {
  "type": "ApiConnection",
  "inputs": {
    "host": {
      "connection": {
        "name": "@parameters('$connections')['sharepointonline']['connectionId']"
      }
    },
    "method": "get",
    "path": "/datasets/@{encodeURIComponent('https://contoso.sharepoint.com/sites/operations')}/tables/@{encodeURIComponent('Orders')}/items",
    "queries": {
      "$filter": "Status eq 'Active'",
      "$top": 100,
      "$orderby": "Created desc"
    }
  },
  "runAfter": {}
}
```

### Upload File to SharePoint
```json
"Upload_Report": {
  "type": "ApiConnection",
  "inputs": {
    "host": {
      "connection": {
        "name": "@parameters('$connections')['sharepointonline']['connectionId']"
      }
    },
    "method": "post",
    "path": "/datasets/@{encodeURIComponent('https://contoso.sharepoint.com/sites/reports')}/files",
    "body": "@body('Generate_Report')",
    "headers": {
      "ReadFileMetadataFromServer": true
    },
    "queries": {
      "folderPath": "/Shared Documents/Monthly Reports",
      "name": "@{concat('Report-', utcNow('yyyy-MM'), '.xlsx')}",
      "queryParametersSingleEncoded": true
    }
  }
}
```

---

## Dataverse Connector

### Overview
| Property | Value |
|----------|-------|
| Type | Managed (Premium tier for Consumption; Built-in for Standard) |
| Auth | OAuth 2.0 or Managed Identity |
| Triggers | When a row is added, modified, or deleted |
| Actions | Add a new row, Update a row, Delete a row, List rows, Get a row by ID, Perform a bound/unbound action |

### Built-in Dataverse (Standard)
Standard Logic Apps have a built-in Dataverse connector that runs in-process:
```json
{
  "serviceProviderConnections": {
    "dataverse": {
      "parameterValues": {
        "environmentUrl": "https://contoso.crm.dynamics.com"
      },
      "serviceProvider": {
        "id": "/serviceProviders/dataverse"
      },
      "displayName": "Dataverse"
    }
  }
}
```

### List Rows with Filter
```json
"Get_Active_Accounts": {
  "type": "ApiConnection",
  "inputs": {
    "host": {
      "connection": {
        "name": "@parameters('$connections')['commondataserviceforapps']['connectionId']"
      }
    },
    "method": "get",
    "path": "/v2/datasets/@{encodeURIComponent('https://contoso.crm.dynamics.com')}/tables/@{encodeURIComponent('accounts')}/items",
    "queries": {
      "$filter": "statecode eq 0",
      "$select": "name,accountid,emailaddress1,revenue",
      "$top": 50,
      "$orderby": "revenue desc"
    }
  }
}
```

### Create Row
```json
"Create_Contact": {
  "type": "ApiConnection",
  "inputs": {
    "host": {
      "connection": {
        "name": "@parameters('$connections')['commondataserviceforapps']['connectionId']"
      }
    },
    "method": "post",
    "path": "/v2/datasets/@{encodeURIComponent('https://contoso.crm.dynamics.com')}/tables/@{encodeURIComponent('contacts')}/items",
    "body": {
      "firstname": "@{triggerBody()?['firstName']}",
      "lastname": "@{triggerBody()?['lastName']}",
      "emailaddress1": "@{triggerBody()?['email']}",
      "parentcustomerid_account@odata.bind": "/accounts(@{triggerBody()?['accountId']})"
    }
  }
}
```

---

## SQL Server Connector

### Overview
| Property | Value |
|----------|-------|
| Type | Built-in (Standard) / Managed (Consumption) |
| Auth | SQL auth, Windows auth, Managed Identity, Azure AD |
| Triggers | When an item is created, When an item is modified |
| Actions | Get rows, Get row, Insert row, Update row, Delete row, Execute stored procedure, Execute query |

### Built-in SQL (Standard) — Connection
```json
{
  "serviceProviderConnections": {
    "sql": {
      "parameterValues": {
        "connectionString": "@appsetting('SQL_CONNECTION_STRING')"
      },
      "serviceProvider": {
        "id": "/serviceProviders/sql"
      }
    }
  }
}
```

### Execute Stored Procedure
```json
"Execute_Proc": {
  "type": "ServiceProvider",
  "inputs": {
    "parameters": {
      "storedProcedureName": "usp_ProcessOrder",
      "storedProcedureParameters": {
        "OrderId": "@{triggerBody()?['orderId']}",
        "Amount": "@{triggerBody()?['amount']}",
        "ProcessedDate": "@{utcNow()}"
      }
    },
    "serviceProviderConfiguration": {
      "connectionName": "sql",
      "operationId": "executeStoredProcedure",
      "serviceProviderId": "/serviceProviders/sql"
    }
  }
}
```

### Execute Query (V2)
```json
"Get_Order_Details": {
  "type": "ServiceProvider",
  "inputs": {
    "parameters": {
      "query": "SELECT o.OrderId, o.Amount, c.Name AS CustomerName FROM Orders o INNER JOIN Customers c ON o.CustomerId = c.Id WHERE o.OrderId = @OrderId",
      "queryParameters": {
        "OrderId": "@{triggerBody()?['orderId']}"
      }
    },
    "serviceProviderConfiguration": {
      "connectionName": "sql",
      "operationId": "executeQuery",
      "serviceProviderId": "/serviceProviders/sql"
    }
  }
}
```

**Important**: Always use parameterized queries to prevent SQL injection.

---

## Power BI / Fabric Connector

### Overview
| Property | Value |
|----------|-------|
| Type | Managed (Standard tier) |
| Auth | OAuth 2.0 |
| Actions | Refresh dataset, Get datasets, Get tables, Add rows to dataset, Execute queries against a dataset |
| Note | No triggers — use Recurrence or webhook pattern for refresh monitoring |

### Refresh Dataset
```json
"Refresh_Dataset": {
  "type": "ApiConnection",
  "inputs": {
    "host": {
      "connection": {
        "name": "@parameters('$connections')['powerbi']['connectionId']"
      }
    },
    "method": "post",
    "path": "/v1.0/myorg/groups/@{encodeURIComponent('workspace-id')}/datasets/@{encodeURIComponent('dataset-id')}/refreshes"
  },
  "runAfter": {}
}
```

### Push Rows to Streaming Dataset
```json
"Push_Data_To_PowerBI": {
  "type": "ApiConnection",
  "inputs": {
    "host": {
      "connection": {
        "name": "@parameters('$connections')['powerbi']['connectionId']"
      }
    },
    "method": "post",
    "path": "/v1.0/myorg/groups/@{encodeURIComponent('workspace-id')}/datasets/@{encodeURIComponent('dataset-id')}/tables/@{encodeURIComponent('RealTimeData')}/rows",
    "body": {
      "rows": [
        {
          "Timestamp": "@{utcNow()}",
          "OrderId": "@{triggerBody()?['orderId']}",
          "Amount": "@{triggerBody()?['amount']}",
          "Region": "@{triggerBody()?['region']}"
        }
      ]
    }
  }
}
```

### Monitor Refresh Status Pattern
```json
{
  "actions": {
    "Trigger_Refresh": {
      "type": "ApiConnection",
      "inputs": {
        "host": { "connection": { "name": "@parameters('$connections')['powerbi']['connectionId']" } },
        "method": "post",
        "path": "/v1.0/myorg/groups/@{encodeURIComponent('workspace-id')}/datasets/@{encodeURIComponent('dataset-id')}/refreshes"
      },
      "runAfter": {}
    },
    "Wait_For_Refresh": {
      "type": "Until",
      "expression": "@not(equals(body('Check_Refresh_Status')?['value']?[0]?['status'], 'Unknown'))",
      "limit": { "count": 60, "timeout": "PT2H" },
      "actions": {
        "Delay_1m": {
          "type": "Wait",
          "inputs": { "interval": { "count": 1, "unit": "Minute" } },
          "runAfter": {}
        },
        "Check_Refresh_Status": {
          "type": "ApiConnection",
          "inputs": {
            "host": { "connection": { "name": "@parameters('$connections')['powerbi']['connectionId']" } },
            "method": "get",
            "path": "/v1.0/myorg/groups/@{encodeURIComponent('workspace-id')}/datasets/@{encodeURIComponent('dataset-id')}/refreshes",
            "queries": { "$top": 1 }
          },
          "runAfter": { "Delay_1m": ["Succeeded"] }
        }
      },
      "runAfter": { "Trigger_Refresh": ["Succeeded"] }
    }
  }
}
```

---

## Azure Blob Storage Connector

### Built-in (Standard)
```json
{
  "serviceProviderConnections": {
    "AzureBlob": {
      "parameterValues": {
        "connectionString": "@appsetting('AzureWebJobsStorage')"
      },
      "serviceProvider": {
        "id": "/serviceProviders/AzureBlob"
      }
    }
  }
}
```

### Read Blob Content
```json
"Read_Blob": {
  "type": "ServiceProvider",
  "inputs": {
    "parameters": {
      "containerName": "incoming",
      "blobName": "@{triggerBody()?['fileName']}"
    },
    "serviceProviderConfiguration": {
      "connectionName": "AzureBlob",
      "operationId": "readBlob",
      "serviceProviderId": "/serviceProviders/AzureBlob"
    }
  }
}
```

### Upload Blob
```json
"Upload_Result": {
  "type": "ServiceProvider",
  "inputs": {
    "parameters": {
      "containerName": "processed",
      "blobName": "@{concat('result-', utcNow('yyyyMMddHHmmss'), '.json')}",
      "content": "@body('Transform_Data')"
    },
    "serviceProviderConfiguration": {
      "connectionName": "AzureBlob",
      "operationId": "uploadBlob",
      "serviceProviderId": "/serviceProviders/AzureBlob"
    }
  }
}
```

---

## Azure Service Bus Connector

### Built-in (Standard)
```json
{
  "serviceProviderConnections": {
    "serviceBus": {
      "parameterValues": {
        "connectionString": "@appsetting('SERVICE_BUS_CONNECTION_STRING')"
      },
      "serviceProvider": {
        "id": "/serviceProviders/serviceBus"
      }
    }
  }
}
```

### Send Message to Queue
```json
"Send_Order_To_Queue": {
  "type": "ServiceProvider",
  "inputs": {
    "parameters": {
      "queueName": "order-processing",
      "content": "@body('Build_Message')",
      "sessionId": "@{triggerBody()?['customerId']}",
      "contentType": "application/json",
      "userProperties": {
        "OrderId": "@{triggerBody()?['orderId']}",
        "Priority": "@{triggerBody()?['priority']}"
      }
    },
    "serviceProviderConfiguration": {
      "connectionName": "serviceBus",
      "operationId": "sendMessage",
      "serviceProviderId": "/serviceProviders/serviceBus"
    }
  }
}
```

### Send to Topic with Properties
```json
"Publish_Event": {
  "type": "ServiceProvider",
  "inputs": {
    "parameters": {
      "topicName": "order-events",
      "content": {
        "eventType": "OrderCreated",
        "orderId": "@{triggerBody()?['orderId']}",
        "timestamp": "@{utcNow()}"
      },
      "userProperties": {
        "EventType": "OrderCreated",
        "Region": "@{triggerBody()?['region']}"
      }
    },
    "serviceProviderConfiguration": {
      "connectionName": "serviceBus",
      "operationId": "sendTopicMessage",
      "serviceProviderId": "/serviceProviders/serviceBus"
    }
  }
}
```

---

## Azure Event Hubs Connector

### Built-in (Standard)
```json
{
  "serviceProviderConnections": {
    "eventHub": {
      "parameterValues": {
        "connectionString": "@appsetting('EVENT_HUB_CONNECTION_STRING')"
      },
      "serviceProvider": {
        "id": "/serviceProviders/eventHub"
      }
    }
  }
}
```

### Send Event
```json
"Emit_Telemetry": {
  "type": "ServiceProvider",
  "inputs": {
    "parameters": {
      "eventHubName": "telemetry",
      "content": {
        "source": "logic-app",
        "event": "order-processed",
        "data": "@body('Process_Order')",
        "timestamp": "@{utcNow()}"
      },
      "partitionKey": "@{triggerBody()?['region']}"
    },
    "serviceProviderConfiguration": {
      "connectionName": "eventHub",
      "operationId": "sendEvent",
      "serviceProviderId": "/serviceProviders/eventHub"
    }
  }
}
```

---

## Azure Functions Connector

### Built-in (Standard)
Call Azure Functions directly as built-in actions:
```json
"Call_Validation_Function": {
  "type": "Function",
  "inputs": {
    "function": {
      "connectionName": "azureFunctions",
      "operationId": "callFunction",
      "serviceProviderId": "/serviceProviders/azureFunctions"
    },
    "parameters": {
      "functionAppResourceId": "/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Web/sites/{func-app}",
      "functionName": "ValidateOrder",
      "method": "POST",
      "body": "@triggerBody()"
    }
  }
}
```

### HTTP-based Azure Function Call (works in both Standard and Consumption)
```json
"Call_Function_HTTP": {
  "type": "Http",
  "inputs": {
    "method": "POST",
    "uri": "https://my-func-app.azurewebsites.net/api/ValidateOrder",
    "headers": {
      "x-functions-key": "@parameters('functionKey')"
    },
    "body": "@triggerBody()"
  }
}
```

---

## HTTP Connector (Universal)

### GET with Authentication
```json
"Call_External_API": {
  "type": "Http",
  "inputs": {
    "method": "GET",
    "uri": "https://api.example.com/data",
    "headers": {
      "Accept": "application/json"
    },
    "authentication": {
      "type": "ManagedServiceIdentity",
      "audience": "https://api.example.com"
    },
    "retryPolicy": {
      "type": "exponential",
      "count": 3,
      "interval": "PT5S"
    }
  }
}
```

### POST with OAuth Bearer Token
```json
"Call_With_OAuth": {
  "type": "Http",
  "inputs": {
    "method": "POST",
    "uri": "https://api.example.com/orders",
    "headers": {
      "Content-Type": "application/json",
      "Authorization": "Bearer @{body('Get_Token')?['access_token']}"
    },
    "body": "@triggerBody()"
  }
}
```

### Authentication Types for HTTP
| Type | JSON value | Use case |
|------|-----------|----------|
| None | `"type": "None"` | Public APIs |
| Basic | `"type": "Basic"` | Username/password |
| Client Certificate | `"type": "ClientCertificate"` | mTLS |
| Active Directory OAuth | `"type": "ActiveDirectoryOAuth"` | Azure AD app-to-app |
| Managed Identity | `"type": "ManagedServiceIdentity"` | Azure resources |
| Raw | `"type": "Raw"` | Custom header-based auth |

---

## Common Cross-Connector Troubleshooting

### CLI Deployment — Managed Connections Don't Work After Deploy

**Symptoms**: Workflow deploys successfully but fails at runtime with `ConnectionNotFound`, `Unauthorized`, or `AuthorizationFailed`.

**Why**: `az logicapp deployment source config-zip` deploys files only. Managed API connections are separate ARM resources that must be provisioned independently.

**Fix for any managed connector**:

1. **Deploy infrastructure first** (Bicep/ARM) — create API connections
2. **Set access policies** — grant Logic App managed identity access to each connection
3. **Deploy workflow ZIP** — now `connections.json` references existing connections
4. **Verify** — check run history for successful trigger/action execution

**Generic Bicep pattern for any managed connection**:
```bicep
param location string
param connectorName string // e.g., 'teams', 'office365', 'sharepointonline'
param connectionDisplayName string
param logicAppPrincipalId string
param tenantId string

resource apiConnection 'Microsoft.Web/connections@2016-06-01' = {
  name: '${connectorName}-connection'
  location: location
  properties: {
    api: {
      id: subscriptionResourceId('Microsoft.Web/locations/managedApis', location, connectorName)
    }
    displayName: connectionDisplayName
    parameterValueType: 'Alternative'
    alternativeParameterValues: {
      'token:TenantId': tenantId
      'token:grantType': 'client_credentials'
    }
  }
}

resource accessPolicy 'Microsoft.Web/connections/accessPolicies@2016-06-01' = {
  parent: apiConnection
  name: logicAppPrincipalId
  location: location
  properties: {
    principal: {
      type: 'ActiveDirectory'
      identity: {
        objectId: logicAppPrincipalId
        tenantId: tenantId
      }
    }
  }
}
```

### Throttling Across Connectors

| Connector | Rate Limit | Mitigation |
|-----------|-----------|------------|
| Teams | 2 req/sec per app per channel | Batch messages, add delays |
| SharePoint | 600 req/min per site | Use batch endpoint, throttle ForEach |
| Office 365 | Varies by API | Exponential retry policy |
| Dataverse | 6000 API calls/5 min/user | Use batch operations, FetchXML |
| SQL Server | Connection pool limits | Use connection pooling, close connections |
| Power BI | 120 req/hr for refresh | Schedule refreshes, check before triggering |
| Service Bus | 1000 msg/sec (Standard), 4000 (Premium) | Use batching, partition queues |

### Permission Requirements for Managed Identity

| Connector | Required Graph/API Permissions |
|-----------|-------------------------------|
| Teams | `ChannelMessage.Send`, `Channel.ReadBasic.All`, `Team.ReadBasic.All` |
| Office 365 Outlook | `Mail.Send`, `Mail.Read`, `Calendars.ReadWrite` |
| SharePoint | `Sites.ReadWrite.All` or site-specific permissions |
| Dataverse | Application user with security role |
| Power BI | `Dataset.ReadWrite.All`, `Workspace.Read.All` |
| Azure Storage | `Storage Blob Data Contributor` RBAC role |
| Service Bus | `Azure Service Bus Data Sender/Receiver` RBAC |
| Event Hubs | `Azure Event Hubs Data Sender/Receiver` RBAC |
