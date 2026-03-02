---
name: Fabric Data Activator
description: >
  Deep expertise in Microsoft Fabric Data Activator — create Reflex items with tracked objects and
  properties, define trigger conditions (threshold, state change, absence, trend), configure actions
  (email, Teams, Power Automate, webhook), integrate with eventstreams and Power BI visuals, and
  build event-driven automation on real-time Fabric data. Targets data engineers and analysts
  building proactive alerting and monitoring solutions.
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
triggers:
  - data activator
  - reflex
  - fabric trigger
  - fabric alert
  - data alert
  - condition trigger
  - real time action
  - fabric notification
  - reflex item
  - activator
  - fabric automation
  - event driven fabric
---

# Fabric Data Activator

## 1. Data Activator Overview

Microsoft Fabric Data Activator is a no-code experience for taking automated actions when conditions are detected in changing data. It monitors data from Fabric eventstreams, Power BI reports, and other Fabric data sources, then triggers actions such as emails, Teams messages, Power Automate flows, or custom webhooks when specified conditions are met.

**Core concepts**:
| Concept | Description |
|---------|-------------|
| Reflex item | The container artifact in a Fabric workspace that holds objects, triggers, and actions |
| Object | A real-world entity being tracked (e.g., Machine, Order, Patient, Sensor) |
| Property | A data attribute of an object (e.g., temperature, status, totalAmount) |
| Trigger | A condition evaluated against object properties that fires when met |
| Action | The response executed when a trigger fires (email, Teams, flow, webhook) |

**How Data Activator relates to the Fabric ecosystem**:
- **Eventstreams** provide real-time data ingestion from IoT hubs, Kafka, custom apps, and Azure Event Hubs. Data Activator can consume eventstream output directly.
- **Power BI** reports and dashboards expose measures and visual data that Data Activator can monitor via the "Set alert" experience.
- **Lakehouse / Warehouse** tables can feed Data Activator through eventstreams or scheduled data pipelines.
- **Power Automate** extends action capabilities beyond email and Teams to arbitrary business workflows.

**When to use Data Activator vs alternatives**:
| Scenario | Use |
|----------|-----|
| Alert when a real-time metric crosses a threshold | Data Activator |
| Alert when a KPI in a Power BI report changes | Data Activator |
| Run a complex multi-step business process on data change | Power Automate (triggered by Data Activator) |
| Batch ETL with conditional logic | Fabric Data Pipeline |
| Stream processing with transformations | Fabric Eventstream + KQL |
| Static threshold on a single Power BI tile | Power BI native alerts (simpler but limited) |

Data Activator is ideal when you need to monitor multiple objects (e.g., hundreds of machines) with per-object state tracking, rather than a single global metric.

## 2. Reflex Items

A Reflex item is the top-level artifact in a Fabric workspace that organizes everything related to a Data Activator monitoring scenario.

**Create a Reflex item**:
1. Open a Fabric workspace.
2. Select **+ New item** > **Reflex** (under the Real-Time Intelligence category).
3. Name the Reflex item descriptively (e.g., `Factory-Temperature-Monitor`, `Sales-KPI-Alerts`).

**Reflex item structure**:
```
Reflex Item: Factory-Temperature-Monitor
├── Data sources
│   ├── Eventstream: iot-sensor-stream
│   └── Power BI: Sales Dashboard / Revenue Chart
├── Objects
│   ├── Machine
│   │   ├── Properties: temperature, pressure, status
│   │   └── Key column: machineId
│   └── ProductionLine
│       ├── Properties: throughput, defectRate
│       └── Key column: lineId
└── Triggers
    ├── High Temperature Alert
    │   ├── Condition: Machine.temperature > 85
    │   └── Action: Email to ops-team@contoso.com
    └── Low Throughput Warning
        ├── Condition: ProductionLine.throughput < 100 for 10 minutes
        └── Action: Teams message to #factory-alerts
```

**Data sources for Reflex items**:
| Source | How to connect | Data delivery |
|--------|---------------|---------------|
| Eventstream | Select an existing eventstream in the workspace | Real-time (seconds) |
| Power BI visual | Right-click a visual > "Set alert" | Near real-time (refresh-dependent) |
| Fabric OneLake data | Route through an eventstream | Real-time or scheduled |
| Custom app | Send events to an eventstream via REST API | Real-time |

**Data preview**: After connecting a data source, the Reflex item shows a data preview pane where you can inspect incoming events, verify column names and types, and confirm data is flowing before defining objects.

**Naming conventions**:
- Use PascalCase for object names: `Machine`, `SalesOrder`, `PatientVital`
- Use camelCase for property names: `temperature`, `orderTotal`, `heartRate`
- Use kebab-case for Reflex item names: `factory-monitor`, `sales-kpi-alerts`

**Workspace organization**: Group related Reflex items in the same workspace as their data sources. A Reflex item can reference eventstreams and Power BI reports only within the same workspace or workspaces the user has access to.

## 3. Objects & Properties

Objects represent the real-world entities that Data Activator tracks. Each object instance is identified by a key column, and its state is described by properties mapped from incoming data columns.

**Define a tracked object**:
1. In the Reflex item, go to the **Design** tab.
2. Click **New object** and provide a name (e.g., `Machine`).
3. Select the **key column** — the column that uniquely identifies each instance of the object (e.g., `machineId`).
4. Map **properties** from the data source columns to the object.

**Key column requirements**:
- Must contain unique identifiers for each object instance.
- Common examples: `deviceId`, `orderId`, `customerId`, `sensorId`.
- The key column determines how many object instances Data Activator tracks. If `machineId` has 50 distinct values, Data Activator tracks 50 Machine objects independently.
- Each object instance maintains its own trigger state (e.g., Machine-001 can be in an alert state while Machine-002 is normal).

**Property types**:
| Type | Source column examples | Operators available |
|------|----------------------|---------------------|
| Numeric | temperature, pressure, amount, count | `>`, `<`, `>=`, `<=`, `==`, `!=`, `between` |
| String | status, category, region, errorCode | `equals`, `not equals`, `contains`, `starts with`, `ends with` |
| Boolean | isActive, isOverdue, hasError | `is true`, `is false`, `changes to true`, `changes to false` |
| DateTime | lastUpdated, createdAt, expiresOn | `before`, `after`, `older than` |

**Property mapping example**:
```
Data source columns:          Object: Machine
─────────────────────         ─────────────────
machineId          ──────►    Key column: machineId
sensorTemperature  ──────►    Property: temperature (Numeric)
sensorPressure     ──────►    Property: pressure (Numeric)
machineStatus      ──────►    Property: status (String)
lastHeartbeat      ──────►    Property: lastHeartbeat (DateTime)
```

**Derived properties**: In addition to direct column mappings, you can create derived properties using expressions:
- **Aggregations**: Average, sum, min, max, count over a time window (e.g., average temperature over the last 5 minutes).
- **Calculations**: Arithmetic on existing properties (e.g., `temperature - baselineTemp`).
- **Time-based**: Time since last event, events per minute.

**Multiple data sources per object**: An object can receive properties from multiple data sources. For example, a `Machine` object could get `temperature` from an IoT eventstream and `maintenanceStatus` from a Power BI dataset. All properties are correlated by the key column.

**Sample values**: After mapping properties, the design pane shows sample values for each property across recent object instances. Use this to verify:
- The key column is producing the expected number of distinct objects.
- Property values are in the expected range and type.
- Data is flowing at the expected frequency.

## 4. Triggers

Triggers define the conditions under which Data Activator takes action. Each trigger belongs to an object and evaluates conditions against that object's properties. Triggers are evaluated independently for each object instance.

**Create a trigger**:
1. In the Reflex item, select an object (e.g., `Machine`).
2. Click **New trigger**.
3. Name the trigger descriptively (e.g., `High Temperature Alert`).
4. Define the condition(s).
5. Configure the action(s).
6. **Start** the trigger to begin monitoring.

**Condition types**:

| Condition type | Description | Example |
|---------------|-------------|---------|
| Value comparison | Property compared to a static or dynamic threshold | `temperature > 85` |
| Value change | Property value changes (any change or to a specific value) | `status changes to "Error"` |
| Becomes true | A boolean expression transitions from false to true | `temperature > 85` becomes true |
| Remains true | Condition stays true for a specified duration | `temperature > 85 for 10 minutes` |
| Absence | No data received for a specified duration | `No events for 5 minutes` |

**Comparison operators**:
| Operator | Applies to | Description |
|----------|-----------|-------------|
| `>` | Numeric | Greater than |
| `<` | Numeric | Less than |
| `>=` | Numeric | Greater than or equal |
| `<=` | Numeric | Less than or equal |
| `==` | Numeric, String | Equal to |
| `!=` | Numeric, String | Not equal to |
| `between` | Numeric | Within a range (inclusive) |
| `equals` | String | Exact string match |
| `contains` | String | Substring match |
| `starts with` | String | Prefix match |
| `ends with` | String | Suffix match |

**Compound conditions**: Combine multiple conditions with logical operators:
- **AND**: All conditions must be true simultaneously.
- **OR**: At least one condition must be true.
- Conditions can reference different properties of the same object.
- Example: `temperature > 85 AND pressure > 200` (both must be true for the same Machine instance).

**Duration conditions ("remains true for")**:
- Reduces noise from transient spikes.
- The condition must remain continuously true for the specified duration.
- If the condition becomes false at any point during the duration window, the timer resets.
- Common durations: 1 minute, 5 minutes, 10 minutes, 30 minutes, 1 hour.

**Debounce and cooldown**:
- **Cooldown period**: After a trigger fires, it will not fire again for the same object instance until the cooldown period elapses. Prevents notification storms.
- Recommended cooldowns: 5 minutes for real-time IoT, 1 hour for business KPIs, 24 hours for daily reports.
- A trigger firing for Machine-001 does not affect the cooldown for Machine-002 — each instance is independent.

**Trigger state machine**: Each trigger, per object instance, follows this lifecycle:
```
                  ┌──────────────┐
                  │   Inactive   │ (trigger stopped or not started)
                  └──────┬───────┘
                         │ Start trigger
                         ▼
                  ┌──────────────┐
          ┌──────►│  Monitoring  │◄──────────────────────────────┐
          │       └──────┬───────┘                               │
          │              │ Condition becomes true                 │
          │              ▼                                       │
          │       ┌──────────────┐                               │
          │       │  Evaluating  │ (for "remains true" triggers) │
          │       └──────┬───────┘                               │
          │              │ Duration elapsed                      │
          │              ▼                                       │
          │       ┌──────────────┐                               │
          │       │    Fired     │───────► Execute action(s)     │
          │       └──────┬───────┘                               │
          │              │ Cooldown elapsed                      │
          └──────────────┘                                       │
                  OR condition becomes false ────────────────────┘
```

**Testing triggers**: Before starting a trigger in production:
1. Use the **data preview** to verify the property values that will be evaluated.
2. Set a lenient threshold first to confirm the trigger fires, then tighten it.
3. Check the trigger history after a few hours to verify the firing frequency is acceptable.

## 5. Actions

Actions define what happens when a trigger fires. Each trigger can have one or more actions that execute simultaneously.

**Action types**:
| Action type | Description | Configuration required |
|-------------|-------------|----------------------|
| Email | Send an email notification | Recipient email address(es), subject, body |
| Teams message | Post a message to a Teams channel or chat | Team/channel selection or user |
| Power Automate flow | Invoke a cloud flow with trigger context | Flow URL and input parameters |
| Custom webhook | Send an HTTP POST to an external endpoint | Webhook URL (HTTPS) and payload template |

**Email action configuration**:
- **To**: One or more email addresses (comma-separated).
- **Subject**: Static text with optional dynamic tokens (e.g., `Alert: {MachineName} temperature is {temperature}`).
- **Body**: Rich text with dynamic tokens from the trigger context.
- **Dynamic tokens available**: `{ObjectName}`, `{PropertyName}`, `{PropertyValue}`, `{TriggerName}`, `{TriggerTime}`, `{WorkspaceName}`, and any object property by name.

**Teams message action configuration**:
- **Target**: A specific Teams channel or individual user.
- **Message**: Text with dynamic tokens, rendered as an Adaptive Card in the channel.
- **Mention**: Optionally @mention specific users in the message.

**Power Automate flow action**:
- **How it works**: Data Activator invokes a Power Automate flow via an HTTP trigger. The flow receives the trigger context as JSON input.
- **Setup**:
  1. Create a Power Automate cloud flow with an HTTP request trigger (or a Fabric Data Activator trigger connector).
  2. Define the expected input schema (object properties, trigger metadata).
  3. In the Reflex trigger action, select "Power Automate" and choose the flow.
- **Common flow actions after trigger**: Create a ServiceNow ticket, update a Dataverse record, send an SMS via Twilio, post to Slack, start an approval.

**Custom webhook action**:
- **URL**: Must be HTTPS. The endpoint receives an HTTP POST with a JSON payload.
- **Payload**: Contains trigger context including object key, property values at trigger time, trigger name, and timestamp.
- **Authentication**: Include API keys or tokens in custom headers (not in the URL).
- **Retry**: Data Activator retries failed webhook calls with exponential backoff.

**Webhook payload structure**:
```json
{
  "triggerName": "High Temperature Alert",
  "triggerTime": "2025-03-15T14:30:00Z",
  "objectType": "Machine",
  "objectKey": "MCH-042",
  "properties": {
    "temperature": 92.5,
    "pressure": 210,
    "status": "Warning"
  },
  "workspaceName": "Factory-Monitoring",
  "reflexItemName": "Temperature-Monitor"
}
```

**Action throttling**:
- Configure maximum actions per hour per object instance to prevent notification fatigue.
- Default behavior: Data Activator applies reasonable throttling, but explicit configuration is recommended.
- Example: For an IoT scenario with data every second, set throttling to 1 action per 15 minutes per machine.

**Recipient configuration**:
- Static recipients: Hardcoded email addresses or Teams channels.
- Dynamic recipients: Use an object property as the recipient (e.g., `assignedEngineer` property contains the email of the responsible person). The action is sent to different recipients per object instance.

## 6. Power BI Integration

Data Activator integrates directly with Power BI, allowing users to create alerts on visual data without writing code or configuring eventstreams.

**Set alert from a Power BI visual**:
1. Open a Power BI report in the Fabric portal (the report must be in a Fabric workspace).
2. Right-click on a visual (chart, KPI, card, table) or select the visual's `...` menu.
3. Select **Set alert** (or **Trigger action**).
4. Data Activator opens with the visual's data pre-loaded.
5. Define the object (what entity the visual tracks), the measure to monitor, and the trigger condition.
6. Configure the action and start the trigger.

**How visual-to-Reflex data binding works**:
- Data Activator extracts the measure values and dimension columns from the selected visual.
- Dimension columns become candidate key columns for objects (e.g., a bar chart with `Region` on the axis creates a `Region` object).
- Measure values become properties (e.g., `Revenue`, `UnitsSold`).
- Data Activator polls the Power BI dataset on a schedule (aligned with the dataset refresh) to get updated values.

**Measure-based triggers**:
- Monitor a Power BI measure value against a threshold.
- Example: `Revenue < 50000` for any `Region` object fires an alert.
- The measure is re-evaluated each time the underlying dataset refreshes.
- For DirectQuery or Live Connection datasets, evaluation frequency depends on the query cache TTL.

**Supported visual types for alerting**:
| Visual type | Key column candidates | Measure candidates |
|-------------|----------------------|-------------------|
| Bar/Column chart | Axis categories | Bar values |
| Line chart | Legend or axis categories | Line values |
| Table/Matrix | Any column | Numeric columns |
| Card/KPI | None (single value) | The displayed value |
| Map | Location fields | Size/color values |
| Pie/Donut | Slices | Slice values |

**No-code alert creation flow**:
```
Power BI Visual ──► "Set alert" ──► Data Activator opens
                                       │
                     Select object key column (e.g., Region)
                                       │
                     Select measure to monitor (e.g., Revenue)
                                       │
                     Define condition (e.g., Revenue < 50000)
                                       │
                     Configure action (email / Teams)
                                       │
                     Start trigger ──► Monitoring active
```

**Limitations of Power BI integration**:
- Data freshness depends on the Power BI dataset refresh schedule (Import mode) or query cache (DirectQuery).
- Not suitable for sub-second alerting; use eventstreams for real-time requirements.
- The Power BI report must be published to a Fabric-enabled workspace.
- Visual-level security (RLS) applies: triggers only see data the Reflex item owner can access.

## 7. Eventstream Integration

Eventstreams provide the real-time data backbone for Data Activator. When sub-second or second-level alerting is required, eventstreams are the preferred data source.

**Eventstream as a data source**:
1. Create an eventstream in the Fabric workspace (or use an existing one).
2. Configure the eventstream source: Azure Event Hubs, Azure IoT Hub, custom app (REST), Kafka, or sample data.
3. In the Reflex item, select the eventstream as the data source.
4. Data Activator begins receiving events in real-time.

**Real-time processing pipeline**:
```
Source (IoT Hub / Event Hub / Custom App)
    │
    ▼
Eventstream (ingestion + optional transformation)
    │
    ├──► Lakehouse (persist for analytics)
    │
    └──► Reflex item (Data Activator monitoring)
            │
            ├──► Object: Machine (key: machineId)
            │       ├── Property: temperature
            │       ├── Property: pressure
            │       └── Trigger: High Temperature Alert
            │
            └──► Object: ProductionLine (key: lineId)
                    ├── Property: throughput
                    └── Trigger: Low Throughput Warning
```

**Filtering before Reflex**: Use eventstream transformations to filter events before they reach Data Activator:
- **Filter operator**: Remove events that do not need monitoring (e.g., heartbeat-only events).
- **Project operator**: Select only the columns needed for object properties (reduces processing).
- **Aggregate operator**: Pre-aggregate values (e.g., 1-minute averages) to smooth noisy sensor data.

**Windowed aggregations**: Eventstreams support tumbling, hopping, and sliding windows:
- **Tumbling window**: Non-overlapping fixed intervals (e.g., every 5 minutes).
- **Hopping window**: Fixed-size windows that advance by a hop interval (e.g., 5-minute window every 1 minute).
- **Sliding window**: Window that slides with each event.
- Pre-aggregated values from windowed operations flow into Data Activator as smoothed properties.

**Routing events to objects**: When an eventstream carries events for multiple object types (e.g., temperature readings and status changes), use eventstream routing:
- **Split by event type**: Use a filter to create separate streams per event type, each feeding a different object in the Reflex item.
- **Unified stream**: Send all events to one Reflex item and use the key column to differentiate objects. Different properties map from different event schemas using column presence.

**Event schema example** (JSON events from IoT Hub):
```json
{
  "machineId": "MCH-042",
  "temperature": 87.3,
  "pressure": 195,
  "status": "Running",
  "timestamp": "2025-03-15T14:30:05Z"
}
```

This schema maps directly to a `Machine` object with `machineId` as the key and `temperature`, `pressure`, `status` as properties.

## 8. Trigger Patterns

Common trigger patterns for different monitoring scenarios.

**Pattern 1: Threshold alert** — Fire when a numeric value exceeds a limit.
- **Use case**: Temperature exceeds safe operating range.
- **Object**: Machine (key: `machineId`).
- **Condition**: `temperature > 85`.
- **Cooldown**: 15 minutes.
- **Action**: Email to `ops-team@contoso.com`.
- **Refinement**: Add "remains true for 2 minutes" to avoid transient spikes.

**Pattern 2: Anomaly detection (deviation from baseline)** — Fire when a value deviates significantly from its historical norm.
- **Use case**: Network traffic spike indicating potential DDoS or misconfiguration.
- **Object**: Server (key: `serverId`).
- **Approach**: Create a derived property that computes the difference between current value and a rolling average. Trigger when deviation exceeds a threshold.
- **Condition**: `currentTraffic - avgTraffic(30min) > 500` (derived property > 500).
- **Cooldown**: 30 minutes.
- **Action**: Teams message to `#network-ops` + Power Automate flow to create an incident.

**Pattern 3: State change alert** — Fire when an object transitions between states.
- **Use case**: Order status changes to "Cancelled" or "On Hold".
- **Object**: SalesOrder (key: `orderId`).
- **Condition**: `status changes to "Cancelled"`.
- **Cooldown**: None (each cancellation should trigger).
- **Action**: Email to the order's `salesRep` (dynamic recipient from object property).

**Pattern 4: Absence detection** — Fire when expected data stops arriving.
- **Use case**: IoT device goes offline (no heartbeat for 5 minutes).
- **Object**: Sensor (key: `sensorId`).
- **Condition**: `No events received for 5 minutes`.
- **Cooldown**: 1 hour (avoid repeated alerts for the same outage).
- **Action**: Email to `iot-support@contoso.com` + webhook to monitoring dashboard.

**Pattern 5: Trend alert (sustained increase/decrease)** — Fire when a value trends in one direction over time.
- **Use case**: CPU utilization trending upward over 30 minutes, indicating a memory leak.
- **Object**: VirtualMachine (key: `vmId`).
- **Approach**: Use a derived property computing the slope of CPU values over a 30-minute sliding window. Trigger when slope exceeds a threshold.
- **Condition**: `cpuSlope30min > 0.5` (CPU increasing by more than 0.5% per minute sustained).
- **Cooldown**: 2 hours.
- **Action**: Power Automate flow to scale up the VM and notify the DevOps team.

**Pattern selection guide**:
| Scenario | Pattern | Key configuration |
|----------|---------|-------------------|
| Single metric exceeds a limit | Threshold | Static comparison + cooldown |
| Metric deviates from norm | Anomaly detection | Derived property (current - average) |
| Categorical value changes | State change | "changes to" condition |
| Data stops flowing | Absence | "no events for" condition |
| Gradual drift over time | Trend | Derived property (slope/rate of change) |

## 9. REST API

The Fabric REST API provides programmatic access to manage Reflex items, objects, triggers, and actions. This enables infrastructure-as-code and CI/CD workflows for Data Activator configurations.

**Base URL**: `https://api.fabric.microsoft.com/v1`

**Authentication**: Use Azure AD bearer tokens with the `https://api.fabric.microsoft.com/.default` scope.

```bash
# Acquire a token using Azure CLI
az account get-access-token --resource https://api.fabric.microsoft.com --query accessToken -o tsv
```

**Reflex item CRUD**:
| Operation | Method | Endpoint |
|-----------|--------|----------|
| List Reflex items | GET | `/workspaces/{workspaceId}/reflexes` |
| Get Reflex item | GET | `/workspaces/{workspaceId}/reflexes/{reflexId}` |
| Create Reflex item | POST | `/workspaces/{workspaceId}/reflexes` |
| Update Reflex item | PATCH | `/workspaces/{workspaceId}/reflexes/{reflexId}` |
| Delete Reflex item | DELETE | `/workspaces/{workspaceId}/reflexes/{reflexId}` |

**Create a Reflex item**:
```bash
curl -X POST "https://api.fabric.microsoft.com/v1/workspaces/{workspaceId}/reflexes" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "displayName": "Factory-Temperature-Monitor",
    "description": "Monitors factory machine temperatures and alerts on thresholds"
  }'
```

**Trigger management via API**:
| Operation | Method | Endpoint |
|-----------|--------|----------|
| List triggers | GET | `/workspaces/{workspaceId}/reflexes/{reflexId}/triggers` |
| Start a trigger | POST | `/workspaces/{workspaceId}/reflexes/{reflexId}/triggers/{triggerId}/start` |
| Stop a trigger | POST | `/workspaces/{workspaceId}/reflexes/{reflexId}/triggers/{triggerId}/stop` |

**Programmatic configuration**: Use the API to:
- Deploy identical Reflex configurations across dev/test/prod workspaces.
- Bulk-create triggers from a configuration file (JSON or YAML).
- Automate trigger start/stop as part of deployment pipelines.
- Export Reflex definitions for version control.

## 10. Security

Data Activator security is governed by Fabric workspace roles, data access controls, and action recipient permissions.

**Workspace roles and capabilities**:
| Role | Can view Reflex | Can create/edit triggers | Can start/stop triggers | Can delete Reflex |
|------|----------------|------------------------|------------------------|-------------------|
| Viewer | Yes | No | No | No |
| Contributor | Yes | Yes | Yes | No |
| Member | Yes | Yes | Yes | No |
| Admin | Yes | Yes | Yes | Yes |

**Data access**: Triggers evaluate data using the permissions of the Reflex item owner. If the owner loses access to the underlying data source, triggers stop working. Best practice: use a service principal or shared service account as the Reflex owner for production scenarios.

**Action recipient permissions**:
- Email and Teams actions can send to any valid address, but the content includes data from the trigger context.
- Ensure recipients are authorized to see the underlying data (e.g., do not send financial data to external partners without approval).
- Use dynamic recipients (from object properties) carefully — validate that the property contains internal addresses only.

**Audit and compliance**:
- Trigger execution history is retained in the Reflex item and visible to workspace members.
- Fabric audit logs capture Reflex item creation, modification, trigger start/stop events.
- Integrate with Microsoft Purview for data governance policies on Reflex items.

## 11. Monitoring & Debugging

Data Activator provides built-in tools to monitor trigger health, investigate issues, and debug unexpected behavior.

**Trigger history**: Each trigger maintains a history of:
- Every time the trigger condition was evaluated.
- Every time the trigger fired (condition met + action executed).
- The property values at the time of each evaluation and firing.
- The action execution result (success, failure, throttled).

**Accessing trigger history**:
1. Open the Reflex item in the Fabric portal.
2. Select the trigger.
3. Switch to the **History** tab.
4. Filter by time range, object instance, or execution status.

**Common issues and debugging**:
| Issue | Possible cause | Investigation steps |
|-------|---------------|---------------------|
| Trigger never fires | Condition too strict, data not flowing, trigger not started | Check data preview for current values; verify trigger is in "Started" state |
| Trigger fires too often | Condition too lenient, no cooldown, noisy data | Add cooldown period; add "remains true for" duration; smooth data with aggregation |
| Action not delivered | Invalid recipient, throttled, webhook endpoint down | Check action execution log; verify recipient addresses; test webhook URL |
| Trigger fires for wrong objects | Key column incorrect, multiple objects with same key | Verify key column uniqueness; check data preview for duplicate keys |
| Delayed trigger firing | Power BI data source with infrequent refresh | Switch to eventstream for lower latency; increase Power BI refresh frequency |

**Missed triggers**: If the Fabric service experiences downtime, triggers may miss events during the outage. Data Activator does not retroactively evaluate historical data when it recovers. For critical alerting, implement redundant monitoring (e.g., a parallel Azure Stream Analytics job).

**Error investigation workflow**:
1. Open the trigger's **History** tab.
2. Filter for **Failed** executions.
3. Inspect the error message (e.g., "Webhook returned 503", "Email delivery failed").
4. Fix the root cause (endpoint availability, recipient validity).
5. Optionally re-trigger manually by stopping and restarting the trigger.

## 12. Common Patterns

### Pattern 1: IoT Temperature Threshold Alert via Eventstream

**Scenario**: A factory has 200 machines sending temperature readings every 5 seconds via Azure IoT Hub. Alert operations when any machine exceeds 85 degrees for more than 2 minutes.

**Setup**:
1. **Eventstream**: Create an eventstream sourced from Azure IoT Hub. Apply a filter transformation to pass only `eventType == "temperature"`.
2. **Reflex item**: Create `Factory-Temperature-Monitor` in the same workspace.
3. **Object**: `Machine` with key column `machineId`. Map properties: `temperature` (numeric), `location` (string), `lastReading` (datetime).
4. **Trigger**: `High Temperature Alert`
   - Condition: `temperature > 85` remains true for 2 minutes.
   - Cooldown: 15 minutes per machine.
5. **Action**: Email to `factory-ops@contoso.com` with subject `ALERT: Machine {machineId} at {location} — Temperature {temperature}C`.
6. **Start** the trigger.

**Result**: Each of the 200 machines is monitored independently. Machine-042 can fire an alert while Machine-001 remains in normal range. After firing, Machine-042 enters a 15-minute cooldown before it can fire again.

### Pattern 2: Sales KPI Breach from Power BI

**Scenario**: A sales dashboard shows daily revenue by region. Alert regional sales managers when their region's revenue drops below target.

**Setup**:
1. **Power BI report**: Open the `Sales Dashboard` report showing a bar chart of revenue by region.
2. **Set alert**: Right-click the revenue bar chart > **Set alert**.
3. **Object**: `Region` with key column `regionName`.
4. **Property**: `dailyRevenue` from the chart's measure.
5. **Trigger**: `Revenue Below Target`
   - Condition: `dailyRevenue < 50000`.
   - No duration (fire on first detection).
   - Cooldown: 24 hours per region (once daily).
6. **Action**: Email to the region's `salesManager` property (dynamic recipient).

**Result**: Each region is monitored independently. When the Power BI dataset refreshes and a region's revenue is below 50,000, the regional sales manager receives a personalized alert. The 24-hour cooldown prevents duplicate alerts within the same business day.

### Pattern 3: Order Status Change Notification

**Scenario**: An e-commerce platform sends order events to an eventstream. Notify the customer support team whenever an order is cancelled or put on hold.

**Setup**:
1. **Eventstream**: Connected to the order management system via Azure Event Hubs. Events include `orderId`, `status`, `customerName`, `orderTotal`, `assignedAgent`.
2. **Reflex item**: Create `Order-Status-Monitor`.
3. **Object**: `SalesOrder` with key column `orderId`. Map properties: `status`, `customerName`, `orderTotal`, `assignedAgent`.
4. **Trigger 1**: `Order Cancelled`
   - Condition: `status changes to "Cancelled"`.
   - Cooldown: None (every cancellation matters).
   - Action: Teams message to `#order-escalations` channel with details.
5. **Trigger 2**: `Order On Hold`
   - Condition: `status changes to "OnHold"` remains true for 30 minutes.
   - Cooldown: 2 hours.
   - Action: Email to `assignedAgent` (dynamic) with order details.

**Result**: Immediate notification for cancellations. For holds, the 30-minute duration ensures the order is genuinely stuck (not just a transient state during processing). The assigned agent receives a direct email with the order context.

### Pattern 4: Service Health Monitoring with Escalation

**Scenario**: Monitor multiple Azure services for health. If a service is degraded, alert the on-call team. If it remains degraded for 30 minutes, escalate to management.

**Setup**:
1. **Eventstream**: A custom application polls Azure Service Health API every minute and sends health status events to a Fabric eventstream. Events include `serviceName`, `healthStatus` ("Healthy", "Degraded", "Outage"), `region`, `impactDescription`.
2. **Reflex item**: Create `Service-Health-Monitor`.
3. **Object**: `AzureService` with key column `serviceName`. Map properties: `healthStatus`, `region`, `impactDescription`.
4. **Trigger 1**: `Service Degraded — Initial Alert`
   - Condition: `healthStatus changes to "Degraded"` OR `healthStatus changes to "Outage"`.
   - Cooldown: 1 hour.
   - Action: Teams message to `#cloud-ops` channel + Email to on-call rotation.
5. **Trigger 2**: `Service Degraded — Escalation`
   - Condition: `healthStatus == "Degraded"` OR `healthStatus == "Outage"` remains true for 30 minutes.
   - Cooldown: 4 hours.
   - Action: Email to `engineering-leads@contoso.com` + Power Automate flow to create a P1 incident in ServiceNow.

**Result**: The two-tier alerting provides immediate visibility for the on-call team and automatic escalation if the issue persists. Each Azure service is tracked independently, so a degradation in `Azure SQL` does not affect the monitoring of `Azure App Service`. The Power Automate flow ensures a formal incident is created for prolonged outages.
