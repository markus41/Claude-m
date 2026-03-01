---
name: dataverse-seed
description: Seed data into a Dataverse table from CSV, JSON, or generated test data
argument-hint: "<table-name> <source-file|count>"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Grep
  - Glob
---

# Seed Data into a Dataverse Table

You are generating a script to seed data into a Dataverse table. Follow these steps:

## Step 1: Gather Requirements

Ask the user for the following if not already provided:
- **Target table** logical name and entity set name
- **Data source**: One of:
  - **CSV file** path
  - **JSON file** path
  - **Generated**: number of random test records to create
- **Publisher prefix** (e.g., `cr123`)
- **Environment URL**

### For file-based seeding:
- Read the file to understand its structure
- Ask for column mapping if not obvious (CSV/JSON field -> Dataverse column)

### For generated data:
- Ask which columns to populate and what kind of data (names, dates, numbers, choices)

### For lookup bindings:
- Ask how to resolve lookups (by name, by alternate key, by GUID)

## Step 2: Read the Source Data

If a file is provided:
- Read the file to understand its structure and sample data
- Identify columns and data types
- Identify any foreign key / lookup references that need resolution

## Step 3: Plan the Mapping

Create a mapping table:
| Source Field | Dataverse Column | Type | Transform |
|---|---|---|---|
| name | cr123_name | String | Direct |
| amount | cr123_amount | Money | parseFloat |
| project | cr123_ProjectId@odata.bind | Lookup | Resolve by name |

## Step 4: Generate the Script

Generate a TypeScript (or Python, if requested) script that:

1. **Reads the source data** (CSV parsing, JSON loading, or random generation)
2. **Builds a lookup cache** for any foreign key references (fetch all referenced records first)
3. **Maps each source row** to a Dataverse record object
4. **Handles lookup bindings** using `@odata.bind` syntax:
   ```
   "cr123_ProjectId@odata.bind": "/cr123_projects({guid})"
   ```
5. **Batches requests** in groups of 50 using `Promise.all`
6. **Tracks results**: count successes and failures
7. **Reports errors** with the specific row and error message

### Important patterns:
- Use `Promise.all` with batches of 50 for parallel creation
- For very large datasets (1000+), use `$batch` requests instead
- Always build lookup caches before the main loop to avoid N+1 queries
- Handle null/empty values gracefully (skip or use null)
- Convert dates to ISO 8601 format
- Convert numbers from strings using `parseInt` / `parseFloat`
- For choice columns, map labels to integer values

## Step 5: Output

Present to the user:
1. The column mapping table
2. The complete TypeScript/Python script
3. Expected behavior summary (batch size, error handling)
4. Any warnings about lookup resolution or data format
