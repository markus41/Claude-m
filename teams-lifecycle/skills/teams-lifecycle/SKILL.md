---
name: teams-lifecycle
description: Deep expertise in Microsoft Teams lifecycle management — team templates, naming policies, ownership enforcement, sensitivity labels, archival, and expiration review via Graph API.
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
triggers:
  - teams lifecycle
  - create team
  - archive team
  - team template
  - project start
  - project end
  - teams governance
  - team naming
  - team expiration
  - teams review
---

# Teams Lifecycle Management

This skill provides knowledge for managing the full lifecycle of Microsoft Teams — from creation with templates to archival — using non-technical, project-oriented language.

## Non-Technical Language Mapping

| User says... | Technical operation |
|---|---|
| "Start a project" | Create team from template |
| "End a project" | Archive team |
| "Who runs this team?" | Check team owners |
| "Is anyone still using this?" | Check team activity |
| "Make it private/confidential" | Apply sensitivity label |
| "Clean up old teams" | Run expiration review |

## Team Creation via Graph API

### Create Team from Template
```
POST https://graph.microsoft.com/v1.0/teams
{
  "template@odata.bind": "https://graph.microsoft.com/v1.0/teamsTemplates('standard')",
  "displayName": "PRJ-Marketing-Campaign-2026",
  "description": "Marketing campaign project team",
  "visibility": "private",
  "members": [
    {
      "@odata.type": "#microsoft.graph.aadUserConversationMember",
      "roles": ["owner"],
      "user@odata.bind": "https://graph.microsoft.com/v1.0/users('{ownerId}')"
    }
  ]
}
```

### Built-in Templates
| Template ID | Description |
|---|---|
| `standard` | Standard team with default channels |
| `educationClass` | Education class team |
| `educationStaff` | Education staff team |
| `healthcareWard` | Healthcare ward team |

### Custom Templates
List available templates:
```
GET https://graph.microsoft.com/v1.0/teamwork/teamTemplates
```

## Naming Policy

### Prefix/Suffix Convention
```
[Type]-[Department]-[Name]-[Year]
```
Examples: `PRJ-Marketing-Campaign-2026`, `DEP-Finance-General`, `TMP-Hiring-Sprint`

### Blocked Words
Use Graph API to check group naming policy:
```
GET https://graph.microsoft.com/v1.0/groupSettings
```

Look for `CustomBlockedWordsList` in the directory settings.

## Sensitivity Labels

### Apply Label to Team
```
PATCH https://graph.microsoft.com/v1.0/groups/{groupId}
{
  "assignedLabels": [
    {
      "labelId": "{sensitivityLabelId}"
    }
  ]
}
```

### Common Labels for Teams
| Label | Privacy | Guest Access | Sharing |
|---|---|---|---|
| Public | Public | Allowed | Unrestricted |
| Internal | Private | Allowed | Organization only |
| Confidential | Private | Blocked | Restricted |
| Highly Confidential | Private | Blocked | Owners only |

## Team Archival

### Archive Team
```
POST https://graph.microsoft.com/v1.0/teams/{teamId}/archive
{
  "shouldSetSpoSiteReadOnlyForMembers": true
}
```

This makes the team read-only. Content is preserved but no new messages or files can be added.

### Unarchive Team (if needed)
```
POST https://graph.microsoft.com/v1.0/teams/{teamId}/unarchive
```

## Expiration Policy

### Set Group Expiration
```
PATCH https://graph.microsoft.com/v1.0/groupLifecyclePolicies/{policyId}
{
  "groupLifetimeInDays": 180,
  "managedGroupTypes": "Selected",
  "alternateNotificationEmails": "admin@contoso.com"
}
```

### Check Team Activity
```
GET https://graph.microsoft.com/v1.0/reports/getTeamsTeamActivityDetail(period='D30')
```

Returns per-team activity: active users, messages, meetings, channel messages.

## Ownership Enforcement

### Check Owners
```
GET https://graph.microsoft.com/v1.0/groups/{groupId}/owners
```

Flag teams with:
- Zero owners (orphaned)
- Only one owner (single point of failure)
- Owners who have left the organization

### Add Owner
```
POST https://graph.microsoft.com/v1.0/groups/{groupId}/owners/$ref
{
  "@odata.id": "https://graph.microsoft.com/v1.0/users/{userId}"
}
```

## Required Permissions

| Operation | Permission |
|---|---|
| Create team | `Team.Create` or `Group.ReadWrite.All` |
| Archive/unarchive | `TeamSettings.ReadWrite.All` |
| Apply sensitivity label | `Group.ReadWrite.All` |
| Read activity reports | `Reports.Read.All` |
| Manage owners | `Group.ReadWrite.All` |
| Expiration policies | `GroupMember.ReadWrite.All` |
