# Planner Premium — Dataverse & Project Scheduling API Reference

## Overview

**Planner Premium** (also called Project for the web) stores projects in **Microsoft Dataverse**
rather than the standard Planner Graph API. Premium features — task dependencies, timeline/Gantt,
sprints, goals, custom fields, resource capacity — are accessible only via the **Dataverse Web API**,
not via `https://graph.microsoft.com/v1.0/planner/*`.

## Feature Comparison

| Feature | Classic Planner (Graph v1.0) | Planner Premium (Dataverse) |
|---------|-------------------------------|------------------------------|
| Tasks, buckets, plans | Yes | Yes (different API) |
| Task assignment | Yes | Yes |
| Due dates | Yes | Yes |
| Labels (25 categories) | Yes | Yes |
| Task dependencies | **No** | **Yes** |
| Timeline / Gantt chart | **No** | **Yes** |
| Custom fields | **No** | **Yes** |
| Sprints / iterations | **No** | **Yes** |
| Goals / OKRs | **No** | **Yes** |
| Resource capacity planning | **No** | **Yes** |
| API type | Microsoft Graph REST | Dataverse OData v4 |
| License required | Microsoft 365 | **Microsoft Project** |

## License Detection

Check if a plan is Premium by its container type. Premium plans have container type
`project` (internal Dataverse-backed type). Standard plans show `group`, `roster`, etc.

There is no public Graph API to enumerate Premium plans directly. They appear in the
Planner web app but not in `GET /me/planner/plans` responses.

## Dataverse API Basics

### Base URL
```
https://<org-name>.crm.dynamics.com/api/data/v9.2/
```

Find your org URL:
```
GET https://graph.microsoft.com/beta/me/planner/plans
```
Or from Power Platform admin center: admin.powerplatform.microsoft.com → Environments → your org → Details.

### Authentication

Use delegated token with Dataverse scope:
```
Scope: https://<org-name>.crm.dynamics.com/.default
```

The token is separate from the Microsoft Graph token. Acquire with the same
`InteractiveBrowserCredential` or `DeviceCodeCredential` but with the Dataverse audience.

### Key Dataverse Entities (Tables)

| Entity | Logical Name | Description |
|--------|-------------|-------------|
| Project | `msdyn_project` | A Planner Premium plan/project |
| Task | `msdyn_projecttask` | A task in a project |
| Bucket | `msdyn_projectbucket` | A bucket/column in a project |
| Dependency | `msdyn_projecttaskdependency` | Link between two tasks |
| Sprint | `msdyn_projectsprint` | Sprint/iteration container |
| Goal | `msdyn_projectgoal` | OKR goal linked to project |
| Team member | `msdyn_projectteam` | Project team member |
| Resource assignment | `msdyn_resourceassignment` | Work assignment per member |
| Checklist | `msdyn_projectchecklist` | Checklist on a task |
| Label | `msdyn_projectlabel` | Label/tag on a task |
| Custom field | `msdyn_projectcustomfield` | Custom column definition |

---

## Project Scheduling Service (PSS) — OperationSet Pattern

**Critical**: Any operation that affects project scheduling (task create/update/delete,
dependencies, assignments) MUST go through the PSS OperationSet API.
Direct PATCH on `msdyn_projecttask` is not supported for schedule properties.

### Why OperationSet?

Project scheduling uses constraint-based calculation. Changes to one task (dates,
dependencies) can cascade to recalculate dozens of other tasks. The PSS handles this
atomically via an operation set batch.

### OperationSet Flow

```
1. Create OperationSet → get OperationSetId
2. Queue operations (create/update/delete)
3. Execute OperationSet → PSS processes all changes atomically
```

### Step 1: Create OperationSet

```
POST https://<org>.crm.dynamics.com/api/data/v9.2/msdyn_CreateOperationSetV1
Content-Type: application/json
Authorization: Bearer <dataverse-token>
```

```json
{
  "ProjectId": "<msdyn_project-guid>",
  "Description": "Human-readable description of the batch"
}
```

Response:
```json
{
  "OperationSetId": "abc-123-def-456"
}
```

### Step 2: Queue Operations

**Create task:**
```
POST https://<org>.crm.dynamics.com/api/data/v9.2/msdyn_PssCreateV1
```
```json
{
  "OperationSetId": "<operationSetId>",
  "Entity": {
    "@odata.type": "Microsoft.Dynamics.CRM.msdyn_projecttask",
    "msdyn_projecttaskid": "<new-guid>",
    "msdyn_project@odata.bind": "/msdyn_projects(<project-id>)",
    "msdyn_subject": "Task title",
    "msdyn_scheduledstart": "2026-03-02T08:00:00Z",
    "msdyn_scheduledend": "2026-03-04T17:00:00Z",
    "msdyn_effort": 16,
    "msdyn_projectbucket@odata.bind": "/msdyn_projectbuckets(<bucket-id>)"
  }
}
```

**Update task:**
```
POST https://<org>.crm.dynamics.com/api/data/v9.2/msdyn_PssUpdateV1
```
```json
{
  "OperationSetId": "<operationSetId>",
  "Entity": {
    "@odata.type": "Microsoft.Dynamics.CRM.msdyn_projecttask",
    "msdyn_projecttaskid": "<existing-task-id>",
    "msdyn_subject": "Updated title",
    "msdyn_percentcomplete": 50
  }
}
```

**Delete task:**
```
POST https://<org>.crm.dynamics.com/api/data/v9.2/msdyn_PssDeleteV1
```
```json
{
  "OperationSetId": "<operationSetId>",
  "RecordId": "<task-id>",
  "EntityLogicalName": "msdyn_projecttask"
}
```

**Create dependency:**
```
POST https://<org>.crm.dynamics.com/api/data/v9.2/msdyn_PssCreateV1
```
```json
{
  "OperationSetId": "<operationSetId>",
  "Entity": {
    "@odata.type": "Microsoft.Dynamics.CRM.msdyn_projecttaskdependency",
    "msdyn_projecttaskdependencyid": "<new-guid>",
    "msdyn_project@odata.bind": "/msdyn_projects(<project-id>)",
    "msdyn_predecessortask@odata.bind": "/msdyn_projecttasks(<predecessor-id>)",
    "msdyn_successortask@odata.bind": "/msdyn_projecttasks(<successor-id>)",
    "msdyn_linktype": 192350000
  }
}
```

### Step 3: Execute OperationSet

```
POST https://<org>.crm.dynamics.com/api/data/v9.2/msdyn_ExecuteOperationSetV1
```
```json
{ "OperationSetId": "<operationSetId>" }
```

Response on success:
```json
{
  "OperationSetId": "<operationSetId>",
  "OperationSetDetailCollection": [
    {
      "OperationId": "op-1",
      "Status": "Succeeded",
      "ResourceId": "<created-entity-id>"
    }
  ]
}
```

### OperationSet Limits

| Limit | Value |
|-------|-------|
| Max operations per set | 200 |
| Max open sets per user | 10 |
| Execution timeout | 120 seconds |

---

## Dependency Link Types

| API Value | Constant | Meaning |
|-----------|----------|---------|
| `192350000` | `FS` | Finish-to-Start (most common) |
| `192350001` | `SS` | Start-to-Start |
| `192350002` | `FF` | Finish-to-Finish |
| `192350003` | `SF` | Start-to-Finish |

---

## Task Properties (msdyn_projecttask)

| Property | Type | Description |
|----------|------|-------------|
| `msdyn_subject` | string | Task title |
| `msdyn_scheduledstart` | datetime | Planned start date |
| `msdyn_scheduledend` | datetime | Planned end date |
| `msdyn_effort` | decimal | Effort in hours |
| `msdyn_percentcomplete` | decimal | Completion 0-100 |
| `msdyn_priority` | int | Priority (0-10) |
| `msdyn_projectbucket` | lookup | Bucket (column) |
| `msdyn_sprint` | lookup | Sprint assignment |
| `msdyn_goal` | lookup | Goal linkage |
| `msdyn_assignedteammembers` | string | Semicolon-delimited team member IDs |

---

## Direct Reads (No OperationSet Needed)

Read operations don't require OperationSet — use standard OData GET:

```
GET https://<org>.crm.dynamics.com/api/data/v9.2/msdyn_projecttasks?
  $filter=_msdyn_project_value eq '<project-id>'&
  $select=msdyn_projecttaskid,msdyn_subject,msdyn_percentcomplete,msdyn_scheduledend&
  $expand=msdyn_projecttask_msdyn_projecttaskdependency_PredecessorTask($select=msdyn_linktype)
Authorization: Bearer <dataverse-token>
```

---

## Error Handling

| Error Code | Meaning | Resolution |
|-----------|---------|-----------|
| `403` | No Project license | Assign Microsoft Project Plan license |
| `OperationSetFailed` | PSS rejected the batch | Check for circular dependencies, invalid dates |
| `OperationSetLimitExceeded` | 10 open sets at once | Execute or abandon existing sets |
| `CircularDependency` | A→B→A detected | Remove conflicting dependency first |
| `InvalidSchedule` | Start > End date | Fix task date range |
