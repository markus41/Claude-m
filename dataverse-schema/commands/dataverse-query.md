---
name: dataverse-query
description: Generate a FetchXML or OData query for Dataverse data retrieval
argument-hint: "<description-of-what-to-query>"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Grep
  - Glob
---

# Generate a Dataverse Query

You are generating a query to retrieve data from Dataverse. Follow these steps:

## Step 1: Understand the Query Requirements

Ask the user for the following if not already provided:
- **What data** they want to retrieve (which table, which columns)
- **Filter conditions** (status, date range, specific values, related record conditions)
- **Sorting** requirements
- **Aggregation** needs (count, sum, average, group by)
- **Related data** to include (join/expand other tables)
- **Pagination** requirements (page size, specific page)
- **Preferred format**: FetchXML or OData (recommend FetchXML for complex queries, OData for simple ones)

## Step 2: Choose the Right Query Language

- **Use OData** for:
  - Simple CRUD queries with basic filtering
  - Queries that will be used in Power Automate or client-side code
  - Single-table queries with straightforward filters

- **Use FetchXML** for:
  - Complex multi-table joins
  - Aggregation queries (count, sum, group by)
  - Queries using date-relative operators (last-x-days, this-month)
  - Queries using hierarchy operators (above, under)
  - Queries needing paging cookies for efficient pagination

## Step 3: Generate the Query

### FetchXML Generation Rules:
- Always include `<attribute>` elements for specific columns (never omit to avoid returning all columns)
- Use `<filter type="and">` / `<filter type="or">` for conditions
- Use `<link-entity>` for joins with proper `from`/`to` attributes
- Use `<order>` for sorting
- Set `top` or `count` for pagination
- For aggregation: add `aggregate="true"` to `<fetch>` and appropriate `aggregate` attributes

### OData Generation Rules:
- Always include `$select` to limit columns
- Use `$filter` with proper operators
- Use `$expand` for related records (with nested `$select`)
- Use `$orderby` for sorting
- Use `$top` and/or `$count=true` for pagination
- Use `$apply` for aggregation

## Step 4: Generate Both Formats

When practical, provide both:
1. The FetchXML query
2. The equivalent OData URL
3. Note any differences in capability between the two versions

## Step 5: Generate TypeScript Execution Code

Generate a TypeScript function that:
- Executes the query using `fetch`
- Uses proper URL encoding for FetchXML
- Includes the `Prefer: odata.include-annotations="*"` header for formatted values
- Handles pagination if applicable
- Returns typed results
- Includes error handling

## Step 6: Output

Present to the user:
1. The query in the requested format (or both)
2. TypeScript execution code
3. Expected result structure
4. Performance notes (indexes, pagination advice)
5. If aggregation: clarify how results are structured differently from regular queries
