# Project Entities Reference

## Project (`msdyn_projects`)

**Purpose:** The top-level entity representing a billable or internal project.

### Key Fields

| Field | Type | Description |
|---|---|---|
| `msdyn_projectid` | GUID | Primary key |
| `msdyn_subject` | string | Project name |
| `msdyn_description` | string | Project description |
| `msdyn_projectstage` | picklist | Lifecycle stage (see below) |
| `msdyn_customer` | lookup → `accounts` | Customer account |
| `msdyn_contractorganizationalunitid` | lookup → `msdyn_organizationalunits` | Contracting org unit |
| `msdyn_scheduledstart` | date | Planned start date |
| `msdyn_scheduledend` | date | Planned end date |
| `msdyn_actualduration` | decimal | Actual days worked |
| `msdyn_currency` | lookup → `transactioncurrencies` | Project currency |
| `msdyn_calendarid` | string | Work calendar GUID |
| `msdyn_estimatedexpensecost` | money | Estimated expense cost |
| `msdyn_estimatedlaborcost` | money | Estimated labor cost |
| `msdyn_estimatedexpenserevenue` | money | Estimated expense revenue |
| `msdyn_estimatedlaborrevenue` | money | Estimated labor revenue |
| `msdyn_actuallaborcost` | money | Actual labor cost to date |
| `msdyn_actualexpensecost` | money | Actual expense cost to date |
| `msdyn_progress` | decimal | Overall % complete (0–100) |
| `ownerid` | lookup → `systemusers` | Project Manager |

### Project Stage Values

| Value | Label |
|---|---|
| 192350000 | Quote |
| 192350001 | Plan |
| 192350002 | Manage |
| 192350003 | Close |

### Query Open Projects

```http
GET {orgUrl}/api/data/v9.2/msdyn_projects?$select=msdyn_projectid,msdyn_subject,msdyn_projectstage,msdyn_scheduledstart,msdyn_scheduledend,msdyn_progress&$expand=msdyn_customer($select=name),ownerid($select=fullname)&$filter=msdyn_projectstage ne 192350003 and statecode eq 0&$orderby=msdyn_scheduledend asc
```

---

## Project Task (`msdyn_projecttasks`)

Work breakdown structure (WBS) tasks within a project.

### Key Fields

| Field | Type | Description |
|---|---|---|
| `msdyn_projecttaskid` | GUID | Primary key |
| `msdyn_subject` | string | Task name |
| `msdyn_project` | lookup → `msdyn_projects` | Parent project |
| `msdyn_parenttask` | lookup → `msdyn_projecttasks` | Parent task (for sub-tasks) |
| `msdyn_scheduledstart` | datetime | Planned start (UTC) |
| `msdyn_scheduledend` | datetime | Planned end (UTC) |
| `msdyn_actualdurationminutes` | integer | Actual duration in minutes |
| `msdyn_duration` | decimal | Estimated duration (hours) |
| `msdyn_effort` | decimal | Estimated effort (hours) |
| `msdyn_remainingeffort` | decimal | Remaining effort (hours) |
| `msdyn_effortcompleted` | decimal | Completed effort (hours) |
| `msdyn_percentcomplete` | decimal | % complete (0–100) |
| `msdyn_ismilestone` | boolean | Is this a milestone? |
| `msdyn_displaysequence` | integer | WBS display order |
| `msdyn_estimatedcost` | money | Estimated task cost |
| `msdyn_actualduration` | decimal | Actual duration (days) |
| `msdyn_wbsid` | string | WBS identifier (e.g., "1.2.3") |
| `msdyn_outlinelevel` | integer | Hierarchy depth (1=root) |
| `msdyn_hassummarychildren` | boolean | Has child tasks |

### Query WBS for a Project

```http
GET {orgUrl}/api/data/v9.2/msdyn_projecttasks?$select=msdyn_projecttaskid,msdyn_subject,msdyn_wbsid,msdyn_scheduledstart,msdyn_scheduledend,msdyn_percentcomplete,msdyn_ismilestone,msdyn_effort,msdyn_remainingeffort,msdyn_displaysequence&$filter=_msdyn_project_value eq {projectId}&$orderby=msdyn_displaysequence asc
```

### Update Task Progress

```http
PATCH {orgUrl}/api/data/v9.2/msdyn_projecttasks({taskId})
{
  "msdyn_percentcomplete": 75,
  "msdyn_effortcompleted": 60,
  "msdyn_remainingeffort": 20
}
```

---

## Project Team Member (`msdyn_projectteams`)

Resources assigned to a project.

### Key Fields

| Field | Type | Description |
|---|---|---|
| `msdyn_projectteamid` | GUID | Primary key |
| `msdyn_project` | lookup → `msdyn_projects` | Parent project |
| `msdyn_bookableresourceid` | lookup → `bookableresources` | Team member resource |
| `msdyn_roleid` | lookup → `bookableresourcecategories` | Project role |
| `msdyn_allocationmethod` | picklist | How hours are allocated |
| `msdyn_from` | datetime | Start of project membership |
| `msdyn_to` | datetime | End of project membership |
| `msdyn_requiredhours` | decimal | Required hours |
| `msdyn_hoursrequested` | decimal | Requested hours |
| `msdyn_assignedhours` | decimal | Assigned hours |

### Allocation Methods

| Value | Label |
|---|---|
| 1 | None |
| 2 | Full Capacity |
| 3 | Hours Distributed Evenly |
| 4 | Hours Front Loaded |
| 5 | Percentage Capacity |
| 6 | By Hours Remaining |

### Query Team Members

```http
GET {orgUrl}/api/data/v9.2/msdyn_projectteams?$select=msdyn_projectteamid,msdyn_requiredhours,msdyn_assignedhours,msdyn_from,msdyn_to&$expand=msdyn_bookableresourceid($select=name),msdyn_roleid($select=name)&$filter=_msdyn_project_value eq {projectId} and statecode eq 0
```

---

## Resource Assignment (`msdyn_resourceassignments`)

Assignments of team members to specific tasks.

### Key Fields

| Field | Type | Description |
|---|---|---|
| `msdyn_resourceassignmentid` | GUID | Primary key |
| `msdyn_taskid` | lookup → `msdyn_projecttasks` | Assigned task |
| `msdyn_projectteamid` | lookup → `msdyn_projectteams` | Team member |
| `msdyn_projectid` | lookup → `msdyn_projects` | Project |
| `msdyn_bookableresourceid` | lookup → `bookableresources` | Specific resource |
| `msdyn_fromdate` | datetime | Assignment start |
| `msdyn_todate` | datetime | Assignment end |
| `msdyn_hours` | decimal | Assigned hours |

---

## Project Role (`bookableresourcecategories`)

Named roles used for estimating and billing (e.g., Senior Consultant, Project Manager).

```http
GET {orgUrl}/api/data/v9.2/bookableresourcecategories?$select=bookableresourcecategoryid,name,description&$filter=statecode eq 0&$orderby=name asc
```

---

## Organizational Unit (`msdyn_organizationalunits`)

Business units with their own cost and bill rates. Used for multi-org project billing.

### Key Fields

| Field | Type | Description |
|---|---|---|
| `msdyn_organizationalunitid` | GUID | Primary key |
| `msdyn_name` | string | Org unit name |
| `msdyn_currency` | lookup → `transactioncurrencies` | Unit currency |
| `msdyn_description` | string | Description |

```http
GET {orgUrl}/api/data/v9.2/msdyn_organizationalunits?$select=msdyn_organizationalunitid,msdyn_name,msdyn_currency&$filter=statecode eq 0
```

---

## Project Parameter (`msdyn_projectparameters`)

Global Project Operations configuration. Presence confirms Project Operations is installed.

```http
GET {orgUrl}/api/data/v9.2/msdyn_projectparameters?$select=msdyn_projectparameterid,msdyn_orgcalendar,msdyn_defaultorganizationalunit&$top=1
```

If this returns 0 records, Project Operations is not provisioned in the environment.

### Key Parameter Fields

| Field | Description |
|---|---|
| `msdyn_orgcalendar` | Default work calendar ID |
| `msdyn_defaultorganizationalunit` | Default org unit |
| `msdyn_worktemplate` | Default work hour template |

---

## Transaction Category (`msdyn_transactioncategories`)

Categories used for time, expense, and billing transactions.

```http
GET {orgUrl}/api/data/v9.2/msdyn_transactioncategories?$select=msdyn_transactioncategoryid,msdyn_name,msdyn_transactionclassification&$filter=statecode eq 0
```

| `msdyn_transactionclassification` | Label |
|---|---|
| 1 | Time |
| 2 | Expense |
| 3 | Material |
| 4 | Milestone |
| 5 | Tax |
