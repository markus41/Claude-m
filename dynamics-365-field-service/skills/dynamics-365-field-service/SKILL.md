---
name: dynamics-365-field-service
description: Deep expertise in Dynamics 365 Field Service via Dataverse Web API — managing work orders, bookings, field technician scheduling, service accounts, assets, functional locations, incident types, and IoT-triggered service events on the Field Service business application layer built on Dataverse.
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
triggers:
  - field service
  - work order
  - work orders
  - schedule board
  - field technician
  - service territory
  - booking
  - resource scheduling
  - incident type
  - iot alert
  - work order service task
  - resource booking
  - bookable resource
  - field service resource
  - service account
  - functional location
  - customer asset
  - field service asset
  - inspection
  - field service inspection
  - time off request
  - crew scheduling
  - resource capacity
  - field service mobile
  - work order product
  - work order service
  - field service iot
  - connected field service
  - remote monitoring
  - agreement booking
  - preventive maintenance
  - service plan
  - resource requirement
  - fulfillment preference
---

# Dynamics 365 Field Service via Dataverse Web API

This skill provides comprehensive knowledge for operating the Dynamics 365 Field Service business application layer on top of Dataverse. It covers the full work order lifecycle, booking and scheduling operations, resource management, service account and asset tracking, incident type configuration, and IoT-triggered service automation.

## Integration Context Contract

- Canonical contract: [`docs/integration-context.md`](../../../docs/integration-context.md)

| Workflow | tenantId | subscriptionId | environmentCloud | principalType | scopesOrRoles |
|---|---|---|---|---|---|
| Field Service work orders | required | — | `AzureCloud`* | `service-principal` | Field Service — Dispatcher or Administrator security role |
| Resource scheduling (URS) | required | — | `AzureCloud`* | `service-principal` | Field Service — Resource + Field Service — Dispatcher |
| IoT integration | required | — | `AzureCloud`* | `service-principal` | Field Service Administrator + IoT — Administrator |
| Service accounts and assets | required | — | `AzureCloud`* | `service-principal` | Field Service — Dispatcher or Field Service — Resource |

\* Use sovereign cloud values from the canonical contract when applicable.

**Required auth parameters for every Field Service workflow:**

- `tenantId` — Entra ID tenant GUID
- `orgUrl` — Dynamics 365 organization URL: `https://{orgName}.crm.dynamics.com`
- Service principal must have a `systemuser` record in the Dynamics org with Field Service security roles

Fail fast when `orgUrl` is missing or Field Service is not installed in the environment. Redact org URL and record GUIDs in error output.

## Dataverse Web API Overview

All Field Service data operations use the Dataverse Web API:

```
{orgUrl}/api/data/v9.2/{entitySetName}
```

API version 9.2 is stable and supports all Field Service entities, actions, and functions.

### Authentication

```typescript
import { ClientSecretCredential } from "@azure/identity";

const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
const token = await credential.getToken("https://org.crm.dynamics.com/.default");

// All requests include:
// Authorization: Bearer {token}
// OData-MaxVersion: 4.0
// OData-Version: 4.0
// Accept: application/json
// Content-Type: application/json
```

### Key Field Service Entity Set Names

| Entity | API entity set | Primary key |
|---|---|---|
| Work Order | `msdyn_workorders` | `msdyn_workorderid` |
| Work Order Service Task | `msdyn_workorderservicetasks` | `msdyn_workorderservicetaskid` |
| Work Order Product | `msdyn_workorderproducts` | `msdyn_workorderproductid` |
| Work Order Service | `msdyn_workorderservices` | `msdyn_workorderserviceid` |
| Booking (Resource Booking) | `bookableresourcebookings` | `bookableresourcebookingid` |
| Booking Status | `bookingstatuses` | `bookingstatusid` |
| Bookable Resource | `bookableresources` | `bookableresourceid` |
| Resource Requirement | `msdyn_resourcerequirements` | `msdyn_resourcerequirementid` |
| Service Territory | `territories` | `territoryid` |
| Incident Type | `msdyn_incidenttypes` | `msdyn_incidenttypeid` |
| Service Account | `accounts` (filtered by field service) | `accountid` |
| Customer Asset | `msdyn_customerassets` | `msdyn_customerassetid` |
| Functional Location | `msdyn_functionallocations` | `msdyn_functionallocationid` |
| IoT Alert | `msdyn_iotalerts` | `msdyn_iotalertid` |
| IoT Device | `msdyn_iotdevices` | `msdyn_iotdeviceid` |
| Agreement | `msdyn_agreements` | `msdyn_agreementid` |
| Agreement Booking Setup | `msdyn_agreementbookingsetups` | `msdyn_agreementbookingsetupid` |
| Time Off Request | `msdyn_timeoffrequests` | `msdyn_timeoffrequestid` |

## Work Order Lifecycle

### Work Order Status Values

| `msdyn_systemstatus` | Display | Description |
|---|---|---|
| 690970000 | Unscheduled | Created, no booking assigned |
| 690970001 | Scheduled | Booking created, not yet dispatched |
| 690970002 | In Progress | Technician has started work |
| 690970003 | Completed | Work finished, pending review |
| 690970004 | Posted | Invoiced/posted to financials |
| 690970005 | Canceled | Work order voided |

### Create Work Order

```http
POST {orgUrl}/api/data/v9.2/msdyn_workorders
{
  "msdyn_name": "WO-2026-00123",
  "msdyn_workordersummary": "HVAC unit not cooling — unit tripped breaker",
  "msdyn_systemstatus": 690970000,
  "msdyn_priority": 1,
  "msdyn_serviceterritoryid@odata.bind": "/territories/{territoryId}",
  "msdyn_serviceaccount@odata.bind": "/accounts/{serviceAccountId}",
  "msdyn_billingaccount@odata.bind": "/accounts/{billingAccountId}",
  "msdyn_primaryincidenttype@odata.bind": "/msdyn_incidenttypes/{incidentTypeId}",
  "msdyn_customerassetid@odata.bind": "/msdyn_customerassets/{assetId}",
  "msdyn_timewindowstart": "2026-03-10T08:00:00Z",
  "msdyn_timewindowend": "2026-03-10T17:00:00Z"
}
```

### Apply Incident Type (auto-populate tasks/products/services)

```http
POST {orgUrl}/api/data/v9.2/msdyn_workorders({workOrderId})/Microsoft.Dynamics.CRM.msdyn_ApplyIncidentTypeToWorkOrder
{
  "IncidentType": {
    "msdyn_incidenttypeid": "{incidentTypeId}",
    "@odata.type": "Microsoft.Dynamics.CRM.msdyn_incidenttype"
  }
}
```

### Complete Work Order

Update system status and set actual times:

```http
PATCH {orgUrl}/api/data/v9.2/msdyn_workorders({workOrderId})
{
  "msdyn_systemstatus": 690970003,
  "msdyn_timetocomplete": 120,
  "msdyn_workorderresolution": "Replaced faulty capacitor in HVAC unit. System restored to normal operation."
}
```

## Booking and Scheduling

### Booking Status Values

| `statecode` | `name` (BookingStatus) | Description |
|---|---|---|
| 0 | Scheduled | Resource booked, not started |
| 1 | Traveling | Resource in transit |
| 2 | In Progress | Resource on-site |
| 3 | On Break | Resource paused |
| 4 | Completed | Work finished |
| 5 | Canceled | Booking voided |

### Create Booking

```http
POST {orgUrl}/api/data/v9.2/bookableresourcebookings
{
  "name": "Booking — WO-2026-00123",
  "msdyn_workorder@odata.bind": "/msdyn_workorders/{workOrderId}",
  "resource@odata.bind": "/bookableresources/{resourceId}",
  "bookingstatus@odata.bind": "/bookingstatuses/{scheduledStatusId}",
  "starttime": "2026-03-10T09:00:00Z",
  "endtime": "2026-03-10T11:00:00Z",
  "msdyn_bookingtype": 1,
  "msdyn_estimatedtravelduration": 30
}
```

### Find Available Resources (Schedule Assistant)

Use the Universal Resource Scheduling (URS) `msdyn_SearchResourceAvailability` action:

```http
POST {orgUrl}/api/data/v9.2/msdyn_SearchResourceAvailability
{
  "Version": "3",
  "IsWebApi": true,
  "Requirement": {
    "msdyn_resourcerequirementid": "{requirementId}",
    "@odata.type": "Microsoft.Dynamics.CRM.msdyn_resourcerequirement"
  },
  "Settings": {
    "ConsiderSlotsWithProposedBookings": false,
    "MovePastStartDateTo": "2026-03-10T00:00:00Z",
    "UseRealTimeResourceLocation": false
  }
}
```

Response returns `AvailableTimeSlots` array with `Resource`, `StartTime`, `EndTime`, `TravelTime`, `Score`.

### Update Booking Status

```http
PATCH {orgUrl}/api/data/v9.2/bookableresourcebookings({bookingId})
{
  "bookingstatus@odata.bind": "/bookingstatuses/{inProgressStatusId}",
  "msdyn_actualarrivaltime": "2026-03-10T09:05:00Z"
}
```

## Resource Management

### Bookable Resource Types

| `resourcetype` | Value | Description |
|---|---|---|
| Generic | 1 | Placeholder resource (skill-based) |
| Contact | 2 | Linked to a Contact record |
| User | 3 | Linked to a System User |
| Equipment | 4 | Physical equipment/tool |
| Account | 5 | Linked to an Account (subcontractor) |
| Crew | 6 | Group of resources |
| Facility | 7 | Physical location |
| Pool | 8 | Resource pool |

### Create Bookable Resource

```http
POST {orgUrl}/api/data/v9.2/bookableresources
{
  "name": "Alex Rivera",
  "resourcetype": 3,
  "userid@odata.bind": "/systemusers/{userId}",
  "msdyn_startlocation": 690970000,
  "msdyn_endlocation": 690970000,
  "timezone": 85,
  "msdyn_organizationalunit@odata.bind": "/msdyn_organizationalunits/{orgUnitId}"
}
```

### Assign Resource Characteristics (Skills)

```http
POST {orgUrl}/api/data/v9.2/bookableresourcecharacteristics
{
  "resource@odata.bind": "/bookableresources/{resourceId}",
  "characteristic@odata.bind": "/characteristics/{characteristicId}",
  "ratingvalue@odata.bind": "/ratingvalues/{ratingValueId}"
}
```

## Service Account and Asset Management

### Create Customer Asset

```http
POST {orgUrl}/api/data/v9.2/msdyn_customerassets
{
  "msdyn_name": "HVAC Unit — Roof West",
  "msdyn_account@odata.bind": "/accounts/{serviceAccountId}",
  "msdyn_functionallocation@odata.bind": "/msdyn_functionallocations/{locationId}",
  "msdyn_category@odata.bind": "/msdyn_customerassetcategories/{categoryId}",
  "msdyn_serialnumber": "HVAC-2019-0042",
  "msdyn_lastcommandsenttime": null
}
```

### Create Functional Location

```http
POST {orgUrl}/api/data/v9.2/msdyn_functionallocations
{
  "msdyn_name": "Building A — Roof",
  "msdyn_description": "Rooftop equipment area — West wing",
  "msdyn_parentfunctionallocation@odata.bind": "/msdyn_functionallocations/{parentLocationId}",
  "msdyn_account@odata.bind": "/accounts/{serviceAccountId}"
}
```

## Incident Types

Incident types define templates for work orders — they auto-populate service tasks, products, and services.

### Create Incident Type

```http
POST {orgUrl}/api/data/v9.2/msdyn_incidenttypes
{
  "msdyn_name": "HVAC Compressor Failure",
  "msdyn_description": "Compressor failure diagnosis and replacement",
  "msdyn_estimatedduration": 180,
  "msdyn_copytaskestimates": true,
  "msdyn_defaultworkordertypedetailid@odata.bind": "/msdyn_workordertypes/{workOrderTypeId}"
}
```

### Add Service Task Template to Incident Type

```http
POST {orgUrl}/api/data/v9.2/msdyn_incidenttypeservicetasks
{
  "msdyn_incidenttype@odata.bind": "/msdyn_incidenttypes/{incidentTypeId}",
  "msdyn_tasktype@odata.bind": "/msdyn_servicetasktypes/{taskTypeId}",
  "msdyn_estimatedduration": 30,
  "msdyn_name": "Step 1: Diagnose compressor fault"
}
```

## IoT Integration (Connected Field Service)

### IoT Alert to Work Order

When an IoT device triggers an alert, the system creates an `msdyn_iotalert`. Convert to work order:

```http
POST {orgUrl}/api/data/v9.2/msdyn_iotalerts({alertId})/Microsoft.Dynamics.CRM.msdyn_CreateWorkOrderFromIoTAlert
{
  "WorkOrderType": {
    "msdyn_workordertypeid": "{workOrderTypeId}",
    "@odata.type": "Microsoft.Dynamics.CRM.msdyn_workordertype"
  }
}
```

### Query IoT Alerts

```http
GET {orgUrl}/api/data/v9.2/msdyn_iotalerts?$select=msdyn_iotalertid,msdyn_name,msdyn_alerttype,msdyn_alertdata,msdyn_deviceid,createdon,statecode&$filter=statecode eq 0 and msdyn_alerttype eq 1&$orderby=createdon desc&$top=50
```

### IoT Device Status

```http
GET {orgUrl}/api/data/v9.2/msdyn_iotdevices?$select=msdyn_iotdeviceid,msdyn_name,msdyn_connectionstate,msdyn_lastactivitytime&$expand=msdyn_customerasset($select=msdyn_name,msdyn_serialnumber)&$filter=msdyn_connectionstate eq 1
```

## Agreement and Preventive Maintenance

Agreements define recurring work orders (preventive maintenance schedules).

### Create Agreement

```http
POST {orgUrl}/api/data/v9.2/msdyn_agreements
{
  "msdyn_name": "Contoso HVAC Maintenance Agreement 2026",
  "msdyn_serviceaccount@odata.bind": "/accounts/{serviceAccountId}",
  "msdyn_billingaccount@odata.bind": "/accounts/{billingAccountId}",
  "msdyn_startdate": "2026-01-01",
  "msdyn_enddate": "2026-12-31",
  "msdyn_agreementstatus": 690970001
}
```

## Error Handling

| HTTP status | OData error code | Cause |
|---|---|---|
| 401 | `0x80040220` | Service principal lacks `systemuser` record or Field Service role |
| 403 | `0x80040214` | Missing Field Service security role |
| 404 | `0x80040217` | Record not found (wrong GUID or entity not installed) |
| 400 | `0x8004B400` | Required field missing (e.g., `msdyn_serviceaccount`) |
| 400 | `0x80060891` | Invalid status transition on work order or booking |
| 429 | `0x80072328` | API throttling — add Retry-After backoff |

**Rate limits:** 6,000 API requests per 5-minute window per user. Use `$batch` for bulk operations.

## Output Convention

Every operation produces a structured markdown report:

1. **Header**: operation, timestamp, org URL
2. **Work order summary**: WO ID, service account, incident type, status
3. **Booking table** (for schedule operations): resource, start/end, travel time, status
4. **Resource utilization** (for reporting): by territory, by technician
5. **Recommendations**: scheduling conflicts, SLA risk, asset maintenance due

## Reference Files

| Reference | Path | Topics |
|---|---|---|
| Work Order Entities | `references/work-order-entities.md` | Work orders, service tasks, products, services, incident types, statuses, priority codes |
| Scheduling Reference | `references/scheduling-reference.md` | Bookings, URS schedule assistant, bookable resources, resource requirements, territories |
| IoT Reference | `references/iot-reference.md` | IoT alerts, devices, Connected Field Service, alert-to-work-order automation, device registration |
