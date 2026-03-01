---
name: teams-project-start
description: Start a new project — create a team from a template with proper naming, ownership, and sensitivity label. Non-technical guided wizard.
argument-hint: "<project-name> [--template <name>] [--owner <upn>] [--label <sensitivity>] [--dry-run]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
  - AskUserQuestion
---

# Start a Project

Create a new Microsoft Teams team for a project. Uses plain language — no IT jargon required.

## Wizard Flow

### Step 1: Project Details
Ask the user in plain language:
- "What's the project name?"
- "Which department is this for?"
- "Who should lead the team?" (becomes the team owner)
- "Who else should be on the team?" (initial members)

### Step 2: Choose a Template
Present templates in friendly language:
- "Standard project" — General channels for planning, updates, and files
- "Client engagement" — Channels for client communication, deliverables, and internal notes
- "Sprint/short project" — Lightweight setup for quick initiatives

### Step 3: Set Visibility
Ask: "Should this team be open to anyone in the company, or private?"
- "Open to everyone" → Public team
- "Private / invite only" → Private team

### Step 4: Apply Sensitivity
Ask: "How sensitive is this project?"
- "Public — anyone can see it" → Public label
- "Internal — company employees only" → Internal label
- "Confidential — team members only" → Confidential label
- "Highly confidential — restricted access" → Highly Confidential label

### Step 5: Create the Team

Apply naming convention automatically:
- Input: "Marketing Campaign" + Department: "Marketing"
- Result: `PRJ-Marketing-Marketing-Campaign-2026`

Create via Graph API with template, owners, members, and sensitivity label.

### Step 6: Completion

```markdown
# Project Started

| Setting | Value |
|---|---|
| Team name | PRJ-Marketing-Marketing-Campaign-2026 |
| Template | Standard project |
| Visibility | Private |
| Sensitivity | Confidential |
| Owner | Jane Smith (jane@contoso.com) |
| Members | 5 added |
| Channels | General, Planning, Updates, Files |

Team link: [link to team]
```

## Arguments

- `<project-name>`: Name for the project
- `--template <name>`: Template to use
- `--owner <upn>`: Team owner's email
- `--label <sensitivity>`: Sensitivity label
- `--dry-run`: Preview what would be created

## Important Notes

- Naming convention is applied automatically — the user provides a friendly name
- At least one owner is required — the wizard ensures this
- Sensitivity labels must exist in the tenant before they can be applied
- Team creation is asynchronous — the wizard polls until the team is ready
- Reference: `skills/teams-lifecycle/SKILL.md` for template and API patterns
