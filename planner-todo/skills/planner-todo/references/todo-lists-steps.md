# Microsoft To Do Lists & Steps — Graph API Reference

## Overview

This reference covers Microsoft To Do via Graph API. Topics include task list CRUD, task
creation with recurrence patterns, steps (checklistItems), linked resources, importance flags,
reminders, and delta sync for tracking changes.

Base URL: `https://graph.microsoft.com/v1.0`

---

## API Endpoint Table

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|---------------------|----------------|-------|
| GET | `/me/todo/lists` | `Tasks.ReadWrite` | `$select`, `$top` | List all task lists |
| POST | `/me/todo/lists` | `Tasks.ReadWrite` | `displayName` | Create a task list |
| GET | `/me/todo/lists/{listId}` | `Tasks.ReadWrite` | — | Get a specific list |
| PATCH | `/me/todo/lists/{listId}` | `Tasks.ReadWrite` | `displayName` | Rename a list |
| DELETE | `/me/todo/lists/{listId}` | `Tasks.ReadWrite` | — | Delete a list and all its tasks |
| GET | `/me/todo/lists/{listId}/tasks` | `Tasks.ReadWrite` | `$select`, `$filter`, `$orderby`, `$top` | List tasks |
| POST | `/me/todo/lists/{listId}/tasks` | `Tasks.ReadWrite` | Full task body | Create a task |
| GET | `/me/todo/lists/{listId}/tasks/{taskId}` | `Tasks.ReadWrite` | — | Get a specific task |
| PATCH | `/me/todo/lists/{listId}/tasks/{taskId}` | `Tasks.ReadWrite` | Any task fields | Update a task |
| DELETE | `/me/todo/lists/{listId}/tasks/{taskId}` | `Tasks.ReadWrite` | — | Delete a task |
| GET | `/me/todo/lists/{listId}/tasks/{taskId}/checklistItems` | `Tasks.ReadWrite` | — | List steps |
| POST | `/me/todo/lists/{listId}/tasks/{taskId}/checklistItems` | `Tasks.ReadWrite` | `displayName` | Add a step |
| PATCH | `/me/todo/lists/{listId}/tasks/{taskId}/checklistItems/{itemId}` | `Tasks.ReadWrite` | `isChecked`, `displayName` | Update step |
| DELETE | `/me/todo/lists/{listId}/tasks/{taskId}/checklistItems/{itemId}` | `Tasks.ReadWrite` | — | Delete step |
| GET | `/me/todo/lists/{listId}/tasks/{taskId}/linkedResources` | `Tasks.ReadWrite` | — | List linked resources |
| POST | `/me/todo/lists/{listId}/tasks/{taskId}/linkedResources` | `Tasks.ReadWrite` | `webUrl`, `applicationName`, `displayName` | Add linked resource |
| GET | `/me/todo/lists/{listId}/tasks/delta` | `Tasks.ReadWrite` | delta token | Incremental task sync |

---

## Code Snippets

### TypeScript — Create a Task List and Tasks

```typescript
import { Client } from "@microsoft/microsoft-graph-client";

async function createTaskList(client: Client, name: string): Promise<string> {
  const list = await client.api("/me/todo/lists").post({
    displayName: name,
  });
  console.log(`Created list: ${list.id} — "${list.displayName}"`);
  return list.id;
}

async function createTask(
  client: Client,
  listId: string,
  title: string,
  dueDate?: Date,
  importance: "low" | "normal" | "high" = "normal",
  body?: string
): Promise<string> {
  const taskBody: Record<string, unknown> = {
    title,
    importance,
    status: "notStarted",
  };

  if (body) {
    taskBody.body = { content: body, contentType: "text" };
  }

  if (dueDate) {
    taskBody.dueDateTime = {
      dateTime: dueDate.toISOString().replace("Z", ""),
      timeZone: "UTC",
    };
  }

  const task = await client.api(`/me/todo/lists/${listId}/tasks`).post(taskBody);
  return task.id;
}
```

### TypeScript — Create Recurring Task (Weekly)

```typescript
async function createWeeklyRecurringTask(
  client: Client,
  listId: string,
  title: string,
  dayOfWeek: "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday",
  startDate: string = new Date().toISOString().split("T")[0]
): Promise<string> {
  const task = await client.api(`/me/todo/lists/${listId}/tasks`).post({
    title,
    status: "notStarted",
    recurrence: {
      pattern: {
        type: "weekly",
        interval: 1,
        daysOfWeek: [dayOfWeek],
        firstDayOfWeek: "monday",
      },
      range: {
        type: "noEnd",
        startDate: startDate,
      },
    },
  });

  console.log(`Created weekly recurring task: ${task.id}`);
  return task.id;
}
```

### TypeScript — Create Task with Reminder

```typescript
async function createTaskWithReminder(
  client: Client,
  listId: string,
  title: string,
  dueDateTime: Date,
  reminderMinutesBefore: number = 30
): Promise<string> {
  const reminderTime = new Date(dueDateTime.getTime() - reminderMinutesBefore * 60 * 1000);

  const task = await client.api(`/me/todo/lists/${listId}/tasks`).post({
    title,
    status: "notStarted",
    isReminderOn: true,
    dueDateTime: {
      dateTime: dueDateTime.toISOString().replace("Z", ""),
      timeZone: "UTC",
    },
    reminderDateTime: {
      dateTime: reminderTime.toISOString().replace("Z", ""),
      timeZone: "UTC",
    },
  });

  return task.id;
}
```

### TypeScript — Add Steps to a Task

```typescript
async function addStepsToTask(
  client: Client,
  listId: string,
  taskId: string,
  steps: string[]
): Promise<void> {
  for (const step of steps) {
    await client
      .api(`/me/todo/lists/${listId}/tasks/${taskId}/checklistItems`)
      .post({
        displayName: step,
        isChecked: false,
      });
  }
  console.log(`Added ${steps.length} steps to task ${taskId}`);
}

async function completeStep(
  client: Client,
  listId: string,
  taskId: string,
  stepId: string
): Promise<void> {
  await client
    .api(`/me/todo/lists/${listId}/tasks/${taskId}/checklistItems/${stepId}`)
    .patch({ isChecked: true });
}
```

### TypeScript — Add Linked Resource (e.g., Teams Message)

```typescript
async function linkTeamsMessage(
  client: Client,
  listId: string,
  taskId: string,
  teamsUrl: string,
  displayName: string
): Promise<void> {
  await client
    .api(`/me/todo/lists/${listId}/tasks/${taskId}/linkedResources`)
    .post({
      webUrl: teamsUrl,
      applicationName: "Microsoft Teams",
      displayName: displayName,
    });

  console.log(`Linked Teams message to task ${taskId}`);
}
```

### TypeScript — Set Up Weekly Routine (Full Pattern)

```typescript
interface RoutineTask {
  title: string;
  dayOfWeek: "monday" | "tuesday" | "wednesday" | "thursday" | "friday";
  steps?: string[];
}

async function setupWeeklyRoutine(
  client: Client,
  routineName: string,
  tasks: RoutineTask[]
): Promise<void> {
  const listId = await createTaskList(client, routineName);

  for (const task of tasks) {
    const taskId = await createWeeklyRecurringTask(
      client,
      listId,
      task.title,
      task.dayOfWeek
    );

    if (task.steps?.length) {
      await addStepsToTask(client, listId, taskId, task.steps);
    }
  }

  console.log(`Weekly routine "${routineName}" created with ${tasks.length} tasks`);
}

// Example usage
await setupWeeklyRoutine(client, "Weekly Rituals", [
  {
    title: "Monday standup prep",
    dayOfWeek: "monday",
    steps: ["Review sprint board", "Check for blockers", "Update ticket statuses"],
  },
  {
    title: "Wednesday 1:1 notes",
    dayOfWeek: "wednesday",
    steps: ["Prepare agenda", "Review last week's action items"],
  },
  {
    title: "Friday timesheet submission",
    dayOfWeek: "friday",
    steps: ["Fill in hours", "Submit for approval"],
  },
]);
```

### TypeScript — Delta Sync for To Do Tasks

```typescript
interface TodoDeltaState {
  listDeltaLinks: Record<string, string>; // listId -> deltaLink
}

async function syncTodoTasks(
  client: Client,
  listId: string,
  savedDeltaLink?: string
): Promise<{ changes: unknown[]; deltaLink: string }> {
  let url =
    savedDeltaLink ??
    `/me/todo/lists/${listId}/tasks/delta?$select=title,status,importance,dueDateTime,completedDateTime`;

  const changes: unknown[] = [];

  while (url) {
    const response = await client.api(url).get();
    changes.push(...response.value);

    if (response["@odata.nextLink"]) {
      url = response["@odata.nextLink"];
    } else {
      return {
        changes,
        deltaLink: response["@odata.deltaLink"] as string,
      };
    }
  }

  throw new Error("Delta sync ended without deltaLink");
}
```

### PowerShell — To Do Task Management

```powershell
Connect-MgGraph -Scopes "Tasks.ReadWrite"

# Create a task list
$listBody = @{ displayName = "Work Tasks" } | ConvertTo-Json
$list = Invoke-MgGraphRequest -Method POST `
    -Uri "https://graph.microsoft.com/v1.0/me/todo/lists" `
    -Body $listBody -ContentType "application/json"
$listId = $list.id

# Create a task with recurrence
$taskBody = @{
    title = "Weekly status report"
    status = "notStarted"
    importance = "high"
    recurrence = @{
        pattern = @{
            type = "weekly"
            interval = 1
            daysOfWeek = @("friday")
            firstDayOfWeek = "monday"
        }
        range = @{
            type = "noEnd"
            startDate = (Get-Date).ToString("yyyy-MM-dd")
        }
    }
} | ConvertTo-Json -Depth 10

$task = Invoke-MgGraphRequest -Method POST `
    -Uri "https://graph.microsoft.com/v1.0/me/todo/lists/$listId/tasks" `
    -Body $taskBody -ContentType "application/json"

# Add steps
$steps = @("Collect metrics", "Write summary", "Review with manager", "Send to team")
foreach ($step in $steps) {
    $stepBody = @{ displayName = $step; isChecked = $false } | ConvertTo-Json
    Invoke-MgGraphRequest -Method POST `
        -Uri "https://graph.microsoft.com/v1.0/me/todo/lists/$listId/tasks/$($task.id)/checklistItems" `
        -Body $stepBody -ContentType "application/json"
}

# List all incomplete high-importance tasks
$tasks = Invoke-MgGraphRequest -Method GET `
    -Uri "https://graph.microsoft.com/v1.0/me/todo/lists/$listId/tasks?`$filter=importance eq 'high' and status ne 'completed'&`$orderby=dueDateTime/dateTime asc"
$tasks.value | Select-Object title, importance, @{N="Due";E={$_.dueDateTime.dateTime}}
```

---

## Error Codes Table

| HTTP Status / Code | Meaning | Remediation |
|--------------------|---------|-------------|
| 400 BadRequest | Malformed task body or invalid date format | Verify dateTime format excludes "Z" suffix in `dateTime` property |
| 400 InvalidRecurrence | Invalid recurrence pattern | Check pattern type and range type are supported |
| 401 Unauthorized | Token expired | Re-acquire token; To Do only supports delegated auth |
| 403 Forbidden | No application permissions for To Do | To Do requires delegated permissions only |
| 404 NotFound | List, task, or step does not exist | Verify IDs; default "Tasks" list uses well-known ID |
| 410 Gone | Delta token expired | Restart sync from `?$deltaToken=latest` or full enumeration |
| 429 TooManyRequests | Rate limited | Respect `Retry-After`; To Do limits are lower than Planner |
| 503 ServiceUnavailable | To Do service down | Retry with backoff |
| ItemNotFound | Well-known list ID not found | Use `GET /me/todo/lists` to find the correct list ID |

---

## Throttling Limits Table

| Resource | Limit | Retry Strategy |
|----------|-------|----------------|
| Task reads | ~600 per 10 minutes per user | Use delta sync rather than full list refresh |
| Task writes | ~300 per 10 minutes per user | Queue task creation; avoid burst operations |
| Steps per task | No documented limit; practical max ~100 | Split into multiple tasks if steps exceed ~20 |
| Linked resources per task | No documented limit | Keep to relevant links only |
| Lists per user | No documented limit | Organize into ~10-20 focused lists |
| Recurrence instances | Planner recurrence creates new task on completion | Store recurrence at creation; do not re-set on each completion |

---

## Common Patterns and Gotchas

### 1. To Do Has No Application-Only Permissions

Unlike Planner, Microsoft To Do does not support application permissions. There are no app-only
scopes for To Do endpoints. All calls must be made in a delegated context (on behalf of a
signed-in user). Daemon/service automation of personal To Do lists is not supported.

### 2. DateTime Format: No "Z" in the `dateTime` Property

To Do's `dueDateTime` and `reminderDateTime` use a nested object with separate `dateTime` and
`timeZone` fields. The `dateTime` string must NOT include a trailing "Z" — it should be
`"2026-03-10T09:00:00"` (not `"2026-03-10T09:00:00Z"`). The timezone is specified in the
`timeZone` field separately.

### 3. Completing a Recurring Task Creates a New Instance

When you mark a recurring task as `completed`, To Do automatically creates the next recurrence
instance. The "completed" status is set on the current instance; the next instance appears with
`status: "notStarted"` and an updated `dueDateTime`. Your sync logic must handle this pattern.

### 4. The "Tasks" Default List Uses a Well-Known ID

Every user has a default "Tasks" list. You can access it without knowing its ID via the
well-known ID endpoint: `GET /me/todo/lists/tasks/tasks`. However, the actual ID varies per
user — always use the actual list ID for reliable operations.

### 5. `importance` vs `priority` in Planner

To Do uses `importance` (`"low"`, `"normal"`, `"high"`), while Planner uses `priority` (0-9
numeric). These are separate properties on separate APIs — they do not sync between To Do
and Planner even when tasks are linked.

### 6. Delta Sync Is More Efficient Than Full List Refresh

For monitoring task completion or syncing To Do tasks to external systems, use
`GET /me/todo/lists/{listId}/tasks/delta` with a persisted delta token. This returns only
changed tasks since the last sync, avoiding the full list download on each poll.

### 7. Steps Are Ordered but Have No Built-In Sequence Numbers

Checklist steps (checklistItems) are returned in creation order by default. There is no
explicit `orderHint` or position property. To reorder steps, you must delete and recreate them
in the desired order.

### 8. Linked Resources Connect To Do with Planner and Teams

Use `POST /me/todo/lists/{listId}/tasks/{taskId}/linkedResources` to attach a URL pointing to a
Planner task, Teams message, email, or any web resource. This creates bidirectional context:
the To Do task knows it relates to a specific Planner task or Teams conversation.
