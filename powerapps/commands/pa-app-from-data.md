---
name: pa-app-from-data
description: Auto-generate a CRUD canvas app from a data source schema — maps columns to controls automatically
argument-hint: "<dataverse|sharepoint> <source-name> [--columns <col1,col2,...>] [--schema-file <path>] [--app-name <name>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
  - AskUserQuestion
---

# Generate App from Data

Auto-generate a complete CRUD canvas app from a data source schema. Maps each column to the appropriate control type and generates fully bound screens with concrete column references (not placeholders).

## Inputs

| Argument | Required | Default | Description |
|---|---|---|---|
| `<dataverse\|sharepoint>` | Yes | — | Data source type |
| `<source-name>` | Yes | — | Table logical name (Dataverse) or list name (SharePoint) |
| `--columns` | No* | — | Comma-separated column definitions: `name:type` (e.g., `title:text,amount:number,duedate:datetime`) |
| `--schema-file` | No* | — | Path to a JSON schema file (e.g., output from the `dataverse-schema` plugin) |
| `--app-name` | No | `<source-name>App` | App name |

*One of `--columns` or `--schema-file` is required. If neither is provided, prompt the user interactively.

## Column Type to Control Mapping

| Column Type | Gallery Display | Edit Control | Notes |
|---|---|---|---|
| `text` | `label` | `textInput` | Primary text columns use `StartsWith` for delegation |
| `multiline` | `label` (truncated) | `textInput` (Mode: MultiLine) | |
| `number` | `label` (formatted) | `textInput` (Format: Number) | |
| `currency` | `label` (`Text(val, "$#,##0.00")`) | `textInput` (Format: Number) | |
| `datetime` | `label` (`Text(val, "mm/dd/yyyy")`) | `datePicker` | |
| `boolean` | `label` (Yes/No) | `toggle` | |
| `choice` | `label` (`.Value`) | `dropdown` | Items from choice column metadata |
| `lookup` | `label` (display name) | `comboBox` | Items bound to related table |
| `email` | `label` | `textInput` (Format: Email) | |
| `url` | `label` (hyperlink) | `textInput` | |
| `image` | `image` | Upload button pattern | |
| `file` | `label` (file name) | Upload button pattern | |

## Instructions

### Step 1: Resolve Schema

**If `--schema-file` is provided:**

Read the JSON file. Expected format:

```json
{
  "tableName": "cr_project",
  "displayName": "Project",
  "columns": [
    { "name": "cr_name", "type": "text", "required": true, "primary": true },
    { "name": "cr_description", "type": "multiline", "required": false },
    { "name": "cr_budget", "type": "currency", "required": false },
    { "name": "cr_startdate", "type": "datetime", "required": true },
    { "name": "cr_status", "type": "choice", "required": true, "choices": ["Not Started", "In Progress", "Completed"] },
    { "name": "cr_owner", "type": "lookup", "required": false, "relatedTable": "systemuser" }
  ]
}
```

**If `--columns` is provided:**

Parse the comma-separated `name:type` pairs. Mark the first column as `primary`.

**If neither is provided:**

Prompt the user interactively:

1. Ask for column names and types one by one.
2. Ask which column is the primary display column.
3. Ask which columns are required.

### Step 2: Identify Primary Column

The primary column is used for:

- Gallery display (main label text)
- Delegation-safe search filter (`StartsWith(PrimaryColumn, txtSearch.Text)`)
- Sort order default

If no column is marked `primary`, use the first `text` column.

### Step 3: Generate App Using CRUD Template

Use the CRUD template from `references/app-templates.md` as the base structure. Generate three screens:

**scrList** — Gallery with concrete column bindings:

```yaml
galRecords.Items: |-
  =SortByColumns(
      Filter(
          <source-name>,
          IsBlank(txtSearch.Text) || StartsWith(<primary-column>, txtSearch.Text)
      ),
      "<primary-column>", SortOrder.Ascending
  )
```

Gallery template children: one `label` per column (up to 3 visible in gallery row), using the correct display formatting per type.

**scrDetail** — DisplayForm with all columns:

Generate a display form with sections. Group columns logically:

- Required fields in "General" section
- Optional fields in "Details" section
- Lookup fields in "Related" section

**scrEdit** — EditForm with mapped controls:

For each column, use the control type from the mapping table above. Set:

- `DataField` to the column name
- `Default` values where appropriate
- `Required` based on schema
- Validation in `OnChange` where applicable (e.g., email format)

### Step 4: Data Source-Specific Adjustments

**Dataverse:**

- Use `Patch(DataSource, Defaults(DataSource), {...})` for create.
- `Filter` and `SortByColumns` are fully delegable.
- Choice columns use `.Value` for display, choice set for Dropdown items.

**SharePoint:**

- Use `Patch(DataSource, Defaults(DataSource), {...})` for create.
- `Filter` delegation limited to `=`, `<>`, `StartsWith` on indexed columns.
- Add note about indexing the primary search column.
- Choice columns: use `Choices(DataSource.ColumnName)` for Dropdown items.

### Step 5: Output Summary

Display:

1. File tree of generated project.
2. Column-to-control mapping table showing what was generated.
3. Delegation notes (which filters are delegable, which are not).
4. Next steps: suggest `/pa-deploy` or manual `pac canvas pack`.

## Reference Files

- `.pa.yaml` format: `references/canvas-app-source.md`
- Template patterns: `references/app-templates.md`
- Canvas app patterns: `references/canvas-apps.md`
- Power Fx formulas: `references/power-fx-formulas.md`
