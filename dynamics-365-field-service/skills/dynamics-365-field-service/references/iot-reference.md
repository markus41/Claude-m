# IoT Reference (Connected Field Service)

## Overview

Connected Field Service (CFS) integrates Azure IoT Hub with Dynamics 365 Field Service. IoT devices send telemetry to Azure IoT Hub, which triggers alerts when thresholds are crossed. These alerts appear as `msdyn_iotalert` records in Dataverse and can automatically create work orders.

**Architecture:**

```
IoT Device → Azure IoT Hub → Azure Stream Analytics / Logic Apps → Dataverse IoT Alert → Work Order
```

---

## IoT Alert (`msdyn_iotalerts`)

### Key Fields

| Field | Type | Description |
|---|---|---|
| `msdyn_iotalertid` | GUID | Primary key |
| `msdyn_name` | string | Alert name/description |
| `msdyn_alerttype` | picklist | Alert category type |
| `msdyn_alertdata` | string | Raw JSON telemetry payload |
| `msdyn_alerttoken` | string | Unique token from IoT Hub |
| `msdyn_device` | lookup → `msdyn_iotdevices` | Source device |
| `msdyn_customerasset` | lookup → `msdyn_customerassets` | Associated asset |
| `msdyn_parentworkorderid` | lookup → `msdyn_workorders` | Work order created from alert |
| `msdyn_lastactivity` | datetime | Last activity on alert |
| `statecode` | state | 0=Active, 1=Resolved |

### Alert Types

| `msdyn_alerttype` | Label |
|---|---|
| 1 | Anomaly |
| 2 | Exceed Threshold |
| 3 | Break Fix |
| 4 | Preventive Maintenance |

### Query Active IoT Alerts

```http
GET {orgUrl}/api/data/v9.2/msdyn_iotalerts?$select=msdyn_iotalertid,msdyn_name,msdyn_alerttype,msdyn_alertdata,createdon&$expand=msdyn_device($select=msdyn_name,msdyn_iotdevicecategory),msdyn_customerasset($select=msdyn_name,msdyn_serialnumber)&$filter=statecode eq 0&$orderby=createdon desc&$top=50
```

### Convert Alert to Work Order

```bash
curl -s -X POST \
  "${D365_ORG_URL}/api/data/v9.2/msdyn_iotalerts({alertId})/Microsoft.Dynamics.CRM.msdyn_CreateWorkOrderFromIoTAlert" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "OData-Version: 4.0" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "WorkOrderType": {
      "msdyn_workordertypeid": "{workOrderTypeId}",
      "@odata.type": "Microsoft.Dynamics.CRM.msdyn_workordertype"
    }
  }'
```

### Resolve IoT Alert

```http
PATCH {orgUrl}/api/data/v9.2/msdyn_iotalerts({alertId})
{
  "statecode": 1,
  "statuscode": 2
}
```

---

## IoT Device (`msdyn_iotdevices`)

### Key Fields

| Field | Type | Description |
|---|---|---|
| `msdyn_iotdeviceid` | GUID | Primary key |
| `msdyn_name` | string | Device name/identifier |
| `msdyn_deviceid` | string | Azure IoT Hub device ID |
| `msdyn_iotdevicecategory` | lookup → `msdyn_iotdevicecategories` | Device category |
| `msdyn_customerasset` | lookup → `msdyn_customerassets` | Linked customer asset |
| `msdyn_connectionstate` | picklist | Connected/Disconnected |
| `msdyn_isregistered` | boolean | Registered with IoT Hub |
| `msdyn_lastactivitytime` | datetime | Last telemetry received |
| `msdyn_timezoneoffset` | integer | Device local UTC offset |

### Connection State Values

| Value | Label |
|---|---|
| 1 | Connected |
| 2 | Disconnected |

### Query Connected Devices

```http
GET {orgUrl}/api/data/v9.2/msdyn_iotdevices?$select=msdyn_iotdeviceid,msdyn_name,msdyn_deviceid,msdyn_connectionstate,msdyn_lastactivitytime&$expand=msdyn_customerasset($select=msdyn_name,msdyn_serialnumber,_msdyn_account_value)&$filter=msdyn_connectionstate eq 1 and statecode eq 0
```

### Register Device with IoT Hub

```bash
curl -s -X POST \
  "${D365_ORG_URL}/api/data/v9.2/msdyn_iotdevices({deviceId})/Microsoft.Dynamics.CRM.msdyn_RegisterIoTDevice" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "OData-Version: 4.0" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{}'
```

### Send Command to Device

```bash
curl -s -X POST \
  "${D365_ORG_URL}/api/data/v9.2/msdyn_iotdevices({deviceId})/Microsoft.Dynamics.CRM.msdyn_JsonCommand" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "OData-Version: 4.0" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "Message": "{\"command\": \"restart\", \"parameters\": {}}"
  }'
```

---

## IoT Device Category (`msdyn_iotdevicecategories`)

Categorizes device types (e.g., HVAC, Elevator, Fire Panel).

```http
GET {orgUrl}/api/data/v9.2/msdyn_iotdevicecategories?$select=msdyn_iotdevicecategoryid,msdyn_name,msdyn_description&$filter=statecode eq 0
```

---

## IoT Device Property (`msdyn_iotdeviceproperties`)

Stores key-value metadata properties for a device.

```http
GET {orgUrl}/api/data/v9.2/msdyn_iotdeviceproperties?$select=msdyn_name,msdyn_value&$filter=_msdyn_device_value eq {deviceId}
```

---

## Alert-to-Work Order Automation Patterns

### Pattern 1: Power Automate Flow Trigger

Trigger: **When a row is added** (Dataverse) → Table: `msdyn_iotalerts`

```
Condition: alerttype = Anomaly AND customerasset.category = HVAC
→ Action: Create Work Order from IoT Alert (msdyn_CreateWorkOrderFromIoTAlert)
→ Action: Update msdyn_iotalert.statecode = Active (linked to WO)
→ Action: Send notification to dispatcher (Teams/Email)
```

### Pattern 2: Batch Alert Processing

Query active alerts without linked work orders:

```http
GET {orgUrl}/api/data/v9.2/msdyn_iotalerts?$select=msdyn_iotalertid,msdyn_alerttype,msdyn_alertdata&$filter=statecode eq 0 and msdyn_parentworkorderid eq null&$orderby=createdon asc&$top=100
```

Process each alert → call `msdyn_CreateWorkOrderFromIoTAlert` → log result.

### Pattern 3: IoT Threshold-Based Severity

Parse `msdyn_alertdata` JSON:

```python
import json

alert_data = json.loads(alert['msdyn_alertdata'])
temperature = alert_data.get('temperature', 0)

if temperature > 90:
    priority = 1  # High
elif temperature > 75:
    priority = 2  # Normal
else:
    priority = 3  # Low
```

Set work order `msdyn_priority` accordingly after creation.

---

## IoT Configuration Entities

### IoT Provider (`msdyn_iotproviders`)

Represents the IoT Hub connection (usually one per environment).

```http
GET {orgUrl}/api/data/v9.2/msdyn_iotproviders?$select=msdyn_iotproviderid,msdyn_name,msdyn_hubendpoint
```

### IoT Provider Instance (`msdyn_iotproviderinstances`)

The specific IoT Hub connection configuration.

```http
GET {orgUrl}/api/data/v9.2/msdyn_iotproviderinstances?$select=msdyn_name,msdyn_providerinstanceid
```

---

## Connected Field Service Prerequisites

1. **Azure IoT Hub** — provisioned in same Azure subscription
2. **Connected Field Service Azure Resources** — deployed via Power Platform Admin Center > Connected Field Service for Azure IoT Hub
3. **Security roles** — `IoT - Administrator` and `Field Service - Administrator` assigned
4. **msdyn_iotprovider** record — linked to the Azure IoT Hub endpoint
5. **Device registration** — each `msdyn_iotdevice` registered via `msdyn_RegisterIoTDevice` action

Check deployment status:

```bash
curl -s "${D365_ORG_URL}/api/data/v9.2/msdyn_iotproviders?\$select=msdyn_name,msdyn_hubendpoint" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "Accept: application/json"
```

A non-empty response confirms CFS is deployed.
