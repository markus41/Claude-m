---
name: lists-add-item
description: "Add an item to a Microsoft List"
argument-hint: "<site-id> <list-id> --fields <field=value,...>"
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
---

# Add an Item to a Microsoft List

Add a new item to an existing Microsoft List with field values mapped to the list's column schema.

## Instructions

### 1. Resolve Column Schema

Before creating the item, fetch the list's columns to validate field names and types:

```
GET https://graph.microsoft.com/v1.0/sites/{site-id}/lists/{list-id}/columns?$select=name,displayName,text,number,choice,dateTime,boolean,personOrGroup,currency
```

Use this to:
- Map user-provided field names to internal column names.
- Validate that field values match the expected column type.
- Identify required fields that are missing from the input.

### 2. Create the Item

```
POST https://graph.microsoft.com/v1.0/sites/{site-id}/lists/{list-id}/items
```

**Request body**:
```json
{
  "fields": {
    "Title": "Server room AC unit failure",
    "Status": "Open",
    "Priority": "Critical",
    "Description": "AC unit in server room B2 stopped working at 3 AM. Temperature rising.",
    "AssignedToLookupId": 12,
    "DueDate": "2026-03-05",
    "IsBlocking": true
  }
}
```

### 3. Field Type Mapping Rules

#### Text fields
Pass the value as a plain string. Respect `maxLength` from the column definition.

```json
{ "Title": "Replace broken monitor", "Description": "Dell U2722D on desk 4A" }
```

#### Number fields
Pass as a numeric value (not a string). Respect `minimum`, `maximum`, and `decimalPlaces`.

```json
{ "Quantity": 150, "PercentComplete": 75 }
```

#### Choice fields
Pass the value as a string matching one of the defined `choices` exactly (case-sensitive).

```json
{ "Status": "In Progress", "Priority": "High" }
```

If the value does not match any defined choice, return an error listing the valid options.

#### DateTime fields
Pass as an ISO 8601 date string. Use `YYYY-MM-DD` for `dateOnly` format or `YYYY-MM-DDTHH:mm:ssZ` for `dateTime` format.

```json
{ "DueDate": "2026-03-15", "CreatedAt": "2026-03-01T09:30:00Z" }
```

#### Boolean fields
Pass as `true` or `false` (not strings).

```json
{ "IsBlocking": true, "InStock": false }
```

#### Person (Lookup) fields
Person columns require the SharePoint user lookup ID, not the Azure AD user ID. Use the `LookupId` suffix on the internal field name.

To resolve a user's lookup ID:
```
GET https://graph.microsoft.com/v1.0/sites/{site-id}/lists('User Information List')/items?$filter=fields/EMail eq 'user@contoso.com'&$select=id
```

Then set:
```json
{ "AssignedToLookupId": 12 }
```

#### Currency fields
Pass as a numeric value. The locale is defined on the column, not the item.

```json
{ "EstimatedCost": 2499.99, "UnitCost": 14.50 }
```

### 4. Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| 400 Bad Request | Invalid field name or value type mismatch | Check field name against column schema; verify value matches expected type |
| 400 with `invalidColumnValue` | Choice value not in allowed list | List valid choices and prompt user to pick one |
| 404 Not Found | List or site does not exist | Verify site-id and list-id are correct |
| 403 Forbidden | Missing `Sites.ReadWrite.All` permission | Re-run `/setup` and verify permissions |

### 5. Display Results

After successful creation, display:
- Item ID.
- All field values in a formatted table.
- Direct link to the item: `https://{tenant}.sharepoint.com/sites/{site-name}/Lists/{list-name}/DispForm.aspx?ID={item-id}`.
