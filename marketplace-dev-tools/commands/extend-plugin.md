---
name: extend-plugin
description: Add new endpoints and commands to an existing plugin
argument-hint: "<plugin-name> [--api-version v1.0|beta] [--area <area-name>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - WebFetch
  - WebSearch
---

# Extend an Existing Plugin

Discover uncovered endpoints for a plugin's service and generate new commands.

## Instructions

### 1. Read the existing plugin

Load the plugin at `{plugin-name}/.claude-plugin/plugin.json`. Read:
- All current command files to inventory covered endpoints
- The SKILL.md to understand current API coverage
- The README.md for documented capabilities

Build a list of currently covered endpoints (method + path).

### 2. Research additional endpoints

Use the same research approach as `/research-service`:
1. Search Microsoft Learn for the service's full API reference.
2. Fetch API reference pages via WebFetch.
3. Extract all available endpoints with methods, permissions, and schemas.

If `--area` is specified, focus only on that API area.
If `--api-version` is specified, focus on that version (useful for discovering beta-only endpoints).

### 3. Identify gaps

Compare discovered endpoints against the current coverage list. Categorize gaps:
- **Missing CRUD operations** — a resource has read but no create/update/delete
- **Missing resources** — entire resource types not covered
- **Beta-only features** — endpoints available in beta but not yet in the plugin
- **Utility operations** — special actions (export, archive, clone, etc.)

### 4. Prioritize

Rank gaps by:
- **Impact** (1-5): How useful is this endpoint for users?
- **Complexity** (1-5): How complex is the request/response?
- **Priority**: Impact - Complexity (higher = build first)

Display the prioritized gap list and let the user choose which to implement.

### 5. Generate new command files

For each selected gap, create a new command file in `{plugin-name}/commands/`:
- Follow the existing naming convention from the plugin
- Use the same frontmatter style and allowed-tools pattern
- Include step-by-step instructions matching the plugin's existing style

### 6. Update plugin files

- **plugin.json**: Add new command paths to the `commands` array
- **SKILL.md**: Add new endpoint tables and update the patterns section
- **README.md**: Add new rows to the Commands table and update the Capabilities table

### 7. Report changes

Display:
- New commands created (with file paths)
- Files modified
- Updated endpoint coverage count
- Reminder to run `npm run validate:all`
