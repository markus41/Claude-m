# Option Sets — Dataverse Web API

## Overview

Option sets (choices) define a fixed list of values for picklist columns. They come in two flavors: **global** (reusable across multiple tables) and **local** (scoped to a single table column). Each option has an integer value, a label, an optional description, and an optional color.

---

## Global Option Sets

Global option sets are standalone metadata objects that can be referenced by multiple columns across different tables. They are managed through the `GlobalOptionSetDefinitions` endpoint.

### Create a Global Option Set

```
POST {environmentUrl}/api/data/v9.2/GlobalOptionSetDefinitions
```

Headers:
```
Content-Type: application/json
MSCRM.SolutionUniqueName: {solutionUniqueName}
```

```json
{
  "@odata.type": "Microsoft.Dynamics.CRM.OptionSetMetadata",
  "Name": "cr123_taskstatus",
  "DisplayName": {
    "@odata.type": "Microsoft.Dynamics.CRM.Label",
    "LocalizedLabels": [
      { "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", "Label": "Task Status", "LanguageCode": 1033 }
    ]
  },
  "Description": {
    "@odata.type": "Microsoft.Dynamics.CRM.Label",
    "LocalizedLabels": [
      { "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", "Label": "Status tracking for tasks across all entities", "LanguageCode": 1033 }
    ]
  },
  "IsGlobal": true,
  "OptionSetType": "Picklist",
  "Options": [
    {
      "Value": 100000,
      "Label": { "@odata.type": "Microsoft.Dynamics.CRM.Label", "LocalizedLabels": [{ "Label": "Not Started", "LanguageCode": 1033 }] },
      "Description": { "@odata.type": "Microsoft.Dynamics.CRM.Label", "LocalizedLabels": [{ "Label": "Task has not been started", "LanguageCode": 1033 }] },
      "Color": "#cccccc"
    },
    {
      "Value": 100001,
      "Label": { "@odata.type": "Microsoft.Dynamics.CRM.Label", "LocalizedLabels": [{ "Label": "In Progress", "LanguageCode": 1033 }] },
      "Color": "#3498db"
    },
    {
      "Value": 100002,
      "Label": { "@odata.type": "Microsoft.Dynamics.CRM.Label", "LocalizedLabels": [{ "Label": "Completed", "LanguageCode": 1033 }] },
      "Color": "#2ecc71"
    },
    {
      "Value": 100003,
      "Label": { "@odata.type": "Microsoft.Dynamics.CRM.Label", "LocalizedLabels": [{ "Label": "Cancelled", "LanguageCode": 1033 }] },
      "Color": "#e74c3c"
    }
  ]
}
```

### Bind a Column to a Global Option Set

When creating a `PicklistAttributeMetadata` or `MultiSelectPicklistAttributeMetadata`, use `GlobalOptionSet@odata.bind` instead of inline `OptionSet`:

```json
{
  "@odata.type": "Microsoft.Dynamics.CRM.PicklistAttributeMetadata",
  "SchemaName": "cr123_Status",
  "DisplayName": {
    "@odata.type": "Microsoft.Dynamics.CRM.Label",
    "LocalizedLabels": [{ "Label": "Status", "LanguageCode": 1033 }]
  },
  "GlobalOptionSet@odata.bind": "/GlobalOptionSetDefinitions({optionSetId})"
}
```

You can also bind by name:
```json
{
  "GlobalOptionSet@odata.bind": "/GlobalOptionSetDefinitions(Name='cr123_taskstatus')"
}
```

### TypeScript Example — Create Global Option Set

```typescript
interface OptionDefinition {
  Value: number;
  Label: DataverseLabel;
  Description?: DataverseLabel;
  Color?: string;
}

interface GlobalOptionSetRequest {
  "@odata.type": "Microsoft.Dynamics.CRM.OptionSetMetadata";
  Name: string;
  DisplayName: DataverseLabel;
  Description?: DataverseLabel;
  IsGlobal: true;
  OptionSetType: "Picklist";
  Options: OptionDefinition[];
}

async function createGlobalOptionSet(
  envUrl: string,
  token: string,
  solutionName: string,
  optionSet: GlobalOptionSetRequest
): Promise<string> {
  const response = await fetch(`${envUrl}/api/data/v9.2/GlobalOptionSetDefinitions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "OData-MaxVersion": "4.0",
      "OData-Version": "4.0",
      "MSCRM.SolutionUniqueName": solutionName,
    },
    body: JSON.stringify(optionSet),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to create global option set: ${JSON.stringify(error)}`);
  }

  return response.headers.get("OData-EntityId") ?? "";
}
```

---

## Local Option Sets

Local option sets are created inline with the column definition. They are scoped to that single column and cannot be reused.

### Create a Column with Local Option Set

```json
{
  "@odata.type": "Microsoft.Dynamics.CRM.PicklistAttributeMetadata",
  "SchemaName": "cr123_Priority",
  "DisplayName": {
    "@odata.type": "Microsoft.Dynamics.CRM.Label",
    "LocalizedLabels": [{ "Label": "Priority", "LanguageCode": 1033 }]
  },
  "DefaultFormValue": -1,
  "OptionSet": {
    "@odata.type": "Microsoft.Dynamics.CRM.OptionSetMetadata",
    "IsGlobal": false,
    "OptionSetType": "Picklist",
    "Options": [
      { "Value": 100000, "Label": { "@odata.type": "Microsoft.Dynamics.CRM.Label", "LocalizedLabels": [{ "Label": "Low", "LanguageCode": 1033 }] } },
      { "Value": 100001, "Label": { "@odata.type": "Microsoft.Dynamics.CRM.Label", "LocalizedLabels": [{ "Label": "Medium", "LanguageCode": 1033 }] } },
      { "Value": 100002, "Label": { "@odata.type": "Microsoft.Dynamics.CRM.Label", "LocalizedLabels": [{ "Label": "High", "LanguageCode": 1033 }] } }
    ]
  }
}
```

---

## Add an Option to an Existing Option Set

### Global Option Set

```
POST {environmentUrl}/api/data/v9.2/InsertOptionValue
```

```json
{
  "OptionSetName": "cr123_taskstatus",
  "Value": 100004,
  "Label": {
    "@odata.type": "Microsoft.Dynamics.CRM.Label",
    "LocalizedLabels": [
      { "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", "Label": "On Hold", "LanguageCode": 1033 }
    ]
  },
  "SolutionUniqueName": "YourSolutionName"
}
```

### Local Option Set (Table-Scoped)

```
POST {environmentUrl}/api/data/v9.2/InsertOptionValue
```

```json
{
  "EntityLogicalName": "cr123_projecttask",
  "AttributeLogicalName": "cr123_priority",
  "Value": 100003,
  "Label": {
    "@odata.type": "Microsoft.Dynamics.CRM.Label",
    "LocalizedLabels": [
      { "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", "Label": "Critical", "LanguageCode": 1033 }
    ]
  },
  "SolutionUniqueName": "YourSolutionName"
}
```

---

## Reorder Options

Change the display order of options:

```
POST {environmentUrl}/api/data/v9.2/OrderOption
```

### For Global Option Set

```json
{
  "OptionSetName": "cr123_taskstatus",
  "Values": [100000, 100001, 100004, 100002, 100003],
  "SolutionUniqueName": "YourSolutionName"
}
```

### For Local Option Set

```json
{
  "EntityLogicalName": "cr123_projecttask",
  "AttributeLogicalName": "cr123_priority",
  "Values": [100002, 100001, 100000],
  "SolutionUniqueName": "YourSolutionName"
}
```

The `Values` array defines the new display order (first value shown at top).

---

## Update an Option Label

```
POST {environmentUrl}/api/data/v9.2/UpdateOptionValue
```

```json
{
  "OptionSetName": "cr123_taskstatus",
  "Value": 100001,
  "Label": {
    "@odata.type": "Microsoft.Dynamics.CRM.Label",
    "LocalizedLabels": [
      { "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", "Label": "Work In Progress", "LanguageCode": 1033 }
    ]
  },
  "SolutionUniqueName": "YourSolutionName"
}
```

For local option sets, include `EntityLogicalName` and `AttributeLogicalName` instead of `OptionSetName`.

---

## Delete an Option

```
POST {environmentUrl}/api/data/v9.2/DeleteOptionValue
```

```json
{
  "OptionSetName": "cr123_taskstatus",
  "Value": 100003
}
```

### Considerations Before Deleting

1. **Existing data** — Records with the deleted option value will still retain the integer but the label will show as empty or the raw number
2. **Flows and plugins** — Automation that references the option value by number will continue to work but may produce unexpected results
3. **Views and charts** — Filters based on the deleted option will stop matching
4. **Prefer retirement** — Instead of deleting, consider adding a prefix like "[Retired]" to the label and moving it to the bottom of the order

---

## Status and Status Reason Special Option Sets

Every table has two system option sets:

### StateCode (Status)

- `0` = Active
- `1` = Inactive

The `statecode` column is a state option set that typically has exactly two values. You cannot add new state values through the API.

### StatusCode (Status Reason)

Each state has associated status reason values. You can add custom status reasons:

```
POST {environmentUrl}/api/data/v9.2/InsertStatusValue
```

```json
{
  "EntityLogicalName": "cr123_projecttask",
  "Value": 100000,
  "Label": {
    "@odata.type": "Microsoft.Dynamics.CRM.Label",
    "LocalizedLabels": [
      { "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", "Label": "Awaiting Approval", "LanguageCode": 1033 }
    ]
  },
  "StateCode": 0,
  "SolutionUniqueName": "YourSolutionName"
}
```

The `StateCode` parameter ties the status reason to either Active (0) or Inactive (1).

Default status reasons:
- Active state: `1` (Active)
- Inactive state: `2` (Inactive)

---

## Best Practices

### Value Numbering
- Start custom option values at **100000** (or your publisher's option value prefix)
- Leave gaps between values for future insertions (e.g., 100000, 100010, 100020)
- Never reuse deleted option values — it causes data integrity confusion
- Publisher prefix automatically applies to option values when created within a solution context

### Global vs Local Decision
- **Use global** when the same set of choices applies across multiple tables (e.g., status, priority, country)
- **Use local** when the choices are specific to one table/column (e.g., "Project Phase" unique to the Project table)
- Global option sets are easier to maintain centrally but harder to customize per-table

### Color Assignment
- Colors are optional and used in charts and the modern UI
- Use hex format: `"#3498db"`
- Assign meaningful colors that match the option semantics (e.g., green for success, red for error)

### Localization
- Always provide `LanguageCode: 1033` (English) as the base
- Add additional localized labels for multi-language environments:
  ```json
  "LocalizedLabels": [
    { "Label": "High", "LanguageCode": 1033 },
    { "Label": "Hoch", "LanguageCode": 1031 },
    { "Label": "Haut", "LanguageCode": 1036 }
  ]
  ```

### Retrieve Option Set Metadata

```
GET {environmentUrl}/api/data/v9.2/GlobalOptionSetDefinitions(Name='cr123_taskstatus')
```

For local option sets:
```
GET {environmentUrl}/api/data/v9.2/EntityDefinitions(LogicalName='cr123_projecttask')/Attributes(LogicalName='cr123_priority')/Microsoft.Dynamics.CRM.PicklistAttributeMetadata?$expand=OptionSet
```
