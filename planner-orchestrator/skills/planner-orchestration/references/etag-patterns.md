# ETag Concurrency Patterns for Planner Orchestration

## Why ETags Matter

Microsoft Planner uses optimistic concurrency control. Every PATCH or DELETE on a Planner
resource must include `If-Match: {current-etag}`. Skipping this causes a 412 Precondition
Failed error. ETags change on every write, so always fetch immediately before updating.

## Standard Update Pattern

```
1. GET /planner/tasks/{taskId}
   → Extract: response.headers['@odata.etag'] or response['@odata.etag']

2. PATCH /planner/tasks/{taskId}
   Headers: { "If-Match": "{etag}", "Content-Type": "application/json" }
   Body: { "percentComplete": 100 }

3. On 409 Conflict or 412 Precondition Failed:
   → Re-GET the resource
   → Extract fresh ETag
   → Retry PATCH once
   → If still fails, surface error to user
```

## Task + Details Update (Two Separate ETags)

Tasks and their details are separate resources with independent ETags:

```
# Update task metadata
GET /planner/tasks/{taskId}       → task_etag
PATCH /planner/tasks/{taskId}
  If-Match: {task_etag}
  Body: { "percentComplete": 100, "bucketId": "{doneBucketId}" }

# Update task description/checklist
GET /planner/tasks/{taskId}/details   → details_etag
PATCH /planner/tasks/{taskId}/details
  If-Match: {details_etag}
  Body: { "description": "...", "checklist": { ... } }
```

Never reuse the task ETag for task details — they are different resources.

## Bulk Update Pattern

When updating many tasks (e.g., after triage), fetch ETags in batches and update sequentially:

```
1. List tasks: GET /planner/plans/{planId}/tasks
   → Store { taskId → etag } map from response

2. For each task to update:
   a. Use stored ETag
   b. PATCH with If-Match
   c. On 412: re-GET that specific task, retry once
   d. On second failure: add to "failed" list, continue

3. Report: "{n} tasks updated, {m} failed (list)"
```

Avoid parallel PATCHes on the same task — always serialize updates to the same resource.

## Plan Details Update

Plan details (label names, description) also require ETags:

```
GET /planner/plans/{planId}/details   → plan_details_etag
PATCH /planner/plans/{planId}/details
  If-Match: {plan_details_etag}
  Body: { "categoryDescriptions": { "category1": "Bug" } }
```

## Retry Budget

- Max retries per resource: 2
- After 2 failures: surface to user with the error and the resource ID
- Do not retry indefinitely — concurrent edits indicate a real conflict the user should resolve
