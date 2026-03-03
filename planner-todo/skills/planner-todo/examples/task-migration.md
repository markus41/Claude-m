# Bulk Task Migration from CSV

A complete guide for importing 50+ tasks into Microsoft Planner from a CSV file using
the Microsoft Graph batch API. This approach minimizes API calls and handles throttling
gracefully.

## Scenario

A team is migrating from a legacy project tracker to Microsoft Planner. They have
exported their existing tasks to a CSV file and need to bulk-import them into a
pre-existing Planner plan.

## CSV Format

The import script expects the following column headers (case-sensitive):

```csv
title,description,assignee_email,due_date,priority,bucket_name
"Implement login page","OAuth2 flow using MSAL","jane@contoso.com","2024-02-15","important","In Progress"
"Write unit tests","Auth module coverage","bob@contoso.com","2024-02-20","medium","Backlog"
"Update API docs","REST endpoints","","2024-02-28","low","Backlog"
"Fix navbar bug","Mobile viewport issue","alice@contoso.com","2024-02-10","urgent","In Progress"
```

Column definitions:

| Column | Required | Values |
|---|---|---|
| `title` | Yes | Task display name |
| `description` | No | Plain-text task description (goes to task details) |
| `assignee_email` | No | User principal name; leave blank for unassigned |
| `due_date` | No | `YYYY-MM-DD` format |
| `priority` | No | `urgent`, `important`, `medium`, `low` (default: `medium`) |
| `bucket_name` | Yes | Must match an existing bucket name in the plan exactly |

## Step 1: Parse the CSV File

Install `csv-parse` for robust CSV parsing:

```bash
npm install csv-parse
```

```javascript
import { createReadStream } from "fs";
import { parse } from "csv-parse";

async function parseCSV(filePath) {
  const records = [];
  const parser = createReadStream(filePath).pipe(
    parse({ columns: true, skip_empty_lines: true, trim: true })
  );
  for await (const record of parser) {
    records.push(record);
  }
  return records;
}

const tasks = await parseCSV("./tasks-export.csv");
console.log(`Parsed ${tasks.length} tasks from CSV`);
```

Validate each row:
- `title` must not be empty
- `priority` must be one of `urgent`, `important`, `medium`, `low` (default `medium` if blank)
- `due_date` must be a valid `YYYY-MM-DD` date if provided
- `bucket_name` must not be empty

Log validation errors and skip invalid rows. Do not fail the entire import for one bad row.

## Step 2: Resolve Bucket Names to Bucket IDs

Fetch all buckets in the target plan:

```
GET https://graph.microsoft.com/v1.0/planner/plans/{planId}/buckets
    ?$select=id,name
Authorization: Bearer <token>
```

Build a lookup map:

```javascript
const buckets = await graphGet(`/planner/plans/${planId}/buckets?$select=id,name`);
const bucketMap = {};
for (const bucket of buckets.value) {
  bucketMap[bucket.name] = bucket.id;  // e.g., { "Backlog": "abc123", "In Progress": "def456" }
}
```

For each CSV row, look up `bucket_name` in the map. If not found, skip the row and log:
```
SKIP: Row 5 — bucket "Sprint 3" not found in plan. Available: Backlog, In Progress, In Review, Done
```

## Step 3: Resolve User Emails to User IDs

Collect unique non-empty `assignee_email` values from all CSV rows, then batch-resolve
them to user object IDs. Use a `$filter` query with `or` conditions (up to 15 per request):

```
GET https://graph.microsoft.com/v1.0/users
    ?$filter=userPrincipalName eq 'jane@contoso.com' or userPrincipalName eq 'bob@contoso.com'
    &$select=id,displayName,userPrincipalName
Authorization: Bearer <token>
```

Build a user lookup map:

```javascript
const userMap = {};
for (const user of usersResponse.value) {
  userMap[user.userPrincipalName.toLowerCase()] = user.id;
}
```

For emails that return no match, log a warning and create the task unassigned:
```
WARN: Row 12 — user 'unknown@contoso.com' not found in tenant; task will be unassigned
```

## Step 4: Build Task Payloads

Map CSV priority strings to Planner numeric values:

```javascript
const priorityMap = { urgent: 0, important: 1, medium: 3, low: 5 };

function buildTaskPayload(row, bucketMap, userMap) {
  const payload = {
    planId: PLAN_ID,
    bucketId: bucketMap[row.bucket_name],
    title: row.title,
    priority: priorityMap[row.priority] ?? 3,
  };
  if (row.due_date) {
    payload.dueDateTime = `${row.due_date}T23:59:59Z`;
  }
  const userId = userMap[row.assignee_email?.toLowerCase()];
  if (userId) {
    payload.assignments = {
      [userId]: {
        "@odata.type": "#microsoft.graph.plannerAssignment",
        "orderHint": " !"
      }
    };
  }
  return payload;
}
```

## Step 5: Create Tasks via Graph Batch API

The Graph batch endpoint allows up to **20 requests per batch**, reducing API calls
from 50+ individual POSTs to just 3 batch requests for 50 tasks.

Batch endpoint:
```
POST https://graph.microsoft.com/v1.0/$batch
Content-Type: application/json
Authorization: Bearer <token>
```

Batch request body (up to 20 requests):
```json
{
  "requests": [
    {
      "id": "1",
      "method": "POST",
      "url": "/planner/tasks",
      "headers": { "Content-Type": "application/json" },
      "body": {
        "planId": "xqQg5sBW50SbCiiojQqDjGQAD1IN",
        "bucketId": "bucket-backlog-id",
        "title": "Implement login page",
        "priority": 1,
        "dueDateTime": "2024-02-15T23:59:59Z"
      }
    },
    {
      "id": "2",
      "method": "POST",
      "url": "/planner/tasks",
      "headers": { "Content-Type": "application/json" },
      "body": {
        "planId": "xqQg5sBW50SbCiiojQqDjGQAD1IN",
        "bucketId": "bucket-backlog-id",
        "title": "Write unit tests",
        "priority": 3
      }
    }
  ]
}
```

Chunk the task payloads into groups of 20:

```javascript
function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

const chunks = chunkArray(taskPayloads, 20);
const createdTasks = [];
const failedTasks = [];

for (const [chunkIndex, chunk] of chunks.entries()) {
  const batchBody = {
    requests: chunk.map((payload, i) => ({
      id: String(chunkIndex * 20 + i + 1),
      method: "POST",
      url: "/planner/tasks",
      headers: { "Content-Type": "application/json" },
      body: payload
    }))
  };

  const batchResponse = await graphPost("/$batch", batchBody);

  for (const response of batchResponse.responses) {
    if (response.status === 201) {
      createdTasks.push({ id: response.body.id, title: response.body.title });
    } else if (response.status === 429) {
      // Throttled — re-queue for retry
      failedTasks.push({ requestId: response.id, status: response.status, retryAfter: response.headers?.["Retry-After"] });
    } else {
      failedTasks.push({ requestId: response.id, status: response.status, error: response.body?.error?.message });
    }
  }

  // Wait between batch chunks to avoid throttling
  if (chunkIndex < chunks.length - 1) {
    await new Promise(resolve => setTimeout(resolve, 200));
  }
}
```

## Step 5b: Retry Throttled Requests

For any responses with `status 429` in the batch, wait the specified `Retry-After` seconds
(or 60 seconds if not provided) and then re-batch those specific requests:

```javascript
if (failedTasks.some(f => f.status === 429)) {
  const retryAfter = Math.max(...failedTasks.filter(f => f.status === 429).map(f => parseInt(f.retryAfter ?? "60")));
  console.log(`Throttled. Waiting ${retryAfter}s before retry...`);
  await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
  // Re-batch the throttled requests
}
```

## Step 6: Batch Update Task Details (Descriptions)

For tasks that have a non-empty `description` in the CSV, update the task details
resource after creation. Batch these as well — up to 20 per batch.

Note: task details PATCH requires an ETag, which means a GET per task before PATCH.
Batch the GET requests first:

```json
{
  "requests": [
    { "id": "1", "method": "GET", "url": "/planner/tasks/{taskId}/details" },
    { "id": "2", "method": "GET", "url": "/planner/tasks/{taskId2}/details" }
  ]
}
```

Then batch the PATCH requests using the ETags from the GET responses:

```json
{
  "requests": [
    {
      "id": "1",
      "method": "PATCH",
      "url": "/planner/tasks/{taskId}/details",
      "headers": {
        "Content-Type": "application/json",
        "If-Match": "W/\"JzEtVGFza...\""
      },
      "body": { "description": "OAuth2 flow using MSAL" }
    }
  ]
}
```

## Step 7: Generate Import Report

After all batches complete, print a summary:

```
═══════════════════════════════════════════════
IMPORT REPORT — tasks-export.csv
═══════════════════════════════════════════════
Total rows in CSV:     52
Validation skipped:     2  (missing title or bucket)
Successfully created:  48
Failed:                 2

Created tasks:
  ✓ US-101: Implement login page       → task ID: abc123
  ✓ US-102: Write unit tests           → task ID: def456
  ... (48 total)

Failed tasks:
  ✗ Row 7:  "Fix navbar bug"  — status 403 (user not in plan group)
  ✗ Row 19: "Deploy to prod" — status 404 (bucket not found)

Warnings:
  ! Row 3: 'unknown@contoso.com' not found; task created unassigned
═══════════════════════════════════════════════
Import completed in 4.2 seconds (3 batch requests)
```
