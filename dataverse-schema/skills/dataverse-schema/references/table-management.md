# Table Management — Dataverse Web API

## Overview

Tables (entities) are the primary schema objects in Dataverse. Every table has system-generated columns (like `createdon`, `modifiedon`, `ownerid`, `statecode`, `statuscode`) plus a required primary name attribute. Tables are managed through the `EntityDefinitions` endpoint of the Web API v9.2.

---

## Create a Custom Table

### Endpoint

```
POST {environmentUrl}/api/data/v9.2/EntityDefinitions
```

### Required Headers

```
Content-Type: application/json
OData-MaxVersion: 4.0
OData-Version: 4.0
MSCRM.SolutionUniqueName: {solutionUniqueName}
```

The `MSCRM.SolutionUniqueName` header ensures the table is added to the specified solution upon creation.

### Complete POST Body

```json
{
  "@odata.type": "Microsoft.Dynamics.CRM.EntityMetadata",
  "SchemaName": "cr123_ProjectTask",
  "DisplayName": {
    "@odata.type": "Microsoft.Dynamics.CRM.Label",
    "LocalizedLabels": [
      {
        "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel",
        "Label": "Project Task",
        "LanguageCode": 1033
      }
    ]
  },
  "DisplayCollectionName": {
    "@odata.type": "Microsoft.Dynamics.CRM.Label",
    "LocalizedLabels": [
      {
        "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel",
        "Label": "Project Tasks",
        "LanguageCode": 1033
      }
    ]
  },
  "Description": {
    "@odata.type": "Microsoft.Dynamics.CRM.Label",
    "LocalizedLabels": [
      {
        "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel",
        "Label": "Tracks individual tasks within a project",
        "LanguageCode": 1033
      }
    ]
  },
  "OwnershipType": "UserOwned",
  "IsActivity": false,
  "HasActivities": false,
  "HasNotes": true,
  "ChangeTrackingEnabled": true,
  "IsAuditEnabled": {
    "Value": true,
    "CanBeChanged": true
  },
  "PrimaryNameAttribute": "cr123_name",
  "Attributes": [
    {
      "@odata.type": "Microsoft.Dynamics.CRM.StringAttributeMetadata",
      "SchemaName": "cr123_Name",
      "DisplayName": {
        "@odata.type": "Microsoft.Dynamics.CRM.Label",
        "LocalizedLabels": [
          {
            "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel",
            "Label": "Name",
            "LanguageCode": 1033
          }
        ]
      },
      "Description": {
        "@odata.type": "Microsoft.Dynamics.CRM.Label",
        "LocalizedLabels": [
          {
            "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel",
            "Label": "Primary name of the project task",
            "LanguageCode": 1033
          }
        ]
      },
      "IsPrimaryName": true,
      "RequiredLevel": {
        "Value": "ApplicationRequired",
        "CanBeChanged": true
      },
      "MaxLength": 200,
      "FormatName": {
        "Value": "Text"
      }
    }
  ]
}
```

### Table Properties Reference

| Property | Type | Description |
|----------|------|-------------|
| `SchemaName` | string | PascalCase name with publisher prefix. Becomes the logical name (lowercase). |
| `DisplayName` | Label | User-visible name in the UI. |
| `DisplayCollectionName` | Label | Plural display name. |
| `Description` | Label | Description shown in metadata viewers. |
| `OwnershipType` | enum | `UserOwned` — records owned by users/teams with security roles; `OrganizationOwned` — all users have the same access. |
| `IsActivity` | bool | If `true`, creates an activity table (inherits from ActivityPointer). |
| `HasActivities` | bool | If `true`, enables activity association (emails, appointments, etc.). |
| `HasNotes` | bool | If `true`, enables Notes (annotations) on records. |
| `ChangeTrackingEnabled` | bool | Enable delta sync support. Required for integration scenarios. |
| `IsAuditEnabled` | ManagedProperty | Enable field-level auditing. |
| `PrimaryNameAttribute` | string | Logical name of the primary name column (must match an attribute in the Attributes array). |
| `IconSmallName` | string | Name of web resource for the 16x16 icon. |
| `IconMediumName` | string | Name of web resource for the 32x32 icon. |
| `IconLargeName` | string | Name of web resource for the 48x48 icon. |
| `IsQuickCreateEnabled` | bool | Allow quick-create forms. |
| `IsReadingPaneEnabled` | bool | Enable reading pane in lists. |

### TypeScript Example — Create Table

```typescript
interface DataverseLabel {
  "@odata.type": "Microsoft.Dynamics.CRM.Label";
  LocalizedLabels: Array<{
    "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel";
    Label: string;
    LanguageCode: number;
  }>;
}

interface CreateTableRequest {
  "@odata.type": "Microsoft.Dynamics.CRM.EntityMetadata";
  SchemaName: string;
  DisplayName: DataverseLabel;
  DisplayCollectionName: DataverseLabel;
  Description: DataverseLabel;
  OwnershipType: "UserOwned" | "OrganizationOwned";
  PrimaryNameAttribute: string;
  HasActivities?: boolean;
  HasNotes?: boolean;
  ChangeTrackingEnabled?: boolean;
  IsAuditEnabled?: { Value: boolean; CanBeChanged: boolean };
  Attributes: Array<Record<string, unknown>>;
}

function makeLabel(text: string, languageCode = 1033): DataverseLabel {
  return {
    "@odata.type": "Microsoft.Dynamics.CRM.Label",
    LocalizedLabels: [
      {
        "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel",
        Label: text,
        LanguageCode: languageCode,
      },
    ],
  };
}

async function createTable(
  envUrl: string,
  token: string,
  solutionName: string,
  request: CreateTableRequest
): Promise<string> {
  const response = await fetch(`${envUrl}/api/data/v9.2/EntityDefinitions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "OData-MaxVersion": "4.0",
      "OData-Version": "4.0",
      "MSCRM.SolutionUniqueName": solutionName,
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to create table: ${JSON.stringify(error)}`);
  }

  const entityId = response.headers.get("OData-EntityId");
  return entityId ?? "";
}
```

---

## Modify a Table

### Endpoint

```
PATCH {environmentUrl}/api/data/v9.2/EntityDefinitions(LogicalName='{logicalName}')
```

You can update any writable property. Send only the properties you want to change.

```json
{
  "@odata.type": "Microsoft.Dynamics.CRM.EntityMetadata",
  "HasActivities": true,
  "ChangeTrackingEnabled": true,
  "IsAuditEnabled": {
    "Value": true,
    "CanBeChanged": true
  },
  "Description": {
    "@odata.type": "Microsoft.Dynamics.CRM.Label",
    "LocalizedLabels": [
      {
        "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel",
        "Label": "Updated description for the table",
        "LanguageCode": 1033
      }
    ]
  }
}
```

### TypeScript Example — Update Table

```typescript
async function updateTable(
  envUrl: string,
  token: string,
  logicalName: string,
  updates: Partial<CreateTableRequest>
): Promise<void> {
  const body = {
    "@odata.type": "Microsoft.Dynamics.CRM.EntityMetadata",
    ...updates,
  };

  const response = await fetch(
    `${envUrl}/api/data/v9.2/EntityDefinitions(LogicalName='${logicalName}')`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to update table: ${JSON.stringify(error)}`);
  }
}
```

---

## Delete a Table

### Endpoint

```
DELETE {environmentUrl}/api/data/v9.2/EntityDefinitions(LogicalName='{logicalName}')
```

### Considerations Before Deleting

1. **Data loss** — All records in the table are permanently deleted
2. **Dependent components** — Relationships, views, forms, flows, and plugins that reference the table will break
3. **Solution dependencies** — The table may be required by other solutions in the environment
4. **Managed tables** — Cannot delete tables from managed solutions; you must uninstall the solution

### Dependency Check Before Delete

```
GET {environmentUrl}/api/data/v9.2/EntityDefinitions(LogicalName='{logicalName}')/Microsoft.Dynamics.CRM.RetrieveDependenciesForDelete()
```

### TypeScript Example — Delete Table

```typescript
interface DependencyResult {
  value: Array<{
    dependentcomponentobjectid: string;
    dependentcomponenttype: number;
    requiredcomponentobjectid: string;
  }>;
}

async function deleteTable(
  envUrl: string,
  token: string,
  logicalName: string,
  force = false
): Promise<void> {
  // Check dependencies first
  if (!force) {
    const depResponse = await fetch(
      `${envUrl}/api/data/v9.2/EntityDefinitions(LogicalName='${logicalName}')/Microsoft.Dynamics.CRM.RetrieveDependenciesForDelete()`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "OData-MaxVersion": "4.0",
          "OData-Version": "4.0",
        },
      }
    );
    const deps: DependencyResult = await depResponse.json();
    if (deps.value.length > 0) {
      throw new Error(
        `Table has ${deps.value.length} dependencies. Remove them first or use force=true.`
      );
    }
  }

  const response = await fetch(
    `${envUrl}/api/data/v9.2/EntityDefinitions(LogicalName='${logicalName}')`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to delete table: ${JSON.stringify(error)}`);
  }
}
```

---

## Alternate Keys

Alternate keys enable you to look up records by business keys instead of GUIDs.

### Create an Alternate Key

```
POST {environmentUrl}/api/data/v9.2/EntityDefinitions(LogicalName='{logicalName}')/Keys
```

```json
{
  "SchemaName": "cr123_ExternalIdKey",
  "DisplayName": {
    "@odata.type": "Microsoft.Dynamics.CRM.Label",
    "LocalizedLabels": [
      { "Label": "External ID Key", "LanguageCode": 1033 }
    ]
  },
  "KeyAttributes": ["cr123_externalid"]
}
```

Composite keys use multiple columns:

```json
{
  "SchemaName": "cr123_ProjectTaskKey",
  "DisplayName": {
    "@odata.type": "Microsoft.Dynamics.CRM.Label",
    "LocalizedLabels": [
      { "Label": "Project-Task Composite Key", "LanguageCode": 1033 }
    ]
  },
  "KeyAttributes": ["cr123_projectid", "cr123_tasknumber"]
}
```

**Usage in API calls:** Once the key is active, use it for lookups:
```
GET {environmentUrl}/api/data/v9.2/cr123_projecttasks(cr123_externalid='EXT-001')
```

**Supported column types for keys:** String, Integer, Decimal, Lookup, DateTime, Picklist.

---

## Table Types

### Standard Tables
Regular custom tables for storing business data. Created with the standard `EntityDefinitions` POST.

### Activity Tables
Tables that inherit from `ActivityPointer`. Set `IsActivity: true` during creation. Activity tables automatically get Subject, Description, RegardingObjectId, and scheduling columns. They appear in the activity timeline on related records.

```json
{
  "@odata.type": "Microsoft.Dynamics.CRM.EntityMetadata",
  "SchemaName": "cr123_CustomVisit",
  "IsActivity": true,
  "OwnershipType": "UserOwned",
  ...
}
```

### Virtual Tables (External)
Virtual tables connect to external data sources without importing data into Dataverse. They are read-only by default (some providers support write). Configuration involves a Data Source entity and a Virtual Entity Data Provider.

Virtual tables are typically created through the UI or via solution import rather than direct API calls, as they require a data provider plugin.

### Elastic Tables
High-performance tables backed by Azure Cosmos DB. Suitable for high-volume, low-latency scenarios (IoT telemetry, log data). Created by setting `TableType` to `Elastic` and `SchemaName` must use the `EntityMetadata` type.

Elastic tables have different behavior: no calculated/rollup columns, no auditing, no Relevance Search, limited relationship support.

---

## Managed Properties

Managed properties control what consumers of your managed solution can customize:

| Property | Description |
|----------|-------------|
| `CanModifyAdditionalSettings` | Can consumer change misc settings |
| `CanModifyDisplayName` | Can consumer rename the table |
| `CanCreateAttributes` | Can consumer add columns |
| `CanCreateForms` | Can consumer create forms |
| `CanCreateViews` | Can consumer create views |
| `CanCreateCharts` | Can consumer create charts |
| `CanBeRelatedEntityInRelationship` | Can consumer create relationships to this table |
| `CanBePrimaryEntityInRelationship` | Can consumer create relationships from this table |
| `CanBeInManyToMany` | Can consumer create N:N relationships |

Set these when building managed solutions for distribution:

```json
{
  "@odata.type": "Microsoft.Dynamics.CRM.EntityMetadata",
  "CanCreateAttributes": { "Value": true, "CanBeChanged": false },
  "CanCreateForms": { "Value": true, "CanBeChanged": true },
  "CanModifyAdditionalSettings": { "Value": false, "CanBeChanged": false }
}
```

---

## PAC CLI Alternatives

The Power Platform CLI (`pac`) provides command-line alternatives:

```bash
# Create table (via solution project)
pac solution init --publisher-name contoso --publisher-prefix cr123
pac solution add-reference --path ./table-definition

# List tables in environment
pac org who  # verify connection
pac table list

# Export table metadata
pac modelbuilder build
```

For automation, the Web API is preferred over PAC CLI as it provides more granular control and can be called from any language or platform.
