---
name: ado-process
description: Manage inherited processes, custom work item types, fields, and workflow states
argument-hint: "--action list|create|add-field|add-state|apply [--process <name>] [--work-item-type <type>]"
allowed-tools:
  - Read
  - Write
  - Bash
  - AskUserQuestion
---

# Manage Processes

List and create inherited processes, add custom work item types, custom fields, workflow rules, and apply processes to projects.

## Prerequisites

- Authenticated to Azure DevOps (run `/ado-setup` first)
- Organization-level `Manage process` permission
- Inherited process model enabled (Azure DevOps Services default)

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `--action` | Yes | `list`, `create`, `add-type`, `add-field`, `add-rule`, `add-state`, `apply` |
| `--process` | No | Process name |
| `--parent-process` | No | Parent process to inherit from: `Agile`, `Scrum`, `CMMI`, `Basic` |
| `--work-item-type` | No | Work item type name (existing or new) |
| `--field-name` | No | Custom field name |
| `--field-type` | No | Field type: `string`, `integer`, `double`, `dateTime`, `boolean`, `plainText`, `html`, `identity`, `picklistString` |
| `--state-name` | No | Workflow state name |
| `--state-category` | No | State category: `Proposed`, `InProgress`, `Resolved`, `Completed`, `Removed` |
| `--project` | No | Project to apply process to |

## Instructions

1. **List processes** — `GET /_apis/work/processes?api-version=7.1`
   Display: Process ID, Name, Parent, Is default, Type (system/inherited/custom).

2. **Create inherited process** — `POST /_apis/work/processes?api-version=7.1`:
   ```json
   {
     "name": "<process-name>",
     "parentProcessTypeId": "<parent-process-id>",
     "description": "Custom process for our team"
   }
   ```

3. **Add custom work item type** — `POST /_apis/work/processes/{processId}/workitemtypes?api-version=7.1`:
   ```json
   {
     "name": "<type-name>",
     "description": "Custom work item type",
     "color": "009CCC",
     "icon": "icon_clipboard",
     "inheritsFrom": "Microsoft.VSTS.WorkItemTypes.UserStory"
   }
   ```

4. **Add custom field** — `POST /_apis/work/processes/{processId}/workitemtypes/{witRefName}/fields?api-version=7.1`:
   ```json
   {
     "name": "<field-name>",
     "type": "string",
     "description": "Custom field description"
   }
   ```
   For picklist fields, first create the picklist, then reference it.

5. **Add workflow rule** — `POST /_apis/work/processes/{processId}/workitemtypes/{witRefName}/rules?api-version=7.1`:
   ```json
   {
     "name": "Auto-assign on active",
     "conditions": [{ "conditionType": "when", "field": "System.State", "value": "Active" }],
     "actions": [{ "actionType": "setValueToCurrentUser", "targetField": "System.AssignedTo" }]
   }
   ```

6. **Add workflow state** — `POST /_apis/work/processes/{processId}/workitemtypes/{witRefName}/states?api-version=7.1`:
   ```json
   {
     "name": "<state-name>",
     "stateCategory": "InProgress",
     "color": "007ACC",
     "order": 3
   }
   ```

7. **Apply process to project** — `PATCH /_apis/projects/{projectId}?api-version=7.1`:
   ```json
   {
     "capabilities": {
       "processTemplate": { "templateTypeId": "{processId}" }
     }
   }
   ```

## Examples

```bash
/ado-process --action list
/ado-process --action create --process "Custom Agile" --parent-process Agile
/ado-process --action add-type --process "Custom Agile" --work-item-type "Risk Item"
/ado-process --action add-field --process "Custom Agile" --work-item-type "Risk Item" --field-name "Risk Score" --field-type integer
/ado-process --action add-state --process "Custom Agile" --work-item-type "Bug" --state-name "In Review" --state-category InProgress
/ado-process --action apply --process "Custom Agile" --project MyProject
```

## Error Handling

- **Cannot modify system processes**: Must create an inherited process first — system processes (Agile, Scrum, CMMI) are read-only.
- **Field name conflict**: Field already exists — use a different name or reference the existing field.
- **Process in use**: Cannot delete a process applied to a project — reassign the project first.
