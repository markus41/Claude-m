---
name: notion-page
description: Create a professionally designed Notion page with content, styling, and layout
argument-hint: "<description of the page to create>"
allowed-tools:
  - Read
  - Glob
  - Grep
  - mcp__claude_ai_Notion__notion-search
  - mcp__claude_ai_Notion__notion-fetch
  - mcp__claude_ai_Notion__notion-create-pages
  - mcp__claude_ai_Notion__notion-update-page
---

# Create a Notion Page

Create a professionally designed Notion page based on the user's description.

## Instructions

1. **Parse the request**: Understand what kind of page the user wants (dashboard, wiki, meeting notes, project tracker, documentation, etc.)

2. **Find the parent**: Ask the user where to create the page, or search for a suggested parent:
   - Use `notion-search` to find existing pages that could be parents
   - If the user provides a URL, use that directly

3. **Design the page**: Apply professional design patterns from the skill knowledge:
   - Lead with a callout block (icon + brief description)
   - Use toggle headings for scannable sections
   - Use columns for side-by-side content (metrics, sidebar navigation)
   - Place TOC in a toggle or column sidebar (never at the very top)
   - Use callouts sparingly for tips, warnings, and emphasis
   - Use dividers between major sections
   - Pick 2-3 consistent colors

4. **Read design references**: For complex pages, read `${CLAUDE_PLUGIN_ROOT}/skills/notion-mastery/references/page-design-patterns.md` and `${CLAUDE_PLUGIN_ROOT}/skills/notion-mastery/examples/page-templates.md` for layout patterns.

5. **Create the page**: Use `notion-create-pages` with:
   - Proper Notion-flavored Markdown content
   - Page icon (relevant emoji)
   - Meaningful title

6. **Verify**: Fetch the created page to confirm it looks correct.

## Content Guidelines

- Use Notion-flavored Markdown syntax (not standard Markdown)
- Callouts: `::: callout {icon="emoji" color="color_bg"}\nContent\n:::`
- Toggle headings: `## Title {toggle="true"}`
- Columns: `<columns><column>Content</column><column>Content</column></columns>`
- Tables: `<table header-row="true"><tr><td>Cell</td></tr></table>`
- Always indent children with tabs
- Use `<mention-page>` for links (not `<page>` which moves pages)

## Output

After creating, report:
- Page title and location
- Design elements used
- Suggestions for further customization
