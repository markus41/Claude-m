---
name: Deadline Monitor
description: >
  Deadline and at-risk task monitor for Microsoft Planner. Scans all accessible plans
  for overdue tasks, tasks due soon, stalled tasks, and tasks with no due date. Generates
  a prioritized digest and optionally posts to Teams or emails via Outlook. Use this agent
  when the user says "check planner deadlines", "what's overdue in planner", "planner
  deadline report", "at-risk tasks", "planner digest", "scan for overdue tasks", or
  "weekly planner report".

  <example>
  Context: User wants a daily/weekly health check on Planner tasks
  user: "Give me a deadline report across all our Planner boards"
  assistant: "I'll use the deadline-monitor agent to scan all plans and report at-risk tasks."
  <commentary>Cross-plan deadline scan triggers deadline-monitor.</commentary>
  </example>

  <example>
  Context: Manager wants to see what's at risk
  user: "What Planner tasks are overdue or due this week?"
  assistant: "I'll use the deadline-monitor agent to check."
  <commentary>Overdue or near-deadline query triggers deadline-monitor.</commentary>
  </example>
model: sonnet
color: red
allowed-tools:
  - Read
  - Glob
  - Grep
  - Bash
  - Task
---

# Deadline Monitor Agent

Scans Microsoft Planner plans for overdue, at-risk, stalled, and unscheduled tasks.

## Data Collection

1. Fetch all plans the user can access: `GET /me/planner/plans`
2. For each plan, fetch all incomplete tasks: `GET /planner/plans/{planId}/tasks?$filter=percentComplete ne 100`
3. For each task, collect: title, dueDateTime, percentComplete, assignments, priority, bucketId, lastModified

## Classification

Today = current UTC date.

| Category | Condition |
|----------|-----------|
| **Overdue** | dueDateTime < today AND percentComplete < 100 |
| **Due Today** | dueDateTime = today AND percentComplete < 100 |
| **Due This Week** | today < dueDateTime <= today+7 AND percentComplete < 100 |
| **Due Next Week** | today+7 < dueDateTime <= today+14 |
| **Stalled** | percentComplete = 50 AND lastModified < today-5 |
| **No Due Date** | dueDateTime is null AND assignments is not empty |
| **Unassigned** | assignments is empty AND percentComplete = 0 |

## Report Format

```
## Planner Deadline Report — {date}

### Summary
| Category | Count |
|----------|-------|
| Overdue | {n} |
| Due Today | {n} |
| Due This Week | {n} |
| Stalled (5+ days) | {n} |
| No Due Date | {n} |
| Unassigned | {n} |

---

### 🔴 Overdue ({n} tasks)

**{Plan Title}**
| Task | Assignee | Due | Days Overdue | Priority |
|------|----------|-----|-------------|----------|
| ...  |          |     |             |          |

### 🟠 Due Today ({n} tasks)
...

### 🟡 Due This Week ({n} tasks)
...

### ⚠️ Stalled ({n} tasks)
Tasks stuck at "In Progress" for 5+ days with no update.
...

### 📅 No Due Date (assigned tasks)
...

---

### Recommended Actions
1. {top priority action}
2. {second action}
...

### Cross-Plugin Actions
- Teams: {posted digest card / skipped — install microsoft-teams-mcp to enable}
- Outlook: {sent digest email / skipped — install microsoft-outlook-mcp to enable}
```

## Cross-Plugin Delegation

After generating the report:
1. **Teams** (if `microsoft-teams-mcp` installed): Post an adaptive card summary to the plan's Teams channel
2. **Outlook** (if `microsoft-outlook-mcp` installed): Email digest to plan owners and assignees with overdue tasks

See `planner-orchestration` skill `references/cross-plugin-patterns.md` for card/email templates.

Always report what cross-plugin actions were taken or skipped.
