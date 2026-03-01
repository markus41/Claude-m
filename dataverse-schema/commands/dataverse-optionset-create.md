---
name: dataverse-optionset-create
description: Create a global or local option set (choice column) in Dataverse
argument-hint: "<name> <options...>"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Grep
  - Glob
---

# Create a Dataverse Option Set

You are creating an option set (choice/picklist) in Dataverse. Follow these steps:

## Step 1: Gather Requirements

Ask the user for the following if not already provided:
- **Option set name** (display name, e.g., "Task Priority")
- **Options**: List of choices with labels (values will be auto-assigned if not specified)
- **Global or Local**:
  - Global: Reusable across multiple tables
  - Local: Scoped to a single table column
- **Publisher prefix** (e.g., `cr123`)
- **Solution unique name**

### For local option sets, also ask:
- **Target table** logical name
- **Column display name** for the picklist column

### Optional:
- **Colors** for each option (hex format)
- **Default value** (which option is selected by default, or -1 for none)
- **Multi-select?** (single choice vs multi-select)

## Step 2: Determine Global vs Local

If the user is unsure:
- **Use global** when the same choices will appear on multiple tables (e.g., priority levels, status, country)
- **Use local** when the choices are specific to one context only

## Step 3: Assign Option Values

If the user did not specify integer values:
- Start at `100000` (standard convention for custom option values)
- Increment by `1` for each option: 100000, 100001, 100002, etc.
- Leave no gaps initially (gaps can be added later when inserting between existing options)

## Step 4: Generate the API Payload

### For Global Option Set:

Generate a `POST {envUrl}/api/data/v9.2/GlobalOptionSetDefinitions` payload with:
- `@odata.type`: `Microsoft.Dynamics.CRM.OptionSetMetadata`
- `Name`: schema name with prefix (lowercase, e.g., `cr123_taskpriority`)
- `DisplayName`: Localized label
- `IsGlobal`: `true`
- `OptionSetType`: `Picklist`
- `Options`: Array with Value, Label, optional Color for each

### For Local Option Set (as part of a column):

Generate a `POST {envUrl}/api/data/v9.2/EntityDefinitions(LogicalName='{table}')/Attributes` payload with:
- `@odata.type`: `Microsoft.Dynamics.CRM.PicklistAttributeMetadata` (or `MultiSelectPicklistAttributeMetadata`)
- `SchemaName`: PascalCase with prefix
- `DisplayName`: Localized label
- `DefaultFormValue`: specified default or `-1`
- `OptionSet` (inline): with `IsGlobal: false` and Options array

### For column using existing global option set:

Generate a column payload that uses `GlobalOptionSet@odata.bind` instead of inline `OptionSet`.

## Step 5: Generate TypeScript Code

Generate a TypeScript function that:
- Creates the option set (global or as part of a column)
- Includes the `MSCRM.SolutionUniqueName` header
- Has proper type interfaces
- Includes error handling
- If global: also generates a follow-up column creation that binds to the global option set

## Step 6: Output

Present to the user:
1. The JSON payload
2. The TypeScript implementation
3. Table showing all options with their integer values, labels, and colors
4. If global: instructions for binding the option set to table columns
5. Note about option value numbering convention
