---
name: notion-formula
description: Generate or debug a Notion formula from a natural language description
argument-hint: "<description of what the formula should do>"
allowed-tools:
  - Read
  - Glob
  - Grep
  - mcp__claude_ai_Notion__notion-search
  - mcp__claude_ai_Notion__notion-fetch
  - mcp__claude_ai_Notion__notion-update-data-source
---

# Generate a Notion Formula

Create or debug a Notion formula based on the user's description.

## Instructions

1. **Understand the requirement**: Parse what the formula should compute or display.

2. **Identify properties**: Determine which database properties the formula references. If the user provides a database URL, fetch it to see the exact property names.

3. **Read formula reference**: Consult `${CLAUDE_PLUGIN_ROOT}/skills/notion-mastery/references/formula-language.md` for syntax and function reference.

4. **Write the formula**: Use Notion's formula syntax:
   - Use `prop("Property Name")` for property references (case-sensitive)
   - Use `let()` for complex formulas with intermediate variables
   - Always handle empty values with `empty()` checks
   - Guard against division by zero
   - Use `ifs()` for multi-branch conditionals (cleaner than nested `if()`)

5. **Explain the formula**: Break down what each part does.

6. **Apply the formula** (optional): If the user provides a database URL, use `notion-update-data-source` to add or update the formula property.

## Common Formula Patterns

Read `${CLAUDE_PLUGIN_ROOT}/skills/notion-mastery/references/formula-language.md` for:
- Days until deadline with color-coded emoji
- Status emoji mapping
- Progress bar (▓░ visual)
- Priority scoring
- Time tracking summary
- Sprint assignment
- Conditional formatting tags

## Debugging Tips

If a formula returns errors:
- Check property names match exactly (case-sensitive)
- Verify data types (dates vs strings vs numbers)
- Test with `empty()` guards for null values
- Simplify and rebuild incrementally

## Output

Present:
1. The formula code (ready to paste)
2. Explanation of how it works
3. Example outputs for sample data
4. Any caveats or edge cases
