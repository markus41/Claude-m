---
name: proj-time-expense
description: Submit, review, and approve Dynamics 365 Project Operations time entries and expense reports — submit for approval, approve or reject, recall, and query pending approvals
argument-hint: "<action> [--project-id <id>] [--entry-id <id>] [--resource-id <id>] [--date <date>] [--hours <n>] [--dry-run]"
allowed-tools:
  - Bash
  - Read
  - Write
---

# Dynamics 365 Project Operations Time and Expense

Manages time entries and expense reports for Dynamics 365 Project Operations. Supports creating, submitting, approving, rejecting, and recalling time entries and expenses via the Dataverse Web API.

## Arguments

- `<action>`: Required — `submit-time`, `submit-expense`, `approve`, `reject`, `recall`, `list-pending`, `list-my-time`
- `--project-id <id>`: Project GUID
- `--task-id <id>`: Task GUID
- `--entry-id <id>`: Time entry or expense GUID (required for approve/reject/recall)
- `--resource-id <id>`: Bookable resource GUID (for whose entries to retrieve)
- `--role-id <id>`: Project role GUID
- `--date <date>`: Date for time entry (ISO 8601 date, e.g., 2026-04-07)
- `--hours <n>`: Hours worked (converted to minutes internally)
- `--description <text>`: Entry description
- `--expense-category-id <id>`: Expense category GUID
- `--amount <n>`: Expense amount
- `--reject-reason <text>`: Reason for rejection
- `--dry-run`: Preview entry without submitting

## Integration Context Check

Require:
- `D365_ORG_URL`
- For submit: `Project Team Member` role
- For approve: `Project Manager` role

## Step 1: Authenticate

```bash
TOKEN=$(az account get-access-token --resource "${D365_ORG_URL}" --query accessToken -o tsv)
```

## Step 2: Action — Submit Time Entry (submit-time)

### Dry-Run Preview

If `--dry-run`, display what would be submitted:

```markdown
## Time Entry Preview (Dry Run)

**Date:** {date}
**Duration:** {hours}h ({minutes} minutes)
**Project:** {projectName}
**Task:** {taskName}
**Role:** {roleName}
**Description:** {description}

No entry created (dry run).
```

### Create and Submit

```bash
# Convert hours to minutes
DURATION_MINUTES=$(python3 -c "print(int(${HOURS:-8} * 60))")

# Step 1: Create draft time entry
CREATE_RESPONSE=$(curl -s -i -X POST \
  "${D365_ORG_URL}/api/data/v9.2/msdyn_timeentries" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "OData-Version: 4.0" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Prefer: return=representation" \
  -d "{
    \"msdyn_date\": \"${DATE}\",
    \"msdyn_duration\": ${DURATION_MINUTES},
    \"msdyn_description\": \"${DESCRIPTION}\",
    \"msdyn_project@odata.bind\": \"/msdyn_projects/${PROJECT_ID}\",
    \"msdyn_projecttask@odata.bind\": \"/msdyn_projecttasks/${TASK_ID}\",
    \"msdyn_bookableresource@odata.bind\": \"/bookableresources/${RESOURCE_ID}\",
    \"msdyn_resourcecategory@odata.bind\": \"/bookableresourcecategories/${ROLE_ID}\",
    \"msdyn_type\": 192350000,
    \"msdyn_entrystatus\": 192350000
  }")

TIME_ENTRY_ID=$(echo "$CREATE_RESPONSE" | python3 -c "
import sys, json
for line in sys.stdin:
    if 'OData-EntityId' in line:
        import re
        m = re.search(r'\(([0-9a-f-]+)\)', line)
        if m:
            print(m.group(1))
            break
")

echo "Created time entry: $TIME_ENTRY_ID"

# Step 2: Submit for approval
curl -s -X POST \
  "${D365_ORG_URL}/api/data/v9.2/msdyn_timeentries(${TIME_ENTRY_ID})/Microsoft.Dynamics.CRM.msdyn_SubmitTimeEntry" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "OData-Version: 4.0" \
  -H "Content-Type: application/json" \
  -d '{}'

echo "Time entry submitted for approval."
```

## Step 3: Action — Submit Expense (submit-expense)

```bash
# Step 1: Create draft expense
curl -s -i -X POST \
  "${D365_ORG_URL}/api/data/v9.2/msdyn_expenses" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "OData-Version: 4.0" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d "{
    \"msdyn_name\": \"${DESCRIPTION}\",
    \"msdyn_project@odata.bind\": \"/msdyn_projects/${PROJECT_ID}\",
    \"msdyn_projecttask@odata.bind\": \"/msdyn_projecttasks/${TASK_ID}\",
    \"msdyn_expensecategory@odata.bind\": \"/msdyn_expensecategories/${EXPENSE_CATEGORY_ID}\",
    \"msdyn_transactiondate\": \"${DATE}\",
    \"msdyn_amount\": ${AMOUNT},
    \"msdyn_unitamount\": ${AMOUNT},
    \"msdyn_expensestatus\": 192350000,
    \"msdyn_billingtype\": 192350001
  }"

# Step 2: Submit expense for approval
curl -s -X POST \
  "${D365_ORG_URL}/api/data/v9.2/msdyn_expenses(${EXPENSE_ID})/Microsoft.Dynamics.CRM.msdyn_SubmitExpense" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "OData-Version: 4.0" \
  -H "Content-Type: application/json" \
  -d '{}'
```

## Step 4: Action — Approve Entry (approve)

Works for both time entries and expenses — detect type by querying:

```bash
# Try time entry first
ENTRY_TYPE="time"
ENTRY_CHECK=$(curl -s -o /dev/null -w "%{http_code}" \
  "${D365_ORG_URL}/api/data/v9.2/msdyn_timeentries(${ENTRY_ID})?\$select=msdyn_timeentryid" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "Accept: application/json")

if [ "$ENTRY_CHECK" != "200" ]; then
  ENTRY_TYPE="expense"
fi

if [ "$ENTRY_TYPE" = "time" ]; then
  curl -s -X POST \
    "${D365_ORG_URL}/api/data/v9.2/msdyn_timeentries(${ENTRY_ID})/Microsoft.Dynamics.CRM.msdyn_ApproveTimeEntry" \
    -H "Authorization: Bearer $TOKEN" \
    -H "OData-MaxVersion: 4.0" \
    -H "OData-Version: 4.0" \
    -H "Content-Type: application/json" \
    -d '{}'
  echo "Time entry approved."
else
  curl -s -X POST \
    "${D365_ORG_URL}/api/data/v9.2/msdyn_expenses(${ENTRY_ID})/Microsoft.Dynamics.CRM.msdyn_ApproveExpense" \
    -H "Authorization: Bearer $TOKEN" \
    -H "OData-MaxVersion: 4.0" \
    -H "OData-Version: 4.0" \
    -H "Content-Type: application/json" \
    -d '{}'
  echo "Expense approved."
fi
```

## Step 5: Action — Reject Entry (reject)

```bash
curl -s -X POST \
  "${D365_ORG_URL}/api/data/v9.2/msdyn_timeentries(${ENTRY_ID})/Microsoft.Dynamics.CRM.msdyn_RejectTimeEntry" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "OData-Version: 4.0" \
  -H "Content-Type: application/json" \
  -d "{\"Comment\": \"${REJECT_REASON}\"}"
```

## Step 6: Action — Recall Submitted Entry (recall)

```bash
curl -s -X POST \
  "${D365_ORG_URL}/api/data/v9.2/msdyn_timeentries(${ENTRY_ID})/Microsoft.Dynamics.CRM.msdyn_RecallTimeEntry" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "OData-Version: 4.0" \
  -H "Content-Type: application/json" \
  -d '{}'
```

## Step 7: Action — List Pending Approvals (list-pending)

```bash
echo "=== Pending Time Entry Approvals ==="
curl -s "${D365_ORG_URL}/api/data/v9.2/msdyn_timeentries?\$select=msdyn_timeentryid,msdyn_date,msdyn_duration,msdyn_description,msdyn_entrystatus&\$expand=msdyn_bookableresource(\$select=name),msdyn_project(\$select=msdyn_subject),msdyn_projecttask(\$select=msdyn_subject)&\$filter=msdyn_entrystatus eq 192350003&\$orderby=msdyn_date asc" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "Accept: application/json" | python3 -c "
import sys, json
r = json.load(sys.stdin)
entries = r.get('value', [])
print(f'Pending time entries: {len(entries)}')
for e in entries:
    resource = e.get('msdyn_bookableresource', {}).get('name', 'Unknown') if e.get('msdyn_bookableresource') else 'Unknown'
    project = e.get('msdyn_project', {}).get('msdyn_subject', 'Unknown') if e.get('msdyn_project') else 'Unknown'
    task = e.get('msdyn_projecttask', {}).get('msdyn_subject', 'Unknown') if e.get('msdyn_projecttask') else 'Unknown'
    date = e.get('msdyn_date', '')[:10]
    hours = e.get('msdyn_duration', 0) / 60
    desc = e.get('msdyn_description', '')[:50]
    print(f'  {resource} | {date} | {hours:.1f}h | {project} > {task} | {desc}')"

echo ""
echo "=== Pending Expense Approvals ==="
curl -s "${D365_ORG_URL}/api/data/v9.2/msdyn_expenses?\$select=msdyn_expenseid,msdyn_name,msdyn_transactiondate,msdyn_amount,msdyn_expensestatus&\$expand=msdyn_project(\$select=msdyn_subject),msdyn_expensecategory(\$select=msdyn_name)&\$filter=msdyn_expensestatus eq 192350003&\$orderby=msdyn_transactiondate asc" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "Accept: application/json" | python3 -c "
import sys, json
r = json.load(sys.stdin)
expenses = r.get('value', [])
print(f'Pending expenses: {len(expenses)}')
for e in expenses:
    project = e.get('msdyn_project', {}).get('msdyn_subject', 'Unknown') if e.get('msdyn_project') else 'Unknown'
    cat = e.get('msdyn_expensecategory', {}).get('msdyn_name', 'Unknown') if e.get('msdyn_expensecategory') else 'Unknown'
    date = e.get('msdyn_transactiondate', '')[:10]
    amount = e.get('msdyn_amount', 0)
    name = e.get('msdyn_name', 'Unknown')
    print(f'  {name} | {date} | \${amount:.2f} | {cat} | {project}')"
```

## Output Format

```markdown
# Project Operations Time & Expense Report
**Action:** {action}
**Timestamp:** {timestamp}

## Time Entry (if submit-time)
| Field | Value |
|---|---|
| Entry ID | {timeEntryId} |
| Date | {date} |
| Duration | {hours}h ({minutes} min) |
| Project | {projectName} |
| Task | {taskName} |
| Role | {roleName} |
| Status | Submitted |

## Expense (if submit-expense)
| Field | Value |
|---|---|
| Expense ID | {expenseId} |
| Date | {date} |
| Amount | ${amount} |
| Category | {category} |
| Project | {projectName} |
| Status | Submitted |

## Pending Approvals (if list-pending)
### Time Entries ({N} pending)
| Resource | Date | Hours | Project | Task | Description |
|---|---|---|---|---|---|
| Alex Rivera | Apr 7 | 8.0h | Contoso ERP Migration | Infrastructure Assessment | Network topology mapping |

### Expenses ({N} pending)
| Description | Date | Amount | Category | Project |
|---|---|---|---|---|
| Client site travel | Apr 7 | $285.50 | Travel | Contoso ERP Migration |

## Result
{Submitted / Approved / Rejected / Recalled}

## Next Steps
{Contextual next steps based on action}
```

## Important Notes

- Approved time entries generate `msdyn_actuals` records (Cost + Unbilled Sales) immediately.
- Rejected entries return to Draft status (`msdyn_entrystatus` = 192350001). The resource must correct and re-submit.
- Recalled entries return to Draft status from Submitted. Recall is not available on Approved entries.
- Do not PATCH `msdyn_entrystatus` directly — always use the dedicated action endpoints (`msdyn_SubmitTimeEntry`, `msdyn_ApproveTimeEntry`, etc.) to trigger the correct workflow and actuals generation.
