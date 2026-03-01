# Relationship Patterns — Complete Examples

## Prerequisites

All examples use the shared types and helpers from `table-operations.md`.

---

## Example 1: Create 1:N Relationship Between Custom Tables

Create a parent-child relationship: Project (parent) -> Project Task (child).

```typescript
async function createProjectToTaskRelationship(config: DataverseConfig): Promise<void> {
  const relationship = {
    "@odata.type": "Microsoft.Dynamics.CRM.OneToManyRelationshipMetadata",
    SchemaName: `${config.prefix}_project_projecttask`,
    ReferencedEntity: `${config.prefix}_project`,
    ReferencedAttribute: `${config.prefix}_projectid`,
    ReferencingEntity: `${config.prefix}_projecttask`,
    ReferencingAttribute: `${config.prefix}_projectid`,
    Lookup: {
      "@odata.type": "Microsoft.Dynamics.CRM.LookupAttributeMetadata",
      SchemaName: `${config.prefix}_ProjectId`,
      DisplayName: label("Project"),
      Description: label("The parent project this task belongs to"),
      RequiredLevel: { Value: "ApplicationRequired" },
    },
    CascadeConfiguration: {
      Assign: "Cascade" as const,
      Delete: "Cascade" as const,
      Merge: "NoCascade" as const,
      Reparent: "NoCascade" as const,
      Share: "Cascade" as const,
      Unshare: "Cascade" as const,
      RollupView: "NoCascade" as const,
    },
    AssociatedMenuConfiguration: {
      Behavior: "UseCollectionName" as const,
      Group: "Details" as const,
      Label: label("Project Tasks"),
      Order: 10000,
    },
  };

  await apiRequest(config, "POST", "RelationshipDefinitions", relationship);
  console.log("1:N relationship Project -> ProjectTask created.");
  console.log("Lookup column cr123_projectid auto-created on ProjectTask table.");
}
```

### Create a Second 1:N: Project -> Milestone (Loose Coupling)

A looser relationship where deleting a project does not cascade to milestones.

```typescript
async function createProjectToMilestoneRelationship(config: DataverseConfig): Promise<void> {
  const relationship = {
    "@odata.type": "Microsoft.Dynamics.CRM.OneToManyRelationshipMetadata",
    SchemaName: `${config.prefix}_project_milestone`,
    ReferencedEntity: `${config.prefix}_project`,
    ReferencedAttribute: `${config.prefix}_projectid`,
    ReferencingEntity: `${config.prefix}_milestone`,
    ReferencingAttribute: `${config.prefix}_projectid`,
    Lookup: {
      "@odata.type": "Microsoft.Dynamics.CRM.LookupAttributeMetadata",
      SchemaName: `${config.prefix}_ProjectId`,
      DisplayName: label("Project"),
      Description: label("Associated project"),
      RequiredLevel: { Value: "Recommended" },
    },
    CascadeConfiguration: {
      Assign: "NoCascade" as const,
      Delete: "RemoveLink" as const,
      Merge: "NoCascade" as const,
      Reparent: "NoCascade" as const,
      Share: "NoCascade" as const,
      Unshare: "NoCascade" as const,
      RollupView: "NoCascade" as const,
    },
    AssociatedMenuConfiguration: {
      Behavior: "UseCollectionName" as const,
      Group: "Details" as const,
      Label: label("Milestones"),
      Order: 10001,
    },
  };

  await apiRequest(config, "POST", "RelationshipDefinitions", relationship);
  console.log("1:N relationship Project -> Milestone created (loose coupling).");
}
```

### Create a Restrict-Delete Relationship: Department -> Employee

Prevent deleting a department that still has employees.

```typescript
async function createDepartmentEmployeeRelationship(config: DataverseConfig): Promise<void> {
  const relationship = {
    "@odata.type": "Microsoft.Dynamics.CRM.OneToManyRelationshipMetadata",
    SchemaName: `${config.prefix}_department_employee`,
    ReferencedEntity: `${config.prefix}_department`,
    ReferencedAttribute: `${config.prefix}_departmentid`,
    ReferencingEntity: `${config.prefix}_employee`,
    ReferencingAttribute: `${config.prefix}_departmentid`,
    Lookup: {
      "@odata.type": "Microsoft.Dynamics.CRM.LookupAttributeMetadata",
      SchemaName: `${config.prefix}_DepartmentId`,
      DisplayName: label("Department"),
      Description: label("The department this employee belongs to"),
      RequiredLevel: { Value: "ApplicationRequired" },
    },
    CascadeConfiguration: {
      Assign: "NoCascade" as const,
      Delete: "Restrict" as const,
      Merge: "NoCascade" as const,
      Reparent: "NoCascade" as const,
      Share: "NoCascade" as const,
      Unshare: "NoCascade" as const,
      RollupView: "NoCascade" as const,
    },
    AssociatedMenuConfiguration: {
      Behavior: "UseCollectionName" as const,
      Group: "Details" as const,
      Label: label("Employees"),
      Order: 10000,
    },
  };

  await apiRequest(config, "POST", "RelationshipDefinitions", relationship);
  console.log("1:N Department -> Employee created (Delete: Restrict).");
}
```

---

## Example 2: Create N:N Relationship with Custom Intersect Name

Create a many-to-many between Project and Resource (team members).

```typescript
async function createProjectResourceNtoN(config: DataverseConfig): Promise<void> {
  const relationship = {
    "@odata.type": "Microsoft.Dynamics.CRM.ManyToManyRelationshipMetadata",
    SchemaName: `${config.prefix}_project_resource`,
    Entity1LogicalName: `${config.prefix}_project`,
    Entity2LogicalName: `${config.prefix}_resource`,
    IntersectEntityName: `${config.prefix}_project_resource`,
    Entity1AssociatedMenuConfiguration: {
      Behavior: "UseCollectionName" as const,
      Group: "Details" as const,
      Label: label("Resources"),
      Order: 10002,
    },
    Entity2AssociatedMenuConfiguration: {
      Behavior: "UseCollectionName" as const,
      Group: "Details" as const,
      Label: label("Projects"),
      Order: 10002,
    },
  };

  await apiRequest(config, "POST", "RelationshipDefinitions", relationship);
  console.log("N:N relationship Project <-> Resource created.");
}

// Associate records after relationship exists
async function assignResourceToProject(
  config: DataverseConfig,
  projectId: string,
  resourceId: string
): Promise<void> {
  const entitySetName = `${config.prefix}_projects`;
  const relationshipName = `${config.prefix}_project_resource`;

  const response = await fetch(
    `${config.envUrl}/api/data/v9.2/${entitySetName}(${projectId})/${relationshipName}/$ref`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.token}`,
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
      },
      body: JSON.stringify({
        "@odata.id": `${config.envUrl}/api/data/v9.2/${config.prefix}_resources(${resourceId})`,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Association failed: ${JSON.stringify(error)}`);
  }

  console.log(`Resource ${resourceId} associated with Project ${projectId}.`);
}

// Disassociate records
async function removeResourceFromProject(
  config: DataverseConfig,
  projectId: string,
  resourceId: string
): Promise<void> {
  const entitySetName = `${config.prefix}_projects`;
  const relationshipName = `${config.prefix}_project_resource`;

  const response = await fetch(
    `${config.envUrl}/api/data/v9.2/${entitySetName}(${projectId})/${relationshipName}(${resourceId})/$ref`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${config.token}`,
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Disassociation failed: ${JSON.stringify(error)}`);
  }

  console.log(`Resource ${resourceId} removed from Project ${projectId}.`);
}

// Query N:N related records
async function getProjectResources(
  config: DataverseConfig,
  projectId: string
): Promise<Array<{ id: string; name: string }>> {
  const entitySetName = `${config.prefix}_projects`;
  const relationshipName = `${config.prefix}_project_resource`;

  const response = await fetch(
    `${config.envUrl}/api/data/v9.2/${entitySetName}(${projectId})/${relationshipName}?$select=${config.prefix}_name`,
    {
      headers: {
        Authorization: `Bearer ${config.token}`,
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
      },
    }
  );

  const result = await response.json();
  return result.value.map((r: Record<string, string>) => ({
    id: r[`${config.prefix}_resourceid`],
    name: r[`${config.prefix}_name`],
  }));
}
```

### N:N with Tags Pattern

A common pattern: a shared Tag table used by multiple entities.

```typescript
async function createTagRelationships(config: DataverseConfig): Promise<void> {
  // Project <-> Tag
  const projectTagRelationship = {
    "@odata.type": "Microsoft.Dynamics.CRM.ManyToManyRelationshipMetadata",
    SchemaName: `${config.prefix}_project_tag`,
    Entity1LogicalName: `${config.prefix}_project`,
    Entity2LogicalName: `${config.prefix}_tag`,
    IntersectEntityName: `${config.prefix}_project_tag`,
    Entity1AssociatedMenuConfiguration: {
      Behavior: "UseCollectionName" as const,
      Group: "Details" as const,
      Label: label("Tags"),
      Order: 10005,
    },
    Entity2AssociatedMenuConfiguration: {
      Behavior: "UseCollectionName" as const,
      Group: "Details" as const,
      Label: label("Projects"),
      Order: 10005,
    },
  };

  // Task <-> Tag
  const taskTagRelationship = {
    "@odata.type": "Microsoft.Dynamics.CRM.ManyToManyRelationshipMetadata",
    SchemaName: `${config.prefix}_projecttask_tag`,
    Entity1LogicalName: `${config.prefix}_projecttask`,
    Entity2LogicalName: `${config.prefix}_tag`,
    IntersectEntityName: `${config.prefix}_projecttask_tag`,
    Entity1AssociatedMenuConfiguration: {
      Behavior: "UseCollectionName" as const,
      Group: "Details" as const,
      Label: label("Tags"),
      Order: 10005,
    },
    Entity2AssociatedMenuConfiguration: {
      Behavior: "UseCollectionName" as const,
      Group: "Details" as const,
      Label: label("Tasks"),
      Order: 10005,
    },
  };

  await apiRequest(config, "POST", "RelationshipDefinitions", projectTagRelationship);
  await apiRequest(config, "POST", "RelationshipDefinitions", taskTagRelationship);
  console.log("Tag N:N relationships created for both Project and Task.");
}
```

---

## Example 3: Self-Referential Hierarchy

Create a Category table with a hierarchical parent-child relationship to itself.

```typescript
async function createCategoryHierarchy(config: DataverseConfig): Promise<void> {
  // Step 1: Create the Category table
  const tableDefinition = {
    "@odata.type": "Microsoft.Dynamics.CRM.EntityMetadata",
    SchemaName: `${config.prefix}_Category`,
    DisplayName: label("Category"),
    DisplayCollectionName: label("Categories"),
    Description: label("Hierarchical categories for classification"),
    OwnershipType: "OrganizationOwned",
    PrimaryNameAttribute: `${config.prefix}_name`,
    Attributes: [
      {
        "@odata.type": "Microsoft.Dynamics.CRM.StringAttributeMetadata",
        SchemaName: `${config.prefix}_Name`,
        DisplayName: label("Category Name"),
        IsPrimaryName: true,
        RequiredLevel: { Value: "ApplicationRequired" },
        MaxLength: 200,
        FormatName: { Value: "Text" },
      },
    ],
  };

  await apiRequest(config, "POST", "EntityDefinitions", tableDefinition);
  console.log("Category table created.");

  // Step 2: Add a sort order column
  const sortOrder = {
    "@odata.type": "Microsoft.Dynamics.CRM.IntegerAttributeMetadata",
    SchemaName: `${config.prefix}_SortOrder`,
    DisplayName: label("Sort Order"),
    Description: label("Display order within the hierarchy level"),
    MinValue: 0,
    MaxValue: 999999,
    Format: "None",
  };

  await apiRequest(
    config,
    "POST",
    `EntityDefinitions(LogicalName='${config.prefix}_category')/Attributes`,
    sortOrder
  );

  // Step 3: Create self-referential hierarchical relationship
  const relationship = {
    "@odata.type": "Microsoft.Dynamics.CRM.OneToManyRelationshipMetadata",
    SchemaName: `${config.prefix}_category_parent_category`,
    ReferencedEntity: `${config.prefix}_category`,
    ReferencedAttribute: `${config.prefix}_categoryid`,
    ReferencingEntity: `${config.prefix}_category`,
    ReferencingAttribute: `${config.prefix}_parentcategoryid`,
    IsHierarchical: true,
    Lookup: {
      "@odata.type": "Microsoft.Dynamics.CRM.LookupAttributeMetadata",
      SchemaName: `${config.prefix}_ParentCategoryId`,
      DisplayName: label("Parent Category"),
      Description: label("The parent category in the hierarchy"),
      RequiredLevel: { Value: "None" },
    },
    CascadeConfiguration: {
      Assign: "NoCascade" as const,
      Delete: "RemoveLink" as const,
      Merge: "NoCascade" as const,
      Reparent: "NoCascade" as const,
      Share: "NoCascade" as const,
      Unshare: "NoCascade" as const,
      RollupView: "NoCascade" as const,
    },
    AssociatedMenuConfiguration: {
      Behavior: "UseCollectionName" as const,
      Group: "Details" as const,
      Label: label("Subcategories"),
      Order: 10000,
    },
  };

  await apiRequest(config, "POST", "RelationshipDefinitions", relationship);
  console.log("Self-referential hierarchical relationship created.");

  // Step 4: Query hierarchy using FetchXML 'under' operator
  const fetchXml = `
    <fetch>
      <entity name="${config.prefix}_category">
        <attribute name="${config.prefix}_name" />
        <attribute name="${config.prefix}_parentcategoryid" />
        <attribute name="${config.prefix}_sortorder" />
        <filter>
          <condition attribute="${config.prefix}_parentcategoryid" operator="under" value="{rootCategoryId}" />
        </filter>
        <order attribute="${config.prefix}_sortorder" />
      </entity>
    </fetch>
  `;
  console.log("Query all descendants with FetchXML 'under' operator:");
  console.log(fetchXml.trim());
}
```

---

## Example 4: Polymorphic Lookup (Customer-Type Field)

Create a column that can point to either account or contact (Customer pattern).

```typescript
async function createCustomerLookup(config: DataverseConfig): Promise<void> {
  // The Customer lookup creates two 1:N relationships automatically:
  // one from account and one from contact to the target table.

  const tableName = `${config.prefix}_serviceticket`;

  // First create the service ticket table
  const tableDefinition = {
    "@odata.type": "Microsoft.Dynamics.CRM.EntityMetadata",
    SchemaName: `${config.prefix}_ServiceTicket`,
    DisplayName: label("Service Ticket"),
    DisplayCollectionName: label("Service Tickets"),
    Description: label("Customer service tickets with polymorphic customer lookup"),
    OwnershipType: "UserOwned",
    HasNotes: true,
    PrimaryNameAttribute: `${config.prefix}_title`,
    Attributes: [
      {
        "@odata.type": "Microsoft.Dynamics.CRM.StringAttributeMetadata",
        SchemaName: `${config.prefix}_Title`,
        DisplayName: label("Title"),
        IsPrimaryName: true,
        RequiredLevel: { Value: "ApplicationRequired" },
        MaxLength: 300,
        FormatName: { Value: "Text" },
      },
    ],
  };

  await apiRequest(config, "POST", "EntityDefinitions", tableDefinition);
  console.log("ServiceTicket table created.");

  // Create Customer-type lookup (targets account + contact)
  // This is done by creating two 1:N relationships
  const accountRelationship = {
    "@odata.type": "Microsoft.Dynamics.CRM.OneToManyRelationshipMetadata",
    SchemaName: `${config.prefix}_account_serviceticket_customer`,
    ReferencedEntity: "account",
    ReferencedAttribute: "accountid",
    ReferencingEntity: tableName,
    ReferencingAttribute: `${config.prefix}_customerid`,
    Lookup: {
      "@odata.type": "Microsoft.Dynamics.CRM.LookupAttributeMetadata",
      SchemaName: `${config.prefix}_CustomerId`,
      DisplayName: label("Customer"),
      Description: label("The customer (account or contact) for this ticket"),
      Targets: ["account", "contact"],
    },
    CascadeConfiguration: {
      Assign: "NoCascade" as const,
      Delete: "RemoveLink" as const,
      Merge: "Cascade" as const,
      Reparent: "NoCascade" as const,
      Share: "NoCascade" as const,
      Unshare: "NoCascade" as const,
      RollupView: "NoCascade" as const,
    },
  };

  await apiRequest(config, "POST", "RelationshipDefinitions", accountRelationship);
  console.log("Customer polymorphic lookup created (targets account + contact).");

  // Setting a customer lookup value (to an account):
  console.log("To set customer to an account:");
  console.log(`  PATCH .../api/data/v9.2/${config.prefix}_servicetickets({id})`);
  console.log(`  Body: { "${config.prefix}_CustomerId_account@odata.bind": "/accounts({accountId})" }`);

  // Setting a customer lookup value (to a contact):
  console.log("To set customer to a contact:");
  console.log(`  PATCH .../api/data/v9.2/${config.prefix}_servicetickets({id})`);
  console.log(`  Body: { "${config.prefix}_CustomerId_contact@odata.bind": "/contacts({contactId})" }`);
}
```

---

## Example 5: Retrieve and Modify Relationship Metadata

List all relationships on a table and update cascading behavior.

```typescript
interface RelationshipMetadata {
  SchemaName: string;
  RelationshipType: string;
  ReferencedEntity?: string;
  ReferencingEntity?: string;
  Entity1LogicalName?: string;
  Entity2LogicalName?: string;
  CascadeConfiguration?: {
    Assign: string;
    Delete: string;
    Merge: string;
    Reparent: string;
    Share: string;
    Unshare: string;
  };
}

async function listAndUpdateRelationships(config: DataverseConfig): Promise<void> {
  const tableName = `${config.prefix}_projecttask`;

  // Get 1:N relationships (where this table is the child / referencing entity)
  const manyToOne = await apiRequest<{ value: RelationshipMetadata[] }>(
    config,
    "GET",
    `EntityDefinitions(LogicalName='${tableName}')/ManyToOneRelationships?$select=SchemaName,ReferencedEntity,CascadeConfiguration`
  );

  console.log(`\nMany-to-One relationships on ${tableName}:`);
  for (const rel of manyToOne.value) {
    console.log(`  ${rel.SchemaName} -> ${rel.ReferencedEntity} (Delete: ${rel.CascadeConfiguration?.Delete})`);
  }

  // Get 1:N relationships (where this table is the parent / referenced entity)
  const oneToMany = await apiRequest<{ value: RelationshipMetadata[] }>(
    config,
    "GET",
    `EntityDefinitions(LogicalName='${tableName}')/OneToManyRelationships?$select=SchemaName,ReferencingEntity,CascadeConfiguration`
  );

  console.log(`\nOne-to-Many relationships from ${tableName}:`);
  for (const rel of oneToMany.value) {
    console.log(`  ${rel.SchemaName} -> ${rel.ReferencingEntity} (Delete: ${rel.CascadeConfiguration?.Delete})`);
  }

  // Get N:N relationships
  const manyToMany = await apiRequest<{ value: RelationshipMetadata[] }>(
    config,
    "GET",
    `EntityDefinitions(LogicalName='${tableName}')/ManyToManyRelationships?$select=SchemaName,Entity1LogicalName,Entity2LogicalName`
  );

  console.log(`\nMany-to-Many relationships on ${tableName}:`);
  for (const rel of manyToMany.value) {
    console.log(`  ${rel.SchemaName}: ${rel.Entity1LogicalName} <-> ${rel.Entity2LogicalName}`);
  }

  // Update cascade behavior on a specific relationship
  const targetRelationship = `${config.prefix}_project_projecttask`;
  const updatePayload = {
    "@odata.type": "Microsoft.Dynamics.CRM.OneToManyRelationshipMetadata",
    CascadeConfiguration: {
      Assign: "Cascade",
      Delete: "Restrict",
      Merge: "NoCascade",
      Reparent: "NoCascade",
      Share: "Cascade",
      Unshare: "Cascade",
      RollupView: "NoCascade",
    },
  };

  await apiRequest(
    config,
    "PATCH",
    `RelationshipDefinitions(SchemaName='${targetRelationship}')`,
    updatePayload
  );

  // Publish changes
  await apiRequest(config, "POST", "PublishAllXml");

  console.log(`\nUpdated cascade behavior on ${targetRelationship}: Delete changed to Restrict.`);
}
```
