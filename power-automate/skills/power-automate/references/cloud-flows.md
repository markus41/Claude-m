# Cloud Flows Reference

## Overview

Cloud flows are server-side automation processes that run in response to triggers or on schedules. They are composed of triggers, actions, conditions, loops, and scopes. This reference covers flow types, trigger configuration, action chaining, expressions, dynamic content, parallel branches, compose vs variable patterns, and environment variables.

---

## Flow Types

| Flow Type | Trigger Category | `type` / `kind` | Use Case |
|---|---|---|---|
| Automated | Event-based | `ApiConnectionWebhook` | SharePoint item created, email received |
| Scheduled | Recurrence | `Recurrence` | Nightly sync, weekly report |
| Instant (Manual) | Manual | `Request` / `Button` | User-triggered from mobile or Teams |
| Desktop | RPA | `Request` / `Button` | Legacy app automation via PAD |
| Power Apps | Canvas trigger | `Request` / `PowerAppsV2` | Called from a canvas app |
| HTTP Request | External webhook | `Request` / `Http` | REST endpoint for external systems |

---

## Trigger Configuration

### Automated — SharePoint "When item created"
```json
{
  "triggers": {
    "When_an_item_is_created": {
      "type": "ApiConnectionWebhook",
      "inputs": {
        "host": {
          "connection": { "name": "@parameters('$connections')['sharepointonline']['connectionId']" }
        },
        "method": "post",
        "body": {
          "NotificationUrl": "@{listCallbackUrl()}"
        },
        "path": "/datasets/@{encodeURIComponent(encodeURIComponent('https://contoso.sharepoint.com/sites/HR'))}/tables/@{encodeURIComponent(encodeURIComponent('Employee Requests'))}/onnewitems"
      }
    }
  }
}
```

### Scheduled — Recurrence
```json
{
  "triggers": {
    "Recurrence": {
      "type": "Recurrence",
      "recurrence": {
        "frequency": "Week",
        "interval": 1,
        "startTime": "2026-01-01T08:00:00Z",
        "timeZone": "Eastern Standard Time",
        "schedule": {
          "weekDays": ["Monday"],
          "hours": ["8"],
          "minutes": ["0"]
        }
      }
    }
  }
}
```

**Frequency values**: `Second` (min 60), `Minute`, `Hour`, `Day`, `Week`, `Month`

### HTTP Request Trigger (External Webhook)
```json
{
  "triggers": {
    "manual": {
      "type": "Request",
      "kind": "Http",
      "inputs": {
        "schema": {
          "type": "object",
          "properties": {
            "orderId": { "type": "string" },
            "amount": { "type": "number" },
            "customer": {
              "type": "object",
              "properties": {
                "email": { "type": "string" },
                "name": { "type": "string" }
              }
            }
          },
          "required": ["orderId", "amount"]
        }
      }
    }
  }
}
```

The trigger URL is generated after saving — it includes a SAS signature and expires when the flow is deleted or re-saved. Extract with `listCallbackUrl()`.

### Power Apps V2 Trigger (Strongly Typed)
```json
{
  "triggers": {
    "PowerApps": {
      "type": "Request",
      "kind": "PowerAppsV2",
      "inputs": {
        "schema": {
          "type": "object",
          "properties": {
            "text": { "type": "string", "description": "Input text from canvas app" },
            "recordId": { "type": "string", "description": "Dataverse record ID" }
          }
        }
      }
    }
  }
}
```

---

## Action Chaining

### Basic Sequential Actions
Actions execute in order by default. Each action's output is available to all subsequent actions via dynamic content.

```json
{
  "actions": {
    "Get_user_profile": {
      "type": "ApiConnection",
      "inputs": {
        "host": { "connection": { "name": "@parameters('$connections')['office365']['connectionId']" } },
        "method": "get",
        "path": "/codeless/v1.0/me"
      }
    },
    "Create_Dataverse_record": {
      "type": "ApiConnection",
      "runAfter": { "Get_user_profile": ["Succeeded"] },
      "inputs": {
        "host": { "connection": { "name": "@parameters('$connections')['commondataserviceforapps']['connectionId']" } },
        "method": "post",
        "path": "/v2/datasets/@{encodeURIComponent(encodeURIComponent('default.cds'))}/tables/@{encodeURIComponent(encodeURIComponent('cr_requests'))}/items",
        "body": {
          "cr_requester": "@body('Get_user_profile')?['displayName']",
          "cr_email": "@body('Get_user_profile')?['mail']",
          "cr_submitteddate": "@utcNow()"
        }
      }
    }
  }
}
```

### Condition (If/Else)
```json
{
  "Condition": {
    "type": "If",
    "expression": {
      "and": [
        {
          "greater": [
            "@triggerBody()?['Amount']",
            5000
          ]
        }
      ]
    },
    "actions": {
      "Send_high_value_alert": { ... }
    },
    "else": {
      "actions": {
        "Standard_processing": { ... }
      }
    }
  }
}
```

### Switch (Multi-Branch)
```json
{
  "Switch_on_status": {
    "type": "Switch",
    "expression": "@triggerBody()?['Status']",
    "cases": {
      "Approved": {
        "case": "Approved",
        "actions": { "Process_approved": { ... } }
      },
      "Rejected": {
        "case": "Rejected",
        "actions": { "Process_rejected": { ... } }
      }
    },
    "default": {
      "actions": { "Handle_unknown_status": { ... } }
    }
  }
}
```

### Apply to Each (ForEach)
```json
{
  "Apply_to_each_item": {
    "type": "Foreach",
    "foreach": "@body('Get_items')?['value']",
    "actions": {
      "Process_single_item": { ... }
    }
  }
}
```

**Concurrency control**: By default, `Apply to each` runs sequentially. Enable concurrency (1-50 parallel iterations) in action settings to process items in parallel:
```json
"runtimeConfiguration": {
  "concurrency": { "repetitions": 10 }
}
```

### Until Loop
```json
{
  "Poll_until_complete": {
    "type": "Until",
    "expression": "@equals(body('Get_job_status')?['status'], 'Completed')",
    "limit": {
      "count": 20,
      "timeout": "PT1H"
    },
    "actions": {
      "Wait_30_seconds": {
        "type": "Wait",
        "inputs": { "interval": { "unit": "Second", "count": 30 } }
      },
      "Get_job_status": { ... }
    }
  }
}
```

---

## Expressions Reference

### String Expressions
```
concat('Hello', ' ', 'World')          → "Hello World"
toUpper('hello')                        → "HELLO"
toLower('HELLO')                        → "hello"
trim('  spaces  ')                      → "spaces"
startsWith('Hello', 'He')              → true
endsWith('Hello', 'lo')                → true
contains('Hello World', 'World')       → true
replace('Hello World', 'World', 'Flow') → "Hello Flow"
substring('Hello World', 6, 5)         → "World"
length('Hello')                         → 5
split('a,b,c', ',')                    → ["a","b","c"]
join(triggerBody()['Tags'], ', ')       → "tag1, tag2, tag3"
```

### Date/Time Expressions
```
utcNow()                                          → "2026-03-03T10:00:00.0000000Z"
utcNow('yyyy-MM-dd')                              → "2026-03-03"
formatDateTime(utcNow(), 'dddd, MMMM d, yyyy')    → "Tuesday, March 3, 2026"
addDays(utcNow(), 7)                              → 7 days from now
addHours(utcNow(), -24)                           → 24 hours ago
addMinutes(utcNow(), 30)                          → 30 minutes from now
convertTimeZone(utcNow(), 'UTC', 'Eastern Standard Time')
convertFromUtc(utcNow(), 'Eastern Standard Time', 'yyyy-MM-dd HH:mm')
dayOfWeek(utcNow())                               → 2 (0=Sun, 1=Mon, 2=Tue...)
ticks(utcNow())                                   → tick count for comparison
```

### Numeric Expressions
```
add(5, 3)          → 8
sub(10, 4)         → 6
mul(3, 4)          → 12
div(10, 3)         → 3 (integer division)
mod(10, 3)         → 1
min(5, 3)          → 3
max(5, 3)          → 5
float('3.14')      → 3.14
int('42')          → 42
string(42)         → "42"
```

### Array and Object Expressions
```
first(triggerBody()?['items'])               → first element
last(triggerBody()?['items'])                → last element
length(triggerBody()?['items'])              → count of elements
union(array1, array2)                        → merged arrays (deduped)
intersection(array1, array2)                 → common elements
contains(triggerBody()?['roles'], 'Admin')   → check membership
createArray('a', 'b', 'c')                  → ["a","b","c"]
range(0, 5)                                  → [0,1,2,3,4]
skip(array, 2)                              → skip first 2 elements
take(array, 3)                              → first 3 elements
reverse(array)                               → reversed array
```

### ID and Encoding Expressions
```
guid()                          → new GUID "00000000-0000-0000-0000-000000000000"
base64(body('Get_content'))     → base64 encode
base64ToString(body('...'))     → decode base64
decodeUriComponent('%2F')       → "/"
encodeURIComponent('a/b')       → "a%2Fb"
```

### Trigger and Action References
```
triggerBody()                    → full trigger body
triggerBody()?['fieldName']      → specific field (safe null-coalescing)
triggerOutputs()                 → full trigger outputs including headers
body('ActionName')               → body of a completed action
outputs('ActionName')            → full outputs of a completed action
actions('ActionName').outputs    → same as outputs()
items('Apply_to_each')           → current loop item in foreach
iterationIndexes('Apply_to_each') → current loop index
```

---

## Dynamic Content and Variable Patterns

### Compose Action (Capture Intermediate State)

Use `Compose` to compute a value once and reference it throughout the flow.

```json
{
  "Compose_full_name": {
    "type": "Compose",
    "inputs": "@concat(triggerBody()?['FirstName'], ' ', triggerBody()?['LastName'])"
  }
}
// Reference later: @outputs('Compose_full_name')
```

### Initialize Variable

```json
{
  "Initialize_variable": {
    "type": "InitializeVariable",
    "inputs": {
      "variables": [
        {
          "name": "TotalAmount",
          "type": "float",
          "value": 0
        }
      ]
    }
  }
}
```

**Variable types**: `string`, `integer`, `float`, `boolean`, `array`, `object`

### Set Variable (Inside Loop)
```json
{
  "Increment_total": {
    "type": "SetVariable",
    "inputs": {
      "name": "TotalAmount",
      "value": "@add(variables('TotalAmount'), items('Apply_to_each')?['Amount'])"
    }
  }
}
```

### Append to Array Variable
```json
{
  "Append_error_to_list": {
    "type": "AppendToArrayVariable",
    "inputs": {
      "name": "ErrorList",
      "value": {
        "item": "@items('Apply_to_each')?['id']",
        "error": "@body('Failing_action')['error']['message']"
      }
    }
  }
}
```

### Compose vs Variable — Decision Guide
| Use Case | Recommended |
|---|---|
| Compute once, reference many times in same run | `Compose` |
| Accumulate values across loop iterations | `Variable` (Initialize + Append/Set) |
| Pass value between parallel branches | `Variable` (initialized before branches) |
| Build a string or object from static values | `Compose` |
| Track counter in a loop | `Variable` (Increment) |

---

## Parallel Branches

Run independent actions simultaneously to reduce total execution time.

```json
{
  "actions": {
    "Send_Teams_notification": {
      "type": "ApiConnection",
      "runAfter": {},
      "inputs": { ... }
    },
    "Create_Planner_task": {
      "type": "ApiConnection",
      "runAfter": {},
      "inputs": { ... }
    },
    "Update_SharePoint_item": {
      "type": "ApiConnection",
      "runAfter": {},
      "inputs": { ... }
    },
    "Wait_for_all_branches": {
      "type": "Compose",
      "runAfter": {
        "Send_Teams_notification": ["Succeeded"],
        "Create_Planner_task": ["Succeeded"],
        "Update_SharePoint_item": ["Succeeded"]
      },
      "inputs": "All parallel actions completed"
    }
  }
}
```

Both `Send_Teams_notification`, `Create_Planner_task`, and `Update_SharePoint_item` have empty `runAfter` — they start simultaneously after the trigger.

---

## Environment Variables

Environment variables store configuration values that vary per Power Platform environment.

### Environment Variable Types

| Type | Schema | Notes |
|---|---|---|
| `String` | Free text | URLs, names, prefixes |
| `Number` | Decimal number | Thresholds, limits |
| `Boolean` | True/False | Feature flags |
| `JSON` | JSON object | Complex configuration |
| `Data source` | Table reference | Dataverse table pointers |
| `Secret` | Encrypted text | API keys, connection strings (stored in Key Vault) |

### Referencing Environment Variables in Flows

In flow expressions, environment variables are referenced by their schema name:

```
@parameters('cr_ApiBaseUrl')
@parameters('cr_MaxRetries')
@parameters('cr_IsMaintenanceMode')
```

In flow action inputs:
```json
{
  "HTTP_call": {
    "type": "Http",
    "inputs": {
      "method": "POST",
      "uri": "@{parameters('cr_ApiBaseUrl')}/orders",
      "headers": {
        "X-Max-Retries": "@{string(parameters('cr_MaxRetries'))}"
      }
    }
  }
}
```

### Create Environment Variable via Dataverse API
```json
POST /api/data/v9.2/environmentvariabledefinitions
{
  "schemaname": "cr_ApiBaseUrl",
  "displayname": "API Base URL",
  "type": 100000001,
  "defaultvalue": "https://api.contoso.com/v1"
}

// Set environment-specific value
POST /api/data/v9.2/environmentvariablevalues
{
  "value": "https://api-prod.contoso.com/v1",
  "EnvironmentVariableDefinitionId@odata.bind": "/environmentvariabledefinitions({definition-id})"
}
```

`type` values: `100000000` = String, `100000001` = Number, `100000002` = Boolean, `100000003` = JSON, `100000004` = Data source, `100000005` = Secret

---

## Error Codes and Conditions

| Code / Condition | Meaning | Remediation |
|---|---|---|
| `ActionFailed` | Generic action failure | Check inner error; inspect run history |
| `429 TooManyRequests` | Connector throttle exceeded | Add delays; reduce concurrency; check throttle table |
| `401 Unauthorized` | Token expired or missing | Reconnect the connection in the flow; check OAuth token expiry |
| `403 Forbidden` | DLP policy violation or insufficient permissions | Check DLP policy; verify connector grouping |
| `408 RequestTimeout` | Action timed out | Increase action timeout in settings; split large operations |
| `InvalidTemplate` | Flow definition JSON is malformed | Validate JSON; check expression syntax |
| `ConnectionAuthorizationFailed` | Connection reference not mapped | Map connection reference during solution import |
| `EnvironmentVariableNotFound` | `@parameters('name')` references unknown variable | Add environment variable to solution; check schema name |

---

## Limits Table

| Resource | Limit | Notes |
|---|---|---|
| Flow run duration | 30 days | Hard limit; use durable patterns for long processes |
| Actions per flow run | 10,000 (Standard) / 100,000 (Premium) | Includes all actions in all loops |
| `Apply to each` concurrency | 50 | Max parallel iterations |
| Flow trigger frequency | 60 seconds minimum | Recurrence and polling |
| HTTP action timeout | 120 seconds | Per-action configurable up to 240 seconds |
| Approval response time | 30 days | After 30 days approval auto-expires |
| Flow definition size | 1 MB | Minify JSON; split into child flows |
| Input/output payload | 100 MB | Per action |
| Chunk transfer | Up to 1 GB | For file operations with chunking enabled |
| Environment variables per solution | 200 | Hard limit |
| Variables per flow | No hard limit | Practical limit ~50 for readability |
