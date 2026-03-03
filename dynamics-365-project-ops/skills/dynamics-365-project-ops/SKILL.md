---
name: dynamics-365-project-ops
description: Deep expertise in Dynamics 365 Project Operations via Dataverse Web API — managing projects, work breakdown structures, tasks and milestones, time and expense entries, resource assignments, project contracts, invoice proposals, and billing actuals on the Project Operations business application layer built on Dataverse.
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
triggers:
  - project operations
  - project task
  - time entry
  - expense entry
  - project billing
  - resource assignment
  - project contract
  - wbs
  - project milestone
  - project invoice
  - d365 project
  - project operations dataverse
  - project actuals
  - project estimate
  - project team member
  - project bucket
  - project schedule
  - project parameter
  - invoice proposal
  - project contract line
  - billing milestone
  - time approval
  - expense approval
  - project journal
  - project transaction
  - resource utilization
  - project booking
  - project resource
  - project role
  - project unit
---

# Dynamics 365 Project Operations via Dataverse Web API

This skill provides comprehensive knowledge for operating the Dynamics 365 Project Operations business application layer on top of Dataverse. It covers the full project lifecycle from creation to closure, work breakdown structure (WBS) management, time and expense tracking, resource assignments, project contracts, invoice proposals, and billing actuals reconciliation.

## Integration Context Contract

- Canonical contract: [`docs/integration-context.md`](../../../docs/integration-context.md)

| Workflow | tenantId | subscriptionId | environmentCloud | principalType | scopesOrRoles |
|---|---|---|---|---|---|
| Project management (create/update WBS) | required | — | `AzureCloud`* | `service-principal` | Project Manager security role |
| Time and expense | required | — | `AzureCloud`* | `service-principal` | Project Team Member + Time Entry user |
| Resource scheduling | required | — | `AzureCloud`* | `service-principal` | Resource Manager |
| Billing and invoicing | required | — | `AzureCloud`* | `service-principal` | Project Billing Admin or Billing Manager |

\* Use sovereign cloud values from the canonical contract when applicable.

**Required auth parameters for every Project Operations workflow:**

- `tenantId` — Entra ID tenant GUID
- `orgUrl` — Dynamics 365 organization URL: `https://{orgName}.crm.dynamics.com`
- Service principal must have a `systemuser` record with Project Operations security roles
- Project Operations must be provisioned in the environment (check via `msdyn_projectparameters`)

Fail fast when `orgUrl` is missing or Project Operations is not installed. Redact org URL and record GUIDs in error output.

## Dataverse Web API Overview

All Project Operations data operations use the Dataverse Web API:

```
{orgUrl}/api/data/v9.2/{entitySetName}
```

API version 9.2 is stable and supports all Project Operations entities, actions, and functions.

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

### Key Project Operations Entity Set Names

| Entity | API entity set | Primary key |
|---|---|---|
| Project | `msdyn_projects` | `msdyn_projectid` |
| Project Task | `msdyn_projecttasks` | `msdyn_projecttaskid` |
| Project Team Member | `msdyn_projectteams` | `msdyn_projectteamid` |
| Resource Assignment | `msdyn_resourceassignments` | `msdyn_resourceassignmentid` |
| Time Entry | `msdyn_timeentries` | `msdyn_timeentryid` |
| Expense | `msdyn_expenses` | `msdyn_expenseid` |
| Expense Category | `msdyn_expensecategories` | `msdyn_expensecategoryid` |
| Project Contract | `salesorders` (filtered) | `salesorderid` |
| Project Contract Line | `salesorderdetails` (filtered) | `salesorderdetailid` |
| Invoice | `invoices` | `invoiceid` |
| Invoice Line | `invoicedetails` | `invoicedetailid` |
| Project Actual | `msdyn_actuals` | `msdyn_actualid` |
| Project Parameter | `msdyn_projectparameters` | `msdyn_projectparameterid` |
| Bookable Resource | `bookableresources` | `bookableresourceid` |
| Project Role | `bookableresourcecategories` | `bookableresourcecategoryid` |
| Organizational Unit | `msdyn_organizationalunits` | `msdyn_organizationalunitid` |
| Transaction Category | `msdyn_transactioncategories` | `msdyn_transactioncategoryid` |

## Project Lifecycle

### Project Status Values

| `msdyn_projectstage` | Display | Description |
|---|---|---|
| 192350000 | Quote | Project in quoting phase |
| 192350001 | Plan | Active planning and execution |
| 192350002 | Manage | Execution in progress |
| 192350003 | Close | Project wrapping up |

### Create Project

```http
POST {orgUrl}/api/data/v9.2/msdyn_projects
{
  "msdyn_subject": "Contoso ERP Migration — Phase 1",
  "msdyn_description": "Full migration of on-premise ERP to Azure cloud, Phase 1: infrastructure and data migration.",
  "msdyn_projectstage": 192350001,
  "msdyn_scheduledstart": "2026-04-01",
  "msdyn_scheduledend": "2026-09-30",
  "msdyn_customer@odata.bind": "/accounts/{customerId}",
  "msdyn_contractorganizationalunitid@odata.bind": "/msdyn_organizationalunits/{orgUnitId}",
  "msdyn_currency@odata.bind": "/transactioncurrencies/{currencyId}",
  "msdyn_calendarid": "{calendarId}"
}
```

### Close Project

```http
PATCH {orgUrl}/api/data/v9.2/msdyn_projects({projectId})
{
  "msdyn_projectstage": 192350003,
  "msdyn_actualduration": 130,
  "msdyn_description": "Project closed. All milestones delivered. Final invoice issued."
}
```

## Work Breakdown Structure (WBS) and Tasks

### Create Project Task

```http
POST {orgUrl}/api/data/v9.2/msdyn_projecttasks
{
  "msdyn_subject": "Infrastructure Assessment",
  "msdyn_project@odata.bind": "/msdyn_projects/{projectId}",
  "msdyn_parenttask@odata.bind": "/msdyn_projecttasks/{parentTaskId}",
  "msdyn_scheduledstart": "2026-04-01T00:00:00Z",
  "msdyn_scheduledend": "2026-04-14T00:00:00Z",
  "msdyn_duration": 80,
  "msdyn_effort": 80,
  "msdyn_remainingeffort": 80,
  "msdyn_estimatedcost": 12000,
  "msdyn_ismilestone": false,
  "msdyn_displaysequence": 10
}
```

### Create Milestone

```http
POST {orgUrl}/api/data/v9.2/msdyn_projecttasks
{
  "msdyn_subject": "Phase 1 Go-Live",
  "msdyn_project@odata.bind": "/msdyn_projects/{projectId}",
  "msdyn_scheduledstart": "2026-06-30T00:00:00Z",
  "msdyn_scheduledend": "2026-06-30T00:00:00Z",
  "msdyn_duration": 0,
  "msdyn_ismilestone": true,
  "msdyn_displaysequence": 50
}
```

### Add Team Member

```http
POST {orgUrl}/api/data/v9.2/msdyn_projectteams
{
  "msdyn_project@odata.bind": "/msdyn_projects/{projectId}",
  "msdyn_bookableresourceid@odata.bind": "/bookableresources/{resourceId}",
  "msdyn_roleid@odata.bind": "/bookableresourcecategories/{roleId}",
  "msdyn_allocationmethod": 4,
  "msdyn_from": "2026-04-01T00:00:00Z",
  "msdyn_to": "2026-09-30T00:00:00Z"
}
```

## Time and Expense

### Time Entry Status Values

| `msdyn_entrystatus` | Display |
|---|---|
| 192350000 | Draft |
| 192350001 | Returned |
| 192350002 | Approved |
| 192350003 | Submitted |
| 192350004 | Recalled |

### Submit Time Entry

```http
POST {orgUrl}/api/data/v9.2/msdyn_timeentries
{
  "msdyn_date": "2026-04-07",
  "msdyn_duration": 480,
  "msdyn_description": "Infrastructure assessment — network topology mapping",
  "msdyn_project@odata.bind": "/msdyn_projects/{projectId}",
  "msdyn_projecttask@odata.bind": "/msdyn_projecttasks/{taskId}",
  "msdyn_resourcecategory@odata.bind": "/bookableresourcecategories/{roleId}",
  "msdyn_bookableresource@odata.bind": "/bookableresources/{resourceId}",
  "msdyn_type": 192350000,
  "msdyn_entrystatus": 192350000
}
```

**Submit for approval:**

```http
POST {orgUrl}/api/data/v9.2/msdyn_timeentries({timeEntryId})/Microsoft.Dynamics.CRM.msdyn_SubmitTimeEntry
```

### Approve Time Entry

```http
POST {orgUrl}/api/data/v9.2/msdyn_timeentries({timeEntryId})/Microsoft.Dynamics.CRM.msdyn_ApproveTimeEntry
```

### Submit Expense Entry

```http
POST {orgUrl}/api/data/v9.2/msdyn_expenses
{
  "msdyn_name": "Client site travel — April 7",
  "msdyn_project@odata.bind": "/msdyn_projects/{projectId}",
  "msdyn_projecttask@odata.bind": "/msdyn_projecttasks/{taskId}",
  "msdyn_expensecategory@odata.bind": "/msdyn_expensecategories/{categoryId}",
  "msdyn_transactiondate": "2026-04-07",
  "msdyn_amount": 285.50,
  "msdyn_currency@odata.bind": "/transactioncurrencies/{currencyId}",
  "msdyn_unitamount": 285.50,
  "msdyn_expensestatus": 192350000,
  "msdyn_salestaxamount": 0
}
```

## Resource Assignments

### Assign Resource to Task

```http
POST {orgUrl}/api/data/v9.2/msdyn_resourceassignments
{
  "msdyn_taskid@odata.bind": "/msdyn_projecttasks/{taskId}",
  "msdyn_projectteamid@odata.bind": "/msdyn_projectteams/{teamMemberId}",
  "msdyn_projectid@odata.bind": "/msdyn_projects/{projectId}",
  "msdyn_bookableresourceid@odata.bind": "/bookableresources/{resourceId}",
  "msdyn_fromdate": "2026-04-01T00:00:00Z",
  "msdyn_todate": "2026-04-14T00:00:00Z",
  "msdyn_hours": 80
}
```

### Query Resource Utilization

```http
GET {orgUrl}/api/data/v9.2/msdyn_resourceassignments?$select=msdyn_resourceassignmentid,msdyn_hours,msdyn_fromdate,msdyn_todate&$expand=msdyn_bookableresourceid($select=name),msdyn_projectid($select=msdyn_subject),msdyn_taskid($select=msdyn_subject)&$filter=msdyn_fromdate ge 2026-04-01T00:00:00Z and msdyn_todate le 2026-06-30T00:00:00Z
```

## Project Contracts and Billing

### Project Contract

Project contracts in Project Operations use the `salesorders` entity with `orderstatus` = 3 (Active).

**Create project contract:**

```http
POST {orgUrl}/api/data/v9.2/salesorders
{
  "name": "Contoso ERP Migration — Contract",
  "customerid_account@odata.bind": "/accounts/{customerId}",
  "pricelevelid@odata.bind": "/pricelevels/{priceLevelId}",
  "msdyn_contractorganizationalunit@odata.bind": "/msdyn_organizationalunits/{orgUnitId}",
  "msdyn_project@odata.bind": "/msdyn_projects/{projectId}",
  "orderstatus": 3,
  "totalamount": 280000
}
```

### Generate Invoice Proposal

```http
POST {orgUrl}/api/data/v9.2/msdyn_projects({projectId})/Microsoft.Dynamics.CRM.msdyn_CreateInvoice
{
  "InvoiceDate": "2026-05-31T00:00:00Z"
}
```

### Confirm Invoice

```http
POST {orgUrl}/api/data/v9.2/invoices({invoiceId})/Microsoft.Dynamics.CRM.msdyn_ConfirmInvoice
```

### Query Project Actuals

Actuals represent the financial transactions generated from approved time, expenses, and billing milestones:

```http
GET {orgUrl}/api/data/v9.2/msdyn_actuals?$select=msdyn_actualid,msdyn_transactiontype,msdyn_amount,msdyn_quantity,msdyn_transactiondate,msdyn_documenttype&$expand=msdyn_project($select=msdyn_subject),msdyn_task($select=msdyn_subject),msdyn_resourcecategory($select=name)&$filter=_msdyn_project_value eq {projectId} and statecode eq 0
```

**Transaction types:**

| `msdyn_transactiontype` | Display |
|---|---|
| 192350000 | Cost |
| 192350001 | Inter-Org Sales |
| 192350002 | Resale |
| 192350004 | Billed Sales |
| 192350005 | Unbilled Sales |

## Error Handling

| HTTP status | OData error code | Cause |
|---|---|---|
| 401 | `0x80040220` | Service principal lacks `systemuser` record or Project Operations role |
| 403 | `0x80040214` | Missing Project Manager, Team Member, or Billing Admin role |
| 404 | `0x80040217` | Record not found (wrong GUID or Project Operations not installed) |
| 400 | `0x8004B400` | Required field missing (e.g., `msdyn_project` on time entry) |
| 400 | `0x80060891` | Invalid status transition (e.g., approving a Draft entry directly) |
| 400 | `0x80048408` | Duplicate detection violation |
| 429 | `0x80072328` | API throttling — add Retry-After backoff |

**Rate limits:** 6,000 API requests per 5-minute window per user. Use `$batch` for bulk operations.

## Output Convention

Every operation produces a structured markdown report:

1. **Header**: operation, timestamp, org URL
2. **Project summary**: project ID, name, stage, customer, contract value
3. **WBS table** (for task operations): task, assignee, effort, start/end, % complete
4. **Actuals table** (for billing): transaction type, amount, date, resource
5. **Recommendations**: over-budget tasks, unassigned milestones, pending approvals

## Reference Files

| Reference | Path | Topics |
|---|---|---|
| Project Entities | `references/project-entities.md` | Projects, tasks, milestones, team members, WBS structure, project parameters |
| Time and Expense Reference | `references/time-expense-reference.md` | Time entries, expenses, approval workflows, expense categories, per-diem rules |
| Billing Reference | `references/billing-reference.md` | Project contracts, contract lines, billing milestones, invoice proposals, actuals, revenue recognition |
