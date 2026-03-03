# Work Order Entities Reference

## Work Order (`msdyn_workorders`)

**Purpose:** The central entity in Field Service — represents a job to be performed at a customer location.

### Key Fields

| Field | Type | Description |
|---|---|---|
| `msdyn_workorderid` | GUID | Primary key |
| `msdyn_name` | string | Auto-generated WO number (e.g., WO-2026-00123) |
| `msdyn_workordersummary` | string | Description of work to be performed |
| `msdyn_systemstatus` | picklist | Current lifecycle status (see values below) |
| `msdyn_priority` | picklist | 1=High, 2=Medium, 3=Low |
| `msdyn_workordertype` | lookup → `msdyn_workordertypes` | Type classification |
| `msdyn_primaryincidenttype` | lookup → `msdyn_incidenttypes` | Main issue type |
| `msdyn_serviceaccount` | lookup → `accounts` | Customer service location |
| `msdyn_billingaccount` | lookup → `accounts` | Account to invoice |
| `msdyn_serviceterritoryid` | lookup → `territories` | Geographic territory |
| `msdyn_customerassetid` | lookup → `msdyn_customerassets` | Asset being serviced |
| `msdyn_timewindowstart` | datetime | Customer preferred start |
| `msdyn_timewindowend` | datetime | Customer preferred end |
| `msdyn_timetocomplete` | decimal | Actual time to complete (minutes) |
| `msdyn_workorderresolution` | string | Resolution notes |
| `msdyn_substatus` | lookup → `msdyn_workordersubstatuses` | Sub-status for custom stages |
| `msdyn_totalestimatedduration` | decimal | Total estimated task duration (minutes) |
| `msdyn_estimatetotalcost` | money | Estimated total cost |
| `msdyn_estimatetotalamount` | money | Estimated total billable amount |

### System Status Values

| Value | Label |
|---|---|
| 690970000 | Unscheduled |
| 690970001 | Scheduled |
| 690970002 | In Progress |
| 690970003 | Completed |
| 690970004 | Posted |
| 690970005 | Canceled |

### Priority Codes

| Value | Label |
|---|---|
| 1 | High |
| 2 | Normal |
| 3 | Low |

---

## Work Order Service Task (`msdyn_workorderservicetasks`)

Tasks that a technician must complete during a work order visit.

| Field | Type | Description |
|---|---|---|
| `msdyn_workorderservicetaskid` | GUID | Primary key |
| `msdyn_name` | string | Task description |
| `msdyn_workorder` | lookup → `msdyn_workorders` | Parent work order |
| `msdyn_tasktype` | lookup → `msdyn_servicetasktypes` | Categorized task type |
| `msdyn_estimatedduration` | integer | Expected duration (minutes) |
| `msdyn_actualduration` | integer | Actual duration (minutes) |
| `msdyn_iscompleted` | boolean | Task completed flag |
| `msdyn_percentcomplete` | decimal | 0–100 completion percentage |
| `msdyn_description` | string | Additional task notes |
| `msdyn_lineorder` | integer | Display order sequence |

### Create Work Order Service Task

```http
POST {orgUrl}/api/data/v9.2/msdyn_workorderservicetasks
{
  "msdyn_name": "Step 1: Inspect compressor pressure readings",
  "msdyn_workorder@odata.bind": "/msdyn_workorders/{workOrderId}",
  "msdyn_tasktype@odata.bind": "/msdyn_servicetasktypes/{taskTypeId}",
  "msdyn_estimatedduration": 30,
  "msdyn_lineorder": 10
}
```

### Mark Task Complete

```http
PATCH {orgUrl}/api/data/v9.2/msdyn_workorderservicetasks({taskId})
{
  "msdyn_iscompleted": true,
  "msdyn_actualduration": 25,
  "msdyn_percentcomplete": 100
}
```

---

## Work Order Product (`msdyn_workorderproducts`)

Parts and materials used on a work order.

| Field | Type | Description |
|---|---|---|
| `msdyn_workorderproductid` | GUID | Primary key |
| `msdyn_product` | lookup → `products` | Catalog product |
| `msdyn_workorder` | lookup → `msdyn_workorders` | Parent work order |
| `msdyn_quantity` | decimal | Quantity used |
| `msdyn_estimatedquantity` | decimal | Estimated quantity |
| `msdyn_unitcost` | money | Cost per unit |
| `msdyn_unitamount` | money | Price per unit |
| `msdyn_lineamount` | money | Total line value |
| `msdyn_taxable` | boolean | Subject to tax |
| `msdyn_linestatus` | picklist | 690970000=Estimated, 690970001=Used |

---

## Work Order Service (`msdyn_workorderservices`)

Labor services performed on a work order.

| Field | Type | Description |
|---|---|---|
| `msdyn_workorderserviceid` | GUID | Primary key |
| `msdyn_name` | string | Service description |
| `msdyn_workorder` | lookup → `msdyn_workorders` | Parent work order |
| `msdyn_service` | lookup → `products` (service type) | Service catalog item |
| `msdyn_duration` | integer | Estimated duration (minutes) |
| `msdyn_actualduration` | integer | Actual duration (minutes) |
| `msdyn_unitcost` | money | Cost per hour |
| `msdyn_unitamount` | money | Billable rate per hour |
| `msdyn_linestatus` | picklist | 690970000=Estimated, 690970001=Used |

---

## Incident Type (`msdyn_incidenttypes`)

Templates that auto-populate work order service tasks, products, and services when applied.

| Field | Type | Description |
|---|---|---|
| `msdyn_incidenttypeid` | GUID | Primary key |
| `msdyn_name` | string | Incident type name |
| `msdyn_description` | string | Detailed description |
| `msdyn_estimatedduration` | integer | Total estimated duration (minutes) |
| `msdyn_copytaskestimates` | boolean | Copy task time estimates to WO |
| `msdyn_defaultworkordertypedetailid` | lookup → `msdyn_workordertypes` | Default work order type |

### Query Incident Types

```http
GET {orgUrl}/api/data/v9.2/msdyn_incidenttypes?$select=msdyn_incidenttypeid,msdyn_name,msdyn_estimatedduration,msdyn_description&$filter=statecode eq 0&$orderby=msdyn_name asc
```

---

## Incident Type Service Task (`msdyn_incidenttypeservicetasks`)

Service task templates attached to an incident type.

| Field | Type | Description |
|---|---|---|
| `msdyn_incidenttypeservicetaskid` | GUID | Primary key |
| `msdyn_incidenttype` | lookup → `msdyn_incidenttypes` | Parent incident type |
| `msdyn_tasktype` | lookup → `msdyn_servicetasktypes` | Task type template |
| `msdyn_name` | string | Task description |
| `msdyn_estimatedduration` | integer | Duration (minutes) |
| `msdyn_lineorder` | integer | Display sequence |

---

## Work Order Sub-Status (`msdyn_workordersubstatuses`)

Custom sub-statuses for detailed workflow stages within a system status.

```http
GET {orgUrl}/api/data/v9.2/msdyn_workordersubstatuses?$select=msdyn_workordersubstatusid,msdyn_name,msdyn_systemstatus,msdyn_defaultsubstatus&$filter=statecode eq 0
```

---

## OData Query Examples

### List Unscheduled Work Orders by Territory

```http
GET {orgUrl}/api/data/v9.2/msdyn_workorders?$select=msdyn_workorderid,msdyn_name,msdyn_workordersummary,msdyn_priority,createdon&$expand=msdyn_serviceaccount($select=name,address1_city),msdyn_primaryincidenttype($select=msdyn_name)&$filter=msdyn_systemstatus eq 690970000&$orderby=msdyn_priority asc,createdon asc
```

### Work Orders In Progress for a Service Account

```http
GET {orgUrl}/api/data/v9.2/msdyn_workorders?$select=msdyn_workorderid,msdyn_name,msdyn_systemstatus,msdyn_timewindowstart,msdyn_timewindowend&$filter=_msdyn_serviceaccount_value eq {accountId} and msdyn_systemstatus eq 690970002&$orderby=msdyn_timewindowstart asc
```

### Work Order Completion Check (all tasks completed)

```http
GET {orgUrl}/api/data/v9.2/msdyn_workorderservicetasks?$select=msdyn_name,msdyn_iscompleted,msdyn_actualduration&$filter=_msdyn_workorder_value eq {workOrderId}
```
