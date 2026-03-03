---
name: planner-task-dependency
description: Add or remove predecessor/successor task dependencies in a Planner Premium project (requires Microsoft Project license and Dataverse access)
argument-hint: "<predecessor-task-id> --successor <task-id> --project <project-id> [--type FS|SS|FF|SF] [--remove]"
allowed-tools:
  - Read
  - Write
  - Bash
---

# Manage Planner Premium Task Dependencies

Add or remove task dependencies in a **Planner Premium** project. Dependencies link two
tasks so that the successor cannot logically start (or finish) until the predecessor
reaches a certain state.

> **Premium feature**: Requires Dataverse Web API access and Microsoft Project license.
> Standard Planner (Group/Roster plans) does not support dependencies.
> Classic plans accessed via `/planner/tasks` do not have this capability.

## Authentication

Requires a **delegated** token with access to the Dataverse environment.

Required scopes:
- `https://<org>.crm.dynamics.com/.default` — Dataverse delegated scope
- User must hold a **Microsoft Project** license

## Dependency Link Types

| Flag | API Value | Meaning |
|------|-----------|---------|
| `FS` | `192350000` | Finish-to-Start (default) — successor starts after predecessor finishes |
| `SS` | `192350001` | Start-to-Start — successor starts after predecessor starts |
| `FF` | `192350002` | Finish-to-Finish — successor finishes after predecessor finishes |
| `SF` | `192350003` | Start-to-Finish — successor finishes after predecessor starts |

## Arguments

| Argument | Required | Description |
|---|---|---|
| `<predecessor-task-id>` | Yes | `msdyn_projecttask` GUID of the predecessor task |
| `--successor <task-id>` | Yes | `msdyn_projecttask` GUID of the successor task |
| `--project <project-id>` | Yes | `msdyn_project` GUID of the project |
| `--type <type>` | No | Link type: `FS` (default), `SS`, `FF`, or `SF` |
| `--remove` | No | Remove an existing dependency instead of creating one |
| `--dataverse-url <url>` | No | Dataverse org URL (default: read from `DATAVERSE_URL` env var) |

## Dataverse URL

The Dataverse environment URL follows the pattern:
`https://<org-name>.crm.dynamics.com` or `https://<org-name>.crm4.dynamics.com`

Detect it from:
1. `--dataverse-url` argument
2. `DATAVERSE_URL` environment variable
3. Ask the user if neither is set

## Add Dependency (3-Step OperationSet Pattern)

**Planner Premium requires the OperationSet pattern** — direct CRUD on scheduling
entities is not supported. All changes must go through the Project Scheduling Service.

### Step 1: Create OperationSet

```
POST <dataverse-url>/api/data/v9.2/msdyn_CreateOperationSetV1
Content-Type: application/json
Authorization: Bearer <token>
```

```json
{
  "ProjectId": "<project-id>",
  "Description": "Add task dependency"
}
```

Expected response:
```json
{ "OperationSetId": "<operation-set-id>" }
```

### Step 2: Queue the Dependency Creation

```
POST <dataverse-url>/api/data/v9.2/msdyn_PssCreateV1
Content-Type: application/json
Authorization: Bearer <token>
```

```json
{
  "OperationSetId": "<operation-set-id>",
  "Entity": {
    "@odata.type": "Microsoft.Dynamics.CRM.msdyn_projecttaskdependency",
    "msdyn_project@odata.bind": "/msdyn_projects(<project-id>)",
    "msdyn_predecessortask@odata.bind": "/msdyn_projecttasks(<predecessor-task-id>)",
    "msdyn_successortask@odata.bind": "/msdyn_projecttasks(<successor-task-id>)",
    "msdyn_linktype": 192350000
  }
}
```

Map `--type` to `msdyn_linktype`:
- `FS` → `192350000`
- `SS` → `192350001`
- `FF` → `192350002`
- `SF` → `192350003`

### Step 3: Execute OperationSet

```
POST <dataverse-url>/api/data/v9.2/msdyn_ExecuteOperationSetV1
Content-Type: application/json
Authorization: Bearer <token>
```

```json
{
  "OperationSetId": "<operation-set-id>"
}
```

Expected response: `HTTP 200 OK` with execution status.

## Remove Dependency

To remove an existing dependency, first find its ID:

```
GET <dataverse-url>/api/data/v9.2/msdyn_projecttaskdependencies?$filter=
  _msdyn_predecessortask_value eq '<predecessor-task-id>' and
  _msdyn_successortask_value eq '<successor-task-id>'&$select=msdyn_projecttaskdependencyid
```

Then use OperationSet with `msdyn_PssDeleteV1`:
```json
{
  "OperationSetId": "<operation-set-id>",
  "RecordId": "<dependency-id>",
  "EntityLogicalName": "msdyn_projecttaskdependency"
}
```

## OperationSet Limits

- Max **200 operations** per OperationSet
- Max **10 open OperationSets** per user at any time
- Always execute or abandon an OperationSet — abandoned sets consume quota

## Error Handling

| Error | Cause | Resolution |
|-------|-------|-----------|
| `403 Forbidden` | No Project license | Assign Microsoft Project license to the user |
| `OperationSetFailed` | PSS rejected the operation | Check for circular dependencies (A→B→A) |
| `DuplicateDependency` | Dependency already exists | Check existing deps before creating |
| `InvalidLinkType` | Unknown link type value | Use exact numeric values: 192350000-192350003 |

## Success Output

```
Task dependency created
─────────────────────────────────────────────────
Type:        Finish-to-Start (FS)
Predecessor: <predecessor-task-id>
Successor:   <successor-task-id>
Project:     <project-id>
OperationSet: <operation-set-id> (executed)

Meaning: "<Successor task>" cannot start until
         "<Predecessor task>" is finished.
─────────────────────────────────────────────────
```
