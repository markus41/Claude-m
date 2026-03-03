# Time and Expense Reference

## Time Entry (`msdyn_timeentries`)

### Key Fields

| Field | Type | Description |
|---|---|---|
| `msdyn_timeentryid` | GUID | Primary key |
| `msdyn_date` | date | Date of time worked |
| `msdyn_duration` | integer | Duration in minutes |
| `msdyn_description` | string | Work description |
| `msdyn_project` | lookup → `msdyn_projects` | Related project |
| `msdyn_projecttask` | lookup → `msdyn_projecttasks` | Related task |
| `msdyn_bookableresource` | lookup → `bookableresources` | Resource who worked |
| `msdyn_resourcecategory` | lookup → `bookableresourcecategories` | Role performed |
| `msdyn_type` | picklist | Entry type |
| `msdyn_entrystatus` | picklist | Approval status |
| `msdyn_externalcomments` | string | Customer-visible notes |
| `msdyn_internalcomments` | string | Internal notes |
| `msdyn_manager` | lookup → `systemusers` | Approving manager |
| `msdyn_approvedby` | lookup → `systemusers` | Who approved |
| `msdyn_approvedon` | datetime | Approval timestamp |

### Entry Status Values

| Value | Label | Description |
|---|---|---|
| 192350000 | Draft | Created, not yet submitted |
| 192350001 | Returned | Rejected by approver — needs correction |
| 192350002 | Approved | Approved, generates actuals |
| 192350003 | Submitted | Sent for approval |
| 192350004 | Recalled | Recalled after submission |

### Entry Type Values

| Value | Label |
|---|---|
| 192350000 | Work |
| 192350001 | Absence |
| 192350002 | Vacation |

### Submit Time Entry

```bash
# Step 1: Create time entry in Draft status
curl -s -X POST \
  "${D365_ORG_URL}/api/data/v9.2/msdyn_timeentries" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "OData-Version: 4.0" \
  -H "Content-Type: application/json" \
  -d '{
    "msdyn_date": "2026-04-07",
    "msdyn_duration": 480,
    "msdyn_description": "Infrastructure assessment — network topology",
    "msdyn_project@odata.bind": "/msdyn_projects/{projectId}",
    "msdyn_projecttask@odata.bind": "/msdyn_projecttasks/{taskId}",
    "msdyn_bookableresource@odata.bind": "/bookableresources/{resourceId}",
    "msdyn_resourcecategory@odata.bind": "/bookableresourcecategories/{roleId}",
    "msdyn_type": 192350000,
    "msdyn_entrystatus": 192350000
  }'

# Step 2: Submit for approval
curl -s -X POST \
  "${D365_ORG_URL}/api/data/v9.2/msdyn_timeentries({timeEntryId})/Microsoft.Dynamics.CRM.msdyn_SubmitTimeEntry" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "OData-Version: 4.0" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Approve Time Entry (as Manager)

```bash
curl -s -X POST \
  "${D365_ORG_URL}/api/data/v9.2/msdyn_timeentries({timeEntryId})/Microsoft.Dynamics.CRM.msdyn_ApproveTimeEntry" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "OData-Version: 4.0" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Reject Time Entry

```bash
curl -s -X POST \
  "${D365_ORG_URL}/api/data/v9.2/msdyn_timeentries({timeEntryId})/Microsoft.Dynamics.CRM.msdyn_RejectTimeEntry" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "OData-Version: 4.0" \
  -H "Content-Type: application/json" \
  -d '{ "Comment": "Task not billable for this period — resubmit against correct task." }'
```

### Recall Submitted Entry

```http
POST {orgUrl}/api/data/v9.2/msdyn_timeentries({timeEntryId})/Microsoft.Dynamics.CRM.msdyn_RecallTimeEntry
```

### Query Pending Time Approvals

```http
GET {orgUrl}/api/data/v9.2/msdyn_timeentries?$select=msdyn_timeentryid,msdyn_date,msdyn_duration,msdyn_description,msdyn_entrystatus&$expand=msdyn_bookableresource($select=name),msdyn_project($select=msdyn_subject),msdyn_projecttask($select=msdyn_subject)&$filter=msdyn_entrystatus eq 192350003&$orderby=msdyn_date asc
```

---

## Expense (`msdyn_expenses`)

### Key Fields

| Field | Type | Description |
|---|---|---|
| `msdyn_expenseid` | GUID | Primary key |
| `msdyn_name` | string | Expense description |
| `msdyn_project` | lookup → `msdyn_projects` | Related project |
| `msdyn_projecttask` | lookup → `msdyn_projecttasks` | Related task |
| `msdyn_expensecategory` | lookup → `msdyn_expensecategories` | Expense type |
| `msdyn_transactiondate` | date | Date incurred |
| `msdyn_amount` | money | Total amount |
| `msdyn_unitamount` | money | Amount per unit |
| `msdyn_quantity` | decimal | Quantity (for per-unit expenses) |
| `msdyn_currency` | lookup → `transactioncurrencies` | Currency |
| `msdyn_expensestatus` | picklist | Approval status |
| `msdyn_salestaxamount` | money | Tax portion |
| `msdyn_externaldescription` | string | Customer-facing description |
| `msdyn_receipt` | file | Receipt attachment |
| `msdyn_reimbursable` | boolean | Reimbursable to employee |
| `msdyn_billingtype` | picklist | Billing classification |

### Expense Status Values

| Value | Label |
|---|---|
| 192350000 | Draft |
| 192350001 | Returned |
| 192350002 | Approved |
| 192350003 | Submitted |
| 192350004 | Paid |
| 192350005 | Canceled |

### Billing Type Values

| Value | Label |
|---|---|
| 192350000 | Non-Chargeable |
| 192350001 | Chargeable |
| 192350002 | Complimentary |
| 192350003 | Not Available |

### Submit Expense

```bash
# Step 1: Create draft expense
curl -s -X POST \
  "${D365_ORG_URL}/api/data/v9.2/msdyn_expenses" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "OData-Version: 4.0" \
  -H "Content-Type: application/json" \
  -d '{
    "msdyn_name": "Client site travel — April 7",
    "msdyn_project@odata.bind": "/msdyn_projects/{projectId}",
    "msdyn_projecttask@odata.bind": "/msdyn_projecttasks/{taskId}",
    "msdyn_expensecategory@odata.bind": "/msdyn_expensecategories/{categoryId}",
    "msdyn_transactiondate": "2026-04-07",
    "msdyn_amount": 285.50,
    "msdyn_currency@odata.bind": "/transactioncurrencies/{currencyId}",
    "msdyn_unitamount": 285.50,
    "msdyn_expensestatus": 192350000,
    "msdyn_billingtype": 192350001
  }'

# Step 2: Submit for approval
curl -s -X POST \
  "${D365_ORG_URL}/api/data/v9.2/msdyn_expenses({expenseId})/Microsoft.Dynamics.CRM.msdyn_SubmitExpense" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "OData-Version: 4.0" \
  -H "Content-Type: application/json" \
  -d '{}'
```

---

## Expense Category (`msdyn_expensecategories`)

### Key Fields

| Field | Type | Description |
|---|---|---|
| `msdyn_expensecategoryid` | GUID | Primary key |
| `msdyn_name` | string | Category name |
| `msdyn_expensetype` | picklist | Type classification |
| `msdyn_receiptrequired` | picklist | Receipt requirement |

### Common Expense Types

| `msdyn_expensetype` | Label |
|---|---|
| 192350000 | Hotel |
| 192350001 | Travel |
| 192350002 | Meals |
| 192350003 | Entertainment |
| 192350004 | Conference |
| 192350005 | Other |

### Query Expense Categories

```http
GET {orgUrl}/api/data/v9.2/msdyn_expensecategories?$select=msdyn_expensecategoryid,msdyn_name,msdyn_expensetype,msdyn_receiptrequired&$filter=statecode eq 0&$orderby=msdyn_name asc
```

---

## Approval Workflow

Project Operations uses the standard Dataverse approval process. The `msdyn_approvalsets` entity batches approvals:

```http
GET {orgUrl}/api/data/v9.2/msdyn_approvalsets?$select=msdyn_approvalsetid,msdyn_submittedby,msdyn_approvedby,statecode&$filter=statecode eq 0&$orderby=createdon desc
```

### Bulk Approval Pattern

For bulk time entry approval:

```python
# Get all submitted entries for a project
entries = get_submitted_entries(project_id)

for entry in entries:
    response = post_action(
        f"msdyn_timeentries({entry['msdyn_timeentryid']})/Microsoft.Dynamics.CRM.msdyn_ApproveTimeEntry",
        body={}
    )
    if response.status_code == 204:
        approved.append(entry['msdyn_timeentryid'])
    else:
        failed.append(entry['msdyn_timeentryid'])
```

Approved entries generate `msdyn_actuals` records of type Cost and Unbilled Sales.
