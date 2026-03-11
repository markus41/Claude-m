---
name: la-create
description: "Create a new Logic App workflow with trigger selection (Request, Recurrence, Service Bus, Blob, Event Hub)"
argument-hint: "<trigger-type> --name <workflow-name> [--stateless]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

# Create a New Logic App Workflow

Generate a new workflow definition file with the selected trigger type using the Workflow Definition Language (WDL).

## Instructions

### 1. Validate Inputs

- `<trigger-type>` — One of: `request`, `recurrence`, `servicebus`, `blob`, `eventhub`, `eventgrid`, `http-webhook`. Ask if not provided.
- `--name` — Workflow name (used for the directory name). Must be lowercase alphanumeric with hyphens. Ask if not provided.
- `--stateless` — If present, create a stateless workflow (lower latency, no run history persistence). Default is stateful.

### 2. Create Workflow Directory

```bash
mkdir -p <workflow-name>
```

Each workflow in a Standard Logic App lives in its own directory with a `workflow.json` file.

### 3. Generate workflow.json Based on Trigger Type

**Request trigger (HTTP)**:
```json
{
  "definition": {
    "$schema": "https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#",
    "contentVersion": "1.0.0.0",
    "triggers": {
      "When_a_HTTP_request_is_received": {
        "type": "Request",
        "kind": "Http",
        "inputs": {
          "method": "POST",
          "schema": {
            "type": "object",
            "properties": {
              "name": { "type": "string" },
              "message": { "type": "string" }
            }
          }
        }
      }
    },
    "actions": {
      "Response": {
        "type": "Response",
        "kind": "Http",
        "runAfter": {},
        "inputs": {
          "statusCode": 200,
          "body": {
            "status": "received",
            "timestamp": "@{utcNow()}"
          }
        }
      }
    },
    "outputs": {}
  },
  "kind": "Stateful"
}
```

**Recurrence trigger**:
```json
{
  "definition": {
    "$schema": "https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#",
    "contentVersion": "1.0.0.0",
    "triggers": {
      "Recurrence": {
        "type": "Recurrence",
        "recurrence": {
          "frequency": "Hour",
          "interval": 1,
          "timeZone": "UTC"
        }
      }
    },
    "actions": {
      "Compose_Timestamp": {
        "type": "Compose",
        "runAfter": {},
        "inputs": "@utcNow()"
      }
    },
    "outputs": {}
  },
  "kind": "Stateful"
}
```

**Service Bus trigger**:
```json
{
  "definition": {
    "$schema": "https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#",
    "contentVersion": "1.0.0.0",
    "triggers": {
      "When_messages_are_available_in_a_queue": {
        "type": "ServiceProvider",
        "kind": "ServiceBus",
        "inputs": {
          "parameters": {
            "queueName": "<queue-name>",
            "isSessionsEnabled": false
          },
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
        "runAfter": {},
        "inputs": {
          "content": "@triggerBody()?['contentData']",
          "schema": {
            "type": "object",
            "properties": {}
          }
        }
      }
    },
    "outputs": {}
  },
  "kind": "Stateful"
}
```

If `--stateless` is specified, set `"kind": "Stateless"` in the workflow.json root.

### 4. Add Placeholder Action After Trigger

If the generated template does not already include a follow-up action, add a `Compose` action as a placeholder that references the trigger output:

```json
"Compose": {
  "type": "Compose",
  "runAfter": {},
  "inputs": "@triggerBody()"
}
```

### 5. Update Connection References

If the trigger requires a connection (Service Bus, Event Hub, Blob), ensure a `connections.json` file exists in the project root with the appropriate connection configuration:

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

Add the corresponding app setting to `local.settings.json` if not already present.

### 6. Alternative: Create Consumption Logic App via CLI

If the user is creating a Consumption Logic App (not Standard), generate the workflow.json and deploy directly:

```bash
# Create Consumption Logic App directly from definition
az logic workflow create \
  --resource-group <rg-name> \
  --name <app-name> \
  --location <region> \
  --definition @<workflow-name>/workflow.json \
  --state Enabled

# Verify creation
az logic workflow show \
  --resource-group <rg-name> --name <app-name> \
  --query "{name:name, state:properties.state, endpoint:properties.accessEndpoint}" \
  --output table

# Get trigger callback URL for testing
az rest --method POST \
  --url "https://management.azure.com/subscriptions/<sub-id>/resourceGroups/<rg-name>/providers/Microsoft.Logic/workflows/<app-name>/triggers/manual/listCallbackUrl?api-version=2016-06-01" \
  --body '{}'
```

### 7. Display Summary

Show the user:
- Created file path: `<workflow-name>/workflow.json`
- Trigger type and configuration
- Stateful vs stateless mode
- Required connection settings
- How to test locally: `func host start`, then invoke the trigger
- Next steps: add actions with the workflow designer, configure connectors with `/la-connector-config`, deploy with `/la-deploy`
