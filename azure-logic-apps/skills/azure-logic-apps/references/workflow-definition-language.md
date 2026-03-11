# Workflow Definition Language (WDL) Reference

## Workflow JSON Top-Level Schema

```json
{
  "$schema": "https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {},
  "triggers": {},
  "actions": {},
  "outputs": {},
  "staticResults": {}
}
```

| Property | Required | Description |
|---|---|---|
| `$schema` | Yes | URI to the WDL JSON schema version. Always use `2016-06-01`. |
| `contentVersion` | Yes | Semantic version string. Convention is `1.0.0.0`. |
| `parameters` | No | Key-value map of parameters consumed at design time or runtime. |
| `triggers` | Yes | Exactly one trigger for Consumption; one or more for Standard. |
| `actions` | Yes | Map of named actions that form the workflow graph. |
| `outputs` | No | Values returned after a successful workflow run completes. |
| `staticResults` | No | Mock response definitions used during testing. |

## Parameters Definition and Reference

Supported types: `String`, `SecureString`, `Int`, `Float`, `Bool`, `Array`, `Object`, `SecureObject`.

```json
"parameters": {
  "environmentName": { "type": "String", "defaultValue": "production", "allowedValues": ["development", "staging", "production"] },
  "apiEndpoint": { "type": "String" },
  "maxRetries": { "type": "Int", "defaultValue": 3 },
  "enableNotifications": { "type": "Bool", "defaultValue": true },
  "servicePassword": { "type": "SecureString" }
}
```

Reference: `@parameters('environmentName')` or interpolated `@{parameters('apiEndpoint')}/api/v1`.

## Template Expression Syntax

Expressions use `@` prefix or `@{...}` interpolation inside JSON string values.

```
@triggerBody()                              -- full trigger body
@triggerOutputs()['headers']['Content-Type'] -- trigger response header
@body('Parse_JSON')?['orderId']            -- parsed JSON property (null-safe)
@variables('counter')                       -- variable reference
@parameters('apiEndpoint')                  -- parameter reference
@concat('Hello, ', triggerBody()?['name'])  -- function call
@if(equals(variables('status'),'active'), 'Yes', 'No')  -- conditional
@coalesce(triggerBody()?['priority'], 'Normal')          -- null coalescing
@formatDateTime(utcNow(), 'yyyy-MM-dd')                 -- date formatting
@json(body('HTTP'))                                      -- parse string to JSON
@setProperty(body('Get_Record'), 'status', 'processed')  -- set object property
@union(variables('listA'), variables('listB'))            -- set union
@chunk(body('Get_Items')?['value'], 100)                 -- split array into chunks
```

## Trigger Schemas

### Request (HTTP webhook)

```json
"triggers": {
  "manual": {
    "type": "Request", "kind": "Http",
    "inputs": { "method": "POST", "relativePath": "/orders/{orderId}", "schema": { "type": "object", "properties": { "customerName": { "type": "string" } }, "required": ["customerName"] } }
  }
}
```

### Recurrence

```json
"triggers": {
  "Recurrence": {
    "type": "Recurrence",
    "recurrence": { "frequency": "Day", "interval": 1, "startTime": "2025-01-01T08:00:00Z", "timeZone": "Eastern Standard Time",
      "schedule": { "hours": [8, 12, 17], "minutes": [0], "weekDays": ["Monday","Tuesday","Wednesday","Thursday","Friday"] } }
  }
}
```

Frequency values: `Second`, `Minute`, `Hour`, `Day`, `Week`, `Month`.

### Service Bus (Standard built-in)

```json
"triggers": {
  "When_messages_are_available": {
    "type": "ServiceProvider", "kind": "ServiceBus",
    "inputs": { "parameters": { "queueName": "orders", "isSessionsEnabled": false },
      "serviceProviderConfiguration": { "connectionName": "serviceBus", "operationId": "receiveQueueMessages", "serviceProviderId": "/serviceProviders/serviceBus" } }
  }
}
```

### Blob Storage (Consumption managed connector)

```json
"triggers": {
  "When_a_blob_is_added": {
    "type": "ApiConnection",
    "inputs": { "host": { "connection": { "name": "@parameters('$connections')['azureblob']['connectionId']" } }, "method": "get",
      "path": "/datasets/default/triggers/batch/onupdatedfile", "queries": { "folderId": "/container/input", "maxFileCount": 10 } },
    "recurrence": { "frequency": "Minute", "interval": 5 }, "splitOn": "@triggerBody()"
  }
}
```

### Event Hub (Standard built-in)

```json
"triggers": {
  "When_events_are_available": {
    "type": "ServiceProvider", "kind": "EventHub",
    "inputs": { "parameters": { "eventHubName": "telemetry-events", "consumerGroup": "$Default" },
      "serviceProviderConfiguration": { "connectionName": "eventHub", "operationId": "receiveEvents", "serviceProviderId": "/serviceProviders/eventHub" } }
  }
}
```

## Action Types

### HTTP

```json
"Call_API": {
  "type": "Http",
  "inputs": { "method": "POST", "uri": "@{parameters('apiEndpoint')}/api/orders",
    "headers": { "Content-Type": "application/json", "Authorization": "Bearer @{body('Get_Token')?['access_token']}" },
    "body": { "orderId": "@triggerBody()?['id']" },
    "retryPolicy": { "type": "exponential", "count": 4, "interval": "PT10S", "minimumInterval": "PT5S", "maximumInterval": "PT1H" },
    "authentication": { "type": "ManagedServiceIdentity", "audience": "https://management.azure.com/" } },
  "runAfter": {}
}
```

Retry policy types: `none`, `fixed`, `exponential`. Intervals use ISO 8601 duration.

### APIConnection / APIConnectionWebhook

```json
"Send_email": {
  "type": "ApiConnection",
  "inputs": { "host": { "connection": { "name": "@parameters('$connections')['office365']['connectionId']" } },
    "method": "post", "path": "/v2/Mail", "body": { "To": "user@example.com", "Subject": "Order confirmed", "Body": "<p>Done.</p>" } },
  "runAfter": { "Process_Order": ["Succeeded"] }
}
```

`ApiConnectionWebhook` adds a `NotificationUrl` via `@{listCallbackUrl()}` for long-running approval patterns.

### Compose / ParseJson

```json
"Build_payload": { "type": "Compose", "inputs": { "id": "@triggerBody()?['id']", "ts": "@utcNow()" }, "runAfter": {} },
"Parse_response": { "type": "ParseJson", "inputs": { "content": "@body('Call_API')", "schema": { "type": "object", "properties": { "id": { "type": "string" }, "status": { "type": "string" } } } }, "runAfter": { "Call_API": ["Succeeded"] } }
```

### Variable Actions

```json
"Init_counter": { "type": "InitializeVariable", "inputs": { "variables": [{ "name": "counter", "type": "integer", "value": 0 }] }, "runAfter": {} },
"Increment": { "type": "IncrementVariable", "inputs": { "name": "counter", "value": 1 }, "runAfter": {} },
"Set_status": { "type": "SetVariable", "inputs": { "name": "status", "value": "complete" }, "runAfter": {} },
"Append_arr": { "type": "AppendToArrayVariable", "inputs": { "name": "results", "value": "@outputs('Build_payload')" }, "runAfter": {} },
"Append_str": { "type": "AppendToStringVariable", "inputs": { "name": "log", "value": "Processed @{items('Loop')?['id']}\n" }, "runAfter": {} }
```

Variable types: `string`, `integer`, `float`, `boolean`, `array`, `object`.

### If (Condition) / Switch

```json
"Check_amount": {
  "type": "If",
  "expression": { "and": [{ "greater": ["@triggerBody()?['amount']", 1000] }, { "equals": ["@triggerBody()?['priority']", "high"] }] },
  "actions": { "High_priority": { "type": "Compose", "inputs": "high", "runAfter": {} } },
  "else": { "actions": { "Standard": { "type": "Compose", "inputs": "standard", "runAfter": {} } } },
  "runAfter": {}
}
```

Condition operators: `equals`, `not`, `greater`, `greaterOrEquals`, `less`, `lessOrEquals`, `contains`, `startsWith`, `endsWith`, `and`, `or`.

```json
"Route_by_region": {
  "type": "Switch", "expression": "@triggerBody()?['region']",
  "cases": { "US": { "case": "us-east", "actions": { "A": { "type": "Compose", "inputs": "US", "runAfter": {} } } } },
  "default": { "actions": { "D": { "type": "Compose", "inputs": "default", "runAfter": {} } } }, "runAfter": {}
}
```

### ForEach / Until

```json
"Process_items": {
  "type": "Foreach", "foreach": "@body('Get_Items')?['value']",
  "actions": { "Transform": { "type": "Compose", "inputs": { "id": "@items('Process_items')?['id']" }, "runAfter": {} } },
  "runtimeConfiguration": { "concurrency": { "repetitions": 20 } }, "runAfter": {}
}
```

Default concurrency: 20 (max 50). Set `"operationOptions": "Sequential"` for serial execution.

```json
"Poll_until_complete": {
  "type": "Until",
  "expression": "@equals(body('Check_Status')?['status'], 'complete')",
  "limit": { "count": 60, "timeout": "PT1H" },
  "actions": {
    "Check_Status": { "type": "Http", "inputs": { "method": "GET", "uri": "@{parameters('apiEndpoint')}/status/@{variables('jobId')}" }, "runAfter": {} },
    "Wait": { "type": "Wait", "inputs": { "interval": { "count": 30, "unit": "Second" } }, "runAfter": { "Check_Status": ["Succeeded"] } }
  }, "runAfter": {}
}
```

### Scope (try-catch pattern)

```json
"Processing_Scope": { "type": "Scope", "actions": { "Validate": { "type": "Compose", "inputs": "ok", "runAfter": {} } }, "runAfter": {} },
"Handle_Failure": { "type": "Compose", "inputs": "Scope failed: @{result('Processing_Scope')}", "runAfter": { "Processing_Scope": ["Failed"] } }
```

### Delay / Response / Terminate / InlineCode / Function / ServiceProvider

```json
"Wait_5min": { "type": "Wait", "inputs": { "interval": { "count": 5, "unit": "Minute" } }, "runAfter": {} },
"Respond": { "type": "Response", "kind": "Http", "inputs": { "statusCode": 200, "headers": { "Content-Type": "application/json" }, "body": { "status": "accepted" } }, "runAfter": {} },
"Fail": { "type": "Terminate", "inputs": { "runStatus": "Failed", "runError": { "code": "ERR", "message": "Validation failed" } }, "runAfter": {} },
"JS_Code": { "type": "JavaScriptCode", "inputs": { "code": "var items = workflowContext.actions.Get_Items.outputs.body.value;\nreturn items.reduce((s,i) => s + i.price * i.qty, 0);" }, "runAfter": {} },
"Call_Func": { "type": "Function", "inputs": { "function": { "id": "/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Web/sites/{app}/functions/{fn}" }, "method": "POST", "body": "@triggerBody()" }, "runAfter": {} },
"Send_SB": { "type": "ServiceProvider", "inputs": { "parameters": { "entityName": "orders", "message": { "contentData": "@outputs('Build_payload')" } }, "serviceProviderConfiguration": { "connectionName": "serviceBus", "operationId": "sendMessage", "serviceProviderId": "/serviceProviders/serviceBus" } }, "runAfter": {} }
```

`runStatus` for Terminate: `Succeeded`, `Failed`, `Cancelled`.

## runAfter Configuration

Controls execution order and failure branching. Every non-root action must declare `runAfter`.

```json
"runAfter": {}                                          // root action (runs first)
"runAfter": { "Previous": ["Succeeded"] }               // success only
"runAfter": { "Previous": ["Failed"] }                  // failure catch
"runAfter": { "Previous": ["Skipped"] }                 // skipped only
"runAfter": { "Previous": ["TimedOut"] }                // timeout only
"runAfter": { "Previous": ["Succeeded", "Failed"] }     // either outcome
"runAfter": { "A": ["Succeeded"], "B": ["Succeeded"] }  // join (wait for both)
"runAfter": { "Scope": ["Failed", "TimedOut"] }          // scope error handler
```

Four status values: `Succeeded`, `Failed`, `Skipped`, `TimedOut`.

## Outputs and Static Results

```json
"outputs": {
  "orderId": { "type": "String", "value": "@body('Parse_response')?['id']" },
  "itemCount": { "type": "Int", "value": "@length(body('Get_Items')?['value'])" }
}
```

```json
"staticResults": {
  "Call_API0": { "status": "Succeeded", "outputs": { "statusCode": 200, "body": { "id": "test-123" } } }
}
```

Enable on an action: `"runtimeConfiguration": { "staticResult": { "name": "Call_API0", "staticResultOptions": "Enabled" } }`.
