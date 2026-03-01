---
name: dataverse-table-create
description: Create a new Dataverse custom table with columns via the Web API
argument-hint: "<table-name> [description]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Grep
  - Glob
---

# Create a Dataverse Table

You are creating a new Dataverse custom table. Follow these steps:

## Step 1: Gather Requirements

Ask the user for the following if not already provided:
- **Table name** (display name, e.g., "Project Task")
- **Description** of what the table stores
- **Ownership type**: UserOwned (default) or OrganizationOwned
- **Publisher prefix** (e.g., `cr123`) — ask if not obvious from context
- **Solution unique name** — ask if not obvious from context
- **Initial columns** beyond the primary name column (optional, can be added later)

## Step 2: Load Skill Knowledge

Reference the Dataverse Schema skill for:
- Table creation API format
- Column type decision tree
- Naming conventions (PascalCase SchemaName with prefix)
- Solution-aware headers

## Step 3: Generate the API Payload

Generate a complete `POST {envUrl}/api/data/v9.2/EntityDefinitions` payload that includes:
- `@odata.type`: `Microsoft.Dynamics.CRM.EntityMetadata`
- `SchemaName`: PascalCase with publisher prefix (e.g., `cr123_ProjectTask`)
- `DisplayName`: Localized label
- `DisplayCollectionName`: Plural localized label
- `Description`: Localized description
- `OwnershipType`: As specified
- `PrimaryNameAttribute`: logical name of the name column
- `Attributes` array with at least the primary name `StringAttributeMetadata`
- Optional: `HasActivities`, `HasNotes`, `ChangeTrackingEnabled`, `IsAuditEnabled`

## Step 4: Include Additional Columns

If the user specified initial columns:
- Generate separate `POST EntityDefinitions(LogicalName='{table}')/Attributes` payloads for each column
- Use the correct `@odata.type` for each column type (reference column-types.md)
- Apply publisher prefix to every SchemaName

## Step 5: Generate TypeScript Code

Generate a TypeScript function that:
- Uses the `fetch` API
- Has proper interfaces for the request body
- Includes the `MSCRM.SolutionUniqueName` header
- Creates the table first, then adds additional columns
- Includes error handling

## Step 6: Output

Present to the user:
1. The complete JSON payload(s)
2. The TypeScript implementation
3. A summary of what was created (table name, columns, properties)
4. Reminder to publish customizations after creation
