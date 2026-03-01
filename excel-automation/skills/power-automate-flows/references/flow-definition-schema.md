# Flow Definition Schema

Complete reference for the ARM-style flow definition inside the `clientdata` field. This is the same schema used by Azure Logic Apps.

## Top-Level Structure

```json
{
  "properties": {
    "definition": {
      "$schema": "https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#",
      "contentVersion": "1.0.0.0",
      "parameters": {},
      "triggers": {},
      "actions": {},
      "outputs": {}
    },
    "connectionReferences": {}
  },
  "schemaVersion": "1.0.0.0"
}
```

## Parameters

Every flow needs at least the two standard parameters for connections and authentication:

```json
"parameters": {
  "$connections": {
    "defaultValue": {},
    "type": "Object"
  },
  "$authentication": {
    "defaultValue": {},
    "type": "SecureObject"
  }
}
```

### Custom Parameters

For flows that accept input at creation time (environment-specific config):

```json
"parameters": {
  "$connections": { "defaultValue": {}, "type": "Object" },
  "$authentication": { "defaultValue": {}, "type": "SecureObject" },
  "siteUrl": {
    "defaultValue": "https://contoso.sharepoint.com/sites/Sales",
    "type": "String",
    "metadata": {
      "schemaId": "EnvVariable",
      "description": "SharePoint site URL"
    }
  }
}
```

## Triggers

Every flow has exactly one trigger. The trigger name can be anything (e.g., `"manual"`, `"When_a_new_item_is_created"`, `"recurrence"`).

### Manual Button Trigger (Instant)

For flows triggered by the "Run" button in Power Automate UI:

```json
"triggers": {
  "manual": {
    "type": "Request",
    "kind": "Button",
    "inputs": {
      "schema": {
        "type": "object",
        "properties": {
          "text": { "title": "Sheet Name", "type": "string", "x-ms-dynamically-added": true },
          "number": { "title": "Row Count", "type": "number", "x-ms-dynamically-added": true },
          "boolean": { "title": "Clear First", "type": "boolean", "x-ms-dynamically-added": true }
        },
        "required": ["text"]
      }
    }
  }
}
```

### HTTP Request Trigger (Webhook)

For flows called from external applications via URL:

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
          "items": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "name": { "type": "string" },
                "qty": { "type": "integer" }
              }
            }
          }
        },
        "required": ["orderId"]
      },
      "method": "POST"
    }
  }
}
```

After creating and enabling this flow, Power Automate generates a trigger URL like:
```
https://prod-XX.westus.logic.azure.com:443/workflows/{id}/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig={signature}
```

### Recurrence Trigger (Scheduled)

```json
"triggers": {
  "Recurrence": {
    "type": "Recurrence",
    "recurrence": {
      "frequency": "Day",
      "interval": 1,
      "schedule": {
        "hours": ["8"],
        "minutes": ["0"]
      },
      "timeZone": "Eastern Standard Time"
    }
  }
}
```

**Frequency options:** `Month`, `Week`, `Day`, `Hour`, `Minute`, `Second`

### Connector-Based Trigger (Automated)

Example: When a file is created in SharePoint:

```json
"triggers": {
  "When_a_file_is_created_in_a_folder": {
    "type": "OpenApiConnectionWebhook",
    "inputs": {
      "host": {
        "connectionName": "shared_sharepointonline",
        "operationId": "OnNewFileInFolder",
        "apiId": "/providers/Microsoft.PowerApps/apis/shared_sharepointonline"
      },
      "parameters": {
        "dataset": "https://contoso.sharepoint.com/sites/Sales",
        "folderId": "/Shared Documents/Reports"
      },
      "authentication": "@parameters('$authentication')"
    }
  }
}
```

## Actions

Actions are defined as a map where keys are action names (which become step names in the UI).

### Run Office Script

The core action for Excel automation:

```json
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
      "scriptId": "{scriptId}"
    },
    "authentication": "@parameters('$authentication')"
  },
  "runAfter": {}
}
```

With script parameters:

```json
"parameters": {
  "source": "me",
  "drive": "{driveId}",
  "file": "{fileId}",
  "scriptId": "{scriptId}",
  "ScriptParameters/sheetName": "Sheet1",
  "ScriptParameters/startRow": 1,
  "ScriptParameters/clearFirst": true
}
```

**How to find IDs:**
- `driveId`: Use Microsoft Graph API `GET /me/drives`
- `fileId`: Use Graph `GET /me/drive/root:/{path}:/`
- `scriptId`: Found in the script's `.osts` metadata or via the Office Scripts API

### Run Office Script from SharePoint

```json
"Run_script_from_SharePoint_library": {
  "type": "OpenApiConnection",
  "inputs": {
    "host": {
      "connectionName": "shared_excelonlinebusiness",
      "operationId": "RunScriptFromSharePointLibrary",
      "apiId": "/providers/Microsoft.PowerApps/apis/shared_excelonlinebusiness"
    },
    "parameters": {
      "source": "sites/contoso.sharepoint.com,{siteId},{webId}",
      "drive": "{driveId}",
      "file": "{fileId}",
      "scriptId": "{scriptId}"
    },
    "authentication": "@parameters('$authentication')"
  }
}
```

### HTTP Action

Call an external API:

```json
"Call_API": {
  "type": "Http",
  "inputs": {
    "method": "GET",
    "uri": "https://api.example.com/data",
    "headers": {
      "Content-Type": "application/json",
      "Authorization": "Bearer @{variables('apiToken')}"
    }
  },
  "runAfter": {}
}
```

### Compose

Build a value or transform data:

```json
"Build_payload": {
  "type": "Compose",
  "inputs": {
    "orderId": "@triggerBody()?['orderId']",
    "processedAt": "@utcNow()",
    "total": "@mul(triggerBody()?['quantity'], triggerBody()?['price'])"
  },
  "runAfter": {}
}
```

### Condition (If/Else)

```json
"Check_result": {
  "type": "If",
  "expression": {
    "and": [
      {
        "equals": [
          "@outputs('Run_script')?['body/result/success']",
          true
        ]
      }
    ]
  },
  "actions": {
    "Send_success_email": { "...": "..." }
  },
  "else": {
    "actions": {
      "Send_failure_email": { "...": "..." }
    }
  },
  "runAfter": {
    "Run_script": ["Succeeded"]
  }
}
```

### Apply to Each (Loop)

```json
"Process_each_item": {
  "type": "Foreach",
  "foreach": "@outputs('Run_script')?['body/result']",
  "actions": {
    "Create_item": {
      "type": "OpenApiConnection",
      "inputs": {
        "host": {
          "connectionName": "shared_sharepointonline",
          "operationId": "PostItem",
          "apiId": "/providers/Microsoft.PowerApps/apis/shared_sharepointonline"
        },
        "parameters": {
          "dataset": "https://contoso.sharepoint.com/sites/Sales",
          "table": "Orders",
          "item/Title": "@items('Process_each_item')?['name']",
          "item/Amount": "@items('Process_each_item')?['amount']"
        },
        "authentication": "@parameters('$authentication')"
      }
    }
  },
  "runAfter": {
    "Run_script": ["Succeeded"]
  }
}
```

### Initialize Variable

```json
"Initialize_counter": {
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
}
```

### Send Email (Office 365 Outlook)

```json
"Send_email": {
  "type": "OpenApiConnection",
  "inputs": {
    "host": {
      "connectionName": "shared_office365",
      "operationId": "SendEmailV2",
      "apiId": "/providers/Microsoft.PowerApps/apis/shared_office365"
    },
    "parameters": {
      "emailMessage/To": "admin@contoso.com",
      "emailMessage/Subject": "Flow completed: @{outputs('Run_script')?['body/result/message']}",
      "emailMessage/Body": "<p>Processed @{outputs('Run_script')?['body/result/rowCount']} rows.</p>",
      "emailMessage/Importance": "Normal"
    },
    "authentication": "@parameters('$authentication')"
  },
  "runAfter": {
    "Run_script": ["Succeeded"]
  }
}
```

### Response (For HTTP-Triggered Flows)

Return data to the caller:

```json
"Response": {
  "type": "Response",
  "kind": "Http",
  "inputs": {
    "statusCode": 200,
    "headers": {
      "Content-Type": "application/json"
    },
    "body": {
      "status": "success",
      "result": "@outputs('Run_script')?['body/result']"
    }
  },
  "runAfter": {
    "Run_script": ["Succeeded"]
  }
}
```

## Action Sequencing: `runAfter`

The `runAfter` property controls action execution order:

```json
"Step_B": {
  "runAfter": {
    "Step_A": ["Succeeded"]
  }
}
```

**Status values:** `Succeeded`, `Failed`, `Skipped`, `TimedOut`

**Parallel actions:** Multiple actions with `"runAfter": {}` (or same predecessor) run in parallel.

**Multiple predecessors:**

```json
"Final_step": {
  "runAfter": {
    "Step_A": ["Succeeded"],
    "Step_B": ["Succeeded"]
  }
}
```

**Run on failure:**

```json
"Error_handler": {
  "runAfter": {
    "Risky_step": ["Failed", "TimedOut"]
  }
}
```

## Connection References

Maps logical connector names used in actions to actual Power Platform connector API IDs:

```json
"connectionReferences": {
  "shared_excelonlinebusiness": {
    "connectionName": "shared-excelonlinebusi-{guid}",
    "source": "Invoker",
    "id": "/providers/Microsoft.PowerApps/apis/shared_excelonlinebusiness",
    "tier": "NotSpecified"
  },
  "shared_office365": {
    "connectionName": "shared-office365-{guid}",
    "source": "Invoker",
    "id": "/providers/Microsoft.PowerApps/apis/shared_office365",
    "tier": "NotSpecified"
  },
  "shared_sharepointonline": {
    "connectionName": "shared-sharepointonlin-{guid}",
    "source": "Invoker",
    "id": "/providers/Microsoft.PowerApps/apis/shared_sharepointonline",
    "tier": "NotSpecified"
  }
}
```

### Common Connector API IDs

| Connector | API ID |
|-----------|--------|
| Excel Online (Business) | `/providers/Microsoft.PowerApps/apis/shared_excelonlinebusiness` |
| Office 365 Outlook | `/providers/Microsoft.PowerApps/apis/shared_office365` |
| SharePoint | `/providers/Microsoft.PowerApps/apis/shared_sharepointonline` |
| Microsoft Teams | `/providers/Microsoft.PowerApps/apis/shared_teams` |
| Dataverse | `/providers/Microsoft.PowerApps/apis/shared_commondataserviceforapps` |
| OneDrive for Business | `/providers/Microsoft.PowerApps/apis/shared_onedriveforbusiness` |
| Outlook.com | `/providers/Microsoft.PowerApps/apis/shared_outlook` |
| Forms | `/providers/Microsoft.PowerApps/apis/shared_microsoftforms` |
| Approvals | `/providers/Microsoft.PowerApps/apis/shared_approvals` |
| Power Automate Management | `/providers/Microsoft.PowerApps/apis/shared_flowmanagement` |

### Source Types

| Source | Meaning |
|--------|---------|
| `Invoker` | Uses the running user's connection (delegated) |
| `Embedded` | Uses an embedded connection (service principal) |

For CI/CD provisioning, use `Invoker` — the flow owner's connections are used at runtime. The `connectionName` value must match an existing connection in the target environment.

## Expressions

Flow expressions use the Workflow Definition Language (same as Logic Apps):

| Expression | Example | Result |
|-----------|---------|--------|
| Trigger body | `@triggerBody()?['orderId']` | Input from trigger |
| Action output | `@outputs('Run_script')?['body/result']` | Output from action |
| Current time | `@utcNow()` | ISO 8601 timestamp |
| String concat | `@concat('Hello ', triggerBody()?['name'])` | Combined string |
| Math | `@add(1, 2)`, `@mul(5, 10)` | Arithmetic |
| Conditional | `@if(equals(x, y), 'yes', 'no')` | Ternary |
| Array item | `@items('ForEach_loop')?['field']` | Current loop item |
| Variable | `@variables('counter')` | Variable value |
| Format | `@formatDateTime(utcNow(), 'yyyy-MM-dd')` | Formatted date |
| Convert | `@int('42')`, `@string(42)` | Type conversion |
| JSON | `@json(outputs('Compose'))` | Parse JSON |
