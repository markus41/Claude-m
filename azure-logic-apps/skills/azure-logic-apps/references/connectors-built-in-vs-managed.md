# Connectors: Built-In vs Managed Reference

## Connector Architecture Overview

Logic Apps connectors fall into two categories with fundamentally different runtime behavior, pricing, and capabilities. Understanding the distinction is critical for cost optimization, performance tuning, and migration planning.

- **Built-in connectors** run in-process with the Logic Apps runtime (Standard) or are first-party platform features (Consumption). They incur no separate connector fee.
- **Managed connectors** are Microsoft-hosted API proxies running in shared infrastructure. They require API connections (separate Azure resources) and are billed per execution.

## Built-In Connectors (Standard Plan, In-Process)

These connectors run inside the Logic Apps Standard runtime process, providing lower latency and no external API connection overhead.

| Connector | Operations | Key Details |
|---|---|---|
| **HTTP** | Send HTTP requests, receive webhooks | All methods, auth types, retry policies, chunking |
| **Request** | Receive HTTP requests (trigger) | Generates callback URL, supports JSON schema validation |
| **Recurrence** | Schedule-based trigger | Cron-like scheduling with timezone support |
| **Schedule** | Delay, Delay Until, Sliding Window trigger | Time-based flow control |
| **Batch** | Batch trigger, Send to batch | Message batching by count, size, or schedule |
| **Service Bus** | Queue/topic send, receive, peek, complete, abandon | Sessions, dead-letter, scheduled messages, transactions |
| **Azure Queues** | Queue message send, receive, delete | Storage Queue operations with poison queue support |
| **Azure Blob Storage** | Read, write, list, delete blobs | Supports managed identity, SAS, connection string auth |
| **Azure Table Storage** | Insert, get, update, delete, query entities | OData filter expressions, batch operations |
| **Azure Cosmos DB** | CRUD documents, query, stored procedures | SQL API, partition key routing, cross-partition queries |
| **Event Hubs** | Send events, receive events (trigger) | Consumer groups, checkpointing, batch receive |
| **IBM MQ** | Send, receive, browse messages | On-premises via built-in connector (no gateway needed in Standard) |
| **Azure Functions** | Call Azure Functions | Direct invocation with Durable Functions support |
| **Inline Code** | Execute JavaScript snippets | Access workflow context, return values, limited npm |
| **Liquid** | JSON-to-JSON, JSON-to-text transforms | Shopify Liquid templates via integration account |
| **XML** | XML validation, XSLT transform | XSD schemas, XSLT 1.0/2.0/3.0 maps |
| **Flat File** | Encode/decode flat files | EDI flat file schemas for B2B |
| **SFTP (SSH)** | File CRUD, trigger on new/modified files | SSH key + password auth, chunked upload |
| **DB2** | CRUD operations on IBM DB2 | Direct TCP/IP connection (no gateway in Standard) |
| **SQL Server** | CRUD, stored procedures, triggers | In-process SQL client, supports Azure SQL and on-premises |
| **Data Operations** | Compose, Parse JSON, Select, Filter, Join, Create CSV/HTML table | Data transformation primitives |
| **Control** | Condition, Switch, ForEach, Until, Scope, Terminate | Flow control constructs |
| **Variables** | Initialize, Set, Increment, Decrement, Append | Workflow-scoped mutable state |

## Managed Connectors

Managed connectors are external API proxies hosted by Microsoft. They require an API connection resource and are categorized into tiers.

### Standard Tier Managed Connectors

No additional per-connector fee beyond the per-execution charge. Common examples:

| Connector | Category |
|---|---|
| Office 365 Outlook | Email, calendar, contacts |
| SharePoint | Lists, libraries, documents |
| OneDrive / OneDrive for Business | File storage |
| Dynamics 365 | CRM entities |
| Azure DevOps | Work items, pipelines, repos |
| Azure Resource Manager | Resource CRUD, deployments |
| Azure AD (Entra ID) | Users, groups, directory |
| Slack | Messages, channels |
| Salesforce | Leads, contacts, opportunities |
| Twitter | Tweets, searches |
| RSS | Feed triggers |
| FTP | File operations |
| SMTP | Send email |

### Premium Tier Managed Connectors

Higher per-execution cost. Typically for enterprise systems:

| Connector | Category |
|---|---|
| SAP | RFC, BAPI, IDoc |
| IBM 3270 | Mainframe screen automation |
| IBM CICS | Transaction processing |
| IBM IMS | Hierarchical database |
| Oracle Database | CRUD, stored procedures |
| SQL Server (managed) | When not using built-in |
| Azure Service Bus (managed) | When not using built-in |
| Azure Blob (managed) | When not using built-in |
| MQ (managed) | IBM MQ via gateway |
| Dataverse | Power Platform data |
| Azure Key Vault | Secrets, keys, certificates |
| Azure Log Analytics | Query workspace |
| SAP ERP | Full SAP integration |

### Enterprise Tier Managed Connectors

Available only in specific hosting environments (previously ISE-only, now Standard built-in replacements exist for many):

| Connector | Notes |
|---|---|
| SAP (ISE) | Higher throughput SAP |
| IBM MQ (ISE) | Direct TCP connection |
| IBM 3270 (ISE) | Mainframe automation |

## Pricing Model Comparison

### Consumption Plan

| Component | Cost Model |
|---|---|
| Trigger executions | Per execution (first 4,000 free/month) |
| Built-in action executions | Per execution (~$0.000025/action) |
| Standard connector actions | Per execution (~$0.000125/action) |
| Premium connector actions | Per execution (~$0.001/action) |
| Enterprise connector actions | Per execution (~$0.001/action) |
| Integration account | Monthly fee by tier (Free/Basic/Standard) |
| Data retention | 90 days included |

### Standard Plan (Workflow Service Plan)

| Component | Cost Model |
|---|---|
| Hosting | vCPU + memory per hour (like App Service) |
| Built-in connector operations | Included in hosting cost (no per-execution fee) |
| Standard managed connector operations | Per execution (~$0.000125) |
| Premium managed connector operations | Per execution (~$0.001) |
| Storage (workflow state) | Per GB for Azure Storage transactions |

**Key cost insight:** Standard plan built-in connectors have zero per-execution cost. Migrating from managed connectors to built-in equivalents (e.g., managed Service Bus to built-in Service Bus) eliminates per-execution charges entirely for high-volume workflows.

## Authentication Types

### OAuth 2.0

Used by most Microsoft 365 and SaaS connectors. The API connection stores the OAuth token and handles refresh.

```json
"authentication": {
  "type": "ActiveDirectoryOAuth",
  "tenant": "@parameters('tenantId')",
  "audience": "https://graph.microsoft.com",
  "clientId": "@parameters('clientId')",
  "secret": "@parameters('clientSecret')"
}
```

### Managed Identity (System-Assigned or User-Assigned)

Preferred for Azure-to-Azure communication. No credentials to manage.

```json
"authentication": {
  "type": "ManagedServiceIdentity",
  "audience": "https://management.azure.com/",
  "identity": "/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.ManagedIdentity/userAssignedIdentities/{name}"
}
```

When `identity` is omitted, the system-assigned managed identity is used.

### API Key

Used by third-party connectors that require header or query-string keys.

```json
"authentication": {
  "type": "Raw",
  "value": "@parameters('apiKey')"
}
```

### Certificate (Client Certificate)

For mutual TLS authentication scenarios.

```json
"authentication": {
  "type": "ClientCertificate",
  "pfx": "@parameters('certificatePfx')",
  "password": "@parameters('certificatePassword')"
}
```

## On-Premises Data Gateway

### Architecture

The On-Premises Data Gateway enables managed connectors to reach resources inside private networks.

1. **Gateway agent** installed on a Windows server inside the network (Windows 10+ or Windows Server 2016+).
2. Agent establishes outbound HTTPS connection to Azure Service Bus relay (no inbound firewall rules needed).
3. Logic App managed connector routes requests through the relay to the gateway agent.
4. Gateway agent executes the operation against the on-premises resource and returns the result.

### Installation Requirements

- .NET Framework 4.8+
- 8 GB RAM minimum (16 GB recommended)
- 4-core CPU minimum
- SSD storage recommended
- Outbound HTTPS to `*.servicebus.windows.net`, `*.frontend.clouddatahub.net`, `login.microsoftonline.com`
- Gateway must NOT be installed on a domain controller

### High Availability

Deploy multiple gateway instances in a cluster:

```powershell
# Install second gateway and join to existing cluster
# During installation, select "Add to an existing gateway cluster"
# Provide the recovery key from the primary installation
```

Cluster members share load and provide failover. All members must be in the same Azure region.

### Supported On-Premises Connectors

SQL Server, Oracle DB, File System, SAP, IBM DB2 (managed), IBM MQ (managed), IBM Informix, MySQL, PostgreSQL, Teradata, SharePoint Server, BizTalk Server.

### Standard Plan Alternative

Standard Logic Apps can use **VNet integration** and **hybrid connections** instead of the gateway for many scenarios, providing direct network-level access without the gateway agent overhead.

## Custom Connectors

### OpenAPI Requirements

Custom connectors are defined from an OpenAPI (Swagger) 2.0 specification.

- Maximum 1 MB definition size
- Only OpenAPI 2.0 (Swagger) is supported (convert 3.0 with tools)
- `host` must be a resolvable FQDN (no IP addresses)
- Each operation needs a unique `operationId`
- Maximum 256 operations per connector
- Supported request/response content types: `application/json`, `application/x-www-form-urlencoded`, `multipart/form-data`

### Authentication Providers for Custom Connectors

| Provider | Details |
|---|---|
| No authentication | Public APIs |
| API Key | Header or query parameter |
| Basic authentication | Username and password |
| OAuth 2.0 | Azure AD, generic OAuth 2.0 identity providers |
| Windows authentication | Via On-Premises Data Gateway |

### Custom Connector Deployment

```bash
# Export custom connector definition
az rest --method GET \
  --uri "https://management.azure.com/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Web/customApis/{connectorName}?api-version=2016-06-01" \
  > connector-definition.json

# Create or update custom connector
az rest --method PUT \
  --uri "https://management.azure.com/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Web/customApis/{connectorName}?api-version=2016-06-01" \
  --body @connector-definition.json
```

## Connector-Specific Configuration Patterns

### Service Bus

```json
{
  "serviceProviderConnections": {
    "serviceBus": {
      "parameterValues": {
        "connectionString": "@appsetting('ServiceBus_ConnectionString')"
      },
      "serviceProvider": {
        "id": "/serviceProviders/serviceBus"
      },
      "displayName": "Service Bus Connection"
    }
  }
}
```

For managed identity authentication with Service Bus (Standard plan):

```json
{
  "serviceProviderConnections": {
    "serviceBus": {
      "parameterValues": {
        "fullyQualifiedNamespace": "mynamespace.servicebus.windows.net"
      },
      "serviceProvider": {
        "id": "/serviceProviders/serviceBus"
      },
      "authentication": {
        "type": "ManagedServiceIdentity"
      }
    }
  }
}
```

### SQL Server

```json
{
  "serviceProviderConnections": {
    "sql": {
      "parameterValues": {
        "connectionString": "@appsetting('Sql_ConnectionString')"
      },
      "serviceProvider": {
        "id": "/serviceProviders/sql"
      },
      "displayName": "SQL Server"
    }
  }
}
```

### SharePoint (Managed Connector)

```json
{
  "managedApiConnections": {
    "sharepointonline": {
      "api": {
        "id": "/subscriptions/{sub}/providers/Microsoft.Web/locations/{region}/managedApis/sharepointonline"
      },
      "connection": {
        "id": "/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Web/connections/sharepointonline"
      },
      "connectionRuntimeUrl": "https://{guid}.common.logic-{region}.azure-apihub.net/apim/sharepointonline/{connectionId}",
      "authentication": {
        "type": "ManagedServiceIdentity"
      }
    }
  }
}
```

### SAP (Managed Connector via Gateway)

```json
{
  "managedApiConnections": {
    "sap": {
      "api": {
        "id": "/subscriptions/{sub}/providers/Microsoft.Web/locations/{region}/managedApis/sap"
      },
      "connection": {
        "id": "/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Web/connections/sap-connection"
      },
      "connectionProperties": {
        "authentication": {
          "type": "Raw",
          "scheme": "SNC",
          "parameter": "@parameters('sapSnc')"
        }
      },
      "connectionRuntimeUrl": "https://{guid}.common.logic-{region}.azure-apihub.net/apim/sap/{connectionId}"
    }
  }
}
```

## Connector Limits

| Limit | Consumption | Standard |
|---|---|---|
| API connections per resource group | 1,000 | Unlimited (app settings) |
| Managed connector requests/5 min | 600 per connection | 600 per connection |
| HTTP request size | 100 MB | 100 MB |
| HTTP response timeout | 120 seconds | 230 seconds (built-in) |
| Custom connectors per subscription | 1,000 | 1,000 |
| Connector throttle retry | 4 retries with exponential backoff | Configurable retry policy |
| Batch message count | 5,000 | 5,000 |
| Chunk size for upload | 100 MB maximum | 100 MB maximum |

## Connection Consent and Authorization

Managed connectors require explicit authorization (consent) during connection creation. For CI/CD pipelines:

1. Create the API connection resource via ARM/Bicep with `parameterValues` or `parameterValueSet`.
2. If OAuth-based, the connection enters an "unauthenticated" state.
3. Authorize via portal, or pre-authorize with a service principal by adding an access policy:

```json
{
  "type": "Microsoft.Web/connections/accessPolicies",
  "name": "[concat(parameters('connectionName'), '/', parameters('logicAppIdentityObjectId'))]",
  "properties": {
    "principal": {
      "type": "ActiveDirectory",
      "identity": {
        "tenantId": "[parameters('tenantId')]",
        "objectId": "[parameters('logicAppIdentityObjectId')]"
      }
    }
  }
}
```

This grants the Logic App's managed identity permission to use the connection without interactive consent.
