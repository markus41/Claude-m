---
name: Azure Logic Apps
description: >
  Deep expertise in Azure Logic Apps enterprise integration — build automated workflows with
  Workflow Definition Language (JSON), Standard (single-tenant) and Consumption (multi-tenant) hosting,
  connectors, integration accounts for B2B/EDI, VS Code local development, and CI/CD pipelines.
  Covers triggers, actions, expressions, error handling, monitoring, and ISE migration. Targets
  enterprise integration engineers building production integration solutions.
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
triggers:
  - azure logic apps
  - logic app
  - logic apps
  - workflow definition language
  - WDL
  - integration account
  - B2B integration
  - EDI AS2
  - EDI X12
  - EDIFACT
  - logic app standard
  - logic app consumption
  - enterprise integration
  - on-premises data gateway
  - stateful workflow
  - stateless workflow
  - logic app ISE
  - logic app connector
---

# Azure Logic Apps

## Shared Workflow Routing
- Use the shared workflow spec for deterministic multi-plugin routing: [`workflows/multi-plugin-workflows.md`](../../../workflows/multi-plugin-workflows.md).
- Apply the trigger phrases, handoff contracts, auth prerequisites, validation checkpoints, and stop conditions before escalating to the next plugin.


## 1. Azure Logic Apps Overview

Azure Logic Apps is a cloud-based integration platform for automating workflows and orchestrating business processes across hundreds of services. It uses a declarative JSON-based **Workflow Definition Language (WDL)** and supports both visual designer and code-first development.

**Standard vs Consumption comparison**:

| Feature | Standard (Single-Tenant) | Consumption (Multi-Tenant) |
|---------|-------------------------|---------------------------|
| Hosting | Azure Functions runtime, dedicated | Shared multi-tenant infrastructure |
| Scaling | Plan-based (WS1/WS2/WS3) or ASE v3 | Auto per-execution |
| Pricing | Fixed compute + storage | Pay per execution + connector call |
| VNet integration | Full VNet, private endpoints | Limited (ISE deprecated) |
| Local development | VS Code + Azure Logic Apps extension | Portal or VS Code (limited) |
| Workflows per app | Multiple workflows in one resource | One workflow per resource |
| Stateless workflows | Supported | Not supported |
| Built-in connectors | Run in-process (no connector fee) | Run in shared infrastructure |
| Storage | Azure Blob + Queue (configurable) | Microsoft-managed |
| Deployment | ZIP deploy, ARM, Bicep, CLI | ARM, Bicep, CLI |

**Logic Apps vs Power Automate decision matrix**:

| Criteria | Logic Apps | Power Automate |
|----------|------------|----------------|
| Target user | Integration engineer / developer | Citizen developer / business user |
| Definition format | JSON (Workflow Definition Language) | Visual designer / Power Fx |
| B2B / EDI | Full (AS2, X12, EDIFACT) | Not supported |
| Deployment model | ARM/Bicep/CLI/DevOps/GitHub Actions | Solution export/import |
| Source control | Git-native JSON files | Solution packages |
| Local development | VS Code extension with Azurite | Not supported |
| Custom connectors | OpenAPI + code | OpenAPI (limited) |
| Pricing | Consumption or fixed compute | Per-user or per-flow license |
| Enterprise integration | Integration accounts, maps, schemas | Basic connectors only |
| Governance | Azure Policy, RBAC, managed identity | Power Platform DLP, Entra |

**When to use Logic Apps**: Enterprise integration scenarios, B2B/EDI, complex error handling with retry policies, VNet-isolated workloads, git-based CI/CD, multi-workflow applications, high-throughput stateless processing.

**When to use Power Automate**: Business user self-service automation, approval flows, desktop automation (RPA), simple cloud-to-cloud integrations, Dataverse-centric workflows.


## 2. Hosting Models

### 2.1 Standard (Single-Tenant)

Standard Logic Apps run on the Azure Functions runtime with a dedicated Workflow Service Plan.

**Key characteristics**:
- Multiple workflows in a single Logic App resource
- Full VNet integration and private endpoints
- Stateful and stateless workflow types
- Built-in connectors run in-process (faster, no per-call connector fee)
- Local development with VS Code + Azure Logic Apps (Standard) extension
- Storage: Azure Blob Storage + Azure Queue Storage for run state
- Supports deployment slots for staged rollouts
- Can run in App Service Environment (ASE) v3

**Workflow Service Plans**:

| Plan | vCPU | Memory | Price Tier |
|------|------|--------|------------|
| WS1 | 1 | 3.5 GB | Standard |
| WS2 | 2 | 7 GB | Standard |
| WS3 | 4 | 14 GB | Standard |

**Standard project structure**:
```
my-logic-app/
├── host.json                          # Runtime configuration
├── local.settings.json                # Local environment variables
├── connections.json                   # Connection references
├── parameters.json                    # Shared parameters
├── .vscode/
│   ├── extensions.json
│   ├── launch.json
│   ├── settings.json
│   └── tasks.json
├── workflow1/
│   └── workflow.json                  # Workflow definition
├── workflow2/
│   └── workflow.json
├── Artifacts/
│   ├── Maps/                          # XSLT/Liquid transformation maps
│   └── Schemas/                       # XSD validation schemas
└── lib/
    └── custom/                        # Custom .NET assemblies
```

**host.json** for Standard:
```json
{
  "version": "2.0",
  "extensionBundle": {
    "id": "Microsoft.Azure.Functions.ExtensionBundle.Workflows",
    "version": "[1.*, 2.0.0)"
  }
}
```

**local.settings.json**:
```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "WORKFLOWS_SUBSCRIPTION_ID": "",
    "WORKFLOWS_TENANT_ID": "",
    "WORKFLOWS_RESOURCE_GROUP_NAME": "",
    "WORKFLOWS_LOCATION_NAME": ""
  }
}
```

### 2.2 Consumption (Multi-Tenant)

Consumption Logic Apps run on shared multi-tenant infrastructure with automatic scaling.

**Key characteristics**:
- One workflow per Logic App resource
- Automatic scaling per execution
- Pay per action execution and connector call
- Portal-based designer (primary) or VS Code (limited)
- ISE (Integration Service Environment) is **deprecated** — migrate to Standard
- Built-in integration with Azure Monitor and Log Analytics

**Pricing components**:
| Component | Cost |
|-----------|------|
| Action executions | ~$0.000025/action |
| Standard connector | ~$0.000125/call |
| Enterprise connector | ~$0.001/call |
| Integration account (Basic) | ~$X/month |
| Data retention | Included (90-day run history) |


## 3. Workflow Definition Language (WDL)

Logic Apps workflows are defined in JSON using WDL. The schema provides a declarative way to describe triggers, actions, conditions, and data flow.

**Top-level workflow.json structure**:
```json
{
  "definition": {
    "$schema": "https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#",
    "contentVersion": "1.0.0.0",
    "parameters": {},
    "triggers": {},
    "actions": {},
    "outputs": {}
  },
  "kind": "Stateful"
}
```

The `kind` property (Standard only) can be `"Stateful"` or `"Stateless"`.

### 3.1 Action Types

**HTTP** — make HTTP requests to external APIs:
```json
"Call_External_API": {
  "type": "Http",
  "inputs": {
    "method": "POST",
    "uri": "https://api.example.com/orders",
    "headers": {
      "Content-Type": "application/json",
      "Authorization": "Bearer @{parameters('apiToken')}"
    },
    "body": {
      "orderId": "@{triggerBody()?['id']}",
      "amount": "@{triggerBody()?['total']}"
    },
    "retryPolicy": {
      "type": "exponential",
      "count": 4,
      "interval": "PT7S",
      "minimumInterval": "PT5S",
      "maximumInterval": "PT1H"
    }
  },
  "runAfter": {}
}
```

**APIConnection** — call managed connectors (SharePoint, SQL, Dynamics, etc.):
```json
"Get_SharePoint_Items": {
  "type": "ApiConnection",
  "inputs": {
    "host": {
      "connection": {
        "name": "@parameters('$connections')['sharepointonline']['connectionId']"
      }
    },
    "method": "get",
    "path": "/datasets/@{encodeURIComponent('https://contoso.sharepoint.com/sites/hr')}/tables/@{encodeURIComponent('Employees')}/items"
  },
  "runAfter": {}
}
```

**Compose** — create or transform data:
```json
"Build_Response_Object": {
  "type": "Compose",
  "inputs": {
    "status": "processed",
    "timestamp": "@{utcNow()}",
    "orderId": "@{triggerBody()?['id']}"
  },
  "runAfter": {}
}
```

**Parse JSON** — parse and validate JSON with schema:
```json
"Parse_Order": {
  "type": "ParseJson",
  "inputs": {
    "content": "@triggerBody()",
    "schema": {
      "type": "object",
      "properties": {
        "id": { "type": "string" },
        "amount": { "type": "number" },
        "customer": { "type": "string" }
      },
      "required": ["id", "amount"]
    }
  },
  "runAfter": {}
}
```

**Initialize Variable / Set Variable**:
```json
"Initialize_Counter": {
  "type": "InitializeVariable",
  "inputs": {
    "variables": [
      {
        "name": "counter",
        "type": "integer",
        "value": 0
      }
    ]
  },
  "runAfter": {}
},
"Increment_Counter": {
  "type": "IncrementVariable",
  "inputs": {
    "name": "counter",
    "value": 1
  },
  "runAfter": { "Initialize_Counter": ["Succeeded"] }
}
```

**Condition (If)**:
```json
"Check_Amount": {
  "type": "If",
  "expression": {
    "and": [
      {
        "greater": [
          "@body('Parse_Order')?['amount']",
          1000
        ]
      }
    ]
  },
  "actions": {
    "Approve_Large_Order": { "type": "Compose", "inputs": "Approved", "runAfter": {} }
  },
  "else": {
    "actions": {
      "Auto_Process": { "type": "Compose", "inputs": "Auto", "runAfter": {} }
    }
  },
  "runAfter": { "Parse_Order": ["Succeeded"] }
}
```

**Switch**:
```json
"Route_By_Region": {
  "type": "Switch",
  "expression": "@body('Parse_Order')?['region']",
  "cases": {
    "US": {
      "case": "US",
      "actions": {
        "Process_US": { "type": "Compose", "inputs": "US processing", "runAfter": {} }
      }
    },
    "EU": {
      "case": "EU",
      "actions": {
        "Process_EU": { "type": "Compose", "inputs": "EU processing", "runAfter": {} }
      }
    }
  },
  "default": {
    "actions": {
      "Process_Default": { "type": "Compose", "inputs": "Default processing", "runAfter": {} }
    }
  },
  "runAfter": { "Parse_Order": ["Succeeded"] }
}
```

**ForEach** — iterate over arrays:
```json
"Process_Each_Item": {
  "type": "Foreach",
  "foreach": "@body('Get_Items')?['value']",
  "actions": {
    "Transform_Item": {
      "type": "Compose",
      "inputs": {
        "name": "@{items('Process_Each_Item')?['name']}",
        "processed": true
      },
      "runAfter": {}
    }
  },
  "operationOptions": "Sequential",
  "runAfter": { "Get_Items": ["Succeeded"] }
}
```

**Until** — loop until condition met:
```json
"Poll_Status": {
  "type": "Until",
  "expression": "@equals(body('Check_Status')?['status'], 'complete')",
  "limit": {
    "count": 60,
    "timeout": "PT1H"
  },
  "actions": {
    "Check_Status": {
      "type": "Http",
      "inputs": {
        "method": "GET",
        "uri": "https://api.example.com/status/@{body('Start_Job')?['jobId']}"
      },
      "runAfter": {}
    },
    "Wait_30s": {
      "type": "Wait",
      "inputs": { "interval": { "count": 30, "unit": "Second" } },
      "runAfter": { "Check_Status": ["Succeeded"] }
    }
  },
  "runAfter": { "Start_Job": ["Succeeded"] }
}
```

**Scope** — group actions for error handling (try/catch pattern):
```json
"Try_Scope": {
  "type": "Scope",
  "actions": {
    "Risky_Action": {
      "type": "Http",
      "inputs": { "method": "POST", "uri": "https://api.example.com/process" },
      "runAfter": {}
    }
  },
  "runAfter": {}
},
"Catch_Scope": {
  "type": "Scope",
  "actions": {
    "Log_Error": {
      "type": "Compose",
      "inputs": "Error: @{result('Try_Scope')}",
      "runAfter": {}
    }
  },
  "runAfter": {
    "Try_Scope": ["Failed", "TimedOut"]
  }
}
```

**Terminate** — end workflow with status:
```json
"Terminate_Failed": {
  "type": "Terminate",
  "inputs": {
    "runStatus": "Failed",
    "runError": {
      "code": "VALIDATION_ERROR",
      "message": "Order validation failed: @{body('Validate')?['error']}"
    }
  },
  "runAfter": { "Validate": ["Failed"] }
}
```

**Response** — return HTTP response (Request trigger only):
```json
"Send_Response": {
  "type": "Response",
  "kind": "Http",
  "inputs": {
    "statusCode": 200,
    "headers": { "Content-Type": "application/json" },
    "body": {
      "status": "accepted",
      "id": "@{body('Create_Record')?['id']}"
    }
  },
  "runAfter": { "Create_Record": ["Succeeded"] }
}
```

**Inline Code** (Standard, JavaScript):
```json
"Transform_Data": {
  "type": "JavaScriptCode",
  "inputs": {
    "code": "var items = workflowContext.actions.Get_Items.outputs.body.value;\nvar result = items.filter(i => i.active).map(i => ({ id: i.id, name: i.name.toUpperCase() }));\nreturn result;"
  },
  "runAfter": { "Get_Items": ["Succeeded"] }
}
```

### 3.2 runAfter Property

The `runAfter` property controls action execution order and supports four status values:

| Status | Meaning |
|--------|---------|
| `Succeeded` | Previous action completed successfully |
| `Failed` | Previous action failed |
| `Skipped` | Previous action was skipped |
| `TimedOut` | Previous action timed out |

```json
"runAfter": {
  "Previous_Action": ["Succeeded"]
}
```

For error handling (catch block):
```json
"runAfter": {
  "Try_Scope": ["Failed", "TimedOut", "Skipped"]
}
```

For always-run (finally block):
```json
"runAfter": {
  "Try_Scope": ["Succeeded", "Failed", "TimedOut", "Skipped"]
}
```


## 4. Triggers

### 4.1 Built-in Triggers

**Request (HTTP webhook)** — receive inbound HTTP calls:
```json
"triggers": {
  "When_a_HTTP_request_is_received": {
    "type": "Request",
    "kind": "Http",
    "inputs": {
      "schema": {
        "type": "object",
        "properties": {
          "orderId": { "type": "string" },
          "amount": { "type": "number" },
          "customer": { "type": "string" }
        },
        "required": ["orderId"]
      },
      "method": "POST"
    }
  }
}
```

**Recurrence** — scheduled execution:
```json
"triggers": {
  "Recurrence": {
    "type": "Recurrence",
    "recurrence": {
      "frequency": "Day",
      "interval": 1,
      "startTime": "2024-01-01T08:00:00Z",
      "timeZone": "Eastern Standard Time",
      "schedule": {
        "hours": ["8", "12", "17"],
        "weekDays": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
      }
    }
  }
}
```

**Service Bus** — message queue/topic trigger:
```json
"triggers": {
  "When_messages_are_available_in_queue": {
    "type": "ServiceProvider",
    "inputs": {
      "parameters": {
        "queueName": "orders",
        "isSessionsEnabled": false
      },
      "serviceProviderConfiguration": {
        "connectionName": "serviceBus",
        "operationId": "receiveQueueMessages",
        "serviceProviderId": "/serviceProviders/serviceBus"
      }
    }
  }
}
```

**Azure Blob Storage** — blob created/modified:
```json
"triggers": {
  "When_a_blob_is_added_or_modified": {
    "type": "ServiceProvider",
    "inputs": {
      "parameters": {
        "path": "incoming/{name}",
        "connectionName": "azureBlob"
      },
      "serviceProviderConfiguration": {
        "connectionName": "AzureBlob",
        "operationId": "whenABlobIsAddedOrModified",
        "serviceProviderId": "/serviceProviders/AzureBlob"
      }
    }
  }
}
```

**Event Hubs** — stream processing:
```json
"triggers": {
  "When_events_are_available_in_Event_Hub": {
    "type": "ServiceProvider",
    "inputs": {
      "parameters": {
        "eventHubName": "orders",
        "consumerGroup": "$Default"
      },
      "serviceProviderConfiguration": {
        "connectionName": "eventHub",
        "operationId": "receiveEvents",
        "serviceProviderId": "/serviceProviders/eventHub"
      }
    }
  }
}
```

### 4.2 Managed Connector Triggers

Managed connector triggers use the `ApiConnection` type and poll at configured intervals:

- **SharePoint** — when an item is created or modified
- **Dataverse** — when a row is added, modified, or deleted
- **SQL Server** — when an item is created
- **Dynamics 365** — when a record is created or updated
- **Office 365 Outlook** — when a new email arrives
- **Salesforce** — when a record is created or modified

### 4.3 Trigger Conditions

Filter trigger execution with conditions:
```json
"triggers": {
  "manual": {
    "type": "Request",
    "kind": "Http",
    "inputs": { "schema": {} },
    "conditions": [
      {
        "expression": "@greater(triggerBody()?['amount'], 100)"
      }
    ]
  }
}
```

### 4.4 SplitOn for Array Triggers

Process each item in an array payload as a separate run:
```json
"triggers": {
  "manual": {
    "type": "Request",
    "kind": "Http",
    "inputs": { "schema": {} },
    "splitOn": "@triggerBody()?['items']"
  }
}
```


## 5. Connectors

### 5.1 Built-in vs Managed

| Category | Built-in (Standard) | Managed |
|----------|-------------------|---------|
| Execution | In-process | Shared Microsoft infrastructure |
| Latency | Low (ms) | Higher (network hop) |
| Pricing | Included in plan | Per-call fee |
| VNet access | Yes (in-process) | Via VNet integration / gateway |
| Examples | HTTP, Service Bus, Blob, Event Hubs, SQL, Azure Functions | SharePoint, Dynamics 365, SAP, Salesforce |

### 5.2 Built-in Connectors (Standard — In-Process)

| Connector | Use Case |
|-----------|----------|
| HTTP / HTTP + Webhook | Call any REST API |
| Request / Response | Expose workflow as API |
| Recurrence / Schedule | Time-based triggers |
| Service Bus | Queue/topic messaging |
| Azure Blob Storage | File triggers and operations |
| Azure Queue Storage | Queue messaging |
| Event Hubs | Stream processing |
| Azure Functions | Call Azure Functions |
| Inline Code | Execute JavaScript in-workflow |
| Liquid / XSLT | Template transformations |
| XML / Flat File | XML operations, flat file encoding/decoding |
| IBM MQ | Enterprise messaging |
| Azure Cosmos DB | NoSQL database operations |
| Azure Table Storage | Table storage CRUD |
| SFTP / FTP | File transfer |
| SQL Server | Database operations |
| Batch | Message batching |
| DB2 | IBM DB2 database |

### 5.3 Managed Connector Tiers

**Standard connectors** (~$0.000125/call): SQL, SharePoint, Office 365, Dynamics 365, Azure AD, OneDrive, Teams, SFTP-SSH

**Premium connectors** (~$0.001/call): SAP, IBM 3270, IBM MQ, ServiceNow, Salesforce, Oracle DB, Adobe Sign

**Enterprise connectors**: SAP (specific), IBM (specific) — higher per-call fees

### 5.4 On-Premises Data Gateway

For accessing on-premises data sources (SQL Server, file shares, Oracle, SAP, etc.):

1. Install gateway on a Windows server in the on-premises network
2. Register gateway in Azure (resource in a resource group)
3. Create API connection referencing the gateway
4. Configure high availability with gateway clusters

### 5.5 Custom Connectors

Create custom connectors from OpenAPI (Swagger) definitions:
- Supports OpenAPI 2.0 (Swagger) and 3.0
- Authentication: OAuth 2.0, API Key, Basic, Certificate
- Deployed per Logic App (Standard) or per subscription (Consumption)
- Can include custom code for request/response transformation


## 6. Integration Accounts & B2B

Integration accounts enable B2B enterprise integration with trading partners, agreements, schemas, and maps.

### 6.1 Integration Account Tiers

| Tier | Partners | Agreements | Maps | Schemas | Assemblies |
|------|----------|------------|------|---------|------------|
| Free | 25 | 10 | 25 | 25 | 10 |
| Basic | 500 | 500 | 500 | 500 | 25 |
| Standard | 1000+ | 1000+ | 2000 | 2000 | 50 |

### 6.2 Linking to Logic App

**Consumption**: Set the `integrationAccount` property on the Logic App resource.

**Standard**: Link via app settings:
```json
{
  "Values": {
    "WORKFLOWS_INTEGRATION_ACCOUNT_ID": "/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Logic/integrationAccounts/{name}"
  }
}
```

### 6.3 Trading Partners

Partners represent business entities with identities:
```json
{
  "name": "Contoso",
  "partnerType": "B2B",
  "content": {
    "b2b": {
      "businessIdentities": [
        { "qualifier": "AS2Identity", "value": "CONTOSO" },
        { "qualifier": "ZZ", "value": "CONTOSO-X12" }
      ]
    }
  }
}
```

**Identity qualifiers**:
| Protocol | Qualifier | Example |
|----------|-----------|---------|
| AS2 | AS2Identity | Company AS2 ID |
| X12 | ZZ | Mutually defined |
| X12 | 01 | DUNS number |
| X12 | 14 | EAN/UCC |
| EDIFACT | ZZZ | Mutually defined |

### 6.4 Agreements

**AS2 Agreement** settings:
- Message signing (SHA-256, SHA-384, SHA-512)
- Message encryption (AES-128, AES-192, AES-256, DES3)
- MDN (Message Disposition Notification): sync/async, signed/unsigned
- Compression (gzip)

**X12 Agreement** settings:
- Interchange control number (ISA)
- Functional group (GS) settings
- Transaction set (ST) validation
- Acknowledgment (TA1, 997, 999)
- Envelope and separator overrides

**EDIFACT Agreement** settings:
- UNB interchange settings
- UNG group settings
- Character set and separators
- Acknowledgment (CONTRL)

### 6.5 Schemas and Maps

**Schemas (XSD)**: Upload XSD files for message validation in workflows:
```json
"Validate_X12": {
  "type": "XmlValidation",
  "inputs": {
    "content": "@body('Decode_X12')",
    "integrationAccount": {
      "schema": { "name": "PurchaseOrder.xsd" }
    }
  }
}
```

**Maps (XSLT/Liquid)**: Transform messages between formats:
```json
"Transform_Order": {
  "type": "Xslt",
  "inputs": {
    "content": "@body('Validate_X12')",
    "integrationAccount": {
      "map": { "name": "X12-to-Internal.xslt" }
    }
  }
}
```

### 6.6 Certificates

- **Public certificates**: Verify partner signatures
- **Private certificates**: Sign outbound messages, decrypt inbound
- Store private keys in Azure Key Vault
- Reference in AS2 agreement signing/encryption settings


## 7. Error Handling & Reliability

### 7.1 Retry Policies

Configure retry behavior per action:

```json
"retryPolicy": {
  "type": "exponential",
  "count": 4,
  "interval": "PT7S",
  "minimumInterval": "PT5S",
  "maximumInterval": "PT1H"
}
```

| Type | Behavior |
|------|----------|
| `none` | No retries |
| `fixed` | Fixed interval between retries |
| `exponential` | Exponential backoff with jitter |

Default is exponential with 4 retries if not specified.

### 7.2 Scope-Based Try/Catch Pattern

Use `Scope` actions with `runAfter` for structured error handling:

```json
{
  "actions": {
    "Try": {
      "type": "Scope",
      "actions": {
        "Call_API": {
          "type": "Http",
          "inputs": { "method": "POST", "uri": "https://api.example.com/process" },
          "runAfter": {}
        },
        "Save_Result": {
          "type": "ApiConnection",
          "inputs": { "...": "..." },
          "runAfter": { "Call_API": ["Succeeded"] }
        }
      },
      "runAfter": {}
    },
    "Catch": {
      "type": "Scope",
      "actions": {
        "Get_Error_Details": {
          "type": "Compose",
          "inputs": "@result('Try')",
          "runAfter": {}
        },
        "Send_Alert": {
          "type": "ApiConnection",
          "inputs": { "...": "send error notification" },
          "runAfter": { "Get_Error_Details": ["Succeeded"] }
        }
      },
      "runAfter": {
        "Try": ["Failed", "TimedOut"]
      }
    },
    "Finally": {
      "type": "Scope",
      "actions": {
        "Cleanup": {
          "type": "Compose",
          "inputs": "Cleanup completed",
          "runAfter": {}
        }
      },
      "runAfter": {
        "Try": ["Succeeded", "Failed", "TimedOut", "Skipped"],
        "Catch": ["Succeeded", "Failed", "TimedOut", "Skipped"]
      }
    }
  }
}
```

### 7.3 Concurrency Control

Limit parallel run instances:
```json
"triggers": {
  "manual": {
    "type": "Request",
    "kind": "Http",
    "inputs": {},
    "operationOptions": "SingleInstance"
  }
}
```

Or set explicit concurrency on actions:
```json
"Process_Each_Item": {
  "type": "Foreach",
  "foreach": "@body('Get_Items')",
  "runtimeConfiguration": {
    "concurrency": {
      "repetitions": 20
    }
  }
}
```

### 7.4 Secure Inputs/Outputs

Hide sensitive data from run history:
```json
"Call_Auth_API": {
  "type": "Http",
  "inputs": { "...": "..." },
  "runtimeConfiguration": {
    "secureData": {
      "properties": ["inputs", "outputs"]
    }
  }
}
```

### 7.5 Idempotency

For triggers that may fire duplicates:
- Use `SplitOn` with deduplication in downstream actions
- Check for existing records before creating (query → conditional create)
- Use Service Bus session-based message processing for ordered, exactly-once delivery
- Set concurrency control to `SingleInstance` for singleton execution


## 8. Workflow Expressions

### 8.1 Expression Syntax

- **Inline in strings**: `"Hello @{triggerBody()?['name']}"`
- **Full value**: `"@triggerBody()?['name']"`
- **Literal @**: Escape with `@@`

### 8.2 Function Categories

**String functions**:
| Function | Example |
|----------|---------|
| `concat(a, b)` | `@concat('Order-', triggerBody()?['id'])` |
| `substring(str, start, length)` | `@substring(body('Get')?['name'], 0, 10)` |
| `replace(str, old, new)` | `@replace(body('Get')?['text'], '\n', ' ')` |
| `toLower(str)` / `toUpper(str)` | `@toLower(triggerBody()?['email'])` |
| `trim(str)` | `@trim(triggerBody()?['input'])` |
| `indexOf(str, search)` | `@indexOf(body('Get')?['name'], '@')` |
| `length(str)` | `@length(triggerBody()?['description'])` |
| `startsWith(str, prefix)` | `@startsWith(body('Get')?['code'], 'ERR')` |
| `endsWith(str, suffix)` | `@endsWith(body('Get')?['file'], '.pdf')` |
| `split(str, delimiter)` | `@split(body('Get')?['tags'], ',')` |
| `guid()` | `@guid()` |

**Collection functions**:
| Function | Example |
|----------|---------|
| `length(array)` | `@length(body('Get_Items')?['value'])` |
| `contains(collection, value)` | `@contains(body('Get')?['roles'], 'admin')` |
| `empty(collection)` | `@empty(body('Get_Items')?['value'])` |
| `first(array)` | `@first(body('Get_Items')?['value'])` |
| `last(array)` | `@last(body('Get_Items')?['value'])` |
| `skip(array, count)` | `@skip(body('Get_Items')?['value'], 10)` |
| `take(array, count)` | `@take(body('Get_Items')?['value'], 5)` |
| `union(array1, array2)` | `@union(body('List_A'), body('List_B'))` |
| `intersection(a1, a2)` | `@intersection(body('List_A'), body('List_B'))` |

**Logical functions**:
| Function | Example |
|----------|---------|
| `if(expr, true, false)` | `@if(equals(body('Check')?['status'], 'ok'), 'Pass', 'Fail')` |
| `equals(a, b)` | `@equals(triggerBody()?['type'], 'urgent')` |
| `and(a, b)` | `@and(greater(body('Get')?['amount'], 100), equals(body('Get')?['approved'], true))` |
| `or(a, b)` | `@or(equals(body('Get')?['status'], 'new'), equals(body('Get')?['status'], 'pending'))` |
| `not(expr)` | `@not(empty(body('Get_Items')?['value']))` |
| `greater(a, b)` | `@greater(body('Get')?['count'], 0)` |
| `less(a, b)` | `@less(body('Get')?['retries'], 3)` |

**Conversion functions**:
| Function | Example |
|----------|---------|
| `int(value)` | `@int(triggerBody()?['quantity'])` |
| `float(value)` | `@float(triggerBody()?['price'])` |
| `string(value)` | `@string(body('Get')?['count'])` |
| `bool(value)` | `@bool(triggerBody()?['active'])` |
| `json(value)` | `@json(body('Get_Text'))` |
| `xml(value)` | `@xml(body('Get_JSON'))` |
| `base64(value)` | `@base64(body('Get_File'))` |
| `base64ToString(b64)` | `@base64ToString(triggerBody()?['content'])` |

**Date/Time functions**:
| Function | Example |
|----------|---------|
| `utcNow()` | `@utcNow()` |
| `utcNow(format)` | `@utcNow('yyyy-MM-dd')` |
| `addDays(timestamp, days)` | `@addDays(utcNow(), -7)` |
| `addHours(timestamp, hours)` | `@addHours(utcNow(), 2)` |
| `addMinutes(timestamp, mins)` | `@addMinutes(utcNow(), 30)` |
| `formatDateTime(ts, fmt)` | `@formatDateTime(utcNow(), 'yyyy-MM-ddTHH:mm:ssZ')` |
| `ticks(timestamp)` | `@ticks(utcNow())` |
| `dayOfWeek(timestamp)` | `@dayOfWeek(utcNow())` |
| `dayOfMonth(timestamp)` | `@dayOfMonth(utcNow())` |

**Workflow context functions**:
| Function | Description |
|----------|-------------|
| `trigger()` | Full trigger output |
| `triggerBody()` | Trigger body content |
| `triggerOutputs()` | Trigger outputs including headers |
| `actions('name')` | Full output of named action |
| `body('name')` | Body of named action |
| `actionBody('name')` | Alias for body() |
| `actionOutputs('name')` | Full outputs of action |
| `parameters('name')` | Get parameter value |
| `variables('name')` | Get variable value |
| `result('scope')` | Array of results from all actions in a scope |
| `workflow()` | Workflow metadata (name, id, run id) |
| `item()` | Current item in ForEach |
| `items('forEach')` | Current item in named ForEach |
| `iterationIndexes('forEach')` | Current index in named ForEach |

### 8.3 Common Expression Patterns

**Null-safe property access** (use `?` operator):
```
@triggerBody()?['address']?['city']
```

**Conditional value**:
```
@if(equals(triggerBody()?['priority'], 'high'), 'Expedite', 'Standard')
```

**Date arithmetic** (7 days ago formatted):
```
@addDays(utcNow(), -7, 'yyyy-MM-dd')
```

**String interpolation**:
```
@{concat('Order-', triggerBody()?['orderId'], '-', utcNow('yyyyMMdd'))}
```

**Coalesce pattern** (first non-null):
```
@coalesce(triggerBody()?['preferredName'], triggerBody()?['firstName'], 'Unknown')
```

**Array length check**:
```
@greater(length(body('Get_Items')?['value']), 0)
```

**Extract filename from path**:
```
@last(split(triggerBody()?['filePath'], '/'))
```

### 8.4 Inline Code Action (Standard)

For complex transformations, use JavaScript inline code:
```json
"Transform_Data": {
  "type": "JavaScriptCode",
  "inputs": {
    "code": "var items = workflowContext.actions.Get_Items.outputs.body.value;\nvar grouped = {};\nitems.forEach(function(item) {\n  var key = item.category;\n  if (!grouped[key]) grouped[key] = [];\n  grouped[key].push(item);\n});\nreturn grouped;"
  }
}
```

Access workflow context via `workflowContext.trigger.outputs` and `workflowContext.actions.<name>.outputs`.


## 9. Deployment & CI/CD

### 9.1 ARM Templates

**Consumption Logic App**:
```json
{
  "type": "Microsoft.Logic/workflows",
  "apiVersion": "2019-05-01",
  "name": "[parameters('logicAppName')]",
  "location": "[parameters('location')]",
  "properties": {
    "state": "Enabled",
    "definition": { "...WDL..." },
    "parameters": {
      "$connections": {
        "value": {
          "office365": {
            "connectionId": "[resourceId('Microsoft.Web/connections', 'office365')]",
            "connectionName": "office365",
            "id": "[subscriptionResourceId('Microsoft.Web/locations/managedApis', parameters('location'), 'office365')]"
          }
        }
      }
    }
  }
}
```

**Standard Logic App**:
```json
{
  "type": "Microsoft.Web/sites",
  "apiVersion": "2022-09-01",
  "name": "[parameters('logicAppName')]",
  "location": "[parameters('location')]",
  "kind": "functionapp,workflowapp",
  "identity": { "type": "SystemAssigned" },
  "properties": {
    "serverFarmId": "[resourceId('Microsoft.Web/serverfarms', parameters('planName'))]",
    "siteConfig": {
      "appSettings": [
        { "name": "APP_KIND", "value": "workflowApp" },
        { "name": "AzureWebJobsStorage", "value": "[parameters('storageConnectionString')]" },
        { "name": "FUNCTIONS_EXTENSION_VERSION", "value": "~4" },
        { "name": "FUNCTIONS_WORKER_RUNTIME", "value": "node" },
        { "name": "WEBSITE_NODE_DEFAULT_VERSION", "value": "~18" }
      ]
    }
  }
}
```

### 9.2 Bicep

**Consumption**:
```bicep
resource logicApp 'Microsoft.Logic/workflows@2019-05-01' = {
  name: logicAppName
  location: location
  properties: {
    state: 'Enabled'
    definition: json(loadTextContent('workflow.json')).definition
    parameters: {}
  }
}
```

**Standard**:
```bicep
resource appServicePlan 'Microsoft.Web/serverfarms@2022-09-01' = {
  name: planName
  location: location
  sku: { name: 'WS1', tier: 'WorkflowStandard' }
  kind: 'elastic'
  properties: { isSpot: false }
}

resource logicApp 'Microsoft.Web/sites@2022-09-01' = {
  name: logicAppName
  location: location
  kind: 'functionapp,workflowapp'
  identity: { type: 'SystemAssigned' }
  properties: {
    serverFarmId: appServicePlan.id
    siteConfig: {
      appSettings: [
        { name: 'APP_KIND', value: 'workflowApp' }
        { name: 'AzureWebJobsStorage', value: storageConnectionString }
        { name: 'FUNCTIONS_EXTENSION_VERSION', value: '~4' }
        { name: 'FUNCTIONS_WORKER_RUNTIME', value: 'node' }
      ]
    }
  }
}
```

### 9.3 Azure CLI

**Consumption Logic App**:
```bash
# Create
az logic workflow create \
  --resource-group myRg \
  --name my-logic-app \
  --definition @workflow.json \
  --location eastus

# Show
az logic workflow show --resource-group myRg --name my-logic-app

# Update definition
az logic workflow update \
  --resource-group myRg \
  --name my-logic-app \
  --definition @workflow.json

# List runs
az logic workflow run list \
  --resource-group myRg \
  --workflow-name my-logic-app \
  --filter "status eq 'Failed'"

# Delete
az logic workflow delete --resource-group myRg --name my-logic-app --yes
```

**Standard Logic App**:
```bash
# Create the Logic App resource
az logicapp create \
  --resource-group myRg \
  --name my-standard-app \
  --storage-account mystorageaccount \
  --plan my-workflow-plan \
  --runtime-version ~4

# Deploy workflows (ZIP deploy)
cd my-logic-app-project
zip -r deploy.zip . -x ".vscode/*" "local.settings.json" ".git/*"
az logicapp deployment source config-zip \
  --resource-group myRg \
  --name my-standard-app \
  --src deploy.zip

# Show
az logicapp show --resource-group myRg --name my-standard-app

# Configure app settings
az logicapp config appsettings set \
  --resource-group myRg \
  --name my-standard-app \
  --settings "KEY=value"
```

### 9.4 GitHub Actions CI/CD

```yaml
name: Deploy Logic App (Standard)

on:
  push:
    branches: [main]
  workflow_dispatch:

env:
  LOGIC_APP_NAME: 'my-standard-app'
  RESOURCE_GROUP: 'my-rg'

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Login to Azure
        uses: azure/login@v2
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Build project
        run: |
          zip -r deploy.zip . \
            -x ".vscode/*" \
            -x "local.settings.json" \
            -x ".git/*" \
            -x ".github/*" \
            -x "*.md"

      - name: Deploy to Logic App
        uses: azure/functions-action@v1
        with:
          app-name: ${{ env.LOGIC_APP_NAME }}
          package: 'deploy.zip'

      - name: Verify deployment
        run: |
          az logicapp show \
            --resource-group ${{ env.RESOURCE_GROUP }} \
            --name ${{ env.LOGIC_APP_NAME }} \
            --query "state" -o tsv
```

### 9.5 Azure DevOps Pipeline

```yaml
trigger:
  branches:
    include:
      - main
  paths:
    include:
      - 'src/logic-apps/**'

pool:
  vmImage: 'ubuntu-latest'

variables:
  logicAppName: 'my-standard-app'
  resourceGroup: 'my-rg'
  azureSubscription: 'MyAzureConnection'

stages:
  - stage: Build
    jobs:
      - job: BuildArtifact
        steps:
          - task: ArchiveFiles@2
            inputs:
              rootFolderOrFile: 'src/logic-apps'
              includeRootFolder: false
              archiveType: 'zip'
              archiveFile: '$(Build.ArtifactStagingDirectory)/deploy.zip'

          - publish: '$(Build.ArtifactStagingDirectory)/deploy.zip'
            artifact: logic-app

  - stage: Deploy
    dependsOn: Build
    jobs:
      - deployment: DeployLogicApp
        environment: 'production'
        strategy:
          runOnce:
            deploy:
              steps:
                - task: AzureCLI@2
                  inputs:
                    azureSubscription: $(azureSubscription)
                    scriptType: 'bash'
                    scriptLocation: 'inlineScript'
                    inlineScript: |
                      az logicapp deployment source config-zip \
                        --resource-group $(resourceGroup) \
                        --name $(logicAppName) \
                        --src $(Pipeline.Workspace)/logic-app/deploy.zip
```

### 9.6 VS Code Local Development

1. Install **Azure Logic Apps (Standard)** extension
2. Install **Azurite** extension for local storage emulation
3. Start Azurite: Ctrl+Shift+P → "Azurite: Start"
4. Open Logic App project folder
5. Right-click `workflow.json` → "Open in Designer"
6. Debug: F5 (uses `host.json` and `local.settings.json`)
7. Test Request triggers at `http://localhost:7071/api/<workflow>/triggers/manual/invoke`
8. Deploy: right-click project → "Deploy to Logic App"

### 9.7 Connection Parameterization

Separate connection details per environment using `parameters.json` and `connections.json`:

**parameters.json**:
```json
{
  "sqlConnectionString": {
    "type": "string",
    "value": ""
  }
}
```

**connections.json** (parameterized):
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


## 10. Monitoring & Diagnostics

### 10.1 Run History

View run history in the Azure Portal: Logic App → Runs → select a run → view action-by-action execution.

**REST API — List failed runs**:
```
GET https://management.azure.com/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Logic/workflows/{name}/runs?api-version=2016-06-01&$filter=status eq 'Failed'&$top=10
```

**REST API — Get run details**:
```
GET https://management.azure.com/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Logic/workflows/{name}/runs/{runId}?api-version=2016-06-01
```

**REST API — List run actions**:
```
GET https://management.azure.com/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Logic/workflows/{name}/runs/{runId}/actions?api-version=2016-06-01
```

**REST API — Resubmit a run**:
```
POST https://management.azure.com/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Logic/workflows/{name}/triggers/{triggerName}/histories/{historyName}/resubmit?api-version=2016-06-01
```

### 10.2 Application Insights

Enable diagnostic logging for Logic Apps:

```bash
# Standard: App Insights is set via app setting
az logicapp config appsettings set \
  --resource-group myRg \
  --name my-logic-app \
  --settings "APPINSIGHTS_INSTRUMENTATIONKEY=<key>"

# Consumption: Enable diagnostic settings
az monitor diagnostic-settings create \
  --resource "/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Logic/workflows/{name}" \
  --name "logic-app-diagnostics" \
  --workspace "/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.OperationalInsights/workspaces/{workspace}" \
  --logs '[{"category": "WorkflowRuntime", "enabled": true}]' \
  --metrics '[{"category": "AllMetrics", "enabled": true}]'
```

### 10.3 KQL Queries

**Failed runs in last 24 hours**:
```kql
AzureDiagnostics
| where ResourceType == "WORKFLOWS" or ResourceType == "MICROSOFT.LOGIC/WORKFLOWS"
| where OperationName == "Microsoft.Logic/workflows/workflowRunCompleted"
| where status_s == "Failed"
| where TimeGenerated > ago(24h)
| project TimeGenerated, resource_workflowName_s, resource_runId_s, error_code_s, error_message_s
| order by TimeGenerated desc
```

**Action latency analysis**:
```kql
AzureDiagnostics
| where ResourceType == "WORKFLOWS"
| where OperationName == "Microsoft.Logic/workflows/workflowActionCompleted"
| extend duration_ms = datetime_diff('millisecond', endTime_t, startTime_t)
| summarize
    avg_ms = avg(duration_ms),
    p95_ms = percentile(duration_ms, 95),
    max_ms = max(duration_ms),
    count = count()
  by resource_workflowName_s, resource_operationName_s
| order by avg_ms desc
```

**Throttling events**:
```kql
AzureDiagnostics
| where ResourceType == "WORKFLOWS"
| where status_s == "Failed"
| where error_code_s == "ActionThrottled" or error_code_s == "TriggerThrottled"
| summarize throttle_count = count() by bin(TimeGenerated, 1h), resource_workflowName_s
| order by TimeGenerated desc
```

**Long-running workflows** (> 5 minutes):
```kql
AzureDiagnostics
| where ResourceType == "WORKFLOWS"
| where OperationName == "Microsoft.Logic/workflows/workflowRunCompleted"
| extend duration_min = datetime_diff('minute', endTime_t, startTime_t)
| where duration_min > 5
| project TimeGenerated, resource_workflowName_s, resource_runId_s, duration_min, status_s
| order by duration_min desc
```

**Connector error breakdown**:
```kql
AzureDiagnostics
| where ResourceType == "WORKFLOWS"
| where OperationName == "Microsoft.Logic/workflows/workflowActionCompleted"
| where status_s == "Failed"
| summarize error_count = count() by resource_operationName_s, error_code_s
| order by error_count desc
| take 20
```

**Daily success rate**:
```kql
AzureDiagnostics
| where ResourceType == "WORKFLOWS"
| where OperationName == "Microsoft.Logic/workflows/workflowRunCompleted"
| summarize
    total = count(),
    succeeded = countif(status_s == "Succeeded"),
    failed = countif(status_s == "Failed")
  by bin(TimeGenerated, 1d), resource_workflowName_s
| extend success_rate = round(100.0 * succeeded / total, 2)
| order by TimeGenerated desc
```

### 10.4 Azure Monitor Metrics

| Metric | Description |
|--------|-------------|
| RunsStarted | Number of workflow runs started |
| RunsCompleted | Number of workflow runs completed |
| RunsSucceeded | Number of runs with Succeeded status |
| RunsFailed | Number of runs with Failed status |
| RunsCancelled | Number of cancelled runs |
| ActionLatency | Latency of completed workflow actions |
| TriggerLatency | Latency of completed triggers |
| TriggersStarted | Number of triggers fired |
| TriggersFailed | Number of trigger failures |
| BillableActionExecutions | Billable action count (Consumption) |
| BillableTriggerExecutions | Billable trigger count (Consumption) |

### 10.5 Alert Rules

**Failed run percentage alert**:
```bash
az monitor metrics alert create \
  --name "logic-app-failure-rate" \
  --resource-group myRg \
  --scopes "/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Logic/workflows/{name}" \
  --condition "total RunsFailed > 5" \
  --window-size 15m \
  --evaluation-frequency 5m \
  --action "/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Insights/actionGroups/{ag}" \
  --description "Alert when more than 5 runs fail in 15 minutes"
```

### 10.6 Tracked Properties

Add custom properties to action outputs for business telemetry:
```json
"Process_Order": {
  "type": "Http",
  "inputs": { "...": "..." },
  "trackedProperties": {
    "orderId": "@triggerBody()?['orderId']",
    "customerName": "@triggerBody()?['customer']",
    "orderAmount": "@triggerBody()?['amount']"
  }
}
```

Query tracked properties:
```kql
AzureDiagnostics
| where ResourceType == "WORKFLOWS"
| where trackedProperties_orderId_s != ""
| project TimeGenerated, trackedProperties_orderId_s, trackedProperties_customerName_s, status_s
```


## 11. Stateful vs Stateless Workflows (Standard Only)

| Aspect | Stateful | Stateless |
|--------|----------|-----------|
| Run history | Full, persisted in storage | Not persisted (in-memory only) |
| Trigger support | All triggers | Request, Service Bus, Event Hubs, Azure Queues |
| Action support | All actions | Most (no chunking, paging, or managed connectors with triggers) |
| Performance | Standard throughput | Higher throughput, lower latency |
| Max duration | Configurable (long-running) | 5 minutes (default) |
| State persistence | Blob + Queue storage | In-memory only |
| Debugging | Full run history in portal | Enable App Insights for observability |
| Use case | Long-running, auditable, B2B | Request-response APIs, event processing, high-throughput |

**When to use Stateful**: Workflows that need run history for auditing, long-running processes (minutes to days), B2B/EDI processing, workflows requiring durable retry, any scenario needing post-execution diagnostics.

**When to use Stateless**: High-throughput request-response APIs, real-time event processing from Service Bus or Event Hubs, lightweight transformations, scenarios where sub-second latency matters.

**Set workflow kind** in `workflow.json`:
```json
{
  "definition": { "...": "..." },
  "kind": "Stateless"
}
```

**Enable run history for Stateless** (for debugging, reduces performance):
Add app setting: `"Workflows.<workflowName>.OperationOptions": "WithStatelessRunHistory"`


## 12. Common Integration Patterns

### 12.1 Request-Response API

Expose a synchronous HTTP API:
```json
{
  "definition": {
    "$schema": "https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#",
    "contentVersion": "1.0.0.0",
    "triggers": {
      "Request": {
        "type": "Request",
        "kind": "Http",
        "inputs": {
          "schema": {
            "type": "object",
            "properties": {
              "productId": { "type": "string" }
            }
          },
          "method": "GET"
        }
      }
    },
    "actions": {
      "Get_Product": {
        "type": "Http",
        "inputs": {
          "method": "GET",
          "uri": "https://api.internal.com/products/@{triggerBody()?['productId']}"
        },
        "runAfter": {}
      },
      "Response": {
        "type": "Response",
        "kind": "Http",
        "inputs": {
          "statusCode": 200,
          "headers": { "Content-Type": "application/json" },
          "body": "@body('Get_Product')"
        },
        "runAfter": { "Get_Product": ["Succeeded"] }
      }
    }
  },
  "kind": "Stateless"
}
```

### 12.2 Async Webhook Pattern

Long-running process with 202 Accepted + polling:
```json
{
  "definition": {
    "$schema": "https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#",
    "contentVersion": "1.0.0.0",
    "triggers": {
      "Request": {
        "type": "Request",
        "kind": "Http",
        "inputs": { "schema": {}, "method": "POST" },
        "operationOptions": "EnableSchemaValidation"
      }
    },
    "actions": {
      "Start_Processing": {
        "type": "Http",
        "inputs": {
          "method": "POST",
          "uri": "https://api.example.com/jobs",
          "body": "@triggerBody()"
        },
        "runAfter": {}
      },
      "Wait_For_Completion": {
        "type": "Until",
        "expression": "@equals(body('Check_Status')?['status'], 'complete')",
        "limit": { "count": 100, "timeout": "PT1H" },
        "actions": {
          "Delay_30s": {
            "type": "Wait",
            "inputs": { "interval": { "count": 30, "unit": "Second" } },
            "runAfter": {}
          },
          "Check_Status": {
            "type": "Http",
            "inputs": {
              "method": "GET",
              "uri": "https://api.example.com/jobs/@{body('Start_Processing')?['jobId']}"
            },
            "runAfter": { "Delay_30s": ["Succeeded"] }
          }
        },
        "runAfter": { "Start_Processing": ["Succeeded"] }
      },
      "Get_Results": {
        "type": "Http",
        "inputs": {
          "method": "GET",
          "uri": "https://api.example.com/jobs/@{body('Start_Processing')?['jobId']}/results"
        },
        "runAfter": { "Wait_For_Completion": ["Succeeded"] }
      }
    }
  },
  "kind": "Stateful"
}
```

### 12.3 Event-Driven Processing

Service Bus trigger → process → fan-out to Event Hubs:
```json
{
  "definition": {
    "$schema": "https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#",
    "contentVersion": "1.0.0.0",
    "triggers": {
      "When_message_received": {
        "type": "ServiceProvider",
        "inputs": {
          "parameters": { "queueName": "incoming-orders", "isSessionsEnabled": false },
          "serviceProviderConfiguration": {
            "connectionName": "serviceBus",
            "operationId": "receiveQueueMessages",
            "serviceProviderId": "/serviceProviders/serviceBus"
          }
        }
      }
    },
    "actions": {
      "Parse_Message": {
        "type": "ParseJson",
        "inputs": {
          "content": "@triggerBody()?['contentData']",
          "schema": {
            "type": "object",
            "properties": {
              "orderId": { "type": "string" },
              "items": { "type": "array" }
            }
          }
        },
        "runAfter": {}
      },
      "Enrich_Order": {
        "type": "Http",
        "inputs": {
          "method": "GET",
          "uri": "https://api.internal.com/customers/@{body('Parse_Message')?['customerId']}"
        },
        "runAfter": { "Parse_Message": ["Succeeded"] }
      },
      "Send_To_EventHub": {
        "type": "ServiceProvider",
        "inputs": {
          "parameters": {
            "eventHubName": "processed-orders",
            "content": {
              "order": "@body('Parse_Message')",
              "customer": "@body('Enrich_Order')",
              "processedAt": "@utcNow()"
            }
          },
          "serviceProviderConfiguration": {
            "connectionName": "eventHub",
            "operationId": "sendEvent",
            "serviceProviderId": "/serviceProviders/eventHub"
          }
        },
        "runAfter": { "Enrich_Order": ["Succeeded"] }
      }
    }
  },
  "kind": "Stateful"
}
```

### 12.4 Scatter-Gather (Parallel Processing)

ForEach with parallel execution and result aggregation:
```json
"Process_Items_Parallel": {
  "type": "Foreach",
  "foreach": "@body('Get_Items')?['value']",
  "actions": {
    "Call_Service": {
      "type": "Http",
      "inputs": {
        "method": "POST",
        "uri": "https://api.example.com/process",
        "body": "@items('Process_Items_Parallel')"
      },
      "runAfter": {}
    }
  },
  "runtimeConfiguration": {
    "concurrency": { "repetitions": 20 }
  },
  "runAfter": { "Get_Items": ["Succeeded"] }
},
"Aggregate_Results": {
  "type": "Compose",
  "inputs": "@actionOutputs('Process_Items_Parallel')",
  "runAfter": { "Process_Items_Parallel": ["Succeeded"] }
}
```

### 12.5 Content-Based Routing

Switch on message content to route to different processors:
```json
"Route_Message": {
  "type": "Switch",
  "expression": "@triggerBody()?['messageType']",
  "cases": {
    "ORDER": {
      "case": "ORDER",
      "actions": {
        "Process_Order": {
          "type": "Http",
          "inputs": { "method": "POST", "uri": "https://api.example.com/orders", "body": "@triggerBody()" },
          "runAfter": {}
        }
      }
    },
    "INVOICE": {
      "case": "INVOICE",
      "actions": {
        "Process_Invoice": {
          "type": "Http",
          "inputs": { "method": "POST", "uri": "https://api.example.com/invoices", "body": "@triggerBody()" },
          "runAfter": {}
        }
      }
    },
    "SHIPMENT": {
      "case": "SHIPMENT",
      "actions": {
        "Process_Shipment": {
          "type": "Http",
          "inputs": { "method": "POST", "uri": "https://api.example.com/shipments", "body": "@triggerBody()" },
          "runAfter": {}
        }
      }
    }
  },
  "default": {
    "actions": {
      "Dead_Letter": {
        "type": "ServiceProvider",
        "inputs": {
          "parameters": { "queueName": "unrouted-messages", "content": "@triggerBody()" },
          "serviceProviderConfiguration": {
            "connectionName": "serviceBus",
            "operationId": "sendMessage",
            "serviceProviderId": "/serviceProviders/serviceBus"
          }
        },
        "runAfter": {}
      }
    }
  },
  "runAfter": {}
}
```

### 12.6 B2B EDI Pattern

Receive AS2 → Decode X12 → Transform → Process → Encode → Send AS2:
```json
{
  "actions": {
    "Decode_AS2": {
      "type": "AS2Decode",
      "inputs": {
        "content": "@triggerBody()",
        "headers": "@triggerOutputs()['headers']",
        "integrationAccount": {}
      },
      "runAfter": {}
    },
    "Decode_X12": {
      "type": "X12Decode",
      "inputs": {
        "content": "@body('Decode_AS2')?['payload']",
        "integrationAccount": {}
      },
      "runAfter": { "Decode_AS2": ["Succeeded"] }
    },
    "Validate_Schema": {
      "type": "XmlValidation",
      "inputs": {
        "content": "@body('Decode_X12')",
        "integrationAccount": {
          "schema": { "name": "PurchaseOrder_850.xsd" }
        }
      },
      "runAfter": { "Decode_X12": ["Succeeded"] }
    },
    "Transform_To_Internal": {
      "type": "Xslt",
      "inputs": {
        "content": "@body('Validate_Schema')",
        "integrationAccount": {
          "map": { "name": "X12_850_to_InternalOrder.xslt" }
        }
      },
      "runAfter": { "Validate_Schema": ["Succeeded"] }
    },
    "Process_Order": {
      "type": "Http",
      "inputs": {
        "method": "POST",
        "uri": "https://erp.internal.com/api/orders",
        "body": "@body('Transform_To_Internal')"
      },
      "runAfter": { "Transform_To_Internal": ["Succeeded"] }
    },
    "Encode_X12_Response": {
      "type": "X12Encode",
      "inputs": {
        "content": "@body('Process_Order')?['acknowledgment']",
        "integrationAccount": {}
      },
      "runAfter": { "Process_Order": ["Succeeded"] }
    },
    "Encode_AS2_Response": {
      "type": "AS2Encode",
      "inputs": {
        "content": "@body('Encode_X12_Response')",
        "integrationAccount": {}
      },
      "runAfter": { "Encode_X12_Response": ["Succeeded"] }
    },
    "Send_AS2": {
      "type": "Http",
      "inputs": {
        "method": "POST",
        "uri": "https://partner.example.com/as2/receive",
        "headers": "@body('Encode_AS2_Response')?['headers']",
        "body": "@body('Encode_AS2_Response')?['payload']"
      },
      "runAfter": { "Encode_AS2_Response": ["Succeeded"] }
    }
  }
}
```

### 12.7 Retry with Dead-Letter

Scope try/catch with dead-letter queue for persistent failures:
```json
{
  "actions": {
    "Try_Process": {
      "type": "Scope",
      "actions": {
        "Call_API": {
          "type": "Http",
          "inputs": {
            "method": "POST",
            "uri": "https://api.example.com/process",
            "body": "@triggerBody()",
            "retryPolicy": { "type": "exponential", "count": 3, "interval": "PT10S" }
          },
          "runAfter": {}
        }
      },
      "runAfter": {}
    },
    "Dead_Letter_On_Failure": {
      "type": "Scope",
      "actions": {
        "Send_To_Dead_Letter": {
          "type": "ServiceProvider",
          "inputs": {
            "parameters": {
              "queueName": "dead-letter",
              "content": {
                "originalMessage": "@triggerBody()",
                "error": "@result('Try_Process')",
                "failedAt": "@utcNow()",
                "workflowRunId": "@workflow()['run']?['name']"
              }
            },
            "serviceProviderConfiguration": {
              "connectionName": "serviceBus",
              "operationId": "sendMessage",
              "serviceProviderId": "/serviceProviders/serviceBus"
            }
          },
          "runAfter": {}
        },
        "Send_Alert": {
          "type": "Http",
          "inputs": {
            "method": "POST",
            "uri": "https://hooks.slack.com/services/xxx",
            "body": {
              "text": "Dead-letter: @{triggerBody()?['id']} failed after retries"
            }
          },
          "runAfter": { "Send_To_Dead_Letter": ["Succeeded"] }
        }
      },
      "runAfter": {
        "Try_Process": ["Failed", "TimedOut"]
      }
    }
  }
}
```

### 12.8 Batch Processing

**Batch trigger** — collect messages and release on count or schedule:

*Batch sender workflow*:
```json
"Send_To_Batch": {
  "type": "SendToBatch",
  "inputs": {
    "batchName": "OrderBatch",
    "content": "@triggerBody()",
    "host": {
      "triggerName": "Batch_Trigger",
      "workflow": {
        "id": "/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Logic/workflows/batch-receiver"
      }
    }
  }
}
```

*Batch receiver workflow*:
```json
"triggers": {
  "Batch_Trigger": {
    "type": "Batch",
    "inputs": {
      "configurations": {
        "OrderBatch": {
          "releaseCriteria": {
            "messageCount": 100,
            "recurrence": {
              "frequency": "Minute",
              "interval": 15
            }
          }
        }
      }
    }
  }
}
```


## Reference Files

For deeper dives into specific topics, see:
- [Workflow Definition Language](./references/workflow-definition-language.md) — Complete WDL schemas and all action types
- [Connectors: Built-in vs Managed](./references/connectors-built-in-vs-managed.md) — Connector catalog, pricing, auth, gateway
- [Mainstream Connectors](./references/mainstream-connectors.md) — Teams, Outlook, SharePoint, Dataverse, SQL, Power BI/Fabric, Service Bus, Event Hubs — WDL examples, CLI deploy fixes, throttling limits
- [Integration Accounts & B2B](./references/integration-accounts-b2b.md) — Trading partners, AS2/X12/EDIFACT, schemas, maps
- [Deployment & CI/CD](./references/deployment-cicd.md) — ARM, Bicep, CLI, GitHub Actions, Azure DevOps
- [Monitoring & Diagnostics](./references/monitoring-diagnostics.md) — Run history, KQL queries, metrics, alerts
- [Migration: ISE to Standard](./references/migration-ise-to-standard.md) — ISE deprecation, feature parity, migration steps
