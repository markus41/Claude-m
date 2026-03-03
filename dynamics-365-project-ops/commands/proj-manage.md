---
name: proj-manage
description: Create and manage Dynamics 365 Project Operations projects — create project, add WBS tasks and milestones, assign team members, update task progress, and close project
argument-hint: "<action> [--project-id <id>] [--customer-id <id>] [--task-id <id>] [--resource-id <id>] [--dry-run]"
allowed-tools:
  - Bash
  - Read
  - Write
---

# Dynamics 365 Project Operations Project Management

Creates and manages projects, work breakdown structures (WBS), tasks, milestones, and team members in Dynamics 365 Project Operations via the Dataverse Web API.

## Arguments

- `<action>`: Required — `create`, `add-task`, `add-milestone`, `add-team-member`, `update-progress`, `close`, `list`
- `--project-id <id>`: Project GUID (required for most actions except create/list)
- `--customer-id <id>`: Customer account GUID (required for create)
- `--task-id <id>`: Task GUID (required for update-progress)
- `--resource-id <id>`: Bookable resource GUID (required for add-team-member)
- `--role-id <id>`: Project role (bookableresourcecategory) GUID
- `--org-unit-id <id>`: Organizational unit GUID (required for create)
- `--currency-id <id>`: Transaction currency GUID (required for create)
- `--task-name <name>`: Task subject
- `--start <date>`: Start date (ISO 8601 date)
- `--end <date>`: End date (ISO 8601 date)
- `--effort <hours>`: Estimated effort in hours
- `--percent-complete <n>`: Task completion percentage (0–100)
- `--dry-run`: Preview without executing

## Integration Context Check

Require:
- `D365_ORG_URL`
- Minimum role: `Project Manager`

## Step 1: Authenticate

```bash
TOKEN=$(az account get-access-token --resource "${D365_ORG_URL}" --query accessToken -o tsv)
```

## Step 2: Action — List Projects

```bash
curl -s "${D365_ORG_URL}/api/data/v9.2/msdyn_projects?\$select=msdyn_projectid,msdyn_subject,msdyn_projectstage,msdyn_scheduledstart,msdyn_scheduledend,msdyn_progress&\$expand=msdyn_customer(\$select=name),ownerid(\$select=fullname)&\$filter=statecode eq 0&\$orderby=msdyn_scheduledend asc" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "Accept: application/json" | python3 -c "
import sys, json

STAGE_LABELS = {192350000: 'Quote', 192350001: 'Plan', 192350002: 'Manage', 192350003: 'Close'}

r = json.load(sys.stdin)
projects = r.get('value', [])
print(f'Projects ({len(projects)} total):')
for p in projects:
    name = p.get('msdyn_subject', 'Unknown')
    stage = STAGE_LABELS.get(p.get('msdyn_projectstage', 0), 'Unknown')
    customer = p.get('msdyn_customer', {}).get('name', 'No customer') if p.get('msdyn_customer') else 'No customer'
    end = p.get('msdyn_scheduledend', 'Unknown')[:10]
    progress = p.get('msdyn_progress', 0)
    print(f'  {name} | {stage} | {customer} | End: {end} | {progress:.0f}%')"
```

## Step 3: Action — Create Project (create)

```bash
# Resolve defaults: get default org unit and currency if not provided
if [ -z "${ORG_UNIT_ID}" ]; then
  ORG_UNIT_ID=$(curl -s "${D365_ORG_URL}/api/data/v9.2/msdyn_projectparameters?\$select=_msdyn_defaultorganizationalunit_value&\$top=1" \
    -H "Authorization: Bearer $TOKEN" \
    -H "OData-MaxVersion: 4.0" \
    -H "Accept: application/json" | python3 -c "
import sys, json
r = json.load(sys.stdin)
params = r.get('value', [])
print(params[0].get('_msdyn_defaultorganizationalunit_value', '') if params else '')")
fi

if [ -z "${CURRENCY_ID}" ]; then
  CURRENCY_ID=$(curl -s "${D365_ORG_URL}/api/data/v9.2/transactioncurrencies?\$select=transactioncurrencyid&\$filter=isocurrencycode eq 'USD'&\$top=1" \
    -H "Authorization: Bearer $TOKEN" \
    -H "OData-MaxVersion: 4.0" \
    -H "Accept: application/json" | python3 -c "
import sys, json
r = json.load(sys.stdin)
vals = r.get('value', [])
print(vals[0]['transactioncurrencyid'] if vals else '')")
fi

curl -s -X POST \
  "${D365_ORG_URL}/api/data/v9.2/msdyn_projects" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "OData-Version: 4.0" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d "{
    \"msdyn_subject\": \"${PROJECT_NAME}\",
    \"msdyn_description\": \"${DESCRIPTION}\",
    \"msdyn_projectstage\": 192350001,
    \"msdyn_scheduledstart\": \"${START}\",
    \"msdyn_scheduledend\": \"${END}\",
    \"msdyn_customer@odata.bind\": \"/accounts/${CUSTOMER_ID}\",
    \"msdyn_contractorganizationalunitid@odata.bind\": \"/msdyn_organizationalunits/${ORG_UNIT_ID}\",
    \"msdyn_currency@odata.bind\": \"/transactioncurrencies/${CURRENCY_ID}\"
  }"
```

Note the `msdyn_projectid` from the `OData-EntityId` response header.

## Step 4: Action — Add Task (add-task)

```bash
TASK_BODY="{
  \"msdyn_subject\": \"${TASK_NAME}\",
  \"msdyn_project@odata.bind\": \"/msdyn_projects/${PROJECT_ID}\",
  \"msdyn_scheduledstart\": \"${START}T00:00:00Z\",
  \"msdyn_scheduledend\": \"${END}T00:00:00Z\",
  \"msdyn_duration\": ${EFFORT:-0},
  \"msdyn_effort\": ${EFFORT:-0},
  \"msdyn_remainingeffort\": ${EFFORT:-0},
  \"msdyn_ismilestone\": false,
  \"msdyn_displaysequence\": ${SEQUENCE:-10}
}"

# Add parent task if provided
if [ -n "${PARENT_TASK_ID}" ]; then
  TASK_BODY=$(echo "$TASK_BODY" | python3 -c "
import sys, json
b = json.load(sys.stdin)
b['msdyn_parenttask@odata.bind'] = '/msdyn_projecttasks/${PARENT_TASK_ID}'
print(json.dumps(b))")
fi

curl -s -X POST \
  "${D365_ORG_URL}/api/data/v9.2/msdyn_projecttasks" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "OData-Version: 4.0" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d "$TASK_BODY"
```

## Step 5: Action — Add Milestone (add-milestone)

Milestones have `msdyn_ismilestone = true` and zero duration:

```bash
curl -s -X POST \
  "${D365_ORG_URL}/api/data/v9.2/msdyn_projecttasks" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "OData-Version: 4.0" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d "{
    \"msdyn_subject\": \"${MILESTONE_NAME}\",
    \"msdyn_project@odata.bind\": \"/msdyn_projects/${PROJECT_ID}\",
    \"msdyn_scheduledstart\": \"${DATE}T00:00:00Z\",
    \"msdyn_scheduledend\": \"${DATE}T00:00:00Z\",
    \"msdyn_duration\": 0,
    \"msdyn_effort\": 0,
    \"msdyn_ismilestone\": true,
    \"msdyn_displaysequence\": ${SEQUENCE:-50}
  }"
```

## Step 6: Action — Add Team Member (add-team-member)

```bash
curl -s -X POST \
  "${D365_ORG_URL}/api/data/v9.2/msdyn_projectteams" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "OData-Version: 4.0" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d "{
    \"msdyn_project@odata.bind\": \"/msdyn_projects/${PROJECT_ID}\",
    \"msdyn_bookableresourceid@odata.bind\": \"/bookableresources/${RESOURCE_ID}\",
    \"msdyn_roleid@odata.bind\": \"/bookableresourcecategories/${ROLE_ID}\",
    \"msdyn_allocationmethod\": 4,
    \"msdyn_from\": \"${START}T00:00:00Z\",
    \"msdyn_to\": \"${END}T00:00:00Z\"
  }"
```

## Step 7: Action — Update Task Progress (update-progress)

```bash
curl -s -X PATCH \
  "${D365_ORG_URL}/api/data/v9.2/msdyn_projecttasks(${TASK_ID})" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "OData-Version: 4.0" \
  -H "Content-Type: application/json" \
  -d "{
    \"msdyn_percentcomplete\": ${PERCENT_COMPLETE},
    \"msdyn_effortcompleted\": ${EFFORT_COMPLETED:-0},
    \"msdyn_remainingeffort\": ${REMAINING_EFFORT:-0}
  }"
```

## Step 8: Action — Close Project (close)

```bash
curl -s -X PATCH \
  "${D365_ORG_URL}/api/data/v9.2/msdyn_projects(${PROJECT_ID})" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "OData-Version: 4.0" \
  -H "Content-Type: application/json" \
  -d "{
    \"msdyn_projectstage\": 192350003,
    \"msdyn_progress\": 100
  }"
```

## Output Format

```markdown
# Project Operations Management Report
**Action:** {action}
**Timestamp:** {timestamp}

## Project
| Field | Value |
|---|---|
| Project ID | {msdyn_projectid} |
| Name | {msdyn_subject} |
| Stage | {stage} |
| Customer | {customerName} |
| Start | {msdyn_scheduledstart} |
| End | {msdyn_scheduledend} |
| Progress | {msdyn_progress}% |

## WBS Summary ({N} tasks, {N} milestones)
| WBS | Task | Start | End | Effort (h) | % Complete | Milestone |
|---|---|---|---|---|---|---|
| 1 | Infrastructure Assessment | Apr 1 | Apr 14 | 80h | 0% | No |
| 1.1 | Network topology mapping | Apr 1 | Apr 5 | 32h | 0% | No |
| M1 | Phase 1 Go-Live | Jun 30 | Jun 30 | 0h | — | Yes |

## Team Members ({N} total)
| Resource | Role | From | To | Hours Required |
|---|---|---|---|---|
| Alex Rivera | Senior Consultant | Apr 1 | Sep 30 | 560h |

## Result
{Created project / Task added / Member added / Progress updated / Project closed}

## Next Steps
1. {Create project contract and contract lines for billing}
2. {Assign resources to WBS tasks}
3. {Begin submitting time entries against tasks}
```
