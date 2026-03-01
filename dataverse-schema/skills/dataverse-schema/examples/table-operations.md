# Table Operations — Complete Examples

## Prerequisites

All examples assume the following helper types and authentication setup:

```typescript
// --- Shared types and helpers ---

interface DataverseLabel {
  "@odata.type": "Microsoft.Dynamics.CRM.Label";
  LocalizedLabels: Array<{
    "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel";
    Label: string;
    LanguageCode: number;
  }>;
}

interface DataverseConfig {
  envUrl: string;
  token: string;
  solutionName: string;
  prefix: string; // e.g., "cr123"
}

function label(text: string, lang = 1033): DataverseLabel {
  return {
    "@odata.type": "Microsoft.Dynamics.CRM.Label",
    LocalizedLabels: [
      {
        "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel",
        Label: text,
        LanguageCode: lang,
      },
    ],
  };
}

async function apiRequest<T>(
  config: DataverseConfig,
  method: string,
  path: string,
  body?: Record<string, unknown>,
  extraHeaders?: Record<string, string>
): Promise<T> {
  const response = await fetch(`${config.envUrl}/api/data/v9.2/${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.token}`,
      "OData-MaxVersion": "4.0",
      "OData-Version": "4.0",
      "MSCRM.SolutionUniqueName": config.solutionName,
      ...extraHeaders,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`${method} ${path} failed: ${JSON.stringify(error)}`);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json() as Promise<T>;
}
```

---

## Example 1: Create a Custom Table with Primary Name Column

Create a "Project" table with UserOwned ownership, notes enabled, and change tracking.

```typescript
async function createProjectTable(config: DataverseConfig): Promise<void> {
  const tableDefinition = {
    "@odata.type": "Microsoft.Dynamics.CRM.EntityMetadata",
    SchemaName: `${config.prefix}_Project`,
    DisplayName: label("Project"),
    DisplayCollectionName: label("Projects"),
    Description: label("Tracks project information including timeline and budget"),
    OwnershipType: "UserOwned",
    HasActivities: true,
    HasNotes: true,
    ChangeTrackingEnabled: true,
    IsAuditEnabled: {
      Value: true,
      CanBeChanged: true,
    },
    PrimaryNameAttribute: `${config.prefix}_name`,
    Attributes: [
      {
        "@odata.type": "Microsoft.Dynamics.CRM.StringAttributeMetadata",
        SchemaName: `${config.prefix}_Name`,
        DisplayName: label("Project Name"),
        Description: label("The name of the project"),
        IsPrimaryName: true,
        RequiredLevel: {
          Value: "ApplicationRequired",
          CanBeChanged: true,
        },
        MaxLength: 200,
        FormatName: { Value: "Text" },
      },
    ],
  };

  await apiRequest(config, "POST", "EntityDefinitions", tableDefinition);
  console.log("Project table created successfully.");
}
```

---

## Example 2: Add Multiple Columns of Different Types

Add a variety of columns to the Project table: description, start date, budget, status choice, and email.

```typescript
interface ColumnDefinition {
  "@odata.type": string;
  SchemaName: string;
  DisplayName: DataverseLabel;
  Description: DataverseLabel;
  RequiredLevel?: { Value: string };
  [key: string]: unknown;
}

async function addProjectColumns(config: DataverseConfig): Promise<void> {
  const tableName = `${config.prefix}_project`;

  const columns: ColumnDefinition[] = [
    // Multi-line description
    {
      "@odata.type": "Microsoft.Dynamics.CRM.StringAttributeMetadata",
      SchemaName: `${config.prefix}_Description`,
      DisplayName: label("Description"),
      Description: label("Detailed description of the project"),
      MaxLength: 10000,
      FormatName: { Value: "TextArea" },
    },
    // Start date
    {
      "@odata.type": "Microsoft.Dynamics.CRM.DateTimeAttributeMetadata",
      SchemaName: `${config.prefix}_StartDate`,
      DisplayName: label("Start Date"),
      Description: label("Planned start date of the project"),
      Format: "DateOnly",
      DateTimeBehavior: { Value: "DateOnly" },
      RequiredLevel: { Value: "Recommended" },
    },
    // End date
    {
      "@odata.type": "Microsoft.Dynamics.CRM.DateTimeAttributeMetadata",
      SchemaName: `${config.prefix}_EndDate`,
      DisplayName: label("End Date"),
      Description: label("Planned end date of the project"),
      Format: "DateOnly",
      DateTimeBehavior: { Value: "DateOnly" },
    },
    // Budget (currency)
    {
      "@odata.type": "Microsoft.Dynamics.CRM.MoneyAttributeMetadata",
      SchemaName: `${config.prefix}_Budget`,
      DisplayName: label("Budget"),
      Description: label("Total budget allocated for the project"),
      Precision: 2,
      PrecisionSource: 2,
      MinValue: 0.0,
      MaxValue: 999999999.99,
    },
    // Progress percentage (integer)
    {
      "@odata.type": "Microsoft.Dynamics.CRM.IntegerAttributeMetadata",
      SchemaName: `${config.prefix}_ProgressPercent`,
      DisplayName: label("Progress (%)"),
      Description: label("Current completion percentage"),
      MinValue: 0,
      MaxValue: 100,
      Format: "None",
    },
    // Priority choice (local option set)
    {
      "@odata.type": "Microsoft.Dynamics.CRM.PicklistAttributeMetadata",
      SchemaName: `${config.prefix}_Priority`,
      DisplayName: label("Priority"),
      Description: label("Project priority level"),
      DefaultFormValue: 100001,
      OptionSet: {
        "@odata.type": "Microsoft.Dynamics.CRM.OptionSetMetadata",
        IsGlobal: false,
        OptionSetType: "Picklist",
        Options: [
          { Value: 100000, Label: label("Low"), Color: "#2ecc71" },
          { Value: 100001, Label: label("Medium"), Color: "#f39c12" },
          { Value: 100002, Label: label("High"), Color: "#e67e22" },
          { Value: 100003, Label: label("Critical"), Color: "#e74c3c" },
        ],
      },
    },
    // Project manager email
    {
      "@odata.type": "Microsoft.Dynamics.CRM.StringAttributeMetadata",
      SchemaName: `${config.prefix}_ManagerEmail`,
      DisplayName: label("Manager Email"),
      Description: label("Email address of the project manager"),
      MaxLength: 320,
      FormatName: { Value: "Email" },
    },
    // Is Active boolean
    {
      "@odata.type": "Microsoft.Dynamics.CRM.BooleanAttributeMetadata",
      SchemaName: `${config.prefix}_IsOnTrack`,
      DisplayName: label("On Track"),
      Description: label("Whether the project is currently on track"),
      DefaultValue: true,
      OptionSet: {
        "@odata.type": "Microsoft.Dynamics.CRM.BooleanOptionSetMetadata",
        TrueOption: { Value: 1, Label: label("Yes") },
        FalseOption: { Value: 0, Label: label("No") },
      },
    },
  ];

  for (const column of columns) {
    await apiRequest(
      config,
      "POST",
      `EntityDefinitions(LogicalName='${tableName}')/Attributes`,
      column
    );
    console.log(`Column ${column.SchemaName} created.`);
  }
}
```

---

## Example 3: Create a Table with Auto-Number Column

Create an "Invoice" table with an auto-generated invoice number.

```typescript
async function createInvoiceTable(config: DataverseConfig): Promise<void> {
  const tableDefinition = {
    "@odata.type": "Microsoft.Dynamics.CRM.EntityMetadata",
    SchemaName: `${config.prefix}_Invoice`,
    DisplayName: label("Invoice"),
    DisplayCollectionName: label("Invoices"),
    Description: label("Customer invoices with auto-generated invoice numbers"),
    OwnershipType: "UserOwned",
    HasNotes: true,
    PrimaryNameAttribute: `${config.prefix}_invoicenumber`,
    Attributes: [
      {
        "@odata.type": "Microsoft.Dynamics.CRM.StringAttributeMetadata",
        SchemaName: `${config.prefix}_InvoiceNumber`,
        DisplayName: label("Invoice Number"),
        Description: label("Auto-generated unique invoice number"),
        IsPrimaryName: true,
        RequiredLevel: { Value: "ApplicationRequired" },
        MaxLength: 100,
        FormatName: { Value: "Text" },
        AutoNumberFormat: "INV-{SEQNUM:6}-{RANDSTRING:4}",
      },
    ],
  };

  await apiRequest(config, "POST", "EntityDefinitions", tableDefinition);
  console.log("Invoice table with auto-number created.");

  // Add additional columns
  const amountColumn = {
    "@odata.type": "Microsoft.Dynamics.CRM.MoneyAttributeMetadata",
    SchemaName: `${config.prefix}_TotalAmount`,
    DisplayName: label("Total Amount"),
    Description: label("Total invoice amount"),
    Precision: 2,
    PrecisionSource: 2,
    MinValue: 0.0,
    MaxValue: 999999999.99,
    RequiredLevel: { Value: "ApplicationRequired" },
  };

  const dueDateColumn = {
    "@odata.type": "Microsoft.Dynamics.CRM.DateTimeAttributeMetadata",
    SchemaName: `${config.prefix}_DueDate`,
    DisplayName: label("Due Date"),
    Description: label("Payment due date"),
    Format: "DateOnly",
    DateTimeBehavior: { Value: "DateOnly" },
  };

  const tableName = `${config.prefix}_invoice`;
  await apiRequest(config, "POST", `EntityDefinitions(LogicalName='${tableName}')/Attributes`, amountColumn);
  await apiRequest(config, "POST", `EntityDefinitions(LogicalName='${tableName}')/Attributes`, dueDateColumn);
  console.log("Invoice columns added.");
}
```

---

## Example 4: Modify Table Properties

Enable auditing and change tracking on an existing table, and update the description.

```typescript
async function enableAuditingAndChangeTracking(
  config: DataverseConfig,
  tableName: string
): Promise<void> {
  const updates = {
    "@odata.type": "Microsoft.Dynamics.CRM.EntityMetadata",
    ChangeTrackingEnabled: true,
    IsAuditEnabled: {
      Value: true,
      CanBeChanged: true,
    },
    HasActivities: true,
    Description: label("Updated: auditing and change tracking now enabled"),
  };

  await apiRequest(
    config,
    "PATCH",
    `EntityDefinitions(LogicalName='${tableName}')`,
    updates
  );

  // Publish the changes
  await apiRequest(config, "POST", "PublishXml", {
    ParameterXml: `<importexportxml><entities><entity>${tableName}</entity></entities></importexportxml>`,
  });

  console.log(`Table ${tableName} updated and published.`);
}
```

---

## Example 5: Delete Table with Dependency Check

Safely delete a table after checking for dependent components.

```typescript
interface Dependency {
  dependentcomponentobjectid: string;
  dependentcomponenttype: number;
  requiredcomponentobjectid: string;
  requiredcomponenttype: number;
}

interface DependencyResponse {
  value: Dependency[];
}

const COMPONENT_TYPE_NAMES: Record<number, string> = {
  1: "Entity",
  2: "Attribute",
  3: "Relationship",
  9: "OptionSet",
  10: "EntityRelationship",
  24: "Form",
  26: "View",
  29: "Workflow",
  60: "SystemForm",
  61: "WebResource",
  300: "CanvasApp",
};

async function safeDeleteTable(
  config: DataverseConfig,
  tableName: string
): Promise<void> {
  // Step 1: Get table metadata ID
  const metadata = await apiRequest<{ MetadataId: string }>(
    config,
    "GET",
    `EntityDefinitions(LogicalName='${tableName}')?$select=MetadataId`
  );

  // Step 2: Check dependencies
  const deps = await apiRequest<DependencyResponse>(
    config,
    "GET",
    `EntityDefinitions(LogicalName='${tableName}')/Microsoft.Dynamics.CRM.RetrieveDependenciesForDelete()`
  );

  if (deps.value.length > 0) {
    console.log(`Cannot delete ${tableName}. Dependencies found:`);
    for (const dep of deps.value) {
      const typeName = COMPONENT_TYPE_NAMES[dep.dependentcomponenttype] ?? `Type ${dep.dependentcomponenttype}`;
      console.log(`  - ${typeName}: ${dep.dependentcomponentobjectid}`);
    }
    throw new Error(`Table has ${deps.value.length} dependencies. Resolve them first.`);
  }

  // Step 3: Delete the table
  await apiRequest(
    config,
    "DELETE",
    `EntityDefinitions(LogicalName='${tableName}')`
  );

  console.log(`Table ${tableName} deleted successfully.`);
}
```

---

## Example 6: Create an Activity Table

Create a custom activity table for tracking site visits.

```typescript
async function createSiteVisitActivity(config: DataverseConfig): Promise<void> {
  const tableDefinition = {
    "@odata.type": "Microsoft.Dynamics.CRM.EntityMetadata",
    SchemaName: `${config.prefix}_SiteVisit`,
    DisplayName: label("Site Visit"),
    DisplayCollectionName: label("Site Visits"),
    Description: label("Tracks on-site customer visits as activities"),
    OwnershipType: "UserOwned",
    IsActivity: true,
    PrimaryNameAttribute: `${config.prefix}_subject`,
    Attributes: [
      {
        "@odata.type": "Microsoft.Dynamics.CRM.StringAttributeMetadata",
        SchemaName: `${config.prefix}_Subject`,
        DisplayName: label("Subject"),
        Description: label("Subject of the site visit"),
        IsPrimaryName: true,
        RequiredLevel: { Value: "ApplicationRequired" },
        MaxLength: 400,
        FormatName: { Value: "Text" },
      },
    ],
  };

  await apiRequest(config, "POST", "EntityDefinitions", tableDefinition);
  console.log("Site Visit activity table created.");

  // Add custom columns to the activity
  const tableName = `${config.prefix}_sitevisit`;

  const visitDateColumn = {
    "@odata.type": "Microsoft.Dynamics.CRM.DateTimeAttributeMetadata",
    SchemaName: `${config.prefix}_VisitDate`,
    DisplayName: label("Visit Date"),
    Description: label("Date and time of the site visit"),
    Format: "DateAndTime",
    DateTimeBehavior: { Value: "UserLocal" },
    RequiredLevel: { Value: "ApplicationRequired" },
  };

  const locationColumn = {
    "@odata.type": "Microsoft.Dynamics.CRM.StringAttributeMetadata",
    SchemaName: `${config.prefix}_Location`,
    DisplayName: label("Location"),
    Description: label("Address or location of the visit"),
    MaxLength: 500,
    FormatName: { Value: "Text" },
  };

  const outcomeColumn = {
    "@odata.type": "Microsoft.Dynamics.CRM.PicklistAttributeMetadata",
    SchemaName: `${config.prefix}_Outcome`,
    DisplayName: label("Outcome"),
    Description: label("Result of the site visit"),
    OptionSet: {
      "@odata.type": "Microsoft.Dynamics.CRM.OptionSetMetadata",
      IsGlobal: false,
      OptionSetType: "Picklist",
      Options: [
        { Value: 100000, Label: label("Successful") },
        { Value: 100001, Label: label("Follow-up Required") },
        { Value: 100002, Label: label("No Show") },
        { Value: 100003, Label: label("Rescheduled") },
      ],
    },
  };

  await apiRequest(config, "POST", `EntityDefinitions(LogicalName='${tableName}')/Attributes`, visitDateColumn);
  await apiRequest(config, "POST", `EntityDefinitions(LogicalName='${tableName}')/Attributes`, locationColumn);
  await apiRequest(config, "POST", `EntityDefinitions(LogicalName='${tableName}')/Attributes`, outcomeColumn);
  console.log("Site Visit activity columns added.");
}
```

---

## Example 7: Create an Alternate Key and Use It

Create a composite alternate key and demonstrate record lookup.

```typescript
async function createAlternateKeyAndLookup(config: DataverseConfig): Promise<void> {
  const tableName = `${config.prefix}_project`;

  // Step 1: Create an external ID column
  const externalIdColumn = {
    "@odata.type": "Microsoft.Dynamics.CRM.StringAttributeMetadata",
    SchemaName: `${config.prefix}_ExternalId`,
    DisplayName: label("External ID"),
    Description: label("External system identifier"),
    MaxLength: 100,
    FormatName: { Value: "Text" },
    RequiredLevel: { Value: "ApplicationRequired" },
  };

  await apiRequest(
    config,
    "POST",
    `EntityDefinitions(LogicalName='${tableName}')/Attributes`,
    externalIdColumn
  );

  // Step 2: Create the alternate key
  const keyDefinition = {
    SchemaName: `${config.prefix}_ExternalIdKey`,
    DisplayName: label("External ID Key"),
    KeyAttributes: [`${config.prefix}_externalid`],
  };

  await apiRequest(
    config,
    "POST",
    `EntityDefinitions(LogicalName='${tableName}')/Keys`,
    keyDefinition
  );

  console.log("Alternate key created. Waiting for index to build...");

  // Step 3: Use the alternate key for upsert
  const entitySetName = `${config.prefix}_projects`;
  const externalId = "EXT-PRJ-001";

  const recordData = {
    [`${config.prefix}_name`]: "External System Project",
    [`${config.prefix}_description`]: "Imported from external system",
  };

  // Upsert using alternate key
  const response = await fetch(
    `${config.envUrl}/api/data/v9.2/${entitySetName}(${config.prefix}_externalid='${externalId}')`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.token}`,
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
        "If-Match": "*", // Update if exists, create if not
      },
      body: JSON.stringify(recordData),
    }
  );

  if (response.ok) {
    console.log("Record upserted via alternate key.");
  }
}
```
