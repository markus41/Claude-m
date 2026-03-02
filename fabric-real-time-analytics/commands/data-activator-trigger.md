---
name: data-activator-trigger
description: "Create a Data Activator (Reflex) trigger — monitor data for conditions and fire automated actions"
argument-hint: "<trigger-description> --source <eventstream|kql-db> --action <email|teams|power-automate>"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - AskUserQuestion
---

# Create a Data Activator Trigger

Configure a Data Activator (Reflex) item with triggers that monitor streaming or query data for specific conditions and fire automated actions.

## Instructions

### 1. Validate Inputs

- `<trigger-description>` — Natural-language description of the alert (e.g., "Alert when temperature exceeds 40 degrees for more than 2 minutes"). Ask if not provided.
- `--source` — Data source: `eventstream` (real-time events) or `kql-db` (scheduled KQL query). Ask if not provided.
- `--action` — Action to fire: `email`, `teams`, `power-automate`, `custom-endpoint`. Default: `email`.

### 2. Create the Reflex Item

```bash
az rest --method POST \
  --url "https://api.fabric.microsoft.com/v1/workspaces/${FABRIC_WORKSPACE_ID}/items" \
  --headers "Content-Type=application/json" \
  --body '{
    "type": "Reflex",
    "displayName": "<reflex-name>",
    "description": "<description>"
  }'
```

### 3. Configure the Data Source

**From Eventstream**:
1. Open the connected Eventstream.
2. Add a **Reflex** destination from the Eventstream designer.
3. Select the Reflex item created above.
4. Map event fields:
   - **Object ID**: The field that identifies the monitored entity (e.g., `DeviceId`, `UserId`, `StoreId`). Ask the user which field uniquely identifies the objects.
   - **Properties**: The fields to monitor for conditions (e.g., `Temperature`, `ErrorCount`). Ask the user which fields to track.
   - **Timestamp**: The event timestamp field.

**From KQL Database**:
1. In the Reflex designer, add a **KQL Database** data source.
2. Specify the Eventhouse and KQL database.
3. Write a KQL query that returns the data to monitor:

```kql
<Table>
| where Timestamp > ago(10m)
| summarize LatestValue = arg_max(Timestamp, <MetricColumn>) by <ObjectId>
| project <ObjectId>, <MetricColumn>, Timestamp
```

4. Set the polling interval (e.g., every 5 minutes, every 1 minute).

### 4. Define the Object

In the Reflex designer:
1. Create an object type (e.g., "Device", "Store", "User").
2. Set the object ID column (the field that uniquely identifies each instance).
3. Add properties to track:
   - **Numeric property**: Temperature, Revenue, ErrorCount
   - **String property**: Status, Region, Category
   - **Timestamp property**: LastSeen, LastOrder

### 5. Define the Trigger

Parse the trigger description to configure:

**Condition type mapping**:
| Description pattern | Condition type | Configuration |
|-------------------|---------------|---------------|
| "exceeds X" / "greater than X" | Numeric threshold | `Property > X` |
| "drops below X" / "less than X" | Numeric threshold | `Property < X` |
| "changes by more than X" | Change detection | `abs(Property - PreviousValue) > X` |
| "no events for X minutes" | Absence detection | `No event received in X minutes` |
| "changes from A to B" | State transition | `Property changed from A to B` |
| "equals X" | Exact match | `Property == X` |

**Sustain/dwell configuration**:
Ask the user if the condition must persist for a minimum duration before triggering:
- "for more than 2 minutes" --> Sustain = 2 minutes
- "for at least 5 minutes" --> Sustain = 5 minutes
- No sustain specified --> Recommend 1 minute for noisy data, immediate for critical alerts

**Suppression configuration**:
Ask the user about re-trigger behavior:
- "only once per hour" --> Suppress for 1 hour after firing
- "every time" --> No suppression (warn about alert fatigue)
- Default recommendation: suppress for the same duration as the sustain window

### 6. Configure the Action

**Email action**:
- Recipients: Ask for email addresses (comma-separated).
- Subject template: `"Alert: {ObjectId} - {PropertyName} is {PropertyValue}"`
- Body template: Include object ID, property value, threshold, timestamp, and a link to the dashboard.

**Teams message action**:
- Channel: Ask for the Teams channel URL or channel ID.
- Message template: `"[Alert] {ObjectId}: {PropertyName} = {PropertyValue} (threshold: {Threshold}) at {Timestamp}"`
- Format as Adaptive Card for richer presentation.

**Power Automate action**:
- Flow URL: Ask for the HTTP trigger URL of the Power Automate flow.
- Body: Pass event data as JSON (object ID, property name, value, timestamp, condition details).

**Custom endpoint action**:
- URL: Ask for the webhook endpoint.
- Headers: Optional custom headers (e.g., authorization).
- Body: JSON payload with trigger context.

### 7. Test the Trigger

Guide the user through testing:
1. Verify the data source is connected and receiving data.
2. Temporarily lower the threshold to trigger the condition with current data.
3. Observe the trigger firing in the Reflex run history.
4. Verify the action was delivered (check email, Teams channel, or flow run history).
5. Restore the original threshold after testing.

### 8. Display Summary

Show the user:
- Reflex item name and ID
- Data source (Eventstream or KQL database with query)
- Object type and ID field
- Trigger condition, sustain window, and suppression settings
- Action type and recipients/channel/endpoint
- How to view trigger history and debug missed or false alerts
- Next steps: add additional triggers, connect more data sources, or build a dashboard (`/rt-dashboard-create`)
