---
name: dataverse-relationship-create
description: Create a relationship (1:N or N:N) between Dataverse tables
argument-hint: "<parent-table> <child-table> [1:N|N:N]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Grep
  - Glob
---

# Create a Dataverse Relationship

You are creating a relationship between Dataverse tables. Follow these steps:

## Step 1: Gather Requirements

Ask the user for the following if not already provided:
- **Relationship type**: 1:N (One-to-Many) or N:N (Many-to-Many)
- **Parent/Referenced table** (the "one" side for 1:N, or Entity1 for N:N)
- **Child/Referencing table** (the "many" side for 1:N, or Entity2 for N:N)
- **Publisher prefix** (e.g., `cr123`)
- **Solution unique name**

### For 1:N relationships, also ask:
- **Lookup column display name** (e.g., "Project" on the task table)
- **Required level** for the lookup: None, Recommended, or ApplicationRequired
- **Cascading behavior** preference:
  - Tight (parent owns children): Cascade on assign/delete/share
  - Loose (reference only): NoCascade on most, RemoveLink on delete
  - Restrict (prevent delete if children exist): Restrict on delete
  - Custom: Ask for each action individually
- **Is hierarchical?** (self-referential only)

### For N:N relationships, also ask:
- **Intersect entity name** (auto-generated if not specified)

## Step 2: Determine Relationship Type

If the user is unsure:
- **Use 1:N** when one side clearly "owns" or "contains" the other (parent-child, order-line items)
- **Use N:N** when both sides are equal peers (tags, skills, team members)
- **Use custom intersect table** (two 1:N) when you need attributes on the relationship itself

## Step 3: Generate the API Payload

### For 1:N (OneToManyRelationshipMetadata):

Generate a `POST {envUrl}/api/data/v9.2/RelationshipDefinitions` payload with:
- `@odata.type`: `Microsoft.Dynamics.CRM.OneToManyRelationshipMetadata`
- `SchemaName`: lowercase with prefix (e.g., `cr123_project_projecttask`)
- `ReferencedEntity`: parent table logical name
- `ReferencedAttribute`: parent table primary key
- `ReferencingEntity`: child table logical name
- `ReferencingAttribute`: lookup column logical name (auto-created)
- `Lookup`: LookupAttributeMetadata with SchemaName, DisplayName, RequiredLevel
- `CascadeConfiguration`: All seven cascade actions
- `AssociatedMenuConfiguration`: Navigation display settings

### For N:N (ManyToManyRelationshipMetadata):

Generate a `POST {envUrl}/api/data/v9.2/RelationshipDefinitions` payload with:
- `@odata.type`: `Microsoft.Dynamics.CRM.ManyToManyRelationshipMetadata`
- `SchemaName`: lowercase with prefix
- `Entity1LogicalName` and `Entity2LogicalName`
- `IntersectEntityName`: custom or auto-generated
- `Entity1AssociatedMenuConfiguration` and `Entity2AssociatedMenuConfiguration`

## Step 4: Configure Cascading Behavior (1:N Only)

Based on the user's preference, set the `CascadeConfiguration`:

**Tight coupling:**
- Assign: Cascade, Delete: Cascade, Merge: Cascade, Reparent: Cascade, Share: Cascade, Unshare: Cascade, RollupView: NoCascade

**Loose coupling:**
- Assign: NoCascade, Delete: RemoveLink, Merge: NoCascade, Reparent: NoCascade, Share: NoCascade, Unshare: NoCascade, RollupView: NoCascade

**Restrict delete:**
- Assign: NoCascade, Delete: Restrict, Merge: NoCascade, Reparent: NoCascade, Share: NoCascade, Unshare: NoCascade, RollupView: NoCascade

## Step 5: Generate TypeScript Code

Generate a TypeScript function that:
- Creates the relationship via the RelationshipDefinitions endpoint
- Includes the `MSCRM.SolutionUniqueName` header
- For N:N, also shows the associate/disassociate API calls
- Has proper type interfaces
- Includes error handling

## Step 6: Output

Present to the user:
1. The JSON payload
2. The TypeScript implementation
3. For 1:N: Note that the lookup column is auto-created
4. For N:N: Include associate/disassociate examples
5. Summary of cascading behavior choices and their implications
