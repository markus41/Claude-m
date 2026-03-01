# Microsoft Planner & To Do Plugin

A Claude Code knowledge plugin for Microsoft Planner and Microsoft To Do task management via Graph API — plans, buckets, tasks, assignments, checklists, and personal to-do lists.

## What This Plugin Provides

This is a **knowledge plugin** -- it gives Claude deep expertise in Planner and To Do APIs so it can generate correct Graph API code for task management, sprint board setup, assignment workflows, and personal productivity automation. It does not contain runtime code, MCP servers, or executable scripts.

## Setup

Run `/setup` to configure authentication and verify Planner/To Do access:

```
/setup              # Full guided setup
/setup --minimal    # Node.js dependencies only
```

## Capabilities

| Area | What Claude Can Do |
|------|-------------------|
| **Planner Plans** | Create plans tied to M365 Groups, configure buckets for workflow stages |
| **Tasks** | Create, assign, update, and track tasks with priority, due dates, and checklists |
| **Assignments** | Assign tasks to users with proper ETag concurrency handling |
| **Labels** | Configure and apply category labels for task classification |
| **To Do Lists** | Create personal task lists with steps, reminders, and recurrence |
| **Review** | Analyze Planner/To Do integration code for correct API usage and ETag handling |

## Commands

| Command | Description |
|---------|-------------|
| `/planner-plan-create` | Create a Planner plan with buckets for a Microsoft 365 Group |
| `/planner-task-create` | Create a task with assignment, due date, and priority |
| `/planner-task-assign` | Assign or reassign a task to users |
| `/planner-bucket-create` | Create a new bucket in a plan |
| `/todo-list-create` | Create a personal To Do list |
| `/todo-task-create` | Create a To Do task with due date and reminder |
| `/setup` | Configure Azure auth and verify Planner/To Do access |

## Agent

| Agent | Description |
|-------|-------------|
| **Planner & To Do Reviewer** | Reviews Graph API usage, ETag concurrency handling, task creation patterns |

## Plugin Structure

```
planner-todo/
├── .claude-plugin/
│   └── plugin.json
├── skills/
│   └── planner-todo/
│       └── SKILL.md
├── commands/
│   ├── planner-plan-create.md
│   ├── planner-task-create.md
│   ├── planner-task-assign.md
│   ├── planner-bucket-create.md
│   ├── todo-list-create.md
│   ├── todo-task-create.md
│   └── setup.md
├── agents/
│   └── planner-reviewer.md
└── README.md
```

## Trigger Keywords

The skill activates automatically when conversations mention: `planner`, `to do`, `todo`, `task management`, `plan create`, `bucket`, `task assignment`, `checklist`, `project board`, `sprint planning`, `kanban`, `task list`.

## Author

Markus Ahling
