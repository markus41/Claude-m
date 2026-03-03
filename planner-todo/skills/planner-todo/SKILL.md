---
name: Planner & To Do Task Management
description: >
  Deep expertise in Microsoft Planner (Classic and Premium) and Microsoft To Do via Graph
  API and Dataverse — create group/roster/nested/channel plans, manage buckets and tasks,
  assign work, track progress with checklists and labels, manage personal to-do lists with
  recurrence, and leverage advanced features: rich HTML notes, completion requirements,
  task dependencies (Premium), sprints and goals (Premium), nested sub-plans, and
  Business Scenarios for isolated app-owned task containers.
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
triggers:
  - planner
  - to do
  - todo
  - task management
  - plan create
  - bucket
  - task assignment
  - checklist
  - project board
  - sprint planning
  - kanban
  - task list
  - task dependency
  - nested plan
  - sub-plan
  - roster plan
  - planner premium
  - project for the web
  - gantt
  - timeline view
  - sprint
  - goals
  - OKR
  - business scenario
  - dataverse planner
  - task notes
  - completion requirements
  - task hierarchy
---

# Planner & To Do Task Management

## Microsoft Planner Overview

Microsoft Planner is a lightweight project management tool integrated into Microsoft 365. It provides Kanban-style task boards tied to Microsoft 365 Groups (and by extension, Teams channels).

**Core hierarchy**: Plan → Buckets → Tasks → Task Details (checklists, attachments, descriptions).

**Planner in Teams**: Every Teams channel can have one or more Planner tabs. Plans created in Teams are backed by the same Graph API and are fully interoperable with the Planner web app.

## Microsoft To Do Overview

Microsoft To Do is a personal task management app. It syncs with Outlook Tasks and provides lists, steps (sub-tasks), due dates, reminders, and recurrence. Unlike Planner (which is group-based), To Do is individual-focused.

## Microsoft Graph API — Planner Endpoints

Base URL: `https://graph.microsoft.com/v1.0`

### Plans

| Operation | Method | Endpoint |
|-----------|--------|----------|
| List user's plans | GET | `/me/planner/plans` |
| Get plan | GET | `/planner/plans/{planId}` |
| Create plan | POST | `/planner/plans` |
| Update plan | PATCH | `/planner/plans/{planId}` |
| Delete plan | DELETE | `/planner/plans/{planId}` |
| List plan buckets | GET | `/planner/plans/{planId}/buckets` |
| List plan tasks | GET | `/planner/plans/{planId}/tasks` |

**Create plan body (modern container API)**:
```json
{
  "container": {
    "@odata.type": "#microsoft.graph.plannerPlanContainer",
    "type": "group",
    "id": "<m365-group-id>"
  },
  "title": "Sprint 12 Board"
}
```

The legacy `owner` field (group-id shorthand) still works but the `container` object is preferred for new plans. Plans can be owned by `group`, `roster`, `teamsChannel`, `user`, `plannerTask`, or `driveItem` containers. See [`references/container-types.md`](./references/container-types.md) for full details.

### Buckets

| Operation | Method | Endpoint |
|-----------|--------|----------|
| Create bucket | POST | `/planner/buckets` |
| Update bucket | PATCH | `/planner/buckets/{bucketId}` |
| Delete bucket | DELETE | `/planner/buckets/{bucketId}` |

**Create bucket body**:
```json
{
  "name": "To Do",
  "planId": "<plan-id>",
  "orderHint": " !"
}
```

### Tasks

| Operation | Method | Endpoint |
|-----------|--------|----------|
| Create task | POST | `/planner/tasks` |
| Get task | GET | `/planner/tasks/{taskId}` |
| Update task | PATCH | `/planner/tasks/{taskId}` |
| Delete task | DELETE | `/planner/tasks/{taskId}` |
| Get task details | GET | `/planner/tasks/{taskId}/details` |
| Update task details | PATCH | `/planner/tasks/{taskId}/details` |

**Create task body**:
```json
{
  "planId": "<plan-id>",
  "bucketId": "<bucket-id>",
  "title": "Implement auth flow",
  "assignments": {
    "<user-id>": {
      "@odata.type": "#microsoft.graph.plannerAssignment",
      "orderHint": " !"
    }
  },
  "dueDateTime": "2026-03-15T00:00:00Z",
  "priority": 5
}
```

**Task priority values**: 0 = Urgent, 1 = Important, 2-4 = Medium (default), 5-9 = Low.

**Percent complete values**: 0 = Not started, 50 = In progress, 100 = Completed.

**Advanced task fields** (set on task creation or via PATCH):
- `startDateTime` — task start date for Timeline view (must precede `dueDateTime`)
- `previewType` — what shows on the task card: `automatic`, `noPreview`, `checklist`, `description`, `reference`
- `completionRequirements` — enforce `checklistCompletion`, `formCompletion`, or `approvalCompletion` before closing

### Task Details (Checklists, Notes, Attachments)

Task details contain the rich content of a task:

**Update task details body** — use `notes` (rich HTML) for new tasks; `description` is legacy plain-text:
```json
{
  "notes": {
    "content": "<p>Implement the OAuth 2.0 PKCE flow for the SPA client.</p><h3>Acceptance Criteria</h3><ul><li>Token exchange works</li><li>Refresh token handled</li></ul>",
    "contentType": "html"
  },
  "checklist": {
    "<guid-1>": {
      "@odata.type": "#microsoft.graph.plannerChecklistItem",
      "title": "Research PKCE spec",
      "isChecked": false
    },
    "<guid-2>": {
      "@odata.type": "#microsoft.graph.plannerChecklistItem",
      "title": "Write token exchange logic",
      "isChecked": false
    }
  },
  "references": {
    "https%3A//docs%2Emicrosoft%2Ecom": {
      "@odata.type": "#microsoft.graph.plannerExternalReference",
      "alias": "OAuth docs",
      "type": "Other"
    }
  }
}
```

### Labels

Plans support up to 25 category labels. Set label names on the plan details:

```
PATCH /planner/plans/{planId}/details
{
  "categoryDescriptions": {
    "category1": "Bug",
    "category2": "Feature",
    "category3": "Tech Debt"
  }
}
```

Apply labels to tasks:
```json
{
  "appliedCategories": {
    "category1": true,
    "category2": true
  }
}
```

### ETags and Concurrency

All Planner PATCH and DELETE operations require the `If-Match` header with the item's current `@odata.etag`. This prevents concurrent edit conflicts. Always GET the resource first to obtain the current ETag before updating.

## Microsoft Graph API — To Do Endpoints

Base URL: `https://graph.microsoft.com/v1.0`

### Task Lists

| Operation | Method | Endpoint |
|-----------|--------|----------|
| List task lists | GET | `/me/todo/lists` |
| Create task list | POST | `/me/todo/lists` |
| Get task list | GET | `/me/todo/lists/{listId}` |
| Update task list | PATCH | `/me/todo/lists/{listId}` |
| Delete task list | DELETE | `/me/todo/lists/{listId}` |

### Tasks

| Operation | Method | Endpoint |
|-----------|--------|----------|
| List tasks | GET | `/me/todo/lists/{listId}/tasks` |
| Create task | POST | `/me/todo/lists/{listId}/tasks` |
| Get task | GET | `/me/todo/lists/{listId}/tasks/{taskId}` |
| Update task | PATCH | `/me/todo/lists/{listId}/tasks/{taskId}` |
| Delete task | DELETE | `/me/todo/lists/{listId}/tasks/{taskId}` |

**Create To Do task body**:
```json
{
  "title": "Review Q1 budget proposal",
  "body": {
    "content": "Check line items against actuals from last quarter",
    "contentType": "text"
  },
  "importance": "high",
  "status": "notStarted",
  "dueDateTime": {
    "dateTime": "2026-03-10T00:00:00",
    "timeZone": "UTC"
  },
  "reminderDateTime": {
    "dateTime": "2026-03-09T09:00:00",
    "timeZone": "UTC"
  },
  "isReminderOn": true
}
```

### Checklist Items (Steps)

| Operation | Method | Endpoint |
|-----------|--------|----------|
| List checklist items | GET | `/me/todo/lists/{listId}/tasks/{taskId}/checklistItems` |
| Create checklist item | POST | `/me/todo/lists/{listId}/tasks/{taskId}/checklistItems` |
| Update checklist item | PATCH | `/me/todo/lists/{listId}/tasks/{taskId}/checklistItems/{itemId}` |

### Linked Resources

Attach external links (Teams messages, emails, etc.) to To Do tasks:
```
POST /me/todo/lists/{listId}/tasks/{taskId}/linkedResources
{
  "webUrl": "https://teams.microsoft.com/...",
  "applicationName": "Microsoft Teams",
  "displayName": "Related Teams discussion"
}
```

## Authentication & Scopes

| Scope | Type | Description |
|-------|------|-------------|
| `Tasks.ReadWrite` | Delegated | Read and write Planner tasks and To Do tasks for the signed-in user |
| `Tasks.ReadWrite.All` | Application | Read and write all Planner tasks without a signed-in user (app-only) |
| `Group.ReadWrite.All` | Delegated | Required for creating plans (plans must be owned by a Microsoft 365 Group) |
| `Group.Read.All` | Delegated | Read group membership to discover plans the user has access to |

**Note**: To Do endpoints only support delegated permissions — there are no application-only permissions for To Do. Planner supports both delegated and application permissions.

## HTTP Error Handling

| Status | Meaning | Action |
|--------|---------|--------|
| 400 | Bad Request — invalid JSON, missing required field, or malformed assignment object | Validate `planId`, `bucketId`, and `assignments` structure |
| 404 | Not Found — plan, bucket, task, or list does not exist | Confirm IDs; plan may have been deleted or user removed from group |
| 409 | Conflict — ETag mismatch on PATCH/DELETE (concurrent edit detected) | Re-GET the resource to obtain the latest `@odata.etag`, then retry |
| 412 | Precondition Failed — `If-Match` header missing or stale on Planner writes | All Planner PATCH/DELETE require `If-Match: {etag}`. Fetch the resource first |
| 429 | Too Many Requests — throttled by Graph API | Retry after the `Retry-After` header value (seconds); use exponential backoff |
| 503 | Service Unavailable — Planner service temporarily down | Retry with backoff; Planner can be intermittently unavailable during deployments |

Planner error responses follow this structure:
```json
{
  "error": {
    "code": "InvalidRequest",
    "message": "The specified eTag value is not the current value for the item.",
    "innerError": {
      "date": "2026-03-01T10:00:00",
      "request-id": "abc-123"
    }
  }
}
```

## OData Query Optimization

Planner and To Do endpoints support a subset of OData query parameters:

### Supported Parameters

- `$select` — Limit returned properties: `GET /planner/tasks/{id}?$select=title,percentComplete,dueDateTime`
- `$filter` — Filter tasks by properties:
  - By completion: `$filter=percentComplete ne 100`
  - By due date: `$filter=dueDateTime lt '2026-04-01T00:00:00Z'`
  - By assignment: `$filter=assignments/any()`
- `$top` / `$skip` — Paginate results: `$top=50&$skip=0`
- `$orderby` — Sort results (To Do only): `$orderby=dueDateTime/dateTime asc`
- `$count` — Include total count: `$count=true`

### Limitations

- Planner does **not** support `$expand=details` when listing tasks — you must GET each task's details individually.
- Planner `$filter` support is limited: only `percentComplete`, `dueDateTime`, and `assignments` are reliably filterable.
- To Do supports broader filtering on `status`, `importance`, and `dueDateTime`.
- Maximum page size is 999 for Planner list operations.

## Recurrence (To Do)

To Do tasks support recurrence patterns for repeating tasks:

**Weekly recurrence example**:
```json
{
  "title": "Weekly standup prep",
  "status": "notStarted",
  "recurrence": {
    "pattern": {
      "type": "weekly",
      "interval": 1,
      "daysOfWeek": ["monday"],
      "firstDayOfWeek": "monday"
    },
    "range": {
      "type": "noEnd",
      "startDate": "2026-03-03"
    }
  }
}
```

**Daily recurrence example**:
```json
{
  "title": "Daily journal entry",
  "status": "notStarted",
  "recurrence": {
    "pattern": {
      "type": "daily",
      "interval": 1
    },
    "range": {
      "type": "endDate",
      "startDate": "2026-03-01",
      "endDate": "2026-06-30"
    }
  }
}
```

**Pattern types**: `daily`, `weekly`, `absoluteMonthly`, `relativeMonthly`, `absoluteYearly`, `relativeYearly`.

**Range types**: `endDate` (stop on a date), `numbered` (stop after N occurrences), `noEnd` (repeat indefinitely).

## Common Patterns

### Sprint Board Initialization

Set up a complete sprint board with buckets and pre-populated tasks:

1. `POST /planner/plans` with `owner: <group-id>` and `title: "Sprint 14"`.
2. `PATCH /planner/plans/{planId}/details` to set label descriptions: `category1: "Bug"`, `category2: "Feature"`, `category3: "Tech Debt"`, `category4: "Blocked"`.
3. Create 4 buckets in order: "Backlog", "In Progress", "Review", "Done" with ascending `orderHint` values.
4. Import tasks from a backlog source, assigning each to the "Backlog" bucket with `percentComplete: 0`.
5. Assign team members by adding user IDs to the `assignments` object.
6. Set `priority` (0=Urgent, 1=Important, 5=Low) and `dueDateTime` for each task.

### Bulk Task Import from CSV

Import tasks from a structured CSV file into a Planner plan:

1. Parse CSV columns: `Title`, `Assignee`, `DueDate`, `Priority`, `Bucket`, `Description`.
2. Map bucket names to bucket IDs (create buckets first if they don't exist).
3. Map assignee emails to AAD user IDs via `GET /users/{email}`.
4. `POST /planner/tasks` for each row with the mapped IDs.
5. For each task with a description, immediately `PATCH /planner/tasks/{taskId}/details` (requires the task's ETag from the create response).
6. Rate limit: process in batches of 4 concurrent requests to avoid 429 throttling.

### Weekly Personal Task Routine

Create a To Do list with recurring tasks for weekly rituals:

1. `POST /me/todo/lists` with `displayName: "Weekly Routine"`.
2. For each recurring task, `POST /me/todo/lists/{listId}/tasks` with a `recurrence` block:
   - "Monday standup prep" — weekly on Monday.
   - "Wednesday 1:1 notes" — weekly on Wednesday.
   - "Friday timesheet submission" — weekly on Friday.
3. Set `isReminderOn: true` and `reminderDateTime` for 30 minutes before each task.
4. Add checklist items (steps) for multi-step tasks.

### Cross-Tool Linking (Planner → Teams → To Do)

Link tasks across Microsoft 365 tools:

1. Create a Planner plan associated with a Teams channel tab.
2. For each assigned task, use `POST /me/todo/lists/{listId}/tasks/{taskId}/linkedResources` to create a link back to the Planner task URL.
3. Post a Teams channel message via Graph with an adaptive card summarizing the sprint board and deep links to individual tasks.
4. Use `@mentions` in the adaptive card to notify assignees.

## Planner Tiers

### Classic Planner (Graph v1.0 / beta)

Standard Planner backed by Microsoft 365 Groups or lightweight containers. All plans are accessible via `https://graph.microsoft.com/v1.0/planner/*`.

**Container types** — who owns the plan and controls access:
| Type | Use Case |
|------|----------|
| `group` | Team project board tied to M365 Group / Teams |
| `roster` | Ad-hoc collaboration — no M365 Group needed (beta) |
| `teamsChannel` | Plan visible only within a specific Teams channel |
| `user` | Personal private plan |
| `plannerTask` | Nested sub-plan decomposing a large task into a full board |
| `driveItem` | Plan attached to a SharePoint/OneDrive file (beta) |

See [`references/container-types.md`](./references/container-types.md) for full code examples.

### Planner Premium (Dataverse / Project for the web)

Premium features require a **Microsoft Project** license and store data in **Microsoft Dataverse** — not the standard Graph Planner API.

**Premium-only features**: task dependencies, Timeline/Gantt chart, sprints/iterations, goals/OKRs, custom fields, resource capacity planning.

**API base**: `https://<org>.crm.dynamics.com/api/data/v9.2/`

**Critical rule**: All write operations on premium tasks (create, update, delete, dependencies) MUST go through the **Project Scheduling Service (PSS) OperationSet** pattern — direct PATCH on `msdyn_projecttask` is not supported for schedule fields.

**OperationSet flow**:
1. `POST msdyn_CreateOperationSetV1` → get `OperationSetId`
2. Queue ops: `POST msdyn_PssCreateV1` / `msdyn_PssUpdateV1` / `msdyn_PssDeleteV1`
3. `POST msdyn_ExecuteOperationSetV1` → PSS applies all changes atomically

See [`references/planner-premium-dataverse.md`](./references/planner-premium-dataverse.md) for the full reference.

### Business Scenarios API (beta)

Creates **isolated app-owned task containers** — tasks visible in Planner but owned and controlled by your app with role-based access policies.

**Use cases**: Surface Jira/ServiceNow tickets in Planner, CRM-linked tasks, strict access control.

**Key pattern**: Use `externalId` (your app's stable key) and `externalContextId` (group related tasks) instead of Planner internal GUIDs.

See [`references/business-scenarios.md`](./references/business-scenarios.md) for the full reference.

## Best Practices

- Always fetch the current ETag before updating or deleting Planner resources.
- Use `notes` (rich HTML) for task details in all new tasks — never mix `notes` and `description` in the same PATCH body.
- Use `orderHint` string values to control display order: `" !"` for top, append a suffix to insert after.
- Batch task creation by creating multiple tasks in parallel after the plan and buckets are set up.
- Use labels (categories) consistently to enable filtering and reporting in Planner views.
- For sprint/iteration planning in Classic Planner, create one plan per sprint with buckets for Backlog, In Progress, Review, Done.
- For Premium Planner sprints and Gantt views, use the Dataverse `msdyn_projectsprint` and PSS OperationSet API.
- Use `completionRequirements: "checklistCompletion"` to enforce all checklist items are ticked before closing a task.
- Use nested plans (`container.type = "plannerTask"`) to decompose large epics into a full sub-board.
- Use roster plans when you need Planner without an M365 Group (e.g., cross-department or external collaborators).

## Progressive Disclosure — Reference Files

| Topic | File |
|---|---|
| Plan CRUD, bucket management, plan details, labels, copying, conversation thread integration | [`references/planner-plans-buckets.md`](./references/planner-plans-buckets.md) |
| Task CRUD, assignments, due dates, progress, checklist items, attachments, bulk import | [`references/task-management.md`](./references/task-management.md) |
| To Do list CRUD, recurrence, steps (checklistItems), linked resources, importance, reminders, delta sync | [`references/todo-lists-steps.md`](./references/todo-lists-steps.md) |
| All 6 container types with code examples, access rules, and lifecycle | [`references/container-types.md`](./references/container-types.md) |
| Advanced task fields: notes, completionRequirements, startDateTime, previewType, board formats | [`references/task-advanced-fields.md`](./references/task-advanced-fields.md) |
| Planner Premium: Dataverse Web API, PSS OperationSet, dependencies, sprints, goals | [`references/planner-premium-dataverse.md`](./references/planner-premium-dataverse.md) |
| Business Scenarios API: isolated app-owned task containers with access policies | [`references/business-scenarios.md`](./references/business-scenarios.md) |
