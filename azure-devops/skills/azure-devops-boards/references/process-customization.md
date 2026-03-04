# Azure Boards — Process Customization Reference

## Overview

Azure DevOps uses the **Inherited Process Model** to customize work item tracking. Organizations start with a system process (Agile, Scrum, Basic, or CMMI), create an inherited process from it, then customize work item types, fields, states, rules, and form layouts. Projects are bound to a single process and inherit all customizations. This reference covers the complete REST API surface for process management, work item type customization, field management, state workflows, process rules, and form layout configuration.

---

## Process REST API

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|---------------------|----------------|-------|
| GET | `/_apis/work/processes?api-version=7.1` | Process (Read) | `$expand` | List all processes including system and inherited |
| POST | `/_apis/work/processes?api-version=7.1` | Process (Create) | Body: `name`, `parentProcessTypeId`, `description` | Create inherited process from a system process |
| GET | `/_apis/work/processes/{processId}?api-version=7.1` | Process (Read) | `$expand` | Get a specific process |
| PATCH | `/_apis/work/processes/{processId}?api-version=7.1` | Process (Create) | Body: `name`, `description`, `isEnabled` | Update process metadata |
| DELETE | `/_apis/work/processes/{processId}?api-version=7.1` | Process (Create) | — | Delete process (must have no projects) |
| GET | `/_apis/work/processes/{processId}/workitemtypes?api-version=7.1` | Process (Read) | `$expand` | List all WITs in a process |
| POST | `/_apis/work/processes/{processId}/workitemtypes?api-version=7.1` | Process (Create) | Body: `name`, `color`, `icon`, `inheritsFrom` | Create custom WIT |
| PATCH | `/_apis/work/processes/{processId}/workitemtypes/{witRefName}?api-version=7.1` | Process (Create) | Body: `description`, `color`, `icon`, `isDisabled` | Update WIT |
| DELETE | `/_apis/work/processes/{processId}/workitemtypes/{witRefName}?api-version=7.1` | Process (Create) | — | Delete custom WIT (not inherited) |
| GET | `/_apis/work/processes/{processId}/workitemtypes/{witRefName}/fields?api-version=7.1` | Process (Read) | — | List fields on a WIT |
| POST | `/_apis/work/processes/{processId}/workitemtypes/{witRefName}/fields?api-version=7.1` | Process (Create) | Body: `referenceName`, `name`, `type`, `required`, `defaultValue` | Add field to WIT |
| PATCH | `/_apis/work/processes/{processId}/workitemtypes/{witRefName}/fields/{fieldRefName}?api-version=7.1` | Process (Create) | Body: `required`, `defaultValue` | Update field on WIT |
| DELETE | `/_apis/work/processes/{processId}/workitemtypes/{witRefName}/fields/{fieldRefName}?api-version=7.1` | Process (Create) | — | Remove field from WIT |
| GET | `/_apis/work/processes/{processId}/workitemtypes/{witRefName}/states?api-version=7.1` | Process (Read) | — | List states |
| POST | `/_apis/work/processes/{processId}/workitemtypes/{witRefName}/states?api-version=7.1` | Process (Create) | Body: `name`, `stateCategory`, `color`, `order` | Add state |
| PATCH | `/_apis/work/processes/{processId}/workitemtypes/{witRefName}/states/{stateId}?api-version=7.1` | Process (Create) | Body: `name`, `color`, `order`, `stateCategory` | Update state |
| DELETE | `/_apis/work/processes/{processId}/workitemtypes/{witRefName}/states/{stateId}?api-version=7.1` | Process (Create) | — | Remove custom state (cannot remove inherited) |
| GET | `/_apis/work/processes/{processId}/workitemtypes/{witRefName}/rules?api-version=7.1` | Process (Read) | — | List rules |
| POST | `/_apis/work/processes/{processId}/workitemtypes/{witRefName}/rules?api-version=7.1` | Process (Create) | Body: `name`, `conditions`, `actions` | Create rule |
| PATCH | `/_apis/work/processes/{processId}/workitemtypes/{witRefName}/rules/{ruleId}?api-version=7.1` | Process (Create) | Body: `name`, `conditions`, `actions` | Update rule |
| DELETE | `/_apis/work/processes/{processId}/workitemtypes/{witRefName}/rules/{ruleId}?api-version=7.1` | Process (Create) | — | Delete rule |

---

## Process Model Hierarchy

```
System Process (Agile / Scrum / Basic / CMMI)
  └── Inherited Process (your customizations)
        └── Project (bound to one inherited process)
```

- **System processes** are read-only templates provided by Microsoft.
- **Inherited processes** derive from a system process and allow full customization.
- A project uses exactly one process. Changing a project's process migrates all work items.

### Listing Processes

```bash
az devops invoke --area processes --resource processes \
  --route-parameters --api-version 7.1 \
  --org https://dev.azure.com/myorg
```

### Creating an Inherited Process

```json
POST https://dev.azure.com/myorg/_apis/work/processes?api-version=7.1
Content-Type: application/json

{
  "name": "My Agile Process",
  "parentProcessTypeId": "adcc42ab-9882-485e-a3ed-7678f01f66bc",
  "description": "Custom Agile process for product engineering"
}
```

The `parentProcessTypeId` is the GUID of the system process. Retrieve it from the list processes endpoint. Common system process IDs vary by organization — always query dynamically.

---

## Custom Work Item Types

Create a new work item type that inherits from a base type or stands alone:

```json
POST https://dev.azure.com/myorg/_apis/work/processes/{processId}/workitemtypes?api-version=7.1
Content-Type: application/json

{
  "name": "Change Request",
  "description": "Tracks change requests requiring approval",
  "color": "ff9d00",
  "icon": "icon_clipboard",
  "inheritsFrom": "Microsoft.VSTS.WorkItemTypes.Task"
}
```

Set `inheritsFrom` to `null` to create a standalone type. The `icon` value must be from the predefined icon set (e.g., `icon_clipboard`, `icon_crown`, `icon_database`, `icon_gear`, `icon_list`, `icon_review`).

### Disabling an Inherited WIT

```json
PATCH https://dev.azure.com/myorg/_apis/work/processes/{processId}/workitemtypes/{witRefName}?api-version=7.1
Content-Type: application/json

{
  "isDisabled": true
}
```

Disabling hides the WIT from the UI while preserving existing work items.

---

## Custom Fields

### Field Types

| Type | `type` Value | Description |
|------|-------------|-------------|
| String | `string` | Single-line text (max 255 chars) |
| Integer | `integer` | Whole number |
| Double | `double` | Floating-point number |
| DateTime | `dateTime` | Date and time value |
| Boolean | `boolean` | True/false toggle |
| PlainText | `plainText` | Multi-line plain text |
| HTML | `html` | Rich text with HTML formatting |
| TreePath | `treePath` | Area or iteration path |
| History | `history` | Discussion/comment field |
| Identity | `identity` | User identity picker |
| PicklistString | `string` with `isPicklist: true` | Dropdown with string values |
| PicklistInteger | `integer` with `isPicklist: true` | Dropdown with integer values |
| PicklistDouble | `double` with `isPicklist: true` | Dropdown with double values |

### Creating a Custom Field

```json
POST https://dev.azure.com/myorg/_apis/work/processes/{processId}/workitemtypes/{witRefName}/fields?api-version=7.1
Content-Type: application/json

{
  "referenceName": "Custom.ApprovalStatus",
  "name": "Approval Status",
  "type": "string",
  "description": "Tracks approval workflow status",
  "required": false,
  "defaultValue": "Pending"
}
```

### Creating a Picklist Field

First create the picklist, then reference it in the field:

```json
POST https://dev.azure.com/myorg/_apis/work/processes/lists?api-version=7.1
Content-Type: application/json

{
  "name": "Approval Status Values",
  "isSuggested": false,
  "type": "String",
  "items": ["Pending", "Approved", "Rejected", "Deferred"]
}
```

Then add the field referencing the picklist:

```json
POST https://dev.azure.com/myorg/_apis/work/processes/{processId}/workitemtypes/{witRefName}/fields?api-version=7.1
Content-Type: application/json

{
  "referenceName": "Custom.ApprovalStatus",
  "name": "Approval Status",
  "type": "string",
  "isPicklist": true,
  "picklistId": "<guid-from-list-creation>",
  "required": true,
  "defaultValue": "Pending"
}
```

### Field Reference Name Rules

- Must start with `Custom.` for custom fields (enforced by the API)
- Cannot contain spaces or special characters beyond dots
- Cannot be renamed once created — only the display name (`name`) can change
- Field reference names are organization-scoped: once created, the same `referenceName` shares a single definition across all processes

---

## Workflow State Customization

### State Categories

Every state must belong to one of four categories:

| Category | Meaning | Board Column Mapping |
|----------|---------|---------------------|
| `Proposed` | Work not yet started | First column |
| `InProgress` | Active work | Middle columns |
| `Resolved` | Done but awaiting verification | Near-end columns |
| `Completed` | Finished | Last column |

There is also a hidden `Removed` category for states that take items off the board entirely.

### Adding a Custom State

```json
POST https://dev.azure.com/myorg/_apis/work/processes/{processId}/workitemtypes/{witRefName}/states?api-version=7.1
Content-Type: application/json

{
  "name": "In Review",
  "stateCategory": "InProgress",
  "color": "007acc",
  "order": 3
}
```

### Reordering States

Use `PATCH` with the `order` field. States appear in the Work Item form dropdown in this order:

```json
PATCH https://dev.azure.com/myorg/_apis/work/processes/{processId}/workitemtypes/{witRefName}/states/{stateId}?api-version=7.1
Content-Type: application/json

{
  "order": 2
}
```

### Hiding Inherited States

You cannot delete inherited states, but you can hide them:

```json
PATCH https://dev.azure.com/myorg/_apis/work/processes/{processId}/workitemtypes/{witRefName}/states/{stateId}?api-version=7.1
Content-Type: application/json

{
  "hidden": true
}
```

**Gotcha**: Hiding a state that has existing work items forces migration. Reassign those items first.

---

## Process Rules

Rules automate field behavior based on conditions. Each rule has one or more **conditions** and one or more **actions**.

### Condition Types

| Type | Description | Parameters |
|------|-------------|------------|
| `whenStateChangedTo` | When state transitions to a specific value | `value` (state name) |
| `whenStateChangedFromAndTo` | When state transitions from X to Y | `value` (target), `value2` (source) |
| `whenWorkItemIsCreated` | When a new work item is created | — |
| `whenValueIsDefined` | When a field has a value | `field` |
| `whenValueIsNotDefined` | When a field is empty | `field` |
| `whenCurrentUserIsMemberOfGroup` | When current user belongs to group | `value` (group descriptor) |
| `whenCurrentUserIsNotMemberOfGroup` | When current user is not in group | `value` (group descriptor) |
| `when` | When a field equals a value | `field`, `value` |
| `whenNot` | When a field does not equal a value | `field`, `value` |
| `whenChanged` | When a field value changes | `field` |
| `whenNotChanged` | When a field has not changed | `field` |

### Action Types

| Type | Description | Parameters |
|------|-------------|------------|
| `makeRequired` | Make a field mandatory | `targetField` |
| `makeReadOnly` | Make a field read-only | `targetField` |
| `setDefaultValue` | Set a default value | `targetField`, `value` |
| `copyValue` | Copy one field to another | `targetField`, `value` (source field) |
| `setDefaultFromClock` | Set field to current date/time | `targetField` |
| `setDefaultFromCurrentUser` | Set field to current user | `targetField` |
| `hideTargetField` | Hide a field from the form | `targetField` |
| `disallowValue` | Prevent a specific value | `targetField`, `value` |
| `copyFromServerClock` | Copy server timestamp | `targetField` |
| `copyFromCurrentUser` | Copy current user identity | `targetField` |

### Creating a Rule

Example: When state changes to "In Review", make "Reviewer" required and auto-set the review date:

```json
POST https://dev.azure.com/myorg/_apis/work/processes/{processId}/workitemtypes/{witRefName}/rules?api-version=7.1
Content-Type: application/json

{
  "name": "Require reviewer on In Review",
  "conditions": [
    {
      "conditionType": "whenStateChangedTo",
      "value": "In Review"
    }
  ],
  "actions": [
    {
      "actionType": "makeRequired",
      "targetField": "Custom.Reviewer"
    },
    {
      "actionType": "setDefaultFromClock",
      "targetField": "Custom.ReviewStartDate"
    }
  ]
}
```

### Auto-Close Rule Example

When state changes to "Closed", copy current user to "Closed By" and set the close date:

```json
{
  "name": "Set closed metadata",
  "conditions": [
    {
      "conditionType": "whenStateChangedTo",
      "value": "Closed"
    }
  ],
  "actions": [
    {
      "actionType": "copyFromCurrentUser",
      "targetField": "Microsoft.VSTS.Common.ClosedBy"
    },
    {
      "actionType": "copyFromServerClock",
      "targetField": "Microsoft.VSTS.Common.ClosedDate"
    }
  ]
}
```

---

## Form Layout Customization

### Layout REST API

| Method | Endpoint | Notes |
|--------|----------|-------|
| GET | `/_apis/work/processes/{processId}/workitemtypes/{witRefName}/layout?api-version=7.1` | Get full form layout |
| POST | `/_apis/work/processes/{processId}/workitemtypes/{witRefName}/layout/pages?api-version=7.1` | Add a page (tab) |
| POST | `/_apis/work/processes/{processId}/workitemtypes/{witRefName}/layout/pages/{pageId}/sections/{sectionId}/groups?api-version=7.1` | Add a group |
| PUT | `/_apis/work/processes/{processId}/workitemtypes/{witRefName}/layout/pages/{pageId}/sections/{sectionId}/groups/{groupId}?api-version=7.1` | Move/update a group |
| POST | `/_apis/work/processes/{processId}/workitemtypes/{witRefName}/layout/pages/{pageId}/sections/{sectionId}/groups/{groupId}/controls?api-version=7.1` | Add a control to a group |

### Adding a Custom Tab (Page)

```json
POST https://dev.azure.com/myorg/_apis/work/processes/{processId}/workitemtypes/{witRefName}/layout/pages?api-version=7.1
Content-Type: application/json

{
  "label": "Approval",
  "order": 3,
  "visible": true,
  "sections": []
}
```

### Adding a Field Control to a Group

```json
POST https://dev.azure.com/myorg/_apis/work/processes/{processId}/workitemtypes/{witRefName}/layout/pages/{pageId}/sections/{sectionId}/groups/{groupId}/controls?api-version=7.1
Content-Type: application/json

{
  "id": "Custom.ApprovalStatus",
  "label": "Approval Status",
  "controlType": "FieldControl",
  "visible": true,
  "order": 1
}
```

---

## CLI Reference

```bash
# List processes
az devops invoke --area processes --resource processes \
  --api-version 7.1 --org https://dev.azure.com/myorg

# List work item types for a project
az boards work-item-type list \
  --project MyProject --org https://dev.azure.com/myorg

# Manage area paths
az boards area project list --project MyProject
az boards area project create --name "Frontend" --project MyProject
az boards area project create --name "Auth" --path "\\Frontend" --project MyProject

# Manage iteration paths
az boards iteration project list --project MyProject
az boards iteration project create --name "Sprint 14" --project MyProject \
  --start-date 2026-03-09 --finish-date 2026-03-22

# Assign iteration to a team
az boards iteration team add --id <iteration-guid> --team "Product Team" \
  --project MyProject
```

---

## Practical Example: Custom Change Request WIT

End-to-end flow to create a "Change Request" work item type with an approval workflow:

```bash
# 1. Get the inherited process ID
PROCESS_ID=$(az devops invoke --area processes --resource processes \
  --api-version 7.1 --org https://dev.azure.com/myorg \
  --query "value[?name=='My Agile Process'].typeId" -o tsv)

# 2. Create the custom WIT (via REST — no CLI equivalent)
curl -u ":$ADO_PAT" \
  -H "Content-Type: application/json" \
  -X POST "https://dev.azure.com/myorg/_apis/work/processes/$PROCESS_ID/workitemtypes?api-version=7.1" \
  -d '{
    "name": "Change Request",
    "color": "ff9d00",
    "icon": "icon_clipboard",
    "description": "Formal change request requiring CAB approval",
    "inheritsFrom": null
  }'

# 3. Add custom states
for STATE in '{"name":"Submitted","stateCategory":"Proposed","color":"b2b2b2","order":1}' \
             '{"name":"Under Review","stateCategory":"InProgress","color":"007acc","order":2}' \
             '{"name":"CAB Approved","stateCategory":"InProgress","color":"00643a","order":3}' \
             '{"name":"Implementing","stateCategory":"InProgress","color":"5688e0","order":4}' \
             '{"name":"Deployed","stateCategory":"Completed","color":"339933","order":5}' \
             '{"name":"Rejected","stateCategory":"Completed","color":"cc293d","order":6}'; do
  curl -u ":$ADO_PAT" \
    -H "Content-Type: application/json" \
    -X POST "https://dev.azure.com/myorg/_apis/work/processes/$PROCESS_ID/workitemtypes/Custom.ChangeRequest/states?api-version=7.1" \
    -d "$STATE"
done

# 4. Add custom fields
curl -u ":$ADO_PAT" \
  -H "Content-Type: application/json" \
  -X POST "https://dev.azure.com/myorg/_apis/work/processes/$PROCESS_ID/workitemtypes/Custom.ChangeRequest/fields?api-version=7.1" \
  -d '{
    "referenceName": "Custom.ChangeImpact",
    "name": "Impact Level",
    "type": "string",
    "isPicklist": true,
    "required": true,
    "defaultValue": "Low"
  }'

# 5. Add a rule: require approver when entering CAB review
curl -u ":$ADO_PAT" \
  -H "Content-Type: application/json" \
  -X POST "https://dev.azure.com/myorg/_apis/work/processes/$PROCESS_ID/workitemtypes/Custom.ChangeRequest/rules?api-version=7.1" \
  -d '{
    "name": "Require approver for CAB",
    "conditions": [{"conditionType": "whenStateChangedTo", "value": "Under Review"}],
    "actions": [{"actionType": "makeRequired", "targetField": "Custom.Approver"}]
  }'
```

---

## Limits and Gotchas

- **Max custom fields per organization**: 256 across all processes.
- **Max picklist items**: 2048 per list.
- **Max process rules per WIT**: 128.
- **Field reference name immutability**: once a `referenceName` is created, it cannot be renamed or deleted from the org — only removed from individual WITs.
- **System process lock**: you cannot modify Agile, Scrum, Basic, or CMMI directly. Always create an inherited process.
- **Project migration**: changing a project's process can take minutes to hours depending on work item count. Test with a small project first.
- **State deletion**: inherited states cannot be deleted, only hidden. Custom states can be deleted only if no work items use them.
- **Rule evaluation order**: rules fire in order of creation. Conflicting rules resolve by last-wins. Name rules clearly to avoid conflicts.
- **Cross-process field sharing**: a field with the same `referenceName` across processes shares one definition. Changing its type or picklist values affects all processes using it.
