# Integration Patterns — Eventstream, Power BI, Power Automate, and Webhooks

This reference covers production integration patterns for connecting Microsoft Fabric Data Activator to event sources and action targets: Eventstream pipelines, Power BI report alerts, Power Automate flows, and custom webhook endpoints.

---

## Eventstream Integration

### Architecture Overview

```
Azure IoT Hub / Event Hubs / Custom App
    │
    ▼
Fabric Eventstream
    ├── [Filter + Project transformations]
    │
    ├──► KQL Database (persisted storage)
    │
    └──► Reflex Item (Data Activator)
            │
            ├── Object: Machine (key: machineId)
            │       Trigger: High Temperature → Email
            │
            └── Object: ProductionLine (key: lineId)
                    Trigger: Low Throughput → Teams + Flow
```

### Configuring Eventstream as Data Source

1. In the Reflex item, click **Data** > **Add data source**.
2. Select **Eventstream**.
3. Choose the workspace and eventstream name.
4. Select the output node from the eventstream (the node sending events to Data Activator).
5. Verify the data preview shows incoming events.
6. Map columns to object properties.

**Eventstream output node for Data Activator**:
In the eventstream canvas, add a **Reflex item** destination node:
1. Click **+** on the canvas > **Destination** > **Reflex item**.
2. Choose the workspace and Reflex item.
3. Connect the destination node to the upstream transformation node.

### Recommended Eventstream Transformations Before Data Activator

```
// Apply these transformations in the eventstream canvas before routing to Data Activator:

1. Filter (required for noisy sources):
   - Remove test/calibration events: eventType != "CALIBRATION"
   - Remove events with null key values: machineId is not null

2. Project (recommended):
   - Select only the columns needed for object properties
   - This reduces the payload size processed by Data Activator
   - Drop internal routing columns, metadata, unused fields

3. Aggregate (optional, for noisy sensors):
   - 1-minute tumbling window average for temperature, pressure
   - Reduces trigger noise from individual spike readings
   - Note: Adds 1-minute latency to alerting
```

### Multi-Object Events in Single Stream

When a stream carries events for multiple object types (e.g., both machine temperature readings and production line throughput):

```json
// Event type 1: Machine temperature
{ "eventType": "TempReading", "machineId": "MCH-042", "temperature": 87.3, "pressure": 195 }

// Event type 2: Production line throughput
{ "eventType": "ThroughputReading", "lineId": "LINE-A", "throughput": 95, "defectRate": 2.1 }
```

**Approach A — Single Reflex, multiple objects**:
Configure two objects in the same Reflex item. The `Machine` object uses `machineId` as the key and maps `temperature`/`pressure`. The `ProductionLine` object uses `lineId`. Properties for columns that don't exist in a particular event type receive null/missing values.

**Approach B — Filtered branches in eventstream**:
Use the eventstream Filter transformation to create two separate streams (one for TempReading, one for ThroughputReading), each routed to a dedicated Reflex item. This is cleaner but requires two Reflex items.

### High-Cardinality Sources

For eventstreams with thousands of unique key column values (e.g., 50,000 device IDs):
- Data Activator tracks up to 100,000 instances per object.
- For sources exceeding this limit, pre-aggregate or filter in the eventstream to reduce cardinality. For example, route only devices in a specific region or above a certain risk score to the Reflex item.

---

## Power BI Integration

### Set Alert from a Visual — Step-by-Step

1. Open a published Power BI report in a Fabric-enabled workspace.
2. Select a visual (bar chart, line chart, card, table, KPI).
3. Click the visual's `...` menu or right-click.
4. Select **Set alert** (requires the report to be in a Fabric workspace).
5. Data Activator opens with the visual's data pre-loaded.
6. Configure:
   - **Object**: Select or create an object (key column from a dimension in the visual).
   - **Property**: Select the measure to monitor.
   - **Condition**: Define the trigger condition.
   - **Action**: Configure email or Teams notification.
7. Click **Create** to save and start the trigger.

### Visual Type Mapping to Objects

| Visual Type | Recommended Key Column | Monitored Measure |
|-------------|----------------------|-------------------|
| Bar/column chart | Axis categories (dimension) | Bar value (measure) |
| Line chart with series | Legend field | Line value |
| Table | First column (ID) | Numeric columns |
| Card / KPI | None — single value monitoring | The card's value |
| Matrix | Row or column dimension | Value field |
| Map | Location field | Size/color measure |

**Card visual monitoring** — single value (no object instances):
When monitoring a card visual (e.g., "Total Revenue Today"), there is no key column. Data Activator creates a single-instance object. This is appropriate for global KPIs where you need one alert for the entire metric, not per-entity.

### Power BI Dataset Refresh Alignment

Data Activator evaluates Power BI-sourced properties each time the underlying dataset refreshes. Plan your alert freshness accordingly:

| Dataset mode | Evaluation frequency |
|-------------|---------------------|
| Import (scheduled) | At each scheduled refresh (e.g., hourly) |
| DirectQuery | At each report page load or auto-refresh |
| Live Connection (Analysis Services) | Query-time |
| Direct Lake (Fabric) | After each lakehouse table update |

**Implication**: If your dataset refreshes once per day, Data Activator can only detect threshold breaches at most once per day. For near-real-time alerting, use an Eventstream source instead of Power BI.

### RLS and Permissions

Data Activator evaluates Power BI data using the **Reflex item owner's** permissions. If the owner has row-level security (RLS) applied in the Power BI dataset, the trigger only sees rows the owner can access.

**Production recommendation**: Use a service principal as the Reflex item owner. Assign the service principal to the appropriate RLS role in the Power BI dataset. This prevents trigger failures when individual users leave the organization.

---

## Power Automate Integration

### Architecture

```
Data Activator trigger fires
    │
    ▼
HTTP POST → Power Automate HTTP trigger
    │
    ▼
Flow logic:
    ├── Parse JSON (trigger context)
    ├── Business condition check
    ├── Create ServiceNow ticket
    ├── Update Dataverse record
    ├── Send Teams Adaptive Card
    └── Start approval workflow
```

### Creating the Power Automate Flow

1. In Power Automate, create a **new cloud flow** > **Instant cloud flow**.
2. Choose trigger: **When an HTTP request is received** (or search for **Fabric Data Activator**).
3. Define the expected JSON schema (matches the webhook payload structure).
4. Build the flow logic.
5. Save and copy the HTTP trigger URL.
6. In the Reflex trigger action, select **Power Automate** and choose the flow (or paste the URL).

### Flow Input Schema (HTTP trigger)

```json
{
  "type": "object",
  "properties": {
    "triggerName": { "type": "string" },
    "triggerTime": { "type": "string", "format": "date-time" },
    "objectType": { "type": "string" },
    "objectKey": { "type": "string" },
    "properties": {
      "type": "object",
      "properties": {
        "temperature": { "type": "number" },
        "machineId": { "type": "string" },
        "status": { "type": "string" },
        "assignedEngineer": { "type": "string" }
      }
    },
    "workspaceName": { "type": "string" },
    "reflexItemName": { "type": "string" }
  }
}
```

### Common Flow Patterns

**Pattern: Create ServiceNow Incident**
```
Trigger: HTTP Request (from Data Activator)
    │
    ▼
Parse JSON (trigger context)
    │
    ▼
Condition: is triggerName == "High Temperature Alert"?
    │  YES
    ▼
ServiceNow - Create Record:
    table: incident
    short_description: "High Temp: {machineId} at {temperature}C"
    urgency: 2 (Medium)
    assignment_group: "Factory Operations"
    description: Full trigger context as JSON
    │
    ▼
Post Teams message with incident URL
```

**Pattern: Dynamic escalation based on severity**
```python
# In a Power Automate flow with HTTP trigger
# Extract severity from properties
temperature = trigger_body()["properties"]["temperature"]

if temperature > 95:
    # Critical — create P1 incident + call on-call
    send_sms_via_twilio(on_call_phone, f"P1: Machine {machineId} at {temperature}C")
    create_incident(priority=1)
elif temperature > 85:
    # High — create P2 incident + Teams message
    create_incident(priority=2)
    post_teams_message(channel="#ops-alerts")
```

### Security for Power Automate Integration

- The HTTP trigger URL contains a secret token. Treat it as a credential.
- Store the URL in Azure Key Vault, not in the Reflex action configuration in plain text.
- Use the **Fabric Data Activator connector** in Power Automate when available (OAuth-based, no URL secrets).
- Restrict the Power Automate HTTP trigger to specific IP ranges (Data Activator's egress IPs) if your security policy requires it.

---

## Webhook Integration

### Webhook Action Configuration

```json
{
  "actionType": "Webhook",
  "url": "https://api.contoso.com/webhooks/fabric-alerts",
  "method": "POST",
  "headers": {
    "Authorization": "Bearer eyJ...",
    "Content-Type": "application/json",
    "X-Source": "fabric-data-activator"
  }
}
```

**Security considerations**:
- Use HTTPS only (HTTP is rejected).
- Include authentication in the `Authorization` header or a custom header (`X-API-Key`).
- Never include secrets in the URL query string.
- Rotate webhook secrets regularly and update the Reflex action configuration.

### Webhook Receiver — Python Flask Example

```python
from flask import Flask, request, jsonify
import hmac
import hashlib
import logging

app = Flask(__name__)
WEBHOOK_SECRET = "your-shared-secret"

def verify_signature(payload_body: bytes, signature: str) -> bool:
    """Verify HMAC-SHA256 signature if Data Activator sends one."""
    expected = hmac.new(
        WEBHOOK_SECRET.encode(),
        payload_body,
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(f"sha256={expected}", signature)

@app.route("/webhooks/fabric-alerts", methods=["POST"])
def handle_fabric_alert():
    payload = request.get_json()

    if not payload:
        return jsonify({"error": "Invalid payload"}), 400

    trigger_name = payload.get("triggerName")
    object_key = payload.get("objectKey")
    properties = payload.get("properties", {})

    logging.info(f"Received trigger '{trigger_name}' for object '{object_key}'")

    # Route to different handlers based on trigger name
    if trigger_name == "High Temperature Alert":
        handle_high_temp(object_key, properties)
    elif trigger_name == "Order Cancelled":
        handle_order_cancellation(object_key, properties)

    # MUST return 200 within 30 seconds to avoid retry
    return jsonify({"status": "received"}), 200

def handle_high_temp(machine_id: str, props: dict):
    temperature = props.get("temperature")
    location = props.get("location")
    # ... create incident, notify team, etc.
    pass

if __name__ == "__main__":
    app.run(port=8080)
```

### Webhook Retry Behavior

| Attempt | Delay | Total elapsed |
|---------|-------|---------------|
| 1 (initial) | 0s | 0s |
| 2 (retry 1) | 1s | ~1s |
| 3 (retry 2) | 5s | ~6s |
| 4 (retry 3) | 25s | ~31s |

After 3 retries with no success (non-2xx response or timeout), the action is marked as **Failed** in the trigger history. The trigger continues monitoring — failed actions do not stop the trigger.

**Return 200 quickly**: If your webhook handler performs slow operations (database writes, external API calls), acknowledge the request immediately with 200 and process asynchronously. A response taking longer than 30 seconds is treated as a timeout and retried.

---

## Dynamic Recipients Pattern

Send alerts to different recipients based on object properties (per-instance routing):

### Email — Dynamic Recipient

```json
{
  "actionType": "Email",
  "recipients": ["{assignedEngineer}"],
  "subject": "Alert: {machineId} temperature threshold breached",
  "body": "Temperature: {temperature}C\nTrigger time: {TriggerTime}"
}
```

The `{assignedEngineer}` token is replaced with the object's `assignedEngineer` property value. Each Machine instance fires the alert to its own assigned engineer.

**Validation**: Before deploying, verify the `assignedEngineer` property contains valid email addresses in the data preview. Invalid addresses cause delivery failures without failing the trigger.

### Teams — Dynamic Channel Routing

Teams channel routing is limited to static channels. To route to different channels per object instance, use a webhook action and implement routing logic in the receiver (or use Power Automate with conditional channel selection).

---

## Common Patterns and Gotchas

**Pattern: Idempotent webhook receivers**
Data Activator may deliver the same webhook multiple times (retries, at-least-once delivery). Implement idempotency in your receiver:
```python
# Use triggerTime + objectKey as idempotency key
idempotency_key = f"{trigger_name}:{object_key}:{trigger_time}"
if redis_client.exists(idempotency_key):
    return jsonify({"status": "duplicate"}), 200  # Still 200 to stop retries
redis_client.setex(idempotency_key, 3600, "processed")
process_alert(payload)
```

**Pattern: Feedback loop prevention**
If a Power Automate flow triggered by Data Activator writes data back to the event source that feeds the Reflex item, you can create a feedback loop where each alert generates new events that trigger more alerts. Add a "written by automation" flag to events produced by flows, and filter them out in the eventstream before they reach Data Activator.

**Pattern: Business hours filtering**
Use a Power Automate flow as the action. In the flow, check the current time and only escalate during business hours; during off-hours, create a low-priority ticket instead of paging the on-call engineer.

**Gotcha: Power BI reports must be in a Fabric-enabled workspace**
Reports in classic Power BI workspaces (non-Fabric) cannot be used as Data Activator sources. The workspace must have a Fabric capacity assigned.

**Gotcha: Eventstream consumer group**
Each Reflex item destination in an eventstream creates its own consumer group. When you add a second Reflex destination to the same eventstream, verify the Event Hub/IoT Hub partition count supports two independent consumer groups (each reading independently). Exceeding consumer group limits on Event Hubs causes `ConsumerGroupLimitExceeded` errors.

**Gotcha: Service principal for production Reflex items**
If a Reflex item is owned by a personal user account and that user leaves the organization, all triggers stop working. Always transfer ownership to a service principal before deploying to production. Use the Fabric portal > Workspace settings > Manage access to change ownership.
