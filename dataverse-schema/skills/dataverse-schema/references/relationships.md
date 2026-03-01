# Relationships — Dataverse Web API

## Overview

Dataverse supports three relationship types: One-to-Many (1:N), Many-to-One (N:1, which is just the inverse perspective of 1:N), and Many-to-Many (N:N). Relationships are created through the `RelationshipDefinitions` endpoint and automatically generate the required schema objects (lookup columns for 1:N, intersect tables for N:N).

### Common Endpoint

```
POST {environmentUrl}/api/data/v9.2/RelationshipDefinitions
```

Include the `MSCRM.SolutionUniqueName` header to add the relationship to a solution.

---

## One-to-Many (1:N) Relationships

A 1:N relationship links a parent (referenced) table to a child (referencing) table. The child table automatically gets a lookup column pointing to the parent.

### OneToManyRelationshipMetadata

```json
{
  "@odata.type": "Microsoft.Dynamics.CRM.OneToManyRelationshipMetadata",
  "SchemaName": "cr123_project_projecttask",
  "ReferencedEntity": "cr123_project",
  "ReferencedAttribute": "cr123_projectid",
  "ReferencingEntity": "cr123_projecttask",
  "ReferencingAttribute": "cr123_projectid",
  "Lookup": {
    "@odata.type": "Microsoft.Dynamics.CRM.LookupAttributeMetadata",
    "SchemaName": "cr123_ProjectId",
    "DisplayName": {
      "@odata.type": "Microsoft.Dynamics.CRM.Label",
      "LocalizedLabels": [
        { "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", "Label": "Project", "LanguageCode": 1033 }
      ]
    },
    "RequiredLevel": { "Value": "ApplicationRequired" }
  },
  "CascadeConfiguration": {
    "Assign": "NoCascade",
    "Delete": "RemoveLink",
    "Merge": "NoCascade",
    "Reparent": "NoCascade",
    "Share": "NoCascade",
    "Unshare": "NoCascade",
    "RollupView": "NoCascade"
  },
  "AssociatedMenuConfiguration": {
    "Behavior": "UseCollectionName",
    "Group": "Details",
    "Label": {
      "@odata.type": "Microsoft.Dynamics.CRM.Label",
      "LocalizedLabels": [
        { "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", "Label": "Tasks", "LanguageCode": 1033 }
      ]
    },
    "Order": 10000
  }
}
```

### Key Properties

| Property | Description |
|----------|-------------|
| `SchemaName` | Unique name for the relationship (lowercase with prefix) |
| `ReferencedEntity` | The "one" side (parent table logical name) |
| `ReferencedAttribute` | The primary key column of the parent table |
| `ReferencingEntity` | The "many" side (child table logical name) |
| `ReferencingAttribute` | The lookup column logical name on the child table (auto-created) |
| `Lookup` | Definition for the auto-created lookup column |
| `CascadeConfiguration` | Behavior when parent record actions occur |
| `AssociatedMenuConfiguration` | How the related records appear in the parent form nav |

### TypeScript Example — Create 1:N

```typescript
interface OneToManyRelationship {
  "@odata.type": "Microsoft.Dynamics.CRM.OneToManyRelationshipMetadata";
  SchemaName: string;
  ReferencedEntity: string;
  ReferencedAttribute: string;
  ReferencingEntity: string;
  ReferencingAttribute: string;
  Lookup: {
    "@odata.type": "Microsoft.Dynamics.CRM.LookupAttributeMetadata";
    SchemaName: string;
    DisplayName: DataverseLabel;
    RequiredLevel?: { Value: string };
  };
  CascadeConfiguration: CascadeConfig;
}

interface CascadeConfig {
  Assign: CascadeType;
  Delete: CascadeType;
  Merge: CascadeType;
  Reparent: CascadeType;
  Share: CascadeType;
  Unshare: CascadeType;
  RollupView: CascadeType;
}

type CascadeType = "Cascade" | "Restrict" | "NoCascade" | "RemoveLink" | "Active" | "UserOwned";

async function createOneToMany(
  envUrl: string,
  token: string,
  solutionName: string,
  relationship: OneToManyRelationship
): Promise<string> {
  const response = await fetch(`${envUrl}/api/data/v9.2/RelationshipDefinitions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "OData-MaxVersion": "4.0",
      "OData-Version": "4.0",
      "MSCRM.SolutionUniqueName": solutionName,
    },
    body: JSON.stringify(relationship),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to create relationship: ${JSON.stringify(error)}`);
  }

  return response.headers.get("OData-EntityId") ?? "";
}
```

---

## Cascading Behavior Configuration

Cascading behavior determines what happens to child records when an action is taken on the parent record.

### Cascade Types

| Value | Description |
|-------|-------------|
| `Cascade` | Apply the action to all child records |
| `Active` | Apply only to active child records |
| `UserOwned` | Apply only to child records owned by the same user as the parent |
| `NoCascade` | Do nothing to child records |
| `RemoveLink` | Clear the lookup value on child records (orphan them) |
| `Restrict` | Prevent the action on the parent if children exist |

### Cascade Actions

| Action | Description | Common Setting |
|--------|-------------|----------------|
| `Assign` | Parent is assigned to a different user/team | `NoCascade` or `Cascade` |
| `Delete` | Parent record is deleted | `RemoveLink` or `Restrict` |
| `Merge` | Parent record is merged with another | `NoCascade` |
| `Reparent` | Child's parent is changed to a different record | `NoCascade` |
| `Share` | Parent record is shared with a user/team | `NoCascade` or `Cascade` |
| `Unshare` | Sharing on the parent is removed | `NoCascade` or `Cascade` |
| `RollupView` | Related to rollup field calculations | `NoCascade` |

### Recommended Patterns

**Tight coupling (parent owns children):**
```json
{
  "Assign": "Cascade",
  "Delete": "Cascade",
  "Merge": "Cascade",
  "Reparent": "Cascade",
  "Share": "Cascade",
  "Unshare": "Cascade",
  "RollupView": "NoCascade"
}
```

**Loose coupling (reference only):**
```json
{
  "Assign": "NoCascade",
  "Delete": "RemoveLink",
  "Merge": "NoCascade",
  "Reparent": "NoCascade",
  "Share": "NoCascade",
  "Unshare": "NoCascade",
  "RollupView": "NoCascade"
}
```

**Referential restrict (prevent orphans):**
```json
{
  "Assign": "NoCascade",
  "Delete": "Restrict",
  "Merge": "NoCascade",
  "Reparent": "NoCascade",
  "Share": "NoCascade",
  "Unshare": "NoCascade",
  "RollupView": "NoCascade"
}
```

---

## Many-to-Many (N:N) Relationships

N:N relationships create an intersect table automatically. Neither entity gets a lookup column.

### ManyToManyRelationshipMetadata

```json
{
  "@odata.type": "Microsoft.Dynamics.CRM.ManyToManyRelationshipMetadata",
  "SchemaName": "cr123_project_resource",
  "Entity1LogicalName": "cr123_project",
  "Entity2LogicalName": "cr123_resource",
  "IntersectEntityName": "cr123_project_resource",
  "Entity1AssociatedMenuConfiguration": {
    "Behavior": "UseCollectionName",
    "Group": "Details",
    "Label": {
      "@odata.type": "Microsoft.Dynamics.CRM.Label",
      "LocalizedLabels": [
        { "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", "Label": "Resources", "LanguageCode": 1033 }
      ]
    },
    "Order": 10000
  },
  "Entity2AssociatedMenuConfiguration": {
    "Behavior": "UseCollectionName",
    "Group": "Details",
    "Label": {
      "@odata.type": "Microsoft.Dynamics.CRM.Label",
      "LocalizedLabels": [
        { "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", "Label": "Projects", "LanguageCode": 1033 }
      ]
    },
    "Order": 10000
  }
}
```

### Associate and Disassociate Records

Once the N:N relationship exists, link records using the Associate API:

```
POST {environmentUrl}/api/data/v9.2/cr123_projects({projectId})/cr123_project_resource/$ref
```

Body:
```json
{
  "@odata.id": "{environmentUrl}/api/data/v9.2/cr123_resources({resourceId})"
}
```

Disassociate:
```
DELETE {environmentUrl}/api/data/v9.2/cr123_projects({projectId})/cr123_project_resource({resourceId})/$ref
```

### TypeScript Example — Create N:N

```typescript
interface ManyToManyRelationship {
  "@odata.type": "Microsoft.Dynamics.CRM.ManyToManyRelationshipMetadata";
  SchemaName: string;
  Entity1LogicalName: string;
  Entity2LogicalName: string;
  IntersectEntityName: string;
  Entity1AssociatedMenuConfiguration?: AssociatedMenuConfig;
  Entity2AssociatedMenuConfiguration?: AssociatedMenuConfig;
}

interface AssociatedMenuConfig {
  Behavior: "UseCollectionName" | "UseLabel" | "DoNotDisplay";
  Group: "Details" | "Marketing" | "Sales" | "Service";
  Label?: DataverseLabel;
  Order?: number;
}

async function createManyToMany(
  envUrl: string,
  token: string,
  solutionName: string,
  relationship: ManyToManyRelationship
): Promise<string> {
  const response = await fetch(`${envUrl}/api/data/v9.2/RelationshipDefinitions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "OData-MaxVersion": "4.0",
      "OData-Version": "4.0",
      "MSCRM.SolutionUniqueName": solutionName,
    },
    body: JSON.stringify(relationship),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to create N:N relationship: ${JSON.stringify(error)}`);
  }

  return response.headers.get("OData-EntityId") ?? "";
}
```

---

## Self-Referential Relationships

A table can have a 1:N relationship to itself, enabling parent-child hierarchies within the same table.

```json
{
  "@odata.type": "Microsoft.Dynamics.CRM.OneToManyRelationshipMetadata",
  "SchemaName": "cr123_category_parent_category",
  "ReferencedEntity": "cr123_category",
  "ReferencedAttribute": "cr123_categoryid",
  "ReferencingEntity": "cr123_category",
  "ReferencingAttribute": "cr123_parentcategoryid",
  "IsHierarchical": true,
  "Lookup": {
    "@odata.type": "Microsoft.Dynamics.CRM.LookupAttributeMetadata",
    "SchemaName": "cr123_ParentCategoryId",
    "DisplayName": {
      "@odata.type": "Microsoft.Dynamics.CRM.Label",
      "LocalizedLabels": [
        { "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", "Label": "Parent Category", "LanguageCode": 1033 }
      ]
    }
  },
  "CascadeConfiguration": {
    "Assign": "NoCascade",
    "Delete": "RemoveLink",
    "Merge": "NoCascade",
    "Reparent": "NoCascade",
    "Share": "NoCascade",
    "Unshare": "NoCascade",
    "RollupView": "NoCascade"
  }
}
```

Setting `IsHierarchical: true` enables:
- Hierarchy visualization in the UI
- `Above` and `Under` operators in FetchXML/OData queries
- Hierarchy security (manager hierarchy or position hierarchy)

**Important:** Only one hierarchical relationship is allowed per table.

---

## Polymorphic Relationships

### Customer Lookup
Creates relationships to both `account` and `contact` automatically:

```json
{
  "@odata.type": "Microsoft.Dynamics.CRM.ComplexLookupAttributeMetadata",
  "SchemaName": "cr123_CustomerId",
  "DisplayName": {
    "@odata.type": "Microsoft.Dynamics.CRM.Label",
    "LocalizedLabels": [
      { "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", "Label": "Customer", "LanguageCode": 1033 }
    ]
  },
  "Targets": ["account", "contact"]
}
```

**Note:** Custom polymorphic lookups beyond the Customer pattern must be created through solution XML or the maker portal, not the Web API directly.

---

## Retrieve and Modify Relationships

### Get All Relationships for a Table

```
GET {environmentUrl}/api/data/v9.2/EntityDefinitions(LogicalName='cr123_projecttask')/OneToManyRelationships
GET {environmentUrl}/api/data/v9.2/EntityDefinitions(LogicalName='cr123_projecttask')/ManyToOneRelationships
GET {environmentUrl}/api/data/v9.2/EntityDefinitions(LogicalName='cr123_projecttask')/ManyToManyRelationships
```

### Get a Specific Relationship

```
GET {environmentUrl}/api/data/v9.2/RelationshipDefinitions(SchemaName='cr123_project_projecttask')
```

### Update Cascading Behavior

```
PATCH {environmentUrl}/api/data/v9.2/RelationshipDefinitions(SchemaName='cr123_project_projecttask')
```

```json
{
  "@odata.type": "Microsoft.Dynamics.CRM.OneToManyRelationshipMetadata",
  "CascadeConfiguration": {
    "Delete": "Restrict"
  }
}
```

### Delete a Relationship

```
DELETE {environmentUrl}/api/data/v9.2/RelationshipDefinitions(SchemaName='cr123_project_projecttask')
```

**Warning:** Deleting a 1:N relationship also deletes the lookup column on the referencing table and clears all lookup values in existing records. Deleting an N:N relationship deletes the intersect table and all associations.
