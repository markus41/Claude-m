# Power Automate Management Connector & HTTP Trigger Patterns

## Power Automate Management Connector

The **Power Automate Management** connector (`flowmanagement`) allows creating, listing, and managing flows from within Power Automate itself or from Power Apps.

### Connector Details

| Property | Value |
|----------|-------|
| Connector name | `flowmanagement` |
| API ID | `/providers/Microsoft.PowerApps/apis/shared_flowmanagement` |
| Auth type | Delegated (user context) |
| Premium | No (included with Power Automate license) |

### Key Actions

| Action | Operation ID | Description |
|--------|-------------|-------------|
| Create Flow | `CreateFlow` | Create a new flow in a specified environment |
| List Flows | `ListFlows` | List flows the user owns or has access to |
| Get Flow | `GetFlow` | Get details of a specific flow |
| Delete Flow | `DeleteFlow` | Delete a flow |
| Enable Flow | `EnableFlow` | Turn on a flow |
| Disable Flow | `DisableFlow` | Turn off a flow |
| List Flow Runs | `ListFlowRuns` | Get execution history |

### Create Flow Action

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `environmentName` | string | Yes | Environment ID (e.g., `Default-{tenantId}`) |
| `FlowWithConnectionReferences` | object | Yes | Full flow payload with definition and connections |

**Flow payload structure:**

```json
{
  "properties": {
    "displayName": "My New Flow",
    "definition": {
      "$schema": "https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#",
      "contentVersion": "1.0.0.0",
      "parameters": {
        "$connections": { "defaultValue": {}, "type": "Object" },
        "$authentication": { "defaultValue": {}, "type": "SecureObject" }
      },
      "triggers": { "...": "..." },
      "actions": { "...": "..." }
    },
    "connectionReferences": {
      "shared_excelonlinebusiness": {
        "connectionName": "{existing-connection-guid}",
        "id": "/providers/Microsoft.PowerApps/apis/shared_excelonlinebusiness"
      }
    }
  }
}
```

### Use Case: Meta-Flow for Template Provisioning

Create a "provisioner" flow that creates other flows from templates:

```json
{
  "triggers": {
    "manual": {
      "type": "Request",
      "kind": "Button",
      "inputs": {
        "schema": {
          "type": "object",
          "properties": {
            "flowName": { "type": "string", "title": "Flow Name" },
            "templateId": { "type": "string", "title": "Template ID" }
          },
          "required": ["flowName", "templateId"]
        }
      }
    }
  },
  "actions": {
    "Get_template": {
      "type": "Compose",
      "inputs": "...template lookup logic..."
    },
    "Create_flow_from_template": {
      "type": "OpenApiConnection",
      "inputs": {
        "host": {
          "connectionName": "shared_flowmanagement",
          "operationId": "CreateFlow",
          "apiId": "/providers/Microsoft.PowerApps/apis/shared_flowmanagement"
        },
        "parameters": {
          "environmentName": "Default-{tenantId}",
          "FlowWithConnectionReferences": "@outputs('Get_template')"
        },
        "authentication": "@parameters('$authentication')"
      },
      "runAfter": { "Get_template": ["Succeeded"] }
    }
  }
}
```

### From Power Apps

```
PowerAutomateManagement.CreateFlow(
  "Default-{tenantId}",
  {
    properties: {
      displayName: TextInput1.Text,
      definition: ParseJSON(flowDefinitionJSON),
      connectionReferences: ParseJSON(connectionRefsJSON)
    }
  }
)
```

## Exposing Flows as HTTP APIs

Create a flow with an HTTP Request trigger, then call it from any client.

### Pattern 1: Simple HTTP API

**Flow definition (HTTP trigger + response):**

```json
{
  "properties": {
    "definition": {
      "$schema": "https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#",
      "contentVersion": "1.0.0.0",
      "parameters": {
        "$connections": { "defaultValue": {}, "type": "Object" },
        "$authentication": { "defaultValue": {}, "type": "SecureObject" }
      },
      "triggers": {
        "When_a_HTTP_request_is_received": {
          "type": "Request",
          "kind": "Http",
          "inputs": {
            "schema": {
              "type": "object",
              "properties": {
                "action": { "type": "string" },
                "data": { "type": "object" }
              }
            },
            "method": "POST"
          }
        }
      },
      "actions": {
        "Process_request": {
          "type": "OpenApiConnection",
          "inputs": {
            "host": {
              "connectionName": "shared_excelonlinebusiness",
              "operationId": "RunScript",
              "apiId": "/providers/Microsoft.PowerApps/apis/shared_excelonlinebusiness"
            },
            "parameters": {
              "source": "me",
              "drive": "{driveId}",
              "file": "{fileId}",
              "scriptId": "{scriptId}",
              "ScriptParameters/inputData": "@{triggerBody()}"
            },
            "authentication": "@parameters('$authentication')"
          },
          "runAfter": {}
        },
        "Return_result": {
          "type": "Response",
          "kind": "Http",
          "inputs": {
            "statusCode": 200,
            "headers": { "Content-Type": "application/json" },
            "body": "@outputs('Process_request')?['body/result']"
          },
          "runAfter": { "Process_request": ["Succeeded"] }
        },
        "Return_error": {
          "type": "Response",
          "kind": "Http",
          "inputs": {
            "statusCode": 500,
            "body": {
              "error": "Script execution failed",
              "details": "@outputs('Process_request')"
            }
          },
          "runAfter": { "Process_request": ["Failed"] }
        }
      },
      "outputs": {}
    },
    "connectionReferences": {
      "shared_excelonlinebusiness": {
        "connectionName": "shared-excelonlinebusi-{guid}",
        "source": "Invoker",
        "id": "/providers/Microsoft.PowerApps/apis/shared_excelonlinebusiness",
        "tier": "NotSpecified"
      }
    }
  },
  "schemaVersion": "1.0.0.0"
}
```

### Calling the HTTP Trigger

After the flow is enabled, get the trigger URL from the flow properties (or via API).

**curl:**

```bash
curl -X POST "https://prod-XX.westus.logic.azure.com:443/workflows/{id}/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig={signature}" \
  -H "Content-Type: application/json" \
  -d '{"action": "process", "data": {"orderId": "ORD-123"}}'
```

**TypeScript:**

```typescript
async function callFlowApi(triggerUrl: string, payload: unknown): Promise<unknown> {
  const response = await fetch(triggerUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Flow API error: ${response.status}`);
  }

  return response.json();
}

// Usage
const result = await callFlowApi(
  "https://prod-XX.westus.logic.azure.com/workflows/{id}/triggers/...",
  { action: "process", data: { orderId: "ORD-123" } }
);
```

### Getting the Trigger URL Programmatically

After creating and enabling a flow, retrieve the trigger URL:

```http
POST /api/data/v9.2/workflows({workflowid})/Microsoft.Dynamics.CRM.GetCallbackUrl
Content-Type: application/json
Authorization: Bearer {token}
```

Or via the Power Automate REST API:

```http
GET https://api.flow.microsoft.com/providers/Microsoft.ProcessSimple/environments/{envId}/flows/{flowId}/triggers/manual/listCallbackUrl?api-version=2016-11-01
Authorization: Bearer {token}
```

### Pattern 2: API Management Facade

For production APIs, front the flow with Azure API Management:

1. Create the HTTP-triggered flow
2. Create an API Management API that routes to the flow trigger URL
3. Apply APIM policies (rate limiting, auth, transformation)
4. Expose a clean REST endpoint (e.g., `https://api.contoso.com/v1/orders`)

Benefits:
- Stable URL (flow trigger URLs change if you recreate the flow)
- API keys, OAuth, IP filtering
- Request/response transformation
- Rate limiting and throttling
- OpenAPI/Swagger documentation

### Pattern 3: Webhook Subscription

Create a flow that acts as a webhook endpoint:

```json
"triggers": {
  "webhook": {
    "type": "Request",
    "kind": "Http",
    "inputs": {
      "schema": {
        "type": "object",
        "properties": {
          "event": { "type": "string" },
          "timestamp": { "type": "string" },
          "payload": { "type": "object" }
        }
      },
      "method": "POST"
    }
  }
}
```

Register the flow's trigger URL with external services (GitHub webhooks, Stripe events, etc.).

## Security Considerations

### HTTP Trigger URLs

- Trigger URLs contain a SAS signature — treat them as secrets
- URLs are unguessable but not authenticated (anyone with the URL can call the flow)
- For sensitive flows, add validation inside the flow (check a shared secret header)

### Connection References

- `source: "Invoker"` — flow runs with the owner's connections (their identity)
- If the flow owner's account is disabled, flows stop working
- For CI/CD, consider using service accounts as flow owners

### Environment Security

- Use separate environments for dev/test/prod
- Apply DLP policies to restrict which connectors can be used together
- Use security roles to control who can create and manage flows

## Limits

| Limit | Value |
|-------|-------|
| HTTP request body | 100 MB |
| HTTP response timeout | 120 seconds (sync), 30 days (async with webhook) |
| Flow runs per 5 min | 100,000 (per flow) |
| Actions per flow | 500 |
| Nesting depth | 8 levels |
| Trigger URL validity | Permanent (until flow is deleted or recreated) |
| Concurrent runs | Configurable (1-100, default 50) |
