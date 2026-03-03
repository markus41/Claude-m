# Advanced Task Fields — Reference

## Fields Added in 2024-2025

Beyond the basic CRUD fields, Planner tasks support several advanced properties
for richer task management.

---

## `notes` — Rich HTML Content (Replaces `description`)

`notes` is the modern replacement for the plain-text `description` field. It supports
full HTML markup and renders in the Planner task detail pane.

**Location**: `plannerTaskDetails` (requires separate GET/PATCH of `/details`)

```
GET https://graph.microsoft.com/v1.0/planner/tasks/{taskId}/details
```

```json
{
  "notes": {
    "content": "<h2>Acceptance Criteria</h2><ul><li>Login works</li><li>Logout works</li></ul>",
    "contentType": "html"
  }
}
```

**Set via PATCH:**
```json
{
  "notes": {
    "content": "<p>Task details with <strong>rich formatting</strong></p>",
    "contentType": "html"
  }
}
```

**Supported HTML tags**: `<p>`, `<br>`, `<strong>`, `<em>`, `<u>`, `<s>`, `<ul>`, `<ol>`,
`<li>`, `<h1>`–`<h3>`, `<a href>`, `<code>`, `<pre>`, `<blockquote>`, `<table>`, `<tr>`, `<td>`, `<th>`

**Critical rule**: Never include both `notes` and `description` in the same PATCH body.
One request, one field. Use `notes` for all new tasks.

---

## `completionRequirements` — Enforce Process Before Closing

Controls what must be done before a task can be marked 100% complete.

**Location**: `plannerTask`

```
PATCH https://graph.microsoft.com/v1.0/planner/tasks/{taskId}
If-Match: <etag>
```

```json
{ "completionRequirements": "checklistCompletion" }
```

### Valid Values

| Value | Behavior |
|-------|---------|
| `none` | Task can be freely closed (default) |
| `checklistCompletion` | All `checklist` items must have `isChecked: true` |
| `formCompletion` | A linked Microsoft Form must have a submission |
| `approvalCompletion` | An approval flow (Power Automate) must complete |

### Checklist Completion Error

If `completionRequirements` is `checklistCompletion` and you try to PATCH
`percentComplete: 100` with unchecked items:

```json
{
  "error": {
    "code": "BadRequest",
    "message": "Cannot complete task: not all checklist items are checked.",
    "innerError": { "code": "ChecklistNotComplete" }
  }
}
```

Resolution: PATCH each checklist item to `"isChecked": true` first.

---

## `startDateTime` — Task Start Date

Tasks can have both a start date and a due date to define a work window.

**Location**: `plannerTask`

```json
{
  "startDateTime": "2026-03-02T00:00:00Z",
  "dueDateTime": "2026-03-15T23:59:59Z"
}
```

`startDateTime` is used by the Timeline view in Planner to render the task's
duration bar on the Gantt-like schedule.

**Rules**:
- `startDateTime` must be before `dueDateTime` if both are set
- Format: ISO-8601 with UTC timezone (`Z` or `+HH:MM`)
- Set to `null` to remove

---

## `previewType` — Task Card Preview Control

Controls what content is previewed on the task card in the board view.

**Location**: `plannerTask`

| Value | What shows on card |
|-------|--------------------|
| `automatic` | Planner chooses (description if present, else checklist) |
| `noPreview` | No preview content (clean card) |
| `checklist` | Shows checklist items |
| `description` | Shows description/notes text |
| `reference` | Shows the first reference attachment |

```json
{ "previewType": "checklist" }
```

Use `noPreview` for nested plan parent tasks to avoid confusing preview rendering.

---

## Task Board Format APIs (3 View Types)

Planner maintains separate ordering for each of the 3 board views. Each has its
own `orderHint` that controls sort order within that specific view.

### 1. Bucket Task Board Format

Controls task order within the bucket column view (most common view).

```
GET  /planner/tasks/{taskId}/bucketTaskBoardFormat
PATCH /planner/tasks/{taskId}/bucketTaskBoardFormat
If-Match: <format-etag>
```

```json
{ "orderHint": " !" }
```

### 2. AssignedTo Task Board Format

Controls task order in the "Group by Assignee" view (one column per person).

```
GET  /planner/tasks/{taskId}/assignedToTaskBoardFormat
PATCH /planner/tasks/{taskId}/assignedToTaskBoardFormat
If-Match: <format-etag>
```

```json
{
  "orderHint": " !",
  "unassignedOrderHint": " !"
}
```

`unassignedOrderHint` controls position in the "Unassigned" column.

### 3. Progress Task Board Format

Controls task order in the "Group by Progress" view (Not Started / In Progress / Completed columns).

```
GET  /planner/tasks/{taskId}/progressTaskBoardFormat
PATCH /planner/tasks/{taskId}/progressTaskBoardFormat
If-Match: <format-etag>
```

```json
{ "orderHint": " !" }
```

### orderHint Format

Planner uses string-based ordering, NOT integers. To insert between two items:
- Before all items: `" !"`
- After item with hint `" !"`: `" !a"`
- Between `" !"` and `" !z"`: `" !m"` (lexicographically between)
- To insert at the very end, use the last hint with a suffix character

Each format API has its **own ETag** separate from the task's main ETag.

---

## `taskCreationSource` — Where a Task Originated

Read-only metadata indicating which surface created the task.

```json
{
  "taskCreationSource": {
    "@odata.type": "#microsoft.graph.plannerTeamsPublicationInfo",
    "publicationId": "...",
    "teamId": "...",
    "channelId": "..."
  }
}
```

This field is populated automatically. It cannot be set manually.
Useful for auditing which integration surface created a task (Teams, Outlook, API, etc.).

---

## Enhanced Checklist Fields

Each checklist item supports ordering:

```json
{
  "checklist": {
    "<guid-1>": {
      "@odata.type": "#microsoft.graph.plannerChecklistItem",
      "title": "Step 1: Research",
      "isChecked": false,
      "orderHint": " !"
    },
    "<guid-2>": {
      "@odata.type": "#microsoft.graph.plannerChecklistItem",
      "title": "Step 2: Implement",
      "isChecked": false,
      "orderHint": " !a"
    }
  }
}
```

To add a new item without overwriting existing ones, include only the new item's GUID
in the PATCH body. Use a `crypto.randomUUID()` or equivalent for new GUIDs.

To remove an item, set it to `null`:
```json
{ "<guid-to-remove>": null }
```
