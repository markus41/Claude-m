---
name: power-automate-flows
description: "Expert knowledge of creating and managing Power Automate cloud flows programmatically via the Dataverse Web API, including flow definition authoring, connection references, trigger/action schemas, and CI/CD provisioning"
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

## Dataverse Web API — Quick Reference

**Base URL**: `https://{org}.crm.dynamics.com/api/data/v9.2/workflows`

### Create a Flow

```http
POST /api/data/v9.2/workflows
Content-Type: application/json
Authorization: Bearer {access_token}

{
  "category": 5,
  "type": 1,
  "primaryentity": "none",
  "name": "My Flow",
  "description": "Created via API",
  "clientdata": "{...escaped JSON string...}"
}
```

### Enable a Flow

```http
PATCH /api/data/v9.2/workflows({workflowid})
Content-Type: application/json

{
  "statecode": 1,
  "statuscode": 2
}
```

### Disable / Delete

```http
# Disable
PATCH /api/data/v9.2/workflows({workflowid})
{ "statecode": 0, "statuscode": 1 }

# Delete
DELETE /api/data/v9.2/workflows({workflowid})
```

### List Flows

```http
GET /api/data/v9.2/workflows?$filter=category eq 5&$select=name,statecode,createdon
```

See `references/dataverse-web-api.md` for auth setup, TypeScript helpers, and full CRUD examples.

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
      "triggers": { "...trigger definition..." },
      "actions": { "...action definitions..." },
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

## Common Trigger Types

| Trigger | `type` | `kind` | Use Case |
|---------|--------|--------|----------|
| Manual button | `Request` | `Button` | Instant flow, run from Power Automate UI |
| HTTP webhook | `Request` | `Http` | Call flow from external app via URL |
| Recurrence | `Recurrence` | — | Scheduled (e.g., daily at 8 AM) |
| Connector | `OpenApiConnectionWebhook` | — | Event from SharePoint, Outlook, Forms, etc. |

## Common Action Types

| Action | `type` | Use Case |
|--------|--------|----------|
| Run Office Script | `OpenApiConnection` (operationId: `RunScript`) | Execute `.osts` in Excel workbook |
| HTTP request | `Http` | Call external APIs |
| Compose | `Compose` | Transform/build data |
| Condition | `If` | Branching logic |
| Apply to each | `Foreach` | Loop over arrays |
| Send email | `OpenApiConnection` (Office 365 Outlook) | Notifications |
| Create item | `OpenApiConnection` (SharePoint/Dataverse) | Write to lists/tables |

## Authentication

All Dataverse API calls require an Azure AD OAuth 2.0 token:

1. **Register an app** in Azure AD with Dataverse permissions (`user_impersonation` or application permissions)
2. **Get a token** via client credentials or authorization code flow
3. **Use the token** in the `Authorization: Bearer {token}` header

```typescript
// TypeScript with @azure/identity
import { ClientSecretCredential } from "@azure/identity";

const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
const token = await credential.getToken("https://{org}.crm.dynamics.com/.default");
```

See `references/dataverse-web-api.md` for full auth patterns.

## Power Automate Management Connector

For creating flows from **within** Power Automate or Power Apps:

- Connector: `flowmanagement`
- Action: **Create Flow** — accepts environment name + flow payload
- Useful for template-based provisioning from a "meta" flow

See `references/management-connector.md` for connector patterns and HTTP trigger exposure.

## Tying It Together: Office Script + Flow

A very common pattern: create a flow that runs an Office Script on a schedule or trigger.

The action definition for "Run script" looks like:

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
        "ScriptParameters/param1": "value1"
      },
      "authentication": "@parameters('$authentication')"
    }
  }
}
```

See `examples/office-script-flows.md` for complete payloads.

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
