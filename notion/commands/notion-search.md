---
name: notion-search
description: Search and explore the Notion workspace — find pages, databases, and users
argument-hint: "<search query>"
allowed-tools:
  - mcp__claude_ai_Notion__notion-search
  - mcp__claude_ai_Notion__notion-fetch
  - mcp__claude_ai_Notion__notion-get-teams
  - mcp__claude_ai_Notion__notion-get-users
---

# Search the Notion Workspace

Search for pages, databases, users, or teams in the Notion workspace.

## Instructions

1. **Parse the query**: Determine what the user is looking for:
   - A specific page → search with `type: "page"`
   - A database → search with `type: "database"`
   - A person → use `notion-get-users`
   - Workspace structure → use `notion-get-teams`

2. **Execute the search**: Use `notion-search` with the query.

3. **Present results**: Show a clear summary:
   - Page/database title
   - Parent location
   - Last edited time
   - URL for quick access

4. **Offer next steps**:
   - "Fetch the full content" → use `notion-fetch`
   - "Open in Notion" → provide the URL
   - "Update this page" → suggest `/notion-style` or manual update

## Search Tips

- Use specific terms for better results
- Search by page title for exact matches
- Use `notion-get-teams` to understand workspace structure
- Use `notion-get-users` to find team member IDs for Person properties

## Output

Present results as a clean table with title, type, location, and URL.
