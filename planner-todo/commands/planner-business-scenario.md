---
name: planner-business-scenario
description: Create and manage Business Scenario isolated task containers — app-owned Planner tasks with access control policies
argument-hint: "<action: create|configure|list-tasks|create-task|get-task> --scenario <scenario-id> [--group <group-id>] [--title <title>]"
allowed-tools:
  - Read
  - Write
  - Bash
---

# Planner Business Scenarios

The Business Scenarios API allows applications to create **isolated Planner task
containers** with controlled access policies. Tasks belong to the application scenario
and are not visible in regular Planner boards unless the app exposes them.

**Use cases**:
- CRM-linked tasks visible only to your sales app
- Ticketing systems that surface work items in Planner
- IT service management tasks from ServiceNow, Jira, etc.
- Any app that needs Planner tasks with strict access control

> **Beta API**: Uses `https://graph.microsoft.com/beta` endpoint.

## Authentication

Required scopes (application or delegated):
- `BusinessScenarioData.ReadWrite.All` — for creating and managing scenario tasks
- `Tasks.ReadWrite` — for reading Planner tasks
- Application permission requires admin consent

## Actions

| Action | Description |
|--------|-------------|
| `create` | Create a new Business Scenario |
| `configure` | Configure the scenario's plan and access policies |
| `list-tasks` | List all tasks for this scenario |
| `create-task` | Create a task in the scenario |
| `get-task` | Get a specific scenario task by external ID |

## Arguments

| Argument | Required | Description |
|---|---|---|
| `<action>` | Yes | Action to perform |
| `--scenario <id>` | Most actions | Business Scenario GUID |
| `--unique-name <name>` | create | Unique identifier for the scenario (`app.feature.name` format) |
| `--display-name <name>` | create | Human-readable scenario display name |
| `--group <group-id>` | create-task | M365 Group ID to scope the task to |
| `--external-id <id>` | create-task | Your app's internal ID for this task (must be unique) |
| `--title <title>` | create-task | Task title |
| `--bucket <external-bucket-id>` | create-task | Bucket external ID defined in plan configuration |

## Create Business Scenario

```
POST https://graph.microsoft.com/beta/solutions/businessScenarios
Content-Type: application/json
Authorization: Bearer <token>
```

```json
{
  "uniqueName": "com.contoso.ticketing",
  "displayName": "Contoso Ticketing System",
  "ownerAppIds": ["<your-app-id>"]
}
```

Expected response: `HTTP 201 Created` with the scenario ID.

## Configure Plan Structure (Optional)

Define buckets and localization for the scenario's auto-created plans:

```
PATCH https://graph.microsoft.com/beta/solutions/businessScenarios/{scenarioId}/planner/planConfiguration
Content-Type: application/json
Authorization: Bearer <token>
```

```json
{
  "defaultLanguage": "en-US",
  "buckets": [
    { "externalBucketId": "new", "orderHint": " !" },
    { "externalBucketId": "inprogress", "orderHint": " !a" },
    { "externalBucketId": "done", "orderHint": " !b" }
  ],
  "localizations": [
    {
      "languageTag": "en-US",
      "planTitle": "Ticketing Board",
      "buckets": [
        { "externalBucketId": "new", "name": "New" },
        { "externalBucketId": "inprogress", "name": "In Progress" },
        { "externalBucketId": "done", "name": "Done" }
      ]
    }
  ]
}
```

## Create Task in Scenario

```
POST https://graph.microsoft.com/beta/solutions/businessScenarios/{scenarioId}/planner/tasks
Content-Type: application/json
Authorization: Bearer <token>
```

```json
{
  "@odata.type": "#microsoft.graph.businessScenarioPlannerTask",
  "externalId": "TICKET-1234",
  "externalContextId": "support-queue",
  "externalObjectVersion": "1.0.0",
  "webUrl": "https://contoso.com/tickets/1234",
  "target": {
    "@odata.type": "#microsoft.graph.businessScenarioGroupTarget",
    "taskTargetKind": "group",
    "groupId": "<group-id>"
  },
  "title": "Customer reported login failure",
  "bucketId": "new",
  "priority": 1,
  "dueDateTime": "2026-03-10T00:00:00Z"
}
```

Key fields:
- `externalId`: Your app's ID for this task (alternate key for lookups)
- `externalContextId`: Groups related tasks (e.g., all tasks for a specific queue)
- `webUrl`: Deep link back to your app's record
- `target`: Which M365 Group's Planner board to surface this task on

## List Scenario Tasks

```
GET https://graph.microsoft.com/beta/solutions/businessScenarios/{scenarioId}/planner/tasks
Authorization: Bearer <token>
```

## Get Task by External ID

```
GET https://graph.microsoft.com/beta/solutions/businessScenarios/{scenarioId}/planner/tasks/{externalId}
Authorization: Bearer <token>
```

Note: Use `externalId` (your app's ID), not the Planner task GUID, for retrieval.

## Error Handling

| HTTP Status | Cause | Resolution |
|---|---|---|
| 403 | Missing `BusinessScenarioData.ReadWrite.All` scope | Grant and admin-consent the scope |
| 409 | `externalId` already exists in this scenario | Use a different external ID or update the existing task |
| 400 | Group not found or app not in `ownerAppIds` | Verify group ID and app registration |

## Success Output — Create Task

```
Business scenario task created
─────────────────────────────────────────────────
Scenario:    <scenarioId> (com.contoso.ticketing)
Task ID:     <plannerTaskId> (Planner internal)
External ID: TICKET-1234 (your app's key)
Group:       <groupId>
Title:       Customer reported login failure
Bucket:      New
Priority:    Important
─────────────────────────────────────────────────
```
