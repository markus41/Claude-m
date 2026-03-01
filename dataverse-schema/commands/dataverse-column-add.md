---
name: dataverse-column-add
description: Add a column to an existing Dataverse table via the Web API
argument-hint: "<table-name> <column-name> [type]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Grep
  - Glob
---

# Add a Column to a Dataverse Table

You are adding a new column to an existing Dataverse table. Follow these steps:

## Step 1: Gather Requirements

Ask the user for the following if not already provided:
- **Table logical name** (e.g., `cr123_project`)
- **Column display name** (e.g., "Estimated Hours")
- **Column type** or a description of what the column stores (use the column type decision tree to determine the correct type)
- **Publisher prefix** (e.g., `cr123`)
- **Solution unique name**
- **Required level**: None, Recommended, or ApplicationRequired
- Type-specific properties:
  - String: MaxLength, Format (Text/TextArea/Email/Phone/Url)
  - Integer: MinValue, MaxValue, Format
  - Decimal/Float: Precision, MinValue, MaxValue
  - Currency: Precision, PrecisionSource
  - DateTime: Format (DateOnly/DateAndTime), Behavior (UserLocal/TimeZoneIndependent/DateOnly)
  - Boolean: DefaultValue, TrueOption/FalseOption labels
  - Choice: Options list with values and labels
  - Lookup: Target table(s)
  - Auto-number: Format pattern

## Step 2: Determine the Correct AttributeMetadata Type

Map the user's description to the correct `@odata.type`:
- Text/string -> `Microsoft.Dynamics.CRM.StringAttributeMetadata`
- Whole number -> `Microsoft.Dynamics.CRM.IntegerAttributeMetadata`
- Decimal -> `Microsoft.Dynamics.CRM.DecimalAttributeMetadata`
- Float -> `Microsoft.Dynamics.CRM.DoubleAttributeMetadata`
- Currency/money -> `Microsoft.Dynamics.CRM.MoneyAttributeMetadata`
- Date/time -> `Microsoft.Dynamics.CRM.DateTimeAttributeMetadata`
- Yes/No -> `Microsoft.Dynamics.CRM.BooleanAttributeMetadata`
- Choice/dropdown -> `Microsoft.Dynamics.CRM.PicklistAttributeMetadata`
- Multi-select -> `Microsoft.Dynamics.CRM.MultiSelectPicklistAttributeMetadata`
- Lookup -> Create via relationship (recommend using dataverse-relationship-create instead)
- File -> `Microsoft.Dynamics.CRM.FileAttributeMetadata`
- Image -> `Microsoft.Dynamics.CRM.ImageAttributeMetadata`

## Step 3: Generate the API Payload

Generate a complete `POST {envUrl}/api/data/v9.2/EntityDefinitions(LogicalName='{table}')/Attributes` payload with:
- The correct `@odata.type` discriminator
- `SchemaName` with publisher prefix in PascalCase
- `DisplayName` and `Description` as localized labels
- `RequiredLevel` as specified
- All type-specific properties

## Step 4: Handle Special Cases

- **Lookup columns**: Warn the user that creating a lookup directly does not create the relationship. Recommend using the `dataverse-relationship-create` command instead, which auto-creates the lookup.
- **Auto-number**: Include `AutoNumberFormat` property. Note that auto-number columns are read-only.
- **Calculated/Rollup**: Note that formulas are complex and may need UI configuration.
- **Choice with global option set**: Use `GlobalOptionSet@odata.bind` instead of inline `OptionSet`.

## Step 5: Generate TypeScript Code

Generate a TypeScript function that:
- Uses the correct endpoint with the table's logical name
- Includes the `MSCRM.SolutionUniqueName` header
- Has proper type interfaces
- Includes error handling

## Step 6: Output

Present to the user:
1. The JSON payload
2. The TypeScript implementation
3. Notes about the column type choice and any considerations
4. Reminder about publishing customizations
