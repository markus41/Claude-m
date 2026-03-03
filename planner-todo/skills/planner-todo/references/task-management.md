# Planner Task Management — Graph API Reference

## Overview

This reference covers task CRUD operations in Microsoft Planner via Graph API. Topics include
task creation with assignment, due dates, progress tracking (0/50/100), checklist items,
attachments, references, task details, and bulk task operations.

Base URL: `https://graph.microsoft.com/v1.0`

---

## API Endpoint Table

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|---------------------|----------------|-------|
| POST | `/planner/tasks` | `Tasks.ReadWrite` | `planId`, `bucketId`, `title` | Create task |
| GET | `/planner/tasks/{taskId}` | `Tasks.ReadWrite` | `$select` | Get task metadata |
| PATCH | `/planner/tasks/{taskId}` | `Tasks.ReadWrite` | `If-Match` + fields | Update task (requires ETag) |
| DELETE | `/planner/tasks/{taskId}` | `Tasks.ReadWrite` | `If-Match` | Delete task (requires ETag) |
| GET | `/planner/tasks/{taskId}/details` | `Tasks.ReadWrite` | — | Get checklist, description, references |
| PATCH | `/planner/tasks/{taskId}/details` | `Tasks.ReadWrite` | `If-Match` | Update checklist/description/references |
| GET | `/planner/plans/{planId}/tasks` | `Tasks.ReadWrite` | `$select`, `$filter`, `$top` | List all tasks in a plan |
| GET | `/planner/buckets/{bucketId}/tasks` | `Tasks.ReadWrite` | `$select`, `$top` | List tasks in a bucket |
| GET | `/me/planner/tasks` | `Tasks.ReadWrite` | `$select`, `$filter` | Tasks assigned to signed-in user |
| GET | `/users/{userId}/planner/tasks` | `Tasks.ReadWrite.All` | — | Tasks assigned to a specific user |

### Priority Values

| Numeric Value | Display Name |
|---------------|-------------|
| 0 | Urgent |
| 1 | Important |
| 2, 3, 4 | Medium (default = 5) |
| 5, 6, 7, 8 | Low |
| 9 | Low (lowest) |

### Progress Values

| percentComplete | Status |
|----------------|--------|
| 0 | Not started |
| 50 | In progress |
| 100 | Completed |

---

## Code Snippets

### TypeScript — Create a Task with Full Details

```typescript
import { Client } from "@microsoft/microsoft-graph-client";

async function createTask(
  client: Client,
  planId: string,
  bucketId: string,
  title: string,
  assigneeIds: string[],
  dueDate?: Date,
  priority: number = 5
): Promise<string> {
  const assignments: Record<string, unknown> = {};
  for (const userId of assigneeIds) {
    assignments[userId] = {
      "@odata.type": "#microsoft.graph.plannerAssignment",
      orderHint: " !",
    };
  }

  const body: Record<string, unknown> = {
    planId,
    bucketId,
    title,
    assignments,
    priority,
    percentComplete: 0,
  };

  if (dueDate) {
    body.dueDateTime = dueDate.toISOString();
  }

  const task = await client.api("/planner/tasks").post(body);
  console.log(`Created task: ${task.id} — "${task.title}"`);
  return task.id;
}
```

### TypeScript — Get Task with ETag and Update Progress

```typescript
async function updateTaskProgress(
  client: Client,
  taskId: string,
  percentComplete: 0 | 50 | 100
): Promise<void> {
  // Must GET first to obtain ETag
  const response = await client
    .api(`/planner/tasks/${taskId}`)
    .responseType("raw")
    .get();

  const task = await response.json();
  const etag = task["@odata.etag"];

  await client
    .api(`/planner/tasks/${taskId}`)
    .header("If-Match", etag)
    .patch({ percentComplete });

  const status = percentComplete === 0 ? "Not started" : percentComplete === 50 ? "In progress" : "Completed";
  console.log(`Task ${taskId} marked as: ${status}`);
}
```

### TypeScript — Move Task to a Different Bucket

```typescript
async function moveTaskToBucket(
  client: Client,
  taskId: string,
  targetBucketId: string
): Promise<void> {
  const response = await client
    .api(`/planner/tasks/${taskId}`)
    .responseType("raw")
    .get();

  const task = await response.json();
  const etag = task["@odata.etag"];

  await client
    .api(`/planner/tasks/${taskId}`)
    .header("If-Match", etag)
    .patch({ bucketId: targetBucketId });

  console.log(`Task ${taskId} moved to bucket ${targetBucketId}`);
}
```

### TypeScript — Add Checklist Items to a Task

```typescript
import { v4 as uuidv4 } from "uuid";

async function addChecklistItems(
  client: Client,
  taskId: string,
  items: string[]
): Promise<void> {
  // Get current task details and ETag
  const response = await client
    .api(`/planner/tasks/${taskId}/details`)
    .responseType("raw")
    .get();

  const details = await response.json();
  const etag = details["@odata.etag"];

  // Build checklist entries with unique GUIDs as keys
  const checklist: Record<string, unknown> = {};
  for (const item of items) {
    const guid = uuidv4();
    checklist[guid] = {
      "@odata.type": "#microsoft.graph.plannerChecklistItem",
      title: item,
      isChecked: false,
    };
  }

  // Merge with existing checklist
  const updatedChecklist = { ...details.checklist, ...checklist };

  await client
    .api(`/planner/tasks/${taskId}/details`)
    .header("If-Match", etag)
    .patch({ checklist: updatedChecklist });

  console.log(`Added ${items.length} checklist items to task ${taskId}`);
}
```

### TypeScript — Add a Reference Link to a Task

```typescript
function encodeReferenceUrl(url: string): string {
  // Planner references use the URL as key, with . and : percent-encoded
  return url
    .replace(/\./g, "%2E")
    .replace(/:/g, "%3A")
    .replace(/\//g, "%2F")
    .replace(/#/g, "%23");
}

async function addTaskReference(
  client: Client,
  taskId: string,
  url: string,
  alias: string,
  type: "Word" | "Excel" | "PowerPoint" | "OneNote" | "Other" = "Other"
): Promise<void> {
  const response = await client
    .api(`/planner/tasks/${taskId}/details`)
    .responseType("raw")
    .get();

  const details = await response.json();
  const etag = details["@odata.etag"];

  const encodedUrl = encodeReferenceUrl(url);
  const references = {
    ...details.references,
    [encodedUrl]: {
      "@odata.type": "#microsoft.graph.plannerExternalReference",
      alias,
      type,
      lastModifiedBy: {
        "@odata.type": "#microsoft.graph.identitySet",
      },
    },
  };

  await client
    .api(`/planner/tasks/${taskId}/details`)
    .header("If-Match", etag)
    .patch({ references });

  console.log(`Reference added to task ${taskId}: ${alias}`);
}
```

### TypeScript — Bulk Import Tasks from Structured Data

```typescript
interface TaskImport {
  title: string;
  assigneeEmail?: string;
  bucket: string;
  priority?: number;
  dueDate?: string;
  description?: string;
  checklistItems?: string[];
}

async function resolveUserIdByEmail(
  client: Client,
  email: string
): Promise<string | undefined> {
  try {
    const user = await client
      .api(`/users/${email}`)
      .select("id")
      .get();
    return user.id;
  } catch {
    return undefined;
  }
}

async function bulkImportTasks(
  client: Client,
  planId: string,
  buckets: Record<string, string>, // name -> id
  tasks: TaskImport[],
  batchSize = 4
): Promise<string[]> {
  const createdIds: string[] = [];

  // Process in small batches to avoid throttling
  for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize);

    const createPromises = batch.map(async (task) => {
      const assigneeIds: string[] = [];
      if (task.assigneeEmail) {
        const userId = await resolveUserIdByEmail(client, task.assigneeEmail);
        if (userId) assigneeIds.push(userId);
      }

      const bucketId = buckets[task.bucket];
      if (!bucketId) {
        console.warn(`Bucket "${task.bucket}" not found, skipping task "${task.title}"`);
        return null;
      }

      const taskId = await createTask(
        client,
        planId,
        bucketId,
        task.title,
        assigneeIds,
        task.dueDate ? new Date(task.dueDate) : undefined,
        task.priority ?? 5
      );

      // Add description if provided
      if (task.description || task.checklistItems?.length) {
        const detailsResp = await client
          .api(`/planner/tasks/${taskId}/details`)
          .responseType("raw")
          .get();
        const details = await detailsResp.json();
        const etag = details["@odata.etag"];

        const patchBody: Record<string, unknown> = {};
        if (task.description) patchBody.description = task.description;
        if (task.checklistItems?.length) {
          const checklist: Record<string, unknown> = {};
          for (const item of task.checklistItems) {
            checklist[uuidv4()] = {
              "@odata.type": "#microsoft.graph.plannerChecklistItem",
              title: item,
              isChecked: false,
            };
          }
          patchBody.checklist = checklist;
        }

        await client
          .api(`/planner/tasks/${taskId}/details`)
          .header("If-Match", etag)
          .patch(patchBody);
      }

      return taskId;
    });

    const results = await Promise.all(createPromises);
    createdIds.push(...results.filter((id): id is string => id !== null));

    // Brief pause between batches to stay within throttle limits
    if (i + batchSize < tasks.length) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  console.log(`Imported ${createdIds.length} tasks`);
  return createdIds;
}
```

### PowerShell — Task Management

```powershell
Connect-MgGraph -Scopes "Tasks.ReadWrite"

$planId = "YOUR_PLAN_ID"
$bucketId = "YOUR_BUCKET_ID"
$assigneeId = "USER_OBJECT_ID"

# Create a task
$taskBody = @{
    planId = $planId
    bucketId = $bucketId
    title = "Implement login page"
    priority = 1
    percentComplete = 0
    dueDateTime = (Get-Date).AddDays(7).ToString("o")
    assignments = @{
        $assigneeId = @{
            "@odata.type" = "#microsoft.graph.plannerAssignment"
            orderHint = " !"
        }
    }
} | ConvertTo-Json -Depth 10

$task = Invoke-MgGraphRequest -Method POST `
    -Uri "https://graph.microsoft.com/v1.0/planner/tasks" `
    -Body $taskBody -ContentType "application/json"

Write-Host "Created task: $($task.id)"

# Get task details with ETag
$taskResp = Invoke-MgGraphRequest -Method GET `
    -Uri "https://graph.microsoft.com/v1.0/planner/tasks/$($task.id)" `
    -OutputType HttpResponseMessage
$taskEtag = $taskResp.Headers.ETag.ToString()
$taskData = ($taskResp.Content.ReadAsStringAsync().Result | ConvertFrom-Json)

# Update progress
$updateBody = @{ percentComplete = 50 } | ConvertTo-Json
Invoke-MgGraphRequest -Method PATCH `
    -Uri "https://graph.microsoft.com/v1.0/planner/tasks/$($task.id)" `
    -Body $updateBody -ContentType "application/json" `
    -Headers @{ "If-Match" = $taskEtag }

Write-Host "Task marked as In Progress"

# Get all tasks assigned to current user
$myTasks = Invoke-MgGraphRequest -Method GET `
    -Uri "https://graph.microsoft.com/v1.0/me/planner/tasks?`$select=title,percentComplete,dueDateTime,priority"
$myTasks.value | Sort-Object priority | Format-Table title, percentComplete, dueDateTime
```

---

## Error Codes Table

| HTTP Status / Code | Meaning | Remediation |
|--------------------|---------|-------------|
| 400 InvalidRequest | Bad task body — missing planId/bucketId, malformed assignment | Check `planId`, `bucketId` exist; validate assignment structure |
| 400 InvalidAssignment | Assignment object structure is wrong | Verify `@odata.type` is `#microsoft.graph.plannerAssignment` |
| 403 Forbidden | User not a member of the plan's owning group | Add user to the M365 group |
| 404 NotFound | Task, plan, or bucket doesn't exist | Verify IDs; resource may have been deleted |
| 409 Conflict | Concurrent modification detected | Re-GET resource for fresh ETag and retry |
| 412 PreconditionFailed | Missing or stale `If-Match` ETag | Always GET first; use returned ETag in PATCH/DELETE |
| 429 TooManyRequests | Rate limited | Back off per `Retry-After`; reduce concurrency |
| 503 ServiceUnavailable | Planner unavailable | Retry with exponential backoff |
| EntityNotFound | Task detail entity not found | Task may not have details yet; PATCH creates them |

---

## Throttling Limits Table

| Resource | Limit | Retry Strategy |
|----------|-------|----------------|
| Task reads per user | ~600 per 10 minutes | Cache task data; use `$select` to reduce payload |
| Task writes per user | ~300 per 10 minutes | Batch writes; max 4 concurrent creates |
| Checklist items per task | 20 items maximum | Split large checklists across sub-tasks |
| References per task | 10 references maximum | Prioritize most important references |
| Assignments per task | Multiple users supported; no documented hard limit | Test with your use case |
| Maximum tasks per plan | ~2,400 tasks | Archive completed tasks regularly |

---

## Common Patterns and Gotchas

### 1. Task Details Are a Separate Entity

Creating a task does NOT create the task details entity automatically. The details (description,
checklist, references) only exist after the first `PATCH /planner/tasks/{taskId}/details`. If
you `GET /planner/tasks/{taskId}/details` on a brand-new task, the checklist and references will
be empty objects, not null.

### 2. Checklist Keys Must Be UUIDs

Checklist items are keyed by GUID strings — not auto-incremented IDs. You must generate a
unique GUID for each checklist item you create. Using non-GUID keys causes a 400 error.

### 3. Cannot Use `$expand=details` When Listing Tasks

`GET /planner/plans/{planId}/tasks?$expand=details` is NOT supported. You must retrieve task
details individually with `GET /planner/tasks/{taskId}/details`. For bulk task imports, structure
your code to create the task first, then immediately PATCH its details (you already have the
ETag from the create response).

### 4. Assignment Object Must Have the Exact `@odata.type`

The `assignments` property uses user IDs as keys with a specific typed value:
```json
{
  "assignments": {
    "{userId}": {
      "@odata.type": "#microsoft.graph.plannerAssignment",
      "orderHint": " !"
    }
  }
}
```
Missing or incorrect `@odata.type` returns 400 InvalidAssignment.

### 5. Progress Is Only Three Values: 0, 50, or 100

Despite `percentComplete` being a number field, Planner only honors 0 (Not started), 50
(In progress), and 100 (Completed). Sending 25 or 75 will be accepted but displays as one of
the three supported values in the Planner UI.

### 6. Deleting a Task Requires an ETag

Like all Planner mutations, `DELETE /planner/tasks/{taskId}` requires the `If-Match` header
with the current ETag. You cannot delete without first GETting the task.

### 7. ETag from Task Create Response Is Valid

When you create a task, the response includes the task object with `@odata.etag`. You can use
this etag immediately for the subsequent PATCH to task details — no need for an additional GET.

### 8. `appliedCategories` Uses Plan-Level Category Keys

To set labels on tasks, use the category keys defined on the plan (e.g., `category1: true`).
The keys must exactly match what was set in the plan's `categoryDescriptions`. Categories not
defined in plan details silently have no effect in the UI.
