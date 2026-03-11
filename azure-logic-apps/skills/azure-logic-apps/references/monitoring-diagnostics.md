# Monitoring and Diagnostics Reference

## Run History API

### List Runs

```bash
# Consumption
az rest --method GET \
  --uri "https://management.azure.com/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Logic/workflows/{name}/runs?api-version=2019-05-01&\$top=25&\$filter=status eq 'Failed'"

# Standard
az rest --method GET \
  --uri "https://management.azure.com/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Web/sites/{app}/hostruntime/runtime/webhooks/workflow/api/management/workflows/{name}/runs?api-version=2022-03-01"
```

### Get Run Details

```bash
az rest --method GET \
  --uri ".../workflows/{name}/runs/{runId}?api-version=2019-05-01"
```

Response properties: `status`, `startTime`, `endTime`, `correlation.clientTrackingId`, `trigger.status`, `outputs`.

### List Run Actions

```bash
az rest --method GET \
  --uri ".../workflows/{name}/runs/{runId}/actions?api-version=2019-05-01"
```

Each action includes: `status`, `code`, `error`, `inputsLink`, `outputsLink`, `trackedProperties`, `retryHistory`.

### Resubmit / Cancel

```bash
# Resubmit from trigger
az rest --method POST --uri ".../triggers/{triggerName}/histories/{historyId}/resubmit?api-version=2019-05-01"
# Cancel running workflow
az rest --method POST --uri ".../runs/{runId}/cancel?api-version=2019-05-01"
```

## Trigger History API

```bash
# List trigger histories (statuses: Fired, Skipped, Failed)
az rest --method GET --uri ".../triggers/{name}/histories?api-version=2019-05-01&\$top=50"
# Get callback URL
az rest --method POST --uri ".../triggers/{name}/listCallbackUrl?api-version=2019-05-01" --body '{}'
# Run trigger on demand
az rest --method POST --uri ".../triggers/{name}/run?api-version=2019-05-01" --body '{}'
```

## Application Insights Integration

### Standard Logic Apps

```json
{
  "APPINSIGHTS_INSTRUMENTATIONKEY": "<key>",
  "APPLICATIONINSIGHTS_CONNECTION_STRING": "InstrumentationKey=<key>;IngestionEndpoint=https://<region>.in.applicationinsights.azure.com/",
  "ApplicationInsightsAgent_EXTENSION_VERSION": "~3"
}
```

### Consumption Logic Apps

```bash
az monitor diagnostic-settings create \
  --resource "/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Logic/workflows/{name}" \
  --name "diag" \
  --workspace "/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.OperationalInsights/workspaces/{ws}" \
  --logs '[{"categoryGroup": "allLogs", "enabled": true, "retentionPolicy": {"enabled": true, "days": 90}}]' \
  --metrics '[{"category": "AllMetrics", "enabled": true, "retentionPolicy": {"enabled": true, "days": 90}}]'
```

## KQL Queries

### Failed Runs (24h)

```kql
AzureDiagnostics
| where ResourceProvider == "MICROSOFT.LOGIC" and Category == "WorkflowRuntime"
| where OperationName == "Microsoft.Logic/workflows/workflowRunCompleted"
| where status_s == "Failed" and TimeGenerated > ago(24h)
| project TimeGenerated, resource_workflowName_s, resource_runId_s, error_code_s, error_message_s
| order by TimeGenerated desc
```

### Action Latency Analysis

```kql
AzureDiagnostics
| where ResourceProvider == "MICROSOFT.LOGIC" and Category == "WorkflowRuntime"
| where OperationName == "Microsoft.Logic/workflows/workflowActionCompleted"
| where TimeGenerated > ago(7d)
| extend durationMs = datetime_diff('millisecond', endTime_t, startTime_t)
| summarize avg(durationMs), percentile(durationMs, 50), percentile(durationMs, 95), percentile(durationMs, 99), max(durationMs), count()
  by resource_workflowName_s, resource_actionName_s
| order by percentile_durationMs_95 desc
```

### Throttling Detection

```kql
AzureDiagnostics
| where ResourceProvider == "MICROSOFT.LOGIC" and status_s == "Failed"
| where error_code_s in ("429", "TooManyRequests", "ActionThrottled", "TriggerThrottled")
| where TimeGenerated > ago(24h)
| summarize count() by resource_workflowName_s, resource_actionName_s, bin(TimeGenerated, 1h)
| order by count_ desc
```

### Long-Running Workflows

```kql
AzureDiagnostics
| where OperationName == "Microsoft.Logic/workflows/workflowRunCompleted" and TimeGenerated > ago(7d)
| extend durationMin = datetime_diff('minute', endTime_t, startTime_t)
| where durationMin > 30
| project TimeGenerated, resource_workflowName_s, resource_runId_s, durationMin, status_s
| order by durationMin desc
```

### Connector Error Breakdown

```kql
AzureDiagnostics
| where OperationName == "Microsoft.Logic/workflows/workflowActionCompleted" and status_s == "Failed"
| where TimeGenerated > ago(7d)
| summarize errorCount = count(), workflows = dcount(resource_workflowName_s) by error_code_s, error_message_s
| order by errorCount desc | take 20
```

### B2B Tracking

```kql
AzureDiagnostics
| where Category == "IntegrationAccountTrackingEvents" and OperationName has "X12"
| where TimeGenerated > ago(24h)
| extend icn = tostring(properties_s.interchangeControlNumber), sender = tostring(properties_s.senderIdentifier)
| project TimeGenerated, icn, sender, status_s | order by TimeGenerated desc
```

### Workflow Success Rate

```kql
AzureDiagnostics
| where OperationName == "Microsoft.Logic/workflows/workflowRunCompleted" and TimeGenerated > ago(7d)
| summarize total = count(), succeeded = countif(status_s == "Succeeded"), failed = countif(status_s == "Failed")
  by resource_workflowName_s
| extend successRate = round(100.0 * succeeded / total, 2)
| order by successRate asc
```

## Azure Monitor Metrics

| Metric | Aggregation | Description |
|---|---|---|
| `RunsStarted` / `RunsCompleted` / `RunsSucceeded` / `RunsFailed` / `RunsCancelled` | Total | Workflow run counts by status |
| `TriggersFired` / `TriggersSucceeded` / `TriggersFailed` / `TriggersSkipped` | Total | Trigger execution counts |
| `ActionsStarted` / `ActionsSucceeded` / `ActionsFailed` / `ActionsSkipped` | Total | Action execution counts |
| `ActionLatency` / `RunLatency` / `TriggerLatency` / `RunSuccessLatency` | Average | Execution latency in seconds |
| `RunStartThrottledEvents` / `TriggerThrottledEvents` / `ActionThrottledEvents` | Total | Throttling event counts |
| `BillableActionExecutions` / `BillableTriggerExecutions` / `TotalBillableExecutions` | Total | Billing-related counts |

## Alert Rules

### Failed Runs Alert (ARM)

```json
{
  "type": "Microsoft.Insights/metricAlerts", "apiVersion": "2018-03-01",
  "name": "logic-app-failures", "location": "global",
  "properties": {
    "severity": 2, "enabled": true,
    "scopes": ["/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Logic/workflows/{name}"],
    "evaluationFrequency": "PT5M", "windowSize": "PT15M",
    "criteria": { "odata.type": "Microsoft.Azure.Monitor.MultipleResourceMultipleMetricCriteria",
      "allOf": [{ "name": "FailedRuns", "metricName": "RunsFailed", "operator": "GreaterThan", "threshold": 5, "timeAggregation": "Total" }] },
    "actions": [{ "actionGroupId": "/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Insights/actionGroups/{ag}" }]
  }
}
```

### Log-Based Alert (KQL)

```bash
az monitor scheduled-query create --resource-group myRG --name "consecutive-failures" \
  --scopes "/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.OperationalInsights/workspaces/{ws}" \
  --condition "count > 3" \
  --condition-query "AzureDiagnostics | where OperationName == 'Microsoft.Logic/workflows/workflowRunCompleted' | where status_s == 'Failed' | where TimeGenerated > ago(15m)" \
  --severity 1 --evaluation-frequency 5m --window-size 15m \
  --action-groups "/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Insights/actionGroups/{ag}"
```

## Diagnostic Settings (Bicep)

```bicep
resource diag 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = {
  name: 'logic-app-diag'
  scope: logicApp
  properties: {
    workspaceId: workspaceId
    logs: [{ categoryGroup: 'allLogs', enabled: true, retentionPolicy: { enabled: true, days: 90 } }]
    metrics: [{ category: 'AllMetrics', enabled: true, retentionPolicy: { enabled: true, days: 90 } }]
  }
}
```

Log categories for `Microsoft.Logic/workflows`: `WorkflowRuntime`, `IntegrationAccountTrackingEvents`.
Log categories for `Microsoft.Web/sites` (Standard): `WorkflowRuntime`, `FunctionAppLogs`, `AppServiceHTTPLogs`, `AppServicePlatformLogs`.

## Custom Tracked Properties

```json
"Process_Order": {
  "type": "Http", "inputs": { "..." : "..." },
  "trackedProperties": { "orderId": "@triggerBody()?['orderId']", "customer": "@triggerBody()?['customerName']", "amount": "@triggerBody()?['totalAmount']" },
  "runAfter": {}
}
```

Query in KQL: `| extend orderId = tostring(trackedProperties_orderId_s)`.

## Correlation IDs

Set custom tracking ID on trigger: `"correlation": { "clientTrackingId": "@triggerBody()?['correlationId']" }`.

Trace all actions for a correlation: `| where correlation_clientTrackingId_s == "my-id"`.

## Diagnostic Settings Management

```bash
# List diagnostic settings
az monitor diagnostic-settings list \
  --resource "/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Logic/workflows/{name}"

# Show specific diagnostic settings
az monitor diagnostic-settings show \
  --resource "/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Logic/workflows/{name}" \
  --name "logic-app-diag"

# Delete diagnostic settings
az monitor diagnostic-settings delete \
  --resource "/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Logic/workflows/{name}" \
  --name "logic-app-diag"
```

## Metric Alert Rules (CLI)

```bash
# Create action group for notifications
az monitor action-group create \
  --resource-group myRG \
  --name "logic-app-alerts-ag" \
  --short-name "la-alerts" \
  --action email admin admin@contoso.com

# Create metric alert — failed runs
az monitor metrics alert create \
  --resource-group myRG \
  --name "logic-app-failed-runs" \
  --scopes "/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Logic/workflows/{name}" \
  --condition "total RunsFailed > 5" \
  --window-size PT15M \
  --evaluation-frequency PT5M \
  --severity 2 \
  --action "/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Insights/actionGroups/logic-app-alerts-ag" \
  --description "Alert when more than 5 Logic App runs fail in 15 minutes"

# Create metric alert — high latency
az monitor metrics alert create \
  --resource-group myRG \
  --name "logic-app-high-latency" \
  --scopes "/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Logic/workflows/{name}" \
  --condition "avg RunLatency > 300" \
  --window-size PT15M \
  --evaluation-frequency PT5M \
  --severity 3 \
  --action "/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Insights/actionGroups/logic-app-alerts-ag"

# Create metric alert — throttling
az monitor metrics alert create \
  --resource-group myRG \
  --name "logic-app-throttling" \
  --scopes "/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Logic/workflows/{name}" \
  --condition "total RunStartThrottledEvents > 0" \
  --window-size PT5M \
  --evaluation-frequency PT1M \
  --severity 2 \
  --action "/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Insights/actionGroups/logic-app-alerts-ag"

# List existing metric alerts
az monitor metrics alert list \
  --resource-group myRG --output table

# Delete a metric alert
az monitor metrics alert delete \
  --resource-group myRG --name "logic-app-failed-runs"
```

## Application Insights Setup (CLI)

```bash
# Create Application Insights resource
az monitor app-insights component create \
  --app "logic-app-insights" \
  --location eastus \
  --resource-group myRG \
  --kind web \
  --application-type web

# Get instrumentation key
APPINSIGHTS_KEY=$(az monitor app-insights component show \
  --app "logic-app-insights" --resource-group myRG \
  --query "instrumentationKey" -o tsv)

CONNECTION_STRING=$(az monitor app-insights component show \
  --app "logic-app-insights" --resource-group myRG \
  --query "connectionString" -o tsv)

# Configure Standard Logic App to use App Insights
az logicapp config appsettings set \
  --resource-group myRG --name my-logic-app \
  --settings "APPINSIGHTS_INSTRUMENTATIONKEY=${APPINSIGHTS_KEY}" \
             "APPLICATIONINSIGHTS_CONNECTION_STRING=${CONNECTION_STRING}" \
             "ApplicationInsightsAgent_EXTENSION_VERSION=~3"
```

## Batch Cancel Stuck Runs

```bash
RUNS=$(az rest --method GET --uri ".../runs?api-version=2019-05-01&\$filter=status eq 'Running'" | jq -r '.value[].name')
for RUN_ID in $RUNS; do
  az rest --method POST --uri ".../runs/$RUN_ID/cancel?api-version=2019-05-01"
done
```
