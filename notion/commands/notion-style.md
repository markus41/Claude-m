---
name: notion-style
description: Restyle an existing Notion page with professional design patterns
argument-hint: "<URL of the page to restyle>"
allowed-tools:
  - Read
  - Glob
  - Grep
  - mcp__claude_ai_Notion__notion-fetch
  - mcp__claude_ai_Notion__notion-update-page
  - mcp__claude_ai_Notion__notion-search
---

# Restyle a Notion Page

Transform an existing Notion page into a professionally designed page with proper visual hierarchy, layout, and styling.

## Instructions

1. **Fetch the page**: Use `notion-fetch` to read the current content.

2. **Analyze the page**: Identify:
   - Current structure (headings, paragraphs, lists)
   - Content type (documentation, dashboard, meeting notes, wiki, tracker)
   - What's missing (no callouts, no columns, flat structure, wall of text)

3. **Read design patterns**: Consult `${CLAUDE_PLUGIN_ROOT}/skills/notion-mastery/references/page-design-patterns.md` for applicable patterns.

4. **Plan the redesign**:
   - Add a hero callout at the top (icon + brief description)
   - Convert flat headings to toggle headings where appropriate
   - Add columns for side-by-side content
   - Wrap images in columns with descriptive text
   - Add callouts for tips, warnings, and key information
   - Insert dividers between major sections
   - Move TOC to a toggle or sidebar column
   - Apply a consistent color scheme (2-3 colors)

5. **Present the plan**: Before making changes, show the user what you plan to do:
   - List the specific design changes
   - Explain the color scheme
   - Note any content that will be reorganized

6. **Apply the redesign**: Use `notion-update-page` with the restyled content in Notion-flavored Markdown.

7. **Verify**: Fetch the page again to confirm the styling looks correct.

## Design Checklist

- [ ] Hero callout with icon and description
- [ ] Toggle headings for expandable sections
- [ ] Columns where content benefits from side-by-side layout
- [ ] Callouts for emphasis (tips, warnings, notes)
- [ ] Dividers between major sections
- [ ] Consistent color scheme (2-3 colors)
- [ ] TOC in toggle or sidebar (not at very top)
- [ ] No walls of text — mix block types
- [ ] Heading emojis for visual scanning

## Syntax Reference

For the complete Markdown spec, read `${CLAUDE_PLUGIN_ROOT}/skills/notion-mastery/references/notion-markdown-spec.md`.

## Output

After restyling, report:
- Design changes made
- Color scheme applied
- Suggestions for further enhancement
