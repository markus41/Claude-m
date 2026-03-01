---
name: Dataverse Schema & Data Management
description: >
  Deep expertise in creating and managing Dataverse tables, columns,
  relationships, option sets, and solutions via the Dataverse Web API (v9.2).
  Covers schema design, data seeding, FetchXML/OData query generation, and
  solution lifecycle management.
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Grep
  - Glob
triggers:
  - dataverse table
  - dataverse column
  - dataverse schema
  - dataverse relationship
  - option set
  - fetchxml
  - solution export
  - solution import
  - dataverse metadata
  - EntityDefinitions
  - AttributeMetadata
---

# Dataverse Schema & Data Management

## Overview

Microsoft Dataverse exposes a rich metadata Web API that lets you define, modify, and delete schema objects — tables (entities), columns (attributes), relationships, and option sets — entirely through HTTP requests. This skill provides the knowledge needed to generate correct API payloads, design sound schemas, manage solutions, seed data, and build queries.

All operations target the Dataverse Web API v9.2 endpoint:

```
{environmentUrl}/api/data/v9.2/
```

Where `{environmentUrl}` is the root URL of the Power Platform environment (e.g., `https://org12345.crm.dynamics.com`).

---

## Metadata API Surface

### EntityDefinitions (Tables)

Tables are defined and managed through the `EntityDefinitions` endpoint.

| Operation | Method | URL |
|-----------|--------|-----|
| Create table | `POST` | `EntityDefinitions` |
| Get table | `GET` | `EntityDefinitions(LogicalName='cr123_account')` |
| Update table | `PATCH` | `EntityDefinitions(LogicalName='cr123_account')` |
| Delete table | `DELETE` | `EntityDefinitions(LogicalName='cr123_account')` |
| List tables | `GET` | `EntityDefinitions?$filter=IsCustomEntity eq true` |

### AttributeMetadata (Columns)

Columns are managed as sub-resources of their parent table.

| Operation | Method | URL |
|-----------|--------|-----|
| Create column | `POST` | `EntityDefinitions(LogicalName='cr123_account')/Attributes` |
| Get column | `GET` | `EntityDefinitions(LogicalName='cr123_account')/Attributes(LogicalName='cr123_name')` |
| Update column | `PATCH` | `EntityDefinitions(LogicalName='cr123_account')/Attributes(LogicalName='cr123_name')` |
| Delete column | `DELETE` | `EntityDefinitions(LogicalName='cr123_account')/Attributes(LogicalName='cr123_name')` |

### RelationshipDefinitions (Relationships)

| Operation | Method | URL |
|-----------|--------|-----|
| Create 1:N | `POST` | `RelationshipDefinitions` |
| Create N:N | `POST` | `RelationshipDefinitions` |
| Get relationship | `GET` | `RelationshipDefinitions(SchemaName='cr123_parent_child')` |
| Delete relationship | `DELETE` | `RelationshipDefinitions(SchemaName='cr123_parent_child')` |

---

## Table Creation Quick Reference

When creating a table, the key properties are:

| Property | Required | Description |
|----------|----------|-------------|
| `SchemaName` | Yes | PascalCase with publisher prefix (e.g., `cr123_ProjectTask`) |
| `DisplayName` | Yes | Localized label shown in the UI |
| `DisplayCollectionName` | Yes | Plural display name |
| `Description` | No | Localized description |
| `PrimaryNameAttribute` | Yes | Logical name of the primary name column (auto-created as part of the table) |
| `OwnershipType` | Yes | `UserOwned` or `OrganizationOwned` |
| `HasActivities` | No | Enable activity association (default: false) |
| `ChangeTrackingEnabled` | No | Enable for sync scenarios (default: false) |
| `IsAuditEnabled` | No | Enable auditing on the table |

The `PrimaryNameAttribute` is a string column that is created inline with the table. You must include its full `StringAttributeMetadata` definition in the `Attributes` array of the POST body.

Minimal creation body:

```json
{
  "@odata.type": "Microsoft.Dynamics.CRM.EntityMetadata",
  "SchemaName": "cr123_ProjectTask",
  "DisplayName": {
    "@odata.type": "Microsoft.Dynamics.CRM.Label",
    "LocalizedLabels": [{ "Label": "Project Task", "LanguageCode": 1033 }]
  },
  "DisplayCollectionName": {
    "@odata.type": "Microsoft.Dynamics.CRM.Label",
    "LocalizedLabels": [{ "Label": "Project Tasks", "LanguageCode": 1033 }]
  },
  "Description": {
    "@odata.type": "Microsoft.Dynamics.CRM.Label",
    "LocalizedLabels": [{ "Label": "Tracks tasks within a project", "LanguageCode": 1033 }]
  },
  "OwnershipType": "UserOwned",
  "PrimaryNameAttribute": "cr123_name",
  "Attributes": [
    {
      "@odata.type": "Microsoft.Dynamics.CRM.StringAttributeMetadata",
      "SchemaName": "cr123_Name",
      "DisplayName": {
        "@odata.type": "Microsoft.Dynamics.CRM.Label",
        "LocalizedLabels": [{ "Label": "Name", "LanguageCode": 1033 }]
      },
      "IsPrimaryName": true,
      "MaxLength": 200,
      "FormatName": { "Value": "Text" },
      "RequiredLevel": { "Value": "ApplicationRequired" }
    }
  ]
}
```

**Solution context:** To create the table within a solution, add the header:
```
MSCRM.SolutionUniqueName: YourSolutionUniqueName
```

---

## Column Type Decision Tree

Use this guide to pick the right column type:

| Need | Column Type | OData Type |
|------|------------|------------|
| Short text (< 4000 chars) | `StringAttributeMetadata` | `Edm.String` |
| Multi-line text | `StringAttributeMetadata` (Format: TextArea/RichText) | `Edm.String` |
| Whole number | `IntegerAttributeMetadata` | `Edm.Int32` |
| Decimal number | `DecimalAttributeMetadata` | `Edm.Decimal` |
| Float number | `DoubleAttributeMetadata` | `Edm.Double` |
| Currency | `MoneyAttributeMetadata` | `Edm.Decimal` |
| Date only | `DateTimeAttributeMetadata` (Format: DateOnly) | `Edm.DateTimeOffset` |
| Date and time | `DateTimeAttributeMetadata` (Format: DateAndTime) | `Edm.DateTimeOffset` |
| Yes/No | `BooleanAttributeMetadata` | `Edm.Boolean` |
| Single choice | `PicklistAttributeMetadata` | `Edm.Int32` |
| Multi-choice | `MultiSelectPicklistAttributeMetadata` | Collection of `Edm.Int32` |
| Lookup (single target) | `LookupAttributeMetadata` | `Edm.Guid` |
| Polymorphic lookup | Customer / Regarding pattern | `Edm.Guid` |
| File attachment | `FileAttributeMetadata` | Binary |
| Image | `ImageAttributeMetadata` | Binary |
| Auto-number | `StringAttributeMetadata` with `AutoNumberFormat` | `Edm.String` |
| Calculated | Formula column | Depends on result type |
| Rollup | Rollup column | Depends on aggregation |

---

## Relationship Types Summary

### One-to-Many (1:N)
- Creates a **lookup column** on the "many" side automatically
- Best for: parent-child hierarchies, foreign-key patterns
- Configure cascading behavior for Assign, Delete, Merge, Reparent, Share, Unshare

### Many-to-Many (N:N)
- Creates an **intersect table** automatically
- No lookup column on either side; association/disassociation via API
- Best for: tags, categories, peer relationships
- Limited cascading options compared to 1:N

**Trade-off:** Prefer 1:N when one side clearly "owns" the relationship. Use N:N when both sides are equal peers and no additional attributes are needed on the junction. If you need attributes on the junction, create a custom intersect table with two 1:N relationships instead of using native N:N.

---

## Publisher Prefix Conventions

Every schema object in Dataverse must include the publisher prefix:
- **SchemaName format:** `prefix_EntityName`, e.g., `cr123_ProjectTask`
- **Logical name (auto-generated):** all-lowercase version, e.g., `cr123_projecttask`
- The prefix is set on the Publisher record associated with the solution
- Common prefixes: 2-5 lowercase letters/numbers (avoid `new_` as it is the default)

**Rule:** Always apply the publisher prefix to every `SchemaName` for tables, columns, relationships, and option sets. Never create schema objects without the correct prefix.

---

## Naming Conventions

Enforce these conventions across all generated schema:

| Element | Convention | Example |
|---------|-----------|---------|
| Table SchemaName | PascalCase with prefix | `cr123_ProjectTask` |
| Column SchemaName | PascalCase with prefix | `cr123_EstimatedHours` |
| Relationship SchemaName | lowercase with prefix | `cr123_project_projecttask` |
| Option set SchemaName | PascalCase with prefix | `cr123_TaskPriority` |
| Logical names | Auto-generated lowercase | `cr123_projecttask` |

- No spaces in schema names (use PascalCase)
- Descriptions should be meaningful and complete sentences
- Display names should be user-friendly with proper casing and spaces

---

## Solution-Aware Development

**Default behavior:** Always work within a solution context.

When generating API calls:
1. Ask for (or assume) the solution unique name
2. Include the `MSCRM.SolutionUniqueName` header on all create operations
3. For existing components, use `AddSolutionComponent` action to add them to the solution
4. Track which components are in the solution for export

Solution-aware operations ensure components are properly packaged for deployment across environments (dev, test, production).

---

## Dataverse Limits

Be aware of these platform limits:

| Limit | Value |
|-------|-------|
| Custom tables per environment | 1,000 |
| Columns per table | 1,200 (including system columns) |
| Custom columns per table | ~500 practical limit |
| N:N relationships per table | 500 |
| 1:N relationships per table | Varies (~500) |
| Option set options | 2,000 per option set |
| String column max length | 4,000 characters (memo: 1,048,576) |
| Entity name max length | 128 characters |
| Attribute name max length | 128 characters |
| Batch request max operations | 1,000 |
| API request max records returned | 5,000 (paginated) |
| File column max size | 10 GB |
| Image column max size | 30 MB |

---

## Reference Files

| File | Content |
|------|---------|
| `references/table-management.md` | Create, modify, delete tables; ownership, auditing, alternate keys, table types |
| `references/column-types.md` | All column types with complete API payloads and TypeScript examples |
| `references/relationships.md` | 1:N, N:1, N:N relationships; cascading behavior configuration |
| `references/option-sets.md` | Global and local option sets; add, reorder, retire options |
| `references/solution-management.md` | Solution lifecycle: create, add components, export, import, versioning |
| `references/fetchxml-odata.md` | FetchXML query generation, OData patterns, aggregation, pagination |

## Example Files

| File | Content |
|------|---------|
| `examples/table-operations.md` | Complete TypeScript examples for table CRUD |
| `examples/relationship-patterns.md` | 1:N, N:N, self-referential, polymorphic relationship examples |
| `examples/solution-workflows.md` | Solution export/import/promote scripts |
| `examples/data-seeding.md` | Seed data from CSV/JSON, bulk import, random test data generation |
