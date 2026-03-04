---
name: notion-db
description: Create or modify a Notion database with schema, views, relations, and rollups
argument-hint: "<description of the database to create or modify>"
allowed-tools:
  - Read
  - Glob
  - Grep
  - mcp__claude_ai_Notion__notion-search
  - mcp__claude_ai_Notion__notion-fetch
  - mcp__claude_ai_Notion__notion-create-database
  - mcp__claude_ai_Notion__notion-update-data-source
  - mcp__claude_ai_Notion__notion-create-pages
---

# Create or Modify a Notion Database

Design and create a production-ready Notion database, or modify an existing one.

## Instructions

### Creating a New Database

1. **Understand requirements**: Parse what data the user wants to track and what workflows they need.

2. **Design the schema**: Choose appropriate property types:
   - Use **Status** (not Select) for workflow tracking — it powers Kanban boards
   - Use **Select** for single-choice categories (priority, type)
   - Use **Multi-select** for tags and labels
   - Use **Date** for deadlines and events
   - Use **People** for assignees
   - Use **Formula** for computed values (never manually maintain derived data)
   - Use **Relation** to link databases (not duplicate data)
   - Use **Rollup** to aggregate related data

3. **Read schema examples**: For common use cases, read `${CLAUDE_PLUGIN_ROOT}/skills/notion-mastery/examples/database-schemas.md`.

4. **Find parent page**: Ask the user or search for an appropriate parent.

5. **Create the database**: Use `notion-create-database` with:
   - Descriptive title
   - Complete property schema
   - Database icon
   - Set `inline="true"` for visible databases

6. **Add initial entries** (optional): Use `notion-create-pages` to create sample entries.

7. **Suggest views**: Recommend useful views based on the schema:
   - Board view for status tracking
   - Calendar view for date-based data
   - Gallery view for visual content
   - Filtered views for common queries

### Modifying an Existing Database

1. **Fetch current schema**: Use `notion-fetch` to read the database.
2. **Plan changes**: Identify what to add, rename, or reconfigure.
3. **Apply changes**: Use `notion-update-data-source`.
4. **Verify**: Fetch again to confirm changes.

## Schema Design Principles

- Start minimal — add properties as needed
- Name properties clearly ("Due Date" not "Date", "Assignee" not "Person")
- Use consistent naming across related databases
- Plan for relations before creating — it's easier to set up upfront

## Formula Reference

For formula help, read `${CLAUDE_PLUGIN_ROOT}/skills/notion-mastery/references/formula-language.md`.

## Output

After creating, report:
- Database name and location
- Properties created (with types)
- Recommended views and filters
- Suggested formulas for computed values
