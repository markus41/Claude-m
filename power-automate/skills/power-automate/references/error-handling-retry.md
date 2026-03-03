# Error Handling and Retry Reference

## Overview

Robust Power Automate flows require deliberate error handling — configuring which actions run after failures, wrapping operations in try-catch-finally scopes, setting retry policies, and managing timeouts. This reference covers the Configure Run After pattern, scope-based try-catch-finally, the Terminate action, retry policies, timeout configuration, dead letter handling, and the flow run history API.

---

## Configure Run After

Every action in a flow can be configured to run based on the outcome of its predecessor(s). This is the foundation of all error-handling patterns.

### Run After Status Options

| Status | Description |
|---|---|
| `Succeeded` | Predecessor completed without error (default) |
| `Failed` | Predecessor threw an error |
| `Skipped` | Predecessor was skipped because its own predecessor failed |
| `TimedOut` | Predecessor exceeded its action timeout |

Multiple statuses can be combined — an action runs if ANY of the configured statuses is met.

### Common Run After Configurations

```json
// Run only on success (default)
"runAfter": {
  "Previous_action": ["Succeeded"]
}

// Run only on failure
"runAfter": {
  "Previous_action": ["Failed"]
}

// Run on failure OR timeout (error handler)
"runAfter": {
  "Previous_action": ["Failed", "TimedOut"]
}

// Run regardless of outcome (finally pattern)
"runAfter": {
  "Previous_action": ["Succeeded", "Failed", "Skipped", "TimedOut"]
}

// Run after multiple actions — all must complete in specified status
"runAfter": {
  "Action_A": ["Succeeded"],
  "Action_B": ["Succeeded"]
}
```

---

## Try-Catch-Finally Pattern Using Scopes

Scopes group actions and expose their collective run result. This enables structured exception handling analogous to try-catch-finally in code.

### Full Pattern Example

```json
{
  "actions": {
    "Try": {
      "type": "Scope",
      "actions": {
        "Get_SharePoint_item": {
          "type": "ApiConnection",
          "inputs": { ... }
        },
        "Update_Dataverse_record": {
          "type": "ApiConnection",
          "runAfter": { "Get_SharePoint_item": ["Succeeded"] },
          "inputs": { ... }
        },
        "Send_approval": {
          "type": "ApiConnection",
          "runAfter": { "Update_Dataverse_record": ["Succeeded"] },
          "inputs": { ... }
        }
      }
    },
    "Catch": {
      "type": "Scope",
      "runAfter": {
        "Try": ["Failed", "TimedOut", "Skipped"]
      },
      "actions": {
        "Compose_error_details": {
          "type": "Compose",
          "inputs": {
            "flowName": "@workflow().definition.metadata.operationMetadataId",
            "runId": "@workflow().run.name",
            "errorMessage": "@result('Try')?[0]?['error']?['message']",
            "failedAction": "@result('Try')?[0]?['name']",
            "timestamp": "@utcNow()"
          }
        },
        "Send_error_notification": {
          "type": "ApiConnection",
          "runAfter": { "Compose_error_details": ["Succeeded"] },
          "inputs": {
            "host": { "connection": { "name": "@parameters('$connections')['office365']['connectionId']" } },
            "method": "post",
            "path": "/v2/Mail",
            "body": {
              "To": "it-alerts@contoso.com",
              "Subject": "Flow Error: @{workflow().definition.metadata.operationMetadataId}",
              "Body": "<pre>@{outputs('Compose_error_details')}</pre>",
              "IsHtml": true
            }
          }
        },
        "Log_to_Dataverse": {
          "type": "ApiConnection",
          "runAfter": { "Compose_error_details": ["Succeeded"] },
          "inputs": {
            "host": { "connection": { "name": "@parameters('$connections')['commondataserviceforapps']['connectionId']" } },
            "method": "post",
            "path": "/v2/datasets/default.cds/tables/cr_flowlogs/items",
            "body": {
              "cr_runid": "@workflow().run.name",
              "cr_errormessage": "@outputs('Compose_error_details')?['errorMessage']",
              "cr_timestamp": "@utcNow()",
              "cr_status": "Failed"
            }
          }
        }
      }
    },
    "Finally": {
      "type": "Scope",
      "runAfter": {
        "Catch": ["Succeeded", "Failed", "Skipped", "TimedOut"],
        "Try": ["Succeeded"]
      },
      "actions": {
        "Update_processing_flag": {
          "type": "ApiConnection",
          "inputs": {
            "method": "patch",
            "body": { "cr_isprocessing": false }
          }
        }
      }
    }
  }
}
```

### Extracting Error Details from Scope Result

```
// result() returns an array of action results within the scope
result('Try')               // Array of all action results in Try scope
result('Try')?[0]           // First action result (may not be the failing one)

// Better: filter to failed actions only
@{join(
  select(
    filter(result('Try'), item() => not(equals(item()?['status'], 'Succeeded'))),
    item() => concat(item()?['name'], ': ', item()?['error']?['message'])
  ),
  '; '
)}
```

---

## Terminate Action

The `Terminate` action explicitly ends a flow run with a specified status. Use in the Catch scope to mark the run as Failed (vs Cancelled) for accurate monitoring.

```json
{
  "Terminate_as_failed": {
    "type": "Terminate",
    "inputs": {
      "runStatus": "Failed",
      "runError": {
        "code": "PROCESSING_ERROR",
        "message": "@{concat('Failed processing order ', triggerBody()?['orderId'], ': ', result('Try')?[0]?['error']?['message'])}"
      }
    }
  }
}
```

**`runStatus` values**: `Succeeded`, `Failed`, `Cancelled`

If no `Terminate` action is used and all actions in the Catch scope succeed, the flow run shows as **Succeeded** — even though the Try scope failed. Use `Terminate` with `runStatus: Failed` to correctly reflect the overall failure.

---

## Retry Policies

Retry policies are configured per action. They control automatic retry behavior for transient failures.

### Retry Policy Types

| Policy Type | JSON `type` | Behavior |
|---|---|---|
| `exponential` | `exponential` | Exponential backoff between retries (default) |
| `fixed` | `fixed` | Constant interval between retries |
| `none` | `none` | No retries — fail immediately |

### Exponential Backoff Configuration
```json
{
  "retryPolicy": {
    "type": "exponential",
    "count": 5,
    "interval": "PT5S",
    "minimumInterval": "PT5S",
    "maximumInterval": "PT60S"
  }
}
```

- `count`: Number of retries (max 90)
- `interval`: Base delay in ISO 8601 duration format
- `minimumInterval`: Minimum delay cap
- `maximumInterval`: Maximum delay cap

### Fixed Interval Retry
```json
{
  "retryPolicy": {
    "type": "fixed",
    "count": 3,
    "interval": "PT30S"
  }
}
```

### No Retry
```json
{
  "retryPolicy": {
    "type": "none"
  }
}
```

Use `none` for:
- Approval actions (retrying would send duplicate approval requests)
- Idempotency-sensitive operations (create-once operations)
- Operations where failure should be handled by the Catch scope, not retried automatically

### Which Status Codes Trigger Retries

| HTTP Status | Retried By Default? | Notes |
|---|---|---|
| `408 Request Timeout` | Yes | |
| `429 Too Many Requests` | Yes | Honors `Retry-After` header |
| `500 Internal Server Error` | Yes | |
| `502 Bad Gateway` | Yes | |
| `503 Service Unavailable` | Yes | |
| `504 Gateway Timeout` | Yes | |
| `400 Bad Request` | No | Client error — retrying won't help |
| `401 Unauthorized` | No | Re-auth needed |
| `403 Forbidden` | No | Permission error |
| `404 Not Found` | No | Resource missing |
| `409 Conflict` | No | Duplicate or conflict |

---

## Timeout Configuration

### Action-Level Timeout

Individual actions can have an operation timeout independent of the flow-level limit.

```json
{
  "Long_running_API_call": {
    "type": "Http",
    "inputs": {
      "method": "POST",
      "uri": "https://api.example.com/process",
      "body": { ... }
    },
    "limit": {
      "timeout": "PT4M"
    }
  }
}
```

ISO 8601 duration format: `PT30S` (30 seconds), `PT2M` (2 minutes), `PT1H` (1 hour)

**Maximum action timeout**: `PT2H` (2 hours) for most actions; approval actions up to `P30D` (30 days).

### Flow-Level Timeout

The entire flow run times out after 30 days (`P30D`). For processes that need to run longer:
- Use a parent flow that tracks state in Dataverse and triggers child flows.
- Use Azure Durable Functions (outside Power Automate) for very long-running processes.

---

## Dead Letter Handling

Power Automate does not have a native dead letter queue like Azure Service Bus. Implement equivalent patterns:

### Manual Dead Letter Table

Log unrecoverable failures to a Dataverse table for manual review and retry.

```json
{
  "Log_dead_letter": {
    "type": "ApiConnection",
    "inputs": {
      "method": "post",
      "path": "/v2/datasets/default.cds/tables/cr_deadletters/items",
      "body": {
        "cr_flowname": "@workflow().definition.metadata.operationMetadataId",
        "cr_runid": "@workflow().run.name",
        "cr_triggerdata": "@{string(triggerBody())}",
        "cr_errormessage": "@{result('Try')?[0]?['error']?['message']}",
        "cr_failedcount": 1,
        "cr_status": "Unresolved",
        "cr_timestamp": "@utcNow()"
      }
    }
  }
}
```

### Requeue Pattern via Azure Storage Queue

For message-queue-based integrations, push failed messages back to an Azure Storage Queue or Service Bus dead letter queue.

```json
{
  "Send_to_dead_letter_queue": {
    "type": "ApiConnection",
    "inputs": {
      "host": { "connection": { "name": "@parameters('$connections')['azurequeues']['connectionId']" } },
      "method": "post",
      "path": "/@{encodeURIComponent('dead-letters')}/messages",
      "body": {
        "originalPayload": "@{string(triggerBody())}",
        "error": "@{result('Try')?[0]?['error']?['message']}",
        "failedAt": "@{utcNow()}",
        "retryCount": "@{if(greaterOrEquals(int(triggerBody()?['retryCount']), 3), 3, add(int(triggerBody()?['retryCount']), 1))}"
      }
    }
  }
}
```

---

## Flow Run History API

Query flow run history programmatically for monitoring, alerting, and automated remediation.

### List Flow Runs (Power Platform API)
```
GET https://api.powerplatform.com/powerautomate/environments/{environmentId}/flowRuns
    ?workflowId={workflowId}
    &api-version=2022-03-01-preview
    &$filter=status eq 'Failed'
    &$top=50
```

### List Flow Runs (Dataverse — Unsupported but Read-Only Diagnostic)
```
GET /api/data/v9.2/asyncoperations?$filter=operationtype eq 14 and statuscode eq 31
    &$select=name,statuscode,createdon,modifiedon,message
    &$orderby=createdon desc
    &$top=100
```

### Flow Run Detail Schema

```json
{
  "name": "08585329-1234-5678-abcd-000000000000",
  "id": "/providers/Microsoft.ProcessSimple/environments/env-id/flows/flow-id/runs/run-id",
  "startTime": "2026-03-03T10:00:00Z",
  "endTime": "2026-03-03T10:00:45Z",
  "status": "Failed",
  "trigger": {
    "name": "When_an_item_is_created",
    "inputsLink": { "uri": "...", "contentVersion": "..." },
    "outputsLink": { "uri": "...", "contentVersion": "..." },
    "startTime": "2026-03-03T10:00:00Z",
    "endTime": "2026-03-03T10:00:01Z",
    "scheduledTime": "2026-03-03T10:00:00Z",
    "originHistoryName": "08585329...",
    "code": "OK",
    "status": "Succeeded"
  },
  "error": {
    "code": "ActionFailed",
    "message": "The 'Update_Dataverse_record' action failed: 0x80040265"
  },
  "outputs": {},
  "correlation": {
    "clientTrackingId": "INC-2026-0042-CorrelationId"
  }
}
```

### Resubmit Failed Run via Management Connector

```json
{
  "Resubmit_failed_run": {
    "type": "ApiConnection",
    "inputs": {
      "host": {
        "connection": { "name": "@parameters('$connections')['flowmanagement']['connectionId']" }
      },
      "method": "post",
      "path": "/providers/Microsoft.ProcessSimple/environments/@{encodeURIComponent(variables('EnvironmentId'))}/flows/@{encodeURIComponent(variables('FlowId'))}/runs/@{encodeURIComponent(variables('RunId'))}/resubmit",
      "queries": { "api-version": "2016-06-01" }
    }
  }
}
```

---

## Common Patterns and Gotchas

### Scope Failure Does Not Propagate Automatically

If a Catch scope exists and its actions all succeed, the overall flow run is marked **Succeeded** — even though the Try scope failed. Always add a `Terminate` action with `runStatus: Failed` at the end of the Catch scope if the flow should be reported as failed.

### Approval Retry Disaster

Never configure retry on approval actions. A retry sends a duplicate approval request to the approver. Use `retryPolicy: { "type": "none" }` on all approval actions, and handle timeout in the `runAfter` configuration instead.

### Parallel Branch Error Masking

In parallel branches, if one branch fails but others succeed, the parent action continues. Use a join scope after parallel branches with `runAfter` set to all branch statuses to catch failures from any branch.

### Infinite Retry Loop Prevention

Set a maximum iteration count on `Until` loops — always include `"limit": { "count": N, "timeout": "PTxH" }`. Without it, a bug can cause an infinite loop that runs until the 30-day flow timeout.

### result() Function Gotcha

`result('ScopeName')` returns actions in an undefined order (not necessarily the order they appear in the designer). Always filter by `status` to find the failing action rather than accessing by index.

---

## Error Codes and Conditions

| Code / Condition | Meaning | Remediation |
|---|---|---|
| `ActionFailed` (generic) | An action in the flow threw an exception | Check inner error message; inspect raw run history in portal |
| `TooManyRequests` (429) | Connector throttle limit exceeded | Add delays; reduce `Apply to each` concurrency; check throttle limits table |
| `RequestTimeout` (408) | Action exceeded its timeout | Increase `limit.timeout`; offload to async pattern |
| `WorkflowRunThrottled` | Platform burst cap hit | Reduce flow frequency; distribute across time; use Process plan |
| `OperationFailed` — approval | Approval action failed (not expired) | Check if approval service is degraded; verify approver has access |
| `InvalidTemplate` | Flow JSON malformed after manual edit | Validate JSON; check expression syntax in browser console |
| Scope always shows Succeeded | Missing `Terminate` action in Catch | Add `Terminate` with `runStatus: Failed` to end of Catch scope |
| Retry sending duplicate emails | Retry configured on email action | Set `retryPolicy: none` on send email actions |
| `result()` returning empty array | Referenced scope has no actions | Verify scope name matches exactly (case-sensitive) |

---

## Limits Table

| Resource | Limit | Notes |
|---|---|---|
| Maximum retries per action | 90 | Hard limit |
| Minimum retry interval | 5 seconds | `PT5S` minimum |
| Maximum retry interval | 1 day | `P1D` maximum |
| Action timeout maximum | 2 hours | Most actions; `P30D` for approvals |
| Flow run total timeout | 30 days | Hard limit |
| Scope nesting depth | No hard limit | Performance and readability: keep under 5 levels |
| result() array size | All actions in scope | Large scopes can produce large result arrays |
| Resubmit window | 30 days | Runs older than 30 days cannot be resubmitted |
