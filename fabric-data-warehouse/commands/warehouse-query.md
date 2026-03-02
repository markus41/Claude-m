---
name: warehouse-query
description: "Generate optimized T-SQL queries, views, or CTEs for the Fabric Data Warehouse"
argument-hint: "<description> [--view] [--cte] [--cross-db]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

# Generate a Warehouse Query

Create an optimized T-SQL query, view, or CTE based on a natural-language description.

## Instructions

### 1. Parse the Request

- `<description>` — What the query should return (e.g., "monthly sales by product category with year-over-year comparison").
- `--view` — Wrap the query in a `CREATE VIEW rpt.<name>` statement.
- `--cte` — Structure the query using CTEs for readability.
- `--cross-db` — The query spans multiple databases (warehouse + lakehouse or warehouse + warehouse).

### 2. Identify Tables and Joins

Based on the description, identify:
- Which dimension and fact tables are involved.
- The join keys (surrogate keys between fact and dimension tables).
- Any filters (date ranges, categories, regions).
- Aggregation level and measures.

If the tables are not obvious, ask the user or scan existing SQL files in the project for table definitions.

### 3. Generate the Query

**Query optimization rules** (always apply):
- Never use `SELECT *` — list specific columns.
- Apply `WHERE` filters as early as possible, especially on date columns.
- Use `DECIMAL` for currency calculations, never `FLOAT`.
- Use `APPROX_COUNT_DISTINCT` for approximate large-cardinality counts.
- Prefer `LEFT JOIN` over subqueries for nullable dimension lookups.
- Use `ISNULL()` or `COALESCE()` for NULL-safe calculations.
- Add `OPTION (LABEL = '<description>')` for production queries.

**When --cte**:
- Break complex logic into named CTEs.
- Each CTE should have a clear, descriptive name (e.g., `MonthlySales`, `CustomerSegments`).
- Final SELECT references the CTEs.

**When --cross-db**:
- Use three-part naming: `database.schema.table`.
- Verify referenced databases exist in the workspace.
- Add comments noting which database each table comes from.

**When --view**:
- Wrap in `CREATE VIEW rpt.<ViewName> AS`.
- Place in the `rpt` schema by default.
- Views must not contain `ORDER BY` unless `TOP` or `OFFSET` is used.

### 4. Add Window Functions Where Appropriate

Common patterns to apply when the description implies them:
- "running total" → `SUM() OVER (ORDER BY ...)`
- "rank" or "top N per group" → `ROW_NUMBER() OVER (PARTITION BY ... ORDER BY ...)`
- "year-over-year" or "month-over-month" → `LAG() OVER (ORDER BY ...)`
- "moving average" → `AVG() OVER (ORDER BY ... ROWS BETWEEN ...)`
- "percent of total" → `SUM() OVER ()` for grand total

### 5. Output

Write the query to a SQL file (e.g., `views/<name>.sql` or `queries/<name>.sql`) or display inline.

Show the user:
- The generated query with comments explaining each section
- Expected output columns and their meanings
- Performance notes (estimated data scanned, recommended statistics)
- How to test: paste into Azure Data Studio or SSMS connected to the warehouse
