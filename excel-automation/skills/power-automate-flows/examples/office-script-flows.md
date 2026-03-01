# Office Script Flow Examples

Complete `clientdata` payloads for flows that run Office Scripts via the Excel Online (Business) connector.

## 1. Scheduled Daily Report

Runs an Office Script every weekday at 8 AM to generate a report.

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
        "Recurrence": {
          "type": "Recurrence",
          "recurrence": {
            "frequency": "Week",
            "interval": 1,
            "schedule": {
              "weekDays": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
              "hours": ["8"],
              "minutes": ["0"]
            },
            "timeZone": "Eastern Standard Time"
          }
        }
      },
      "actions": {
        "Run_report_script": {
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
        },
        "Send_notification": {
          "type": "OpenApiConnection",
          "inputs": {
            "host": {
              "connectionName": "shared_office365",
              "operationId": "SendEmailV2",
              "apiId": "/providers/Microsoft.PowerApps/apis/shared_office365"
            },
            "parameters": {
              "emailMessage/To": "team@contoso.com",
              "emailMessage/Subject": "Daily Report Generated - @{utcNow()}",
              "emailMessage/Body": "<p>The daily sales report has been generated.</p><p>Result: @{outputs('Run_report_script')?['body/result']}</p>",
              "emailMessage/Importance": "Normal"
            },
            "authentication": "@parameters('$authentication')"
          },
          "runAfter": {
            "Run_report_script": ["Succeeded"]
          }
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
      },
      "shared_office365": {
        "connectionName": "shared-office365-{guid}",
        "source": "Invoker",
        "id": "/providers/Microsoft.PowerApps/apis/shared_office365",
        "tier": "NotSpecified"
      }
    }
  },
  "schemaVersion": "1.0.0.0"
}
```

## 2. HTTP-Triggered Script with Parameters and Response

An external app POSTs data, the flow runs an Office Script with those parameters, and returns the result.

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
                "sheetName": { "type": "string" },
                "orders": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "properties": {
                      "orderId": { "type": "string" },
                      "customer": { "type": "string" },
                      "product": { "type": "string" },
                      "quantity": { "type": "integer" },
                      "price": { "type": "number" }
                    }
                  }
                }
              },
              "required": ["sheetName", "orders"]
            },
            "method": "POST"
          }
        }
      },
      "actions": {
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
              "ScriptParameters/sheetName": "@triggerBody()?['sheetName']",
              "ScriptParameters/orders": "@triggerBody()?['orders']"
            },
            "authentication": "@parameters('$authentication')"
          },
          "runAfter": {}
        },
        "Success_response": {
          "type": "Response",
          "kind": "Http",
          "inputs": {
            "statusCode": 200,
            "headers": { "Content-Type": "application/json" },
            "body": {
              "status": "success",
              "result": "@outputs('Run_script')?['body/result']"
            }
          },
          "runAfter": {
            "Run_script": ["Succeeded"]
          }
        },
        "Error_response": {
          "type": "Response",
          "kind": "Http",
          "inputs": {
            "statusCode": 500,
            "headers": { "Content-Type": "application/json" },
            "body": {
              "status": "error",
              "message": "Script execution failed"
            }
          },
          "runAfter": {
            "Run_script": ["Failed", "TimedOut"]
          }
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

**Corresponding Office Script:**

```typescript
/**
 * Processes orders from Power Automate HTTP trigger.
 * @param sheetName Target worksheet
 * @param orders Array of order records
 */
function main(
  workbook: ExcelScript.Workbook,
  sheetName: string,
  orders: OrderInput[]
): ProcessResult {
  let sheet = workbook.getWorksheet(sheetName);
  if (!sheet) {
    return { success: false, message: `Sheet "${sheetName}" not found`, count: 0 };
  }

  let rows: (string | number)[][] = orders.map(o => [
    o.orderId, o.customer, o.product, o.quantity, o.price, o.quantity * o.price
  ]);

  let startRow = (sheet.getUsedRange()?.getRowCount() ?? 0);
  if (startRow === 0) {
    sheet.getRange("A1:F1").setValues([["Order ID", "Customer", "Product", "Qty", "Price", "Total"]]);
    startRow = 1;
  }

  let range = sheet.getRangeByIndexes(startRow, 0, rows.length, 6);
  range.setValues(rows);

  return { success: true, message: "Orders processed", count: orders.length };
}

interface OrderInput {
  orderId: string;
  customer: string;
  product: string;
  quantity: number;
  price: number;
}

interface ProcessResult {
  success: boolean;
  message: string;
  count: number;
}
```

## 3. Manual Button Flow with Input Fields

A flow the user triggers manually from the Power Automate app, passing sheet name and options.

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
        "manual": {
          "type": "Request",
          "kind": "Button",
          "inputs": {
            "schema": {
              "type": "object",
              "properties": {
                "text": {
                  "title": "Sheet Name",
                  "type": "string",
                  "default": "Sheet1",
                  "x-ms-dynamically-added": true
                },
                "boolean": {
                  "title": "Include Charts",
                  "type": "boolean",
                  "default": true,
                  "x-ms-dynamically-added": true
                }
              },
              "required": ["text"]
            }
          }
        }
      },
      "actions": {
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
              "ScriptParameters/sheetName": "@triggerBody()['text']",
              "ScriptParameters/includeCharts": "@triggerBody()['boolean']"
            },
            "authentication": "@parameters('$authentication')"
          },
          "runAfter": {}
        },
        "Notify_user": {
          "type": "OpenApiConnection",
          "inputs": {
            "host": {
              "connectionName": "shared_office365",
              "operationId": "SendEmailV2",
              "apiId": "/providers/Microsoft.PowerApps/apis/shared_office365"
            },
            "parameters": {
              "emailMessage/To": "@outputs('Get_my_profile_(V2)')?['body/mail']",
              "emailMessage/Subject": "Script completed",
              "emailMessage/Body": "<p>Result: @{outputs('Run_script')?['body/result/message']}</p>"
            },
            "authentication": "@parameters('$authentication')"
          },
          "runAfter": {
            "Run_script": ["Succeeded"]
          }
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
      },
      "shared_office365": {
        "connectionName": "shared-office365-{guid}",
        "source": "Invoker",
        "id": "/providers/Microsoft.PowerApps/apis/shared_office365",
        "tier": "NotSpecified"
      }
    }
  },
  "schemaVersion": "1.0.0.0"
}
```

## 4. Forms Submission → Office Script Pipeline

When a Microsoft Forms response is submitted, extract the data and pass it to an Office Script.

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
        "When_a_new_response_is_submitted": {
          "type": "OpenApiConnectionWebhook",
          "inputs": {
            "host": {
              "connectionName": "shared_microsoftforms",
              "operationId": "CreateFormWebhook",
              "apiId": "/providers/Microsoft.PowerApps/apis/shared_microsoftforms"
            },
            "parameters": {
              "form_id": "{formId}"
            },
            "authentication": "@parameters('$authentication')"
          }
        }
      },
      "actions": {
        "Get_response_details": {
          "type": "OpenApiConnection",
          "inputs": {
            "host": {
              "connectionName": "shared_microsoftforms",
              "operationId": "GetFormResponseById",
              "apiId": "/providers/Microsoft.PowerApps/apis/shared_microsoftforms"
            },
            "parameters": {
              "form_id": "{formId}",
              "response_id": "@triggerOutputs()?['body/resourceData/responseId']"
            },
            "authentication": "@parameters('$authentication')"
          },
          "runAfter": {}
        },
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
              "ScriptParameters/respondent": "@outputs('Get_response_details')?['body/responder']",
              "ScriptParameters/name": "@outputs('Get_response_details')?['body/r1']",
              "ScriptParameters/email": "@outputs('Get_response_details')?['body/r2']",
              "ScriptParameters/department": "@outputs('Get_response_details')?['body/r3']"
            },
            "authentication": "@parameters('$authentication')"
          },
          "runAfter": {
            "Get_response_details": ["Succeeded"]
          }
        },
        "Check_duplicate": {
          "type": "If",
          "expression": {
            "and": [
              {
                "equals": [
                  "@outputs('Run_script')?['body/result/isDuplicate']",
                  true
                ]
              }
            ]
          },
          "actions": {
            "Send_duplicate_alert": {
              "type": "OpenApiConnection",
              "inputs": {
                "host": {
                  "connectionName": "shared_office365",
                  "operationId": "SendEmailV2",
                  "apiId": "/providers/Microsoft.PowerApps/apis/shared_office365"
                },
                "parameters": {
                  "emailMessage/To": "admin@contoso.com",
                  "emailMessage/Subject": "Duplicate form submission detected",
                  "emailMessage/Body": "<p>Duplicate entry from @{outputs('Get_response_details')?['body/responder']}</p>"
                },
                "authentication": "@parameters('$authentication')"
              }
            }
          },
          "else": { "actions": {} },
          "runAfter": {
            "Run_script": ["Succeeded"]
          }
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
      },
      "shared_microsoftforms": {
        "connectionName": "shared-microsoftforms-{guid}",
        "source": "Invoker",
        "id": "/providers/Microsoft.PowerApps/apis/shared_microsoftforms",
        "tier": "NotSpecified"
      },
      "shared_office365": {
        "connectionName": "shared-office365-{guid}",
        "source": "Invoker",
        "id": "/providers/Microsoft.PowerApps/apis/shared_office365",
        "tier": "NotSpecified"
      }
    }
  },
  "schemaVersion": "1.0.0.0"
}
```
