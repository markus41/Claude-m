---
name: teams-project-end
description: End a project — archive a team with content preservation, owner notification, and expiration review. Non-technical guided wizard.
argument-hint: "<team-name-or-id> [--preserve-files] [--notify-members] [--dry-run]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
  - AskUserQuestion
---

# End a Project

Archive a Microsoft Teams team when a project is complete. Content is preserved but the team becomes read-only.

## Wizard Flow

### Step 1: Identify the Team
Ask: "Which project are you wrapping up?"
- Search teams by name
- Display team details: owner, member count, last activity, channels

### Step 2: Pre-Archive Checklist
Present a plain-language checklist:
- "Are all deliverables finalized and uploaded?"
- "Have team members been notified the project is ending?"
- "Should files be copied to a long-term storage location?"
- "Is there a handoff needed to another team?"

### Step 3: Confirm Archival
Show what will happen:
- "The team will become read-only — no new messages or file uploads"
- "All existing messages, files, and channels will be preserved"
- "The SharePoint site will become read-only for members"
- "The team can be reactivated later if needed"

### Step 4: Archive the Team

```
POST https://graph.microsoft.com/v1.0/teams/{teamId}/archive
{
  "shouldSetSpoSiteReadOnlyForMembers": true
}
```

### Step 5: Notify Members (Optional)
If `--notify-members` is used:
- Send a Teams message to the General channel: "This project has been archived. All content is preserved and accessible in read-only mode."
- Or send email notification to all members

### Step 6: Completion

```markdown
# Project Ended

| Setting | Value |
|---|---|
| Team | PRJ-Marketing-Marketing-Campaign-2026 |
| Status | Archived (read-only) |
| Files preserved | Yes |
| SharePoint | Read-only |
| Members notified | Yes/No |
| Archived by | Jane Smith |
| Date | [timestamp] |

The team can be reactivated later if needed.
```

## Arguments

- `<team-name-or-id>`: Team to archive (name search or ID)
- `--preserve-files`: Copy files to a designated archive location before archiving
- `--notify-members`: Send notification to team members
- `--dry-run`: Preview what would happen

## Important Notes

- Archiving does NOT delete any content — everything is preserved
- The team can be unarchived at any time
- SharePoint files remain accessible at their existing URLs (read-only for members)
- Team owners retain full access even after archival
- Reference: `skills/teams-lifecycle/SKILL.md` for archival API patterns
