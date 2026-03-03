# Planner Plans & Buckets — Graph API Reference

## Overview

This reference covers plan and bucket management in Microsoft Planner via Graph API. Topics
include plan CRUD (group-owned vs roster plans), bucket management, plan details, copying plans,
plan membership, and conversation thread integration.

Base URL: `https://graph.microsoft.com/v1.0`

---

## API Endpoint Table

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|---------------------|----------------|-------|
| GET | `/me/planner/plans` | `Tasks.ReadWrite` | `$select` | List plans for signed-in user |
| GET | `/groups/{groupId}/planner/plans` | `Tasks.ReadWrite`, `Group.Read.All` | — | Plans owned by a group |
| GET | `/planner/plans/{planId}` | `Tasks.ReadWrite` | `$select` | Get a specific plan |
| POST | `/planner/plans` | `Tasks.ReadWrite`, `Group.ReadWrite.All` | `owner` (required), `title` | Create plan — must have group owner |
| PATCH | `/planner/plans/{planId}` | `Tasks.ReadWrite` | `If-Match`, `title` | Update plan title |
| DELETE | `/planner/plans/{planId}` | `Tasks.ReadWrite` | `If-Match` | Delete plan |
| GET | `/planner/plans/{planId}/details` | `Tasks.ReadWrite` | — | Get plan details (categories, shared with) |
| PATCH | `/planner/plans/{planId}/details` | `Tasks.ReadWrite` | `If-Match`, `categoryDescriptions` | Update labels |
| GET | `/planner/plans/{planId}/buckets` | `Tasks.ReadWrite` | `$select`, `$orderby` | List buckets in a plan |
| GET | `/planner/plans/{planId}/tasks` | `Tasks.ReadWrite` | `$select`, `$filter`, `$top` | List all tasks in a plan |
| POST | `/planner/buckets` | `Tasks.ReadWrite` | `planId`, `name`, `orderHint` | Create a bucket |
| GET | `/planner/buckets/{bucketId}` | `Tasks.ReadWrite` | — | Get bucket details |
| PATCH | `/planner/buckets/{bucketId}` | `Tasks.ReadWrite` | `If-Match`, `name`, `orderHint` | Rename or reorder bucket |
| DELETE | `/planner/buckets/{bucketId}` | `Tasks.ReadWrite` | `If-Match` | Delete bucket (must be empty) |
| GET | `/planner/buckets/{bucketId}/tasks` | `Tasks.ReadWrite` | `$select`, `$top` | List tasks in a bucket |

---

## Code Snippets

### TypeScript — Create a Plan (Group-Owned)

```typescript
import { Client } from "@microsoft/microsoft-graph-client";

async function createPlan(
  client: Client,
  groupId: string,
  title: string
): Promise<{ id: string; title: string }> {
  const plan = await client.api("/planner/plans").post({
    owner: groupId,
    title: title,
  });

  console.log(`Created plan: ${plan.id} — "${plan.title}"`);
  return { id: plan.id, title: plan.title };
}
```

### TypeScript — Get Plan with ETag (Required for Updates)

```typescript
async function getPlanWithETag(
  client: Client,
  planId: string
): Promise<{ plan: Record<string, unknown>; etag: string }> {
  const response = await client
    .api(`/planner/plans/${planId}`)
    .responseType("raw")
    .get();

  const plan = await response.json();
  const etag = response.headers.get("ETag") ?? plan["@odata.etag"];
  return { plan, etag };
}
```

### TypeScript — Update Plan Title (Requires ETag)

```typescript
async function updatePlanTitle(
  client: Client,
  planId: string,
  newTitle: string
): Promise<void> {
  const { etag } = await getPlanWithETag(client, planId);

  await client
    .api(`/planner/plans/${planId}`)
    .header("If-Match", etag)
    .patch({ title: newTitle });

  console.log(`Plan ${planId} renamed to "${newTitle}"`);
}
```

### TypeScript — Configure Plan Labels (Category Descriptions)

```typescript
async function setPlanLabels(
  client: Client,
  planId: string,
  labels: Record<string, string>
): Promise<void> {
  // Get current ETag for plan details
  const detailsResponse = await client
    .api(`/planner/plans/${planId}/details`)
    .responseType("raw")
    .get();

  const details = await detailsResponse.json();
  const etag = detailsResponse.headers.get("ETag") ?? details["@odata.etag"];

  await client
    .api(`/planner/plans/${planId}/details`)
    .header("If-Match", etag)
    .patch({ categoryDescriptions: labels });

  console.log(`Labels updated for plan ${planId}`);
}

// Usage: Set up sprint board labels
await setPlanLabels(client, planId, {
  category1: "Bug",
  category2: "Feature",
  category3: "Tech Debt",
  category4: "Blocked",
  category5: "Priority",
});
```

### TypeScript — Create Ordered Buckets

```typescript
async function createOrderedBuckets(
  client: Client,
  planId: string,
  bucketNames: string[]
): Promise<Array<{ id: string; name: string }>> {
  const buckets: Array<{ id: string; name: string }> = [];

  // OrderHints: first bucket gets " !", subsequent get a value between preceding and " !"
  // Simple approach: use incremental hints
  const hints = [" !", " !!", " !!!", " !!!!", " !!!!!", " !!!!!!"];

  for (let i = 0; i < bucketNames.length; i++) {
    const bucket = await client.api("/planner/buckets").post({
      name: bucketNames[i],
      planId: planId,
      orderHint: hints[i] ?? ` ${"!".repeat(i + 1)}`,
    });

    buckets.push({ id: bucket.id, name: bucket.name });
    console.log(`Created bucket: "${bucket.name}" (${bucket.id})`);
  }

  return buckets;
}

// Usage: Sprint board setup
const buckets = await createOrderedBuckets(client, planId, [
  "Backlog",
  "In Progress",
  "In Review",
  "Done",
]);
```

### TypeScript — Full Sprint Board Setup

```typescript
interface SprintBoardSetup {
  planId: string;
  buckets: Record<string, string>; // name -> id
}

async function setupSprintBoard(
  client: Client,
  groupId: string,
  sprintName: string
): Promise<SprintBoardSetup> {
  // 1. Create plan
  const plan = await createPlan(client, groupId, sprintName);

  // 2. Set labels
  await setPlanLabels(client, plan.id, {
    category1: "Bug",
    category2: "Feature",
    category3: "Tech Debt",
    category4: "Blocked",
  });

  // 3. Create buckets
  const bucketDefs = await createOrderedBuckets(client, plan.id, [
    "Backlog",
    "In Progress",
    "In Review",
    "Done",
  ]);

  const buckets: Record<string, string> = {};
  for (const b of bucketDefs) {
    buckets[b.name] = b.id;
  }

  return { planId: plan.id, buckets };
}
```

### TypeScript — List All Plans for a Group

```typescript
async function listGroupPlans(
  client: Client,
  groupId: string
): Promise<Array<{ id: string; title: string; createdDateTime: string }>> {
  const result = await client
    .api(`/groups/${groupId}/planner/plans`)
    .select("id,title,createdDateTime")
    .get();

  return result.value;
}
```

### PowerShell — Plan and Bucket Management

```powershell
Connect-MgGraph -Scopes "Tasks.ReadWrite", "Group.ReadWrite.All"

# Create a plan
$groupId = "YOUR_GROUP_ID"
$planBody = @{ owner = $groupId; title = "Sprint 15" }
$plan = Invoke-MgGraphRequest -Method POST -Uri "https://graph.microsoft.com/v1.0/planner/plans" `
    -Body ($planBody | ConvertTo-Json) -ContentType "application/json"
$planId = $plan.id
Write-Host "Plan created: $planId"

# Set labels on plan details
$detailsResponse = Invoke-MgGraphRequest -Method GET `
    -Uri "https://graph.microsoft.com/v1.0/planner/plans/$planId/details" `
    -OutputType HttpResponseMessage
$etag = $detailsResponse.Headers.ETag.ToString()
$details = ($detailsResponse.Content.ReadAsStringAsync().Result | ConvertFrom-Json)

$labelsBody = @{
    categoryDescriptions = @{
        category1 = "Bug"
        category2 = "Feature"
        category3 = "Tech Debt"
    }
} | ConvertTo-Json -Depth 5

Invoke-MgGraphRequest -Method PATCH `
    -Uri "https://graph.microsoft.com/v1.0/planner/plans/$planId/details" `
    -Body $labelsBody -ContentType "application/json" `
    -Headers @{ "If-Match" = $etag }

# Create buckets
$bucketNames = @("Backlog", "In Progress", "In Review", "Done")
$hints = @(" !", " !!", " !!!", " !!!!")
for ($i = 0; $i -lt $bucketNames.Length; $i++) {
    $bucketBody = @{
        name = $bucketNames[$i]
        planId = $planId
        orderHint = $hints[$i]
    } | ConvertTo-Json
    Invoke-MgGraphRequest -Method POST -Uri "https://graph.microsoft.com/v1.0/planner/buckets" `
        -Body $bucketBody -ContentType "application/json"
    Write-Host "Created bucket: $($bucketNames[$i])"
}

# List all buckets
$buckets = Invoke-MgGraphRequest -Method GET `
    -Uri "https://graph.microsoft.com/v1.0/planner/plans/$planId/buckets"
$buckets.value | Select-Object id, name, orderHint
```

---

## Error Codes Table

| HTTP Status / Code | Meaning | Remediation |
|--------------------|---------|-------------|
| 400 InvalidRequest | Missing required field or invalid value | Verify `owner` (group ID) is present on plan creation |
| 403 Forbidden | User not a member of the owning group | Add user to the M365 group before creating plan |
| 404 NotFound | Plan or bucket ID does not exist | Verify IDs; resource may have been deleted |
| 409 Conflict | ETag mismatch on PATCH/DELETE | Re-fetch resource and extract current `@odata.etag` |
| 412 PreconditionFailed | `If-Match` header missing or stale | All PATCH/DELETE require `If-Match: {etag}` |
| 423 Locked | Resource is locked (concurrent operation) | Retry after brief delay |
| 429 TooManyRequests | Rate limited | Respect `Retry-After` header; default to 30s backoff |
| 503 ServiceUnavailable | Planner service temporarily down | Retry with exponential backoff |
| InvalidEtagValue | ETag format invalid | Use the raw `@odata.etag` value including quotes |
| EntityExistsWithSameValues | Duplicate plan creation attempt | Check for existing plans with same name in group |

---

## Throttling Limits Table

| Resource | Limit | Retry Strategy |
|----------|-------|----------------|
| Plan reads | ~600 per 10 minutes per user | Cache plan data; avoid repeated reads |
| Plan/bucket writes | ~300 per 10 minutes per user | Queue writes; batch bucket creation |
| Maximum tasks per plan | ~2,400 tasks | Archive completed tasks to keep boards manageable |
| Maximum buckets per plan | ~200 buckets | Keep to <20 buckets for usability |
| Maximum label categories | 25 categories (category1–category25) | Plan label naming upfront |
| Maximum plans per group | No hard limit but performance degrades above ~50 | Organize by area/quarter |

---

## Common Patterns and Gotchas

### 1. Plans Must Be Owned by a Microsoft 365 Group

There are no "personal" Planner plans without a group owner. Every plan requires an `owner`
property set to a Microsoft 365 Group ID. The group must exist before the plan can be created.
If you need personal task management, use Microsoft To Do instead.

### 2. Deleting a Bucket Requires It to Be Empty

`DELETE /planner/buckets/{bucketId}` fails if the bucket contains any tasks. You must either
delete all tasks in the bucket first, or move them to another bucket before deleting.

### 3. OrderHint Format Is Critical for Correct Display Order

OrderHints are strings that Planner uses for lexicographic sort. The format follows a specific
pattern: new items between two existing hints must have a hint lexicographically between the
two. Use the Planner API's response orderHints to compute new hints — do not guess. A safe
approach is to append `!` characters: `" !"` for first, `" !!"` for second, etc.

### 4. ETag Must Include Quotes

The `@odata.etag` value looks like `W/"JzEtVGFzayAgQEBAQEBAQEBA..."`. Use the complete value
including the `W/"..."` wrapper in the `If-Match` header. Stripping quotes causes 412 errors.

### 5. Plan Details Are a Separate GET

Plan-level metadata (category labels, shared with users) is NOT returned by the plan GET — it
requires a separate `GET /planner/plans/{planId}/details` call. Always fetch details separately
when you need label names.

### 6. Copying Plans Is Not Available via Graph API

There is no native "copy plan" API endpoint in Graph. To duplicate a plan, you must manually
create a new plan, recreate all buckets, and copy all tasks. Consider building a copy utility
that reads the source plan's tasks and buckets and recreates them.

### 7. Conversation Thread Integration Requires Groups API

Plans created under an M365 Group can be associated with the group's conversation thread. Set
`conversationThreadId` in the plan create body if you want task update notifications to flow to
the group's email thread. This requires `Group.ReadWrite.All` permission.

### 8. Group ID Must Be an M365 Group, Not a Security Group

Planner only works with Microsoft 365 Groups (previously Office 365 Groups). Security groups
and distribution lists cannot own Planner plans. Check the group type: `groupTypes` must
include `"Unified"` in the group's properties.
