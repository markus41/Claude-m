---
name: notion-template
description: Generate a complete Notion page from a template pattern (dashboard, wiki, meeting notes, PRD, etc.)
argument-hint: "<template type> [in <parent page>]"
allowed-tools:
  - Read
  - Glob
  - Grep
  - mcp__claude_ai_Notion__notion-search
  - mcp__claude_ai_Notion__notion-fetch
  - mcp__claude_ai_Notion__notion-create-pages
---

# Generate a Notion Page from Template

Create a fully designed Notion page based on a template pattern.

## Available Templates

| Template | Use Case | Key Features |
|----------|----------|--------------|
| **dashboard** | Project tracking | Hero callout, metric columns, sprint table, milestones, blockers |
| **wiki** | Team knowledge base | Sidebar TOC, architecture diagrams, standards, runbooks |
| **meeting** | Recurring meetings | Attendees, agenda, updates, blockers, action items |
| **prd** | Product requirements | Overview, requirements (P0/P1/P2), design, technical approach, timeline |
| **personal** | Personal dashboard | Today's tasks, weekly goals, pinned links, notes |
| **onboarding** | New hire guide | Day 1/Week 1/Month 1 checklists with tips |
| **retro** | Sprint retrospective | What went well, improvements, action items |
| **standup** | Daily standup | Per-person updates, blockers, decisions |

## Instructions

1. **Identify the template**: Match the user's request to a template type above.

2. **Read the template source**: Load `${CLAUDE_PLUGIN_ROOT}/skills/notion-mastery/examples/page-templates.md` for full Notion Markdown source.

3. **Customize**: Replace placeholder content with the user's specific context:
   - Project names, team members, dates
   - Relevant metrics and categories
   - Appropriate icons and colors

4. **Find parent page**: Ask the user or search for the right location.

5. **Create the page**: Use `notion-create-pages` with customized template content.

6. **Verify**: Fetch the created page to confirm.

## Customization Options

When creating from a template, ask the user about:
- Page title and icon
- Team members to include
- Specific sections to add or remove
- Color scheme preference
- Whether to create associated databases

## Output

After creating, report:
- Template used
- Page title and location
- Sections created
- Next steps for customization
