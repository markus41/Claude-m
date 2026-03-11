---
name: la-troubleshoot
description: "Diagnose failed Logic App runs — retrieve errors, classify root cause, suggest remediation"
argument-hint: "[--run-id <id>] [--last-n <count>] [--app-name <name>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

# Troubleshoot Logic App Failures

Diagnose failed Logic App workflow runs, classify root causes, and suggest remediation.

## Instructions

### 1. List Recent Failed Runs

Ask for `--app-name` and `--resource-group` if not provided.

**For Standard Logic Apps** (via REST API):
```bash
az rest --method GET \
  --url "https://management.azure.com/subscriptions/<sub-id>/resourceGroups/<rg-name>/providers/Microsoft.Web/sites/<app-name>/hostruntime/runtime/webhooks/workflow/api/management/workflows/<workflow-name>/runs?api-version=2022-03-01&\$filter=status eq 'Failed'&\$top=10"
```

**For Consumption Logic Apps** (via CLI):
```bash
az logic workflow run list \
  --resource-group <rg-name> \
  --workflow-name <app-name> \
  --filter "status eq 'Failed'" \
  --top 10 \
  --output table
```

If `--last-n` is specified, adjust `--top` accordingly.

### 2. Retrieve Detailed Run Information

Get a specific run's action statuses:

**If `--run-id` is provided**, fetch that run directly:
```bash
az rest --method GET \
  --url "https://management.azure.com/subscriptions/<sub-id>/resourceGroups/<rg-name>/providers/Microsoft.Logic/workflows/<app-name>/runs/<run-id>?api-version=2016-06-01"
```

**List actions within the run**:
```bash
az rest --method GET \
  --url "https://management.azure.com/subscriptions/<sub-id>/resourceGroups/<rg-name>/providers/Microsoft.Logic/workflows/<app-name>/runs/<run-id>/actions?api-version=2016-06-01"
```

Identify which action(s) have `"status": "Failed"` and retrieve their error details.

### 3. Classify Error Type

Analyze the error code and message and classify into one of these categories:

| Category | Common Error Codes / Patterns | Description |
|----------|------------------------------|-------------|
| **Connector Error** | `ActionFailed`, `BadGateway`, `ServiceProviderError` | The downstream connector or API returned an error |
| **Throttling** | `429`, `TooManyRequests`, `RateLimitExceeded` | API rate limit or Logic App action throughput limit hit |
| **Timeout** | `ActionTimedOut`, `GatewayTimeout`, `504` | Action or HTTP call exceeded its timeout window |
| **Expression Error** | `InvalidTemplate`, `ExpressionEvaluationFailed` | WDL expression syntax error or null reference |
| **Permission Error** | `AuthorizationFailed`, `Forbidden`, `401`, `403` | Missing RBAC, expired OAuth token, or connector auth failure |
| **Transient Error** | `InternalServerError`, `ServiceUnavailable`, `502`, `503` | Temporary infrastructure or service issue |
| **Schema Validation** | `InvalidJsonSchema`, `SchemaValidationFailed` | Input data does not match expected schema |
| **Concurrency** | `ActionConflict`, `ConcurrencyLimitReached` | Parallel run limits exceeded |

### 4. Show Root Cause Analysis

Present a clear summary:
- **Failed action name**: The specific action in the workflow that failed.
- **Error code**: The error code returned.
- **Error message**: The full error message.
- **Error category**: From the classification table above.
- **Timestamp**: When the failure occurred.
- **Input/output snippets**: Show relevant input and output data for the failed action (redact sensitive values).

### 5. Suggest Remediation Steps

Based on the error classification:

**Connector Error**:
- Check the downstream service status.
- Verify connector configuration and credentials.
- Test the API call independently (e.g., via curl or Postman).
- Add retry policy to the action.

**Throttling**:
- Add delays between actions or use concurrency control.
- Implement exponential backoff retry policy.
- Check API subscription tier and quotas.
- Split batch operations into smaller chunks.

**Timeout**:
- Increase action timeout in workflow settings (max 1 day for stateful).
- Break long-running operations into async patterns (webhook + callback).
- Check network connectivity and DNS resolution.

**Expression Error**:
- Validate the expression using `/la-expression-helper --validate`.
- Add null-safety with `coalesce()` or conditional checks.
- Verify data types match expected formats.

**Permission Error**:
- Re-authorize the connector connection.
- Verify managed identity has the required RBAC roles.
- Check if OAuth tokens or API keys have expired.
- Review conditional access policies that might block the call.

**Transient Error**:
- Add a retry policy (fixed interval or exponential backoff).
- Check Azure Service Health for known outages.
- If persistent, contact Azure Support.

**Schema Validation**:
- Compare the actual input data against the expected schema.
- Update the schema to accommodate new fields.
- Add data validation actions before the failing step.

**Concurrency**:
- Adjust concurrency settings on the trigger or action.
- Implement queue-based load leveling.

### 6. Cancel a Running Workflow

If a workflow is stuck or needs to be stopped:

**Consumption**:
```bash
az logic workflow run cancel \
  --resource-group <rg-name> \
  --workflow-name <app-name> \
  --run-name <run-id>
```

**Standard** (via REST):
```bash
az rest --method POST \
  --url "https://management.azure.com/subscriptions/<sub-id>/resourceGroups/<rg-name>/providers/Microsoft.Web/sites/<app-name>/hostruntime/runtime/webhooks/workflow/api/management/workflows/<workflow-name>/runs/<run-id>/cancel?api-version=2022-03-01"
```

### 7. Inspect Triggers

List and manage workflow triggers:

**List triggers (Consumption)**:
```bash
az logic workflow trigger list \
  --resource-group <rg-name> \
  --workflow-name <app-name> \
  --output table
```

**Get trigger details**:
```bash
az logic workflow trigger show \
  --resource-group <rg-name> \
  --workflow-name <app-name> \
  --trigger-name <trigger-name>
```

**Get trigger callback URL** (for Request triggers):
```bash
az rest --method POST \
  --url "https://management.azure.com/subscriptions/<sub-id>/resourceGroups/<rg-name>/providers/Microsoft.Logic/workflows/<app-name>/triggers/<trigger-name>/listCallbackUrl?api-version=2016-06-01" \
  --body '{}'
```

**List trigger history** (recent firings):
```bash
az rest --method GET \
  --url "https://management.azure.com/subscriptions/<sub-id>/resourceGroups/<rg-name>/providers/Microsoft.Logic/workflows/<app-name>/triggers/<trigger-name>/histories?api-version=2016-06-01&\$top=20"
```

**Manually fire a trigger**:
```bash
az logic workflow trigger run \
  --resource-group <rg-name> \
  --workflow-name <app-name> \
  --trigger-name <trigger-name>
```

**Reset trigger state** (re-poll from scratch):
```bash
az logic workflow trigger reset \
  --resource-group <rg-name> \
  --workflow-name <app-name> \
  --trigger-name <trigger-name>
```

### 8. Offer to Resubmit the Run

If the error is transient or has been fixed, offer to resubmit:

**Consumption** (resubmit from trigger history):
```bash
az rest --method POST \
  --url "https://management.azure.com/subscriptions/<sub-id>/resourceGroups/<rg-name>/providers/Microsoft.Logic/workflows/<app-name>/triggers/<trigger-name>/histories/<history-name>/resubmit?api-version=2016-06-01"
```

**Standard** (resubmit a specific run):
```bash
az rest --method POST \
  --url "https://management.azure.com/subscriptions/<sub-id>/resourceGroups/<rg-name>/providers/Microsoft.Web/sites/<app-name>/hostruntime/runtime/webhooks/workflow/api/management/workflows/<workflow-name>/runs/<run-id>/resubmit?api-version=2022-03-01"
```

Ask the user for confirmation before resubmitting.

### 9. Batch Operations (Standard)

Bulk management operations for Standard Logic App workflows and runs.

**Batch cancel stuck runs**:
```bash
RUNS=$(az rest --method GET \
  --url "https://management.azure.com/subscriptions/<sub-id>/resourceGroups/<rg-name>/providers/Microsoft.Web/sites/<app-name>/hostruntime/runtime/webhooks/workflow/api/management/workflows/<workflow-name>/runs?api-version=2022-03-01&\$filter=status eq 'Running'" \
  | jq -r '.value[].name')
for RUN_ID in $RUNS; do
  az rest --method POST \
    --url "https://management.azure.com/subscriptions/<sub-id>/resourceGroups/<rg-name>/providers/Microsoft.Web/sites/<app-name>/hostruntime/runtime/webhooks/workflow/api/management/workflows/<workflow-name>/runs/$RUN_ID/cancel?api-version=2022-03-01"
done
```

**List all workflows in Standard Logic App**:
```bash
az rest --method GET \
  --url "https://management.azure.com/subscriptions/<sub-id>/resourceGroups/<rg-name>/providers/Microsoft.Web/sites/<app-name>/hostruntime/runtime/webhooks/workflow/api/management/workflows?api-version=2022-03-01" \
  --query "value[].{Name:name,State:properties.state}" --output table
```

### 10. Quick Diagnostics Setup

If monitoring is not yet configured, offer to set it up:

**Enable Application Insights (Standard)**:
```bash
az logicapp config appsettings set \
  --resource-group <rg-name> --name <app-name> \
  --settings "APPINSIGHTS_INSTRUMENTATIONKEY=<key>" \
             "APPLICATIONINSIGHTS_CONNECTION_STRING=InstrumentationKey=<key>" \
             "ApplicationInsightsAgent_EXTENSION_VERSION=~3"
```

**Enable Diagnostic Settings (Consumption)**:
```bash
az monitor diagnostic-settings create \
  --resource "/subscriptions/<sub-id>/resourceGroups/<rg-name>/providers/Microsoft.Logic/workflows/<app-name>" \
  --name "logic-app-diag" \
  --workspace "/subscriptions/<sub-id>/resourceGroups/<rg-name>/providers/Microsoft.OperationalInsights/workspaces/<workspace>" \
  --logs '[{"categoryGroup": "allLogs", "enabled": true}]' \
  --metrics '[{"category": "AllMetrics", "enabled": true}]'
```

**List existing diagnostic settings**:
```bash
az monitor diagnostic-settings list \
  --resource "/subscriptions/<sub-id>/resourceGroups/<rg-name>/providers/Microsoft.Logic/workflows/<app-name>"
```
