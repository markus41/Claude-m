# Sprint Board Setup

End-to-end walkthrough for creating a two-week sprint board in Microsoft Planner for a
development team. This guide shows every Graph API call with example payloads and
expected responses.

## Scenario

A dev team is starting Sprint 7. They have an existing Microsoft 365 Group
(`contoso-dev-team`) and need a structured Planner board with buckets, user stories, and
task assignments before the sprint begins.

## Prerequisites

- An existing Microsoft 365 Group with all team members already added as members
- Tenant ID, Client ID, and a valid delegated access token
- Team member object IDs (collect these once with `GET /users?$select=id,displayName,userPrincipalName`)
- Node.js 18+ with `@azure/identity` installed

Collect team member IDs:
```
GET https://graph.microsoft.com/v1.0/groups/{groupId}/members?$select=id,displayName,userPrincipalName
Authorization: Bearer <token>
```

Save these IDs — you will use them in task assignment steps.

```
Group ID:       0d539595-2b7b-43eb-a72a-b73c790a52b2
Jane Smith:     8a7d5f3b-1234-5678-abcd-ef1234567890
Bob Johnson:    b2c3d4e5-2345-6789-bcde-f23456789012
Alice Lee:      c3d4e5f6-3456-789a-cdef-g34567890123
```

---

## Step 1: Create the Sprint Plan

Use `planner-plan-create` with an empty `--buckets` flag to create the plan first
(buckets will be created individually to control order precisely).

```
POST https://graph.microsoft.com/v1.0/planner/plans
Authorization: Bearer <token>
Content-Type: application/json

{
  "owner": "0d539595-2b7b-43eb-a72a-b73c790a52b2",
  "title": "Sprint 7 — Jan 15–29"
}
```

Expected response (`HTTP 201 Created`):
```json
{
  "id": "xqQg5sBW50SbCiiojQqDjGQAD1IN",
  "title": "Sprint 7 — Jan 15–29",
  "owner": "0d539595-2b7b-43eb-a72a-b73c790a52b2",
  "createdDateTime": "2024-01-10T09:00:00Z"
}
```

Save `planId = "xqQg5sBW50SbCiiojQqDjGQAD1IN"`.

---

## Step 2: Create Four Buckets in Order

Create buckets left-to-right using `planner-bucket-create`. Use `orderHint: " !"` for
each new bucket to append it to the right of the existing buckets.

### Bucket 1: Backlog

```
POST https://graph.microsoft.com/v1.0/planner/buckets
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Backlog",
  "planId": "xqQg5sBW50SbCiiojQqDjGQAD1IN",
  "orderHint": " !"
}
```

Response (`HTTP 201`):
```json
{ "id": "bucket-backlog-id", "name": "Backlog", "planId": "xqQg5sBW50SbCiiojQqDjGQAD1IN" }
```

### Bucket 2: In Progress

```json
{ "name": "In Progress", "planId": "xqQg5sBW50SbCiiojQqDjGQAD1IN", "orderHint": " !" }
```

Response: `{ "id": "bucket-inprogress-id", "name": "In Progress" }`

### Bucket 3: In Review

```json
{ "name": "In Review", "planId": "xqQg5sBW50SbCiiojQqDjGQAD1IN", "orderHint": " !" }
```

Response: `{ "id": "bucket-inreview-id", "name": "In Review" }`

### Bucket 4: Done

```json
{ "name": "Done", "planId": "xqQg5sBW50SbCiiojQqDjGQAD1IN", "orderHint": " !" }
```

Response: `{ "id": "bucket-done-id", "name": "Done" }`

---

## Step 3: Create Five User Story Tasks

Use `planner-task-create` for each user story. Place all stories in Backlog initially.

### Story 1: Login Page (Urgent, due Jan 20)

```
POST https://graph.microsoft.com/v1.0/planner/tasks
Authorization: Bearer <token>
Content-Type: application/json

{
  "planId": "xqQg5sBW50SbCiiojQqDjGQAD1IN",
  "bucketId": "bucket-backlog-id",
  "title": "US-101: Implement OAuth2 login page",
  "priority": 0,
  "dueDateTime": "2024-01-20T23:59:59Z"
}
```

Response: `{ "id": "task-101-id", ... }`

### Story 2: User Profile API (Important, due Jan 22)

```json
{
  "planId": "xqQg5sBW50SbCiiojQqDjGQAD1IN",
  "bucketId": "bucket-backlog-id",
  "title": "US-102: Build user profile REST API",
  "priority": 1,
  "dueDateTime": "2024-01-22T23:59:59Z"
}
```

Response: `{ "id": "task-102-id", ... }`

### Story 3: Dashboard UI (Medium, due Jan 25)

```json
{
  "planId": "xqQg5sBW50SbCiiojQqDjGQAD1IN",
  "bucketId": "bucket-backlog-id",
  "title": "US-103: Design and implement dashboard UI",
  "priority": 3,
  "dueDateTime": "2024-01-25T23:59:59Z"
}
```

### Story 4: Unit Test Suite (Medium, due Jan 26)

```json
{
  "planId": "xqQg5sBW50SbCiiojQqDjGQAD1IN",
  "bucketId": "bucket-backlog-id",
  "title": "US-104: Write unit tests — auth and profile modules",
  "priority": 3,
  "dueDateTime": "2024-01-26T23:59:59Z"
}
```

### Story 5: Documentation (Low, due Jan 29)

```json
{
  "planId": "xqQg5sBW50SbCiiojQqDjGQAD1IN",
  "bucketId": "bucket-backlog-id",
  "title": "US-105: Update API documentation",
  "priority": 5,
  "dueDateTime": "2024-01-29T23:59:59Z"
}
```

---

## Step 4: Assign Tasks to Team Members

Use `planner-task-assign` to assign each task. Remember: GET the task's ETag first,
then PATCH with the `If-Match` header.

### Assign US-101 (Login Page) to Jane Smith

```
PATCH https://graph.microsoft.com/v1.0/planner/tasks/task-101-id
Authorization: Bearer <token>
If-Match: W/"JzEtVGFzayAgQEBAQEBAQEBAQEBAQEBAWCc="
Content-Type: application/json

{
  "assignments": {
    "8a7d5f3b-1234-5678-abcd-ef1234567890": {
      "@odata.type": "#microsoft.graph.plannerAssignment",
      "orderHint": " !"
    }
  }
}
```

### Assign US-102 (Profile API) to Bob Johnson

```json
{
  "assignments": {
    "b2c3d4e5-2345-6789-bcde-f23456789012": {
      "@odata.type": "#microsoft.graph.plannerAssignment",
      "orderHint": " !"
    }
  }
}
```

### Assign US-103 (Dashboard) to Alice Lee and Bob Johnson (pair)

```json
{
  "assignments": {
    "c3d4e5f6-3456-789a-cdef-g34567890123": {
      "@odata.type": "#microsoft.graph.plannerAssignment",
      "orderHint": " !"
    },
    "b2c3d4e5-2345-6789-bcde-f23456789012": {
      "@odata.type": "#microsoft.graph.plannerAssignment",
      "orderHint": " !"
    }
  }
}
```

### Assign US-104 (Tests) to Jane Smith and Alice Lee

```json
{
  "assignments": {
    "8a7d5f3b-1234-5678-abcd-ef1234567890": {
      "@odata.type": "#microsoft.graph.plannerAssignment",
      "orderHint": " !"
    },
    "c3d4e5f6-3456-789a-cdef-g34567890123": {
      "@odata.type": "#microsoft.graph.plannerAssignment",
      "orderHint": " !"
    }
  }
}
```

---

## Step 5: Configure Category Labels

Planner supports up to 25 category labels (colored tags). Configure them via the plan
details resource to categorize tasks by type.

```
GET https://graph.microsoft.com/v1.0/planner/plans/{planId}/details
```

Save the ETag, then PATCH with custom label names:

```
PATCH https://graph.microsoft.com/v1.0/planner/plans/{planId}/details
Authorization: Bearer <token>
If-Match: <etag>
Content-Type: application/json

{
  "categoryDescriptions": {
    "category1": "Feature",
    "category2": "Bug Fix",
    "category3": "Tech Debt",
    "category4": "Testing",
    "category5": "Documentation"
  }
}
```

After setting labels, apply them to tasks by patching the task's `appliedCategories`:

```json
{ "appliedCategories": { "category1": true } }
```

---

## Step 6: Verify the Board

Confirm all tasks and buckets are correctly set up:

```
GET https://graph.microsoft.com/v1.0/planner/plans/{planId}/tasks
    ?$select=id,title,priority,dueDateTime,bucketId,assignments,percentComplete
```

Expected board state:
```
Sprint 7 — Jan 15–29
┌─────────────────────────────────────────────┬──────────────┬──────────┬──────────────┐
│ Backlog (5 tasks)                           │ In Progress  │ In Review│ Done         │
├─────────────────────────────────────────────┼──────────────┼──────────┼──────────────┤
│ US-101: OAuth2 login page (Urgent) — Jane   │              │          │              │
│ US-102: Profile REST API (Imp.) — Bob       │              │          │              │
│ US-103: Dashboard UI (Med.) — Alice+Bob     │              │          │              │
│ US-104: Unit tests (Med.) — Jane+Alice      │              │          │              │
│ US-105: API docs (Low)                      │              │          │              │
└─────────────────────────────────────────────┴──────────────┴──────────┴──────────────┘
```

The sprint board is ready. Team members can access it at:
`https://tasks.office.com/<tenant>/#/plantaskboard?groupId=<group-id>&planId=<plan-id>`
