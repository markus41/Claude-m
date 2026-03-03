# Custom Connectors Reference

## Overview

Custom connectors wrap external REST APIs for use in Power Apps, Power Automate, and Copilot Studio. They are defined using OpenAPI (Swagger 2.0) and support multiple authentication types, custom code policies, action and trigger definitions, and throttling policies. This reference covers the full OpenAPI definition, all authentication types, connector actions vs triggers, code policy, sharing, certified connector submission, throttling, and connection references.

---

## OpenAPI Definition Structure

Custom connectors use OpenAPI 2.0 (Swagger) format.

```json
{
  "swagger": "2.0",
  "info": {
    "title": "Contoso Inventory API",
    "description": "Manage inventory items and stock levels in Contoso's ERP system",
    "version": "1.0",
    "contact": {
      "name": "Contoso IT",
      "email": "api-support@contoso.com"
    }
  },
  "host": "api.contoso.com",
  "basePath": "/v1",
  "schemes": ["https"],
  "consumes": ["application/json"],
  "produces": ["application/json"],
  "securityDefinitions": {
    "oauth2_auth": {
      "type": "oauth2",
      "flow": "accessCode",
      "authorizationUrl": "https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize",
      "tokenUrl": "https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token",
      "scopes": {
        "https://api.contoso.com/inventory.read": "Read inventory data",
        "https://api.contoso.com/inventory.write": "Write inventory data"
      }
    }
  },
  "security": [
    {
      "oauth2_auth": ["https://api.contoso.com/inventory.read"]
    }
  ],
  "paths": {
    "/items": {
      "get": {
        "summary": "List inventory items",
        "description": "Returns a paginated list of inventory items",
        "operationId": "ListInventoryItems",
        "x-ms-visibility": "important",
        "parameters": [
          {
            "name": "category",
            "in": "query",
            "required": false,
            "type": "string",
            "description": "Filter by category",
            "x-ms-summary": "Category"
          },
          {
            "name": "$top",
            "in": "query",
            "required": false,
            "type": "integer",
            "default": 50,
            "x-ms-summary": "Max Items"
          }
        ],
        "responses": {
          "200": {
            "description": "List of inventory items",
            "schema": {
              "type": "object",
              "properties": {
                "value": {
                  "type": "array",
                  "items": { "$ref": "#/definitions/InventoryItem" }
                },
                "nextLink": { "type": "string" }
              }
            }
          },
          "401": { "description": "Unauthorized" },
          "429": { "description": "Too Many Requests" }
        }
      },
      "post": {
        "summary": "Create inventory item",
        "operationId": "CreateInventoryItem",
        "x-ms-visibility": "important",
        "parameters": [
          {
            "name": "body",
            "in": "body",
            "required": true,
            "schema": { "$ref": "#/definitions/InventoryItemCreate" }
          }
        ],
        "responses": {
          "201": {
            "description": "Item created",
            "schema": { "$ref": "#/definitions/InventoryItem" }
          }
        }
      }
    },
    "/items/{itemId}": {
      "get": {
        "summary": "Get inventory item",
        "operationId": "GetInventoryItem",
        "parameters": [
          {
            "name": "itemId",
            "in": "path",
            "required": true,
            "type": "string",
            "x-ms-summary": "Item ID"
          }
        ],
        "responses": {
          "200": {
            "description": "Inventory item",
            "schema": { "$ref": "#/definitions/InventoryItem" }
          },
          "404": { "description": "Not Found" }
        }
      }
    }
  },
  "definitions": {
    "InventoryItem": {
      "type": "object",
      "properties": {
        "id": { "type": "string", "description": "Unique item ID" },
        "sku": { "type": "string", "description": "Stock keeping unit" },
        "name": { "type": "string", "description": "Item name", "x-ms-summary": "Name" },
        "quantity": { "type": "integer", "description": "Current stock quantity" },
        "category": { "type": "string" },
        "lastUpdated": { "type": "string", "format": "date-time" }
      }
    },
    "InventoryItemCreate": {
      "type": "object",
      "required": ["sku", "name"],
      "properties": {
        "sku": { "type": "string" },
        "name": { "type": "string" },
        "quantity": { "type": "integer", "default": 0 },
        "category": { "type": "string" }
      }
    }
  }
}
```

### x-ms Extension Properties
| Extension | Purpose |
|---|---|
| `x-ms-visibility: "important"` | Show action prominently in connector list |
| `x-ms-visibility: "advanced"` | Hide action under "Show more" |
| `x-ms-visibility: "internal"` | Hide action from UI (internal use only) |
| `x-ms-summary: "Label"` | Override display label for a parameter |
| `x-ms-dynamic-values` | Populate dropdown from another action |
| `x-ms-dynamic-schema` | Fetch schema dynamically from the API |

---

## Authentication Types

### OAuth 2.0 — Authorization Code (Most Common)

```json
"securityDefinitions": {
  "oauth2_auth": {
    "type": "oauth2",
    "flow": "accessCode",
    "authorizationUrl": "https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize",
    "tokenUrl": "https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token",
    "refreshUrl": "https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token",
    "scopes": {
      "https://api.contoso.com/.default": "Full access"
    }
  }
}
```

**Required in Azure AD app registration**:
- Reply URL: `https://global.consent.azure-apim.net/redirect` (for Power Platform connectors)
- Grant type: Authorization Code

### OAuth 2.0 — Client Credentials (Service-to-Service)

```json
"securityDefinitions": {
  "oauth2_cc": {
    "type": "oauth2",
    "flow": "application",
    "tokenUrl": "https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token",
    "scopes": {
      "https://api.contoso.com/.default": "Application access"
    }
  }
}
```

Used for flows that run without user interaction. The connector stores `client_id` and `client_secret` in the connection.

### API Key

```json
"securityDefinitions": {
  "api_key": {
    "type": "apiKey",
    "in": "header",
    "name": "X-API-Key"
  }
}
```

The user enters their API key when creating a connection. The key is stored encrypted and sent with every request.

### Basic Authentication

```json
"securityDefinitions": {
  "basic_auth": {
    "type": "basic"
  }
}
```

The user provides a username and password. Credentials are base64-encoded and sent as `Authorization: Basic <encoded>`.

### Windows Authentication (On-Premises Data Gateway)

Used with the on-premises data gateway to authenticate against Windows services (e.g., on-prem REST APIs).

```json
"securityDefinitions": {
  "windows_auth": {
    "type": "apiKey",
    "in": "header",
    "name": "Authorization"
  }
}
```

Configure in the connector settings to use the gateway. The gateway handles Windows NTLM/Kerberos negotiation.

### No Authentication

```json
"securityDefinitions": {}
```

For public APIs or APIs that use query-parameter-based authentication (included in policy transforms).

---

## Connector Actions vs Triggers

### Actions

Actions are synchronous request-response operations. The flow waits for the action to complete.

```json
// Standard action — synchronous
"post": {
  "operationId": "CreateTask",
  "summary": "Create a task",
  "x-ms-visibility": "important",
  "parameters": [ ... ],
  "responses": {
    "200": { "description": "Task created", "schema": { "$ref": "#/definitions/Task" } }
  }
}
```

### Webhook Triggers

Webhook triggers are long-lived — they register a callback URL with the API and wait for the API to notify them.

```json
// Webhook trigger
"post": {
  "operationId": "WhenTaskCreated",
  "summary": "When a task is created",
  "x-ms-trigger": "single",
  "parameters": [
    {
      "name": "body",
      "in": "body",
      "schema": {
        "type": "object",
        "properties": {
          "callbackUrl": {
            "type": "string",
            "x-ms-notification-url": true,
            "x-ms-visibility": "internal",
            "title": "Callback URL"
          }
        },
        "required": ["callbackUrl"]
      }
    }
  ],
  "responses": {
    "201": { "description": "Webhook registered" }
  }
}
```

The API must store the `callbackUrl` and POST to it when the event occurs. When the flow is deleted, Power Platform sends a DELETE to the same URL — implement a delete handler to unregister the webhook.

### Polling Triggers

For APIs that don't support webhooks, use polling triggers. Power Platform calls the action on a schedule.

```json
"get": {
  "operationId": "PollNewTasks",
  "summary": "When new tasks are available",
  "x-ms-trigger": "batch",
  "x-ms-trigger-hint": "To see it work now, add a task.",
  "parameters": [
    {
      "name": "since",
      "in": "query",
      "type": "string",
      "format": "date-time",
      "x-ms-visibility": "internal",
      "x-ms-scheduler-recommendation": "@{coalesce(triggers().outputs?.body?['@odata.nextLink'], '')}",
      "description": "Return tasks created after this timestamp"
    }
  ],
  "responses": {
    "200": {
      "description": "New tasks",
      "schema": {
        "type": "array",
        "items": { "$ref": "#/definitions/Task" }
      }
    },
    "202": { "description": "No new data — try again later" }
  }
}
```

Return `202 Accepted` when there are no new items — this signals Power Platform to back off.

---

## Code Policy (C# Script)

Custom code policies allow request/response manipulation using C# scripting. Useful for transforming legacy API responses, injecting headers, or handling non-standard authentication.

```csharp
public class Script : ScriptBase
{
    public override async Task<HttpResponseMessage> ExecuteAsync()
    {
        // Modify the outgoing request
        var requestContent = await this.Context.Request.Content.ReadAsStringAsync();
        var requestJson = JObject.Parse(requestContent);

        // Add a computed field
        requestJson["timestamp"] = DateTime.UtcNow.ToString("o");
        requestJson["requestId"] = Guid.NewGuid().ToString();

        this.Context.Request.Content = CreateJsonContent(requestJson.ToString());

        // Forward the request
        var response = await this.Context.SendAsync(
            this.Context.Request,
            this.CancellationToken
        ).ConfigureAwait(false);

        // Modify the response
        if (response.IsSuccessStatusCode)
        {
            var responseContent = await response.Content.ReadAsStringAsync();
            var responseJson = JObject.Parse(responseContent);

            // Flatten a nested response
            if (responseJson["data"] != null)
            {
                response.Content = CreateJsonContent(responseJson["data"].ToString());
            }
        }

        return response;
    }
}
```

**Policy template alternatives** (no-code):
- Set Host URL — override target URL based on connection parameter
- Route request — path-based routing to different backends
- Set header — inject static headers (e.g., API version headers)
- Convert JSON to object — parse string fields into typed objects

---

## Sharing Connectors

| Sharing Method | Scope | Notes |
|---|---|---|
| Share with specific users | Named users in tenant | Users see connector in their apps and flows |
| Share with everyone in tenant | Tenant-wide | All makers can use the connector |
| Export as solution component | Solution package | Include in managed/unmanaged solution for deployment |
| Certified connector (ISV) | Public — all tenants | Requires Microsoft certification; appears in standard connector list |

```powershell
# Share connector with all tenant users via PAC CLI
pac connector share \
  --connector-name "cr_ContosoInventory" \
  --principal-type "Tenant"

# Export connector in a solution
pac solution export --name ContosoCRM --path ./ContosoCRM.zip
```

---

## Certified Connector Submission

To publish a connector to the public Power Platform connector catalog:

1. Fork the [Microsoft Power Platform Connectors](https://github.com/microsoft/PowerPlatformConnectors) repository.
2. Create a folder under `independent-publisher-connectors/` (Independent Publisher) or `certified-connectors/` (ISV with direct API access).
3. Include:
   - `apiDefinition.swagger.json` — OpenAPI definition
   - `apiProperties.json` — Display metadata, icon, brand color
   - `README.md` — Documentation
   - `icon.png` — 1:1 aspect ratio, 100x100px minimum
4. Submit a Pull Request against the `dev` branch.
5. Microsoft reviews and tests the connector — typical review time 2-6 weeks.

```json
// apiProperties.json example
{
  "properties": {
    "displayName": "Contoso Inventory",
    "description": "Manage inventory items in Contoso ERP",
    "iconBrandColor": "#0078d4",
    "capabilities": ["actions", "triggers"],
    "pricingModel": "Free",
    "isCustomApi": false,
    "backendService": {
      "serviceUrl": "https://api.contoso.com/v1"
    },
    "publisher": "Contoso Ltd",
    "stackOwner": "Contoso Ltd"
  }
}
```

---

## Throttling Policies

Custom connectors support throttling configuration to protect the backend API.

| Policy Type | Where Configured | Default |
|---|---|---|
| Connection throttle | Connector settings | 500 requests / 60 seconds |
| Retry policy | Per-connector | Exponential backoff — 2 retries |
| Timeout | Per-connector | 100 seconds per request |

### Standard Connector Throttle Limits

| Connector | API Calls | Window | Notes |
|---|---|---|---|
| SharePoint | 600 | 60 seconds | Per connection |
| Outlook | 300 | 60 seconds | Per connection |
| Dataverse | 6,000 | 5 minutes | Per user |
| Custom Connector (default) | 500 | 60 seconds | Configurable |
| Teams | 200 | 60 seconds | Per connection |
| HTTP | No fixed limit | — | Platform burst cap applies |

Custom connector throttle limits are configured per connector, not per action. To change limits for a custom connector, submit a support request or update the connector policy in the maker portal.

---

## Connection References

Connection references decouple the concrete connection (credentials) from the connector usage in flows and apps. They enable the same solution to work across environments without editing flows.

### How Connection References Work

1. Flow or app references a **connection reference** (not a connection directly).
2. Connection reference maps to a **connector type** (e.g., SharePoint, custom connector).
3. On import to a new environment, the importer maps the connection reference to a new connection with appropriate credentials.

### Creating a Connection Reference

```powershell
# Via Dataverse Web API
POST /api/data/v9.2/connectionreferences
{
  "connectionreferencedisplayname": "Contoso Inventory Connection",
  "connectorid": "/providers/Microsoft.PowerApps/apis/shared_contosoInventory",
  "connectionid": "/providers/Microsoft.PowerApps/apis/shared_contosoInventory/connections/{connectionId}",
  "cr_websiteid@odata.bind": "/adx_websites({website-id})"
}
```

### In Solution YAML

```yaml
# Solution component reference for connection reference
connectionreference:
  contosoInventoryRef:
    componentType: ConnectionReference
    connectorId: /providers/Microsoft.PowerApps/apis/shared_contosoInventory
    isCustomizable: true
```

### Connection Reference Best Practices
- Always create one connection reference per connector type per solution.
- Never hardcode connections in flows — use connection references exclusively.
- Naming convention: `{ConnectorName} - {Purpose}` (e.g., `SharePoint - Document Library`).
- In CI/CD pipelines, use the `pac solution set-connection-reference` command to map connection references non-interactively.

---

## Error Codes and Conditions

| Code / Condition | Meaning | Remediation |
|---|---|---|
| `401 Unauthorized` on first call | OAuth token not acquired; consent not granted | Re-create the connection; ensure reply URL is registered in Azure AD |
| `403 Forbidden` after auth | Scope not granted; insufficient permissions | Check token scopes; re-consent with admin if using admin scopes |
| `429 Too Many Requests` | Connector throttle limit exceeded | Add delays between calls; reduce `foreach` concurrency in Power Automate |
| `Invalid OpenAPI definition` | Swagger validation error in connector portal | Run `apiDefinition.swagger.json` through the Swagger editor at editor.swagger.io |
| `AADSTS700051` | `response_type` not enabled | Enable "Access tokens" in the Azure AD app registration under Authentication |
| `AADSTS70011` | Invalid scope | Verify scope format matches what is registered in the API's app registration |
| Connector not visible in flow | Not shared with the user; not in same environment | Share connector with user; verify both flow and connector are in same environment |
| Connection reference mapping fails on import | Target environment connection not created | Create the connection manually before importing; use `pac solution set-connection-reference` |
| Code policy compilation error | C# syntax error in script | Test in the connector code editor; check for missing `using` directives |

---

## Limits Table

| Resource | Limit | Notes |
|---|---|---|
| Actions per connector | 500 | Practical limit for usability |
| Triggers per connector | No hard limit | Webhook and polling supported |
| Request payload size | 100 MB | Per connector action |
| Response payload size | 100 MB | Chunked transfer for large files |
| Connection references per solution | 200 | Hard platform limit |
| OpenAPI definition file size | 1 MB | Keep definitions concise |
| Code policy script size | 1 MB | C# script per connector |
| Shared custom connectors per environment | No hard limit | License limits apply |
| Connector sharing: users per connector | No hard limit | Tenant-wide share is most scalable |
