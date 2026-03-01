---
name: Planner & To Do Task Management
description: >
  Deep expertise in Microsoft Planner and Microsoft To Do via Graph API — create plans,
  manage buckets and tasks, assign work, track progress with checklists and labels,
  and manage personal to-do lists with steps, due dates, and recurrence.
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

**Create plan body**:
```json
{
  "owner": "<group-id>",
  "title": "Sprint 12 Board"
}
```

Plans must be owned by a Microsoft 365 Group. The group ID is required.

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

### Task Details (Checklists, Description, Attachments)

Task details contain the rich content of a task:

**Update task details body**:
```json
{
  "description": "Implement the OAuth 2.0 PKCE flow for the SPA client.",
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

| Scope | Description |
|-------|-------------|
| `Tasks.ReadWrite` | Read and write Planner tasks |
| `Group.ReadWrite.All` | Required for creating plans (plans are owned by groups) |
| `Tasks.ReadWrite` | Read and write To Do tasks |

## Best Practices

- Always fetch the current ETag before updating or deleting Planner resources.
- Use `orderHint` values to control the display order of buckets and tasks. The format is a string — insert between two existing hints by concatenating the last character of the preceding hint with ` !`.
- Batch task creation by creating multiple tasks in parallel after the plan and buckets are set up.
- Use labels (categories) consistently to enable filtering and reporting in Planner views.
- For sprint/iteration planning, create one plan per sprint with buckets for workflow stages (Backlog, In Progress, Review, Done).
- Use To Do for personal task tracking and Planner for team-based project management.

## Reference Files

| Reference | Path | Content |
|-----------|------|---------|
| Planner API | `references/planner-api.md` | Complete Planner endpoint reference |
| To Do API | `references/todo-api.md` | Complete To Do endpoint reference |
| Concurrency | `references/etag-concurrency.md` | ETag handling and conflict resolution patterns |

## Example Files

| Example | Path | Content |
|---------|------|---------|
| Sprint Board Setup | `examples/sprint-board.md` | Create a full sprint board with buckets, tasks, and assignments |
| Task Migration | `examples/task-migration.md` | Bulk import tasks from CSV into Planner |
| Personal Workflow | `examples/personal-workflow.md` | To Do lists with recurrence and reminders |
