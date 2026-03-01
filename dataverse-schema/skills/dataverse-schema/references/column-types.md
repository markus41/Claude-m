# Column Types — Dataverse Web API

## Overview

Every column in Dataverse is represented by an `AttributeMetadata` subtype. When creating a column, you POST to the table's `Attributes` collection with the correct `@odata.type` discriminator. Each type has specific properties that control behavior, validation, and formatting.

### Common Endpoint

```
POST {environmentUrl}/api/data/v9.2/EntityDefinitions(LogicalName='{tableName}')/Attributes
```

Include the `MSCRM.SolutionUniqueName` header to create within a solution context.

### Common Properties (All Column Types)

| Property | Type | Description |
|----------|------|-------------|
| `SchemaName` | string | PascalCase with publisher prefix |
| `DisplayName` | Label | User-visible name |
| `Description` | Label | Description for documentation |
| `RequiredLevel` | ManagedProperty | `None`, `Recommended`, `ApplicationRequired`, `SystemRequired` |
| `IsAuditEnabled` | ManagedProperty | Enable auditing on this column |

### Helper: Label Shorthand

Throughout this document, `label("Text")` means:
```json
{
  "@odata.type": "Microsoft.Dynamics.CRM.Label",
  "LocalizedLabels": [{ "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", "Label": "Text", "LanguageCode": 1033 }]
}
```

---

## String — `StringAttributeMetadata`

For text columns of all kinds: single-line text, email, URL, phone, ticker symbol, text area, and rich text.

### API Payload

```json
{
  "@odata.type": "Microsoft.Dynamics.CRM.StringAttributeMetadata",
  "SchemaName": "cr123_EmailAddress",
  "DisplayName": { "@odata.type": "Microsoft.Dynamics.CRM.Label", "LocalizedLabels": [{ "Label": "Email Address", "LanguageCode": 1033 }] },
  "Description": { "@odata.type": "Microsoft.Dynamics.CRM.Label", "LocalizedLabels": [{ "Label": "Contact email address", "LanguageCode": 1033 }] },
  "RequiredLevel": { "Value": "Recommended" },
  "MaxLength": 320,
  "FormatName": { "Value": "Email" }
}
```

### String Formats

| FormatName Value | Use Case | Max Length |
|------------------|----------|-----------|
| `Text` | General single-line text | 4,000 |
| `TextArea` | Multi-line plain text | 1,048,576 |
| `RichText` | Rich text with HTML formatting | 1,048,576 |
| `Email` | Email address with mailto: link | 320 |
| `Phone` | Phone number with click-to-call | 64 |
| `Url` | Clickable URL | 500 |
| `TickerSymbol` | Stock ticker with link to financial data | 10 |
| `Json` | JSON data storage (no UI rendering) | 1,048,576 |

### TypeScript

```typescript
interface StringColumnDef {
  "@odata.type": "Microsoft.Dynamics.CRM.StringAttributeMetadata";
  SchemaName: string;
  DisplayName: DataverseLabel;
  MaxLength: number;
  FormatName: { Value: "Text" | "TextArea" | "RichText" | "Email" | "Phone" | "Url" | "TickerSymbol" | "Json" };
  RequiredLevel?: { Value: string };
}
```

### Gotchas
- `MaxLength` for `Text` format defaults to 100 if not specified
- `TextArea` and `RichText` columns cannot be used in views as sortable/filterable columns
- `Email` format adds automatic validation but does not prevent invalid input via API

---

## Integer — `IntegerAttributeMetadata`

For whole numbers.

### API Payload

```json
{
  "@odata.type": "Microsoft.Dynamics.CRM.IntegerAttributeMetadata",
  "SchemaName": "cr123_Quantity",
  "DisplayName": { "@odata.type": "Microsoft.Dynamics.CRM.Label", "LocalizedLabels": [{ "Label": "Quantity", "LanguageCode": 1033 }] },
  "MinValue": 0,
  "MaxValue": 100000,
  "Format": "None"
}
```

### Integer Formats

| Format | Description |
|--------|-------------|
| `None` | Standard integer |
| `Duration` | Duration in minutes (UI shows days/hours/minutes) |
| `TimeZone` | Time zone code |
| `Language` | Language code (LCID) |
| `Locale` | Locale identifier |

### Gotchas
- Default range is -2,147,483,648 to 2,147,483,647
- `Duration` format stores minutes as integer; the UI formats display
- No decimal places; use `DecimalAttributeMetadata` or `DoubleAttributeMetadata` for fractional values

---

## Decimal — `DecimalAttributeMetadata`

For precise decimal numbers (up to 10 decimal places).

### API Payload

```json
{
  "@odata.type": "Microsoft.Dynamics.CRM.DecimalAttributeMetadata",
  "SchemaName": "cr123_UnitPrice",
  "DisplayName": { "@odata.type": "Microsoft.Dynamics.CRM.Label", "LocalizedLabels": [{ "Label": "Unit Price", "LanguageCode": 1033 }] },
  "Precision": 2,
  "MinValue": 0.00,
  "MaxValue": 999999999.99
}
```

### Gotchas
- `Precision` range: 0-10
- Suitable for financial calculations where exact decimal representation matters
- Larger storage than Float; prefer Float for scientific/approximate values

---

## Float — `DoubleAttributeMetadata`

For floating-point numbers (up to 5 decimal places).

### API Payload

```json
{
  "@odata.type": "Microsoft.Dynamics.CRM.DoubleAttributeMetadata",
  "SchemaName": "cr123_Latitude",
  "DisplayName": { "@odata.type": "Microsoft.Dynamics.CRM.Label", "LocalizedLabels": [{ "Label": "Latitude", "LanguageCode": 1033 }] },
  "Precision": 5,
  "MinValue": -90.0,
  "MaxValue": 90.0
}
```

### Gotchas
- `Precision` range: 0-5 (less than Decimal)
- Subject to floating-point rounding; do not use for currency
- Good for coordinates, percentages, scientific measurements

---

## Currency — `MoneyAttributeMetadata`

For monetary values. Automatically links to the transaction currency.

### API Payload

```json
{
  "@odata.type": "Microsoft.Dynamics.CRM.MoneyAttributeMetadata",
  "SchemaName": "cr123_TotalAmount",
  "DisplayName": { "@odata.type": "Microsoft.Dynamics.CRM.Label", "LocalizedLabels": [{ "Label": "Total Amount", "LanguageCode": 1033 }] },
  "Precision": 2,
  "PrecisionSource": 2,
  "MinValue": 0.0,
  "MaxValue": 1000000.0
}
```

### PrecisionSource Values

| Value | Meaning |
|-------|---------|
| `0` | Use the `Precision` property value |
| `1` | Use the organization pricing decimal precision |
| `2` | Use the currency precision |

### Gotchas
- Creating a Money column automatically creates a companion `_base` column (base currency value)
- The `transactioncurrencyid` lookup is auto-added to the table if not present
- Always set `PrecisionSource` explicitly; default behavior may vary

---

## DateTime — `DateTimeAttributeMetadata`

For date and date-time values.

### API Payload

```json
{
  "@odata.type": "Microsoft.Dynamics.CRM.DateTimeAttributeMetadata",
  "SchemaName": "cr123_DueDate",
  "DisplayName": { "@odata.type": "Microsoft.Dynamics.CRM.Label", "LocalizedLabels": [{ "Label": "Due Date", "LanguageCode": 1033 }] },
  "Format": "DateOnly",
  "DateTimeBehavior": { "Value": "DateOnly" }
}
```

### Format and Behavior Matrix

| Format | DateTimeBehavior | Description |
|--------|-----------------|-------------|
| `DateOnly` | `DateOnly` | Date with no time component, no timezone conversion |
| `DateAndTime` | `UserLocal` | Full date-time, converted to user's time zone |
| `DateAndTime` | `TimeZoneIndependent` | Full date-time, stored and displayed as-is |
| `DateOnly` | `UserLocal` | Date only, converted to user's time zone at midnight |

### Gotchas
- `DateTimeBehavior` **cannot be changed** after creation for `DateOnly` and `TimeZoneIndependent`
- `UserLocal` stores in UTC and converts on display
- `TimeZoneIndependent` is best for absolute timestamps (e.g., event start times that don't shift)
- `DateOnly` with `DateOnly` behavior is best for birthdays, deadlines

---

## Boolean — `BooleanAttributeMetadata`

For yes/no toggle fields.

### API Payload

```json
{
  "@odata.type": "Microsoft.Dynamics.CRM.BooleanAttributeMetadata",
  "SchemaName": "cr123_IsActive",
  "DisplayName": { "@odata.type": "Microsoft.Dynamics.CRM.Label", "LocalizedLabels": [{ "Label": "Is Active", "LanguageCode": 1033 }] },
  "DefaultValue": true,
  "OptionSet": {
    "@odata.type": "Microsoft.Dynamics.CRM.BooleanOptionSetMetadata",
    "TrueOption": {
      "Value": 1,
      "Label": { "@odata.type": "Microsoft.Dynamics.CRM.Label", "LocalizedLabels": [{ "Label": "Yes", "LanguageCode": 1033 }] }
    },
    "FalseOption": {
      "Value": 0,
      "Label": { "@odata.type": "Microsoft.Dynamics.CRM.Label", "LocalizedLabels": [{ "Label": "No", "LanguageCode": 1033 }] }
    }
  }
}
```

### Gotchas
- True is always `1`, False is always `0`
- The `OptionSet` must be a `BooleanOptionSetMetadata`, not a standard `OptionSetMetadata`
- Labels can be customized (e.g., "Active"/"Inactive", "Enabled"/"Disabled")

---

## Choice (Option Set) — `PicklistAttributeMetadata`

For single-select dropdown fields with a local option set.

### API Payload (Local Option Set)

```json
{
  "@odata.type": "Microsoft.Dynamics.CRM.PicklistAttributeMetadata",
  "SchemaName": "cr123_Priority",
  "DisplayName": { "@odata.type": "Microsoft.Dynamics.CRM.Label", "LocalizedLabels": [{ "Label": "Priority", "LanguageCode": 1033 }] },
  "DefaultFormValue": 100000,
  "OptionSet": {
    "@odata.type": "Microsoft.Dynamics.CRM.OptionSetMetadata",
    "IsGlobal": false,
    "OptionSetType": "Picklist",
    "Options": [
      { "Value": 100000, "Label": { "@odata.type": "Microsoft.Dynamics.CRM.Label", "LocalizedLabels": [{ "Label": "Low", "LanguageCode": 1033 }] } },
      { "Value": 100001, "Label": { "@odata.type": "Microsoft.Dynamics.CRM.Label", "LocalizedLabels": [{ "Label": "Medium", "LanguageCode": 1033 }] } },
      { "Value": 100002, "Label": { "@odata.type": "Microsoft.Dynamics.CRM.Label", "LocalizedLabels": [{ "Label": "High", "LanguageCode": 1033 }] } },
      { "Value": 100003, "Label": { "@odata.type": "Microsoft.Dynamics.CRM.Label", "LocalizedLabels": [{ "Label": "Critical", "LanguageCode": 1033 }] } }
    ]
  }
}
```

### Using a Global Option Set

```json
{
  "@odata.type": "Microsoft.Dynamics.CRM.PicklistAttributeMetadata",
  "SchemaName": "cr123_Category",
  "DisplayName": { "@odata.type": "Microsoft.Dynamics.CRM.Label", "LocalizedLabels": [{ "Label": "Category", "LanguageCode": 1033 }] },
  "GlobalOptionSet@odata.bind": "/GlobalOptionSetDefinitions('{globalOptionSetId}')"
}
```

### Gotchas
- Option `Value` must be unique within the option set
- Start custom values at 100000+ to avoid conflicts with system values
- `DefaultFormValue` of `-1` means "no default"

---

## MultiSelect Choice — `MultiSelectPicklistAttributeMetadata`

For multi-select dropdown fields.

### API Payload

```json
{
  "@odata.type": "Microsoft.Dynamics.CRM.MultiSelectPicklistAttributeMetadata",
  "SchemaName": "cr123_Tags",
  "DisplayName": { "@odata.type": "Microsoft.Dynamics.CRM.Label", "LocalizedLabels": [{ "Label": "Tags", "LanguageCode": 1033 }] },
  "OptionSet": {
    "@odata.type": "Microsoft.Dynamics.CRM.OptionSetMetadata",
    "IsGlobal": false,
    "OptionSetType": "Picklist",
    "Options": [
      { "Value": 100000, "Label": { "@odata.type": "Microsoft.Dynamics.CRM.Label", "LocalizedLabels": [{ "Label": "Important", "LanguageCode": 1033 }] } },
      { "Value": 100001, "Label": { "@odata.type": "Microsoft.Dynamics.CRM.Label", "LocalizedLabels": [{ "Label": "Urgent", "LanguageCode": 1033 }] } },
      { "Value": 100002, "Label": { "@odata.type": "Microsoft.Dynamics.CRM.Label", "LocalizedLabels": [{ "Label": "Review", "LanguageCode": 1033 }] } }
    ]
  }
}
```

### Gotchas
- Stored as comma-separated integers in the database
- Cannot be used in calculated/rollup columns
- Limited filtering support in views compared to single-select
- Values are returned as a comma-separated string in OData (e.g., `"100000,100001"`)

---

## Lookup — `LookupAttributeMetadata`

For foreign-key relationships to other tables.

### API Payload

**Important:** You typically do NOT create lookup columns directly. Instead, create a 1:N relationship via `RelationshipDefinitions`, which auto-creates the lookup column on the "many" side. If you must create the lookup directly:

```json
{
  "@odata.type": "Microsoft.Dynamics.CRM.LookupAttributeMetadata",
  "SchemaName": "cr123_ProjectId",
  "DisplayName": { "@odata.type": "Microsoft.Dynamics.CRM.Label", "LocalizedLabels": [{ "Label": "Project", "LanguageCode": 1033 }] },
  "Targets": ["cr123_project"]
}
```

### Gotchas
- Creating a lookup directly does NOT create the relationship metadata — prefer the relationship approach
- `Targets` is an array; single-target lookups have one entry
- The lookup column's logical name becomes the navigation property minus the `@odata.bind` suffix

---

## Polymorphic Lookup

Polymorphic lookups point to multiple table types. Dataverse has built-in patterns:

### Customer Lookup
Targets both `account` and `contact`:
```json
{
  "@odata.type": "Microsoft.Dynamics.CRM.LookupAttributeMetadata",
  "SchemaName": "cr123_CustomerId",
  "DisplayName": { "@odata.type": "Microsoft.Dynamics.CRM.Label", "LocalizedLabels": [{ "Label": "Customer", "LanguageCode": 1033 }] },
  "Targets": ["account", "contact"]
}
```

### Regarding Lookup
Activity tables have a built-in `regardingobjectid` polymorphic lookup.

### Gotchas
- Custom polymorphic lookups (targeting 3+ tables) are not supported via the API — use the Customer or Regarding pattern
- When setting a polymorphic lookup value, you must specify both the ID and the entity type:
  ```json
  { "cr123_CustomerId_account@odata.bind": "/accounts({guid})" }
  ```

---

## File — `FileAttributeMetadata`

For file attachments.

### API Payload

```json
{
  "@odata.type": "Microsoft.Dynamics.CRM.FileAttributeMetadata",
  "SchemaName": "cr123_Document",
  "DisplayName": { "@odata.type": "Microsoft.Dynamics.CRM.Label", "LocalizedLabels": [{ "Label": "Document", "LanguageCode": 1033 }] },
  "MaxSizeInKB": 131072
}
```

### Gotchas
- Max file size: 10 GB (10,485,760 KB)
- File upload/download uses chunked API, not inline JSON
- No inline preview in forms for most file types
- Storage counts toward Dataverse file capacity

---

## Image — `ImageAttributeMetadata`

For image fields with optional thumbnail generation.

### API Payload

```json
{
  "@odata.type": "Microsoft.Dynamics.CRM.ImageAttributeMetadata",
  "SchemaName": "cr123_Photo",
  "DisplayName": { "@odata.type": "Microsoft.Dynamics.CRM.Label", "LocalizedLabels": [{ "Label": "Photo", "LanguageCode": 1033 }] },
  "IsPrimaryImage": true,
  "MaxSizeInKB": 10240,
  "CanStoreFullImage": true
}
```

### Gotchas
- Only one column per table can be `IsPrimaryImage: true`
- Thumbnail (144x144) is always generated
- `CanStoreFullImage: true` stores the original; otherwise only the thumbnail is kept
- Max size: 30 MB (30,720 KB)

---

## Calculated and Rollup Columns

Calculated and rollup columns are defined with a formula. They are created as their base type (String, Integer, Decimal, etc.) with additional formula properties.

### Calculated Column

Calculated columns compute values in real time based on other fields.

```json
{
  "@odata.type": "Microsoft.Dynamics.CRM.IntegerAttributeMetadata",
  "SchemaName": "cr123_DaysOverdue",
  "DisplayName": { "@odata.type": "Microsoft.Dynamics.CRM.Label", "LocalizedLabels": [{ "Label": "Days Overdue", "LanguageCode": 1033 }] },
  "SourceType": 1,
  "FormulaDefinition": "DIFFINDAYS(cr123_duedate, NOW())"
}
```

`SourceType` values: `0` = Simple, `1` = Calculated, `2` = Rollup

### Rollup Column

Rollup columns aggregate values from related records. They compute on a schedule (every 12 hours by default, or on-demand).

```json
{
  "@odata.type": "Microsoft.Dynamics.CRM.DecimalAttributeMetadata",
  "SchemaName": "cr123_TotalHours",
  "DisplayName": { "@odata.type": "Microsoft.Dynamics.CRM.Label", "LocalizedLabels": [{ "Label": "Total Hours", "LanguageCode": 1033 }] },
  "SourceType": 2,
  "Precision": 2
}
```

**Note:** Rollup formulas are typically configured through the UI or solution XML, as the API formula syntax is complex.

---

## Auto-Number — `StringAttributeMetadata` with `AutoNumberFormat`

For automatically incrementing identifiers.

### API Payload

```json
{
  "@odata.type": "Microsoft.Dynamics.CRM.StringAttributeMetadata",
  "SchemaName": "cr123_TicketNumber",
  "DisplayName": { "@odata.type": "Microsoft.Dynamics.CRM.Label", "LocalizedLabels": [{ "Label": "Ticket Number", "LanguageCode": 1033 }] },
  "AutoNumberFormat": "TKT-{SEQNUM:6}-{RANDSTRING:4}",
  "MaxLength": 100,
  "FormatName": { "Value": "Text" }
}
```

### Format Placeholders

| Placeholder | Description | Example |
|-------------|-------------|---------|
| `{SEQNUM:n}` | Sequential number, zero-padded to `n` digits | `{SEQNUM:6}` = `000042` |
| `{RANDSTRING:n}` | Random alphanumeric string of length `n` | `{RANDSTRING:4}` = `A3F7` |
| `{DATETIMEUTC:format}` | UTC date/time | `{DATETIMEUTC:yyyyMMdd}` = `20250115` |

### Gotchas
- Sequence resets are not supported through the API (requires direct SQL in on-premises, or support ticket for online)
- Auto-number columns are read-only after creation
- The seed value can be set with `SetAutoNumberSeed` action
- Combine `SEQNUM` with a prefix for human-readable IDs
