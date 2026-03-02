---
name: power-automate-flows
description: >
  Expert knowledge of creating and managing Power Automate cloud flows programmatically
  via the Dataverse Web API — flow definition authoring, connection references, trigger/action
  schemas, expression language, error handling, CI/CD provisioning, and Office Script integration.
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
dependencies: []
triggers:
  - power automate flow
  - create flow
  - flow definition
  - clientdata
  - dataverse workflow
  - POST workflows
  - cloud flow api
  - flow provisioning
  - automate deployment
  - flow template
  - ARM definition
  - connection reference
  - HTTP trigger flow
  - run script action
  - create-flow
---

# Power Automate Flows — Programmatic Creation & Management

Create, manage, and deploy Power Automate cloud flows programmatically using the Dataverse Web API, the Power Automate Management connector, and HTTP trigger patterns.

## When to Activate

- User asks to create a Power Automate flow via API or code
- User wants to generate a flow definition JSON (`clientdata`)
- User asks about the Dataverse `workflows` endpoint
- User wants CI/CD provisioning of flows across environments
- User asks to wire an Office Script to a Power Automate trigger
- User wants to expose a flow as an HTTP API
- User asks about connection references, trigger types, or action schemas

## Core Concept: Flows Are Dataverse Workflow Records

Cloud flows are stored as rows in the Dataverse `workflow` table. Creating a flow means POSTing a record with:

| Field | Value | Purpose |
|-------|-------|---------|
| `category` | `5` | Cloud flow |
| `type` | `1` | Definition (not instance) |
| `primaryentity` | `"none"` | For instant/automated/scheduled flows |
| `name` | `string` | Display name of the flow |
| `description` | `string` | Optional description |
| `clientdata` | `JSON string` | The entire flow definition and connection references |
| `statecode` | `0` | Created as Draft/Off |

After creation, the flow must be **enabled** via a separate PATCH call.

## Dataverse Web API — Complete Reference

**Base URL**: `https://{org}.crm.dynamics.com/api/data/v9.2/workflows`

### API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/data/v9.2/workflows` | Create flow |
| PATCH | `/api/data/v9.2/workflows({workflowid})` | Update flow (enable/disable/modify) |
| DELETE | `/api/data/v9.2/workflows({workflowid})` | Delete flow |
| GET | `/api/data/v9.2/workflows?$filter=category eq 5` | List cloud flows |
| GET | `/api/data/v9.2/workflows({workflowid})` | Get flow details |
| GET | `/api/data/v9.2/workflows({workflowid})?$select=clientdata` | Get flow definition |

### Create a Flow

```json
POST /api/data/v9.2/workflows
Content-Type: application/json
Authorization: Bearer {access_token}

{
  "category": 5,
  "type": 1,
  "primaryentity": "none",
  "name": "Daily Excel Report Generator",
  "description": "Runs Office Script daily to generate sales report",
  "clientdata": "{...escaped JSON string...}"
}
```

### Enable a Flow

```json
PATCH /api/data/v9.2/workflows({workflowid})
{
  "statecode": 1,
  "statuscode": 2
}
```

### Disable a Flow

```json
PATCH /api/data/v9.2/workflows({workflowid})
{
  "statecode": 0,
  "statuscode": 1
}
```

### OData Query Reference

```
# List active cloud flows
$filter=category eq 5 and statecode eq 1
&$select=name,statecode,workflowid,modifiedon,createdon
&$orderby=modifiedon desc
&$top=50

# List flows by owner
$filter=category eq 5 and _ownerid_value eq '{userId}'
&$expand=ownerid($select=fullname)

# Search flows by name
$filter=category eq 5 and contains(name, 'Excel')
```

## The `clientdata` Structure

The `clientdata` field contains a JSON string with the complete flow definition:

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
      "triggers": { },
      "actions": { },
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

### Key Elements

| Element | Purpose |
|---------|---------|
| `definition.$schema` | Always the Logic Apps 2016-06-01 schema |
| `definition.parameters` | `$connections` and `$authentication` — standard for all flows |
| `definition.triggers` | Exactly one trigger (HTTP, Recurrence, connector-based) |
| `definition.actions` | One or more actions (Run script, HTTP, Compose, Condition, etc.) |
| `connectionReferences` | Maps logical names to actual connector API IDs |
| `schemaVersion` | Always `"1.0.0.0"` |

See `references/flow-definition-schema.md` for the complete trigger/action/connection schema.

## Trigger Types

| Trigger | `type` | `kind` | Use Case |
|---------|--------|--------|----------|
| Manual button | `Request` | `Button` | Instant flow, run from Power Automate UI |
| HTTP webhook | `Request` | `Http` | Call flow from external app via URL |
| Recurrence | `Recurrence` | — | Scheduled (e.g., daily at 8 AM) |
| Connector | `OpenApiConnectionWebhook` | — | Event from SharePoint, Outlook, Forms, etc. |

### Recurrence Trigger Definition

```json
{
  "Recurrence": {
    "type": "Recurrence",
    "recurrence": {
      "frequency": "Day",
      "interval": 1,
      "startTime": "2026-03-01T08:00:00Z",
      "timeZone": "Central Standard Time",
      "schedule": {
        "hours": ["8"],
        "minutes": ["0"]
      }
    }
  }
}
```

### HTTP Trigger Definition

```json
{
  "manual": {
    "type": "Request",
    "kind": "Http",
    "inputs": {
      "schema": {
        "type": "object",
        "properties": {
          "fileName": { "type": "string" },
          "sheetName": { "type": "string" }
        },
        "required": ["fileName"]
      },
      "method": "POST"
    }
  }
}
```

### SharePoint Trigger Definition

```json
{
  "When_an_item_is_created": {
    "type": "OpenApiConnectionWebhook",
    "inputs": {
      "host": {
        "connectionName": "shared_sharepointonline",
        "operationId": "SubscribeWebhookTrigger_V2",
        "apiId": "/providers/Microsoft.PowerApps/apis/shared_sharepointonline"
      },
      "parameters": {
        "dataset": "https://contoso.sharepoint.com/sites/project",
        "table": "{listId}"
      },
      "authentication": "@parameters('$authentication')"
    }
  }
}
```

## Action Types

| Action | `type` | Use Case |
|--------|--------|----------|
| Run Office Script | `OpenApiConnection` (operationId: `RunScript`) | Execute `.osts` in Excel workbook |
| HTTP request | `Http` | Call external APIs |
| Compose | `Compose` | Transform/build data |
| Condition | `If` | Branching logic |
| Apply to each | `Foreach` | Loop over arrays |
| Send email | `OpenApiConnection` (Office 365 Outlook) | Notifications |
| Create item | `OpenApiConnection` (SharePoint/Dataverse) | Write to lists/tables |
| Initialize variable | `InitializeVariable` | Declare flow variable |
| Set variable | `SetVariable` | Update flow variable |
| Scope | `Scope` | Group actions (try/catch pattern) |
| Terminate | `Terminate` | End flow with status |

### Run Office Script Action Definition

```json
{
  "Run_script": {
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
        "ScriptParameters/sheetName": "Sheet1",
        "ScriptParameters/startRow": 2
      },
      "authentication": "@parameters('$authentication')"
    },
    "runAfter": {}
  }
}
```

### HTTP Action Definition

```json
{
  "Call_External_API": {
    "type": "Http",
    "inputs": {
      "method": "GET",
      "uri": "https://api.example.com/data",
      "headers": {
        "Authorization": "Bearer @{variables('apiToken')}",
        "Accept": "application/json"
      },
      "retryPolicy": {
        "type": "exponential",
        "count": 3,
        "interval": "PT10S",
        "minimumInterval": "PT5S",
        "maximumInterval": "PT1H"
      }
    },
    "runAfter": {}
  }
}
```

### Condition (If) Action Definition

```json
{
  "Check_result": {
    "type": "If",
    "expression": {
      "and": [
        {
          "greater": [
            "@outputs('Run_script')?['body/result/rowCount']",
            0
          ]
        }
      ]
    },
    "actions": {
      "Send_success_email": { }
    },
    "else": {
      "actions": {
        "Send_no_data_email": { }
      }
    },
    "runAfter": {
      "Run_script": ["Succeeded"]
    }
  }
}
```

## Connection Reference Catalog

| Connector | Reference Key | API ID |
|-----------|--------------|--------|
| Excel Online (Business) | `shared_excelonlinebusiness` | `/providers/Microsoft.PowerApps/apis/shared_excelonlinebusiness` |
| SharePoint | `shared_sharepointonline` | `/providers/Microsoft.PowerApps/apis/shared_sharepointonline` |
| Office 365 Outlook | `shared_office365` | `/providers/Microsoft.PowerApps/apis/shared_office365` |
| Microsoft Teams | `shared_teams` | `/providers/Microsoft.PowerApps/apis/shared_teams` |
| Dataverse | `shared_commondataserviceforapps` | `/providers/Microsoft.PowerApps/apis/shared_commondataserviceforapps` |
| OneDrive for Business | `shared_onedriveforbusiness` | `/providers/Microsoft.PowerApps/apis/shared_onedriveforbusiness` |
| HTTP | (none — native) | N/A |
| Approvals | `shared_approvals` | `/providers/Microsoft.PowerApps/apis/shared_approvals` |

### Connection Reference Template

```json
{
  "shared_excelonlinebusiness": {
    "connectionName": "shared-excelonlinebusi-{guid}",
    "source": "Invoker",
    "id": "/providers/Microsoft.PowerApps/apis/shared_excelonlinebusiness",
    "tier": "NotSpecified"
  }
}
```

**`source` values:** `Invoker` (run-as invoking user), `EmbeddedConnection` (run-as connection owner).

## Expression Language Reference

Common expressions for use in action inputs:

| Expression | Purpose | Example |
|-----------|---------|---------|
| `@triggerOutputs()` | Access trigger output | `@triggerOutputs()?['body']` |
| `@outputs('ActionName')` | Access action output | `@outputs('Run_script')?['body/result']` |
| `@variables('name')` | Access variable | `@variables('rowCount')` |
| `@utcNow()` | Current UTC timestamp | `2026-03-01T12:00:00Z` |
| `@formatDateTime()` | Format date | `@formatDateTime(utcNow(), 'yyyy-MM-dd')` |
| `@json()` | Parse JSON string | `@json(outputs('Compose'))` |
| `@concat()` | Concatenate strings | `@concat('Report-', utcNow())` |
| `@length()` | Array/string length | `@length(outputs('Get_rows')?['body/value'])` |
| `@if()` | Inline conditional | `@if(equals(variables('status'), 'Active'), 'Yes', 'No')` |
| `@coalesce()` | First non-null value | `@coalesce(triggerBody()?['name'], 'Default')` |

## Authentication

All Dataverse API calls require an Azure AD OAuth 2.0 token:

```typescript
import { ClientSecretCredential } from "@azure/identity";

const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
const token = await credential.getToken("https://{org}.crm.dynamics.com/.default");
```

### Required App Registration Permissions

| Permission | Type | Purpose |
|-----------|------|---------|
| `user_impersonation` (Dynamics CRM) | Delegated | Access Dataverse as signed-in user |
| Dataverse application user | Application | Service principal access to Dataverse |

## Error Handling

### Dataverse API Errors

| Status | Code | Cause | Fix |
|--------|------|-------|-----|
| 400 | `BadRequest` | Invalid `clientdata` JSON, missing required fields | Validate JSON structure |
| 401 | `Unauthorized` | Expired or invalid token | Refresh OAuth token |
| 403 | `Forbidden` | Insufficient Dataverse security role | Add Environment Maker role |
| 404 | `NotFound` | Workflow ID does not exist | Verify workflowid GUID |
| 409 | `Conflict` | Flow name already exists in environment | Use unique name |
| 429 | `TooManyRequests` | Dataverse API throttle limit | Wait per `Retry-After` header |

### Flow Run Errors

| Error Code | Cause | Resolution |
|-----------|-------|------------|
| `ActionFailed` | An action within the flow failed | Check action error message |
| `TriggerFailed` | Trigger could not fire | Verify connection and permissions |
| `WorkflowRunActionRepetitionFailed` | Loop iteration failed | Check individual iteration errors |
| `InvalidTemplate` | `clientdata` schema is invalid | Validate against Logic Apps schema |
| `ConnectionAuthorizationFailed` | Connection expired | Re-authenticate connector |

### Retry Policy Configuration

```json
{
  "retryPolicy": {
    "type": "exponential",
    "count": 4,
    "interval": "PT10S",
    "minimumInterval": "PT5S",
    "maximumInterval": "PT1H"
  }
}
```

**Retry types:** `none`, `fixed`, `exponential`. Default: `exponential` with 4 retries.

### Scope-Based Error Handling (Try/Catch)

```json
{
  "Try_Scope": {
    "type": "Scope",
    "actions": {
      "Run_script": { },
      "Process_results": { }
    }
  },
  "Catch_Scope": {
    "type": "Scope",
    "actions": {
      "Send_error_notification": { }
    },
    "runAfter": {
      "Try_Scope": ["Failed", "TimedOut"]
    }
  },
  "Finally_Scope": {
    "type": "Scope",
    "actions": {
      "Log_completion": { }
    },
    "runAfter": {
      "Catch_Scope": ["Succeeded", "Failed", "Skipped"]
    }
  }
}
```

### `runAfter` Status Values

| Status | Description |
|--------|-------------|
| `Succeeded` | Previous action completed successfully |
| `Failed` | Previous action failed |
| `Skipped` | Previous action was skipped |
| `TimedOut` | Previous action timed out |

## Common Deployment Patterns

### Pattern 1: Office Script + Scheduled Flow

1. Build `clientdata` with Recurrence trigger (daily at 8 AM)
2. Add "Run script" action targeting the Excel workbook and script
3. Add condition to check script return value
4. Add email notification for success/failure
5. `POST /api/data/v9.2/workflows` → `PATCH` to enable
6. Test via manual trigger before enabling schedule

### Pattern 2: HTTP API Flow

1. Build `clientdata` with HTTP Request trigger (POST with JSON schema)
2. Add "Run script" action passing trigger body parameters
3. Add "Response" action to return script results
4. `POST /api/data/v9.2/workflows` → `PATCH` to enable
5. Retrieve the generated trigger URL from the flow properties
6. Call the URL from external applications

### Pattern 3: Multi-Environment CI/CD Deployment

1. Build `clientdata` template with parameterized connection references
2. Store template in source control (Git)
3. For each environment: substitute connection names and IDs
4. `POST /api/data/v9.2/workflows` to create in target environment
5. `PATCH` to enable after validation
6. Run integration tests against the deployed flow

### Pattern 4: Event-Driven Excel Processing

1. Build `clientdata` with SharePoint trigger ("When file is created in folder")
2. Add "Get file metadata" to retrieve the new file's drive/item IDs
3. Add "Run script" action with dynamic drive/file parameters
4. Add error handling scope with Teams notification on failure
5. Add "Move file" action to archive folder on success
6. Deploy and test with sample file upload

## Quick Checklist for Creating a Flow via API

1. Register Azure AD app with Dataverse permissions
2. Obtain OAuth 2.0 access token
3. Build the `clientdata` JSON with definition + connectionReferences
4. `POST /api/data/v9.2/workflows` with category=5, type=1, clientdata
5. Capture the returned `workflowid`
6. `PATCH /api/data/v9.2/workflows({workflowid})` to enable (statecode=1)
7. Test the flow from Power Automate portal or via its trigger URL

## Reference Files

| Resource | Path | Content |
|----------|------|---------|
| Dataverse Web API | `references/dataverse-web-api.md` | Full CRUD, auth, TypeScript helpers |
| Flow Definition Schema | `references/flow-definition-schema.md` | Triggers, actions, connections, parameters |
| Management Connector | `references/management-connector.md` | PA Management connector + HTTP trigger patterns |
| Office Script Flows | `examples/office-script-flows.md` | Flows that run Office Scripts |
| CI/CD Provisioning | `examples/ci-cd-provisioning.md` | Template deploy, environment promotion |
| Complete Payloads | `examples/complete-payloads.md` | Full clientdata for common scenarios |
