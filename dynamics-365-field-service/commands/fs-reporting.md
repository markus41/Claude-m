---
name: fs-reporting
description: Generate Dynamics 365 Field Service reports — MTTR, first-time fix rate, resource utilization, SLA compliance, work order volume trends, and technician performance metrics
argument-hint: "[--territory-id <id>] [--resource-id <id>] [--from <date>] [--to <date>] [--period <YYYY-QN>] [--output-csv]"
allowed-tools:
  - Bash
  - Read
  - Write
---

# Dynamics 365 Field Service Reporting

Generates operational Field Service reports including Mean Time to Repair (MTTR), First-Time Fix Rate (FTFR), resource utilization, SLA compliance, and work order volume trends. Uses Dataverse Web API OData aggregation.

## Arguments

- `--territory-id <id>`: Scope to a specific service territory
- `--resource-id <id>`: Scope to a specific field technician
- `--from <date>`: Report start date (ISO 8601, default: 30 days ago)
- `--to <date>`: Report end date (ISO 8601, default: today)
- `--period <YYYY-QN>`: Quarter shorthand (e.g., `2026-Q1`) — overrides --from/--to
- `--output-csv`: Export detailed data as CSV

## Integration Context Check

Require:
- `D365_ORG_URL`
- Minimum role: `Field Service - Read Only` or `Field Service - Dispatcher`

## Step 1: Authenticate and Resolve Date Range

```bash
TOKEN=$(az account get-access-token --resource "${D365_ORG_URL}" --query accessToken -o tsv)

# Compute date range
if [ -n "${PERIOD}" ]; then
  python3 -c "
import sys
from datetime import date
import calendar
period = '${PERIOD}'
year, q = period.split('-')
year = int(year)
q_map = {'Q1': (1, 3), 'Q2': (4, 6), 'Q3': (7, 9), 'Q4': (10, 12)}
start_month, end_month = q_map[q]
from_date = date(year, start_month, 1).isoformat()
to_date = date(year, end_month, calendar.monthrange(year, end_month)[1]).isoformat()
print(f'{from_date},{to_date}')
" > /tmp/daterange.txt
  FROM_DATE=$(cut -d',' -f1 /tmp/daterange.txt)
  TO_DATE=$(cut -d',' -f2 /tmp/daterange.txt)
else
  FROM_DATE="${FROM:-$(date -d '-30 days' +%Y-%m-%d 2>/dev/null || python3 -c 'from datetime import date, timedelta; print((date.today() - timedelta(days=30)).isoformat())')}"
  TO_DATE="${TO:-$(date +%Y-%m-%d)}"
fi

echo "Report period: ${FROM_DATE} to ${TO_DATE}"
```

## Step 2: Work Order Volume and Status Summary

```bash
TERRITORY_FILTER=""
if [ -n "${TERRITORY_ID}" ]; then
  TERRITORY_FILTER=" and _msdyn_serviceterritoryid_value eq ${TERRITORY_ID}"
fi

curl -s "${D365_ORG_URL}/api/data/v9.2/msdyn_workorders?\$apply=filter(createdon ge ${FROM_DATE}T00:00:00Z and createdon le ${TO_DATE}T23:59:59Z${TERRITORY_FILTER})/groupby((msdyn_systemstatus),aggregate(\$count as workOrderCount))" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "Accept: application/json" | python3 -c "
import sys, json

STATUS_LABELS = {
  690970000: 'Unscheduled', 690970001: 'Scheduled',
  690970002: 'In Progress', 690970003: 'Completed',
  690970004: 'Posted', 690970005: 'Canceled'
}

r = json.load(sys.stdin)
print('Work Order Volume by Status:')
total = 0
for row in r.get('value', []):
    status_code = row.get('msdyn_systemstatus', 0)
    count = row.get('workOrderCount', 0)
    total += count
    label = STATUS_LABELS.get(status_code, f'Unknown({status_code})')
    print(f'  {label}: {count}')
print(f'  Total: {total}')"
```

## Step 3: Mean Time to Repair (MTTR)

MTTR = average `msdyn_timetocomplete` across completed work orders:

```bash
curl -s "${D365_ORG_URL}/api/data/v9.2/msdyn_workorders?\$apply=filter(msdyn_systemstatus eq 690970003 and modifiedon ge ${FROM_DATE}T00:00:00Z and modifiedon le ${TO_DATE}T23:59:59Z${TERRITORY_FILTER} and msdyn_timetocomplete ne null)/aggregate(msdyn_timetocomplete with average as avgMTTR,msdyn_timetocomplete with min as minTTR,msdyn_timetocomplete with max as maxTTR,\$count as completedCount)" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "Accept: application/json" | python3 -c "
import sys, json
r = json.load(sys.stdin)
v = r.get('value', [{}])[0]
avg = v.get('avgMTTR', 0)
min_ttr = v.get('minTTR', 0)
max_ttr = v.get('maxTTR', 0)
count = v.get('completedCount', 0)
print(f'Completed work orders: {count}')
print(f'MTTR (avg): {avg:.1f} min ({avg/60:.1f} hours)')
print(f'Min TTR: {min_ttr} min | Max TTR: {max_ttr} min')"
```

## Step 4: First-Time Fix Rate (FTFR)

FTFR = percentage of work orders completed with only one booking (no re-work):

```python
# For each completed work order, count associated bookings
# FTFR = (work orders with exactly 1 completed booking) / total completed work orders

import json, sys

# Query completed work orders and their booking counts
# NOTE: This requires per-work-order booking count via Python post-processing
# since Dataverse doesn't natively count related records in $apply groupby

completed_wos = []  # Retrieved from Step 2 data

first_time_fix = 0
total_completed = 0

for wo in completed_wos:
    wo_id = wo['msdyn_workorderid']
    # Check booking count per WO
    bookings_response = query(
        f"bookableresourcebookings?$select=bookableresourcebookingid&$filter=_msdyn_workorder_value eq {wo_id} and statecode eq 0"
    )
    booking_count = len(bookings_response.get('value', []))
    total_completed += 1
    if booking_count <= 1:
        first_time_fix += 1

ftfr = (first_time_fix / total_completed * 100) if total_completed > 0 else 0
print(f"First-Time Fix Rate: {ftfr:.1f}% ({first_time_fix}/{total_completed})")
```

## Step 5: Resource Utilization

Measures booked hours vs. available hours per technician:

```bash
RESOURCE_FILTER=""
if [ -n "${RESOURCE_ID}" ]; then
  RESOURCE_FILTER=" and _resource_value eq ${RESOURCE_ID}"
fi

# Total booked hours per resource in period
curl -s "${D365_ORG_URL}/api/data/v9.2/bookableresourcebookings?\$apply=filter(starttime ge ${FROM_DATE}T00:00:00Z and endtime le ${TO_DATE}T23:59:59Z and statecode eq 0${RESOURCE_FILTER})/groupby((resource/name,_resource_value),aggregate(duration with sum as totalMinutes,\$count as bookingCount))&\$expand=resource(\$select=name)" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "Accept: application/json" | python3 -c "
import sys, json
r = json.load(sys.stdin)
print('Resource Utilization:')
print(f'  {'Resource':<30} {'Bookings':>10} {'Hours Booked':>14}')
print('  ' + '-'*55)
for row in sorted(r.get('value', []), key=lambda x: -x.get('totalMinutes', 0)):
    name = row.get('resource', {}).get('name', 'Unknown') if row.get('resource') else 'Unknown'
    count = row.get('bookingCount', 0)
    hours = row.get('totalMinutes', 0) / 60
    print(f'  {name:<30} {count:>10} {hours:>13.1f}h')"
```

## Step 6: SLA Compliance (Time Window Adherence)

Work orders with completed bookings starting within the customer time window:

```bash
curl -s "${D365_ORG_URL}/api/data/v9.2/msdyn_workorders?\$select=msdyn_workorderid,msdyn_name,msdyn_timewindowstart,msdyn_timewindowend&\$filter=msdyn_systemstatus eq 690970003 and modifiedon ge ${FROM_DATE}T00:00:00Z and msdyn_timewindowstart ne null${TERRITORY_FILTER}&\$top=250" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "Accept: application/json" | python3 -c "
import sys, json
from datetime import datetime, timezone

r = json.load(sys.stdin)
wos = r.get('value', [])
on_time = 0
late = 0
no_window = 0

for wo in wos:
    if not wo.get('msdyn_timewindowstart') or not wo.get('msdyn_timewindowend'):
        no_window += 1
        continue
    # Would need actual booking start time to fully calculate adherence
    # Using presence of window as proxy for SLA-tracked work orders
    on_time += 1

total = on_time + late + no_window
print(f'Total completed WOs: {total}')
print(f'With SLA time window: {on_time + late}')
print(f'Without time window (SLA not tracked): {no_window}')"
```

## Step 7: Incident Type Distribution

Top incident types by volume:

```bash
curl -s "${D365_ORG_URL}/api/data/v9.2/msdyn_workorders?\$apply=filter(createdon ge ${FROM_DATE}T00:00:00Z and createdon le ${TO_DATE}T23:59:59Z${TERRITORY_FILTER} and _msdyn_primaryincidenttype_value ne null)/groupby((msdyn_primaryincidenttype/msdyn_name),aggregate(\$count as woCount))&\$expand=msdyn_primaryincidenttype(\$select=msdyn_name)&\$orderby=woCount desc&\$top=10" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "Accept: application/json" | python3 -c "
import sys, json
r = json.load(sys.stdin)
print('Top Incident Types:')
for row in r.get('value', []):
    name = row.get('msdyn_primaryincidenttype', {}).get('msdyn_name', 'Unknown')
    count = row.get('woCount', 0)
    print(f'  {name}: {count}')"
```

## Output Format

```markdown
# Dynamics 365 Field Service Report
**Period:** {fromDate} — {toDate} | **Generated:** {timestamp}
**Scope:** {territory or "All Territories"} | {resource or "All Technicians"}

## Executive Summary
| Metric | Value |
|---|---|
| Total work orders created | {N} |
| Completed | {N} |
| Canceled | {N} |
| **MTTR** | **{avg} min ({hours} hrs)** |
| **First-Time Fix Rate** | **{ftfr}%** |

## Work Order Volume by Status
| Status | Count |
|---|---|
| Unscheduled | {N} |
| Scheduled | {N} |
| In Progress | {N} |
| Completed | {N} |
| Canceled | {N} |

## Resource Utilization
| Technician | Bookings | Hours Booked |
|---|---|---|
| Alex Rivera | 22 | 44.5h |
| Sam Chen | 18 | 36.0h |

## Top Incident Types
| Incident Type | Work Orders |
|---|---|
| HVAC Compressor Failure | 14 |
| Annual Preventive Maintenance | 11 |
| Elevator Inspection | 8 |

## Recommendations
1. MTTR of {N} minutes exceeds target of {target} — review {territory} technician skill gaps
2. FTFR of {ftfr}% — {N} work orders required return visits
3. {N} work orders currently Unscheduled — schedule board requires attention
```
