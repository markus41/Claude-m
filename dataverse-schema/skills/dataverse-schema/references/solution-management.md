# Solution Management — Dataverse Web API

## Overview

Solutions are the packaging mechanism for Dataverse components. They enable ALM (Application Lifecycle Management) by bundling tables, columns, relationships, option sets, security roles, and other components for transport between environments. The solution lifecycle involves creating a solution, adding components, exporting, and importing.

---

## Solution Architecture

```
Publisher (defines prefix, option value prefix)
  └── Solution (container for components)
        ├── Table (entity)
        ├── Column (attribute)
        ├── Relationship
        ├── Option Set
        ├── Security Role
        ├── Plugin Assembly
        ├── Web Resource
        └── ... (50+ component types)
```

### Publisher

Every solution has a publisher that defines the schema name prefix and option value prefix. Create a publisher before creating a solution.

```
POST {environmentUrl}/api/data/v9.2/publishers
```

```json
{
  "uniquename": "contosoltd",
  "friendlyname": "Contoso Ltd",
  "description": "Publisher for Contoso solutions",
  "customizationprefix": "cr123",
  "customizationoptionvalueprefix": 10000
}
```

| Property | Description |
|----------|-------------|
| `uniquename` | Unique identifier for the publisher (lowercase, no spaces) |
| `friendlyname` | Display name |
| `customizationprefix` | 2-5 character prefix for all schema names |
| `customizationoptionvalueprefix` | 5-digit prefix for option set values (10000-99999) |

### Create a Solution

```
POST {environmentUrl}/api/data/v9.2/solutions
```

```json
{
  "uniquename": "ContosoProjectManagement",
  "friendlyname": "Contoso Project Management",
  "description": "Project management tables and configuration",
  "version": "1.0.0.0",
  "publisherid@odata.bind": "/publishers({publisherId})"
}
```

---

## Add Components to a Solution

### AddSolutionComponent Action

```
POST {environmentUrl}/api/data/v9.2/AddSolutionComponent
```

```json
{
  "ComponentId": "{componentGuid}",
  "ComponentType": 1,
  "SolutionUniqueName": "ContosoProjectManagement",
  "AddRequiredComponents": false,
  "DoNotIncludeSubcomponents": false
}
```

### Common ComponentType Values

| Value | Component Type |
|-------|----------------|
| `1` | Entity (Table) |
| `2` | Attribute (Column) |
| `3` | Relationship |
| `9` | Option Set |
| `10` | Entity Relationship |
| `20` | Security Role |
| `24` | Form |
| `25` | Organization Settings |
| `26` | View (SavedQuery) |
| `29` | Process (Workflow) |
| `59` | Saved Query Visualization (Chart) |
| `60` | System Form |
| `61` | Web Resource |
| `62` | Site Map |
| `63` | Connection Role |
| `65` | Assembly (Plugin) |
| `66` | Plugin Step |
| `91` | Plugin Type |
| `300` | Canvas App |
| `371` | Connector |

### Add with Required Components

Set `AddRequiredComponents: true` to automatically include components that the specified component depends on (e.g., if adding a view, it may require the underlying table).

### TypeScript Example

```typescript
interface AddComponentRequest {
  ComponentId: string;
  ComponentType: number;
  SolutionUniqueName: string;
  AddRequiredComponents: boolean;
  DoNotIncludeSubcomponents: boolean;
}

async function addSolutionComponent(
  envUrl: string,
  token: string,
  request: AddComponentRequest
): Promise<void> {
  const response = await fetch(`${envUrl}/api/data/v9.2/AddSolutionComponent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "OData-MaxVersion": "4.0",
      "OData-Version": "4.0",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to add component: ${JSON.stringify(error)}`);
  }
}
```

---

## Remove Components from a Solution

```
POST {environmentUrl}/api/data/v9.2/RemoveSolutionComponent
```

```json
{
  "ComponentId": "{componentGuid}",
  "ComponentType": 1,
  "SolutionUniqueName": "ContosoProjectManagement"
}
```

**Note:** Removing a component from a solution does NOT delete it from the environment. It only removes the association.

---

## Export a Solution

### ExportSolution Action

```
POST {environmentUrl}/api/data/v9.2/ExportSolution
```

```json
{
  "SolutionName": "ContosoProjectManagement",
  "Managed": false,
  "ExportAutoNumberingSettings": false,
  "ExportCalendarSettings": false,
  "ExportCustomizationSettings": false,
  "ExportEmailTrackingSettings": false,
  "ExportGeneralSettings": false,
  "ExportIsvConfig": false,
  "ExportMarketingSettings": false,
  "ExportOutlookSynchronizationSettings": false,
  "ExportRelationshipRoles": false,
  "ExportSales": false
}
```

### Response

The response contains a `ExportSolutionFile` property with the solution zip as a **base64-encoded string**.

```json
{
  "ExportSolutionFile": "UEsDBBQAAAAIAG1..."
}
```

### Managed vs Unmanaged

| Property | Managed (`true`) | Unmanaged (`false`) |
|----------|-------------------|---------------------|
| Customizable | No (locked) | Yes (editable) |
| Removable | Uninstall solution to remove all components | Components persist after solution delete |
| Use case | Distribution to test/prod | Development environment |
| Layering | Creates managed layer | Merges into active layer |

### TypeScript Example — Export

```typescript
interface ExportSolutionRequest {
  SolutionName: string;
  Managed: boolean;
  ExportAutoNumberingSettings?: boolean;
  ExportCalendarSettings?: boolean;
  ExportCustomizationSettings?: boolean;
  ExportEmailTrackingSettings?: boolean;
  ExportGeneralSettings?: boolean;
  ExportIsvConfig?: boolean;
  ExportMarketingSettings?: boolean;
  ExportOutlookSynchronizationSettings?: boolean;
  ExportRelationshipRoles?: boolean;
  ExportSales?: boolean;
}

interface ExportSolutionResponse {
  ExportSolutionFile: string; // base64
}

async function exportSolution(
  envUrl: string,
  token: string,
  solutionName: string,
  managed: boolean
): Promise<Buffer> {
  const request: ExportSolutionRequest = {
    SolutionName: solutionName,
    Managed: managed,
  };

  const response = await fetch(`${envUrl}/api/data/v9.2/ExportSolution`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "OData-MaxVersion": "4.0",
      "OData-Version": "4.0",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Export failed: ${JSON.stringify(error)}`);
  }

  const result: ExportSolutionResponse = await response.json();
  return Buffer.from(result.ExportSolutionFile, "base64");
}
```

---

## Import a Solution

### Synchronous Import

```
POST {environmentUrl}/api/data/v9.2/ImportSolution
```

```json
{
  "CustomizationFile": "UEsDBBQAAAAIAG1...",
  "OverwriteUnmanagedCustomizations": true,
  "PublishWorkflows": true,
  "ConvertToManaged": false,
  "SkipProductUpdateDependencies": false,
  "HoldingSolution": false
}
```

### Asynchronous Import (Recommended for Production)

```
POST {environmentUrl}/api/data/v9.2/ImportSolutionAsync
```

```json
{
  "CustomizationFile": "UEsDBBQAAAAIAG1...",
  "OverwriteUnmanagedCustomizations": true,
  "PublishWorkflows": true,
  "ConvertToManaged": false,
  "SkipProductUpdateDependencies": false,
  "HoldingSolution": false
}
```

Response returns an `AsyncOperationId`:
```json
{
  "AsyncOperationId": "00000000-0000-0000-0000-000000000000"
}
```

### Poll for Import Status

```
GET {environmentUrl}/api/data/v9.2/asyncoperations({asyncOperationId})?$select=statuscode,message
```

StatusCode values:
| Value | Meaning |
|-------|---------|
| `0` | Waiting for Resources |
| `10` | Waiting |
| `20` | In Progress |
| `21` | Pausing |
| `22` | Canceling |
| `30` | Succeeded |
| `31` | Failed |
| `32` | Canceled |

### TypeScript Example — Async Import with Polling

```typescript
async function importSolutionAsync(
  envUrl: string,
  token: string,
  solutionZipBase64: string,
  overwrite = true
): Promise<void> {
  const response = await fetch(`${envUrl}/api/data/v9.2/ImportSolutionAsync`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "OData-MaxVersion": "4.0",
      "OData-Version": "4.0",
    },
    body: JSON.stringify({
      CustomizationFile: solutionZipBase64,
      OverwriteUnmanagedCustomizations: overwrite,
      PublishWorkflows: true,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Import request failed: ${JSON.stringify(error)}`);
  }

  const result = await response.json();
  const asyncOpId: string = result.AsyncOperationId;

  // Poll until complete
  let status = 0;
  while (status < 30) {
    await new Promise((resolve) => setTimeout(resolve, 5000));

    const statusResponse = await fetch(
      `${envUrl}/api/data/v9.2/asyncoperations(${asyncOpId})?$select=statuscode,message`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "OData-MaxVersion": "4.0",
          "OData-Version": "4.0",
        },
      }
    );

    const statusResult = await statusResponse.json();
    status = statusResult.statuscode;

    if (status === 31) {
      throw new Error(`Import failed: ${statusResult.message}`);
    }
  }
}
```

---

## Solution Versioning

Solutions use a four-part version number: `MAJOR.MINOR.BUILD.REVISION`

| Segment | Convention |
|---------|-----------|
| MAJOR | Breaking schema changes |
| MINOR | New features/components |
| BUILD | Bug fixes, configuration changes |
| REVISION | Hotfix or patch number |

Update the version before export:

```
PATCH {environmentUrl}/api/data/v9.2/solutions({solutionId})
```

```json
{
  "version": "1.1.0.0"
}
```

---

## Solution Layering

Dataverse uses a layering system for component customization:

1. **System layer** — Base platform components (read-only)
2. **Managed layers** — Each imported managed solution creates a layer (stacked by import order)
3. **Unmanaged layer (Active)** — All unmanaged customizations

When multiple layers modify the same component, the **highest layer wins** (unmanaged > last imported managed > earlier managed > system).

### Key Layering Rules

- Managed solutions should be imported in dependency order
- The active (unmanaged) layer always takes precedence
- Removing a managed solution reveals the next layer's definition
- Use `SolutionHistories` entity to view import history

---

## Dependency Checking

Before removing components or deleting solutions, check dependencies:

```
POST {environmentUrl}/api/data/v9.2/RetrieveDependenciesForDelete
```

```json
{
  "ObjectId": "{componentGuid}",
  "ComponentType": 1
}
```

This returns a list of components that depend on the specified component. All dependencies must be resolved before the component can be removed.

### List Solution Components

```
GET {environmentUrl}/api/data/v9.2/solutioncomponents?$filter=_solutionid_value eq '{solutionId}'&$select=componenttype,objectid
```

---

## Publish Customizations

After modifying metadata (tables, columns, forms, views), publish the changes to make them effective:

### Publish All

```
POST {environmentUrl}/api/data/v9.2/PublishAllXml
```

No body required.

### Publish Specific Entity

```
POST {environmentUrl}/api/data/v9.2/PublishXml
```

```json
{
  "ParameterXml": "<importexportxml><entities><entity>cr123_projecttask</entity></entities></importexportxml>"
}
```

Publishing is required after metadata changes for them to appear in the UI and runtime. API data operations work immediately, but forms and views need a publish.
