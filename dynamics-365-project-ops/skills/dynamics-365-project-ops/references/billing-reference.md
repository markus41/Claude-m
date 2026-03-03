# Billing Reference

## Project Contract

Project Operations uses the `salesorders` entity for project contracts, filtered by `msdyn_ordertype`.

### Key Fields

| Field | Type | Description |
|---|---|---|
| `salesorderid` | GUID | Primary key |
| `name` | string | Contract name |
| `customerid_account` | lookup → `accounts` | Customer |
| `pricelevelid` | lookup → `pricelevels` | Price list |
| `msdyn_contractorganizationalunit` | lookup → `msdyn_organizationalunits` | Contracting org unit |
| `msdyn_project` | lookup → `msdyn_projects` | Linked project |
| `orderstatus` | picklist | Contract status |
| `totalamount` | money | Total contract value |
| `msdyn_ordertype` | picklist | Must be 3 (Project-based) for Project Ops |

### Contract Status Values

| `orderstatus` | Label |
|---|---|
| 1 | Active |
| 2 | Submitted |
| 3 | Cancelled |
| 4 | Fulfilled |
| 700610000 | Won |
| 700610001 | Lost |

### Query Project Contracts

```http
GET {orgUrl}/api/data/v9.2/salesorders?$select=salesorderid,name,totalamount,orderstatus,createdon&$expand=customerid_account($select=name)&$filter=msdyn_ordertype eq 3 and statecode eq 0&$orderby=createdon desc
```

---

## Project Contract Line (`salesorderdetails`)

Individual billing lines on a project contract.

### Key Fields

| Field | Type | Description |
|---|---|---|
| `salesorderdetailid` | GUID | Primary key |
| `salesorderid` | lookup → `salesorders` | Parent contract |
| `productid` | lookup → `products` | Associated product |
| `msdyn_project` | lookup → `msdyn_projects` | Linked project |
| `msdyn_projecttask` | lookup → `msdyn_projecttasks` | Linked task |
| `msdyn_billingmethod` | picklist | Billing model |
| `msdyn_budgetamount` | money | Contract line budget |
| `quantity` | decimal | Quantity |
| `priceperunit` | money | Price per unit |
| `extendedamount` | money | Total line amount |

### Billing Method Values

| Value | Label |
|---|---|
| 192350000 | Time and Material |
| 192350001 | Fixed Price |

### Create Contract Line

```http
POST {orgUrl}/api/data/v9.2/salesorderdetails
{
  "salesorderid@odata.bind": "/salesorders/{contractId}",
  "msdyn_project@odata.bind": "/msdyn_projects/{projectId}",
  "msdyn_billingmethod": 192350000,
  "msdyn_budgetamount": 280000,
  "quantity": 1,
  "priceperunit": 280000,
  "extendedamount": 280000
}
```

---

## Invoice (`invoices`)

Project invoices use the standard `invoices` entity, filtered by `msdyn_ordertype`.

### Key Fields

| Field | Type | Description |
|---|---|---|
| `invoiceid` | GUID | Primary key |
| `name` | string | Invoice number/name |
| `customerid_account` | lookup → `accounts` | Billed customer |
| `salesorderid` | lookup → `salesorders` | Project contract |
| `invoicestatuscode` | picklist | Invoice status |
| `totalamount` | money | Invoice total |
| `totaltax` | money | Tax total |
| `datedelivered` | date | Invoice date |
| `duedate` | date | Payment due date |
| `msdyn_invoicedate` | date | Project Ops invoice date |

### Invoice Status Values

| `invoicestatuscode` | Label |
|---|---|
| 1 | Active (Draft) |
| 2 | Paid |
| 4 | Canceled |
| 100001 | Invoice Cancelled |
| 100002 | Revised |

### Generate Invoice Proposal

```bash
curl -s -X POST \
  "${D365_ORG_URL}/api/data/v9.2/msdyn_projects({projectId})/Microsoft.Dynamics.CRM.msdyn_CreateInvoice" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "OData-Version: 4.0" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "InvoiceDate": "2026-05-31T00:00:00Z"
  }'
```

Response contains `invoiceid` of the created invoice proposal.

### Confirm Invoice

```bash
curl -s -X POST \
  "${D365_ORG_URL}/api/data/v9.2/invoices({invoiceId})/Microsoft.Dynamics.CRM.msdyn_ConfirmInvoice" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "OData-Version: 4.0" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{}'
```

Confirming moves the invoice from Draft → Active and locks the included actuals.

### Mark Invoice Paid

```http
PATCH {orgUrl}/api/data/v9.2/invoices({invoiceId})
{
  "invoicestatuscode": 2,
  "statecode": 1
}
```

---

## Project Actual (`msdyn_actuals`)

Actuals are the financial record of all cost and revenue transactions generated from approved time, expenses, and billing milestones.

### Key Fields

| Field | Type | Description |
|---|---|---|
| `msdyn_actualid` | GUID | Primary key |
| `msdyn_transactiontype` | picklist | Cost, Unbilled Sales, Billed Sales, etc. |
| `msdyn_documenttype` | picklist | Source document type |
| `msdyn_project` | lookup → `msdyn_projects` | Related project |
| `msdyn_task` | lookup → `msdyn_projecttasks` | Related task |
| `msdyn_resourcecategory` | lookup → `bookableresourcecategories` | Role |
| `msdyn_bookableresource` | lookup → `bookableresources` | Resource |
| `msdyn_transactiondate` | date | Transaction date |
| `msdyn_amount` | money | Transaction amount |
| `msdyn_quantity` | decimal | Quantity (hours/units) |
| `msdyn_unit` | lookup → `uoms` | Unit of measure |
| `msdyn_accountingdate` | date | Accounting/posting date |
| `msdyn_adjustmentstatus` | picklist | Adjustment state |
| `msdyn_billingstatus` | picklist | Billing lifecycle |

### Transaction Type Values

| Value | Label | Description |
|---|---|---|
| 192350000 | Cost | Internal cost generated |
| 192350001 | Inter-Org Sales | Sold between org units |
| 192350002 | Resale | Pass-through |
| 192350004 | Billed Sales | Invoiced to customer |
| 192350005 | Unbilled Sales | Approved but not yet invoiced |
| 192350006 | Tax | Tax transaction |

### Document Type Values

| Value | Label |
|---|---|
| 192350000 | None |
| 192350001 | Invoice |
| 192350002 | Material Usage Log |
| 192350003 | Time Entry |
| 192350004 | Expense Report |
| 192350005 | Journal |

### Billing Status Values

| Value | Label |
|---|---|
| 192350000 | Unbilled Backlog |
| 192350001 | Billed |
| 192350002 | Not Available for Billing |
| 192350003 | Ready for Billing |

### Query Unbilled Actuals for a Project

```http
GET {orgUrl}/api/data/v9.2/msdyn_actuals?$select=msdyn_actualid,msdyn_transactiontype,msdyn_amount,msdyn_quantity,msdyn_transactiondate,msdyn_billingstatus&$expand=msdyn_task($select=msdyn_subject),msdyn_bookableresource($select=name),msdyn_resourcecategory($select=name)&$filter=_msdyn_project_value eq {projectId} and msdyn_transactiontype eq 192350005 and msdyn_billingstatus eq 192350000 and statecode eq 0
```

### Revenue Summary by Task

```http
GET {orgUrl}/api/data/v9.2/msdyn_actuals?$apply=filter(_msdyn_project_value eq {projectId} and msdyn_transactiontype eq 192350004)/groupby((msdyn_task/msdyn_subject),aggregate(msdyn_amount with sum as totalBilledRevenue,msdyn_quantity with sum as totalHours))
```

---

## Billing Milestone

Fixed-price contracts use billing milestones (contract line `salesorderdetail` with `msdyn_billingmethod` = 192350001). Milestones are represented as `msdyn_contractlinescheduleofvalues`:

```http
GET {orgUrl}/api/data/v9.2/msdyn_contractlinescheduleofvalues?$select=msdyn_name,msdyn_amount,msdyn_invoicedate,msdyn_milestonedate,msdyn_iscompleted&$filter=_msdyn_contractline_value eq {contractLineId}&$orderby=msdyn_milestonedate asc
```

### Mark Milestone Ready for Invoice

```http
PATCH {orgUrl}/api/data/v9.2/msdyn_contractlinescheduleofvalues({milestoneId})
{
  "msdyn_iscompleted": true
}
```

Completed milestones appear on the next invoice proposal run.

---

## Revenue Recognition

For Time and Material contracts, actuals flow:

```
Approved Time Entry
  → msdyn_actuals (Cost) [immediate]
  → msdyn_actuals (Unbilled Sales) [immediate]
  → Invoice Proposal (msdyn_CreateInvoice)
  → msdyn_actuals (Billed Sales) [on invoice confirm]
  → msdyn_actuals (Unbilled Sales) reversed [on invoice confirm]
```

For Fixed Price contracts:

```
Milestone marked Complete
  → msdyn_contractlinescheduleofvalue.msdyn_iscompleted = true
  → Invoice Proposal (msdyn_CreateInvoice)
  → Invoice Line for milestone amount
  → msdyn_actuals (Billed Sales) [on invoice confirm]
```
