---
name: fs-schedule
description: Schedule Dynamics 365 Field Service work orders — find available resources via Schedule Assistant, create bookings, reassign bookings, and update booking status (traveling, in progress, completed)
argument-hint: "<action> [--work-order-id <id>] [--booking-id <id>] [--resource-id <id>] [--start <datetime>] [--end <datetime>]"
allowed-tools:
  - Bash
  - Read
  - Write
---

# Dynamics 365 Field Service Scheduling

Creates and manages bookings for Field Service work orders using the Universal Resource Scheduling (URS) engine. Supports the Schedule Assistant API for finding available technicians, creating bookings, reassigning, and updating booking lifecycle status.

## Arguments

- `<action>`: Required — `find-resource`, `book`, `reassign`, `update-status`, `cancel`
- `--work-order-id <id>`: Work order GUID (required for find-resource and book)
- `--requirement-id <id>`: Resource requirement GUID (required if work order has one)
- `--booking-id <id>`: Booking GUID (required for reassign/update-status/cancel)
- `--resource-id <id>`: Bookable resource GUID (required for book and reassign)
- `--start <datetime>`: Booking start time (ISO 8601 UTC, required for book)
- `--end <datetime>`: Booking end time (ISO 8601 UTC, required for book)
- `--status <name>`: New booking status name (for update-status: traveling, in-progress, on-break, completed, canceled)
- `--travel-time <minutes>`: Estimated travel time in minutes

## Integration Context Check

Require:
- `D365_ORG_URL`
- Minimum role: `Field Service - Dispatcher`

## Step 1: Authenticate

```bash
TOKEN=$(az account get-access-token --resource "${D365_ORG_URL}" --query accessToken -o tsv)
```

## Step 2: Action — Find Available Resources (find-resource)

Retrieves the resource requirement for the work order, then calls the Schedule Assistant:

```bash
# Get resource requirement for the work order
REQUIREMENT_ID=$(curl -s "${D365_ORG_URL}/api/data/v9.2/msdyn_resourcerequirements?\$select=msdyn_resourcerequirementid,msdyn_fromdate,msdyn_todate,msdyn_duration&\$filter=_msdyn_workorder_value eq ${WORK_ORDER_ID}" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "Accept: application/json" | python3 -c "
import sys, json
r = json.load(sys.stdin)
reqs = r.get('value', [])
if reqs:
    print(reqs[0]['msdyn_resourcerequirementid'])
else:
    print('')")

if [ -z "$REQUIREMENT_ID" ]; then
  echo "No resource requirement found for work order. Check work order type configuration."
  exit 1
fi

# Call Schedule Assistant
curl -s -X POST \
  "${D365_ORG_URL}/api/data/v9.2/msdyn_SearchResourceAvailability" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "OData-Version: 4.0" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d "{
    \"Version\": \"3\",
    \"IsWebApi\": true,
    \"Requirement\": {
      \"msdyn_resourcerequirementid\": \"${REQUIREMENT_ID}\",
      \"@odata.type\": \"Microsoft.Dynamics.CRM.msdyn_resourcerequirement\"
    },
    \"Settings\": {
      \"ConsiderSlotsWithProposedBookings\": false,
      \"MovePastStartDateTo\": \"$(date -u +%Y-%m-%dT00:00:00Z)\",
      \"UseRealTimeResourceLocation\": false,
      \"SortOrder\": 0
    }
  }" | python3 -c "
import sys, json
r = json.load(sys.stdin)
slots = r.get('AvailableTimeSlots', [])
print(f'Available slots: {len(slots)}')
for i, slot in enumerate(slots[:10], 1):
    resource = slot.get('Resource', {}).get('name', 'Unknown')
    start = slot.get('StartTime', '')[:16]
    end = slot.get('EndTime', '')[:16]
    travel = slot.get('TravelTime', 0)
    score = slot.get('Score', 0)
    print(f'  {i}. {resource} | {start} — {end} | Travel: {travel}min | Score: {score:.2f}')"
```

Present the top 5 available slots to the user. Ask `AskUserQuestion` if the user needs to select a slot interactively.

## Step 3: Action — Create Booking (book)

Look up the booking status ID for "Scheduled":

```bash
SCHEDULED_STATUS_ID=$(curl -s "${D365_ORG_URL}/api/data/v9.2/bookingstatuses?\$select=bookingstatusid,name&\$filter=name eq 'Scheduled'" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "Accept: application/json" | python3 -c "
import sys, json
r = json.load(sys.stdin)
statuses = r.get('value', [])
if statuses:
    print(statuses[0]['bookingstatusid'])
else:
    print('')")

# Create the booking
curl -s -X POST \
  "${D365_ORG_URL}/api/data/v9.2/bookableresourcebookings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "OData-Version: 4.0" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d "{
    \"msdyn_workorder@odata.bind\": \"/msdyn_workorders/${WORK_ORDER_ID}\",
    \"resource@odata.bind\": \"/bookableresources/${RESOURCE_ID}\",
    \"bookingstatus@odata.bind\": \"/bookingstatuses/${SCHEDULED_STATUS_ID}\",
    \"starttime\": \"${START_TIME}\",
    \"endtime\": \"${END_TIME}\",
    \"msdyn_bookingtype\": 1,
    \"msdyn_estimatedtravelduration\": ${TRAVEL_TIME:-0}
  }"
```

After creating the booking, the work order `msdyn_systemstatus` automatically changes from Unscheduled (690970000) to Scheduled (690970001).

## Step 4: Action — Reassign Booking (reassign)

```bash
curl -s -X PATCH \
  "${D365_ORG_URL}/api/data/v9.2/bookableresourcebookings(${BOOKING_ID})" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "OData-Version: 4.0" \
  -H "Content-Type: application/json" \
  -d "{
    \"resource@odata.bind\": \"/bookableresources/${RESOURCE_ID}\",
    \"starttime\": \"${START_TIME}\",
    \"endtime\": \"${END_TIME}\"
  }"
```

## Step 5: Action — Update Booking Status (update-status)

Resolve the status name to a booking status ID:

```bash
STATUS_NAME="${STATUS:-Traveling}"
STATUS_ID=$(curl -s "${D365_ORG_URL}/api/data/v9.2/bookingstatuses?\$select=bookingstatusid,name&\$filter=name eq '${STATUS_NAME}'" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "Accept: application/json" | python3 -c "
import sys, json
r = json.load(sys.stdin)
v = r.get('value', [])
print(v[0]['bookingstatusid'] if v else '')")

PATCH_BODY="{\"bookingstatus@odata.bind\": \"/bookingstatuses/${STATUS_ID}\"}"

# If marking as In Progress, set actual arrival time
if [ "${STATUS_NAME}" = "In Progress" ]; then
  PATCH_BODY="{\"bookingstatus@odata.bind\": \"/bookingstatuses/${STATUS_ID}\", \"msdyn_actualarrivaltime\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}"
fi

curl -s -X PATCH \
  "${D365_ORG_URL}/api/data/v9.2/bookableresourcebookings(${BOOKING_ID})" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "OData-Version: 4.0" \
  -H "Content-Type: application/json" \
  -d "$PATCH_BODY"
```

## Step 6: Verify Booking Result

Retrieve the updated booking to confirm:

```bash
curl -s "${D365_ORG_URL}/api/data/v9.2/bookableresourcebookings(${BOOKING_ID})?\$select=name,starttime,endtime,msdyn_actualarrivaltime,msdyn_estimatedtravelduration&\$expand=resource(\$select=name),bookingstatus(\$select=name),msdyn_workorder(\$select=msdyn_name,msdyn_systemstatus)" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "Accept: application/json"
```

## Output Format

```markdown
# Field Service Scheduling Report
**Action:** {action}
**Timestamp:** {timestamp}

## Work Order
| Field | Value |
|---|---|
| Work Order | {msdyn_name} |
| Status | {systemStatus} |
| Service Account | {accountName} |
| Time Window | {start} — {end} |

## Booking Result
| Field | Value |
|---|---|
| Booking ID | {bookingId} |
| Resource | {resourceName} |
| Status | {bookingStatus} |
| Start | {startTime} |
| End | {endTime} |
| Travel Time | {travelTime} min |
| Arrival Time | {actualArrivalTime or Pending} |

## Available Slots (find-resource only)
| # | Resource | Start | End | Travel | Score |
|---|---|---|---|---|---|
| 1 | Alex Rivera | 2026-03-10 09:00 | 11:00 | 25 min | 0.92 |

## Next Steps
- {Update work order status to In Progress when technician arrives}
- {Mark booking Completed once work is finished}
- {Set work order to Completed after all tasks done}
```

## Important Notes

- Booking status "Scheduled" → "Traveling" → "In Progress" → "Completed" is the standard flow.
- When a booking is Completed, update the work order status to Completed separately (PATCH `msdyn_systemstatus` = 690970003) if not done automatically.
- Do not delete bookings to cancel — set booking status to Canceled to preserve history.
- If the Schedule Assistant returns no slots, check that the resource requirement has a valid territory and time window matching the resources' calendar.
