---
name: proj-resources
description: Manage Dynamics 365 Project Operations resource assignments — assign resources to project tasks, view resource utilization, manage bookings, identify over-allocation, and list available project roles
argument-hint: "<action> [--project-id <id>] [--resource-id <id>] [--task-id <id>] [--from <date>] [--to <date>]"
allowed-tools:
  - Bash
  - Read
  - Write
---

# Dynamics 365 Project Operations Resource Management

Manages resource assignments in Dynamics 365 Project Operations — assigning bookable resources to project tasks, viewing utilization by resource and project, identifying over-allocation, and managing team bookings.

## Arguments

- `<action>`: Required — `assign`, `list-assignments`, `utilization`, `overallocation`, `list-roles`, `unassign`
- `--project-id <id>`: Project GUID
- `--task-id <id>`: Task GUID (required for assign)
- `--team-member-id <id>`: Project team member GUID (required for assign/unassign)
- `--resource-id <id>`: Bookable resource GUID
- `--from <date>`: Start date for utilization period (ISO 8601 date)
- `--to <date>`: End date for utilization period (ISO 8601 date)
- `--hours <n>`: Hours to assign

## Integration Context Check

Require:
- `D365_ORG_URL`
- Minimum role: `Project Manager` or `Resource Manager`

## Step 1: Authenticate

```bash
TOKEN=$(az account get-access-token --resource "${D365_ORG_URL}" --query accessToken -o tsv)
```

## Step 2: Action — List Available Project Roles (list-roles)

```bash
curl -s "${D365_ORG_URL}/api/data/v9.2/bookableresourcecategories?\$select=bookableresourcecategoryid,name,description&\$filter=statecode eq 0&\$orderby=name asc" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "Accept: application/json" | python3 -c "
import sys, json
r = json.load(sys.stdin)
roles = r.get('value', [])
print(f'Project roles ({len(roles)}):')
for role in roles:
    print(f\"  {role['name']} ({role['bookableresourcecategoryid']})\")
"
```

## Step 3: Action — List Resource Assignments (list-assignments)

```bash
PROJECT_FILTER=""
if [ -n "${PROJECT_ID}" ]; then
  PROJECT_FILTER="_msdyn_projectid_value eq ${PROJECT_ID}"
fi

RESOURCE_FILTER=""
if [ -n "${RESOURCE_ID}" ]; then
  RESOURCE_FILTER="_msdyn_bookableresourceid_value eq ${RESOURCE_ID}"
fi

FILTER=""
if [ -n "$PROJECT_FILTER" ] && [ -n "$RESOURCE_FILTER" ]; then
  FILTER="${PROJECT_FILTER} and ${RESOURCE_FILTER}"
elif [ -n "$PROJECT_FILTER" ]; then
  FILTER="$PROJECT_FILTER"
elif [ -n "$RESOURCE_FILTER" ]; then
  FILTER="$RESOURCE_FILTER"
fi

curl -s "${D365_ORG_URL}/api/data/v9.2/msdyn_resourceassignments?\$select=msdyn_resourceassignmentid,msdyn_hours,msdyn_fromdate,msdyn_todate&\$expand=msdyn_bookableresourceid(\$select=name),msdyn_projectid(\$select=msdyn_subject),msdyn_taskid(\$select=msdyn_subject,msdyn_percentcomplete)${FILTER:+"&\$filter=${FILTER}"}&\$orderby=msdyn_fromdate asc" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "Accept: application/json" | python3 -c "
import sys, json
r = json.load(sys.stdin)
assignments = r.get('value', [])
print(f'Resource assignments ({len(assignments)}):')
for a in assignments:
    resource = a.get('msdyn_bookableresourceid', {}).get('name', 'Unknown') if a.get('msdyn_bookableresourceid') else 'Unknown'
    project = a.get('msdyn_projectid', {}).get('msdyn_subject', 'Unknown') if a.get('msdyn_projectid') else 'Unknown'
    task = a.get('msdyn_taskid', {}).get('msdyn_subject', 'Unknown') if a.get('msdyn_taskid') else 'Unknown'
    pct = a.get('msdyn_taskid', {}).get('msdyn_percentcomplete', 0) if a.get('msdyn_taskid') else 0
    hours = a.get('msdyn_hours', 0)
    from_date = a.get('msdyn_fromdate', '')[:10]
    to_date = a.get('msdyn_todate', '')[:10]
    print(f'  {resource} | {project} > {task} | {hours:.0f}h | {from_date} — {to_date} | {pct:.0f}%')"
```

## Step 4: Action — Assign Resource to Task (assign)

A team member must already exist on the project (`msdyn_projectteams`). If not, add them first using `proj-manage add-team-member`.

```bash
curl -s -X POST \
  "${D365_ORG_URL}/api/data/v9.2/msdyn_resourceassignments" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "OData-Version: 4.0" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d "{
    \"msdyn_taskid@odata.bind\": \"/msdyn_projecttasks/${TASK_ID}\",
    \"msdyn_projectteamid@odata.bind\": \"/msdyn_projectteams/${TEAM_MEMBER_ID}\",
    \"msdyn_projectid@odata.bind\": \"/msdyn_projects/${PROJECT_ID}\",
    \"msdyn_bookableresourceid@odata.bind\": \"/bookableresources/${RESOURCE_ID}\",
    \"msdyn_fromdate\": \"${FROM}T00:00:00Z\",
    \"msdyn_todate\": \"${TO}T00:00:00Z\",
    \"msdyn_hours\": ${HOURS:-0}
  }"
```

## Step 5: Action — Unassign Resource (unassign)

```bash
curl -s -X DELETE \
  "${D365_ORG_URL}/api/data/v9.2/msdyn_resourceassignments(${ASSIGNMENT_ID})" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0"
```

## Step 6: Action — Resource Utilization Report (utilization)

Aggregate assigned hours per resource in the period:

```bash
FROM_DATE="${FROM:-$(date +%Y-%m-%d)}"
TO_DATE="${TO:-$(date -d '+90 days' +%Y-%m-%d 2>/dev/null || python3 -c 'from datetime import date, timedelta; print((date.today() + timedelta(days=90)).isoformat())')}"

curl -s "${D365_ORG_URL}/api/data/v9.2/msdyn_resourceassignments?\$apply=filter(msdyn_fromdate ge ${FROM_DATE}T00:00:00Z and msdyn_todate le ${TO_DATE}T23:59:59Z)/groupby((_msdyn_bookableresourceid_value,msdyn_bookableresourceid/name),aggregate(msdyn_hours with sum as totalHours,\$count as taskCount))&\$expand=msdyn_bookableresourceid(\$select=name)" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "Accept: application/json" | python3 -c "
import sys, json
r = json.load(sys.stdin)
print(f'Resource Utilization ({\"${FROM_DATE}\"} — {\"${TO_DATE}\"}):')
print(f'  {\"Resource\":<30} {\"Tasks\":>8} {\"Assigned Hours\":>16}')
print('  ' + '-'*56)
rows = sorted(r.get('value', []), key=lambda x: -x.get('totalHours', 0))
for row in rows:
    name_obj = row.get('msdyn_bookableresourceid', {})
    name = name_obj.get('name', 'Unknown') if isinstance(name_obj, dict) else 'Unknown'
    tasks = row.get('taskCount', 0)
    hours = row.get('totalHours', 0)
    print(f'  {name:<30} {tasks:>8} {hours:>15.1f}h')"
```

## Step 7: Action — Detect Over-Allocation (overallocation)

Flag resources with more assigned hours than their capacity in the period:

```python
# Capacity = working days in period * 8 hours
from datetime import date, timedelta

from_date = date.fromisoformat("${FROM_DATE}")
to_date = date.fromisoformat("${TO_DATE}")

# Count working days (Mon-Fri)
working_days = sum(
    1 for d in range((to_date - from_date).days + 1)
    if (from_date + timedelta(days=d)).weekday() < 5
)
capacity_hours = working_days * 8

# For each resource with assigned hours, flag if assigned > capacity
# (Retrieved from utilization query above)
print(f"Period: {from_date} — {to_date}")
print(f"Working days: {working_days}")
print(f"Capacity per resource: {capacity_hours}h")
print()

for resource_name, assigned_hours in utilization.items():
    status = "OVER-ALLOCATED" if assigned_hours > capacity_hours else "OK"
    pct = assigned_hours / capacity_hours * 100
    print(f"  {resource_name}: {assigned_hours:.1f}h / {capacity_hours}h ({pct:.0f}%) [{status}]")
```

## Output Format

```markdown
# Project Operations Resource Report
**Action:** {action}
**Period:** {fromDate} — {toDate}
**Timestamp:** {timestamp}

## Resource Utilization
| Resource | Tasks | Assigned Hours | Capacity | Utilization |
|---|---|---|---|---|
| Alex Rivera | 4 | 120h | 240h | 50% |
| Sam Chen | 6 | 200h | 240h | 83% |
| Jordan Lee | 8 | 290h | 240h | **121% OVER** |

## Resource Assignments for Project
| Resource | Task | From | To | Hours |
|---|---|---|---|---|
| Alex Rivera | Infrastructure Assessment | Apr 1 | Apr 14 | 80h |
| Sam Chen | Data Migration | Apr 15 | May 30 | 160h |

## Over-Allocated Resources ({N} detected)
| Resource | Assigned | Capacity | Over by |
|---|---|---|---|
| Jordan Lee | 290h | 240h | 50h |

## Recommendations
1. Jordan Lee is over-allocated by 50h — reschedule {N} tasks to Q3
2. {N} tasks have no resource assignment — assign before project start
3. Utilization gap detected for {resourceName}: {N}h free capacity
```
