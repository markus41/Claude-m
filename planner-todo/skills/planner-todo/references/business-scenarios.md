# Planner Business Scenarios API — Reference

## Overview

The Business Scenarios API (beta) allows applications to create **isolated Planner
task containers** that are owned and controlled by your application. Tasks are
associated with your scenario but surface in Planner boards for the configured M365 group.

**Key differences from standard Planner tasks**:

| Aspect | Standard Planner | Business Scenario |
|--------|-----------------|-------------------|
| Visibility | Anyone with plan access | App-controlled |
| Task ownership | Plan owner | Scenario (app) |
| Access control | Group membership | `plannerTaskConfiguration` rules |
| External ID | None | `externalId` (your app's key) |
| Isolation | None | Per-scenario isolation |
| API | v1.0 | beta only |

## When to Use Business Scenarios

- **App integration**: Surface tasks from your app (Jira, ServiceNow, custom app) in Planner
- **Scoped access**: Only your app and authorized users can manage these tasks
- **External tracking**: Maintain a stable `externalId` that maps back to your app's record
- **Multi-group targeting**: Same scenario can create tasks across different M365 Groups

## API Base

```
https://graph.microsoft.com/beta/solutions/businessScenarios
```

## Authentication & Permissions

```
Delegated:   BusinessScenarioData.ReadWrite.OwnedBy (for app's own scenarios)
Application: BusinessScenarioData.ReadWrite.All (admin consent required)
Also needed: Tasks.ReadWrite
```

---

## Scenario Lifecycle

### Create Scenario

```
POST /beta/solutions/businessScenarios
```

```json
{
  "uniqueName": "com.contoso.crm.tasks",
  "displayName": "CRM Task Integration",
  "ownerAppIds": ["<your-aad-app-id>"]
}
```

`uniqueName` must be in reverse-DNS format. Only apps listed in `ownerAppIds` can manage the scenario.

Response includes `id` (the scenario GUID).

### Configure Plan Structure

```
PATCH /beta/solutions/businessScenarios/{scenarioId}/planner/planConfiguration
```

Define the bucket layout for auto-created plans:

```json
{
  "defaultLanguage": "en-US",
  "buckets": [
    { "externalBucketId": "backlog", "orderHint": " !" },
    { "externalBucketId": "active", "orderHint": " !a" },
    { "externalBucketId": "resolved", "orderHint": " !b" }
  ],
  "localizations": [
    {
      "languageTag": "en-US",
      "planTitle": "CRM Tasks",
      "buckets": [
        { "externalBucketId": "backlog", "name": "New Cases" },
        { "externalBucketId": "active", "name": "Active" },
        { "externalBucketId": "resolved", "name": "Resolved" }
      ]
    }
  ]
}
```

Note: `externalBucketId` values are stable identifiers you define. Planner generates
internal bucket IDs but you always reference buckets by your `externalBucketId`.

### Configure Task Access Policies

```
PATCH /beta/solutions/businessScenarios/{scenarioId}/planner/taskConfiguration
```

```json
{
  "editPolicy": {
    "rules": [
      {
        "@odata.type": "#microsoft.graph.plannerTaskRoleBasedRule",
        "role": "taskAssignees",
        "defaultRule": "allow",
        "propertyRule": {
          "percentComplete": ["allow"],
          "title": ["block"],
          "assignments": ["block"]
        }
      },
      {
        "@odata.type": "#microsoft.graph.plannerTaskRoleBasedRule",
        "role": "groupOwners",
        "defaultRule": "allow"
      },
      {
        "@odata.type": "#microsoft.graph.plannerTaskRoleBasedRule",
        "role": "applications",
        "defaultRule": "allow"
      }
    ]
  }
}
```

Role values: `taskAssignees`, `groupOwners`, `groupMembers`, `applications`, `everyone`
Rule actions: `allow`, `block`

---

## Task Operations

### Create Task

```
POST /beta/solutions/businessScenarios/{scenarioId}/planner/tasks
```

```json
{
  "@odata.type": "#microsoft.graph.businessScenarioPlannerTask",
  "externalId": "CRM-LEAD-7890",
  "externalContextId": "sales-pipeline",
  "externalObjectVersion": "1",
  "webUrl": "https://crm.contoso.com/leads/7890",
  "target": {
    "@odata.type": "#microsoft.graph.businessScenarioGroupTarget",
    "taskTargetKind": "group",
    "groupId": "<m365-group-id>"
  },
  "title": "Follow up with Contoso lead",
  "bucketId": "active",
  "priority": 1,
  "dueDateTime": "2026-03-15T00:00:00Z",
  "assignments": {
    "<user-id>": {
      "@odata.type": "#microsoft.graph.plannerAssignment",
      "orderHint": " !"
    }
  }
}
```

Key fields:
- `externalId`: Stable ID from your system (used for lookup and deduplication)
- `externalContextId`: Groups related tasks (e.g., all tasks for one customer)
- `webUrl`: Deep link back to your app
- `bucketId`: References your `externalBucketId` (NOT the Planner bucket GUID)
- `target.groupId`: Which group's Planner board to surface this task on

The API auto-creates a plan in the group if none exists for this scenario yet.

### Get Task by External ID

```
GET /beta/solutions/businessScenarios/{scenarioId}/planner/tasks/{externalId}
```

This uses YOUR `externalId` as the key, not Planner's internal task GUID.

### List All Scenario Tasks

```
GET /beta/solutions/businessScenarios/{scenarioId}/planner/tasks
```

Supports `$filter`, `$select`, `$top` query parameters.

### Update Task

Use the standard Planner PATCH endpoint with the Planner task GUID (returned in create response):

```
PATCH /v1.0/planner/tasks/{plannerTaskId}
If-Match: <etag>
```

### Sync Task State Back

When your external system updates, update the Planner task's external version:

```
PATCH /beta/solutions/businessScenarios/{scenarioId}/planner/tasks/{externalId}
```

```json
{
  "externalObjectVersion": "2",
  "title": "Updated: Follow up with Contoso lead [URGENT]"
}
```

---

## External Context Grouping

`externalContextId` groups related tasks for bulk operations. For example:
- All tasks for a specific customer: `externalContextId = "customer-<customerId>"`
- All tasks from a queue: `externalContextId = "queue-support"`

Retrieve all tasks for a context:
```
GET /beta/solutions/businessScenarios/{scenarioId}/planner/tasks?
  $filter=externalContextId eq 'customer-12345'
```

---

## Plan Auto-Creation Behavior

When you create a scenario task targeting a group for the first time:
1. Planner auto-creates a plan in that group using your `planConfiguration` layout
2. Subsequent tasks targeting the same group reuse the same plan
3. The plan title comes from `planConfiguration.localizations[0].planTitle`
4. You cannot manually select which existing plan to use — one plan per scenario per group

---

## Error Reference

| Code | Meaning |
|------|---------|
| `403` | Missing `BusinessScenarioData` scope or app not in `ownerAppIds` |
| `409 DuplicateExternalId` | `externalId` already exists — use GET or update existing |
| `400 InvalidBucketId` | `bucketId` doesn't match any `externalBucketId` in plan config |
| `404` | Scenario or task not found |
| `429` | Throttled — respect `Retry-After` header |
