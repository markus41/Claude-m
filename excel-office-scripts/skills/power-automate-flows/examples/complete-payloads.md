# Complete Flow Definition Payloads

Ready-to-use `clientdata` JSON payloads for common Power Automate scenarios. Each payload is a complete, valid structure that can be passed to `POST /api/data/v9.2/workflows`.

## 1. Minimal Recurrence Flow (No Connectors)

The simplest possible flow — runs on a schedule with no external connections.

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
            "frequency": "Hour",
            "interval": 1
          }
        }
      },
      "actions": {
        "Compose_timestamp": {
          "type": "Compose",
          "inputs": "@utcNow()",
          "runAfter": {}
        }
      },
      "outputs": {}
    },
    "connectionReferences": {}
  },
  "schemaVersion": "1.0.0.0"
}
```

## 2. HTTP Trigger → HTTP Action (API Proxy)

A flow that receives an HTTP request and forwards it to another API.

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
        "http_trigger": {
          "type": "Request",
          "kind": "Http",
          "inputs": {
            "schema": {
              "type": "object",
              "properties": {
                "endpoint": { "type": "string" },
                "payload": { "type": "object" }
              },
              "required": ["endpoint"]
            },
            "method": "POST"
          }
        }
      },
      "actions": {
        "Call_external_API": {
          "type": "Http",
          "inputs": {
            "method": "POST",
            "uri": "@triggerBody()?['endpoint']",
            "headers": {
              "Content-Type": "application/json"
            },
            "body": "@triggerBody()?['payload']"
          },
          "runAfter": {}
        },
        "Return_result": {
          "type": "Response",
          "kind": "Http",
          "inputs": {
            "statusCode": "@outputs('Call_external_API')['statusCode']",
            "headers": { "Content-Type": "application/json" },
            "body": "@body('Call_external_API')"
          },
          "runAfter": {
            "Call_external_API": ["Succeeded"]
          }
        },
        "Return_error": {
          "type": "Response",
          "kind": "Http",
          "inputs": {
            "statusCode": 502,
            "body": {
              "error": "External API call failed",
              "status": "@outputs('Call_external_API')['statusCode']"
            }
          },
          "runAfter": {
            "Call_external_API": ["Failed"]
          }
        }
      },
      "outputs": {}
    },
    "connectionReferences": {}
  },
  "schemaVersion": "1.0.0.0"
}
```

## 3. SharePoint File → Office Script → Email

When a file is created in SharePoint, run an Office Script to process it, then send an email with the result.

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
        "When_a_file_is_created": {
          "type": "OpenApiConnectionWebhook",
          "inputs": {
            "host": {
              "connectionName": "shared_sharepointonline",
              "operationId": "OnNewFileInFolder",
              "apiId": "/providers/Microsoft.PowerApps/apis/shared_sharepointonline"
            },
            "parameters": {
              "dataset": "https://contoso.sharepoint.com/sites/Finance",
              "folderId": "/Shared Documents/Uploads"
            },
            "authentication": "@parameters('$authentication')"
          }
        }
      },
      "actions": {
        "Run_processing_script": {
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
              "file": "@triggerOutputs()?['body/{Identifier}']",
              "scriptId": "{scriptId}"
            },
            "authentication": "@parameters('$authentication')"
          },
          "runAfter": {}
        },
        "Check_success": {
          "type": "If",
          "expression": {
            "and": [
              {
                "equals": [
                  "@outputs('Run_processing_script')?['body/result/success']",
                  true
                ]
              }
            ]
          },
          "actions": {
            "Send_success_email": {
              "type": "OpenApiConnection",
              "inputs": {
                "host": {
                  "connectionName": "shared_office365",
                  "operationId": "SendEmailV2",
                  "apiId": "/providers/Microsoft.PowerApps/apis/shared_office365"
                },
                "parameters": {
                  "emailMessage/To": "finance-team@contoso.com",
                  "emailMessage/Subject": "File processed: @{triggerOutputs()?['body/{FilenameWithExtension}']}",
                  "emailMessage/Body": "<p>File processed successfully.</p><p>Rows: @{outputs('Run_processing_script')?['body/result/rowCount']}</p><p>Total: @{outputs('Run_processing_script')?['body/result/total']}</p>"
                },
                "authentication": "@parameters('$authentication')"
              }
            }
          },
          "else": {
            "actions": {
              "Send_error_email": {
                "type": "OpenApiConnection",
                "inputs": {
                  "host": {
                    "connectionName": "shared_office365",
                    "operationId": "SendEmailV2",
                    "apiId": "/providers/Microsoft.PowerApps/apis/shared_office365"
                  },
                  "parameters": {
                    "emailMessage/To": "admin@contoso.com",
                    "emailMessage/Subject": "Processing FAILED: @{triggerOutputs()?['body/{FilenameWithExtension}']}",
                    "emailMessage/Body": "<p>Error: @{outputs('Run_processing_script')?['body/result/message']}</p>",
                    "emailMessage/Importance": "High"
                  },
                  "authentication": "@parameters('$authentication')"
                }
              }
            }
          },
          "runAfter": {
            "Run_processing_script": ["Succeeded"]
          }
        }
      },
      "outputs": {}
    },
    "connectionReferences": {
      "shared_sharepointonline": {
        "connectionName": "shared-sharepointonlin-{guid}",
        "source": "Invoker",
        "id": "/providers/Microsoft.PowerApps/apis/shared_sharepointonline",
        "tier": "NotSpecified"
      },
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

## 4. Multi-Step Data Pipeline

Recurrence → HTTP fetch data → Office Script to write → Condition → Teams notification.

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
            "frequency": "Day",
            "interval": 1,
            "schedule": {
              "hours": ["6"],
              "minutes": ["0"]
            },
            "timeZone": "Eastern Standard Time"
          }
        }
      },
      "actions": {
        "Fetch_data": {
          "type": "Http",
          "inputs": {
            "method": "GET",
            "uri": "https://api.example.com/daily-data",
            "headers": {
              "Authorization": "Bearer {api-key}"
            }
          },
          "runAfter": {}
        },
        "Write_to_Excel": {
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
              "scriptId": "{importScriptId}",
              "ScriptParameters/apiData": "@body('Fetch_data')"
            },
            "authentication": "@parameters('$authentication')"
          },
          "runAfter": {
            "Fetch_data": ["Succeeded"]
          }
        },
        "Check_threshold": {
          "type": "If",
          "expression": {
            "and": [
              {
                "greater": [
                  "@outputs('Write_to_Excel')?['body/result/totalRecords']",
                  0
                ]
              }
            ]
          },
          "actions": {
            "Post_to_Teams": {
              "type": "OpenApiConnection",
              "inputs": {
                "host": {
                  "connectionName": "shared_teams",
                  "operationId": "PostMessageToChannel",
                  "apiId": "/providers/Microsoft.PowerApps/apis/shared_teams"
                },
                "parameters": {
                  "groupId": "{teamId}",
                  "channelId": "{channelId}",
                  "message/body/content": "<p><strong>Daily data import complete</strong></p><p>Records: @{outputs('Write_to_Excel')?['body/result/totalRecords']}</p><p>Status: @{outputs('Write_to_Excel')?['body/result/status']}</p>",
                  "message/body/contentType": "html"
                },
                "authentication": "@parameters('$authentication')"
              }
            }
          },
          "else": {
            "actions": {
              "Post_no_data_alert": {
                "type": "OpenApiConnection",
                "inputs": {
                  "host": {
                    "connectionName": "shared_teams",
                    "operationId": "PostMessageToChannel",
                    "apiId": "/providers/Microsoft.PowerApps/apis/shared_teams"
                  },
                  "parameters": {
                    "groupId": "{teamId}",
                    "channelId": "{channelId}",
                    "message/body/content": "<p><strong>Warning:</strong> Daily data import returned 0 records. Check the API.</p>",
                    "message/body/contentType": "html"
                  },
                  "authentication": "@parameters('$authentication')"
                }
              }
            }
          },
          "runAfter": {
            "Write_to_Excel": ["Succeeded"]
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
      "shared_teams": {
        "connectionName": "shared-teams-{guid}",
        "source": "Invoker",
        "id": "/providers/Microsoft.PowerApps/apis/shared_teams",
        "tier": "NotSpecified"
      }
    }
  },
  "schemaVersion": "1.0.0.0"
}
```

## 5. Approval Workflow

Manual trigger → Run analysis script → Request approval → If approved, run final script.

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
                  "title": "Report Name",
                  "type": "string",
                  "x-ms-dynamically-added": true
                }
              },
              "required": ["text"]
            }
          }
        }
      },
      "actions": {
        "Run_analysis": {
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
              "scriptId": "{analysisScriptId}",
              "ScriptParameters/reportName": "@triggerBody()['text']"
            },
            "authentication": "@parameters('$authentication')"
          },
          "runAfter": {}
        },
        "Request_approval": {
          "type": "OpenApiConnectionWebhook",
          "inputs": {
            "host": {
              "connectionName": "shared_approvals",
              "operationId": "StartAndWaitForAnApproval",
              "apiId": "/providers/Microsoft.PowerApps/apis/shared_approvals"
            },
            "parameters": {
              "approvalType": "Basic",
              "ApprovalCreationInput/title": "Approve report: @{triggerBody()['text']}",
              "ApprovalCreationInput/assignedTo": "manager@contoso.com",
              "ApprovalCreationInput/details": "Analysis result: @{outputs('Run_analysis')?['body/result/summary']}\n\nTotal: @{outputs('Run_analysis')?['body/result/total']}\n\nPlease approve to publish."
            },
            "authentication": "@parameters('$authentication')"
          },
          "runAfter": {
            "Run_analysis": ["Succeeded"]
          }
        },
        "Check_approval": {
          "type": "If",
          "expression": {
            "and": [
              {
                "equals": [
                  "@outputs('Request_approval')?['body/outcome']",
                  "Approve"
                ]
              }
            ]
          },
          "actions": {
            "Publish_report": {
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
                  "scriptId": "{publishScriptId}",
                  "ScriptParameters/reportName": "@triggerBody()['text']"
                },
                "authentication": "@parameters('$authentication')"
              }
            }
          },
          "else": {
            "actions": {
              "Notify_rejection": {
                "type": "OpenApiConnection",
                "inputs": {
                  "host": {
                    "connectionName": "shared_office365",
                    "operationId": "SendEmailV2",
                    "apiId": "/providers/Microsoft.PowerApps/apis/shared_office365"
                  },
                  "parameters": {
                    "emailMessage/To": "@triggerOutputs()['headers']['x-ms-user-email-encoded']",
                    "emailMessage/Subject": "Report rejected: @{triggerBody()['text']}",
                    "emailMessage/Body": "<p>Your report was not approved.</p><p>Comments: @{outputs('Request_approval')?['body/comments']}</p>"
                  },
                  "authentication": "@parameters('$authentication')"
                }
              }
            }
          },
          "runAfter": {
            "Request_approval": ["Succeeded"]
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
      "shared_approvals": {
        "connectionName": "shared-approvals-{guid}",
        "source": "Invoker",
        "id": "/providers/Microsoft.PowerApps/apis/shared_approvals",
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
