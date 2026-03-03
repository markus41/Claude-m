# Reflex Items — REST API, Object Schema, and Lifecycle Management

This reference covers the Fabric REST API for Reflex item CRUD, object and property schema definitions, lifecycle states, and operational management patterns for Microsoft Fabric Data Activator.

---

## Reflex Item REST API

**Base URL**: `https://api.fabric.microsoft.com/v1`

**Authentication**: Azure AD bearer token with scope `https://api.fabric.microsoft.com/.default`

```bash
TOKEN=$(az account get-access-token --resource https://api.fabric.microsoft.com --query accessToken -o tsv)
```

### Reflex Item CRUD

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|---------------------|----------------|-------|
| GET | `/workspaces/{workspaceId}/reflexes` | Workspace Viewer | — | Lists all Reflex items in workspace |
| GET | `/workspaces/{workspaceId}/reflexes/{reflexId}` | Workspace Viewer | — | Returns item metadata (not full definition) |
| GET | `/workspaces/{workspaceId}/reflexes/{reflexId}/definition` | Workspace Viewer | — | Returns full JSON definition with objects and triggers |
| POST | `/workspaces/{workspaceId}/reflexes` | Workspace Contributor | `displayName`, `description` | Creates empty Reflex item |
| PATCH | `/workspaces/{workspaceId}/reflexes/{reflexId}` | Workspace Contributor | `displayName`, `description` | Partial update of metadata |
| PUT | `/workspaces/{workspaceId}/reflexes/{reflexId}/definition` | Workspace Contributor | Full definition JSON | Replaces entire Reflex definition (use for deployment) |
| DELETE | `/workspaces/{workspaceId}/reflexes/{reflexId}` | Workspace Admin | — | Stops all triggers; deletes Reflex item |

```bash
# Create a Reflex item
curl -X POST "https://api.fabric.microsoft.com/v1/workspaces/${WORKSPACE_ID}/reflexes" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "displayName": "factory-temperature-monitor",
    "description": "Monitors factory machine temperatures and fires alerts on threshold breaches"
  }'

# List all Reflex items in workspace
curl "https://api.fabric.microsoft.com/v1/workspaces/${WORKSPACE_ID}/reflexes" \
  -H "Authorization: Bearer ${TOKEN}"

# Get Reflex item definition (objects + triggers)
curl "https://api.fabric.microsoft.com/v1/workspaces/${WORKSPACE_ID}/reflexes/${REFLEX_ID}/definition" \
  -H "Authorization: Bearer ${TOKEN}"

# Delete a Reflex item (stops all triggers first)
curl -X DELETE "https://api.fabric.microsoft.com/v1/workspaces/${WORKSPACE_ID}/reflexes/${REFLEX_ID}" \
  -H "Authorization: Bearer ${TOKEN}"
```

**Response: GET Reflex item**:
```json
{
  "id": "00000000-0000-0000-0000-000000000001",
  "displayName": "factory-temperature-monitor",
  "description": "Monitors factory machine temperatures",
  "type": "Reflex",
  "workspaceId": "00000000-0000-0000-0000-000000000002",
  "createdBy": { "id": "user-id", "displayName": "Jane Smith" },
  "createdDateTime": "2025-03-01T10:00:00Z",
  "lastModifiedBy": { "id": "user-id", "displayName": "Jane Smith" },
  "lastModifiedDateTime": "2025-03-15T14:00:00Z"
}
```

---

## Object Schema

Objects represent tracked real-world entities. Each object has a key column (unique identifier) and a set of properties (data attributes).

### Object Definition

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | PascalCase object name (e.g., `Machine`, `SalesOrder`) |
| `keyColumn` | string | Yes | Column name that uniquely identifies each instance |
| `dataSourceName` | string | Yes | Name of the data source (eventstream or Power BI) |
| `properties` | array | Yes | List of property mappings from data source columns |

### Property Definition

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | camelCase property name (e.g., `temperature`, `orderStatus`) |
| `sourceColumn` | string | Yes | Source column name in the data source |
| `dataType` | string | Yes | `Numeric`, `String`, `Boolean`, `DateTime` |
| `aggregation` | string | No | `Last` (default), `Average`, `Sum`, `Min`, `Max`, `Count` |
| `aggregationWindow` | string | No | Time window for aggregation (e.g., `PT5M` for 5 minutes) |

### Full Object Definition Example

```json
{
  "objects": [
    {
      "name": "Machine",
      "keyColumn": "machineId",
      "dataSourceName": "iot-sensor-stream",
      "properties": [
        {
          "name": "temperature",
          "sourceColumn": "sensorTemperature",
          "dataType": "Numeric",
          "aggregation": "Last"
        },
        {
          "name": "avgTemperature5m",
          "sourceColumn": "sensorTemperature",
          "dataType": "Numeric",
          "aggregation": "Average",
          "aggregationWindow": "PT5M"
        },
        {
          "name": "status",
          "sourceColumn": "machineStatus",
          "dataType": "String",
          "aggregation": "Last"
        },
        {
          "name": "lastHeartbeat",
          "sourceColumn": "eventTimestamp",
          "dataType": "DateTime",
          "aggregation": "Last"
        },
        {
          "name": "assignedEngineer",
          "sourceColumn": "responsibleEngineerEmail",
          "dataType": "String",
          "aggregation": "Last"
        }
      ]
    }
  ]
}
```

---

## Trigger Schema

### Trigger Definition

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Auto | GUID assigned on creation |
| `name` | string | Yes | Human-readable trigger name |
| `objectName` | string | Yes | Object this trigger belongs to |
| `conditionType` | string | Yes | `ValueComparison`, `ValueChange`, `BecomesTrue`, `RemainsTrue`, `Absence` |
| `condition` | object | Yes | Condition definition (see below) |
| `cooldownMinutes` | int | No | Minutes between firings for same object instance (0 = no cooldown) |
| `actions` | array | Yes | One or more action definitions |
| `status` | string | Auto | `Stopped`, `Running`, `Error` |

### Condition Object Examples

```json
// Value comparison
{
  "conditionType": "ValueComparison",
  "condition": {
    "property": "temperature",
    "operator": "GreaterThan",
    "value": 85
  }
}

// Remains true for duration
{
  "conditionType": "RemainsTrue",
  "condition": {
    "property": "temperature",
    "operator": "GreaterThan",
    "value": 85,
    "durationMinutes": 10
  }
}

// Value change to specific state
{
  "conditionType": "ValueChange",
  "condition": {
    "property": "status",
    "changeTo": "Error"
  }
}

// Absence detection
{
  "conditionType": "Absence",
  "condition": {
    "abscenceWindowMinutes": 5
  }
}
```

---

## Action Schema

### Email Action

```json
{
  "actionType": "Email",
  "recipients": ["ops-team@contoso.com", "backup-team@contoso.com"],
  "subject": "ALERT: Machine {machineId} temperature is {temperature}",
  "body": "Machine {machineId} at {location} has temperature {temperature}C.\nTrigger fired at: {triggerTime}\nWorkspace: {workspaceName}"
}
```

**Dynamic tokens available in email/Teams actions**:
| Token | Value |
|-------|-------|
| `{ObjectType}` | Object name (e.g., "Machine") |
| `{<keyColumnName>}` | Key column value (e.g., `{machineId}`) |
| `{<propertyName>}` | Any object property value |
| `{TriggerName}` | Trigger name |
| `{TriggerTime}` | ISO 8601 timestamp when trigger fired |
| `{WorkspaceName}` | Fabric workspace name |
| `{ReflexItemName}` | Reflex item name |

### Teams Action

```json
{
  "actionType": "TeamsMessage",
  "teamId": "00000000-0000-0000-0000-000000000003",
  "channelId": "00000000-0000-0000-0000-000000000004",
  "message": "Alert: {machineId} temperature reached {temperature}C at {TriggerTime}"
}
```

### Power Automate Action

```json
{
  "actionType": "PowerAutomateFlow",
  "flowId": "00000000-0000-0000-0000-000000000005",
  "inputParameters": {
    "machineId": "{machineId}",
    "temperature": "{temperature}",
    "triggerTime": "{TriggerTime}"
  }
}
```

### Webhook Action

```json
{
  "actionType": "Webhook",
  "url": "https://api.contoso.com/webhooks/fabric-alerts",
  "headers": {
    "x-api-key": "Bearer <token>",
    "Content-Type": "application/json"
  },
  "payloadTemplate": "{\"machineId\":\"{machineId}\",\"temperature\":{temperature},\"time\":\"{TriggerTime}\"}"
}
```

**Webhook payload — auto-generated when no template specified**:
```json
{
  "triggerName": "High Temperature Alert",
  "triggerTime": "2025-03-15T14:30:00Z",
  "objectType": "Machine",
  "objectKey": "MCH-042",
  "properties": {
    "temperature": 92.5,
    "pressure": 210,
    "status": "Warning",
    "assignedEngineer": "john.doe@contoso.com"
  },
  "workspaceName": "Factory-Monitoring",
  "reflexItemName": "factory-temperature-monitor"
}
```

---

## Lifecycle Management

### Trigger Lifecycle States

| State | Description | Transitions |
|-------|-------------|-------------|
| `Stopped` | Not evaluating conditions | → `Running` via start API |
| `Running` | Actively monitoring, evaluating conditions | → `Stopped` via stop API; → `Error` on failure |
| `Error` | Failed to process events; not evaluating | → `Running` after fix + restart |

### Bulk Start/Stop Triggers

```python
import requests

WORKSPACE_ID = "your-workspace-id"
REFLEX_ID = "your-reflex-id"
TOKEN = "your-bearer-token"

headers = {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}
base_url = f"https://api.fabric.microsoft.com/v1/workspaces/{WORKSPACE_ID}/reflexes/{REFLEX_ID}"

# Get all triggers
triggers_resp = requests.get(f"{base_url}/triggers", headers=headers)
triggers = triggers_resp.json()["value"]

# Start all stopped triggers
for trigger in triggers:
    if trigger["status"] == "Stopped":
        resp = requests.post(f"{base_url}/triggers/{trigger['id']}/start", headers=headers)
        print(f"Started trigger '{trigger['name']}': {resp.status_code}")

# Stop all running triggers (e.g., before maintenance)
for trigger in triggers:
    if trigger["status"] == "Running":
        resp = requests.post(f"{base_url}/triggers/{trigger['id']}/stop", headers=headers)
        print(f"Stopped trigger '{trigger['name']}': {resp.status_code}")
```

### Deploy Reflex Across Environments

```python
import requests
import json

def clone_reflex(source_workspace_id, source_reflex_id, target_workspace_id, new_name, token):
    """Clone a Reflex item from one workspace to another."""
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    base = "https://api.fabric.microsoft.com/v1"

    # 1. Get source definition
    resp = requests.get(f"{base}/workspaces/{source_workspace_id}/reflexes/{source_reflex_id}/definition", headers=headers)
    definition = resp.json()

    # 2. Create target Reflex item
    create_resp = requests.post(f"{base}/workspaces/{target_workspace_id}/reflexes",
        headers=headers,
        json={"displayName": new_name, "description": definition.get("description", "")}
    )
    new_reflex_id = create_resp.json()["id"]

    # 3. Update data source references to point to target workspace resources
    # (update definition["dataSources"] with target workspace/database IDs)

    # 4. Apply definition to new Reflex
    requests.put(f"{base}/workspaces/{target_workspace_id}/reflexes/{new_reflex_id}/definition",
        headers=headers,
        json=definition
    )
    return new_reflex_id
```

---

## Naming Conventions

| Artifact | Convention | Example |
|----------|-----------|---------|
| Reflex item | kebab-case | `factory-temperature-monitor` |
| Object name | PascalCase | `Machine`, `SalesOrder`, `PatientVital` |
| Property name | camelCase | `temperature`, `orderTotal`, `heartRate` |
| Trigger name | Title Case with context | `High Temperature Alert`, `Order Cancelled` |
| Action name | Verb + Noun | `Email Ops Team`, `Post Teams Alert` |

---

## Error Codes and Remediation

| Code / Error | Meaning | Remediation |
|---|---|---|
| `403 Forbidden` | Caller lacks Contributor or Admin role | Grant workspace role via Fabric portal |
| `404 Not Found` | Reflex item or trigger ID invalid | Verify IDs via GET list endpoints |
| `409 Conflict` | Reflex item name already exists in workspace | Use a unique name or delete the existing item |
| `422 Unprocessable Entity` | Definition JSON schema invalid | Validate against the API schema; check required fields |
| `Trigger status = Error` | Event source disconnected or schema changed | Reconnect data source; verify schema alignment |
| `No object instances tracked` | Key column has only null values | Verify key column mapping in data preview |
| `Dynamic recipient invalid` | Object property used as recipient contains invalid email | Validate recipient property values in data preview |
| `Webhook 5xx on action` | Target endpoint returned server error | Check webhook endpoint health; Data Activator retries with backoff |
| `Power Automate flow not found` | Flow was deleted or moved | Reconnect action to active flow |

---

## Limits

| Resource | Limit | Notes |
|----------|-------|-------|
| Reflex items per workspace | 100 | Soft limit |
| Objects per Reflex item | 50 | |
| Properties per object | 100 | |
| Object instances tracked per object | 100,000 | Distinct key column values |
| Triggers per Reflex item | 100 | Across all objects |
| Actions per trigger | 5 | Executed simultaneously when trigger fires |
| Trigger history retention | 30 days | Older history is purged |
| Webhook retry attempts | 3 | With exponential backoff (1s, 5s, 25s) |
| Email recipients per action | 10 | Comma-separated list |
| Data source events queue | 24 hours | Events older than 24 hours are dropped if not processed |
