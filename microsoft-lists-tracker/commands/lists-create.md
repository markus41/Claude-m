---
name: lists-create
description: "Create a new Microsoft List with custom columns"
argument-hint: "--site <site-id> --name <list-name> --columns <name:type,...> [--template issue-tracker|project|inventory]"
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
---

# Create a Microsoft List

Create a new Microsoft List on a SharePoint site with custom columns and optional pre-built templates.

## Instructions

### 1. Create the List

```
POST https://graph.microsoft.com/v1.0/sites/{site-id}/lists
```

**Request body**:
```json
{
  "displayName": "Issue Tracker",
  "list": {
    "template": "genericList"
  }
}
```

The `template` value should always be `genericList` for custom lists. The built-in `Title` column is created automatically.

### 2. Add Custom Columns

For each column specified in `--columns`, send a request to add the column to the list:

```
POST https://graph.microsoft.com/v1.0/sites/{site-id}/lists/{list-id}/columns
```

#### Column Type Reference

**Text column**:
```json
{
  "name": "Description",
  "text": { "allowMultipleLines": true, "maxLength": 255 }
}
```

**Number column**:
```json
{
  "name": "Quantity",
  "number": { "decimalPlaces": "none", "minimum": 0, "maximum": 10000 }
}
```

**Choice column**:
```json
{
  "name": "Status",
  "choice": {
    "allowTextEntry": false,
    "choices": ["Open", "In Progress", "Resolved", "Closed"],
    "displayAs": "dropDownMenu"
  }
}
```

**DateTime column**:
```json
{
  "name": "DueDate",
  "dateTime": { "format": "dateOnly" }
}
```

**Boolean column**:
```json
{
  "name": "IsBlocking",
  "boolean": {}
}
```

**Person column**:
```json
{
  "name": "AssignedTo",
  "personOrGroup": { "allowMultipleSelection": false, "chooseFromType": "peopleOnly" }
}
```

**Currency column**:
```json
{
  "name": "EstimatedCost",
  "currency": { "locale": "en-US" }
}
```

### 3. Templates

If `--template` is provided, pre-populate the list with a standard set of columns:

#### `issue-tracker` template
| Column | Type | Details |
|--------|------|---------|
| Status | choice | Open, In Progress, Resolved, Closed |
| Priority | choice | Critical, High, Medium, Low |
| AssignedTo | personOrGroup | Single person |
| Category | choice | Bug, Feature Request, Improvement, Question |
| DueDate | dateTime | dateOnly format |
| Description | text | Multi-line, 500 chars |
| IsBlocking | boolean | Default false |

#### `project` template
| Column | Type | Details |
|--------|------|---------|
| Status | choice | Not Started, In Progress, On Hold, Completed |
| Owner | personOrGroup | Single person |
| StartDate | dateTime | dateOnly format |
| DueDate | dateTime | dateOnly format |
| PercentComplete | number | 0-100, no decimals |
| Budget | currency | en-US locale |
| Notes | text | Multi-line, 500 chars |

#### `inventory` template
| Column | Type | Details |
|--------|------|---------|
| SKU | text | Single line, 50 chars |
| Category | choice | Hardware, Software, Office Supplies, Equipment |
| Quantity | number | No decimals, min 0 |
| UnitCost | currency | en-US locale |
| Location | text | Single line, 100 chars |
| ReorderLevel | number | No decimals, min 0 |
| LastRestocked | dateTime | dateOnly format |
| InStock | boolean | Default true |

### 4. Display Results

After creation, display:
- List ID and web URL.
- Table of all columns with their names and types.
- Direct link to the list in SharePoint.
