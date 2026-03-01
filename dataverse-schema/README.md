# dataverse-schema

A Claude Code knowledge plugin for creating and managing Microsoft Dataverse tables, columns, relationships, option sets, and solutions via the Dataverse Web API (v9.2).

## What This Plugin Does

This plugin gives Claude deep expertise in Dataverse schema management so it can:

- Generate correct Web API payloads for creating tables, columns, and relationships
- Design schemas following Dataverse naming conventions and best practices
- Configure cascading behavior for relationships
- Build FetchXML and OData queries
- Create solution export/import automation scripts
- Seed data from CSV/JSON files or generate test data
- Review schema designs for correctness and performance

## Scope

- Strictly tables, columns, relationships, option sets, and solutions
- No model-driven app layout scaffolding
- Supports both solution-aware and unmanaged component creation
- Default: work within a solution context

## Commands

### `/dataverse-table-create <table-name> [description]`
Create a new custom table with a primary name column and optional additional columns. Generates the complete `EntityDefinitions` POST payload and TypeScript code.

### `/dataverse-column-add <table-name> <column-name> [type]`
Add a column to an existing table. Determines the correct `AttributeMetadata` subtype based on the description and generates the full API payload.

### `/dataverse-relationship-create <parent-table> <child-table> [1:N|N:N]`
Create a 1:N or N:N relationship between tables. Configures cascading behavior and generates the `RelationshipDefinitions` payload.

### `/dataverse-optionset-create <name> <options...>`
Create a global or local option set with proper value numbering, colors, and labels.

### `/dataverse-seed <table-name> <source-file|count>`
Generate a script to seed data from CSV, JSON, or random test data. Handles lookup bindings and batches requests in groups of 50.

### `/dataverse-query <description>`
Generate a FetchXML or OData query based on a natural language description. Provides both formats when practical, plus TypeScript execution code.

### `/dataverse-solution-export <solution-name> [managed|unmanaged]`
Generate a script to export a solution as a zip file. Handles publishing, base64 decoding, and file writing.

### `/dataverse-solution-import <solution-zip-path> [target-env-url]`
Generate a script to import a solution with async status polling. Handles large solution timeouts and connection reference mapping.

## Skill Knowledge

The core skill (`skills/dataverse-schema/SKILL.md`) provides:
- Metadata Web API overview (EntityDefinitions, AttributeMetadata, RelationshipDefinitions)
- Table creation quick reference with all key properties
- Column type decision tree
- Relationship types summary with trade-offs
- Publisher prefix and naming conventions
- Solution-aware development defaults
- Dataverse platform limits

### Reference Files

| File | Content |
|------|---------|
| `references/table-management.md` | Create, modify, delete tables; alternate keys; table types (standard, activity, virtual, elastic); managed properties |
| `references/column-types.md` | All column types with complete API payloads: String, Integer, Decimal, Float, Currency, DateTime, Boolean, Choice, MultiSelect, Lookup, Polymorphic, File, Image, Calculated, Rollup, Auto-number |
| `references/relationships.md` | 1:N and N:N relationships; cascading behavior configuration; self-referential and hierarchical; polymorphic lookups |
| `references/option-sets.md` | Global and local option sets; add, reorder, retire options; Status/StatusReason special option sets |
| `references/solution-management.md` | Solution lifecycle: publisher, create, add/remove components, export managed/unmanaged, async import, versioning, layering |
| `references/fetchxml-odata.md` | FetchXML structure, filter operators, link-entity joins, aggregation, pagination with paging cookies, OData equivalents |

### Example Files

| File | Content |
|------|---------|
| `examples/table-operations.md` | 7 complete TypeScript examples for table CRUD, auto-number, activity tables, alternate keys |
| `examples/relationship-patterns.md` | 5 examples: 1:N with tight/loose/restrict coupling, N:N with association, self-referential hierarchy, polymorphic Customer lookup |
| `examples/solution-workflows.md` | 5 examples: create publisher/solution, add components, export (TypeScript + Bash), async import with polling, dev-to-prod pipeline |
| `examples/data-seeding.md` | 5 examples: CSV import, JSON with lookup binding, random test data generation, option set seeding, batch requests |

## Agent

### Schema Reviewer
Reviews Dataverse schema designs for:
- Naming convention compliance
- Column type appropriateness
- Relationship and cascading behavior correctness
- Solution structure and layering concerns
- Query efficiency
- API payload correctness

## Quick Start

1. Place this plugin in your Claude Code plugins directory
2. Use any command (e.g., `/dataverse-table-create Customer`) to start
3. Claude will ask for any missing information (prefix, solution name, etc.)
4. Receive complete API payloads and TypeScript code ready for use

## API Version

All payloads target **Dataverse Web API v9.2**:
```
{environmentUrl}/api/data/v9.2/
```

## Publisher Prefix

Every schema object requires a publisher prefix. Common format: 2-5 lowercase characters (e.g., `cr123`, `contoso`). The prefix is defined on the Publisher record and applied to all SchemaName values.
