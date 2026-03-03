# Scheduling Reference

## Universal Resource Scheduling (URS) Overview

Dynamics 365 Field Service uses Universal Resource Scheduling (URS) for all booking operations. URS provides the Schedule Board, Schedule Assistant, and resource availability APIs.

**Core URS entities:**

| Entity | Set name | Purpose |
|---|---|---|
| Bookable Resource | `bookableresources` | People, equipment, facilities available to book |
| Resource Booking | `bookableresourcebookings` | Actual booking of a resource to a work order |
| Booking Status | `bookingstatuses` | Lifecycle states for bookings |
| Resource Requirement | `msdyn_resourcerequirements` | Unfulfilled demand for a resource |
| Resource Characteristic | `bookableresourcecharacteristics` | Skills/certifications assigned to a resource |
| Characteristic | `characteristics` | Skill/cert catalog |
| Rating Value | `ratingvalues` | Proficiency level for a characteristic |
| Service Territory | `territories` | Geographic zones for scheduling |
| Organizational Unit | `msdyn_organizationalunits` | Business unit for resource cost/billing |
| Time Off Request | `msdyn_timeoffrequests` | Approved resource absences |

---

## Bookable Resource (`bookableresources`)

### Resource Types

| `resourcetype` | Value | Description |
|---|---|---|
| Generic | 1 | Placeholder — skill-based matching |
| Contact | 2 | Linked to Contact record |
| User | 3 | Linked to System User |
| Equipment | 4 | Physical tool or equipment |
| Account | 5 | Subcontractor account |
| Crew | 6 | Named group of resources |
| Facility | 7 | Physical location |
| Pool | 8 | Resource pool |

### Key Fields

| Field | Type | Description |
|---|---|---|
| `bookableresourceid` | GUID | Primary key |
| `name` | string | Resource display name |
| `resourcetype` | picklist | Type (see above) |
| `userid` | lookup → `systemusers` | Linked user (type 3 only) |
| `contactid` | lookup → `contacts` | Linked contact (type 2 only) |
| `accountid` | lookup → `accounts` | Linked account (type 5 only) |
| `timezone` | integer | Windows timezone ID |
| `msdyn_startlocation` | picklist | Start location type |
| `msdyn_endlocation` | picklist | End location type |
| `msdyn_organizationalunit` | lookup → `msdyn_organizationalunits` | Org unit for cost rates |

### Location Types

| Value | Label |
|---|---|
| 690970000 | Location Agnostic |
| 690970001 | Resource Address |
| 690970002 | Organizational Unit Address |

### Query Available Resources in Territory

```http
GET {orgUrl}/api/data/v9.2/bookableresources?$select=bookableresourceid,name,resourcetype,timezone&$expand=msdyn_organizationalunit($select=msdyn_name)&$filter=statecode eq 0&$orderby=name asc
```

---

## Resource Booking (`bookableresourcebookings`)

### Key Fields

| Field | Type | Description |
|---|---|---|
| `bookableresourcebookingid` | GUID | Primary key |
| `name` | string | Booking display name |
| `resource` | lookup → `bookableresources` | Booked resource |
| `bookingstatus` | lookup → `bookingstatuses` | Current status |
| `starttime` | datetime | Booking start (UTC) |
| `endtime` | datetime | Booking end (UTC) |
| `msdyn_workorder` | lookup → `msdyn_workorders` | Related work order |
| `msdyn_bookingtype` | picklist | 1=Solid, 2=Liquid (tentative) |
| `msdyn_actualarrivaltime` | datetime | When tech arrived on-site |
| `msdyn_estimatedtravelduration` | integer | Estimated travel time (minutes) |
| `msdyn_actualtravelduration` | integer | Actual travel time (minutes) |
| `duration` | integer | Booking duration (minutes) |

### Booking Types

| Value | Label | Description |
|---|---|---|
| 1 | Solid | Hard booking — resource committed |
| 2 | Liquid | Tentative — subject to change |

### Standard Booking Status Names

Field Service ships default booking statuses. Query yours:

```http
GET {orgUrl}/api/data/v9.2/bookingstatuses?$select=bookingstatusid,name,statecode&$orderby=name asc
```

Common defaults:

| Name | `statecode` |
|---|---|
| Scheduled | 0 |
| Traveling | 1 |
| In Progress | 2 |
| On Break | 3 |
| Completed | 4 |
| Canceled | 5 |

### Update Booking to In Progress

```http
PATCH {orgUrl}/api/data/v9.2/bookableresourcebookings({bookingId})
{
  "bookingstatus@odata.bind": "/bookingstatuses/{inProgressId}",
  "msdyn_actualarrivaltime": "2026-03-10T09:05:00Z"
}
```

### Complete Booking

```http
PATCH {orgUrl}/api/data/v9.2/bookableresourcebookings({bookingId})
{
  "bookingstatus@odata.bind": "/bookingstatuses/{completedId}",
  "msdyn_actualtravelduration": 28,
  "endtime": "2026-03-10T11:15:00Z"
}
```

---

## Resource Requirement (`msdyn_resourcerequirements`)

Resource requirements represent unfilled scheduling demand associated with a work order.

### Key Fields

| Field | Type | Description |
|---|---|---|
| `msdyn_resourcerequirementid` | GUID | Primary key |
| `msdyn_name` | string | Requirement name |
| `msdyn_workorder` | lookup → `msdyn_workorders` | Parent work order |
| `msdyn_fromdate` | datetime | Required start (UTC) |
| `msdyn_todate` | datetime | Required end (UTC) |
| `msdyn_duration` | integer | Required duration (minutes) |
| `msdyn_territory` | lookup → `territories` | Preferred territory |
| `msdyn_requeststatus` | picklist | Fulfillment status |

### Query Requirements for Unscheduled Work Orders

```http
GET {orgUrl}/api/data/v9.2/msdyn_resourcerequirements?$select=msdyn_resourcerequirementid,msdyn_name,msdyn_fromdate,msdyn_todate,msdyn_duration&$expand=msdyn_workorder($select=msdyn_name,msdyn_systemstatus)&$filter=msdyn_requeststatus eq 690970000&$orderby=msdyn_fromdate asc
```

---

## Schedule Assistant API

The `msdyn_SearchResourceAvailability` action returns available time slots for a resource requirement.

### Full Request

```bash
TOKEN=$(az account get-access-token --resource "${D365_ORG_URL}" --query accessToken -o tsv)

curl -s -X POST \
  "${D365_ORG_URL}/api/data/v9.2/msdyn_SearchResourceAvailability" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "OData-Version: 4.0" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "Version": "3",
    "IsWebApi": true,
    "Requirement": {
      "msdyn_resourcerequirementid": "{requirementId}",
      "@odata.type": "Microsoft.Dynamics.CRM.msdyn_resourcerequirement"
    },
    "Settings": {
      "ConsiderSlotsWithProposedBookings": false,
      "MovePastStartDateTo": "2026-03-10T00:00:00Z",
      "UseRealTimeResourceLocation": false,
      "SortOrder": 0
    }
  }'
```

### Response Structure

```json
{
  "AvailableTimeSlots": [
    {
      "Resource": { "bookableresourceid": "...", "name": "Alex Rivera" },
      "StartTime": "2026-03-10T09:00:00Z",
      "EndTime": "2026-03-10T11:00:00Z",
      "TravelTime": 25,
      "Score": 0.92,
      "AvailableDuration": 120
    }
  ]
}
```

Select the highest-scoring slot and create a booking.

---

## Resource Characteristics (Skills)

### Assign Skill to Resource

```http
POST {orgUrl}/api/data/v9.2/bookableresourcecharacteristics
{
  "resource@odata.bind": "/bookableresources/{resourceId}",
  "characteristic@odata.bind": "/characteristics/{characteristicId}",
  "ratingvalue@odata.bind": "/ratingvalues/{proficiencyId}"
}
```

### Query Characteristics Catalog

```http
GET {orgUrl}/api/data/v9.2/characteristics?$select=characteristicid,name,characteristictype&$filter=statecode eq 0&$orderby=name asc
```

| `characteristictype` | Label |
|---|---|
| 1 | Skill |
| 2 | Certification |

---

## Service Territory (`territories`)

Territories define geographic zones for dispatching.

```http
GET {orgUrl}/api/data/v9.2/territories?$select=territoryid,name,description&$filter=statecode eq 0
```

### Assign Resource to Territory

```http
POST {orgUrl}/api/data/v9.2/msdyn_resourceterritory_association/$ref
Headers: If-Match: *
Body:
{
  "@odata.id": "{orgUrl}/api/data/v9.2/territories({territoryId})"
}
```

Or via `msdyn_resourceterritorys`:

```http
POST {orgUrl}/api/data/v9.2/msdyn_resourceterritorys
{
  "msdyn_resource@odata.bind": "/bookableresources/{resourceId}",
  "msdyn_territory@odata.bind": "/territories/{territoryId}"
}
```

---

## Time Off Request (`msdyn_timeoffrequests`)

Time off blocks the resource from scheduling.

### Create Time Off Request

```http
POST {orgUrl}/api/data/v9.2/msdyn_timeoffrequests
{
  "msdyn_name": "PTO — Spring Break",
  "msdyn_resource@odata.bind": "/bookableresources/{resourceId}",
  "msdyn_starttime": "2026-03-23T00:00:00Z",
  "msdyn_endtime": "2026-03-27T23:59:59Z",
  "msdyn_reason": "Annual leave",
  "msdyn_approvaldecision": 690970001
}
```

| `msdyn_approvaldecision` | Label |
|---|---|
| 690970000 | Pending |
| 690970001 | Approved |
| 690970002 | Rejected |
