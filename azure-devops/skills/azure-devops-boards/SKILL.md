---
name: Azure DevOps Boards
description: >
  Deep expertise in Azure Boards — work item management, WIQL queries, Kanban boards,
  sprint planning, area/iteration paths, process customization with inherited processes,
  and cross-team delivery plans.
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
triggers:
  - work item
  - wiql
  - ado board
  - sprint
  - iteration
  - process customization
  - custom work item type
  - delivery plan
  - ado boards
  - backlog
  - kanban
---

# Azure DevOps Boards

## Shared Workflow Routing
- Use the shared workflow spec for deterministic multi-plugin routing: [`workflows/multi-plugin-workflows.md`](../../../workflows/multi-plugin-workflows.md#incident-triage-azure-monitor--azure-functions--azure-devops).

## Overview

Azure Boards provides Agile project management through work items, backlogs, sprint boards, and delivery plans. Work items (Epics, Features, User Stories, Tasks, Bugs) are created and managed via JSON Patch operations. WIQL (Work Item Query Language) provides SQL-like queries across work items with support for tree and one-hop queries.

The inherited process model allows organizations to customize work item types, fields, states, form layouts, and rules without forking the base process. Delivery plans enable cross-team timeline visualization with dependency tracking.

## REST API — Work Items

| Method | Endpoint | Required Permissions | Key Parameters |
|--------|----------|---------------------|----------------|
| GET | `/_apis/wit/workitems/{id}?api-version=7.1` | Work Items (Read) | `fields`, `$expand=all` |
| GET | `/_apis/wit/workitems?ids=1,2,3&api-version=7.1` | Work Items (Read) | `ids` (max 200), `fields` |
| POST | `/_apis/wit/workitems/$Task?api-version=7.1` | Work Items (Read & Write) | JSON Patch body |
| PATCH | `/_apis/wit/workitems/{id}?api-version=7.1` | Work Items (Read & Write) | JSON Patch body |
| DELETE | `/_apis/wit/workitems/{id}?api-version=7.1` | Work Items (Read & Write) | `destroy` for permanent |
| POST | `/_apis/wit/wiql?api-version=7.1` | Work Items (Read) | Body: `{ "query": "<WIQL>" }` |

### JSON Patch Format
```json
[
  { "op": "add", "path": "/fields/System.Title", "value": "Implement login page" },
  { "op": "add", "path": "/fields/System.AssignedTo", "value": "user@company.com" },
  { "op": "add", "path": "/fields/System.IterationPath", "value": "MyProject\\Sprint 12" },
  { "op": "add", "path": "/fields/System.AreaPath", "value": "MyProject\\Frontend" },
  { "op": "add", "path": "/relations/-", "value": {
    "rel": "System.LinkTypes.Hierarchy-Reverse",
    "url": "https://dev.azure.com/{org}/{project}/_apis/wit/workitems/{parentId}"
  }}
]
```

Content-Type: `application/json-patch+json`.

## WIQL Quick Reference

```sql
SELECT [System.Id], [System.Title], [System.State], [System.AssignedTo]
FROM WorkItems
WHERE [System.TeamProject] = @project
  AND [System.WorkItemType] = 'Bug'
  AND [System.State] <> 'Closed'
  AND [System.AssignedTo] = @me
ORDER BY [Microsoft.VSTS.Common.Priority] ASC, [System.CreatedDate] DESC
```

**Macros**: `@project`, `@me`, `@today`, `@currentIteration`, `@follows`, `@myRecentActivity`.

## REST API — Iterations & Areas

| Method | Endpoint | Key Parameters |
|--------|----------|----------------|
| GET | `/_apis/work/teamsettings/iterations?api-version=7.1` | `$timeframe` |
| POST | `/_apis/work/teamsettings/iterations?api-version=7.1` | Body: `id` (classificationNodeId) |
| GET | `/_apis/wit/classificationnodes/iterations?api-version=7.1` | `$depth` |
| POST | `/_apis/wit/classificationnodes/iterations/{path}?api-version=7.1` | Body: `name`, `attributes` |

## REST API — Process Customization

| Method | Endpoint | Key Parameters |
|--------|----------|----------------|
| GET | `/_apis/work/processes?api-version=7.1` | `$expand` |
| POST | `/_apis/work/processes?api-version=7.1` | Body: `name`, `parentProcessTypeId` |
| GET | `/_apis/work/processes/{processId}/workitemtypes?api-version=7.1` | — |
| POST | `/_apis/work/processes/{processId}/workitemtypes?api-version=7.1` | Body: `name`, `color`, `icon` |
| POST | `/_apis/work/processes/{processId}/workitemtypes/{witRefName}/fields?api-version=7.1` | Body: field config |
| POST | `/_apis/work/processes/{processId}/workitemtypes/{witRefName}/states?api-version=7.1` | Body: `name`, `stateCategory`, `color` |

## Work Item Types

| Type | Category | Use Case |
|------|----------|----------|
| Epic | Portfolio | Large initiatives spanning multiple sprints/releases |
| Feature | Portfolio | Deliverable functionality within an epic |
| User Story | Requirement | User-facing behavior description |
| Task | Task | Implementation work unit |
| Bug | Bug | Defect to fix |
| Issue | Issue | Impediment or risk (Agile process) |
| Test Case | Test | Manual test case definition |

## Best Practices

- Use WIQL with `@currentIteration` macro for sprint-scoped queries.
- Always include Area/Iteration path filters in WIQL for performance.
- Use JSON Patch `add` for new fields, `replace` for updates, `test` for conditional writes.
- Create inherited processes for customization — never modify the base process.
- Use relation links (parent/child, related, predecessor/successor) for traceability.
- Batch-fetch work items (max 200 IDs per call) after WIQL returns IDs.
- Use delivery plans for cross-team sprint alignment.

## Progressive Disclosure — Reference Files

| Topic | File |
|---|---|
| Work items, WIQL syntax, boards, sprints, area/iteration paths | [`references/work-items-boards.md`](./references/work-items-boards.md) |
| Inherited process model, custom WITs, fields, states, rules | [`references/process-customization.md`](./references/process-customization.md) |
| Delivery plans, cross-team planning, timeline management | [`references/delivery-plans.md`](./references/delivery-plans.md) |
