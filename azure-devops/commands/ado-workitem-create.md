---
name: ado-workitem-create
description: Create a work item (User Story, Bug, Task, Feature, Epic) in Azure DevOps with relations, tags, and attachments
argument-hint: "<title> --type 'User Story'|Bug|Task|Feature|Epic [--assign <email>] [--iteration <path>] [--area <path>] [--parent <id>] [--tags <t1,t2>]"
allowed-tools:
  - Read
  - Write
  - Bash
  - AskUserQuestion
---

# Create Azure DevOps Work Item

Create a new work item in Azure DevOps Boards with full support for relations, custom fields, tags, and bulk creation.

## Prerequisites

- Authenticated to Azure DevOps (run `/ado-setup` first)
- `Create work items` permission in the target project

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `<title>` | Yes | Work item title |
| `--type` | Yes | Work item type: `User Story`, `Bug`, `Task`, `Feature`, `Epic` |
| `--assign` | No | Assignee email address |
| `--iteration` | No | Iteration path (e.g., `MyProject\\Sprint 1`) |
| `--area` | No | Area path (e.g., `MyProject\\Backend`) |
| `--parent` | No | Parent work item ID (creates child relation) |
| `--related` | No | Comma-separated related work item IDs |
| `--predecessor` | No | Predecessor work item ID |
| `--tags` | No | Comma-separated tags |
| `--description` | No | HTML description body |
| `--priority` | No | Priority: 1 (critical) to 4 (low) |
| `--story-points` | No | Story points / effort value |
| `--custom-fields` | No | JSON object of custom field ref names to values |
| `--bulk` | No | Path to JSON or CSV file for bulk creation |
| `--board-column` | No | Board column name to place the item in |

## Instructions

1. **Build JSON Patch body** — construct an array of JSON Patch operations:
   ```json
   [
     { "op": "add", "path": "/fields/System.Title", "value": "<title>" },
     { "op": "add", "path": "/fields/System.WorkItemType", "value": "<type>" },
     { "op": "add", "path": "/fields/System.AssignedTo", "value": "<email>" },
     { "op": "add", "path": "/fields/System.IterationPath", "value": "<path>" },
     { "op": "add", "path": "/fields/System.AreaPath", "value": "<path>" },
     { "op": "add", "path": "/fields/System.Tags", "value": "tag1; tag2" },
     { "op": "add", "path": "/fields/System.Description", "value": "<html>" },
     { "op": "add", "path": "/fields/Microsoft.VSTS.Common.Priority", "value": 2 },
     { "op": "add", "path": "/fields/Microsoft.VSTS.Scheduling.StoryPoints", "value": 5 }
   ]
   ```

2. **Add relations** — include relation operations in the patch body:
   - Parent: `{ "op": "add", "path": "/relations/-", "value": { "rel": "System.LinkTypes.Hierarchy-Reverse", "url": "https://dev.azure.com/{org}/{project}/_apis/wit/workItems/{parentId}" } }`
   - Child: `rel: "System.LinkTypes.Hierarchy-Forward"`
   - Related: `rel: "System.LinkTypes.Related"`
   - Predecessor: `rel: "System.LinkTypes.Dependency-Reverse"`
   - Successor: `rel: "System.LinkTypes.Dependency-Forward"`

3. **Custom fields** — if `--custom-fields` is provided, add each as a patch operation: `{ "op": "add", "path": "/fields/{refName}", "value": "{value}" }`.

4. **Create work item** — call `POST /_apis/wit/workitems/$<type>?api-version=7.1` with `Content-Type: application/json-patch+json`.
   CLI: `az boards work-item create --title "<title>" --type "<type>" --assigned-to "<email>" --iteration "<path>" --area "<path>"`.

5. **Bulk creation** — if `--bulk` is provided:
   - Read the JSON/CSV file
   - For each row, build a patch body and call the create API
   - Collect results and display summary table

6. **Board column** — if `--board-column` is provided, update `System.BoardColumn` via a subsequent `PATCH /_apis/wit/workitems/{id}?api-version=7.1`.

7. **Display results** — show work item ID, URL, title, type, assigned to, state, and any linked items.

## Examples

```bash
/ado-workitem-create "Implement OAuth flow" --type "User Story" --assign alice@contoso.com --parent 100 --tags auth,security --priority 2 --story-points 8
/ado-workitem-create "Login button unresponsive" --type Bug --assign bob@contoso.com --iteration "MyProject\\Sprint 5"
/ado-workitem-create --bulk ./items.csv --type Task
```

## Error Handling

- **Invalid field reference**: The work item type does not have the specified field — list available fields with `GET /_apis/wit/fields`.
- **Parent not found**: Work item ID does not exist — verify the ID.
- **Invalid iteration/area path**: Path does not exist — list valid paths with `GET /_apis/wit/classificationnodes/iterations?$depth=3`.
