# Personal Weekly Workflow

A complete guide for setting up a personal task management system using Microsoft To Do
for daily capture and Microsoft Planner for structured project work. This workflow
integrates both tools via the Graph API to create a sustainable weekly productivity system.

## Scenario

A knowledge worker wants to manage personal tasks in To Do (quick capture, recurring
routines) while tracking project work in Planner (sprint boards, team collaboration).
The goal is a single, coherent system that links related items across both tools.

## Overview

| Tool | Purpose |
|---|---|
| Microsoft To Do | Daily task inbox, recurring routines, personal commitments |
| Microsoft Planner | Project boards, team tasks, sprint work |

---

## Step 1: Create "This Week" To Do List

Create a weekly capture list that gets reviewed and cleared every Friday.

```
POST https://graph.microsoft.com/v1.0/me/todo/lists
Authorization: Bearer <token>
Content-Type: application/json

{
  "displayName": "This Week"
}
```

Expected response (`HTTP 201`):
```json
{
  "id": "AQMkADZhMWM5NGI5LWU0YjAtNGViZC05ZGE5LThhNTgzOGY5OGExMAAuAAAD...",
  "displayName": "This Week",
  "isOwner": true,
  "isShared": false
}
```

Save `thisWeekListId` — you will use it in subsequent steps.

Also create a "Someday / Maybe" list for ideas that do not belong to the current week:

```json
{ "displayName": "Someday / Maybe" }
```

---

## Step 2: Create a Daily Morning Review Recurring Task

Set up a recurring task that appears every weekday to remind you to review and prioritize
the day's work.

```
POST https://graph.microsoft.com/v1.0/me/todo/lists/{thisWeekListId}/tasks
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Morning Review — check calendar, clear inbox, set top 3",
  "importance": "high",
  "status": "notStarted",
  "dueDateTime": {
    "dateTime": "2024-01-15T08:00:00.0000000",
    "timeZone": "UTC"
  },
  "reminderDateTime": {
    "dateTime": "2024-01-15T07:45:00.0000000",
    "timeZone": "UTC"
  },
  "isReminderOn": true,
  "recurrence": {
    "pattern": {
      "type": "weekly",
      "interval": 1,
      "daysOfWeek": ["monday", "tuesday", "wednesday", "thursday", "friday"],
      "firstDayOfWeek": "sunday"
    },
    "range": {
      "type": "noEnd",
      "startDate": "2024-01-15"
    }
  },
  "body": {
    "content": "1. Check calendar for today\n2. Process email inbox to zero\n3. Set top 3 priorities for the day\n4. Review Planner board",
    "contentType": "text"
  }
}
```

Expected response: task ID saved as `morningReviewTaskId`.

When this task is marked complete each morning, To Do automatically generates tomorrow's
instance.

---

## Step 3: Create a Weekly Planning Recurring Task

Set up a Monday morning planning session task that prompts a full week review.

```
POST https://graph.microsoft.com/v1.0/me/todo/lists/{thisWeekListId}/tasks
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Weekly Planning — review OKRs, assign tasks, clear backlog",
  "importance": "high",
  "status": "notStarted",
  "dueDateTime": {
    "dateTime": "2024-01-15T09:00:00.0000000",
    "timeZone": "UTC"
  },
  "reminderDateTime": {
    "dateTime": "2024-01-15T08:45:00.0000000",
    "timeZone": "UTC"
  },
  "isReminderOn": true,
  "recurrence": {
    "pattern": {
      "type": "weekly",
      "interval": 1,
      "daysOfWeek": ["monday"],
      "firstDayOfWeek": "sunday"
    },
    "range": {
      "type": "noEnd",
      "startDate": "2024-01-15"
    }
  },
  "body": {
    "content": "1. Review last week — what was completed vs. planned?\n2. Check OKR progress\n3. Assign tasks for this week in Planner\n4. Move items from Someday/Maybe if timely\n5. Block focus time on calendar",
    "contentType": "text"
  }
}
```

---

## Step 4: Create the Personal Focus Planner Plan

While To Do handles daily routines, Planner provides a visual board for tracking
project-oriented personal work that has multiple stages or depends on others.

First, identify or create a personal Microsoft 365 Group:

```
POST https://graph.microsoft.com/v1.0/groups
Content-Type: application/json

{
  "displayName": "Personal Work Board",
  "mailNickname": "personal-work-board",
  "groupTypes": ["Unified"],
  "mailEnabled": true,
  "securityEnabled": false,
  "visibility": "Private"
}
```

Then create the Planner plan:

```
POST https://graph.microsoft.com/v1.0/planner/plans
Content-Type: application/json

{
  "owner": "<personal-group-id>",
  "title": "Personal Focus Board"
}
```

Save `focusPlanId`.

---

## Step 5: Create Four Buckets for the Focus Board

Create buckets that represent stages in a personal GTD-style workflow:

### Today — actively working on this

```json
{ "name": "Today", "planId": "<focusPlanId>", "orderHint": " !" }
```

### This Week — committed for the week

```json
{ "name": "This Week", "planId": "<focusPlanId>", "orderHint": " !" }
```

### Someday — low urgency, good ideas

```json
{ "name": "Someday", "planId": "<focusPlanId>", "orderHint": " !" }
```

### Waiting — blocked on someone else

```json
{ "name": "Waiting", "planId": "<focusPlanId>", "orderHint": " !" }
```

---

## Step 6: Link Planner Tasks to To Do as Reference Links

When working on a Planner task, create a corresponding To Do task in "This Week" that
links back to the Planner task. This keeps your daily capture list in To Do while the
project board lives in Planner.

First, create the Planner task:

```
POST https://graph.microsoft.com/v1.0/planner/tasks

{
  "planId": "<focusPlanId>",
  "bucketId": "<thisWeekBucketId>",
  "title": "Draft Q1 OKR proposal",
  "priority": 1,
  "dueDateTime": "2024-01-19T23:59:59Z"
}
```

Planner task response: `{ "id": "planner-task-okr-id", ... }`

Construct the Planner deep-link URL:
`https://tasks.office.com/<tenant>/#/taskdetailsv2/planner-task-okr-id`

Now create a corresponding To Do task that references the Planner task:

```
POST https://graph.microsoft.com/v1.0/me/todo/lists/{thisWeekListId}/tasks

{
  "title": "Draft Q1 OKR proposal",
  "importance": "high",
  "dueDateTime": {
    "dateTime": "2024-01-19T23:59:59.0000000",
    "timeZone": "UTC"
  },
  "body": {
    "content": "Planner task: https://tasks.office.com/<tenant>/#/taskdetailsv2/planner-task-okr-id",
    "contentType": "text"
  }
}
```

This pattern keeps To Do as your daily driver (what's on your plate today) while
Planner tracks the detailed project state (progress, checklist, team context).

---

## Step 7: Daily Routine — Move Tasks from This Week to Today

Each morning during your Morning Review, use `planner-task-update` to move selected
tasks from the "This Week" bucket to "Today":

```
GET https://graph.microsoft.com/v1.0/planner/tasks/{taskId}
→ save ETag

PATCH https://graph.microsoft.com/v1.0/planner/tasks/{taskId}
If-Match: <etag>
Content-Type: application/json

{
  "bucketId": "<todayBucketId>"
}
```

At end of day, move incomplete tasks back to "This Week" or "Someday" as appropriate.

---

## Tips: To Do App vs. Planner Web

| Feature | Microsoft To Do app | Planner web (tasks.office.com) |
|---|---|---|
| Best for | Quick capture, daily todos, recurring reminders | Project boards, team collaboration, multi-stage work |
| Mobile experience | Excellent — full-featured iOS/Android apps | Limited — use the Tasks app in Teams for mobile |
| Recurring tasks | Yes — full pattern support | No recurrence support |
| Checklist (subtasks) | Yes — My Day sub-tasks | Yes — checklist items in task details |
| Assigned to others | No (personal lists only) | Yes — assign to any group member |
| Notifications | Push notifications on mobile | No built-in push; use Power Automate for alerts |
| Integration with Outlook | Yes — flagged emails appear automatically | No direct integration |
| Integration with Teams | Tasks app aggregates both | Planner tab in Teams channels |

### Recommended Tool Selection

Use **To Do** when:
- The task is personal and no one else needs to see it
- You want reminders or recurring patterns
- The task is a daily action item (call someone, review a document)

Use **Planner** when:
- Multiple people are involved or need visibility
- The task has stages (Backlog → In Progress → Review → Done)
- You need checklist items, attachments, or external references
- The work is part of a sprint or project with a timeline
