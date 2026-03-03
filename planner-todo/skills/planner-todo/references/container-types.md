# Planner Plan Container Types — Reference

## Overview

Every Planner plan must be owned by a **container**. The container type determines:
- Who has access to the plan
- What happens when the container is deleted
- Which API version supports the container
- What use cases the plan is suited for

Base URL: `https://graph.microsoft.com/v1.0` (v1.0) or `https://graph.microsoft.com/beta` (beta)

---

## Container Type Quick Reference

| Type | API Version | Use Case | Access Control |
|------|-------------|----------|----------------|
| `group` | v1.0 | Team/department project | M365 Group members |
| `roster` | beta | Ad-hoc collaboration | Roster members only |
| `teamsChannel` | v1.0 | Channel-specific board | Team members in that channel |
| `user` | v1.0 | Personal plan | Single user |
| `plannerTask` | v1.0 | Hierarchical sub-plan | Inherits from parent plan |
| `driveItem` | beta | File-attached plan | Item permission holders |

---

## `group` — Microsoft 365 Group (Most Common)

**Use case**: Team projects, department boards, sprint planning boards tied to a Teams team.

```json
{
  "container": {
    "@odata.type": "#microsoft.graph.plannerPlanContainer",
    "type": "group",
    "id": "<m365-group-id>"
  },
  "title": "Sprint 14 Board"
}
```

Or use the legacy `owner` field (equivalent):
```json
{ "owner": "<m365-group-id>", "title": "Sprint 14 Board" }
```

**Access**: All members of the M365 Group can view and edit.
**Lifecycle**: Plan is deleted when the Group is deleted.
**Discovery**: `GET /groups/{groupId}/planner/plans`
**Permissions**: `Tasks.ReadWrite`, `Group.ReadWrite.All`

---

## `roster` — Lightweight Membership Container (Beta)

**Use case**: Cross-department plans, personal projects with invited collaborators.
Does NOT require an M365 Group.

### Step 1: Create Roster
```
POST https://graph.microsoft.com/beta/planner/rosters
Content-Type: application/json
{}
```

### Step 2: Add Members
```
POST https://graph.microsoft.com/beta/planner/rosters/{rosterId}/members
{ "userId": "<user-id>" }
```

### Step 3: Create Plan
```json
{
  "container": {
    "@odata.type": "#microsoft.graph.plannerPlanContainer",
    "type": "roster",
    "id": "<roster-id>"
  },
  "title": "Q2 Product Review"
}
```

**Access**: Only explicitly added roster members.
**Lifecycle**: Independent — not tied to any Group.
**Discovery**: `GET /me/planner/rosterplans`
**Permissions**: `Tasks.ReadWrite`
**Limits**: Up to 2 roster plans per user in some tenants.

---

## `teamsChannel` — Teams Channel Plan

**Use case**: Board accessible only within a specific Teams channel. Shows as a tab.

```json
{
  "container": {
    "@odata.type": "#microsoft.graph.plannerPlanContainer",
    "type": "teamsChannel",
    "id": "{teamId}:{channelId}"
  },
  "title": "Dev Channel Board"
}
```

The container `id` format: `{teamId}:{channelId}` (colon-separated).

**Access**: Team members who are members of the specific channel.
**Lifecycle**: Deleted when the channel is deleted.
**Discovery**: Teams Planner tab; no direct list endpoint.
**Permissions**: `Tasks.ReadWrite`, `ChannelMessage.Read.All`

---

## `user` — User-Owned Personal Plan

**Use case**: Private personal task boards. Only visible to the owning user.

```json
{
  "container": {
    "@odata.type": "#microsoft.graph.plannerPlanContainer",
    "type": "user",
    "id": "<user-id>"
  },
  "title": "My Personal Board"
}
```

Use `me` for the signed-in user:
```json
{ "id": "me" }
```

**Access**: The owning user only.
**Lifecycle**: Deleted when the user account is deleted.
**Discovery**: `GET /me/planner/plans`
**Permissions**: `Tasks.ReadWrite`

---

## `plannerTask` — Nested Sub-Plan (Hierarchical)

**Use case**: Decompose a large task into a full sub-board with its own buckets and tasks.
Creates a parent-child hierarchy: `Root Plan → Task → Sub-Plan → Sub-Tasks`.

```json
{
  "container": {
    "@odata.type": "#microsoft.graph.plannerPlanContainer",
    "type": "plannerTask",
    "id": "<parent-task-id>"
  },
  "title": "Feature: Auth Flow Breakdown"
}
```

**Access**: Same as the parent task's plan (inherits).
**Lifecycle**: Deleted when the parent task is deleted.
**Discovery**: No direct list endpoint. Access via knowing the parent task ID.
**Permissions**: `Tasks.ReadWrite`
**Limit**: One nested plan per task.

### Hierarchy Example
```
Plan: "Sprint 14"
  └── Bucket: "In Progress"
       └── Task: "Implement auth module"  ← parent task
            └── Sub-Plan: "Auth Module Breakdown"
                 ├── Bucket: "To Do"
                 │    ├── Task: "Design token flow"
                 │    └── Task: "Research PKCE spec"
                 └── Bucket: "Done"
                      └── Task: "Choose OAuth library"
```

---

## `driveItem` — OneDrive/SharePoint File-Attached Plan (Beta)

**Use case**: Plans attached to a specific document or file in SharePoint/OneDrive.
Useful for project files where the plan tracks work on that document.

```json
{
  "container": {
    "@odata.type": "#microsoft.graph.plannerPlanContainer",
    "type": "driveItem",
    "id": "<drive-item-id>"
  },
  "title": "Product Roadmap Plan"
}
```

Get drive item ID from:
```
GET /drives/{driveId}/items/{itemId}
```

**Access**: Users with at least read access to the drive item.
**Lifecycle**: Deleted when the drive item is deleted.
**Discovery**: Not directly queryable — access via the drive item.
**Permissions**: `Tasks.ReadWrite`, `Files.ReadWrite`

---

## Container Type Comparison: When to Use Each

| Scenario | Recommended Container |
|----------|----------------------|
| Team project board in Teams | `group` |
| Sprint board for dev team | `group` |
| Personal task list | `user` |
| Ad-hoc project with external collaborators | `roster` |
| Channel-specific tasks for a Teams channel | `teamsChannel` |
| Breaking down a large epic into sub-tasks | `plannerTask` |
| Tasks tied to a specific SharePoint document | `driveItem` |
| No M365 Group available or desired | `roster` |
