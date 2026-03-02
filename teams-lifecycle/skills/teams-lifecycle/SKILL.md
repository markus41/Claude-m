---
name: teams-lifecycle
description: >
  Deep expertise in Microsoft Teams lifecycle management — team templates, naming policies,
  ownership enforcement, sensitivity labels, archival, expiration review, channel management,
  team settings, cloning, and activity reporting via Graph API.
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

This skill provides comprehensive knowledge for managing the full lifecycle of Microsoft Teams — from creation with templates to archival — using Graph API. It includes non-technical language mapping for project-oriented users.

## Base URL

```
https://graph.microsoft.com/v1.0
```

All endpoints below are relative to this base URL unless noted.

## API Endpoints

### Team Management

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/teams` | Create team (from template or group) |
| GET | `/teams/{teamId}` | Get team details |
| PATCH | `/teams/{teamId}` | Update team settings |
| DELETE | `/groups/{groupId}` | Delete team (via group) |
| POST | `/teams/{teamId}/archive` | Archive team |
| POST | `/teams/{teamId}/unarchive` | Unarchive team |
| POST | `/teams/{teamId}/clone` | Clone team |
| GET | `/me/joinedTeams` | List user's teams |

### Channel Management

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/teams/{teamId}/channels` | List channels |
| POST | `/teams/{teamId}/channels` | Create channel |
| GET | `/teams/{teamId}/channels/{channelId}` | Get channel details |
| PATCH | `/teams/{teamId}/channels/{channelId}` | Update channel |
| DELETE | `/teams/{teamId}/channels/{channelId}` | Delete channel |
| GET | `/teams/{teamId}/primaryChannel` | Get primary (General) channel |

### Member Management

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/teams/{teamId}/members` | List team members |
| POST | `/teams/{teamId}/members` | Add member |
| DELETE | `/teams/{teamId}/members/{membershipId}` | Remove member |
| PATCH | `/teams/{teamId}/members/{membershipId}` | Update member role |
| GET | `/groups/{groupId}/owners` | List team owners |
| POST | `/groups/{groupId}/owners/$ref` | Add owner |
| DELETE | `/groups/{groupId}/owners/{userId}/$ref` | Remove owner |

### Templates

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/teamwork/teamTemplates` | List team templates |
| GET | `/teamwork/teamTemplates/{id}/definitions` | Get template definitions |

### Activity & Reporting

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/reports/getTeamsTeamActivityDetail(period='D30')` | Per-team activity |
| GET | `/reports/getTeamsTeamActivityCounts(period='D30')` | Aggregate team activity |
| GET | `/reports/getTeamsUserActivityUserDetail(period='D30')` | Per-user Teams activity |

### Group Settings (Naming Policy, Expiration)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/groupSettings` | List directory settings |
| PATCH | `/groupSettings/{id}` | Update directory settings |
| GET | `/groupLifecyclePolicies` | List expiration policies |
| PATCH | `/groupLifecyclePolicies/{id}` | Update expiration policy |
| POST | `/groupLifecyclePolicies/{id}/addGroup` | Add group to policy |
| POST | `/groupLifecyclePolicies/{id}/removeGroup` | Remove group from policy |

## Non-Technical Language Mapping

| User says... | Technical operation |
|--------------|-------------------|
| "Start a project" | Create team from template |
| "End a project" | Archive team |
| "Who runs this team?" | Check team owners |
| "Is anyone still using this?" | Check team activity report |
| "Make it private/confidential" | Apply sensitivity label |
| "Clean up old teams" | Run expiration review |
| "Copy this team setup" | Clone team |
| "Add a workspace for topic X" | Create channel |

## Team Creation

### Create Team from Template

```json
POST /teams
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

**Response:** `202 Accepted` with `Location` header containing the async operation URL. Poll until completed.

### Built-in Templates

| Template ID | Description |
|-------------|-------------|
| `standard` | Standard team with default channels |
| `educationClass` | Education class team |
| `educationStaff` | Education staff team |
| `healthcareWard` | Healthcare ward team |

### Clone Team Body

```json
POST /teams/{teamId}/clone
{
  "displayName": "PRJ-Marketing-Campaign-2026-v2",
  "description": "Cloned from Q1 campaign team",
  "visibility": "private",
  "partsToClone": "apps,tabs,settings,channels,members"
}
```

**`partsToClone` values:** `apps`, `tabs`, `settings`, `channels`, `members` (comma-separated).

**Response:** `202 Accepted` — asynchronous. Poll the `Location` header URL.

### Create Channel Body

```json
POST /teams/{teamId}/channels
{
  "displayName": "Design Review",
  "description": "Channel for design review discussions",
  "membershipType": "standard"
}
```

**`membershipType` values:** `standard` (visible to all team members), `private` (invite-only), `shared` (cross-team shared channel).

## Team Settings Reference

### Update Team Settings

```json
PATCH /teams/{teamId}
{
  "memberSettings": {
    "allowCreateUpdateChannels": true,
    "allowDeleteChannels": false,
    "allowAddRemoveApps": true,
    "allowCreateUpdateRemoveTabs": true,
    "allowCreateUpdateRemoveConnectors": true
  },
  "guestSettings": {
    "allowCreateUpdateChannels": false,
    "allowDeleteChannels": false
  },
  "messagingSettings": {
    "allowUserEditMessages": true,
    "allowUserDeleteMessages": true,
    "allowOwnerDeleteMessages": true,
    "allowTeamMentions": true,
    "allowChannelMentions": true
  },
  "funSettings": {
    "allowGiphy": true,
    "giphyContentRating": "moderate",
    "allowStickersAndMemes": true,
    "allowCustomMemes": false
  },
  "discoverySettings": {
    "showInTeamsSearchAndSuggestions": true
  }
}
```

### Settings Boolean Reference

| Setting Group | Property | Default | Description |
|--------------|----------|---------|-------------|
| `memberSettings` | `allowCreateUpdateChannels` | `true` | Members can create/edit channels |
| `memberSettings` | `allowDeleteChannels` | `true` | Members can delete channels |
| `memberSettings` | `allowAddRemoveApps` | `true` | Members can add/remove apps |
| `memberSettings` | `allowCreateUpdateRemoveTabs` | `true` | Members can manage tabs |
| `memberSettings` | `allowCreateUpdateRemoveConnectors` | `true` | Members can manage connectors |
| `guestSettings` | `allowCreateUpdateChannels` | `false` | Guests can create/edit channels |
| `guestSettings` | `allowDeleteChannels` | `false` | Guests can delete channels |
| `messagingSettings` | `allowUserEditMessages` | `true` | Users can edit sent messages |
| `messagingSettings` | `allowUserDeleteMessages` | `true` | Users can delete messages |
| `messagingSettings` | `allowOwnerDeleteMessages` | `true` | Owners can delete any message |
| `messagingSettings` | `allowTeamMentions` | `true` | Allow @team mentions |
| `messagingSettings` | `allowChannelMentions` | `true` | Allow @channel mentions |

## Sensitivity Labels

### Apply Label to Team

```json
PATCH /groups/{groupId}
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
|-------|---------|-------------|---------|
| Public | Public | Allowed | Unrestricted |
| Internal | Private | Allowed | Organization only |
| Confidential | Private | Blocked | Restricted |
| Highly Confidential | Private | Blocked | Owners only |

## Naming Policy

### Prefix/Suffix Convention

```
[Type]-[Department]-[Name]-[Year]
```

Examples: `PRJ-Marketing-Campaign-2026`, `DEP-Finance-General`, `TMP-Hiring-Sprint`

### Check Naming Policy

```
GET /groupSettings
```

Look for `CustomBlockedWordsList` and `PrefixSuffixNamingRequirement` in the directory settings template `Group.Unified`.

## Archival

### Archive Team

```json
POST /teams/{teamId}/archive
{
  "shouldSetSpoSiteReadOnlyForMembers": true
}
```

Makes the team read-only. Content is preserved but no new messages or files can be added.

### Unarchive Team

```
POST /teams/{teamId}/unarchive
```

## Expiration Policy

### Set Group Expiration

```json
PATCH /groupLifecyclePolicies/{policyId}
{
  "groupLifetimeInDays": 180,
  "managedGroupTypes": "Selected",
  "alternateNotificationEmails": "admin@contoso.com"
}
```

**`managedGroupTypes` values:** `None`, `Selected`, `All`.

### Activity Report Schema

```
GET /reports/getTeamsTeamActivityDetail(period='D30')
```

Returns per-team: `teamName`, `lastActivityDate`, `activeUsers`, `activeChannels`, `channelMessages`, `postMessages`, `replyMessages`, `urgentMessages`, `meetings`, `audioDuration`, `videoDuration`.

## Ownership Enforcement

### Check Owners

```
GET /groups/{groupId}/owners
```

Flag teams with:
- Zero owners (orphaned)
- Only one owner (single point of failure)
- Owners who have left the organization

### Add Owner

```json
POST /groups/{groupId}/owners/$ref
{
  "@odata.id": "https://graph.microsoft.com/v1.0/users/{userId}"
}
```

## Required Permissions

| Operation | Permission |
|-----------|-----------|
| Create team | `Team.Create` or `Group.ReadWrite.All` |
| Read team settings | `Team.ReadBasic.All` or `TeamSettings.Read.All` |
| Update team settings | `TeamSettings.ReadWrite.All` |
| Archive/unarchive | `TeamSettings.ReadWrite.All` |
| Clone team | `Team.Create` + `Team.ReadBasic.All` |
| Manage channels | `Channel.Create`, `Channel.Delete.All` |
| Apply sensitivity label | `Group.ReadWrite.All` |
| Read activity reports | `Reports.Read.All` |
| Manage owners/members | `Group.ReadWrite.All` or `TeamMember.ReadWrite.All` |
| Expiration policies | `GroupMember.ReadWrite.All` + `Directory.ReadWrite.All` |

## Error Handling

| Status Code | Meaning | Common Cause |
|-------------|---------|--------------|
| 400 Bad Request | Malformed request | Invalid template ID, missing required fields |
| 401 Unauthorized | Authentication failure | Expired token, missing scope consent |
| 403 Forbidden | Insufficient permissions | Missing `Team.Create` or `Group.ReadWrite.All` |
| 404 Not Found | Team not found | Invalid team/group ID, team deleted |
| 409 Conflict | Operation conflict | Team already archived, duplicate channel name, clone in progress |
| 429 Too Many Requests | Throttled | Implement exponential backoff with `Retry-After` header |

### Async Operation Handling

Team creation and cloning return `202 Accepted`. Poll the `Location` header URL:

```
GET {operationUrl}
```

**Status values:** `notStarted`, `running`, `succeeded`, `failed`.

Wait for `succeeded` before accessing the new team. Typical creation time: 10-30 seconds.

## OData Filter/OrderBy Examples

```
# Teams with specific display name prefix
/groups?$filter=startswith(displayName,'PRJ-') and resourceProvisioningOptions/Any(x:x eq 'Team')

# Teams without owners
/groups/{groupId}/owners/$count  (returns 0 = orphaned)
Header: ConsistencyLevel: eventual

# Activity report for last 30 days, sorted by last activity
/reports/getTeamsTeamActivityDetail(period='D30')
```

## Common Lifecycle Patterns

### Pattern 1: Project Kickoff

1. `POST /teams` — create team from template with naming convention
2. `POST /teams/{id}/channels` — create project-specific channels (Design, Dev, Testing)
3. `POST /teams/{id}/members` — add team members
4. `POST /groups/{id}/owners/$ref` — ensure at least 2 owners
5. `PATCH /groups/{id}` — apply sensitivity label matching project classification
6. Document team in project registry

### Pattern 2: Monthly Governance Review

1. `GET /reports/getTeamsTeamActivityDetail(period='D30')` — get activity for all teams
2. Flag teams with zero activity in 30 days as stale candidates
3. `GET /groups/{id}/owners` — check owner health for all teams
4. Flag orphaned teams (0 owners) and single-owner teams
5. Generate governance report with action items for team owners
6. Send notifications to owners of stale/at-risk teams

### Pattern 3: Project Closeout

1. `GET /teams/{id}` — verify team status and activity
2. Export important files from SharePoint site if needed
3. `POST /teams/{id}/archive` with `shouldSetSpoSiteReadOnlyForMembers: true` — archive
4. Update project registry with archive date
5. Add to expiration policy for automated deletion after retention period

### Pattern 4: Team Template Standardization

1. `GET /teamwork/teamTemplates` — inventory existing templates
2. Create reference team with standard channels, tabs, and apps
3. `POST /teams/{id}/clone` — clone reference team for new projects
4. `PATCH /teams/{newId}` — update display name, description, and settings
5. `PATCH /groups/{newId}` — apply appropriate sensitivity label
6. Document template usage in governance guide

### Pattern 5: Orphaned Team Remediation

1. List all teams: `GET /groups?$filter=resourceProvisioningOptions/Any(x:x eq 'Team')&$select=id,displayName`
2. For each team: `GET /groups/{id}/owners` — check owner count
3. Flag teams with 0 owners as orphaned
4. For each orphaned team: identify most active member from activity report
5. `POST /groups/{id}/owners/$ref` — assign new owner
6. Notify new owner and document change
